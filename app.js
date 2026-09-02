/* Francine Marie Bautista — portfolio interactions.
   No framework, no CDN. All motion runs off one requestAnimationFrame loop:
   entrance reveals are swept by position, and the pinned sequences are driven
   by scroll progress. Sound and motion preferences are independent. */

(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduced = reduce.matches;
  var SOUND_KEY = 'fmb-sound-preference';

  /* ---------------------------------------------------------------- utils */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  function recall(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  var locks = 0;
  function lock() { locks += 1; document.body.classList.add('is-gated'); }
  function unlock() { locks = Math.max(0, locks - 1); if (!locks) document.body.classList.remove('is-gated'); }

  /* backdrop + grain layers are decorative, so they are created here rather
     than sitting in the markup as empty divs */
  ['backdrop', 'grain'].forEach(function (cls) {
    var el = document.createElement('div');
    el.className = cls;
    el.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(el, document.body.firstChild);
  });
  var backdrop = document.querySelector('.backdrop');
  var CHAPTER_COLOR = {
    'near-black': '#08060b',
    'deep-violet': '#190a2b',
    'rich-plum': '#34123b'
  };

  /* ============================================================== SOUND */
  var audio = document.getElementById('score');
  var soundBtn = document.getElementById('soundToggle');
  var soundLabel = document.getElementById('soundLabel');
  var fadeRAF = null;

  function paintSound(on) {
    if (!soundBtn) return;
    soundBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    soundBtn.setAttribute('aria-label', on ? 'Turn sound off' : 'Turn sound on');
    if (soundLabel) soundLabel.textContent = on ? 'Sound on' : 'Sound';
  }

  function fadeTo(target, ms, done) {
    if (!audio) return;
    if (fadeRAF) cancelAnimationFrame(fadeRAF);
    var from = audio.volume, start = performance.now();
    (function step(now) {
      var p = clamp((now - start) / ms, 0, 1);
      audio.volume = clamp(from + (target - from) * p, 0, 1);
      if (p < 1) fadeRAF = requestAnimationFrame(step);
      else { fadeRAF = null; if (done) done(); }
    })(start);
  }

  /* Playback is only ever started from inside a user gesture, which is what
     Safari/iOS autoplay policy requires. Position is never reset on mute, so
     enabling sound later continues rather than restarting the piece. */
  function soundOn(fromGesture) {
    if (!audio) return;
    audio.volume = 0;
    var attempt = audio.play();
    if (attempt && typeof attempt.then === 'function') {
      attempt.then(function () {
        paintSound(true);
        store(SOUND_KEY, 'on');
        fadeTo(1, 900);
      }).catch(function () {
        /* a returning visitor's stored preference cannot override autoplay
           policy — keep the control usable instead of throwing */
        paintSound(false);
        if (fromGesture) store(SOUND_KEY, 'off');
      });
    } else {
      paintSound(true);
      fadeTo(1, 900);
    }
  }

  function soundOff() {
    if (!audio) return;
    store(SOUND_KEY, 'off');
    paintSound(false);
    fadeTo(0, 420, function () { audio.pause(); });
  }

  if (soundBtn && audio) {
    soundBtn.hidden = false;
    paintSound(false);
    soundBtn.addEventListener('click', function () {
      if (audio.paused) soundOn(true); else soundOff();
    });
    audio.addEventListener('pause', function () { if (audio.volume === 0) paintSound(false); });
  }

  /* =============================================================== GATE */
  var gate = document.getElementById('gate');
  var gateSound = document.getElementById('gateSound');
  var gateSilent = document.getElementById('gateSilent');

  function closeGate() {
    if (!gate) return;
    gate.classList.add('is-closing');
    unlock();
    window.setTimeout(function () {
      if (gate && gate.parentNode) gate.parentNode.removeChild(gate);
      measure();
      onScroll();
    }, 950);
  }

  if (gate) {
    var pref = recall(SOUND_KEY);
    if (pref) {
      /* a clear preference already exists — do not ask again */
      if (gate.parentNode) gate.parentNode.removeChild(gate);
      document.body.classList.remove('is-gated');
      if (pref === 'on') soundOn(false);
    } else {
      lock();
      if (gateSound) {
        gateSound.focus();
        gateSound.addEventListener('click', function () { soundOn(true); closeGate(); });
      }
      if (gateSilent) {
        gateSilent.addEventListener('click', function () { store(SOUND_KEY, 'off'); closeGate(); });
      }
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && gate && gate.parentNode) { store(SOUND_KEY, 'off'); closeGate(); }
      });
    }
  } else {
    document.body.classList.remove('is-gated');
  }

  /* ========================================================== ENTRANCES */
  var entrances = Array.prototype.slice.call(
    document.querySelectorAll('[data-mask],[data-mask-text],[data-fade],[data-line],[data-step]'));
  var pending = entrances.slice();

  /* Entrances are swept from the scroll loop rather than driven by
     IntersectionObserver. A fast flick or a smooth-scrolled anchor jump can
     carry an element past the viewport between observer callbacks, and an
     element that is never reported as intersecting would stay clipped or at
     zero opacity forever — content silently lost. Sweeping by position
     cannot skip: anything at or above the trigger line is revealed, whether
     it entered gradually or was jumped over. */
  function revealAll() {
    pending.forEach(function (el) { el.classList.add('in'); });
    pending.length = 0;
  }

  function sweep() {
    if (!pending.length) return;
    for (var i = pending.length - 1; i >= 0; i--) {
      var el = pending[i];
      if (el.getBoundingClientRect().top >= vh * 0.9) continue;
      /* stagger siblings so a row of images does not arrive as one block */
      var sibs = el.parentNode ? Array.prototype.filter.call(el.parentNode.children, function (n) {
        return entrances.indexOf(n) !== -1;
      }) : [];
      var idx = sibs.indexOf(el);
      el.style.transitionDelay = (idx > 0 ? Math.min(idx, 6) * 0.08 : 0) + 's';
      el.classList.add('in');
      pending.splice(i, 1);
    }
  }

  /* ===================================================== SCROLL-LINKED */
  var progressBar = document.getElementById('progressBar');
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.topbar nav a'));
  var navTargets = navLinks.map(function (a) { return document.querySelector(a.getAttribute('href')); });
  var chapters = Array.prototype.slice.call(document.querySelectorAll('[data-chapter]'));
  var parallax = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
  var timeline = document.querySelector('[data-timeline]');
  var steps = timeline ? Array.prototype.slice.call(timeline.querySelectorAll('li')) : [];
  var identity = document.querySelector('.identity');
  var idStage = document.querySelector('[data-identity]');
  var idWords = Array.prototype.slice.call(document.querySelectorAll('[data-id-word]'));
  var journey = document.querySelector('.journey');
  var journeyFrame = document.querySelector('[data-cinema]');
  var journeyCopy = document.querySelector('.journey-copy');
  var cinema = document.querySelector('[data-scale]');

  var vh = window.innerHeight;
  function measure() { vh = window.innerHeight; }

  /* progress of an element through the viewport, 0 before, 1 after */
  function through(rect) {
    return clamp((vh - rect.top) / (vh + rect.height), 0, 1);
  }
  /* progress of a tall pinned section, 0 at pin start, 1 at pin end */
  function pinned(rect) {
    return clamp(-rect.top / Math.max(1, rect.height - vh), 0, 1);
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var doc = document.documentElement;

      if (reduced) revealAll(); else sweep();

      var max = doc.scrollHeight - vh;
      if (progressBar) progressBar.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + '%';

      /* active chapter drives both the nav and the backdrop colour */
      var mid = vh / 2, activeColor = null;
      for (var c = 0; c < chapters.length; c++) {
        var cr = chapters[c].getBoundingClientRect();
        if (cr.top <= mid && cr.bottom >= mid) { activeColor = chapters[c].getAttribute('data-chapter'); break; }
      }
      if (backdrop && activeColor && CHAPTER_COLOR[activeColor]) {
        backdrop.style.backgroundColor = CHAPTER_COLOR[activeColor];
      }
      var current = '';
      navTargets.forEach(function (sec, i) {
        if (sec && sec.getBoundingClientRect().top <= vh * 0.42) current = navLinks[i].getAttribute('href');
      });
      navLinks.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === current); });

      if (reduced) return;

      /* parallax — controlled displacement, never more than a few percent */
      parallax.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var f = parseFloat(el.getAttribute('data-parallax')) || 0;
        el.style.transform = 'translate3d(0,' + (((through(r) - 0.5) * -2) * (r.height * f)).toFixed(2) + 'px,0)';
      });

      /* timeline draws as the credentials are read */
      if (timeline) {
        var tr = timeline.getBoundingClientRect();
        var tp = clamp((vh * 0.72 - tr.top) / Math.max(1, tr.height * 0.86), 0, 1);
        timeline.style.setProperty('--draw', tp.toFixed(3));
        steps.forEach(function (li, i) {
          li.classList.toggle('lit', tp >= (i + 0.35) / steps.length);
        });
      }

      /* cinematic scale — editorial crop opening to full bleed */
      if (cinema) {
        var kr = cinema.getBoundingClientRect();
        if (kr.bottom > -300 && kr.top < vh + 300) {
          cinema.style.setProperty('--cin', (0.86 + 0.14 * clamp(through(kr) * 1.5, 0, 1)).toFixed(3));
        }
      }

      /* identity sequence: EDUCATION → SERVICE → TALENT → the name */
      if (identity && idWords.length) {
        var ir = identity.getBoundingClientRect();
        if (ir.bottom > 0 && ir.top < vh) {
          var p = pinned(ir), n = idWords.length, band = 1 / n;
          idWords.forEach(function (w, i) {
            var local = (p - i * band) / band;              /* -inf .. +inf */
            var vis = clamp(1 - Math.abs(local - 0.5) * 2.1, 0, 1);
            var depth = (local - 0.5) * -300;
            var rot = (local - 0.5) * -26;
            w.style.opacity = vis.toFixed(3);
            w.style.transform = 'translateY(-50%) translateZ(' + depth.toFixed(1) + 'px) rotateX(' + rot.toFixed(2) + 'deg)';
          });
          if (idStage) idStage.style.setProperty('--idline', clamp((p - 0.72) / 0.2, 0, 1).toFixed(3));
        }
      }

      /* continuing journey: editorial frame grows to immersive full screen */
      if (journey && journeyFrame) {
        var jr = journey.getBoundingClientRect();
        if (jr.bottom > 0 && jr.top < vh) {
          var jp = pinned(jr);
          var grow = clamp(jp / 0.62, 0, 1);
          journeyFrame.style.setProperty('--jw', (58 + 42 * grow).toFixed(2) + '%');
          journeyFrame.style.setProperty('--jh', (62 + 38 * grow).toFixed(2) + '%');
          journeyFrame.style.setProperty('--jp', grow.toFixed(3));
          if (journeyCopy) journeyCopy.style.setProperty('--jc', clamp((jp - 0.5) / 0.22, 0, 1).toFixed(3));
        }
      }
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { measure(); onScroll(); }, { passive: true });
  if (reduce.addEventListener) {
    reduce.addEventListener('change', function (e) {
      reduced = e.matches;
      if (reduced) revealAll();
      onScroll();
    });
  }
  measure();
  onScroll();

  /* ============================================================= VIEWER */
  var viewer = document.getElementById('viewer');
  var vImg = document.getElementById('viewerImage');
  var vCap = document.getElementById('viewerCaption');
  var vClose = document.getElementById('viewerClose');
  var lastFocused = null;

  function openViewer(src, caption, alt) {
    if (!viewer || !vImg || !src) return;
    vImg.src = src;
    vImg.alt = alt || caption || '';
    if (vCap) vCap.textContent = caption || '';
    viewer.classList.add('is-open');
    viewer.setAttribute('aria-hidden', 'false');
    lock();
    if (vClose) vClose.focus();
  }
  function closeViewer() {
    if (!viewer || !viewer.classList.contains('is-open')) return;
    viewer.classList.remove('is-open');
    viewer.setAttribute('aria-hidden', 'true');
    if (vImg) vImg.removeAttribute('src');
    unlock();
    if (lastFocused) { lastFocused.focus(); lastFocused = null; }
  }

  Array.prototype.forEach.call(document.querySelectorAll('.plate'), function (plate) {
    plate.addEventListener('click', function () {
      var img = plate.querySelector('img');
      lastFocused = plate;
      openViewer(plate.getAttribute('data-full'), plate.getAttribute('data-caption'), img ? img.alt : '');
    });
  });
  if (vClose) vClose.addEventListener('click', closeViewer);
  if (viewer) {
    viewer.addEventListener('click', function (e) {
      if (e.target === viewer || e.target.classList.contains('viewer-stage')) closeViewer();
    });
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeViewer(); });
})();
