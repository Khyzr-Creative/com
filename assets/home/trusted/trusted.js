/* ============================================================
   khyzr.com homepage — Trusted by: the count-up and the marquee.
   The numbers stay final in the markup (no JS, reduced motion).
   With motion they count from zero over --dur-count, ease-out,
   once, when the pair is in view, and land with the settle pulse
   (1.07 on --ease-pop over --dur-pulse). The marquee sleeps while
   it is off screen.
   ============================================================ */
(function () {
  'use strict';
  var d = document.querySelector('.hs-trusted');
  if (!d || !('IntersectionObserver' in window)) return;
  var reduced = window.HS ? HS.reduced : matchMedia('(prefers-reduced-motion: reduce)').matches;

  var track = d.querySelector('.track');
  if (track) new IntersectionObserver(function (es) { track.classList.toggle('sleep', !es[0].isIntersecting); }, { threshold: 0 }).observe(d);

  /* pause and play the roll */
  var pb = d.querySelector('.pp');
  var PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 5.5h2.6v13H8zM13.4 5.5H16v13h-2.6z"/></svg>';
  var PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8.5 5.8v12.4a.6.6 0 0 0 .9.5l9.6-6.2a.6.6 0 0 0 0-1l-9.6-6.2a.6.6 0 0 0-.9.5z"/></svg>';
  if (pb && track) {
    var paused = false;
    var show = function () { pb.innerHTML = paused ? PLAY : PAUSE; pb.setAttribute('aria-label', paused ? 'Play the logos' : 'Pause the logos'); track.classList.toggle('paused', paused); };
    pb.addEventListener('click', function () { paused = !paused; show(); });
    show();
  }

  if (reduced) return;
  var nums = [].slice.call(d.querySelectorAll('.count[data-count]'));
  var ease = function (t) { return 1 - Math.pow(1 - t, 3); };
  function run(el) {
    var target = parseInt(el.getAttribute('data-count'), 10), t0 = null, wrap = el.closest('.num') || el;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / 1600);
      el.textContent = Math.round(ease(p) * target);
      if (p < 1) { requestAnimationFrame(step); return; }
      el.style.minWidth = el.style.textAlign = '';   /* its own width again, so the number sits flush with its label */
      if (wrap.animate) wrap.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.07)' }, { transform: 'scale(1)' }],
        { duration: 420, easing: 'cubic-bezier(.34,1.56,.64,1)' });
    }
    requestAnimationFrame(step);
  }
  /* set to zero only once it's sure to count, so a number is never left at 0 */
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); run(e.target); } });
  }, { threshold: 0.6 });
  nums.forEach(function (el) {
    var r = el.getBoundingClientRect();
    if (r.top < innerHeight * 0.9 && r.bottom > 0) return;   /* already on screen at load: leave it final */
    /* the count keeps its final width while it climbs, so nothing beside it moves */
    el.style.display = 'inline-block'; el.style.minWidth = (r.width / parseFloat(getComputedStyle(el).fontSize)).toFixed(4) + 'em'; el.style.textAlign = 'right';
    el.textContent = '0';
    io.observe(el);
  });
})();
