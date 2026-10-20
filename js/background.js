/* =========================================================
   WEB PLAYGROUND — background.js
   A hand-written WebGL fragment shader: animated aurora.
   No libraries. No images. Just math.
   ========================================================= */

(function () {
  'use strict';

  var canvas = document.getElementById('bg');
  if (!canvas) return;

  var palettes = [
    {
      name: 'Aurora',
      c1: [0.18, 0.90, 1.00],
      c2: [0.52, 0.26, 1.00],
      c3: [1.00, 0.24, 0.66],
      accent: '#2ee6ff',
      accent2: '#ff3da6'
    },
    {
      name: 'Solar',
      c1: [1.00, 0.72, 0.22],
      c2: [1.00, 0.34, 0.16],
      c3: [0.95, 0.18, 0.50],
      accent: '#ffb020',
      accent2: '#ff4d6d'
    },
    {
      name: 'Toxic',
      c1: [0.50, 1.00, 0.34],
      c2: [0.12, 0.82, 0.56],
      c3: [0.90, 1.00, 0.22],
      accent: '#7cff5a',
      accent2: '#c6ff2e'
    },
    {
      name: 'Ice',
      c1: [0.55, 0.82, 1.00],
      c2: [0.72, 0.52, 1.00],
      c3: [0.35, 0.96, 0.92],
      accent: '#8cc8ff',
      accent2: '#b78cff'
    }
  ];

  var state = {
    index: 0,
    dpr: 1,
    mouseX: window.innerWidth / 2,
    mouseY: window.innerHeight / 2,
    targetX: window.innerWidth / 2,
    targetY: window.innerHeight / 2
  };

  var gl = null;
  var program = null;
  var uniforms = {};

  var VERT = [
    'attribute vec2 a_pos;',
    'void main() {',
    '  gl_Position = vec4(a_pos, 0.0, 1.0);',
    '}'
  ].join('\n');

  var FRAG = [
    'precision highp float;',
    '',
    'uniform vec2 u_res;',
    'uniform vec2 u_mouse;',
    'uniform float u_time;',
    'uniform vec3 u_c1;',
    'uniform vec3 u_c2;',
    'uniform vec3 u_c3;',
    '',
    'float hash21(vec2 p) {',
    '  p = fract(p * vec2(123.34, 456.21));',
    '  p += dot(p, p + 45.32);',
    '  return fract(p.x * p.y);',
    '}',
    '',
    'float noise(vec2 p) {',
    '  vec2 i = floor(p);',
    '  vec2 f = fract(p);',
    '  vec2 u = f * f * (3.0 - 2.0 * f);',
    '  float a = hash21(i);',
    '  float b = hash21(i + vec2(1.0, 0.0));',
    '  float c = hash21(i + vec2(0.0, 1.0));',
    '  float d = hash21(i + vec2(1.0, 1.0));',
    '  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);',
    '}',
    '',
    'float fbm(vec2 p) {',
    '  float v = 0.0;',
    '  float a = 0.5;',
    '  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);',
    '  for (int i = 0; i < 5; i++) {',
    '    v += a * noise(p);',
    '    p = rot * p * 2.02;',
    '    a *= 0.5;',
    '  }',
    '  return v;',
    '}',
    '',
    'void main() {',
    '  vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y);',
    '  float t = u_time * 0.055;',
    '',
    '  vec2 q = vec2(',
    '    fbm(p * 1.6 + vec2(0.0, t)),',
    '    fbm(p * 1.6 + vec2(5.2, -t))',
    '  );',
    '',
    '  vec2 r = vec2(',
    '    fbm(p * 1.6 + 4.0 * q + vec2(1.7, 9.2) + 0.15 * t),',
    '    fbm(p * 1.6 + 4.0 * q + vec2(8.3, 2.8) - 0.12 * t)',
    '  );',
    '',
    '  float f = fbm(p * 1.15 + 4.0 * r);',
    '',
    '  vec3 col = vec3(0.012, 0.015, 0.030);',
    '  float ridge = clamp(pow(f, 2.6) * 2.2, 0.0, 1.0);',
    '  col += mix(u_c1 * 0.05, u_c2 * 0.52, ridge);',
    '  col += u_c3 * 0.26 * clamp(pow(length(r), 2.2) * 0.9, 0.0, 1.0);',
    '  col += u_c1 * 0.10 * smoothstep(0.70, 0.0, length(q));',
    '',
    '  vec2 m = (u_mouse - 0.5 * u_res) / min(u_res.x, u_res.y);',
    '  float md = length(p - m);',
    '  col += u_c1 * 0.26 * exp(-md * md * 5.0);',
    '',
    '  float vig = smoothstep(1.55, 0.10, length(p));',
    '  col *= 0.28 + 0.72 * vig;',
    '',
    '  float g = hash21(gl_FragCoord.xy + fract(u_time) * 137.0);',
    '  col += (g - 0.5) * 0.035;',
    '',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  function compile(type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('[bg] shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function initGL() {
    try {
      gl = canvas.getContext('webgl', {
        antialias: false,
        alpha: false,
        depth: false,
        stencil: false,
        powerPreference: 'high-performance'
      }) || canvas.getContext('experimental-webgl');
    } catch (err) {
      gl = null;
    }
    if (!gl) return false;

    var vs = compile(gl.VERTEX_SHADER, VERT);
    var fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return false;

    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('[bg] program link error:', gl.getProgramInfoLog(prog));
      return false;
    }

    gl.deleteShader(vs);
    gl.deleteShader(fs);
    program = prog;
    gl.useProgram(program);

    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );

    var pos = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    uniforms.res = gl.getUniformLocation(program, 'u_res');
    uniforms.mouse = gl.getUniformLocation(program, 'u_mouse');
    uniforms.time = gl.getUniformLocation(program, 'u_time');
    uniforms.c1 = gl.getUniformLocation(program, 'u_c1');
    uniforms.c2 = gl.getUniformLocation(program, 'u_c2');
    uniforms.c3 = gl.getUniformLocation(program, 'u_c3');

    return true;
  }

  function resize() {
    state.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var w = Math.max(1, Math.round(window.innerWidth * state.dpr));
    var h = Math.max(1, Math.round(window.innerHeight * state.dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      if (gl) gl.viewport(0, 0, w, h);
    }
  }

  function applyPalette(index, silent) {
    state.index = ((index % palettes.length) + palettes.length) % palettes.length;
    var p = palettes[state.index];

    if (gl && program) {
      gl.useProgram(program);
      if (uniforms.c1) gl.uniform3fv(uniforms.c1, p.c1);
      if (uniforms.c2) gl.uniform3fv(uniforms.c2, p.c2);
      if (uniforms.c3) gl.uniform3fv(uniforms.c3, p.c3);
    }

    var root = document.documentElement;
    root.style.setProperty('--a1', p.accent);
    root.style.setProperty('--a2', p.accent2);

    if (!silent) {
      window.dispatchEvent(new CustomEvent('pg:palette', {
        detail: {
          index: state.index,
          name: p.name,
          c1: p.c1,
          c2: p.c2,
          c3: p.c3,
          accent: p.accent,
          accent2: p.accent2
        }
      }));
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);

    resize();

    state.mouseX += (state.targetX - state.mouseX) * 0.055;
    state.mouseY += (state.targetY - state.mouseY) * 0.055;

    if (!gl || !program) return;

    gl.useProgram(program);
    gl.uniform2f(uniforms.res, canvas.width, canvas.height);
    gl.uniform2f(
      uniforms.mouse,
      state.mouseX * state.dpr,
      (window.innerHeight - state.mouseY) * state.dpr
    );
    var scale = window.PGMotion ? window.PGMotion.scale : 1;
    gl.uniform1f(uniforms.time, now * 0.001 * scale);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  if (!initGL()) {
    gl = null;
    program = null;
    document.body.classList.add('no-webgl');
  }

  applyPalette(0, true);
  resize();
  requestAnimationFrame(frame);

  window.addEventListener('pointermove', function (e) {
    state.targetX = e.clientX;
    state.targetY = e.clientY;
  }, { passive: true });

  window.addEventListener('resize', resize, { passive: true });

  window.PG = {
    palettes: palettes,
    setPalette: function (index) {
      applyPalette(index, false);
    },
    get index() {
      return state.index;
    },
    get webgl() {
      return !!gl;
    }
  };
})();
