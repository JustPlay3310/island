// 面前放一塊銀礦：沒稿子要提示需要銀稿；拿銀稿要能採到 silver_ore
module.exports = async (g, A) => {
  await g.newGame('bench-t02');
  await g.ev(`(()=>{const f=faceTile();W.ter[f.i]=T.GRASS;W.obj[f.i]=O.ROCK;W.aux[f.i]=-2;
    W.equipped.hand=null;W.stam=100;})()`);
  const l0 = await g.ev('contextAction()?.label||""');
  A(l0.includes('銀稿'), `沒有銀稿時提示應指出需要銀稿，實際：「${l0}」`);
  await g.ev(`W.inv.silver_pick=(W.inv.silver_pick||0)+1;equipItem('silver_pick')`);
  A(await g.ev(`W.equipped.hand==='silver_pick'`), '無法裝備銀稿（測試前置失敗）');
  const before = await g.ev('W.inv.silver_ore||0');
  await g.ev('executeAction(contextAction())');
  const after = await g.ev('W.inv.silver_ore||0');
  A(after > before, `拿銀稿採銀礦應得到 silver_ore（${before} → ${after}）`);
};
