/* Three destinations -> optional sound choice -> one-page executive CV. */
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
  var CV_HASH='#cv';

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
  function showChooser(){
    body.classList.add('route-locked');
    if(sound){clearClose(sound);sound.hidden=true;sound.classList.remove('is-closing');}
    open(route);
    scrollTopNow();
  }
  function revealCv(){
    if(route){clearClose(route);route.hidden=true;route.classList.remove('is-closing');}
    if(sound){clearClose(sound);sound.hidden=true;sound.classList.remove('is-closing');}
    body.classList.remove('route-locked');
    scrollTopNow();
  }
  function finish(){
    revealCv();
    window.setTimeout(function(){
      var hero=document.getElementById('heroTitle');
      if(hero)hero.scrollIntoView({block:'start'});
    },80);
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
    var pref=storedSound();
    if(pref==='on'){
      playFromCvGesture();
      finish();
      return;
    }
    if(pref==='off'){
      if(audio)audio.pause();
      paint(false);
      finish();
      return;
    }
    close(route,260);
    window.setTimeout(function(){
      if(window.location.hash!==CV_HASH)return;
      open(sound);
      if(withSound)withSound.focus();
    },180);
  }
  function syncViewFromUrl(){
    if(window.location.hash===CV_HASH){
      revealCv();
    }else{
      showChooser();
    }
  }

  if(cv){
    cv.addEventListener('click',function(e){
      if(e)e.preventDefault();
      enterCvFromChoice();
    });
  }
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
  window.addEventListener('popstate',syncViewFromUrl);
  window.addEventListener('hashchange',syncViewFromUrl);
  syncViewFromUrl();

  /* ------------------------------------------------------- fuller CV copy
     Keep locked HTML for hero/profile voice. Add factual chapters only,
     with one job each, so flow and wording stay aligned with the CV spine. */
  var educationItems=document.querySelectorAll('#education .timeline li');
  if(educationItems[2]){
    var h3a=educationItems[2].querySelector('h3');
    var pa=educationItems[2].querySelector('p');
    if(h3a)h3a.textContent='Teaching units · Northern Zambales College Inc.';
    if(pa)pa.textContent='Classroom instruction that sharpened explanation, structure and communication for understanding.';
  }
  if(educationItems[3]){
    var h3b=educationItems[3].querySelector('h3');
    var pb=educationItems[3].querySelector('p');
    if(h3b)h3b.textContent='Training & facilitation';
    if(pb)pb.textContent='BPO training and local-government instruction across adult learning, pacing and practical communication.';
  }

  function section(id,label,title,inner){
    var s=document.createElement('section');
    s.className='chapter cv-supplement';
    s.id=id;
    s.innerHTML='<div class="chapter-rule"><span class="ch-num">00</span><span class="ch-name">'+label+'</span></div><div class="cv-section-head cv-reveal"><h2>'+title+'</h2></div>'+inner;
    return s;
  }

  var presence=document.getElementById('presence');
  if(presence && presence.parentNode){
    var career=section('experience','Career experience','The path that trained judgment under real public pressure.',
      '<div class="career-grid">'+
        '<article class="career-card cv-reveal"><span class="career-year">2019–2021</span><h3>Teaching Units</h3><p class="career-org">Northern Zambales College Inc.</p><p>Classroom teaching that built facilitation, clarity and the habit of structuring complex material for other people.</p></article>'+
        '<article class="career-card cv-reveal"><span class="career-year">Freelance</span><h3>Virtual Professional</h3><p class="career-org">Executive Assistant · Career Development · Sales &amp; Acquisitions</p><p>Remote professional work across coordination, career direction and commercial execution.</p></article>'+
        '<article class="career-card cv-reveal"><span class="career-year">Philippines</span><h3>PR Manager to Politicians</h3><p class="career-org">Political Public Relations</p><p>Public messaging, reputation, media-facing communication and perception under live political scrutiny.</p></article>'+
        '<article class="career-card cv-reveal"><span class="career-year">Current practice</span><h3>Consultant &amp; Strategist · Founder</h3><p class="career-org">Independent founder-led work</p><p>Brand, PR, communications, product, editorial and creative work led from first argument through public form.</p></article>'+
      '</div>');
    presence.parentNode.insertBefore(career,presence.nextSibling);
  }

  var education=document.getElementById('education');
  if(education && education.parentNode){
    var expertise=section('expertise','Core expertise','Eight capabilities. One outcome: make the message work in public.',
      '<div class="expertise-grid">'+
        '<article class="expertise-card cv-reveal"><span>01</span><h3>Strategic Communications &amp; PR</h3><p>Message architecture, media strategy, stakeholder communication and narrative development.</p></article>'+
        '<article class="expertise-card cv-reveal"><span>02</span><h3>Brand Strategy &amp; Identity</h3><p>Positioning, naming, identity systems, tone of voice and brand architecture.</p></article>'+
        '<article class="expertise-card cv-reveal"><span>03</span><h3>Reputation &amp; Perception</h3><p>Trust signals, issue framing, credibility and consistency across touchpoints.</p></article>'+
        '<article class="expertise-card cv-reveal"><span>04</span><h3>Creative Direction</h3><p>Campaign concepts, visual storytelling, editorial direction and content systems.</p></article>'+
        '<article class="expertise-card cv-reveal"><span>05</span><h3>Digital Products &amp; UX</h3><p>Information architecture, journeys, mobile-first experiences and platform concepts.</p></article>'+
        '<article class="expertise-card cv-reveal"><span>06</span><h3>Research &amp; Editorial</h3><p>Source comparison, verification, cultural research and evidence-aware publishing.</p></article>'+
        '<article class="expertise-card cv-reveal"><span>07</span><h3>Training &amp; Facilitation</h3><p>Workshops, teaching, hosting and turning complexity into usable instruction.</p></article>'+
        '<article class="expertise-card cv-reveal"><span>08</span><h3>Photography &amp; Audio</h3><p>Visual direction, storytelling, songwriting and integrated creative production.</p></article>'+
      '</div>');
    education.parentNode.insertBefore(expertise,education.nextSibling);
  }

  var talent=document.getElementById('talent');
  var identity=document.querySelector('.identity');
  if(talent && talent.parentNode){
    var creative=section('creative-practice','Creative & media practice','Strategy can become an image, a room, a campaign or a soundtrack.',
      '<div class="creative-grid">'+
        '<div class="creative-copy cv-reveal"><h3>Visual storytelling</h3><p>Photography and direction shape attention, hierarchy and public perception — not decoration after the fact.</p></div>'+
        '<div class="creative-copy cv-reveal"><h3>Music &amp; audio</h3><p><em>With Love, FMB</em> is an authored music project written and directed under the same creative practice, released on major streaming platforms.</p></div>'+
        '<div class="creative-copy cv-reveal"><h3>Speaking &amp; hosting</h3><p>Teaching, training and presentation use the same discipline: know the audience, structure the point, control the pace.</p></div>'+
      '</div>');
    talent.parentNode.insertBefore(creative,identity||talent.nextSibling);
  }

  var work=document.getElementById('work');
  if(work && work.parentNode){
    var initiatives=section('initiatives','Founder-led brand ecosystem','Four brands. Different missions. One point of view.',
      '<div class="brand-ecosystem-copy cv-reveal"><p>Client services, education, media and community infrastructure — each built to define purpose, shape the public experience and protect trust.</p></div>'+
      '<div class="brand-icon-row cv-reveal" aria-label="Founder-led brands">'+
        '<div class="brand-icon brand-icon-senz"><span class="brand-icon-mark">S</span><small>SENZ</small></div>'+
        '<div class="brand-icon brand-icon-cognita"><span class="brand-icon-mark">C<span class="brand-dot"></span></span><small>COGNITA</small></div>'+
        '<div class="brand-icon brand-icon-fmb"><span class="brand-icon-mark">FMB</span><small>FILIPINO MEDIA BULLETIN</small></div>'+
        '<div class="brand-icon brand-icon-masinloc"><span class="brand-icon-mark">M</span><small>MASINLOC CONNECT</small></div>'+
      '</div>'+
      '<div class="initiative-grid flagship-grid">'+
        '<article class="initiative-card flagship-card brand-senz cv-reveal"><span>Strategic communications · Founder-led</span><h3>SENZ Strategic Communications &amp; Digital Solutions</h3><p class="brand-summary">A practice that joins brand, reputation, communications and digital execution so organizations become clearer and harder to ignore.</p><div class="brand-inside"><strong>Inside SENZ</strong><ul><li>Brand strategy, positioning and identity</li><li>PR, media strategy and strategic communications</li><li>Reputation and narrative management</li><li>Content systems and digital experiences</li><li>Messaging review and communications strategy</li></ul></div></article>'+
        '<article class="initiative-card flagship-card brand-cognita cv-reveal"><span>AI education · Founder-led</span><h3>Cognita Institute of AI</h3><p class="brand-summary">Private, non-degree AI training built around practical competence, critical thinking and responsible use — a structured journey, not scattered tutorials.</p><div class="brand-inside"><strong>Inside Cognita</strong><ul><li>AI Foundations and literacy</li><li>Guided 10-week pathways</li><li>Self-paced training</li><li>Hands-on projects and application</li><li>Assessment, progress and credentials</li></ul></div></article>'+
        '<article class="initiative-card flagship-card brand-fmb cv-reveal"><span>Independent media · Founder &amp; editorial direction</span><h3>FMB News · Filipino Media Bulletin</h3><p class="brand-summary">Independent news built on verified facts, visible sources and clear explanation: what happened, what the context is, why it matters, what to watch next.</p><div class="brand-inside"><strong>Inside FMB</strong><ul><li>Breaking and developing coverage</li><li>FMB Worldwide and FMB Explainer</li><li>FMB Daily Brief</li><li>Fact checks and source maps</li><li>Formats for newsletters and public information</li></ul></div></article>'+
        '<article class="initiative-card flagship-card brand-masinloc cv-reveal"><span>Community technology · Founder-led</span><h3>Masinloc Connect</h3><p class="brand-summary">A community platform connecting Masinloqueños to information, opportunity, culture and practical digital services — website as source of truth, app as action layer.</p><div class="brand-inside"><strong>Inside Masinloc Connect</strong><ul><li>Local discovery and place information</li><li>Sambal Tina learning and preservation</li><li>Marketplace and local-commerce tools</li><li>Jobs, Help Desk and community assistance</li><li>History, culture and local bulletins</li></ul></div></article>'+
      '</div>'+
      '<div class="supporting-initiatives cv-reveal"><div><span>Related cultural product</span><h3>MANAMBALI</h3><p>Game-based Sambal Tina learning through word play, progression and cultural context.</p></div><div><span>Research &amp; publishing</span><h3>MABAYANI</h3><p>Local-history research with evidence, attribution, visible uncertainty and an open research trail.</p></div></div>');
    work.parentNode.insertBefore(initiatives,work);
  }

  var value=document.getElementById('value');
  if(value && value.parentNode){
    var cultural=section('cultural-work','Culture, community & public value','Heritage should be usable, visible and honestly represented.',
      '<div class="cultural-grid">'+
        '<div class="cultural-lead cv-reveal"><p>Local identity, Tina Sambal preservation, place branding and community information are recurring subjects in the work.</p><p>Culture is not decoration. It becomes media and product that people can understand, trust and use.</p></div>'+
        '<div class="cultural-points cv-reveal"><div><strong>Language preservation</strong><span>Sambal vocabulary, learning systems and digital experience.</span></div><div><strong>Place &amp; tourism</strong><span>Destination perception and community representation.</span></div><div><strong>Community communication</strong><span>Practical information, outreach and public understanding.</span></div><div><strong>Evidence-aware history</strong><span>Documentation, memory, interpretation and uncertainty kept distinct.</span></div></div>'+
      '</div>');
    value.parentNode.insertBefore(cultural,value);
  }

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