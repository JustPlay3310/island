// 小島開拓誌 — 敵人系統
// 共用全域：所有 src/*.js 以一般 <script> 依序載入（非 ES module，才能直接用 file:// 開啟）
'use strict';

/* ══════════ 敵人系統 ══════════ */
function nearestEnemy(){
  const f=faceTile();if(!f)return null;
  for(const e of (W.enemies||[])){
    if(e.hp<=0)continue;
    if(Math.abs(e.x-f.x)<1.3&&Math.abs(e.y-f.y)<1.3)return e;
  }
  return null;
}

function enemyAction(e){
  const def=ENEMY_DEF[e.kind];
  const wpn=equippedWeapon();
  const atk=3+(wpn&&EQUIP_DEF[wpn]?EQUIP_DEF[wpn].atk||0:0);
  const dmg=Math.max(1,atk+Math.floor(Math.random()*3)-1);
  return{label:'攻擊'+def.name+' (ATK ~'+atk+')',run(){
    if(wpn)wearEquip('weapon',1);
    e.hp-=dmg;spawnFloat(e.x,e.y,'-'+dmg);sfx('pick');
    if(e.hp<=0){
      e.hp=0;
      for(const drop of def.loot){if(Math.random()<drop.p)gain(drop.k,drop.n,{x:Math.floor(e.x),y:Math.floor(e.y)});}
      toast(def.ico+' '+def.name+'被打倒了!');sfx('quest');
      if(e.kind==='dungeon_lord'){
        // 地城魔王死亡後，在旁邊生成傳送門
        let px2=Math.floor(e.x),py2=Math.floor(e.y);
        outer2:for(let r=0;r<=5;r++)for(let _dy=-r;_dy<=r;_dy++)for(let _dx=-r;_dx<=r;_dx++){
          if(r>0&&Math.abs(_dx)<r&&Math.abs(_dy)<r)continue;
          const tx=px2+_dx,ty=py2+_dy;
          if(tx>0&&ty>0&&tx<SIZE-1&&ty<SIZE-1&&W.ter[ty*SIZE+tx]===T.ROCKY&&W.obj[ty*SIZE+tx]===O.NONE){
            px2=tx;py2=ty;break outer2;
          }
        }
        W.obj[py2*SIZE+px2]=O.PORTAL;mmDirty=true;
        setTimeout(()=>toast('🌀 傳送門開啟！踏上傳送門可直接回地表！'),600);
      }
    }else{
      toast(def.ico+' '+def.name+' HP:'+e.hp+'/'+e.maxHp);
      const pdmg=Math.max(1,def.atk+Math.floor(Math.random()*2)-1-playerDefense());
      W.hp=Math.max(0,W.hp-pdmg);spawnFloat(W.px,W.py,'💔-'+pdmg);sfx('no');
      if(W.hp<=0)playerDeath();else updateHUD();
    }
  },stam:0};
}

function updateEnemies(dt){
  for(const e of (W.enemies||[])){
    if(e.hp<=0)continue;
    const dist=Math.hypot(e.x-W.px,e.y-W.py);
    const def=ENEMY_DEF[e.kind];
    if(dist<7){e.state='chase';e.alertTimer=3;}
    else if(e.alertTimer>0){e.alertTimer-=dt;if(e.alertTimer<=0)e.state='idle';}
    if(e.state==='chase'){
      const ang=Math.atan2(W.py-e.y,W.px-e.x);
      e.vx=Math.cos(ang)*def.spd;e.vy=Math.sin(ang)*def.spd;
      e.attackTimer=(e.attackTimer||0)-dt;
      if(dist<1.1&&e.attackTimer<=0){
        const pdmg=Math.max(1,def.atk+Math.floor(Math.random()*2)-1-playerDefense());
        W.hp=Math.max(0,W.hp-pdmg);e.attackTimer=1.8;
        spawnFloat(W.px,W.py,'💔-'+pdmg);sfx('no');
        if(W.hp<=0)playerDeath();else updateHUD();
      }
    }else if(Math.random()<dt*0.25){
      const ang=Math.random()*Math.PI*2;
      e.vx=Math.cos(ang)*def.spd*.3;e.vy=Math.sin(ang)*def.spd*.3;
    }
    const nx=e.x+e.vx*dt,ny=e.y+e.vy*dt;
    const ti=Math.floor(ny)*SIZE+Math.floor(nx);
    if(Math.floor(nx)>=1&&Math.floor(ny)>=1&&Math.floor(nx)<SIZE-1&&Math.floor(ny)<SIZE-1
      &&W.ter[ti]===T.ROCKY&&W.obj[ti]===O.NONE)
      {e.x=clamp(nx,.5,SIZE-.5);e.y=clamp(ny,.5,SIZE-.5);}
    else{e.vx=0;e.vy=0;}
    e.vx*=.88;e.vy*=.88;
  }
}

function drawEnemy(e){
  if(e.hp<=0)return;
  const sx=Math.round(e.x*TS-camX),sy=Math.round(e.y*TS-camY);
  if(sx<-TS||sy<-TS||sx>vw+TS||sy>vh+TS)return;
  const cx=sx,cy=sy-6;
  ctx.fillStyle='rgba(0,0,0,.2)';ctx.beginPath();ctx.ellipse(cx,sy+6,8,3,0,0,Math.PI*2);ctx.fill();
  if(e.kind==='gopher'){
    ctx.fillStyle='#7a4a20';ctx.beginPath();ctx.ellipse(cx,cy+2,7,8,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#e8b080';ctx.beginPath();ctx.ellipse(cx,cy+4,4,5,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#201010';circle(cx-2.5,cy,1.5);circle(cx+2.5,cy,1.5);
    ctx.strokeStyle='#6a3a15';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(cx-8,cy+7);ctx.lineTo(cx-5,cy+10);ctx.stroke();
    ctx.beginPath();ctx.moveTo(cx+8,cy+7);ctx.lineTo(cx+5,cy+10);ctx.stroke();
  }else if(e.kind==='stone_crab'){
    ctx.fillStyle='#6a7a5a';ctx.beginPath();ctx.ellipse(cx,cy+3,10,7,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#5a6a4a';ctx.beginPath();ctx.arc(cx-12,cy,5,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(cx+12,cy,5,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#e84040';circle(cx-4,cy-3,2);circle(cx+4,cy-3,2);
  }else if(e.kind==='dungeon_lord'){
    // 巨大暗紫袍身
    ctx.fillStyle='#2a1040';
    ctx.beginPath();ctx.moveTo(cx-15,cy+18);ctx.lineTo(cx-11,cy-2);ctx.lineTo(cx+11,cy-2);ctx.lineTo(cx+15,cy+18);ctx.closePath();ctx.fill();
    // 頭骨
    ctx.fillStyle='#b8a888';ctx.beginPath();ctx.arc(cx,cy-12,10,0,Math.PI*2);ctx.fill();
    // 犄角
    ctx.fillStyle='#8000a0';
    ctx.beginPath();ctx.moveTo(cx-8,cy-20);ctx.lineTo(cx-6,cy-32);ctx.lineTo(cx-2,cy-20);ctx.fill();
    ctx.beginPath();ctx.moveTo(cx+2,cy-20);ctx.lineTo(cx+6,cy-32);ctx.lineTo(cx+8,cy-20);ctx.fill();
    // 發光眼
    const glow=0.6+0.4*Math.sin((W.timeAcc||0)*4);
    ctx.fillStyle=`rgba(255,60,0,${glow})`;circle(cx-4,cy-14,4);circle(cx+4,cy-14,4);
    ctx.fillStyle='#ffe000';circle(cx-4,cy-14,2);circle(cx+4,cy-14,2);
    // 法杖
    ctx.strokeStyle='#9060e0';ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(cx+12,cy-5);ctx.lineTo(cx+22,cy-28);ctx.stroke();
    ctx.fillStyle='#d080ff';circle(cx+22,cy-28,5);
    // 光環
    ctx.strokeStyle=`rgba(150,50,255,${0.2+0.15*Math.sin((W.timeAcc||0)*2.5)})`;ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(cx,cy-5,20+Math.sin((W.timeAcc||0)*3)*3,0,Math.PI*2);ctx.stroke();
  }else{
    ctx.fillStyle='#e8e8e0';ctx.beginPath();ctx.arc(cx,cy-8,7,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#e8e8e0';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx,cy+12);ctx.stroke();
    ctx.beginPath();ctx.moveTo(cx-6,cy+4);ctx.lineTo(cx+6,cy+4);ctx.stroke();
    ctx.beginPath();ctx.moveTo(cx,cy+12);ctx.lineTo(cx-4,cy+20);ctx.moveTo(cx,cy+12);ctx.lineTo(cx+4,cy+20);ctx.stroke();
    ctx.fillStyle='#2a2a20';circle(cx-2.5,cy-9,2);circle(cx+2.5,cy-9,2);
    ctx.strokeStyle='#c0c0b0';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(cx+8,cy+2);ctx.lineTo(cx+14,cy-8);ctx.stroke();
  }
  // HP bar（BOSS 血條較寬）
  const bw=e.kind==='dungeon_lord'?40:20,hr=e.hp/e.maxHp;
  ctx.fillStyle='#400';ctx.fillRect(cx-bw/2,sy-TS/2-6,bw,4);
  ctx.fillStyle=hr>0.5?'#6b6':'#c44';ctx.fillRect(cx-bw/2,sy-TS/2-6,Math.round(bw*hr),4);
  if(e.state==='chase'){ctx.fillStyle='#e84040';ctx.font='700 9px sans-serif';ctx.textAlign='center';ctx.fillText('!',cx,cy-14);}
}
