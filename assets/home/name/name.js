/* =====================================================================
   The name · Night field (labs/sections/name/field.js, ported): a pinned
   WebGL2 field of grass, told in five chapters.
   Every blade is generated in the vertex shader from gl_InstanceID (no
   instance buffers). A green light (the one they sought) walks the
   field; wherever it stands, grass grows; when it leaves, the green
   spreads to the horizon. Driven by --pin from assets/home/hs.js.
   The name grows with the grass, in the fifteen tongues of the live
   khyzr.com set (read from the list in the page): beside the light where it
   stands, then across the field as the green travels out, each tongue's
   three words glowing in the fresh front. Real text, projected from the
   field each frame, laid out for the last frame so nothing crowds.
   One context, made when the section is near; renders only while the stage is on screen. Reduced
   motion: one still frame of the grown field, no wind, the list in flow.
   ===================================================================== */
(function () {
  'use strict';
  var d = document.querySelector('.hs-name');
  if (!d) return;
  /* the field starts when its section is three screens away, in an idle moment, and not with the page: its context,
     shaders and layout are a long task, and its tongues' fonts are 135 kB. Until 9 Oct 2026 it also started itself
     four seconds after load, which on a phone landed that task on the hero just as its words arrived (measured at
     689 ms on a slowed CPU) and fetched the fonts for every visitor, the ones who never scroll that far too */
  var started = false;
  /* the tongues' faces come from Google Fonts, and are asked for here, not by the page: the two links stand in the
     head without an address until the field starts (their <noscript> twins serve a page without this script) */
  function faces() { [].forEach.call(document.querySelectorAll('link.hs-name-fonts'), function (l) { if (!l.getAttribute('href')) l.href = l.getAttribute('data-href'); }); }
  function go() { if (started) return; started = true; if (io) io.disconnect(); faces(); start(); }
  function soon() { if (io) io.disconnect(); faces(); if (window.requestIdleCallback) requestIdleCallback(go, { timeout: 600 }); else go(); }
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) { if (es[0].isIntersecting) soon(); }, { rootMargin: '300% 0px' }) : null;
  if (io) io.observe(d); else go();

  function start() {
  var cv = d.querySelector('canvas.field');
  var gl = cv && cv.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'high-performance' });
  /* no WebGL: the section falls back to its no-JS layout (the chapters, the pillars and the fifteen in flow) */
  if (!gl) { d.classList.add('gl-off'); return; }
  var reduced = !!(window.HS && window.HS.reduced);

  var COMMON = [
    '#version 300 es',
    'precision highp float; precision highp int;',
    'uniform mat4 uVP; uniform vec3 uCam; uniform float uTime, uWind;',
    'uniform vec4 uSt[3]; uniform vec3 uAll; uniform vec4 uLight; uniform float uAmb, uRim, uTrace, uSpread;',
    'uniform float uNear, uFar, uTan;',
    'uniform vec2 uPath[4]; uniform float uTrail;',
    'float sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.); return length(pa - ba * h); }',
    'float trailD(vec2 b){ return min(sdSeg(b, uPath[0], uPath[1]), min(sdSeg(b, uPath[1], uPath[2]), sdSeg(b, uPath[2], uPath[3]))); }',
    'float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    'float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);',
    '  return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }',
    /* growth: x = where the light stood (it keeps a glow), y = everything, z = the fresh front */
    'vec3 growth(vec2 b){',
    '  float nz = vn(b * .45) * .9 + vn(b * 1.7) * .35;',
    '  float gp = 0., fr = 0., pg = 0.;',
    '  for (int i = 0; i < 3; i++){ float dd = distance(b, uSt[i].xy) + nz * .8; float e = smoothstep(uSt[i].z, uSt[i].z - 2.2, dd); gp = max(gp, e); fr = max(fr, e * (1. - e)); pg = max(pg, smoothstep(uSt[i].w + 1.2, uSt[i].w - 1.4, dd)); }',
    '  float da = distance(b, uAll.xy) + nz * 2.4; float ga = smoothstep(uAll.z, uAll.z - 5., da);',
    '  float g = max(gp, ga);',
    '  return vec3(pg, g * g * (3. - 2. * g), fr * 4.);',
    '}'
  ].join('\n');

  var VS_BLADE = COMMON + '\n' + [
    'layout(location=0) in vec2 aT;',
    'out vec3 vC; out float vF;',
    'uint hs(uint x){ x ^= x >> 16; x *= 0x7feb352du; x ^= x >> 15; x *= 0x846ca68bu; x ^= x >> 16; return x; }',
    'float rn(uint i, uint k){ return float(hs(i * 0x9E3779B9u ^ (k * 0x85EBCA6Bu + 0x165667B1u))) * (1. / 4294967295.); }',
    'uniform float uCount;',
    'void main(){',
    '  uint id = uint(gl_InstanceID);',
    /* instance order is depth order, near to far, so the depth test rejects what the near grass hides */
    '  float r1 = (float(gl_InstanceID) + rn(id, 1u)) / uCount;',
    '  float r2 = rn(id, 2u), r3 = rn(id, 3u), r4 = rn(id, 4u), r5 = rn(id, 5u), r6 = rn(id, 6u), r7 = rn(id, 7u);',
    '  float dz = mix(uNear, uFar, pow(r1, .82));',                 /* ~even density per area: no pile-up at the lens */
    '  float halfW = dz * uTan + 1.2;',
    '  vec2 b = vec2(uCam.x + (r2 * 2. - 1.) * halfW, uCam.z - dz);',
    '  vec3 G = growth(b); float g = G.y;',
    '  if (g < .004) { gl_Position = vec4(2., 2., 2., 1.); vC = vec3(0.); vF = 0.; return; }',   /* not grown: nothing to raster */
    '  float clump = vn(b * .33) * .7 + vn(b * 1.1) * .3;',
    '  float h = mix(.26, .92, pow(r3, .8)) * mix(.6, 1.3, clump) * g;',
    '  float w = mix(.018, .036, r4) * (1. + max(0., dz - 5.) * .085) * mix(.35, 1., g);',
    '  float t = aT.y, tt = t * t;',
    '  float yaw = r5 * 6.2831853; vec2 ld = vec2(cos(yaw), sin(yaw));',
    '  float lean = mix(.06, .6, r6 * r6);',
    '  float sway = (sin(uTime * 1.25 + b.x * .42 + b.y * .27 + r7 * 6.28) * .62 + sin(uTime * 2.3 + b.x * 1.3 - b.y * .8) * .22) * uWind;',
    '  vec2 bend = ld * lean + vec2(.85, .25) * sway;',
    '  vec3 p = vec3(b.x, 0., b.y);',
    '  p.xz += bend * h * tt;',
    '  p.y = h * t * (1. - .2 * dot(bend, bend) * tt);',
    '  vec2 toC = normalize(uCam.xz - b); vec2 side = vec2(-toC.y, toC.x);',
    '  float tw = (r7 - .5) * 1.1; side = normalize(side * cos(tw) + toC * sin(tw));',
    '  p.xz += side * aT.x * w * .5 * pow(1. - t, .8);',
    '  gl_Position = uVP * vec4(p, 1.);',
    /* colour: near-black base, khyzr green body, mint tips; lit by the light that passed and by the horizon */
    /* colour, all from the brand greens: green-900 at the root, forest to khyzr green in the body
       (a little green-400 in some), mint to sage at the tip */
    '  vec3 cB = vec3(.004, .030, .006);',
    '  vec3 cM = mix(vec3(.024, .275, .024), vec3(.039, .412, .039), r4);',
    '  cM = mix(cM, vec3(.231, .529, .231), step(.86, r7) * .45);',
    '  vec3 cT = mix(vec3(.522, .706, .522), vec3(.569, .737, .569), r6);',
    '  vec3 c = mix(cB, cM, smoothstep(0., .72, t));',
    '  c = mix(c, cT, smoothstep(.62, 1., t) * mix(.25, .85, r3));',
    '  float ao = mix(.22, 1., smoothstep(0., .85, t));',          /* the root sits in the shade of its neighbours */
    '  float dl = distance(p, uLight.xyz);',
    '  float li = uLight.w / (1. + dl * dl * .85);',
    '  vec3 lit = c * (uAmb * ao * .62 + li * 2.3) + vec3(.34, .74, .38) * li * t * 1.1;',
    /* the green that stays: where he stood keeps a glow, the fresh front is brightest, tips backlit at the end */
    '  lit += vec3(.05, .30, .08) * max(G.x, G.y * uSpread * .34) * uTrace * (.25 + .75 * t);',
    '  lit += vec3(.16, .52, .20) * G.z * uTrace * t;',
    /* the way he walked stays lit: a trail from where he came to where he left */
    '  float tr = exp(-pow(trailD(b), 2.) * .28) * uTrail * g;',
    '  lit += vec3(.07, .42, .12) * tr * (.2 + .8 * t) + vec3(.30, .60, .34) * tr * pow(t, 3.) * .6;',
    '  lit += vec3(.34, .62, .38) * uRim * pow(t, 3.) * mix(.35, 1., r3) * mix(.18, 1.1, smoothstep(3., 22., dz));',
    '  vF = 1. - exp(-distance(p, uCam) * .06);',
    '  vC = lit;',
    '}'
  ].join('\n');

  var FS_BLADE = [
    '#version 300 es', 'precision highp float;',
    'in vec3 vC; in float vF; uniform vec3 uFogH; out vec4 o;',
    'void main(){ o = vec4(mix(vC, uFogH, vF), 1.); }'                /* far grass dissolves into the horizon sky */
  ].join('\n');

  /* sky and ground in one full-screen pass: a ray per pixel, the ground plane at y = 0 */
  var VS_FULL = '#version 300 es\nlayout(location=0) in vec2 aP; out vec2 vN; void main(){ vN = aP; gl_Position = vec4(aP, .9999, 1.); }';
  var FS_BACK = COMMON + '\n' + [
    'uniform mat4 uInv; uniform vec3 uFog, uGlow; uniform float uGlowI;',
    'in vec2 vN; out vec4 o;',
    'float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }',
    'void main(){',
    '  vec4 a = uInv * vec4(vN, -1., 1.), b = uInv * vec4(vN, 1., 1.);',
    '  vec3 ro = a.xyz / a.w, rd = normalize(b.xyz / b.w - ro);',
    '  float elev = rd.y;',
    '  vec2 gd = normalize(uPath[3] - uCam.xz); float az = max(dot(normalize(rd.xz + 1e-5), gd), 0.);',
    '  vec3 col = uFog + uGlow * uGlowI * (exp(-abs(elev) * 13.) * .30 + exp(-max(elev, 0.) * mix(9., 3.2, uRim)) * .12 * uRim);',
    '  col += uGlow * uTrail * pow(az, 60.) * exp(-abs(elev) * 7.) * .55;',                     /* where he went: a soft glow past the horizon */
    '  if (rd.y < -1e-4){',
    '    float tg = -ro.y / rd.y; vec3 pw = ro + rd * tg;',
    '    float g = growth(pw.xz).y;',
    '    vec3 gc = mix(vec3(.006, .014, .007), vec3(.010, .050, .014), g) * (.7 + uAmb * 1.8);',
    '    float dl = distance(pw, uLight.xyz);',
    '    gc += vec3(.05, .24, .08) * uLight.w / (1. + dl * dl * .6);',
    '    gc += vec3(.008, .07, .018) * exp(-pow(trailD(pw.xz), 2.) * .28) * uTrail * g;',
    '    float f = 1. - exp(-tg * .062);',
    '    col = mix(gc, col, f);',
    '  }',
    '  col += (hash(gl_FragCoord.xy) - .5) / 255.;',
    '  o = vec4(col, 1.);',
    '}'
  ].join('\n');

  /* the light: a soft billboard, added */
  var VS_LIGHT = '#version 300 es\nlayout(location=0) in vec2 aP; uniform mat4 uVP; uniform vec4 uLight; uniform float uAsp, uSize; out vec2 vQ;' +
    'void main(){ vQ = aP; vec4 c = uVP * vec4(uLight.xyz, 1.); c.xy += aP * vec2(uSize / uAsp, uSize); gl_Position = c; }';
  var FS_LIGHT = '#version 300 es\nprecision highp float; in vec2 vQ; uniform vec4 uLight; uniform vec3 uGlow; out vec4 o;' +
    'void main(){ float r = length(vQ); float a = exp(-r * r * 30.) * 1.15 + exp(-r * r * 6.) * .34 + exp(-r * r * 1.6) * .09; a *= 1. - smoothstep(.62, 1., r); o = vec4(uGlow * a * uLight.w, 1.); }';

  function sh(t, s) { var x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) { console.warn('field:', gl.getShaderInfoLog(x)); return null; } return x; }
  function prog(v, f) { var a = sh(gl.VERTEX_SHADER, v), b = sh(gl.FRAGMENT_SHADER, f); if (!a || !b) return null; var p = gl.createProgram(); gl.attachShader(p, a); gl.attachShader(p, b); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.warn('field:', gl.getProgramInfoLog(p)); return null; } return p; }
  var pB = prog(VS_BLADE, FS_BLADE), pK = prog(VS_FULL, FS_BACK), pL = prog(VS_LIGHT, FS_LIGHT);
  if (!pB || !pK || !pL) { d.classList.add('gl-off'); return; }
  function locs(p, n) { var o = {}; n.forEach(function (k) { o[k] = gl.getUniformLocation(p, k); }); return o; }
  var UN = ['uVP', 'uCam', 'uTime', 'uWind', 'uSt', 'uAll', 'uLight', 'uAmb', 'uRim', 'uTrace', 'uSpread', 'uPath', 'uTrail', 'uNear', 'uFar', 'uTan', 'uFog', 'uFogH', 'uInv', 'uGlow', 'uGlowI', 'uAsp', 'uSize', 'uCount'];
  var LB = locs(pB, UN), LK = locs(pK, UN), LL = locs(pL, UN);

  /* blade template: 7 levels, two sides, a strip */
  var LV = 6, tpl = [];
  for (var i = 0; i < LV; i++) { var t = i / (LV - 1); tpl.push(-1, t, 1, t); }
  var vaoB = gl.createVertexArray(); gl.bindVertexArray(vaoB);
  var bB = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bB); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tpl), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  var vaoQ = gl.createVertexArray(); gl.bindVertexArray(vaoQ);
  var bQ = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bQ); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  /* ---------- matrices ---------- */
  function persp(fy, a, n, f) { var t = 1 / Math.tan(fy / 2), nf = 1 / (n - f); return [t / a, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) * nf, -1, 0, 0, 2 * f * n * nf, 0]; }
  function look(e, c) {
    var z0 = e[0] - c[0], z1 = e[1] - c[1], z2 = e[2] - c[2], l = Math.hypot(z0, z1, z2); z0 /= l; z1 /= l; z2 /= l;
    var x0 = z2, x1 = 0, x2 = -z0; l = Math.hypot(x0, x1, x2); x0 /= l; x1 /= l; x2 /= l;          /* up = +y */
    var y0 = z1 * x2 - z2 * x1, y1 = z2 * x0 - z0 * x2, y2 = z0 * x1 - z1 * x0;
    return [x0, y0, z0, 0, x1, y1, z1, 0, x2, y2, z2, 0, -(x0 * e[0] + x1 * e[1] + x2 * e[2]), -(y0 * e[0] + y1 * e[1] + y2 * e[2]), -(z0 * e[0] + z1 * e[1] + z2 * e[2]), 1];
  }
  function mul(a, b) { var o = new Array(16); for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) { var s = 0; for (var k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; }
  function inv(m) {
    var a = m, o = new Array(16);
    var b00 = a[0] * a[5] - a[1] * a[4], b01 = a[0] * a[6] - a[2] * a[4], b02 = a[0] * a[7] - a[3] * a[4], b03 = a[1] * a[6] - a[2] * a[5], b04 = a[1] * a[7] - a[3] * a[5], b05 = a[2] * a[7] - a[3] * a[6];
    var b06 = a[8] * a[13] - a[9] * a[12], b07 = a[8] * a[14] - a[10] * a[12], b08 = a[8] * a[15] - a[11] * a[12], b09 = a[9] * a[14] - a[10] * a[13], b10 = a[9] * a[15] - a[11] * a[13], b11 = a[10] * a[15] - a[11] * a[14];
    var det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06; if (!det) return m; det = 1 / det;
    o[0] = (a[5] * b11 - a[6] * b10 + a[7] * b09) * det; o[1] = (a[2] * b10 - a[1] * b11 - a[3] * b09) * det; o[2] = (a[13] * b05 - a[14] * b04 + a[15] * b03) * det; o[3] = (a[10] * b04 - a[9] * b05 - a[11] * b03) * det;
    o[4] = (a[6] * b08 - a[4] * b11 - a[7] * b07) * det; o[5] = (a[0] * b11 - a[2] * b08 + a[3] * b07) * det; o[6] = (a[14] * b02 - a[12] * b05 - a[15] * b01) * det; o[7] = (a[8] * b05 - a[10] * b02 + a[11] * b01) * det;
    o[8] = (a[4] * b10 - a[5] * b08 + a[7] * b06) * det; o[9] = (a[1] * b08 - a[0] * b10 - a[3] * b06) * det; o[10] = (a[12] * b04 - a[13] * b02 + a[15] * b00) * det; o[11] = (a[9] * b02 - a[8] * b04 - a[11] * b00) * det;
    o[12] = (a[5] * b07 - a[4] * b09 - a[6] * b06) * det; o[13] = (a[0] * b09 - a[1] * b07 + a[2] * b06) * det; o[14] = (a[13] * b01 - a[12] * b03 - a[14] * b00) * det; o[15] = (a[8] * b03 - a[9] * b01 + a[10] * b00) * det;
    return o;
  }

  /* ---------- the story, as a function of the pin ---------- */
  function cl(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function ss(a, b, x) { var t = cl((x - a) / (b - a)); return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function lp3(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
  var FAR = [7.5, .55, -34], P1 = [-1.4, .5, -3.6], P2 = [2.8, .5, -9.5], GONE = [9, .6, -36];
  var PATH = new Float32Array([FAR[0], FAR[2], P1[0], P1[2], P2[0], P2[2], GONE[0], GONE[2]]);
  function story(p) {
    var L, I;
    if (p < .15) { L = FAR; I = .55; }
    else if (p < .36) { var a = ss(.15, .36, p); L = [lerp(FAR[0], P1[0], a) + Math.sin(a * 3.1) * 1.4, lerp(FAR[1], P1[1], a), lerp(FAR[2], P1[2], a)]; I = lerp(.55, 1, a); }
    else if (p < .44) { L = P1; I = 1; }
    else if (p < .50) { L = lp3(P1, P2, ss(.44, .50, p)); I = 1; }
    else if (p < .56) { L = P2; I = 1; }
    else { var b = ss(.56, .68, p); L = lp3(P2, GONE, b); I = 1 - b; }
    /* the patches, then the spread: slow at first, so you watch the green travel out from where he stood */
    var sp = function (a, b) { return Math.pow(ss(a, b, p), 1.6); };
    var r1 = lerp(0, 3.4, ss(.37, .46, p)) + lerp(0, 58, sp(.59, .90));
    var r2 = lerp(0, 3.0, ss(.50, .58, p)) + lerp(0, 58, sp(.61, .92));
    var all = lerp(0, 72, ss(.80, .97, p));
    return {
      L: L, I: I,
      st: [P1[0], P1[2], r1, 3.4, P2[0], P2[2], r2, 3.0, -40, -40, 0, 0],
      all: [.5, -6, all],
      amb: lerp(.05, .10, ss(.36, .56, p)) + lerp(0, .10, ss(.66, .97, p)),
      rim: lerp(0, 1, ss(.66, .97, p)),
      trace: lerp(0, 1, ss(.37, .44, p)),
      spread: ss(.62, .95, p),
      trail: ss(.50, .74, p),
      glow: lerp(.12, .06, ss(.2, .5, p)) + lerp(0, .9, ss(.66, .98, p)),
      cam: [lerp(0, .3, ss(0, 1, p)), lerp(1.32, 1.95, ss(.62, 1, p)), lerp(7.6, 6.2, ss(0, 1, p))],
      tgt: [lerp(-.4, .6, ss(0, 1, p)), lerp(.42, .30, ss(.62, 1, p)), -12]
    };
  }

  /* ---------- the names in the field ----------
     Fifteen places, laid out for the story's last frame (one layout for landscape, one for portrait,
     in screen terms: u across, v from the horizon down), unprojected onto the ground for the frame's
     camera at load and on resize, so they never crowd whatever the window. The first two stand
     beside the places the light stands, and their names appear while it stands there; the other
     thirteen rise as the green travels out from where it stood, each with its three words glowing in
     the fresh front; the words fade as the front moves on and the names stay. The fifteen tongues
     are taken in the live site's order, in the order they appear. */
  var trail = d.querySelector('.trail'), ST = [];
  var LAYOUT = {
    wide: [[.255, .45, .37], [.715, .28, .51], [.11, .13], [.29, .1], [.465, .125], [.625, .095], [.795, .125], [.925, .16],
      [.075, .345], [.455, .32], [.875, .355], [.105, .69], [.425, .62], [.615, .55], [.83, .69]],
    tall: [[.27, .35, .37], [.76, .23, .51], [.16, .1], [.5, .08], [.85, .12], [.4, .2], [.13, .27], [.6, .35], [.88, .43],
      [.3, .5], [.72, .59], [.17, .67], [.52, .76], [.84, .84], [.27, .91]]
  };
  function r1(p) { return lerp(0, 3.4, ss(.37, .46, p)) + lerp(0, 58, Math.pow(ss(.59, .90, p), 1.6)); }
  function r2(p) { return lerp(0, 3.0, ss(.50, .58, p)) + lerp(0, 58, Math.pow(ss(.61, .92, p), 1.6)); }
  function rAll(p) { return lerp(0, 72, ss(.80, .97, p)); }
  var ENTRIES = trail && !reduced ? [].slice.call(trail.querySelectorAll('li')) : [];
  function xf(M, x, y, z) {
    var X = M[0] * x + M[4] * y + M[8] * z + M[12], Y = M[1] * x + M[5] * y + M[9] * z + M[13], Z = M[2] * x + M[6] * y + M[10] * z + M[14], Q = M[3] * x + M[7] * y + M[11] * z + M[15];
    return [X / Q, Y / Q, Z / Q];
  }
  function layoutTrail() {
    if (!ENTRIES.length || !W) return;
    var asp = W / H, s = story(1), fy = (asp < 1 ? 50 : 36) * Math.PI / 180;
    var VPf = mul(persp(fy, asp, .05, 90), look(s.cam, s.tgt)), IVf = inv(VPf);
    var hz = VPf[1] * s.tgt[0] + VPf[9] * -400 + VPf[13], hw = VPf[3] * s.tgt[0] + VPf[11] * -400 + VPf[15];
    var hy = (1 - (hz / hw * .5 + .5)) * H;                     /* the horizon, in px */
    var top = hy + (asp < 1 ? 26 : 30), bot = H - (asp < 1 ? 44 : 40);
    var spots = (asp < 1 ? LAYOUT.tall : LAYOUT.wide).map(function (q) {
      var sx = q[0] * W, sy = top + q[1] * (bot - top), nx = sx / W * 2 - 1, ny = 1 - sy / H * 2;
      var a = xf(IVf, nx, ny, -1), b = xf(IVf, nx, ny, 1), t = (.32 - a[1]) / (b[1] - a[1]);
      var x = a[0] + (b[0] - a[0]) * t, z = a[2] + (b[2] - a[2]) * t;
      var pin = q[2];
      if (pin == null) {                                         /* when the green first reaches it */
        var d1 = Math.hypot(x - P1[0], z - P1[2]) + .6, d2 = Math.hypot(x - P2[0], z - P2[2]) + .6, da = Math.hypot(x - .5, z + 6) + 2;
        for (pin = .5; pin < .845; pin += .002) if (r1(pin) >= d1 || r2(pin) >= d2 || rAll(pin) >= da) break;
        pin = Math.min(pin, .845);
      }
      return { x: x, y: .32, z: z, pin: pin, stand: q[2] != null, d1: d1, d2: d2 };
    });
    spots.sort(function (a, b) { return a.pin - b.pin; });
    ST = ENTRIES.map(function (li, i) { var o = spots[i % spots.length]; o.li = li; o.key = ''; return o; });
  }
  /* the chapters' words, in stage pixels, kept with the stage's size: a name never stands on words that are showing
     (a short landscape phone has the field and the words in the same band). Each chapter shows over its own span of
     the pin, as name.css has it (.c0–.c4). */
  var CHAP = [].slice.call(d.querySelectorAll('.ch')).map(function (el) {
    var m = /\bc([0-4])\b/.exec(el.className); return { el: el, k: m ? +m[1] : -1, box: null, o: 0 };
  }).filter(function (c) { return c.k >= 0; });
  var WIN = [[-1, .125], [.15, .34], [.37, .57], [.60, .81], [.85, 2]];
  function chapO(k, pin) { var w = WIN[k]; return cl(Math.min(w[0] < 0 ? 1 : (pin - w[0]) * 26, (w[1] - pin) * 26)); }
  function measureChapters() {
    var R = cv.getBoundingClientRect(), rg = document.createRange(), pin = cl(parseFloat(d.style.getPropertyValue('--pin')) || 0);
    CHAP.forEach(function (c) {
      var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      [].forEach.call(c.el.querySelectorAll('h2, h3, p, li, .ar'), function (el) {
        rg.selectNodeContents(el);
        [].forEach.call(rg.getClientRects(), function (r) {
          if (r.width && r.height) { x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom); }
        });
      });
      /* where its rise has it now, back to where it settles (22px higher), and the way up besides */
      var ty = (1 - chapO(c.k, pin)) * 22;
      c.box = x0 > x1 ? null : [x0 - R.left - 10, y0 - R.top - ty - 8, x1 - R.left + 10, y1 - R.top - ty + 30];
    });
  }
  function placeTrail(VP, s, pin) {
    var base = W < 380 ? 5.6 : W < 420 ? 6.2 : W < 760 ? 7.2 : 9;
    for (var c = 0; c < CHAP.length; c++) CHAP[c].o = CHAP[c].box ? chapO(CHAP[c].k, pin) : 0;
    /* the entries are measured together: every one set to its full size first, then every one read, so the page is
       laid out once and not once an entry */
    for (var m = 0; m < ST.length; m++) if (ST[m].w1 == null) ST[m].li.style.setProperty('--name-k', '1');
    for (var i = 0; i < ST.length; i++) {
      var t = ST[i];
      var cx = VP[0] * t.x + VP[4] * t.y + VP[8] * t.z + VP[12], cy = VP[1] * t.x + VP[5] * t.y + VP[9] * t.z + VP[13], cw = VP[3] * t.x + VP[7] * t.y + VP[11] * t.z + VP[15];
      var up = ss(t.pin, t.pin + .03, pin), o = ss(t.pin, t.pin + .016, pin);
      if (cw <= .2) o = 0;
      var sx = cw > .2 ? (cx / cw * .5 + .5) * W : -999, sy = cw > .2 ? (1 - (cy / cw * .5 + .5)) * H + (1 - up) * 14 : 0;
      var k = Math.max(.58, Math.min(1.2, base / Math.max(cw, .2)));
      if (t.w1 == null) {
        t.w1 = t.li.offsetWidth; t.key = ''; t.kq = null;
        /* the whole entry (it hangs from its bottom edge), and the name with its language, the top part of it (the
           words under them fade before the names settle) */
        var lg = t.li.querySelector('.lg'); t.hf = t.li.offsetHeight; t.h1 = lg ? lg.offsetTop + lg.offsetHeight : t.hf;
        /* and how wide the name and its language read (the entry itself is as wide as its words) */
        var rg = document.createRange(), wv = 0;
        [t.li.querySelector('.nm'), lg].forEach(function (el) { if (el) { rg.selectNodeContents(el); wv = Math.max(wv, rg.getBoundingClientRect().width); } });
        t.wv = wv || t.w1;
      }
      var hw = t.w1 * k / 2 + 14;                                  /* never past the edge of the frame: a name the
         camera has turned well away from fades as it goes, rather than piling up there with the others */
      if (sx > -900) { var over = Math.max(hw - sx, sx - (W - hw)); if (over > 0) { o *= 1 - ss(hw * .25, hw * .9, over); sx = Math.max(hw, Math.min(W - hw, sx)); } }
      var wo;
      if (t.stand) wo = (1 - ss(1.8, 4.2, Math.hypot(s.L[0] - t.x, s.L[2] - t.z))) * cl(s.I * 1.4);
      else { var f = Math.max(r1(pin) - t.d1, r2(pin) - t.d2); wo = f > -1 ? 1 - ss(1.5, 9, f) : 0; }
      t.sx = sx; t.sy = sy; t.k = k; t.o = o; t.wo = wo * o;
    }
    /* on a narrow screen two names can land on each other: the later one moves to the nearest clear place above
       or below the ones in its way, easing there as it fades in */
    function box(t, y) { var hw2 = t.wv * t.k / 2 + 6, top = y - t.hf * t.k; return [t.sx - hw2, top, t.sx + hw2, top + t.h1 * t.k]; }
    /* against the words, the whole entry while its own words show (they are as wide as the entry) */
    function wbox(t, y) { if (t.wo < .02) return box(t, y); var hw2 = t.w1 * t.k / 2 + 6; return [t.sx - hw2, y - t.hf * t.k, t.sx + hw2, y]; }
    function hits(A, B) { return Math.min(A[2], B[2]) - Math.max(A[0], B[0]) > 2 && Math.min(A[3], B[3]) - Math.max(A[1], B[1]) > 0; }
    function onWords(t, y) { var A = wbox(t, y), m = 0; for (var c = 0; c < CHAP.length; c++) if (CHAP[c].o > .02 && hits(A, CHAP[c].box)) m = Math.max(m, CHAP[c].o); return m; }
    function clear(i, y) {
      var A = box(ST[i], y);
      if (A[1] < H * .3 || y > H - 12 || onWords(ST[i], y)) return false;
      for (var j = 0; j < i; j++) {
        var b = ST[j];
        if (b.o < .02 || b.sx < -900) continue;
        if (hits(A, box(b, b.sy))) return false;
      }
      return true;
    }
    for (var i = 0; i < ST.length; i++) {
      var a = ST[i];
      if (a.o < .02 || a.sx < -900 || clear(i, a.sy)) continue;
      var best = null, hh = a.hf * a.k, h1 = a.h1 * a.k, reach = W < 380 ? 4.5 : 2.2;   /* the smallest phones: the grass under the names is free, so a name may go further for room */
      var near = function (y, far) { if (Math.abs(y - a.sy) < far && (best == null || Math.abs(y - a.sy) < Math.abs(best - a.sy)) && clear(i, y)) best = y; };
      for (var j = 0; j < i; j++) {
        var b = ST[j];
        if (b.o < .02 || b.sx < -900) continue;
        var B = box(b, b.sy);
        near(B[3] + 4 + hh, h1 * reach); near(B[1] - 4 - h1 + hh, h1 * reach);
      }
      /* words showing over it: just under them, where the grass has room */
      for (var c = 0; c < CHAP.length; c++) if (CHAP[c].o > .02) near(CHAP[c].box[3] + 4 + hh, H);
      if (best != null) a.sy += ss(.05, W < 380 ? .2 : .6, a.o) * (best - a.sy);
    }
    /* a name that still finds no room steps back: under words that are up, all the way; on a name before it, into
       the distance, by how much of it the other covers (so it eases back as it moves clear) */
    function ovl(A, B) { var w = Math.min(A[2], B[2]) - Math.max(A[0], B[0]), h = Math.min(A[3], B[3]) - Math.max(A[1], B[1]); return w > 0 && h > 0 ? w * h / ((A[2] - A[0]) * (A[3] - A[1])) : 0; }
    for (var i = 0; i < ST.length; i++) {
      var a = ST[i];
      if (a.o < .02 || a.sx < -900) continue;
      var m = onWords(a, a.sy), A = box(a, a.sy), f = 0;
      for (var j = 0; j < i; j++) { var b = ST[j]; if (b.o >= .3 && b.sx > -900) f = Math.max(f, ovl(A, box(b, b.sy))); }
      var q = (1 - m) * (1 - (W < 380 ? 1 : .7) * ss(0, W < 380 ? .2 : .35, f));   /* there a ghost behind a name reads as a pile, so it goes altogether */
      if (q < 1) { a.o *= q; a.wo *= q; }
    }
    for (var n = 0; n < ST.length; n++) {
      var u = ST[n];
      var key = u.sx.toFixed(1) + u.sy.toFixed(1) + u.k.toFixed(3) + u.o.toFixed(3) + u.wo.toFixed(3);
      if (key === u.key) continue;
      u.key = key;
      var st = u.li.style;
      st.setProperty('--name-x', u.sx.toFixed(1) + 'px'); st.setProperty('--name-y', u.sy.toFixed(1) + 'px');
      if (u.kq == null || Math.abs(u.k / u.kq - 1) > .02) { u.kq = u.k; st.setProperty('--name-k', u.k.toFixed(3)); }
      st.setProperty('--name-s', (u.k / u.kq).toFixed(4));
      st.setProperty('--name-o', u.o.toFixed(3)); st.setProperty('--name-wo', u.wo.toFixed(3));
    }
  }

  /* ---------- sizing and frame ---------- */
  var W = 0, H = 0, N = 0, NMAX = 0, visible = false, raf = 0, t0 = performance.now(), last = 0, slow = 0, res = 1;
  function size() {
    var r = cv.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, r.width < 760 ? 2 : 1.25) * res;
    var w = Math.max(2, Math.round(r.width * dpr)), h = Math.max(2, Math.round(r.height * dpr));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    W = r.width; H = r.height;
    layoutTrail();
    measureChapters();
    NMAX = r.width < 760 ? 24000 : 52000;
    if (!N || N > NMAX) N = NMAX;
  }
  /* no jank: never more than one frame in flight. A fence tells us when the GPU has finished the
     last one; if it keeps falling behind, drop resolution a step, then shed blades (never below a third). */
  var fence = null;
  function frame(now) {
    raf = 0;
    if (!visible) return;
    if (fence) {
      if (gl.getSyncParameter(fence, gl.SYNC_STATUS) !== gl.SIGNALED) {
        if (++slow > 6) { slow = 0; if (res > .8) { res = .8; size(); } else if (N > NMAX / 3) N = Math.round(N * .82); }
        raf = requestAnimationFrame(frame); return;
      }
      gl.deleteSync(fence); fence = null; slow = Math.max(0, slow - .25);
    }
    var pin = reduced ? 1 : cl(parseFloat(d.style.getPropertyValue('--pin')) || 0);
    render(pin, reduced ? 0 : (now - t0) / 1000);
    fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0); gl.flush();
    if (!reduced) raf = requestAnimationFrame(frame);
  }
  function render(pin, time) {
    if (!W) size();
    var s = story(pin), asp = W / H;
    /* the camera turns toward the light: a lot in portrait, where the frame is narrow, a little in landscape */
    var follow = (asp < 1 ? .62 : .18) * (1 - ss(.62, .9, pin));
    s.tgt = [lerp(s.tgt[0], s.L[0], follow), s.tgt[1], s.tgt[2]];
    s.cam = [lerp(s.cam[0], s.L[0] * .35, follow * .5), s.cam[1], s.cam[2]];
    var fy = (asp < 1 ? 50 : 36) * Math.PI / 180;
    var P = persp(fy, asp, .05, 90), V = look(s.cam, s.tgt), VP = mul(P, V), IV = inv(VP);
    if (ST.length) placeTrail(VP, s, pin);
    var tanH = Math.tan(fy / 2) * asp;
    /* the nearest blades worth drawing: where a full-height tip first enters the bottom of the frame */
    var pitch = Math.atan2(s.cam[1] - s.tgt[1], s.cam[2] - s.tgt[2]);
    var near = Math.max(1.2, (s.cam[1] - 1.25) / Math.tan(pitch + fy / 2) - .25);
    var fog = [.012, .020, .012], glow = [.30, .62, .34];
    gl.viewport(0, 0, cv.width, cv.height);
    gl.clearColor(fog[0], fog[1], fog[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    function common(L) {
      gl.uniformMatrix4fv(L.uVP, false, VP); gl.uniform3fv(L.uCam, s.cam); gl.uniform1f(L.uTime, time); gl.uniform1f(L.uWind, reduced ? 0 : .34);
      gl.uniform4fv(L.uSt, s.st); gl.uniform3fv(L.uAll, s.all); gl.uniform4f(L.uLight, s.L[0], s.L[1], s.L[2], s.I);
      gl.uniform1f(L.uAmb, s.amb); gl.uniform1f(L.uRim, s.rim); gl.uniform1f(L.uTrace, s.trace); gl.uniform1f(L.uSpread, s.spread); gl.uniform2fv(L.uPath, PATH); gl.uniform1f(L.uTrail, s.trail); gl.uniform1f(L.uNear, near); gl.uniform1f(L.uFar, 46); gl.uniform1f(L.uTan, tanH); gl.uniform1f(L.uCount, N);
      gl.uniform3fv(L.uFog, fog); gl.uniform3fv(L.uGlow, glow); gl.uniform1f(L.uGlowI, s.glow);
      var hz = s.glow * (.30 + .12 * s.rim);                        /* the sky's own colour at the horizon */
      gl.uniform3f(L.uFogH, fog[0] + glow[0] * hz, fog[1] + glow[1] * hz, fog[2] + glow[2] * hz);
    }
    /* back: sky + ground */
    gl.disable(gl.DEPTH_TEST); gl.depthMask(false);
    gl.useProgram(pK); common(LK); gl.uniformMatrix4fv(LK.uInv, false, IV);
    gl.bindVertexArray(vaoQ); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    /* blades */
    gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.depthFunc(gl.LESS);
    gl.useProgram(pB); common(LB);
    gl.bindVertexArray(vaoB); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, LV * 2, N);
    /* the light */
    if (s.I > .002) {
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.depthMask(false);
      gl.useProgram(pL); common(LL); gl.uniform1f(LL.uAsp, asp); gl.uniform1f(LL.uSize, 1.1 / Math.tan(fy / 2));
      gl.bindVertexArray(vaoQ); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.disable(gl.BLEND); gl.depthMask(true);
    }
    gl.bindVertexArray(null);
  }
  function wake() { if (visible && !raf) raf = requestAnimationFrame(frame); }
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; last = 0; if (visible) wake(); }, { threshold: 0 }).observe(cv);
  else { visible = true; wake(); }
  if ('ResizeObserver' in window) new ResizeObserver(function () { size(); if (reduced) { visible = true; frame(performance.now()); } }).observe(cv);
  size();
  d.classList.add('gl-on');
  if (ENTRIES.length) {
    d.classList.add('trail-on');
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ST.forEach(function (t) { t.w1 = null; }); measureChapters(); });
  }
  if (reduced) { visible = true; frame(performance.now()); }
  }
})();
