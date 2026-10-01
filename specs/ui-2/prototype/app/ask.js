/* app/ask.js: Ask in v1 (BLUEPRINT 3.3; D76, D77). No AI model.

   The words a student types are matched on the device, in the order of
   BLUEPRINT 3.3: crisis phrasing first (App.loops.match), then a paper, a
   date the engine holds (what is next, led by the earliest date and what
   it is), a page, a Situation. When nothing matches: Try other words and
   the Situations first, then the DSO question drafted from the record
   with the student's own words, folded behind "Write the question to your
   DSO" (BOUNDARY, "Before the tests: match a guide" and "The step back").

   What is typed is never stored and never synced (BLUEPRINT 3.4): it lives
   in the field and, if the student drafts the DSO email, in that draft.
   Closing Ask empties both. Choosing a Situation starts its loop in place
   (App.loops.start); the loop writes its own steps to Your record.
   What if (the old Try a change, App.openChange) never saves.

   Public, App.ask:
     open(text?)     opens the sheet; text is put in the field
     close()         closes it, empties the field and the draft
     find(text)      the matcher, pure: { q, empty, crisis, notice,
                     situations: [{ kind, label, openLine? }],
                     papers: [{ id, title, meta, href }], next: bool,
                     pages: [{ route, label, href }], none: bool }
     isOpen()
   Cmd K (Ctrl K) opens it from anywhere. The shell gets a quiet entry at
   the top of the sidebar and an Ask button in the phone's top bar, put in
   place here so the shell's own file stays the navigation's. */

(function () {
  'use strict';

  const App = window.App;
  const data = App.data;
  const _ = App._;

  /* ---------------- words ---------------- */
  /* Lower case, curly quotes made straight, the hyphen in a form name taken
     out (I-20 is i20, E-Verify is everify), "i 20" joined, anything else
     that is not a letter or digit made a space. */
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
  /* A key is found when it stands as whole words in the text. */
  const has = (q, key) => { const k = norm(key); return !!k && (' ' + q + ' ').indexOf(' ' + k + ' ') >= 0; };

  /* ---------------- Situations ---------------- */
  /* Each guide's phrases: its Ask phrases and its own Situation label. */
  function guides() {
    if (!App.loops) return [];
    return App.loops.defs().filter((d) => d.situation && !d.child && !d.fixed).map((d) => {
      const phrases = [d.situation];
      (d.triggers || []).forEach((t) => { if (t.from === 'ask' && t.phrases) t.phrases.forEach((p) => phrases.push(p)); });
      return { kind: d.kind, label: d.situation, phrases: phrases };
    });
  }
  /* The open loop for a kind, if any, so a Situation already under way says
     where it stands instead of starting a second one. */
  function openLine(kind) {
    if (!App.loops) return null;
    const lp = App.loops.list().filter((l) => l.kind === kind)[0];
    if (!lp) return null;
    const s = App.loops.seen(lp);
    return s && s.line ? s.line : null;
  }
  function allSituations() {
    const list = App.loops ? App.loops.situations() : [];
    return list.map((s) => ({ kind: s.kind, label: s.label, openLine: openLine(s.kind) }));
  }
  /* Scores: a guide phrase found whole (App.loops.match) is strongest; then
     every content word of a phrase found in any order; then the same with
     the last word still being typed ("lost my pass" finds "lost my
     passport"). Top three. */
  function matchSituations(text, q, m) {
    const best = {};
    const put = (kind, label, score) => { if (!best[kind] || best[kind].score < score) best[kind] = { kind: kind, label: label, score: score }; };
    ((m && m.matches) || []).forEach((x, i) => { if (x.kind !== 'crisis') put(x.kind, x.label, 300 - i); });
    const words = q.split(' ').filter(Boolean);
    const set = words.map(stem);
    const last = words.length ? words[words.length - 1] : '';
    const typing = last.length >= 3 && STOP.indexOf(last) === -1;
    guides().forEach((g) => {
      g.phrases.forEach((p) => {
        const cw = content(p);
        if (!cw.length) return;
        const whole = cw.every((w) => set.indexOf(stem(w)) >= 0);
        if (whole) { put(g.kind, g.label, 200 + cw.join(' ').length); return; }
        const partial = typing && cw.every((w) => set.indexOf(stem(w)) >= 0 || w.indexOf(last) === 0) && cw.some((w) => w.indexOf(last) === 0);
        if (partial) put(g.kind, g.label, 100 + cw.join(' ').length);
      });
    });
    return Object.keys(best).map((k) => best[k]).sort((a, b) => b.score - a.score).slice(0, 3)
      .map((s) => ({ kind: s.kind, label: s.label, openLine: openLine(s.kind) }));
  }

  /* ---------------- papers ---------------- */
  /* Words a student uses for a paper, beyond the words of its title. */
  const PAPER_WORDS = {
    'ead-card': ['ead', 'work permit', 'card', 'work card'],
    i797: ['i797', 'approval notice', 'approval'],
    passport: ['passport'],
    'f1-visa': ['visa', 'f1 visa', 'visa stamp'],
    i94: ['i94', 'entry record', 'arrival record'],
    degree: ['degree', 'diploma'],
    transcripts: ['transcript', 'transcripts', 'grades'],
  };
  const GENERIC = ['card', 'certificate', 'notice', 'letter', 'systems', 'labs', 'robotics', 'school', 'starting', 'initial'];
  function paperIndex() {
    const docs = data.documents || {};
    const out = [];
    (docs.i20Groups || []).forEach((g) => (g.items || []).forEach((it) => {
      const q = [g.key, g.title, it.title].map(norm).filter(Boolean);
      out.push({ id: it.id, title: it.name || it.title, meta: it.meta, current: !!it.current, need: 'i20', keys: q.concat(norm(it.title).split(' ').filter((w) => w.length > 2 && w !== 'i20' && GENERIC.indexOf(w) === -1)).filter((k) => k !== 'i20') });
    }));
    ['work', 'identity', 'school'].forEach((k) => (docs[k] || []).forEach((it) => {
      const own = norm(it.title).split(' ').filter((w) => w.length > 2 && GENERIC.indexOf(w) === -1 && STOP.indexOf(w) === -1);
      out.push({ id: it.id, title: it.title, meta: it.meta, current: false, need: null, keys: own.concat(PAPER_WORDS[it.id] || []) });
    }));
    return out;
  }
  function matchPapers(q) {
    return paperIndex().map((p) => {
      if (p.need && !has(q, p.need)) return null;
      const hits = p.keys.filter((k, i, a) => a.indexOf(k) === i && has(q, k)).length;
      const score = (p.need ? 1 : 0) + hits;
      return score ? { p: p, score: score } : null;
    }).filter(Boolean).filter((x, i, a) => {
      /* When some paper matches more than its kind ("i20 for cpt"), the
         ones that match only the kind drop out. */
      const top = Math.max.apply(null, a.map((y) => y.score));
      return !(x.p.need && x.score === 1 && top > 1);
    }).sort((a, b) => (b.score - a.score) || (b.p.current - a.p.current)).slice(0, 3)
      .map((x) => ({ id: x.p.id, title: x.p.title, meta: x.p.meta, href: '#/documents/' + encodeURIComponent(x.p.id) }));
  }

  /* ---------------- a date the engine holds ---------------- */
  /* "When is my deadline?" and "What do I do now?" each have a guide
     (BOUNDARY, D76): what is next, from App.loops.whatsNext. */
  const NEXT_WORDS = ['deadline', 'deadlines', 'due', 'when', 'whats next', 'what is next', 'next date', 'next dates', 'next step', 'next steps', 'what do i do', 'what now', 'what should i do', 'what to do', 'to do', 'dates'];
  const matchNext = (q) => NEXT_WORDS.some((k) => has(q, k));

  /* The answer to "when is my deadline" is a date, so it leads: the
     earliest date the engine holds from today on, what it is and how far
     away, then the next three. Sources, merged and sorted by day:
       App.calendarEvents(): the STEM plan dates, the document watch and the
         reports owed (one title per day; the first source keeps the day);
       each open loop's dated obligation (def.obligation.fact, bound),
         while seen(lp).next says it is still owed.
     Open loops that need an answer now (seen kind 'needs') are named
     beside it, with no date of their own.
     Priya, today 2026-09-30 (checked with python3):
       start preparing 2027-02-13 - 90 = 2026-11-15, less 1 month
         = 2026-10-15; 2026-10-15 - 2026-09-30 = 15 days  (the lead)
       window opens    2026-11-15, 46 days
       EAD card ends, last day to file for STEM OPT 2027-02-13, 136 days
       F-1 visa (sample) 2028-08-01, 671 days
     The check-in (Northwind confirmed 2026-08-28, 33 days ago, past the
     30 day setting) needs an answer today. */
  function nextDates() {
    const D = App.dates;
    const t = App.loops && App.loops.now ? App.loops.now() : data.today.iso;
    const rows = [];
    const add = (iso, title) => {
      if (!D.okIso(iso) || iso < t || !title) return;
      if (rows.some((r) => r.iso === iso)) return;
      rows.push({ iso: iso, title: title });
    };
    (App.calendarEvents ? App.calendarEvents() : []).forEach((e) => add(e.iso, e.title));
    const now = [];
    (App.loops ? App.loops.list() : []).forEach((lp) => {
      const d = App.loops.def(lp.kind) || {};
      if (d.private) return;
      const sn = App.loops.seen(lp) || {};
      const v = App.loops.view(lp) || {};
      if (d.obligation && sn.next) {
        const b = App.loops.bind(lp);
        const title = String(d.obligation.title || '').replace(/\{(\w+)\}/g, (m, k) => (b.text && b.text[k] != null ? b.text[k] : ''));
        add(b.iso[d.obligation.fact], title ? title + ', last day' : '');
      }
      if (sn.kind === 'needs' && v.title) now.push(v.title);
    });
    rows.sort((a, b) => (a.iso < b.iso ? -1 : (a.iso > b.iso ? 1 : 0)));
    const dates = rows.slice(0, 4).map((r) => {
      const n = D.daysBetween(t, r.iso);
      return { iso: r.iso, date: D.fmt(r.iso), away: n === 0 ? 'today' : (n === 1 ? 'tomorrow' : 'in ' + n + ' days'), title: r.title };
    });
    return { dates: dates, now: now };
  }
  /* The lead, put at the top of What's next. */
  function nextLead() {
    const n = nextDates();
    const e = C.escText;
    const first = n.dates[0];
    let out = '<div class="ask-next-lead">';
    if (first) {
      out += '<p class="t-medium">' + e(first.date + ', ' + first.away) + '</p>' +
        '<p class="t-lead">' + e(first.title.replace(/\.?$/, '.')) + '</p>';
    } else {
      out += '<p class="t-lead">' + e('No date is ahead on your record.') + '</p>';
    }
    if (n.now.length) {
      const names = n.now.length === 1 ? n.now[0] : n.now.slice(0, -1).join(', ') + ' and ' + n.now[n.now.length - 1];
      out += '<p class="t-small">' + e(names + (n.now.length === 1 ? ' needs' : ' need') + ' your answer today.') + '</p>';
    }
    if (n.dates.length > 1) {
      out += '<dl class="ask-dates">' + n.dates.slice(1).map((r) =>
        '<div><dt>' + e(r.date) + '</dt><dd>' + e(r.title) + '<span class="t-meta">, ' + e(r.away) + '</span></dd></div>').join('') + '</dl>';
    }
    return out + '</div>';
  }

  /* ---------------- pages ---------------- */
  /* The first route that exists is used, so a page renamed in the shell
     (Today, Plan, Papers, Record) is still found. */
  const PAGES = [
    { routes: ['home', 'today'], keys: ['today', 'home screen', 'home page'] },
    { routes: ['plan', 'steps'], keys: ['plan', 'next steps', 'steps', 'workbook', 'work book', 'my hours'] },
    { routes: ['uscis', 'status'], keys: ['uscis', 'case status', 'receipt', 'receipt number', 'my case', 'status'] },
    { routes: ['papers', 'documents'], keys: ['papers', 'documents', 'document', 'docs', 'carry these'] },
    { routes: ['record', 'case'], keys: ['record', 'my record', 'profile', 'my profile', 'history'] },
    { routes: ['updates', 'news'], keys: ['news', 'updates', 'rule change', 'rule changes', 'rules changed', 'what changed'] },
    { routes: ['timeline'], keys: ['timeline'] },
    { routes: ['settings'], keys: ['settings', 'reminders', 'notifications', 'theme', 'dark mode', 'devices', 'backup', 'delete my data'] },
    { routes: ['feedback'], keys: ['feedback'] },
    { routes: ['employer'], keys: ['employer check', 'everify'] },
  ];
  function resolve(routes) {
    const S = window.SCREENS || {};
    const A = App.ALIASES || {};
    for (let i = 0; i < routes.length; i += 1) {
      const r = routes[i];
      if (S[r] && !S[r].bare) return { route: r, screen: S[r] };
      if (A[r] && S[A[r]]) return { route: r, screen: S[A[r]] };
    }
    return null;
  }
  function matchPages(q) {
    const out = [];
    PAGES.forEach((p) => {
      if (!p.keys.some((k) => has(q, k))) return;
      const r = resolve(p.routes);
      if (r && !out.some((x) => x.label === r.screen.title)) out.push({ route: r.route, label: r.screen.title, href: '#/' + r.route });
    });
    return out.slice(0, 2);
  }

  /* ---------------- the matcher ---------------- */
  function find(text) {
    const q = norm(text);
    if (!q) return { q: q, empty: true, situations: allSituations() };
    const m = App.loops ? App.loops.match(text) : { matches: [] };
    if (m.crisis) return { q: q, crisis: true, notice: !!m.notice };
    const situations = matchSituations(text, q, m);
    const papers = matchPapers(q);
    const next = matchNext(q);
    const pages = matchPages(q);
    const none = !situations.length && !papers.length && !next && !pages.length;
    return { q: q, empty: false, crisis: false, situations: situations, papers: papers, next: next, pages: pages, none: none };
  }

  /* ---------------- the DSO question, drafted ---------------- */
  /* From the record: who the email goes to and who signs it. The question
     is the student's own words, unchanged except a capital and a stop. */
  function draftFor(text) {
    const st = data.student || {};
    let t = String(text || '').trim().replace(/\s+/g, ' ');
    if (t) t = t.charAt(0).toUpperCase() + t.slice(1);
    if (t && !/[.?!]$/.test(t)) t += '?';
    return {
      to: 'Your DSO at ' + (st.school || 'your school'),
      subject: 'A question, ' + (st.name || ''),
      paragraphs: ['Hi,', t || 'I have a question.', 'Could you help me with this?'],
      signoff: ['Thank you,', st.name, st.sevisId ? 'SEVIS ID ' + st.sevisId : ''],
      foot: 'Written from your record and your words. Change anything before you send it.',
    };
  }

  /* ---------------- the sheet ---------------- */
  let S = null; /* { layer, sheet, input, results, live, returnTo, mode, loopIds, found, text } */

  function clearDraft() {
    ['draft:ask', 'draftHtml:ask', 'draftLeft:ask'].forEach((k) => { delete App.state[k]; });
  }

  function open(text) {
    if (S) { setText(text == null ? S.input.value : text); S.input.focus(); return; }
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
      input: sheet.querySelector('[data-ask-q]'), results: sheet.querySelector('[data-ask-results]'), live: sheet.querySelector('[data-ask-live]'),
      mode: 'results', loopIds: [], found: null, text: '',
    };
    clearDraft();
    sheet.addEventListener('keydown', trap);
    document.documentElement.classList.add('has-sheet');
    setText(text || '');
    S.input.focus({ preventScroll: true });
    const n = S.input.value.length;
    try { S.input.setSelectionRange(n, n); } catch (e) { /* search inputs in some browsers */ }
    if (_.emit) _.emit('ask', 'open', null, null);
  }

  function close(returnFocus) {
    if (!S) return;
    const o = S;
    S = null;
    o.input.value = '';
    clearDraft();
    o.layer.remove();
    if (!document.querySelector('.sheet-layer')) document.documentElement.classList.remove('has-sheet');
    if (returnFocus !== false && o.returnTo && document.contains(o.returnTo) && o.returnTo.focus) o.returnTo.focus({ preventScroll: true });
    if (_.emit) _.emit('ask', 'close', null, null);
  }

  function setText(text) {
    S.input.value = text;
    S.mode = 'results';
    S.loopIds = [];
    draw();
  }

  function draw() {
    if (!S) return;
    const text = S.input.value;
    const found = find(text);
    S.found = found;
    S.text = text;
    let view = { mode: S.mode };
    if (found.crisis) {
      const lp = App.loops.start('crisis', found.notice ? { notice: true } : {});
      if (lp) { App.state['loopOpen:' + lp.id] = true; S.loopIds = [lp.id]; }
      view = { mode: 'crisis', loops: loopsShown() };
    } else if (S.mode === 'loop') {
      view = { mode: 'loop', loops: loopsShown() };
    } else if (S.mode === 'stepback') {
      /* Asked for in words ("Write the question to your DSO instead"): the
         draft opens. */
      view.draft = draftFor(text);
      if (!App.state['draft:ask'] || App.state['draft:ask'] === 'closed') App.state['draft:ask'] = 'open';
    } else if (found.none) {
      S.results.innerHTML = noneView(text);
      announce(found, view);
      return;
    } else if (found.next) {
      view.nextList = App.loops.whatsNext({ max: 3 });
    }
    let html = C.askResults(found, view);
    if (view.nextList) {
      const head = '<h3 class="t-eyebrow">' + C.esc((C._.askWords || {}).next || "What's next") + '</h3>';
      const i = html.indexOf(head);
      if (i >= 0) html = html.slice(0, i + head.length) + nextLead() + html.slice(i + head.length);
    }
    S.results.innerHTML = html;
    announce(found, view);
  }

  /* No guide matches: other words and the Situations come first; the DSO
     question is drafted but folded behind one button (closed until the
     student opens it), with the attorney link after it. */
  function noneView(text) {
    const W = C._.askWords || {};
    const e = C.escText;
    const c = ((data.loops || {}).contacts || {}).attorney || {};
    const rows = allSituations().map((s) =>
      '<button type="button" class="ask-row" data-ask-start="' + C.esc(s.kind) + '"><span class="ask-row-text"><span class="t-row">' + e(s.label) + '</span>' +
      (s.openLine ? '<span class="t-meta">' + e(s.openLine) + '</span>' : '') + '</span>' + C.icon('chevron', { cls: 'chev' }) + '</button>').join('');
    return '<section class="ask-sec">' +
      '<p class="t-small">' + e(W.noGuide || 'No guide in Duly matches these words.') + '</p>' +
      '<div class="btn-group"><button type="button" class="btn btn-pill" data-ask-retry>Try other words</button></div>' +
      '</section>' +
      '<section class="ask-sec"><h3 class="t-eyebrow">' + C.esc(W.situations || 'Situations') + '</h3>' +
      '<p class="t-meta ask-line">' + e(W.situationsLine || '') + '</p>' +
      '<div class="ask-list">' + rows + '</div></section>' +
      '<section class="ask-sec ask-stepback">' +
      '<p class="t-meta ask-line">' + e('Not in the list? Your DSO can answer a question about your own record. The email is drafted from your record and your words; you send it yourself.') + '</p>' +
      C.emailDraft(Object.assign({ key: 'ask', openLabel: W.draftOpen || 'Write the question to your DSO' }, draftFor(text))) +
      (c.href ? '<div class="btn-group"><a class="link" href="' + C.esc(c.href) + '" target="_blank" rel="noopener">' + e(W.attorney || 'Find an immigration attorney') + '</a></div>' : '') +
      '</section>';
  }

  /* The loops on show: the one chosen and any it opened (a crisis screen's
     "Save the notice" starts a notice loop with this one as its parent). */
  function loopsShown() {
    if (!S) return [];
    const all = App.loops.list({ all: true });
    const ids = S.loopIds.slice();
    all.forEach((l) => { if (l.context && ids.indexOf(l.context.parent) >= 0 && ids.indexOf(l.id) === -1) ids.push(l.id); });
    S.loopIds = ids;
    return ids.map((id) => App.loops.get(id)).filter(Boolean);
  }

  function announce(found, view) {
    if (!S || !S.live) return;
    const W = C._.askWords || {};
    let t = '';
    if (found.empty) t = '';
    else if (found.crisis) t = 'Help now';
    else if (view.mode === 'loop') t = '';
    else if (found.none) t = W.noGuide + ' Try other words or choose a situation.';
    else {
      const parts = [];
      const n = (k, one, many) => { if (k) parts.push(k + ' ' + (k === 1 ? one : many)); };
      if (found.next) {
        const first = nextDates().dates[0];
        parts.push(first ? 'next date ' + first.date + ', ' + first.away + ', ' + first.title : "what's next");
      }
      n((found.papers || []).length, 'paper', 'papers');
      n((found.pages || []).length, 'page', 'pages');
      n((found.situations || []).length, 'situation', 'situations');
      t = parts.join(', ');
    }
    if (S.live.textContent !== t) S.live.textContent = t;
  }

  /* Choosing a Situation starts its loop in place. A paper named in the
     words fills the lost paper guide's first answer; nothing is saved
     until the student takes an exit. */
  const LOST = { passport: 'passport', ead: 'ead', 'work permit': 'ead', card: 'ead', i20: 'i20', visa: 'visa', i94: 'i94', i797: 'i797' };
  function startSituation(kind) {
    if (!S || !App.loops) return;
    const lp = App.loops.start(kind, {});
    if (!lp) return;
    if (kind === 'lost-paper' && lp.step === 'which' && !(lp.values || {}).paper) {
      const k = Object.keys(LOST).filter((w) => has(S.found ? S.found.q : '', w))[0];
      if (k) App.loops.answer(lp.id, 'paper', LOST[k]);
    }
    App.state['loopOpen:' + lp.id] = true;
    App.loops.markSeen(lp.id);
    S.mode = 'loop';
    S.loopIds = [lp.id];
    /* Today and the other pages count open loops: redraw the column in place. */
    if (typeof _.render === 'function') _.render('inplace');
    draw();
    if (App.haptic) App.haptic('select');
    const box = S.results.querySelector('[data-loop="' + lp.id + '"]');
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
    if (e.key === 'ArrowDown' && e.target === S.input) {
      const first = S.results.querySelector('a[href], button:not([disabled]), input');
      if (first) { e.preventDefault(); first.focus(); }
      return;
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
    const t = e.target.closest && e.target.closest('[data-ask-open],[data-ask-close],[data-ask-start],[data-ask-back],[data-ask-stepback],[data-ask-clear],[data-ask-retry],[data-ask-whatif],[data-ask-go]');
    if (!t) return;
    if (t.hasAttribute('data-ask-open')) { e.preventDefault(); open(t.getAttribute('data-ask-open') || ''); return; }
    if (!S || !S.sheet.parentNode || !S.layer.contains(t)) return;
    if (t.hasAttribute('data-ask-close')) { e.preventDefault(); close(true); return; }
    e.preventDefault();
    if (t.hasAttribute('data-ask-go')) { const href = t.getAttribute('href'); close(false); App.go(href); return; }
    if (t.hasAttribute('data-ask-start')) { startSituation(t.dataset.askStart); return; }
    if (t.hasAttribute('data-ask-back')) {
      S.mode = 'results'; S.loopIds = []; draw(); S.input.focus(); return;
    }
    if (t.hasAttribute('data-ask-stepback')) {
      S.mode = 'stepback'; draw();
      const body = S.results.querySelector('.email-body');
      if (body) body.focus({ preventScroll: false });
      return;
    }
    if (t.hasAttribute('data-ask-clear')) { clearDraft(); setText(''); S.input.focus(); return; }
    /* Try other words: back to the field with the words selected. */
    if (t.hasAttribute('data-ask-retry')) { S.input.focus(); S.input.select(); return; }
    if (t.hasAttribute('data-ask-whatif')) {
      close(false);
      if (typeof App.openChange === 'function') App.openChange();
    }
  });
  /* Leaving through any other link in the sheet (a loop's source page)
     closes it, so the page underneath is what the student sees. */
  document.addEventListener('click', (e) => {
    if (!S) return;
    const a = e.target.closest && e.target.closest('a[href^="#/"]');
    if (!a || !S.layer.contains(a) || a.hasAttribute('data-ask-go')) return;
    e.preventDefault();
    close(false);
    App.go(a.getAttribute('href'));
  });

  document.addEventListener('input', (e) => {
    if (!S || e.target !== S.input) return;
    S.mode = 'results';
    S.loopIds = [];
    draw();
  });
  document.addEventListener('submit', (e) => {
    if (!S || !e.target.matches || !e.target.matches('[data-ask-form]')) return;
    e.preventDefault();
    const first = S.results.querySelector('[data-ask-start], [data-ask-go], .loop-head, .email-body');
    if (first) first.focus();
  });

  /* Cmd K or Ctrl K opens Ask from anywhere; again, it goes back to the field. */
  document.addEventListener('keydown', (e) => {
    if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
    if (e.key !== 'k' && e.key !== 'K') return;
    if (App.state && App.state.deleted) return;
    if (document.querySelector('main#main.bare')) return;
    e.preventDefault();
    if (S) { S.input.focus(); S.input.select(); return; }
    open('');
  });

  /* A loop that moved while Ask shows it: a new child loop joins the list.
     The loop's own redraw (app/loops.js) handles the rest. */
  document.addEventListener('duly:change', (e) => {
    if (!S || !e.detail || e.detail.kind !== 'loop') return;
    if (S.mode !== 'loop' && !(S.found && S.found.crisis)) return;
    const before = S.loopIds.join();
    loopsShown();
    if (S.loopIds.join() !== before) setTimeout(() => { if (S) draw(); }, 0);
  });

  /* ---------------- the shell's entries ---------------- */
  /* Put once into the sidebar (under the wordmark) and the phone's top bar
     (before Menu), unless the shell already draws an entry of its own. */
  function decorate() {
    const sb = document.querySelector('.sidebar');
    if (sb && !sb.querySelector('[data-ask-open]')) {
      const mark = sb.querySelector('.wordmark');
      if (mark) mark.insertAdjacentHTML('afterend', C.askEntry({ where: 'sidebar' }));
      else sb.insertAdjacentHTML('afterbegin', C.askEntry({ where: 'sidebar' }));
    }
    const top = document.querySelector('.topbar');
    if (top && !top.querySelector('[data-ask-open]')) {
      const menu = top.querySelector('[data-menu]');
      if (menu) menu.insertAdjacentHTML('beforebegin', C.askEntry({ where: 'top' }));
      else { const r = top.querySelector('.topbar-right') || top; r.insertAdjacentHTML('beforeend', C.askEntry({ where: 'top' })); }
    }
  }
  const root = document.getElementById('app');
  if (root && window.MutationObserver) new MutationObserver(decorate).observe(root, { childList: true });
  window.addEventListener('DOMContentLoaded', () => setTimeout(decorate, 0));

  /* The lead and its dates, from the system tokens. */
  if (!document.getElementById('ask-next-style')) {
    const el = document.createElement('style');
    el.id = 'ask-next-style';
    el.textContent = [
      '.ask-next-lead { display: flex; flex-direction: column; gap: var(--s-4); margin: 0 0 var(--s-12); }',
      '.ask-next-lead > p { margin: 0; }',
      '.ask-dates { display: flex; flex-direction: column; margin: var(--s-8) 0 0; }',
      '.ask-dates > div { display: grid; grid-template-columns: minmax(0, 7.5em) minmax(0, 1fr); gap: var(--s-12); padding: var(--s-8) 0; border-top: 1px solid var(--hairline-inner); }',
      '.ask-dates dt { font-size: var(--t-small); line-height: var(--lh-small); font-weight: 500; color: var(--ink); }',
      '.ask-dates dd { margin: 0; font-size: var(--t-small); line-height: var(--lh-small); color: var(--ink-body); overflow-wrap: anywhere; }',
    ].join('\n');
    (document.head || document.documentElement).appendChild(el);
  }

  App.ask = { open: open, close: () => close(true), find: find, isOpen: () => !!S };
  Object.assign(App._, { askNorm: norm });
})();
