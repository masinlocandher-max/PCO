/* Scroll-driven portfolio -> optional sound choice -> full executive CV. */
(function(){
  'use strict';

  var body=document.body;
  var route=document.getElementById('routeGate');
  var sound=document.getElementById('soundGate');
  var withSound=document.getElementById('gateSound');
  var silent=document.getElementById('gateSilent');
  var audio=document.getElementById('score');
  var soundBtn=document.getElementById('soundToggle');
  var soundLabel=document.getElementById('soundLabel');
  var KEY='fmb-sound-preference';
  var CV_HASH='#cv';
  var cvEntered=false;
  var cvTargetHash='#cv';
  function gateInert(value){
    [route,document.querySelector('main'),document.querySelector('.topbar'),document.querySelector('body>footer')].forEach(function(el){if(el)el.inert=value;});
    body.classList.toggle('cv-choice-open',value);
  }
  function chooseMusic(hash){
    cvTargetHash=hash||CV_HASH;
    if(audio)audio.pause();
    paint(false);open(sound);gateInert(true);
    if(withSound)withSound.focus();
  }
  var HOME_HASHES={
    '#selected-work':true,
    '#ecosystem':true,
    '#brands':true,
    '#practice':true,
    '#writing':true,
    '#about':true,
    '#consult':true,
    '#portfolio':true
  };

  function paint(on){
    if(!soundBtn)return;
    soundBtn.setAttribute('aria-pressed',on?'true':'false');
    soundBtn.setAttribute('aria-label',on?'Turn sound off':'Turn sound on');
    if(soundLabel)soundLabel.textContent=on?'Sound on':'Sound';
  }
  function clearClose(el){
    if(!el||!el._fmbCloseTimer)return;
    window.clearTimeout(el._fmbCloseTimer);
    el._fmbCloseTimer=null;
  }
  function close(el,delay){
    if(!el)return;
    clearClose(el);
    el.classList.add('is-closing');
    el._fmbCloseTimer=window.setTimeout(function(){
      el.hidden=true;
      el._fmbCloseTimer=null;
    },typeof delay==='number'?delay:420);
  }
  function open(el){
    if(!el)return;
    clearClose(el);
    el.hidden=false;
    el.classList.remove('is-closing');
  }
  function storedSound(){
    try{return localStorage.getItem(KEY)||'';}catch(e){return '';}
  }
  function scrollTopNow(){
    window.requestAnimationFrame(function(){window.scrollTo(0,0);});
  }
  function scrollHomeTarget(hash){
    if(!hash||!HOME_HASHES[hash])return;
    window.requestAnimationFrame(function(){
      var el=document.getElementById(hash.slice(1));
      if(el)el.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
    });
  }
  function showHome(opts){
    cvEntered=false;gateInert(false);
    body.classList.add('route-locked');
    if(audio)audio.pause();
    paint(false);
    if(sound){clearClose(sound);sound.hidden=true;sound.classList.remove('is-closing');}
    open(route);
    if(opts&&opts.scrollHash){
      scrollHomeTarget(opts.scrollHash);
    }else if(!(opts&&opts.keepScroll)){
      scrollTopNow();
    }
  }
  function revealCv(){
    gateInert(false);cvEntered=true;
    if(route){clearClose(route);route.hidden=true;route.classList.remove('is-closing');}
    if(sound){clearClose(sound);sound.hidden=true;sound.classList.remove('is-closing');}
    body.classList.remove('route-locked');
    scrollTopNow();
  }
  function finish(){
    revealCv();
    requestAnimationFrame(function(){
      var target=document.getElementById(cvTargetHash==='#cv'?'heroTitle':cvTargetHash.slice(1));
      if(target){target.setAttribute('tabindex','-1');target.focus({preventScroll:true});if(cvTargetHash==='#cv')window.scrollTo(0,0);else target.scrollIntoView({block:'start'});}
    });
  }
  function playFromCvGesture(){
    if(!audio)return;
    audio.volume=1;
    var p=audio.play();
    if(p&&typeof p.catch==='function')p.catch(function(){paint(false);});
    paint(true);
  }
  function enterCvFromChoice(){
    if(window.location.hash!==CV_HASH){
      history.pushState({fmbView:'cv'},'',CV_HASH);
    }
    if(audio)audio.pause();
    paint(false);
    chooseMusic(CV_HASH);
  }

  function syncViewFromUrl(){
    var hash=window.location.hash||'';
    if(hash===CV_HASH){
      if(cvEntered)revealCv();else chooseMusic(CV_HASH);
      return;
    }
    if(HOME_HASHES[hash]){
      showHome({scrollHash:hash});
      return;
    }
    var target=/^#[a-zA-Z][\w-]*$/.test(hash)?document.getElementById(hash.slice(1)):null;
    var cvTarget=target && target.closest('main')?target:null;
    if(cvTarget){
      if(!cvEntered){chooseMusic(hash);return;}
      revealCv();
      requestAnimationFrame(function(){cvTarget.scrollIntoView({block:'start'});});
      return;
    }
    if(hash==='#top'){revealCv();return;}
    showHome();
  }

  function bindCvEntry(el){
    if(!el)return;
    el.addEventListener('click',function(e){
      if(e)e.preventDefault();
      enterCvFromChoice();
    });
  }
  bindCvEntry(document.getElementById('routeCv'));
  bindCvEntry(document.getElementById('routeCvNav'));
  bindCvEntry(document.getElementById('routeCvSecondary'));

  if(withSound){
    withSound.addEventListener('click',function(){
      try{localStorage.setItem(KEY,'on');}catch(e){}
      playFromCvGesture();
      close(sound,260);
      finish();
    });
  }
  if(silent){
    silent.addEventListener('click',function(){
      try{localStorage.setItem(KEY,'off');}catch(e){}
      if(audio)audio.pause();
      paint(false);
      close(sound,260);
      finish();
    });
  }
  if(sound)sound.addEventListener('keydown',function(e){
    if(e.key==='Escape'){e.preventDefault();silent.click();}
    if(e.key==='Tab'){var next=e.shiftKey?withSound:silent;if(document.activeElement===(e.shiftKey?withSound:silent)){e.preventDefault();next=e.shiftKey?silent:withSound;next.focus();}}
  });
  var printButton=document.getElementById('cvPrint');
  if(printButton)printButton.addEventListener('click',function(){window.print();});
  window.addEventListener('popstate',syncViewFromUrl);
  window.addEventListener('hashchange',syncViewFromUrl);

  function expireSlots(){
    document.querySelectorAll('.pf-slot,.calendar-slot').forEach(function(slot){
      var dates=new URL(slot.href).searchParams.get('dates');
      var start=dates&&dates.split('/')[0];
      if(!start || !/^\d{8}T\d{6}Z$/.test(start))return;
      var iso=start.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,'$1-$2-$3T$4:$5:$6Z');
      slot.hidden=Date.parse(iso)<=Date.now();
    });
    document.querySelectorAll('.calendar-month').forEach(function(month){month.hidden=!month.querySelector('.calendar-slot:not([hidden])');});
  }
  expireSlots();
  window.addEventListener('pageshow',expireSlots);
  document.addEventListener('visibilitychange',function(){if(!document.hidden)expireSlots();});
  syncViewFromUrl();

  /* Renumber visible CV chapters after the fuller sections are inserted. */
  var chapterNumbers=document.querySelectorAll('main .chapter .chapter-rule .ch-num');
  Array.prototype.forEach.call(chapterNumbers,function(n,i){n.textContent=String(i+1).padStart(2,'0');});

  /* The injected sections arrive after app.js has built its reveal list. Give
     them their own lightweight observer so they remain scroll-driven. */
  var reveals=document.querySelectorAll('.cv-reveal');
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){entry.target.classList.add('is-visible');io.unobserve(entry.target);}
      });
    },{threshold:.14,rootMargin:'0px 0px -8% 0px'});
    Array.prototype.forEach.call(reveals,function(el){io.observe(el);});
  }else{
    Array.prototype.forEach.call(reveals,function(el){el.classList.add('is-visible');});
  }
})();