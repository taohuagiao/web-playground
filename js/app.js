/* =========================================================
   WEB PLAYGROUND — app.js
   The small interactions: cursor, magnets, tilt, scramble,
   reveals, palette switching, confetti and a Konami code.
   ========================================================= */

(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;

  /* ---------------- palette switcher ---------------- */

  var switcher = document.getElementById('palette-switcher');
  var paletteButtons = [];

  function updatePaletteButtons() {
    var current = window.PG ? window.PG.index : 0;
    for (var i = 0; i < paletteButtons.length; i++) {
      var active = i === current;
      paletteButtons[i].classList.toggle('active', active);
      paletteButtons[i].setAttribute('aria-pressed', active ? 'true' : 'false');
    }
  }

  if (switcher && window.PG) {
    window.PG.palettes.forEach(function (p, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'palette-dot';
      btn.style.background = 'linear-gradient(135deg, ' + p.accent + ', ' + p.accent2 + ')';
      btn.setAttribute('aria-label', '切换配色：' + p.name);
      btn.setAttribute('aria-pressed', 'false');
      btn.addEventListener('click', function () {
        window.PG.setPalette(i);
        try {
          localStorage.setItem('pg-palette', String(i));
        } catch (err) { /* private mode */ }
        updatePaletteButtons();
      });
      switcher.appendChild(btn);
      paletteButtons.push(btn);
    });

    var saved = 0;
    try {
      var raw = localStorage.getItem('pg-palette');
      if (raw !== null) {
        var parsed = parseInt(raw, 10);
        if (!isNaN(parsed)) saved = parsed;
      }
    } catch (err) { /* private mode */ }

    window.PG.setPalette(saved);
    updatePaletteButtons();
  }

  /* ---------------- custom cursor ---------------- */

  if (finePointer && !reduceMotion) {
    var dot = document.querySelector('.cursor-dot');
    var ring = document.querySelector('.cursor-ring');

    if (dot && ring) {
      document.body.classList.add('cursor-ready');

      var mx = window.innerWidth / 2;
      var my = window.innerHeight / 2;
      var rx = mx;
      var ry = my;

      dot.style.transform = 'translate(' + mx + 'px,' + my + 'px) translate(-50%,-50%)';
      ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px) translate(-50%,-50%)';

      window.addEventListener('pointermove', function (e) {
        mx = e.clientX;
        my = e.clientY;
        dot.style.transform = 'translate(' + mx + 'px,' + my + 'px) translate(-50%,-50%)';
      }, { passive: true });

      (function cursorLoop() {
        rx += (mx - rx) * 0.16;
        ry += (my - ry) * 0.16;
        ring.style.transform = 'translate(' + rx.toFixed(2) + 'px,' + ry.toFixed(2) + 'px) translate(-50%,-50%)';
        requestAnimationFrame(cursorLoop);
      })();

      Array.prototype.forEach.call(
        document.querySelectorAll('a, button, [data-cursor]'),
        function (el) {
          el.addEventListener('pointerenter', function () {
            ring.classList.add('is-hover');
          });
          el.addEventListener('pointerleave', function () {
            ring.classList.remove('is-hover');
          });
        }
      );
    }
  }

  /* ---------------- magnetic elements ---------------- */

  var magnets = [];

  if (!reduceMotion) {
    Array.prototype.forEach.call(
      document.querySelectorAll('[data-magnetic]'),
      function (el) {
        magnets.push({ el: el, x: 0, y: 0, tx: 0, ty: 0 });
      }
    );
  }

  if (magnets.length) {
    window.addEventListener('pointermove', function (e) {
      for (var i = 0; i < magnets.length; i++) {
        var m = magnets[i];
        var rect = m.el.getBoundingClientRect();
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + rect.height / 2;
        var dx = e.clientX - cx;
        var dy = e.clientY - cy;
        var reach = Math.max(rect.width, rect.height) * 0.5 + 70;

        if (Math.abs(dx) < reach && Math.abs(dy) < reach) {
          m.tx = dx * 0.22;
          m.ty = dy * 0.22;
        } else {
          m.tx = 0;
          m.ty = 0;
        }
      }
    }, { passive: true });

    (function magneticLoop() {
      for (var i = 0; i < magnets.length; i++) {
        var m = magnets[i];
        m.x += (m.tx - m.x) * 0.18;
        m.y += (m.ty - m.y) * 0.18;

        if (Math.abs(m.x) < 0.01 && Math.abs(m.y) < 0.01 && m.tx === 0 && m.ty === 0) {
          if (m.el.style.transform) m.el.style.transform = '';
        } else {
          m.el.style.transform = 'translate(' + m.x.toFixed(2) + 'px,' + m.y.toFixed(2) + 'px)';
        }
      }
      requestAnimationFrame(magneticLoop);
    })();
  }

  /* ---------------- 3D tilt cards ---------------- */

  if (finePointer && !reduceMotion) {
    Array.prototype.forEach.call(
      document.querySelectorAll('[data-tilt]'),
      function (card) {
        card.addEventListener('pointerenter', function () {
          card.style.transition = 'transform .12s ease-out';
        });

        card.addEventListener('pointermove', function (e) {
          var rect = card.getBoundingClientRect();
          var px = (e.clientX - rect.left) / rect.width;
          var py = (e.clientY - rect.top) / rect.height;
          var rotX = (0.5 - py) * 12;
          var rotY = (px - 0.5) * 16;

          card.style.transform =
            'perspective(900px) rotateX(' + rotX.toFixed(2) + 'deg)' +
            ' rotateY(' + rotY.toFixed(2) + 'deg) translateY(-6px)';
          card.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
          card.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
        });

        card.addEventListener('pointerleave', function () {
          card.style.transition = 'transform .6s cubic-bezier(.2,.8,.2,1)';
          card.style.transform = '';
        });
      }
    );
  }

  /* ---------------- scramble text ---------------- */

  var GLYPHS = '天地玄黄宇宙洪荒日月盈昃辰宿列张寒来暑往秋收冬藏※◇◆';

  function scramble(el) {
    var finalText = el.getAttribute('data-text') || el.textContent || '';
    if (!finalText) return;

    var chars = Array.prototype.slice.call(finalText);
    var resolves = [];
    var maxResolve = 0;
    var i;

    for (i = 0; i < chars.length; i++) {
      resolves.push(i * 15 + 420 + Math.random() * 500);
      if (resolves[i] > maxResolve) maxResolve = resolves[i];
    }

    var start = performance.now();

    function frame(now) {
      var t = now - start;
      var out = '';

      for (var k = 0; k < chars.length; k++) {
        var ch = chars[k];
        if (ch === ' ' || ch === '\n') {
          out += ch;
        } else if (t >= resolves[k]) {
          out += ch;
        } else {
          out += GLYPHS.charAt(Math.floor(Math.random() * GLYPHS.length));
        }
      }

      el.textContent = out;

      if (t < maxResolve) {
        requestAnimationFrame(frame);
      } else {
        el.textContent = finalText;
      }
    }

    requestAnimationFrame(frame);
  }

  var scrambleEls = document.querySelectorAll('.scramble');

  if ('IntersectionObserver' in window && !reduceMotion) {
    var scrambleObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          scramble(entry.target);
          scrambleObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.35 });

    Array.prototype.forEach.call(scrambleEls, function (el) {
      scrambleObserver.observe(el);
    });
  }

  /* ---------------- reveal on scroll ---------------- */

  var revealEls = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window && !reduceMotion) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    Array.prototype.forEach.call(revealEls, function (el) {
      revealObserver.observe(el);
    });
  } else {
    Array.prototype.forEach.call(revealEls, function (el) {
      el.classList.add('in');
    });
  }

  /* ---------------- progress + nav state ---------------- */

  var progressBar = document.getElementById('progress-bar');
  var nav = document.getElementById('nav');
  var scrollTicking = false;

  function onScroll() {
    if (scrollTicking) return;
    scrollTicking = true;

    requestAnimationFrame(function () {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;

      if (progressBar) {
        progressBar.style.transform = 'scaleX(' + progress.toFixed(4) + ')';
      }
      if (nav) {
        nav.classList.toggle('scrolled', window.scrollY > 24);
      }
      scrollTicking = false;
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------------- toast ---------------- */

  var toastEl = document.getElementById('toast');
  var toastTimer = 0;

  function toast(message, duration) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove('show');
    }, duration || 3400);
  }

  /* ---------------- confetti ---------------- */

  var confettiCanvas = document.getElementById('confetti');
  var cctx = confettiCanvas ? confettiCanvas.getContext('2d') : null;
  var confettiPieces = [];
  var confettiRAF = 0;

  function sizeConfetti() {
    if (!confettiCanvas || !cctx) return;
    var ratio = Math.min(window.devicePixelRatio || 1, 2);
    confettiCanvas.width = Math.round(window.innerWidth * ratio);
    confettiCanvas.height = Math.round(window.innerHeight * ratio);
    cctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function confettiTick() {
    cctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    for (var i = confettiPieces.length - 1; i >= 0; i--) {
      var p = confettiPieces[i];

      p.vy += p.g;
      p.vx *= 0.995;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life -= 0.0035;

      if (p.y > window.innerHeight + 80 || p.life <= 0) {
        confettiPieces.splice(i, 1);
        continue;
      }

      cctx.save();
      cctx.translate(p.x, p.y);
      cctx.rotate(p.rot);
      cctx.globalAlpha = Math.max(0, Math.min(1, p.life));
      cctx.fillStyle = p.color;
      cctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      cctx.restore();
    }

    if (confettiPieces.length) {
      confettiRAF = requestAnimationFrame(confettiTick);
    } else {
      confettiRAF = 0;
      cctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
  }

  function burst(count) {
    if (!cctx) return;

    var colors = ['#ffffff', '#ffd166', '#7cff5a'];
    if (window.PG) {
      var pal = window.PG.palettes[window.PG.index] || window.PG.palettes[0];
      colors = [pal.accent, pal.accent2, '#ffffff', '#ffd166', '#7cff5a'];
    }

    for (var i = 0; i < count; i++) {
      confettiPieces.push({
        x: window.innerWidth / 2 + (Math.random() - 0.5) * window.innerWidth * 0.35,
        y: window.innerHeight * 0.42,
        vx: (Math.random() - 0.5) * 17,
        vy: -9 - Math.random() * 11,
        g: 0.34 + Math.random() * 0.16,
        w: 5 + Math.random() * 7,
        h: 8 + Math.random() * 10,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.32,
        color: colors[(Math.random() * colors.length) | 0],
        life: 1
      });
    }

    if (!confettiRAF) confettiRAF = requestAnimationFrame(confettiTick);
  }

  if (confettiCanvas) {
    sizeConfetti();
    window.addEventListener('resize', sizeConfetti, { passive: true });
  }

  /* ---------------- Konami code ---------------- */

  var KONAMI = [
    'arrowup', 'arrowup', 'arrowdown', 'arrowdown',
    'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'
  ];
  var konamiIndex = 0;
  var partyTimer = 0;

  function party() {
    document.body.classList.add('party');
    toast('🎮 CHEAT CODE ACTIVATED — PARTY MODE');
    burst(180);

    var flips = 0;
    var flipTimer = setInterval(function () {
      if (!window.PG) return;
      window.PG.setPalette(window.PG.index + 1);
      updatePaletteButtons();
      flips++;
      if (flips >= 10) clearInterval(flipTimer);
    }, 240);

    clearTimeout(partyTimer);
    partyTimer = setTimeout(function () {
      document.body.classList.remove('party');
    }, 5200);
  }

  window.addEventListener('keydown', function (e) {
    var key = (e.key || '').toLowerCase();

    if (key === KONAMI[konamiIndex]) {
      konamiIndex++;
      if (konamiIndex === KONAMI.length) {
        konamiIndex = 0;
        party();
      }
    } else {
      konamiIndex = key === KONAMI[0] ? 1 : 0;
    }
  });

  /* ---------------- ripple + hero action ---------------- */

  Array.prototype.forEach.call(document.querySelectorAll('.btn'), function (btn) {
    btn.addEventListener('pointerdown', function (e) {
      var rect = btn.getBoundingClientRect();
      var ripple = document.createElement('span');
      ripple.className = 'ripple';
      ripple.style.left = (e.clientX - rect.left) + 'px';
      ripple.style.top = (e.clientY - rect.top) + 'px';
      btn.appendChild(ripple);

      setTimeout(function () {
        if (ripple.parentNode) ripple.parentNode.removeChild(ripple);
      }, 760);
    });
  });

  var explodeBtn = document.querySelector('[data-action="explode"]');
  if (explodeBtn) {
    explodeBtn.addEventListener('click', function () {
      if (window.ParticleText) window.ParticleText.explode();
    });
  }
})();
