// 進地城時地表動物不可跟進；出地城後要恢復
module.exports = async (g, A) => {
  await g.newGame('bench-t05');
  const n0 = await g.ev('(W.animals||[]).length');
  A(n0 > 0, '新局應有地表動物（測試前置失敗）');
  await g.ev('enterDungeon(0)'); await g.wait(1200);
  A(await g.ev('W.inDungeon===true'), '沒有進入地城（測試前置失敗）');
  const nd = await g.ev('(W.animals||[]).length');
  A(nd === 0, `地城中不應有地表動物，實際 ${nd} 隻`);
  await g.ev('exitDungeon()'); await g.wait(1200);
  const n1 = await g.ev('(W.animals||[]).length');
  A(n1 === n0, `回到地面後動物數應恢復為 ${n0}，實際 ${n1}`);
};
