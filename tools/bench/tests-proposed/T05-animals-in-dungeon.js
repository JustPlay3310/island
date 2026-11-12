// 【提案】T05 行為版測試：只檢查玩家觀察得到的行為，不限定實作方式
// 原測試要求 W.animals.length === 0，只接受「把動物搬到 W._surface」的寫法；
// 「在地城中跳過更新／繪製／互動」的寫法行為正確，卻會被判 FAIL。
// 檢查三件事：地城中 (a) 不畫出地表動物 (b) 不能與地表動物／寵物互動 (c) 出地城後同一批動物回到原位。
// (a)(b) 各自都能在 base 上抓到 bug（畫出 720～730 次；可「馴化兔子」「和兔子打招呼」）。
// 對照：base(642baa3^) FAIL、fix(642baa3) PASS；13 次 agent 結果中，只有 Qwen3.8-27B 的 3 次「不同但正確的設計」與原測試判定不同，其餘完全一致。
// 採用方式：覆蓋 tests/T05-animals-in-dungeon.js 後跑 `node validate.js T05-animals-in-dungeon`。
module.exports = async (g, A) => {
  await g.newGame('bench-t05');
  // 記住地表動物的物件參考（不論實作把它們藏到哪裡，物件本身不變）
  const n0 = await g.ev(`(()=>{window._as=W.animals.slice();return _as.length})()`);
  A(n0 > 1, '新局應有至少 2 隻地表動物（測試前置失敗）');
  // 問題回報提到「已經馴服、會跟著我的」：把第 2 隻設為寵物
  await g.ev(`(()=>{_as[1].state='tamed';_as[1].fleeTimer=0;})()`);
  // 計數 drawAnimal 對地表動物的呼叫
  await g.ev(`(()=>{window._da=0;const o=drawAnimal;drawAnimal=function(a){if(window._as.includes(a))window._da++;return o.apply(this,arguments)};})()`);
  await g.ev(`(()=>{_as[0].x=W.px+1;_as[0].y=W.py;})()`);  // 放到玩家旁，確保在畫面內
  await g.wait(500);
  A(await g.ev('_da') > 0, '地表上應有動物被畫出（測試前置失敗）');
  await g.ev(`(()=>{window._pos=_as.map(a=>[a.x,a.y]);})()`);

  await g.ev('enterDungeon(0)'); await g.wait(1200);
  A(await g.ev('W.inDungeon===true'), '沒有進入地城（測試前置失敗）');
  // 把地表動物都移到玩家面前（模擬「卡在地城牆裡」），確認看不到也無法互動
  await g.ev(`(()=>{const f=faceTile();for(const a of _as){a.x=f.x;a.y=f.y;}})()`);
  await g.ev('_da=0'); await g.wait(1200);
  const drawn = await g.ev('_da');
  A(drawn === 0, `地城中不應畫出地表動物，實際 ${drawn} 次`);
  // 互動檢查：移到玩家腳邊、清掉地城敵人（避免攻擊鍵優先打敵人），四個方向都按按看
  const animalLike = /打招呼|馴化|^收集.+的/;  // animalAction 的三種 label
  const acts = await g.ev(`(()=>{
    for(const a of _as){a.x=W.px;a.y=W.py;}
    const saveE=W.enemies;W.enemies=[];const saveF=W.face;const out=[];
    for(let d=0;d<4;d++){W.face=d;
      const c=contextAction();out.push('F'+d+':'+(c?String(c.label||''):''));
      const k=(typeof combatAction==='function')?combatAction():null;out.push('K'+d+':'+(k?String(k.label||''):''));}
    W.enemies=saveE;W.face=saveF;return out;})()`);
  const hit = acts.filter(x => animalLike.test(x.slice(3)));
  A(hit.length === 0, `地城中不應能與地表動物（含寵物）互動，實際：${hit.join('、')}`);
  await g.ev(`(()=>{_as.forEach((a,i)=>{a.x=_pos[i][0];a.y=_pos[i][1];})})()`);  // 還原到地表位置
  await g.wait(1500);

  await g.ev('exitDungeon()'); await g.wait(1200);
  const n1 = await g.ev('W.animals.length');
  A(n1 === n0, `回到地面後動物數應恢復為 ${n0}，實際 ${n1}`);
  A(await g.ev('_as.every(a=>W.animals.includes(a))'), '回到地面後應是原本那批動物');
  A(await g.ev('_as.every((a,i)=>Math.abs(a.x-_pos[i][0])<3&&Math.abs(a.y-_pos[i][1])<3)'), '回到地面後動物應在原本的地方附近');
  await g.ev('_da=0'); await g.wait(800);
  A(await g.ev('_da') > 0, '回到地面後動物應重新被畫出');
};
