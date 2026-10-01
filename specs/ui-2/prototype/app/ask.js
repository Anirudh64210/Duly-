/* app/ask.js: Ask (BLUEPRINT 3.3; D76, D77; BRIEF Round 8, note 1).

   The box at the bottom of Home asks the helper (ask_server.py on
   127.0.0.1:8767), which answers from the dates the engine computed for
   this student and from named official sources, in one shape: what applies
   to you, your plan (now, at STEM OPT, after), watch out for, and only the
   personal judgement for the DSO, with a draft. Under an answer sit at most
   three actions: start a guided flow (App.loops) in place, save a fact she
   stated to her record, or add a goal to Plan (App.addGoal). Each closes its
   own loop: a check draws itself, a light tap, a one-line receipt with the
   follow-up.

   The conversation is kept: it stays when the panel closes, across pages
   and reloads (localStorage, every read and write in try/catch), and the
   whole of it goes with each question. "New conversation" clears it. An
   answer still coming when the panel closes lands in the kept conversation.
   Crisis words are matched on the device first and shown alone, with no
   model call (BLUEPRINT 2.7), and are never kept. When the helper is not
   running, the panel says how to start it and offers the flows the words
   match on the device.

   Public, App.ask:
     open(text?)   opens the panel; a text is asked at once
     close()
     isOpen()
     find(text)    the device matcher: { crisis, situations: [{kind,label}] }
     summary()     { count, last } of the kept conversation, or null
     clear()       starts a new conversation
     facts()       the facts saved from answers, [{ fact, on }]
   App.nextDates() the dates ahead the engine holds, earliest first, for
                   Home's third figure. */

(function () {
  'use strict';

  const App = window.App;
  const data = App.data;
  const _ = App._;
  const URL_ASK = 'http://127.0.0.1:8767/ask';
  const KEY_CONV = 'duly-ask-conversation';
  const KEY_FACTS = 'duly-ask-facts';
  const KEY_GOALS = 'duly-ask-goals';

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

  /* ---------------- kept: the conversation, saved facts, goals ---------------- */
  function load(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key) || 'null'); return v == null ? fallback : v; } catch (e) { return fallback; }
  }
  function store(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage may be blocked */ }
  }

  /* CONV: { seq, turns }. A turn: { id, q, state, parts, answer, actions,
     done, copied, error, loopIds, ctl }. Only answered and failed turns are
     kept; a question still thinking at reload comes back as interrupted, with
     Ask again. Flows started from an answer live in App.loops and are not
     kept here. */
  let CONV = null;
  function conv() {
    if (CONV) return CONV;
    const raw = load(KEY_CONV, null);
    CONV = { seq: 0, turns: [] };
    if (raw && Array.isArray(raw.turns)) {
      CONV.seq = raw.seq | 0;
      CONV.turns = raw.turns.filter((t) => t && t.id && t.q && t.state !== 'crisis').map((t) => Object.assign({}, t, {
        state: t.state === 'thinking' || t.state === 'offline' ? 'failed' : t.state,
        error: t.state === 'thinking' || t.state === 'offline' ? 'interrupted' : t.error,
        loopIds: [], ctl: null,
      }));
    }
    return CONV;
  }
  function save() {
    const c = conv();
    store(KEY_CONV, {
      seq: c.seq,
      turns: c.turns.filter((t) => t.state !== 'crisis').slice(-30).map((t) => ({
        id: t.id, q: t.q, state: t.state, parts: t.parts || null, answer: t.answer || '',
        actions: t.actions || [], done: t.done || {}, copied: !!t.copied, error: t.error || '',
      })),
    });
  }
  function summary() {
    const ts = conv().turns.filter((t) => t.state !== 'crisis');
    return ts.length ? { count: ts.length, last: ts[ts.length - 1].q } : null;
  }
  const facts = () => load(KEY_FACTS, []).filter((f) => f && f.fact);
  /* Goal kinds as the helper names them, and as Plan names them (data.js
     GOALS: App.addGoal('company' | 'o1')). */
  const GOAL_KIND = { 'own-company': 'company', o1: 'o1' };
  function goals() {
    if (App.goals && typeof App.goals.list === 'function') {
      try { return App.goals.list().map((g) => (typeof g === 'string' ? g : g.kind)).map((k) => (k === 'company' ? 'own-company' : k)); } catch (e) { /* fall through */ }
    }
    const st = (App.state && Array.isArray(App.state.goals)) ? App.state.goals : [];
    return st.map((k) => (k === 'company' ? 'own-company' : k)).concat(load(KEY_GOALS, [])).filter((k, i, a) => a.indexOf(k) === i);
  }

  /* The box on Home shows the kept conversation's last question. */
  function refreshDock() {
    const dock = document.querySelector('[data-ask-dock]');
    if (!dock || typeof C.askDock !== 'function') return;
    const input = dock.querySelector('[data-askbar-q]');
    const typed = input ? input.value : '';
    const focused = input && document.activeElement === input;
    const wrap = document.createElement('div');
    wrap.innerHTML = C.askDock({ placeholder: input ? input.getAttribute('placeholder') : undefined });
    const next = wrap.firstElementChild;
    dock.replaceWith(next);
    const ni = next.querySelector('[data-askbar-q]');
    if (ni) { ni.value = typed; if (focused) ni.focus({ preventScroll: true }); }
  }

  /* ---------------- the panel ---------------- */
  let S = null; /* { layer, sheet, thread, input, live, returnTo } */

  function open(text) {
    if (!S) build();
    const q = String(text || '').trim();
    if (q) { send(q); return; }
    draw();
    const last = conv().turns[conv().turns.length - 1];
    if (last) scrollToTurn(last.id);
    S.input.focus({ preventScroll: true });
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
      layer: layer, sheet: sheet, returnTo: document.activeElement,
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
    /* An answer still coming lands in the kept conversation. */
    o.layer.remove();
    if (!document.querySelector('.sheet-layer')) document.documentElement.classList.remove('has-sheet');
    const bar = document.querySelector('[data-askbar-q]');
    if (returnFocus !== false && o.returnTo && document.contains(o.returnTo) && o.returnTo !== bar && o.returnTo.focus) o.returnTo.focus({ preventScroll: true });
    refreshDock();
    if (_.emit) _.emit('ask', 'close', null, null);
  }

  function clear() {
    conv().turns.forEach((t) => { if (t.ctl) t.ctl.abort(); });
    CONV = { seq: conv().seq, turns: [] };
    save();
    refreshDock();
    if (S) { draw(); say('New conversation'); S.input.focus({ preventScroll: true }); }
    if (App.haptic) App.haptic('select');
  }

  function loopsOf(t) {
    if (!t.loopIds || !t.loopIds.length || !App.loops) return '';
    /* The flow chosen and any it opened. */
    const all = App.loops.list({ all: true });
    all.forEach((l) => { if (l.context && t.loopIds.indexOf(l.context.parent) >= 0 && t.loopIds.indexOf(l.id) === -1) t.loopIds.push(l.id); });
    const list = t.loopIds.map((id) => App.loops.get(id)).filter(Boolean);
    return list.length ? C.loops(list) : '';
  }
  function draw() {
    if (!S) return;
    S.thread.innerHTML = conv().turns.map((t) => C.askTurn(t, loopsOf(t))).join('');
  }
  function scrollToTurn(id) {
    if (!S) return;
    const el = S.thread.querySelector('[data-turn-id="' + id + '"]');
    const top = S.sheet.querySelector('.ask-top');
    if (el) S.sheet.scrollTop = Math.max(0, el.offsetTop - (top ? top.offsetHeight : 0) - 16);
  }
  function say(text) { if (S && S.live && S.live.textContent !== text) S.live.textContent = text; }
  const turnById = (id) => conv().turns.filter((x) => x.id === id)[0] || null;

  function send(q, again) {
    if (!S) build();
    const c = conv();
    let t = again;
    if (!t) {
      c.seq += 1;
      t = { id: 'q' + c.seq, q: q, state: 'thinking', actions: [], loopIds: [], done: {} };
      c.turns.push(t);
    } else {
      Object.assign(t, { state: 'thinking', answer: '', parts: null, actions: [], done: {}, copied: false, error: '' });
    }
    const found = find(q);
    if (found.crisis && App.loops) {
      /* A fixed screen, shown alone, no dates, no verdict, never kept. */
      const lp = App.loops.start('crisis', found.notice ? { notice: true } : {});
      t.state = 'crisis';
      if (lp) { App.state['loopOpen:' + lp.id] = true; t.loopIds = [lp.id]; }
      draw(); scrollToTurn(t.id);
      say('Help now');
      return;
    }
    draw(); scrollToTurn(t.id);
    save();
    say('Thinking');
    /* The whole conversation goes with the question. */
    const history = c.turns.filter((x) => x !== t && x.state === 'answer' && x.answer).map((x) => ({ q: x.q, a: x.answer }));
    const ctl = typeof AbortController === 'function' ? new AbortController() : null;
    t.ctl = ctl;
    fetch(URL_ASK, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q, history: history, saved: facts().map((f) => f.fact), goals: goals() }),
      signal: ctl ? ctl.signal : undefined,
    }).then((r) => r.json().then((body) => ({ ok: r.ok, body: body }))).then((res) => {
      if (conv().turns.indexOf(t) < 0) return;
      t.ctl = null;
      const b = res.body || {};
      if (res.ok && typeof b.answer === 'string') {
        t.state = 'answer';
        t.answer = b.answer;
        t.parts = { lead: b.lead || '', applies: b.applies || [], plan: b.plan || {}, watch: b.watch || [], dso: b.dso || null, sources: b.sources || [] };
        t.actions = (b.actions || []).map((a) => (a && !a.type && a.kind ? Object.assign({ type: 'loop' }, a) : a))
          .filter((a) => a && ((a.type === 'loop' && KINDS.indexOf(a.kind) >= 0) || (a.type === 'save' && a.fact) || (a.type === 'goal' && GOAL_KIND[a.goal])))
          .filter((a) => !(a.type === 'save' && facts().some((f) => f.fact === a.fact)))
          .filter((a) => !(a.type === 'goal' && goals().indexOf(a.goal) >= 0))
          .slice(0, 3);
        say(t.answer);
      } else {
        t.state = 'failed';
        t.error = b.error || '';
        say('No answer this time.');
      }
      save();
      draw();
      /* The new answer comes into view, its question at the top. */
      scrollToTurn(t.id);
      refreshDock();
    }).catch((err) => {
      if (conv().turns.indexOf(t) < 0 || (err && err.name === 'AbortError')) return;
      t.ctl = null;
      t.state = 'offline';
      t.actions = found.situations.map((s) => ({ type: 'loop', kind: s.kind, label: s.label }));
      say('Ask is not running on this computer yet.');
      save();
      draw();
    });
  }

  /* ---------------- the actions, each a full loop ---------------- */
  /* The receipt replaces the button: the check draws itself, a light tap,
     one line with the follow-up. */
  function receipt(t, i, r) {
    t.done = t.done || {};
    t.done[i] = r;
    save();
    draw();
    const el = S && S.thread.querySelector('[data-turn-id="' + t.id + '"] [data-receipt="' + i + '"]');
    if (el && App.play) App.play(el, 'is-drawing');
    if (App.haptic) App.haptic('complete');
    say(r.text);
  }

  function saveFact(t, i, a) {
    const list = facts();
    if (!list.some((f) => f.fact === a.fact)) list.push({ fact: a.fact, on: data.today.iso, from: t.q.slice(0, 200) });
    store(KEY_FACTS, list);
    if (_.emit) _.emit('ask', 'fact', a.fact, null);
    /* A fact about work has a page that shows jobs. */
    const work = /\b(job|work|hours|company|startup|start-up|employer|business|freelanc)/i.test(a.fact) && document.querySelector('a[href="#/work"]');
    receipt(t, i, work ? { text: 'Saved to your record.', link: 'Add it in Work', href: '#/work' } : { text: 'Saved to your record. Answers use it from now on.' });
  }

  function addGoal(t, i, a) {
    const kind = GOAL_KIND[a.goal];
    let ok = false;
    if (typeof App.addGoal === 'function') {
      try { App.addGoal(kind, { quiet: true }); ok = true; } catch (e) { ok = false; }
    }
    if (!ok) {
      App.state.goals = Array.isArray(App.state.goals) ? App.state.goals : [];
      if (App.state.goals.indexOf(kind) < 0) App.state.goals.push(kind);
      if (_.emit) _.emit('goal', kind, true, null);
    }
    store(KEY_GOALS, load(KEY_GOALS, []).concat([a.goal]).filter((k, n, arr) => arr.indexOf(k) === n));
    const title = (((data.goals || {}).kinds || {})[kind] || {}).title || a.label;
    receipt(t, i, { text: 'Added to your plan: ' + title + '.', link: 'Open Plan', href: '#/plan' });
  }

  /* A flow starts in place, under that answer. A document named in the
     words fills the lost document flow's first answer. */
  const LOST = { passport: 'passport', ead: 'ead', 'work permit': 'ead', card: 'ead', i20: 'i20', visa: 'visa', i94: 'i94', i797: 'i797' };
  function startFlow(kind, t) {
    if (!S || !App.loops) return;
    const lp = App.loops.start(kind, {});
    if (!lp) return;
    if (kind === 'lost-paper' && lp.step === 'which' && !(lp.values || {}).paper) {
      const k = Object.keys(LOST).filter((w) => has(norm(t.q), w))[0];
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

  function act(turnId, i) {
    const t = turnById(turnId);
    const a = t && (t.actions || [])[i];
    if (!a || (t.done || {})[i]) return;
    if (a.type === 'save') saveFact(t, i, a);
    else if (a.type === 'goal') addGoal(t, i, a);
    else startFlow(a.kind, t);
  }

  function copyDraft(turnId) {
    const t = turnById(turnId);
    const d = t && t.parts && t.parts.dso && t.parts.dso.draft;
    if (!d) return;
    const done = () => {
      t.copied = true; save(); draw();
      const el = S && S.thread.querySelector('[data-turn-id="' + t.id + '"] .ask-copy');
      if (el && App.play) App.play(el, 'is-drawing');
      if (App.haptic) App.haptic('tick');
      say('Copied');
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(d).then(done, done);
      else done();
    } catch (e) { done(); }
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
    App.ask = { open: () => {}, close: () => {}, find: find, isOpen: () => false, summary: () => null, clear: () => {}, facts: () => [] };
    return;
  }

  document.addEventListener('click', (e) => {
    const t = e.target.closest && e.target.closest('[data-ask-open],[data-ask-close],[data-ask-new],[data-ask-act],[data-ask-draft],[data-ask-retry]');
    if (!t) return;
    if (t.hasAttribute('data-ask-open')) { e.preventDefault(); open(t.getAttribute('data-ask-open') || ''); return; }
    if (t.hasAttribute('data-ask-new')) { e.preventDefault(); clear(); return; }
    if (!S || !S.layer.contains(t)) return;
    e.preventDefault();
    if (t.hasAttribute('data-ask-close')) { close(true); return; }
    if (t.hasAttribute('data-ask-act')) { act(t.dataset.turn, Number(t.dataset.askAct)); return; }
    if (t.hasAttribute('data-ask-draft')) { copyDraft(t.dataset.askDraft); return; }
    if (t.hasAttribute('data-ask-retry')) {
      const turn = turnById(t.dataset.askRetry);
      if (turn) send(turn.q, turn);
    }
  });
  /* Leaving through a link in the panel (a source page in the app, Plan,
     Work) closes it; outside links open in a new tab. */
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

  /* Cmd K or Ctrl K: the cursor goes to the box on Home (or to the
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
    const ts = conv().turns;
    const before = ts.map((t) => (t.loopIds || []).join()).join('|');
    ts.forEach((t) => loopsOf(t));
    if (ts.map((t) => (t.loopIds || []).join()).join('|') !== before) setTimeout(() => { if (S) draw(); }, 0);
  });

  /* Another tab's conversation (the same student) shows here too. */
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY_CONV) return;
    CONV = null;
    if (S) draw();
    refreshDock();
  });

  App.ask = { open: open, close: () => close(true), find: find, isOpen: () => !!S, summary: summary, clear: clear, facts: facts };
  Object.assign(App._, { askNorm: norm });
})();
