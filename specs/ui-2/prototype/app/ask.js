/* app/ask.js: Ask (BLUEPRINT 3.3; D76, D77).

   The field on Home asks the helper (ask_server.py on
   127.0.0.1:8767), which answers from the dates Duly's engine computed for
   this student and follows BOUNDARY.md. The answer panel shows the
   question, a quiet "Thinking", the answer and at most two buttons; a
   button starts that flow (App.loops) in place, under the answer.

   Crisis words are matched on the device first and shown alone, with no
   model call (BLUEPRINT 2.7). When the helper is not running, the panel
   says how to start it and offers the flows the words match on the device.

   What is typed is never stored (BLUEPRINT 3.4): it lives in the panel
   until it is closed.

   Public, App.ask:
     open(text?)   opens the panel; a text is asked at once
     close()
     isOpen()
     find(text)    the device matcher: { crisis, situations: [{kind,label}] }
   App.nextDates() the dates ahead the engine holds, earliest first, for
                   Home's third figure. */

(function () {
  'use strict';

  const App = window.App;
  const data = App.data;
  const _ = App._;
  const URL_ASK = 'http://127.0.0.1:8767/ask';

  /* ---------------- the device matcher (crisis, and the offline fallback) ---------------- */
  function norm(s) {
    return String(s || '').toLowerCase()
      .replace(/[‘’]/g, "'")
      .replace(/([a-z0-9])-(?=[a-z0-9])/g, '$1')
      .replace(/\bi (\d{2,3})\b/g, 'i$1')
      .replace(/'/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  const STOP = ['i', 'im', 'my', 'me', 'a', 'an', 'the', 'to', 'at', 'on', 'in', 'of', 'is', 'was', 'do', 'did', 'it', 'and', 'for', 'got', 'get', 'what', 'how', 'can', 'just', 'now', 'have', 'has'];
  const stem = (w) => (w.length > 3 && /s$/.test(w) && !/ss$/.test(w) ? w.slice(0, -1) : w);
  const content = (s) => norm(s).split(' ').filter((w) => w && STOP.indexOf(w) === -1);
  const has = (q, key) => { const k = norm(key); return !!k && (' ' + q + ' ').indexOf(' ' + k + ' ') >= 0; };
  const KINDS = ['job-ends', 'travel', 'stem-filing', 'address', 'lost-paper'];
  const EXTRA = { travel: ['travel', 'trip', 'india', 'home', 'fly', 'abroad', 'visit'], 'job-ends': ['lost job', 'fired', 'laid off', 'layoff', 'job ended', 'quit'], 'stem-filing': ['stem', 'extension'], address: ['moved', 'address', 'new apartment'], 'lost-paper': ['lost passport', 'lost card', 'lost i20', 'stolen'] };

  function guides() {
    if (!App.loops) return [];
    return App.loops.defs().filter((d) => d.situation && !d.child && !d.fixed && KINDS.indexOf(d.kind) >= 0).map((d) => {
      const phrases = [d.situation].concat(EXTRA[d.kind] || []);
      (d.triggers || []).forEach((t) => { if (t.from === 'ask' && t.phrases) t.phrases.forEach((p) => phrases.push(p)); });
      return { kind: d.kind, label: d.situation, phrases: phrases };
    });
  }
  function find(text) {
    const q = norm(text);
    if (!q) return { q: q, crisis: false, situations: [] };
    const m = App.loops ? App.loops.match(text) : { matches: [] };
    if (m.crisis) return { q: q, crisis: true, notice: !!m.notice, situations: [] };
    const set = q.split(' ').map(stem);
    const best = {};
    ((m && m.matches) || []).forEach((x, i) => { if (KINDS.indexOf(x.kind) >= 0) best[x.kind] = Math.max(best[x.kind] || 0, 300 - i); });
    guides().forEach((g) => g.phrases.forEach((p) => {
      const cw = content(p);
      if (cw.length && cw.every((w) => set.indexOf(stem(w)) >= 0)) best[g.kind] = Math.max(best[g.kind] || 0, 100 + cw.length);
    }));
    const label = (k) => (guides().filter((g) => g.kind === k)[0] || {}).label || k;
    const situations = Object.keys(best).sort((a, b) => best[b] - best[a]).slice(0, 2).map((k) => ({ kind: k, label: label(k) }));
    return { q: q, crisis: false, situations: situations };
  }

  /* ---------------- the dates ahead (Home's third figure) ---------------- */
  /* The dates the engine holds from today on, earliest first: the calendar
     file's dates (STEM plan, documents that run out, reports owed) and each
     open loop's dated obligation while it is still owed.
     Priya, today 2026-09-30: start preparing for STEM OPT 2027-02-13 - 90
     = 2026-11-15, less 1 month = 2026-10-15, in 15 days. */
  function nextDates() {
    const D = App.dates;
    const t = App.loops && App.loops.now ? App.loops.now() : data.today.iso;
    const rows = [];
    const add = (iso, title) => {
      if (!D.okIso(iso) || iso < t || !title || rows.some((r) => r.iso === iso)) return;
      rows.push({ iso: iso, title: title });
    };
    (App.calendarEvents ? App.calendarEvents() : []).forEach((e) => add(e.iso, e.title));
    (App.loops ? App.loops.list() : []).forEach((lp) => {
      const d = App.loops.def(lp.kind) || {};
      if (d.private || !d.obligation) return;
      const sn = App.loops.seen(lp) || {};
      if (!sn.next) return;
      const b = App.loops.bind(lp);
      const title = String(d.obligation.title || '').replace(/\{(\w+)\}/g, (m, k) => (b.text && b.text[k] != null ? b.text[k] : ''));
      add(b.iso[d.obligation.fact], title);
    });
    rows.sort((a, b) => (a.iso < b.iso ? -1 : (a.iso > b.iso ? 1 : 0)));
    return rows.map((r) => Object.assign(r, { days: D.daysBetween(t, r.iso) }));
  }
  App.nextDates = nextDates;

  /* ---------------- the panel ---------------- */
  let S = null; /* { layer, sheet, thread, input, live, turns, returnTo } */
  let seq = 0;

  function open(text) {
    if (!S) build();
    const q = String(text || '').trim();
    if (q) send(q); else S.input.focus({ preventScroll: true });
  }
  function build() {
    if (typeof App.closeSheet === 'function') App.closeSheet();
    if (_.closePopover) _.closePopover(false);
    const layer = document.createElement('div');
    layer.className = 'sheet-layer ask-layer';
    layer.innerHTML = '<div class="scrim" data-ask-close></div>' +
      '<div class="sheet ask-sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" tabindex="-1">' + C.askPanel() + '</div>';
    document.body.appendChild(layer);
    const sheet = layer.querySelector('.sheet');
    S = {
      layer: layer, sheet: sheet, returnTo: document.activeElement, turns: [],
      thread: sheet.querySelector('[data-ask-thread]'), input: sheet.querySelector('[data-ask-q]'), live: sheet.querySelector('[data-ask-live]'),
    };
    sheet.addEventListener('keydown', trap);
    document.documentElement.classList.add('has-sheet');
    if (_.emit) _.emit('ask', 'open', null, null);
  }
  function close(returnFocus) {
    if (!S) return;
    const o = S;
    S = null;
    o.turns.forEach((t) => { if (t.ctl) t.ctl.abort(); });
    o.layer.remove();
    if (!document.querySelector('.sheet-layer')) document.documentElement.classList.remove('has-sheet');
    const bar = document.querySelector('[data-askbar-q]');
    if (returnFocus !== false && o.returnTo && document.contains(o.returnTo) && o.returnTo !== bar && o.returnTo.focus) o.returnTo.focus({ preventScroll: true });
    if (_.emit) _.emit('ask', 'close', null, null);
  }

  function loopsOf(t) {
    if (!t.loopIds || !t.loopIds.length || !App.loops) return '';
    /* The flow chosen and any it opened. */
    const all = App.loops.list({ all: true });
    all.forEach((l) => { if (l.context && t.loopIds.indexOf(l.context.parent) >= 0 && t.loopIds.indexOf(l.id) === -1) t.loopIds.push(l.id); });
    const list = t.loopIds.map((id) => App.loops.get(id)).filter(Boolean);
    return list.length ? C.loops(list) : '';
  }
  function draw(scrollTo) {
    if (!S) return;
    S.thread.innerHTML = S.turns.map((t) => C.askTurn(t, loopsOf(t))).join('');
    if (scrollTo) {
      const el = S.thread.querySelector('[data-turn-id="' + scrollTo + '"]');
      if (el) S.sheet.scrollTop = Math.max(0, el.offsetTop - 16);
    }
  }
  function say(text) { if (S && S.live && S.live.textContent !== text) S.live.textContent = text; }

  function send(q, again) {
    if (!S) build();
    let t = again;
    if (!t) {
      seq += 1;
      t = { id: 'q' + seq, q: q, state: 'thinking', actions: [], loopIds: [] };
      S.turns.push(t);
    } else {
      Object.assign(t, { state: 'thinking', answer: '', actions: [], error: '' });
    }
    const found = find(q);
    if (found.crisis && App.loops) {
      /* A fixed screen, shown alone, no dates, no verdict. */
      const lp = App.loops.start('crisis', found.notice ? { notice: true } : {});
      t.state = 'crisis';
      if (lp) { App.state['loopOpen:' + lp.id] = true; t.loopIds = [lp.id]; }
      draw(t.id);
      say('Help now');
      return;
    }
    draw(t.id);
    say('Thinking');
    const history = S.turns.filter((x) => x !== t && x.state === 'answer').slice(-4).map((x) => ({ q: x.q, a: x.answer }));
    const ctl = typeof AbortController === 'function' ? new AbortController() : null;
    t.ctl = ctl;
    fetch(URL_ASK, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q, history: history }), signal: ctl ? ctl.signal : undefined,
    }).then((r) => r.json().then((body) => ({ ok: r.ok, body: body }))).then((res) => {
      if (!S || S.turns.indexOf(t) < 0) return;
      t.ctl = null;
      if (res.ok && res.body && typeof res.body.answer === 'string') {
        t.state = 'answer';
        t.answer = res.body.answer;
        t.actions = (res.body.actions || []).filter((a) => a && KINDS.indexOf(a.kind) >= 0).slice(0, 2);
        say(t.answer);
      } else {
        t.state = 'failed';
        t.error = (res.body && res.body.error) || '';
        say('No answer this time.');
      }
      draw(t.id);
    }).catch((err) => {
      if (!S || S.turns.indexOf(t) < 0 || (err && err.name === 'AbortError')) return;
      t.ctl = null;
      t.state = 'offline';
      t.actions = found.situations.map((s) => ({ kind: s.kind, label: s.label }));
      say('Ask is not running on this computer yet.');
      draw(t.id);
    });
  }

  /* A button under an answer starts its flow in place, under that answer.
     A document named in the words fills the lost document flow's first
     answer. */
  const LOST = { passport: 'passport', ead: 'ead', 'work permit': 'ead', card: 'ead', i20: 'i20', visa: 'visa', i94: 'i94', i797: 'i797' };
  function startFlow(kind, turnId) {
    if (!S || !App.loops) return;
    const t = S.turns.filter((x) => x.id === turnId)[0];
    if (!t) return;
    const lp = App.loops.start(kind, {});
    if (!lp) return;
    if (kind === 'lost-paper' && lp.step === 'which' && !(lp.values || {}).paper) {
      const k = Object.keys(LOST).filter((w) => has(norm(t.q), w))[0];
      /* The document is named in the words: its copy opens at once. */
      if (k) { App.loops.answer(lp.id, 'paper', LOST[k]); if (App.loops.advance) App.loops.advance(lp.id); }
    }
    App.state['loopOpen:' + lp.id] = true;
    App.loops.markSeen(lp.id);
    t.loopIds = [lp.id];
    if (typeof _.render === 'function') _.render('inplace');
    draw();
    if (App.haptic) App.haptic('select');
    const box = S.thread.querySelector('[data-loop="' + lp.id + '"]');
    if (box) {
      if (App.play) App.play(box, 'is-arriving');
      const f = box.querySelector('.loop-step') || box.querySelector('.loop-head');
      if (f) { if (!f.hasAttribute('tabindex')) f.setAttribute('tabindex', '-1'); f.focus({ preventScroll: false }); }
    }
  }

  function trap(e) {
    if (e.key === 'Escape') {
      if (e.target.closest && e.target.closest('.pop')) return;
      e.preventDefault(); e.stopPropagation(); close(true); return;
    }
    if (e.key !== 'Tab') return;
    const f = Array.from(this.querySelectorAll('a[href], button:not([disabled]), input, [contenteditable="true"], [tabindex="0"]')).filter((x) => x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === this)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ---------------- wiring ---------------- */
  if (typeof document === 'undefined' || !document.addEventListener) {
    App.ask = { open: () => {}, close: () => {}, find: find, isOpen: () => false };
    return;
  }

  document.addEventListener('click', (e) => {
    const t = e.target.closest && e.target.closest('[data-ask-open],[data-ask-close],[data-ask-start],[data-ask-retry]');
    if (!t) return;
    if (t.hasAttribute('data-ask-open')) { e.preventDefault(); open(t.getAttribute('data-ask-open') || ''); return; }
    if (!S || !S.layer.contains(t)) return;
    e.preventDefault();
    if (t.hasAttribute('data-ask-close')) { close(true); return; }
    if (t.hasAttribute('data-ask-start')) { startFlow(t.dataset.askStart, t.dataset.turn); return; }
    if (t.hasAttribute('data-ask-retry')) {
      const turn = S.turns.filter((x) => x.id === t.dataset.askRetry)[0];
      if (turn) send(turn.q, turn);
    }
  });
  /* Leaving through a link in the panel (a flow's source page) closes it. */
  document.addEventListener('click', (e) => {
    if (!S) return;
    const a = e.target.closest && e.target.closest('a[href^="#/"]');
    if (!a || !S.layer.contains(a)) return;
    e.preventDefault();
    close(false);
    App.go(a.getAttribute('href'));
  });

  document.addEventListener('submit', (e) => {
    const f = e.target;
    if (!f.matches) return;
    if (f.matches('[data-askbar]')) {
      e.preventDefault();
      const input = f.querySelector('[data-askbar-q]');
      const q = (input.value || '').trim();
      if (!q) return;
      input.value = '';
      input.blur();
      open(q);
      return;
    }
    if (S && f.matches('[data-ask-form]')) {
      e.preventDefault();
      const q = (S.input.value || '').trim();
      if (!q) return;
      S.input.value = '';
      send(q);
    }
  });

  /* Cmd K or Ctrl K: the cursor goes to the field on Home (or to the
     follow-up field while the panel is open). On any other page the keys
     do nothing here. Escape leaves the field. */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && e.target && e.target.matches && e.target.matches('[data-askbar-q]')) { e.target.value = ''; e.target.blur(); return; }
    if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
    if (e.key !== 'k' && e.key !== 'K') return;
    if (App.state && App.state.deleted) return;
    if (document.querySelector('main#main.bare')) return;
    const bar = document.querySelector('main#main [data-askbar-q]');
    if (!S && !bar) return;
    e.preventDefault();
    if (S) { S.input.focus(); return; }
    bar.focus(); bar.select();
  });

  /* A flow that moved while the panel shows it: a flow it opened joins. */
  document.addEventListener('duly:change', (e) => {
    if (!S || !e.detail || e.detail.kind !== 'loop') return;
    const before = S.turns.map((t) => t.loopIds.join()).join('|');
    S.turns.forEach((t) => loopsOf(t));
    if (S.turns.map((t) => t.loopIds.join()).join('|') !== before) setTimeout(() => { if (S) draw(); }, 0);
  });

  App.ask = { open: open, close: () => close(true), find: find, isOpen: () => !!S };
  Object.assign(App._, { askNorm: norm });
})();
