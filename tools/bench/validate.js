// 驗證每一題：base（修復前）必須 FAIL、fix（修復後）必須 PASS
const fs = require('fs'), path = require('path'), { execSync, execFileSync } = require('child_process');
const { runTest } = require('./runtest');
const ISLAND = process.env.ISLAND_REPO || path.resolve(__dirname, '../..');
const SNAP = path.join(__dirname, '.snap');

function snapshot(rev) {
  // 用 execFileSync 不經 shell：Windows cmd 會把 ^ 當跳脫字元吃掉
  const sha = execFileSync('git', ['-C', ISLAND, 'rev-parse', rev]).toString().trim();
  const dir = path.join(SNAP, sha.slice(0, 10));
  if (!fs.existsSync(path.join(dir, '小島開拓誌.html'))) {
    fs.mkdirSync(dir, { recursive: true });
    execSync(`git -C "${ISLAND}" archive ${sha} | tar -x`, { shell: 'bash', cwd: dir });
  }
  return dir;
}

(async () => {
  const tasks = JSON.parse(fs.readFileSync(path.join(__dirname, 'tasks', 'tasks.json'), 'utf8'));
  const only = process.argv[2];
  let allOk = true;
  for (const t of tasks) {
    if (only && t.id !== only) continue;
    const b = await runTest(snapshot(t.base), t.id);
    const f = await runTest(snapshot(t.fix), t.id);
    const ok = !b.pass && f.pass; allOk &&= ok;
    console.log(`${ok ? 'VALID  ' : 'INVALID'} ${t.id}\n    base(${t.base}): ${b.pass ? 'PASS' : 'FAIL'} ${b.msg}\n    fix (${t.fix}): ${f.pass ? 'PASS' : 'FAIL'} ${f.msg}`);
  }
  process.exit(allOk ? 0 : 1);
})();
