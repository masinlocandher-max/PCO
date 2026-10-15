/* Francine Marie Bautista — presence chamber.
   Vanilla WebGL: depth portrait, light shafts, reactive gold dust,
   cinematic intro, magnetic CTAs. No CDN. Reduced-motion fallback. */
(function () {
  'use strict';

  var canvas = document.getElementById('expCanvas');
  var shell = document.getElementById('home-main');
  var hero = document.querySelector('.home-hero');
  var copy = document.querySelector('.home-hero-copy');
  var cursor = document.getElementById('expCursor');
  var introEl = document.getElementById('expIntro');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = window.matchMedia('(pointer: coarse)').matches;
  if (!canvas || !shell || !hero) return;

  var portraitSrc = canvas.getAttribute('data-portrait') || 'assets/img/portrait-hero.webp';

  function bootFallback() {
    document.documentElement.classList.add('exp-fallback');
    document.documentElement.classList.remove('exp-live');
    if (cursor) cursor.hidden = true;
    if (introEl) {
      introEl.classList.add('is-done');
      window.setTimeout(function () { introEl.hidden = true; }, 600);
    }
    document.documentElement.classList.add('exp-entered');
    revealChapters();
  }

  var gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false
  });

  if (!gl || reduce) {
    bootFallback();
    return;
  }

  document.documentElement.classList.add('exp-live');

  var VERT = [
    'attribute vec2 a;',
    'varying vec2 v;',
    'void main(){ v=a*0.5+0.5; gl_Position=vec4(a,0.0,1.0); }'
  ].join('\n');

  var FRAG = [
    'precision highp float;',
    'varying vec2 v;',
    'uniform sampler2D uTex;',
    'uniform vec2 uRes;',
    'uniform vec2 uPointer;',
    'uniform float uTime;',
    'uniform float uScroll;',
    'uniform float uIntro;',
    'uniform float uAspect;',
    'uniform float uTexAspect;',
    'uniform float uMobile;',
    'uniform float uClick;',

    'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
    'float noise(vec2 p){',
    '  vec2 i=floor(p); vec2 f=fract(p);',
    '  float a=hash(i); float b=hash(i+vec2(1.0,0.0));',
    '  float c=hash(i+vec2(0.0,1.0)); float d=hash(i+vec2(1.0,1.0));',
    '  vec2 u=f*f*(3.0-2.0*f);',
    '  return mix(a,b,u.x)+(c-a)*u.y*(1.0-u.x)+(d-b)*u.x*u.y;',
    '}',
    'float fbm(vec2 p){',
    '  float v=0.0; float a=0.5;',
    '  for(int i=0;i<5;i++){v+=a*noise(p); p=p*2.02+vec2(17.0,9.2); a*=0.5;}',
    '  return v;',
    '}',

    'void main(){',
    '  vec2 uv=v;',
    '  vec2 p=(uv-0.5)*vec2(uAspect,1.0);',
    '  vec2 ptr=(uPointer-0.5)*vec2(uAspect,1.0);',
    '  float t=uTime;',
    '  float intro=smoothstep(0.0,1.0,uIntro);',
    '  float scroll=clamp(uScroll,0.0,1.0);',
    '  float breathe=0.5+0.5*sin(t*0.7);',

    '  float n=fbm(p*1.2+vec2(t*0.028,-t*0.02));',
    '  float ribbons=fbm(p*2.1+vec2(-t*0.055,t*0.04)+n);',
    '  vec3 bg=mix(vec3(0.02,0.015,0.035),vec3(0.12,0.045,0.18),n*0.9);',
    '  bg+=vec3(0.62,0.38,0.16)*pow(ribbons,3.6)*0.22;',
    '  bg+=vec3(0.48,0.16,0.55)*pow(max(0.0,1.0-length(p*0.78)),2.8)*0.42;',
    '  bg+=vec3(0.9,0.7,0.35)*pow(max(0.0,1.0-length(p-ptr*0.4)),6.0)*0.08*breathe;',

    '  vec2 parallax=(uPointer-0.5)*vec2(0.06,-0.04)*(1.0-scroll*0.5);',
    '  float zoom=mix(1.1,1.22,scroll*0.4);',
    '  zoom*=mix(1.04,1.0,intro);',
    '  vec2 tuv=(uv-0.5+parallax)/zoom+0.5;',
    '  vec2 texUV=tuv;',
    '  if(uAspect>uTexAspect){ float h=uTexAspect/uAspect; texUV.y=(tuv.y-0.5)/h+0.5; }',
    '  else{ float w=uAspect/uTexAspect; texUV.x=(tuv.x-0.5)/w+0.5; }',
    '  texUV.y=texUV.y*0.9+0.03;',

    '  float preLum=dot(texture2D(uTex,clamp(texUV,0.0,1.0)).rgb,vec3(0.299,0.587,0.114));',
    '  float depth=(1.0-preLum)*0.028*(1.0-scroll);',
    '  texUV+=parallax*(0.55+depth*8.0);',
    '  texUV+=vec2(depth,-depth*0.5);',
    '  float warp=fbm(texUV*3.2+t*0.1)*0.012*(1.0-scroll);',
    '  texUV+=vec2(warp,-warp*0.7);',

    '  float inFrame=step(0.0,texUV.x)*step(texUV.x,1.0)*step(0.0,texUV.y)*step(texUV.y,1.0);',
    '  vec4 portrait=texture2D(uTex,clamp(texUV,0.0,1.0));',
    '  float lum=dot(portrait.rgb,vec3(0.299,0.587,0.114));',

    '  vec2 stageC=mix(vec2(0.60,0.40),vec2(0.50,0.36),uMobile);',
    '  vec2 stageUV=(uv-stageC)*mix(vec2(1.12,1.32),vec2(1.02,1.18),uMobile);',
    '  float stage=smoothstep(mix(0.95,1.12,uMobile),0.16,length(stageUV));',
    '  stage*=smoothstep(0.05,0.7,intro);',
    '  stage=mix(stage,min(1.0,stage*1.3),uMobile);',

    '  vec3 col=bg;',
    '  vec3 lit=portrait.rgb*vec3(1.08,1.0,1.1);',
    '  lit+=vec3(0.22,0.12,0.04)*pow(lum,1.8);',
    '  float rim=pow(max(0.0,1.0-abs(lum-0.4)*2.2),2.4);',
    '  float light=exp(-length(p-ptr)*2.2)*0.75;',
    '  light+=uClick*exp(-length(p-ptr)*1.2)*0.8;',
    '  lit+=vec3(0.85,0.62,0.28)*rim*(0.35+light);',
    '  lit+=vec3(0.55,0.35,0.7)*pow(1.0-lum,2.0)*0.12;',

    '  col=mix(col,lit,inFrame*stage*0.96);',
    '  col=mix(col,col*vec3(0.5,0.38,0.65),(1.0-stage)*0.22);',

    '  vec2 shaftOrigin=(stageC-0.5)*vec2(uAspect,1.0)+ptr*0.08;',
    '  vec2 toP=p-shaftOrigin;',
    '  float ang=atan(toP.y,toP.x);',
    '  float shafts=pow(max(0.0,sin(ang*7.0+t*0.4)),18.0);',
    '  shafts*=smoothstep(1.4,0.1,length(toP));',
    '  shafts*=(0.35+0.65*stage)*intro*(1.0-scroll*0.6);',
    '  col+=vec3(0.95,0.75,0.4)*shafts*0.14;',

    '  float dust=0.0;',
    '  for(int i=0;i<8;i++){',
    '    float fi=float(i);',
    '    vec2 drift=ptr*0.15*(0.4+fi*0.08);',
    '    vec2 cell=p*mix(2.6,8.5,fi/8.0)+vec2(fi*1.9,fi*2.7)+vec2(t*(0.05+fi*0.012),-t*0.035)-drift;',
    '    vec2 id=floor(cell);',
    '    vec2 f=fract(cell)-0.5;',
    '    float h=hash(id+fi*17.3);',
    '    vec2 off=vec2(h,hash(id+3.7))-0.5;',
    '    float d=length(f-off*0.6);',
    '    float spark=smoothstep(0.05,0.0,d)*smoothstep(0.15,0.95,h);',
    '    dust+=spark*(0.4+0.6*h);',
    '  }',
    '  col+=vec3(0.92,0.74,0.38)*dust*(0.14+0.28*light)*(1.0-scroll*0.3);',

    '  float vig=smoothstep(1.35,0.22,length(p*0.92));',
    '  col*=mix(0.48,1.0,vig);',
    '  col+=(hash(uv*uRes+floor(t*24.0))-0.5)*0.04;',
    '  float bloom=smoothstep(0.0,0.35,intro)*smoothstep(1.0,0.55,intro);',
    '  col+=vec3(0.7,0.45,0.25)*bloom*0.18;',
    '  col*=mix(0.0,1.0,smoothstep(0.0,0.9,intro));',
    '  col=mix(col,col*0.68+vec3(0.035,0.015,0.05),scroll*0.6);',
    '  col=pow(max(col,0.0),vec3(0.95));',

    '  gl_FragColor=vec4(col,1.0);',
    '}'
  ].join('\n');

  function compile(type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.warn('[exp]', gl.getShaderInfoLog(sh));
      return null;
    }
    return sh;
  }

  var vs = compile(gl.VERTEX_SHADER, VERT);
  var fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) {
    bootFallback();
    return;
  }

  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    bootFallback();
    return;
  }

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  var locA = gl.getAttribLocation(prog, 'a');
  var u = {
    tex: gl.getUniformLocation(prog, 'uTex'),
    res: gl.getUniformLocation(prog, 'uRes'),
    pointer: gl.getUniformLocation(prog, 'uPointer'),
    time: gl.getUniformLocation(prog, 'uTime'),
    scroll: gl.getUniformLocation(prog, 'uScroll'),
    intro: gl.getUniformLocation(prog, 'uIntro'),
    aspect: gl.getUniformLocation(prog, 'uAspect'),
    texAspect: gl.getUniformLocation(prog, 'uTexAspect'),
    mobile: gl.getUniformLocation(prog, 'uMobile'),
    click: gl.getUniformLocation(prog, 'uClick')
  };

  var tex = gl.createTexture();
  var texAspect = 922 / 1152;
  var ready = false;
  var img = new Image();
  img.decoding = 'async';
  img.onload = function () {
    texAspect = img.naturalWidth / Math.max(1, img.naturalHeight);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    ready = true;
    document.documentElement.classList.add('exp-ready');
  };
  img.onerror = bootFallback;
  img.src = portraitSrc;

  var pointer = { x: 0.62, y: 0.42, tx: 0.62, ty: 0.42 };
  var scroll = 0;
  var intro = 0;
  var clickPulse = 0;
  var start = performance.now();
  var dprCap = coarse ? 1.25 : 1.85;

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, dprCap);
    var w = Math.max(1, Math.floor(window.innerWidth * dpr));
    var h = Math.max(1, Math.floor(window.innerHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    gl.viewport(0, 0, w, h);
  }

  function onPointer(e) {
    pointer.tx = e.clientX / Math.max(1, window.innerWidth);
    pointer.ty = e.clientY / Math.max(1, window.innerHeight);
    if (cursor && !coarse) {
      cursor.style.transform = 'translate3d(' + e.clientX + 'px,' + e.clientY + 'px,0)';
      cursor.classList.add('is-on');
    }
  }

  function onScroll() {
    if (!document.body.classList.contains('route-locked')) return;
    var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    scroll = Math.min(1, Math.max(0, window.scrollY / max));
    document.documentElement.style.setProperty('--exp-scroll', String(scroll));
    if (copy) {
      copy.style.setProperty('--exp-lift', (scroll * 40).toFixed(2) + 'px');
      copy.style.setProperty('--exp-fade', (1 - Math.min(1, scroll * 1.45)).toFixed(3));
    }
  }

  window.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener(
    'pointerdown',
    function (e) {
      if (!document.body.classList.contains('route-locked')) return;
      clickPulse = 1;
      pointer.tx = e.clientX / Math.max(1, window.innerWidth);
      pointer.ty = e.clientY / Math.max(1, window.innerHeight);
      if (cursor) cursor.classList.add('is-down');
    },
    { passive: true }
  );
  window.addEventListener(
    'pointerup',
    function () {
      if (cursor) cursor.classList.remove('is-down');
    },
    { passive: true }
  );

  var name = document.getElementById('routeTitle');
  function tiltName() {
    if (!name || coarse || reduce) return;
    var rx = (pointer.y - 0.5) * -6;
    var ry = (pointer.x - 0.5) * 9;
    name.style.transform =
      'perspective(1000px) rotateX(' +
      rx.toFixed(2) +
      'deg) rotateY(' +
      ry.toFixed(2) +
      'deg) translateZ(12px)';
  }

  function frame(now) {
    if (!document.body.classList.contains('route-locked')) {
      requestAnimationFrame(frame);
      return;
    }
    resize();
    var t = (now - start) / 1000;
    intro = Math.min(1, (now - start) / 2400);
    pointer.x += (pointer.tx - pointer.x) * 0.07;
    pointer.y += (pointer.ty - pointer.y) * 0.07;
    clickPulse *= 0.92;
    tiltName();
    magnetButtons();

    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(locA);
    gl.vertexAttribPointer(locA, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(u.tex, 0);
    gl.uniform2f(u.res, canvas.width, canvas.height);
    gl.uniform2f(u.pointer, pointer.x, 1.0 - pointer.y);
    gl.uniform1f(u.time, t);
    gl.uniform1f(u.scroll, scroll);
    gl.uniform1f(u.intro, ready ? intro : intro * 0.3);
    gl.uniform1f(u.aspect, canvas.width / Math.max(1, canvas.height));
    gl.uniform1f(u.texAspect, texAspect);
    gl.uniform1f(u.mobile, window.innerWidth < 760 ? 1.0 : 0.0);
    gl.uniform1f(u.click, clickPulse);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    requestAnimationFrame(frame);
  }

  function splitName() {
    if (!name || name.dataset.split === '1') return;
    var parts = name.innerHTML.split(/<br\s*\/?>/i);
    name.textContent = '';
    parts.forEach(function (line, li) {
      var lineEl = document.createElement('span');
      lineEl.className = 'exp-line';
      Array.from(line.replace(/&nbsp;/g, ' ')).forEach(function (ch, i) {
        var s = document.createElement('span');
        s.className = 'exp-ch';
        s.textContent = ch === ' ' ? '\u00A0' : ch;
        s.style.setProperty('--i', String(i + li * 14));
        lineEl.appendChild(s);
      });
      name.appendChild(lineEl);
      if (li < parts.length - 1) name.appendChild(document.createElement('br'));
    });
    name.dataset.split = '1';
  }

  // Magnetic CTAs — buttons lean toward the pointer
  var magnets = [];
  function collectMagnets() {
    magnets = Array.prototype.slice.call(
      shell.querySelectorAll('.home-btn, .home-slot, .home-nav-cv')
    );
  }
  function magnetButtons() {
    if (coarse || reduce || !magnets.length) return;
    var mx = pointer.x * window.innerWidth;
    var my = pointer.y * window.innerHeight;
    magnets.forEach(function (btn) {
      var r = btn.getBoundingClientRect();
      var cx = r.left + r.width / 2;
      var cy = r.top + r.height / 2;
      var dx = mx - cx;
      var dy = my - cy;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var radius = 140;
      if (dist < radius) {
        var force = (1 - dist / radius) * 10;
        btn.style.transform =
          'translate3d(' + (dx / dist) * force + 'px,' + (dy / dist) * force + 'px,0) scale(1.03)';
        if (cursor) cursor.classList.add('is-hot');
      } else {
        btn.style.transform = '';
      }
    });
    if (cursor && magnets.every(function (btn) {
      var r = btn.getBoundingClientRect();
      var cx = r.left + r.width / 2;
      var cy = r.top + r.height / 2;
      return Math.hypot(mx - cx, my - cy) >= 140;
    })) {
      cursor.classList.remove('is-hot');
    }
  }

  function revealChapters() {
    var chapters = shell.querySelectorAll('.home-section, .home-moment');
    if ('IntersectionObserver' in window && chapters.length && !reduce) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-in');
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.14, rootMargin: '0px 0px -6% 0px' }
      );
      Array.prototype.forEach.call(chapters, function (el) {
        if (el.classList.contains('home-section')) el.classList.add('exp-chapter');
        io.observe(el);
      });
    } else {
      Array.prototype.forEach.call(chapters, function (el) {
        el.classList.add('is-in');
      });
    }
  }

  // Cinematic intro veil — short ceremonial beat, then clear the stage
  function finishIntro() {
    if (introEl) {
      introEl.classList.add('is-done');
      introEl.setAttribute('hidden', '');
      introEl.hidden = true;
    }
    document.documentElement.classList.add('exp-entered');
  }
  function runIntro() {
    document.documentElement.classList.add('exp-booting');
    if (!introEl || reduce || coarse) {
      // Mobile / reduced-motion: skip the veil so the portrait lands immediately
      finishIntro();
      return;
    }
    introEl.hidden = false;
    introEl.removeAttribute('hidden');
    requestAnimationFrame(function () {
      introEl.classList.add('is-play');
    });
    window.setTimeout(finishIntro, 2000);
  }

  // Dramatic transition when leaving for CV
  var leaveFx = document.getElementById('expLeave');
  function bindCvExit() {
    ['routeCv', 'routeCvNav', 'routeCvSecondary'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener(
        'click',
        function () {
          if (!leaveFx || reduce) return;
          leaveFx.hidden = false;
          requestAnimationFrame(function () {
            leaveFx.classList.add('is-on');
          });
        },
        true
      );
    });
  }

  splitName();
  collectMagnets();
  resize();
  onScroll();
  revealChapters();
  bindCvExit();
  runIntro();
  requestAnimationFrame(frame);

  var obs = new MutationObserver(function () {
    if (!document.body.classList.contains('route-locked')) {
      if (cursor) cursor.classList.remove('is-on', 'is-hot', 'is-down');
    } else {
      onScroll();
      if (leaveFx) {
        leaveFx.classList.remove('is-on');
        leaveFx.hidden = true;
      }
    }
  });
  obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
})();
