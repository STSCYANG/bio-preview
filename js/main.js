/* STAR'S TECH Bioscience — interactions
   Motion: one grammar (reveal on enter) + one authored moment (stage track draw-in) + one ambient field (js/depth.js, home hero).
   State transitions: tilt on glass panels, chrome turning to dark glass over the hero.
   Everything else is state, not entrance. */
(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var slice = function (n) { return Array.prototype.slice.call(n); };

  /* ---------- 1. reveal on enter ---------- */
  var revealed = slice(document.querySelectorAll('[data-rv]'));
  function showAll() { revealed.forEach(function (el) { el.classList.add('rv'); }); }
  if (reduce || !('IntersectionObserver' in window)) {
    showAll();
  } else {
    var vio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('rv');
        vio.unobserve(en.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    revealed.forEach(function (el) {
      /* already in view on load: show immediately, no entrance for the first screen */
      if (el.getBoundingClientRect().top < window.innerHeight * 0.92) el.classList.add('rv');
      else vio.observe(el);
    });
  }

  /* ---------- 2. stage tracks: the one authored moment ---------- */
  var tracks = slice(document.querySelectorAll('.segs[data-draw], .pipe-track[data-draw]'));
  function draw() { tracks.forEach(function (t, i) { setTimeout(function () { t.classList.add('draw'); }, i * 90); }); }
  if (!reduce && tracks.length) {
    if ('IntersectionObserver' in window) {
      var tio = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { draw(); tio.disconnect(); } });
      }, { threshold: 0.2 });
      tio.observe(tracks[0]);
    } else { draw(); }
  }

  /* ---------- 3. global nav: current page, scroll state, mega panel ---------- */
  var page = document.body.getAttribute('data-page');
  slice(document.querySelectorAll('#gnbNav a[data-nav]')).forEach(function (a) {
    if (a.dataset.nav === page) a.classList.add('on');
  });
  slice(document.querySelectorAll('.mcol[data-col]')).forEach(function (c) {
    if (c.dataset.col === page) c.classList.add('on');
  });

  var gnb = document.getElementById('gnb');
  var mega = document.getElementById('mega');
  var menuBtn = document.getElementById('menuBtn');
  var hoverable = window.matchMedia && window.matchMedia('(hover: hover) and (min-width: 1024px)');

  if (gnb) {
    var stuck = false;
    var onScroll = function () {
      var next = window.scrollY > 8;
      if (next !== stuck) { stuck = next; gnb.classList.toggle('is-stuck', stuck); }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  function setMega(open) {
    if (!mega) return;
    mega.hidden = !open;
    if (gnb) gnb.classList.toggle('has-mega', open);
    if (menuBtn) menuBtn.setAttribute('aria-expanded', String(open));
  }
  function markCol(key) {
    slice(document.querySelectorAll('.mcol[data-col]')).forEach(function (c) {
      c.classList.toggle('on', c.dataset.col === (key || page));
    });
  }
  if (menuBtn) {
    menuBtn.addEventListener('click', function () { setMega(mega.hidden); markCol(null); });
  }
  if (gnb && mega) {
    slice(document.querySelectorAll('#gnbNav a[data-nav]')).forEach(function (a) {
      a.addEventListener('mouseenter', function () {
        if (hoverable && hoverable.matches) { setMega(true); markCol(a.dataset.nav); }
      });
      a.addEventListener('focus', function () { setMega(true); markCol(a.dataset.nav); });
    });
    gnb.addEventListener('mouseleave', function () {
      if (hoverable && hoverable.matches) { setMega(false); markCol(null); }
    });
    gnb.addEventListener('focusout', function (e) {
      if (!gnb.contains(e.relatedTarget)) { setMega(false); markCol(null); }
    });
    mega.addEventListener('click', function (e) { if (e.target.closest('a')) setMega(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !mega.hidden) { setMega(false); markCol(null); if (menuBtn) menuBtn.focus(); }
    });
  }

  /* ---------- 3b. deep hero: chrome turns to dark glass while over the field ---------- */
  var deepHero = document.querySelector('.hero-deep');
  var rail = document.querySelector('.rail');
  if (deepHero && gnb) {
    var deep = null;
    var deepCheck = function () {
      var r = deepHero.getBoundingClientRect();
      var limit = (gnb.offsetHeight || 72) + (rail ? rail.offsetHeight : 0);
      /* 홈 스크롤 영상의 흰 지면(.film-lit) 이후에는 히어로가 밝으므로 어두운 유리로 두지 않는다 */
      var next = r.bottom > limit + 8 && !document.documentElement.classList.contains('film-lit');
      if (next !== deep) {
        deep = next;
        gnb.classList.toggle('is-deep', deep);
        if (rail) rail.classList.toggle('is-deep', deep);
      }
    };
    deepCheck();
    window.addEventListener('scroll', deepCheck, { passive: true });
    window.addEventListener('resize', deepCheck, { passive: true });
  }

  /* ---------- 3c. tilt: glass panels lean toward the pointer (hover devices only) ---------- */
  var canTilt = !reduce && window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (canTilt) {
    slice(document.querySelectorAll('[data-tilt]')).forEach(function (el) {
      var max = parseFloat(el.getAttribute('data-tilt')) || 5;
      var raf = 0, lx = 0, ly = 0;
      function paint() {
        raf = 0;
        var r = el.getBoundingClientRect();
        var px = (lx - r.left) / r.width, py = (ly - r.top) / r.height;
        el.style.setProperty('--ry', ((px - 0.5) * 2 * max).toFixed(2) + 'deg');
        el.style.setProperty('--rx', ((0.5 - py) * 2 * max).toFixed(2) + 'deg');
        el.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
        el.style.setProperty('--my', (py * 100).toFixed(1) + '%');
      }
      el.addEventListener('pointerenter', function () { el.classList.add('is-tilt'); });
      el.addEventListener('pointermove', function (e) { lx = e.clientX; ly = e.clientY; if (!raf) raf = requestAnimationFrame(paint); });
      el.addEventListener('pointerleave', function () {
        el.classList.remove('is-tilt');
        el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* ---------- 4. section nav: where am I on this page ---------- */
  var navLinks = slice(document.querySelectorAll('#railNav a'));
  var sections = navLinks
    .map(function (a) { return document.querySelector(a.getAttribute('href')); })
    .filter(Boolean);
  if (sections.length && 'IntersectionObserver' in window) {
    var seen = {};
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { seen[en.target.id] = en.intersectionRatio; });
      var best = null, bestR = 0;
      sections.forEach(function (s) {
        var r = seen[s.id] || 0;
        if (r > bestR) { bestR = r; best = s.id; }
      });
      navLinks.forEach(function (a) {
        a.classList.toggle('on', best !== null && a.getAttribute('href') === '#' + best);
      });
    }, { threshold: [0, 0.12, 0.35, 0.6, 0.9], rootMargin: '-18% 0px -45% 0px' });
    sections.forEach(function (s) { rio.observe(s); });
  }

  /* ---------- 4b. scroll points — 섹션 시작은 포인트, 섹션 안은 일반 스크롤 (v12, 2026-09-29) ----------
     "섹션 시작에서는 스크롤 포인트, 그 섹션의 끝 내용까지는 일반 스크롤. 섹션 시작에서 이미 섹션이 다 보이면 바로 다음 섹션으로. 전환은 지금의 절반 속도로. 모바일도."
     규칙(데스크톱 · 모바일 공통, 모션 줄이기면 전부 끔):
       ① 섹션 안에서는 휠 · 트랙패드 · 터치 · 키가 평소처럼 스크롤한다.
       ② 아래로: 섹션 마지막 내용이 화면 아래에 닿는 지점(end)에서 멈춘다. 그다음 제스처는 다음 섹션 시작으로 한 번에 이동한다.
          섹션이 시작 지점에서 이미 한 화면에 다 들어오면(end ≤ 시작) 첫 제스처부터 다음 섹션 시작으로 간다.
       ③ 위로: 섹션 시작에서 멈춘다. 그다음 제스처는 이전 포인트(이전 섹션 시작 · 영상 포인트)로 한 번에 이동한다.
       ④ 홈 스크롤 영상 구간은 모든 제스처가 영상 포인트 하나씩이다 — 번들(src/scene/steps.js)이 window.__stt.film 에 포인트 · 이동 · 재생을 등록한다.
     멈춤 뒤 트랙패드 관성 꼬리는 흘려보낸다. 스크롤바 끌기 · 앵커 이동 · Home/End 는 막지 않는다(사용자 입력 직후에만 경계를 지킨다). */
  var STT = window.__stt = window.__stt || {};
  if (!reduce) {
    var root = document.documentElement;
    var EASE = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
    var chromeH = function () {
      var o = gnb ? gnb.offsetHeight : 72;
      if (rail) { var p = getComputedStyle(rail).position; if (p === 'fixed' || p === 'sticky') o += rail.offsetHeight; }
      return o;
    };
    var docTop = function (el) { return el.getBoundingClientRect().top + window.scrollY; };
    var maxY = function () { return root.scrollHeight - window.innerHeight; };
    var lenis = function () { return STT.film && STT.film.lenis; };

    /* 섹션 모델 — head: 섹션 머리가 메뉴 바로 아래에 오는 위치, end: 섹션 마지막 내용이 화면 아래에 닿는 위치(head 이상 · 다음 head 이하) */
    var model = function () {
      var off = chromeH(), M = maxY(), vh = window.innerHeight;
      var secs = slice(document.querySelectorAll('main > section.sec')).filter(function (s) { return !(STT.film && s.classList.contains('hero-deep')); });
      var tops = secs.map(docTop);
      return secs.map(function (s, i) {
        var clampY = function (v) { return Math.min(M, Math.max(0, Math.round(v))); };
        var head = clampY(tops[i] - off);
        var last = i + 1 >= secs.length;
        var next = last ? M : clampY(tops[i + 1] - off);
        var end = last ? M : Math.round(tops[i + 1] - vh);
        return { head: head, next: next, end: Math.max(head, Math.min(next, end)) };
      });
    };
    var points = function () {
      var pts = model().map(function (s) { return s.head; }).concat([maxY()]);
      if (STT.film) pts = STT.film.points().concat(pts.filter(function (v) { return v >= STT.film.exitY() - 2; }));
      pts.sort(function (a, b) { return a - b; });
      return pts.filter(function (v, i) { return i === 0 || v - pts[i - 1] > 6; });
    };
    /* 이 방향 입력을 한 번에 이동(step)으로 받을지, 일반 스크롤(free)로 둘지 — free 면 멈출 경계(limit)도 돌려준다 */
    var decide = function (dir) {
      var y = window.scrollY, film = STT.film;
      if (film && y < film.exitY() - 2) return { step: true };
      var L = model(); if (!L.length) return { step: false, limit: dir > 0 ? maxY() : 0 };
      var s = L[0];
      for (var k = 0; k < L.length; k++) if (L[k].head <= y + 6) s = L[k];
      if (dir > 0) return y >= s.end - 6 ? { step: true } : { step: false, limit: s.end };
      return y <= s.head + 6 ? { step: true } : { step: false, limit: s.head };
    };

    /* 이동 · 경계 맞춤 — 홈 영상 모드면 Lenis, 아니면 직접 애니메이션(CSS scroll-behavior:smooth 를 잠시 끈다) */
    var anim = 0;
    var nativeTo = function (y, dur, done) {
      cancelAnimationFrame(anim);
      var y0 = window.scrollY, t0 = performance.now();
      root.style.scrollBehavior = 'auto';
      var tick = function (now) {
        var u = dur > 0 ? Math.min(1, (now - t0) / (dur * 1000)) : 1;
        window.scrollTo(0, y0 + (y - y0) * EASE(u));
        if (u < 1) anim = requestAnimationFrame(tick); else { root.style.scrollBehavior = ''; if (done) done(); }
      };
      anim = requestAnimationFrame(tick);
    };
    var moveTo = function (y, dur, done) {
      var l = lenis();
      if (l) l.scrollTo(y, { duration: dur, easing: EASE, lock: true, force: true, onComplete: done });
      else nativeTo(y, dur, done);
    };
    var busy = false, tail = false, guard = null;
    var rest = function () { busy = false; tail = true; };   /* 멈춘 뒤 이어지는 휠 관성은 흘려보낸다(아래 wheel) */
    var go = function (dir) {
      var film = STT.film;
      if (film && film.unstable()) return;              /* 창 크기 재계산 중 — 포인트가 0 으로 잡히는 순간 */
      var y = window.scrollY, pts = points();
      var target = dir > 0 ? pts.filter(function (v) { return v > y + 4; })[0] : pts.filter(function (v) { return v < y - 4; }).pop();
      if (target === undefined || !isFinite(target)) return;
      var dur = film ? film.duration(y, target) : null;
      if (dur == null) dur = Math.min(0.55, Math.max(0.33, 0.3 + Math.abs(target - y) / 4000));
      busy = true; guard = null;
      if (film) film.onStep(y, target, dur);
      moveTo(target, dur, rest);
    };
    /* 일반 스크롤이 경계를 넘으면 경계에 세운다(짧게) — 그다음 제스처가 다음 포인트로 간다 */
    var clampTo = function (y) {
      busy = true; guard = null;
      moveTo(y, Math.abs(window.scrollY - y) > 3 ? 0.16 : 0, rest);
    };
    /* 휠 관성 판별 — 이벤트가 0.22초 안에 이어지고 크기가 줄어들거나 같으면 앞 제스처의 관성(트랙패드 모멘텀 · 빠르게 굴린 휠)이다.
       이동 · 경계 멈춤이 끝난 뒤(tail) 관성은 전부 흘려보내고, 크기가 커지거나 잠시 멈췄다 들어오는 입력을 새 제스처로 본다 — 트랙패드 한 번에 포인트 하나 */
    var lastWT = 0, lastWA = 0;
    var inertia = function (a) {
      var now = performance.now(), yes = now - lastWT < 220 && a <= lastWA * 1.15 + 1;
      lastWT = now; lastWA = a; return yes;
    };
    /* 안쪽에 스스로 세로 스크롤하는 요소가 있으면 그 스크롤을 먼저 쓴다 */
    var nestedScroll = function (el, dir) {
      for (; el && el !== document.body && el !== root; el = el.parentElement) {
        var cs = getComputedStyle(el);
        if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 2) {
          if ((dir > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1) || (dir < 0 && el.scrollTop > 0)) return true;
        }
      }
      return false;
    };
    var blocked = function () { return gnb && gnb.classList.contains('has-mega'); };
    var stop = function (e) { if (e.cancelable) e.preventDefault(); e.stopImmediatePropagation(); };

    /* 휠 · 트랙패드 */
    var predicted = null, predictedAt = 0;
    window.addEventListener('wheel', function (e) {
      if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      var dir = e.deltaY > 0 ? 1 : e.deltaY < 0 ? -1 : 0;
      if (!dir || blocked() || nestedScroll(e.target, dir)) return;
      var px = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1);
      var inert = inertia(Math.abs(px));
      if (busy) { stop(e); return; }
      if (tail) { if (inert) { stop(e); return; } tail = false; }
      var d = decide(dir);
      if (d.step) { stop(e); if (Math.abs(e.deltaY) >= 2) go(dir); return; }
      /* 일반 스크롤 — 이번 입력까지 더한 목표 위치가 경계를 넘으면 경계에 세운다 */
      var l = lenis(), now = performance.now();
      var base = l ? l.targetScroll : (predicted !== null && now - predictedAt < 280 ? (dir > 0 ? Math.max(predicted, window.scrollY) : Math.min(predicted, window.scrollY)) : window.scrollY);
      var next = base + px;
      if ((dir > 0 && next > d.limit + 1) || (dir < 0 && next < d.limit - 1)) { stop(e); predicted = null; clampTo(d.limit); return; }
      predicted = next; predictedAt = now;
      guard = { dir: dir, limit: d.limit, until: now + 900 };
    }, { passive: false, capture: true });

    /* 터치 — 방향이 정해지는 첫 움직임에서 이동/일반을 가른다. 이동이면 이 제스처의 네이티브 스크롤을 막고 손을 뗄 때 이동한다 */
    var tY = null, tX = 0, tDir = 0, tMode = null;
    window.addEventListener('touchstart', function (e) { tY = e.touches[0].clientY; tX = e.touches[0].clientX; tDir = 0; tMode = null; }, { passive: true, capture: true });
    window.addEventListener('touchmove', function (e) {
      if (tY === null) return;
      if (busy) { stop(e); return; }
      var dy = tY - e.touches[0].clientY;
      if (!tMode) {
        var dx = tX - e.touches[0].clientX;
        if ((Math.abs(dy) < 6 && Math.abs(dx) < 6) || blocked()) return;
        if (Math.abs(dx) > Math.abs(dy)) { tMode = 'native'; return; }   /* 가로 스와이프(카드 줄 등)는 그대로 */
        tDir = dy > 0 ? 1 : -1;
        if (nestedScroll(e.target, tDir)) { tMode = 'native'; return; }
        var d = decide(tDir);
        tMode = d.step ? 'step' : 'free';
        if (!d.step) guard = { dir: tDir, limit: d.limit, until: performance.now() + 2500 };
      }
      if (tMode === 'step') { stop(e); return; }
      if (tMode === 'free' && guard) {
        guard.until = performance.now() + 2500;
        /* 끌어서 경계를 넘으려 하면 거기서 멈춘다 */
        var y = window.scrollY;
        if ((guard.dir > 0 && y >= guard.limit - 1 && dy > 0) || (guard.dir < 0 && y <= guard.limit + 1 && dy < 0)) stop(e);
      }
    }, { passive: false, capture: true });
    window.addEventListener('touchend', function (e) {
      if (tY === null) return;
      var t = e.changedTouches && e.changedTouches[0], dy = tY - (t ? t.clientY : tY);
      if (tMode === 'step' && Math.abs(dy) > 28 && !busy) go(dy > 0 ? 1 : -1);
      if (tMode === 'free' && guard) guard.until = performance.now() + 2500;   /* 손을 뗀 뒤 관성도 경계를 지킨다 */
      tY = null; tMode = null;
    }, { capture: true });

    /* 키보드 — 경계에서는 이동, 섹션 안에서는 평소대로(넘으면 아래 경계 지킴이 세운다) */
    window.addEventListener('keydown', function (e) {
      var t = e.target, tag = t && t.tagName;
      if (e.altKey || e.ctrlKey || e.metaKey || (t && (t.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'))) return;
      var bodyFocus = !t || t === document.body || t === root;
      var dir = 0;
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey && bodyFocus)) dir = 1;
      else if (e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey && bodyFocus)) dir = -1;
      if (!dir || blocked()) return;
      if (busy) { e.preventDefault(); return; }
      var d = decide(dir);
      if (d.step) { e.preventDefault(); go(dir); return; }
      guard = { dir: dir, limit: d.limit, until: performance.now() + 1200 };
    }, true);

    /* 경계 지킴이 — 사용자 입력 직후의 일반 스크롤(부드러운 휠 · 키 · 터치 관성)이 경계를 넘으면 경계에 세운다 */
    /* 관성(터치 플링 · 부드러운 휠)은 프로그램 스크롤로 멈추지 않으므로, 한 프레임 overflow:hidden 으로 끊고 경계에 세운다(크롬 · iOS 공통 기법).
       지킴이는 입력이 끝나고 관성이 가라앉을 때까지 유지해, 남은 관성이 다시 밀어도 경계로 되돌린다 */
    var killing = false;
    var holdAt = function (lim) {
      var l = lenis();
      if (!killing) {
        killing = true; root.style.overflow = 'hidden';
        requestAnimationFrame(function () { requestAnimationFrame(function () { root.style.overflow = ''; killing = false; }); });
      }
      if (l) l.scrollTo(lim, { immediate: true, force: true });
      else { root.style.scrollBehavior = 'auto'; window.scrollTo(0, lim); root.style.scrollBehavior = ''; }
    };
    window.addEventListener('scroll', function () {
      if (!guard || busy || performance.now() > guard.until) return;
      var y = window.scrollY;
      if ((guard.dir > 0 && y > guard.limit + 2) || (guard.dir < 0 && y < guard.limit - 2)) {
        holdAt(guard.limit);
        tail = true;
      }
    }, { passive: true });

    STT.points = points;   /* 캡처 · 검증용 */
    STT.model = model;
  }

  /* ---------- 5. language ---------- */
  var KO = {};
  function nodes() { return document.querySelectorAll('[data-i18n]'); }
  Array.prototype.forEach.call(nodes(), function (el) {
    var k = el.getAttribute('data-i18n');
    if (KO[k] === undefined) KO[k] = el.innerHTML;
  });

  var langButtons = slice(document.querySelectorAll('.lang button'));
  function apply(lang) {
    var dict = (lang === 'en') ? (window.STT_EN || {}) : KO;
    Array.prototype.forEach.call(nodes(), function (el) {
      var k = el.getAttribute('data-i18n');
      var v = dict[k];
      if (typeof v === 'string') el.innerHTML = v;
      else if (KO[k] !== undefined) el.innerHTML = KO[k];
    });
    document.documentElement.lang = (lang === 'en') ? 'en' : 'ko';
    langButtons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.lang === lang)); });
    try { localStorage.setItem('stt-lang', lang); } catch (e) {}
  }
  langButtons.forEach(function (b) {
    b.addEventListener('click', function () { apply(b.dataset.lang); });
  });
  var saved = null;
  try { saved = localStorage.getItem('stt-lang'); } catch (e) {}
  if (saved === 'en') apply('en');
})();
