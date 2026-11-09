// 小島開拓誌 檢查工具
//   node tools/check.js          語法檢查 + 冒煙測試 + 回歸測試（約 20 秒）
//   node tools/check.js --fast   只做語法檢查（不需瀏覽器，1 秒內）
// 任何一項失敗，exit code 為 1，並印出檔案與行號。
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const MAIN = '小島開拓誌.html';
let failed = 0;
const fail = (m) => { failed++; console.log('  ✗ ' + m); };

// ── 1. 語法檢查：HTML 內嵌 script + 所有 .js（tools/ 與 node_modules 除外）
function jsFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    if (['node_modules', 'tools', '.git', '.claude'].includes(e.name)) return [];
    const p = path.join(dir, e.name);
    return e.isDirectory() ? jsFiles(p) : e.name.endsWith('.js') ? [p] : [];
  });
}
function parse(code, file, lineOffset = 0) {
  try { new vm.Script(code, { filename: file }); return true; }
  catch (e) {
    const ln = +((e.stack.match(new RegExp(file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ':(\\d+)')) || [])[1] || 0) + lineOffset;
    const src = fs.readFileSync(path.join(ROOT, file.split('#')[0]), 'utf8').split('\n')[ln - 1] || '';
    fail(`${file.split('#')[0]}:${ln}  ${e.name}: ${e.message}\n      > ${src.trim().slice(0, 160)}`);
    return false;
  }
}
console.log('[1/3] 語法檢查');
const html = fs.readFileSync(path.join(ROOT, MAIN), 'utf8');
const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g; let m, n = 0;
while ((m = re.exec(html))) {
  const off = html.slice(0, m.index + m[0].indexOf('>') + 1).split('\n').length - 1;
  parse(m[1], `${MAIN}#${++n}`, off);
}
for (const f of jsFiles(ROOT)) parse(fs.readFileSync(f, 'utf8'), path.relative(ROOT, f).replace(/\\/g, '/'));
// HTML 引用的 script 檔必須存在
for (const s of html.matchAll(/<script[^>]*\bsrc="([^"]+)"/g))
  if (!fs.existsSync(path.join(ROOT, s[1]))) fail(`${MAIN} 引用的 ${s[1]} 不存在`);
if (!failed) console.log('  ✓ 全部可解析');

if (process.argv.includes('--fast')) process.exit(failed ? 1 : 0);
if (failed) { console.log('\n語法錯誤，略過瀏覽器測試。'); process.exit(1); }

// ── 2/3. 冒煙測試 + 回歸測試（無頭瀏覽器）
let openGame;
try { ({ openGame } = require('./harness')); }
catch { console.log('\n⚠ 未安裝 playwright-core，略過瀏覽器測試。請在 tools/ 執行 npm install'); process.exit(0); }

(async () => {
  const A = (c, msg) => { if (!c) throw new Error(msg); };
  const tests = [['smoke', require('./smoke')],
    ...fs.readdirSync(path.join(__dirname, 'tests')).filter(f => f.endsWith('.js')).sort()
      .map(f => [f.replace(/\.js$/, ''), require('./tests/' + f)])];
  console.log('[2/3] 冒煙測試　[3/3] 回歸測試');
  for (const [name, fn] of tests) {
    const g = await openGame(ROOT);
    try {
      A(await g.hooked(), '遊戲腳本沒有執行');
      await fn(g, A); await g.wait(300);
      if (g.errors.length) throw new Error('頁面錯誤：' + g.errors.join(' | '));
      console.log(`  ✓ ${name}`);
    } catch (e) {
      fail(`${name}：${e.message.split('\n')[0]}${g.errors.length && !e.message.includes('頁面錯誤') ? ' | 頁面錯誤：' + g.errors.join(' | ') : ''}`);
    }
    await g.close();
  }
  console.log(failed ? `\n✗ ${failed} 項失敗` : '\n✓ 全部通過');
  process.exit(failed ? 1 : 0);
})();
