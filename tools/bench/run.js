// island-bench 執行器：讓 agent 解題並用隱藏測試評分
//
// 用法：
//   node run.js --agent '<指令樣板>' [--label 名稱] [--tasks T01-ore-syntax,T03-...] [--timeout 秒]
//
// 指令樣板可用的佔位符：
//   {prompt_file}  問題描述檔（純文字）  {workdir} 題目工作目錄  {fix_sha} 正解 commit（只給 oracle 自我測試用）
// 例：
//   OpenCode   : --agent 'opencode run "$(cat {prompt_file})"'
//   Claude Code: --agent 'claude -p "$(cat {prompt_file})" --permission-mode acceptEdits'
//   自我測試    : --agent 'true'（什麼都不做，應全 FAIL）、--agent 'git cherry-pick {fix_sha}'（套正解，應全 PASS）
//
// 每題流程：clone island → 切到修復前版本 → 移除 .claude/（避免對話紀錄洩漏答案）→ 跑 agent → 跑隱藏測試
const fs = require('fs'), path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { runTest } = require('./runtest');

const ISLAND = process.env.ISLAND_REPO || path.resolve(__dirname, '../..');
const SHELL = process.env.BENCH_SHELL || (process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : '/bin/bash');
const PREFACE = '你是這個專案的開發者。這是一個瀏覽器 RPG 經營遊戲（主檔 小島開拓誌.html，資料與地圖生成在 lib/）。\n'
  + '玩家回報了下面的問題，請找出原因並修好，修好後用 git commit 提交。不要改動與問題無關的功能。\n\n問題回報：\n';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const git = (cwd, ...a) => execFileSync('git', ['-C', cwd, ...a], { stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();

(async () => {
  const agent = arg('agent'); if (!agent) { console.error('需要 --agent'); process.exit(2); }
  const label = arg('label', 'run-' + new Date().toISOString().replace(/[:.]/g, '-'));
  const timeout = +arg('timeout', 1800) * 1000;
  const only = arg('tasks') ? arg('tasks').split(',') : null;
  const tasks = JSON.parse(fs.readFileSync(path.join(__dirname, 'tasks', 'tasks.json'), 'utf8'))
    .filter(t => !only || only.includes(t.id));
  const runDir = path.join(__dirname, 'runs', label); fs.mkdirSync(runDir, { recursive: true });
  const results = [];

  for (const t of tasks) {
    const tdir = path.join(runDir, t.id), work = path.join(tdir, 'repo');
    if (fs.existsSync(work)) { console.log(`skip ${t.id}（已存在 ${work}）`); continue; }
    fs.mkdirSync(tdir, { recursive: true });
    const baseSha = git(ISLAND, 'rev-parse', t.base), fixSha = git(ISLAND, 'rev-parse', t.fix);
    execFileSync('git', ['clone', '-q', ISLAND, work]);
    git(work, 'checkout', '-q', '-b', 'bench', baseSha);
    const claudeDir = path.join(work, '.claude');
    if (fs.existsSync(claudeDir) && claudeDir.startsWith(runDir)) {
      fs.rmSync(claudeDir, { recursive: true, force: true });
      git(work, '-c', 'user.name=bench', '-c', 'user.email=bench@local', 'commit', '-qam', 'bench: 移除對話紀錄');
    }
    const startSha = git(work, 'rev-parse', 'HEAD');
    // oracle 自我測試需要正解 commit 的物件
    try { git(work, 'cat-file', '-e', fixSha); } catch { git(work, 'fetch', '-q', ISLAND, fixSha); }

    const promptFile = path.join(tdir, 'prompt.txt');
    fs.writeFileSync(promptFile, PREFACE + t.issue + '\n');
    const cmd = agent.replaceAll('{prompt_file}', promptFile.replace(/\\/g, '/'))
      .replaceAll('{workdir}', work.replace(/\\/g, '/')).replaceAll('{fix_sha}', fixSha);

    console.log(`== ${t.id}  [${t.difficulty}]`);
    const t0 = Date.now();
    const r = spawnSync(SHELL, ['-c', cmd], { cwd: work, timeout, encoding: 'utf8', maxBuffer: 64 << 20,
      env: { ...process.env, GIT_AUTHOR_NAME: 'bench-agent', GIT_AUTHOR_EMAIL: 'agent@local',
        GIT_COMMITTER_NAME: 'bench-agent', GIT_COMMITTER_EMAIL: 'agent@local' } });
    const secs = Math.round((Date.now() - t0) / 1000);
    fs.writeFileSync(path.join(tdir, 'agent.log'), `$ ${cmd}\n\n--- stdout ---\n${r.stdout || ''}\n--- stderr ---\n${r.stderr || ''}\n`);

    // 評分看的是工作目錄的最終狀態（不論 agent 有沒有 commit）
    const diffstat = git(work, 'diff', '--shortstat', startSha);
    fs.writeFileSync(path.join(tdir, 'agent.diff'), execFileSync('git', ['-C', work, 'diff', startSha]).toString());
    const test = await runTest(work, t.id);
    const rec = { task: t.id, pass: test.pass, msg: test.msg, secs, timedOut: r.error?.code === 'ETIMEDOUT',
      exit: r.status, diffstat, commits: +git(work, 'rev-list', '--count', `${startSha}..HEAD`) };
    results.push(rec);
    fs.appendFileSync(path.join(runDir, 'results.jsonl'), JSON.stringify(rec) + '\n');
    console.log(`   ${rec.pass ? 'PASS' : 'FAIL'}  ${secs}s  ${diffstat || '(無變更)'}  ${rec.pass ? '' : rec.msg}`);
  }
  const n = results.filter(r => r.pass).length;
  console.log(`\n${label}: ${n}/${results.length} 通過`);
})();
