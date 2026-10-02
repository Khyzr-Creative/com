/* ============================================================
   khyzr — official pattern asset  ·  <khyzr-pattern>
   STATUS: adopted 2026-07-13. Source of truth for the cutout
   pattern used on SECTIONS and ELEMENTS (never full pages).

   This asset is the source of truth for production. Seeds, scales and themes in use
   are listed on the design system's Pattern page.
   This asset is the production form: STATIC, deterministic,
   container-sized, one shared WebGL context for any number of
   instances (each instance receives a plain 2D copy).

   Usage:
     <script src="design-system/assets/pattern/khyzr-pattern.js"></script>
     <div style="position:relative;overflow:hidden">
       <khyzr-pattern theme="dark" seed="7" style="position:absolute;inset:0"></khyzr-pattern>
       …content…
     </div>

   Attributes:
     theme  "dark" (green-900 canvas, palette colors composited
            at 10% over it — LOCKED look) | "light" (grayscale, 50%)
     seed   any number → deterministic composition (default 7)
     scale  cutout size multiplier, 0.5–2 sensible (default 1)
     animate  present → slow ambient drift (CSS transform only —
            zero re-rendering; auto-off under prefers-reduced-motion)

   Rules (the design system's Pattern page, guidelines/pattern.md):
     · sections, cards, media slots, dividers — not page bg
     · dark: text-safe as-is · light: keep text ≥ #262D29
     · never recolor; themes only
   ============================================================ */
(function(){
  'use strict';
  if (window.customElements && customElements.get('khyzr-pattern')) return;

  var MAXN = 44, TILE = 256, GRIDW = 8, ATLAS = 2048, NOISE = 512;

  /* ---- palette (mirrors tokens/colors.css · lab palette, recut 2026-08-08) ---- */
  function hx(h){ return [parseInt(h.slice(1,3),16)/255, parseInt(h.slice(3,5),16)/255, parseInt(h.slice(5,7),16)/255]; }
  var DARK = (function(){
    var bg = hx('#043304');   /* --green-900 */
    var over = function(c){ return [bg[0]+(c[0]-bg[0])*0.1, bg[1]+(c[1]-bg[1])*0.1, bg[2]+(c[2]-bg[2])*0.1]; };
    return { bg: bg, cols: ['#0C5C0C','#0A690A','#2F802F','#0D5E3C','#7FB57F','#DBEDDB'].map(hx).map(over), speck: 0.10 };
  })();
  var LIGHT = (function(){
    var bg = hx('#E9E9E9');
    var over = function(c){ return [bg[0]+(c[0]-bg[0])*0.5, bg[1]+(c[1]-bg[1])*0.5, bg[2]+(c[2]-bg[2])*0.5]; };
    return { bg: bg, cols: ['#FFFFFF','#F1F1F1','#DEDEDE','#C6C6C6','#EBEBEB','#D2D2D2'].map(hx).map(over), speck: -0.055 };
  })();
  var W6 = [0.24, 0.22, 0.16, 0.14, 0.14, 0.10];

  /* ---- shaders (from the retired lab, motion removed) ---- */
  var GLSL_COMMON = [
    'precision highp float;',
    'float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }',
    'vec4 hash42(vec2 p){ vec4 p4 = fract(vec4(p.xyxy) * vec4(.1031,.1030,.0973,.1099)); p4 += dot(p4, p4.wzxy + 33.33); return fract((p4.xxyz + p4.yzzw) * p4.zywx); }',
    'float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);',
    '  float a = hash12(i), b = hash12(i+vec2(1,0)), c = hash12(i+vec2(0,1)), d = hash12(i+vec2(1,1));',
    '  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y); }',
    'float wob2(vec2 p){ return vnoise(p)*0.68 + vnoise(p*2.1+5.2)*0.32; }',
    'float smin(float a, float b, float k){ float h = clamp(0.5 + 0.5*(b-a)/k, 0.0, 1.0); return mix(b, a, h) - k*h*(1.0-h); }',
    'float smax(float a, float b, float k){ return -smin(-a, -b, k); }',
    'float sdCap(vec2 p, vec2 a, vec2 b, float r){ vec2 pa = p-a, ba = b-a;',
    '  float h = clamp(dot(pa,ba)/max(dot(ba,ba),1e-4), 0.0, 1.0); return length(pa - ba*h) - r; }',
    'vec4 H4s(float s, float k){ return hash42(vec2(s*913.37 + k*1.7, s*457.13 - k)); }'
  ].join('\n');

  var GLSL_SDF = [
    'float shapeSDF(vec2 q0, float U, float rot, vec4 mt){',
    '  float cs = cos(rot), sn = sin(rot);',
    '  vec2 q = mat2(cs, -sn, sn, cs) * q0;',
    '  q = vec2(q.x * mt.x, q.y / mt.x);',
    '  float s5 = mt.w;',
    '  float d = 1e5;',
    '  if (mt.y < 0.5) {',
    '    vec4 r3 = H4s(s5, 29.0);',
    '    float n = 3.0 + floor(r3.x * 2.99);',
    '    float a0 = r3.y * 6.2831;',
    '    float fan = 1.5 + r3.z * 0.6;',
    '    for (int i = 0; i < 5; i++){',
    '      if (float(i) >= n) break;',
    '      vec4 rr = H4s(s5, 5.0 + float(i)*13.1);',
    '      float a = a0 + (float(i)/(n - 1.0) - 0.5) * fan + (rr.w - 0.5)*0.16;',
    '      vec2 dir = vec2(cos(a), sin(a));',
    '      float len = U*(0.36 + 0.24*rr.y);',
    '      float w   = U*(0.15 + 0.05*rr.z);',
    '      d = smin(d, sdCap(q, dir*U*0.14, dir*len, w), U*0.055);',
    '    }',
    '    vec2 bd = vec2(cos(a0), sin(a0));',
    '    d = smin(d, length(q + bd*U*0.10) - U*0.34, U*0.16);',
    '  } else if (mt.y < 1.5) {',
    '    vec4 f1 = H4s(s5, 45.0);',
    '    float a0 = f1.x * 6.2831;',
    '    vec2 dir = vec2(cos(a0), sin(a0));',
    '    vec2 per = vec2(-dir.y, dir.x);',
    '    float L = U*(0.44 + 0.14*f1.y);',
    '    float bend = (f1.z - 0.5) * 0.7;',
    '    vec2 pA = -dir*L*0.9;',
    '    vec2 pM =  per*(-bend*0.30*L);',
    '    vec2 pB =  dir*L + per*(bend*L*0.55);',
    '    float wA = U*(0.26 + 0.06*f1.w);',
    '    float wB = wA*(0.45 + 0.20*fract(f1.w*7.7));',
    '    d = sdCap(q, pA, pM, wA);',
    '    d = smin(d, sdCap(q, pM, pB, wB), U*0.24);',
    '    d = smin(d, length(q - pB) - wB*1.15, U*0.12);',
    '  } else {',
    '    vec4 r3 = H4s(s5, 9.0);',
    '    vec4 r4 = H4s(s5, 17.0);',
    '    vec4 r5 = H4s(s5, 33.0);',
    '    d = length(q - (r3.xy - 0.5)*U*0.20) - U*(0.42 + 0.12*r3.z);',
    '    vec2 o4 = normalize(r4.xy - 0.5 + 0.001) * U * (0.26 + 0.14*r4.w);',
    '    d = smin(d, length(q - o4) - U*(0.30 + 0.10*r4.z), U*0.26);',
    '    if (r5.w > 0.45){',
    '      vec2 o5 = normalize(r5.xy - 0.5 + 0.001) * U * (0.30 + 0.14*r5.w);',
    '      d = smin(d, length(q - o5) - U*(0.24 + 0.10*r5.z), U*0.26);',
    '    }',
    '    if (r5.x < 0.18){',
    '      vec2 hp = (r5.yz - 0.5) * U * 0.24;',
    '      d = smax(d, -(length(q - hp) - U*(0.09 + 0.10*r5.y)), U*0.10);',
    '    }',
    '  }',
    '  float wob = wob2(q * (1.1/U) + vec2(s5*8.0, s5*3.7));',
    '  d += (wob - 0.5) * U * 0.005;',
    '  return d;',
    '}'
  ].join('\n');

  var FS_BAKE = GLSL_COMMON + '\n' + GLSL_SDF + '\n' + [
    'uniform vec2  uTileC;',
    'uniform float uRot;',
    'uniform vec4  uMt;',
    'void main(){',
    '  vec2 q = (gl_FragCoord.xy - uTileC) / 100.0;',
    '  float d = shapeSDF(q, 1.0, uRot, uMt);',
    '  float v = clamp((d + 1.28) / 2.56, 0.0, 1.0);',
    '  float x = floor(v * 65535.0 + 0.5);',
    '  float hi = floor(x / 256.0);',
    '  gl_FragColor = vec4(hi / 255.0, (x - hi * 256.0) / 255.0, 0.0, 1.0);',
    '}'
  ].join('\n');

  var FS_NOISE = GLSL_COMMON + '\n' + [
    'float vnW(vec2 p, float per, vec2 off){',
    '  vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);',
    '  float a = hash12(mod(i, per) + off);',
    '  float b = hash12(mod(i + vec2(1,0), per) + off);',
    '  float c = hash12(mod(i + vec2(0,1), per) + off);',
    '  float d = hash12(mod(i + vec2(1,1), per) + off);',
    '  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);',
    '}',
    'float fbmW(vec2 uv, vec2 off){',
    '  return vnW(uv*64.0, 64.0, off)*0.55 + vnW(uv*128.0, 128.0, off + vec2(9.1,3.7))*0.30 + vnW(uv*256.0, 256.0, off + vec2(1.7,8.3))*0.15;',
    '}',
    'void main(){',
    '  vec2 uv = gl_FragCoord.xy / 512.0;',
    '  gl_FragColor = vec4(fbmW(uv, vec2(7.0,7.0)), fbmW(uv, vec2(21.0,13.0)), vnW(uv*64.0, 64.0, vec2(3.3,5.1)), hash12(floor(gl_FragCoord.xy) + vec2(37.0,17.0)));',
    '}'
  ].join('\n');

  var FS_MAIN = GLSL_COMMON + '\n' + [
    'uniform float uS;',
    'uniform vec3  uBg;',
    'uniform vec3  uCols[6];',
    'uniform float uSpeck;',
    'uniform float uPx;',
    'uniform int   uCount;',
    'uniform vec4  uPosR[44];',
    'uniform vec4  uMeta[44];',
    'uniform sampler2D uAtlas;',
    'uniform sampler2D uNoise;',
    'float dec(vec4 c){ return c.r*(65280.0/65535.0) + c.g*(255.0/65535.0); }',
    'float sdfAt(vec2 uv){',
    '  vec2 tp = uv * 2048.0 - 0.5;',
    '  vec2 ip = floor(tp), f = tp - ip;',
    '  vec2 b = (ip + 0.5) * (1.0/2048.0);',
    '  float d00 = dec(texture2D(uAtlas, b));',
    '  float d10 = dec(texture2D(uAtlas, b + vec2(1.0/2048.0, 0.0)));',
    '  float d01 = dec(texture2D(uAtlas, b + vec2(0.0, 1.0/2048.0)));',
    '  float d11 = dec(texture2D(uAtlas, b + vec2(1.0/2048.0, 1.0/2048.0)));',
    '  return mix(mix(d00,d10,f.x), mix(d01,d11,f.x), f.y);',
    '}',
    'void main(){',
    '  vec2 p = gl_FragCoord.xy;',
    '  float S = uS;',
    '  float d1 = 1e5, d2 = 1e5;',
    '  float ci = 0.0, wSeed = 0.0, wU = S;',
    '  vec2 wPos = vec2(0.0);',
    '  for (int i = 0; i < 44; i++){',
    '    if (i >= uCount) break;',
    '    vec4 pr = uPosR[i];',
    '    vec2 q0 = p - pr.xy;',
    '    float U = pr.z * 1.8;',
    '    if (dot(q0,q0) > U*U*1.5) continue;',
    '    vec4 mt = uMeta[i];',
    '    float fi = float(i);',
    '    vec2 uv = (vec2(mod(fi, 8.0), floor(fi / 8.0)) + q0/(2.56*U) + 0.5) * 0.125;',
    '    float d = (sdfAt(uv) * 2.56 - 1.28) * U;',
    '    if (d < d1){ d2 = d1; d1 = d; ci = mt.z; wPos = pr.xy; wSeed = mt.w; wU = U; }',
    '    else if (d < d2){ d2 = d; }',
    '  }',
    '  if (d1 < S * 0.6){',
    '    float wob = wob2((p - wPos) * (1.1/wU) + vec2(wSeed*8.0, wSeed*3.7));',
    '    float wpx = (wob - 0.5) * wU * 0.005;',
    '    d1 += wpx; d2 += wpx;',
    '  }',
    '  float gap = S * 0.07;',
    '  float dDraw = smax(d1, gap - (d2 - d1), S*0.105);',
    '  float aa = 1.5 * uPx;',
    '  float m = smoothstep(aa, -aa, dDraw);',
    '  vec3 shapeCol = uCols[0];',
    '  for (int i = 1; i < 6; i++){ if (float(i) == ci) shapeCol = uCols[i]; }',
    '  shapeCol *= 1.0 + (fract(wSeed*57.13) - 0.5) * 0.06;',
    '  vec3 col = mix(uBg, shapeCol, m);',
    '  vec2 gq = (p - wPos * m) / uPx + wSeed * 713.0 * m;',
    '  float mottle = texture2D(uNoise, gq * (0.013/64.0)).r;',
    '  float fiber  = texture2D(uNoise, gq * (0.055/64.0)).g;',
    '  float grain  = texture2D(uNoise, (floor(gq * 1.1) + 0.5) * (1.0/512.0)).a;',
    '  col *= 1.0 + (mottle - 0.5)*0.085 + (fiber - 0.5)*0.045;',
    '  col += (grain - 0.5) * 0.055;',
    '  float low = texture2D(uNoise, gq * (0.0022/64.0)).b;',
    '  col *= 1.0 + (low - 0.5)*0.055;',
    '  float sp = step(0.9972, hash12(floor(gq * 0.7) + 13.7));',
    '  col += sp * uSpeck;',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  /* ---- shared renderer (one GL context for all instances) ---- */
  var R = null;   /* lazily created; null = failed (fallback fills) */
  function getRenderer(){
    if (R !== null) return R.ok ? R : null;
    R = { ok: false };
    var cv = document.createElement('canvas');
    var gl = cv.getContext('webgl', { antialias:false, alpha:false, depth:false, stencil:false, preserveDrawingBuffer:true })
          || cv.getContext('experimental-webgl');
    if (!gl) return null;
    if (gl.getParameter(gl.MAX_TEXTURE_SIZE) < ATLAS) return null;

    var soft = false;
    try {
      var dbg = gl.getExtension('WEBGL_debug_renderer_info');
      var rs = String(dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
      soft = /swiftshader|llvmpipe|software|basic render/i.test(rs);
    } catch(e){}

    var vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, 'attribute vec2 aPos; void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }');
    gl.compileShader(vsh);
    function prog(fs){
      var f = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(f, fs); gl.compileShader(f);
      var p = gl.createProgram();
      gl.attachShader(p, vsh); gl.attachShader(p, f);
      gl.bindAttribLocation(p, 0, 'aPos');
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)){ console.warn('khyzr-pattern:', gl.getShaderInfoLog(f) || gl.getProgramInfoLog(p)); return null; }
      gl.deleteShader(f);
      return p;
    }
    function locs(p, names){ var o = {}; for (var i = 0; i < names.length; i++) o[names[i]] = gl.getUniformLocation(p, names[i]); return o; }
    function target(size, linear, repeat){
      var tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, linear ? gl.LINEAR : gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, linear ? gl.LINEAR : gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE);
      var fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      var ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return ok ? { tex:tex, fb:fb } : null;
    }

    var pMain = prog(FS_MAIN), pBake = prog(FS_BAKE), pNoise = prog(FS_NOISE);
    if (!pMain || !pBake || !pNoise) return null;
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    var atlas = target(ATLAS, false, false), noise = target(NOISE, true, true);
    if (!atlas || !noise) return null;

    /* bake grain once */
    gl.useProgram(pNoise);
    gl.bindFramebuffer(gl.FRAMEBUFFER, noise.fb);
    gl.viewport(0, 0, NOISE, NOISE);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.useProgram(pMain);
    gl.uniform1i(gl.getUniformLocation(pMain, 'uAtlas'), 0);
    gl.uniform1i(gl.getUniformLocation(pMain, 'uNoise'), 1);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, atlas.tex);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, noise.tex);

    R = {
      ok: true, cv: cv, gl: gl, soft: soft,
      pMain: pMain, pBake: pBake, atlas: atlas,
      Lm: locs(pMain, ['uS','uBg','uCols','uSpeck','uPx','uCount','uPosR','uMeta']),
      Lb: locs(pBake, ['uTileC','uRot','uMt']),
      posBuf: new Float32Array(MAXN*4), metaBuf: new Float32Array(MAXN*4), colsBuf: new Float32Array(18)
    };
    return R;
  }

  function mulberry(a){
    a = Math.floor(a * 9301 + 49297) >>> 0;
    return function(){
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* layout: bleeding jittered grid + relaxation (no motion — this is the still) */
  function makeShapes(Wc, Hc, seed, scale){
    var minD = Math.min(Wc, Hc);
    var Scss = Math.max(140, Math.min(460, Math.max(minD * 0.5, Math.sqrt(Wc * Hc) * 0.28))) * (scale || 1);
    var rnd = mulberry(seed);
    rnd(); /* keep sequence alignment with the lab's river draw */
    var shapes = [];
    var cols = Math.ceil(Wc / Scss) + 2, rows = Math.ceil(Hc / Scss) + 2;
    var over = (cols * rows) / 40;
    if (over > 1){
      Scss *= Math.sqrt(over);
      cols = Math.ceil(Wc / Scss) + 2; rows = Math.ceil(Hc / Scss) + 2;
    }
    var px = Wc / (cols - 2), py = Hc / (rows - 2);
    for (var gy = 0; gy < rows; gy++)
    for (var gx = 0; gx < cols; gx++){
      if (rnd() < 0.10) continue;
      if (shapes.length >= MAXN) break;
      var sc = 0.95 + 0.33 * Math.pow(rnd(), 2);
      if (rnd() < 0.03) sc *= 7.0;
      var x = (gx - 0.5) * px + (rnd() - 0.5) * px * 0.6;
      var y = (gy - 0.5) * py + (rnd() - 0.5) * py * 0.6;
      var tt = rnd();
      shapes.push({
        x: x, y: y,
        r: Math.min(Scss * 0.59 * sc, minD * 0.6),
        rot: rnd()*6.283, sq: 0.94 + rnd()*0.12,
        type: tt < 0.30 ? 0 : (tt < 0.58 ? 1 : 2),
        sd: rnd(), col: 0
      });
    }
    var gapT = Scss * 0.26;
    for (var it = 0; it < 150; it++){
      for (var i = 0; i < shapes.length; i++)
      for (var j = i + 1; j < shapes.length; j++){
        var a = shapes[i], b = shapes[j];
        var dx = b.x - a.x, dy = b.y - a.y;
        var dist = Math.max(Math.hypot(dx, dy), 0.001);
        var want = (a.r + b.r) * 1.02 + gapT;
        if (dist < want){
          var push = (want - dist) * 0.42;
          var wa = b.r*b.r / (a.r*a.r + b.r*b.r);
          var ux = dx / dist, uy = dy / dist;
          a.x -= ux * push * wa;       a.y -= uy * push * wa;
          b.x += ux * push * (1 - wa); b.y += uy * push * (1 - wa);
        }
      }
    }
    /* greedy colouring: neighbours never share */
    for (var m = 0; m < shapes.length; m++){
      var s = shapes[m], banned = {};
      for (var n = 0; n < m; n++){
        var o = shapes[n];
        if (Math.hypot(s.x - o.x, s.y - o.y) < (s.r + o.r) * 1.35) banned[o.col] = 1;
      }
      var maxIdx = s.r > Scss ? 4 : 5;
      var best = -1, r = rnd(), acc = 0, total = 0, w;
      for (w = 0; w <= maxIdx; w++) if (!banned[w]) total += W6[w];
      if (total === 0) { s.col = (m % (maxIdx + 1)); continue; }
      r *= total;
      for (w = 0; w <= maxIdx; w++){
        if (banned[w]) continue;
        acc += W6[w];
        if (r <= acc) { best = w; break; }
      }
      s.col = best < 0 ? 0 : best;
    }
    return { shapes: shapes, Scss: Scss };
  }

  /* render one static composition into the shared GL canvas */
  function renderGL(wDev, hDev, cssW, cssH, dpr, theme, seed, scale){
    var r = getRenderer();
    if (!r) return null;
    var gl = r.gl;
    if (r.cv.width !== wDev || r.cv.height !== hDev){ r.cv.width = wDev; r.cv.height = hDev; }
    var lay = makeShapes(cssW, cssH, seed, scale);
    var shapes = lay.shapes;
    var n = Math.min(shapes.length, MAXN);

    /* bake tiles */
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.useProgram(r.pBake);
    gl.bindFramebuffer(gl.FRAMEBUFFER, r.atlas.fb);
    for (var i = 0; i < n; i++){
      var s = shapes[i];
      var tx = (i % GRIDW) * TILE, ty = ((i / GRIDW) | 0) * TILE;
      gl.viewport(tx, ty, TILE, TILE);
      gl.uniform2f(r.Lb.uTileC, tx + TILE/2, ty + TILE/2);
      gl.uniform1f(r.Lb.uRot, s.rot);
      gl.uniform4f(r.Lb.uMt, s.sq, s.type, s.col, s.sd);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, r.atlas.tex);
    gl.viewport(0, 0, wDev, hDev);

    /* composite */
    var P = theme === 'light' ? LIGHT : DARK;
    for (var k = 0; k < n; k++){
      var sh = shapes[k];
      r.posBuf[k*4]   = sh.x * dpr;
      r.posBuf[k*4+1] = hDev - sh.y * dpr;
      r.posBuf[k*4+2] = sh.r * dpr;
      r.posBuf[k*4+3] = sh.rot;
      r.metaBuf[k*4]   = sh.sq;
      r.metaBuf[k*4+1] = sh.type;
      r.metaBuf[k*4+2] = sh.col;
      r.metaBuf[k*4+3] = sh.sd;
    }
    for (var c = 0; c < 6; c++)
      for (var q = 0; q < 3; q++)
        r.colsBuf[c*3+q] = P.cols[c][q];
    gl.useProgram(r.pMain);
    gl.uniform1f(r.Lm.uS, lay.Scss * dpr);
    gl.uniform3f(r.Lm.uBg, P.bg[0], P.bg[1], P.bg[2]);
    gl.uniform3fv(r.Lm.uCols, r.colsBuf);
    gl.uniform1f(r.Lm.uSpeck, P.speck);
    gl.uniform1f(r.Lm.uPx, dpr);
    gl.uniform1i(r.Lm.uCount, n);
    gl.uniform4fv(r.Lm.uPosR, r.posBuf);
    gl.uniform4fv(r.Lm.uMeta, r.metaBuf);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    return r.cv;
  }

  /* ---- the custom element ---- */
  var proto = Object.create(HTMLElement.prototype);

  function ensureDriftCSS(){
    if (document.getElementById('kz-pattern-drift')) return;
    var st = document.createElement('style');
    st.id = 'kz-pattern-drift';
    st.textContent = '@keyframes kzDrift{0%,100%{transform:scale(1.05)}33%{transform:scale(1.078) translate(-0.9%,0.7%)}66%{transform:scale(1.062) translate(0.8%,-0.6%)}}';
    document.head.appendChild(st);
  }

  function paint(el){
    var w = el.clientWidth, h = el.clientHeight;
    if (w < 4 || h < 4) return;
    var theme = (el.getAttribute('theme') === 'light') ? 'light' : 'dark';
    var seed = parseFloat(el.getAttribute('seed'));
    if (!isFinite(seed)) seed = 7;
    var scale = parseFloat(el.getAttribute('scale'));
    if (!isFinite(scale) || scale <= 0) scale = 1;

    var r = getRenderer();
    var dpr = Math.min(window.devicePixelRatio || 1, (r && r.soft) ? 1 : 1.75);
    /* cap total pixels — patterns are soft, gentle upscale is invisible */
    var area = w * h * dpr * dpr;
    if (area > 4.2e6) dpr *= Math.sqrt(4.2e6 / area);
    var wDev = Math.max(4, Math.round(w * dpr)), hDev = Math.max(4, Math.round(h * dpr));

    var cv = el.__kzCanvas;
    if (!cv){
      cv = el.__kzCanvas = document.createElement('canvas');
      cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
      el.appendChild(cv);
    }
    cv.width = wDev; cv.height = hDev;
    var anim = el.hasAttribute('animate') && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (anim){
      ensureDriftCSS();
      cv.style.transformOrigin = '50% 50%';
      cv.style.animation = 'kzDrift 46s ease-in-out infinite';
    } else {
      cv.style.animation = '';
    }
    var ctx = cv.getContext('2d');
    var src = renderGL(wDev, hDev, w, h, dpr, theme, seed, scale);
    if (src){
      ctx.drawImage(src, 0, 0);
    } else {
      /* no WebGL: quiet solid fill in the theme canvas colour */
      ctx.fillStyle = theme === 'light' ? '#E9E9E9' : '#043304';
      ctx.fillRect(0, 0, wDev, hDev);
    }
    el.__kzSize = w + 'x' + h + '/' + theme + '/' + seed + '/' + scale;
  }

  proto.connectedCallback = function(){
    var el = this;
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.style.display = el.style.display || 'block';
    el.style.overflow = 'hidden';
    paint(el);
    // Self-heal: hosts like <doc-page> can resize this element after the
    // connect-time paint (flowing→paginated flip). Repaint whenever the
    // painted size disagrees with the current client size.
    var recheck = function(){
      if (!el.isConnected) return;
      var key = el.clientWidth + 'x' + el.clientHeight;
      if (!el.__kzSize || el.__kzSize.indexOf(key + '/') !== 0) paint(el);
    };
    el.__kzT1 = setTimeout(recheck, 250);
    el.__kzT2 = setTimeout(recheck, 900);
    if (!el.__kzIv) el.__kzIv = setInterval(recheck, 600);
    if ('ResizeObserver' in window && !el.__kzRO){
      var to = 0;
      el.__kzRO = new ResizeObserver(function(){
        clearTimeout(to);
        to = setTimeout(recheck, 80);
      });
      el.__kzRO.observe(el);
    }
  };
  proto.disconnectedCallback = function(){
    if (this.__kzRO){ this.__kzRO.disconnect(); this.__kzRO = null; }
    if (this.__kzT1){ clearTimeout(this.__kzT1); this.__kzT1 = null; }
    if (this.__kzT2){ clearTimeout(this.__kzT2); this.__kzT2 = null; }
    if (this.__kzIv){ clearInterval(this.__kzIv); this.__kzIv = null; }
  };
  proto.attributeChangedCallback = function(){ if (this.isConnected) paint(this); };

  function KhyzrPattern(){ return Reflect.construct(HTMLElement, [], KhyzrPattern); }
  KhyzrPattern.prototype = proto;
  Object.setPrototypeOf(KhyzrPattern, HTMLElement);
  KhyzrPattern.observedAttributes = ['theme','seed','scale','animate'];
  customElements.define('khyzr-pattern', KhyzrPattern);
})();
