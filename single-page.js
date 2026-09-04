/* Purpose gate -> optional sound gate -> one-page executive CV. */
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

  /* ------------------------------------------------------- fuller CV copy */
  var role=document.querySelector('.hero-role');
  if(role){
    role.innerHTML='Strategic Communications Professional &nbsp;·&nbsp; PR &amp; Brand Strategist &nbsp;·&nbsp; Creative Director &nbsp;·&nbsp; Founder';
  }
  var intro=document.querySelector('.hero-intro');
  if(intro){
    intro.textContent='I build brands, narratives, platforms and public-facing systems across strategic communications, public relations, identity, digital products, culture and education. My work connects positioning, research, creative direction and execution so the final experience is clear, credible, memorable and useful.';
  }

  var profile=document.querySelector('.presence-copy');
  if(profile){
    var ps=profile.querySelectorAll('p');
    if(ps[0])ps[0].textContent='My practice spans strategic communications, public relations, brand strategy, creative direction, reputation and perception management, editorial systems, digital products, photography, multimedia, training, research and community-facing communication.';
    if(ps[1])ps[1].textContent='I work across disciplines because public perception is rarely created by one thing. Positioning, visual identity, language, evidence, user experience, media handling and execution all have to reinforce the same argument.';
    if(ps[2])ps[2].textContent='I have worked as an educator and trainer, communications strategist, creative director, founder, photographer, storyteller and product builder. I am equally comfortable shaping the system behind the work and presenting the message in front of a room.';
  }

  var educationItems=document.querySelectorAll('#education .timeline li');
  if(educationItems[2]){
    var h3a=educationItems[2].querySelector('h3');
    var pa=educationItems[2].querySelector('p');
    if(h3a)h3a.textContent='College Instructor · 2019–2021';
    if(pa)pa.textContent='Northern Zambales College Inc. Teaching strengthened my ability to translate complex material into language people can understand and use.';
  }
  if(educationItems[3]){
    var h3b=educationItems[3].querySelector('h3');
    var pb=educationItems[3].querySelector('p');
    if(h3b)h3b.textContent='BPO Trainer · 2021–2022';
    if(pb)pb.textContent='Optum / UnitedHealthcare. Adult learning, facilitation, coaching, quality communication and structured instruction across different levels of confidence and experience.';
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
    var career=section('experience','Career experience','A career built across communication, education, training and independent creative practice.',
      '<div class="career-grid">'+
        '<article class="career-card cv-reveal"><span class="career-year">2019–2021</span><h3>College Instructor</h3><p class="career-org">Northern Zambales College Inc.</p><p>Delivered classroom instruction, translated complex material into practical learning, and developed the communication discipline that now informs strategy, facilitation and public-facing work.</p></article>'+
        '<article class="career-card cv-reveal"><span class="career-year">2021–2022</span><h3>BPO Trainer</h3><p class="career-org">Optum / UnitedHealthcare</p><p>Handled adult learning, coaching, process communication and performance-oriented training where clarity, pacing and accuracy had direct operational consequences.</p></article>'+
        '<article class="career-card cv-reveal"><span class="career-year">2024</span><h3>Local Government Trainer</h3><p class="career-org">Training &amp; facilitation</p><p>Applied structured communication and facilitation to public-sector learning environments, adapting information for mixed audiences and practical use.</p></article>'+
        '<article class="career-card cv-reveal"><span class="career-year">Current practice</span><h3>Founder · Creative Director · Communications Strategist</h3><p class="career-org">Independent founder-led work</p><p>Leads brand, PR, communications, digital product, editorial, cultural and creative initiatives from strategy through execution, with a focus on trust, visibility and long-term brand value.</p></article>'+
      '</div>');
    presence.parentNode.insertBefore(career,presence.nextSibling);
  }

  var education=document.getElementById('education');
  if(education && education.parentNode){
    var expertise=section('expertise','Core expertise','A multidisciplinary communications practice, organized around one outcome: make the message work.',
      '<div class="expertise-grid">'+
        '<article class="expertise-card cv-reveal"><span>01</span><h3>Strategic Communications &amp; PR</h3><p>Message architecture, public information, media strategy, stakeholder communication, campaigns and narrative development.</p></article>'+
        '<article class="expertise-card cv-reveal"><span>02</span><h3>Brand Strategy &amp; Identity</h3><p>Positioning, naming, identity systems, tone of voice, brand architecture, differentiation and customer-facing expression.</p></article>'+
        '<article class="expertise-card cv-reveal"><span>03</span><h3>Reputation &amp; Perception</h3><p>Trust signals, public perception, issue framing, credibility, reputation systems and consistency across touchpoints.</p></article>'+
        '<article class="expertise-card cv-reveal"><span>04</span><h3>Creative Direction</h3><p>Campaign concepts, visual storytelling, photography, editorial art direction, content systems and multimedia production.</p></article>'+
        '<article class="expertise-card cv-reveal"><span>05</span><h3>Digital Products &amp; UX Direction</h3><p>Information architecture, product positioning, user journeys, mobile-first experiences, websites and platform concepts.</p></article>'+
        '<article class="expertise-card cv-reveal"><span>06</span><h3>Research &amp; Editorial</h3><p>Source comparison, fact verification, cultural research, explanatory writing and evidence-aware publishing.</p></article>'+
        '<article class="expertise-card cv-reveal"><span>07</span><h3>Training &amp; Facilitation</h3><p>Adult learning, workshops, teaching, presentations, speaking, hosting and translating complexity into usable instruction.</p></article>'+
        '<article class="expertise-card cv-reveal"><span>08</span><h3>Photography, Video &amp; Audio</h3><p>Photography, visual direction, storytelling, music production, songwriting, audio concepts and integrated creative production.</p></article>'+
      '</div>');
    education.parentNode.insertBefore(expertise,education.nextSibling);
  }

  var talent=document.getElementById('talent');
  var identity=document.querySelector('.identity');
  if(talent && talent.parentNode){
    var creative=section('creative-practice','Creative & media practice','The strategy can become a photograph, a stage presentation, a campaign, a soundtrack or a digital experience.',
      '<div class="creative-grid">'+
        '<div class="creative-copy cv-reveal"><h3>Visual storytelling</h3><p>Photography and creative direction are part of how I think, not a separate decoration layer. I use imagery to shape attention, hierarchy, emotion and public perception.</p></div>'+
        '<div class="creative-copy cv-reveal"><h3>Music &amp; audio</h3><p>I also work in songwriting and music production. <em>With Love, FMB</em> is an authored music project written and directed under my creative practice and distributed through major streaming platforms.</p></div>'+
        '<div class="creative-copy cv-reveal"><h3>Speaking, hosting &amp; presentation</h3><p>Teaching, training, hosting and public presentation extend the same discipline: understand the audience, structure the message, control pacing and make the point land.</p></div>'+
      '</div>');
    talent.parentNode.insertBefore(creative,identity||talent.nextSibling);
  }

  var work=document.getElementById('work');
  if(work && work.parentNode){
    var initiatives=section('initiatives','Founder-led initiatives','Independent ventures where strategy, culture, communications and product thinking are built together.',
      '<div class="initiative-grid">'+
        '<article class="initiative-card cv-reveal"><span>Strategic communications</span><h3>SENZ Strategic Communications &amp; Digital Solutions</h3><p>Branding, public relations, digital strategy, content systems, perception management and communications work designed to make organizations clearer, sharper and harder to ignore.</p></article>'+
        '<article class="initiative-card cv-reveal"><span>Media &amp; information</span><h3>FMB News · Filipino Media Bulletin</h3><p>An independent news and information platform built around verified facts, visible sources, context and clear explanations of what happened, why it matters and what to watch next.</p></article>'+
        '<article class="initiative-card cv-reveal"><span>Education</span><h3>The Cognita Institute of Artificial Intelligence</h3><p>An AI education initiative focused on structured learning, practical competence and accessible pathways for learners preparing to use artificial intelligence responsibly and effectively.</p></article>'+
        '<article class="initiative-card cv-reveal"><span>Community platform</span><h3>Masinloc Connect</h3><p>A community-centered digital platform connecting local identity with opportunity, discovery, public information, culture, language preservation and useful digital services.</p></article>'+
        '<article class="initiative-card cv-reveal"><span>Language &amp; culture</span><h3>MANAMBALI</h3><p>A game-based Sambal language-learning direction that uses word activities and cultural context to make language preservation active, repeatable and engaging.</p></article>'+
        '<article class="initiative-card cv-reveal"><span>Research &amp; publishing</span><h3>MABAYANI</h3><p>A local-history and cultural research project built around evidence, attribution, visible uncertainty and the principle that historical storytelling must remain open to correction.</p></article>'+
      '</div>');
    work.parentNode.insertBefore(initiatives,work);
  }

  var value=document.getElementById('value');
  if(value && value.parentNode){
    var cultural=section('cultural-work','Culture, community & public value','Creative work becomes stronger when it understands the people, place and memory it represents.',
      '<div class="cultural-grid">'+
        '<div class="cultural-lead cv-reveal"><p>I work repeatedly with local identity, Tina Sambal language preservation, Philippine cultural storytelling, tourism and place branding, community development and public-facing information.</p><p>The goal is not to turn culture into decoration. It is to make heritage understandable, usable, visible and responsibly represented in contemporary media and digital products.</p></div>'+
        '<div class="cultural-points cv-reveal"><div><strong>Language preservation</strong><span>Sambal vocabulary, learning systems and digital experiences.</span></div><div><strong>Place &amp; tourism storytelling</strong><span>Identity, destination perception and community representation.</span></div><div><strong>Community communication</strong><span>Practical information, outreach, service and public understanding.</span></div><div><strong>Evidence-aware history</strong><span>Clear separation of documentation, memory, interpretation and uncertainty.</span></div></div>'+
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
