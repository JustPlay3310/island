// 小島開拓誌 — 提示/Toast、庫存 HUD、手帳、建造/製作/背包面板、角色縮圖
// 共用全域：所有 src/*.js 以一般 <script> 依序載入（非 ES module，才能直接用 file:// 開啟）
'use strict';

/* ══════════ UI:提示與 Toast ══════════ */
const toastsEl=document.getElementById('toasts');
function toast(msg,quest){
  const d=document.createElement('div');d.className='toast'+(quest?' quest':'');d.textContent=msg;
  toastsEl.appendChild(d);
  if(toastsEl.children.length>4)toastsEl.firstChild.remove();
  setTimeout(()=>d.remove(),3200);
}

function checkQuest(){
  let adv=false;
  while(W.questIdx<QUESTS.length){
    const q=QUESTS[W.questIdx];
    if(q.c(W.stats,W)){toast('📖 手帳:「'+q.t+'」完成!',true);W.questIdx++;adv=true;}
    else break;
  }
  if(adv){sfx('quest');renderQuests();}
}

/* ══════════ UI:庫存 HUD ══════════ */
const invBarEl=document.getElementById('invbar');
function renderInv(){
  invBarEl.innerHTML='';
  for(const [k,r] of Object.entries(RESOURCES)){
    const v=W.inv[k];
    if(v<=0&&!r.alwaysShow)continue;
    const d=document.createElement('div');d.className='slot';
    d.title=r.name;d.innerHTML='<span class="ico">'+r.ico+'</span>'+v;
    invBarEl.appendChild(d);
  }
}

/* ══════════ UI:手帳 ══════════ */
function renderQuests(){
  const el=document.getElementById('questList');el.innerHTML='';
  const intro=document.createElement('div');
  intro.style.cssText='font-size:11.5px;color:#8a7a52;padding:2px 4px 8px;line-height:1.6';
  intro.textContent='漂流到這座無名島已是第'+W.day+'天。把一切記下來。';
  el.appendChild(intro);
  QUESTS.forEach((q,idx)=>{
    const done=idx<W.questIdx;
    const d=document.createElement('div');
    d.className='qitem'+(done?' done':'')+(idx===W.questIdx?' cur':'');
    d.innerHTML='<div class="chk">'+(done?'✓':'')+'</div><div><b>'+q.t+'</b><span>'+q.d+'</span></div>';
    el.appendChild(d);
  });
  if(W.questIdx>=QUESTS.length){
    const d=document.createElement('div');
    d.style.cssText='text-align:center;font-weight:800;color:#7a611f;padding:10px;font-size:12.5px';
    d.textContent='✦ 手帳寫滿了。剩下的故事,由你書寫 ✦';
    el.appendChild(d);
  }
}

/* ══════════ UI:建造 ══════════ */
function costStr(c){return Object.keys(c).map(k=>{const r=RESOURCES[k]||EQUIP_DEF[k]||{ico:'?'};return(r.ico||'?')+c[k];}).join(' ')||'—';}
function canAfford(c){return Object.keys(c).every(k=>(W.inv[k]||0)>=c[k]);}
function renderBuild(){
  const el=document.getElementById('buildList');el.innerHTML='';
  const tip=document.createElement('div');
  tip.style.cssText='font-size:11px;color:#8a7a52;padding:0 2px 7px;';
  tip.textContent='建造在你面前那一格(虛線框)。';
  el.appendChild(tip);
  for(const b of BUILDS){
    if(b.sec){const s=document.createElement('div');s.className='bsec';s.textContent='── '+b.sec+' ──';el.appendChild(s);continue;}
    const unavail=b.need&&!b.need();
    const d=document.createElement('div');
    d.className='bitem'+((unavail||!canAfford(b.cost))?' locked':'');
    d.innerHTML='<div class="bico">'+b.ico+'</div><div class="binfo"><b>'+b.name+'</b><span>'+b.desc+(unavail?'<br><i>'+(b.needMsg||'先蒐集條件')+'</i>':'')+'</span></div><div class="bcost">'+costStr(b.cost)+(b.stamCost?' ⚡'+b.stamCost:'')+'</div>';
    d.onclick=()=>tryBuild(b);
    el.appendChild(d);
  }
}
function tryBuild(b){
  if(b.need&&!b.need()){toast(b.needMsg||'條件未達成');sfx('no');return;}
  if(!canAfford(b.cost)){toast('材料不夠:'+costStr(b.cost));sfx('no');return;}
  const sc=b.stamCost||4;if(W.stam<sc){toast('太累了');sfx('no');return;}
  const fx=W.px+DX[W.face],fy=W.py+DY[W.face];
  if(fx<0||fy<0||fx>=SIZE||fy>=SIZE){toast('那裡超出範圍');sfx('no');return;}
  const i=fy*SIZE+fx;
  if(!b.place(fx,fy,i)){toast('這一格不能放「'+b.name+'」');sfx('no');return;}
  for(const k in b.cost)W.inv[k]-=b.cost[k];
  W.stam-=sc;W.stats.builds++;mmDirty=true;sfx('build');
  toast(b.ico+' '+b.name+'完成!');
  if(b.id==='monu')onMonument();
  renderBuild();renderInv();checkQuest();
}

/* ══════════ UI:製作 ══════════ */
let craftTab='hand';
function nearBuilding(objType,r){
  r=r||3;
  for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
    const x=W.px+dx,y=W.py+dy;
    if(x<0||y<0||x>=SIZE||y>=SIZE)continue;
    if(W.obj[y*SIZE+x]===objType)return true;
  }
  return false;
}
function renderCraftTabs(){
  const el=document.getElementById('craftTabs');el.innerHTML='';
  for(const [id,station] of Object.entries(STATIONS)){
    const avail=!station.objType||nearBuilding(station.objType);
    const b=document.createElement('button');
    b.className='tab'+(craftTab===id?' active':'')+(avail?'':' locked');
    b.textContent=station.name+(avail?'':'🔒');
    b.title=avail?'':'需要站在旁邊才能使用';
    b.onclick=()=>{if(!avail){toast(station.name+' — 靠近後再開製作');sfx('no');return;}craftTab=id;renderCraftPanel();};
    el.appendChild(b);
  }
}
function renderCraftList(){
  const el=document.getElementById('craftList');el.innerHTML='';
  const recipes=RECIPES.filter(r=>r.req===craftTab);
  if(!recipes.length){const e=document.createElement('div');e.style.cssText='color:#8a7a52;font-size:12px;padding:8px';e.textContent='此平台暫無配方';el.appendChild(e);return;}
  // 銀/金/秘銀配方：需升級高階工坊
  const rareIds=new Set(['silver_axe','silver_pick','silver_sword','silver_hat','silver_armor','silver_boots','silver_gloves','gold_axe','gold_pick','gold_sword','gold_hat','gold_armor','gold_boots','gold_gloves','mithril_axe','mithril_pick','mithril_sword','mithril_hat','mithril_armor','mithril_boots','mithril_gloves','silver_ingot','gold_ingot','mithril_ingot','adv_forge']);
  const filtered=recipes.filter(r=>!rareIds.has(r.id)||W.advancedForge);
  const hiddenCount=recipes.length-filtered.length;
  for(const r of filtered){
    const afford=canAfford(r.cost);
    const d=document.createElement('div');d.className='ritem'+(afford?'':' cant');
    const makeable=afford?'':'disabled';
    d.innerHTML=`<div class="rico">${r.ico}</div><div class="rinfo"><b>${r.name}</b><span>${r.desc}</span></div><span class="rcost">${costStr(r.cost)}</span><button class="rmake" ${makeable}>製作</button>`;
    d.querySelector('.rmake').onclick=()=>doCraft(r);
    el.appendChild(d);
  }
  if(hiddenCount>0){
    const e=document.createElement('div');e.style.cssText='font-size:11px;color:#8a7a52;padding:4px';
    e.textContent=(W.advancedForge?'已':'未')+'解鎖高階工坊（還隱藏 '+hiddenCount+' 種銀/金/秘銀配方）';
    el.appendChild(e);
  }
}
function renderCraftPanel(){renderCraftTabs();renderCraftList();}
function doCraft(recipe){
  if(!canAfford(recipe.cost)){toast('材料不足:'+costStr(recipe.cost));sfx('no');return;}
  for(const k in recipe.cost)W.inv[k]-=recipe.cost[k];
  // ── 高階工坊升級 ──
  if(recipe.id==='adv_forge'){
    W.advancedForge=true;sfx('build');
    toast('⚒️ 鍛造爐升級為高階工坊！解鎖銀/金/秘銀配方。');
    renderInv();renderCraftPanel();checkQuest();return;
  }
  if(!W.invDur)W.invDur={};
  for(const k in recipe.gives){
    W.inv[k]=(W.inv[k]||0)+recipe.gives[k];
    const _def=EQUIP_DEF[k];
    if(_def&&_def.durability!=null){
      if(!W.invDur[k])W.invDur[k]=[];
      for(let _i=0;_i<recipe.gives[k];_i++)W.invDur[k].push(_def.durability);
    }
  }
  sfx('build');
  const items=Object.keys(recipe.gives).map(k=>EQUIP_DEF[k]?(EQUIP_DEF[k].ico+' '+EQUIP_DEF[k].name):recipe.ico+' '+recipe.name);
  toast('製作完成:'+items.join('、'));
  renderInv();renderCraftPanel();renderBagPanel();checkQuest();
}

/* ══════════ UI:背包 / 裝備 ══════════ */
function renderBagPanel(){
  // 裝備槽
  const slotsEl=document.getElementById('equipSlots');slotsEl.innerHTML='';
  const slotDef=[['head','頭部'],['body','身體'],['hand','工具'],['weapon','武器'],['hands','手套'],['feet','腳部']];
  for(const [slot,label] of slotDef){
    const equipped=W.equipped[slot];
    const info=equipped?EQUIP_DEF[equipped]:null;
    const dur=W.equipDur[slot];
    const durHtml=(info&&info.durability!==null&&dur!==null)
      ?`<span style="font-size:10px;font-weight:800;margin:0 4px;color:${dur/info.durability>0.5?'#5a9050':dur/info.durability>0.25?'#c4a030':'#c04030'}">${dur}/${info.durability}</span>`
      :'';
    const d=document.createElement('div');d.className='eslot';
    d.innerHTML=`<span class="eslot-lbl">${label}</span><span class="eslot-item${info?'':' eslot-empty'}">${info?(info.ico+' '+info.name):'（空）'}</span>${durHtml}${info?`<button class="uneq" onclick="unequipSlot('${slot}')">卸下</button>`:''}`;
    slotsEl.appendChild(d);
  }
  if(Object.values(W.equipped).some(v=>v)){
    const desc=document.createElement('div');
    desc.style.cssText='font-size:11px;color:#6b5d3f;padding:4px 2px;line-height:1.6;';
    const lines=[];
    for(const slot of ['head','body','hand','weapon','hands','feet']){
      const eq=W.equipped[slot];
      if(eq&&EQUIP_DEF[eq])lines.push(EQUIP_DEF[eq].ico+' '+EQUIP_DEF[eq].desc);
    }
    desc.textContent='效果:'+lines.join(' · ');
    slotsEl.appendChild(desc);
  }
  // 未裝備的裝備品（每件分開顯示以反映個別耐久）
  const invEqEl=document.getElementById('invEquipList');invEqEl.innerHTML='';
  const hasInvEq=Object.keys(EQUIP_DEF).some(k=>(W.inv[k]||0)>0);
  if(hasInvEq){
    const title=document.createElement('b');title.textContent='可裝備的物品';invEqEl.appendChild(title);
    for(const [kid,def] of Object.entries(EQUIP_DEF)){
      const cnt=W.inv[kid]||0;if(!cnt)continue;
      if(def.durability!=null){
        // 有耐久的裝備：每件獨立一格
        const durArr=Array.isArray(W.invDur&&W.invDur[kid])?[...W.invDur[kid]]:[];
        // 從陣列末尾顯示（pop 取最後一個）
        for(let _i=durArr.length-1;_i>=0;_i--){
          const dur=durArr[_i];
          const col=dur/def.durability>0.5?'#5a9050':dur/def.durability>0.25?'#c4a030':'#c04030';
          const d=document.createElement('div');d.className='eitem';
          d.innerHTML=`<span class="eitem-ico">${def.ico}</span><div style="flex:1"><span class="eitem-lbl">${def.name}</span><span style="font-size:10px;font-weight:700;color:${col};margin-left:4px">${dur}/${def.durability}</span><div class="eitem-desc">${def.desc}</div></div>`;
          const btn=document.createElement('button');btn.className='eq-btn';btn.textContent='裝備';
          btn.onclick=()=>equipItem(kid);d.appendChild(btn);invEqEl.appendChild(d);
        }
        // 未追蹤的新品（應該很少出現，但保險起見）
        const freshCnt=Math.max(0,cnt-durArr.length);
        for(let _i=0;_i<freshCnt;_i++){
          const d=document.createElement('div');d.className='eitem';
          d.innerHTML=`<span class="eitem-ico">${def.ico}</span><div style="flex:1"><span class="eitem-lbl">${def.name}</span><span style="font-size:10px;font-weight:700;color:#5a9050;margin-left:4px">${def.durability}/${def.durability}</span><div class="eitem-desc">${def.desc}</div></div>`;
          const btn=document.createElement('button');btn.className='eq-btn';btn.textContent='裝備';
          btn.onclick=()=>equipItem(kid);d.appendChild(btn);invEqEl.appendChild(d);
        }
      }else{
        // 無耐久裝備（帽子、外套等）：合并顯示數量
        const d=document.createElement('div');d.className='eitem';
        d.innerHTML=`<span class="eitem-ico">${def.ico}</span><div style="flex:1"><span class="eitem-lbl">${def.name}</span><div class="eitem-desc">${def.desc}</div></div><span style="font-size:11px;color:#8a7a52;margin-right:6px">×${cnt}</span>`;
        const btn=document.createElement('button');btn.className='eq-btn';btn.textContent='裝備';
        btn.onclick=()=>equipItem(kid);d.appendChild(btn);invEqEl.appendChild(d);
      }
    }
  }
  // 糧食
  document.getElementById('foodCount').textContent=W.inv.food||0;
  // 重繪紙娃娃
  drawDoll();
}

function equipItem(id){
  if(!(W.inv[id]>0)){toast('沒有這個物品了');return;}
  const def=EQUIP_DEF[id];if(!def){toast('無法裝備');return;}
  const slot=def.slot;
  if(!W.invDur)W.invDur={};
  // 先讀取新裝備的耐久（在歸還舊裝備之前），避免舊裝備耐久污染
  const arr=Array.isArray(W.invDur[id])?W.invDur[id]:[];
  const newDur=arr.length>0?arr.pop():(def.durability!=null?def.durability:null);
  if(arr.length)W.invDur[id]=arr;else delete W.invDur[id];
  // 歸還舊裝備並記錄耐久
  const prev=W.equipped[slot];const prevDur=W.equipDur[slot];
  W.inv[id]--;W.equipped[slot]=id;W.equipDur[slot]=newDur;
  if(prev){
    W.inv[prev]=(W.inv[prev]||0)+1;
    if(EQUIP_DEF[prev]&&EQUIP_DEF[prev].durability!=null&&prevDur!=null){
      if(!W.invDur[prev])W.invDur[prev]=[];W.invDur[prev].push(prevDur);
    }
  }
  sfx('build');toast(def.ico+' '+def.name+' 裝備完成!');
  renderBagPanel();renderInv();checkQuest();
}
function unequipSlot(slot){
  const eq=W.equipped[slot];if(!eq)return;
  if(!W.invDur)W.invDur={};
  if(EQUIP_DEF[eq]&&EQUIP_DEF[eq].durability!=null&&W.equipDur[slot]!=null){
    if(!W.invDur[eq])W.invDur[eq]=[];W.invDur[eq].push(W.equipDur[slot]);
  }
  W.inv[eq]=(W.inv[eq]||0)+1;W.equipped[slot]=null;W.equipDur[slot]=null;
  sfx('pick');toast(EQUIP_DEF[eq].ico+' 已卸下');
  renderBagPanel();renderInv();
}
function wearEquip(slot,amount){
  amount=amount||1;
  const id=W.equipped[slot];if(!id)return;
  const def=EQUIP_DEF[id];if(def.durability===null)return;
  W.equipDur[slot]=Math.max(0,(W.equipDur[slot]||0)-amount);
  if(W.equipDur[slot]<=0){
    toast(def.ico+' '+def.name+' 損壞了！');
    W.equipped[slot]=null;W.equipDur[slot]=null;
    sfx('no');renderBagPanel();renderInv();
  }
}
window.equipItem=equipItem;window.unequipSlot=unequipSlot;

/* ══════════ 角色縮圖（同遊戲內風格，朝下走路） ══════════ */
const dollCv=document.getElementById('dollCanvas');
const dc=dollCv.getContext('2d');
function drawDoll(){
  if(!W)return;
  const W2=80,H2=120;
  dc.clearRect(0,0,160,240);
  dc.save();dc.scale(2,2);
  // 草地背景
  dc.fillStyle='#8fb56b';dc.fillRect(0,0,W2,H2);
  dc.fillStyle='#7da462';
  for(let gy=0;gy<H2;gy+=10)for(let gx=0;gx<W2;gx+=10){
    const hv=(Math.sin(gx*7.3+gy*13.7)*.5+.5);
    if(hv>.55)dc.fillRect(gx+(hv*6|0),gy+(hv*8|0)%8,4,3);
  }
  dc.fillStyle='rgba(0,0,0,.07)';dc.fillRect(0,H2-20,W2,20);
  const px=W2/2,py=H2*.58;
  const bob=Math.sin((W.timeAcc||0)*8)*1.8;
  // 影子
  dc.fillStyle='rgba(0,0,0,.22)';dc.beginPath();dc.ellipse(px,py+13,9,3.5,0,0,Math.PI*2);dc.fill();
  // 身體
  const bodyCol={shirt:'#6690b8',coat:'#4a6080',wool_coat:'#b89868'}[W.equipped.body]||'#c4744a';
  dc.fillStyle=bodyCol;dc.beginPath();dc.moveTo(px-8,py+12);dc.quadraticCurveTo(px,py-4+bob,px+8,py+12);dc.closePath();dc.fill();
  // 頭
  dc.fillStyle='#f0d6b0';dc.beginPath();dc.arc(px,py-6+bob,7,0,Math.PI*2);dc.fill();
  // 帽子
  if(W.equipped.head==='hat'){
    dc.fillStyle='#7da462';dc.beginPath();dc.ellipse(px,py-9+bob,11,4,0,0,Math.PI*2);dc.fill();
    dc.beginPath();dc.arc(px,py-12+bob,6,0,Math.PI*2);dc.fill();
    dc.strokeStyle='rgba(255,255,255,.4)';dc.lineWidth=1.5;
    dc.beginPath();dc.moveTo(px-8,py-10+bob);dc.lineTo(px+8,py-10+bob);dc.stroke();
  }else{
    dc.fillStyle='#d8a94e';dc.beginPath();dc.ellipse(px,py-9+bob,11,4,0,0,Math.PI*2);dc.fill();
    dc.beginPath();dc.arc(px,py-12+bob,6,0,Math.PI*2);dc.fill();
  }
  // 眼睛（朝下）
  dc.fillStyle='#2b3a30';
  dc.beginPath();dc.arc(px-2.5,py-5+bob,1.3,0,Math.PI*2);dc.fill();
  dc.beginPath();dc.arc(px+2.5,py-5+bob,1.3,0,Math.PI*2);dc.fill();
  // 武器（劍，左側）
  const wpn=W.equipped.weapon;
  if(wpn&&wpn.includes('sword')){
    dc.save();dc.translate(px-10,py+2+bob);
    dc.strokeStyle=wpn==='iron_sword'?'#c0c0b0':wpn==='stone_sword'?'#9a9a8a':'#8a5a30';
    dc.lineWidth=2;dc.beginPath();dc.moveTo(-1,-8);dc.lineTo(-1,6);dc.stroke();
    dc.fillStyle='#7a5030';dc.fillRect(-4,-2,6,2);dc.restore();
  }
  // 工具（右側）
  const hand=W.equipped.hand;
  if(hand){
    dc.save();dc.translate(px+10,py+2+bob);
    if(hand.includes('axe')){
      dc.fillStyle='#6e4a2a';dc.fillRect(-1,-6,2,10);
      dc.fillStyle='#8d9187';dc.beginPath();dc.moveTo(-1,-6);dc.lineTo(-5,-2);dc.lineTo(-5,1);dc.lineTo(-1,-1);dc.closePath();dc.fill();
    }else if(hand.includes('pick')){
      dc.fillStyle='#6e4a2a';dc.fillRect(-1,-6,2,10);dc.fillStyle='#8d9187';dc.fillRect(-5,-7,10,2);
    }else if(hand==='fishing_rod'){
      dc.strokeStyle='#6e4a2a';dc.lineWidth=1.5;dc.beginPath();dc.moveTo(-1,-8);dc.lineTo(-1,7);dc.stroke();
      dc.strokeStyle='#bbb';dc.lineWidth=0.8;dc.beginPath();dc.moveTo(-1,-8);dc.bezierCurveTo(7,-3,8,2,5,6);dc.stroke();
    }
    dc.restore();
  }
  dc.restore();
}
