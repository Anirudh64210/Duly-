/* The plan for the current path (STEM OPT), drawn inside Plan (screens/plan.js).
   #/steps, #/next and #/checklists redirect to #/plan; #/steps/cpt, /opt and
   /h1b go to the Timeline.

   One page, one list (founder review, Oct 1):
     Plan, with one quiet line under it: the path and the answer (Change).
       Unanswered, the question sits there instead: Yes, No, Not sure.
     The stepper: Today and the key dates. Only the date that matters now
       keeps its source mark, so the stepper carries one mark, not three.
     One list, in date order, every row one line (a title and its date) that
       opens in place:
         loops that need her now (the check-in, a job change), first
         the federal steps and her school's steps, in order; an undated step
           takes the date of the next dated step after it
         the STEM OPT filing loop, in the place of "File Form I-765"
           (the same thing: it carries the filing to its receipt)
         reports owed, by their due date; with nothing open, the standing
           10-day rule, last
     "Add your school's steps", one quiet link under the list.
   Nothing else: no section titles, no progress bar, no "Rules checked"
   (it lives in Settings), no ⓘ beside titles. A step's explanation and its
   rule with the source mark are inside the row, once opened.

   Every date comes from app/record.js and data.js (App.stemTimeline,
   App.fileBy, App.reportsOwed, App.loops); nothing is worked out here.
   Priya on 2026-09-30 (python3):
     Window opens 2026-11-15 = 2027-02-13 - 90; the I-765 row reads
     "Nov 15 to Feb 13, 2027". rec-2026-12-01: last day 2026-12-01 + 60 =
     2027-01-30, earlier than 2027-02-13, so the row reads
     "Nov 15 to Jan 30, 2027".

   Review links (#/plan/...): school (steps found), school-added (confirmed),
   2026-12-01 (the stepper on that day), rec-2026-12-01 (a recommendation
   date, shown, never saved), reports-sample (reports on the sample STEM
   card). They combine. */
(function () {
  'use strict';

  const STYLE = '<style>' +
    '.screen-steps .pl-head { margin-bottom: var(--s-24); }' +
    '.screen-steps .pl-sub { margin: var(--s-4) 0 0; display: flex; flex-wrap: wrap; align-items: baseline; column-gap: var(--s-12); }' +
    '.screen-steps .pl-sub .btn { padding: 0; min-height: 0; }' +
    '.screen-steps .st-ask { margin: 0 0 var(--s-24); display: flex; flex-direction: column; align-items: flex-start; gap: var(--s-12); }' +
    '.screen-steps .st-ask p { margin: 0; }' +
    '.screen-steps .st-when { margin: 0 0 var(--s-24); }' +
    '.screen-steps .pl-no { margin: 0 0 var(--s-24); display: flex; align-items: center; gap: var(--s-8); }' +
    /* The list: one line per row, its date at the right. */
    '.screen-steps .pl-list .row { padding-top: var(--s-12); padding-bottom: var(--s-12); min-height: 48px; }' +
    '.screen-steps .pl-list .item.is-open > .row { padding-bottom: var(--s-8); }' +
    '.screen-steps .pl-list .row-text { flex-direction: row; flex-wrap: wrap; align-items: baseline; justify-content: space-between; column-gap: var(--s-16); }' +
    '.screen-steps .pl-list .row-title { flex: 1 1 220px; min-width: 0; }' +
    '.screen-steps .pl-list .row-meta { flex: none; color: var(--ink-2); font-variant-numeric: tabular-nums; }' +
    '.screen-steps .pl-list .task.is-done .row-meta { color: var(--ink-3); }' +
    '.screen-steps .pl-list .row-text > :not(.row-title):not(.row-meta) { flex-basis: 100%; }' +
    '.screen-steps .pl-list .row-lead { width: 18px; }' +
    '.screen-steps .pl-list .disc { padding: 0 var(--s-12) var(--s-12) 42px; gap: var(--s-8); }' +
    '.screen-steps .pl-list .disc p { margin: 0; }' +
    '.screen-steps .pl-list .st-rule { color: var(--ink-3); }' +
    '.screen-steps .pl-list .disc .inline-src { vertical-align: -3px; }' +
    '.screen-steps .pl-list .disc .btn-group { margin-top: var(--s-4); }' +
    '.screen-steps .pl-list .disc .link { align-self: flex-start; font-weight: 600; }' +
    /* The current step: a quiet tint that runs on under its detail. */
    '.screen-steps .task.is-current.is-open > .row { border-bottom-left-radius: 0; border-bottom-right-radius: 0; }' +
    '.screen-steps .task.is-current > .task-detail { background: var(--accent-tint); border-radius: 0 0 var(--r-field) var(--r-field); }' +
    /* A loop is a row of the list: its dot in the checkbox column. */
    '.screen-steps .pl-loop .loop { border: 0; }' +
    '.screen-steps .pl-loop .loop-head { padding: var(--s-12); gap: var(--s-16); border-radius: var(--r-field); }' +
    '.screen-steps .pl-loop .loop-head:hover { background: var(--row-hover); }' +
    '.screen-steps .pl-loop .loop-dot { margin: var(--s-8) 3px 0; }' +
    '.screen-steps .pl-loop .loop-head .chev { width: 14px; height: 14px; margin-top: 5px; color: var(--ink-4); }' +
    '.screen-steps .pl-loop .loop-head-text { flex-direction: row; flex-wrap: wrap; align-items: baseline; justify-content: space-between; column-gap: var(--s-16); }' +
    '.screen-steps .pl-loop .loop-title { flex: 1 1 220px; min-width: 0; font-weight: 500; }' +
    '.screen-steps .pl-loop .loop-seen { flex: none; }' +
    '.screen-steps .pl-loop .loop-body { padding: 0 var(--s-12) var(--s-16) 42px; gap: var(--s-12); }' +
    '.screen-steps .pl-loop .loop-exits { flex-direction: row; flex-wrap: wrap; align-items: center; column-gap: var(--s-16); }' +
    '.screen-steps .pl-loop .loop-exits .btn-group, .screen-steps .pl-loop .loop-reopen { margin: 0; row-gap: 0; }' +
    '.screen-steps .pl-after { margin-top: var(--s-8); }' +
    '.screen-steps .pl-after .school-or .src.is-info { display: none; }' +
    '.screen-steps .pl-after .btn { padding: var(--s-8) 0; }' +
    '.screen-steps .st-complete { margin: var(--s-12) 0 0; color: var(--ink-2); }' +
    '@media (max-width: 640px) {' +
    '  .screen-steps .pl-list .disc, .screen-steps .pl-loop .loop-body { padding-left: var(--s-12); }' +
    '  .screen-steps .pl-list .row-text, .screen-steps .pl-loop .loop-head-text { flex-direction: column; align-items: flex-start; }' +
    '  .screen-steps .pl-list .row-title, .screen-steps .pl-loop .loop-title { flex: none; }' +
    '}' +
    '</style>';

  const OPEN = 'steps:schoolOpen';
  const e = (s) => C.esc(s);
  const ISO = /^\d{4}-\d{2}-\d{2}$/;
  const fmt = (iso) => App.dates.fmt(iso);
  const fmtY = (iso) => App.dates.fmtY(iso);
  const lower1 = (s) => String(s || '').charAt(0).toLowerCase() + String(s || '').slice(1);
  const upper1 = (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);

  /* Old path views now live on the Timeline. The hash is swapped before the
     router reads it: once at load, and on each hashchange in the capture
     phase, which runs ahead of the router's own listener. */
  const OLD_PATH = /^#\/?(?:steps|next|checklists)\/(?:cpt|opt|h1b)(?:\/|$)/;
  function toTimeline() {
    if (!OLD_PATH.test(location.hash || '')) return false;
    try { history.replaceState(history.state, '', '#/timeline'); } catch (err) { location.replace('#/timeline'); }
    return true;
  }
  toTimeline();
  window.addEventListener('hashchange', toTimeline, true);

  function parse(params) {
    let demo = null, today = null, rec = null, sampleCard = false;
    (params || []).forEach((x) => {
      if (x === 'school' || x === 'school-added') demo = x;
      else if (x === 'reports-sample') sampleCard = true;
      else if (/^rec-/.test(x) && ISO.test(x.slice(4)) && !isNaN(Date.parse(x.slice(4)))) rec = x.slice(4);
      else if (ISO.test(x) && !isNaN(Date.parse(x))) today = x;
    });
    return { demo: demo, today: today, rec: rec, sampleCard: sampleCard };
  }

  /* A review link forces the school import state once per visit, so the
     student's own clicks afterwards are never overridden by a redraw. */
  let demoApplied = null;
  function applyDemo(demo) {
    if (!demo || demoApplied === location.hash) return;
    demoApplied = location.hash;
    App.setSchoolImport('stem', demo === 'school' ? 'found' : 'confirmed',
      { href: App.data.schoolImport.href, label: App.data.schoolImport.label });
  }
  window.addEventListener('hashchange', () => { if (location.hash !== demoApplied) demoApplied = null; });

  function answerBtn(label, value, cls) {
    return '<button type="button" class="' + cls + '" data-answer="stemIntent" data-value="' + e(value) + '">' + e(label) + '</button>';
  }

  /* A row's detail, opened in place: one plain line (the rule's own line
     when the step has none), then any link or action, then at its bottom
     the one ⓘ, "How this was counted", with the rule behind it (Round 7,
     rule 2: no ⓘ on a line). */
  function detailOf(line, ruleKey, more) {
    const rule = ruleKey ? C.getRule(ruleKey) : null;
    const text = line || (rule ? rule.plain || rule.name : '');
    const parts = [];
    if (text) parts.push('<p>' + C.escText(text) + '</p>');
    if (more) parts.push(more);
    if (rule) parts.push(C.how([ruleKey]));
    return parts.length ? parts.join('') : null;
  }

  /* The Employer check's public fact. Never a verdict, only what the search
     shows: "E-Verify: takes part, checked Sep 30". */
  function everify() {
    const emp = App.employer ? App.employer() : null;
    const ev = emp && emp.everify;
    return ev && ev.value ? ev : null;
  }
  /* The employer record says it takes part: the step is done from the
     record. A tick the student changed herself still wins. */
  function withRecordSteps(entries) {
    const ev = everify();
    if (!(ev && ev.state === 'participates') || App.state['task:everify'] != null) return entries;
    return entries.map((en) => {
      if (en.key === 'everify' && en.type === 'federal') return Object.assign({}, en, { done: true });
      if (en.afterOf && en.afterOf.key === 'everify') return Object.assign({}, en, { afterOf: Object.assign({}, en.afterOf, { done: true }) });
      return en;
    });
  }

  /* ---------------- the stepper ---------------- */

  const stemDate = (key) => (((App.data.stem || {}).dates) || []).filter((d) => d.key === key)[0] || null;

  /* One source mark on the stepper: the date that matters now keeps it. */
  const oneMark = (props) => Object.assign(props, {
    marks: (props.marks || []).map((m) => (m.emphasis ? m : Object.assign({}, m, { source: null }))),
  });

  function timelineFor(r, f) {
    const props = App.stemTimeline(r.today ? { today: r.today } : undefined);
    if (f) withFileBy(props, f);
    oneMark(props);
    return '<section class="st-when" aria-label="' + e(props.label || 'Key dates') + '">' +
      C.timeline(Object.assign({}, props, { key: 'steps:stem' })) + '</section>';
  }

  /* The card the STEM OPT loop saved. Once it is on the record, filing is
     behind her: the stepper shows the card and the next report it brings. */
  function savedCard() {
    const s = ((App.record ? App.record() : {}).stem || {}).card;
    const ok = App.dates && App.dates.okIso;
    return s && !s.sample && ok && ok(s.from) && ok(s.until) ? s : null;
  }
  const byDue = (a, b) => (a.due < b.due ? -1 : (a.due > b.due ? 1 : 0));
  /* The STEM reports this card brings, from App.reportsOwed. Card
     2027-02-14 to 2029-02-13: the next is the 6-month validation report,
     2027-08-14 + 10 business days = 2027-08-27 (python3, 2026-09-30). */
  function cardReports(card) {
    const all = App.reportsOwed ? App.reportsOwed() : null;
    const mine = ['report:validation:' + card.from + ':', 'report:eval-12:' + card.from, 'report:eval-final:' + card.from];
    return ((all && all.open) || []).filter((x) => mine.some((p) => String(x.id).indexOf(p) === 0)).sort(byDue);
  }
  function cardTimeline(card, r) {
    const today = r.today || App.data.today.iso;
    const next = cardReports(card).filter((x) => x.due >= today)[0] || null;
    const marks = [{ label: 'Card starts', date: card.from }];
    if (next) marks.push({ label: next.title, date: next.due, emphasis: true, source: next.rule || next.source });
    marks.push({ label: 'Card ends', date: card.until });
    return '<section class="st-when" aria-label="STEM OPT card">' +
      C.timeline({ key: 'steps:stem-card', label: 'STEM OPT card', today: today, marks: marks }) + '</section>';
  }

  /* App.fileBy('stem') once the recommendation date is known: on the record,
     or from a review link (shown only, never saved). Null until then. */
  function fileByFor(r) {
    if (!App.fileBy) return null;
    const f = App.fileBy('stem', r.rec ? { recommended: r.rec } : undefined);
    return f && !f.needs ? f : null;
  }
  /* The stepper's one line, read against its own today. A receipt stops
     the clock: "You filed Dec 5, 2026". */
  function fileByCaption(f, today) {
    const caps = (((App.data.stem || {}).timeline) || {}).captions || {};
    if (f.stopped) return 'You filed ' + f.filedText;
    if (today < f.opens) return 'File your I-765 between ' + f.opensText + ' and ' + f.lastText;
    if (today < f.last) return f.line;
    if (today === f.last) return caps.last || 'Today is the last day to file';
    return String(caps.after || 'The last day to file was {date}').replace('{date}', f.lastText);
  }
  /* The "Last day to file" point moves to the file-by date; its source mark
     carries each limit, the one that sets the day marked. */
  function withFileBy(props, f) {
    const opens = stemDate('opens'), closes = stemDate('closes');
    const today = props.today;
    const setter = f.candidates.filter((x) => x.sets)[0] || f.candidates[0];
    const emph = today < f.opens ? 'opens' : (today <= f.last && !f.stopped ? 'closes' : null);
    props.marks = (props.marks || []).map((m) => {
      if (opens && m.label === opens.label && m.date === opens.iso) return Object.assign({}, m, { emphasis: emph === 'opens' });
      if (closes && m.label === closes.label && m.date === closes.iso) {
        return Object.assign({}, m, { date: f.last, display: null, emphasis: emph === 'closes',
          source: App.ruleWith ? App.ruleWith(setter.source, [f.info]) : setter.source });
      }
      return m;
    });
    props.caption = fileByCaption(f, today);
    return props;
  }

  /* ---------------- the rows ---------------- */

  /* A federal step: its title and, at the right, its date or the fact that
     stands for one. Opened: its plain line, its rule, any link. */
  function fedRow(en, current, f) {
    const s = en.step;
    const ev = en.key === 'everify' ? everify() : null;
    const recd = ((App.record ? App.record() : {}).stem || {}).recommended;
    let date = null;
    let line = s.info || null;
    let more = '';
    let onDone = s.onDone ? C.unknown(s.onDone) : null;
    if (en.key === 'everify') {
      date = ev && ev.checked ? 'Checked ' + ev.checked : null;
      if (ev) line = ev.label + ': ' + lower1(ev.value) + '. ' + (s.info || '');
      if (s.open) more = '<a class="link" href="' + e(s.open.href) + '">Employer details</a>';
    } else if (en.key === 'i20' && App.dates.okIso(recd)) {
      date = 'Recommended ' + fmt(recd);
      onDone = null;
    } else if (en.key === 'i765') {
      const o = stemDate('opens'), c = stemDate('closes');
      if (f && f.stopped) date = 'Filed ' + f.filedText;
      else if (f) date = fmt(f.opens) + ' to ' + fmt(f.last);
      else if (o && c) date = fmt(o.iso) + ' to ' + fmt(c.iso);
    }
    return C.task({
      key: en.key, title: s.title, done: en.done, meta: date,
      updated: s.updated || null, onDone: onDone, current: current,
      detail: detailOf(line, s.source, more),
    });
  }

  /* A school step: marked "Your school"; opened, its line, the school page
     and, where the school asks for one, the DSO email. */
  function schoolRow(en, data, current) {
    const s = en.step;
    const more = (s.link ? '<a class="link" href="' + e(s.link.href) + '"' + (/^https?:/.test(s.link.href) ? ' target="_blank" rel="noopener"' : '') + '>' + e(s.link.label === 'Open' ? 'Open the school page' : s.link.label) + '</a>' : '') +
      (s.draft && data.email ? C.emailDraft(Object.assign({}, data.email, { openLabel: 'Email your DSO', step: en.key })) : '');
    return C.task({
      key: en.key, title: s.title, done: en.done, school: true,
      afterOf: en.afterOf || null, current: current,
      detail: detailOf(s.info || (s.meta ? String(s.meta).replace(/\.?$/, '.') : null), null, more || null),
    });
  }

  /* A report owed: what, and by when at the right. Opened: to whom, how it
     is counted with its rule, and Mark made (wired in app/sheets.js). */
  function reportRow(x) {
    const cfg = App.data.reports || {};
    const value = x.standing ? x.meta : (x.made ? 'Made ' + fmt(x.made) : x.dueText);
    const act = x.standing ? '' : '<div class="btn-group">' + (x.made
      ? '<button type="button" class="btn btn-text is-small is-quiet" data-report-act="undo" data-report="' + e(x.id) + '">' + e(cfg.undo || 'Undo') + '</button>'
      : '<button type="button" class="btn btn-pill is-small" data-report-act="done" data-report="' + e(x.id) + '">' + e(cfg.markDone || 'Mark made') + '</button>') + '</div>';
    const src = x.rule || x.source;
    const detail = '<p>To ' + e(lower1(x.to || 'Your DSO')) + '.' + (x.info ? ' ' + C.escText(x.info) : '') + '</p>' + act +
      (src ? C.how([src]) : '');
    return C.row({
      key: x.id, cls: 'report' + (x.made ? ' is-made' : ''), lead: '<span aria-hidden="true"></span>',
      title: C.raw(C.escText(x.title) + (x.sample ? ' <span class="marks">' + C.sampleMark() + '</span>' : '')),
      meta: value, content: detail,
    });
  }

  /* A loop as a row of the list. Its head is tidied in place (tidyLoops):
     the line leads with what it asks, not with "Needs you". */
  const loopItem = (lp) => '<div class="item pl-loop" data-key="loop:' + e(lp.id) + '">' + C.loop(lp) + '</div>';

  /* ---------------- the one list ---------------- */

  function planList(data, r, o) {
    const items = [];
    const push = (sort, html) => { if (html) items.push({ sort: sort, html: html, seq: items.length }); };
    const NOW = '0000-00-00';
    const LAST = '9999-12-31';

    /* Loops that need her now. */
    (o.others || []).forEach((lp) => push(NOW, loopItem(lp)));

    /* The steps, in order; the STEM OPT loop takes the I-765 row's place. */
    const f = fileByFor(r);
    if (o.showSteps) {
      const entries = withRecordSteps(App.steps('stem'));
      const firstOpen = entries.filter((en) => !en.done && !(en.afterOf && !en.afterOf.done))[0];
      const now = firstOpen ? firstOpen.key : null;
      const opens = stemDate('opens');
      const dateOf = (en) => (en.type === 'federal' && en.key === 'i765' ? ((f && f.opens) || (opens && opens.iso) || null) : null);
      const keys = entries.map(dateOf);
      for (let i = keys.length - 1, next = null; i >= 0; i -= 1) { if (keys[i]) next = keys[i]; else keys[i] = next; }
      entries.forEach((en, i) => {
        const sort = keys[i] || NOW;
        if (en.type === 'federal' && en.key === 'i765' && o.loop) { push(sort, loopItem(o.loop)); return; }
        push(sort, en.type === 'school' ? schoolRow(en, data, en.key === now) : fedRow(en, en.key === now, f));
      });
    } else if (o.loop) {
      push(NOW, loopItem(o.loop));
    }

    /* Reports owed, by due date. A report a loop opened is drawn as its
       loop; a report marked today stays, with Undo, until she leaves. */
    const sample = (window.DULY_SAMPLE.records || {}).sampleStemCard;
    const all = App.reportsOwed ? App.reportsOwed(r.sampleCard && sample ? { stemCard: sample } : undefined) : null;
    if (all) {
      const t = App.data.today.iso;
      const owedLoops = App.loops ? App.loops.list({ all: true }).filter((lp) => lp.kind === 'report-owed' &&
        (lp.state !== 'closed' && lp.state !== 'dismissed' ? true : lp.state === 'closed' && lp.closedOn === App.loops.now())) : [];
      const byLoop = owedLoops.map((lp) => (lp.context || {}).reportId);
      const dueOf = (id) => ((all.rows || []).filter((x) => x.id === id)[0] || {}).due || NOW;
      owedLoops.forEach((lp) => push(dueOf((lp.context || {}).reportId), loopItem(lp)));
      const plain = (x) => byLoop.indexOf(x.id) < 0;
      const rows = (all.open || []).filter(plain).concat((all.done || []).filter((x) => x.made === t).filter(plain));
      rows.forEach((x) => push(x.due, reportRow(x)));
      if (!rows.length && !owedLoops.length) (all.rows || []).filter((x) => x.standing).forEach((x) => push(LAST, reportRow(x)));
    }

    items.sort((a, b) => (a.sort < b.sort ? -1 : (a.sort > b.sort ? 1 : a.seq - b.seq)));
    return '<div class="list pl-list"' + (o.showSteps ? ' data-current' : '') + ' aria-label="Your plan">' + items.map((x) => x.html).join('') + '</div>';
  }

  function schoolAdd(data) {
    const imp = App.schoolImport('stem');
    if (imp.state !== 'empty' || App.state[OPEN]) return '<div class="pl-after">' + C.schoolImport({ path: 'stem' }) + '</div>';
    return '<div class="pl-after school-import" data-school-import-wrap="stem" data-state="empty"><div data-school-import-zone>' +
      '<button type="button" class="btn btn-text" data-steps-school="open">Add your school\'s steps</button>' +
      '</div></div>';
  }

  const COMPLETE_LINE = 'All steps done. Your receipt number goes in ';
  function completeLine(allDone) {
    return '<p class="st-complete t-meta" data-steps-complete' + (allDone ? '' : ' hidden') + '>' +
      e(COMPLETE_LINE) + '<a class="link" href="#/uscis">USCIS status</a>.</p>';
  }

  /* stemView(data, r, o)
     o.loop    the STEM OPT filing loop (App.loops). While it is open it
               stands for the filing: no question above, and it sits in the
               list in the I-765 row's place.
     o.others  the other loops to list first (screens/plan.js). */
  function stemView(data, r, o) {
    const opt = o || {};
    const stem = data.stem;
    const lp = opt.loop || null;
    const loopOpen = !!(lp && lp.state !== 'closed' && lp.state !== 'dismissed');
    const card = savedCard();
    const intent = loopOpen ? 'yes' : App.stemIntent();
    const showLoop = !!(lp && (loopOpen || intent === 'yes' || intent === 'no' || card));
    const change = answerBtn('Change', '', 'btn btn-text is-small');
    const dot = '<span aria-hidden="true">·</span>';

    let sub = '';
    let ask = '';
    if (card) sub = '<span>STEM OPT card ' + e(fmtY(card.from)) + ' to ' + e(fmtY(card.until)) + '</span>';
    else if (intent === 'no') sub = '<span>Not applying for STEM OPT this time</span>' + change;
    else if (intent === 'yes') sub = '<span>STEM OPT extension</span>' + dot + '<span>You plan to apply</span>' + (loopOpen ? '' : change);
    else {
      ask = '<div class="st-ask"><p class="t-medium">' + e(stem.askTitle) + '</p><div class="btn-group">' +
        answerBtn('Yes, I plan to', 'yes', 'btn btn-primary') +
        answerBtn('No, not this time', 'no', 'btn btn-pill') +
        (intent === 'unsure' ? '' : answerBtn('Not sure yet', 'unsure', 'btn btn-text is-quiet')) +
        '</div></div>';
    }
    const head = '<header class="page-header pl-head"><h1 class="t-big" tabindex="-1">Plan</h1>' +
      (sub ? '<p class="pl-sub t-meta">' + sub + '</p>' : '') + '</header>';

    const showSteps = !(intent === 'no' && !card);
    const when = showSteps
      ? (card ? cardTimeline(card, r) : timelineFor(r, fileByFor(r)))
      : '<p class="pl-no t-body"><span>' + C.escText(stem.noTitle) + '</span>' + C.source('eadEnds', { inline: true }) + '</p>';

    const list = planList(data, r, { showSteps: showSteps, loop: showLoop ? lp : null, others: opt.others || [] });
    const entries = showSteps ? withRecordSteps(App.steps('stem')).filter((en) => !(en.afterOf && !en.afterOf.done)) : [];
    const allDone = entries.length > 0 && entries.every((en) => en.done);
    return head + ask + when +
      '<section class="st-steps" aria-label="Your plan">' + list +
      (showSteps ? completeLine(allDone) + schoolAdd(data) : '') + '</section>';
  }

  /* For Plan (screens/plan.js): the page as a view, and its behaviour. */
  function view(data, params, o) {
    const r = parse(params);
    applyDemo(r.demo);
    return STYLE + stemView(data, r, o);
  }

  /* The loop heads in the list lead with what they ask:
       "Needs you: file your I-765 on or before Feb 13, 2027"
         reads "File your I-765 on or before Feb 13, 2027"
       "Needs you" alone reads as the step's own question
         ("Still at Northwind Systems, about 40 hours a week?")
       "Planned: report ..." reads "Report ..."
     A waiting or done loop keeps its title and its line. Run on every
     redraw (app/loops.js redraws a loop in place), so it never reverts. */
  function tidyLoops(root) {
    const sn = (((window.DULY_SAMPLE || {}).loops || {}).seen) || {};
    const needs = sn.needs || 'Needs you';
    const planned = String(sn.planned || 'Planned: {next}').replace('{next}', '');
    root.querySelectorAll('.pl-loop .loop:not([data-tidy])').forEach((box) => {
      box.setAttribute('data-tidy', '');
      const title = box.querySelector('.loop-title');
      const seen = box.querySelector('.loop-seen');
      if (!title || !seen) return;
      const line = seen.textContent.trim();
      const step = box.querySelector('.loop-step');
      let lead = null;
      /* "Waiting on your DSO until Oct 7. Planned: file your I-765 ..."
         leads with the filing and keeps the wait at the right. */
      const cut = planned ? line.indexOf('. ' + planned) : -1;
      if (cut > 0) {
        title.textContent = upper1(line.slice(cut + 2 + planned.length));
        seen.textContent = line.slice(0, cut);
        return;
      }
      if (line.indexOf(needs + ': ') === 0) lead = upper1(line.slice(needs.length + 2));
      else if (planned && line.indexOf(planned) === 0) lead = upper1(line.slice(planned.length));
      else if (line === needs && step) lead = step.textContent.trim();
      if (!lead) return;
      title.textContent = lead;
      seen.hidden = true;
      if (step && step.textContent.trim() === lead) step.hidden = true;
    });
  }

  window.SCREENS.steps = {
    title: 'Plan',
    paramsInPlace: true,
    view: view,
    parse: parse,
    tidyLoops: tidyLoops,
    titleFor() { return 'Plan'; },
    render(data, params) {
      if (toTimeline()) setTimeout(App.rerender, 0);
      const r = parse(params);
      applyDemo(r.demo);
      return STYLE + stemView(data, r) + C.footer();
    },
    mount(root) {
      root.classList.add('screen-steps');
      if (!root.__plTidy && window.MutationObserver) {
        root.__plTidy = new MutationObserver(() => tidyLoops(root));
        root.__plTidy.observe(root, { childList: true, subtree: true });
      }
      tidyLoops(root);
      root.addEventListener('click', (ev) => {
        const b = ev.target.closest('[data-steps-school="open"]');
        if (!b) return;
        App.state[OPEN] = true;
        App.rerender();
        const input = document.querySelector('main#main [data-school-import-url]');
        if (input) input.focus({ preventScroll: true });
      });
      wire();
    },
  };

  /* ---------------- behaviour, wired once ---------------- */

  /* The finished line shows and hides in place as steps are ticked. */
  function syncComplete() {
    const main = document.querySelector('main#main.screen-steps');
    if (!main) return;
    const line = main.querySelector('[data-steps-complete]');
    if (!line) return;
    const checks = Array.from(main.querySelectorAll('.st-steps .pl-list [role="checkbox"][data-task]')).filter((c) => !c.closest('[hidden]'));
    const all = checks.length > 0 && checks.every((c) => c.getAttribute('aria-checked') === 'true');
    if (all === !line.hidden) return;
    line.hidden = !all;
    if (all) App.play(line, 'is-arriving');
  }

  let wired = false;
  function wire() {
    if (wired) return;
    wired = true;
    document.addEventListener('duly:change', (ev) => {
      const d = ev.detail || {};
      if (!document.querySelector('main#main.screen-steps')) return;
      if (d.kind === 'task') { syncComplete(); return; }
      if (d.kind === 'school-import' && d.value === 'empty') {
        /* Not now folds it away; Change keeps the box open for a new link. */
        App.state[OPEN] = !(d.el && d.el.dataset && d.el.dataset.schoolImport === 'dismiss');
        return;
      }
      if (d.kind !== 'answer' || d.key !== 'stemIntent') return;
      App.rerender();
      const first = document.querySelector('main#main [data-answer="stemIntent"]');
      if (first) first.focus({ preventScroll: true });
      const v = App.stemIntent();
      App.toast(v === 'yes' ? 'Saved. Your steps are below' : v === 'no' ? 'Saved. Not this time' : v === 'unsure' ? 'Saved. Decide any time' : 'Answer cleared');
    });
  }
})();
