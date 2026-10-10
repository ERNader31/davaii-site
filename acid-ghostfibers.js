/* ===== Ghost Fibers background (vanilla port of react-bits GhostFibers, MIT) ===== */
(()=> {
  const cv = document.getElementById('acid');
  if (!cv) return;
  let gl = null;
  try {
    gl = cv.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
  } catch (e) { gl = null; }
  if (!gl) { cv.style.display = 'none'; return; }

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // settings tuned for a light minimal RTL Persian site
  const S = {
    glowColor: '#A8251C',       // accent, light theme
    lineColor: '#171310',       // ink, light theme
    speed: 0.2,
    scale: 2,
    rotation: 0,
    rotationSpeed: 0.25,
    layers: 4,
    waves: 0.015,
    twist: 0.1,
    threads: 1,
    spread: 1,
    thickness: 1,
    glow: 2,
    brightness: 1.4,
    vignette: 0.8,
    grain: 0.03,
    mouseInteraction: true,
    intro: true,
    lightMode: true,
    paused: false,
    dpr: undefined
  };

  const MAX_RENDER_DIM = 2048;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const VERTEX = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

  const FRAGMENT = `#version 300 es
precision highp float;
out vec4 outColor;
uniform vec2 uResolution;
uniform float uDpr;
uniform float uTime;
uniform float uAngle;
uniform float uScale;
uniform float uLayers;
uniform float uWaves;
uniform float uTwist;
uniform float uThreads;
uniform float uSpread;
uniform float uThickness;
uniform float uGlow;
uniform float uBrightness;
uniform float uVignette;
uniform float uGrain;
uniform float uIntro;
uniform vec3 uGlowColor;
uniform vec3 uLineColor;
uniform vec4 uLens;
uniform float uLight;

const float PI = 3.14159265359;

mat2 rotate2d(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat2(c, -s, s, c);
}

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float hairline(float value, float width, float px) {
  px = max(px, 1e-5);
  float w = 0.5 * width * uDpr * px;
  float draw = max(w, 0.75 * px);
  return exp(-value * value / (draw * draw)) * (w / draw);
}

void main() {
  vec2 resolution = uResolution * uDpr;
  vec2 uv = (2.0 * gl_FragCoord.xy - resolution) / resolution.y;
  float time = uTime;
  vec2 p = uv / max(uScale, 0.05);
  p = rotate2d(uAngle) * p;

  vec2 lensPoint = (2.0 * vec2(uLens.x, uResolution.y - uLens.y) * uDpr - resolution) / resolution.y;
  float lens = exp(-dot(uv - lensPoint, uv - lensPoint) / (uLens.z * uLens.z)) * uLens.w;

  float threads = 0.0;
  float ghosts = 0.0;
  float halo = 0.0;

  for (int index = 0; index < 10; index++) {
    float fi = float(index) + 1.0;
    if (fi > uLayers) break;

    p += uWaves * sin(p.yx * fi * 3.0 + time * (0.15 + fi * 0.08));
    float radius = length(p);
    float polarAngle = atan(p.y, p.x);
    polarAngle += sin(radius * 5.0 - time * 1.2 + fi) * uTwist;
    p = vec2(cos(polarAngle), sin(polarAngle)) * radius;

    float strand = p.x * 3.0 + time + fi;
    float center = PI * floor(strand / PI + 0.5);
    float offset = strand - center;
    float strandId = center / PI;
    halo += exp(-8.0 * abs(sin(strand))) / fi;

    float count = max(uThreads, 1.0);
    float even = 1.0 - mod(count, 2.0);
    float spacing = 0.03 * uSpread;
    float slot = offset / spacing + 0.5 * even;
    float slotPx = fwidth(strand) / spacing;
    float thread = floor(slot + 0.5);
    float rank = thread - 0.5 * even;
    float inside = step(abs(rank), 0.5 * (count - 1.0) + 0.01);
    float seed = hash(vec2(strandId * 7.13 + fi * 3.7, thread * 1.91 + fi));
    float shimmer = 0.55 + 0.45 * sin(p.y * (1.6 + seed * 1.8) + time * (0.6 + seed) + seed * 6.283);
    float taper = 1.0 - smoothstep(0.0, 0.5 * count + 0.6, abs(rank)) * 0.65;
    float appear = smoothstep(seed * 0.6, seed * 0.6 + 0.4, uIntro);
    threads += hairline(slot - thread, uThickness, slotPx) * inside * mix(0.35, 1.0, seed) * shimmer * taper * appear / sqrt(fi);

    float ghostPhase = p.x * (5.0 + fi * 2.0) + sin(p.y * 3.0 + time);
    float ghostLine = sin(ghostPhase) / max(fwidth(sin(ghostPhase)), 1e-5);
    ghosts += exp(-ghostLine * ghostLine / (0.8 * uThickness * uDpr + 0.6)) / fi;
  }

  float center = exp(-2.2 * dot(uv, uv));
  float cloud = exp(-1.5 * length(uv + vec2(sin(time * 0.3) * 0.25, cos(time * 0.25) * 0.18)));
  float vignette = 1.0 - smoothstep(0.35, 1.45, length(uv));
  float edge = mix(1.0 - uVignette, 1.0, vignette);
  float intro = smoothstep(0.0, 1.0, uIntro);
  float grain = (hash(gl_FragCoord.xy + fract(time * 13.7) * 91.0) - 0.5) * uGrain;

  float threadLight = threads * 2.2 * (1.0 + 0.6 * lens);
  float ghostLight = ghosts * 0.1 * intro * (1.0 + 1.5 * lens);
  float glowLight = halo * 0.6 * uGlow * intro;
  float airLight = (center * 0.07 + cloud * 0.1) * uGlow * intro;

  if (uLight > 0.5) {
    float ink = (1.0 - exp(-(threadLight * 1.1 + ghostLight * 1.4) * uBrightness)) * edge;
    float wash = (1.0 - exp(-(glowLight + airLight * 0.6) * 0.9 * uBrightness)) * 0.5 * edge;
    ink = clamp(ink * (1.0 + grain * 2.0), 0.0, 1.0);
    vec3 color = uLineColor * ink + uGlowColor * wash * (1.0 - ink);
    outColor = vec4(color, ink + wash * (1.0 - ink));
  } else {
    vec3 light = uLineColor * (threadLight + ghostLight) + uGlowColor * (glowLight + airLight);
    light *= uBrightness * edge;
    vec3 color = 1.0 - exp(-light);
    float peak = max(color.r, max(color.g, color.b));
    color = max(color + grain * peak, 0.0);
    outColor = vec4(color, max(color.r, max(color.g, color.b)));
  }
}`;

  function compile(type, source) {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    console.warn(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  const vertex = compile(gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT);
  if (!vertex || !fragment) { cv.style.display = 'none'; return; }
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { cv.style.display = 'none'; return; }

  const uniforms = {};
  ['uResolution','uDpr','uTime','uAngle','uScale','uLayers','uWaves','uTwist','uThreads','uSpread','uThickness','uGlow','uBrightness','uVignette','uGrain','uIntro','uGlowColor','uLineColor','uLens','uLight']
    .forEach(name => { uniforms[name] = gl.getUniformLocation(program, name); });

  const vao = gl.createVertexArray();
  const buffer = gl.createBuffer();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const positionLocation = gl.getAttribLocation(program, 'aPosition');
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  // color parse
  const probe = document.createElement('canvas');
  probe.width = 1; probe.height = 1;
  const probeContext = probe.getContext('2d', { willReadFrequently: true });
  const toRgb = (value, fallback) => {
    if (!probeContext || !value) return fallback;
    probeContext.clearRect(0, 0, 1, 1);
    probeContext.fillStyle = '#000000';
    probeContext.fillStyle = value;
    probeContext.fillRect(0, 0, 1, 1);
    const [r, g, b] = probeContext.getImageData(0, 0, 1, 1).data;
    return [r / 255, g / 255, b / 255];
  };

  const LIGHT = { glow: toRgb('#A8251C', [0.66, 0.15, 0.11]), line: toRgb('#171310', [0.09, 0.07, 0.06]) };
  const DARK = { glow: toRgb('#E05A4E', [0.88, 0.35, 0.31]), line: toRgb('#F4E9E2', [0.96, 0.91, 0.89]) };

  const state = {
    time: 0,
    spin: 0,
    introTime: S.intro && !reduce ? 0 : 10,
    width: 1,
    height: 1,
    ratio: 1,
    glow: LIGHT.glow,
    line: LIGHT.line,
    pointer: { x: 0, y: 0, inside: false },
    lens: { x: 0, y: 0, vx: 0, vy: 0, strength: 0, placed: false }
  };

  let raf = 0;
  let last = 0;
  let visible = true;

  const syncTheme = () => {
    const dark = document.documentElement.dataset.theme === 'dark';
    S.lightMode = !dark;
    state.glow = dark ? DARK.glow : LIGHT.glow;
    state.line = dark ? DARK.line : LIGHT.line;
    render();
    wake();
  };

  const resize = () => {
    const width = Math.max(1, document.documentElement.clientWidth);
    const height = Math.max(1, innerHeight);
    const baseDpr = Math.min(S.dpr || devicePixelRatio || 1, 2);
    const longest = Math.max(width, height) * baseDpr;
    const ratio = longest > MAX_RENDER_DIM ? (baseDpr * MAX_RENDER_DIM) / longest : baseDpr;
    const pixelWidth = Math.max(1, Math.round(width * ratio));
    const pixelHeight = Math.max(1, Math.round(height * ratio));
    if (cv.width !== pixelWidth || cv.height !== pixelHeight) {
      cv.width = pixelWidth;
      cv.height = pixelHeight;
    }
    cv.style.width = width + 'px';
    cv.style.height = height + 'px';
    state.width = width;
    state.height = height;
    state.ratio = cv.width / width;
    render();
  };

  const render = () => {
    const introProgress = clamp(state.introTime / 2.2, 0, 1);
    gl.viewport(0, 0, cv.width, cv.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.uniform2f(uniforms.uResolution, state.width, state.height);
    gl.uniform1f(uniforms.uDpr, state.ratio);
    gl.uniform1f(uniforms.uTime, state.time);
    gl.uniform1f(uniforms.uAngle, (S.rotation * Math.PI) / 180 + state.spin);
    gl.uniform1f(uniforms.uScale, S.scale);
    gl.uniform1f(uniforms.uLayers, S.layers);
    gl.uniform1f(uniforms.uWaves, S.waves);
    gl.uniform1f(uniforms.uTwist, S.twist);
    gl.uniform1f(uniforms.uThreads, S.threads);
    gl.uniform1f(uniforms.uSpread, S.spread);
    gl.uniform1f(uniforms.uThickness, S.thickness);
    gl.uniform1f(uniforms.uGlow, S.glow);
    gl.uniform1f(uniforms.uBrightness, S.brightness);
    gl.uniform1f(uniforms.uVignette, S.vignette);
    gl.uniform1f(uniforms.uGrain, S.grain);
    gl.uniform1f(uniforms.uIntro, 1 - Math.pow(1 - introProgress, 3));
    gl.uniform3f(uniforms.uGlowColor, state.glow[0], state.glow[1], state.glow[2]);
    gl.uniform3f(uniforms.uLineColor, state.line[0], state.line[1], state.line[2]);
    gl.uniform4f(uniforms.uLens, state.lens.x, state.lens.y, 0.32, state.lens.strength);
    gl.uniform1f(uniforms.uLight, S.lightMode ? 1 : 0);
    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  };

  function frame(now) {
    raf = 0;
    if (!visible || document.hidden) { last = 0; return; }
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    const moving = !S.paused && !reduce;
    if (moving) {
      state.time += dt * S.speed;
      state.spin += dt * S.speed * S.rotationSpeed;
    }
    const introducing = state.introTime < 2.2;
    if (introducing) state.introTime += dt;

    const { pointer, lens } = state;
    const active = S.mouseInteraction && pointer.inside && !reduce;
    if (active && !lens.placed) {
      lens.x = pointer.x;
      lens.y = pointer.y;
      lens.vx = 0;
      lens.vy = 0;
      lens.placed = true;
    }
    lens.vx += (110 * (pointer.x - lens.x) - 19 * lens.vx) * dt;
    lens.vy += (110 * (pointer.y - lens.y) - 19 * lens.vy) * dt;
    lens.x += lens.vx * dt;
    lens.y += lens.vy * dt;
    const goal = active ? 1 : 0;
    lens.strength += (goal - lens.strength) * (1 - Math.exp(-dt / (goal > lens.strength ? 0.3 : 0.55)));
    if (!active && lens.strength < 0.001) lens.placed = false;

    render();
    const settling = Math.abs(goal - lens.strength) > 0.002 || Math.hypot(lens.vx, lens.vy) > 0.5;
    if (moving || introducing || settling) raf = requestAnimationFrame(frame);
    else last = 0;
  }

  const wake = () => {
    if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame);
  };

  addEventListener('pointermove', event => {
    const rect = cv.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    state.pointer.x = x;
    state.pointer.y = y;
    state.pointer.inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
    wake();
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { state.pointer.inside = false; wake(); });
  document.addEventListener('visibilitychange', () => { last = 0; wake(); });
  addEventListener('resize', resize);
  new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting);
    if (visible) { last = 0; wake(); }
  }, { threshold: 0 }).observe(cv);
  // react to theme changes
  new MutationObserver(syncTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  syncTheme();
  resize();
  if (reduce) render();
  wake();
})();
