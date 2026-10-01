/* app/motion.js: Round 5: motion and haptics, the current step, the confetti burst. */

(function () {
  'use strict';

  const App = window.App;
  const _ = App._;
  const { reduced, isPhone } = App._;
  /* Defined in a file loaded later; looked up when called. */
  const emit = (...a) => _.emit(...a);

  /* ---------------- round 5: motion and haptics (note 4) ---------------- */

  /* Light, never loud: one short tap for a tick, a softer double for a
     completion. Phones without the Vibration API (iPhone Safari) and every
     desktop simply do nothing. */
  const HAPTICS = { tick: 10, select: 6, complete: [8, 70, 8] };
  let lastHaptic = 0;
  function haptic(kind) {
    if (reduced() || App.state.haptics === false) return false;
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return false;
    const now = Date.now();
    if (kind !== 'complete' && now - lastHaptic < 60) return false;
    lastHaptic = now;
    try { return navigator.vibrate(HAPTICS[kind] || HAPTICS.tick); } catch (e) { return false; }
  }
  App.haptic = haptic;

  /* play(el, cls) : a one-shot motion class, removed when it ends (or after
     1.2s as a guard). Under reduced motion nothing is added; the end state is
     already on screen. */
  function play(el, name) {
    if (!el || reduced()) return;
    el.classList.remove(name);
    void el.offsetWidth;
    el.classList.add(name);
    const done = () => el.classList.remove(name);
    el.addEventListener('animationend', function end(ev) {
      if (ev.target !== el && !el.contains(ev.target)) return;
      if (el.getAnimations && el.getAnimations({ subtree: true }).some((a) => a.playState === 'running')) return;
      el.removeEventListener('animationend', end);
      done();
    });
    setTimeout(done, 1200);
  }
  App.play = play;

  /* App.currentStep(path) : the key of the first open, visible step. */
  App.currentStep = (path) => {
    const open = App.steps(path || 'stem').filter((s) => !s.done && !(s.afterOf && !s.afterOf.done));
    return open[0] ? open[0].key : null;
  };

  /* App.advanceCurrent(list) : in a list that marks a current step, the first
     open visible step becomes current; when that changes, it gets a short
     highlight. Returns the new current item or null. */
  function advanceCurrent(list) {
    if (!list) return null;
    const items = Array.from(list.querySelectorAll(':scope > .task'));
    const was = items.filter((it) => it.classList.contains('is-current'))[0] || null;
    const next = items.filter((it) => !it.hidden && !it.classList.contains('is-done'))[0] || null;
    if (was === next) return next;
    if (was) { was.classList.remove('is-current'); was.removeAttribute('aria-current'); }
    if (next) {
      next.classList.add('is-current');
      next.setAttribute('aria-current', 'step');
      play(next, 'is-arriving');
    }
    emit('current', next ? next.dataset.key : null, true, next);
    return next;
  }
  App.advanceCurrent = advanceCurrent;

  /* Soft arcs in the canvas colours, about 1.2 to 1.6 seconds. */
  function burst(anchor) {
    if (reduced() || !anchor || !anchor.getBoundingClientRect || !Element.prototype.animate) return;
    const r = anchor.getBoundingClientRect();
    const cs = getComputedStyle(document.documentElement);
    const colors = ['--accent', '--accent-soft', '--accent-muted', '--tint-border', '--caution']
      .map((v) => cs.getPropertyValue(v).trim()).filter(Boolean);
    /* On a phone the burst starts from the middle of the screen; on a wider
       window from the start of the anchor. The fan is then narrowed to the
       room on either side, so no arc leaves the window. */
    const ox = isPhone() ? innerWidth / 2
      : Math.min(Math.max(r.left + Math.min(r.width, 240) / 2, 120), innerWidth - 120);
    const oy = r.top + Math.min(r.height, 24) / 2;
    const room = Math.min(ox, innerWidth - ox) - 24;
    const spread = Math.max(0.3, Math.min(1, room / 240));
    const n = 18;
    for (let i = 0; i < n; i++) {
      const p = document.createElement('span');
      p.className = 'confetti' + (i % 3 === 0 ? ' is-strip' : '');
      p.style.left = ox + 'px';
      p.style.top = oy + 'px';
      p.style.background = colors[i % colors.length];
      document.body.appendChild(p);
      const a = -Math.PI / 2 + ((i / (n - 1)) - 0.5) * Math.PI * 0.8 + (Math.random() - 0.5) * 0.2;
      const v = 150 + Math.random() * 90;
      const vx = Math.cos(a) * v * spread;
      const vy = Math.sin(a) * v;
      const g = 360 + Math.random() * 80;
      const spin = (Math.random() < 0.5 ? -1 : 1) * (180 + Math.random() * 220);
      const frames = [];
      for (let k = 0; k <= 12; k++) {
        const t = k / 12;
        const x = vx * t + Math.sin(t * Math.PI * 2 + i) * 6;
        const y = vy * t + g * t * t * 0.5;
        frames.push({
          transform: 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) rotate(' + (i * 23 + spin * t).toFixed(0) + 'deg)',
          opacity: t < 0.7 ? 1 : Math.max(0, 1 - (t - 0.7) / 0.3),
          offset: t,
        });
      }
      p.animate(frames, { duration: 1200 + Math.random() * 400, easing: 'cubic-bezier(.25,.6,.35,1)' }).onfinish = () => p.remove();
    }
  }

  Object.assign(App._, { haptic, play, advanceCurrent, burst });
})();
