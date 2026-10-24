/* Direct portfolio / CV navigation; optional music never blocks content. */
(function(){
'use strict';
var body=document.body,route=document.getElementById('routeGate'),audio=document.getElementById('score');
var withMusic=document.getElementById('gateSound'),withoutMusic=document.getElementById('gateSilent');
var homeHashes=['#portfolio','#selected-work','#ecosystem','#brands','#practice','#writing','#about','#consult'];
function musicState(){var on=audio&&!audio.paused;withMusic.setAttribute('aria-pressed',String(on));withoutMusic.setAttribute('aria-pressed',String(!on));var btn=document.getElementById('soundToggle');btn.setAttribute('aria-pressed',String(on));btn.setAttribute('aria-label',on?'Turn sound off':'Turn sound on');document.getElementById('soundLabel').textContent=on?'Sound on':'Sound';}
withMusic.addEventListener('click',function(){if(audio.paused)document.getElementById('soundToggle').click();});
withoutMusic.addEventListener('click',function(){if(!audio.paused)document.getElementById('soundToggle').click();});
audio.addEventListener('play',musicState);audio.addEventListener('pause',musicState);
function syncViewFromUrl(){
 var hash=location.hash||'#portfolio',target=/^#[a-zA-Z][\w-]*$/.test(hash)?document.getElementById(hash.slice(1)):null;
 var cv=hash==='#cv'||hash==='#top'||(target&&target.closest('.professional-cv'));
 body.classList.toggle('route-locked',!cv);route.hidden=!!cv;route.classList.remove('is-closing');
 if(!cv&&audio)audio.pause();musicState();
 requestAnimationFrame(function(){
  var destination=cv?(hash==='#cv'||hash==='#top'?document.getElementById('heroTitle'):target):(homeHashes.indexOf(hash)>=0?target:null);
  if(hash==='#cv'||hash==='#portfolio'||hash==='#top'||!destination)window.scrollTo(0,0);else destination.scrollIntoView({block:'start'});
  if(cv&&destination){destination.setAttribute('tabindex','-1');destination.focus({preventScroll:true});}
  window.dispatchEvent(new Event('scroll'));
 });
}
window.addEventListener('hashchange',syncViewFromUrl);window.addEventListener('popstate',syncViewFromUrl);
document.getElementById('cvPrint').addEventListener('click',function(){window.print();});
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
})();
