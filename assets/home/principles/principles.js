/* ============================================================
   khyzr.com homepage — Principles: the spine.
   A pointer, focus or a tap opens a principle (aria-expanded
   follows); Integrity rests open, as the markup says. A closed one's
   line is hidden until found, and find-in-page opens it.
   A pillar is a control only on the spine. Stacked (under 1000px)
   every principle reads and nothing opens, so there it is plain
   text: no role, no tab stop, no "collapsed" over words in full view.
   A pointer opens a pillar when a hand moves it there and stays a
   moment: not when the page scrolls under it or the pillars move
   under it, and not on the way across to another.
   ============================================================ */
(function () {
  'use strict';
  var d = document.querySelector('.hs-principles');
  if (!d) return;

  var pps = [].slice.call(d.querySelectorAll('.pp'));
  var lines = pps.map(function (p) { return p.querySelector('.d'); });
  var spine = matchMedia('(min-width: 1000px)');

  /* on the spine a closed principle's line is hidden until found: find-in-page can reach it, and finding it opens
     that principle (so aria-expanded tells the truth). Stacked, every one reads. */
  function hide() {
    pps.forEach(function (p, k) {
      var l = lines[k];
      if (!l) return;
      if (spine.matches && !p.classList.contains('on')) l.setAttribute('hidden', 'until-found'); else l.removeAttribute('hidden');
    });
  }
  /* an open name lifts by its own line's height (--dh). A hidden line has none, so each is shown for the reading */
  function measure() {
    if (!spine.matches) { hide(); return; }
    lines.forEach(function (l) { if (l) l.removeAttribute('hidden'); });
    var hs = lines.map(function (l) { return l ? l.offsetHeight : 0; });
    pps.forEach(function (p, k) { if (hs[k]) p.style.setProperty('--dh', hs[k] + 'px'); });
    hide();
  }
  function dress() {
    pps.forEach(function (p) {
      if (spine.matches) { p.setAttribute('role', 'button'); p.setAttribute('tabindex', '0'); p.setAttribute('aria-expanded', p.classList.contains('on') ? 'true' : 'false'); }
      else { p.removeAttribute('role'); p.removeAttribute('tabindex'); p.removeAttribute('aria-expanded'); }
    });
  }
  function open(i) {
    pps.forEach(function (p, k) { p.classList.toggle('on', k === i); });
    dress(); hide();
  }
  lines.forEach(function (l, k) { if (l) l.addEventListener('beforematch', function () { open(k); }); });

  /* the pointer: a move the hand made (the screen position changed), held on one pillar for a moment */
  var row = d.querySelector('.row'), sx = -1, sy = -1, want = -1, timer = 0;
  function drop() { clearTimeout(timer); want = -1; }
  if (row) {
    row.addEventListener('mousemove', function (e) {
      if (e.screenX === sx && e.screenY === sy) return;
      sx = e.screenX; sy = e.screenY;
      var p = e.target.closest ? e.target.closest('.pp') : null, i = pps.indexOf(p);
      if (i < 0 || p.classList.contains('on')) { drop(); return; }
      if (i === want) return;
      drop(); want = i;
      timer = setTimeout(function () { want = -1; open(i); }, 90);
    });
    row.addEventListener('mouseleave', drop);
  }
  pps.forEach(function (p, i) {
    p.addEventListener('focus', function () { drop(); open(i); });
    p.addEventListener('click', function () { drop(); open(i); });
    p.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); drop(); open(i); } });
  });

  /* a window being resized: the measures change under the open pillar, so it is held still while they are read
     again (the stylesheet's .still), or its name would travel through its line */
  var queued = false;
  function settle() { d.classList.remove('still'); }
  function remeasure() { queued = false; measure(); requestAnimationFrame(function () { if (!queued) requestAnimationFrame(settle); }); }
  function resized() { d.classList.add('still'); dress(); if (!queued) { queued = true; requestAnimationFrame(remeasure); } }
  addEventListener('resize', resized);
  if (spine.addEventListener) spine.addEventListener('change', resized);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

  var rest = pps.findIndex(function (p) { return p.classList.contains('on'); });
  open(rest < 0 ? 0 : rest);
  measure();
})();
