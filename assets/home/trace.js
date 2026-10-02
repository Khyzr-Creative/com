/* ============================================================
   khyzr.com homepage — the scrollbar: The trace (see trace.css).
   A view of the scroll and a second way to drive it: drag the thumb
   (1:1 with the track), or click the rail to glide there. Scrolling
   itself stays native (wheel and glide, keys, touch, find), so the
   bar is aria-hidden. It reads the page's tone under its thumb and
   turns pale over the dark sections. Built only where html.trace-on
   was set (fine pointer, JS); if it can't build, the class comes off
   and the browser's own bar returns.
   ============================================================ */
(function () {
  'use strict';
  var root = document.documentElement;
  if (!root.classList.contains('trace-on')) return;
  try {
    var b = document.createElement('div');
    b.className = 'trace'; b.setAttribute('aria-hidden', 'true');
    b.innerHTML = '<div class="trk"></div><div class="ticks"></div><div class="th"><i></i></div><div class="lb"></div>';
    document.body.appendChild(b);
  } catch (e) { root.classList.remove('trace-on'); return; }

  var trk = b.querySelector('.trk'), th = b.querySelector('.th'), lb = b.querySelector('.lb'), ticks = b.querySelector('.ticks');
  var secs = [], zones = [], H = 1, T = 1, top0 = 0, built = '', raf = 0, idle = 0, lastH = -1;

  /* the sections, by their own names (from their eyebrows until those went, 2 Oct 2026) */
  var NAMES = { 'hero': 'One for All.', 'hs-manifesto': 'khyzr', 'hs-trusted': 'Trusted by', 'hs-disciplines': 'What we do', 'hs-alongside': 'Alongside you',
    'hs-principles': 'How we work', 'hs-voices': 'In their words', 'hs-ecosystem': 'The ecosystem', 'hs-products': 'Products', 'hs-insights': 'Insights',
    'hs-name': 'The name', 'hs-close': 'Strive forward.' };
  function nameOf(el) {
    for (var k in NAMES) if (el.classList.contains(k)) return NAMES[k];
    return null;
  }
  function rect(el) { var r = el.getBoundingClientRect(); return { top: r.top + scrollY, h: r.height }; }
  function measure() {
    H = Math.max(1, root.scrollHeight);
    T = trk.offsetHeight; top0 = trk.offsetTop;
    secs = [].slice.call(document.querySelectorAll('main > section')).map(function (el) { var r = rect(el); return { top: r.top, name: nameOf(el) }; });
    /* where the page is dark: the voices facade, the night from the dusk's forest green on, the close, the footer (the hero is white) */
    zones = [];
    [['.hs-voices .frame', 0, 1], ['.hs-dusk', .4, 1], ['.hs-name', 0, 1], ['.hs-close', 0, 1], ['.hs-footer', 0, 1]].forEach(function (z) {
      var el = document.querySelector(z[0]); if (!el) return;
      var r = rect(el); zones.push([r.top + r.h * z[1], r.top + r.h * z[2]]);
    });
    built = '';
    kick();
  }
  function dark(y) { for (var i = 0; i < zones.length; i++) if (y >= zones[i][0] && y < zones[i][1]) return true; return false; }
  function max() { return Math.max(1, H - innerHeight); }

  function lay() {
    raf = 0;
    var sy = scrollY, key = H + ':' + T;
    if (key !== built) {
      built = key; ticks.textContent = '';
      secs.forEach(function (s, i) {
        if (!i) return;
        var k = document.createElement('span'); k.className = 'tk';
        k.style.top = (top0 + s.top / H * T) + 'px'; k.style.transitionDelay = (i * 18) + 'ms';
        ticks.appendChild(k);
      });
    }
    var h = Math.max(44, T * innerHeight / H), y = top0 + (T - h) * Math.min(1, sy / max());
    if (h !== lastH) { lastH = h; th.style.height = h + 'px'; }
    th.style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,0)';
    lb.style.translate = '0 ' + (y + h / 2).toFixed(1) + 'px';
    var probe = sy + innerHeight * 0.4, name = null;
    secs.forEach(function (s) { if (s.top <= probe && s.name) name = s.name; });
    if (lb.textContent !== (name || '')) lb.textContent = name || '';
    b.classList.toggle('dark', dark(sy + y + h / 2));
  }
  function kick() { if (!raf) raf = requestAnimationFrame(lay); }

  addEventListener('scroll', function () {
    kick();
    b.classList.add('live'); clearTimeout(idle);
    idle = setTimeout(function () { b.classList.remove('live'); }, 900);
  }, { passive: true });
  addEventListener('resize', measure, { passive: true });
  /* the first measure waits for the page's first layout (the observer's first call) */
  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(document.body); else requestAnimationFrame(measure);
  addEventListener('load', measure);

  /* drag the thumb */
  var id = null, start = 0, from = 0;
  th.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    id = e.pointerId; th.setPointerCapture(id);
    start = e.clientY; from = scrollY;
    root.classList.add('trace-drag');
    if (window.Glide && Glide.stop) Glide.stop();
  });
  th.addEventListener('pointermove', function (e) {
    if (e.pointerId !== id) return;
    var travel = Math.max(1, trk.offsetHeight - th.offsetHeight);
    scrollTo(0, Math.max(0, Math.min(max(), from + (e.clientY - start) * max() / travel)));
  });
  function end(e) { if (e.pointerId !== id) return; id = null; root.classList.remove('trace-drag'); }
  th.addEventListener('pointerup', end);
  th.addEventListener('pointercancel', end);

  /* click the rail: glide so the clicked point comes to the middle of the window */
  b.addEventListener('pointerdown', function (e) {
    if (e.button !== 0 || e.target === th || th.contains(e.target)) return;
    var r = trk.getBoundingClientRect();
    var y = Math.max(0, Math.min(max(), (e.clientY - r.top) / r.height * H - innerHeight / 2));
    if (window.Glide && Glide.on) Glide.to(y); else scrollTo({ top: y, behavior: 'smooth' });
  });
})();
