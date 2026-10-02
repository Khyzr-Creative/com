/* ============================================================
   khyzr.com homepage — Principles: the spine and the word scrub.
   Hover, focus or a tap opens a principle (aria-expanded follows);
   Integrity rests open, as the markup says. A closed one's words are
   hidden until found, and find-in-page opens it. The quote's words come
   up from .3 to full as it scrolls from 92% to 55% of the viewport;
   under reduced motion it simply reads.
   ============================================================ */
(function () {
  'use strict';
  var d = document.querySelector('.hs-principles');
  if (!d) return;
  var reduced = window.HS ? HS.reduced : matchMedia('(prefers-reduced-motion: reduce)').matches;

  var pps = [].slice.call(d.querySelectorAll('.pp'));
  /* on the spine a closed principle's words are hidden until found: find-in-page can reach them, and finding
     them opens that principle (so aria-expanded tells the truth). Stacked, every one reads. */
  var spine = matchMedia('(min-width: 861px)');
  var bodies = pps.map(function (p) { return p.querySelector('.b'); });
  function hide() {
    pps.forEach(function (p, k) {
      var b = bodies[k];
      if (!b) return;
      if (spine.matches && !p.classList.contains('on')) b.setAttribute('hidden', 'until-found'); else b.removeAttribute('hidden');
    });
  }
  function open(i) {
    pps.forEach(function (p, k) { p.classList.toggle('on', k === i); p.setAttribute('aria-expanded', k === i ? 'true' : 'false'); });
    hide();
  }
  bodies.forEach(function (b, k) { if (b) b.addEventListener('beforematch', function () { open(k); }); });
  if (spine.addEventListener) spine.addEventListener('change', hide);
  pps.forEach(function (p, i) {
    p.addEventListener('mouseenter', function () { open(i); });
    p.addEventListener('focus', function () { open(i); });
    p.addEventListener('click', function () { open(i); });
  });
  var rest = pps.findIndex(function (p) { return p.getAttribute('aria-expanded') === 'true'; });
  open(rest < 0 ? 0 : rest);

  /* the word scrub */
  var q = d.querySelector('.quote');
  if (!q || reduced) return;
  var words = [];
  var walker = document.createTreeWalker(q, NodeFilter.SHOW_TEXT), nodes = [];
  while (walker.nextNode()) if (walker.currentNode.nodeValue.trim()) nodes.push(walker.currentNode);
  nodes.forEach(function (n) {
    var frag = document.createDocumentFragment();
    n.nodeValue.split(/(\s+)/).forEach(function (tok) {
      if (!tok) return;
      if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(tok)); return; }
      var s = document.createElement('span'); s.textContent = tok; s.style.transition = 'opacity .25s ease';
      frag.appendChild(s); words.push(s);
    });
    n.parentNode.replaceChild(frag, n);
  });
  var last = -1, tick = false, qTop = 0;
  /* the quote's place in the page, kept whenever its size changes, so a scroll never has to measure */
  function place() { qTop = q.getBoundingClientRect().top + scrollY; }
  function frame() {
    tick = false;
    var top = qTop - scrollY, start = innerHeight * 0.92, end = innerHeight * 0.55;
    var p = Math.min(1, Math.max(0, (start - top) / (start - end)));
    if (p === last) return;
    last = p;
    for (var i = 0, n = words.length; i < n; i++) {
      var t = Math.min(1, Math.max(0, p * (n + 2) - i));
      words[i].style.opacity = (0.3 + 0.7 * t).toFixed(3);
    }
  }
  addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(frame); } }, { passive: true });
  function again() { place(); frame(); }
  addEventListener('resize', again);
  if ('ResizeObserver' in window) new ResizeObserver(again).observe(document.body);
  again();
})();
