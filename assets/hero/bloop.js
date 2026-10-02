/* ============================================================
   khyzr — the hero orb (assets/hero/bloop.js)

   Space UI's Bloop orb (spaceui.one/components/bloop, source at
   github.com/usespaceui/ui, MIT: the notice is at the end of this
   file), its WGSL verbatim below, in the look Cisco chose in the
   hero lab on 2 Oct 2026 (archived with his settings in
   ciscoggarrido/labs, khyzr-com/hero-lab):

     - the library's idle state, held steady and fully grown;
     - its paint at 0.42 of its scale and 0.92 of its pace, on a
       clock at 0.94;
     - a crisp edge (feather 0.2);
     - its light mapped onto a duotone of the system's greens
       (#0A690A to #EFF7EF), through a soft clip, a -1 degree hue
       turn that drifts at -0.01, saturation 1.2 and exposure -0.01;
     - a fine grain (0.035);
     - the hero's Bloom intro at 0.6, which the type follows.

   One WebGPU pass. The library's shape (its idle disc) and paint are
   read from its own shader, the paint by checked string swaps. The lab's grade is folded into
   the same fragment, and the canvas is drawn at the orb's size. The
   per-frame values are the library's component's, as the lab ran
   them: the idle demo audio, its smoothing, and its clock.

   The page:
     - sets html.orb-on while the orb draws;
     - sets html.orb-done when the type may enter;
     - sets html.orb-off when the still (bloop-still.webp, the same
       look at rest) stands in. That happens without WebGPU, on a
       software adapter, on a failure, or with reduced motion.
   The orb rests while the hero is out of view or the tab is hidden.

   ?t=<seconds> holds one frame, with no intro (for captures).
   ============================================================ */
(function () {
  'use strict';
  var root = document.documentElement, canvas = null;

  /* ---------------- the look: the hero lab's settings, 2 Oct 2026 ---------------- */
  var LOOK = {
    time: 0.94, flow: 0.92, hue: -1, hueCycle: -0.01, strength: 0.7, intro: 0.6,
    duo: ['#0A690A', '#EFF7EF'],
    /* the khyzr greens, given to the orb through its own colour props */
    main: '#DBE9DB', low: '#2F802F', mid: '#91BC91', high: '#EFF7EF'
  };
  /* the canvas spans the orb and a margin for the bloom's overshoot: 0.6 (the idle disc's
     diameter, in the library's units) x 1.12. The orb is drawn 0.9375 of the slot, as in the lab */
  var K = 0.672;

  function off() { root.classList.add('orb-off'); root.classList.remove('orb-on'); }
  function hex(h) { return [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255]; }
  var q = new URLSearchParams(location.search), hold = q.has('t') ? Math.max(0, parseFloat(q.get('t')) || 0) : null;
  if (hold == null && matchMedia('(prefers-reduced-motion: reduce)').matches) { off(); return; }
  if (!navigator.gpu) { off(); return; }

  /* ---------------- bloop.wgsl.ts, verbatim ---------------- */
  var BLOOP_WGSL = /* wgsl */ `
struct Ubo {
  time: f32,
  micLevel: f32,
  stateListen: f32,
  listenTimestamp: f32,
  stateThink: f32,
  thinkTimestamp: f32,
  stateSpeak: f32,
  speakTimestamp: f32,
  avgMag: vec4f,
  cumulativeAudio: vec4f,
  viewport: vec2f,
  watercolorStrength: f32,
  watercolorAnimated: f32,
  bloopColorMain: vec4f,
  bloopColorLow: vec4f,
  bloopColorMid: vec4f,
  bloopColorHigh: vec4f,
}

@group(0) @binding(0) var<uniform> ubo: Ubo;

const E: f32 = 2.71828182846;
const PI: f32 = 3.141592653589793;
const MAIN_R: f32 = 0.49;

fn scaled(edge0: f32, edge1: f32, x: f32) -> f32 {
  return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
}

fn spring(t: f32, d: f32) -> f32 {
  return 1.0 - exp(-E * 2.0 * t) * cos((1.0 - d) * 115.0 * t);
}

fn fixedSpring(t: f32, d: f32) -> f32 {
  let s = mix(spring(t, d), 1.0, scaled(0.0, 1.0, t));
  return s * (1.0 - t) + t;
}

fn silkySmooth(t: f32, k: f32) -> f32 {
  return atan(k * sin((t - 0.5) * PI)) / atan(k) * 0.5 + 0.5;
}

fn bounce(t: f32, d: f32) -> f32 {
  return -sin(PI * (1.0 - d) * t) * (1.0 - t) * exp(-E * 2.0 * t) * t * 10.0;
}

fn opSmoothUnion(d1: f32, d2: f32, k_in: f32) -> f32 {
  let k = max(k_in, 0.000001);
  let h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
  return mix(d2, d1, h) - k * h * (1.0 - h);
}

fn sdRoundedBox(p: vec2f, b: vec2f, rad: f32) -> f32 {
  let q = abs(p) - b + rad;
  return min(max(q.x, q.y), 0.0) + length(max(q, vec2f(0.0))) - rad;
}

fn permute(x: vec4f) -> vec4f {
  return ((x * 34.0 + 1.0) * x) % 289.0;
}

fn taylorInvSqrt(r: vec4f) -> vec4f {
  return 1.79284291400159 - 0.85373472095314 * r;
}

fn fade3(t: vec3f) -> vec3f {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

fn cnoise(P: vec3f) -> f32 {
  var Pi0 = floor(P);
  var Pi1 = Pi0 + vec3f(1.0);
  Pi0 = Pi0 % 289.0;
  Pi1 = Pi1 % 289.0;
  let Pf0 = fract(P);
  let Pf1 = Pf0 - vec3f(1.0);
  let ix = vec4f(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  let iy = vec4f(Pi0.yy, Pi1.yy);
  let iz0 = vec4f(Pi0.z);
  let iz1 = vec4f(Pi1.z);
  let ixy = permute(permute(ix) + iy);
  let ixy0 = permute(ixy + iz0);
  let ixy1 = permute(ixy + iz1);
  var gx0 = ixy0 / 7.0;
  var gy0 = fract(floor(gx0) / 7.0) - 0.5;
  gx0 = fract(gx0);
  var gz0 = vec4f(0.5) - abs(gx0) - abs(gy0);
  let sz0 = step(gz0, vec4f(0.0));
  gx0 -= sz0 * (step(vec4f(0.0), gx0) - 0.5);
  gy0 -= sz0 * (step(vec4f(0.0), gy0) - 0.5);
  var gx1 = ixy1 / 7.0;
  var gy1 = fract(floor(gx1) / 7.0) - 0.5;
  gx1 = fract(gx1);
  var gz1 = vec4f(0.5) - abs(gx1) - abs(gy1);
  let sz1 = step(gz1, vec4f(0.0));
  gx1 -= sz1 * (step(vec4f(0.0), gx1) - 0.5);
  gy1 -= sz1 * (step(vec4f(0.0), gy1) - 0.5);
  var g000 = vec3f(gx0.x, gy0.x, gz0.x);
  var g100 = vec3f(gx0.y, gy0.y, gz0.y);
  var g010 = vec3f(gx0.z, gy0.z, gz0.z);
  var g110 = vec3f(gx0.w, gy0.w, gz0.w);
  var g001 = vec3f(gx1.x, gy1.x, gz1.x);
  var g101 = vec3f(gx1.y, gy1.y, gz1.y);
  var g011 = vec3f(gx1.z, gy1.z, gz1.z);
  var g111 = vec3f(gx1.w, gy1.w, gz1.w);
  let norm0 = taylorInvSqrt(vec4f(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
  g000 *= norm0.x;
  g010 *= norm0.y;
  g100 *= norm0.z;
  g110 *= norm0.w;
  let norm1 = taylorInvSqrt(vec4f(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
  g001 *= norm1.x;
  g011 *= norm1.y;
  g101 *= norm1.z;
  g111 *= norm1.w;
  let n000 = dot(g000, Pf0);
  let n100 = dot(g100, vec3f(Pf1.x, Pf0.yz));
  let n010 = dot(g010, vec3f(Pf0.x, Pf1.y, Pf0.z));
  let n110 = dot(g110, vec3f(Pf1.xy, Pf0.z));
  let n001 = dot(g001, vec3f(Pf0.xy, Pf1.z));
  let n101 = dot(g101, vec3f(Pf1.x, Pf0.y, Pf1.z));
  let n011 = dot(g011, vec3f(Pf0.x, Pf1.yz));
  let n111 = dot(g111, Pf1);
  let fade_xyz = fade3(Pf0);
  let n_z = mix(vec4f(n000, n100, n010, n110), vec4f(n001, n101, n011, n111), fade_xyz.z);
  let n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
  return 2.2 * mix(n_yz.x, n_yz.y, fade_xyz.x);
}

fn watercolorTex(uv: vec2f, z: f32) -> f32 {
  let a = cnoise(vec3f(uv * 4.0, z));
  let b = cnoise(vec3f(uv * 8.0 + vec2f(5.2, 1.7), z + 1.1));
  return a * 0.65 + b * 0.35;
}

fn texDisp(uv: vec2f, z: f32, mixT: f32) -> f32 {
  let r = watercolorTex(uv, z) * 0.5 + 0.5;
  let g = watercolorTex(vec2f(uv.x, 1.0 - uv.y), z + 2.3) * 0.5 + 0.5;
  return mix(r - 0.5, g - 0.5, mixT);
}

fn hash21(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(12.9898, 4.1414))) * 43758.5453);
}

fn noise2(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  let res = mix(mix(hash21(i), hash21(i + vec2f(1.0, 0.0)), u.x), mix(hash21(i + vec2f(0.0, 1.0)), hash21(i + vec2f(1.0, 1.0)), u.x), u.y);
  return res * res;
}

fn fbm(x_in: vec2f) -> f32 {
  var x = x_in;
  var v = 0.0;
  var a = 0.5;
  let rot = mat2x2f(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
  for (var i = 0; i < 4; i++) {
    v += a * noise2(x);
    x = rot * x * 2.0 + vec2f(100.0);
    a *= 0.5;
  }
  return v;
}

fn blendLinearBurn(base: vec3f, blend: vec3f, opacity: f32) -> vec3f {
  let burned = max(base + blend - vec3f(1.0), vec3f(0.0));
  return burned * opacity + base * (1.0 - opacity);
}

fn idleDist(st: vec2f, time: f32) -> f32 {
  let midRadius = 0.12;
  let maxRadius = 0.3;
  let t1 = 1.0;
  let gamma = 3.0;
  let omega = PI / 2.0;
  let k = exp(-gamma) * omega;
  var radius: f32;
  if (time <= t1) {
    let tp = time / t1;
    radius = midRadius * (1.0 - exp(-gamma * tp) * cos(omega * tp));
  } else {
    radius = midRadius + (maxRadius - midRadius) * (1.0 - exp(-k * (time - t1)));
  }
  return length(st) - radius;
}

fn listenDist(st: vec2f, duration: f32, time: f32, mic: f32) -> f32 {
  let breathingSequence = sin(time) * 0.5 + 0.5;
  let entryAnimation = fixedSpring(scaled(0.0, 3.0, duration), 0.9);
  let l1 = mic;
  var radius = 0.38 + l1 * 0.05 + breathingSequence * 0.03;
  radius *= 1.0 - (1.0 - entryAnimation) * 0.25;
  return length(st) - radius;
}

fn thinkDist(st: vec2f, duration: f32, time: f32) -> f32 {
  let breathingSequence = sin(time) * 0.5 + 0.5;
  let entryAnimation = fixedSpring(scaled(0.0, 1.4, duration), 0.9);
  var radius = 0.38 + breathingSequence * 0.03;
  radius *= 1.0 - (1.0 - entryAnimation) * 0.25;
  let baseCircle = length(st) - radius;
  let deploy = smoothstep(0.35, 1.1, duration);
  var d = 1000.0;
  var ringRadi = MAIN_R * 0.45 * deploy;
  ringRadi -= (sin(PI * 4.0 + time * 3.0 - silkySmooth(time / 4.0, 2.0) * PI) * 0.5 + 0.5) * MAIN_R * 0.1 * deploy;
  let nodeRadius = mix(radius, MAIN_R * 0.5, deploy);
  for (var i = 0; i < 5; i++) {
    let f = (f32(i) + 0.5) / 5.0;
    let a = -f * PI * 2.0 + time / 3.0;
    let pos = vec2f(cos(a), sin(a)) * ringRadi;
    d = opSmoothUnion(d, length(st - pos) - nodeRadius, 0.035);
  }
  let cornerDeploy = smoothstep(0.5, 1.1, duration);
  let thinkingDotRadius = 0.06 * cornerDeploy;
  if (thinkingDotRadius > 0.001) {
    for (var i = 0; i < 5; i++) {
      let f = (f32(i) + 0.5) / 5.0;
      let dotAngle = f * PI * 2.0;
      let pulse = sin(PI * 4.0 + dotAngle * 2.0 + time * 0.4 * PI) * 0.5 + 0.5;
      let dotRingRadius = pulse * thinkingDotRadius * 0.3;
      let dotPos = vec2f(-MAIN_R, MAIN_R) * 0.8;
      let dotOffset = vec2f(cos(dotAngle + time), sin(dotAngle + time)) * dotRingRadius;
      d = opSmoothUnion(d, length(st - dotPos - dotOffset) - thinkingDotRadius * 0.8, 0.01);
    }
  }
  return mix(baseCircle, d, deploy);
}

fn speakDist(st: vec2f, duration: f32, time: f32, avg: vec4f) -> f32 {
  let breathing = sin(time) * 0.5 + 0.5;
  let zoom = fixedSpring(scaled(0.0, 1.15, duration), 0.9);
  var radius = 0.38 + breathing * 0.03;
  radius *= 1.0 - (1.0 - zoom) * 0.25;
  let baseCircle = length(st) - radius;
  let deploy = smoothstep(0.55, 1.25, duration);
  var d = 1000.0;
  let mag = array<f32, 4>(avg.x, avg.y, avg.z, avg.w);
  for (var i = 0; i < 4; i++) {
    let f = (f32(i) + 0.5) / 4.0;
    let w = (1.0 / 4.0) * 0.44;
    var h = w;
    let wave = sin(f * PI * 0.8 + time) * 0.5 + 0.5;
    let barIn = spring(scaled(0.05 + wave * 0.25, 0.85 + wave * 0.2, max(duration - 0.5, 0.0)), 0.98);
    var pos = vec2f(f - 0.5, 0.0) * MAIN_R * 1.9;
    pos *= mix(0.15, 1.0, barIn);
    h += mag[i] * (0.1 + (1.0 - abs(f - 0.5) * 2.0) * 0.1);
    h *= barIn;
    d = opSmoothUnion(d, sdRoundedBox(st - pos, vec2f(w, max(h, 0.001)), w), 0.2 * (1.0 - clamp(duration, 0.0, 1.0)));
  }
  return mix(baseCircle, d, deploy);
}

fn watercolor(st: vec2f) -> vec3f {
  let time = ubo.time * 0.85;
  let cum = ubo.cumulativeAudio;
  let audio = ubo.avgMag;
  let amp = clamp(ubo.watercolorStrength, 0.0, 1.0) * 2.0;
  var uv = st * (1.0 / (2.0 * 0.4)) + 0.5;
  uv.y = 1.0 - uv.y;
  let noiseX = cnoise(vec3f(uv + vec2f(0.0, 74.8572), (time + cum.x * 0.05) * 0.3));
  let noiseY = cnoise(vec3f(uv + vec2f(203.91282, 10.0), (time + cum.z * 0.05) * 0.3));
  uv += vec2f(noiseX * 2.0, noiseY) * 0.19 * amp;
  let noiseA = cnoise(vec3f(uv * 18.0 + vec2f(344.91282, 0.0), time * 0.3))
    + cnoise(vec3f(uv * 39.6 + vec2f(723.937, 0.0), time * 0.4)) * 0.5;
  uv += noiseA * 0.01 * amp;
  uv.y -= 0.09;
  let mixT = (sin(time + cum.w * 2.0) + 1.0) * 0.5;
  let texZ = select(0.0, time * 0.08, ubo.watercolorAnimated > 0.5);
  var textureUv = uv;
  let tex0 = texDisp(textureUv, texZ, mixT) * 0.08 * amp;
  textureUv += vec2f(63.861 + cum.x * 0.05, 368.937);
  let tex1 = texDisp(textureUv, texZ, mixT) * 0.08 * amp;
  textureUv += vec2f(453.163 - cum.z * 0.1, 1649.808 + cum.y * 0.1);
  let tex3 = texDisp(textureUv, texZ, mixT) * 0.08 * amp;
  uv += vec2f(tex0);
  var stn = uv * 1.25;
  let q = vec2f(
    fbm(stn * 0.5 + 0.075 * (time + cum.w * 0.175)),
    fbm(stn * 0.5 + 0.075 * (time + cum.x * 0.136))
  );
  let r = vec2f(
    fbm(stn + q + vec2f(0.3, 9.2) + 0.15 * (time + cum.y * 0.234)),
    fbm(stn + q + vec2f(8.3, 0.8) + 0.126 * (time + cum.z * 0.165))
  );
  let f = fbm(stn + r - q);
  var fullFbm = (f + 0.6 * f * f + 0.7 * f + 0.5) * 0.5;
  fullFbm = pow(fullFbm, 0.55);
  let sinOffsets = vec3f(cum.x * 0.15, -cum.y * 0.5, cum.z * 1.5);
  let snUv = uv + vec2f((fullFbm - 0.5) * 1.2 + tex0, 0.025 + tex0);
  let sn = noise2(snUv * 2.0 + vec2f(sin(sinOffsets.x * 0.25), time * 0.5 + sinOffsets.x)) * 2.0;
  var sn2 = smoothstep(sn - 1.8, sn + 1.8, (snUv.y - 0.5) * (5.0 - audio.x * 0.05) + 0.5);
  let snUvBis = uv + vec2f((fullFbm - 0.5) * 0.85 + tex1, 0.025 + tex1);
  let snBis = noise2(snUvBis * 4.0 + vec2f(sin(sinOffsets.y * 0.15) * 2.4 + 293.0, time + sinOffsets.y * 0.5)) * 2.0;
  var sn2Bis = smoothstep(snBis - (0.9 + audio.y * 0.4), snBis + (0.9 + audio.y * 0.8), (snUvBis.y - 0.6) * (5.0 - audio.y * 0.75) + 0.5);
  let snUvThird = uv + vec2f((fullFbm - 0.5) * 1.1 + tex3, tex3);
  let snThird = noise2(snUvThird * 6.0 + vec2f(sin(sinOffsets.z * 0.1) * 2.4 + 153.0, time * 1.2 + sinOffsets.z * 0.8)) * 2.0;
  let sn2Third = smoothstep(snThird - 0.7, snThird + 0.7, (snUvThird.y - 0.9) * 6.0 + 0.5);
  sn2 = pow(sn2, 0.8);
  sn2Bis = pow(sn2Bis, 0.9);
  var col = blendLinearBurn(ubo.bloopColorMain.xyz, ubo.bloopColorLow.xyz, 1.0 - sn2);
  col = blendLinearBurn(col, mix(ubo.bloopColorMain.xyz, ubo.bloopColorMid.xyz, 1.0 - sn2Bis), sn2);
  col = mix(col, mix(ubo.bloopColorMain.xyz, ubo.bloopColorHigh.xyz, 1.0 - sn2Third), sn2 * sn2Bis);
  return col;
}

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  var st = uv - 0.5;
  st.y *= ubo.viewport.y / max(ubo.viewport.x, 1.0);
  let t = ubo.time;
  let listenA = ubo.stateListen;
  let thinkA = ubo.stateThink;
  let speakA = ubo.stateSpeak;
  let listenDur = max(0.0, t - ubo.listenTimestamp);
  let thinkDur = max(0.0, t - ubo.thinkTimestamp);
  let speakDur = max(0.0, t - ubo.speakTimestamp);

  var dist = idleDist(st, t);
  var aMul = sin(PI / 0.7 * t) * 0.3 + 0.7;

  if (listenA > 0.001) {
    dist = mix(dist, listenDist(st, listenDur, t, ubo.micLevel), listenA);
    aMul = mix(aMul, 1.0, listenA);
  }
  if (thinkA > 0.001) {
    dist = mix(dist, thinkDist(st, thinkDur, t), thinkA);
    aMul = mix(aMul, 1.0, thinkA);
  }
  if (speakA > 0.001) {
    dist = mix(dist, speakDist(st, speakDur, t, ubo.avgMag), speakA);
    aMul = mix(aMul, 1.0, speakA);
  }

  let alpha = smoothstep(0.0075, 0.0, dist) * aMul;
  let col = watercolor(st);
  return vec4f(col * alpha, alpha);
}`;

  /* ---------------- vgpu's effect(): the fullscreen stage it adds to a fragment-only shader ---------------- */
  var FULLSCREEN = '\n' +
    'struct VgpuFullscreenVertexOut {\n' +
    '  @builtin(position) position: vec4f,\n' +
    '  @location(0) uv: vec2f,\n' +
    '};\n' +
    '@vertex fn vgpu_fullscreen_vs(@builtin(vertex_index) vi: u32) -> VgpuFullscreenVertexOut {\n' +
    '  var pos = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));\n' +
    '  var uv = array<vec2f, 3>(vec2f(0.0, 1.0), vec2f(2.0, 1.0), vec2f(0.0, -1.0));\n' +
    '  var out: VgpuFullscreenVertexOut;\n' +
    '  out.position = vec4f(pos[vi], 0.0, 1.0);\n' +
    '  out.uv = uv[vi];\n' +
    '  return out;\n' +
    '}\n';

  /* ---------------- the library's shape and paint, read from its source ---------------- */
  function cut(src, from, to) {
    var a = src.indexOf(from), b = to ? src.indexOf(to, a) : src.length;
    if (a < 0 || b < 0) throw new Error('Bloop source: "' + (a < 0 ? from : to).slice(0, 40) + '" not found');
    return src.slice(a, b);
  }
  function swap(s, a, b) {
    if (s.split(a).length !== 2) throw new Error('Bloop source: expected one "' + a.slice(0, 48) + '"');
    return s.replace(a, function () { return b; });
  }
  function derive(src) {
    var paint = cut(src, 'fn watercolor(st: vec2f) -> vec3f {', '@fragment fn fs_main(');
    paint = swap(paint, 'fn watercolor(st: vec2f) -> vec3f {', '/* the library’s watercolor, its clock an argument */\nfn paintAt(st: vec2f, wt: f32) -> vec3f {');
    paint = swap(paint, 'let time = ubo.time * 0.85;', 'let time = wt * 0.85;');
    /* the shape: the library's idle disc, held at its full size (it grows it from a dot by its clock); the
       other states never show here, so their shapes are left out of the build */
    return '\nfn bloopShape(st: vec2f) -> f32 { return idleDist(st, 1000.0); }\n' + paint + '\n';
  }

  /* ---------------- the look, one fragment ---------------- */
  var SITE_WGSL = /* wgsl */ `
struct Site {
  r0: vec4f, r1: vec4f, r2: vec4f, r3: vec4f,
  k: f32, paintT: f32, hue: f32, frame: f32,
  bloom: f32, ink: f32, pad0: f32, pad1: f32,
}
@group(0) @binding(1) var<uniform> site: Site;
const SCALE: f32 = 0.42;
const FEATHER: f32 = 0.2;
const EXPOSURE: f32 = -0.01;
const SATURATION: f32 = 1.2;
const GRAIN: f32 = 0.035;

/* light past white rolls off */
fn softClip(c: vec3f) -> vec3f {
  let k = 0.78;
  let over = max(c - vec3f(k), vec3f(0.0));
  return min(c, vec3f(k)) + (1.0 - k) * (vec3f(1.0) - exp(-over / (1.0 - k)));
}
fn lumi(c: vec3f) -> f32 { return dot(c, vec3f(0.2126, 0.7152, 0.0722)); }
fn hueRot(c: vec3f, a: f32) -> vec3f {
  let k = vec3f(0.57735027);
  let ca = cos(a);
  return c * ca + cross(k, c) * sin(a) + k * dot(k, c) * (1.0 - ca);
}
fn pcg(v: u32) -> u32 {
  let s = v * 747796405u + 2891336453u;
  let w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u;
  return (w >> 22u) ^ w;
}
fn hq(p: vec2f) -> f32 { return f32(pcg((u32(abs(p.x)) * 1597334677u) ^ pcg(u32(abs(p.y)) + 1013904223u)) & 0xffffffu) / 16777215.0; }
/* the duotone: four stops from deep green to the palest */
fn duotone(t_in: f32) -> vec3f {
  let t = clamp(t_in, 0.0, 1.0);
  let s = t * 3.0;
  let a = mix(site.r0.rgb, site.r1.rgb, smoothstep(0.0, 1.0, s));
  let b = mix(a, site.r2.rgb, smoothstep(1.0, 2.0, s));
  return mix(b, site.r3.rgb, smoothstep(2.0, 3.0, s));
}
/* the intro: the paint inks in from the centre, ahead of its front a pale wash of itself, the front
   a line of the orb's high colour */
fn inkIn(st: vec2f, c: vec3f) -> vec3f {
  let rr = length(st) / 0.4 + cnoise(vec3f(st * 6.0, 1.7)) * 0.06;
  let f0 = site.ink * 1.45 - 0.35;
  let inked = 1.0 - smoothstep(f0 - 0.22, f0 + 0.12, rr);
  let fd = (rr - f0) / 0.09;
  let front = exp(-fd * fd) * (1.0 - site.ink);
  let wash = mix(c, ubo.bloopColorMain.xyz, 0.72);
  return min(mix(wash, c, inked) + ubo.bloopColorHigh.xyz * front * 0.6, vec3f(1.0));
}
@fragment fn fs_site(@location(0) uv: vec2f, @builtin(position) fc: vec4f) -> @location(0) vec4f {
  var st = (uv - 0.5) * site.k;
  st.y *= ubo.viewport.y / max(ubo.viewport.x, 1.0);
  let px = site.k / max(ubo.viewport.x, 1.0);
  /* the shape opens from a dot with the intro's bloom */
  let b = max(site.bloom, 0.0001);
  let dist = bloopShape(st / b) * b;
  let alpha = smoothstep(max(0.0075 * FEATHER, px), 0.0, dist);
  if (alpha <= 0.0004) { return vec4f(0.0); }
  var col = softClip(max(paintAt(st / SCALE, site.paintT), vec3f(0.0)));
  if (site.ink < 0.999) { col = inkIn(st, col); }
  var rgb = hueRot(col * exp2(EXPOSURE), site.hue);
  rgb = mix(vec3f(lumi(rgb)), rgb, SATURATION);
  rgb = duotone(lumi(rgb));
  rgb += (hq(fc.xy + vec2f(site.frame * 37.0, site.frame * 17.0)) - 0.5) * GRAIN;
  rgb = clamp(rgb, vec3f(0.0), vec3f(1.0));
  return vec4f(rgb * alpha, alpha);
}
`;

  /* ---------------- the hero's intro: Bloom, timed as the engine timed it ---------------- */
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function span(t, a, b) { return clamp01((t - a) / (b - a)); }
  function ease(x) { x = clamp01(x); return 1 - Math.pow(1 - x, 3); }
  function spring(x) { x = clamp01(x); return x >= 1 ? 1 : 1 - Math.exp(-6.2 * x) * Math.cos(8.2 * x) * (1 - x * 0.2); }
  /* at u, the intro's own seconds: how far the orb has opened and its paint inked in; the type enters
     at 1.25, and it all comes to rest at 2 */
  function bloom(u) { return u >= 2 ? null : { bloom: spring(span(u, 0.1, 1.45)), ink: ease(span(u, 0.55, 2.0)) }; }

  /* ---------------- the uniforms ---------------- */
  /* the library's Ubo, 36 floats: time 0 · micLevel 1 · the three states and their timestamps 2-7 (idle:
     all 0) · avgMag 8 · cumulativeAudio 12 · viewport 16 · watercolorStrength 18 · watercolorAnimated 19 ·
     bloopColorMain 20 · Low 24 · Mid 28 · High 32 */
  var data = new Float32Array(36), siteData = new Float32Array(24);
  [LOOK.main, LOOK.low, LOOK.mid, LOOK.high].forEach(function (c, i) { data.set(hex(c), 20 + i * 4); data[23 + i * 4] = 1; });
  data[18] = LOOK.strength;
  (function () {
    var A = hex(LOOK.duo[0]), B = hex(LOOK.duo[1]), mix = function (a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; };
    [mix([0, 0, 0], A, 0.4), A, mix(A, B, 0.55), B].forEach(function (c, i) { siteData.set(c, i * 4); siteData[i * 4 + 3] = 1; });
  })();
  siteData[16] = K;

  /* the component's frame loop, idle in demo mode, on a clock at LOOK.time: the standby audio, smoothed
     and accumulated as the library does; the lab's paint clock and hue drift, stepped with it. dtV is the
     orb's own milliseconds */
  var clock = { v: 0, avg: [0, 0, 0, 0], cum: [0, 0, 0, 0], paint: 0, hue: 0, frame: 0 };
  function step(dtV) {
    var c = clock, dt = Math.min(dtV, 100) / 1000;
    c.v += dtV;
    var time = c.v / 1000, mic = Math.sin(time * 1.8) * 0.06 + 0.06, avg = [mic, mic * 0.5, mic * 0.35, mic * 0.2];
    for (var i = 0; i < 4; i++) { c.avg[i] += (avg[i] - c.avg[i]) * 0.55; c.cum[i] += c.avg[i] * (60 * dt) * 0.25; }
    c.paint += dt * LOOK.flow; c.hue += dt * LOOK.hueCycle * Math.PI / 5; c.frame = (c.frame + 1) % 4096;
    data[0] = time; data[1] = mic; data.set(c.avg, 8); data.set(c.cum, 12);
  }

  /* the canvas, as soon as the parser has it: this script loads async from the head, so the GPU work
     starts while the page is still arriving */
  function canvasReady() {
    return new Promise(function (res) {
      function look() { var c = document.querySelector('.orb-canvas'); if (c) { canvas = c; res(c); } return !!c; }
      if (look()) return;
      var mo = new MutationObserver(function () { if (look()) mo.disconnect(); });
      mo.observe(document.documentElement, { childList: true, subtree: true });
      document.addEventListener('DOMContentLoaded', function () { mo.disconnect(); if (!look()) res(null); }, { once: true });
    });
  }

  /* ---------------- WebGPU ---------------- */
  var device, context, pipeline, bind, ubo, sbo, format;
  var raf = 0, visible = !('IntersectionObserver' in window), introAt = null, cued = false, lastReal = 0, lastDraw = 0, late = false;
  /* the canvas at the screen's density, up to 2; lowered if frames run long */
  var scale = Math.min(window.devicePixelRatio || 1, 2), slow = 0, frames = 0, acc = 0;
  /* the canvas's box, kept by a ResizeObserver (read once here, after the page's styles apply) */
  var cssW = 0, cssH = 0;
  function size() {
    if (!cssW) { cssW = canvas.clientWidth; cssH = canvas.clientHeight; }
    var w = Math.max(1, Math.round(cssW * scale)), h = Math.max(1, Math.round(cssH * scale));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    data[16] = w; data[17] = h;
  }
  function draw(intro) {
    siteData[17] = clock.paint; siteData[18] = LOOK.hue * Math.PI / 180 + clock.hue; siteData[19] = clock.frame;
    siteData[20] = intro ? intro.bloom : 1; siteData[21] = intro ? intro.ink : 1;
    device.queue.writeBuffer(ubo, 0, data);
    device.queue.writeBuffer(sbo, 0, siteData);
    var enc = device.createCommandEncoder();
    var pass = enc.beginRenderPass({ colorAttachments: [{ view: context.getCurrentTexture().createView(), loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 0 } }] });
    pass.setPipeline(pipeline); pass.setBindGroup(0, bind); pass.draw(3); pass.end();
    device.queue.submit([enc.finish()]);
  }
  function frame(now) {
    raf = 0;
    if (!visible || document.hidden) return;
    raf = requestAnimationFrame(frame);
    /* every other frame on a screen faster than 100 Hz: the paint is slow, and it gains nothing */
    if (lastDraw && now - lastDraw < 10) return;
    var dt = lastReal ? Math.min(now - lastReal, 250) : 1000 / 60;
    lastReal = now; lastDraw = now;
    /* frames that run long, for a while, lower the canvas's density (not below 1) */
    if (dt < 250) { acc += dt; if (++frames === 90) { if (acc / frames > 28 && scale > 1) { scale = Math.max(1, scale * 0.8); } acc = 0; frames = 0; } }
    size();
    step(dt * LOOK.time);
    if (introAt == null) introAt = now;
    var u = (now - introAt) / 1000 * LOOK.intro, intro = bloom(u);
    if (!cued && u >= 1.25) { cued = true; root.classList.add('orb-done'); }
    draw(intro);
  }
  function wake() { if (!raf && visible && !document.hidden && pipeline) { lastReal = 0; lastDraw = 0; raf = requestAnimationFrame(frame); } }

  /* one frame held at a second of the orb's own clock, reached by stepping the component's values at 60 fps
     from the start (as the lab held its frames) */
  function holdAt(t) {
    var n = Math.max(1, Math.round(t * 60));
    step(0);
    for (var i = 0; i < n; i++) step(1000 / 60);
    size(); draw(null);
    root.classList.add('orb-done');
  }

  async function start() {
    var adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error('no adapter');
    var info = adapter.info || {};
    /* a software adapter would draw it slowly: the still is kinder */
    if (adapter.isFallbackAdapter || info.isFallbackAdapter) throw new Error('fallback adapter');
    device = await adapter.requestDevice();
    format = navigator.gpu.getPreferredCanvasFormat();
    ubo = device.createBuffer({ size: data.byteLength, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    sbo = device.createBuffer({ size: siteData.byteLength, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    /* straight to the pipeline: a shader error rejects it too, and waiting on the compilation info would cost a
       round trip to the GPU process */
    var module = device.createShaderModule({ code: FULLSCREEN + BLOOP_WGSL + derive(BLOOP_WGSL) + SITE_WGSL });
    pipeline = await device.createRenderPipelineAsync({
      layout: 'auto',
      vertex: { module: module, entryPoint: 'vgpu_fullscreen_vs' },
      fragment: { module: module, entryPoint: 'fs_site', targets: [{ format: format }] },
      primitive: { topology: 'triangle-list' }
    });
    bind = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: ubo } }, { binding: 1, resource: { buffer: sbo } }] });
    device.lost.then(function (e) { if (e && e.reason !== 'destroyed') { if (raf) cancelAnimationFrame(raf); raf = 0; pipeline = null; off(); } });
    /* too late: the still already stands in, and stays */
    if (late) { device.destroy(); return; }
    if (!(await canvasReady())) throw new Error('no canvas');
    context = canvas.getContext('webgpu');
    if (!context) throw new Error('no webgpu context');
    context.configure({ device: device, format: format, alphaMode: 'premultiplied' });
    root.classList.add('orb-on');
    if ('ResizeObserver' in window) new ResizeObserver(function () { cssW = canvas.clientWidth; cssH = canvas.clientHeight; if (hold != null && pipeline) { size(); draw(null); } }).observe(canvas);
    if (hold != null) { holdAt(hold); return; }
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; wake(); }).observe(canvas);
    document.addEventListener('visibilitychange', wake);
    wake();
  }
  /* if the orb isn't ready in a few seconds, the still stands in */
  var timer = setTimeout(function () { if (!pipeline) { late = true; off(); } }, 4000);
  start().then(function () { clearTimeout(timer); }, function (e) { clearTimeout(timer); if (raf) cancelAnimationFrame(raf); raf = 0; off(); if (window.console) console.info('The hero orb shows its still:', e && e.message); });
})();

/* ------------------------------------------------------------
   MIT License

   Copyright (c) 2026 Space UI

   Permission is hereby granted, free of charge, to any person obtaining a copy
   of this software and associated documentation files (the "Software"), to deal
   in the Software without restriction, including without limitation the rights
   to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   copies of the Software, and to permit persons to whom the Software is
   furnished to do so, subject to the following conditions:

   The above copyright notice and this permission notice shall be included in all
   copies or substantial portions of the Software.

   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
   SOFTWARE.
   ------------------------------------------------------------ */
