/* ============================================================
   khyzr.com homepage — Disciplines: the green face.
   Under a pointer a card is covered in green from its foot up, and
   its words stay whole while the edge passes through them: ink above
   it, white below. So each card gets a second face, the same card set
   on green, lying over the first and uncovered from the foot
   (disciplines.css). It is a picture of the card and not a second copy
   of its words: hidden from readers, its name and its line drawn by the
   stylesheet from the card's own (data-t), so a search finds each once
   and nothing in it can be selected; its icon is the card's, cloned.
   Nothing is measured: both faces are set by the same rules. Without
   this script the cards stand as they are and nothing answers a pointer.
   ============================================================ */
(function () {
  'use strict';
  var s = document.querySelector('.hs-disciplines');
  if (!s) return;
  /* a face is set by this module's stylesheet. Where a browser still holds an older copy of it (the page links it
     without a version), a face would stand unstyled inside its card: so none is built unless the stylesheet in the
     page is the one that knows it (--seam is its first measure) */
  if (!getComputedStyle(s).getPropertyValue('--seam')) return;
  function el(cls, text) {
    var e = document.createElement('span');
    e.className = cls;
    if (text != null) e.setAttribute('data-t', text);
    return e;
  }
  [].forEach.call(s.querySelectorAll('.card'), function (card) {
    var name = card.querySelector('h3'), line = card.querySelector('p'), ic = card.querySelector('.ic');
    if (!name || !line || card.querySelector('.cv')) return;
    var cv = el('cv');
    cv.setAttribute('aria-hidden', 'true');
    if (ic) cv.appendChild(ic.cloneNode(true));
    cv.appendChild(el('n', name.textContent));
    cv.appendChild(el('l', line.textContent));
    card.appendChild(cv);
  });
})();
