/* ============================================================
   khyzr.com — the legal documents' contents (8 Oct 2026). The
   list follows the reading: the section at the top of the window
   is marked in it, and on a phone, where the list is one line,
   that line keeps the marked entry in view. An entry that was
   followed stays marked until the page is scrolled by hand: the
   last sections are short, and the page ends before they reach
   the top. Without this script the contents are plain links.
   ============================================================ */
(function () {
  'use strict';
  var toc = document.querySelector('.lg-toc');
  if (!toc) return;
  var links = [].slice.call(toc.querySelectorAll('ol a'));
  var secs = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
  if (!links.length || secs.indexOf(null) > -1) return;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cur = -1, held = -1, queued = false;

  function mark(i) {
    if (i === cur) return;
    if (cur > -1) links[cur].removeAttribute('aria-current');
    cur = i;
    if (i < 0) return;
    links[i].setAttribute('aria-current', 'location');
    /* one line on a phone: bring the entry to the line's start */
    if (toc.scrollWidth > toc.clientWidth + 1) {
      var left = links[i].getBoundingClientRect().left - toc.getBoundingClientRect().left + toc.scrollLeft - parseFloat(getComputedStyle(toc).paddingLeft);
      toc.scrollTo({ left: Math.max(0, left), behavior: reduced ? 'auto' : 'smooth' });
    }
  }
  function read() {
    queued = false;
    if (held > -1) { mark(held); return; }
    /* the reading line: a little under where a section lands when its entry is followed */
    var line = (parseFloat(getComputedStyle(secs[0]).scrollMarginTop) || 0) + 56, i = -1;
    for (var k = 0; k < secs.length; k++) if (secs[k].getBoundingClientRect().top <= line) i = k;
    /* read down to the page's foot, the last section is the one in hand */
    if (i > -1 && innerHeight + scrollY >= document.documentElement.scrollHeight - 2) i = secs.length - 1;
    mark(i);
  }
  function queue() { if (!queued) { queued = true; requestAnimationFrame(read); } }
  function hold(i) { held = i; queue(); }
  function release() { if (held > -1) { held = -1; queue(); } }

  links.forEach(function (a, i) { a.addEventListener('click', function () { hold(i); }); });
  /* arriving on a section's address, or going back to one */
  function fromHash() { var i = secs.indexOf(document.getElementById(location.hash.slice(1))); if (i > -1) hold(i); }
  addEventListener('hashchange', fromHash);
  /* a hand on the page lets go of it */
  ['wheel', 'touchmove'].forEach(function (t) { addEventListener(t, release, { passive: true }); });
  addEventListener('keydown', function (e) { if (/^(Arrow(Up|Down)|Page(Up|Down)|Home|End| )$/.test(e.key)) release(); });
  addEventListener('mousedown', function (e) { if (!toc.contains(e.target)) release(); });

  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  fromHash();
  read();
})();
