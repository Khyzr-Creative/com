/* ============================================================
   khyzr.com homepage · Case studies · The wall
   From the case studies lab, design 3 (Cisco's pick, 8 Oct 2026;
   the lab is in the archive, labs khyzr-com/cases-lab/). Hooks come
   from assets/home/hs.js (hs:enter, HS.reduced).

   Six tiles on one slab. The markup holds them written open, which
   is how they read without this script (cases.css, its last block).
   This script is the mason: it makes each tile's head a control,
   shuts the six, reads the wall's width, picks one of three
   compositions (three columns of two, two columns of three, one
   column of six), and places every tile in px. A composition is
   columns of tiles with weights, so a tile only ever shares edges
   with the same neighbours: opening one moves seams and nothing else.

     at rest    the columns split the width by weight, each column's
                tiles split the height by weight
     one open   its column takes the width the others leave (they go
                narrow), it takes the height its column-mates leave
                (they become bands); the wall grows taller only when
                the study needs more than the wall has
     one column a tile opens to its own height and the rest move
                down; any number may stand open, so nothing above a
                finger ever closes under it

   A tile's words are given their final width at once and the tile is
   a window that slides open over them (cases.css); a tile whose mode
   changes drops its words for an eighth of a second while they are
   re-set. The arrival, on the section's moment (hs:enter): six even
   tiles, then the seams find the composition. At rest a tile under a
   mouse, or under a keyboard's focus, weighs a little more and its
   seams lean out.
   ============================================================ */
(function () {
  'use strict';
  var sec = document.querySelector('.hs-cases');
  if (!sec) return;
  var wall = sec.querySelector('.wall'), probe = sec.querySelector('.pr');
  if (!wall || !probe) return;
  var reduced = window.HS ? HS.reduced : matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* the compositions: columns left to right, [study, its weight in the column, 'l' for the larger type] top to bottom.
     One column is the markup's own order, which is also the tab order: an anchor first and an anchor last. */
  var COMP = {
    3: [
      { w: 5, t: [['zamil-ac', 7, 'l'], ['pax-beneficia', 5, 'l']] },
      { w: 3, t: [['focus-expo', 5], ['campus-cloud', 7]] },
      { w: 4, t: [['olive-burger', 4], ['gem-center', 8]] }
    ],
    2: [
      { w: 7, t: [['zamil-ac', 5, 'l'], ['pax-beneficia', 3.4, 'l'], ['campus-cloud', 3.6, 'l']] },
      { w: 5, t: [['focus-expo', 3.2], ['olive-burger', 3.6], ['gem-center', 5.2]] }
    ],
    1: null
  };
  var SEAM = 1, LEAN = 1.13;
  var RING = '<span class="rg" aria-hidden="true"><svg viewBox="0 0 12 12"><path d="M6 .5v11M.5 6h11"/></svg></span>';

  function sum(a) { return a.reduce(function (x, y) { return x + y; }, 0); }
  /* whole pixels, so no seam is ever half a pixel wide */
  function split(total, weights) {
    var usable = total - SEAM * (weights.length - 1), all = sum(weights), acc = 0, used = 0;
    return weights.map(function (w) { acc += w; var edge = Math.round(usable * acc / all), size = edge - used; used = edge; return size; });
  }

  var T = {}, tiles = [].map.call(wall.querySelectorAll('.t'), function (el) {
    var id = el.getAttribute('data-id');
    return (T[id] = { id: id, el: el, inn: el.querySelector('.c'), btn: null, mode: 'rest', w: 0 });
  });
  COMP[1] = [{ w: 1, t: tiles.map(function (t) { return [t.id, 1, t.id === 'zamil-ac' || t.id === 'pax-beneficia' ? 'l' : '']; }) }];
  /* the compositions and the markup name the same six, or the wall stays as the markup has it */
  function same(comp) {
    var ids = [].concat.apply([], comp.map(function (c) { return c.t.map(function (tt) { return tt[0]; }); }));
    return ids.length === tiles.length && ids.every(function (id) { return !!T[id]; });
  }
  if (!tiles.length || !same(COMP[3]) || !same(COMP[2])) return;

  /* each head becomes the tile's control: the client and the title are its name, the state is aria-expanded */
  tiles.forEach(function (t) {
    var name = t.el.querySelector('.tb'), panel = t.el.querySelector('.bt'), b = document.createElement('button');
    b.className = 'tb'; b.type = 'button'; b.id = name.id;
    b.setAttribute('aria-expanded', 'false');
    if (panel && panel.id) b.setAttribute('aria-controls', panel.id);
    while (name.firstChild) b.appendChild(name.firstChild);
    b.insertAdjacentHTML('beforeend', RING);
    name.parentNode.replaceChild(b, name);
    t.btn = b;
    t.el.classList.remove('m-open');
    t.el.classList.add('m-rest');
  });
  /* the wall is this script's from here; nothing moves while it is first laid */
  sec.classList.add('live', 'nt');

  var open = [];            /* the studies standing open, the latest last (only a column of six keeps more than one) */
  var n = 0, lastW = -1, entered = false;
  var hover = null, focus = null;   /* the tile under a mouse, the tile a keyboard is on: at rest, that tile leans */
  var swapTimer = 0;
  var canHover = !!(window.matchMedia && matchMedia('(hover:hover)').matches);

  function measures() {
    var cs = getComputedStyle(probe);
    return { W: wall.offsetWidth, H: Math.round(parseFloat(cs.height)), nw: Math.round(parseFloat(cs.width)), bh: Math.round(parseFloat(cs.paddingTop)),
      rem: parseFloat(getComputedStyle(document.documentElement).fontSize) || 16 };
  }
  function setMode(t, mode) {
    var c = t.el.classList;
    c.remove('m-rest', 'm-open', 'm-narrow', 'm-band');
    c.add('m-' + mode);
    t.mode = mode;
  }
  /* how tall a tile's words stand in a mode at a width: set them so, read, and put them back before anything is painted */
  function measure(t, mode, w) {
    var pm = t.mode, pw = t.w, s = t.inn.style;
    setMode(t, mode); s.width = w + 'px'; s.height = 'auto';
    var h = t.inn.offsetHeight;
    setMode(t, pm); s.width = pw ? pw + 'px' : ''; s.height = '';
    return h;
  }

  /* where every tile stands: { H, r: { id: { x, y, w, h, cw, mode } } }, cw being the width its words are set to.
     even: the arrival's first state, all weights one.
     lean: at rest, the study whose column and whose place in it weigh a little more. */
  function plan(m, even, lean) {
    var comp = COMP[n], P = { H: 0, r: {} };
    if (n === 1) {
      var top = 0;
      comp[0].t.forEach(function (tt) {
        var mode = open.indexOf(tt[0]) >= 0 ? 'open' : 'rest', h = measure(T[tt[0]], mode, m.W);
        P.r[tt[0]] = { x: 0, y: top, w: m.W + 1, cw: m.W, h: h, mode: mode };
        top += h + SEAM;
      });
      P.H = top - SEAM;
      return P;
    }
    var oid = open.length ? open[open.length - 1] : null, oc = -1;
    comp.forEach(function (c, i) { if (c.t.some(function (tt) { return tt[0] === oid; })) oc = i; });
    var widths, H = m.H;
    if (oc >= 0 || even) lean = null;
    function leans(c) { return !!lean && c.t.some(function (tt) { return tt[0] === lean; }); }
    if (oc < 0) widths = split(m.W, comp.map(function (c) { return even ? 1 : c.w * (leans(c) ? LEAN : 1); }));
    else {
      widths = comp.map(function () { return m.nw; });
      widths[oc] = m.W - (SEAM + m.nw) * (n - 1);
      var mates = comp[oc].t.length - 1;
      H = Math.max(H, measure(T[oid], 'open', widths[oc]) + mates * (m.bh + SEAM));
    }
    var x = 0;
    comp.forEach(function (c, i) {
      var hs;
      if (i === oc) hs = c.t.map(function (tt) { return tt[0] === oid ? H - (c.t.length - 1) * (m.bh + SEAM) : m.bh; });
      else hs = split(H, c.t.map(function (tt) { return even ? 1 : tt[1] * (tt[0] === lean ? LEAN : 1); }));
      var y = 0, last = i === comp.length - 1;
      c.t.forEach(function (tt, k) {
        /* the last column runs a pixel past the slab, which clips it: no sliver where the slab's width is not whole */
        P.r[tt[0]] = { x: x, y: y, w: widths[i] + (last ? 1 : 0), cw: widths[i], h: hs[k],
          mode: oc < 0 ? 'rest' : i !== oc ? 'narrow' : tt[0] === oid ? 'open' : 'band' };
        y += hs[k] + SEAM;
      });
      x += widths[i] + SEAM;
    });
    P.H = H;
    return P;
  }

  /* place the tiles. P is where they go; C, when given, is how their words are set (the arrival sets them for the
     composition while the tiles still stand even). Moving, a tile whose words must be re-set drops them first. */
  function apply(P, move, C) {
    C = C || P;
    clearTimeout(swapTimer);
    wall.style.height = P.H + 'px';
    var change = [];
    tiles.forEach(function (t) {
      var r = P.r[t.id], c = C.r[t.id], s = t.el.style;
      s.left = r.x + 'px'; s.top = r.y + 'px'; s.width = r.w + 'px'; s.height = r.h + 'px';
      if (t.mode !== c.mode || t.w !== c.cw) change.push(t);
    });
    function settle() {
      tiles.forEach(function (t) {
        var c = C.r[t.id];
        setMode(t, c.mode);
        t.w = c.cw; t.inn.style.width = c.cw + 'px';
        t.el.classList.remove('sw');
      });
    }
    if (!move || !change.length) { settle(); return; }
    tiles.forEach(function (t) { t.el.classList.toggle('sw', change.indexOf(t) >= 0); });
    swapTimer = setTimeout(settle, 130);
  }

  /* read the wall and lay it. move: let the seams slide (a click); otherwise at once (a new width, the fonts arriving). */
  function lay(move) {
    var m = measures(), was = n;
    n = m.W >= 68 * m.rem ? 3 : m.W >= 38 * m.rem ? 2 : 1;
    if (n !== was) {
      sec.classList.remove('w1', 'w2', 'w3'); sec.classList.add('w' + n);
      m = measures();       /* the composition sets the wall's own measures */
      if (n > 1 && open.length > 1) open = [open[open.length - 1]];
      /* and which tiles carry the larger type, before anything is measured */
      COMP[n].forEach(function (c) { c.t.forEach(function (tt) { if (tt[2]) T[tt[0]].el.setAttribute('data-s', tt[2]); else T[tt[0]].el.removeAttribute('data-s'); }); });
    }
    lastW = m.W;
    tiles.forEach(function (t) { t.btn.setAttribute('aria-expanded', open.indexOf(t.id) >= 0 ? 'true' : 'false'); });
    var still = !move || reduced || n !== was;
    if (still) sec.classList.add('nt');
    var P = plan(m, false), lean = n > 1 && !open.length && !reduced ? (hover || focus) : null;
    sec.classList.toggle('ln', move === 'lean');                 /* a lean is quicker than an opening (cases.css) */
    if (!entered && !reduced) apply(plan(m, true), false, P);
    else if (lean) apply(plan(m, false, lean), !still, P);       /* the seams move; the words stay as the composition set them */
    else apply(P, !still);
    if (still) { void wall.offsetWidth; sec.classList.remove('nt'); }
    return { P: P, rem: m.rem };
  }
  /* a study opened from lower down the wall can take its place with its head above the window: bring the head back */
  function reveal(id, L) {
    var top = wall.getBoundingClientRect().top + L.P.r[id].y, safe = 5.5 * L.rem;
    if (top >= safe) return;
    var y = Math.max(0, window.pageYOffset + top - safe);
    if (!reduced && window.Glide && typeof window.Glide.to === 'function') window.Glide.to(y);
    else window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
  }
  function leanTo(which, id) {
    var was = hover || focus;
    if (which === 'hover') hover = id; else focus = id;
    if ((hover || focus) !== was && entered && !reduced && n > 1 && !open.length) lay('lean');
  }

  function toggle(id) {
    var i = open.indexOf(id);
    if (i >= 0) open.splice(i, 1);
    else if (n > 1) open = [id];
    else open.push(id);
    var L = lay(true);
    if (i < 0 && n > 1) reveal(id, L);
  }

  /* every listener is on the section's own elements, bound once */
  wall.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.tb');
    if (!b || !wall.contains(b)) return;
    /* Safari leaves a clicked button without focus: give it, so Escape finds the study the click opened */
    if (document.activeElement !== b) b.focus({ preventScroll: true });
    toggle(b.closest('.t').getAttribute('data-id'));
  });
  /* Escape closes the open study and leaves focus on its control */
  sec.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !open.length) return;
    var at = document.activeElement && document.activeElement.closest ? document.activeElement.closest('.hs-cases .t') : null;
    var id = at && open.indexOf(at.getAttribute('data-id')) >= 0 ? at.getAttribute('data-id') : n > 1 ? open[open.length - 1] : null;
    if (!id) return;
    e.preventDefault();
    toggle(id);
    T[id].btn.focus({ preventScroll: true });
  });
  wall.addEventListener('pointerover', function (e) {
    if (!canHover || e.pointerType !== 'mouse') return;
    var t = e.target.closest && e.target.closest('.t');
    leanTo('hover', t ? t.getAttribute('data-id') : null);
  });
  wall.addEventListener('pointerleave', function () { leanTo('hover', null); });
  wall.addEventListener('focusin', function (e) {
    if (!entered) arrive();       /* a control that has the focus never stands on a wall still waiting to arrive */
    var b = e.target.closest && e.target.closest('.tb'), seen = false;
    try { seen = !!b && b.matches(':focus-visible'); } catch (x) {}
    leanTo('focus', seen ? b.closest('.t').getAttribute('data-id') : null);
  });
  wall.addEventListener('focusout', function () { leanTo('focus', null); });

  lay(false);

  /* a new width re-lays the wall; its own height changing does not */
  if ('ResizeObserver' in window) new ResizeObserver(function () { if (wall.offsetWidth !== lastW) lay(false); }).observe(wall);
  /* Outfit arriving changes how tall the words stand, which only matters where a tile's height is its words' */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (n === 1 || open.length) lay(false); });

  /* the arrival, once, on the section's moment (hs.js: a little of the wall on screen) */
  function arrive() {
    if (entered) return;
    entered = true;
    if (reduced) { wall.classList.add('on'); lay(false); return; }
    /* the seams find the composition, and the words come up once the tiles have most of their shape */
    sec.style.setProperty('--cd', '.5s');
    wall.classList.add('on');
    lay(true);
    setTimeout(function () { sec.style.removeProperty('--cd'); }, 1300);
  }
  sec.addEventListener('hs:enter', arrive);
  if (sec.classList.contains('is-in') || !window.HS) arrive();
})();
