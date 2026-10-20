/* =========================================================
   WEB PLAYGROUND — ripple.js
   A pool of dots that reacts to waves.
   Click or drag to drop ripples; every dot is displaced by
   the sum of the active wave functions.
   ========================================================= */

(function () {
  'use strict';

  var canvas = document.getElementById('ripple-canvas');
  if (!canvas) return;

  var wrap = canvas.parentElement;
  var ctx = canvas.getContext('2d');
  if (!ctx || !wrap) return;

  var dpr = 1;
  var W = 0;
  var H = 0;
  var cols = 0;
  var rows = 0;
  var spacing = 22;
  var ripples = [];
  var running = true;
  var accent = [0.18, 0.90, 1.00];
  var accent2 = [1.00, 0.24, 0.66];
  var resizeTimer = 0;
  var lastDrop = 0;
  var autoTimer = 0;

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

  function resize() {
    var rect = wrap.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, rect.width);
    H = Math.max(1, rect.height);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    spacing = W < 600 ? 18 : 22;
    cols = Math.ceil(W / spacing) + 2;
    rows = Math.ceil(H / spacing) + 2;

    // Resizing clears the canvas; draw once so it is never left blank.
    render();
  }

  function drop(x, y, power) {
    ripples.push({
      x: x,
      y: y,
      age: 0,
      power: power || 1
    });
    if (ripples.length > 14) ripples.shift();
  }

  function render() {
    var ambient = window.PGMotion ? window.PGMotion.ambient : true;

    ctx.clearRect(0, 0, W, H);

    // Age and retire ripples.
    for (var r = ripples.length - 1; r >= 0; r--) {
      ripples[r].age += 1;
      if (ripples[r].age > 260) ripples.splice(r, 1);
    }

    if (ambient) {
      autoTimer++;
      if (autoTimer > 130) {
        autoTimer = 0;
        drop(W * (0.2 + Math.random() * 0.6), H * (0.25 + Math.random() * 0.5), 0.9);
      }
    }

    var half = spacing / 2;

    for (var gy = 0; gy < rows; gy++) {
      for (var gx = 0; gx < cols; gx++) {
        var baseX = gx * spacing - half;
        var baseY = gy * spacing - half;
        var dx = 0;
        var dy = 0;
        var energy = 0;

        for (var i = 0; i < ripples.length; i++) {
          var rp = ripples[i];
          var vx = baseX - rp.x;
          var vy = baseY - rp.y;
          var dist = Math.sqrt(vx * vx + vy * vy);
          if (dist < 1) dist = 1;

          var wave = Math.sin(dist * 0.045 - rp.age * 0.11);
          var decay = Math.exp(-rp.age * 0.014) * Math.exp(-dist * 0.009);
          var amount = wave * decay * rp.power;

          dx += (vx / dist) * amount;
          dy += (vy / dist) * amount;
          energy = Math.max(energy, Math.abs(amount));
        }

        var px = baseX + dx * 14;
        var py = baseY + dy * 14;
        var size = 0.7 + Math.min(2.4, energy * 9);
        var alpha = Math.min(0.95, 0.07 + energy * 3.2);
        var color = energy > 0.32 ? accent2 : accent;

        ctx.beginPath();
        ctx.fillStyle = rgba(color, alpha);
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // A thin expanding ring makes each drop readable.
    for (var k = 0; k < ripples.length; k++) {
      var ring = ripples[k];
      var progress = ring.age / 260;
      if (progress > 1) continue;
      ctx.beginPath();
      ctx.strokeStyle = rgba(accent, (1 - progress) * 0.22 * ring.power);
      ctx.lineWidth = 1.4;
      ctx.arc(ring.x, ring.y, progress * 320, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  canvas.addEventListener('pointerdown', function (e) {
    var rect = canvas.getBoundingClientRect();
    drop(e.clientX - rect.left, e.clientY - rect.top, 1.5);
  });

  canvas.addEventListener('pointermove', function (e) {
    if (!e.buttons) return;
    var now = performance.now();
    if (now - lastDrop < 60) return;
    lastDrop = now;
    var rect = canvas.getBoundingClientRect();
    drop(e.clientX - rect.left, e.clientY - rect.top, 0.85);
  }, { passive: true });

  window.addEventListener('pg:palette', updatePalette);
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 180);
  }, { passive: true });

  function loop() {
    requestAnimationFrame(loop);
    if (!running) return;
    render();
  }

  updatePalette();
  resize();

  // Start with a couple of ripples so the pool is never empty.
  drop(W * 0.35, H * 0.5, 1.1);
  drop(W * 0.7, H * 0.45, 0.8);

  requestAnimationFrame(loop);
})();
