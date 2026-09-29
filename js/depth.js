/* STAR'S TECH Bioscience — hero depth overlay + 스크롤 영상 로더, v5 (2026-09-28)
   히어로의 대체 화면(포스터 · 루프 영상 · 빛줄기 오버레이 · 포인터 시차)과, 그것을 대신할 스크롤 영상 번들(js/scene.bundle.js)을 부를지의 결정을 한 곳에서 한다.

   ① html.film(head 인라인 스크립트: 폭 ≥ 921px · reduced-motion 아님 · saveData 아님)이면 idle 시점에 번들을 주입한다.
      번들(src/scene/main.js)이 영상을 못 읽거나 이미 아래로 스크롤한 뒤에 도착하면 window.__heroFallback() 을 불러 여기의 boot() 로 돌아온다.
   ② 게이트를 통과하지 못하면(모바일 · 모션 끔 · 데이터 절약 등) 바로 boot():
      투명 WebGL 오버레이(우상 빛줄기 · 미세 입자, 가산 혼합) + 포인터 시차 + 루프 영상(assets/media/hero-loop*.mp4, 자체 호스팅, 재생되면 정지 렌더 위로 페이드인).
   외부 라이브러리 없음. WebGL 이 없거나 모션을 끄면 렌더 이미지만 남는다. */
(function () {
  'use strict';
  var canvas = document.getElementById('field');
  var art = document.querySelector('.hero-art-wrap');
  if (!canvas) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hero = canvas.parentNode;
  var booted = false;

  /* ---------- 스크롤 영상 게이트 — head 인라인 스크립트가 붙인 html.film 을 그대로 따른다(≥921px · 모션 켬 · 데이터 절약 아님) ---------- */
  var wantFilm = document.documentElement.classList.contains('film') && !!document.getElementById('heroFilm');

  if (wantFilm) {
    /* 영상 고르기(v11) — AV1 을 부드럽게 재생할 수 있으면(MediaCapabilities) AV1, 아니면 H.264. 물리 화소 폭 ≥2200 이면 AV1 1440p.
       고른 즉시 src 를 붙여 스트리밍을 시작한다(preload auto) — 번들을 기다리지 않는다. 번들은 window.__filmSrcReady 를 기다린다 */
    var filmEl = document.getElementById('heroFilm');
    var px = Math.max(screen.width || 0, window.innerWidth || 0) * (window.devicePixelRatio || 1);
    var portrait = window.innerWidth / Math.max(1, window.innerHeight) < 0.9;   /* 휴대폰 · 세로 태블릿 — 세로(9:16) 영상 */
    var av1 = portrait
      ? { src: filmEl.getAttribute('data-src-p-av1'), w: 1080, h: 1920, br: 1900000, codec: 'av01.0.08M.08' }
      : px >= 2200
        ? { src: filmEl.getAttribute('data-src-av1-hd'), w: 2560, h: 1440, br: 2800000, codec: 'av01.0.12M.08' }
        : { src: filmEl.getAttribute('data-src-av1'), w: 1920, h: 1080, br: 1900000, codec: 'av01.0.08M.08' };
    var h264 = portrait ? (filmEl.getAttribute('data-src-p') || filmEl.getAttribute('data-src')) : filmEl.getAttribute('data-src');
    if (portrait) document.documentElement.classList.add('film-p');
    var useSrc = function (src) { window.__filmSrc = src; filmEl.preload = 'auto'; filmEl.src = src; };
    /* 번들이 오기 전에 영상이 실패해도(404 · 디코드 불가) 바로 포스터 + 루프 영상으로 돌아간다 */
    filmEl.addEventListener('error', function () { if (window.__heroFallback) { var f = window.__heroFallback; window.__heroFallback = null; f('video-error-early'); } }, { once: true });
    if (/[?&]film=h264/.test(location.search)) av1.src = null;   /* 검증용: H.264 대체 경로 강제 */
    var byType = function () { useSrc(av1.src && filmEl.canPlayType('video/mp4; codecs="' + av1.codec + '"') ? av1.src : h264); };
    window.__filmSrcReady = new Promise(function (resolve) {
      try {
        if (av1.src && navigator.mediaCapabilities && navigator.mediaCapabilities.decodingInfo) {
          navigator.mediaCapabilities.decodingInfo({ type: 'file', video: { contentType: 'video/mp4; codecs="' + av1.codec + '"', width: av1.w, height: av1.h, bitrate: av1.br, framerate: 24 } })
            .then(function (r) { useSrc(r && r.supported && r.smooth ? av1.src : h264); resolve(); }, function () { byType(); resolve(); });
        } else { byType(); resolve(); }
      } catch (e) { byType(); resolve(); }
    });
    window.__heroFallback = function () { boot(); };
    var inject = function () {
      if (!window.__heroFallback) return;   /* 이미 대체 화면으로 돌아갔으면 번들을 부르지 않는다 */
      var s = document.createElement('script');
      s.src = 'js/scene.bundle.js?v=13a'; s.defer = true;   /* 번들을 다시 만들면 v 를 올린다 — 동적 주입 스크립트는 강력 새로고침에도 캐시가 남는다 */
      s.onerror = function () { if (window.__heroFallback) { var f = window.__heroFallback; window.__heroFallback = null; f(); } };
      document.body.appendChild(s);
    };
    if ('requestIdleCallback' in window) requestIdleCallback(inject, { timeout: 1500 }); else setTimeout(inject, 400);
  } else {
    boot();
  }

  function boot() {
    if (booted) return; booted = true;
    document.documentElement.classList.remove('film');
    var fv = document.getElementById('heroFilm'); if (fv && fv.getAttribute('src')) { fv.removeAttribute('src'); fv.load(); }
    var mx = 0, my = 0, tx = 0, ty = 0;

    /* ---------- 포인터 시차 (WebGL 과 무관하게 동작) ---------- */
    if (!reduce && art) {
      var hover = window.matchMedia && window.matchMedia('(hover:hover) and (pointer:fine)').matches;
      if (hover) {
        hero.addEventListener('pointermove', function (e) {
          var r = hero.getBoundingClientRect();
          tx = ((e.clientX - r.left) / r.width - 0.5) * 2; ty = (0.5 - (e.clientY - r.top) / r.height) * 2;
        }, { passive: true });
        hero.addEventListener('pointerleave', function () { tx = 0; ty = 0; }, { passive: true });
      }
    }

    /* ---------- 루프 영상 — 모션을 켠 환경에서만, 데이터 절약 모드는 제외. 좁은 화면은 저해상도 판 ---------- */
    var video = document.querySelector('.hero-video');
    if (video && !reduce && !(navigator.connection && navigator.connection.saveData)) {
      var narrow = window.matchMedia && window.matchMedia('(max-width:920px)').matches;
      var src = narrow ? (video.getAttribute('data-src-m') || video.getAttribute('data-src')) : video.getAttribute('data-src');
      if (src) {
        video.addEventListener('playing', function () { if (art) art.classList.add('is-video'); }, { once: true });
        video.addEventListener('error', function () { if (art) art.classList.remove('is-video'); }, { once: true });
        var startVideo = function () { video.src = src; video.load(); var p = video.play(); if (p && p.catch) p.catch(function () {}); };
        if ('requestIdleCallback' in window) requestIdleCallback(startVideo, { timeout: 1200 }); else setTimeout(startVideo, 300);
      }
    }

    var gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false, premultipliedAlpha: true, powerPreference: 'low-power' });
    var VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    var FS = [
      'precision highp float;',
      'uniform vec2 R;uniform float T;uniform vec2 M;',
      'float hash(float n){return fract(sin(n)*43758.5453);}',
      'float hash2(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}',
      'float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.0-2.0*f);',
      '  return mix(mix(hash2(i),hash2(i+vec2(1,0)),f.x),mix(hash2(i+vec2(0,1)),hash2(i+vec2(1,1)),f.x),f.y);}',
      'void main(){',
      '  vec2 uv=gl_FragCoord.xy/R;float ar=R.x/R.y;vec2 q=vec2(uv.x*ar,uv.y);',
      '  vec3 col=vec3(0.0);float a=0.0;',
      '  /* 빛줄기 — 우상 → 좌하, 세 줄, 천천히 흔들린다 */',
      '  vec2 d=normalize(vec2(-0.62,-0.78));vec2 nrm=vec2(-d.y,d.x);',
      '  vec2 o=vec2(0.86*ar,1.06);float along=dot(q-o,d);float across=dot(q-o,nrm);',
      '  float fade=smoothstep(1.7,0.0,along)*smoothstep(-0.05,0.35,along);',
      '  float shaft=0.0;',
      '  shaft+=smoothstep(0.17,0.0,abs(across+0.12+sin(T*0.05)*0.02))*0.55;',
      '  shaft+=smoothstep(0.10,0.0,abs(across-0.20+cos(T*0.04)*0.02))*0.35;',
      '  shaft+=smoothstep(0.24,0.0,abs(across-0.46))*0.22;',
      '  shaft*=fade*(0.7+0.3*noise(q*3.0+T*0.03));',
      '  col+=vec3(0.45,0.85,0.66)*shaft*0.14;a+=shaft*0.14;',
      '  /* 미세 입자 두 층 — 시차 M 으로 마우스를 따라 조금 밀린다 */',
      '  vec2 g1=q*52.0+M*0.5;vec2 i1=floor(g1);float h1=hash(i1.x*12.9+i1.y*78.2);',
      '  vec2 f1=fract(g1)-0.5;float d1=smoothstep(0.075,0.0,length(f1+vec2(h1-0.5,hash(h1*7.0)-0.5)*0.4))*step(0.982,h1)*(0.3+0.7*pow(sin(T*0.6+h1*40.0)*0.5+0.5,2.0));',
      '  vec2 g2=q*24.0+M*1.3+vec2(T*0.012,T*0.007);vec2 i2=floor(g2);float h2=hash(i2.x*3.7+i2.y*91.3);',
      '  vec2 f2=fract(g2)-0.5;float d2=smoothstep(0.055,0.0,length(f2+vec2(h2-0.5,hash(h2*3.0)-0.5)*0.5))*step(0.974,h2)*(0.3+0.7*pow(sin(T*0.4+h2*30.0)*0.5+0.5,2.0));',
      '  float dots=d1*0.5+d2*0.32;',
      '  col+=vec3(0.75,0.98,0.86)*dots;a+=dots;',
      '  gl_FragColor=vec4(col,min(a,1.0));',
      '}'
    ].join('\n');

    var prog = null, uR, uT, uM, loc, buf, w = 0, h = 0, visible = true, raf = 0, t0 = performance.now();
    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; }
    if (gl && !reduce) {
      var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
      if (vs && fs) {
        prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) prog = null;
      }
      if (prog) {
        gl.useProgram(prog);
        buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        uR = gl.getUniformLocation(prog, 'R'); uT = gl.getUniformLocation(prog, 'T'); uM = gl.getUniformLocation(prog, 'M');
        gl.clearColor(0, 0, 0, 0);
      }
    }
    function size() {
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      var rect = canvas.getBoundingClientRect();
      var nw = Math.max(1, Math.round(rect.width * dpr)), nh = Math.max(1, Math.round(rect.height * dpr));
      if (nw !== w || nh !== h) { w = nw; h = nh; canvas.width = w; canvas.height = h; if (gl) gl.viewport(0, 0, w, h); }
    }
    function frame(now) {
      raf = 0;
      mx += (tx - mx) * 0.05; my += (ty - my) * 0.05;
      if (art) art.style.transform = 'translate3d(' + (mx * -12).toFixed(2) + 'px,' + (my * 9).toFixed(2) + 'px,0)';
      if (prog) {
        size();
        gl.useProgram(prog);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.uniform2f(uR, w, h); gl.uniform1f(uT, (now - t0) / 1000); gl.uniform2f(uM, mx, my);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        canvas.classList.add('is-live');
      }
      if (!reduce && visible && !document.hidden) raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf) raf = requestAnimationFrame(frame); }
    if (reduce) return;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) kick(); }, { threshold: 0 }).observe(canvas);
    }
    document.addEventListener('visibilitychange', function () { if (!document.hidden) kick(); });
    window.addEventListener('resize', kick, { passive: true });
    kick();
  }
})();
