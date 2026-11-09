// 小島開拓誌 — 存檔/讀檔（含舊存檔相容）
// 共用全域：所有 src/*.js 以一般 <script> 依序載入（非 ES module，才能直接用 file:// 開啟）
'use strict';

/* ══════════ 存檔 ══════════ */
const SAVE_KEY='isle-pioneer-v3';
function save(){
  if(!W)return;
  try{
    // 地城中存檔：儲存地面狀態，下次從地面開始
    const inD=W.inDungeon&&W._surface;
    // 同步當前地城樓層到快取（保留已探索狀態與固定入口）
    if(inD){
      cacheFloor(W.dungeonIdx+'_'+W.dungeonFloor);
    }
    // 序列化地城快取（僅存 obj/disc/enemies，ter 從 seed 重建）
    const dungeonCache={};
    for(const [k,dg] of Object.entries(W.dungeons||{})){
      if(!dg||!dg.disc)continue;
      dungeonCache[k]={
        obj:Array.from(dg.obj),disc:Array.from(dg.disc),
        enemies:(dg.enemies||[]).map(e=>({id:e.id,kind:e.kind,x:e.x,y:e.y,
          hp:e.hp,maxHp:e.maxHp,state:e.state||'idle',
          attackTimer:e.attackTimer||0,alertTimer:e.alertTimer||0,vx:0,vy:0})),
        spawnX:dg.spawnX||0,spawnY:dg.spawnY||0};
    }
    const d={seedStr:W.seedStr,
      ter:Array.from(inD?W._surface.ter:W.ter),obj:Array.from(inD?W._surface.obj:W.obj),
      aux:Array.from(inD?W._surface.aux:W.aux),disc:Array.from(inD?W._surface.disc:W.disc),
      px:inD?W._surface.px:W.px,py:inD?W._surface.py:W.py,
      face:W.face,stam:W.stam,day:W.day,tod:W.tod,timeAcc:W.timeAcc,
      inv:W.inv,equipped:W.equipped,equipDur:W.equipDur,animals:inD?(W._surface.animals||[]):W.animals,
      stats:W.stats,questIdx:W.questIdx,freePlay:W.freePlay,ruinFound:W.ruinFound,
      hp:W.hp,maxHp:W.maxHp,deathPos:W.deathPos,deathItems:W.deathItems,
      dungeonCache,storages:W.storages||{},invDur:W.invDur||{},
      advancedForge:W.advancedForge||false,
      inDungeon:W.inDungeon||false,dungeonIdx:W.dungeonIdx||-1,dungeonFloor:W.dungeonFloor||0,
      dungeonMaxFloor:W.dungeonMaxFloor||5,raidSeedStr:W.raidSeedStr||'',raidCounter:W.raidCounter||0,
      raidMaxFloor:W.raidMaxFloor||0,raidGatePos:W.raidGatePos||null,
      dungeonPx:inD?W.px:undefined,dungeonPy:inD?W.py:undefined};
    localStorage.setItem(SAVE_KEY,JSON.stringify(d));
  }catch(e){}
}
function load(){
  try{
    const raw=localStorage.getItem(SAVE_KEY);if(!raw)return null;
    const d=JSON.parse(raw);
    const w=genWorld(d.seedStr);
    w.ter=Uint8Array.from(d.ter);w.obj=Uint8Array.from(d.obj);
    w.aux=Float32Array.from(d.aux);w.disc=Uint8Array.from(d.disc);
    Object.assign(w.inv,d.inv);
    // 還原地城快取（ter 從 seed 重建，obj/disc/enemies 還原已訪問狀態）
    const dungeons={};
    for(const [k,ds] of Object.entries(d.dungeonCache||{})){
      try{
        const parts=k.split('_');const ri=+parts[0],fl=+parts[1];
        const dseed=ri===100?(d.raidSeedStr||d.seedStr):d.seedStr;
        const fresh=genDungeon(dseed,ri,fl,d.dungeonMaxFloor||5);
        // spawnX/spawnY 一律以 genDungeon 重生的固定入口為準（修復舊存檔把玩家/死亡位置寫成入口的問題）
        dungeons[k]={...fresh,obj:Uint8Array.from(ds.obj),disc:Uint8Array.from(ds.disc),
          enemies:ds.enemies||[],spawnX:fresh.spawnX,spawnY:fresh.spawnY};
      }catch(e2){}
    }
    // 將舊 invDur 格式（{id:number}）遷移至新陣列格式（{id:number[]}）
    const rawInvDur=d.invDur||{};
    const migratedInvDur={};
    for(const [k,v] of Object.entries(rawInvDur)){
      migratedInvDur[k]=Array.isArray(v)?[...v]:(v!=null?[v]:[]);
    }
    // 為舊存檔中未追蹤的裝備補全耐久陣列
    for(const [id,def] of Object.entries(EQUIP_DEF)){
      if(def.durability==null)continue;
      const cnt=(d.inv&&d.inv[id])||0;if(!cnt)continue;
      const arr=migratedInvDur[id]||[];
      while(arr.length<cnt)arr.push(def.durability);
      if(arr.length>cnt)arr.length=cnt;
      migratedInvDur[id]=arr;
    }
    Object.assign(w,{px:d.px,py:d.py,face:d.face,stam:d.stam,day:d.day,tod:d.tod,
      timeAcc:d.timeAcc||0,
      equipped:Object.assign({head:null,body:null,hand:null,hands:null,feet:null,weapon:null},d.equipped||{}),
      equipDur:Object.assign({head:null,body:null,hand:null,hands:null,feet:null,weapon:null},d.equipDur||{}),
      animals:d.animals||[],stats:d.stats||{},questIdx:d.questIdx,
      freePlay:d.freePlay,ruinFound:d.ruinFound,
      hp:d.hp||100,maxHp:d.maxHp||100,
      enemies:[],inDungeon:false,dungeonIdx:-1,dungeonFloor:0,
      dungeonMaxFloor:d.dungeonMaxFloor||5,raidSeedStr:d.raidSeedStr||'',raidCounter:d.raidCounter||0,
      raidMaxFloor:d.raidMaxFloor||0,raidGatePos:d.raidGatePos||null,
      dungeons,_surface:null,
      deathPos:d.deathPos||null,deathItems:d.deathItems||null,
      storages:d.storages||{},invDur:migratedInvDur,_fishing:null,advancedForge:d.advancedForge||false});
    w.stats=Object.assign({gWood:0,gStone:0,fires:0,huts:0,farmsSown:0,cropsHarvested:0,bridges:0,ruinsFound:0,monu:0,builds:0,workbenches:0,tamed:0},w.stats);
    // 若上次存檔時在地城中，還原地城狀態
    if(d.inDungeon&&d.dungeonIdx>=0&&d.dungeonPx!=null){
      w._surface={ter:w.ter,obj:w.obj,aux:w.aux,disc:w.disc,
        px:d.px,py:d.py,enemies:[],animals:w.animals||[]};
      w.animals=[];
      w.inDungeon=true;w.dungeonIdx=d.dungeonIdx;w.dungeonFloor=d.dungeonFloor||0;
      w.px=d.dungeonPx;w.py=d.dungeonPy;
      const dkey=d.dungeonIdx+'_'+(d.dungeonFloor||0);
      const dg=w.dungeons[dkey];
      if(dg&&dg.ter){
        w.ter=dg.ter;w.obj=dg.obj;w.aux=dg.aux||new Float32Array(SIZE*SIZE);
        w.disc=dg.disc;w.enemies=(dg.enemies||[]).map(e=>({...e}));
      }else{
        const dseed2=d.dungeonIdx===100?(d.raidSeedStr||d.seedStr):d.seedStr;
        const fresh2=genDungeon(dseed2,d.dungeonIdx,d.dungeonFloor||0,d.dungeonMaxFloor||5);
        w.ter=fresh2.ter;w.obj=fresh2.obj;w.aux=fresh2.aux;
        w.disc=fresh2.disc;w.enemies=(fresh2.enemies||[]).map(e=>({...e}));
      }
    }
    return w;
  }catch(e){return null;}
}
setInterval(()=>{if(running)save();},15000);
document.addEventListener('visibilitychange',()=>{if(document.hidden)save();});
