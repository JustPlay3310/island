/* ══════════ 地圖生成（lib/worldgen.js）══════════ */
'use strict';

function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function hashStr(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function clamp(v,a,b){return v<a?a:v>b?b:v;}
function tileHash(x,y){let h=(x*374761393+y*668265263)>>>0;h=(h^(h>>>13))>>>0;h=Math.imul(h,1274126177)>>>0;return((h^(h>>>16))>>>0)/4294967296;}
function makeNoise(rng,g){const a=new Float32Array(g*g);for(let i=0;i<a.length;i++)a[i]=rng();return function(x,y){const gx=x*(g-1),gy=y*(g-1),x0=Math.floor(gx),y0=Math.floor(gy),fx=gx-x0,fy=gy-y0,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy),i=(xx,yy)=>a[clamp(yy,0,g-1)*g+clamp(xx,0,g-1)],av=i(x0,y0)+(i(x0+1,y0)-i(x0,y0))*sx,bv=i(x0,y0+1)+(i(x0+1,y0+1)-i(x0,y0+1))*sx;return av+(bv-av)*sy;};}
function fbm(ns,x,y){let v=0,amp=.55,f=1,tot=0;for(let i=0;i<ns.length;i++){v+=ns[i](((x*f)%1+1)%1,((y*f)%1+1)%1)*amp;tot+=amp;amp*=.5;f*=2.03;}return v/tot;}

function genWorld(seedStr){
  const seed=hashStr(seedStr),rng=mulberry32(seed);
  const eN=[makeNoise(rng,9),makeNoise(rng,17),makeNoise(rng,33),makeNoise(rng,65)];
  const mN=[makeNoise(rng,9),makeNoise(rng,17),makeNoise(rng,33)];
  const ter=new Uint8Array(SIZE*SIZE),obj=new Uint8Array(SIZE*SIZE),
        aux=new Float32Array(SIZE*SIZE),disc=new Uint8Array(SIZE*SIZE);
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
    const nx=x/SIZE,ny=y/SIZE,dx=nx-.5,dy=ny-.5;
    const d=Math.sqrt(dx*dx+dy*dy)*2;
    let e=fbm(eN,nx,ny);e=e*1.18-Math.pow(d,2.1)*0.85;
    const m=fbm(mN,nx+3.7,ny+1.3),i=y*SIZE+x;
    if(e<0.18)ter[i]=T.DEEP;else if(e<0.30)ter[i]=T.WATER;
    else if(e<0.355)ter[i]=T.SAND;else if(e>0.78)ter[i]=T.MTN;
    else if(e>0.66)ter[i]=T.ROCKY;else if(m>0.58&&e>0.42)ter[i]=T.FOREST;
    else if(m>0.46)ter[i]=T.MEADOW;else ter[i]=T.GRASS;
  }
  for(let y=1;y<SIZE-1;y++)for(let x=1;x<SIZE-1;x++){
    const i=y*SIZE+x;
    if(ter[i]===T.GRASS||ter[i]===T.MEADOW){
      if(ter[i-1]<=T.WATER||ter[i+1]<=T.WATER||ter[i-SIZE]<=T.WATER||ter[i+SIZE]<=T.WATER)
        if(rng()<.6)ter[i]=T.SAND;
    }
  }
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
    const i=y*SIZE+x,t=ter[i],r=rng();
    if(t===T.FOREST){if(r<.62)obj[i]=O.TREE;else if(r<.66)obj[i]=O.BERRY;}
    else if(t===T.MEADOW){if(r<.10)obj[i]=O.TREE;else if(r<.16)obj[i]=O.BERRY;else if(r<.26)obj[i]=O.FLOWER;}
    else if(t===T.GRASS){if(r<.05)obj[i]=O.TREE;else if(r<.085)obj[i]=O.ROCK;else if(r<.11)obj[i]=O.FLOWER;}
    else if(t===T.ROCKY){if(r<.45)obj[i]=O.ROCK;}
    else if(t===T.SAND){
      const nearW=(x>0&&ter[i-1]<=T.WATER)||(x<SIZE-1&&ter[i+1]<=T.WATER)||(y>0&&ter[i-SIZE]<=T.WATER)||(y<SIZE-1&&ter[i+SIZE]<=T.WATER);
      if(nearW&&r<.18)obj[i]=O.REED;else if(nearW&&r<.27){obj[i]=O.CLAY;aux[i]=3;}
    }
    if(obj[i]===O.BERRY)aux[i]=-1;
  }
  let spawn=null,best=1e9;
  for(let y=8;y<SIZE-8;y++)for(let x=8;x<SIZE-8;x++){
    const i=y*SIZE+x;
    if((ter[i]===T.GRASS||ter[i]===T.MEADOW)&&obj[i]===O.NONE){
      const d=(x-SIZE/2)**2+(y-SIZE/2)**2;if(d<best){best=d;spawn={x,y};}
    }
  }
  if(!spawn)spawn={x:SIZE>>1,y:SIZE>>1};
  const ruins=[];
  const cand=[];
  for(let y=4;y<SIZE-4;y++)for(let x=4;x<SIZE-4;x++){
    const i=y*SIZE+x;
    if(ter[i]>=T.SAND&&ter[i]<=T.ROCKY&&ter[i]!==T.WATER&&Math.hypot(x-spawn.x,y-spawn.y)>22)
      cand.push({x,y});
  }
  cand.sort(()=>rng()-.5);
  for(const c of cand){
    if(ruins.length>=3)break;
    if(ruins.every(r=>Math.hypot(r.x-c.x,r.y-c.y)>26)){
      ruins.push({x:c.x,y:c.y});
      const i=c.y*SIZE+c.x;obj[i]=O.RUIN;aux[i]=ruins.length-1;
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        const j=(c.y+dy)*SIZE+(c.x+dx);
        if(j!==i&&obj[j]!==O.RUIN&&ter[j]>=T.SAND&&ter[j]!==T.MTN)obj[j]=O.NONE;
      }
    }
  }
  const animals=[];let aid=0;
  const animalSpecs=[
    {kind:AK.RABBIT,  allowed:[T.MEADOW,T.GRASS],  count:4},
    {kind:AK.CHICKEN, allowed:[T.GRASS,T.MEADOW],  count:3},
    {kind:AK.SHEEP,   allowed:[T.MEADOW],           count:3},
  ];
  for(const sp of animalSpecs){
    let placed=0,att=0;
    while(placed<sp.count&&att<200){
      att++;
      const ax=5+Math.floor(rng()*(SIZE-10)),ay=5+Math.floor(rng()*(SIZE-10));
      const ai=ay*SIZE+ax;
      if(!sp.allowed.includes(ter[ai]))continue;
      if(obj[ai]!==O.NONE)continue;
      if(Math.hypot(ax-spawn.x,ay-spawn.y)<12)continue;
      if(animals.some(a=>Math.hypot(a.x-ax,a.y-ay)<5))continue;
      const info=ANIMAL_INFO[sp.kind];
      animals.push({id:aid++,kind:sp.kind,x:ax+0.5,y:ay+0.5,vx:0,vy:0,
        state:'wild',fleeTimer:0,resourceTimer:info.resourceMax,resourceMax:info.resourceMax});
      placed++;
    }
  }
  return{
    seedStr,ter,obj,aux,disc,
    px:spawn.x,py:spawn.y,face:1,
    stam:100,day:1,tod:0.26,timeAcc:0,
    inv:{
      ...Object.fromEntries(Object.entries(RESOURCES).map(([k,v])=>[k,v.initQty])),
      ...Object.fromEntries(Object.keys(EQUIP_DEF).map(k=>[k,0])),
    },
    equipped:{head:null,body:null,hand:null,hands:null,feet:null,weapon:null},
    equipDur:{head:null,body:null,hand:null,hands:null,feet:null,weapon:null},
    animals,
    enemies:[],
    hp:100,maxHp:100,
    stats:{gWood:0,gStone:0,fires:0,huts:0,farmsSown:0,cropsHarvested:0,
           bridges:0,ruinsFound:0,monu:0,builds:0,workbenches:0,tamed:0},
    questIdx:0,freePlay:false,ruinFound:[false,false,false],
    inDungeon:false,dungeonIdx:-1,dungeonFloor:0,
    dungeons:{},_surface:null,storages:{},
    deathPos:null,deathItems:null,
    invDur:{},_fishing:null,
  };
}

function genDungeon(seedStr,ruinIdx,floor,maxFloor=5){
  const seed=hashStr(seedStr+'_d'+ruinIdx+'_f'+floor),rng=mulberry32(seed);
  const ter=new Uint8Array(SIZE*SIZE),obj=new Uint8Array(SIZE*SIZE),
        aux=new Float32Array(SIZE*SIZE),disc=new Uint8Array(SIZE*SIZE);
  ter.fill(T.MTN);

  /* ── 格子式房間配置 4×4，每格 24×24 ── */
  const COLS=4,ROWS=4,CW=24,CH=24;
  const rooms=[];
  const allCells=[...Array(COLS*ROWS).keys()];
  for(let i=allCells.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[allCells[i],allCells[j]]=[allCells[j],allCells[i]];}
  const numRooms=12+Math.floor(rng()*4);
  const activeSet=new Set(allCells.slice(0,numRooms));

  for(const ci of allCells){
    if(!activeSet.has(ci))continue;
    const col=ci%COLS,row=Math.floor(ci/COLS);
    const cellX=col*CW,cellY=row*CH;
    const maxW=Math.min(10,CW-4),maxH=Math.min(10,CH-4);
    const rw=6+Math.floor(rng()*Math.max(1,maxW-5));
    const rh=6+Math.floor(rng()*Math.max(1,maxH-5));
    const rx=cellX+2+Math.floor(rng()*Math.max(1,CW-rw-4));
    const ry=cellY+2+Math.floor(rng()*Math.max(1,CH-rh-4));
    // 異形房間：隨機削去部分角落
    const cs=1+Math.floor(rng()*2);
    const ch=[rng()<0.4,rng()<0.4,rng()<0.4,rng()<0.4];
    for(let y=ry;y<ry+rh;y++)for(let x=rx;x<rx+rw;x++){
      if(x<1||y<1||x>=SIZE-1||y>=SIZE-1)continue;
      const skip=(ch[0]&&x-rx<cs&&y-ry<cs)||(ch[1]&&rx+rw-1-x<cs&&y-ry<cs)||
                 (ch[2]&&x-rx<cs&&ry+rh-1-y<cs)||(ch[3]&&rx+rw-1-x<cs&&ry+rh-1-y<cs);
      if(!skip)ter[y*SIZE+x]=T.ROCKY;
    }
    const cx=rx+Math.floor(rw/2),cy=ry+Math.floor(rh/2);
    rooms.push({col,row,rx,ry,rw,rh,cx,cy,ci});
  }
  if(!rooms.length){
    const cx=SIZE>>1,cy=SIZE>>1;
    for(let y=cy-4;y<=cy+4;y++)for(let x=cx-4;x<=cx+4;x++)ter[y*SIZE+x]=T.ROCKY;
    rooms.push({col:1,row:1,rx:cx-4,ry:cy-4,rw:9,rh:9,cx,cy,ci:5});
  }

  /* ── L形走廊（2~3寬）── */
  function carveCorridor(ax,ay,bx,by){
    const cw=2+Math.floor(rng()*2);
    const xs=Math.min(ax,bx),xe=Math.max(ax,bx);
    for(let x=xs;x<=xe;x++)for(let dw=0;dw<cw;dw++){
      const ty=ay+dw;if(ty>=1&&ty<SIZE-1&&x>=1&&x<SIZE-1)ter[ty*SIZE+x]=T.ROCKY;
    }
    const ys=Math.min(ay,by),ye=Math.max(ay,by);
    for(let y=ys;y<=ye;y++)for(let dw=0;dw<cw;dw++){
      const tx=bx+dw;if(tx>=1&&tx<SIZE-1&&y>=1&&y<SIZE-1)ter[y*SIZE+tx]=T.ROCKY;
    }
  }

  /* ── Prim MST 確保所有房間連通 ── */
  const adjCell=(a,b)=>Math.abs(a.col-b.col)+Math.abs(a.row-b.row)===1;
  const connected=[rooms[0]];
  const unconn=rooms.slice(1);
  while(unconn.length){
    let bc=null,bu=null,bd=Infinity;
    for(const c of connected)for(const u of unconn){
      const d=Math.hypot(c.cx-u.cx,c.cy-u.cy)*(adjCell(c,u)?0.5:1);
      if(d<bd){bd=d;bc=c;bu=u;}
    }
    if(!bu)break;
    carveCorridor(bc.cx,bc.cy,bu.cx,bu.cy);
    connected.push(bu);unconn.splice(unconn.indexOf(bu),1);
  }

  /* ── 額外迴路（相鄰房間 15% 機率多一條走廊）── */
  for(let i=0;i<rooms.length;i++)for(let j=i+1;j<rooms.length;j++){
    if(adjCell(rooms[i],rooms[j])&&rng()<0.15)carveCorridor(rooms[i].cx,rooms[i].cy,rooms[j].cx,rooms[j].cy);
  }

  /* ── 死巷走廊（迷宮感）── */
  const deadCount=2+Math.floor(rng()*3);
  for(let k=0;k<deadCount;k++){
    const r=rooms[Math.floor(rng()*rooms.length)];
    const dir=Math.floor(rng()*4);
    const dx=[0,0,1,-1][dir],dy=[-1,1,0,0][dir];
    const len=5+Math.floor(rng()*8);
    let ex=r.cx,ey=r.cy;
    for(let l=0;l<len;l++){
      ex+=dx;ey+=dy;
      if(ex<2||ey<2||ex>=SIZE-3||ey>=SIZE-3)break;
      ter[ey*SIZE+ex]=T.ROCKY;
      const px=ex+Math.abs(dy),py=ey+Math.abs(dx);
      if(px>=1&&px<SIZE-1&&py>=1&&py<SIZE-1)ter[py*SIZE+px]=T.ROCKY;
    }
    // 死巷房間（40% 機率）
    if(rng()<0.4&&ex>4&&ey>4&&ex<SIZE-5&&ey<SIZE-5){
      const drw=3+Math.floor(rng()*4),drh=3+Math.floor(rng()*4);
      for(let y=ey-Math.floor(drh/2);y<ey-Math.floor(drh/2)+drh;y++)
        for(let x=ex-Math.floor(drw/2);x<ex-Math.floor(drw/2)+drw;x++)
          if(x>=1&&y>=1&&x<SIZE-1&&y<SIZE-1)ter[y*SIZE+x]=T.ROCKY;
      if(rng()<0.5&&ter[ey*SIZE+ex]===T.ROCKY&&obj[ey*SIZE+ex]===O.NONE)obj[ey*SIZE+ex]=O.CHEST;
    }
  }

  /* ── 出生點 & 上樓梯 ── */
  const sr=rooms[0];
  const spawnX=sr.cx,spawnY=Math.min(sr.ry+sr.rh-2,sr.cy+1);
  obj[sr.cy*SIZE+sr.cx]=O.STAIRS_UP;

  /* ── 下樓梯（距出生最遠的房間，B1-B3）── */
  let stairRoom=rooms[0];let maxD=0;
  for(const r of rooms){const d=Math.hypot(r.cx-sr.cx,r.cy-sr.cy);if(d>maxD){maxD=d;stairRoom=r;}}
  if(floor<maxFloor&&rooms.length>1){
    let placed=false;
    for(let dy=-3;dy<=3&&!placed;dy++)for(let dx=-3;dx<=3&&!placed;dx++){
      const tx=stairRoom.cx+dx,ty=stairRoom.cy+dy;
      if(tx>0&&ty>0&&tx<SIZE-1&&ty<SIZE-1&&ter[ty*SIZE+tx]===T.ROCKY&&obj[ty*SIZE+tx]===O.NONE){
        obj[ty*SIZE+tx]=O.STAIRS_DOWN;placed=true;
      }
    }
  }

  /* ── 填充怪物 & 寶箱 ── */
  const enemies=[];let eid=0;
  const floorTypes={1:['gopher'],2:['gopher','stone_crab'],3:['stone_crab','skeleton'],4:['skeleton'],5:['skeleton']};
  const types=floorTypes[Math.min(floor,5)]||['skeleton'];

  /* ── 稀有金屬礦生成（B3+）── */
  const oreByFloor={3:['silver_ore'],4:['silver_ore','gold_ore'],5:['silver_ore','gold_ore','mithril_ore']};
  const ores=oreByFloor[floor]||[];
  if(ores.length){
    for(const r of rooms){
      const oreCount=Math.floor(rng()*ores.length)+1;
      for(let oi=0;oi<oreCount;oi++){
        // oi indexes ores[] — 0=silver_ore→aux=-2, 1=gold_ore→aux=-3, 2=mithril_ore→aux=-4
        const oreAux=-(2+oi);
        for(let att=0;att<30;att++){
          const ox=r.rx+Math.floor(rng()*r.rw),oy=r.ry+Math.floor(rng()*r.rh);
          if(ox<1||oy<1||ox>=SIZE-1||oy>=SIZE-1)continue;
          if(ter[oy*SIZE+ox]!==T.ROCKY||obj[oy*SIZE+ox]!==O.NONE)continue;
          obj[oy*SIZE+ox]=O.ROCK; // reuse ROCK obj type
          aux[oy*SIZE+ox]=oreAux;
          break;
        }
      }
    }
  }

  function spawnInRoom(r,kind,count){
    const def=ENEMY_DEF[kind]||ENEMY_DEF['skeleton'];
    for(let n=0;n<count;n++){
      for(let att=0;att<60;att++){
        const ex=r.rx+Math.floor(rng()*r.rw),ey=r.ry+Math.floor(rng()*r.rh);
        if(ex<1||ey<1||ex>=SIZE-1||ey>=SIZE-1)continue;
        if(ter[ey*SIZE+ex]!==T.ROCKY||obj[ey*SIZE+ex]!==O.NONE)continue;
        if(enemies.some(e=>Math.hypot(e.x-ex,e.y-ey)<2))continue;
        enemies.push({id:eid++,kind,x:ex+0.5,y:ey+0.5,vx:0,vy:0,
          hp:def.hp,maxHp:def.hp,state:'idle',attackTimer:0,alertTimer:0});
        break;
      }
    }
  }

  for(let ri=0;ri<rooms.length;ri++){
    const r=rooms[ri];
    if(ri===0)continue; // 出生房無怪
    const isBoss=floor===maxFloor&&r===stairRoom;

    if(isBoss){
      // BOSS 房：skeleton 群 + dungeon_lord
      spawnInRoom(r,'skeleton',3+Math.floor(rng()*2));
      const def=ENEMY_DEF['dungeon_lord']||ENEMY_DEF['skeleton'];
      enemies.push({id:eid++,kind:'dungeon_lord',x:r.cx+0.5,y:r.cy+0.5,vx:0,vy:0,
        hp:def.hp,maxHp:def.hp,state:'idle',attackTimer:0,alertTimer:0});
      // 必有寶箱
      outer:for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){
        const tx=r.cx+dx,ty=r.cy+dy;
        if(tx>0&&ty>0&&tx<SIZE-1&&ty<SIZE-1&&ter[ty*SIZE+tx]===T.ROCKY&&obj[ty*SIZE+tx]===O.NONE){
          obj[ty*SIZE+tx]=O.CHEST;break outer;
        }
      }
    }else if(floor>=3&&rng()<0.25){
      // B3-B4：25% 機率純寶箱房（無怪）
      if(ter[r.cy*SIZE+r.cx]===T.ROCKY&&obj[r.cy*SIZE+r.cx]===O.NONE)obj[r.cy*SIZE+r.cx]=O.CHEST;
    }else{
      // 普通房：5-7 隻怪
      const kind=types[Math.floor(rng()*types.length)];
      spawnInRoom(r,kind,5+Math.floor(rng()*3));
      // 15% 機率有寶箱
      if(rng()<0.15){
        for(let att=0;att<30;att++){
          const cx=r.rx+1+Math.floor(rng()*Math.max(1,r.rw-2));
          const cy=r.ry+1+Math.floor(rng()*Math.max(1,r.rh-2));
          if(ter[cy*SIZE+cx]===T.ROCKY&&obj[cy*SIZE+cx]===O.NONE){obj[cy*SIZE+cx]=O.CHEST;break;}
        }
      }
    }
  }

  return{ter,obj,aux,disc,enemies,spawnX,spawnY};
}
