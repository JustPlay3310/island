// 鐵靴：移動冷卻要乘 0.65；鐵手套：採集體力乘 0.6
module.exports = async (g, A) => {
  await g.newGame('bench-t03');
  await g.ev(`W.inv.iron_boots=(W.inv.iron_boots||0)+1;equipItem('iron_boots')`);
  A(await g.ev(`W.equipped.feet==='iron_boots'`), '無法裝備鐵靴（測試前置失敗）');
  const cd = await g.ev(`(()=>{const f=faceTile();W.ter[f.i]=T.GRASS;W.obj[f.i]=O.NONE;
    W.animals=(W.animals||[]).filter(a=>!(a.x===f.x&&a.y===f.y));W.enemies=[];
    moveCd=0;tryMove(W.face);return moveCd;})()`);
  A(Math.abs(cd - 0.25 * 0.65) < 0.01, `穿鐵靴走草地的移動冷卻應為 ${0.25 * 0.65}，實際 ${cd}`);
  await g.ev(`W.inv.iron_gloves=(W.inv.iron_gloves||0)+1;equipItem('iron_gloves')`);
  A(await g.ev(`W.equipped.hands==='iron_gloves'`), '無法裝備鐵手套（測試前置失敗）');
  const st = await g.ev(`W.stam=50;executeAction({stam:10,run(){}});W.stam`);
  A(st === 44, `戴鐵手套做 10 體力的動作應剩 44，實際 ${st}`);
};
