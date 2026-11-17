// Hilfen für Ton bei neuen Anfragen (Admin-Bereich) und Service Worker
(()=>{
 let ctx=null;
 const SPPush={
  async register(){if(!("serviceWorker" in navigator))return null;try{return await navigator.serviceWorker.register("sw.js");}catch(e){console.error(e);return null;}},
  soundOn:()=>localStorage.getItem("sp_sound")==="1",
  setSound(v){localStorage.setItem("sp_sound",v?"1":"0");if(v)this.beep();},
  beep(){try{ctx=ctx||new (window.AudioContext||window.webkitAudioContext)();if(ctx.state==="suspended")ctx.resume();
   [[880,0],[1175,.18],[880,.4],[1175,.58]].forEach(([f,t])=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type="sine";o.frequency.value=f;g.gain.setValueAtTime(.0001,ctx.currentTime+t);g.gain.exponentialRampToValueAtTime(.35,ctx.currentTime+t+.02);g.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+t+.16);o.connect(g).connect(ctx.destination);o.start(ctx.currentTime+t);o.stop(ctx.currentTime+t+.18);});}catch(e){console.error(e);}}
 };
 // Browser erlauben Ton erst nach einem Klick: den ersten Klick nutzen, um Audio freizuschalten
 document.addEventListener("click",()=>{try{ctx=ctx||new (window.AudioContext||window.webkitAudioContext)();if(ctx.state==="suspended")ctx.resume();}catch(_){}},{once:true});
 window.SPPush=SPPush;SPPush.register();
})();
