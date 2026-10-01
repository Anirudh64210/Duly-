/* Today (#/today; #/home stays and draws the same page). BLUEPRINT 3.2:
   four fixed slots, always in this order, each with an empty state that
   still says something, mostly folded:
     1. Where you stand: one line and one number, as of a date. The source
        mark opens how it was counted; the other numbers are one tap down.
        A count is a threat value, so it always has actions beside it
        (BLUEPRINT 2.3 rule 7): How it was counted, Other numbers, and while
        the count is held at an older day, the action that brings it to
        today.
     2. What's next: at most three open loops, one line each
        (App.loops.whatsNext, earliest engine date first), drawn by C.loop,
        then the overflow ("2 more, next on Nov 1", to Plan), then one line
        for a tracked USCIS case. The job confirmation shows once: as the
        check-in loop here. Slot 1 and the end line carry it only while the
        check-in sits in the overflow.
     3. Your papers: how many are kept, on how many devices, when they were
        backed up, and the next to run out.
     4. What changed: a published rule change that touches this student
        (opens, then folds away once seen), else "Rules checked Sep 30".
        News is in Record, not here.
   Then the end line, Ask (C.askField from components/ask.js) and the footer.

   The end line "Nothing in Duly needs you before <date>" shows only when
   every condition of BLUEPRINT 3.2 holds: no fact is Can't tell yet or
   held at an older day, the rules were checked today, the papers are
   backed up (sync healthy) and reminders are on; and no open loop needs
   the student now. Otherwise it names each unknown, with its way out
   ("Not confirmed since Aug 28: your job at Northwind Systems", only while
   that check-in is not on screen in slot 2).

   Loops on Today. A loop the student acts on stays where it is for this
   visit, closed ones included, so its receipt stays in view until it is
   folded or she leaves. A loop opened by another one (My job ended opens
   the job-ends loop; a STEM OPT approval opens five reports) is not
   unfolded: it takes a place by engine date if one of the three is free,
   else it goes to the overflow line. The STEM OPT filing loop
   is opened by its runway trigger (playbook 'stem-filing', trigger
   { from: 'runway', fact: 'stemOpens' }) while the card runs, nothing is
   filed and the answer is not No. When the loop moves past its first step
   the STEM OPT answer reads Yes on every screen.

   Sample, Priya, today 2026-09-30 (each checked with python3):
     count       Feb 14 to Feb 26, 2026 is 13 days without work; the job
                 check-in waits (Northwind last confirmed 2026-08-28,
                 2026-09-30 - 2026-08-28 = 33 days, at least the 30-day
                 setting), so the count is as of Aug 28:
                 "On OPT. 13 of 90 days without work, as of Aug 28."
     numbers     card ends 2027-02-13: 2027-02-13 - 2026-09-30 = 136 days;
                 window opens 2027-02-13 - 90 = 2026-11-15, in 46 days
     next        check-in (timer 2026-09-30 + 5 business days = 2026-10-07)
                 then STEM OPT (file on or before 2027-02-13, the card end).
                 After the STEM OPT approval is saved: the check-in, STEM OPT
                 with its receipt, the earliest of the five reports it opened;
                 the other four go to the overflow line
     USCIS       OPT work permit: Approved, as of Dec 20, 2025; after the
                 STEM OPT approval is saved on 2026-09-30, which is later:
                 STEM OPT work permit, Approved, as of Sep 30, 2026
     papers      4 I-20s + 3 work + 3 identity + 2 school = 12, on the phone
                 and the MacBook (the web shows the record, it keeps no
                 copy), backed up 9:40 (sample: no sync engine yet); next to
                 run out: EAD card, Feb 13, 2027
     changed     no published rule change touches the plan: "Rules checked
                 Sep 30"
     end line    none at first: the check-in is on screen and needs her, so
                 it is not said again ("Not confirmed since Aug 28" shows
                 only while the check-in sits in the overflow). After "Still at Northwind Systems" and the STEM OPT steps
                 started: reminders 2026-10-15 (training plan, the start
                 preparing day 2026-11-15 - 1 month), 2027-02-10 and
                 2027-02-13; next job check-in 2026-09-30 + 30 = 2026-10-30;
                 earliest is Oct 15: "Nothing in Duly needs you before Oct 15."
   Demo states:
     #/today/offline   the rules and the backup last ran Sep 29 (data.checked
                       .offline): the end line names both instead
     #/today/no-ead    no EAD card yet (also after onboarding with the card
                       left for later): no count and no date from a card the
                       student never added. */
(function () {
  'use strict';

  const e = (s) => C.esc(s);
  const D = () => App.dates;
  const L = () => App.loops;
  const fill = (t, v) => String(t || '').replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? v[k] : m));

  /* Every word on Today, one stable wording each. */
  const COPY = {
    title: 'Today',
    eyebrow: 'Where you stand',
    count: '{status}. {used} of {limit} days without work, as of {asOf}.',
    countUnknown: "{status}. Days without work: can't tell yet from {from}.",
    noCard: '{status}. Add your EAD card to count your days.',
    addCard: 'Add your EAD card',
    howCounted: 'How it was counted',
    confirm: 'Confirm your job to count to today',
    numbers: 'Other numbers',
    cardUntil: 'EAD card valid until',
    windowOpens: 'STEM OPT window opens',
    day90: 'Day {limit} without work',
    daysLeft: '{n} left',
    inDays: 'in {n}',
    next: "What's next",
    nextEmpty: 'Nothing open right now.',
    more: '{more}. All of them are in Plan',
    caseTitle: 'USCIS: {title}',
    papers: 'Your papers',
    papersLine: '{n} kept on {devices} devices · backed up {time}',
    papersLineOff: '{n} kept on {devices} devices · not backed up since {date}',
    runOut: 'Next to run out: {what}',
    changed: 'What changed',
    touch: '{n} rule change touches your plan: {todo}',
    touchMany: '{n} rule changes touch your plan: {todo}',
    touchRead: 'Read the update',
    touchSeen: 'Mark seen and fold this away',
    rulesOn: 'Rules checked {date}',
    rulesOff: 'Rules last checked {date}',
    endClear: 'Nothing in Duly needs you before {date}.',
    endClearNow: 'Nothing in Duly needs you now.',
    endJob: 'Not confirmed since {date}: your job at {employer}',
    endPetition: 'Not confirmed since {date}: your H-1B petition',
    endCount: "Can't tell yet: days without work from {date}",
    endRules: 'Not checked since {date}: rules',
    endSync: 'Not backed up since {date}: papers',
    endReminders: 'Reminders are off on this phone.',
    endJobAct: 'Confirm your job',
    endPetitionAct: 'Update the petition status',
    endCountAct: 'Add your hours in WorkBook',
    endSettingsAct: 'Open Settings',
    endOnline: 'Checked again once you are online.',
    ask: 'Ask about a date, a paper or a change',
    rulesInfo: 'Your dates are worked out from the current rules. When a rule changes, they update and the change shows here.',
  };

  /* Sync and backup: no engine in the prototype yet (BLUEPRINT section 5),
     so these are sample values. Offline: the last run was the day before
     today, as data.checked.offline says for the rules (2026-09-30 - 1 =
     2026-09-29). */
  const SYNC = { backedUp: '9:40', sample: true };

  const plural = (n, one) => n + ' ' + one + (n === 1 ? '' : 's');
  const today = () => App.data.today.iso;
  const fmt = (iso) => D().fmt(iso);
  /* A date never breaks across lines ("Aug 28" stays together). */
  const keep = (s) => String(s || '').replace(/ /g, '\u00a0');

  /* ---------------- the runway trigger and the STEM OPT answer ---------------- */
  const openOf = (kind) => L().list().filter((lp) => lp.kind === kind)[0] || null;
  const anyOf = (kind) => L().list({ all: true }).filter((lp) => lp.kind === kind);
  function seedRunway() {
    if (!L() || App.state['today:runway']) return;
    App.state['today:runway'] = true;
    const r = App.record();
    const t = today();
    if (!r.opt || !D().okIso(r.opt.until) || r.opt.until < t) return;
    if ((r.stem || {}).filed || (r.stem || {}).receipt || (r.stem || {}).card) return;
    if (App.stemIntent() === 'no' || anyOf('stem-filing').length) return;
    const fb = App.fileBy ? App.fileBy('stem') : null;
    if (!fb || !fb.opens || (fb.last && fb.last < t)) return;
    L().start('stem-filing', {});
  }
  seedRunway();

  /* A loop that moved: the STEM OPT answer follows its loop. A loop opened
     by another one (the reports a STEM OPT approval opens) is neither
     unfolded nor pinned here: it takes its place by engine date in What's
     next, or goes to the overflow line. */
  document.addEventListener('duly:change', (ev) => {
    const d = ev.detail || {};
    if (d.kind !== 'loop' || !L()) return;
    const lp = L().get(d.key);
    if (!lp) return;
    if (lp.kind === 'stem-filing' && lp.state !== 'closed' && lp.state !== 'dismissed' && lp.step !== 'facts' && App.stemIntent() !== 'yes') {
      App.state.stemIntent = 'yes';
    }
  });

  /* ---------------- slot 1: where you stand ---------------- */
  function statusWord(r) {
    const t = today();
    const s = r.stem && r.stem.card;
    if (s && s.from <= t && t <= s.until) return 'On STEM OPT';
    if (r.opt && r.opt.from <= t && t <= r.opt.until) return 'On OPT';
    return (App.data.home && App.data.home.eyebrow) || 'F-1';
  }

  /* The check-in loop that settles a count held at an older day. */
  function checkinLoop() { return L() ? openOf('checkin') : null; }
  /* The check-in, only when it is not on screen in slot 2. */
  function offScreenCheckin(ctx) {
    const ci = checkinLoop();
    return ci && ctx.loops.shown.indexOf(ci) < 0 ? ci : null;
  }

  function standing(ctx) {
    const r = App.record();
    const status = statusWord(r);
    const date = C.dateLine(App.data.today.long);
    if (ctx.noCard) {
      return date + '<section class="hero today-stand" aria-labelledby="hero-title">' +
        '<p class="hero-eyebrow">' + C.shield({ halo: true }) + '<span class="t-eyebrow-hero">' + e(COPY.eyebrow) + '</span></p>' +
        '<h1 class="hero-title t-big" id="hero-title" tabindex="-1">' + e(fill(COPY.noCard, { status: status })) + '</h1>' +
        '<div class="hero-actions">' + C.button({ label: COPY.addCard, kind: 'primary', href: '#/documents/add' }) + '</div></section>';
    }
    const it = App.compute()['unemployment.used'];
    const u = App.unemployment ? App.unemployment() : {};
    const limit = App.RULE.unemploymentLimit;
    let line;
    let src = null;
    if (!it) line = status + '.';
    else if (it.n == null) line = fill(COPY.countUnknown, { status: status, from: fmt(unknownFrom() || it.asOf) });
    else line = fill(COPY.count, { status: status, used: it.n, limit: limit, asOf: keep(fmt(it.asOf)) });
    if (it && App.data.sources && App.data.sources.unemployment) {
      src = Object.assign({}, App.data.sources.unemployment, u.counted ? { counted: [u.counted] } : {});
    }
    const held = it && it.asOf && it.asOf < today();
    /* The job confirmation shows once: as the check-in in slot 2. Only when
       the check-in sits in the overflow does slot 1 carry the way to it. */
    const ci = held ? offScreenCheckin(ctx) : null;

    /* Other numbers, one tap down, each with its source. */
    const rows = [];
    const t = today();
    if (r.opt && D().okIso(r.opt.until) && r.opt.until >= t) {
      /* 2027-02-13 - 2026-09-30 = 136 days. */
      rows.push(C.valueRow({ label: COPY.cardUntil, value: D().fmt(r.opt.until, { year: true }) + ' · ' + fill(COPY.daysLeft, { n: plural(D().daysBetween(t, r.opt.until), 'day') }), editable: false, source: 'eadEnds', num: true }));
      const stemOpen = App.stemIntent() !== 'no' && !((r.stem || {}).filed || (r.stem || {}).receipt);
      if (stemOpen) {
        /* 2027-02-13 - 90 = 2026-11-15; 2026-11-15 - 2026-09-30 = 46 days. */
        const opens = D().addDays(r.opt.until, -App.RULE.stemBefore);
        if (opens >= t) rows.push(C.valueRow({ label: COPY.windowOpens, value: fmt(opens) + ' · ' + fill(COPY.inDays, { n: plural(D().daysBetween(t, opens), 'day') }), editable: false, source: 'stemOpens', num: true }));
      }
    }
    const d90 = App.compute()['unemployment.day90'];
    if (d90 && d90.iso) rows.push(C.valueRow({ label: fill(COPY.day90, { limit: limit }), value: fmt(d90.iso), editable: false, source: d90.counted ? App.ruleWith('unemployment', d90.counted) : 'unemployment', num: true }));
    const open = !!App.state['today:numbers'];
    const actions = [];
    if (ci) actions.push('<button type="button" class="btn btn-pill" data-today-open="' + e(ci.id) + '">' + e(COPY.confirm) + '</button>');
    if (rows.length) {
      actions.push('<button type="button" class="btn btn-text today-numbers-toggle" data-today-numbers aria-expanded="' + (open ? 'true' : 'false') + '" aria-controls="today-numbers">' +
        e(COPY.numbers) + C.icon('chevron', { cls: 'today-chev', size: 12 }) + '</button>');
    }
    return date + '<section class="hero today-stand" aria-labelledby="hero-title">' +
      '<p class="hero-eyebrow">' + C.shield({ halo: true }) + '<span class="t-eyebrow-hero">' + e(COPY.eyebrow) + '</span></p>' +
      '<div class="title-row"><h1 class="hero-title t-big" id="hero-title" tabindex="-1">' + e(line) + '</h1>' +
      (src ? C.source(src, { inline: true }) : '') + '</div>' +
      (actions.length ? '<div class="hero-actions">' + actions.join('') + '</div>' : '') +
      (rows.length ? '<div class="list today-numbers" id="today-numbers" aria-label="' + e(COPY.numbers) + '"' + (open ? '' : ' hidden') + '>' + rows.join('') + '</div>' : '') +
      '</section>';
  }
  /* The first day the count cannot be read, from the engine's projection. */
  function unknownFrom() {
    const u = App.compute()['unemployment.unknown'];
    return u && u.iso ? u.iso : null;
  }

  /* ---------------- slot 2: what's next ---------------- */
  /* The earliest date a loop will come back: its first reminder, else its
     timer. Used for the overflow line only. */
  function nextIsoOf(lp) {
    const s = L().schedule({ only: lp.id }).reminders[0];
    return (s && s.iso) || lp.timerAt || null;
  }

  /* A collapsed header keeps its source tag when the rule is not settled
     (BLUEPRINT 3.2): the tag of the step's tagged line, beside the date. */
  function loopHtml(lp) {
    let html = C.loop(lp);
    const v = L().view(lp);
    const tagged = v.step && v.seen && v.seen.next ? v.step.lines.filter((l) => l.tag)[0] : null;
    if (tagged) {
      const at = html.indexOf('<span class="loop-seen">');
      const close = at < 0 ? -1 : html.indexOf('</span>', at);
      if (close > 0) {
        const word = tagged.tag === 'guidance' ? 'Guidance' : tagged.tag.charAt(0).toUpperCase() + tagged.tag.slice(1);
        html = html.slice(0, close) + ' <span class="mark today-tag">' + e(word) + '</span>' + html.slice(close);
      }
    }
    return html;
  }

  /* The USCIS case for the one line: a filed case still waiting first (the
     newest), else the decided case that changed most recently. Status is
     what the student last saw on USCIS, with its date (C.statusLine).
     Sample: OPT work permit, Approved, as of Dec 20, 2025. Once the STEM OPT
     approval is saved through its loop (new card Feb 14, 2027 to Feb 13,
     2029), the STEM OPT case is Approved as of the day it was saved
     (2026-09-30 in the sample), which is after 2025-12-20, so it is the
     line: "STEM OPT work permit, Approved, as of Sep 30, 2026". */
  const MONTH = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
  /* "Dec 20, 2025" to "2025-12-20"; anything else to ''. */
  function isoOfText(t) {
    const m = /^([A-Z][a-z]{2}) (\d{1,2}), (\d{4})$/.exec(String(t || ''));
    if (!m || !MONTH[m[1]]) return '';
    return m[3] + '-' + String(MONTH[m[1]]).padStart(2, '0') + '-' + m[2].padStart(2, '0');
  }
  /* The day the STEM OPT loop closed with the approval saved. */
  function stemApprovedOn() {
    if (!L()) return null;
    const lp = anyOf('stem-filing').filter((x) => x.state === 'closed' && x.outcome === 'approved').slice(-1)[0];
    return lp && D().okIso(lp.closedOn) ? lp.closedOn : null;
  }
  function trackedCase() {
    const apps = (App.data.applications || {}).items || [];
    const rs = App.record().stem || {};
    const list = apps.map((a) => {
      const x = Object.assign({}, a, { receipt: App.state['receipt:' + a.id] || a.receipt, status: App.state['status:' + a.id] || a.status });
      if (a.id === 'stem') {
        /* A receipt saved through the STEM OPT loop, not yet on the case. */
        if (!x.receipt && rs.receipt) {
          x.receipt = rs.receipt;
          x.status = 'Received';
          x.asOf = D().fmt(rs.filed || rs.receiptOn, { year: true });
        }
        /* The new card saved through the loop: the case is approved. */
        if (rs.card && D().okIso(rs.card.from) && !App.state['status:' + a.id]) {
          const on = stemApprovedOn() || today();
          x.receipt = x.receipt || rs.receipt || '';
          x.status = 'Approved';
          x.asOf = D().fmt(on, { year: true });
        }
      }
      x.changedOn = isoOfText(x.asOf);
      return x;
    }).filter((a) => a.receipt && !/^not filed/i.test(a.status || ''));
    const waiting = list.filter((a) => !/^(approved|denied)/i.test(a.status || '') && !/card mailed/i.test(a.status || ''));
    if (waiting.length) return waiting[waiting.length - 1];
    /* Latest change first; a case with no date keeps its place after. */
    return list.slice().sort((a, b) => (a.changedOn < b.changedOn ? 1 : (a.changedOn > b.changedOn ? -1 : 0)))[0] || null;
  }
  function caseLine(a) {
    if (!a) return '';
    return '<section class="loop is-waiting today-case" aria-label="' + e(fill(COPY.caseTitle, { title: a.title })) + '">' +
      '<a class="loop-head" href="#/uscis/' + e(a.id) + '">' +
      '<span class="loop-dot" aria-hidden="true"></span>' +
      '<span class="loop-head-text"><span class="loop-title">' + e(fill(COPY.caseTitle, { title: a.title })) + '</span>' +
      '<span class="loop-seen">' + e(C.statusLine(a)) + '</span></span>' +
      C.icon('chevron', { cls: 'chev' }) + '</a></section>';
  }

  /* The loops slot 2 shows, worked out once per draw (slot 1 and the end
     line need to know whether the check-in is on screen).
     At most three (MAX). A loop shown earlier on this visit keeps its place
     while it is open or its receipt shows, so the loop the student acted on
     does not move under her finger and its receipt stays in view. The other
     places are filled by open loops, earliest engine date first
     (App.loops.whatsNext). Everything else goes to the overflow line.
     Sample, after the STEM OPT approval is saved: the check-in and STEM OPT
     keep their places (2), the earliest of the five reports it opened fills
     the third, and the other four go to "4 more, next on ...". */
  const MAX = 3;
  function planLoops(ctx) {
    if (!L() || !C.loop) return { shown: [], rest: [] };
    const skip = (lp) => ctx.noCard && lp.kind === 'stem-filing';
    const open = L().whatsNext({ max: 999 }).loops.filter((lp) => !skip(lp));
    const before = App.state['today:shown'] || [];
    const all = L().list({ all: true });
    const keeps = (lp) => !skip(lp) && lp.state !== 'dismissed' &&
      (open.indexOf(lp) >= 0 || !!(lp.receipt && !lp.receipt.folded));
    const pinned = before.map((id) => all.filter((lp) => lp.id === id)[0]).filter((lp) => lp && keeps(lp));
    /* A loop the student started from another one's button (context.notice)
       is acted on too: it stays, under the loop it came from. */
    all.filter((lp) => open.indexOf(lp) >= 0 && pinned.indexOf(lp) < 0 && (lp.context || {}).notice &&
      before.indexOf((lp.context || {}).parent) >= 0 && App.state['loopOpen:' + lp.id]).forEach((lp) => {
      const at = pinned.map((x) => x.id).indexOf(lp.context.parent);
      pinned.splice(at + 1, 0, lp);
    });
    const fill = open.filter((lp) => pinned.indexOf(lp) < 0).slice(0, Math.max(0, MAX - pinned.length));
    /* Pinned loops go back to their place on this visit; the fill takes the
       other places in date order. */
    const shown = fill.slice();
    pinned.forEach((lp) => {
      let at = before.indexOf(lp.id);
      if (at < 0) {
        const p = shown.map((x) => x.id).indexOf((lp.context || {}).parent);
        at = p < 0 ? shown.length : p + 1;
      }
      shown.splice(Math.min(at, shown.length), 0, lp);
    });
    App.state['today:shown'] = shown.map((lp) => lp.id);
    return { shown: shown, rest: open.filter((lp) => shown.indexOf(lp) < 0) };
  }

  function nextSlot(ctx) {
    if (!L() || !C.loop) return C.section({ eyebrow: COPY.next, content: '<p class="t-lead">' + e(COPY.nextEmpty) + '</p>' });
    const shown = ctx.loops.shown;
    /* The overflow: open loops not shown, with the next date among them
       (the earliest first reminder, else timer, of those loops). */
    const rest = ctx.loops.rest;
    const restIso = rest.map(nextIsoOf).filter(Boolean).sort()[0];
    const moreText = rest.length ? rest.length + ' more' + (restIso ? ', next on ' + fmt(restIso) : '') : null;
    const planHref = window.SCREENS.plan ? '#/plan' : '#/steps';
    /* Order (BLUEPRINT 3.2): the loops, the overflow line, then the case. */
    const more = moreText ? '<p class="loop-more t-meta"><a class="link is-quiet" href="' + planHref + '">' + e(fill(COPY.more, { more: moreText })) + '</a></p>' : '';
    const loops = shown.length
      ? '<div class="loops today-loops" aria-label="' + e(COPY.next) + '">' + shown.map(loopHtml).join('') + '</div>'
      : '<p class="t-lead today-empty">' + e(COPY.nextEmpty) + '</p>';
    const kase = ctx.case ? '<div class="loops today-loops today-case-row">' + caseLine(ctx.case) + '</div>' : '';
    return C.section({ eyebrow: COPY.next, cls: 'today-next', content: loops + more + kase });
  }

  /* ---------------- slot 3: your papers ---------------- */
  /* Every paper on file, once each (as the Share sheet counts them):
     4 I-20s + 3 work + 3 identity + 2 school = 12. */
  function paperCount() {
    const d = App.data.documents || {};
    const ids = {};
    (d.i20Groups || []).forEach((g) => (g.items || []).forEach((i) => { ids[i.id] = true; }));
    ['work', 'identity', 'school'].forEach((k) => (d[k] || []).forEach((i) => { ids[i.id] = true; }));
    return Object.keys(ids).length;
  }
  /* Devices that keep a copy: every device in Settings but the web, which
     shows the record and keeps none. Phone and MacBook: 2. */
  function deviceCount() {
    const list = ((App.data.settings || {}).devices || []).filter((x) => !/^web$/i.test(x.title || ''));
    return list.length || 1;
  }
  function papersSlot(ctx) {
    const n = paperCount();
    const title = ctx.offline
      ? fill(COPY.papersLineOff, { n: n, devices: deviceCount(), date: fmt(ctx.lastRun) })
      : fill(COPY.papersLine, { n: n, devices: deviceCount(), time: SYNC.backedUp });
    const w = App.documentWatch ? App.documentWatch() : null;
    const nx = w && w.next && !(ctx.noCard && w.next.key === 'ead') ? w.next : null;
    const href = window.SCREENS.papers ? '#/papers' : '#/documents';
    return C.section({
      eyebrow: COPY.papers, cls: 'today-papers',
      content: C.list([C.row({ key: 'today-papers', title: title, meta: nx ? fill(COPY.runOut, { what: nx.text }) : null, href: href })], { accordion: false, label: COPY.papers }),
    });
  }

  /* ---------------- slot 4: what changed ---------------- */
  /* A published update touches the plan when it changed a step for this
     student (updates item.changed). Seen ones fold away. */
  function touching() {
    const items = ((App.data.updates || {}).items || []);
    return items.filter((u) => (u.changed || []).some((c) => c && c.title) && !App.state['today:seen:' + u.id]);
  }
  function changedSlot(ctx) {
    const t = touching();
    let head;
    if (t.length) {
      const todo = C.todoShort(C.affectsFor(t[0]).todo) || '';
      const title = fill(t.length === 1 ? COPY.touch : COPY.touchMany, { n: t.length, todo: todo.charAt(0).toLowerCase() + todo.slice(1) });
      const body = t.map((u) => '<p class="t-row">' + e(u.title) + '</p>' +
        '<ul class="today-changed">' + u.changed.filter((c) => c && c.title).map((c) => '<li>' + e(c.title + (c.change ? ': ' + c.change : '')) + '</li>').join('') + '</ul>' +
        '<p>' + C.link({ label: COPY.touchRead, href: '#/updates/' + u.id }) + '</p>').join('') +
        '<div class="btn-group"><button type="button" class="btn btn-pill" data-today-seen="' + e(t.map((u) => u.id).join(',')) + '">' + e(COPY.touchSeen) + '</button></div>';
      head = C.list([C.row({ key: 'today-touch', title: title, content: body })], { label: COPY.changed });
    } else {
      const rules = Object.assign({}, App.data.rules || {}, {
        checked: fill(ctx.offline ? COPY.rulesOff : COPY.rulesOn, { date: fmt(ctx.offline ? ctx.lastRun : today()) }),
        info: COPY.rulesInfo,
      });
      head = C.rulesLine(rules);
    }
    /* News lives in Record (BLUEPRINT 3.2), not here. */
    return C.section({ eyebrow: COPY.changed, cls: 'today-changed-slot', content: head });
  }

  /* ---------------- the end line ---------------- */
  function endLine(ctx) {
    const r = App.record();
    const lines = [];
    const t = today();
    if (!ctx.noCard) {
      (App.checkins ? App.checkins() : []).forEach((c) => {
        if (c.kind === 'job') {
          const j = (r.jobs || []).filter((x) => x.id === c.jobId)[0];
          /* While a loop about this job is on screen in slot 2 (its
             check-in, or the job-ends loop after My job ended), that loop
             says this already. */
          if (ctx.loops.shown.some((lp) => lp.state !== 'closed' && (lp.context || {}).jobId === c.jobId)) return;
          const ci = offScreenCheckin(ctx);
          lines.push({ text: fill(COPY.endJob, { date: fmt(c.confirmedOn), employer: j ? j.employer : '' }),
            act: ci ? '<button type="button" class="btn btn-text is-small" data-today-open="' + e(ci.id) + '">' + e(COPY.endJobAct) + '</button>' : '' });
        } else if (c.kind === 'petition') {
          lines.push({ text: fill(COPY.endPetition, { date: fmt(c.confirmedOn) }), act: C.link({ label: COPY.endPetitionAct, href: '#/uscis' }) });
        }
      });
      const u = App.compute()['unemployment.used'];
      if (u && u.n == null && unknownFrom()) lines.push({ text: fill(COPY.endCount, { date: fmt(unknownFrom()) }), act: C.link({ label: COPY.endCountAct, href: window.SCREENS.plan ? '#/plan/workbook' : '#/case/jobs' }) });
    }
    if (L()) L().list().filter((lp) => lp.cantTell && !(L().def(lp.kind) || {}).private).forEach((lp) => lines.push({ text: L().seen(lp).line, act: '' }));
    if (ctx.offline) {
      lines.push({ text: fill(COPY.endRules, { date: fmt(ctx.lastRun) }) + '. ' + COPY.endOnline, act: '' });
      lines.push({ text: fill(COPY.endSync, { date: fmt(ctx.lastRun) }) + '. ' + COPY.endOnline, act: '' });
    }
    const on = L() ? L().schedule().on : true;
    if (!on) lines.push({ text: COPY.endReminders, act: C.link({ label: COPY.endSettingsAct, href: '#/settings' }) });
    if (lines.length) {
      return '<div class="today-end">' + lines.map((l) =>
        '<p class="today-end-line"><span>' + e(l.text) + '</span>' + (l.act ? ' ' + l.act : '') + '</p>').join('') + '</div>';
    }
    /* Every condition holds. Nothing may need the student now either. */
    const needs = L() ? L().list().filter((lp) => !(L().def(lp.kind) || {}).private && L().seen(lp).kind === 'needs') : [];
    if (needs.length) return '';
    /* The next day something will need her: the first reminder the
       scheduler holds, or the next job check-in (confirmed + 30 days). */
    const dates = (L() ? L().schedule({ asOf: t }).reminders.map((x) => x.iso) : []);
    const days = ((App.data.checkin || {}).jobDays) || 30;
    (r.jobs || []).filter((j) => j.start <= t && (!j.end || t <= j.end) && D().okIso(j.confirmedOn)).forEach((j) => dates.push(D().addDays(j.confirmedOn, days)));
    const first = dates.filter((x) => D().okIso(x) && x > t).sort()[0];
    return '<p class="today-end today-end-line is-clear">' + e(first ? fill(COPY.endClear, { date: fmt(first) }) : COPY.endClearNow) + '</p>';
  }

  /* ---------------- Ask ---------------- */
  function askSlot() {
    if (typeof C.askField !== 'function') return '';
    return '<div class="today-ask">' + C.askField({ label: COPY.ask }) + '</div>';
  }

  /* Layout only. Sizes from system.css; spacing from the scale. */
  const STYLE = '<style>' +
    '.screen-today .today-stand .title-row { display: flex; align-items: flex-start; gap: var(--s-8); margin-top: var(--s-12); }' +
    '.screen-today .today-stand .title-row .hero-title { margin-top: 0; flex: 0 1 auto; }' +
    '.screen-today .today-stand .title-row .src { margin-top: var(--s-8); flex: none; }' +
    '.screen-today .today-stand .hero-actions { margin-top: var(--s-16); }' +
    '.screen-today .today-numbers-toggle { display: inline-flex; align-items: center; gap: var(--s-4); }' +
    '.screen-today .today-chev { transform: rotate(90deg); transition: transform .2s ease; opacity: .72; }' +
    '.screen-today .today-numbers-toggle[aria-expanded="true"] .today-chev { transform: rotate(-90deg); }' +
    '.screen-today .today-numbers { margin-top: var(--s-16); }' +
    '.screen-today .today-tag { margin-left: var(--s-4); vertical-align: baseline; }' +
    '.screen-today .today-case .loop-head { color: var(--ink); text-decoration: none; }' +
    '.screen-today .today-case .chev { transform: none; }' +
    '.screen-today .today-empty { margin: 0 0 var(--s-12); }' +
    '.screen-today .loop-more + .today-case-row { margin-top: var(--s-12); }' +
    '.screen-today .today-loops + .today-case-row .loop { border-top: 0; }' +
    '.screen-today .today-changed { margin: var(--s-8) 0 var(--s-12); padding-left: var(--s-16); }' +
    '.screen-today .today-changed-slot .rules-line { margin: 0 0 var(--s-12); }' +
    '.screen-today .today-end { margin-top: var(--s-32); display: flex; flex-direction: column; gap: var(--s-8); }' +
    '.screen-today .today-end-line { margin: 0; font-size: var(--t-small); line-height: var(--lh-small); color: var(--ink-2); overflow-wrap: anywhere; }' +
    '.screen-today .today-end-line .btn-text { padding: 0; min-height: 0; vertical-align: baseline; }' +
    '.screen-today .today-end-line.is-clear { color: var(--ink); }' +
    '.screen-today .today-ask { margin-top: var(--s-32); }' +
    '@media (prefers-reduced-motion: reduce) { .screen-today .today-chev { transition: none; } }' +
    '</style>';

  /* ---------------- the page ---------------- */
  let visit = null;
  const TODAY = {
    title: COPY.title,
    render(data, params) {
      const asked = (params && params[0]) || '';
      const onb = App.state.onb;
      /* A visit is one history entry: a redraw in place keeps it, a page
         change or a reload starts a new one, and the receipts of loops
         closed on the last visit are not shown again. */
      const key = (history.state && history.state.dulyKey) || 'boot';
      if (key !== visit) {
        visit = key;
        App.state['today:shown'] = [];
        App.state['today:numbers'] = false;
        /* Mostly folded: each visit starts with every loop folded to its
           line, and the last visit's receipts folded away. */
        if (L()) {
          L().list({ all: true }).forEach((lp) => {
            App.state['loopOpen:' + lp.id] = false;
            if (lp.receipt && !lp.receipt.folded) L().foldReceipt(lp.id);
          });
        }
      }
      const ctx = {
        noCard: asked === 'no-ead' || !!(onb && onb.ead === 'later'),
        offline: asked === 'offline',
        /* 2026-09-30 - 1 = 2026-09-29, the last run in the offline demo. */
        lastRun: D().addDays(today(), -1),
      };
      ctx.case = ctx.noCard ? null : trackedCase();
      ctx.loops = planLoops(ctx);
      return STYLE + standing(ctx) + nextSlot(ctx) + papersSlot(ctx) + changedSlot(ctx) + endLine(ctx) + askSlot() + C.footer();
    },
    mount(root) {
      root.classList.add('screen-today');
      root.addEventListener('click', (ev) => {
        const num = ev.target.closest('[data-today-numbers]');
        if (num) {
          ev.preventDefault();
          const open = num.getAttribute('aria-expanded') !== 'true';
          App.state['today:numbers'] = open;
          num.setAttribute('aria-expanded', open ? 'true' : 'false');
          const panel = root.querySelector('#today-numbers');
          if (panel) { panel.hidden = !open; if (open) App.play(panel, 'is-arriving'); }
          return;
        }
        /* Confirm your job (shown only while the check-in sits in the
           overflow): bring the check-in into What's next, unfold it where it
           stands and put focus on its first answer. */
        const op = ev.target.closest('[data-today-open]');
        if (op) {
          ev.preventDefault();
          const id = op.dataset.todayOpen;
          App.state['loopOpen:' + id] = true;
          if (L()) L().markSeen(id);
          let box = root.querySelector('[data-loop="' + id.replace(/"/g, '') + '"]');
          if (!box) {
            const shown = App.state['today:shown'] || [];
            if (shown.indexOf(id) < 0) App.state['today:shown'] = [id].concat(shown).slice(0, MAX);
            App.rerender();
            box = document.querySelector('.screen-today [data-loop="' + id.replace(/"/g, '') + '"]');
            if (!box) return;
          }
          const head = box.querySelector('.loop-head');
          const body = box.querySelector('.loop-body');
          if (head) head.setAttribute('aria-expanded', 'true');
          if (body) { body.hidden = false; App.play(body, 'is-arriving'); }
          const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          box.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
          const first = box.querySelector('[data-loop-act]:not([disabled])');
          if (first) first.focus({ preventScroll: true });
          if (App.haptic) App.haptic('select');
          return;
        }
        const seen = ev.target.closest('[data-today-seen]');
        if (seen) {
          ev.preventDefault();
          seen.dataset.todaySeen.split(',').forEach((id) => { App.state['today:seen:' + id] = true; });
          if (App.haptic) App.haptic('select');
          App.rerender();
        }
      });
    },
  };
  window.SCREENS.today = TODAY;
  window.SCREENS.home = TODAY;
})();
