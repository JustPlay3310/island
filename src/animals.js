// 小島開拓誌 — 動物系統、互動基礎
// 共用全域：所有 src/*.js 以一般 <script> 依序載入（非 ES module，才能直接用 file:// 開啟）
'use strict';

/* ══════════ 動物系統 ══════════ */
function isBlockedForAnimal(tx,ty){
  if(tx<0||ty<0||tx>=SIZE||ty>=SIZE)return true;
  const t=W.ter[ty*SIZE+tx];
  return t===T.DEEP||t===T.WATER||t===T.MTN;
}
function updateAnimals(dt){
  for(const a of W.animals){
    // 資源計時
    if(a.state==='tamed'&&a.resourceTimer>0)a.resourceTimer-=dt;
    // 逃跑計時
    if(a.fleeTimer>0){a.fleeTimer-=dt;if(a.fleeTimer<=0&&a.state==='fleeing'){a.state='wild';a.vx=0;a.vy=0;}}
    // 行為
    if(a.state==='wild'){
      const dist=Math.hypot(a.x-W.px,a.y-W.py);
      if(dist<2.5){
        const ang=Math.atan2(a.y-W.py,a.x-W.px);
        a.vx=Math.cos(ang)*2.8;a.vy=Math.sin(ang)*2.8;
        a.state='fleeing';a.fleeTimer=2.5;
      }else if(a.state!=='fleeing'&&Math.random()<dt*0.4){
        const ang=Math.random()*Math.PI*2;
        a.vx=Math.cos(ang)*0.5;a.vy=Math.sin(ang)*0.5;
      }
    }else if(a.state==='tamed'){
      const dist=Math.hypot(a.x-W.px,a.y-W.py);
      if(dist>5){
        const ang=Math.atan2(W.py-a.y,W.px-a.x);
        a.vx=Math.cos(ang)*0.8;a.vy=Math.sin(ang)*0.8;
      }else if(dist<0.5){
        const ang=Math.atan2(a.y-W.py,a.x-W.px)||0;
        a.vx=Math.cos(ang)*0.3;a.vy=Math.sin(ang)*0.3;
      }else if(Math.random()<dt*0.3){
        const ang=Math.random()*Math.PI*2;a.vx=Math.cos(ang)*0.2;a.vy=Math.sin(ang)*0.2;
      }
      // 動物間互斥：太近就互相推開
      for(const b of W.animals){
        if(b===a)continue;
        const sep=Math.hypot(a.x-b.x,a.y-b.y);
        if(sep<1.2&&sep>0){
          const ang=Math.atan2(a.y-b.y,a.x-b.x);
          a.vx+=Math.cos(ang)*0.4;a.vy+=Math.sin(ang)*0.4;
        }
      }
    }
    // 移動
    const nx=a.x+a.vx*dt,ny=a.y+a.vy*dt;
    if(!isBlockedForAnimal(Math.floor(nx),Math.floor(ny)))
      {a.x=clamp(nx,0.5,SIZE-0.5);a.y=clamp(ny,0.5,SIZE-0.5);}
    else{a.vx=0;a.vy=0;}
    // 速度阻尼
    a.vx*=0.92;a.vy*=0.92;
  }
}

function drawAnimal(a){
  const sx=Math.round(a.x*TS-camX),sy=Math.round(a.y*TS-camY);
  if(sx<-TS||sy<-TS||sx>vw+TS||sy>vh+TS)return;
  const cx=sx,cy=sy-6;
  const isTamed=a.state==='tamed';
  // 圓形陰影
  ctx.fillStyle='rgba(0,0,0,.18)';ctx.beginPath();ctx.ellipse(cx,sy+6,8,3,0,0,Math.PI*2);ctx.fill();
  if(a.kind===AK.RABBIT){
    // 身體
    ctx.fillStyle=isTamed?'#ecddd0':'#e8e0d4';
    ctx.beginPath();ctx.ellipse(cx,cy+2,7,8,0,0,Math.PI*2);ctx.fill();
    // 耳朵
    ctx.fillStyle=isTamed?'#ecddd0':'#e8e0d4';
    ctx.fillRect(cx-5,cy-12,4,9);ctx.fillRect(cx+1,cy-12,4,9);
    ctx.fillStyle='#e8b0b0';ctx.fillRect(cx-4,cy-11,2,6);ctx.fillRect(cx+2,cy-11,2,6);
    // 眼
    ctx.fillStyle='#e88080';ctx.beginPath();ctx.arc(cx-2,cy,1.2,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(cx+2,cy,1.2,0,Math.PI*2);ctx.fill();
  }else if(a.kind===AK.CHICKEN){
    // 身體
    ctx.fillStyle=isTamed?'#f0e0a0':'#e8d898';
    ctx.beginPath();ctx.ellipse(cx,cy+3,6,7,0,0,Math.PI*2);ctx.fill();
    // 頭
    ctx.fillStyle=isTamed?'#f0e0a0':'#e8d898';ctx.beginPath();ctx.arc(cx,cy-5,5,0,Math.PI*2);ctx.fill();
    // 冠
    ctx.fillStyle='#e04040';ctx.beginPath();ctx.moveTo(cx-3,cy-9);ctx.lineTo(cx-1,cy-14);ctx.lineTo(cx+1,cy-9);ctx.lineTo(cx+3,cy-14);ctx.lineTo(cx+5,cy-9);ctx.closePath();ctx.fill();
    // 喙
    ctx.fillStyle='#e08820';ctx.fillRect(cx+4,cy-7,4,2);
    // 眼
    ctx.fillStyle='#202820';ctx.beginPath();ctx.arc(cx+2,cy-6,1,0,Math.PI*2);ctx.fill();
  }else{
    // 羊身體 (fluffy)
    const flufCol=isTamed?'#f0ece4':'#e8e4dc';
    ctx.fillStyle=flufCol;
    for(let k=0;k<5;k++){ctx.beginPath();ctx.arc(cx+(Math.cos(k/5*Math.PI*2)*5),cy+(Math.sin(k/5*Math.PI*2)*4),5,0,Math.PI*2);ctx.fill();}
    ctx.beginPath();ctx.arc(cx,cy,5.5,0,Math.PI*2);ctx.fill();
    // 臉
    ctx.fillStyle='#444840';ctx.beginPath();ctx.arc(cx,cy-6,4.5,0,Math.PI*2);ctx.fill();
    // 眼
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(cx-1.5,cy-6.5,1,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(cx+1.5,cy-6.5,1,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#222';ctx.beginPath();ctx.arc(cx-1.2,cy-6.5,.6,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(cx+1.8,cy-6.5,.6,0,Math.PI*2);ctx.fill();
    // 腿
    ctx.fillStyle='#444840';ctx.fillRect(cx-5,cy+8,2,5);ctx.fillRect(cx+3,cy+8,2,5);
  }
  // 馴化標記 ♥
  if(isTamed){
    const ph=Math.sin(W.timeAcc*3)*1.5;
    ctx.fillStyle='rgba(200,80,80,'+(0.8+0.2*Math.sin(W.timeAcc*4))+')';
    ctx.font='700 9px sans-serif';ctx.textAlign='center';
    ctx.fillText('♥',cx,cy-18+ph);
  }
  // 資源就緒
  if(isTamed&&a.resourceTimer<=0){
    const ph=Math.sin(W.timeAcc*5)*2;
    ctx.fillStyle='#e8c050';ctx.font='700 10px sans-serif';ctx.textAlign='center';
    ctx.fillText('★',cx+10,cy-12+ph);
  }
}

/* ══════════ 互動 ══════════ */
const DX=[0,0,-1,1],DY=[-1,1,0,0];
function faceTile(){const fx=W.px+DX[W.face],fy=W.py+DY[W.face];if(fx<0||fy<0||fx>=SIZE||fy>=SIZE)return null;return{x:fx,y:fy,i:fy*SIZE+fx};}

function nearestAnimal(){
  const f=faceTile();if(!f)return null;
  // 寵物用更嚴格的距離（1.0），避免擋住地圖互動；野生動物沿用 1.5
  for(const a of W.animals){
    const th=a.state==='tamed'?1.0:1.5;
    if(Math.abs(a.x-f.x)<th&&Math.abs(a.y-f.y)<th)return a;
  }
  // 玩家周圍只偵測野生動物，寵物不在此攔截
  for(const a of W.animals){
    if(a.state!=='tamed'&&Math.abs(a.x-W.px)<1.5&&Math.abs(a.y-W.py)<1.5)return a;
  }
  return null;
}

function animalAction(a){
  const info=ANIMAL_INFO[a.kind];
  if(a.state==='tamed'){
    if(a.resourceTimer<=0){
      return{label:'收集'+info.name+'的'+({fiber:'纖維',food:'雞蛋'}[info.resKind]||info.resKind),
        run(){gain(info.resKind,1);a.resourceTimer=a.resourceMax;toast(info.ico+'謝謝你的照顧!');sfx('pick');}
        ,stam:0};
    }
    const remain=Math.ceil(a.resourceTimer);
    return{label:'和'+info.name+'打招呼',run(){toast(info.ico+' '+info.petMsg+'(還要 '+remain+'秒)');},stam:0,soft:1};
  }
  if(W.inv.food<info.tameCost)
    return{label:'馴化'+info.name+'(需要糧食×'+info.tameCost+')',
      run(){toast('需要糧食×'+info.tameCost+' 才能馴化'+info.name);sfx('no');},stam:0,soft:1};
  return{label:'馴化'+info.name+'(糧食×'+info.tameCost+')',
    run(){W.inv.food-=info.tameCost;a.state='tamed';a.fleeTimer=0;a.resourceTimer=a.resourceMax;
          W.stats.tamed=(W.stats.tamed||0)+1;
          toast(info.ico+' '+info.name+' 成為你的夥伴!');sfx('tame');renderInv();checkQuest();}
    ,stam:0};
}
