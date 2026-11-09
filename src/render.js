// 小島開拓誌 — 繪製、小地圖、HUD
// 共用全域：所有 src/*.js 以一般 <script> 依序載入（非 ES module，才能直接用 file:// 開啟）
'use strict';

/* ══════════ 繪製 ══════════ */
let camX=0,camY=0,camInit=false;
const TER_COL={
  [T.DEEP]:'#2e5e74',[T.WATER]:'#5d9bb5',[T.SAND]:'#e3cf96',
  [T.GRASS]:'#8fb56b',[T.MEADOW]:'#9cc178',[T.FOREST]:'#6f9e57',
  [T.ROCKY]:'#9aa08c',[T.MTN]:'#7c8076',[T.BRIDGE]:'#b08a55',
  [T.PATH]:'#cdbd92',[T.FARM]:'#a9825a'
};
const MM_COL={...TER_COL,[T.DEEP]:'#23485a',[T.MTN]:'#666b61'};

function circle(x,y,r){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
function flame(x,y,h){ctx.beginPath();ctx.moveTo(x-6,y);ctx.quadraticCurveTo(x-7,y-h*.5,x,y-h);ctx.quadraticCurveTo(x+7,y-h*.5,x+6,y);ctx.closePath();ctx.fill();}

function drawTile(x,y,sx,sy){
  const i=y*SIZE+x,t=W.ter[i],h=tileHash(x,y);
  ctx.fillStyle=TER_COL[t];ctx.fillRect(sx,sy,TS,TS);
  if(t!==T.DEEP&&t!==T.WATER){ctx.fillStyle='rgba(0,0,0,'+(0.03+h*0.04)+')';if(h>.5)ctx.fillRect(sx+(h*13|0),sy+(h*23|0)%TS,5,5);}
  if(t===T.WATER||t===T.DEEP){const ph=Math.sin(W.timeAcc*1.6+x*1.3+y*2.1);ctx.fillStyle='rgba(255,255,255,'+(0.05+0.04*ph)+')';ctx.fillRect(sx+4,sy+10+((h*10)|0),TS-14,2);}
  if(t===T.MTN){ctx.fillStyle='#8d9187';ctx.beginPath();ctx.moveTo(sx+4,sy+TS-4);ctx.lineTo(sx+TS/2,sy+6);ctx.lineTo(sx+TS-4,sy+TS-4);ctx.closePath();ctx.fill();ctx.fillStyle='#e8ebe6';ctx.beginPath();ctx.moveTo(sx+TS/2-5,sy+13);ctx.lineTo(sx+TS/2,sy+6);ctx.lineTo(sx+TS/2+5,sy+13);ctx.closePath();ctx.fill();}
  if(t===T.BRIDGE){ctx.strokeStyle='rgba(80,50,20,.4)';ctx.lineWidth=1.5;for(let k=6;k<TS;k+=8){ctx.beginPath();ctx.moveTo(sx,sy+k);ctx.lineTo(sx+TS,sy+k);ctx.stroke();}}
  if(t===T.PATH){ctx.fillStyle='rgba(120,105,70,.3)';ctx.fillRect(sx+5,sy+5,9,7);ctx.fillRect(sx+20,sy+18,11,8);ctx.fillRect(sx+8,sy+24,8,7);}
  if(t===T.FARM){ctx.strokeStyle='rgba(70,45,25,.45)';ctx.lineWidth=2;for(let k=7;k<TS;k+=9){ctx.beginPath();ctx.moveTo(sx+3,sy+k);ctx.lineTo(sx+TS-3,sy+k);ctx.stroke();}}
}

function drawObj(x,y,sx,sy){
  const i=y*SIZE+x,o=W.obj[i];if(o===O.NONE)return;
  const cx=sx+TS/2;
  if(o===O.TREE){
    ctx.fillStyle='#6e4a2a';ctx.fillRect(cx-3,sy+TS-16,6,14);
    ctx.fillStyle='#3f6f3a';circle(cx,sy+12,12);ctx.fillStyle='#4f854a';circle(cx-7,sy+18,8);circle(cx+7,sy+18,8);
    ctx.fillStyle='rgba(255,255,255,.12)';circle(cx-4,sy+8,4);
  }else if(o===O.SAPLING){
    ctx.strokeStyle='#4f854a';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(cx,sy+TS-6);ctx.lineTo(cx,sy+TS-16);ctx.stroke();
    ctx.fillStyle='#6fae5a';circle(cx-4,sy+TS-18,4);circle(cx+4,sy+TS-18,4);
  }else if(o===O.ROCK){
    ctx.fillStyle='#8d9187';ctx.beginPath();ctx.moveTo(cx-11,sy+TS-8);ctx.lineTo(cx-6,sy+12);ctx.lineTo(cx+7,sy+10);ctx.lineTo(cx+12,sy+TS-8);ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.18)';ctx.fillRect(cx-3,sy+14,5,4);
  }else if(o===O.BERRY){
    ctx.fillStyle='#4a7a44';circle(cx,sy+TS-14,10);
    if(W.aux[i]<0){ctx.fillStyle='#c4506a';circle(cx-5,sy+TS-16,2.5);circle(cx+4,sy+TS-13,2.5);circle(cx,sy+TS-20,2.5);}
  }else if(o===O.REED){
    ctx.strokeStyle='#7d9a4e';ctx.lineWidth=2;
    for(let k=-6;k<=6;k+=4){ctx.beginPath();ctx.moveTo(cx+k,sy+TS-4);ctx.lineTo(cx+k+2,sy+10);ctx.stroke();}
    ctx.fillStyle='#c9ad6a';ctx.fillRect(cx-2,sy+8,4,7);
  }else if(o===O.CLAY){
    ctx.fillStyle='#b06a4a';circle(cx-4,sy+TS-10,5);circle(cx+5,sy+TS-9,4);circle(cx+1,sy+TS-15,4);
  }else if(o===O.FLOWER){
    ctx.strokeStyle='#5d8a4a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(cx,sy+TS-6);ctx.lineTo(cx,sy+TS-15);ctx.stroke();
    const col=tileHash(x,y)>.5?'#e8b8c8':'#f0d27a';ctx.fillStyle=col;
    for(let a=0;a<5;a++){const r=a/5*Math.PI*2;circle(cx+Math.cos(r)*4,sy+TS-18+Math.sin(r)*4,3);}
    ctx.fillStyle='#fff';circle(cx,sy+TS-18,2.5);
  }else if(o===O.RUIN){
    const found=W.ruinFound[W.aux[i]|0];
    ctx.fillStyle='#a9a293';ctx.fillRect(cx-12,sy+TS-10,24,6);ctx.fillRect(cx-10,sy+8,7,TS-18);ctx.fillRect(cx+4,sy+12,7,TS-22);
    ctx.fillStyle='#8c8678';ctx.fillRect(cx-10,sy+8,7,4);
    if(!found){ctx.fillStyle='rgba(216,169,78,'+(0.5+0.4*Math.sin(W.timeAcc*3))+')';circle(cx,sy+2,3);}
    else{ctx.fillStyle='#6fae5a';circle(cx+8,sy+TS-12,3);}
  }else if(o===O.FIRE){
    ctx.fillStyle='#6e4a2a';ctx.fillRect(cx-9,sy+TS-10,18,5);
    const fl=Math.sin(W.timeAcc*9+x)*2;
    ctx.fillStyle='#e8923c';flame(cx,sy+TS-12,9+fl);ctx.fillStyle='#f3d050';flame(cx,sy+TS-10,5+fl*.5);
  }else if(o===O.HUT){
    ctx.fillStyle='#9c7349';ctx.fillRect(cx-13,sy+14,26,TS-20);
    ctx.fillStyle='#c4744a';ctx.beginPath();ctx.moveTo(cx-16,sy+16);ctx.lineTo(cx,sy+2);ctx.lineTo(cx+16,sy+16);ctx.closePath();ctx.fill();
    ctx.fillStyle='#5b3d22';ctx.fillRect(cx-4,sy+22,8,12);
    ctx.fillStyle=isNight()?'#ffe9a0':'#e9dec4';ctx.fillRect(cx+6,sy+19,5,5);
  }else if(o===O.WELL){
    ctx.fillStyle='#8d9187';ctx.fillRect(cx-9,sy+16,18,14);ctx.fillStyle='#5d9bb5';ctx.fillRect(cx-6,sy+19,12,8);
    ctx.fillStyle='#6e4a2a';ctx.fillRect(cx-11,sy+6,3,12);ctx.fillRect(cx+8,sy+6,3,12);ctx.fillStyle='#c4744a';ctx.fillRect(cx-13,sy+4,26,4);
  }else if(o===O.MONU){
    ctx.fillStyle='#b9b2a0';ctx.fillRect(cx-12,sy+TS-8,24,5);
    ctx.beginPath();ctx.moveTo(cx-8,sy+TS-8);ctx.lineTo(cx-4,sy+2);ctx.lineTo(cx+4,sy+2);ctx.lineTo(cx+8,sy+TS-8);ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(216,169,78,'+(0.55+0.35*Math.sin(W.timeAcc*2))+')';circle(cx,sy-1,4);
  }else if(o===O.CROP){
    const st=cropStage(i);ctx.strokeStyle='#5d8a4a';ctx.lineWidth=2;const hgt=[8,15,20][st];
    for(let k=-8;k<=8;k+=8){ctx.beginPath();ctx.moveTo(cx+k,sy+TS-5);ctx.lineTo(cx+k,sy+TS-5-hgt);ctx.stroke();
      if(st===2){ctx.fillStyle='#e8c050';circle(cx+k,sy+TS-7-hgt,3.5);}
      else if(st===1){ctx.fillStyle='#7db464';circle(cx+k,sy+TS-6-hgt,2.5);}}
  }else if(o===O.WORKBENCH){
    ctx.fillStyle='#8a5a30';ctx.fillRect(cx-14,sy+16,28,TS-22);// 桌面
    ctx.fillStyle='#6a4020';ctx.fillRect(cx-12,sy+TS-12,4,12);ctx.fillRect(cx+8,sy+TS-12,4,12);// 桌腳
    ctx.fillStyle='#8d9187';ctx.fillRect(cx-4,sy+13,12,2.5);// 工具
    ctx.fillStyle='#6e4a2a';ctx.fillRect(cx+6,sy+10,2.5,9);
    ctx.fillStyle='rgba(255,255,180,.4)';ctx.fillRect(cx-13,sy+17,26,2);// 桌面高光
  }else if(o===O.LOOM){
    ctx.strokeStyle='#8a5a30';ctx.lineWidth=3;ctx.strokeRect(cx-12,sy+5,24,TS-12);
    ctx.strokeStyle='#c9916a';ctx.lineWidth=1;
    for(let k=0;k<5;k++){ctx.beginPath();ctx.moveTo(cx-10,sy+10+k*6);ctx.lineTo(cx+10,sy+10+k*6);ctx.stroke();}
    for(let k=0;k<3;k++){ctx.beginPath();ctx.moveTo(cx-6+k*6,sy+5);ctx.lineTo(cx-6+k*6,sy+TS-12);ctx.stroke();}
    ctx.fillStyle='#c8813a';ctx.fillRect(cx-10,sy+22,20,5);
  }else if(o===O.FORGE){
    // 爐體（石磚）
    ctx.fillStyle='#7a6a58';ctx.fillRect(cx-13,sy+10,26,TS-16);
    ctx.fillStyle='#6a5a48';ctx.fillRect(cx-11,sy+12,22,TS-20);
    // 爐口
    ctx.fillStyle='#2a1e10';ctx.fillRect(cx-8,sy+16,16,10);
    // 火焰
    const fl=Math.sin(W.timeAcc*9+x)*1.5;
    ctx.fillStyle='rgba(232,146,60,0.9)';flame(cx,sy+24,5+fl);
    ctx.fillStyle='rgba(243,208,80,0.85)';flame(cx,sy+24,3+fl*.5);
    // 煙囪
    ctx.fillStyle='#8a7a68';ctx.fillRect(cx-4,sy+4,8,8);
    // 高光
    ctx.fillStyle='rgba(255,255,200,.12)';ctx.fillRect(cx-12,sy+11,22,2);
    // ── 高階工坊：金邊脈動光暈 ──
    if(W.advancedForge){
      ctx.save();ctx.globalAlpha=0.25+Math.sin(W.timeAcc*5)*0.1;
      ctx.strokeStyle='#ffd700';ctx.lineWidth=2;ctx.strokeRect(cx-13,sy+10,26,TS-16);
      ctx.restore();
    }
  }else if(o===O.STAIRS_UP||o===O.STAIRS_DOWN){
    const up=o===O.STAIRS_UP;
    // 背景光暈
    const pulse=0.55+0.2*Math.sin((W.timeAcc||0)*3);
    ctx.fillStyle=up?`rgba(80,200,160,${pulse})`:`rgba(220,120,80,${pulse})`;
    ctx.beginPath();ctx.arc(cx,sy+TS/2,13,0,Math.PI*2);ctx.fill();
    // 階梯格
    ctx.fillStyle=up?'#2a6a58':'#7a3020';
    const steps=3;
    for(let k=0;k<steps;k++){
      const sw=10+k*5,sh=3;
      const sx2=cx-sw/2;
      const sy2=up?(sy+TS-7-k*5):(sy+7+k*5);
      ctx.fillRect(sx2,sy2,sw,sh);
    }
    // 方向箭頭
    ctx.fillStyle='#fff';ctx.font='bold 13px sans-serif';ctx.textAlign='center';
    ctx.fillText(up?'▲':'▼',cx,sy+(up?15:TS-4));
    // 目標樓層標籤
    const destLabel=up?(W.inDungeon&&W.dungeonFloor<=1?'出':'B'+(W.dungeonFloor-1)):('B'+(W.dungeonFloor+1));
    ctx.font='bold 9px sans-serif';
    ctx.fillStyle=up?'#a0ffe0':'#ffc0a0';
    ctx.fillText(destLabel,cx,sy+(up?TS-5:13));
  }else if(o===O.CHEST){
    const opened=(W.aux[i]||0)>0;
    ctx.fillStyle='#8a5a30';ctx.fillRect(cx-10,sy+TS-(opened?12:20),20,opened?8:14);
    ctx.fillStyle='#c48a40';ctx.fillRect(cx-10,sy+TS-(opened?12:20),20,5);
    ctx.fillStyle='#e8b840';ctx.fillRect(cx-3,sy+TS-(opened?10:18),6,4);
    if(!opened){ctx.fillStyle='rgba(255,220,80,.4)';ctx.fillRect(cx-9,sy+TS-20,18,3);}
  }else if(o===O.GRAVE){
    ctx.fillStyle='#9a9186';ctx.fillRect(cx-4,sy+TS-18,8,14);
    ctx.beginPath();ctx.arc(cx,sy+TS-18,5,Math.PI,0);ctx.fill();
    ctx.strokeStyle='#7a6a58';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(cx-8,sy+TS-10);ctx.lineTo(cx+8,sy+TS-10);ctx.stroke();
    ctx.fillStyle='rgba(200,80,80,.7)';ctx.font='700 8px sans-serif';ctx.textAlign='center';ctx.fillText('†',cx,sy+TS-6);
  }else if(o===O.PORTAL){
    const pulse=0.6+0.3*Math.abs(Math.sin((W.timeAcc||0)*4));
    ctx.save();
    // 外光環
    const grad=ctx.createRadialGradient(cx,sy+TS/2,2,cx,sy+TS/2,14);
    grad.addColorStop(0,`rgba(180,100,255,${pulse})`);
    grad.addColorStop(1,'rgba(80,0,180,0)');
    ctx.fillStyle=grad;ctx.beginPath();ctx.arc(cx,sy+TS/2,14,0,Math.PI*2);ctx.fill();
    // 渦旋環
    ctx.strokeStyle=`rgba(220,160,255,${pulse})`;ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(cx,sy+TS/2,8,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle=`rgba(255,220,255,${pulse*.7})`;ctx.lineWidth=1;
    ctx.beginPath();ctx.arc(cx,sy+TS/2,5,0,Math.PI*2);ctx.stroke();
    // 中心
    ctx.fillStyle=`rgba(240,200,255,${pulse})`;ctx.beginPath();ctx.arc(cx,sy+TS/2,3,0,Math.PI*2);ctx.fill();
    ctx.restore();
    ctx.fillStyle='#fff';ctx.font='bold 8px sans-serif';ctx.textAlign='center';
    ctx.fillText('出口',cx,sy+TS-4);
  }else if(o===O.RAID_GATE){
    const pulse=0.6+0.3*Math.abs(Math.sin((W.timeAcc||0)*4));
    ctx.save();
    const grad=ctx.createRadialGradient(cx,sy+TS/2,2,cx,sy+TS/2,14);
    grad.addColorStop(0,`rgba(255,190,60,${pulse})`);
    grad.addColorStop(1,'rgba(180,90,0,0)');
    ctx.fillStyle=grad;ctx.beginPath();ctx.arc(cx,sy+TS/2,14,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=`rgba(255,220,140,${pulse})`;ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(cx,sy+TS/2,8,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle=`rgba(255,250,210,${pulse*.7})`;ctx.lineWidth=1;
    ctx.beginPath();ctx.arc(cx,sy+TS/2,5,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle=`rgba(255,240,200,${pulse})`;ctx.beginPath();ctx.arc(cx,sy+TS/2,3,0,Math.PI*2);ctx.fill();
    ctx.restore();
    ctx.fillStyle='#fff';ctx.font='bold 8px sans-serif';ctx.textAlign='center';
    ctx.fillText('地城',cx,sy+TS-4);
  }else if(o===O.STORAGE){
    // 木箱本體
    ctx.fillStyle='#7a4a20';ctx.fillRect(cx-11,sy+TS-22,22,18);
    ctx.strokeStyle='#4a2a08';ctx.lineWidth=2;ctx.strokeRect(cx-11,sy+TS-22,22,18);
    // 箱蓋
    ctx.fillStyle='#8a5828';ctx.fillRect(cx-11,sy+TS-22,22,5);
    // 金屬束帶
    ctx.strokeStyle='#9a9060';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(cx-11,sy+TS-13);ctx.lineTo(cx+11,sy+TS-13);ctx.stroke();
    ctx.beginPath();ctx.moveTo(cx-4,sy+TS-22);ctx.lineTo(cx-4,sy+TS-4);
    ctx.moveTo(cx+4,sy+TS-22);ctx.lineTo(cx+4,sy+TS-4);ctx.stroke();
    // 鎖扣
    ctx.fillStyle='#d8c060';ctx.fillRect(cx-3,sy+TS-18,6,5);
  }
}

function ambientDark(){
  if(W.inDungeon)return 0.88;
  const t=W.tod;
  if(t>=0.24&&t<0.70)return 0;
  if(t>=0.70&&t<0.80)return(t-0.70)/0.10*0.72;
  if(t>=0.80||t<0.16)return 0.72;
  return 0.72*(1-(t-0.16)/0.08);
}
const lightCv=document.createElement('canvas');
function drawNight(dark){
  if(dark<=0.01)return;
  lightCv.width=cv.width;lightCv.height=cv.height;
  const lc=lightCv.getContext('2d');lc.setTransform(dpr,0,0,dpr,0,0);
  lc.fillStyle='rgba(10,18,40,'+dark+')';lc.fillRect(0,0,vw,vh);
  lc.globalCompositeOperation='destination-out';
  const punch=(x,y,r,a)=>{const g=lc.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(0,0,0,'+a+')');g.addColorStop(1,'rgba(0,0,0,0)');lc.fillStyle=g;lc.beginPath();lc.arc(x,y,r,0,Math.PI*2);lc.fill();};
  punch(W.px*TS+TS/2-camX,W.py*TS+TS/2-camY,(W.inDungeon?TS*1.8:TS*2.6),0.85);
  const x0=Math.max(0,Math.floor(camX/TS)-4),y0=Math.max(0,Math.floor(camY/TS)-4);
  const x1=Math.min(SIZE-1,Math.ceil((camX+vw)/TS)+4),y1=Math.min(SIZE-1,Math.ceil((camY+vh)/TS)+4);
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
    const o=W.obj[y*SIZE+x];
    if(o===O.FIRE)punch(x*TS+TS/2-camX,y*TS+TS/2-camY,TS*4.5+Math.sin(W.timeAcc*7+x)*4,0.95);
    else if(o===O.HUT)punch(x*TS+TS/2-camX,y*TS+TS/2-camY,TS*3,0.8);
    else if(o===O.MONU)punch(x*TS+TS/2-camX,y*TS-camY,TS*5,0.9);
    else if(o===O.LOOM||o===O.WORKBENCH)punch(x*TS+TS/2-camX,y*TS+TS/2-camY,TS*1.5,0.4);
    else if(o===O.FORGE)punch(x*TS+TS/2-camX,y*TS+TS/2-camY,TS*2.5+Math.sin(W.timeAcc*7+x)*3,0.75);
  }
  lc.globalCompositeOperation='source-over';
  ctx.drawImage(lightCv,0,0,cv.width,cv.height,0,0,vw,vh);
}

function render(){
  const tx=W.px*TS+TS/2-vw/2,ty=W.py*TS+TS/2-vh/2;
  if(!camInit){camX=tx;camY=ty;camInit=true;}
  camX+=(tx-camX)*.12;camY+=(ty-camY)*.12;
  ctx.fillStyle='#1c2c24';ctx.fillRect(0,0,vw,vh);
  const x0=Math.max(0,Math.floor(camX/TS)),y0=Math.max(0,Math.floor(camY/TS));
  const x1=Math.min(SIZE-1,Math.ceil((camX+vw)/TS)),y1=Math.min(SIZE-1,Math.ceil((camY+vh)/TS));
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){if(!W.disc[y*SIZE+x])continue;drawTile(x,y,Math.round(x*TS-camX),Math.round(y*TS-camY));}
  for(let y=y0;y<=y1;y++){
    for(let x=x0;x<=x1;x++){if(!W.disc[y*SIZE+x])continue;drawObj(x,y,Math.round(x*TS-camX),Math.round(y*TS-camY));}
    // 動物、敵人按行繪製
    for(const a of W.animals){if(Math.floor(a.y)===y&&W.disc[Math.floor(a.y)*SIZE+Math.floor(a.x)])drawAnimal(a);}
    for(const e of (W.enemies||[])){if(e.hp>0&&Math.floor(e.y)===y&&W.disc[Math.floor(e.y)*SIZE+Math.floor(e.x)])drawEnemy(e);}
    if(y===W.py)drawPlayer();
  }
  // 面向格虛線高亮
  const f=faceTile();
  if(f&&W.disc[f.i]){
    ctx.strokeStyle='rgba(255,250,220,.6)';ctx.lineWidth=2.5;ctx.setLineDash([6,5]);
    ctx.strokeRect(Math.round(f.x*TS-camX)+3,Math.round(f.y*TS-camY)+3,TS-6,TS-6);
    ctx.setLineDash([]);
  }
  ctx.fillStyle='#1c2c24';
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){if(!W.disc[y*SIZE+x])ctx.fillRect(Math.round(x*TS-camX),Math.round(y*TS-camY),TS,TS);}
  // 漂浮字
  ctx.textAlign='center';
  floats=floats.filter(fl=>{
    fl.t+=0.016;ctx.globalAlpha=Math.max(0,1-fl.t/1.1);
    ctx.font='700 13px sans-serif';
    ctx.fillStyle='#fff';ctx.strokeStyle='rgba(0,0,0,.5)';ctx.lineWidth=3;
    const yy=fl.y-camY-fl.t*24;ctx.strokeText(fl.txt,fl.x-camX,yy);ctx.fillText(fl.txt,fl.x-camX,yy);
    ctx.globalAlpha=1;return fl.t<1.1;
  });
  drawNight(ambientDark());
  // ── 釣魚小遊戲 Bar（畫在夜間遮罩之上）──
  if(W._fishing&&W._fishing.state==='biting'){
    const fm=W._fishing;
    const bw=92,bh=13;
    const bx=Math.round(W.px*TS+TS/2-camX-bw/2);
    const by=Math.round(W.py*TS-camY-52);
    // 背景
    ctx.fillStyle='rgba(0,0,0,.7)';ctx.fillRect(bx-3,by-18,bw+6,bh+22);
    ctx.fillStyle='#fff';ctx.font='700 9px sans-serif';ctx.textAlign='center';
    ctx.fillText('🎣 F 釣起',bx+bw/2,by-6);
    // 紅色底
    ctx.fillStyle='#7a2020';ctx.fillRect(bx,by,bw,bh);
    // 綠色區（脈動：偶粗偶細）
    const pulse=.78+.28*Math.abs(Math.sin((W.timeAcc||0)*2.8));
    const gw=Math.max(4,Math.round(fm.greenW*pulse*bw));
    const gs=Math.round(fm.greenStart*bw);
    ctx.fillStyle='#44c432';ctx.fillRect(bx+gs,by,gw,bh);
    // 白色游標
    const cx=Math.round(fm.cursorPos*bw);
    ctx.fillStyle='#fff';ctx.fillRect(bx+cx-2,by-2,4,bh+4);
    // 倒計時黃條
    ctx.fillStyle='#e8d030';ctx.fillRect(bx,by+bh-2,Math.max(0,Math.round((fm.biteTimer/5)*bw)),2);
  }
}

let walkPhase=0;
function drawPlayer(){
  const px=W.px*TS+TS/2-camX,py=W.py*TS+TS/2-camY;
  const bob=Math.sin(walkPhase)*1.5;
  ctx.fillStyle='rgba(0,0,0,.2)';ctx.beginPath();ctx.ellipse(px,py+13,9,4,0,0,Math.PI*2);ctx.fill();
  // 身體顏色隨裝備
  const bodyCol={shirt:'#6690b8',coat:'#4a6080',wool_coat:'#b89868'}[W.equipped.body]||'#c4744a';
  ctx.fillStyle=bodyCol;ctx.beginPath();ctx.moveTo(px-8,py+12);ctx.quadraticCurveTo(px,py-4+bob,px+8,py+12);ctx.closePath();ctx.fill();
  // 頭
  ctx.fillStyle='#f0d6b0';circle(px,py-6+bob,7);
  // 帽子
  if(W.equipped.head==='hat'){ctx.fillStyle='#7da462';ctx.beginPath();ctx.ellipse(px,py-9+bob,11,4,0,0,Math.PI*2);ctx.fill();circle(px,py-12+bob,6);ctx.strokeStyle='rgba(255,255,255,.4)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(px-8,py-10+bob);ctx.lineTo(px+8,py-10+bob);ctx.stroke();}
  else{ctx.fillStyle='#d8a94e';ctx.beginPath();ctx.ellipse(px,py-9+bob,11,4,0,0,Math.PI*2);ctx.fill();circle(px,py-12+bob,6);}
  ctx.fillStyle='#2b3a30';const ex=W.face===2?-3:W.face===3?3:0;
  if(W.face!==0){circle(px-2.5+ex,py-5+bob,1.3);circle(px+2.5+ex,py-5+bob,1.3);}
  if(W.face===0){ctx.fillStyle='#7a5a36';ctx.fillRect(px-5,py-2+bob,10,9);}
  // 武器（劍）在左側
  const weapon=W.equipped.weapon;
  if(weapon&&weapon.includes('sword')&&W.face!==0){
    ctx.save();ctx.translate(px-10,py+2+bob);
    ctx.strokeStyle=weapon==='iron_sword'?'#c0c0b0':weapon==='stone_sword'?'#9a9a8a':'#8a5a30';
    ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-1,-8);ctx.lineTo(-1,6);ctx.stroke();
    ctx.fillStyle='#7a5030';ctx.fillRect(-4,-2,6,2);
    ctx.restore();
  }
  // 工具在手邊
  const hand=W.equipped.hand;
  if(hand&&W.face!==0){
    ctx.save();ctx.translate(px+10,py+2+bob);
    if(hand.includes('axe')){ctx.fillStyle='#6e4a2a';ctx.fillRect(-1,-6,2,10);ctx.fillStyle='#8d9187';ctx.beginPath();ctx.moveTo(-1,-6);ctx.lineTo(-5,-2);ctx.lineTo(-5,1);ctx.lineTo(-1,-1);ctx.closePath();ctx.fill();}
    else if(hand.includes('pick')){ctx.fillStyle='#6e4a2a';ctx.fillRect(-1,-6,2,10);ctx.fillStyle='#8d9187';ctx.fillRect(-5,-7,10,2);}
    else if(hand==='fishing_rod'){ctx.strokeStyle='#6e4a2a';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-1,-8);ctx.lineTo(-1,7);ctx.stroke();ctx.strokeStyle='#bbb';ctx.lineWidth=0.8;ctx.beginPath();ctx.moveTo(-1,-8);ctx.bezierCurveTo(7,-3,8,2,5,6);ctx.stroke();}
    ctx.restore();
  }
}

/* ══════════ 小地圖 ══════════ */
function renderMM(){
  if(!mmDirty)return;mmDirty=false;
  const img=mctx.createImageData(SIZE,SIZE);
  for(let i=0;i<SIZE*SIZE;i++){
    let c='#16241d';
    if(W.disc[i]){
      c=MM_COL[W.ter[i]];const o=W.obj[i];
      if(o===O.TREE)c='#3f6f3a';else if(o===O.RUIN)c=W.ruinFound[W.aux[i]|0]?'#9b8c63':'#d8a94e';
      else if(o>=O.FIRE)c='#c4744a';
    }
    const n=parseInt(c.slice(1),16);
    img.data[i*4]=n>>16;img.data[i*4+1]=(n>>8)&255;img.data[i*4+2]=n&255;img.data[i*4+3]=255;
  }
  mctx.putImageData(img,0,0);
}
function mmPlayer(){
  renderMM();
  mctx.fillStyle='#fff';
  if(Math.floor(W.timeAcc*2)%2===0)mctx.fillRect(W.px-1,W.py-1,3,3);
  else{mctx.fillRect(W.px,W.py,1,1);mmDirty=true;}
}

/* ══════════ HUD ══════════ */
const hintEl=document.getElementById('hint');
function updateHUD(){
  document.getElementById('dayText').textContent='第 '+W.day+' 天';
  document.getElementById('clockIcon').textContent=W.inDungeon?'🪨':(isNight()?'🌙':(W.tod>0.66?'🌇':'☀️'));
  document.getElementById('stamFill').style.width=W.stam+'%';
  document.getElementById('stamFill').style.background=W.stam<25?'#d4724e':'';
  document.getElementById('hpFill').style.width=((W.hp/W.maxHp)*100)+'%';
  document.getElementById('hpFill').style.background=W.hp/W.maxHp<0.25?'#d44040':'';
  const depthEl=document.getElementById('depthCard');
  depthEl.style.display=W.inDungeon?'':'none';
  if(W.inDungeon)depthEl.textContent='🪨 B'+W.dungeonFloor;
  document.getElementById('mmLabel').textContent=W.inDungeon?('B'+W.dungeonFloor+' 地城'):'島嶼全圖';
  const a=contextAction(),ca=combatAction();
  let hint='';
  if(a&&!a.soft)hint='⭐ F：'+a.label;
  else if(a)hint='F：'+a.label;
  if(ca){const cl=ca.label.length>14?ca.label.slice(0,14)+'…':ca.label;hint+=(hint?'  ':'')+'⚔ G：'+cl;}
  if(hint){hintEl.textContent=hint;hintEl.classList.add('show');}
  else hintEl.classList.remove('show');
}
