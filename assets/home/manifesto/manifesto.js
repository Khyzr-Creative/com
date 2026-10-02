/* Manifesto — Letterpress entry (ported from labs/sections/manifesto/d1.js).
   Splits the entry into words (inline-blocks, so each can carry its own
   clip), clones it as the blind impression underneath, and numbers the
   lines so the ink can rise one line after another. The motion itself is
   CSS, keyed off .go (added once the section is .is-in and the entry is in
   view), so reduced motion comes for free.
   The few helpers it needs from the lab's manifesto kit live inside this
   closure: no globals. */
(function () {
  'use strict';
  var d = document.querySelector('.hs-manifesto');
  if (!d) return;
  var MK = {};
  MK.reduced = window.HS ? window.HS.reduced : matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Wrap every word inside `root` in <span class="cls">, keeping any
     inline elements (em, span…) around them. Spaces stay text nodes, so
     line breaking is unchanged. Returns the spans in reading order. */
  MK.splitWords = function (root, cls) {
    var out = [];
    (function walk(node) {
      [].slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          /* split on breaking whitespace only: a no-break space keeps its words together */
          var parts = n.textContent.split(/([ \t\n\r\f]+)/);
          if (parts.length === 1 && !parts[0]) return;
          var frag = document.createDocumentFragment();
          parts.forEach(function (p) {
            if (!p) return;
            if (/^[ \t\n\r\f]+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
            var s = document.createElement('span');
            s.className = cls;
            s.textContent = p;
            frag.appendChild(s);
            out.push(s);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1) walk(n);
      });
    })(root);
    return out;
  };

  /* Give each element a line index (by its offsetTop) as --l and data-l. */
  MK.lineIndex = function (els) {
    var top = null, l = -1;
    els.forEach(function (e) {
      var t = e.getBoundingClientRect().top;
      if (top === null || Math.abs(t - top) > 3) { l++; top = t; }
      e.style.setProperty('--l', l);
      e.dataset.l = l;
    });
    return l + 1;
  };

  /* Call fn once fonts are ready, then again on (debounced) width changes. */
  MK.layout = function (fn) {
    var w = innerWidth, tid = 0;
    var go = function () { try { fn(); } catch (e) { console.error(e); } };
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(go);
    addEventListener('resize', function () {
      clearTimeout(tid);
      tid = setTimeout(function () { if (innerWidth !== w) { w = innerWidth; go(); } else go(); }, 120);
    });
  };

  /* Entrances that need to be seen: add .go to the section once it is .is-in
     AND `el` is at least `ratio` visible.
     Under reduced motion .go is there from the start (final states). */
  MK.gate = function (d, el, ratio, onGo) {
    var seen = false, armed = false;
    function go() { if (armed && seen && !d.classList.contains('go')) { d.classList.add('go'); if (onGo) onGo(); } }
    if (MK.reduced || !('IntersectionObserver' in window)) { d.classList.add('go'); if (onGo) onGo(); return; }
    new IntersectionObserver(function (es) {
      seen = es[0].intersectionRatio >= ratio - 0.001 ||
        es[0].intersectionRect.height >= innerHeight * 0.62;       /* tall elements: most of the screen */
      go();
    }, { threshold: [0, ratio, 1] }).observe(el);
    d.addEventListener('hs:enter', function () { armed = true; go(); });
    if (d.classList.contains('is-in')) armed = true;
  };

  var ink = d.querySelector('.ink');
  var words = MK.splitWords(ink, 'w');
  var blind = ink.cloneNode(true);
  blind.className = 'blind';
  blind.setAttribute('aria-hidden', 'true');
  ink.parentNode.insertBefore(blind, ink);
  var bwords = [].slice.call(blind.querySelectorAll('.w'));
  MK.layout(function () {
    MK.lineIndex(words);
    bwords.forEach(function (w, i) { w.style.setProperty('--l', words[i].dataset.l); });
  });
  MK.gate(d, d.querySelector('.entry'), 0.33);   /* a third of the line on screen (was .85, which kept it blank too long) */
})();
