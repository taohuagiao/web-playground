/* =========================================================
   WEB PLAYGROUND — particles.js
   Text is sampled into thousands of glowing particles.
   They flee from the cursor, explode on click, and reform.
   ========================================================= */

(function () {
  'use strict';

  var canvas = document.getElementById('particle-canvas');
  var art = document.getElementById('hero-art');
  if (!canvas || !art) return;

  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var words = ['MAGIC', 'PLAY', 'WEB', 'WOW'];
  var wordIndex = 0;
  var particles = [];
  var dpr = 1;
  var W = 0;
  var H = 0;
  var mouse = { x: -9999, y: -9999, active: false };
  var sprites = { a: null, b: null };
  var running = true;
  var nextTimer = 0;
  var resizeTimer = 0;
  var lastTime = 0;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function currentPalette() {
    if (window.PG && window.PG.palettes) {
      return window.PG.palettes[window.PG.index] || window.PG.palettes[0];
    }
    return { c1: [0.18, 0.90, 1.00], c3: [1.00, 0.24, 0.66] };
  }

  function rgba(c, alpha) {
    return 'rgba(' +
      Math.round(c[0] * 255) + ',' +
      Math.round(c[1] * 255) + ',' +
      Math.round(c[2] * 255) + ',' +
      alpha + ')';
  }

  function makeSprite(color) {
    var sprite = document.createElement('canvas');
    sprite.width = 32;
    sprite.height = 32;
    var sctx = sprite.getContext('2d');
    var gradient = sctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, rgba(color, 1));
    gradient.addColorStop(0.35, rgba(color, 0.55));
    gradient.addColorStop(1, rgba(color, 0));
    sctx.fillStyle = gradient;
    sctx.fillRect(0, 0, 32, 32);
    return sprite;
  }

  function refreshSprites() {
    var p = currentPalette();
    sprites.a = makeSprite(p.c1);
    sprites.b = makeSprite(p.c3);
  }

  function buildTargets(word) {
    if (W < 2 || H < 2) return [];

    var off = document.createElement('canvas');
    off.width = W;
    off.height = H;
    var octx = off.getContext('2d');

    var fontSize = Math.min(H * 0.70, W * 0.26);
    octx.font = '700 ' + fontSize + 'px "Space Grotesk", "Arial Black", "Segoe UI", sans-serif';
    octx.textAlign = 'center';
    octx.textBaseline = 'middle';
    octx.fillStyle = '#ffffff';
    octx.fillText(word, W / 2, H * 0.52);

    var data = octx.getImageData(0, 0, W, H).data;
    var step = Math.max(2, Math.round(fontSize / 100));
    var targets = [];

    for (var y = 0; y < H; y += step) {
      for (var x = 0; x < W; x += step) {
        if (data[(y * W + x) * 4 + 3] > 128) {
          targets.push({ x: x, y: y });
        }
      }
    }

    return targets;
  }

  function applyTargets(targets) {
    var count = targets.length;
    if (!count) return;

    while (particles.length < count) {
      var index = particles.length;
      particles.push({
        x: W / 2 + (Math.random() - 0.5) * W * 0.85,
        y: H / 2 + (Math.random() - 0.5) * H * 0.85,
        vx: 0,
        vy: 0,
        tx: targets[index].x,
        ty: targets[index].y,
        size: (1.0 + Math.random() * 1.2) * dpr,
        tint: Math.random(),
        alpha: 0.42 + Math.random() * 0.52
      });
    }

    if (particles.length > count) {
      particles.length = count;
    }

    for (var i = 0; i < count; i++) {
      particles[i].tx = targets[i].x;
      particles[i].ty = targets[i].y;
    }
  }

  function resize() {
    var rect = art.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    var w = Math.max(1, Math.round(rect.width * dpr));
    var h = Math.max(1, Math.round(rect.height * dpr));
    if (w === W && h === H) return;

    W = w;
    H = h;
    canvas.width = W;
    canvas.height = H;

    refreshSprites();
    applyTargets(buildTargets(words[wordIndex]));
  }

  function scheduleNext(delay) {
    clearTimeout(nextTimer);
    nextTimer = setTimeout(function () {
      wordIndex = (wordIndex + 1) % words.length;
      applyTargets(buildTargets(words[wordIndex]));
    }, delay);
  }

  function explode() {
    var scale = dpr;
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var angle = Math.random() * Math.PI * 2;
      var speed = (4 + Math.random() * 16) * scale;
      p.vx += Math.cos(angle) * speed;
      p.vy += Math.sin(angle) * speed;
    }
    scheduleNext(950);
  }

  function draw(dt) {
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';

    var radius = 115 * dpr;
    var radius2 = radius * radius;
    var damp = Math.pow(0.90, dt);

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];

      p.vx += (p.tx - p.x) * 0.014 * dt;
      p.vy += (p.ty - p.y) * 0.014 * dt;

      if (mouse.active) {
        var mx = p.x - mouse.x;
        var my = p.y - mouse.y;
        var d2 = mx * mx + my * my;
        if (d2 < radius2 && d2 > 0.0001) {
          var d = Math.sqrt(d2);
          var force = (1 - d / radius) * 2.2 * dt;
          p.vx += (mx / d) * force;
          p.vy += (my / d) * force;
        }
      }

      p.vx *= damp;
      p.vy *= damp;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      var sprite = p.tint < 0.70 ? sprites.a : sprites.b;
      if (!sprite) continue;

      var size = p.size * 3.6;
      ctx.globalAlpha = p.alpha;
      ctx.drawImage(sprite, p.x - size / 2, p.y - size / 2, size, size);
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  function tick(now) {
    requestAnimationFrame(tick);
    if (!running) return;

    var dt = lastTime ? Math.min(2.4, (now - lastTime) / 16.667) : 1;
    lastTime = now;
    draw(dt);
  }

  function start() {
    refreshSprites();
    resize();
    requestAnimationFrame(tick);

    if (!reduceMotion) {
      setInterval(function () {
        if (!document.hidden && running) scheduleNext(0);
      }, 9000);
    }
  }

  canvas.addEventListener('pointermove', function (e) {
    var rect = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - rect.left) * (W / rect.width);
    mouse.y = (e.clientY - rect.top) * (H / rect.height);
    mouse.active = true;
  }, { passive: true });

  canvas.addEventListener('pointerleave', function () {
    mouse.active = false;
  });

  canvas.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    explode();
  });

  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 180);
  }, { passive: true });

  window.addEventListener('pg:palette', refreshSprites);

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      running = entries[0].isIntersecting;
      if (running) lastTime = 0;
    }, { threshold: 0 });
    observer.observe(art);
  }

  window.ParticleText = {
    explode: explode,
    next: function () {
      scheduleNext(0);
    }
  };

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(start).catch(start);
  } else {
    window.addEventListener('load', start);
  }
})();
