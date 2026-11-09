// 小島開拓誌 — 主迴圈、開始遊戲（載入時的初始化放這裡）
// 共用全域：所有 src/*.js 以一般 <script> 依序載入（非 ES module，才能直接用 file:// 開啟）
'use strict';

/* ══════════ 主迴圈 ══════════ */
let last=0,growAcc=0,ambTick=0;
function loop(ts){
  requestAnimationFrame(loop);if(!running)return;
  const dt=Math.min(0.05,(ts-last)/1000||0.016);last=ts;
  W.timeAcc=(W.timeAcc||0)+dt;
  // 環境音樂排程（暫停時仍繼續）
  ambTick-=dt;if(ambTick<=0){ambTick=2;scheduleAmbient();}
  if(!paused){
    // 時間推進
    const prevTod=W.tod;W.tod+=dt/DAY_LEN;if(W.tod>=1){W.tod-=1;}
    if(prevTod<0.24&&W.tod>=0.24){W.day++;toast('☀️ 第 '+W.day+' 天');}
    // 移動（含 deadlock：新方向先轉身鎖定，時間 = 移動冷卻/2）
    moveCd-=dt;
    const speedMul=hasBoots()?0.65:1;
    const d=heldDir>=0?heldDir:dirFromKeys();
    if(d>=0){
      if(d!==prevDir){W.face=d;turnLock=0.25*speedMul/2;}
      prevDir=d;
      turnLock=Math.max(0,turnLock-dt);
      if(turnLock<=0){tryMove(d);walkPhase+=dt*12;}
    }else{prevDir=-1;turnLock=0;walkPhase=0;}
    // 體力
    const body=W.equipped.body,nightNow=isNight(),hat=W.equipped.head==='hat';
    if(d<0){
      if(nightNow){
        if(body==='wool_coat')W.stam=Math.min(100,W.stam+dt*.7);
        else if(body==='coat')W.stam=Math.min(100,W.stam+dt*.3);
        else if(body==='shirt')W.stam=Math.max(0,W.stam-dt*.4);
        else W.stam=Math.max(0,W.stam-dt*.9);
      }else{
        const rate=1.2*(hat?1.2:1);W.stam=Math.min(100,W.stam+dt*rate);
      }
    }
    updateAnimals(dt);
    updateEnemies(dt);
    // 釣魚狀態更新
    if(W._fishing){
      const fm=W._fishing;
      if(fm.state==='waiting'){
        fm.waitTimer-=dt;fm.soundTimer=(fm.soundTimer||0)+dt;
        if(fm.soundTimer>1.4+Math.random()){fm.soundTimer=0;sfx('splash');}
        if(fm.waitTimer<=0){
          const roll=rollFishingLoot();
          W._fishing={state:'biting',loot:roll.items(),greenW:roll.greenW,
            greenStart:Math.random()*(1-roll.greenW),
            cursorPos:Math.random(),cursorSpeed:.45+Math.random()*.55,
            cursorDir:Math.random()<.5?1:-1,biteTimer:5,
            faceX:fm.faceX,faceY:fm.faceY};
          sfx('splash');toast('🎣 魚上鉤了！快按 F 釣起！');
        }
      }else if(fm.state==='biting'){
        fm.cursorPos+=fm.cursorSpeed*fm.cursorDir*dt;
        if(fm.cursorPos>=1){fm.cursorPos=1;fm.cursorDir=-1;}
        if(fm.cursorPos<=0){fm.cursorPos=0;fm.cursorDir=1;}
        fm.biteTimer-=dt;
        if(fm.biteTimer<=0){toast('🐟 魚跑掉了…');sfx('no');W._fishing={state:'idle'};}
      }
    }
    if(!W.inDungeon){growAcc+=dt;if(growAcc>=1){growWorld(growAcc);growAcc=0;}}
  }
  render();mmPlayer();updateHUD();
  if(paused&&document.getElementById('bagPanel').classList.contains('open'))drawDoll();
}
requestAnimationFrame(loop);

/* ══════════ 開始遊戲 ══════════ */
function startGame(world){
  W=world;camInit=false;mmDirty=true;floats=[];
  discover();renderInv();renderQuests();drawDoll();
  document.getElementById('title').style.display='none';running=true;
  if(W.day===1&&W.stats.builds===0){
    setTimeout(()=>toast('📖 開「手帳」看建設指引',false),900);
    setTimeout(()=>toast('🌫️ 你在霧中的小島醒來……',false),100);
  }
}
const saved=load();
if(saved)document.getElementById('btnContinue').style.display='block';
document.getElementById('btnContinue').onclick=()=>{const w=load();if(w)startGame(w);};
document.getElementById('btnNew').onclick=()=>startGame(genWorld('isle-'+Math.floor(Math.random()*1e9)));
document.getElementById('btnSeedGo').onclick=()=>{const s=document.getElementById('seedInput').value.trim();startGame(genWorld(s||('isle-'+Math.floor(Math.random()*1e9))));};
