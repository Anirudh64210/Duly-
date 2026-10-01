/* Home (#/home; #/today and #/record go here). Round 7, rule 3: a fixed
   format of light rounded cards across the content width (about 1040px),
   each delivering something and linking to its own page:
     1. The greeting, by the time of day, and on the right, quietly, the
        status and the date ("On OPT · Wed, Sep 30").
     2. Three big number cards, side by side, each a figure, one short label
        and one quiet line:
          days without work used, of 90, as of a date (Home's one ⓘ: how it
          was counted);
          the EAD card valid until, with the days left;
          the next date the engine holds (App.nextDates), what it is and how
          far away.
     3. Ask (Home only, rule 4), the full width, below the numbers.
     4. A two-column grid of four cards (one column on a phone):
          Next          at most three lines, each a title and a date, that
                        open the item in Plan, where it lives in full
                        (rule 1); "See plan"
          Documents     the three most used, each one tap to its saved copy;
                        "All documents"
          USCIS status  each case, its status and as-of date, to its page
          Updates       the latest two headlines, date and the For you line
     5. Only when something cannot be told now: one quiet line (offline,
        reminders off on this device, a loop that cannot tell yet).
   No loop is drawn in full here: one place per item.

   Sample, Priya, today 2026-09-30 (each checked with python3):
     count       Feb 14 to Feb 26, 2026 is 13 days without work; the job
                 check-in waits (Northwind last confirmed 2026-08-28), so the
                 count is as of Aug 28: "13 / 90, As of Aug 28"
     card        ends 2027-02-13: 2027-02-13 - 2026-09-30 = 136 days left
     next date   start preparing for STEM OPT: 2027-02-13 - 90 = 2026-11-15,
                 less 1 month = 2026-10-15, in 15 days
     Next        the check-in ("Still at Northwind Systems, about 40 hours a
                 week?", today), then "STEM OPT: start preparing · Oct 15"
     Documents   I-20 · OPT, EAD card, I-797 approval notice
     USCIS       OPT work permit, Approved, Dec 20, 2025; STEM OPT work
                 permit, Not filed yet
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

  /* Every word on Home, one stable wording each. */
  const COPY = {
    title: 'Home',
    morning: 'Good morning, {name}',
    afternoon: 'Good afternoon, {name}',
    evening: 'Good evening, {name}',
    noCard: 'Add your EAD card to count your days',
    addCard: 'Add your EAD card',
    daysLabel: 'Days without work',
    daysAsOf: 'As of {date}',
    daysUnknown: "Can't tell yet",
    daysUnknownFrom: 'From {date}',
    cardLabel: 'EAD valid until',
    stemCardLabel: 'STEM OPT card valid until',
    cardLeft: '{n} left',
    nextNone: 'None ahead',
    nextNoneLabel: 'Next date',
    inDays: 'In {n}',
    ask: 'Ask about your situation',
    next: 'Next',
    seePlan: 'See plan',
    nextEmpty: 'Nothing open right now.',
    today: 'Today',
    stemPrepare: 'STEM OPT: start preparing',
    docs: 'Documents',
    allDocs: 'All documents',
    open: 'Open',
    uscis: 'USCIS status',
    allCases: 'All cases',
    updates: 'Updates',
    allUpdates: 'All updates',
    noUpdates: 'No news yet.',
    endRules: 'Rules not checked since {date}. Checked again once you are online.',
    endSync: 'Documents not backed up since {date}.',
    endReminders: 'Reminders are off on this device.',
    endSettingsAct: 'Open Settings',
  };

  const plural = (n, one) => n + ' ' + one + (n === 1 ? '' : 's');
  const today = () => App.data.today.iso;
  const fmt = (iso) => D().fmt(iso);
  /* A date never breaks across lines ("Aug 28" stays together). */
  const keep = (s) => String(s || '').replace(/ /g, ' ');
  const lowerFirst = (s) => (/^[A-Z][a-z]/.test(s || '') ? s.charAt(0).toLowerCase() + s.slice(1) : s);

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

  /* A loop that moved: the STEM OPT answer follows its loop. */
  document.addEventListener('duly:change', (ev) => {
    const d = ev.detail || {};
    if (d.kind !== 'loop' || !L()) return;
    const lp = L().get(d.key);
    if (!lp) return;
    if (lp.kind === 'stem-filing' && lp.state !== 'closed' && lp.state !== 'dismissed' && lp.step !== 'facts' && App.stemIntent() !== 'yes') {
      App.state.stemIntent = 'yes';
    }
  });

  /* ---------------- 1. the greeting ---------------- */
  function statusWord(r) {
    const t = today();
    const s = r.stem && r.stem.card;
    if (s && s.from <= t && t <= s.until) return 'On STEM OPT';
    if (r.opt && r.opt.from <= t && t <= r.opt.until) return 'On OPT';
    return (App.data.home && App.data.home.eyebrow) || 'F-1';
  }
  /* "Wed, Sep 30", read from the ISO date, never through a time zone. */
  const WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  function shortDay(iso) {
    const w = new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10))).getUTCDay();
    return WEEK[w] + ', ' + fmt(iso);
  }
  /* The greeting follows the device's own hour: before noon morning, before
     six in the evening afternoon, then evening. */
  function greeting() {
    const h = new Date().getHours();
    const st = App.data.student || {};
    const name = st.first || String(st.name || '').split(' ')[0];
    return fill(h < 12 ? COPY.morning : (h < 18 ? COPY.afternoon : COPY.evening), { name: name });
  }
  function hello(r) {
    return '<header class="home-hello">' +
      '<h1 class="home-greet" id="hero-title" tabindex="-1">' + e(greeting()) + '</h1>' +
      '<p class="home-status num">' + e(statusWord(r)) + '<span class="home-date"> · ' + e(shortDay(today())) + '</span></p>' +
      '</header>';
  }

  /* ---------------- 2. the three number cards ---------------- */
  /* The card that is in force today: the STEM OPT card once it runs, else
     the OPT card. */
  function cardNow(r) {
    const t = today();
    const s = r.stem && r.stem.card;
    if (s && D().okIso(s.until) && s.from <= t && t <= s.until) return { until: s.until, label: COPY.stemCardLabel };
    if (r.opt && D().okIso(r.opt.until) && r.opt.until >= t) return { until: r.opt.until, label: COPY.cardLabel };
    return null;
  }
  /* A date as a figure: "Feb 13" large, its year smaller after it when it
     is not this year. */
  function figDate(iso) {
    const parts = fmt(iso).split(', ');
    return e(parts[0]) + (parts[1] ? ',<small>' + e(parts[1]) + '</small>' : '');
  }
  /* The ⓘ stays with the label's last word, so it never sits alone on a
     line. */
  function labelWithMark(label, src) {
    if (!src) return e(label);
    const at = String(label).lastIndexOf(' ');
    return e(label.slice(0, at + 1)) + '<span class="nowrap">' + e(label.slice(at + 1)) + src + '</span>';
  }
  function figure(p) {
    return '<div class="' + C.cls('home-card fig-card', p.cls) + '">' +
      '<p class="' + C.cls('figure-value', p.text && 'is-text') + '">' + p.value + '</p>' +
      '<p class="figure-label">' + labelWithMark(p.label, p.src) + '</p>' +
      (p.meta ? '<p class="figure-meta">' + p.meta + '</p>' : '') +
      '</div>';
  }
  /* The first day the count cannot be read, from the engine's projection. */
  function unknownFrom() {
    const u = App.compute()['unemployment.unknown'];
    return u && u.iso ? u.iso : null;
  }
  function figures(ctx) {
    const r = App.record();
    const t = today();
    const out = [];
    if (ctx.noCard) {
      out.push('<div class="home-card fig-card is-add"><p class="figure-label">' + e(COPY.noCard) + '</p>' +
        '<div>' + C.button({ label: COPY.addCard, kind: 'primary', href: '#/documents/add' }) + '</div></div>');
    } else {
      /* 1. Days without work, of the limit, as of a date. The one ⓘ on Home. */
      const it = App.compute()['unemployment.used'];
      const u = App.unemployment ? App.unemployment() : {};
      const limit = App.RULE.unemploymentLimit;
      let src = '';
      if (it && App.data.sources && App.data.sources.unemployment) {
        src = C.source(Object.assign({}, App.data.sources.unemployment, u.counted ? { counted: [u.counted] } : {}), { inline: true });
      }
      if (it && it.n != null) {
        out.push(figure({
          value: e(String(it.n)) + '<small>/ ' + e(String(limit)) + '</small>',
          label: COPY.daysLabel, src: src, cls: 'fig-days',
          meta: e(fill(COPY.daysAsOf, { date: keep(fmt(it.asOf)) })),
        }));
      } else if (it) {
        out.push(figure({ value: e(COPY.daysUnknown), text: true, label: COPY.daysLabel, src: src, cls: 'fig-days',
          meta: e(fill(COPY.daysUnknownFrom, { date: keep(fmt(unknownFrom() || it.asOf)) })) }));
      }
      /* 2. The card in force: valid until, and the days left.
         2027-02-13 - 2026-09-30 = 136 days. */
      const card = cardNow(r);
      if (card) {
        out.push(figure({
          value: figDate(card.until),
          label: card.label, cls: 'fig-card-date',
          meta: e(fill(COPY.cardLeft, { n: plural(D().daysBetween(t, card.until), 'day') })),
        }));
      }
    }
    /* 3. The next date the engine holds, what it is and how far away. */
    const nd = (App.nextDates ? App.nextDates() : [])[0];
    out.push(nd ? figure({
      value: figDate(nd.iso),
      label: nd.title.replace(/\.$/, ''), cls: 'fig-next',
      meta: e(nd.days === 0 ? COPY.today : (nd.days === 1 ? 'Tomorrow' : fill(COPY.inDays, { n: plural(nd.days, 'day') }))),
    }) : figure({ value: e(COPY.nextNone), text: true, label: COPY.nextNoneLabel }));
    return '<section class="home-figures" aria-label="Your numbers">' + out.join('') + '</section>';
  }

  /* ---------------- 3. Ask ---------------- */
  function askBox() {
    return '<div class="home-ask">' + C.askBar({ placeholder: COPY.ask }) + '</div>';
  }

  /* ---------------- 4. the four cards ---------------- */
  function card(key, title, link, body) {
    return '<section class="home-card hc" aria-labelledby="hc-' + key + '">' +
      '<div class="hc-head"><h2 class="hc-title" id="hc-' + key + '">' + e(title) + '</h2>' +
      (link ? '<a class="hc-link" href="' + e(link.href) + '">' + e(link.label) + '</a>' : '') + '</div>' +
      body + '</section>';
  }
  /* One row: a title and, on the right, its date or status, on one line. */
  function rowHtml(p) {
    const inner = '<span class="hc-row-title">' + e(p.title) + '</span>' +
      (p.meta ? '<span class="hc-row-meta num">' + e(p.meta) + '</span>' : '') +
      (p.sub ? '<span class="hc-row-sub">' + e(p.sub) + '</span>' : '');
    const cls = C.cls('hc-row', p.sub && 'has-sub');
    if (p.button) return '<li><button type="button" class="' + cls + '"' + C.attrs(p.attrs || {}) + '>' + inner + '</button></li>';
    return '<li><a class="' + cls + '" href="' + e(p.href) + '"' + C.attrs(p.attrs || {}) + '>' + inner + '</a></li>';
  }
  const rows = (list) => '<ul class="hc-rows">' + list.join('') + '</ul>';
  const empty = (text) => '<p class="hc-empty">' + e(text) + '</p>';

  /* Next. The loops open in Plan, earliest engine date first
     (App.loops.whatsNext), at most three. Each opens in Plan, unfolded. */
  function nextIsoOf(lp) {
    const s = L().schedule({ only: lp.id }).reminders[0];
    return (s && s.iso) || lp.timerAt || null;
  }
  function nextRow(lp) {
    const v = L().view(lp);
    const b = L().bind(lp);
    const t = today();
    /* The loop's own short name, or what it asks next ("Still at
       Northwind Systems?"); the full question is in Plan. */
    let title = v.seen.next ? v.seen.next.charAt(0).toUpperCase() + v.seen.next.slice(1) : v.title;
    let date = null;
    if (lp.kind === 'stem-filing') {
      /* Before the training plan is signed, the line is the date to start
         preparing: 2026-11-15 - 1 month = 2026-10-15. */
      const prep = b.iso && b.iso.prepare;
      if ((lp.step === 'facts' || lp.step === 'i983') && D().okIso(prep) && prep >= t) {
        title = COPY.stemPrepare;
        date = fmt(prep);
      } else {
        title = 'STEM OPT: ' + lowerFirst(v.seen.next || (v.step && v.step.title) || '');
      }
    }
    if (!date) {
      if (v.seen.kind === 'needs' && !v.seen.next) date = COPY.today;
      else { const iso = nextIsoOf(lp); date = iso ? fmt(iso) : null; }
    }
    return rowHtml({ title: title, meta: date, href: '#/plan', attrs: { 'data-home-loop': lp.id } });
  }
  /* Then, while there is room, the next dates the engine holds that no line
     above already says (App.nextDates): Sep 30, the STEM OPT window opens
     2027-02-13 - 90 = 2026-11-15. The card's end is already a number above,
     so it is not said again. */
  function nextCard(ctx) {
    const loops = L() ? L().whatsNext({ max: 99 }).loops.filter((lp) => !(L().def(lp.kind) || {}).private && !(ctx.noCard && lp.kind === 'stem-filing')).slice(0, 3) : [];
    const card0 = cardNow(App.record());
    const fig = (App.nextDates ? App.nextDates() : [])[0];
    /* One place per item (Round 7 rule 1): a line whose date is already the
       big "next date" number above is not said again here. */
    const list = loops.map(nextRow).filter((html) => !(fig && html.indexOf('>' + fmt(fig.iso) + '<') >= 0));
    const said = list.join('');
    (App.nextDates ? App.nextDates() : []).forEach((d) => {
      /* Next holds what is due soon. Document expiry dates live in the
         Documents watch, and anything more than 120 days out is not next. */
      if (/visa|passport|ends \(sample/i.test(d.title) || d.days > 120) return;
      if (list.length >= 3 || (card0 && d.iso === card0.until) || (fig && d.iso === fig.iso && list.length) || said.indexOf('>' + fmt(d.iso) + '<') >= 0) return;
      list.push(rowHtml({ title: d.title.replace(/\.$/, ''), meta: fmt(d.iso), href: '#/plan' }));
    });
    return card('next', COPY.next, { label: COPY.seePlan, href: '#/plan' }, list.length ? rows(list) : empty(COPY.nextEmpty));
  }

  /* Documents: the three most used, each one tap to its saved copy. */
  function docsCard() {
    const docs = (App.mostUsedDocuments ? App.mostUsedDocuments() : []).slice(0, 3);
    const list = docs.map((d) => rowHtml({ title: d.title, meta: COPY.open, button: true, attrs: { 'data-doc-open': d.id, 'aria-label': 'Open your copy of the ' + d.title } }));
    return card('docs', COPY.docs, { label: COPY.allDocs, href: '#/documents' }, list.length ? rows(list) : empty('No documents yet.'));
  }

  /* USCIS status: every case, what the student last saw on USCIS, with its
     date. A receipt or a new card saved through the STEM OPT loop shows on
     its case (screens/plan.js keeps the case in step with the loop). */
  function cases() {
    const apps = (App.data.applications || {}).items || [];
    return apps.map((a) => Object.assign({}, a, { receipt: App.state['receipt:' + a.id] || a.receipt, status: App.state['status:' + a.id] || a.status }));
  }
  function uscisCard() {
    const list = cases().map((a) => {
      const notFiled = /^not filed/i.test(a.status || '');
      return rowHtml({ title: a.title, meta: notFiled ? a.status : a.status + (a.asOf ? ' · ' + a.asOf : ''), href: '#/uscis/' + a.id });
    });
    return card('uscis', COPY.uscis, { label: COPY.allCases, href: '#/uscis' }, list.length ? rows(list) : empty('No cases yet.'));
  }

  /* Updates: the latest two headlines, each with its date and the For you
     line (C.affectsFor, the same answer the article gives). */
  function updatesCard() {
    const items = ((App.data.updates || {}).items || []).slice(0, 2);
    const list = items.map((u) => {
      const fy = C.affectsFor(u).short;
      return rowHtml({ title: u.title, sub: [u.date, fy].filter(Boolean).join(' · '), href: '#/updates/' + u.id });
    });
    return card('updates', COPY.updates, { label: COPY.allUpdates, href: '#/updates' }, list.length ? rows(list) : empty(COPY.noUpdates));
  }

  /* ---------------- 5. what cannot be told now ---------------- */
  function notes(ctx) {
    const lines = [];
    if (L()) L().list().filter((lp) => lp.cantTell && !(L().def(lp.kind) || {}).private).forEach((lp) => lines.push(e(L().seen(lp).line)));
    if (ctx.offline) {
      lines.push(e(fill(COPY.endRules, { date: fmt(ctx.lastRun) })));
      lines.push(e(fill(COPY.endSync, { date: fmt(ctx.lastRun) })));
    }
    const on = L() ? L().schedule().on : true;
    if (!on) lines.push(e(COPY.endReminders) + ' ' + C.link({ label: COPY.endSettingsAct, href: '#/settings' }));
    return lines.length ? '<div class="home-notes">' + lines.map((l) => '<p>' + l + '</p>').join('') + '</div>' : '';
  }

  /* Layout only. Sizes from system.css; spacing from the scale. */
  const STYLE = '<style>' +
    '.screen-home { --card-pad: 20px; }' +
    '.screen-home .home-hello { display: flex; align-items: baseline; justify-content: space-between; gap: var(--s-16); margin: 0 0 var(--s-16); }' +
    '.screen-home .home-greet { margin: 0; font-size: var(--t-medium); line-height: var(--lh-medium); font-weight: 600; letter-spacing: -.01em; color: var(--ink); }' +
    '.screen-home .home-greet:focus-visible { outline: none; }' +
    '.screen-home .home-status { margin: 0; font-size: var(--t-small); line-height: var(--lh-meta); color: var(--ink-3); white-space: nowrap; }' +
    '.screen-home .home-card { background: var(--surface); border: 1px solid var(--hairline); border-radius: 16px; padding: var(--card-pad); min-width: 0; }' +
    '.screen-home .home-figures { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--s-16); }' +
    '.screen-home .fig-card { display: flex; flex-direction: column; gap: var(--s-4); }' +
    '.screen-home .fig-card .figure-value { margin: 0 0 var(--s-4); }' +
    '.screen-home .fig-card .figure-value small { font-size: var(--t-medium); }' +
    '.screen-home .fig-card .figure-label { margin: 0; display: block; }' +
    '.screen-home .figure-label .nowrap { white-space: nowrap; }' +
    '.screen-home .fig-card .figure-label .inline-src { margin-left: var(--s-8); vertical-align: -2px; }' +
    '.screen-home .fig-card .figure-meta { margin: 0; }' +
    '.screen-home .fig-card.is-add { justify-content: space-between; gap: var(--s-12); }' +
    '.screen-home .home-ask { margin: var(--s-16) 0; }' +
    '.screen-home .home-ask .askbar { width: 100%; max-width: none; margin: 0; }' +
    '.screen-home .home-ask .askbar-input { height: 48px; border-radius: 16px; padding-left: var(--card-pad); background: var(--surface); border-color: var(--hairline); }' +
    '.screen-home .home-ask .askbar-input:hover { border-color: var(--control-border); }' +
    '.screen-home .home-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--s-16); align-items: stretch; }' +
    '.screen-home .hc { display: flex; flex-direction: column; padding-bottom: var(--s-8); }' +
    '.screen-home .hc-head { display: flex; align-items: baseline; justify-content: space-between; gap: var(--s-12); margin-bottom: var(--s-4); }' +
    '.screen-home .hc-title { margin: 0; font-size: var(--t-small); line-height: var(--lh-small); font-weight: 600; color: var(--ink); }' +
    '.screen-home .hc-link { font-size: var(--t-small); line-height: var(--lh-meta); font-weight: 500; color: var(--accent); white-space: nowrap; }' +
    '.screen-home .hc-link:hover { color: var(--accent-hover); }' +
    '.screen-home .hc-rows { list-style: none; margin: 0 calc(-1 * var(--s-12)); padding: 0; }' +
    '.screen-home .hc-rows > li { position: relative; }' +
    '.screen-home .hc-rows > li + li::before { content: ""; position: absolute; top: 0; left: var(--s-12); right: var(--s-12); height: 1px; background: var(--hairline-inner); }' +
    '.screen-home .hc-row { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; column-gap: var(--s-16); width: 100%; min-height: 44px;' +
      ' padding: var(--s-12); background: none; border: 0; border-radius: var(--r-field); font: inherit; text-align: left; color: var(--ink); text-decoration: none; cursor: pointer; }' +
    '.screen-home .hc-row:hover { background: var(--row-hover); }' +
    '.screen-home button.hc-row .hc-row-meta { color: var(--accent); font-weight: 500; }' +
    '.screen-home .hc-row:focus-visible { outline: none; box-shadow: var(--focus-ring); }' +
    '.screen-home .hc-row-title { flex: 1 1 0; min-width: 0; font-size: var(--t-small); line-height: var(--lh-small); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }' +
    '.screen-home .hc-row-meta { flex: 0 1 auto; min-width: 0; max-width: 55%; font-size: var(--t-small); line-height: var(--lh-small); color: var(--ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }' +
    '.screen-home .hc-row.has-sub { flex-direction: column; align-items: flex-start; }' +
    '.screen-home .hc-row.has-sub .hc-row-title { flex: none; width: 100%; white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }' +
    '.screen-home .hc-row-sub { font-size: var(--t-small); line-height: var(--lh-meta); color: var(--ink-3); }' +
    '.screen-home .hc-empty { margin: var(--s-8) 0; font-size: var(--t-small); line-height: var(--lh-small); color: var(--ink-3); }' +
    '.screen-home .home-notes { margin-top: var(--s-16); display: flex; flex-direction: column; gap: var(--s-4); }' +
    '.screen-home .home-notes p { margin: 0; font-size: var(--t-small); line-height: var(--lh-meta); color: var(--ink-2); }' +
    '@media (max-width: 960px) { .screen-home .home-date { display: none; } }' +
    '@media (max-width: 760px) { .screen-home .home-grid { grid-template-columns: minmax(0, 1fr); } }' +
    '@media (max-width: 640px) {' +
    '  .screen-home { --card-pad: 16px; }' +
    '  .screen-home .home-figures { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--s-12); }' +
    /* The card date is the widest figure: it takes the full row under the
       two short ones. */
    '  .screen-home .home-figures > .fig-card-date { grid-column: 1 / -1; order: 2; }' +
    '  .screen-home .home-ask { margin: var(--s-12) 0; }' +
    '  .screen-home .home-grid { gap: var(--s-12); }' +
    '  .screen-home .fig-card .figure-value small { font-size: var(--t-small); }' +
    '}' +
    '</style>';

  /* ---------------- the page ---------------- */
  const HOME = {
    title: COPY.title,
    wide: true,
    render(data, params) {
      const asked = (params && params[0]) || '';
      const onb = App.state.onb;
      const ctx = {
        noCard: asked === 'no-ead' || !!(onb && onb.ead === 'later'),
        offline: asked === 'offline',
        /* 2026-09-30 - 1 = 2026-09-29, the last run in the offline demo. */
        lastRun: D().addDays(today(), -1),
      };
      return STYLE + hello(App.record()) + figures(ctx) + askBox() +
        '<div class="home-grid">' + nextCard(ctx) + docsCard() + uscisCard() + updatesCard() + '</div>' +
        notes(ctx) + C.footer();
    },
    mount(root) {
      root.classList.add('screen-home');
      root.addEventListener('click', (ev) => {
        /* A Next line opens its item in Plan, unfolded, in view. */
        const nx = ev.target.closest('[data-home-loop]');
        if (nx) {
          const id = nx.dataset.homeLoop;
          App.state['loopOpen:' + id] = true;
          if (L()) L().markSeen(id);
          App.state['plan:focus'] = id;
        }
      });
    },
  };
  window.SCREENS.today = HOME;
  window.SCREENS.home = HOME;
})();
