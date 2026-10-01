/* Your record (BLUEPRINT 3.1 and 3.4, D75). The footprint: a calm, dated
   history of the student's immigration life, newest first, then the
   Updates archive (the News articles) and Your profile.

   Where each line comes from (nothing typed here; every date is read from
   DULY_SAMPLE through App.record(), data.documents, data.updates and the
   loop log, and only what has happened as of the loops' today shows):
     papers      every dated version of every I-20 (data.documents.i20Groups)
     status      I-94 entry, F-1 visa, program start and end, OPT
                 recommended, filed, approved (the I-797), the card's start,
                 STEM OPT steps, an address change, a saved notice, a rule
                 update that changed a step (data.updates items with changed)
     work        CPT, each job start and end, new hours, the last confirmed
     reports     every report the student marked made (App.reportsOwed().done)
     trips       each saved trip, with its days away
     loops       App.loops.footprint(): every loop transition except the
                 crisis screen, which leaves nothing behind
   Never shown: typed Ask text and What if runs. Neither is written to the
   record (app/loops.js writes only playbook template lines; App.whatIf
   never saves), and this page reads nothing else.

   Each line opens to its paper, if any, and Erase from my record, which
   asks first with Cancel. Erasing takes only that line: a loop line leaves
   the record's log; any other line is hidden from the history. Papers,
   dates and open items do not change. The receipt says so, folds to one
   line, keeps Undo, and is gone on the next visit.

   Sample, Priya on Sep 30, 2026 (checked with python3 on 2026-10-01, by
   listing the same facts and sorting them): 26 lines from Jul 10, 2021 to
   Sep 30, 2026, newest first:
     2026  Sep 30 Opened: Check-in: Northwind Systems (the loop log; the
                  check-in opens because Aug 28 to Sep 30 is 33 days, past
                  checkin.jobDays 30)
           Aug 28 Confirmed: still at Northwind Systems (jobs[0].confirmedOn)
           Mar 4  Report marked made: new address (made, report:address)
           Mar 2  I-20 · OPT: travel signature added
           Mar 1  Moved to a new address (address.since, Sample)
           Feb 27 Report marked made: job at Northwind Systems
           Feb 27 Started at Northwind Systems
           Feb 14 OPT started (opt.from)
     2025  Dec 20 OPT approved (I-797, Approved Dec 20, 2025)
           Dec 18 Finished the program (program.end)
           Oct 24 I-20 · OPT: end date corrected
           Oct 10 Filed Form I-765 for OPT (opt.filed)
           Oct 3  School recommended OPT (opt.recommended)
           Oct 3  I-20 · OPT: original, sent with the I-765
           Jan 13 CPT at Lumen Labs
           Jan 8  I-20 · CPT at Lumen Labs: start date corrected
     2024  Dec 16 I-20 · CPT at Lumen Labs: original
           Dec 9  I-20 · Starting school: travel signature added
           Jun 1  CPT at Acme Robotics
           May 20 I-20 · CPT at Acme Robotics: original
     2023  Dec 11 I-20 · Starting school: travel signature added
           Aug 21 Started the program (program.start)
           Aug 2  F-1 visa issued (visa.issued, Sample)
           Aug    Entered the US (I-94, "Aug 2023": month only, so it
                  sorts as the month's day 0, after the dated lines of Aug)
           Jun 2  I-20 · Starting school: original, used for your visa
     2021  Jul 10 Passport issued (passport.issued, Sample)
   That is 26 lines in all: 8 in 2026, 8 in 2025, 4 in 2024, 5 in 2023,
   1 in 2021 (8 + 8 + 4 + 5 + 1 = 26). By group: Status 9, Work 5,
   Papers 10, Reports 2 (9 + 5 + 10 + 2 = 26). The travel signature of Mar 2, 2026
   (travelSignature.signed) is the OPT I-20's Mar 2 version, so it is said
   once. The Northwind start and its report share Feb 27: the report was
   marked made the day the job began.
   Trip days away: daysBetween(leave, back), the same count the travel loop
   shows; Dec 19, 2026 to Jan 9, 2027 is 21 days (Dec 19 to Dec 31 is 12,
   plus 9 into January).

   Routes:
     #/record          the page
     #/record/empty    the history with nothing in it yet (review only) */
(function () {
  'use strict';

  const e = (s) => C.esc(s);

  const COPY = {
    title: 'Your record',
    info: 'A dated history of your immigration life, kept on this device. Questions you type and What if runs are never kept here. Any line can be erased.',
    count: (n) => (n === 1 ? '1 line' : n + ' lines') + ', newest first',
    empty: 'Nothing here yet. Papers you add and things you carry to done show here, with their dates.',
    filterLabel: 'Show',
    cats: [
      { key: 'all', label: 'All' },
      { key: 'status', label: 'Status' },
      { key: 'work', label: 'Work' },
      { key: 'papers', label: 'Papers' },
      { key: 'reports', label: 'Reports' },
      { key: 'trips', label: 'Trips' },
    ],
    noneInCat: 'Nothing in this group yet.',
    openPaper: (t) => 'Open ' + t,
    erase: 'Erase from my record',
    eraseAsk: (w) => 'Erase "' + w + '" from your record on this device? Only this line goes. Your papers, dates and open items stay as they are.',
    eraseYes: (w) => 'Erase: ' + w,
    cancel: 'Cancel',
    erased: (w) => 'Erased from your record: ' + w + '.',
    restored: (w) => 'Put back in your record: ' + w + '.',
    checked: 'Your papers, dates and open items did not change.',
    nothingElse: 'Nothing else needs you for this.',
    erasedShort: (w) => 'Erased: ' + w,
    restoredShort: (w) => 'Put back: ' + w,
    undo: 'Undo',
    fold: 'Fold',
    done: 'Carried to done',
    updates: 'Updates',
    profile: 'Your profile',
    save: 'Save a copy of my record',
    saved: (n, f) => 'Copy ready: ' + f + ', ' + (n === 1 ? '1 line' : n + ' lines') + '.',
    file: 'your-record.txt',
    sample: 'Sample',
  };

  /* Layout only. Type sizes come from system.css. */
  const STYLE = '<style>' +
    '.screen-record .rec-count { margin: var(--s-8) 0 0; }' +
    '.screen-record .rec-filter { margin-top: var(--s-24); }' +
    '.screen-record .rec-filter .chips { margin-bottom: 0; }' +
    '.screen-record .rec-year + .rec-year { margin-top: var(--s-32); }' +
    '.screen-record .rec-row > .row > .row-lead { width: 64px; justify-content: flex-start; white-space: nowrap; color: var(--ink-3); font-size: var(--t-small); line-height: var(--lh-small); }' +
    '.screen-record .item.rec-row.has-lead > .disc { padding-left: calc(var(--s-12) + 64px); }' +
    '.screen-record .rec-detail { display: flex; flex-direction: column; align-items: flex-start; gap: var(--s-12); }' +
    '.screen-record .rec-detail p { margin: 0; }' +
    '.screen-record .rec-receipt { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: var(--s-8);' +
    '  margin-top: var(--s-24); padding: var(--s-12) 0; border-top: 1px solid var(--hairline); border-bottom: 1px solid var(--hairline); outline: none; }' +
    '.screen-record .rec-receipt p { margin: 0; flex: 1 1 240px; font-size: var(--t-small); line-height: var(--lh-small); color: var(--ink); overflow-wrap: anywhere; }' +
    '.screen-record .rec-receipt .btn-group { margin: 0; }' +
    '.screen-record .rec-receipt:focus-visible { box-shadow: var(--focus-ring); }' +
    '.screen-record .rec-none { margin: var(--s-16) 0 0; }' +
    '@media (max-width: 640px) {' +
    '  .screen-record .item.rec-row.has-lead > .disc { padding-left: 0; }' +
    '}' +
    '</style>';

  /* ---------------- dates ---------------- */
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const okIso = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
  const today = () => (App.loops && App.loops.now ? App.loops.now() : App.data.today.iso);
  const fmtY = (iso) => App.dates.fmtY(iso);
  const fmt = (iso) => App.dates.fmt(iso);
  /* The papers' dates are written for people: "Mar 2, 2026" or "Aug 2023".
     "Mar 2, 2026" is 2026-03-02; "Aug 2023" has no day, so it keeps the
     month only (sorted as day 00, after the dated lines of that month). */
  function parse(text) {
    const m = /^([A-Z][a-z]{2}) (\d{1,2}), (\d{4})$/.exec(String(text || '').trim());
    if (m && MON.indexOf(m[1]) >= 0) return { iso: m[3] + '-' + String(MON.indexOf(m[1]) + 1).padStart(2, '0') + '-' + m[2].padStart(2, '0') };
    const n = /^([A-Z][a-z]{2}) (\d{4})$/.exec(String(text || '').trim());
    if (n && MON.indexOf(n[1]) >= 0) return { iso: n[2] + '-' + String(MON.indexOf(n[1]) + 1).padStart(2, '0') + '-00', month: true };
    return null;
  }
  const lower1 = (s) => String(s || '').charAt(0).toLowerCase() + String(s || '').slice(1);
  const dateField = (doc, label) => {
    const f = ((doc && doc.dates) || []).filter((d) => d[0] === label)[0];
    return f ? parse(f[1]) : null;
  };

  /* ---------------- the papers, by id ---------------- */
  function allDocs(data) {
    const d = data.documents || {};
    const out = [];
    (d.i20Groups || []).forEach((g) => (g.items || []).forEach((it) => out.push(Object.assign({ group: 'i20' }, it))));
    ['work', 'identity', 'school'].forEach((k) => (d[k] || []).forEach((it) => out.push(Object.assign({ group: k }, it))));
    return out;
  }
  const docOf = (data, id) => allDocs(data).filter((x) => x.id === id)[0] || null;
  const paperName = (doc) => (doc ? doc.name || doc.title : '');

  /* ---------------- the history ---------------- */
  /* Footprint lines have no id of their own: a stable key per line object
     for the life of the page, so Erase and Undo find the same line. */
  const fpKeys = new WeakMap();
  let fpSeq = 0;
  const fpKey = (x) => { if (!fpKeys.has(x)) { fpSeq += 1; fpKeys.set(x, 'loop:' + fpSeq); } return fpKeys.get(x); };
  const LOOP_CAT = { 'job-ends': 'work', checkin: 'work', 'report-owed': 'reports', travel: 'trips', 'stem-filing': 'status', address: 'status', 'lost-paper': 'papers', notice: 'status' };

  const erased = () => (App.state['record:erased'] = App.state['record:erased'] || {});

  /* entries() : every line, newest first, erased ones left out.
     { key, iso, month?, cat, title, meta?, doc?, sample?, fp? } */
  function entries(data) {
    const r = App.record();
    const t = today();
    const out = [];
    const happened = (iso) => okIso(iso) ? iso <= t : /^\d{4}-\d{2}-00$/.test(iso || '');
    const add = (x) => { if (x && x.iso && happened(x.iso)) out.push(x); };

    /* Papers: every dated I-20 version. */
    const sigDays = {};
    ((data.documents || {}).i20Groups || []).forEach((g) => (g.items || []).forEach((doc) => {
      const vs = [].concat(doc.latest ? [doc.latest] : [], doc.versions || []);
      vs.forEach((v) => {
        const p = parse(v.date);
        if (!p) return;
        if (/travel signature/i.test(v.change || '')) sigDays[p.iso] = true;
        add({ key: 'paper:' + doc.id + ':' + p.iso, iso: p.iso, cat: 'papers', title: doc.name + ': ' + lower1(v.change), doc: doc.id });
      });
    }));

    /* Status. */
    const i94 = dateField(docOf(data, 'i94'), 'Entered');
    if (i94) add({ key: 'status:entered', iso: i94.iso, month: !!i94.month, cat: 'status', title: 'Entered the US', meta: 'I-94', doc: 'i94' });
    if (r.visa && okIso(r.visa.issued)) add({ key: 'status:visa', iso: r.visa.issued, cat: 'status', title: 'F-1 visa issued', meta: okIso(r.visa.expires) ? 'Valid until ' + fmtY(r.visa.expires) : '', doc: r.visa.doc, sample: !!r.visa.sample });
    if (r.passport && okIso(r.passport.issued)) add({ key: 'papers:passport', iso: r.passport.issued, cat: 'papers', title: 'Passport issued', meta: okIso(r.passport.expires) ? 'Valid until ' + fmtY(r.passport.expires) : '', doc: r.passport.doc, sample: !!r.passport.sample });
    const pg = r.program || {};
    const prog = [pg.level, pg.major].filter(Boolean).join(' in ');
    if (okIso(pg.start)) add({ key: 'status:program-start', iso: pg.start, cat: 'status', title: 'Started the program', meta: [prog, pg.school].filter(Boolean).join(' at '), doc: pg.doc });
    if (okIso(pg.end)) add({ key: 'status:program-end', iso: pg.end, cat: 'status', title: 'Finished the program', meta: (prog || 'Program') + ', degree awarded ' + fmtY(pg.end), doc: 'degree' });
    const opt = r.opt || {};
    if (okIso(opt.recommended)) add({ key: 'status:opt-recommended', iso: opt.recommended, cat: 'status', title: 'School recommended OPT', meta: 'On page 2 of your OPT I-20', doc: opt.recommendedDoc });
    if (okIso(opt.filed)) add({ key: 'status:opt-filed', iso: opt.filed, cat: 'status', title: 'Filed Form I-765 for OPT', meta: opt.category || '' });
    const approved = dateField(docOf(data, 'i797'), 'Approved');
    if (approved) add({ key: 'status:opt-approved', iso: approved.iso, cat: 'status', title: 'OPT approved', meta: 'I-797 approval notice', doc: 'i797' });
    if (okIso(opt.from)) add({ key: 'status:opt-from', iso: opt.from, cat: 'status', title: 'OPT started', meta: okIso(opt.until) ? 'Card valid ' + fmtY(opt.from) + ' to ' + fmtY(opt.until) : '', doc: opt.doc });
    const st = r.stem || {};
    if (okIso(st.recommended)) add({ key: 'status:stem-recommended:' + st.recommended, iso: st.recommended, cat: 'status', title: 'School recommended STEM OPT' });
    if (okIso(st.filed)) add({ key: 'status:stem-filed:' + st.filed, iso: st.filed, cat: 'status', title: 'Filed Form I-765 for STEM OPT' });
    if (st.card && !st.card.sample && okIso(st.card.from)) add({ key: 'status:stem-card:' + st.card.from, iso: st.card.from, cat: 'status', title: 'STEM OPT started', meta: okIso(st.card.until) ? 'Card valid ' + fmtY(st.card.from) + ' to ' + fmtY(st.card.until) : '' });
    if (r.address && okIso(r.address.since)) {
      const lines = r.address.lines || [];
      add({ key: 'status:address:' + r.address.since, iso: r.address.since, cat: 'status', title: 'Moved to a new address', meta: lines[lines.length - 1] || '', sample: !!r.address.sample });
    }
    /* A signature added later (the travel loop) has no paper version yet. */
    if (r.travelSignature && okIso(r.travelSignature.signed) && !sigDays[r.travelSignature.signed]) {
      add({ key: 'papers:signature:' + r.travelSignature.signed, iso: r.travelSignature.signed, cat: 'papers', title: 'Travel signature added', doc: r.travelSignature.doc });
    }
    const kinds = (App.loops && App.loops.def ? (App.loops.def('notice') || {}).kinds : null) || [];
    (r.notices || []).forEach((n, i) => {
      const k = kinds.filter((x) => x.value === n.kind)[0];
      add({ key: 'status:notice:' + i + ':' + n.arrived, iso: n.arrived, cat: 'status', title: 'Notice saved', meta: (k ? k.label + ', ' : '') + 'arrived ' + fmtY(n.arrived) });
    });
    (r.petitions || []).forEach((p, i) => {
      if (okIso(p.filed)) add({ key: 'status:petition:' + i, iso: p.filed, cat: 'status', title: 'H-1B petition filed', meta: okIso(p.start) ? 'For a start of ' + fmtY(p.start) : '' });
    });
    ((data.updates || {}).items || []).forEach((u) => {
      const p = parse(u.date);
      const n = (u.changed || []).filter((c) => c && c.title).length;
      if (p && n) add({ key: 'status:rules:' + u.id, iso: p.iso, cat: 'status', title: 'Rules updated', meta: n === 1 ? '1 step changed' : n + ' steps changed' });
    });

    /* Work. */
    (r.cpt || []).forEach((c) => {
      if (!okIso(c.start)) return;
      add({ key: 'work:cpt:' + c.id, iso: c.start, cat: 'work', title: 'CPT at ' + c.employer, meta: (c.fullTime ? 'Full time' : 'Part time') + (okIso(c.end) ? ', ' + fmtY(c.start) + ' to ' + fmtY(c.end) : ''), doc: c.doc });
    });
    (r.jobs || []).forEach((j) => {
      if (okIso(j.start)) add({ key: 'work:job-start:' + j.id, iso: j.start, cat: 'work', title: 'Started at ' + j.employer, meta: j.title || '', doc: j.doc });
      if (okIso(j.end)) add({ key: 'work:job-end:' + j.id + ':' + j.end, iso: j.end, cat: 'work', title: 'Job at ' + j.employer + ' ended', meta: 'Last day ' + fmtY(j.end) });
      (j.hoursChanges || []).forEach((h) => {
        if (okIso(h.on)) add({ key: 'work:hours:' + j.id + ':' + h.on, iso: h.on, cat: 'work', title: 'New hours at ' + j.employer, meta: h.hours != null ? h.hours + ' hours a week' : '' });
      });
      if (okIso(j.confirmedOn) && j.confirmedOn !== j.start) {
        add({ key: 'work:confirmed:' + j.id + ':' + j.confirmedOn, iso: j.confirmedOn, cat: 'work', title: 'Confirmed: still at ' + j.employer, meta: j.hours ? 'About ' + j.hours + ' hours a week' : '' });
      }
    });

    /* Reports marked made. */
    const owed = App.reportsOwed ? App.reportsOwed() : { done: [] };
    (owed.done || []).forEach((it) => {
      add({ key: 'reports:' + it.id, iso: it.made, cat: 'reports', title: 'Report marked made: ' + lower1(it.what || it.title), meta: 'To ' + lower1(it.to || 'Your DSO') });
    });

    /* Trips. Days away: daysBetween(leave, back), as the travel loop counts. */
    (r.trips || []).forEach((tr) => {
      if (!okIso(tr.leave)) return;
      const days = okIso(tr.back) ? App.dates.daysBetween(tr.leave, tr.back) : null;
      add({ key: 'trips:' + tr.id, iso: tr.leave, cat: 'trips', title: 'Trip abroad', meta: okIso(tr.back) ? fmtY(tr.leave) + ' to ' + fmtY(tr.back) + ', ' + days + (days === 1 ? ' day' : ' days') + ' away' : '' });
    });

    /* Papers marked lost and replaced (the lost paper loop). */
    Object.keys(r.lost || {}).forEach((id) => {
      add({ key: 'papers:lost:' + id, iso: r.lost[id], cat: 'papers', title: 'Marked lost: ' + paperName(docOf(data, id)), doc: id });
    });
    Object.keys(r.replaced || {}).forEach((id) => {
      const x = r.replaced[id] || {};
      add({ key: 'papers:replaced:' + id + ':' + x.added, iso: x.added, cat: 'papers', title: 'Replacement added: ' + paperName(docOf(data, id)), meta: okIso(x.until) ? 'Valid until ' + fmtY(x.until) : '', doc: id });
    });

    /* Every loop transition (never the crisis screen: app/loops.js writes
       nothing for a private loop). */
    (App.loops && App.loops.footprint ? App.loops.footprint() : []).forEach((x) => {
      add({ key: fpKey(x), iso: x.on, cat: LOOP_CAT[x.loop] || 'status', title: x.text, fp: x });
    });

    /* Newest first; on one day, the later written first. */
    const gone = erased();
    return out.map((x, i) => Object.assign(x, { seq: i }))
      .filter((x) => !gone[x.key])
      .sort((a, b) => (a.iso < b.iso ? 1 : (a.iso > b.iso ? -1 : b.seq - a.seq)));
  }

  /* ---------------- drawing ---------------- */
  const sampleMark = () => ' <span class="marks">' + C.sampleMark() + '</span>';
  const whatOf = (x) => x.title + ', ' + (x.month ? MON[+x.iso.slice(5, 7) - 1] + ' ' + x.iso.slice(0, 4) : fmtY(x.iso));
  const dayOf = (x) => (x.month ? MON[+x.iso.slice(5, 7) - 1] : MON[+x.iso.slice(5, 7) - 1] + ' ' + (+x.iso.slice(8, 10)));

  function entryRow(data, x) {
    const doc = x.doc ? docOf(data, x.doc) : null;
    const what = whatOf(x);
    const detail = '<div class="rec-detail">' +
      (doc ? '<a class="link" href="#/documents/' + e(doc.id) + '">' + C.escText(COPY.openPaper(paperName(doc))) + '</a>' : '') +
      C.danger({ label: COPY.erase, confirm: COPY.eraseAsk(what), confirmLabel: COPY.eraseYes(what), keepLabel: COPY.cancel, key: 'record-erase:' + x.key }) +
      '</div>';
    return C.row({
      key: 'rec:' + x.key,
      cls: 'rec-row',
      lead: '<span class="num">' + e(dayOf(x)) + '</span>',
      title: C.raw(C.escText(x.title) + (x.sample ? sampleMark() : '')),
      meta: x.meta || '',
      content: detail,
    });
  }

  function receiptHtml() {
    const rc = App.state['record:receipt'];
    if (!rc) return '';
    const btns = '<div class="btn-group">' +
      (rc.undo ? '<button type="button" class="btn btn-text is-small" data-rec-undo>' + e(COPY.undo) + '</button>' : '') +
      (rc.folded ? '' : '<button type="button" class="btn btn-text is-small is-quiet" data-rec-fold>' + e(COPY.fold) + '</button>') +
      '</div>';
    return '<div class="rec-receipt" role="status" tabindex="-1" data-rec-receipt>' +
      '<p>' + C.escText(rc.folded ? rc.short : rc.full) + '</p>' + btns + '</div>';
  }

  function filterHtml(list) {
    const cur = App.state['record:filter'] || 'all';
    const counts = {};
    list.forEach((x) => { counts[x.cat] = (counts[x.cat] || 0) + 1; });
    const items = COPY.cats.filter((c) => c.key === 'all' || counts[c.key] || c.key === cur).map((c) => ({
      value: c.key, label: c.label, count: c.key === 'all' ? list.length : (counts[c.key] || 0), selected: c.key === cur,
    }));
    if (items.length < 3) return '';
    return '<div class="rec-filter">' + C.chips({ key: 'record:filter', items: items, label: COPY.filterLabel }) + '</div>';
  }

  function historyHtml(data, list) {
    const cur = App.state['record:filter'] || 'all';
    const shown = cur === 'all' ? list : list.filter((x) => x.cat === cur);
    if (!list.length) return C.empty({ text: COPY.empty });
    if (!shown.length) return '<p class="t-body rec-none">' + e(COPY.noneInCat) + '</p>';
    const years = [];
    shown.forEach((x) => {
      const y = x.iso.slice(0, 4);
      const last = years[years.length - 1];
      if (last && last.y === y) last.items.push(x); else years.push({ y: y, items: [x] });
    });
    return years.map((g) => C.section({
      eyebrow: g.y,
      cls: 'rec-year',
      content: C.list(g.items.map((x) => entryRow(data, x)), { label: g.y }),
    })).join('');
  }

  function regionHtml(data, list) {
    return '<div data-rec-region>' + receiptHtml() + filterHtml(list) + historyHtml(data, list) + '</div>';
  }

  /* ---------------- erase, undo ---------------- */
  let lastUndo = null;   /* { key, fp?, index?, what } */

  function setReceipt(full, short, undo) {
    App.state['record:receipt'] = { full: full, short: short, undo: !!undo, folded: false };
  }

  function erase(key) {
    const x = entries(App.data).filter((y) => y.key === key)[0];
    if (!x) return false;
    const what = whatOf(x);
    if (x.fp) {
      const fp = App.record().footprint || [];
      const at = fp.indexOf(x.fp);
      if (at < 0) return false;
      fp.splice(at, 1);
      lastUndo = { key: key, fp: x.fp, index: at, what: what };
    } else {
      erased()[key] = true;
      lastUndo = { key: key, what: what };
    }
    setReceipt([COPY.erased(what), COPY.checked, COPY.nothingElse].join(' '), COPY.erasedShort(what), true);
    if (App.haptic) App.haptic('select');
    if (App.emit) App.emit('record', 'erase', key, null);
    return true;
  }

  function undo() {
    const u = lastUndo;
    if (!u) return false;
    if (u.fp) {
      const fp = App.record().footprint = App.record().footprint || [];
      fp.splice(Math.min(u.index, fp.length), 0, u.fp);
    } else {
      delete erased()[u.key];
    }
    lastUndo = null;
    setReceipt([COPY.restored(u.what), COPY.checked].join(' '), COPY.restoredShort(u.what), false);
    if (App.haptic) App.haptic('select');
    if (App.emit) App.emit('record', 'restore', u.key, null);
    return true;
  }

  /* Redraw the history and its count in place: same scroll, focus on the
     receipt (a status message, WCAG 4.1.3). */
  function refresh(focusReceipt) {
    const root = document.getElementById('main');
    if (!root || !root.classList.contains('screen-record')) return;
    const region = root.querySelector('[data-rec-region]');
    if (!region) return;
    const list = entries(App.data);
    const y = window.scrollY;
    const wrap = document.createElement('div');
    wrap.innerHTML = regionHtml(App.data, list);
    region.replaceWith(wrap.firstElementChild);
    const count = root.querySelector('[data-rec-count]');
    if (count) count.textContent = COPY.count(list.length);
    window.scrollTo(0, y);
    const rc = root.querySelector('[data-rec-receipt]');
    if (rc && focusReceipt) {
      rc.focus({ preventScroll: true });
      if (App.play) App.play(rc, 'is-arriving');
    }
  }

  /* Save a copy: the visible history as a plain text file, made on this
     device. */
  function saveCopy(data) {
    const list = entries(data);
    const lines = [COPY.title + ', ' + data.student.name, ''].concat(list.map((x) => {
      const d = x.month ? MON[+x.iso.slice(5, 7) - 1] + ' ' + x.iso.slice(0, 4) : fmtY(x.iso);
      return d + '    ' + x.title + (x.meta ? ' (' + x.meta + ')' : '');
    }));
    if (window.URL && URL.createObjectURL) {
      const url = URL.createObjectURL(new Blob([lines.join('\n') + '\n'], { type: 'text/plain' }));
      const a = document.createElement('a');
      a.href = url; a.download = COPY.file;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    if (App.toast) App.toast(COPY.saved(list.length, COPY.file));
  }

  /* One set of listeners for the life of the page. */
  if (!window.__recordWired) {
    window.__recordWired = true;
    document.addEventListener('duly:change', (ev) => {
      const d = ev.detail || {};
      if (d.kind === 'confirm' && String(d.key || '').indexOf('record-erase:') === 0) {
        if (erase(String(d.key).slice('record-erase:'.length))) refresh(true);
      } else if (d.kind === 'choice' && d.key === 'record:filter') {
        refresh(false);
      }
    });
    /* The receipt stays until folded or the next visit. */
    window.addEventListener('hashchange', () => {
      if (!/^#\/record(\/|$)/.test(location.hash || '')) { delete App.state['record:receipt']; lastUndo = null; }
    });
  }

  window.SCREENS['record'] = {
    title: COPY.title,
    render(data, params) {
      const demoEmpty = params && params[0] === 'empty';
      /* Reading the loops first lets a stale fact open its check-in (the
         loops' seed), so the history matches Today whichever page opens first. */
      if (App.loops && App.loops.list) App.loops.list();
      const list = demoEmpty ? [] : entries(data);
      const header = C.pageHeader({
        title: COPY.title,
        info: COPY.info,
        aside: list.length ? C.button({ label: COPY.save, kind: 'text', attrs: { 'data-rec-save': '' } }) : '',
      }) + (list.length ? '<p class="t-meta num rec-count" data-rec-count>' + e(COPY.count(list.length)) + '</p>' : '');

      const closed = !demoEmpty && App.loops && C.loops ? App.loops.list({ closed: true }) : [];
      const doneSec = closed.length ? C.section({ eyebrow: COPY.done, content: C.loops(closed, { label: COPY.done }) }) : '';

      const news = (data.updates && data.updates.items) || [];
      const updatesSec = C.section({
        eyebrow: COPY.updates,
        info: data.updates && data.updates.pageInfo,
        content: (news.length ? C.list(news.map((u) => C.updateRow(u)), { accordion: false, label: COPY.updates })
          : C.empty({ text: (data.updates && data.updates.empty) || 'No news yet.' })) + C.rulesLine(data.rules),
      });

      const s = data.student || {};
      const profileSec = C.section({
        eyebrow: COPY.profile,
        content: C.list([C.row({ key: 'rec-profile', title: s.name, meta: [s.visa, s.school].filter(Boolean).join(' · '), href: '#/case' })], { accordion: false, label: COPY.profile }),
      });

      return STYLE + header + regionHtml(data, list) + doneSec + updatesSec + profileSec + C.footer();
    },
    mount(root) {
      root.classList.add('screen-record');
      root.addEventListener('click', (ev) => {
        const t = ev.target;
        if (t.closest('[data-rec-save]')) { ev.preventDefault(); saveCopy(App.data); return; }
        if (t.closest('[data-rec-undo]')) { ev.preventDefault(); if (undo()) refresh(true); return; }
        if (t.closest('[data-rec-fold]')) {
          ev.preventDefault();
          const rc = App.state['record:receipt'];
          if (rc) rc.folded = true;
          refresh(true);
        }
      });
    },
  };
})();
