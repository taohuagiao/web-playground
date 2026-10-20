/* =========================================================
   WEB PLAYGROUND — network.js
   A living constellation: nodes drift, connect, and lean
   toward the cursor. Canvas 2D, no dependencies.
   ========================================================= */

(function () {
  'use strict';

  var canvas = document.getElementById('network-canvas');
  if (!canvas) return;

  var wrap = canvas.parentElement;
  var ctx = canvas.getContext('2d');
  if (!ctx || !wrap) return;

  var dpr = 1;
  var W = 0;
  var H = 0;
  var nodes = [];
  var mouse = { x: 0, y: 0, active: false };
  var accent = [0.18, 0.90, 1.00];
  var accent2 = [1.00, 0.24, 0.66];
  var running = true;
  var resizeTimer = 0;

  function motionScale() {
    return window.PGMotion ? window.PGMotion.scale : 1;
  }
  var linkDistance = 132;

  function rgba(c, alpha) {
    return 'rgba(' +
      Math.round(c[0] * 255) + ',' +
      Math.round(c[1] * 255) + ',' +
      Math.round(c[2] * 255) + ',' +
      alpha + ')';
  }

  function updatePalette() {
    if (window.PG && window.PG.palettes) {
      var p = window.PG.palettes[window.PG.index] || window.PG.palettes[0];
      accent = p.c1;
      accent2 = p.c3;
    }
  }

  function buildNodes() {
    var count = Math.round((W * H) / 11000);
    count = Math.max(55, Math.min(140, count));
    nodes = [];

    for (var i = 0; i < count; i++) {
      nodes.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.35 * motionScale(),
        vy: (Math.random() - 0.5) * 0.35 * motionScale(),
        r: 1 + Math.random() * 1.6
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

    buildNodes();
    render();
  }

  function step() {
    var i, n, dx, dy, dist;

    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];

      if (mouse.active) {
        dx = mouse.x - n.x;
        dy = mouse.y - n.y;
        dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 190 && dist > 0.001) {
          var pull = (1 - dist / 190) * 0.035 * motionScale();
          n.vx += (dx / dist) * pull;
          n.vy += (dy / dist) * pull;
        }
      }

      // Gentle random drift keeps the web alive.
      n.vx += (Math.random() - 0.5) * 0.012 * motionScale();
      n.vy += (Math.random() - 0.5) * 0.012 * motionScale();

      var speed = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
      var maxSpeed = 0.5;
      if (speed > maxSpeed) {
        n.vx = (n.vx / speed) * maxSpeed;
        n.vy = (n.vy / speed) * maxSpeed;
      }

      n.x += n.vx;
      n.y += n.vy;

      if (n.x < 0) { n.x = 0; n.vx *= -1; }
      if (n.x > W) { n.x = W; n.vx *= -1; }
      if (n.y < 0) { n.y = 0; n.vy *= -1; }
      if (n.y > H) { n.y = H; n.vy *= -1; }
    }
  }

  function render() {
    ctx.clearRect(0, 0, W, H);

    var i, j, n, m, dx, dy;

    // Connections between nodes.
    ctx.lineWidth = 0.6;
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      for (j = i + 1; j < nodes.length; j++) {
        m = nodes[j];
        dx = n.x - m.x;
        dy = n.y - m.y;
        var d2 = dx * dx + dy * dy;
        if (d2 < linkDistance * linkDistance) {
          var d = Math.sqrt(d2);
          var alpha = (1 - d / linkDistance) * 0.22;
          ctx.strokeStyle = rgba(accent, alpha);
          ctx.beginPath();
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(m.x, m.y);
          ctx.stroke();
        }
      }
    }

    // Stronger threads to the cursor.
    if (mouse.active) {
      for (i = 0; i < nodes.length; i++) {
        n = nodes[i];
        dx = n.x - mouse.x;
        dy = n.y - mouse.y;
        var md = Math.sqrt(dx * dx + dy * dy);
        if (md < 170) {
          ctx.strokeStyle = rgba(accent2, (1 - md / 170) * 0.45);
          ctx.beginPath();
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      }
    }

    // Nodes with a soft halo.
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];

      ctx.beginPath();
      ctx.fillStyle = rgba(accent, 0.16);
      ctx.arc(n.x, n.y, n.r * 3.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = rgba(accent, 0.88);
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  canvas.addEventListener('pointermove', function (e) {
    var rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.active = true;
  }, { passive: true });

  canvas.addEventListener('pointerleave', function () {
    mouse.active = false;
  });

  window.addEventListener('pg:palette', updatePalette);

  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 200);
  }, { passive: true });

  function loop() {
    requestAnimationFrame(loop);
    if (!running) return;
    step();
    render();
  }

  updatePalette();
  resize();
  requestAnimationFrame(loop);
})();
