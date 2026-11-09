// 小島開拓誌 — 釣魚、情境動作 contextAction、世界生長、視野
// 共用全域：所有 src/*.js 以一般 <script> 依序載入（非 ES module，才能直接用 file:// 開啟）
'use strict';

/* ══════════ 釣魚掉落表（greenW = 綠色區域寬度比例，越小越難）══════════ */
const FISHING_LOOT=[
  {items:()=>({raw_fish:1+Math.floor(Math.random()*2)}),   greenW:.52, w:30},
  {items:()=>({fiber:2+Math.floor(Math.random()*2)}),      greenW:.46, w:22},
  {items:()=>({seed:1+Math.floor(Math.random()*2)}),       greenW:.44, w:20},
  {items:()=>({wood:2+Math.floor(Math.random()*3)}),       greenW:.34, w:16},
  {items:()=>({stone:2+Math.floor(Math.random()*2)}),      greenW:.30, w:12},
  {items:()=>({coal:1+Math.floor(Math.random()*2)}),       greenW:.22, w:8},
  {items:()=>({sap:1+Math.floor(Math.random()*2)}),        greenW:.19, w:7},
  {items:()=>({iron_ore:1+Math.floor(Math.random()*2)}),   greenW:.13, w:4},
  {items:()=>({iron_ingot:1}),                             greenW:.07, w:1},
  {items:()=>({relic:1}),                                  greenW:.05, w:1},
];
function rollFishingLoot(){
  let total=0;for(const l of FISHING_LOOT)total+=l.w;
  let r=Math.random()*total;
  for(const l of FISHING_LOOT){r-=l.w;if(r<=0)return l;}
  return FISHING_LOOT[0];
}
function startFishing(f){
  if(!W._fishing)W._fishing={state:'idle'};
  if(W._fishing.state!=='idle')return;
  W._fishing={state:'waiting',waitTimer:3+Math.random()*5,soundTimer:0,faceX:f.x,faceY:f.y};
  toast('🎣 拋竿！靜待魚上鉤…');sfx('splash');
}
function attemptCatch(){
  const fm=W._fishing;if(!fm||fm.state!=='biting')return;
  const inZone=fm.cursorPos>=fm.greenStart&&fm.cursorPos<=fm.greenStart+fm.greenW;
  if(inZone){
    for(const[k,n]of Object.entries(fm.loot))gain(k,n,{x:fm.faceX,y:fm.faceY});
    wearEquip('hand');sfx('fish_ok');
    const names=Object.keys(fm.loot).map(k=>RESOURCES[k]?(RESOURCES[k].ico+RESOURCES[k].name):k);
    toast('🎣 釣到了！'+names.join('、'));
  }else{
    toast('🐟 脫鉤了…再試一次！');sfx('no');
  }
  W._fishing={state:'idle'};
}
function nearWell(x,y){for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=SIZE||ny>=SIZE)continue;if(W.obj[ny*SIZE+nx]===O.WELL)return true;}return false;}

function contextAction(){
  // 站著的格子：墓碑
  const ci=W.py*SIZE+W.px;
  if(W.obj[ci]===O.GRAVE&&W.deathItems)return{label:'撿起遺落的物品',run(){collectDeathItems();},stam:0};
  // 釣魚小遊戲狀態攔截（轉身也能按 F）
  if(W._fishing&&W._fishing.state==='biting')
    return{label:'拉起魚竿！',run(){attemptCatch();},stam:0};
  if(W._fishing&&W._fishing.state==='waiting')
    return{label:'等待魚上鉤中…',run(){toast('耐心等候，有動靜了再拉！');},stam:0,soft:1};
  // 站著的格子：腳下成熟作物（允許踩入農田後直接收割）
  if(W.obj[ci]===O.CROP&&cropStage(ci)>=2)
    return{label:'收割腳下作物',run(){gain('food',3,{x:W.px,y:W.py});if(Math.random()<.8)gain('seed',1);W.obj[ci]=O.NONE;W.stats.cropsHarvested++;sfx('pick');},stam:3};
  const f=faceTile();if(!f)return null;
  const o=W.obj[f.i],t=W.ter[f.i];
  // 地城專屬
  if(o===O.STAIRS_UP)return{label:W.dungeonFloor<=1?'離開地城':'上一層',run(){goUpstairs();},stam:0};
  if(o===O.STAIRS_DOWN)return{label:'下一層 (B'+(W.dungeonFloor+1)+')',run(){goDownstairs();},stam:0};
  if(o===O.CHEST){
    if((W.aux[f.i]||0)>0)return{label:'空寶箱',run(){toast('已被打開了。');},stam:0,soft:1};
    return{label:'開啟寶箱',run(){
      W.aux[f.i]=1;const loot=genChestLoot(W.dungeonFloor||1);let msg='';
      for(const item of loot){gain(item.k,item.n,f);const r=RESOURCES[item.k];if(r)msg+=r.ico+'×'+item.n+' ';}
      toast('📦 寶箱：'+msg.trim());sfx('quest');
    },stam:0};
  }
  if(o===O.GRAVE)return{label:'撿起遺落的物品',run(){collectDeathItems();},stam:0};
  if(o===O.STORAGE)return{label:'開啟儲存箱',run(){openStorage(f.i);},stam:0};
  if(o===O.TREE){
    const chk=checkHarvest('wood');
    return{label:'砍伐樹木'+(chk.mul>1?'(×'+chk.mul+'效率)':''),
      run(){const n=Math.round((2+Math.floor(Math.random()*3))*chk.mul);gain('wood',n,f);
            if(Math.random()<.55)gain('sap',1);W.obj[f.i]=O.NONE;wearEquip('hand');sfx('chop');},stam:6};
  }
  if(o===O.ROCK){
    const tool=equippedHand();
    const chk=checkHarvest('stone');
    const auxVal=W.aux[f.i]||0;
    // aux < 0 encodes ore type: -2=silver_ore, -3=gold_ore, -4=mithril_ore
    const oreType={'-2':'silver_ore','-3':'gold_ore','-4':'mithril_ore'}[auxVal]||null;
    const hasPick=chk.ok&&!chk.bare;
    // 礦石需對應等級稿
    const orePickReq={silver_ore:'silver_pick',gold_ore:'gold_pick',mithril_ore:'mithril_pick'};
    const reqPick=oreType?orePickReq[oreType]:null;
    if(oreType&&reqPick&&tool!==reqPick){
      const reqName=EQUIP_DEF[reqPick]?.name||'高級稿';
      return{label:'需要'+reqName+'才能採集',run(){toast('需要'+reqName+'才能採集這種礦');sfx('no');},stam:0,soft:1};
    }
    const rockLabel=oreType?(oreType==='silver_ore'?'採集銀礦石':oreType==='gold_ore'?'採集金礦石':'採集秘銀礦'):(chk.bare?'徒手鑿石(效率低,先湊 3 顆做石稿)':'開採岩石');
    return{label:rockLabel,run(){
      const stoneN=Math.max(1,Math.round((2+Math.floor(Math.random()*2))*chk.mul));
      if(oreType){
        gain(oreType,1,f);
        if(!hasPick)gain('stone',1,f);
      }else{
        gain('stone',stoneN,f);
        if(!chk.bare&&Math.random()<0.2)gain('coal',1,f);
      }
      W.obj[f.i]=O.NONE;
      if(!chk.bare)wearEquip('hand');
      sfx('chop');
    },stam:oreType?10:7};
  }
  if(o===O.BERRY){
    if(W.aux[f.i]<0)return{label:'採摘漿果',run(){gain('food',2,f);if(Math.random()<.4)gain('seed',1);W.aux[f.i]=W.timeAcc+75;sfx('pick');},stam:3};
    return{label:'漿果還沒熟',run(){toast('再等等~');},stam:0,soft:1};
  }
  if(o===O.REED)return{label:'收割蘆葦',run(){gain('fiber',1+Math.floor(Math.random()*2),f);W.obj[f.i]=O.NONE;sfx('pick');},stam:3};
  if(o===O.CLAY){
    const chk=checkHarvest('clay');
    const n=Math.round((1+Math.floor(Math.random()*2))*chk.mul);
    return{label:'挖取黏土'+(chk.mul>1?'(×'+chk.mul+')':''),run(){gain('clay',n,f);W.aux[f.i]-=1;if(W.aux[f.i]<=0)W.obj[f.i]=O.NONE;sfx('chop');},stam:5};
  }
  if(o===O.FLOWER)return{label:'摘野花',run(){if(Math.random()<.5)gain('seed',1,f);else toast('一朵香香的小花 🌼');W.obj[f.i]=O.NONE;sfx('pick');},stam:1};
  if(o===O.SAPLING)return{label:'回收樹苗',run(){gain('sap',1,f);W.obj[f.i]=O.NONE;sfx('pick');},stam:1};
  if(o===O.RUIN){
    const id=W.aux[f.i]|0;
    if(!W.ruinFound[id])return{label:'調查遺跡',run(){W.ruinFound[id]=true;W.stats.ruinsFound++;gain('seed',3);gain('relic',1);toast('📜 '+RUIN_LORE[id]);sfx('ruin');checkQuest();},stam:2};
    return{label:'進入地城 (B1)',run(){enterDungeon(id);},stam:0};
  }
  if(o===O.FIRE||o===O.HUT)return{label:'休息到清晨',run(){restTillMorning();},stam:0};
  if(o===O.WELL)return{label:'喝口井水',run(){W.stam=Math.min(100,W.stam+8);W.hp=Math.min(W.maxHp,W.hp+5);toast('清涼！體力+8 HP+5');sfx('eat');updateHUD();},stam:0};
  if(o===O.MONU)return{label:'紀念碑選項',run(){openMonumentPanel(f.x,f.y);},stam:0};
  for(const [stId,station] of Object.entries(STATIONS)){
    if(station.objType&&o===station.objType)
      return{label:'使用'+station.name,run(){craftTab=stId;togglePanel('craftPanel');},stam:0};
  }
  if(o===O.CROP){
    const st=cropStage(f.i);
    if(st>=2)return{label:'收割作物',run(){gain('food',3,f);if(Math.random()<.8)gain('seed',1);W.obj[f.i]=O.NONE;W.stats.cropsHarvested++;sfx('pick');},stam:3};
    return{label:'作物生長中 ('+['剛冒芽','已抽穗','快成熟'][st]+')',run(){toast('再等等~');},stam:0,soft:1};
  }
  if(t===T.FARM)
    return W.inv.seed>0
      ?{label:'播種',run(){W.inv.seed--;W.obj[f.i]=O.CROP;W.aux[f.i]=0;W.stats.farmsSown++;sfx('build');toast('種下一粒希望 🫘');},stam:2}
      :{label:'播種(缺種子)',run(){toast('沒有種子。漿果/野花/遺跡都有機會找到');},stam:0,soft:1};
  if(t===T.MTN){
    const tool=equippedHand();
    if(tool==='mithril_pick')
      return{label:'開採山脈（鐵礦石）',run(){gain('iron_ore',1+Math.floor(Math.random()*2),f);if(Math.random()<0.8)gain('coal',1,f);wearEquip('hand');sfx('chop');},stam:15};
    if(tool==='iron_pick')
      return{label:'開採山脈（鐵礦石）',run(){gain('iron_ore',1+Math.floor(Math.random()*2),f);if(Math.random()<0.3)gain('coal',1,f);wearEquip('hand');sfx('chop');},stam:15};
    if(tool==='silver_pick'||tool==='gold_pick')
      return{label:'開採山脈（鐵礦石）',run(){gain('iron_ore',1+Math.floor(Math.random()*2),f);if(Math.random()<0.5)gain('coal',1,f);wearEquip('hand');sfx('chop');},stam:15};
    return{label:'堅硬的山脈',run(){toast('需要鐵稿才能開採山地');sfx('no');},stam:0,soft:1};
  }
  if(t===T.WATER||t===T.DEEP){
    const tool=equippedHand();
    if(tool==='fishing_rod')
      return{label:'釣魚',run(){startFishing(f);},stam:3};
    return{label:'水面波光粼粼',run(){toast('可以蓋木橋,或持釣竿互動釣魚');},stam:0,soft:1};
  }
  // 地形拆除（石板路/木橋）
  if(t===T.PATH||t===T.BRIDGE){
    const cost=t===T.PATH?{stone:2}:{wood:4,fiber:1};
    const ret=Object.fromEntries(Object.entries(cost).map(([k,v])=>[k,Math.ceil(v/2)]));
    const label='拆（回收'+Object.entries(ret).map(([k,v])=>RESOURCES[k]?.ico||k+'×'+v).join(',')+'）';
    return{label,run(){
      W.ter[f.i]=t===T.PATH?T.SAND:T.WATER;
      for(const[k,v]of Object.entries(ret))W.inv[k]=(W.inv[k]||0)+v;
      toast('🔨 已拆除，回收資源');sfx('build');mmDirty=true;renderInv();
    },stam:0};
  }
  // 拆除（可拆建築/道路）
  const DEMOLISHABLE=new Set([O.FIRE,O.HUT,O.WORKBENCH,O.LOOM,O.FORGE,O.WELL,O.STORAGE,O.MONU,O.PORTAL,O.RAID_GATE]);
  if(DEMOLISHABLE.has(o)){
    const bld=O_TO_BUILD[Object.keys(O_TO_BUILD).find(k=>O[k]===o)];
    const cost=bld?.cost;
    if(cost){
      const ret=Object.fromEntries(Object.entries(cost).map(([k,v])=>[k,Math.ceil(v/2)]));
      const label='拆（回收'+Object.entries(ret).map(([k,v])=>RESOURCES[k]?.ico||k+'×'+v).join(',')+'）';
      return{label,run(){
        W.obj[f.i]=O.NONE;
        for(const[k,v]of Object.entries(ret))W.inv[k]=(W.inv[k]||0)+v;
        toast('🔨 建築已拆除，回收資源');sfx('build');mmDirty=true;renderInv();
      },stam:0};
    }
    return{label:'拆除',run(){W.obj[f.i]=O.NONE;toast('🔨 建築已拆除');sfx('build');mmDirty=true;},stam:0};
  }
  // 野生動物（馴化），物件互動無結果時才觸發
  for(const a of W.animals){
    if(a.state!=='tamed'&&Math.abs(a.x-f.x)<1.5&&Math.abs(a.y-f.y)<1.5)return animalAction(a);
  }
  for(const a of W.animals){
    if(a.state!=='tamed'&&Math.abs(a.x-W.px)<1.5&&Math.abs(a.y-W.py)<1.5)return animalAction(a);
  }
  return null;
}

function gain(k,n,f){
  W.inv[k]=(W.inv[k]||0)+n;
  if(k==='wood')W.stats.gWood+=n;
  if(k==='stone')W.stats.gStone+=n;
  const r=RESOURCES[k];
  const _eDef=EQUIP_DEF[k];
  if(_eDef&&_eDef.durability!=null&&n>0){
    if(!W.invDur)W.invDur={};
    if(!W.invDur[k])W.invDur[k]=[];
    for(let _i=0;_i<n;_i++)W.invDur[k].push(Math.round(_eDef.durability*(0.3+Math.random()*0.5)));
  }
  if(f)spawnFloat(f.x,f.y,(r?.ico||_eDef?.ico||'?')+'+'+n);
  renderInv();
}

function executeAction(a){
  if(!a)return false;
  const stamCost=a.stam>0&&hasGloves()?Math.round(a.stam*0.6):a.stam;
  if(stamCost>0&&W.stam<stamCost){toast('太累了……吃點東西或到火邊休息');sfx('no');return false;}
  W.stam-=stamCost;a.run();mmDirty=true;renderInv();checkQuest();return true;
}

function doInteract(){
  const a=contextAction();
  if(!a){toast('這裡沒什麼能做的');return;}
  executeAction(a);
}

function combatAction(){
  const enemy=nearestEnemy();
  if(enemy)return enemyAction(enemy);
  const f=faceTile();
  for(const a of W.animals){
    if(a.state==='tamed'&&f&&Math.abs(a.x-f.x)<1.0&&Math.abs(a.y-f.y)<1.0)return animalAction(a);
  }
  for(const a of W.animals){
    if(a.state==='tamed'&&Math.abs(a.x-W.px)<1.5&&Math.abs(a.y-W.py)<1.5)return animalAction(a);
  }
  return null;
}

function doCombat(){
  const ca=combatAction();
  if(!ca){toast('附近沒有敵人或夥伴');sfx('no');return;}
  executeAction(ca);
}

function eatFood(){
  if(W.stam>=99&&W.hp>=W.maxHp){toast('現在不餓，也沒有受傷');return;}
  if((W.inv.cooked_fish||0)>0){
    W.inv.cooked_fish--;W.stam=Math.min(100,W.stam+50);W.hp=Math.min(W.maxHp,W.hp+20);
    sfx('eat');toast('🍖 烤魚 體力+50 HP+20');renderInv();updateHUD();return;
  }
  if((W.inv.food||0)<=0){toast('沒有糧食了。找找漿果叢或種田吧');sfx('no');return;}
  W.inv.food--;W.stam=Math.min(100,W.stam+30);W.hp=Math.min(W.maxHp,W.hp+10);
  sfx('eat');toast('🍓 體力+30 HP+10');renderInv();updateHUD();
  document.getElementById('foodCount').textContent=W.inv.food;
}

function restTillMorning(){
  const fade=document.getElementById('fade');
  fade.style.opacity=1;
  setTimeout(()=>{W.day++;W.tod=0.24;W.stam=100;W.hp=W.maxHp;growWorld(DAY_LEN*0.4);updateHUD();save();toast('☀️ 新的一天，第'+W.day+'天（HP 全恢復）');fade.style.opacity=0;},650);
}
function onMonument(){
  W.disc.fill(1);mmDirty=true;
  setTimeout(()=>{
    let discN=SIZE*SIZE;
    document.getElementById('endStats').innerHTML='⏳ 開拓天數:'+W.day+'天<br>🗺️ 探索比例:100%<br>🛠️ 建造次數:'+W.stats.builds+'次<br>🐾 馴化動物:'+(W.stats.tamed||0)+'隻';
    document.getElementById('ending').classList.add('open');W.freePlay=true;sfx('quest');
  },500);
}
document.getElementById('btnFree').onclick=()=>document.getElementById('ending').classList.remove('open');

let _monuFaceX=0,_monuFaceY=0;
function openMonumentPanel(mx,my){_monuFaceX=mx;_monuFaceY=my;document.getElementById('monuPanel').style.display='flex';}
document.getElementById('btnMonuClose').onclick=()=>document.getElementById('monuPanel').style.display='none';
document.getElementById('btnMonuRaid').onclick=()=>{document.getElementById('monuPanel').style.display='none';createOrRefreshRaidGate();};
document.getElementById('btnMonuNewIsland').onclick=()=>{document.getElementById('monuPanel').style.display='none';confirmNewIsland();};

function createOrRefreshRaidGate(){
  if(W.inDungeon){toast('已在地城中，請先離開');return;}
  if(_transitioning)return;
  if(W.raidGatePos){
    const hasPendingGrave=W.deathPos&&W.deathPos.dungeonIdx===100;
    const warn=hasPendingGrave
      ?'地城中還有尚未取回的遺物！重新開啟傳送門會放棄目前進度與遺物，確定嗎？'
      :'已有一座地城傳送門。重新開啟會放棄目前的地城進度，生成全新的地城，確定嗎？';
    if(!confirm(warn))return;
    const oi=W.raidGatePos.y*SIZE+W.raidGatePos.x;
    if(W.obj[oi]===O.RAID_GATE)W.obj[oi]=O.NONE;
    for(const k of Object.keys(W.dungeons)){if(k.startsWith('100_'))delete W.dungeons[k];}
    if(hasPendingGrave){W.deathItems=null;W.deathPos=null;}
  }
  const mf=3+Math.floor(Math.random()*5);
  W.raidCounter=(W.raidCounter||0)+1;
  const rs=W.seedStr+'_raid_'+W.raidCounter;
  W.raidSeedStr=rs;W.raidMaxFloor=mf;
  W.dungeons['100_1']=genDungeon(rs,100,1,mf);
  // 在紀念碑附近尋找空地放置傳送門
  let gx=_monuFaceX,gy=_monuFaceY;
  outerGate:for(let r=0;r<=6;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
    if(r>0&&Math.abs(dx)<r&&Math.abs(dy)<r)continue;
    const tx=_monuFaceX+dx,ty=_monuFaceY+dy;
    if(tx>0&&ty>0&&tx<SIZE-1&&ty<SIZE-1&&landEmpty(ty*SIZE+tx)){gx=tx;gy=ty;break outerGate;}
  }
  W.obj[gy*SIZE+gx]=O.RAID_GATE;W.raidGatePos={x:gx,y:gy};
  mmDirty=true;
  toast('🌀 隨機地城傳送門已開啟！B1~'+mf+'F，走上傳送門即可進入！');
}

function enterRaidDungeonViaGate(){
  if(W.inDungeon||_transitioning)return;
  if(!W.raidSeedStr||!W.dungeons['100_1']){toast('傳送門好像故障了…');return;}
  _transitioning=true;
  const fade=document.getElementById('fade');fade.style.opacity=1;
  setTimeout(()=>{
    W._surface={ter:W.ter,obj:W.obj,aux:W.aux,disc:W.disc,px:W.px,py:W.py,enemies:W.enemies||[],animals:W.animals||[]};
    W.animals=[];
    W.dungeonMaxFloor=W.raidMaxFloor||5;
    const d=W.dungeons['100_1'];
    W.ter=d.ter;W.obj=d.obj;W.aux=d.aux;W.disc=d.disc;
    W.enemies=d.enemies.map(e=>({...e}));
    W.px=d.spawnX;W.py=d.spawnY;
    W.inDungeon=true;W.dungeonIdx=100;W.dungeonFloor=1;W.face=0;
    camInit=false;mmDirty=true;discover();updateHUD();
    toast('🌀 隨機地城 B1/'+(W.raidMaxFloor||5)+'F — 深入探索！');
    fade.style.opacity=0;_transitioning=false;
  },650);
}

function confirmNewIsland(){
  if(!confirm('確定前往新島嶼？\n身上的物品和裝備會隨行，但無法返回此島嶼。'))return;
  const ci={...W.inv},ce={...W.equipped},cd={...W.equipDur},cid={};
  for(const [k,v] of Object.entries(W.invDur||{}))cid[k]=[...v];
  const ns='isle-'+Math.floor(Math.random()*1e9);
  const nw=genWorld(ns);
  nw.inv=ci;nw.equipped=ce;nw.equipDur=cd;nw.invDur=cid;
  nw.questIdx=0;nw.freePlay=false;
  W=nw;
  const fade=document.getElementById('fade');fade.style.opacity=1;
  setTimeout(()=>{
    camInit=false;mmDirty=true;floats=[];
    discover();renderInv();renderBagPanel();renderQuests();checkQuest();
    updateHUD();save();
    document.getElementById('depthCard').style.display='none';
    toast('🌊 新的島嶼！新的旅程！');
    fade.style.opacity=0;
  },800);
}

/* ══════════ 世界生長 ══════════ */
function growWorld(dt){
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
    const i=y*SIZE+x,o=W.obj[i];
    if(o===O.CROP){const sp=nearWell(x,y)?2:1;W.aux[i]+=dt/55*sp;}
    else if(o===O.SAPLING){W.aux[i]+=dt/110;if(W.aux[i]>=1){W.obj[i]=O.TREE;W.aux[i]=0;}}
    else if(o===O.BERRY&&W.aux[i]>=0&&W.timeAcc>W.aux[i])W.aux[i]=-1;
  }
}

/* ══════════ 視野 ══════════ */
let mmDirty=true;
function discover(){
  const r=W.inDungeon?3:(isNight()?4:7);const r2=r*r+r;
  for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
    if(dx*dx+dy*dy>r2)continue;
    const x=W.px+dx,y=W.py+dy;
    if(x<0||y<0||x>=SIZE||y>=SIZE)continue;
    if(!W.disc[y*SIZE+x]){W.disc[y*SIZE+x]=1;mmDirty=true;}
  }
}
function isNight(){return W.tod>0.76||W.tod<0.20;}
