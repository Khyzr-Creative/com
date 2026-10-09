/* ============================================================
   khyzr.com homepage · Voices · Louvers
   From the voices section lab, design 5: the facade engine
   (labs/sections/voices/louvers.js) and the rotation clock it
   runs on (labs/sections/voices/rotor.js), in one file with no
   globals. Hooks come from assets/home/hs.js (hs:enter, HS.reduced).

   N vertical prisms with three faces each: a face is a clone of
   one voice's panel, offset so that slat i shows its own strip. At
   rest every front face lies in one plane (the prism is pushed back
   by its inradius r, the face forward by r), so the strips line up
   into one crisp panel. A turn rotates each prism 120° on the
   brand's spring, slat after slat (a 55ms wave), and shades each
   face by how far it has turned from the viewer.

   Each slot carries its own perspective, with its origin set to the
   facade's centre, so all slats share one camera.

   Entrance: the slats start a little open (22°; past 30° the next
   face would show) and settle shut, slat by slat.

   Any number of voices (8 Oct 2026, four): a prism has three faces,
   so the face about to turn in is dressed with the voice it is
   turning to (faceVoice says who is on which). Every change is one
   120° turn, forward for the nearer way round.

   A click or a tap on the facade turns it to the next voice (8 Oct
   2026, Cisco: "when I click this section it goes to the next
   quote"); a drag that selected words is left alone. The keyboard's
   way is the voices' own buttons under it.
   ============================================================ */
(function () {
  'use strict';
  var d = document.querySelector('.hs-voices');
  if (!d) return;
  var REDUCED = window.HS ? HS.reduced : matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------
     The rotation clock.

     VoiceRotor(root, {
       count, interval,            the voices, 8000ms each
       buttons,                    voice buttons, in voice order (aria-pressed kept in step)
       pause,                      the Pause / Play button (hidden under reduced motion)
       progress,                   optional element whose scaleX shows the hold
       onChange(i, prev, how)      how: 'auto' | 'user'
     }) → { go(i, how), index(), hold(bool) }   hold: a design's own gesture in progress

     The clock is a Web Animation on the progress element (or on a
     silent stand-in), so pausing keeps the time already served and the
     bar and the clock can never disagree. It runs only while the section
     is in view and has entered, the tab is visible, nothing inside is
     hovered or focused, and the visitor hasn't pressed Pause. Under
     reduced motion it never runs; the buttons still switch voices.
     ------------------------------------------------------------ */
  var ICON_PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 5.5h2.6v13H8zM13.4 5.5H16v13h-2.6z"/></svg>';
  var ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8.5 5.8v12.4a.6.6 0 0 0 .9.5l9.6-6.2a.6.6 0 0 0 0-1l-9.6-6.2a.6.6 0 0 0-.9.5z"/></svg>';

  function VoiceRotor(root, o) {
    var count = o.count || 3, interval = o.interval || 8000;
    var buttons = [].slice.call(o.buttons || []);
    var idx = 0, playing = !REDUCED, hover = false, focus = false, entered = false, inView = false, held = false;
    var bar = o.progress, clock = null;
    if (!bar) {
      bar = document.createElement('i');
      bar.setAttribute('aria-hidden', 'true');
      bar.style.cssText = 'position:absolute;left:0;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none';
      root.appendChild(bar);
    }

    function running() { return playing && !hover && !focus && !held && entered && inView && !document.hidden; }

    function newClock() {
      if (clock) clock.cancel();
      clock = bar.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: interval, fill: 'forwards', easing: 'linear' });
      clock.pause();
      clock.onfinish = function () { go((idx + 1) % count, 'auto'); };
    }
    function sync() {
      if (REDUCED) { root.classList.add('is-held'); return; }
      if (!clock) newClock();
      if (running()) clock.play(); else clock.pause();
      root.classList.toggle('is-held', !running());
    }
    function paint() {
      buttons.forEach(function (b, k) { b.classList.toggle('on', k === idx); b.setAttribute('aria-pressed', k === idx ? 'true' : 'false'); });
    }
    function go(i, how) {
      i = ((i % count) + count) % count;
      var prev = idx;
      if (i === idx) { if (how === 'user') { newClock(); sync(); } return; }
      idx = i;
      paint();
      o.onChange(i, prev, how || 'user');
      if (!REDUCED) { newClock(); sync(); }
    }

    buttons.forEach(function (b, k) {
      b.addEventListener('click', function () { go(k, 'user'); });
      b.addEventListener('keydown', function (e) {
        var dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (!dir) return;
        e.preventDefault();
        var n = (k + dir + count) % count;
        buttons[n].focus();
        go(n, 'user');
      });
    });

    var pb = o.pause;
    function paintPause() {
      if (!pb) return;
      pb.innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
      pb.setAttribute('aria-label', playing ? 'Pause the quotes' : 'Play the quotes');
      pb.title = playing ? 'Pause' : 'Play';
    }
    if (pb) {
      if (REDUCED) pb.hidden = true;
      paintPause();
      pb.addEventListener('click', function () { playing = !playing; paintPause(); sync(); });
    }

    root.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { hover = true; sync(); } });
    root.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { hover = false; sync(); } });
    root.addEventListener('focusin', function () { focus = true; sync(); });
    root.addEventListener('focusout', function (e) { if (!root.contains(e.relatedTarget)) { focus = false; sync(); } });
    document.addEventListener('visibilitychange', sync);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { inView = es[es.length - 1].isIntersecting; sync(); }, { threshold: 0.15 }).observe(root);
    } else inView = true;
    root.addEventListener('hs:enter', function () { entered = true; sync(); });
    if (root.classList.contains('is-in')) entered = true;

    paint();
    sync();
    return { go: go, index: function () { return idx; }, hold: function (v) { held = !!v; sync(); } };
  }

  /* ------------------------------------------------------------
     The facade.
     ------------------------------------------------------------ */
  var frame = d.querySelector('.frame'), lv = d.querySelector('.louver');
  var panes = [].slice.call(d.querySelectorAll('.panes .pane'));
  var btns = [].slice.call(d.querySelectorAll('.vb')), bar = d.querySelector('.vb .bar');

  function bezier(x1, y1, x2, y2) {
    function a(p, q) { return 1 - 3 * q + 3 * p; } function b(p, q) { return 3 * q - 6 * p; } function c(p) { return 3 * p; }
    function at(t, p, q) { return ((a(p, q) * t + b(p, q)) * t + c(p)) * t; }
    function slope(t, p, q) { return 3 * a(p, q) * t * t + 2 * b(p, q) * t + c(p); }
    return function (x) {
      if (x <= 0) return 0; if (x >= 1) return 1;
      var t = x;
      for (var i = 0; i < 8; i++) { var s = slope(t, x1, x2); if (Math.abs(s) < 1e-6) break; t -= (at(t, x1, x2) - x) / s; }
      return at(t, y1, y2);
    };
  }
  var TRACE = bezier(.34, 1.45, .64, 1);
  var DUR = 1050, STAG = 55, DEG = Math.PI / 180;

  var VOICES = panes.length, faceVoice = [0, 1 % VOICES, 2 % VOICES], curFace = 0;
  var N = 0, w = 0, W = 0, H = 0, slots = [], cur = 0, base = 0, raf = 0, OPEN = 54;   /* the arrival opens wide enough to read on the black face: each slat shows half its neighbour, then shuts */
  var entered = REDUCED || d.classList.contains('is-in');

  function apply(s) {
    s.prism.style.transform = 'translateZ(' + (-s.r).toFixed(3) + 'px) rotateY(' + s.a.toFixed(3) + 'deg)';
    for (var k = 0; k < 3; k++) {
      var lit = Math.max(0, Math.cos((s.a + k * 120) * DEG));
      s.shades[k].style.opacity = ((1 - lit) * 0.6).toFixed(3);
    }
  }

  /* voice v's panel, placed so that slat i shows its own strip of it */
  function strip(v, i) {
    var pane = panes[v].cloneNode(true);
    pane.style.cssText = 'width:' + W + 'px;height:' + H + 'px;left:' + (-i * w) + 'px';
    return pane;
  }
  function build() {
    var avail = frame.clientWidth;
    if (!avail) return;
    N = Math.max(5, Math.min(16, Math.round(avail / 104)));
    /* whole-pixel slats so the strips meet cleanly; the last one takes the remainder */
    w = Math.floor(avail / N); W = avail;
    /* measure the panels at the facade's width; the tallest sets the height */
    d.classList.remove('built');
    panes.forEach(function (p) { p.style.width = W + 'px'; });
    H = Math.max.apply(null, panes.map(function (p) { return p.offsetHeight; }));
    panes.forEach(function (p) { p.style.width = ''; });
    d.classList.add('built');
    lv.style.width = W + 'px'; lv.style.height = H + 'px';
    lv.style.setProperty('--w', w + 'px');
    lv.textContent = '';
    var old = slots.length === N ? slots : null;   /* same slats: keep any turn in flight */
    slots = [];
    for (var i = 0; i < N; i++) {
      var wi = i < N - 1 ? w : W - (N - 1) * w, ri = wi / (2 * Math.sqrt(3));
      var slot = document.createElement('div');
      slot.className = 'slot';
      slot.style.cssText = 'left:' + (i * w) + 'px;width:' + wi + 'px;height:' + H + 'px;' +
        'perspective:2200px;perspective-origin:' + (W / 2 - i * w).toFixed(1) + 'px 50%';
      var prism = document.createElement('div');
      prism.className = 'prism';
      var shades = [], faces = [];
      for (var k = 0; k < 3; k++) {
        var f = document.createElement('div');
        f.className = 'face';
        f.style.transform = 'rotateY(' + (k * 120) + 'deg) translateZ(' + ri.toFixed(3) + 'px)';
        f.appendChild(strip(faceVoice[k], i));
        var sh = document.createElement('i');
        sh.className = 'shade';
        f.appendChild(sh);
        prism.appendChild(f);
        shades.push(sh);
        faces.push(f);
      }
      slot.appendChild(prism);
      lv.appendChild(slot);
      var a = entered ? base : base + OPEN, o = old && old[i];
      slots.push(o ? { prism: prism, shades: shades, faces: faces, r: ri, a: o.a, a0: o.a0, a1: o.a1, t0: o.t0 }
                   : { prism: prism, shades: shades, faces: faces, r: ri, a: a, a0: a, a1: a, t0: 0 });
    }
    slots.forEach(apply);
  }

  function loop(ts) {
    raf = 0;
    var busy = false;
    slots.forEach(function (s) {
      var t = (ts - s.t0) / DUR;
      if (t <= 0) { busy = true; return; }
      if (t >= 1) { if (s.a !== s.a1) { s.a = s.a1; apply(s); } return; }
      s.a = s.a0 + (s.a1 - s.a0) * TRACE(t);
      apply(s);
      busy = true;
    });
    if (busy) raf = requestAnimationFrame(loop);
  }
  /* one turn forward takes the slats left (-120°) to the next face; one back takes them right. The face
     coming in is dressed with the voice first; a turn still in flight lands at once, so the face being
     dressed is never one in view */
  function turnTo(i) {
    if (i === cur) return;
    var fwd = ((i - cur) % VOICES + VOICES) % VOICES <= VOICES / 2;
    if (raf) { cancelAnimationFrame(raf); raf = 0; slots.forEach(function (s) { s.a = s.a0 = s.a1 = base; apply(s); }); }
    curFace = (curFace + (fwd ? 1 : 2)) % 3;
    if (faceVoice[curFace] !== i) {
      faceVoice[curFace] = i;
      slots.forEach(function (s, k) { var f = s.faces[curFace]; f.replaceChild(strip(i, k), f.firstChild); });
    }
    base += fwd ? -120 : 120;
    cur = i;
    if (REDUCED) { slots.forEach(function (s) { s.a = s.a0 = s.a1 = base; apply(s); }); return; }
    var t0 = performance.now();
    slots.forEach(function (s, k) { s.a0 = s.a; s.a1 = base; s.t0 = t0 + k * STAG; });
    if (!raf) raf = requestAnimationFrame(loop);
  }

  /* entrance: from open to shut, a slower wave than a turn */
  function settle() {
    entered = true;
    if (REDUCED) { slots.forEach(function (s) { s.a = s.a0 = s.a1 = base; apply(s); }); return; }
    var t0 = performance.now() + 120;
    slots.forEach(function (s, k) { s.a0 = s.a; s.a1 = base; s.t0 = t0 + k * 70; });
    if (!raf) raf = requestAnimationFrame(loop);
  }

  var rotor = VoiceRotor(d, {
    count: VOICES, interval: 8000, buttons: btns, pause: d.querySelector('.pp'), progress: bar,
    onChange: function (i) {
      btns[i].appendChild(bar);
      turnTo(i);
    }
  });
  frame.addEventListener('click', function () {
    var sel = window.getSelection && getSelection();
    if (sel && !sel.isCollapsed && frame.contains(sel.anchorNode)) return;
    rotor.go(rotor.index() + 1, 'user');
  });
  d.addEventListener('hs:enter', settle);
  /* the facade is built once the webfonts are in (it measures the quotes), and not while the page is still
     parsing: one build, not two */
  var rt = 0, lastW = 0;
  function first() { build(); lastW = frame.clientWidth; }
  if (document.fonts && document.fonts.status !== 'loaded') document.fonts.ready.then(first); else requestAnimationFrame(first);
  addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { if (frame.clientWidth !== lastW) { lastW = frame.clientWidth; build(); } }, 140);
  });
})();
