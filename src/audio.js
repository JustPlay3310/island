// 小島開拓誌 — 音效
// 共用全域：所有 src/*.js 以一般 <script> 依序載入（非 ES module，才能直接用 file:// 開啟）
'use strict';

/* ══════════ 音效 ══════════ */
let AC=null, masterGain=null, droneNode=null, ambNextTime=0, muted=false;

function initAudio(){
  if(AC)return;
  try{
    AC=new(window.AudioContext||window.webkitAudioContext)();
    masterGain=AC.createGain();
    masterGain.gain.value=1;
    masterGain.connect(AC.destination);
    startDrone();
    scheduleAmbient();
  }catch(e){}
}
['pointerdown','keydown'].forEach(ev=>document.addEventListener(ev,initAudio,{once:true}));

function startDrone(){
  if(!AC||droneNode)return;
  droneNode=AC.createOscillator();
  const g=AC.createGain(),f=AC.createBiquadFilter();
  f.type='lowpass';f.frequency.value=340;
  g.gain.value=muted?0:0.032;
  droneNode.type='sine';droneNode.frequency.value=130.8;
  droneNode.connect(f);f.connect(g);g.connect(masterGain);
  droneNode.start();
  droneNode._g=g;
}

function playNote(freq,time,dur,vol){
  if(!AC||muted)return;
  const o=AC.createOscillator(),g=AC.createGain();
  o.type='sine';o.frequency.value=freq;
  o.connect(g);g.connect(masterGain);
  g.gain.setValueAtTime(0,time);
  g.gain.linearRampToValueAtTime(vol||0.055,time+0.07);
  g.gain.exponentialRampToValueAtTime(0.0001,time+dur);
  o.start(time);o.stop(time+dur+0.05);
}

function scheduleAmbient(){
  if(!AC||muted){ambNextTime=0;return;}
  const now=AC.currentTime;
  if(ambNextTime>now+3)return;
  const night=W&&isNight();
  const sc=night?[196,220,261.6,311.1,349.2,261.6]:[261.6,293.7,329.6,392,440,523.3];
  let t=Math.max(now+0.1,ambNextTime);
  for(let i=0;i<5;i++){
    const freq=sc[Math.floor(Math.random()*sc.length)]*(Math.random()<0.25?2:1);
    const dur=0.45+Math.random()*0.9;
    playNote(freq,t,dur,night?0.04:0.055);
    t+=0.7+Math.random()*2.8;
  }
  ambNextTime=t;
}

function sfx(kind){
  if(!AC||muted)return;
  if(AC.state==='suspended')AC.resume();
  const t=AC.currentTime;
  const P={
    chop:[180,90,'square',.1],pick:[520,740,'sine',.07],
    build:[300,200,'triangle',.1],eat:[660,900,'sine',.07],
    quest:[523,784,'sine',.12],step:[160,130,'sine',.02],
    no:[220,150,'sawtooth',.07],ruin:[392,660,'triangle',.12],
    tame:[520,660,'triangle',.1],
    splash:[380,100,'sine',.055],fish_ok:[440,880,'triangle',.12]
  }[kind]||[440,440,'sine',.06];
  const o=AC.createOscillator(),g=AC.createGain();
  o.type=P[2];o.frequency.setValueAtTime(P[0],t);
  o.frequency.exponentialRampToValueAtTime(Math.max(P[1],1),t+.13);
  g.gain.setValueAtTime(P[3],t);g.gain.exponentialRampToValueAtTime(0.0001,t+.2);
  o.connect(g);g.connect(masterGain);o.start(t);o.stop(t+.22);
}

document.getElementById('mute').onclick=function(){
  muted=!muted;
  this.textContent=muted?'🔕':'🔔';
  if(AC){
    masterGain.gain.setValueAtTime(muted?0:1,AC.currentTime);
    if(!muted&&!droneNode)startDrone();
  }
};
