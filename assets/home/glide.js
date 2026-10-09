/* ============================================================
   khyzr.com homepage — glide: smooth scrolling for the whole page.

   The page still scrolls natively (so position: sticky, the pinned
   night field, scroll events, find-in-page, the keyboard and the
   scrollbar all behave as they always have); glide only eases how a
   mouse wheel or trackpad moves it, and how in-page links travel.

     wheel      each notch moves a target; the page eases toward it
                (exponential, frame-rate independent). A trackpad scrolls
                natively (its momentum is already smooth). Ctrl/⌘-wheel
                (zoom), sideways gestures and anything inside a
                scrollable element are left to the browser.
     #links     a click on a link to an anchor on this page travels
                there on an eased curve, then updates the address and
                moves keyboard focus to the target, as a native jump would.
     everything else that scrolls the page (keys, the scrollbar, focus,
     find, other scripts) wins: glide lets go and picks up from there.

   Off under prefers-reduced-motion (the page then scrolls natively and
   CSS scroll-behavior is auto too). Touch is native: touch doesn't send
   wheel events. window.Glide = { to(yOrElement, {duration, done}), stop(), on }.
   ============================================================ */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var Glide = window.Glide = { on: false, to: native, stop: function () {} };
  function native(t) {
    var y = typeof t === 'number' ? t : top(t);
    scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
  }
  function top(el) {
    var mt = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
    return el.getBoundingClientRect().top + scrollY - mt;
  }
  if (reduced) return;

  var LERP = 0.18;                /* share of the distance closed per 60 Hz frame */
  var cur = scrollY, target = cur, mode = null, raf = 0, last = 0, mine = null, tw = null;
  root.classList.add('glide');
  Glide.on = true;

  /* the page's height, kept whenever it changes (reading it per notch would force a layout) */
  var PH = root.scrollHeight;
  if ('ResizeObserver' in window) new ResizeObserver(function () { PH = root.scrollHeight; }).observe(document.body);
  addEventListener('load', function () { PH = root.scrollHeight; });
  function max() { return Math.max(0, PH - innerHeight); }
  function clamp(v) { return v < 0 ? 0 : Math.min(v, max()); }
  function set(y) { mine = y; scrollTo(0, y); }
  function stop() { mode = null; tw = null; if (raf) cancelAnimationFrame(raf); raf = 0; last = 0; }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  function frame(t) {
    raf = 0;
    var dt = last ? Math.min(64, t - last) : 16.67;
    last = t;
    if (mode === 'wheel') {
      cur += (target - cur) * (1 - Math.pow(1 - LERP, dt / 16.67));
      if (Math.abs(target - cur) < 0.4) { cur = target; mode = null; }
    } else if (mode === 'tween') {
      var p = Math.min(1, (t - tw.t0) / tw.d);
      if (!tw.t0) { tw.t0 = t; p = 0; }
      cur = tw.from + (tw.to - tw.from) * ease(p);
      if (p >= 1) { var done = tw.done; mode = null; tw = null; set(cur); last = 0; if (done) done(); return; }
    }
    set(cur);
    if (mode) kick(); else last = 0;
  }

  /* the wheel */
  function scrollsInside(el, dy) {
    for (; el && el !== document.body && el !== root; el = el.parentElement) {
      if (el.hasAttribute && el.hasAttribute('data-glide-ignore')) return true;
      if (el.scrollHeight <= el.clientHeight + 1) continue;
      var oy = getComputedStyle(el).overflowY;
      if (oy !== 'auto' && oy !== 'scroll') continue;
      if (dy > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : el.scrollTop > 0) return true;
    }
    return false;
  }
  addEventListener('wheel', function (e) {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey) return;
    var dy = e.deltaY;
    if (!dy || Math.abs(e.deltaX) > Math.abs(dy)) return;
    if (scrollsInside(e.target, dy)) return;
    /* a trackpad (pixel deltas that aren't a wheel's notches) already glides: leave it to the browser */
    if (e.deltaMode === 0 && (e.wheelDeltaY ? e.wheelDeltaY === -3 * dy : dy % 1 !== 0)) { if (mode === 'wheel') stop(); return; }
    e.preventDefault();
    if (mode !== 'wheel') { stop(); cur = target = scrollY; }
    mode = 'wheel';
    target = clamp(target + dy * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight * 0.9 : 1));
    kick();
  }, { passive: false });

  /* anything else that moves the page takes over */
  addEventListener('scroll', function () {
    if (mine !== null && Math.abs(scrollY - mine) <= 2) return;
    stop();
    cur = target = scrollY;
    mine = null;
  }, { passive: true });
  addEventListener('resize', function () { target = clamp(target); });

  /* travel to a place */
  function to(t, o) {
    o = o || {};
    var y = clamp(typeof t === 'number' ? t : top(t));
    var from = scrollY, dist = Math.abs(y - from);
    stop();
    cur = from;
    if (dist < 2) { if (o.done) o.done(); return; }
    /* take the page from wherever the browser's own scroll had it, so that scroll doesn't stop this one */
    set(from);
    var d = o.duration != null ? o.duration : Math.max(600, Math.min(1500, 520 + dist * 0.16));
    mode = 'tween'; tw = { from: from, to: y, d: d, t0: 0, done: o.done };
    kick();
  }
  Glide.to = to;
  Glide.stop = stop;

  /* in-page links */
  function land(el) {
    if (!el) return;
    if (!el.matches('a[href],button,input,select,textarea,[tabindex]')) {
      el.setAttribute('tabindex', '-1');
      el.addEventListener('blur', function () { el.removeAttribute('tabindex'); }, { once: true });
    }
    el.focus({ preventScroll: true });
  }
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var h = a.getAttribute('href'), el = h.length > 1 ? document.getElementById(decodeURIComponent(h.slice(1))) : null;
    if (h.length > 1 && !el) return;
    e.preventDefault();
    to(el || 0, { done: function () {
      try { history.pushState(null, '', h.length > 1 ? h : location.pathname + location.search); } catch (err) {}
      if (el) land(el);
    } });
  });
})();
