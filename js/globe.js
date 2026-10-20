/* =========================================================
   WEB PLAYGROUND — globe.js
   A hand-written 3D point-cloud planet.

   The tricky part: a uniformly distributed sphere looks
   identical after rotation, so spinning it reads as "dead".
   To make motion obvious we give the surface landmarks:
     - a noise mask that turns some points into "land"
     - latitude / longitude grid lines
   Now any rotation is instantly visible.

   Fibonacci sphere + manual rotation matrices + perspective.
   Drag to spin, release to keep the momentum.
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
  var yawVel = 0.014;
  var pitchVel = 0;
  var dragging = false;
  var lastX = 0;
  var lastY = 0;
  var running = true;
  var accent = [0.18, 0.90, 1.00];
  var accent2 = [1.00, 0.24, 0.66];
  var resizeTimer = 0;
  var hover = { x: 0, y: 0, active: false };

  var IDLE_SPIN = 0.014;

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

  // Deterministic "continent" field: cheap sum of sines in 3D.
  function landField(x, y, z) {
    return (
      Math.sin(x * 2.1 + 0.4) * Math.sin(y * 1.7 + 1.1) * Math.sin(z * 2.3 + 0.7) +
      0.55 * Math.sin(x * 4.3 + 2.0) * Math.sin(y * 3.1 + 0.4) * Math.sin(z * 4.7 + 1.9) +
      0.3 * Math.sin(x * 7.1 + 0.9) * Math.sin(y * 6.3 + 2.4) * Math.sin(z * 6.9 + 0.2)
    );
  }

  function buildPoints() {
    points = [];
    var count = 1500;
    var golden = Math.PI * (3 - Math.sqrt(5));

    for (var i = 0; i < count; i++) {
      var y = 1 - (i / (count - 1)) * 2;
      var radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
      var theta = golden * i;

      var x = Math.cos(theta) * radiusAtY;
      var z = Math.sin(theta) * radiusAtY;

      var field = landField(x, y, z);

      points.push({
        x: x,
        y: y,
        z: z,
        shell: 1 + (field > 0 ? 0.022 : 0),
        land: field > 0.02,
        // Land reads as "the continent", ocean stays faint.
        weight: field > 0.02 ? 1 : 0.28
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
    // A planet that is completely still reads as broken, so even with
    // ambient motion off we keep a slow drift instead of a full stop.
    var scaleFactor = advance
      ? (window.PGMotion ? Math.max(0.35, window.PGMotion.scale) : 1)
      : 0;

    if (!dragging && advance) {
      yaw += yawVel * scaleFactor;
      pitch += pitchVel * scaleFactor;
      yawVel += (IDLE_SPIN - yawVel) * 0.02 * scaleFactor;
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
    var glow = ctx.createRadialGradient(cx, cyy, radius * 0.2, cx, cyy, radius * 1.3);
    glow.addColorStop(0, rgba(accent, 0.13));
    glow.addColorStop(0.55, rgba(accent, 0.05));
    glow.addColorStop(1, rgba(accent, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cyy, radius * 1.3, 0, Math.PI * 2);
    ctx.fill();

    var projected = [];
    var i;

    for (i = 0; i < points.length; i++) {
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
        land: p.land,
        weight: p.weight,
        size: (p.land ? 1.15 : 0.6) + depth * 1.5
      });
    }

    projected.sort(function (a, b) {
      return a.z - b.z;
    });

    /* ---------- latitude / longitude grid ---------- */
    // Drawn first, behind the points, so rotation is readable.
    var lat, lon, seg, a, b, pt;

    ctx.lineWidth = 1;

    // Parallels.
    for (lat = -60; lat <= 60; lat += 30) {
      var latRad = (lat * Math.PI) / 180;
      var ly = Math.sin(latRad);
      var lr = Math.cos(latRad);
      ctx.beginPath();
      for (seg = 0; seg <= 72; seg++) {
        var la = (seg / 72) * Math.PI * 2;
        pt = rotate({ x: Math.cos(la) * lr, y: ly, z: Math.sin(la) * lr }, cy, sy, cp, sp);
        var pr = fov / (fov + pt.z * radius);
        var gx = cx + pt.x * radius * pr;
        var gy = cyy + pt.y * radius * pr;
        if (seg === 0) ctx.moveTo(gx, gy);
        else ctx.lineTo(gx, gy);
      }
      ctx.strokeStyle = rgba(accent, pt.z > 0 ? 0.20 : 0.07);
      ctx.stroke();
    }

    // Meridians.
    for (lon = 0; lon < 180; lon += 30) {
      var lonRad = (lon * Math.PI) / 180;
      ctx.beginPath();
      for (seg = 0; seg <= 72; seg++) {
        var ma = (seg / 72) * Math.PI * 2;
        pt = rotate({
          x: Math.cos(ma) * Math.cos(lonRad),
          y: Math.sin(ma),
          z: Math.cos(ma) * Math.sin(lonRad)
        }, cy, sy, cp, sp);
        var mr = fov / (fov + pt.z * radius);
        var mx2 = cx + pt.x * radius * mr;
        var my2 = cyy + pt.y * radius * mr;
        if (seg === 0) ctx.moveTo(mx2, my2);
        else ctx.lineTo(mx2, my2);
      }
      ctx.strokeStyle = rgba(accent, pt.z > 0 ? 0.16 : 0.05);
      ctx.stroke();
    }

    /* ---------- points ---------- */
    var hx = hover.x;
    var hy = hover.y;

    for (i = 0; i < projected.length; i++) {
      var q = projected[i];
      var boost = 0;

      if (hover.active) {
        var dx = q.x - hx;
        var dy = q.y - hy;
        var d2 = dx * dx + dy * dy;
        if (d2 < 12000) {
          boost = (1 - d2 / 12000) * 0.8;
        }
      }

      // Front-facing points are crisp, back-facing fade out.
      var facing = Math.max(0, q.depth);
      var alpha = (0.10 + facing * 0.72) * q.weight + boost;
      if (alpha <= 0.015) continue;

      var color = q.land ? accent2 : accent;

      ctx.beginPath();
      ctx.fillStyle = rgba(color, Math.min(1, alpha));
      ctx.arc(q.x, q.y, q.size * (1 + boost * 0.9), 0, Math.PI * 2);
      ctx.fill();
    }

    // A faint orbit ring for depth.
    ctx.beginPath();
    for (a = 0; a <= 360; a += 3) {
      var rad = (a * Math.PI) / 180;
      pt = rotate({ x: Math.cos(rad) * 1.3, y: 0, z: Math.sin(rad) * 1.3 }, cy, sy, cp, sp);
      var ringR = fov / (fov + pt.z * radius);
      b = { x: cx + pt.x * radius * ringR, y: cyy + pt.y * radius * ringR };
      if (a === 0) ctx.moveTo(b.x, b.y);
      else ctx.lineTo(b.x, b.y);
    }
    ctx.strokeStyle = rgba(accent2, 0.22);
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
    // Synthetic events and some touch stacks have no active pointer to
    // capture; capture is a convenience, never a requirement.
    if (canvas.setPointerCapture && e.pointerId != null) {
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch (err) { /* no active pointer */ }
    }
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

    yaw += dx * 0.008;
    pitch += dy * 0.006;
    if (pitch < -1.1) pitch = -1.1;
    if (pitch > 1.1) pitch = 1.1;

    yawVel = dx * 0.0012;
    pitchVel = dy * 0.0009;
  }

  function pointerUp(e) {
    dragging = false;
    if (canvas.releasePointerCapture && e && e.pointerId != null) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch (err) { /* not captured */ }
    }
  }

  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove, { passive: true });
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', pointerUp);
  canvas.addEventListener('pointerleave', function (e) {
    hover.active = false;
    if (dragging) pointerUp(e);
  });

  window.addEventListener('pg:palette', updatePalette);
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 180);
  }, { passive: true });

  // rAF already throttles in background tabs, so no extra pause check here.
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
