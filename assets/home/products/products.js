/* ============================================================
   khyzr.com homepage — Products: the cuts open into their worlds.

   Design 2 of the products lab ("The meeting point") sets four cuts
   of the symbol edge to edge. Here each cut is a control: it opens
   its stage the way design 4 ("Through the icon",
   labs/sections/products/portal.js) opens an icon. The tile grows
   from its own place into a stage inset in the section, its bands
   sweep out past the stage's edges, and inside is the world. Design
   4 drove this from scroll; here it runs on time, about a second,
   on design 4's easing, and backwards to close.

     khyzr         One for All. The symbol tiling itself without end,
                   a lattice of rings, drifting; the light that ran
                   once round design 2's ring travels on, ring to ring.
     khyzr.ai      design 4's glyph field (worldAI, verbatim).
     khyzr.studio  design 4's construction lines and motes (worldST).
     the fourth    the blank page. The bands draw themselves in hairline
                   over the compass work that makes them; "khyzr." waits
                   with a caret; a pointer sketches quarter arcs on the
                   symbol's own grid and radii, which fade.

   One canvas, drawn only while a stage is open and on screen.
   Without this script, or without canvas roundRect, design 2 stands
   as the lab has it and nothing opens. Under reduced motion a stage
   fades in and out and its world holds a still frame.
   ============================================================ */
(function () {
  'use strict';
  var d = document.querySelector('.hs-products');
  if (!d) return;
  var reduced = window.HS ? !!window.HS.reduced : matchMedia('(prefers-reduced-motion: reduce)').matches;
  var stage = d.querySelector('.stage'), cv = stage && stage.querySelector('.cv');
  var ctx = cv && cv.getContext && cv.getContext('2d');
  if (!ctx || !ctx.roundRect) return;
  var inner = d.querySelector('.in'), art = d.querySelector('.art'), qbs = d.querySelector('.qbs'), tiles = d.querySelector('.tiles');
  if (!inner || !art || !qbs || !tiles) return;

  var Q = ['k', 'ai', 'st', 'nx'], btn = {}, cell = {}, panel = {};
  Q.forEach(function (q) {
    btn[q] = qbs.querySelector('[data-q="' + q + '"]');
    cell[q] = tiles.querySelector('.cell[data-q="' + q + '"]');
    panel[q] = stage.querySelector('.p-' + q);
  });
  qbs.hidden = false;
  var TAU = Math.PI * 2;

  /* ---------- the symbol (portal.js, verbatim) ---------- */
  var RII = 46.445312, RIO = 65.078125, ROI = 86.367188, ROO = 105.003906;
  var BANDS = [[0, 0, 0, 1, 0], [0, 0, 0, 0, 0], [0, 160, 1.5, 1, 1], [0, 160, 1.5, 0, 1], [160, 0, .5, 1, 1], [160, 0, .5, 0, 1], [160, 160, 1, 1, 2], [160, 160, 1, 0, 2]];
  function band(x, y, u, b) {
    var cx = x + b[0] * u, cy = y + b[1] * u, a0 = b[2] * Math.PI, a1 = a0 + Math.PI / 2;
    var r0 = (b[3] ? RII : ROI) * u, r1 = (b[3] ? RIO : ROO) * u;
    ctx.beginPath(); ctx.arc(cx, cy, r1, a0, a1); ctx.arc(cx, cy, r0, a1, a0, true); ctx.closePath();
    return (r1 - r0) * 2 + (r0 + r1) * Math.PI / 2;
  }
  function sym(x, y, s, cols) {
    var u = s / 160;
    for (var i = 0; i < 8; i++) { band(x, y, u, BANDS[i]); ctx.fillStyle = cols[BANDS[i][4]]; ctx.fill(); }
  }
  /* the empty one: paper bands with a hairline, drawn on with q (0..1) */
  function symLine(x, y, s, q, col) {
    var u = s / 160;
    ctx.lineWidth = 1.25; ctx.strokeStyle = col; ctx.lineJoin = 'round';
    for (var i = 0; i < 8; i++) {
      var len = band(x, y, u, BANDS[i]);
      ctx.fillStyle = '#FFFFFF'; ctx.fill();
      var k = Math.max(0, Math.min(1, q * 1.35 - i * .045));
      if (k <= 0) continue;
      ctx.setLineDash(k >= 1 ? [] : [len * k, len]);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  var CUT = {
    ai: { tile: '#022853', k: ['#7280FC', '#62A5FA', '#43F0F4'] },
    st: { tile: '#3B2300', k: ['#CC3E66', '#F38239', '#F7CD3A'] }
  };
  /* design 2's other two cuts: khyzr's own, and the fourth in line */
  CUT.k = { tile: '#043304', k: ['#136E13', '#149314', '#5CBA5C'] };
  CUT.nx = { tile: '#FFFFFF', line: '#0A690A' };

  /* ---------- the worlds (portal.js, verbatim) ---------- */
  var glyphs = null, gCell = 0;
  function makeGlyphs(cell) {
    /* sprites, drawn as marks rather than font glyphs: a dot, a tilde and an asterisk in khyzr.ai's ramp */
    gCell = cell; glyphs = {};
    var defs = { dot: ['dot', 'rgba(167,182,199,.42)'], t2: ['tilde', '#62A5FA'], t3: ['tilde', '#52CAF7'], t4: ['tilde', '#43F0F4'], s1: ['star', '#7280FC'], s2: ['star', '#62A5FA'] };
    for (var k in defs) {
      var c = document.createElement('canvas'), z = Math.ceil(cell * dpr);
      c.width = c.height = z;
      var g = c.getContext('2d'), h = cell / 2;
      g.scale(dpr, dpr);
      g.strokeStyle = g.fillStyle = defs[k][1];
      g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = Math.max(1.4, cell * .085);
      if (defs[k][0] === 'dot') { g.beginPath(); g.arc(h, h, Math.max(1, cell * .055), 0, Math.PI * 2); g.fill(); }
      else if (defs[k][0] === 'tilde') {
        var w = cell * .54, amp = cell * .1;
        g.beginPath();
        for (var i = 0; i <= 16; i++) { var x = h - w / 2 + w * i / 16, y = h - Math.sin(i / 16 * Math.PI * 2) * amp; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
        g.stroke();
      } else {
        var L = cell * .23;
        g.beginPath();
        for (var a = 0; a < 3; a++) { var an = a * Math.PI / 3 + Math.PI / 2; g.moveTo(h - Math.cos(an) * L, h - Math.sin(an) * L); g.lineTo(h + Math.cos(an) * L, h + Math.sin(an) * L); }
        g.stroke();
      }
      glyphs[k] = c;
    }
  }
  function worldAI(r, a, t) {
    var cell = Math.max(16, Math.min(26, Math.round(r.w / 56)));
    if (!glyphs || gCell !== cell) makeGlyphs(cell);
    var narrow = r.w < 640, cx = r.x + r.w * (narrow ? .5 : .64), cy = r.y + r.h * (narrow ? .34 : .46), maxd = Math.hypot(r.w, r.h) * .62;
    var cols = Math.ceil(r.w / cell), rows = Math.ceil(r.h / cell);
    var ox = r.x + (r.w - cols * cell) / 2, oy = r.y + (r.h - rows * cell) / 2;
    var sp = cell * 7.5, v = cell * 2.1, ph = t * v;
    /* the text block sits low left: the field quiets there */
    var tx = r.x + r.w * .02, ty = r.y + r.h * .98;
    for (var j = 0; j < rows; j++) {
      for (var i = 0; i < cols; i++) {
        var x = ox + i * cell, y = oy + j * cell;
        var dx = x + cell / 2 - cx, dy = y + cell / 2 - cy, dist = Math.sqrt(dx * dx + dy * dy);
        var fall = Math.max(0, 1 - dist / maxd);
        var q = Math.hypot((x - tx) / (r.w * .5), (y - ty) / (r.h * .62));
        var quiet = narrow ? Math.min(1, Math.max(0, (r.y + r.h * .6 - y) / (r.h * .14))) : Math.min(1, Math.max(0, (q - .55) / .45));
        var f = ((dist - ph) / sp) % 1; if (f < 0) f += 1;
        var ring = f < .2 ? Math.sin(f / .2 * Math.PI) : 0;
        var key = 'dot', al = (.35 + .65 * fall) * (.25 + .75 * quiet);
        if (ring > 0 && fall > .05) {
          var w = ring * fall;
          key = w > .55 ? 't4' : w > .4 ? 't3' : w > .26 ? 't2' : w > .14 ? 's2' : 's1';
          al = Math.min(1, .3 + w * 1.4) * (.2 + .8 * quiet);
        }
        ctx.globalAlpha = a * al;
        ctx.drawImage(glyphs[key], x, y, cell, cell);
      }
    }
    ctx.globalAlpha = 1;
  }
  var motes = [];
  for (var m = 0; m < 70; m++) motes.push({ x: Math.random(), y: Math.random(), z: .3 + Math.random() * .7, s: Math.random() * 6.28 });
  function worldST(r, a, t) {
    var cx = r.x + r.w * .68, cy = r.y + r.h * .45, R = Math.min(r.w * .3, r.h * .36);
    ctx.save();
    ctx.globalAlpha = a;
    /* a warm light behind the drawing */
    var gl = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.9);
    gl.addColorStop(0, 'rgba(248,167,50,.16)'); gl.addColorStop(1, 'rgba(248,167,50,0)');
    ctx.fillStyle = gl; ctx.fillRect(r.x, r.y, r.w, r.h);
    /* echo lines, 40px apart */
    ctx.lineWidth = 1;
    for (var e = 4; e >= 1; e--) { ctx.strokeStyle = 'rgba(144,135,128,' + (.30 - e * .055) + ')'; ctx.beginPath(); ctx.arc(cx, cy, R + e * 40, 0, Math.PI * 2); ctx.stroke(); }
    /* the drawn path, a circle drawn as four béziers, with its construction */
    var rot = t * .05, k = .5523 * R, P = [];
    for (var i = 0; i < 4; i++) { var ang = rot + i * Math.PI / 2; P.push([cx + Math.cos(ang) * R, cy + Math.sin(ang) * R, ang]); }
    ctx.strokeStyle = 'rgba(237,231,223,.82)'; ctx.lineWidth = 1.25;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1;
    for (i = 0; i < 4; i++) {
      var p = P[i], tg = [-Math.sin(p[2]), Math.cos(p[2])];
      var h1 = [p[0] - tg[0] * k, p[1] - tg[1] * k], h2 = [p[0] + tg[0] * k, p[1] + tg[1] * k];
      ctx.strokeStyle = 'rgba(144,135,128,.85)';
      ctx.beginPath(); ctx.moveTo(h1[0], h1[1]); ctx.lineTo(h2[0], h2[1]); ctx.stroke();
      [h1, h2].forEach(function (h) { ctx.beginPath(); ctx.arc(h[0], h[1], 3.2, 0, Math.PI * 2); ctx.fillStyle = '#3B2300'; ctx.fill(); ctx.strokeStyle = 'rgba(237,231,223,.7)'; ctx.stroke(); });
      ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(p[2] + Math.PI / 4);
      ctx.fillStyle = '#0E0C0A'; ctx.strokeStyle = '#F7CD3A'; ctx.lineWidth = 1.2;
      ctx.fillRect(-4.6, -4.6, 9.2, 9.2); ctx.strokeRect(-4.6, -4.6, 9.2, 9.2);
      ctx.restore();
    }
    /* motes: gold dust in a beam */
    for (i = 0; i < motes.length; i++) {
      var o = motes[i], mx = r.x + ((o.x + t * .004 * o.z) % 1) * r.w, my = r.y + ((o.y - t * .012 * o.z) % 1 + 1) % 1 * r.h;
      var tw = .5 + .5 * Math.sin(t * 1.3 + o.s);
      var near = Math.max(0, 1 - Math.hypot(mx - cx, my - cy) / (R * 2.2));
      ctx.globalAlpha = a * (.15 + .85 * near) * (.35 + .65 * tw);
      ctx.fillStyle = '#F7CD3A';
      ctx.beginPath(); ctx.arc(mx, my, .6 + 1.5 * o.z, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  /* ---------- One for All: khyzr's own world ----------
     The meeting point taken to its end: khyzr's cut set edge to edge without end, so every
     four tiles close a ring, a lattice of rings joined by their quarter-ring bridges, in
     khyzr's greens held low on green-900, drifting. The light that ran once round design 2's
     ring travels on: round a ring's outer band and, where that band crosses a neighbour's,
     over the bridge into the next ring. It passes under whatever band lies over it, lights
     each band in that band's own green, and warms the bands it passes. */
  var KC = CUT.k.k, KR = (ROI + ROO) / 2, KBW = ROO - ROI, KA = Math.acos(80 / KR);
  var KN = [[1, 0], [0, 1], [-1, 0], [0, -1]], KX = [];
  function nrm(a) { a %= TAU; return a < 0 ? a + TAU : a; }
  for (var n0 = 0; n0 < 4; n0++) KX.push({ a: nrm(n0 * Math.PI / 2 - KA), n: n0 }, { a: nrm(n0 * Math.PI / 2 + KA), n: n0 });
  function rgb(h) { var v = parseInt(h.slice(1), 16); return [v >> 16 & 255, v >> 8 & 255, v & 255]; }
  var KG = rgb(CUT.k.tile), KCr = KC.map(rgb), KW = rgb('#EFF7EF');
  function mixa(a, b, m) { return [Math.round(a[0] + (b[0] - a[0]) * m), Math.round(a[1] + (b[1] - a[1]) * m), Math.round(a[2] + (b[2] - a[2]) * m)]; }
  function rgba(c, al) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (al < 0 ? 0 : al > 1 ? 1 : al).toFixed(3) + ')'; }
  function tone(c, m) { return rgba(mixa(KG, KCr[c], m), 1); }
  /* lit: each band's own green, lifted toward green-050 */
  var KLIT = KCr.map(function (c) { return mixa(c, KW, .42); });
  var K = { Ls: 200, ox: 0, oy: 0, L: null, pts: [], tl: null, heat: {} };
  function kLayout() {
    var narrow = SW < 640;
    K.Ls = narrow ? Math.max(112, Math.min(150, SW * .38)) : Math.max(136, Math.min(206, Math.min(SW, SH) * .215));
    K.ox = SW * (narrow ? .5 : .64); K.oy = SH * (narrow ? .27 : .4);
  }
  function kPush() { var L = K.L; K.pts.push({ x: L.I * 160 + Math.cos(L.th) * KR, y: L.J * 160 + Math.sin(L.th) * KR, id: L.I + ',' + L.J, I: L.I, J: L.J }); }
  function kReset() {
    K.L = { I: 0, J: 0, th: -Math.PI / 2, s: 1, prev: null }; K.pts = []; K.tl = null; K.heat = {};
    if (reduced) { /* a still: the light held on the ring it starts from */
      K.L.th -= .95;
      for (var i = 0; i <= 40; i++) { K.L.th += .95 / 40; kPush(); }
    } else kPush();
  }
  function kTrim() {
    var P = K.pts, len = 0;
    for (var i = P.length - 1; i > 0; i--) {
      len += Math.hypot(P[i].x - P[i - 1].x, P[i].y - P[i - 1].y);
      if (len > 210) { P.splice(0, i - 1); return; }
    }
  }
  /* at a crossing: take the bridge, or keep round. Keep to the open part of the stage */
  function kChance(NI, NJ, V) {
    var L = K.L;
    var inN = Math.abs(NI * 160 - V.x) < V.hw && Math.abs(NJ * 160 - V.y) < V.hh;
    var inC = Math.abs(L.I * 160 - V.x) < V.hw && Math.abs(L.J * 160 - V.y) < V.hh;
    if (!inN) return inC ? 0 : (Math.hypot(NI * 160 - V.x, NJ * 160 - V.y) < Math.hypot(L.I * 160 - V.x, L.J * 160 - V.y) ? .9 : 0);
    if (!inC) return .9;
    return L.prev && L.prev[0] === NI && L.prev[1] === NJ ? .2 : .55;
  }
  function kStep(dist, V) {
    var L = K.L, guard = 0;
    while (dist > 1e-6 && guard++ < 24) {
      var th = nrm(L.th), best = null, bd = 1e9;
      for (var c = 0; c < 8; c++) {
        var da = L.s > 0 ? nrm(KX[c].a - th) : nrm(th - KX[c].a);
        if (da < 1e-6 || da > TAU - 1e-6) continue; /* the crossing it stands on */
        if (da < bd) { bd = da; best = KX[c]; }
      }
      if (!best || bd * KR >= dist) { L.th += L.s * dist / KR; break; }
      L.th += L.s * bd; dist -= bd * KR;
      kPush();
      var NI = L.I + KN[best.n][0], NJ = L.J + KN[best.n][1];
      if (Math.random() < kChance(NI, NJ, V)) {
        var px = L.I * 160 + Math.cos(L.th) * KR, py = L.J * 160 + Math.sin(L.th) * KR;
        var th2 = Math.atan2(py - NJ * 160, px - NI * 160);
        var tx = -Math.sin(L.th) * L.s, ty = Math.cos(L.th) * L.s;
        L.prev = [L.I, L.J]; L.I = NI; L.J = NJ;
        L.s = (-Math.sin(th2) * tx + Math.cos(th2) * ty) >= 0 ? 1 : -1; /* the way that turns least */
        L.th = th2;
        kPush();
      }
    }
    kPush();
  }
  /* the trail as runs, one per stretch on one ring: each is an arc of that ring's circle */
  function kRuns() {
    var P = K.pts, n = P.length, runs = [], R = null;
    for (var k = 0; k < n; k++) {
      var p = P[k], cx = p.I * 160, cy = p.J * 160, an = Math.atan2(p.y - cy, p.x - cx);
      if (!R || R.id !== p.id) { R = { id: p.id, I: p.I, J: p.J, k0: k, k1: k, a0: an, sw: 0, last: an }; runs.push(R); continue; }
      var da = an - R.last;
      if (da > Math.PI) da -= TAU; else if (da < -Math.PI) da += TAU;
      R.sw += da; R.last = an; R.k1 = k;
    }
    return runs;
  }
  /* the light on one ring's band: clipped to the band, so the bands over it stay over it; a conic
     gradient round the ring's centre fades it smoothly along the arc, tail to head */
  /* passes: [width (of the band), + px, colour (0: the band's own, lit), fall-off along the tail, strength] */
  var KPASS = [[1, 2, 0, .9, 1], [.7, 0, rgb('#DBF0DB'), 2, .55], [.36, 0, rgb('#FFFFFF'), 3.6, 1]];
  var KBLUR = 'filter' in ctx;
  function kLight(R, x, y, u, B, X0, Y0, a) {
    var n = K.pts.length - 1, span = Math.abs(R.sw);
    if (n < 1 || R.k1 === R.k0 || span < 1e-4 || !ctx.createConicGradient) return;
    var cx = X0 + R.I * 160 * u, cy = Y0 + R.J * 160 * u, start = R.sw >= 0 ? R.a0 : R.a0 + R.sw;
    var fs = (R.sw >= 0 ? R.k0 : R.k1) / n, fe = (R.sw >= 0 ? R.k1 : R.k0) / n, end = Math.min(1, span / TAU);
    ctx.save();
    band(x, y, u, B); ctx.clip();
    ctx.lineCap = 'butt';
    ctx.globalAlpha = a;
    for (var p = 0; p < 3; p++) {
      var S = KPASS[p], col = S[2] || KLIT[B[4]], g = ctx.createConicGradient(start, cx, cy);
      for (var i = 0; i <= 10; i++) { var q = i / 10, f = fs + (fe - fs) * q; g.addColorStop(q * end, rgba(col, S[4] * Math.pow(f, S[3]))); }
      if (end < 1) g.addColorStop(Math.min(1, end + 1e-4), rgba(col, 0));
      ctx.lineWidth = KBW * u * S[0] + S[1]; ctx.strokeStyle = g;
      if (p === 2 && KBLUR) ctx.filter = 'blur(' + Math.max(1.5, 2.2 * u) + 'px)'; /* soft, as design 2's glint */
      ctx.beginPath(); ctx.arc(cx, cy, KR * u, start, start + span); ctx.stroke();
      if (p === 2 && KBLUR) ctx.filter = 'none';
    }
    ctx.restore();
  }
  function worldK(r, a, t) {
    var Ls = K.Ls, u = Ls / 160, narrow = SW < 640;
    var X0 = K.ox - (reduced ? 0 : t * 6), Y0 = K.oy - (reduced ? 0 : t * 3.5);
    if (!reduced) {
      var dt = K.tl == null ? 0 : Math.min(.05, Math.max(0, t - K.tl)); K.tl = t;
      if (dt > 0 && t > .5) { /* the light sets out as the world comes up */
        var vx0 = narrow ? .22 : .4, vx1 = narrow ? .78 : .86, vy0 = narrow ? .14 : .2, vy1 = narrow ? .46 : .7;
        kStep(132 * dt, { x: ((vx0 + vx1) / 2 * SW - X0) / u, y: ((vy0 + vy1) / 2 * SH - Y0) / u, hw: (vx1 - vx0) / 2 * SW / u, hh: (vy1 - vy0) / 2 * SH / u });
        kTrim();
        /* the band the light is on keeps a glow after it, so its way from ring to ring reads */
        var L = K.L, qd = Math.floor(nrm(L.th) / (Math.PI / 2)) & 3;
        K.heat[[L.I + ',' + L.J + ',1', (L.I - 1) + ',' + L.J + ',5', (L.I - 1) + ',' + (L.J - 1) + ',7', L.I + ',' + (L.J - 1) + ',3'][qd]] = t;
        if (Math.random() < .02) for (var hk in K.heat) if (t - K.heat[hk] > 9) delete K.heat[hk];
      }
    }
    var P = K.pts, head = P[P.length - 1], hx = X0 + head.x * u, hy = Y0 + head.y * u, ids = {}, reach = Ls * 1.4, runs = kRuns();
    for (var n = 0; n < runs.length; n++) (ids[runs[n].id] = ids[runs[n].id] || []).push(runs[n]);
    ctx.save();
    ctx.globalAlpha = a;
    var i0 = Math.floor((r.x - X0) / Ls), i1 = Math.floor((r.x + r.w - X0) / Ls);
    var j0 = Math.floor((r.y - Y0) / Ls), j1 = Math.floor((r.y + r.h - Y0) / Ls);
    for (var j = j0; j <= j1; j++) {
      for (var i = i0; i <= i1; i++) {
        var x = X0 + i * Ls, y = Y0 + j * Ls;
        for (var b = 0; b < 8; b++) {
          var B = BANDS[b], am = B[2] * Math.PI + Math.PI / 4, rm = (B[3] ? RII + RIO : ROI + ROO) / 2 * u;
          var gx = x + B[0] * u + Math.cos(am) * rm - hx, gy = y + B[1] * u + Math.sin(am) * rm - hy;
          var near = Math.max(0, 1 - Math.sqrt(gx * gx + gy * gy) / reach);
          var ht = B[3] ? undefined : K.heat[i + ',' + j + ',' + b], heat = ht === undefined ? 0 : Math.exp(-(t - ht) / 1.9);
          band(x, y, u, B);
          ctx.fillStyle = tone(B[4], .26 + .22 * near * near + .24 * heat);
          ctx.fill();
          if (!B[3]) {
            var id = (i + (B[0] ? 1 : 0)) + ',' + (j + (B[1] ? 1 : 0));
            if (ids[id]) { for (n = 0; n < ids[id].length; n++) kLight(ids[id][n], x, y, u, B, X0, Y0, a); ctx.globalAlpha = a; }
          }
        }
      }
    }
    /* a breath of the light on the bands round it */
    var bl = ctx.createRadialGradient(hx, hy, 0, hx, hy, KBW * u * 2.6);
    bl.addColorStop(0, 'rgba(219,240,219,.22)'); bl.addColorStop(1, 'rgba(219,240,219,0)');
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = bl; ctx.fillRect(hx - KBW * u * 2.6, hy - KBW * u * 2.6, KBW * u * 5.2, KBW * u * 5.2);
    ctx.globalCompositeOperation = 'source-over';
    /* the words sit low left: the lattice quiets there */
    var g;
    if (narrow) { g = ctx.createLinearGradient(0, r.y + SH * .44, 0, r.y + SH * .8); g.addColorStop(0, 'rgba(4,51,4,0)'); g.addColorStop(1, 'rgba(4,51,4,.9)'); }
    else {
      var gr = Math.max(SW * .5, SH * .85);
      g = ctx.createRadialGradient(r.x + SW * .1, r.y + SH * .94, 0, r.x + SW * .1, r.y + SH * .94, gr);
      g.addColorStop(0, 'rgba(4,51,4,.94)'); g.addColorStop(.5, 'rgba(4,51,4,.66)'); g.addColorStop(1, 'rgba(4,51,4,0)');
    }
    ctx.fillStyle = g; ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.restore();
  }

  /* ---------- the blank page: the fourth ----------
     Paper, a khyzr-green hairline, and nothing else: the next product has no name, colour,
     mark or date. The symbol's eight bands draw themselves at stage scale, slowly, in its
     own order, over the compass work that makes them: the grid it sits on, each corner's
     centre and its four radii. A pointer moving over the page lays quarter arcs on the same
     grid and radii, as if sketching the next mark; they fade. */
  var INK = CUT.nx.line, RADII = [RII, RIO, ROI, ROO], NX = null, arcs = [];
  function nxLayout() {
    var narrow = SW < 640;
    var s = narrow ? Math.min(SW * .78, SH * .42) : Math.min(SH * .7, SW * .4);
    var cx = narrow ? SW / 2 : SW * .7, cy = narrow ? SH * .3 : SH * .47;
    NX = { s: s, x: cx - s / 2, y: cy - s / 2 };
  }
  function worldNX(r, a, t) {
    var s = NX.s, u = s / 160, x0 = NX.x, y0 = NX.y, now = performance.now(), i, j, c, k;
    ctx.save();
    ctx.lineWidth = 1; ctx.strokeStyle = INK; ctx.lineJoin = 'round';
    var ga = a * (reduced ? 1 : sm(seg(t, .1, 1.4)));
    if (ga > 0) {
      /* the grid the symbol is drawn on (the sketches snap to it): a cross at every corner */
      ctx.globalAlpha = ga * .34;
      ctx.beginPath();
      var i0 = Math.ceil((r.x - x0) / s), i1 = Math.floor((r.x + r.w - x0) / s), j0 = Math.ceil((r.y - y0) / s), j1 = Math.floor((r.y + r.h - y0) / s);
      for (j = j0; j <= j1; j++) for (i = i0; i <= i1; i++) { var vx = x0 + i * s, vy = y0 + j * s; ctx.moveTo(vx - 5, vy); ctx.lineTo(vx + 5, vy); ctx.moveTo(vx, vy - 5); ctx.lineTo(vx, vy + 5); }
      ctx.stroke();
      /* the square it fills */
      ctx.globalAlpha = ga * .3; ctx.setLineDash([2, 6]); ctx.strokeRect(x0, y0, s, s); ctx.setLineDash([]);
      /* the compass: round each corner's centre, its four radii */
      ctx.globalAlpha = ga * .1;
      ctx.beginPath();
      for (c = 0; c < 4; c++) { var cx = x0 + (c & 1) * s, cy = y0 + (c >> 1) * s; for (k = 0; k < 4; k++) { ctx.moveTo(cx + RADII[k] * u, cy); ctx.arc(cx, cy, RADII[k] * u, 0, TAU); } }
      ctx.stroke();
      /* and its leg, from each centre into its quarter, ticked where the radii fall */
      ctx.globalAlpha = ga * .3;
      ctx.beginPath();
      for (c = 0; c < 4; c++) {
        var lx = x0 + (c & 1) * s, ly = y0 + (c >> 1) * s, an = [1, 3, -1, -3][c] * Math.PI / 4, ux = Math.cos(an), uy = Math.sin(an);
        ctx.moveTo(lx, ly); ctx.lineTo(lx + ux * ROO * u, ly + uy * ROO * u);
        for (k = 0; k < 4; k++) { var px = lx + ux * RADII[k] * u, py = ly + uy * RADII[k] * u; ctx.moveTo(px - uy * 4, py + ux * 4); ctx.lineTo(px + uy * 4, py - ux * 4); }
      }
      ctx.stroke();
    }
    /* the bands, inked one after another, slowly; the paper closes over the compass work as each is drawn */
    for (var b = 0; b < 8; b++) {
      var q = reduced ? 1 : sm(seg(t, .9 + b * .38, 3.1 + b * .38));
      if (q <= 0) continue;
      var len = band(x0, y0, u, BANDS[b]);
      ctx.globalAlpha = a * q; ctx.fillStyle = '#FFFFFF'; ctx.fill();
      ctx.globalAlpha = a; ctx.lineWidth = 1.25;
      ctx.setLineDash(q >= 1 ? [] : [len * q, len]); ctx.stroke();
    }
    ctx.setLineDash([]);
    /* the visitor's sketch */
    ctx.lineWidth = 1;
    for (var n = arcs.length - 1; n >= 0; n--) {
      var A = arcs[n], fade = 1 - sm(seg((now - A.t1) / 1000, 1.4, 7.4));
      if (fade <= 0) { arcs.splice(n, 1); continue; }
      var p = reduced ? 1 : 1 - Math.pow(1 - clamp((now - A.t0) / 650), 3), q0 = A.q * Math.PI / 2, q1 = q0 + Math.PI / 2;
      ctx.globalAlpha = a * fade * .72;
      ctx.beginPath(); ctx.arc(x0 + A.i * s, y0 + A.j * s, RADII[A.k] * u, A.a - (A.a - q0) * p, A.a + (q1 - A.a) * p); ctx.stroke();
    }
    ctx.restore();
  }
  /* a pointer lays the quarter arc nearest it: the nearest corner of the grid, the nearest of the four radii */
  function lay(x, y) {
    if (!NX) return;
    var s = NX.s, u = s / 160, i = Math.round((x - NX.x) / s), j = Math.round((y - NX.y) / s);
    var dx = x - (NX.x + i * s), dy = y - (NX.y + j * s), dist = Math.sqrt(dx * dx + dy * dy) / u, k = 0, e = 1e9, n;
    for (n = 0; n < 4; n++) { var m = Math.abs(dist - RADII[n]); if (m < e) { e = m; k = n; } }
    if (e > 10) return;
    var ang = nrm(Math.atan2(dy, dx)), q = Math.min(3, Math.floor(ang / (Math.PI / 2))), now = performance.now();
    for (n = 0; n < arcs.length; n++) { var A = arcs[n]; if (A.i === i && A.j === j && A.k === k && A.q === q) { A.t1 = now; return; } }
    arcs.push({ i: i, j: j, k: k, q: q, a: ang, t0: now, t1: now });
    if (arcs.length > 160) arcs.shift();
  }

  var WORLD = { ai: worldAI, st: worldST, k: worldK, nx: worldNX };

  /* ---------- layout ---------- */
  var mqOne = matchMedia('(max-width: 860px)');
  var dpr = 1, SW = 0, SH = 0, M = 20, RAD = 20, slot = null;
  /* the stage: inside the section's frame, so khyzr's white stays round it (design 4's margin);
     on phones the content width and most of the viewport's height. Centred on the symbol. */
  function layout() {
    if (!cur) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    var dr = d.getBoundingClientRect(), ir = inner.getBoundingClientRect(), ar = art.getBoundingClientRect();
    /* the page's fixed nav covers the top of the viewport: the stage fits, and centres, in what is left */
    var nav = document.querySelector('.nav'), NAV = nav ? nav.offsetHeight : 0;
    var secW = dr.width, secH = dr.height, vh = innerHeight - NAV, x, w, h, one = mqOne.matches;
    M = one ? 12 : Math.max(16, Math.min(24, secW * .016));
    /* on a phone the stage spans the content width, which is the cuts' own width: 2px wider each side, so no hairline of the cuts shows at its edge */
    if (one) { x = ir.left - dr.left - 2; w = ir.width + 4; h = vh * .86; }
    else { x = M; w = secW - 2 * M; h = Math.min(vh, secH) - 2 * M; }
    /* at least the art's height, so the world covers the cuts; on a screen shorter than that (a phone on its side) the
       screen's height instead, so the words and the close are in view together, and the cuts step back around it */
    h = Math.min(Math.max(h, Math.min(ar.height, vh - 2 * M)), secH - 2 * M);
    d.classList.toggle('st-short', h < ar.height - 1);
    var y = Math.max(M, Math.min(secH - M - h, ar.top - dr.top + ar.height / 2 - h / 2));
    x = Math.round(x); y = Math.round(y); SW = Math.round(w); SH = Math.round(h);
    stage.style.left = x + 'px'; stage.style.top = y + 'px'; stage.style.width = SW + 'px'; stage.style.height = SH + 'px';
    cv.width = Math.round(SW * dpr); cv.height = Math.round(SH * dpr);
    var br = btn[cur].getBoundingClientRect();
    slot = { x: br.left - dr.left - x, y: br.top - dr.top - y, w: br.width, h: br.height };
    glyphs = null;
    kLayout(); nxLayout();
  }

  /* ---------- the open (portal.js's, from a square tile, on time) ---------- */
  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function seg(p, a, b) { return clamp((p - a) / (b - a)); }
  function io(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function sm(t) { return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function drawOpen(slot, cut, o, which, t) {
    var e = io(o);
    var inset = { x: 0, y: 0, w: SW, h: SH };
    var r = { x: lerp(slot.x, inset.x, e), y: lerp(slot.y, inset.y, e), w: lerp(slot.w, inset.w, e), h: lerp(slot.h, inset.h, e) };
    var rad = lerp(0, RAD, Math.min(1, e * 1.2)); /* design 2's tiles are square: 0 to design 4's 20 */
    ctx.save();
    ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, rad); ctx.clip();
    ctx.fillStyle = cut.tile; ctx.fillRect(r.x, r.y, r.w, r.h);
    var wa = sm(seg(o, .42, .95));
    if (wa > 0) WORLD[which](r, wa, t);
    var base = Math.min(r.w, r.h); /* design 2's cut fills its tile (design 4's badge held it at .6614) */
    var g = Math.exp(Math.log(34) * Math.pow(sm(seg(o, .08, 1)), 1.9));
    var s = base * g, sa = 1 - sm(seg(o, .78, .97));
    if (sa > 0) {
      ctx.globalAlpha = sa;
      if (cut.line) symLine(r.x + r.w / 2 - s / 2, r.y + r.h / 2 - s / 2, s, 1, cut.line);
      else sym(r.x + r.w / 2 - s / 2, r.y + r.h / 2 - s / 2, s, cut.k);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    if (cut.line) { /* the blank page's edge, on white: a hairline that comes in as it opens */
      ctx.globalAlpha = e; ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(10,105,10,.3)';
      ctx.beginPath(); ctx.roundRect(r.x + .5, r.y + .5, r.w - 1, r.h - 1, rad); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  /* ---------- open, close, and the loop ---------- */
  var OPEN = 1050, CLOSE = 860, TEXT_OUT = 150, STILL = { k: 0, ai: 2.6, st: 0, nx: 99 };
  var cur = null, phase = 'closed', o = 0, from = 0, to = 0, aT0 = 0, aDur = 0, cam = null, tW0 = 0, raf = 0, vis = false, back = true;

  function draw(now) {
    var t = reduced ? STILL[cur] : (now - tW0) / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, SW, SH);
    drawOpen(slot, CUT[cur], o, cur, t);
  }
  function needs(now) {
    if (!cur) return false;
    if (phase !== 'open') return true;
    if (!vis) return false;
    if (cur === 'nx') return arcs.length > 0 || (!reduced && now - tW0 < 7000);
    return !reduced;
  }
  function frame(now) {
    raf = 0;
    if (!cur) return;
    if (phase === 'opening' || phase === 'closing') {
      var k = aDur > 0 ? clamp((now - aT0) / aDur) : 1;
      o = lerp(from, to, k);
      if (cam) { /* the page moves with the open, as one gesture, unless the visitor takes the scroll */
        if (Math.abs(scrollY - cam.at) > 3) cam = null;
        else { cam.at = Math.round(lerp(cam.y0, cam.y1, io(k))); scrollTo({ top: cam.at, behavior: 'instant' }); }
      }
      if (phase === 'opening' && o >= .8) panel[cur].classList.add('on');
      if (k >= 1) {
        if (phase === 'closing') { done(); return; }
        phase = 'open'; cam = null;
      }
    }
    if (vis) draw(now);
    if (needs(now)) raf = requestAnimationFrame(frame);
  }
  function kick() { if (cur && !raf) raf = requestAnimationFrame(frame); }

  function open(q) {
    if (cur) return;
    cur = q; hover = focusQ = null; setHot(null);
    stage.className = 'stage s-' + q;
    stage.hidden = false;
    layout();
    panel[q].hidden = false;
    btn[q].setAttribute('aria-expanded', 'true');
    var head = panel[q].querySelector('h3');
    if (head) head.focus({ preventScroll: true });
    inner.inert = true;
    d.classList.add('st-open'); /* the words around the cuts step back while a stage opens over them */
    /* the stage in view: centred, if any of it is out */
    var nav = document.querySelector('.nav'), NAV = nav ? nav.offsetHeight : 0;
    var sr = stage.getBoundingClientRect(), vh = innerHeight, y0 = scrollY, y1 = y0;
    if (sr.top < NAV || sr.bottom > vh) y1 = Math.max(0, Math.round(y0 + sr.top - NAV - Math.max(0, (vh - NAV - sr.height) / 2)));
    tW0 = performance.now(); kReset(); arcs.length = 0; vis = true;
    if (reduced) {
      if (y1 !== y0) scrollTo({ top: y1, behavior: 'instant' });
      o = 1; phase = 'open';
      stage.classList.add('fade'); void stage.offsetWidth; stage.classList.remove('fade');
      panel[q].classList.add('on');
    } else {
      o = 0; from = 0; to = 1; aT0 = performance.now(); aDur = OPEN; phase = 'opening';
      cam = Math.abs(y1 - y0) > 2 ? { y0: y0, y1: y1, at: y0 } : null;
    }
    kick();
  }
  function close(focusBack) {
    if (!cur || phase === 'closing') return;
    back = focusBack !== false;
    panel[cur].classList.remove('on');
    d.classList.remove('st-open');
    phase = 'closing'; cam = null;
    if (reduced) { stage.classList.add('fade'); setTimeout(done, 210); return; }
    from = o; to = 0; aDur = CLOSE * Math.max(.3, o); aT0 = performance.now() + TEXT_OUT;
    kick();
  }
  function done() {
    var q = cur;
    if (!q) return;
    cur = null; phase = 'closed'; o = 0;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    panel[q].hidden = true; stage.hidden = true; stage.className = 'stage';
    inner.inert = false;
    btn[q].setAttribute('aria-expanded', 'false');
    if (back) btn[q].focus({ preventScroll: true });
  }

  /* ---------- the cuts: hover and focus lift a cut over its neighbours ---------- */
  var hover = null, focusQ = null, hot = null, settled = reduced || d.classList.contains('is-in') ? 0 : Infinity;
  d.addEventListener('hs:enter', function () { settled = performance.now() + 1900; });
  function setHot(q) {
    if (q === hot) return;
    if (hot) cell[hot].classList.remove('hot');
    hot = q;
    if (!q) return;
    var c = cell[q];
    /* painted last, so its lift and shadow sit over the others (once the entrance has landed:
       moving it restarts its transitions) */
    if (tiles.lastElementChild !== c && performance.now() > settled) { tiles.appendChild(c); void c.getBoundingClientRect(); }
    c.classList.add('hot');
  }
  function syncHot() { setHot(cur ? null : hover || focusQ); }
  function fv(el) { try { return el.matches(':focus-visible'); } catch (e) { return true; } }
  Q.forEach(function (q) {
    var b = btn[q];
    if (!b) return;
    b.addEventListener('pointerenter', function (e) { if (e.pointerType !== 'touch') { hover = q; syncHot(); } });
    b.addEventListener('pointerleave', function () { if (hover === q) { hover = null; syncHot(); } });
    b.addEventListener('focus', function () { focusQ = fv(b) ? q : null; syncHot(); });
    b.addEventListener('blur', function () { if (focusQ === q) focusQ = null; syncHot(); });
    b.addEventListener('click', function () { open(q); });
    var x = panel[q] && panel[q].querySelector('.x');
    if (x) x.addEventListener('click', function () { close(); });
  });
  /* "Book a conversation": close the stage, then go there */
  [].forEach.call(stage.querySelectorAll('a[href^="#"]'), function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href'), tgt = id.length > 1 && document.getElementById(id.slice(1));
      e.preventDefault();
      close(false);
      if (!tgt) return;
      /* travel with the page's own glide when it is there; it updates the address and focus on arrival */
      if (window.Glide && Glide.on) Glide.to(tgt, { done: function () {
        try { history.pushState(null, '', id); } catch (err) {}
        if (!tgt.hasAttribute('tabindex')) { tgt.setAttribute('tabindex', '-1'); tgt.addEventListener('blur', function () { tgt.removeAttribute('tabindex'); }, { once: true }); }
        tgt.focus({ preventScroll: true });
      } });
      else if (location.hash === id) tgt.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
      else location.hash = id;
    });
  });
  document.addEventListener('keydown', function (e) {
    if ((e.key !== 'Escape' && e.key !== 'Esc') || !cur || phase === 'closing') return;
    if (!stage.contains(document.activeElement) && !vis) return;
    e.preventDefault();
    close();
  });
  /* the blank page takes a pointer: moves and drags (touch too) sketch */
  function sketch(e) {
    if (cur !== 'nx' || phase !== 'open') return;
    if (e.target && e.target.closest && e.target.closest('a,button')) return;
    var sr = stage.getBoundingClientRect(), list = e.type === 'pointermove' && e.getCoalescedEvents ? e.getCoalescedEvents() : null;
    if (!list || !list.length) list = [e];
    for (var i = 0; i < list.length; i++) lay(list[i].clientX - sr.left, list[i].clientY - sr.top);
    kick();
  }
  stage.addEventListener('pointermove', sketch);
  stage.addEventListener('pointerdown', sketch);

  new IntersectionObserver(function (es) { vis = es[es.length - 1].isIntersecting; kick(); }, { rootMargin: '80px 0px' }).observe(stage);
  addEventListener('resize', function () { if (cur) { layout(); kick(); } });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { glyphs = null; kick(); });
})();
