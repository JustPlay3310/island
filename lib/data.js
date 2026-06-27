/* ══════════ 遊戲資料常數（lib/data.js）══════════ */
'use strict';

const T={DEEP:0,WATER:1,SAND:2,GRASS:3,MEADOW:4,FOREST:5,ROCKY:6,MTN:7,BRIDGE:8,PATH:9,FARM:10};
const O={NONE:0,TREE:1,SAPLING:2,ROCK:3,BERRY:4,REED:5,CLAY:6,FLOWER:7,RUIN:8,FIRE:9,HUT:10,WELL:11,MONU:12,CROP:13,WORKBENCH:14,LOOM:15,FORGE:16,STAIRS_DOWN:17,STAIRS_UP:18,CHEST:19,GRAVE:20,STORAGE:21,PORTAL:22,RAID_GATE:23};
const AK={RABBIT:1,CHICKEN:2,SHEEP:3};
const SIZE=96, TS=40, DAY_LEN=160;

const RESOURCES={
  wood:       {ico:'🪵',name:'木材',   initQty:0, alwaysShow:true },
  stone:      {ico:'🪨',name:'石材',   initQty:0                  },
  food:       {ico:'🍓',name:'糧食',   initQty:3, alwaysShow:true },
  fiber:      {ico:'🌾',name:'纖維',   initQty:0                  },
  clay:       {ico:'🧱',name:'黏土',   initQty:0                  },
  sap:        {ico:'🌱',name:'樹苗',   initQty:1                  },
  seed:       {ico:'🫘',name:'種子',   initQty:2                  },
  relic:      {ico:'📜',name:'古圖紙', initQty:0                  },
  cloth:      {ico:'🧶',name:'布料',   initQty:0                  },
  needle:     {ico:'🪡',name:'縫針',   initQty:0                  },
  coal:       {ico:'⬛',name:'煤炭',   initQty:0                  },
  iron_ore:   {ico:'🟫',name:'鐵礦石', initQty:0                  },
  iron_ingot: {ico:'⚙️', name:'鐵錠',  initQty:0                  },
  silver_ore: {ico:'🔘',name:'銀礦石', initQty:0                  },
  silver_ingot:{ico:'⚙️',name:'銀錠', initQty:0                  },
  gold_ore:   {ico:'🟡',name:'金礦石', initQty:0                  },
  gold_ingot: {ico:'⚙️',name:'金錠',  initQty:0                  },
  mithril_ore:{ico:'🔷',name:'秘銀礦', initQty:0                  },
  mithril_ingot:{ico:'⚙️',name:'秘銀錠',initQty:0                  },
  rope:       {ico:'🪢',name:'繩子',   initQty:0                  },
  raw_fish:   {ico:'🐟',name:'生魚',   initQty:0                  },
  cooked_fish:{ico:'🍖',name:'烤魚',   initQty:0                  },
  bone:       {ico:'🦴',name:'骨頭',   initQty:0                  },
};

const EQUIP_DEF={
  wooden_axe: {ico:'🪓',name:'木斧',      slot:'hand', desc:'採木效率 ×2',              durability:40},
  stone_pick:  {ico:'⛏️',name:'石稿',    slot:'hand', desc:'能採石頭・黏土效率 ×1.5',  durability:30},
  stone_axe:   {ico:'🪓',name:'石斧',     slot:'hand', desc:'採木效率 ×3',              durability:50},
  iron_axe:    {ico:'🪓',name:'鐵斧',     slot:'hand', desc:'採木效率 ×5',              durability:60},
  iron_pick:   {ico:'⛏️',name:'鐵稿',    slot:'hand', desc:'可開採山地・石材效率 ×2',  durability:50},
  fishing_rod: {ico:'🎣',name:'釣竿',     slot:'hand', desc:'水邊釣魚',                 durability:20},
  hat:         {ico:'👒',name:'草帽',     slot:'head', desc:'日間體力回復 +20% | DEF 1',  durability:null, def:1},
  shirt:       {ico:'👕',name:'粗布衣',   slot:'body', desc:'夜間體力損耗 -50% | DEF 2',  durability:null, def:2},
  coat:        {ico:'🧥',name:'厚外套',   slot:'body', desc:'夜間不耗體力 | DEF 3',       durability:null, def:3},
  wool_coat:   {ico:'🥼',name:'羊毛大衣', slot:'body', desc:'夜間恢復體力 | DEF 4',       durability:null, def:4},
  boots:       {ico:'👞',name:'皮靴',     slot:'feet',   desc:'移動速度 +40% | DEF 1',     durability:null, def:1},
  gloves:      {ico:'🧤',name:'工作手套', slot:'hands',  desc:'採集體力消耗 -40% | DEF 1', durability:null, def:1},
  wooden_sword:{ico:'🗡️', name:'木劍',    slot:'weapon', desc:'ATK +5',                    durability:30,  atk:5 },
  stone_sword: {ico:'⚔️', name:'石劍',    slot:'weapon', desc:'ATK +12',                   durability:50,  atk:12},
   iron_sword:  {ico:'⚔️', name:'鐵劍',    slot:'weapon', desc:'ATK +20',                   durability:80,  atk:20 },
  // ── 銀系 ──
  silver_axe:  {ico:'🪓',name:'銀斧',     slot:'hand', desc:'採木效率 ×8',                 durability:100, },
  silver_pick: {ico:'⛏️',name:'銀稿',     slot:'hand', desc:'山地效率×2 + 採銀礦',         durability:100, },
  silver_sword:{ico:'⚔️',name:'銀劍',     slot:'weapon',desc:'ATK +32',                    durability:100,  atk:32 },
  silver_hat:  {ico:'⛑️',name:'銀帽',     slot:'head',  desc:'DEF 2',                       durability:null, def:2 },
  silver_armor:{ico:'🥋',name:'銀甲',     slot:'body',  desc:'DEF 4',                       durability:null, def:4 },
  silver_boots:{ico:'👞',name:'銀靴',     slot:'feet',  desc:'移速+40% | DEF 2',            durability:null, def:2 },
  silver_gloves:{ico:'🧤',name:'銀手套',  slot:'hands', desc:'採集體力-40% | DEF 2',        durability:null, def:2 },
  // ── 金系 ──
  gold_axe:    {ico:'🪓',name:'金斧',     slot:'hand', desc:'採木效率 ×12',                durability:140, },
  gold_pick:   {ico:'⛏️',name:'金稿',     slot:'hand', desc:'山地效率×3 + 採金礦',         durability:140, },
  gold_sword:  {ico:'⚔️',name:'金劍',     slot:'weapon',desc:'ATK +50',                    durability:140,  atk:50 },
  gold_hat:    {ico:'👑',name:'金冠',     slot:'head',  desc:'DEF 3',                       durability:null, def:3 },
  gold_armor:  {ico:'🥋',name:'金甲',     slot:'body',  desc:'DEF 5',                       durability:null, def:5 },
  gold_boots:  {ico:'👞',name:'金靴',     slot:'feet',  desc:'移速+40% | DEF 3',            durability:null, def:3 },
  gold_gloves: {ico:'🧤',name:'金手套',   slot:'hands', desc:'採集體力-40% | DEF 3',        durability:null, def:3 },
  // ── 秘銀系 ──
  mithril_axe: {ico:'🪓',name:'秘銀斧',   slot:'hand', desc:'採木效率 ×18',                durability:180, },
  mithril_pick:{ico:'⛏️',name:'秘銀稿',   slot:'hand', desc:'山地效率×4 + 採秘銀 +coal+50%',durability:180, },
  mithril_sword:{ico:'⚔️',name:'秘銀劍',  slot:'weapon',desc:'ATK +75',                    durability:180,  atk:75 },
  mithril_hat: {ico:'👑',name:'秘銀冠',   slot:'head',  desc:'DEF 4',                       durability:null, def:4 },
  mithril_armor:{ico:'🥋',name:'秘銀甲',  slot:'body',  desc:'DEF 7',                       durability:null, def:7 },
  mithril_boots:{ico:'👞',name:'秘銀靴',  slot:'feet',  desc:'移速+40% | DEF 4',            durability:null, def:4 },
  mithril_gloves:{ico:'🧤',name:'秘銀手套',slot:'hands',desc:'採集體力-40% | DEF 4',        durability:null, def:4 },
  // ── 鐵系防具 ──
  iron_hat:    {ico:'⛑️',name:'鐵帽',     slot:'head',  desc:'DEF 2',                       durability:null, def:2 },
  iron_armor:  {ico:'🥋',name:'鐵甲',     slot:'body',  desc:'DEF 3',                       durability:null, def:3 },
  iron_boots:  {ico:'👞',name:'鐵靴',     slot:'feet',  desc:'移速+40% | DEF 2',            durability:null, def:2 },
  iron_gloves: {ico:'🧤',name:'鐵手套',   slot:'hands', desc:'採集體力-40% | DEF 2',        durability:null, def:2 },
};

const STATIONS={
  hand:      {name:'基本製作', objType:null},
  workbench: {name:'工作臺',   objType:O.WORKBENCH},
  loom:      {name:'織布機',   objType:O.LOOM},
  campfire:  {name:'營火料理', objType:O.FIRE},
  forge:     {name:'鍛造爐',   objType:O.FORGE},
};

const RECIPES=[
  // ── 基本製作 ──
  {req:'hand',id:'wooden_axe', ico:'🪓',name:'木斧',     desc:'採木效率翻倍 | 手持',        cost:{wood:3},              gives:{wooden_axe:1}},
  {req:'hand',id:'stone_pick', ico:'⛏️',name:'石稿',    desc:'採石唯一工具 | 手持',        cost:{stone:3,wood:1},      gives:{stone_pick:1}},
  {req:'hand',id:'needle',     ico:'🪡',name:'縫針',     desc:'製作服裝必需',                cost:{fiber:1,wood:1},      gives:{needle:1}},
  {req:'hand',id:'cloth',      ico:'🧶',name:'布料 ×1',  desc:'纖維×3 → 布料×1',           cost:{fiber:3},             gives:{cloth:1}},
  {req:'hand',id:'rope',       ico:'🪢',name:'繩子',     desc:'纖維×2 → 繩子×1',           cost:{fiber:2},             gives:{rope:1}},
  // ── 工作臺 ──
  {req:'workbench',id:'hat',        ico:'👒',name:'草帽',     desc:'日間回復+20% | 頭部',   cost:{cloth:2,fiber:2},            gives:{hat:1}},
  {req:'workbench',id:'shirt',      ico:'👕',name:'粗布衣',   desc:'夜間損耗-50% | 身體',   cost:{cloth:3},                    gives:{shirt:1}},
  {req:'workbench',id:'coat',       ico:'🧥',name:'厚外套',   desc:'夜間不耗體力 | 身體',   cost:{cloth:5,needle:1},           gives:{coat:1}},
  {req:'workbench',id:'stone_axe',  ico:'🪓',name:'石斧',     desc:'採木效率三倍 | 手持',   cost:{wood:1,stone:2},             gives:{stone_axe:1}},
  {req:'workbench',id:'fishing_rod',ico:'🎣',name:'釣竿',     desc:'水邊釣魚 | 手持',       cost:{wood:2,fiber:2,rope:1},      gives:{fishing_rod:1}},
  {req:'workbench',id:'boots',      ico:'👞',name:'皮靴',     desc:'移速+40% | 腳部',       cost:{fiber:4,clay:2},             gives:{boots:1}},
  {req:'workbench',id:'gloves',     ico:'🧤',name:'工作手套', desc:'採集體力-40% | 手部',   cost:{cloth:2,fiber:2},            gives:{gloves:1}},
  // ── 織布機 ──
  {req:'loom',id:'cloth2',    ico:'🧶',name:'布料 ×2(效率)',desc:'4份纖維→2份布料',         cost:{fiber:4},             gives:{cloth:2}},
  {req:'loom',id:'wool_coat', ico:'🥼',name:'羊毛大衣',     desc:'夜間恢復體力 | 身體',     cost:{cloth:4,fiber:3},     gives:{wool_coat:1}},
  // ── 營火料理 ──
  {req:'campfire',id:'cook_fish',ico:'🍖',name:'烤魚',      desc:'生魚→烤魚（恢復50體力）', cost:{raw_fish:1},           gives:{cooked_fish:1}},
  // ── 鍛造爐 ──
  {req:'forge',id:'iron_ingot',ico:'⚙️', name:'鐵錠',       desc:'冶煉鐵礦石',              cost:{iron_ore:3,coal:2},    gives:{iron_ingot:1}},
  {req:'forge',id:'iron_axe',  ico:'🪓',name:'鐵斧',        desc:'採木效率五倍 | 手持',     cost:{iron_ingot:2,wood:1},  gives:{iron_axe:1}},
  {req:'forge',id:'iron_pick',   ico:'⛏️',name:'鐵稿',    desc:'可開採山地 | 手持',        cost:{iron_ingot:2,wood:1},  gives:{iron_pick:1}},
  // ── 武器 ──
  {req:'hand',      id:'wooden_sword',ico:'🗡️',name:'木劍', desc:'ATK+5 | 武器槽',          cost:{wood:5},                 gives:{wooden_sword:1}},
  {req:'workbench', id:'stone_sword', ico:'⚔️',name:'石劍', desc:'ATK+12 | 武器槽',         cost:{stone:6,wood:1},         gives:{stone_sword:1}},
  {req:'forge',     id:'iron_sword',  ico:'⚔️',name:'鐵劍', desc:'ATK+20 | 武器槽',         cost:{iron_ingot:3,wood:1},    gives:{iron_sword:1}},
  // ── 鐵系防具 ──
  {req:'forge',     id:'iron_hat',    ico:'⛑️',name:'鐵帽',     desc:'DEF 2 | 頭部',          cost:{iron_ingot:2,wood:1},   gives:{iron_hat:1}},
  {req:'forge',     id:'iron_armor',  ico:'🥋',name:'鐵甲',     desc:'DEF 3 | 身體',          cost:{iron_ingot:3,wood:1},   gives:{iron_armor:1}},
  {req:'forge',     id:'iron_boots',  ico:'👞',name:'鐵靴',     desc:'移速+40% | DEF 2',      cost:{iron_ingot:2,wood:1},   gives:{iron_boots:1}},
  {req:'forge',     id:'iron_gloves', ico:'🧤',name:'鐵手套',   desc:'採集體力-40% | DEF 2',  cost:{iron_ingot:2,wood:1},   gives:{iron_gloves:1}},
  // ── 高階工坊升級 ──
  {req:'forge',     id:'adv_forge',   ico:'⚒️',name:'升級為高階工坊',desc:'iron_ingot×10+relic×3，解鎖銀/金/秘銀',cost:{iron_ingot:10,relic:3}, gives:{}},
  // ── 銀錠/銀礦 ──
  {req:'forge',     id:'silver_ingot',ico:'⚙️',name:'銀錠',     desc:'冶煉銀礦石',            cost:{silver_ore:3,coal:2},   gives:{silver_ingot:1}},
  // ── 銀系 ──
  {req:'forge',     id:'silver_axe',  ico:'🪓',name:'銀斧',     desc:'採木效率 ×8',           cost:{silver_ingot:4,wood:1}, gives:{silver_axe:1}},
  {req:'forge',     id:'silver_pick', ico:'⛏️',name:'銀稿',     desc:'山地效率×2 + 採銀礦',   cost:{silver_ingot:4,wood:1}, gives:{silver_pick:1}},
  {req:'forge',     id:'silver_sword',ico:'⚔️',name:'銀劍',     desc:'ATK+32 | 武器槽',       cost:{silver_ingot:3,wood:1}, gives:{silver_sword:1}},
  {req:'forge',     id:'silver_hat',  ico:'⛑️',name:'銀帽',     desc:'DEF 2 | 頭部',          cost:{silver_ingot:3,cloth:3}, gives:{silver_hat:1}},
  {req:'forge',     id:'silver_armor',ico:'🥋',name:'銀甲',     desc:'DEF 4 | 身體',          cost:{silver_ingot:4,cloth:4}, gives:{silver_armor:1}},
  {req:'forge',     id:'silver_boots',ico:'👞',name:'銀靴',     desc:'移速+40% | DEF 2',      cost:{silver_ingot:3,cloth:3}, gives:{silver_boots:1}},
  {req:'forge',     id:'silver_gloves',ico:'🧤',name:'銀手套',  desc:'採集體力-40% | DEF 2',  cost:{silver_ingot:3,cloth:3}, gives:{silver_gloves:1}},
  // ── 金錠 ──
  {req:'forge',     id:'gold_ingot',  ico:'⚙️',name:'金錠',     desc:'冶煉金礦石（需銀錠作引）',cost:{gold_ore:2,silver_ore:3},gives:{gold_ingot:1}},
  // ── 金系 ──
  {req:'forge',     id:'gold_axe',    ico:'🪓',name:'金斧',     desc:'採木效率 ×12',          cost:{gold_ingot:6,wood:2},   gives:{gold_axe:1}},
  {req:'forge',     id:'gold_pick',   ico:'⛏️',name:'金稿',     desc:'山地效率×3 + 採金礦',   cost:{gold_ingot:6,wood:2},   gives:{gold_pick:1}},
  {req:'forge',     id:'gold_sword',  ico:'⚔️',name:'金劍',     desc:'ATK+50 | 武器槽',       cost:{gold_ingot:3,wood:1},   gives:{gold_sword:1}},
  {req:'forge',     id:'gold_hat',    ico:'👑',name:'金冠',     desc:'DEF 3 | 頭部',          cost:{gold_ingot:3,cloth:4},  gives:{gold_hat:1}},
  {req:'forge',     id:'gold_armor',  ico:'🥋',name:'金甲',     desc:'DEF 5 | 身體',          cost:{gold_ingot:5,cloth:5},  gives:{gold_armor:1}},
  {req:'forge',     id:'gold_boots',  ico:'👞',name:'金靴',     desc:'移速+40% | DEF 3',      cost:{gold_ingot:3,cloth:4},  gives:{gold_boots:1}},
  {req:'forge',     id:'gold_gloves', ico:'🧤',name:'金手套',   desc:'採集體力-40% | DEF 3',  cost:{gold_ingot:3,cloth:4},  gives:{gold_gloves:1}},
  // ── 秘銀錠 ──
  {req:'forge',     id:'mithril_ingot',ico:'⚙️',name:'秘銀錠',  desc:'冶煉秘銀礦（需金錠作引）',cost:{mithril_ore:3,gold_ore:3},gives:{mithril_ingot:1}},
  // ── 秘銀系 ──
  {req:'forge',     id:'mithril_axe', ico:'🪓',name:'秘銀斧',   desc:'採木效率 ×18',          cost:{mithril_ingot:10,wood:3,relic:1}, gives:{mithril_axe:1}},
  {req:'forge',     id:'mithril_pick',ico:'⛏️',name:'秘銀稿',  desc:'山地效率×4 + 採秘銀 +coal+50%',cost:{mithril_ingot:10,wood:3,relic:1}, gives:{mithril_pick:1}},
  {req:'forge',     id:'mithril_sword',ico:'⚔️',name:'秘銀劍',  desc:'ATK+75 | 武器槽',       cost:{mithril_ingot:3,wood:1,relic:1}, gives:{mithril_sword:1}},
  {req:'forge',     id:'mithril_hat', ico:'👑',name:'秘銀冠',   desc:'DEF 4 | 頭部',          cost:{mithril_ingot:3,cloth:5,relic:1}, gives:{mithril_hat:1}},
  {req:'forge',     id:'mithril_armor',ico:'🥋',name:'秘銀甲',  desc:'DEF 7 | 身體',          cost:{mithril_ingot:8,cloth:6,relic:2}, gives:{mithril_armor:1}},
  {req:'forge',     id:'mithril_boots',ico:'👞',name:'秘銀靴',  desc:'移速+40% | DEF 4',      cost:{mithril_ingot:3,cloth:5,relic:1}, gives:{mithril_boots:1}},
  {req:'forge',     id:'mithril_gloves',ico:'🧤',name:'秘銀手套',desc:'採集體力-40% | DEF 4',  cost:{mithril_ingot:3,cloth:5,relic:1}, gives:{mithril_gloves:1}},
];

const ANIMAL_INFO={
  [AK.RABBIT]: {ico:'🐰',name:'兔子',tameCost:1,resKind:'fiber',resourceMax:90, petMsg:'小兔子蹦蹦跳跳~'},
  [AK.CHICKEN]:{ico:'🐔',name:'母雞', tameCost:1,resKind:'food', resourceMax:60, petMsg:'咯咯咯……剛下顆蛋~'},
  [AK.SHEEP]:  {ico:'🐑',name:'小羊', tameCost:2,resKind:'fiber',resourceMax:75, petMsg:'咩——想吃草草~'},
};

const RUIN_LORE=[
  '石碑上刻著:「先民以橋連兩岸,以火聚人心。」附近掉落了種子與一張古老圖紙。',
  '半埋的陶罐裡有曬乾的種子,罐底壓著一張古老圖紙,畫著某種高塔。',
  '傾倒的石柱下,你找到了防潮油布包好的種子與最後一張古老圖紙。',
];

const ENEMY_DEF={
  gopher:     {ico:'🐹',name:'地鼠',     hp:12, atk:3,  spd:0.5, xp:5,  loot:[{k:'bone',n:1,p:0.5},{k:'food',n:1,p:0.4},{k:'wooden_sword',n:1,p:0.05}]},
  stone_crab: {ico:'🦀',name:'石頭蟹',   hp:25, atk:7,  spd:0.35,xp:10, loot:[{k:'stone',n:2,p:0.7},{k:'bone',n:1,p:0.3},{k:'stone_pick',n:1,p:0.04}]},
  skeleton:   {ico:'💀',name:'骷髏兵',   hp:40,  atk:12, spd:0.45,xp:20, loot:[{k:'bone',n:2,p:0.8},{k:'iron_ore',n:1,p:0.25},{k:'stone_sword',n:1,p:0.06},{k:'stone_axe',n:1,p:0.04}]},
  dungeon_lord:{ico:'👹',name:'地城魔王', hp:200, atk:30, spd:0.3, xp:200, loot:[{k:'relic',n:2,p:1.0},{k:'iron_ingot',n:5,p:1.0},{k:'bone',n:3,p:1.0},{k:'iron_sword',n:1,p:0.5},{k:'iron_axe',n:1,p:0.35},{k:'iron_pick',n:1,p:0.35}]},
};

const QUESTS=[
  {t:'採集 8 份木材',           d:'走到樹前按互動鍵砍伐。打造木斧後效率翻倍。',            c:s=>s.gWood>=8},
  {t:'製作一把工具',             d:'按「製作」,空手即可做出木斧或石稿。',                   c:(_,W)=>W.inv.wooden_axe+W.inv.stone_pick>0||(W.equipped.hand!==null)},
  {t:'建造一座營火',             d:'按「建造」選擇營火。夜裡它會照亮四周。',                 c:s=>s.fires>=1},
  {t:'開墾農田並播種',           d:'建造農田後帶著種子對農田按互動鍵。',                     c:s=>s.farmsSown>=1},
  {t:'收成第一批作物',           d:'作物成熟後對它按互動鍵,水井能加速附近作物生長。',        c:s=>s.cropsHarvested>=1},
  {t:'縫製一件服裝',             d:'先製作布料,建好工作臺後可做衣服或帽子。',               c:(_,W)=>W.inv.hat+W.inv.shirt+W.inv.coat+W.inv.wool_coat>0||(W.equipped.head||W.equipped.body)},
  {t:'馴化一隻動物',             d:'島上有兔子🐰雞🐔羊🐑。面向牠按互動鍵,帶夠糧食。',       c:s=>s.tamed>=1},
  {t:'發現並調查全部 3 處遺跡',  d:'小地圖的金點就是遺跡位置。',                            c:s=>s.ruinsFound>=3},
  {t:'建造紀念碑',               d:'集齊 3 張古老圖紙後,在建造選單解鎖。',                 c:s=>s.monu>=1},
];
