/* ============================================================
   khyzr.com homepage — the sections' motion hooks.
   The same hooks the section labs gave every design, so each
   design runs here as it ran there:

     .is-in      added once a section enters; its entrances key off it.
                 A section enters when its moment is in view: the element
                 named by data-hs-enter="<selector>" when it has one (its
                 top past 82% of the viewport), else its own top past 72%.
     --pin       0 → 1 while a section marked data-hs-pin scrolls past its
                 pinned stage (its top at the viewport top → its bottom at the
                 viewport bottom), written only when it changes.
     hs:enter    event on the section when it gets .is-in.

   And one for the page's own blocks: every .hs-rise rises (Green Trace)
   when it comes into view; blocks that arrive together overlap, one
   --dur-stagger apart, in reading order. Nothing rises twice.

   window.HS = { reduced }. Under reduced motion, or without
   IntersectionObserver, everything is in at once.
   Load it before the sections' own scripts.
   ============================================================ */
(function () {
  'use strict';
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.HS = { reduced: reduced };
  var STAGGER = 140;

  function boot() {
    var secs = [].slice.call(document.querySelectorAll('.hs'));
    var rises = [].slice.call(document.querySelectorAll('.hs-rise'));
    function enter(s) {
      if (s.classList.contains('is-in')) return;
      s.classList.add('is-in');
      s.dispatchEvent(new CustomEvent('hs:enter'));
    }
    if (reduced || !('IntersectionObserver' in window)) {
      secs.forEach(enter);
      rises.forEach(function (r) { r.classList.add('is-in'); });
    } else {
      /* sections: by their moment, or by their top */
      var keyed = new Map();
      var ioKey = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { enter(keyed.get(e.target)); ioKey.unobserve(e.target); } });
      }, { rootMargin: '0px 0px -18% 0px', threshold: 0 });
      var ioTop = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { enter(e.target); ioTop.unobserve(e.target); } });
      }, { rootMargin: '0px 0px -28% 0px', threshold: 0 });
      secs.forEach(function (s) {
        var sel = s.getAttribute('data-hs-enter'), k = sel && s.querySelector(sel);
        if (k) { keyed.set(k, s); ioKey.observe(k); } else ioTop.observe(s);
      });
      /* blocks: each rises as it arrives; a batch overlaps in reading order */
      var ioRise = new IntersectionObserver(function (es) {
        var hits = es.filter(function (e) { return e.isIntersecting; }).map(function (e) { return e.target; });
        hits.sort(function (a, b) { return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1; });
        hits.forEach(function (el, i) {
          ioRise.unobserve(el);
          var d = (parseFloat(el.getAttribute('data-hs-delay')) || 0) + i * STAGGER;
          if (d) {
            el.style.setProperty('--hs-d', d + 'ms');
            el.addEventListener('transitionend', function () { el.style.removeProperty('--hs-d'); }, { once: true });
          }
          el.classList.add('is-in');
        });
      }, { rootMargin: '0px 0px -10% 0px', threshold: 0 });
      rises.forEach(function (r) { ioRise.observe(r); });
    }

    /* photographs: shown once loaded (a cached one at once, with no fade) */
    [].forEach.call(document.querySelectorAll('.hs-photo'), function (img) {
      function ld() { img.classList.add('ld'); }
      if (img.complete && img.naturalWidth) { img.style.transition = 'none'; ld(); requestAnimationFrame(function () { img.style.transition = ''; }); }
      else { img.addEventListener('load', ld, { once: true }); img.addEventListener('error', ld, { once: true }); }
    });

    /* the pinned sections' progress, drawn only while one is on screen, from its place in the page (kept
       whenever the page's size changes), so a scroll never has to measure */
    var pins = secs.filter(function (s) { return s.hasAttribute('data-hs-pin'); });
    var live = new Set(), raf = 0, geo = new Map();
    function place(s) { var r = s.getBoundingClientRect(); geo.set(s, { top: r.top + scrollY, h: r.height, v: '' }); }
    function frame() {
      raf = 0;
      var vh = innerHeight, y = scrollY;
      live.forEach(function (s) {
        var g = geo.get(s);
        if (!g) { place(s); g = geo.get(s); }
        var top = g.top - y, pin = g.h > vh ? -top / (g.h - vh) : (top <= 0 ? 1 : 0);
        var v = Math.max(0, Math.min(1, pin)).toFixed(4);
        if (v !== g.v) { g.v = v; s.style.setProperty('--pin', v); }
      });
    }
    function replace() { pins.forEach(place); kick(); }
    if ('ResizeObserver' in window) new ResizeObserver(replace).observe(document.body);
    addEventListener('load', replace);
    function kick() { if (!raf && live.size) raf = requestAnimationFrame(frame); }
    if ('IntersectionObserver' in window) {
      var io2 = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) live.add(e.target); else live.delete(e.target); });
        kick();
      }, { threshold: 0 });
      pins.forEach(function (s) { io2.observe(s); });
    } else pins.forEach(function (s) { live.add(s); });
    addEventListener('scroll', kick, { passive: true });
    addEventListener('resize', replace);
    kick();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
