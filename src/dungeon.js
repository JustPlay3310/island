// 小島開拓誌 — 死亡、地城進出與樓層
// 共用全域：所有 src/*.js 以一般 <script> 依序載入（非 ES module，才能直接用 file:// 開啟）
'use strict';

/* ══════════ 死亡 / 地城 ══════════ */
function collectDeathItems(){
  if(!W.deathItems)return;
  if(!W.invDur)W.invDur={};
  for(const [k,n] of Object.entries(W.deathItems)){
    if(n<=0)continue;
    W.inv[k]=(W.inv[k]||0)+n;
    // 裝備品從墓碑取回時以滿耐久度追蹤（死亡時耐久資訊已遺失）
    const _def=EQUIP_DEF[k];
    if(_def&&_def.durability!=null){
      if(!W.invDur[k])W.invDur[k]=[];
      for(let _i=0;_i<n;_i++)W.invDur[k].push(_def.durability);
    }
  }
  if(W.deathPos){
    const dp=W.deathPos,gi=dp.y*SIZE+dp.x;
    if(dp.dungeonIdx!==undefined){
      // 地城墓碑：從當前 obj 或快取移除
      if(W.inDungeon&&W.dungeonIdx===dp.dungeonIdx&&W.dungeonFloor===dp.floor){
        if(W.obj[gi]===O.GRAVE)W.obj[gi]=O.NONE;
      }else{
        const dk=dp.dungeonIdx+'_'+dp.floor;
        if(W.dungeons[dk]&&W.dungeons[dk].obj[gi]===O.GRAVE)W.dungeons[dk].obj[gi]=O.NONE;
      }
    }else{
      if(W.obj[gi]===O.GRAVE)W.obj[gi]=O.NONE;
    }
  }
  W.deathItems=null;W.deathPos=null;mmDirty=true;
  toast('✅ 取回了所有遺落物品!');sfx('quest');renderInv();renderBagPanel();
}

let _dying=false,_transitioning=false;
let paused=false,panelFocusIdx=0;

/* ── 儲存箱 ── */
function storageKey(i){
  return W.inDungeon?(W.dungeonIdx+'_'+W.dungeonFloor+'_'+i):('s_'+i);
}
function playerDefense(){
  return Object.values(W.equipped||{}).reduce((acc,eq)=>{
    const d=eq&&EQUIP_DEF[eq];return acc+(d&&d.def||0);},0);
}
let currentStorageIdx=-1;
function openStorage(i){
  currentStorageIdx=i;
  const k=storageKey(i);if(!W.storages[k])W.storages[k]={};
  togglePanel('storagePanel');
}
// 數量選擇器：在 row 內展開 slider + 確定/取消，並把鍵盤焦點移到「確定」
function openQtyPicker(row,triggerBtns,max,confirmLabel,onConfirm){
  triggerBtns.forEach(b=>b.style.display='none');
  const wrap=document.createElement('div');wrap.style.cssText='display:flex;align-items:center;gap:4px;margin-top:2px;width:100%;';
  const sl=document.createElement('input');sl.type='range';sl.min=1;sl.max=max;sl.value=max;sl.style.cssText='flex:1;min-width:60px';
  const numEl=document.createElement('span');numEl.textContent=max;numEl.style.cssText='min-width:22px;text-align:right;font-weight:700';
  sl.oninput=()=>{numEl.textContent=sl.value;};
  const ok=document.createElement('button');ok.className='rmake st-btn';ok.textContent=confirmLabel;ok.style.cssText='background:#2a6010;color:#fff';
  ok.onclick=()=>{const qty=parseInt(sl.value);if(qty>0)onConfirm(qty);renderStoragePanel();};
  const ca=document.createElement('button');ca.className='rmake st-btn';ca.textContent='取消';
  ca.onclick=()=>renderStoragePanel();
  wrap.appendChild(sl);wrap.appendChild(numEl);wrap.appendChild(ok);wrap.appendChild(ca);
  row.appendChild(wrap);
  // 鍵盤焦點移到「確定」（用面板導覽系統，而非原生 focus）
  const items=getPanelFocusables();
  const idx=items.indexOf(ok);if(idx>=0){panelFocusIdx=idx;updatePanelFocus();}
}
// 從箱子取出 n 件 rk 到背包，恢復耐久（箱內 st[rk+'_dur'] → W.invDur[rk]）
function takeFromStorage(st,rk,n){
  W.inv[rk]=(W.inv[rk]||0)+n;st[rk]-=n;if(st[rk]<=0)delete st[rk];
  const def2=EQUIP_DEF[rk];
  if(def2&&def2.durability!=null){
    if(!W.invDur)W.invDur={};const durArr=st[rk+'_dur']||[];
    for(let i=0;i<n;i++){const d=durArr.length>0?durArr.pop():def2.durability;(W.invDur[rk]=W.invDur[rk]||[]).push(d);}
    if(durArr.length)st[rk+'_dur']=durArr;else delete st[rk+'_dur'];
  }
}
// 從背包存入 n 件 rk 到箱子，保留耐久（W.invDur[rk] → st[rk+'_dur']）
function putToStorage(st,rk,n){
  st[rk]=(st[rk]||0)+n;W.inv[rk]-=n;
  const def2=EQUIP_DEF[rk];
  if(def2&&def2.durability!=null&&W.invDur&&W.invDur[rk]){
    for(let i=0;i<n&&W.invDur[rk].length;i++){const d=W.invDur[rk].pop();(st[rk+'_dur']=st[rk+'_dur']||[]).push(d);}
    if(!W.invDur[rk].length)delete W.invDur[rk];
  }
}
function renderStoragePanel(){
  if(currentStorageIdx<0)return;
  const k=storageKey(currentStorageIdx);
  const st=W.storages[k]||(W.storages[k]={});
  const el=document.getElementById('storageBody');el.innerHTML='';
  const allKeys=[...Object.keys(RESOURCES),...Object.keys(EQUIP_DEF)];
  // ── 箱內 ──
  const sh=document.createElement('div');
  sh.style.cssText='font-weight:800;margin-bottom:6px;color:var(--moss)';sh.textContent='📦 箱內';
  el.appendChild(sh);
  const stItems=allKeys.filter(rk=>(st[rk]||0)>0);
  if(!stItems.length){const em=document.createElement('div');em.style.cssText='color:#aaa;font-size:12px;padding:4px 0 8px';em.textContent='（空的）';el.appendChild(em);}
  for(const rk of stItems){
    const n=st[rk]||0;
    const row=document.createElement('div');
    row.style.cssText='display:flex;align-items:center;gap:6px;margin-bottom:4px;';
    const res=RESOURCES[rk]||EQUIP_DEF[rk];
    row.innerHTML=`<span style="width:22px;text-align:center">${res.ico}</span><span style="flex:1">${res.name}</span><b>${n}</b>`;
    if(n>1){
      const b1=document.createElement('button');b1.className='rmake st-btn';b1.textContent='取1';
      b1.onclick=()=>{takeFromStorage(st,rk,1);renderStoragePanel();renderInv();};
      row.appendChild(b1);
      const bm=document.createElement('button');bm.className='rmake st-btn';bm.textContent='取多';
      bm.onclick=()=>openQtyPicker(row,[b1,bm],n,'取出',(qty)=>{takeFromStorage(st,rk,qty);renderInv();});
      row.appendChild(bm);el.appendChild(row);
    }else{
      const ba=document.createElement('button');ba.className='rmake st-btn';ba.textContent='取出';
      ba.onclick=()=>{takeFromStorage(st,rk,1);renderStoragePanel();renderInv();};
      row.appendChild(ba);el.appendChild(row);
    }
  }
  // ── 分隔 ──
  const sep=document.createElement('hr');sep.style.margin='8px 0';el.appendChild(sep);
  const ih=document.createElement('div');
  ih.style.cssText='font-weight:800;margin-bottom:6px;color:var(--ink)';ih.textContent='🎒 背包（點存入）';
  el.appendChild(ih);
  // 已裝備的裝備品（可直接卸下存入）
  for(const [slot,eq] of Object.entries(W.equipped)){
    if(!eq)continue;
    const def=EQUIP_DEF[eq];if(!def)continue;
    const row=document.createElement('div');
    row.style.cssText='display:flex;align-items:center;gap:6px;margin-bottom:4px;background:#fff8e8;border-radius:6px;padding:3px 4px;';
    row.innerHTML=`<span style="width:22px;text-align:center">${def.ico}</span><span style="flex:1">${def.name}<span style="font-size:10px;color:#888;margin-left:4px;">[裝備中]</span></span>`;
    const btn=document.createElement('button');btn.className='rmake st-btn';btn.textContent='卸下存入';
    btn.style.cssText='background:#7a5a28;color:#fff;white-space:nowrap';
    btn.onclick=()=>{
      // 卸下存入：保留裝備的耐久度，存入儲存箱
      if(W.equipDur[slot]!=null){st[eq+'_dur']=(st[eq+'_dur']||[]);st[eq+'_dur'].push(W.equipDur[slot]);}
      W.equipped[slot]=null;W.equipDur[slot]=null;
      st[eq]=(st[eq]||0)+1;
      renderStoragePanel();renderBagPanel();
    };
    row.appendChild(btn);el.appendChild(row);
  }
  // 背包中的素材與裝備品
  const invItems=allKeys.filter(rk=>(W.inv[rk]||0)>0);
  const hasAny=invItems.length>0||Object.values(W.equipped).some(v=>v);
  if(!hasAny){const em=document.createElement('div');em.style.cssText='color:#aaa;font-size:12px;padding:4px 0';em.textContent='（背包是空的）';el.appendChild(em);}
  for(const rk of invItems){
    const n=W.inv[rk]||0;if(!n)continue;
    const row=document.createElement('div');
    row.style.cssText='display:flex;align-items:center;gap:6px;margin-bottom:4px;';
    const res=RESOURCES[rk]||EQUIP_DEF[rk];
    row.innerHTML=`<span style="width:22px;text-align:center">${res.ico}</span><span style="flex:1">${res.name}</span><b>${n}</b>`;
    if(n>1){
      const b1=document.createElement('button');b1.className='rmake st-btn';b1.textContent='存1';
      b1.style.cssText='background:#3a7a28;color:#fff';
      b1.onclick=()=>{putToStorage(st,rk,1);renderStoragePanel();renderInv();};
      row.appendChild(b1);
      const bm=document.createElement('button');bm.className='rmake st-btn';bm.textContent='存多';
      bm.style.cssText='background:#2a6010;color:#fff';
      bm.onclick=()=>openQtyPicker(row,[b1,bm],n,'確定',(qty)=>{putToStorage(st,rk,qty);renderInv();});
      row.appendChild(bm);
    }else{
      const ba1=document.createElement('button');ba1.className='rmake st-btn';ba1.textContent='存入';
      ba1.style.cssText='background:#3a7a28;color:#fff';
      ba1.onclick=()=>{putToStorage(st,rk,1);renderStoragePanel();renderInv();};
      row.appendChild(ba1);
    }
    el.appendChild(row);
  }
}

function getPanelFocusables(){
  const open=document.querySelector('.panel.open');if(!open)return[];
  if(open.id==='buildPanel')return Array.from(open.querySelectorAll('.bitem:not(.locked)'));
  if(open.id==='craftPanel')return Array.from(open.querySelectorAll('#craftList .rmake'));
  if(open.id==='bagPanel')return[...Array.from(document.querySelectorAll('.eq-btn')),
    ...Array.from(document.querySelectorAll('.uneq')),
    document.getElementById('eatBtn')].filter(Boolean);
  if(open.id==='journalPanel')return Array.from(open.querySelectorAll('.qitem'));
  if(open.id==='storagePanel')return Array.from(open.querySelectorAll('.st-btn')).filter(b=>b.style.display!=='none'&&b.offsetParent!==null);
  return[];
}
function updatePanelFocus(){
  document.querySelectorAll('.panel-focused').forEach(el=>el.classList.remove('panel-focused'));
  const items=getPanelFocusables();if(!items.length)return;
  panelFocusIdx=((panelFocusIdx%items.length)+items.length)%items.length;
  items[panelFocusIdx].classList.add('panel-focused');
  items[panelFocusIdx].scrollIntoView({block:'nearest',behavior:'smooth'});
}
function navigatePanel(dir){
  const open=document.querySelector('.panel.open');if(!open)return;
  if(open.id==='craftPanel'&&(dir==='left'||dir==='right')){
    const tabs=Array.from(open.querySelectorAll('.tab'));if(!tabs.length)return;
    const ai=tabs.findIndex(t=>t.classList.contains('active'));
    tabs[((ai+(dir==='right'?1:-1))+tabs.length)%tabs.length].click();
    panelFocusIdx=0;setTimeout(updatePanelFocus,50);return;
  }
  panelFocusIdx+=(dir==='up'||dir==='left'?-1:1);updatePanelFocus();
}
function activatePanelFocus(){
  const items=getPanelFocusables();if(items[panelFocusIdx])items[panelFocusIdx].click();
}
function _removeGrave(dp){
  const gi=dp.y*SIZE+dp.x;
  if(dp.dungeonIdx!==undefined){
    if(W.inDungeon&&W.dungeonIdx===dp.dungeonIdx&&W.dungeonFloor===dp.floor){
      if(W.obj[gi]===O.GRAVE)W.obj[gi]=O.NONE;
    }else{
      const dk=dp.dungeonIdx+'_'+dp.floor;
      if(W.dungeons[dk]&&W.dungeons[dk].obj[gi]===O.GRAVE)W.dungeons[dk].obj[gi]=O.NONE;
    }
  }else{
    if(W.obj[gi]===O.GRAVE)W.obj[gi]=O.NONE;
  }
}
function playerDeath(){
  if(_dying)return;_dying=true;

  // ── Roguelike 懲罰：已有未取回墓碑 → 舊物品永久消失 ──
  let hadOldGrave=false;
  if(W.deathItems&&W.deathPos){
    _removeGrave(W.deathPos);
    W.deathItems=null;W.deathPos=null;
    hadOldGrave=true;mmDirty=true;
  }

  // ── 收集當前物品 ──
  const items={};
  for(const k of Object.keys(W.inv))items[k]=(items[k]||0)+(W.inv[k]||0);
  for(const [slot,eq] of Object.entries(W.equipped)){if(eq)items[eq]=(items[eq]||0)+1;}
  const hasItems=Object.values(items).some(n=>n>0);

  // ── 放置新墓碑（有物品才放）──
  if(hasItems){
    W.deathItems=items;
    if(W.inDungeon){
      W.deathPos={x:W.px,y:W.py,dungeonIdx:W.dungeonIdx,floor:W.dungeonFloor};
      W.obj[W.py*SIZE+W.px]=O.GRAVE;
      // 把墓碑附近的敵人驅離，讓玩家有機會取回物品
      {const gx=W.px,gy=W.py;
      for(const e of (W.enemies||[])){
        if(e.hp<=0)continue;
        if(Math.hypot(e.x-gx,e.y-gy)<7){
          e.state='idle';e.alertTimer=0;e.vx=0;e.vy=0;
          for(let att=0;att<30;att++){
            const ang=Math.random()*Math.PI*2,nd=10+Math.random()*8;
            const nx=Math.round(gx+Math.cos(ang)*nd),ny=Math.round(gy+Math.sin(ang)*nd);
            if(nx>1&&ny>1&&nx<SIZE-2&&ny<SIZE-2){
              const ti=ny*SIZE+nx;
              if(W.ter[ti]===T.ROCKY&&W.obj[ti]===O.NONE){e.x=nx+0.5;e.y=ny+0.5;break;}
            }
          }
        }
      }}
      cacheFloor(W.dungeonIdx+'_'+W.dungeonFloor);
      // 保留各樓層已探索狀態（disc）與快取，玩家回頭取墓碑時不需重新探索
    }else{
      W.deathPos={x:W.px,y:W.py};
      W.obj[W.py*SIZE+W.px]=O.GRAVE;
    }
  }
  mmDirty=true;

  // 清空物品與裝備
  for(const k of Object.keys(W.inv))W.inv[k]=0;
  W.equipped={head:null,body:null,hand:null,hands:null,feet:null,weapon:null};
  W.equipDur={head:null,body:null,hand:null,hands:null,feet:null,weapon:null};
  W.hp=Math.round(W.maxHp/2);
  renderInv();renderBagPanel();
  sfx('no');
  const fade=document.getElementById('fade');fade.style.opacity=1;
  setTimeout(()=>{
    if(W.inDungeon&&W._surface){
      const s=W._surface;
      W.ter=s.ter;W.obj=s.obj;W.aux=s.aux;W.disc=s.disc;
      W.px=s.px;W.py=s.py;W.enemies=s.enemies||[];W.animals=s.animals||[];
      W._surface=null;W.inDungeon=false;W.dungeonIdx=-1;W.dungeonFloor=0;
      document.getElementById('depthCard').style.display='none';
    }
    camInit=false;mmDirty=true;discover();updateHUD();renderInv();renderBagPanel();
    if(hadOldGrave)toast('💀 再度倒下…遺落的物品已永久消失。');
    else if(hasItems)toast('💀 你倒下了…找 🪦 墓碑可取回物品。');
    else toast('💀 你倒下了。');
    fade.style.opacity=0;_dying=false;
    save();
  },800);
}

function genChestLoot(floor){
  const loot=[];
  const roll=(k,n,p)=>{if(Math.random()<p)loot.push({k,n});};
  roll('food',      2+Math.floor(Math.random()*3), 0.9);
  roll('stone',     3+Math.floor(Math.random()*4), 0.7);
  roll('coal',      1+Math.floor(Math.random()*2), floor>=2?0.6:0.2);
  roll('iron_ore',  1+Math.floor(Math.random()*3), floor>=2?0.5:0.1);
  roll('iron_ingot',1+Math.floor(Math.random()*2), floor>=3?0.4:0);
  // ── B3+ 銀系 ──
  roll('silver_ore',1+Math.floor(Math.random()*2), floor>=3?0.35:0);
  roll('silver_ingot',floor>=3?1:0, floor>=3?0.2:0);
  roll('silver_sword',1, floor>=3?0.12:0);
  roll('silver_axe', 1, floor>=3?0.08:0);
  roll('silver_hat', 1, floor>=3?0.08:0);
  roll('silver_boots',1, floor>=3?0.08:0);
  roll('silver_gloves',1, floor>=3?0.08:0);
  // ── B4+ 金系 ──
  roll('gold_ore',  1+Math.floor(Math.random()*2), floor>=4?0.3:0);
  roll('gold_ingot',floor>=4?1:0, floor>=4?0.15:0);
  roll('gold_sword', 1, floor>=4?0.10:0);
  roll('gold_axe',   1, floor>=4?0.06:0);
  roll('gold_hat',   1, floor>=4?0.06:0);
  roll('gold_boots', 1, floor>=4?0.06:0);
  roll('gold_gloves',1, floor>=4?0.06:0);
  // ── B5 秘銀 ──
  roll('mithril_ore',1+Math.floor(Math.random()*2), floor>=5?0.25:0);
  roll('mithril_ingot',floor>=5?1:0, floor>=5?0.12:0);
  roll('mithril_sword',1, floor>=5?0.08:0);
  roll('mithril_axe',  1, floor>=5?0.05:0);
  roll('mithril_hat',  1, floor>=5?0.05:0);
  roll('mithril_boots',1, floor>=5?0.05:0);
  roll('mithril_gloves',1, floor>=5?0.05:0);
  roll('relic',     1, floor>=4?0.4:0);
  // 基礎裝備掉落
  roll('stone_sword',1, floor>=2?0.12:0.05);
  roll('stone_axe',  1, floor>=2?0.08:0.03);
  roll('hat',        1, floor>=2?0.08:0.03);
  roll('boots',      1, floor>=3?0.12:0.04);
  roll('iron_sword', 1, floor>=3?0.15:0);
  roll('iron_axe',   1, floor>=3?0.10:0);
  roll('iron_pick',  1, floor>=4?0.15:0);
  roll('coat',       1, floor>=4?0.10:0);
  roll('gloves',     1, floor>=3?0.10:0.04);
  if(!loot.length)loot.push({k:'food',n:2});
  return loot;
}

function dungeonSeed(){return W.dungeonIdx===100?(W.raidSeedStr||W.seedStr):W.seedStr;}
function enterDungeon(ruinIdx){
  if(W.inDungeon||_transitioning)return;_transitioning=true;
  const fade=document.getElementById('fade');fade.style.opacity=1;
  setTimeout(()=>{
    W._surface={ter:W.ter,obj:W.obj,aux:W.aux,disc:W.disc,px:W.px,py:W.py,enemies:W.enemies||[],animals:W.animals||[]};
    W.animals=[];
    W.dungeonMaxFloor=5;
    const key=ruinIdx+'_1';
    if(!W.dungeons[key])W.dungeons[key]=genDungeon(W.seedStr,ruinIdx,1,5);
    const d=W.dungeons[key];
    W.ter=d.ter;W.obj=d.obj;W.aux=d.aux;W.disc=d.disc;
    W.enemies=d.enemies.map(e=>({...e}));
    W.px=d.spawnX;W.py=d.spawnY;
    W.inDungeon=true;W.dungeonIdx=ruinIdx;W.dungeonFloor=1;W.face=0;
    camInit=false;mmDirty=true;discover();updateHUD();
    toast('🪨 B1 地城 — 小心怪物!');
    fade.style.opacity=0;_transitioning=false;
  },650);
}
function exitDungeon(){
  if(!W.inDungeon||!W._surface||_transitioning)return;_transitioning=true;
  const fade=document.getElementById('fade');fade.style.opacity=1;
  setTimeout(()=>{
    cacheFloor(W.dungeonIdx+'_'+W.dungeonFloor);
    const s=W._surface;
    W.ter=s.ter;W.obj=s.obj;W.aux=s.aux;W.disc=s.disc;
    W.px=s.px;W.py=s.py;W.enemies=s.enemies||[];W.animals=s.animals||[];
    W._surface=null;W.inDungeon=false;W.dungeonIdx=-1;W.dungeonFloor=0;W.face=1;
    camInit=false;mmDirty=true;discover();updateHUD();
    toast('☀️ 回到地面了');
    document.getElementById('depthCard').style.display='none';
    fade.style.opacity=0;_transitioning=false;
  },650);
}
// 快取目前樓層狀態；spawnX/spawnY 永遠保留該層的固定入口（不被玩家當前位置覆蓋）
function cacheFloor(key){
  const prev=W.dungeons[key];
  W.dungeons[key]={ter:W.ter,obj:W.obj,aux:W.aux,disc:W.disc,enemies:W.enemies,
    spawnX:prev&&prev.spawnX!=null?prev.spawnX:W.px,
    spawnY:prev&&prev.spawnY!=null?prev.spawnY:W.py};
}
function goDownstairs(){
  const mf=W.dungeonMaxFloor||5;
  if(!W.inDungeon||W.dungeonFloor>=mf){toast('這已經是最深層了');return;}
  if(_transitioning)return;_transitioning=true;
  const nextFloor=W.dungeonFloor+1;
  const fade=document.getElementById('fade');fade.style.opacity=1;
  setTimeout(()=>{
    cacheFloor(W.dungeonIdx+'_'+W.dungeonFloor);
    const key=W.dungeonIdx+'_'+nextFloor;
    if(!W.dungeons[key])W.dungeons[key]=genDungeon(dungeonSeed(),W.dungeonIdx,nextFloor,mf);
    const d=W.dungeons[key];
    W.ter=d.ter;W.obj=d.obj;W.aux=d.aux;W.disc=d.disc;
    W.enemies=d.enemies.map(e=>({...e}));
    W.px=d.spawnX;W.py=d.spawnY;
    const ni1=W.py*SIZE+W.px;
    if(W.obj[ni1]===O.STAIRS_UP&&W.py<SIZE-1&&W.ter[(W.py+1)*SIZE+W.px]===T.ROCKY){W.py+=1;}
    W.dungeonFloor=nextFloor;W.face=1;
    camInit=false;mmDirty=true;discover();updateHUD();
    toast('🪨 B'+W.dungeonFloor+(nextFloor===mf?' — 最深層!':' — 往更深處…'));
    fade.style.opacity=0;_transitioning=false;
  },650);
}
function goUpstairs(){
  if(!W.inDungeon)return;
  if(W.dungeonFloor<=1){exitDungeon();return;}
  if(_transitioning)return;_transitioning=true;
  const prevFloor=W.dungeonFloor-1;
  const fade=document.getElementById('fade');fade.style.opacity=1;
  setTimeout(()=>{
    cacheFloor(W.dungeonIdx+'_'+W.dungeonFloor);
    const key=W.dungeonIdx+'_'+prevFloor;
    if(!W.dungeons[key])W.dungeons[key]=genDungeon(dungeonSeed(),W.dungeonIdx,prevFloor,W.dungeonMaxFloor||5);
    const d=W.dungeons[key];
    W.ter=d.ter;W.obj=d.obj;W.aux=d.aux;W.disc=d.disc;
    W.enemies=d.enemies.map(e=>({...e}));
    // 落點：上層 STAIRS_DOWN 旁邊 1 格（往北），避免立刻重觸發
    W.px=d.spawnX;W.py=d.spawnY;
    const ni2=W.py*SIZE+W.px;
    if(W.obj[ni2]===O.STAIRS_DOWN&&W.py>0&&W.ter[(W.py-1)*SIZE+W.px]===T.ROCKY){W.py-=1;}
    W.dungeonFloor=prevFloor;W.face=1;
    camInit=false;mmDirty=true;discover();updateHUD();
    toast('🪨 B'+W.dungeonFloor);
    fade.style.opacity=0;_transitioning=false;
  },650);
}

function cropStage(i){return Math.min(2,Math.floor(W.aux[i]));}
