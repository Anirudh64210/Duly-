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
     completion, one light tap when a loop closes (success). Phones without
     the Vibration API (iPhone Safari) and every desktop simply do nothing.
     A success tap holds off any other tap for 300 ms, so the tap the loop
     wiring sends right after it is not a second buzz. */
  const HAPTICS = { tick: 10, select: 6, complete: [8, 70, 8], success: 12 };
  let lastHaptic = 0;
  let quietUntil = 0;
  function haptic(kind) {
    if (reduced() || App.state.haptics === false) return false;
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return false;
    const now = Date.now();
    if (kind !== 'success' && now < quietUntil) return false;
    if (kind !== 'complete' && kind !== 'success' && now - lastHaptic < 60) return false;
    if (kind === 'success') quietUntil = now + 300;
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

  /* ---------------- Round 8, rule 7: every loop closes itself ----------------

     The full UI loop, on any page and in Home's sheet. When an action
     leaves a loop with nothing more for the student to do now (it is done,
     dropped, waiting or planned), and the action wrote a receipt:
       1. the loop is drawn as a self-drawing check and a one-line receipt
          with the follow-up ("Confirmed Sep 30. Next check-in: Oct 30"),
          and one light haptic tap;
       2. the receipt is held for 1.6 s;
       3. then the item leaves: Home's sheet fades and closes and the Home
          row folds away (height and opacity); in a list, the item folds
          away the same way;
       4. Undo stays in a small toast for 5 s.
     Under reduced motion nothing moves: the same receipt, the same hold,
     then the item is simply gone and the same toast shows. The receipt
     states what was saved and what comes next; it never praises.
     An action that leads to a step that still needs the student keeps the
     loop open on that step, with its receipt on top. */
  const HOLD = 1600;
  const UNDO_FOR = 5000;
  const OUT = 240;
  const settling = {};            /* loop id -> { line, from, timer } */
  const seenReceipts = new WeakSet();
  const seenDrops = {};

  /* The receipt as one line: the first sentence ("Confirmed Sep 30"; "Done"
     takes the next sentence with it), then the follow-up sentence that
     starts "Next" or "Nothing else", without a question after its date
     ("Next check-in Oct 7: Do you know ...?" reads "Next check-in Oct 7").
     A sentence ends at a period after a lowercase letter, a digit or a
     bracket and before a capital, so "U.S." does not split. */
  function sentences(t) {
    return String(t || '').trim().split(/(?<=[a-z0-9)]\.)\s+(?=[A-Z])/).map((s) => s.trim().replace(/\.$/, '')).filter(Boolean);
  }
  function receiptLine(text) {
    const s = sentences(text);
    if (!s.length) return '';
    const out = [s[0]];
    if (/^(Done|Saved)$/.test(s[0]) && s[1]) out.push(s[1]);
    const follow = s.slice(out.length).filter((x) => /^(Next|Nothing else|Still open|Reminder set|Waiting)/.test(x))[0];
    /* "Next check-in: Oct 30" reads "Next check-in Oct 30". */
    if (follow) out.push(follow.replace(/^(Next[^:]*\b\w{3} \d{1,2}(, \d{4})?):\s.*$/, '$1').replace(/^(Next [^:]+): (?=[A-Z][a-z]{2} \d)/, '$1 '));
    /* A date never breaks across lines: "Oct 30" stays together. */
    return out.join('. ').replace(/\b([A-Z][a-z]{2}) (\d{1,2})\b/g, '$1\u00a0$2');
  }
  App.receiptLine = receiptLine;
  /* Read by components/loop.js: the line while a loop is settling, or null. */
  App.settleLine = (id) => (settling[id] ? settling[id].line : null);

  const L = () => App.loops;
  const cssq = (v) => (_.cssEsc ? _.cssEsc(v) : String(v).replace(/["\\]/g, '\\$&'));
  const nodes = (sel) => Array.from(document.querySelectorAll(sel));

  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('duly:change', (ev) => {
      const d = ev.detail || {};
      if (d.kind !== 'loop' || !L()) return;
      const lp = L().get(d.key);
      if (!lp || settling[lp.id]) return;
      let line = '';
      if (lp.state === 'dismissed') {
        /* A dropped loop has no receipt; one plain line says where it went. */
        const k = String((lp.history || []).length);
        if (seenDrops[lp.id] === k) return;
        seenDrops[lp.id] = k;
        line = 'Removed from your plan';
      } else {
        const rc = lp.receipt;
        if (!rc || rc.folded || !rc.text || seenReceipts.has(rc)) return;
        seenReceipts.add(rc);
        if (rc.exit === 'reopen' || rc.exit === 'calendar') return;
        if (lp.state !== 'closed' && L().seen(lp).kind === 'needs') return;
        line = receiptLine(rc.text);
      }
      if (!line) return;
      /* Drawn as the check and the line by every redraw that follows this
         event (components/loop.js reads App.settleLine). */
      settling[lp.id] = { line: line, from: null, timer: null };
      haptic('success');
      setTimeout(() => begin(lp.id), 0);
    });
  }

  function begin(id) {
    const s = settling[id];
    if (!s) return;
    const els = nodes('[data-loop="' + cssq(id) + '"]');
    /* Nothing on screen shows this loop: no hold, no toast. */
    if (!els.length) { finish(id); return; }
    s.from = els.some((el) => el.closest('.sheet-layer')) ? 'sheet' : 'list';
    s.timer = setTimeout(() => leave(id), HOLD);
  }

  /* Back to the plain loop: the receipt folds to its one line and the loop
     is no longer held open. */
  function finish(id) {
    delete settling[id];
    if (L() && L().foldReceipt) L().foldReceipt(id);
    App.state['loopOpen:' + id] = false;
  }

  /* collapse(el, done): height, padding and opacity to nothing; then done.
     Under reduced motion, done at once. */
  function collapse(list, done) {
    const els = list.filter(Boolean);
    if (!els.length || reduced() || !Element.prototype.animate) { done(); return; }
    let left = els.length;
    els.forEach((el) => {
      const cs = getComputedStyle(el);
      el.style.overflow = 'hidden';
      const a = el.animate([
        { height: el.offsetHeight + 'px', opacity: 1, paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom, marginTop: cs.marginTop, marginBottom: cs.marginBottom },
        { height: '0px', opacity: 0, paddingTop: '0px', paddingBottom: '0px', marginTop: '0px', marginBottom: '0px' },
      ], { duration: OUT, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
      a.onfinish = () => { left -= 1; if (!left) done(); };
    });
  }
  function fadeOut(el, done) {
    if (!el || reduced() || !Element.prototype.animate) { done(); return; }
    el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: 'ease-out', fill: 'forwards' }).onfinish = done;
  }

  function leave(id) {
    const s = settling[id];
    if (!s) return;
    const line = s.line;
    const from = s.from;
    const els = nodes('[data-loop="' + cssq(id) + '"]');
    const layer = els.map((el) => el.closest('.sheet-layer')).filter(Boolean)[0] || null;
    const inList = els.filter((el) => !el.closest('.sheet-layer'));
    const rows = () => nodes('[data-home-loop="' + cssq(id) + '"]').map((r) => r.closest('li') || r);
    const done = () => {
      finish(id);
      if (typeof _.render === 'function') _.render('inplace');
      const again = nodes('[data-loop="' + cssq(id) + '"]');
      /* A page that keeps the loop as a quiet line (Plan keeps a waiting
         loop) shows it folded, fading in where it stood. */
      again.forEach((el) => play(el, 'is-arriving'));
      offerUndo(id, line, from);
    };
    if (layer) {
      fadeOut(layer, () => {
        if (_.closeSheet) _.closeSheet(false);
        App.homeSheetLoop = null;
        collapse(rows(), done);
      });
    } else {
      collapse(inList.concat(rows()), done);
    }
  }

  /* The toast: the receipt line and Undo, for 5 s. Undo puts the record and
     the loop back, and an item answered in Home's sheet opens there again. */
  function offerUndo(id, line, from) {
    const lp = L() && L().get(id);
    const canUndo = !!(lp && lp.undo && lp.undo.length);
    if (!_.toast) return;
    _.toast(line, canUndo ? { action: 'Undo', onAction: () => {
      const res = L().undo(id);
      if (!res || !res.ok) return;
      haptic('select');
      App.state['loopOpen:' + id] = true;
      if (typeof _.render === 'function') _.render('inplace');
      if (from === 'sheet' && typeof App.openHomeItem === 'function') App.openHomeItem(id);
    } } : {});
    const el = document.querySelector('.toast');
    if (el) setTimeout(() => { if (el.isConnected) el.remove(); }, UNDO_FOR);
  }

  /* Leaving the page ends any hold at once: the loop is folded, no toast. */
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('hashchange', () => {
      Object.keys(settling).forEach((id) => { clearTimeout(settling[id].timer); finish(id); });
      App.homeSheetLoop = null;
    });
  }

  App.settle = { line: receiptLine, HOLD: HOLD, UNDO_FOR: UNDO_FOR };
  Object.assign(App._, { haptic, play, advanceCurrent, burst });
})();
