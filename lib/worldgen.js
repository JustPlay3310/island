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
    equipped:{head:null,body:null,hand:null,hands:null,feet:null},
    equipDur:{head:null,body:null,hand:null,hands:null,feet:null},
    animals,
    stats:{gWood:0,gStone:0,fires:0,huts:0,farmsSown:0,cropsHarvested:0,
           bridges:0,ruinsFound:0,monu:0,builds:0,workbenches:0,tamed:0},
    questIdx:0,freePlay:false,ruinFound:[false,false,false],
  };
}
