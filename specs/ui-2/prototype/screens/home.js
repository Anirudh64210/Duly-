/* Home (#/home; #/today goes here). Glanceable first, then what needs her:
     1. One quiet line: the date and the status ("On OPT").
     2. Three large figures, side by side, each with its label and one line:
          days without work used, of 90, as of a date (the one ⓘ: how it
          was counted);
          the EAD card valid until, with the days left;
          the next date the engine holds (App.nextDates), what it is and
          how far away.
     3. At most three open loops, folded to one line each
        (App.loops.whatsNext, earliest engine date first), then the overflow
        line to Plan, then a USCIS case only while it is still waiting.
     4. One documents line (how many, on how many devices, backed up), with
        the next to run out only when it is not the card already shown.
     5. A rule change that touches the plan, only when there is one.
     6. The end line, only when it says something.
   Ask is the field at the top of every page (components/ask.js).
   No eyebrows, no section titles: each part says what it is.

   Sample, Priya, today 2026-09-30 (each checked with python3):
     count       Feb 14 to Feb 26, 2026 is 13 days without work; the job
                 check-in waits (Northwind last confirmed 2026-08-28,
                 2026-09-30 - 2026-08-28 = 33 days, at least the 30-day
                 setting), so the count is as of Aug 28: "13 /90, as of Aug 28"
     card        ends 2027-02-13: 2027-02-13 - 2026-09-30 = 136 days left
     next date   start preparing for STEM OPT: 2027-02-13 - 90 = 2026-11-15,
                 less 1 month = 2026-10-15, in 15 days
     loops       check-in (timer 2026-09-30 + 5 business days = 2026-10-07)
                 then STEM OPT (file on or before 2027-02-13, the card end)
     documents   4 I-20s + 3 work + 3 identity + 2 school = 12, on the phone
                 and the MacBook, backed up 9:40 (sample: no sync engine yet);
                 the next to run out is the EAD card, already a figure
     end line    none at first: the check-in is on screen and needs her.
                 After "Still at Northwind Systems" and the STEM OPT steps
                 started: "Nothing in Duly needs you before Oct 15."
   Demo states:
     #/home/offline   the rules and the backup last ran Sep 29
     #/home/no-ead    no EAD card yet: no count and no date from a card the
                      student never added. */
(function () {
  'use strict';

  const e = (s) => C.esc(s);
  const D = () => App.dates;
  const L = () => App.loops;
  const fill = (t, v) => String(t || '').replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? v[k] : m));

  /* Every word on Today, one stable wording each. */
  const COPY = {
    title: 'Home',
    noCard: 'Add your EAD card to count your days.',
    addCard: 'Add your EAD card',
    daysLabel: 'Days without work',
    daysAsOf: 'As of {date}',
    daysUnknown: "Can't tell yet",
    daysUnknownFrom: 'From {date}',
    confirm: 'Confirm your job to count to today',
    cardLabel: 'EAD card valid until',
    stemCardLabel: 'STEM OPT card valid until',
    cardLeft: '{n} left',
    nextLabel: 'Next date',
    nextNone: 'None ahead',
    inDays: 'in {n}',
    nextEmpty: 'Nothing open right now.',
    more: '{more}. All of them are in Plan',
    caseTitle: 'USCIS: {title}',
    papersLine: '{n} documents on {devices} devices · backed up {time}',
    papersLineOff: '{n} documents on {devices} devices · not backed up since {date}',
    runOut: 'Next to run out: {what}',
    touch: '{n} rule change touches your plan: {todo}',
    touchMany: '{n} rule changes touch your plan: {todo}',
    touchRead: 'Read the update',
    touchSeen: 'Mark seen and fold this away',
    endClear: 'Nothing in Duly needs you before {date}.',
    endClearNow: 'Nothing in Duly needs you now.',
    endJob: 'Not confirmed since {date}: your job at {employer}',
    endPetition: 'Not confirmed since {date}: your H-1B petition',
    endCount: "Can't tell yet: days without work from {date}",
    endRules: 'Not checked since {date}: rules',
    endSync: 'Not backed up since {date}: documents',
    endReminders: 'Reminders are off on this phone.',
    endJobAct: 'Confirm your job',
    endPetitionAct: 'Update the petition status',
    endCountAct: 'Add your hours in WorkBook',
    endSettingsAct: 'Open Settings',
    endOnline: 'Checked again once you are online.',
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

  /* ---------------- the line and the figures ---------------- */
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

  /* The one quiet line above the figures: the date and the status. On a
     tablet or phone the top bar carries the date, so only the status shows. */
  function topLine(r) {
    return '<p class="home-line t-meta num"><span class="home-date">' + e(App.data.today.long) + ' · </span>' + e(statusWord(r)) + '</p>';
  }

  /* The card that is in force today: the STEM OPT card once it runs, else
     the OPT card. */
  function cardNow(r) {
    const t = today();
    const s = r.stem && r.stem.card;
    if (s && D().okIso(s.until) && s.from <= t && t <= s.until) return { until: s.until, label: COPY.stemCardLabel };
    if (r.opt && D().okIso(r.opt.until) && r.opt.until >= t) return { until: r.opt.until, label: COPY.cardLabel };
    return null;
  }

  /* A date as a figure: "Feb 13" large, its year small after it when it is
     not this year. */
  function figDate(iso) {
    const parts = fmt(iso).split(', ');
    return e(parts[0]) + (parts[1] ? '<small>' + e(parts[1]) + '</small>' : '');
  }
  function figure(p) {
    return '<div class="figure">' +
      '<p class="' + C.cls('figure-value', p.text && 'is-text') + '">' + p.value + '</p>' +
      '<p class="figure-label">' + e(p.label) + (p.src || '') + '</p>' +
      (p.meta ? '<p class="' + C.cls('figure-meta', p.act && 'is-act') + '">' + p.meta + '</p>' : '') +
      '</div>';
  }

  function figures(ctx) {
    const r = App.record();
    if (ctx.noCard) {
      return topLine(r) + '<section class="home-figures" aria-labelledby="hero-title">' +
        '<h1 class="t-big" id="hero-title" tabindex="-1">' + e(COPY.noCard) + '</h1>' +
        '<div class="hero-actions">' + C.button({ label: COPY.addCard, kind: 'primary', href: '#/documents/add' }) + '</div></section>';
    }
    const t = today();
    const out = [];
    /* 1. Days without work, of the limit, as of a date. */
    const it = App.compute()['unemployment.used'];
    const u = App.unemployment ? App.unemployment() : {};
    const limit = App.RULE.unemploymentLimit;
    let src = '';
    if (it && App.data.sources && App.data.sources.unemployment) {
      src = C.source(Object.assign({}, App.data.sources.unemployment, u.counted ? { counted: [u.counted] } : {}), { inline: true });
    }
    if (it && it.n != null) {
      const held = it.asOf && it.asOf < t;
      const ci = held ? offScreenCheckin(ctx) : null;
      out.push(figure({
        value: e(String(it.n)) + '<small>/' + e(String(limit)) + '</small>',
        label: COPY.daysLabel, src: src,
        meta: ci ? '<button type="button" class="link" data-today-open="' + e(ci.id) + '">' + e(COPY.confirm) + '</button>'
          : e(fill(COPY.daysAsOf, { date: keep(fmt(it.asOf)) })),
      }));
    } else if (it) {
      out.push(figure({ value: e(COPY.daysUnknown), text: true, label: COPY.daysLabel, src: src,
        meta: e(fill(COPY.daysUnknownFrom, { date: keep(fmt(unknownFrom() || it.asOf)) })) }));
    }
    /* 2. The card in force: valid until, and the days left.
       2027-02-13 - 2026-09-30 = 136 days. */
    const card = cardNow(r);
    if (card) {
      out.push(figure({
        value: figDate(card.until),
        label: card.label,
        meta: e(fill(COPY.cardLeft, { n: plural(D().daysBetween(t, card.until), 'day') })),
      }));
    }
    /* 3. The next date the engine holds, what it is and how far away. */
    const nd = (App.nextDates ? App.nextDates() : [])[0];
    out.push(nd ? figure({
      value: figDate(nd.iso),
      label: COPY.nextLabel,
      meta: e(nd.title.replace(/\.$/, '')) + ' · ' + e(nd.days === 0 ? 'today' : (nd.days === 1 ? 'tomorrow' : fill(COPY.inDays, { n: plural(nd.days, 'day') }))),
    }) : figure({ value: e(COPY.nextNone), text: true, label: COPY.nextLabel }));
    return topLine(r) + '<section class="home-figures" aria-labelledby="hero-title">' +
      '<h1 class="sr-only" id="hero-title" tabindex="-1">' + e(COPY.title) + '</h1>' +
      '<div class="figures">' + out.join('') + '</div></section>';
  }
  /* The first day the count cannot be read, from the engine's projection. */
  function unknownFrom() {
    const u = App.compute()['unemployment.unknown'];
    return u && u.iso ? u.iso : null;
  }

  /* ---------------- the open loops ---------------- */
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
    /* Only a case still waiting earns a line on Home; a decided one is in
       Plan, USCIS status. */
    return waiting.length ? waiting[waiting.length - 1] : null;
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
    if (!L() || !C.loop) return '<p class="t-lead home-empty">' + e(COPY.nextEmpty) + '</p>';
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
      ? '<div class="loops today-loops" aria-label="Open now">' + shown.map(loopHtml).join('') + '</div>'
      : '<p class="t-lead home-empty">' + e(COPY.nextEmpty) + '</p>';
    const kase = ctx.case ? '<div class="loops today-loops today-case-row">' + caseLine(ctx.case) + '</div>' : '';
    return '<section class="home-next" aria-label="Open now">' + loops + more + kase + '</section>';
  }

  /* ---------------- the documents line ---------------- */
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
    /* The next to run out, unless it is the card the figures already show. */
    const card = cardNow(App.record());
    const nx = w && w.next && !(ctx.noCard && w.next.key === 'ead') && !(card && w.next.iso === card.until) ? w.next : null;
    return '<div class="home-docs">' + C.list([C.row({ key: 'today-papers', title: title, meta: nx ? fill(COPY.runOut, { what: nx.text }) : null, href: '#/documents' })], { accordion: false, label: 'Documents' }) + '</div>';
  }

  /* ---------------- a rule change that touches the plan ---------------- */
  /* A published update touches the plan when it changed a step for this
     student (updates item.changed). Seen ones fold away. */
  function touching() {
    const items = ((App.data.updates || {}).items || []);
    return items.filter((u) => (u.changed || []).some((c) => c && c.title) && !App.state['today:seen:' + u.id]);
  }
  function changedSlot() {
    const t = touching();
    if (!t.length) return '';
    const todo = C.todoShort(C.affectsFor(t[0]).todo) || '';
    const title = fill(t.length === 1 ? COPY.touch : COPY.touchMany, { n: t.length, todo: todo.charAt(0).toLowerCase() + todo.slice(1) });
    const body = t.map((u) => '<p class="t-row">' + e(u.title) + '</p>' +
      '<ul class="today-changed">' + u.changed.filter((c) => c && c.title).map((c) => '<li>' + e(c.title + (c.change ? ': ' + c.change : '')) + '</li>').join('') + '</ul>' +
      '<p>' + C.link({ label: COPY.touchRead, href: '#/updates/' + u.id }) + '</p>').join('') +
      '<div class="btn-group"><button type="button" class="btn btn-pill" data-today-seen="' + e(t.map((u) => u.id).join(',')) + '">' + e(COPY.touchSeen) + '</button></div>';
    return '<div class="home-changed">' + C.list([C.row({ key: 'today-touch', title: title, content: body })], { label: 'Rule changes' }) + '</div>';
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

  /* Layout only. Sizes from system.css; spacing from the scale. */
  const STYLE = '<style>' +
    '.screen-home .home-line { margin: 0; color: var(--ink-2); }' +
    '@media (max-width: 960px) { .screen-home .home-date { display: none; } }' +
    '.screen-home .home-figures > h1.t-big { margin-top: var(--s-4); }' +
    '.screen-home .home-figures > .hero-actions { margin: var(--s-16) 0 var(--s-24); }' +
    '.screen-home .figure-meta .link { font-weight: 500; text-align: left; }' +
    '.screen-home .today-tag { margin-left: var(--s-4); vertical-align: baseline; }' +
    '.screen-home .today-case .loop-head { color: var(--ink); text-decoration: none; }' +
    '.screen-home .today-case .chev { transform: none; }' +
    '.screen-home .home-empty { margin: 0; }' +
    '.screen-home .loop-more + .today-case-row { margin-top: var(--s-12); }' +
    '.screen-home .today-loops + .today-case-row .loop { border-top: 0; }' +
    /* The documents line and a rule change close the same list as the
       loops: same edges, one hairline between. */
    '.screen-home .home-docs .item, .screen-home .home-changed .item { margin: 0; border-top: 0; }' +
    '.screen-home .home-docs .item > .row, .screen-home .home-changed .item > .row { padding-left: 0; padding-right: 0; border-radius: 0; }' +
    '.screen-home .home-docs .item > .row:hover, .screen-home .home-changed .item > .row:hover { background: none; }' +
    '.screen-home .home-docs .row:hover .row-title { color: var(--accent); }' +
    '.screen-home .home-empty + .home-docs .item { border-top: 1px solid var(--hairline); }' +
    '.screen-home .today-changed { margin: var(--s-4) 0 var(--s-8); padding-left: var(--s-16); }' +
    '.screen-home .today-end { margin-top: var(--s-24); display: flex; flex-direction: column; gap: var(--s-4); }' +
    '.screen-home .today-end-line { margin: 0; font-size: var(--t-small); line-height: var(--lh-small); color: var(--ink-2); overflow-wrap: anywhere; }' +
    '.screen-home .today-end-line .btn-text { padding: 0; min-height: 0; vertical-align: baseline; }' +
    '.screen-home .today-end-line.is-clear { color: var(--ink-2); }' +
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
      return STYLE + figures(ctx) + nextSlot(ctx) + papersSlot(ctx) + changedSlot() + endLine(ctx) + C.footer();
    },
    mount(root) {
      root.classList.add('screen-home');
      root.addEventListener('click', (ev) => {
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
            box = document.querySelector('.screen-home [data-loop="' + id.replace(/"/g, '') + '"]');
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
