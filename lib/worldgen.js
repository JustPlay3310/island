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
    dungeons:{},_surface:null,
    deathPos:null,deathItems:null,
  };
}

function genDungeon(seedStr,ruinIdx,floor){
  const seed=hashStr(seedStr+'_d'+ruinIdx+'_f'+floor),rng=mulberry32(seed);
  const ter=new Uint8Array(SIZE*SIZE),obj=new Uint8Array(SIZE*SIZE),
        aux=new Float32Array(SIZE*SIZE),disc=new Uint8Array(SIZE*SIZE);
  ter.fill(T.MTN);

  /* ── BSP 房間分割 ── */
  const rooms=[];
  function split(x,y,w,h,d){
    const minS=7;
    if(w<minS||h<minS){return;}
    if(d<=0||w<minS*2||h<minS*2){rooms.push({x,y,w,h});return;}
    if(rng()<.5&&h>=minS*2){
      const s=minS+Math.floor(rng()*(h-minS*2));
      split(x,y,w,s,d-1);split(x,y+s,w,h-s,d-1);
    }else if(w>=minS*2){
      const s=minS+Math.floor(rng()*(w-minS*2));
      split(x,y,s,h,d-1);split(x+s,y,w-s,h,d-1);
    }else{rooms.push({x,y,w,h});}
  }
  split(2,2,SIZE-4,SIZE-4,4);

  /* ── 從每個 BSP 單元刻出房間（留 1-2 格邊距）── */
  const carved=[];
  for(const r of rooms){
    const p=1+Math.floor(rng()*2);
    const rx=r.x+p,ry=r.y+p,rw=r.w-p*2,rh=r.h-p*2;
    if(rw<4||rh<4)continue;
    for(let y=ry;y<ry+rh;y++)for(let x=rx;x<rx+rw;x++)ter[y*SIZE+x]=T.ROCKY;
    const cx=rx+Math.floor(rw/2),cy=ry+Math.floor(rh/2);
    carved.push({x:rx,y:ry,w:rw,h:rh,cx,cy});
  }
  if(!carved.length){
    const cx=SIZE>>1,cy=SIZE>>1;
    for(let y=cy-3;y<=cy+3;y++)for(let x=cx-3;x<=cx+3;x++)ter[y*SIZE+x]=T.ROCKY;
    carved.push({x:cx-3,y:cy-3,w:7,h:7,cx,cy});
  }

  /* ── 走廊連接（按原序，每間連前一間）── */
  for(let i=1;i<carved.length;i++){
    let ax=carved[i].cx,ay=carved[i].cy;
    const b=carved[Math.floor(rng()*i)];
    let bx=b.cx,by=b.cy;
    while(ax!==bx){ter[ay*SIZE+ax]=T.ROCKY;ax+=ax<bx?1:-1;}
    while(ay!==by){ter[ay*SIZE+ax]=T.ROCKY;ay+=ay<by?1:-1;}
  }

  /* ── 出生點（第一間房正中心稍南 1 格）── */
  const sr=carved[0];
  const spawnX=sr.cx, spawnY=Math.min(sr.y+sr.h-2,sr.cy+1);

  /* ── 上樓梯（入口，位於第一房正中）── */
  obj[sr.cy*SIZE+sr.cx]=O.STAIRS_UP;

  /* ── 下樓梯（最後一間房，B1-B3 有）── */
  if(floor<4&&carved.length>1){
    const lr=carved[carved.length-1];
    let placed=false;
    for(let dy=-2;dy<=2&&!placed;dy++)for(let dx=-2;dx<=2&&!placed;dx++){
      const tx=lr.cx+dx,ty=lr.cy+dy;
      if(ty>=0&&ty<SIZE&&tx>=0&&tx<SIZE&&ter[ty*SIZE+tx]===T.ROCKY&&obj[ty*SIZE+tx]===O.NONE){
        obj[ty*SIZE+tx]=O.STAIRS_DOWN;placed=true;
      }
    }
  }

  /* ── 寶箱（跳過第一間，數量隨層遞增）── */
  const chestCount=Math.min(carved.length-1,1+Math.floor(floor/2));
  for(let ci=0;ci<chestCount;ci++){
    const r=carved[1+ci];
    let placed=false;
    for(let att=0;att<20&&!placed;att++){
      const cx=r.x+1+Math.floor(rng()*(r.w-2));
      const cy=r.y+1+Math.floor(rng()*(r.h-2));
      if(ter[cy*SIZE+cx]===T.ROCKY&&obj[cy*SIZE+cx]===O.NONE){obj[cy*SIZE+cx]=O.CHEST;placed=true;}
    }
  }

  /* ── 敵人 ── */
  const enemies=[];let eid=0;
  const types=floor<=1?['gopher']:floor<=2?['gopher','stone_crab']:['stone_crab','skeleton'];
  const count=Math.min(3+floor*2,12);
  for(let n=0;n<count;n++){
    for(let att=0;att<200;att++){
      const ri=1+Math.floor(rng()*(carved.length-1));
      if(ri>=carved.length)continue;
      const r=carved[ri];
      const ex=r.x+Math.floor(rng()*r.w),ey=r.y+Math.floor(rng()*r.h);
      if(ter[ey*SIZE+ex]!==T.ROCKY||obj[ey*SIZE+ex]!==O.NONE)continue;
      if(enemies.some(e=>Math.hypot(e.x-ex,e.y-ey)<3))continue;
      const kind=types[Math.floor(rng()*types.length)];
      const def=ENEMY_DEF[kind];
      enemies.push({id:eid++,kind,x:ex+0.5,y:ey+0.5,vx:0,vy:0,
        hp:def.hp,maxHp:def.hp,state:'idle',attackTimer:0,alertTimer:0});
      break;
    }
  }

  return{ter,obj,aux,disc,enemies,spawnX,spawnY};
}
