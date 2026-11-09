// 小島開拓誌 — 鍵盤輸入、面板開關、移動、漂浮字
// 共用全域：所有 src/*.js 以一般 <script> 依序載入（非 ES module，才能直接用 file:// 開啟）
'use strict';

/* ══════════ 輸入 ══════════ */
const keys={};let moveCd=0,heldDir=-1,prevDir=-1,turnLock=0;
window.addEventListener('keydown',e=>{
  if(!running)return;
  const k=e.key.toLowerCase();
  if(['arrowup','arrowdown','arrowleft','arrowright',' ','enter'].includes(k))e.preventDefault();
  if(paused){
    if(k==='arrowup'||k==='w')navigatePanel('up');
    else if(k==='arrowdown'||k==='s')navigatePanel('down');
    else if(k==='arrowleft'||k==='a')navigatePanel('left');
    else if(k==='arrowright'||k==='d')navigatePanel('right');
    else if(k==='f'||k===' '||k==='enter')activatePanelFocus();
    else if(k==='t')togglePanel('buildPanel');
    else if(k==='r')togglePanel('craftPanel');
    else if(k==='e')togglePanel('bagPanel');
    else if(k==='q')togglePanel('journalPanel');
    else if(k==='escape')closePanels();
    return;
  }
  keys[k]=true;
  if(k==='f'||k===' ')doInteract();
  if(k==='g')doCombat();
  if(k==='t')togglePanel('buildPanel');
  if(k==='r')togglePanel('craftPanel');
  if(k==='e')togglePanel('bagPanel');
  if(k==='q')togglePanel('journalPanel');
  if(k==='m')document.getElementById('mute').click();
  if(k==='escape')closePanels();
});
window.addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false;});
function dirFromKeys(){
  if(keys['arrowup']||keys['w'])return 0;if(keys['arrowdown']||keys['s'])return 1;
  if(keys['arrowleft']||keys['a'])return 2;if(keys['arrowright']||keys['d'])return 3;return -1;
}
document.querySelectorAll('.dbtn').forEach(b=>{
  const d=+b.dataset.d;
  const on=e=>{e.preventDefault();heldDir=d;b.classList.add('on');};
  const off=e=>{e.preventDefault();if(heldDir===d)heldDir=-1;b.classList.remove('on');};
  b.addEventListener('pointerdown',on);b.addEventListener('pointerup',off);
  b.addEventListener('pointercancel',off);b.addEventListener('pointerleave',off);
});
document.getElementById('btnAct').onclick=()=>{if(running)doInteract();};
document.getElementById('btnFight').onclick=()=>{if(running)doCombat();};
document.getElementById('btnBuild').onclick=()=>togglePanel('buildPanel');
document.getElementById('btnCraft').onclick=()=>togglePanel('craftPanel');
document.getElementById('btnBag').onclick=()=>togglePanel('bagPanel');
document.getElementById('btnJournal').onclick=()=>togglePanel('journalPanel');
document.getElementById('eatBtn').onclick=eatFood;
document.querySelectorAll('.pclose').forEach(b=>b.onclick=()=>closePanels());
function togglePanel(id){
  const p=document.getElementById(id);const was=p.classList.contains('open');
  closePanels();
  if(!was){
    if(id==='buildPanel')renderBuild();
    if(id==='craftPanel')renderCraftPanel();
    if(id==='bagPanel')renderBagPanel();
    if(id==='journalPanel')renderQuests();
    if(id==='storagePanel')renderStoragePanel();
    p.classList.add('open');
    paused=true;panelFocusIdx=0;
    Object.keys(keys).forEach(k=>delete keys[k]);heldDir=-1;
    setTimeout(updatePanelFocus,50);
  }
}
function closePanels(){
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('open'));
  document.querySelectorAll('.panel-focused').forEach(el=>el.classList.remove('panel-focused'));
  paused=false;
}
cv.addEventListener('pointerdown',e=>{
  if(!running)return;
  const wx=Math.floor((e.clientX+camX)/TS),wy=Math.floor((e.clientY+camY)/TS);
  const dx=wx-W.px,dy=wy-W.py;
  if(Math.abs(dx)+Math.abs(dy)===1){W.face=dx===1?3:dx===-1?2:dy===1?1:0;doInteract();}
});
function tryMove(d){
  W.face=d;if(moveCd>0)return;
  const nx=W.px+DX[d],ny=W.py+DY[d];
  if(nx<0||ny<0||nx>=SIZE||ny>=SIZE)return;
  const i=ny*SIZE+nx,t=W.ter[i],o=W.obj[i];
  if(t===T.DEEP||t===T.WATER||t===T.MTN)return;
  if([O.TREE,O.ROCK,O.RUIN,O.FIRE,O.HUT,O.WELL,O.MONU,O.SAPLING,O.WORKBENCH,O.LOOM,O.FORGE,O.CHEST,O.STORAGE].includes(o))return;
  if(W._fishing&&W._fishing.state!=='idle')W._fishing={state:'idle'};
  W.px=nx;W.py=ny;
  const speedMul=hasBoots()?0.65:1;
  moveCd=((t===T.PATH||t===T.BRIDGE)?0.16:0.25)*speedMul;
  discover();
  // 樓梯自動觸發
  const ni=W.py*SIZE+W.px;
  if(W.obj[ni]===O.STAIRS_DOWN)goDownstairs();
  else if(W.obj[ni]===O.STAIRS_UP)goUpstairs();
  else if(W.obj[ni]===O.PORTAL)exitDungeon();
  else if(W.obj[ni]===O.RAID_GATE)enterRaidDungeonViaGate();
}

/* ══════════ 漂浮字 ══════════ */
let floats=[];
function spawnFloat(x,y,txt){floats.push({x:x*TS+TS/2,y:y*TS,txt,t:0});}
