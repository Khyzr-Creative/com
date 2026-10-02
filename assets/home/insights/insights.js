/* ============================================================
   khyzr.com homepage — Insights: "The pile".
   Ported from labs/sections/insights/pile.js (design 3).
   Three sheets, one spring per sheet (x, y, rotation, scale).
   Throw the top sheet aside (drag, buttons, arrow keys) and it
   tucks back in at the bottom; "previous" slides the bottom sheet
   out and lays it back on top; a topic button brings any sheet up. On arrival
   the sheets are laid on the pile one by one, each landing from just above.
   Without JS the sheets simply sit side by side (see the CSS).
   ============================================================ */
(function () {
  'use strict';
  var d = document.querySelector('.hs-insights');
  if (!d) return;
  var pile = d.querySelector('.pile');
  var sheets = [].slice.call(pile.querySelectorAll('.sheet'));
  var prevB = d.querySelector('.prev'), nextB = d.querySelector('.next');
  var topicB = [].slice.call(d.querySelectorAll('.topics button')), live = d.querySelector('.live');
  var reduced = (window.HS && window.HS.reduced) || matchMedia('(prefers-reduced-motion: reduce)').matches;
  d.classList.add('pile-on');

  var K = 230, C = 23;                  // stiffness, damping (per second): a soft spring, a breath of overshoot
  var order = [0, 1, 2];                // order[0] is the sheet on top
  var S = sheets.map(function (el) {
    return { el: el, x: 0, y: 0, r: 0, sc: 1, vx: 0, vy: 0, vr: 0, vs: 0, tx: 0, ty: 0, tr: 0, ts: 1, drag: false, fly: false, t: 0 };
  });

  function slots() {
    var k = pile.clientWidth < 560 ? 0.55 : 1;
    return [{ x: 0, y: 0, r: 0 }, { x: 26 * k, y: 14 * k, r: 3.4 }, { x: -22 * k, y: 24 * k, r: -3.9 }];
  }
  /* stacking follows the order; only the top sheet is live */
  function stack() {
    order.forEach(function (si, pos) {
      var s = S[si], top = pos === 0;
      if (!s.fly) s.el.style.zIndex = String(10 - pos);
      s.el.inert = !top;
      s.el.setAttribute('aria-hidden', top ? 'false' : 'true');
    });
    topicB.forEach(function (b, i) { if (i === order[0]) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
  }
  /* each sheet heads for its slot in the pile */
  function assign(skip) {
    var sl = slots();
    order.forEach(function (si, pos) {
      var s = S[si];
      if (s !== skip && !s.drag && !s.fly) { s.tx = sl[pos].x; s.ty = sl[pos].y; s.tr = sl[pos].r; s.ts = 1; }
    });
    stack();
  }
  function announce() {
    var h = sheets[order[0]].querySelector('h3');
    live.textContent = 'Note ' + (order[0] + 1) + ' of 3: ' + (h ? h.textContent : '');
  }
  function write(s) {
    s.el.style.transform = 'translate3d(' + s.x.toFixed(2) + 'px,' + s.y.toFixed(2) + 'px,0) rotate(' + s.r.toFixed(3) + 'deg) scale(' + s.sc.toFixed(4) + ')';
  }

  /* ---- the spring loop: runs only while something moves ---- */
  var raf = 0, last = 0;
  function kick() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(step); pile.classList.add('moving'); } }
  function step(now) {
    var dt = Math.min(0.032, Math.max(0.001, (now - last) / 1000));
    last = now;
    var moving = false;
    S.forEach(function (s) {
      if (!s.drag) {
        s.vx += ((s.tx - s.x) * K - s.vx * C) * dt; s.x += s.vx * dt;
        s.vy += ((s.ty - s.y) * K - s.vy * C) * dt; s.y += s.vy * dt;
        s.vr += ((s.tr - s.r) * K - s.vr * C) * dt; s.r += s.vr * dt;
        s.vs += ((s.ts - s.sc) * K - s.vs * C) * dt; s.sc += s.vs * dt;
        var rest = Math.abs(s.tx - s.x) + Math.abs(s.ty - s.y) + Math.abs(s.tr - s.r) * 4 + Math.abs(s.ts - s.sc) * 400 < 0.08 &&
                   Math.abs(s.vx) + Math.abs(s.vy) + Math.abs(s.vr) * 4 + Math.abs(s.vs) * 400 < 0.4;
        if (rest) { s.x = s.tx; s.y = s.ty; s.r = s.tr; s.sc = s.ts; s.vx = s.vy = s.vr = s.vs = 0; }
        else moving = true;
      } else moving = true;
      write(s);
    });
    raf = moving ? requestAnimationFrame(step) : 0;
    if (!raf) pile.classList.remove('moving');
  }
  function settleNow() { S.forEach(function (s) { s.x = s.tx; s.y = s.ty; s.r = s.tr; s.sc = s.ts; s.vx = s.vy = s.vr = s.vs = 0; write(s); }); }

  function out(s, dir) { return dir * (pile.clientWidth / 2 + s.el.offsetWidth * 0.58); }

  /* ---- next: the top sheet is thrown aside, then tucks in underneath ---- */
  function next(dir, vx, vy) {
    var s = S[order[0]];
    dir = dir || -1;
    order.push(order.shift());
    if (reduced) { assign(); settleNow(); announce(); return; }
    clearTimeout(s.t);
    s.fly = true;
    s.el.style.zIndex = '20';
    s.tx = out(s, dir); s.ty = s.y + 36; s.tr = dir * 14; s.ts = 1;
    s.vx = vx != null ? vx : dir * 1500; s.vy = vy != null ? vy : -140;
    assign(s);
    kick();
    s.t = setTimeout(function () { s.fly = false; assign(); kick(); }, 230);
    announce();
  }
  /* ---- bring any sheet to the top: it slides out from the pile and is laid on top ---- */
  function bring(si) {
    var pos = order.indexOf(si), s = S[si], dir = 1;
    if (pos <= 0 || s.fly) return;
    if (reduced) { order.splice(pos, 1); order.unshift(si); assign(); settleNow(); announce(); return; }
    clearTimeout(s.t);
    s.fly = true;
    s.el.style.zIndex = '1';
    s.tx = out(s, dir); s.ty = 30; s.tr = dir * 10;
    kick();
    s.t = setTimeout(function () {
      s.fly = false;
      order.splice(order.indexOf(si), 1); order.unshift(si);
      assign();
      s.vx = -900;
      kick();
      announce();
    }, 250);
  }
  function prev() { bring(order[2]); }
  nextB.addEventListener('click', function () { next(1); });
  prevB.addEventListener('click', prev);
  topicB.forEach(function (b, i) { b.addEventListener('click', function () { bring(i); }); });
  d.addEventListener('keydown', function (e) {
    if (!d.contains(document.activeElement)) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); next(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
  });

  /* ---- drag the top sheet ---- */
  var drag = null;
  pile.addEventListener('pointerdown', function (e) {
    var el = e.target.closest && e.target.closest('.sheet');
    if (!el || e.button !== 0 || e.target.closest('a,button')) return;
    var s = S[sheets.indexOf(el)];
    if (s !== S[order[0]] || s.fly) return;
    drag = { s: s, id: e.pointerId, sx: e.clientX, sy: e.clientY, x0: s.x, y0: s.y, h: [[performance.now(), e.clientX, e.clientY]] };
    try { el.setPointerCapture(e.pointerId); } catch (err) {}
    s.drag = true; s.vx = s.vy = s.vr = 0;
    s.sc = 1.015;
    el.classList.add('held');
    kick();
  });
  pile.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dx = e.clientX - drag.sx, dy = e.clientY - drag.sy, s = drag.s;
    s.x = drag.x0 + dx; s.y = drag.y0 + dy * 0.5; s.r = dx * 0.045;
    drag.h.push([performance.now(), e.clientX, e.clientY]);
    if (drag.h.length > 6) drag.h.shift();
  });
  function end(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var s = drag.s, h = drag.h, a = h[0], b = h[h.length - 1];
    var ms = Math.max(16, b[0] - a[0]);
    var vx = (b[1] - a[1]) / ms * 1000, vy = (b[2] - a[2]) / ms * 1000;
    var dx = s.x - drag.x0;
    s.drag = false; s.el.classList.remove('held');
    drag = null;
    if (e.type !== 'pointercancel' && (Math.abs(dx) > 110 || Math.abs(vx) > 800)) next(Math.sign(Math.abs(vx) > 800 ? vx : dx), vx, vy * 0.4);
    else { s.ts = 1; kick(); }
  }
  pile.addEventListener('pointerup', end);
  pile.addEventListener('pointercancel', end);

  /* ---- arrival: the sheets are laid on the pile one by one, the bottom one first;
     each comes down from just above (a touch larger, its shadow lifted) and lands ---- */
  var timers = [];
  function stage() {
    timers.forEach(clearTimeout); timers = [];
    order = [0, 1, 2];
    var sl = slots();
    S.forEach(function (s, i) {
      var pos = order.indexOf(i);
      clearTimeout(s.t); s.fly = false; s.drag = false;
      s.el.style.transition = 'none';
      s.x = s.tx = sl[pos].x + (1 - i) * 26; s.y = s.ty = sl[pos].y - 46; s.r = s.tr = sl[pos].r + (i - 1) * 4.5; s.sc = s.ts = 1.09;
      s.vx = s.vy = s.vr = s.vs = 0;
      s.el.style.opacity = '0';
      s.el.classList.add('held');
      write(s);
    });
    stack();
    void pile.offsetWidth;
    S.forEach(function (s) { s.el.style.transition = ''; });
  }
  function deal() {
    var sl = slots();
    [2, 1, 0].forEach(function (pos, k) {
      timers.push(setTimeout(function () {
        var s = S[order[pos]];
        s.el.style.opacity = '1';
        s.tx = sl[pos].x; s.ty = sl[pos].y; s.tr = sl[pos].r; s.ts = 1;
        kick();
        timers.push(setTimeout(function () { s.el.classList.remove('held'); }, 120));
      }, 190 * k));
    });
    timers.push(setTimeout(function () { assign(); }, 190 * 3));
  }

  /* the pile is laid out after the page's first layout, not while it parses (it measures the pile) */
  var staged = false, pend = false;
  requestAnimationFrame(function () {
    if (reduced) { assign(); settleNow(); }
    else { stage(); if (pend || d.classList.contains('is-in')) deal(); }
    staged = true;
  });
  d.addEventListener('hs:enter', function () {
    if (!staged) { pend = true; return; }
    if (reduced) { order = [0, 1, 2]; assign(); settleNow(); } else deal();
  });
  var rt; addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { assign(); if (reduced) settleNow(); else kick(); }, 120); });
})();
