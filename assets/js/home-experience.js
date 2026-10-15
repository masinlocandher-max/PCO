/* Francine Marie Bautista — immersive home presence field.
   Vanilla WebGL: portrait depth plane + gold particle dust + pointer light.
   No CDN. Graceful fallback when WebGL / reduced-motion. */
(function () {
  'use strict';

  var canvas = document.getElementById('expCanvas');
  var shell = document.getElementById('home-main');
  var hero = document.querySelector('.home-hero');
  var copy = document.querySelector('.home-hero-copy');
  var cursor = document.getElementById('expCursor');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = window.matchMedia('(pointer: coarse)').matches;
  if (!canvas || !shell || !hero) return;

  var portraitSrc = canvas.getAttribute('data-portrait') || 'assets/img/portrait-hero.webp';
  var gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false
  });

  if (!gl || reduce) {
    document.documentElement.classList.add('exp-fallback');
    bootFallback();
    return;
  }

  document.documentElement.classList.add('exp-live');

  var VERT = [
    'attribute vec2 a;',
    'varying vec2 v;',
    'void main(){',
    '  v=a*0.5+0.5;',
    '  gl_Position=vec4(a,0.0,1.0);',
    '}'
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
    '  for(int i=0;i<5;i++){v+=a*noise(p); p=p*2.05+vec2(1.7,9.2); a*=0.5;}',
    '  return v;',
    '}',

    'void main(){',
    '  vec2 uv=v;',
    '  vec2 p=(uv-0.5)*vec2(uAspect,1.0);',
    '  vec2 ptr=(uPointer-0.5)*vec2(uAspect,1.0);',
    '  float t=uTime;',
    '  float intro=smoothstep(0.0,1.0,uIntro);',
    '  float scroll=clamp(uScroll,0.0,1.0);',

    '  // Living atmosphere',
    '  float n=fbm(p*1.35+vec2(t*0.03,-t*0.02));',
    '  float ribbons=fbm(p*2.4+vec2(-t*0.05,t*0.04)+n*0.8);',
    '  vec3 bg=mix(vec3(0.031,0.024,0.043),vec3(0.10,0.04,0.16),n*0.85);',
    '  bg+=vec3(0.55,0.35,0.18)*pow(ribbons,3.2)*0.18;',
    '  bg+=vec3(0.42,0.18,0.48)*pow(1.0-length(p*0.85),2.4)*0.35;',

    '  vec2 parallax=(uPointer-0.5)*vec2(0.045,-0.03)*(1.0-scroll*0.55);',
    '  float zoom=mix(1.08,1.18,scroll*0.35);',
    '  vec2 tuv=(uv-0.5+parallax)/zoom+0.5;',
    '  vec2 texUV=tuv;',
    '  if(uAspect>uTexAspect){',
    '    float h=uTexAspect/uAspect;',
    '    texUV.y=(tuv.y-0.5)/h+0.5;',
    '  }else{',
    '    float w=uAspect/uTexAspect;',
    '    texUV.x=(tuv.x-0.5)/w+0.5;',
    '  }',
    '  texUV.y=texUV.y*0.92+0.02;',
    '  float warp=fbm(texUV*3.0+t*0.08)*0.008*(1.0-scroll);',
    '  texUV+=vec2(warp,-warp*0.6)+parallax*0.35;',

    '  float inFrame=step(0.0,texUV.x)*step(texUV.x,1.0)*step(0.0,texUV.y)*step(texUV.y,1.0);',
    '  vec4 portrait=texture2D(uTex,clamp(texUV,0.0,1.0));',
    '  float lum=dot(portrait.rgb,vec3(0.299,0.587,0.114));',

    '  vec2 stageC=mix(vec2(0.58,0.42),vec2(0.50,0.38),uMobile);',
    '  vec2 stageUV=(uv-stageC)*mix(vec2(1.15,1.35),vec2(1.05,1.2),uMobile);',
    '  float stage=smoothstep(mix(0.92,1.05,uMobile),0.18,length(stageUV));',
    '  stage*=smoothstep(0.0,0.55,intro);',
    '  stage=mix(stage,min(1.0,stage*1.25),uMobile);',

    '  vec3 col=bg;',
    '  vec3 litPortrait=portrait.rgb*vec3(1.05,0.98,1.08);',
    '  litPortrait+=vec3(0.18,0.10,0.04)*pow(lum,2.2);',
    '  float rim=pow(max(0.0,1.0-abs(lum-0.42)*2.4),2.0);',
    '  float light=exp(-length(p-ptr)*2.8)*0.55;',
    '  litPortrait+=vec3(0.72,0.52,0.22)*rim*light;',

    '  col=mix(col,litPortrait,inFrame*stage*0.92);',
    '  col=mix(col,col*vec3(0.55,0.42,0.7),(1.0-stage)*0.18);',

    '  float dust=0.0;',
    '  for(int i=0;i<6;i++){',
    '    float fi=float(i);',
    '    vec2 cell=p*mix(3.0,7.0,fi/6.0)+vec2(fi*1.7,fi*2.3)+vec2(t*(0.04+fi*0.01),-t*0.03);',
    '    vec2 id=floor(cell);',
    '    vec2 f=fract(cell)-0.5;',
    '    float h=hash(id+fi*13.1);',
    '    vec2 off=vec2(h,hash(id+9.1))-0.5;',
    '    float d=length(f-off*0.55);',
    '    dust+=smoothstep(0.045,0.0,d)*smoothstep(0.2,0.9,h)*(0.35+0.65*h);',
    '  }',
    '  col+=vec3(0.86,0.68,0.32)*dust*(0.12+0.18*light)*(1.0-scroll*0.35);',

    '  float vig=smoothstep(1.25,0.25,length(p*0.95));',
    '  col*=mix(0.55,1.0,vig);',
    '  col+=(hash(uv*uRes+t)-0.5)*0.035;',
    '  col*=mix(0.0,1.0,smoothstep(0.0,0.85,intro));',
    '  col=mix(col,col*0.72+vec3(0.04,0.02,0.06),scroll*0.55);',

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
    document.documentElement.classList.add('exp-fallback');
    document.documentElement.classList.remove('exp-live');
    bootFallback();
    return;
  }

  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    document.documentElement.classList.add('exp-fallback');
    document.documentElement.classList.remove('exp-live');
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
    mobile: gl.getUniformLocation(prog, 'uMobile')
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
  img.onerror = function () {
    document.documentElement.classList.add('exp-fallback');
    document.documentElement.classList.remove('exp-live');
    bootFallback();
  };
  img.src = portraitSrc;

  var pointer = { x: 0.62, y: 0.42, tx: 0.62, ty: 0.42 };
  var scroll = 0;
  var intro = 0;
  var start = performance.now();
  var running = true;
  var dprCap = coarse ? 1.25 : 1.75;

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
    var x = e.clientX / Math.max(1, window.innerWidth);
    var y = e.clientY / Math.max(1, window.innerHeight);
    pointer.tx = x;
    pointer.ty = y;
    if (cursor && !coarse) {
      cursor.style.transform = 'translate3d(' + e.clientX + 'px,' + e.clientY + 'px,0)';
      cursor.classList.add('is-on');
    }
  }

  function onScroll() {
    if (!document.body.classList.contains('route-locked')) return;
    var max = Math.max(1, shell.scrollHeight - window.innerHeight);
    scroll = Math.min(1, Math.max(0, window.scrollY / max));
    document.documentElement.style.setProperty('--exp-scroll', String(scroll));
    if (copy) {
      var lift = scroll * 28;
      var fade = 1 - Math.min(1, scroll * 1.6);
      copy.style.setProperty('--exp-lift', lift.toFixed(2) + 'px');
      copy.style.setProperty('--exp-fade', fade.toFixed(3));
    }
  }

  window.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', resize, { passive: true });

  // 3D name tilt
  var name = document.getElementById('routeTitle');
  function tiltName() {
    if (!name || coarse || reduce) return;
    var rx = (pointer.y - 0.5) * -5;
    var ry = (pointer.x - 0.5) * 7;
    name.style.transform =
      'perspective(900px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) translateZ(0)';
  }

  function frame(now) {
    if (!running) return;
    if (!document.body.classList.contains('route-locked')) {
      requestAnimationFrame(frame);
      return;
    }
    resize();
    var t = (now - start) / 1000;
    intro = Math.min(1, (now - start) / 1800);
    pointer.x += (pointer.tx - pointer.x) * 0.06;
    pointer.y += (pointer.ty - pointer.y) * 0.06;
    tiltName();

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
    gl.uniform1f(u.intro, ready ? intro : intro * 0.35);
    gl.uniform1f(u.aspect, canvas.width / Math.max(1, canvas.height));
    gl.uniform1f(u.texAspect, texAspect);
    gl.uniform1f(u.mobile, window.innerWidth < 760 ? 1.0 : 0.0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    requestAnimationFrame(frame);
  }

  // Split brand name into characters for staggered rise
  function splitName() {
    if (!name || name.dataset.split === '1') return;
    var html = name.innerHTML;
    var parts = html.split(/<br\s*\/?>/i);
    name.textContent = '';
    parts.forEach(function (line, li) {
      var lineEl = document.createElement('span');
      lineEl.className = 'exp-line';
      var chars = Array.from(line.replace(/&nbsp;/g, ' '));
      chars.forEach(function (ch, i) {
        var s = document.createElement('span');
        s.className = 'exp-ch';
        s.textContent = ch === ' ' ? '\u00A0' : ch;
        s.style.setProperty('--i', String(i + li * 12));
        lineEl.appendChild(s);
      });
      name.appendChild(lineEl);
      if (li < parts.length - 1) name.appendChild(document.createElement('br'));
    });
    name.dataset.split = '1';
  }

  function bootFallback() {
    document.documentElement.classList.add('exp-fallback');
    if (cursor) cursor.hidden = true;
  }

  splitName();
  resize();
  onScroll();
  requestAnimationFrame(frame);

  // Pause WebGL when leaving home for CV
  var obs = new MutationObserver(function () {
    if (!document.body.classList.contains('route-locked')) {
      if (cursor) cursor.classList.remove('is-on');
    } else {
      onScroll();
    }
  });
  obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });

  // Scroll-reveal for home chapters — one purpose each, cinematic entrance
  var chapters = shell.querySelectorAll('.home-section');
  if ('IntersectionObserver' in window && chapters.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: '0px 0px -8% 0px' }
    );
    Array.prototype.forEach.call(chapters, function (el) {
      el.classList.add('exp-chapter');
      io.observe(el);
    });
  } else {
    Array.prototype.forEach.call(chapters, function (el) {
      el.classList.add('is-in');
    });
  }

  document.documentElement.classList.add('exp-booting');
  window.setTimeout(function () {
    document.documentElement.classList.add('exp-entered');
  }, 80);
})();
