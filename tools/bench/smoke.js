// 冒煙測試：載入 → 開新局 → 走幾步、開關選單 → 存讀檔 → 不得有任何錯誤
const { openGame } = require('./harness');
(async () => {
  const g = await openGame(process.argv[2]); let ok = true;
  const fail = (m) => { ok = false; console.log('  FAIL', m); };
  try {
    if (!(await g.hooked())) fail('遊戲腳本未執行（多半是語法錯誤）');
    else {
      await g.newGame('smoke-1');
      if (!(await g.ev('W!==null&&running'))) fail('startGame 後遊戲沒有在跑');
      const p0 = await g.ev('[W.px,W.py]');
      for (const k of ['ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowDown', 'ArrowLeft']) await g.key(k, 250);
      const p1 = await g.ev('[W.px,W.py]');
      console.log('  pos', JSON.stringify(p0), '->', JSON.stringify(p1));
      for (const k of ['e', 'e', 'r', 'r', 't', 't', 'q', 'q']) { await g.key(k); await g.wait(150); }
      await g.ev('save()'); const w2 = await g.ev('JSON.stringify(load()?.day??null)');
      if (w2 === 'null') fail('save/load 失敗');
      await g.wait(1500);
    }
    if (g.errors.length) fail('錯誤:\n    ' + g.errors.join('\n    '));
  } catch (e) { fail('例外: ' + e.message); }
  console.log(ok ? 'SMOKE OK' : 'SMOKE FAIL'); await g.close(); process.exit(ok ? 0 : 1);
})();
