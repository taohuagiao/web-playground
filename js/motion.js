/* =========================================================
   WEB PLAYGROUND — motion.js
   One shared motion policy.

   Important: "reduced motion" should calm ambient animation,
   NOT remove direct-manipulation interactions. A cursor that
   follows your hand, a card that tilts under your pointer, or
   a one-shot text reveal are responses to the user, not autoplay.

   So we expose two separate flags:
     interactive  always on (pointer-driven effects)
     ambient      on unless the user turns it off / asks for less
   ========================================================= */

(function () {
  'use strict';

  var params = new URLSearchParams(window.location.search);
  var stored = null;

  try {
    stored = localStorage.getItem('pg-motion');
  } catch (err) {
    stored = null;
  }

  var override = params.get('motion') || stored; // 'on' | 'off' | null
  var systemReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Default is ON. A system "reduce motion" preference only softens the
  // amplitude, because on Windows it commonly reflects a performance
  // setting rather than a motion-sensitivity need. The nav toggle lets
  // anyone turn ambient motion fully off.
  var ambient = override !== 'off';
  var gentle = !override && systemReduce;

  var listeners = [];

  function applyClass() {
    document.body.classList.toggle('ambient-off', !ambient);
  }

  function set(value) {
    ambient = !!value;
    try {
      localStorage.setItem('pg-motion', ambient ? 'on' : 'off');
    } catch (err) { /* private mode */ }
    applyClass();
    listeners.forEach(function (fn) {
      fn(ambient);
    });
  }

  window.PGMotion = {
    // Ambient = decorative autoplay (drifting aurora, auto word cycle).
    get ambient() {
      return ambient;
    },
    // Direct manipulation is always available.
    interactive: true,
    systemReduce: systemReduce,
    set: set,
    toggle: function () {
      set(!ambient);
    },
    onChange: function (fn) {
      listeners.push(fn);
    },
    // Multiplier for decorative motion.
    get scale() {
      if (!ambient) return 0.12;
      return gentle ? 0.65 : 1;
    }
  };

  if (document.body) {
    applyClass();
  } else {
    document.addEventListener('DOMContentLoaded', applyClass, { once: true });
  }
})();
