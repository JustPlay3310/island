// 對指定的遊戲目錄跑某一題的隱藏測試
// 判定：測試斷言全部通過，且過程中沒有任何頁面錯誤（pageerror / console.error）
const path = require('path');
const { openGame } = require('./harness');

async function runTest(dir, taskId) {
  const test = require(path.join(__dirname, 'tests', taskId + '.js'));
  const g = await openGame(dir);
  const A = (cond, msg) => { if (!cond) throw new Error(msg); };
  let pass = true, msg = 'ok';
  try {
    if (!(await g.hooked()) && !taskId.startsWith('T01')) throw new Error('遊戲腳本沒有執行（多半是語法錯誤）');
    await test(g, A);
    await g.wait(300);
    if (g.errors.length) throw new Error('頁面錯誤：' + g.errors.join(' | '));
  } catch (e) { pass = false; msg = e.message.split('\n')[0]; if (g.errors.length && !msg.includes('頁面錯誤')) msg += ' | 頁面錯誤：' + g.errors.join(' | '); }
  await g.close();
  return { pass, msg };
}
module.exports = { runTest };

if (require.main === module) {
  runTest(process.argv[2], process.argv[3]).then(r => {
    console.log((r.pass ? 'PASS ' : 'FAIL ') + r.msg); process.exit(r.pass ? 0 : 1);
  });
}
