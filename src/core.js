// 小島開拓誌 — 工具效果、建造清單、O→BUILD 反查、全域狀態與畫布
// 共用全域：所有 src/*.js 以一般 <script> 依序載入（非 ES module，才能直接用 file:// 開啟）
'use strict';

/* ══════════ 工具效果 ══════════ */
function equippedHand(){return W&&W.equipped&&W.equipped.hand||null;}
function equippedWeapon(){return W&&W.equipped&&W.equipped.weapon||null;}
// 任何腳部裝備都給 +40% 移速；任何手部裝備都給 -40% 採集體力（含金屬升級版）
function hasBoots(){return !!(W&&W.equipped&&W.equipped.feet);}
function hasGloves(){return !!(W&&W.equipped&&W.equipped.hands);}
function checkHarvest(resKind){
  const tool=equippedHand();
  if(resKind==='stone'){
    if(!tool||(!tool.includes('pick'))){return{ok:true,mul:0.5,bare:true};}
    if(tool==='iron_pick')return{ok:true,mul:2};
    if(tool==='silver_pick')return{ok:true,mul:3};
    if(tool==='gold_pick')return{ok:true,mul:4};
    if(tool==='mithril_pick')return{ok:true,mul:5};
    return{ok:true,mul:1};
  }
  if(resKind==='clay'){
    const mul={stone_pick:1.5,iron_pick:2,silver_pick:3,gold_pick:4,mithril_pick:5}[tool]||1;
    return{ok:true,mul};
  }
  if(resKind==='wood'){
    const mul={wooden_axe:2,stone_axe:3,iron_axe:5,silver_axe:8,gold_axe:12,mithril_axe:18}[tool]||1;
    return{ok:true,mul};
  }
  return{ok:true,mul:1};
}

/* ══════════ 地圖生成工具 / 任務 → lib/worldgen.js + lib/data.js ══════════ */

/* ══════════ 建造清單 ══════════ */
function grassy(t){return t===T.GRASS||t===T.MEADOW||t===T.FOREST;}
function landEmpty(i){const t=W.ter[i];return(t>=T.SAND&&t<=T.ROCKY||t===T.PATH)&&t!==T.WATER&&W.obj[i]===O.NONE;}

const BUILDS=[
  {sec:'建築'},
  {id:'fire',ico:'🔥',name:'營火',desc:'夜間照明,互動可休息到清晨',cost:{wood:5},
   place(x,y,i){if(!landEmpty(i))return 0;W.obj[i]=O.FIRE;W.stats.fires++;return 1;}},
  {id:'hut', ico:'🏠',name:'小屋',desc:'溫暖的家,互動可休息到清晨',cost:{wood:20,stone:8,fiber:4},
   place(x,y,i){if(!landEmpty(i))return 0;W.obj[i]=O.HUT;W.stats.huts++;return 1;}},
  {id:'farm',ico:'🟫',name:'農田',desc:'翻土開墾,之後帶種子互動播種',cost:{wood:2},
   place(x,y,i){if(!(grassy(W.ter[i])&&W.obj[i]===O.NONE))return 0;W.ter[i]=T.FARM;return 1;}},
  {id:'workbench',ico:'🪚',name:'工作臺',desc:'解鎖進階製作:服裝·工具·石斧',cost:{wood:8,stone:3},
   place(x,y,i){if(!landEmpty(i))return 0;W.obj[i]=O.WORKBENCH;W.stats.workbenches++;return 1;}},
  {id:'loom',ico:'🧵',name:'織布機',desc:'高效率織布,解鎖羊毛大衣配方',cost:{wood:10,fiber:6},
   need:()=>(W.stats.workbenches||0)>=1,needMsg:'需要先建好工作臺',
   place(x,y,i){if(!landEmpty(i))return 0;W.obj[i]=O.LOOM;return 1;}},
  {id:'forge',ico:'⚒️',name:'鍛造爐',desc:'冶煉鐵錠·打造鐵製工具',cost:{stone:15,clay:5,wood:5},
   need:()=>(W.stats.workbenches||0)>=1,needMsg:'需要先建好工作臺',
   place(x,y,i){if(!landEmpty(i))return 0;W.obj[i]=O.FORGE;return 1;}},
  {id:'well',ico:'⛲',name:'水井',desc:'加速周圍 3 格作物生長',cost:{stone:8,clay:2},
   place(x,y,i){if(!landEmpty(i))return 0;W.obj[i]=O.WELL;return 1;}},
  {id:'storage',ico:'📦',name:'儲存箱',desc:'存放材料（地城內亦可建造）',cost:{wood:8,stone:3},
   place(x,y,i){
     const ok=W.inDungeon?(W.ter[i]===T.ROCKY&&W.obj[i]===O.NONE):landEmpty(i);
     if(!ok)return 0;W.obj[i]=O.STORAGE;
     const k=storageKey(i);if(!W.storages[k])W.storages[k]={};return 1;}},
  {id:'monu',ico:'🏛️',name:'紀念碑',desc:'先民的高塔。需要 3 張古老圖紙',cost:{wood:25,stone:30,relic:3},
   need:()=>W.inv.relic>=3,needMsg:'需要集齊 3 張古老圖紙',
   place(x,y,i){if(!landEmpty(i))return 0;W.obj[i]=O.MONU;W.stats.monu++;return 1;}},
  {sec:'道路與地形'},
  {id:'bridge',ico:'🪜',name:'木橋',desc:'鋪在淺水上,可以通行',cost:{wood:4,fiber:1},
   place(x,y,i){if(!(W.ter[i]===T.WATER&&W.obj[i]===O.NONE))return 0;W.ter[i]=T.BRIDGE;W.stats.bridges++;return 1;}},
  {id:'path',ico:'🟨',name:'石板路',desc:'走在上面移動更快',cost:{stone:2},
   place(x,y,i){if(!(W.ter[i]>=T.SAND&&W.ter[i]<=T.ROCKY&&W.ter[i]!==T.WATER&&W.obj[i]===O.NONE))return 0;W.ter[i]=T.PATH;return 1;}},
  {id:'fill',ico:'⛰️',name:'填土造地',desc:'把淺水填成沙地',cost:{stone:3},
   place(x,y,i){if(!(W.ter[i]===T.WATER&&W.obj[i]===O.NONE))return 0;W.ter[i]=T.SAND;return 1;}},
  {id:'reclaim',ico:'🌿',name:'翻土復原',desc:'把岩地翻成草地',cost:{},stamCost:8,
   place(x,y,i){if(!(W.ter[i]===T.ROCKY&&W.obj[i]===O.NONE))return 0;W.ter[i]=T.GRASS;return 1;}},
  {id:'pond',ico:'💧',name:'挖掘池塘',desc:'挖成水塘,順便得到黏土',cost:{},stamCost:10,
   place(x,y,i){if(!(grassy(W.ter[i])&&W.obj[i]===O.NONE))return 0;W.ter[i]=T.WATER;W.inv.clay+=1;return 1;}},
  {sec:'種植'},
  {id:'plant',ico:'🌱',name:'種植樹苗',desc:'幾天後長成大樹',cost:{sap:1},
   place(x,y,i){if(!(grassy(W.ter[i])&&W.obj[i]===O.NONE))return 0;W.obj[i]=O.SAPLING;W.aux[i]=0;return 1;}},
];

/* ══════════ O 型別 → BUILD 反向查表（拆除用）══════════ */
const O_TO_BUILD={};
BUILDS.forEach(b=>{if(b.cost)O_TO_BUILD[b.id]=b;});

/* ══════════ 全域狀態 ══════════ */
let W=null,running=false;
const cv=document.getElementById('game'),ctx=cv.getContext('2d');
const mm=document.getElementById('minimap'),mctx=mm.getContext('2d');
let vw=0,vh=0,dpr=1;
function resize(){dpr=Math.min(window.devicePixelRatio||1,2);vw=window.innerWidth;vh=window.innerHeight;cv.width=vw*dpr;cv.height=vh*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);}
window.addEventListener('resize',resize);resize();
