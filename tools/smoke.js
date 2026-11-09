// 冒煙測試：開新局 → 走幾步 → 開關每個面板 → 存檔讀檔 → 進出地城
module.exports = async (g, A) => {
  await g.newGame('smoke-1');
  A(await g.ev('W!==null&&running'), '開新局後遊戲沒有在跑');
  const p0 = await g.ev('W.px+","+W.py');
  for (const k of ['ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowDown']) await g.key(k, 250);
  A((await g.ev('W.px+","+W.py')) !== p0, '按方向鍵後角色沒有移動');
  for (const k of ['e', 'r', 't', 'q']) { await g.key(k); await g.wait(150); await g.key('Escape'); await g.wait(100); }
  await g.ev('save()');
  A(await g.ev('load()!==null'), '存檔後讀不回來');
  await g.ev('enterDungeon(0)'); await g.wait(1200);
  A(await g.ev('W.inDungeon===true'), '進不了地城');
  await g.wait(1000);
  await g.ev('exitDungeon()'); await g.wait(1200);
  A(await g.ev('W.inDungeon===false'), '出不了地城');
};
