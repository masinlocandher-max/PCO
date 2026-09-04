/* Purpose gate -> optional sound gate -> one-page CV. */
(function(){
  'use strict';
  var body=document.body;
  var route=document.getElementById('routeGate');
  var cv=document.getElementById('routeCv');
  var sound=document.getElementById('soundGate');
  var withSound=document.getElementById('gateSound');
  var silent=document.getElementById('gateSilent');
  var audio=document.getElementById('score');
  var soundBtn=document.getElementById('soundToggle');
  var soundLabel=document.getElementById('soundLabel');
  var KEY='fmb-sound-preference';

  function paint(on){
    if(!soundBtn)return;
    soundBtn.setAttribute('aria-pressed',on?'true':'false');
    soundBtn.setAttribute('aria-label',on?'Turn sound off':'Turn sound on');
    if(soundLabel)soundLabel.textContent=on?'Sound on':'Sound';
  }
  function close(el){
    if(!el)return;
    el.classList.add('is-closing');
    window.setTimeout(function(){el.hidden=true;},700);
  }
  function open(el){
    if(!el)return;
    el.hidden=false;
    el.classList.remove('is-closing');
  }
  function finish(){
    body.classList.remove('route-locked');
    window.setTimeout(function(){
      var hero=document.getElementById('heroTitle');
      if(hero)hero.scrollIntoView({block:'start'});
    },80);
  }

  body.classList.add('route-locked');
  if(cv){
    cv.addEventListener('click',function(){
      close(route);
      window.setTimeout(function(){open(sound);if(withSound)withSound.focus();},380);
    });
  }
  if(withSound){
    withSound.addEventListener('click',function(){
      try{localStorage.setItem(KEY,'on');}catch(e){}
      if(audio){
        audio.volume=1;
        var p=audio.play();
        if(p&&typeof p.catch==='function')p.catch(function(){paint(false);});
        paint(true);
      }
      close(sound);finish();
    });
  }
  if(silent){
    silent.addEventListener('click',function(){
      try{localStorage.setItem(KEY,'off');}catch(e){}
      if(audio)audio.pause();
      paint(false);
      close(sound);finish();
    });
  }
})();
