/* ---------------------------------------------------------------
   The close · The full stop — the dot grows into the pill.
   Ported from labs/sections/close.html, design 1.
   CSS holds the final state (no JS, reduced motion). With motion,
   .armed shows the dot as the tagline's period; on hs:enter the
   dot springs to the pill's nearest end (in place on a wide screen,
   one line down on a phone), hands over to the pill's own shape at
   that end, and the pill extends. Nothing here reads scroll.
   --------------------------------------------------------------- */
(function () {
  'use strict';
  var d = document.querySelector('.hs-close');
  if (!d) return;
  var inEl = d.querySelector('.in'), l2 = d.querySelector('.l2'), stop = d.querySelector('.stop');
  var bg = stop.querySelector('.bg'), lab = stop.querySelector('.lab'), dot = d.querySelector('.dot i');

  /* wide: the pill shares the tagline's last line. narrow: it hangs one line down, its right end exactly under the
     full stop */
  var dotBox = d.querySelector('.dot');
  function align() {
    var same = Math.abs(stop.offsetTop + stop.offsetHeight - (l2.offsetTop + l2.offsetHeight)) < l2.offsetHeight * 0.6;
    var dotRight = l2.offsetLeft + dotBox.offsetLeft + dot.offsetLeft + dot.offsetWidth;   /* .ln is positioned (it stands in front of the glow) */
    d.style.setProperty('--pr', same ? '0px' : Math.max(0, inEl.clientWidth - dotRight).toFixed(1) + 'px');
  }
  align();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(align);
  if ('ResizeObserver' in window) new ResizeObserver(align).observe(inEl); else addEventListener('resize', align);

  var reduced = window.HS ? HS.reduced : matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !stop.animate) return;
  d.classList.add('armed');
  var timers = [], anims = [];
  function clear() {
    timers.forEach(clearTimeout); timers = [];
    anims.forEach(function (a) { a.cancel(); }); anims = [];
    d.classList.remove('swapped', 'grown');
  }
  function at(ms, fn) { timers.push(setTimeout(fn, ms)); }
  var SPRING = 'cubic-bezier(.34,1.45,.64,1)', DRIFT = 'cubic-bezier(.22,.9,.36,1)';

  function grow() {
    var D = dot.getBoundingClientRect();
    var W = stop.offsetWidth, H = stop.offsetHeight;
    var P = stop.getBoundingClientRect();                 /* no transform on the pill at rest */
    var sameLine = P.top < D.bottom && P.bottom > D.top;
    var right = !sameLine && (D.left + D.width / 2) > (P.left + P.width / 2);
    var tx = (right ? P.right - H : P.left) - D.left, ty = P.top - D.top, s = H / D.width;
    anims.push(dot.animate([{ transform: 'translate(0,0) scale(1)' }, { transform: 'translate(' + tx + 'px,' + ty + 'px) scale(' + s + ')' }],
      { duration: sameLine ? 680 : 820, easing: SPRING, fill: 'forwards' }));
    at(sameLine ? 680 : 820, function () {
      var from = right ? 'inset(0px 0px 0px ' + (W - H) + 'px round 999px)' : 'inset(0px ' + (W - H) + 'px 0px 0px round 999px)';
      anims.push(bg.animate([{ opacity: 1, clipPath: from }, { opacity: 1, clipPath: 'inset(0px 0px 0px 0px round 999px)' }],
        { duration: 700, easing: DRIFT, fill: 'forwards' }));
      anims.push(lab.animate([{ opacity: 0, transform: 'translateX(' + (right ? 14 : -14) + 'px)' }, { opacity: 1, transform: 'none' }],
        { duration: 560, delay: 240, easing: 'ease', fill: 'both' }));
      d.classList.add('swapped');
      at(820, function () { d.classList.add('grown'); anims.forEach(function (a) { a.cancel(); }); anims = []; });
    });
  }
  /* the beat, then the grow — but only once the pill's line is on screen: the close laps up over
     the night field, so it enters (.is-in) while its type can still be under the fold */
  var seen = !('IntersectionObserver' in window), waiting = false;
  if (!seen) new IntersectionObserver(function (es) {
    seen = es[0].isIntersecting;
    if (seen && waiting) { waiting = false; at(240, grow); }
  }, { rootMargin: '0px 0px -10% 0px', threshold: 1 }).observe(stop);
  d.addEventListener('hs:enter', function () { clear(); at(650, function () { if (seen) grow(); else waiting = true; }); });
})();
