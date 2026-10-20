/* =========================================================
   WEB PLAYGROUND — globe.js
   A hand-written 3D point-cloud planet.
   Fibonacci sphere + manual rotation matrices + perspective.
   Drag to spin. Release to keep the momentum.
   ========================================================= */

(function () {
  'use strict';

  var canvas = document.getElementById('globe-canvas');
  if (!canvas) return;

  var wrap = canvas.parentElement;
  var ctx = canvas.getContext('2d');
  if (!ctx || !wrap) return;

  var dpr = 1;
  var W = 0;
  var H = 0;
  var points = [];
  var yaw = 0.4;
  var pitch = -0.28;
  var yawVel = 0.0022;
  var pitchVel = 0;
  var dragging = false;
  var lastX = 0;
  var lastY = 0;
  var running = false;
  var accent = [0.18, 0.90, 1.00];
  var accent2 = [1.00, 0.24, 0.66];
  var resizeTimer = 0;
  var hover = { x: 0, y: 0, active: false };

  function rgba(c, a) {
    return 'rgba(' +
      Math.round(c[0] * 255) + ',' +
      Math.round(c[1] * 255) + ',' +
      Math.round(c[2] * 255) + ',' +
      a + ')';
  }

  function updatePalette() {
    if (window.PG && window.PG.palettes) {
      var p = window.PG.palettes[window.PG.index] || window.PG.palettes[0];
      accent = p.c1;
      accent2 = p.c3;
    }
  }

  function buildPoints() {
    points = [];
    var count = 1250;
    var golden = Math.PI * (3 - Math.sqrt(5));

    for (var i = 0; i < count; i++) {
      var y = 1 - (i / (count - 1)) * 2;
      var radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
      var theta = golden * i;

      points.push({
        x: Math.cos(theta) * radiusAtY,
        y: y,
        z: Math.sin(theta) * radiusAtY,
        // A slight shell thickness keeps the surface from looking flat.
        shell: 0.965 + Math.random() * 0.035
      });
    }
  }

  function resize() {
    var rect = wrap.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, rect.width);
    H = Math.max(1, rect.height);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    render(false);
  }

  function rotate(p, cy, sy, cp, sp) {
    // Yaw around Y, then pitch around X.
    var x1 = p.x * cy + p.z * sy;
    var z1 = -p.x * sy + p.z * cy;
    var y2 = p.y * cp - z1 * sp;
    var z2 = p.y * sp + z1 * cp;
    return { x: x1, y: y2, z: z2 };
  }

  function render(advance) {
    var scaleFactor = advance && window.PGMotion ? window.PGMotion.scale : 0;

    if (!dragging && advance) {
      yaw += yawVel * scaleFactor;
      pitch += pitchVel * scaleFactor;
      yawVel += (0.0022 - yawVel) * 0.01 * scaleFactor;
      pitchVel *= 0.96;
      if (pitch < -1.1) pitch = -1.1;
      if (pitch > 1.1) pitch = 1.1;
    }

    var cy = Math.cos(yaw);
    var sy = Math.sin(yaw);
    var cp = Math.cos(pitch);
    var sp = Math.sin(pitch);

    var cx = W / 2;
    var cyy = H / 2;
    var radius = Math.min(W, H) * 0.36;
    var fov = radius * 3.4;

    ctx.clearRect(0, 0, W, H);

    // Soft planet glow behind the points.
    var glow = ctx.createRadialGradient(cx, cyy, radius * 0.2, cx, cyy, radius * 1.25);
    glow.addColorStop(0, rgba(accent, 0.10));
    glow.addColorStop(0.55, rgba(accent, 0.045));
    glow.addColorStop(1, rgba(accent, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cyy, radius * 1.25, 0, Math.PI * 2);
    ctx.fill();

    var projected = [];

    for (var i = 0; i < points.length; i++) {
      var p = points[i];
      var r = rotate(p, cy, sy, cp, sp);
      var depth = (r.z + 1) * 0.5; // 0 = far, 1 = near

      var persp = fov / (fov + r.z * radius * p.shell);
      var sx = cx + r.x * radius * p.shell * persp;
      var sy2 = cyy + r.y * radius * p.shell * persp;

      projected.push({
        x: sx,
        y: sy2,
        z: r.z,
        depth: depth,
        size: (0.55 + depth * 1.55) * persp,
        color: depth > 0.55 ? accent : accent2,
        alpha: 0.10 + depth * 0.72
      });
    }

    projected.sort(function (a, b) {
      return a.z - b.z;
    });

    // Hover spotlight: points near the cursor brighten.
    var hx = hover.x;
    var hy = hover.y;

    for (var k = 0; k < projected.length; k++) {
      var q = projected[k];
      var boost = 0;

      if (hover.active) {
        var dx = q.x - hx;
        var dy = q.y - hy;
        var d2 = dx * dx + dy * dy;
        if (d2 < 12000) {
          boost = (1 - d2 / 12000) * 0.75;
        }
      }

      ctx.beginPath();
      ctx.fillStyle = rgba(q.color, Math.min(1, q.alpha + boost));
      ctx.arc(q.x, q.y, q.size * (1 + boost * 0.9), 0, Math.PI * 2);
      ctx.fill();
    }

    // An orbit ring for a bit of structure.
    ctx.beginPath();
    for (var a = 0; a <= 360; a += 3) {
      var rad = (a * Math.PI) / 180;
      var ox = Math.cos(rad);
      var oz = Math.sin(rad);
      var oy = 0;
      var ry = rotate({ x: ox * 1.28, y: oy, z: oz * 1.28 }, cy, sy, cp, sp);
      var pr = fov / (fov + ry.z * radius);
      var px = cx + ry.x * radius * pr;
      var py = cyy + ry.y * radius * pr;
      if (a === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = rgba(accent2, 0.18);
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  /* ---------------- drag ---------------- */

  function pointerDown(e) {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    yawVel = 0;
    pitchVel = 0;
    canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
  }

  function pointerMove(e) {
    var rect = canvas.getBoundingClientRect();
    hover.x = e.clientX - rect.left;
    hover.y = e.clientY - rect.top;
    hover.active = true;

    if (!dragging) return;

    var dx = e.clientX - lastX;
    var dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;

    yaw += dx * 0.006;
    pitch += dy * 0.005;
    if (pitch < -1.1) pitch = -1.1;
    if (pitch > 1.1) pitch = 1.1;

    yawVel = dx * 0.0009;
    pitchVel = dy * 0.0007;
  }

  function pointerUp(e) {
    dragging = false;
    if (canvas.releasePointerCapture) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch (err) { /* already released */ }
    }
  }

  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove, { passive: true });
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', pointerUp);
  canvas.addEventListener('pointerleave', function () {
    hover.active = false;
    if (dragging) dragging = false;
  });

  window.addEventListener('pg:palette', updatePalette);
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 180);
  }, { passive: true });

  function loop() {
    requestAnimationFrame(loop);
    if (!running) return;
    render(true);
  }

  updatePalette();
  buildPoints();
  resize();
  requestAnimationFrame(loop);
})();
