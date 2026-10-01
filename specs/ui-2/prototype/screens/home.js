/* Home (Round 4). Calm, one breath, more value than a tracker:
     1. the hero: where you stand, the why behind an ⓘ, then the promise as
        one quiet line under it (said once here, once on Welcome);
     2. the three numbers. Unemployment days come from App.unemployment(), so
        Home, Timeline and Your profile never disagree. The count shows with
        "As of Sep 30" only once the EAD card is on file and the job list is
        answered. With a job on file the tile asks "Northwind Systems, since
        Feb 27, 2026. Is that every job?" in place; with none, the tile shows
        "Add your job to count these days" and the one question lives in Your
        next move. The job is asked in one place only;
     3. Your next move: one line, its date and one action;
     4. News: big skimmable headlines, each with one line: its date and the
        "for you" answer, opening the article in News; then the small "Rules
        checked Sep 30" line.
   Demo states:
     #/home          job on file, job list confirmed (13 days)
     #/home/ask      job on file, job list not confirmed yet (the tile asks)
     #/home/no-job   no job on file; "No job yet" counts every day since the
                     card start (229 of 90). Shown as a fact with its source,
                     never red, and the next move becomes the email to the DSO.
     #/home/no-ead   no EAD card yet. Onboarding with the card left for later
                     lands here too, whatever the route says: no count and no
                     date is shown from a card the student never added.
   Round 5, note 1: the STEM OPT choice is answered here, in place. Decide
   opens the row with Yes, No and Not sure. Yes shows the three dates as the
   small strip (C.timeline, compact) and See all steps; No and Not sure fold the row back with one quiet line. The answer is
   App.setStemIntent(), the same one Next steps reads, with a light tap. The
   height eases between states, so nothing below jumps, and nothing leaves
   Home unless the student taps See all steps. Change reopens the choices
   without clearing the answer; Escape or Decide folds them away again.
   VALUE-2, feature 1: the next move carries the file-by date, the earliest
   of the recommendation limit and the card or program limit, from
   App.fileBy('stem'), with the ⓘ listing each limit and marking the one
   that sets the day. For Priya (today 2026-09-30, checked with python3):
     card ends 2027-02-13                        sets the day
     window opens 2027-02-13 - 90 = 2026-11-15   never a candidate
     recommendation + 60: no date yet
   With no recommendation date the card end is only one limit, and the 60-day
   limit will almost always come first (recommended 2026-12-01 + 60 =
   2027-01-30), so no file-by date shows yet: the line reads "Add the date
   your school recommends you to see your exact last day to file", as Next
   steps does. The move row carries one date only. A receipt stops the
   clock (no line); a passed day shows the date only, and the ⓘ sends the
   question to the DSO.
   VALUE-2, feature 5: at most one check-in, under the next move, only while
   the job count runs and the job list is answered (never on the ask, no-job
   or no-EAD demos, so the job is asked in one place). For Priya: Northwind
   last confirmed 2026-08-28; 2026-09-30 - 2026-08-28 = 33 days, at least
   the 30-day setting, so "Still at Northwind Systems, about 40 hours a
   week?" shows, and the count reads "As of Aug 28" until it is answered.
   The word Duly does not appear in this screen's text. */
(function () {
  'use strict';

  /* Layout only. Type sizes come from system.css; spacing from the scale. */
  const STYLE = '<style>' +
    '.screen-home .metric-value-row { display: block; }' +
    '.screen-home .metric-value { display: block; margin-bottom: var(--s-4); }' +
    '.screen-home .metric .bar { margin-top: var(--s-4); }' +
    '.screen-home .hero + .promise .promise-line { color: var(--ink-3); }' +
    '.screen-home .metric-ask { display: flex; flex-direction: column; gap: var(--s-8); }' +
    '.screen-home .metric-ask .t-row .inline-src { vertical-align: middle; }' +
    '.screen-home .metric-ask-actions { display: flex; flex-wrap: wrap; align-items: center; column-gap: var(--s-16); }' +
    '.screen-home .metric-ask-actions .btn-text { padding: var(--s-8) 0; }' +
    '.screen-home .metric-ask.is-leaving { opacity: 0; transition: opacity .28s ease; }' +
    '.screen-home .move > .row { flex-wrap: wrap; row-gap: var(--s-8); }' +
    '.screen-home .move .row-text { flex: 1 1 240px; }' +
    '.screen-home .move .row-title .marks { margin-left: var(--s-8); }' +
    '.screen-home .move .row-trail { gap: var(--s-16); margin-left: auto; }' +
    '.screen-home .move .row-value { white-space: nowrap; }' +
    '.screen-home .move.has-draft > .row { padding-bottom: var(--s-8); }' +
    '.screen-home .move .draft { padding: 0 var(--s-12) var(--s-16); }' +
    '.screen-home .home-news .rules-line { margin-top: var(--s-16); }' +
    '.screen-home .move .row-meta .inline-src { vertical-align: middle; }' +
    '.screen-home .stem-move > .row .row-text { gap: 0; }' +
    '.screen-home .stem-move .sm-chev { flex: none; opacity: .72; transform: rotate(90deg); transition: transform .22s ease; }' +
    '.screen-home .stem-move .sm-toggle[aria-expanded="true"] .sm-chev { transform: rotate(-90deg); }' +
    '.screen-home .stem-move .sm-change { padding: var(--s-8) 0; }' +
    '.screen-home .stem-move .sm-panel { padding: var(--s-4) var(--s-12) var(--s-16); }' +
    '.screen-home .stem-move .sm-panel .btn-text[aria-pressed="true"] { color: var(--ink); }' +
    '.screen-home .stem-move .sm-plan { display: flex; flex-direction: column; gap: var(--s-16); padding: 0 var(--s-12) var(--s-16); }' +
    '.screen-home .stem-move .sm-plan .tl { padding: 0; }' +
    '.screen-home .stem-move .sm-foot { margin: 0; }' +
    '@media (prefers-reduced-motion: reduce) { .screen-home .metric-ask.is-leaving, .screen-home .stem-move .sm-chev { transition: none; } }' +
    '</style>';

  const ADD_EAD = '#/documents/add';
  const OPEN_KEY = 'home:stemOpen';     /* the choices are showing */
  const DRAFT_KEY = 'dso-days';
  const e = (s) => C.esc(s);

  /* The first open STEM OPT step, school steps included, in checklist order. */
  function nextStemStep() {
    const all = App.steps('stem');
    const open = all.filter((s) => !s.done && !(s.afterOf && !s.afterOf.done));
    return open[0] || null;
  }

  /* The unemployment count for this demo state. #/home/ask shows the job list
     as not confirmed until the student answers in the tile. */
  function unemploymentFor(mode) {
    const u = App.unemployment({ noJob: mode === 'no-job' });
    if (mode === 'ask' && App.state.jobsComplete !== 'every') {
      return Object.assign({}, u, { state: 'ask', used: null, left: null, pct: null, line: null, counted: null });
    }
    return u;
  }

  /* The email to the DSO for a student with no job on OPT yet: the step
     back, in the student's voice, with no count and no conclusion in it. */
  function daysEmail(data) {
    const s = data.student || {};
    const p = data.program || {};
    const u = data.unemployment || {};
    const base = data.email || {};
    return {
      key: DRAFT_KEY,
      openLabel: 'Write the email',
      to: base.to || 'Your DSO',
      subject: 'Days without work on OPT, ' + s.name,
      paragraphs: [
        'Hi,',
        "I'm " + s.name + '. I finished my ' + p.degree + ' at ' + s.school + ' on ' + p.end +
          ". My OPT card started " + u.cardFrom + ", and I haven't had a job on OPT yet.",
        'Could you help me with a few things?',
      ],
      questions: [
        'How many days without work does my SEVIS record show?',
        'What are my options from here?',
        'Is there anything in my record I should update?',
      ],
      signoff: base.signoff || ['Thank you,', s.name],
      foot: base.foot,
      primary: true,
    };
  }

  /* Feature 1: the file-by line for the STEM OPT move, or null.
     Priya: no recommendation date yet (f.needs), so the card end
     2027-02-13 is not the last day to file: the 60-day limit will likely
     come first (2026-12-01 + 60 = 2027-01-30). The line asks for the date
     instead of claiming one, as fileByFor() on Next steps does. Filed: the
     receipt stopped the clock, so no line. Passed: the date only, never
     "still in time", and the ⓘ ends with the DSO question.
     { needs } carries no date; { text } carries the one file-by date. */
  function fileByLine() {
    const f = App.fileBy ? App.fileBy('stem') : null;
    if (!f || f.stopped || !f.last) return null;
    if (f.needs) return { needs: f.needs, info: f.info };
    if (f.passed) {
      return { text: 'Last day to file: ' + f.lastText, info: f.info + ' Ask your DSO what this means for you.' };
    }
    return { text: f.line, info: f.info };
  }
  function fileByMeta(fb, lead) {
    if (!fb) return lead ? e(lead) : '';
    return (lead ? e(lead) + ' · ' : '') + (fb.needs ? C.unknown(fb.needs) : e(fb.text)) + C.info(fb.info, { label: 'How this date is set' });
  }

  /* Two answers in place: a pill that answers, a text link that adds. */
  function choiceHtml(c) {
    return '<button type="button" class="btn btn-pill" data-answer="' + e(c.answer) + '" data-value="' + e(c.value) + '">' + e(c.label) + '</button>' +
      '<a class="btn btn-text" href="' + e(c.href) + '">' + e(c.other) + '</a>';
  }

  /* One line: the title (with its source mark), the date, one action.
     m.draft puts an email draft under the line instead of a button;
     m.choice puts two answers there instead (the job question). */
  function moveItem(m) {
    const src = m.info ? C.info(m.info, { label: 'Why we ask' }) : (m.source ? C.source(m.source, { inline: true }) : '');
    const mark = m.school ? ' <span class="marks">' + C.schoolMark() + '</span>' : '';
    const action = m.draft ? '' : (m.choice ? choiceHtml(m.choice) : C.button({ label: m.action, kind: 'primary', href: m.href }));
    return '<div class="item move' + (m.draft ? ' has-draft' : '') + '" data-key="' + e(m.key) + '">' +
      '<div class="row is-static">' +
      '<span class="row-text"><span class="row-title">' + C.escText(m.title) + mark + src + '</span>' +
      (m.fileBy ? '<span class="row-meta">' + fileByMeta(m.fileBy) + '</span>' : '') + '</span>' +
      '<span class="row-trail">' +
      (m.date ? '<span class="row-value num">' + e(m.date) + '</span>' : '') +
      action +
      '</span></div>' +
      (m.draft ? C.emailDraft(m.draft) : '') +
      '</div>';
  }
  function moveLine(m) {
    if (m.inPlace) return stemMoveHtml(m.data);
    return '<div class="list move-list" aria-label="Your next move">' + moveItem(m) + '</div>';
  }

  /* ---- the STEM OPT choice, answered in place (Round 5, note 1) ----
     One state at a time:
       ask   "Decide on STEM OPT", its date, Decide. Decide opens the row
             with Yes, No and Not sure. After Not sure the row stays folded
             with "Decide any time" under the title.
       yes   "You plan to apply · Change", the three dates as the small strip
             and See all steps.
       no    "Not applying this time · Change", then the standing rule to
             report a change, as before.
     Change reopens the choices with the answer kept; folding them away again
     brings the answer back. */
  function stemView() {
    const intent = App.stemIntent();
    const open = !!App.state[OPEN_KEY];
    return { intent: intent, open: open, state: (intent === 'yes' || intent === 'no') && !open ? intent : 'ask' };
  }

  function stemItemHtml(data) {
    const plan = App.stemPlan();
    const d = plan.decide || {};
    const prep = plan.byKey.prepare || {};
    const v = stemView();
    const topic = (data.stem && data.stem.eyebrow) || 'STEM OPT extension';
    const move = (data.home.nextMoves || []).filter((x) => x.key === 'stemIntent')[0] || {};
    const decideLabel = (move.primary && move.primary.label) || 'Decide';
    const src = prep.source || move.source;
    /* Feature 1: the file-by line with its ⓘ, or the ask for the
       recommendation date while there is none. Not after a no. */
    const fb = v.intent === 'no' ? null : fileByLine();
    /* One date in the row: a file-by date, once known, replaces "By Oct 15". */
    const prepDate = prep.iso && !(fb && fb.text);

    if (v.state !== 'ask') {
      const change = '<button type="button" class="btn btn-text is-small sm-change" data-stem-home="change" aria-label="' +
        e(d.change + ' your STEM OPT answer') + '">' + e(d.change) + '</button>';
      const row = '<div class="row is-static">' +
        '<span class="row-text"><span class="row-title">' + e(topic) + '</span>' +
        '<span class="row-meta is-act">' + (v.state === 'yes' ? fileByMeta(fb, d.yes) : e(d.no)) + '</span></span>' +
        '<span class="row-trail">' + change + '</span></div>';
      if (v.state === 'no') return row;
      /* No caption here: the Next date tile above already gives the count,
         so the strip keeps only its Today marker. */
      const strip = C.timeline(Object.assign(App.stemTimeline(), { compact: true, caption: null, key: 'stem-home' }));
      return row + '<div class="sm-plan">' + strip +
        (d.seeAll ? '<p class="sm-foot">' + C.link(d.seeAll) + '</p>' : '') + '</div>';
    }

    const quiet = v.intent === 'unsure' && !v.open;
    const choices = (d.choices || []).map((c) => '<button type="button" class="' +
      C.cls('btn', c.value === 'unsure' ? 'btn-text is-quiet' : 'btn-pill') + '" data-stem-home="answer" data-value="' + e(c.value) + '"' +
      (v.intent === c.value ? ' aria-pressed="true"' : '') + '>' + e(c.label) + '</button>').join('');
    return '<div class="row is-static">' +
      '<span class="row-text"><span class="row-title">' + e(d.title || move.title) + (src ? C.source(src, { inline: true }) : '') + '</span>' +
      ((quiet || fb) ? '<span class="row-meta">' + fileByMeta(fb, quiet ? d.unsure : null) + '</span>' : '') + '</span>' +
      '<span class="row-trail">' +
      (prepDate ? '<span class="row-value num">By ' + e(C.fmtDate(prep.iso, { ref: plan.today })) + '</span>' : '') +
      '<button type="button" class="' + C.cls('btn', v.intent === 'unsure' ? 'btn-pill' : 'btn-primary', 'sm-toggle') + '" data-stem-home="toggle"' +
      ' aria-expanded="' + (v.open ? 'true' : 'false') + '"' + (v.open ? ' aria-controls="sm-choices"' : '') + '>' +
      e(decideLabel) + C.icon('chevron', { cls: 'sm-chev', size: 12 }) + '</button>' +
      '</span></div>' +
      (v.open ? '<div class="sm-panel" id="sm-choices" role="group" aria-label="' + e(d.title) + '"><div class="btn-group">' + choices + '</div></div>' : '');
  }

  function stemMoveHtml(data) {
    const v = stemView();
    const c = (data.home.nextMoves || []).filter((x) => x.key === 'changes')[0] || {};
    return '<div class="list move-list" aria-label="Your next move" data-stem-home-list>' +
      '<div class="' + C.cls('item move stem-move', v.open && 'is-open') + '" data-key="stemIntent" data-state="' + v.state + '">' +
      stemItemHtml(data) + '</div>' +
      (v.state === 'no' ? moveItem({ key: 'changes', title: c.title, date: 'Within 10 days', action: 'See how', href: c.href || '#/steps', source: c.source }) : '') +
      '</div>';
  }

  /* The one move for this student, from the demo state, the job list and the
     STEM OPT answer. The job is asked once: in the tile with a job on file,
     here (as the choice) with none, while the tile shows only the add line. */
  function pickMove(data, mode, u) {
    const h = data.home;
    const find = (k) => h.nextMoves.filter((x) => x.key === k)[0] || {};
    if (mode === 'no-ead') return { key: 'ead', title: 'Add your EAD card', action: 'Add card', href: ADD_EAD };
    if (!u.hasJob && u.state === 'none') {
      return { key: 'dso-days', title: 'Ask your DSO about days without work', source: 'unemployment', draft: daysEmail(data) };
    }
    if (!u.hasJob) {
      const a = u.ask || {};
      return {
        key: 'job', title: a.noJobTitle, info: a.info,
        choice: { answer: 'jobsComplete', value: 'none', label: a.none, other: a.addJob, href: a.href || '#/case/jobs' },
      };
    }

    /* The STEM OPT choice, answered in place: Yes, No, Not sure or none yet.
       Once every STEM OPT step is done the move is the application itself. */
    if (App.stemIntent() === 'yes' && !nextStemStep()) {
      return { key: 'uscis', title: 'Track your application', action: 'Open', href: '#/uscis' };
    }
    const d = find('stemIntent');
    if (d.inPlace) return { key: 'stemIntent', inPlace: true, data: data };
    const fb = App.stemIntent() === 'no' ? null : fileByLine();
    return {
      key: 'stemIntent', title: d.title, date: d.date && !(fb && fb.text) ? 'By ' + d.date : null,
      action: (d.primary && d.primary.label) || 'Decide', href: (d.primary && d.primary.href) || '#/steps', source: d.source,
      fileBy: fb,
    };
  }

  /* The unemployment tile's body while the job list is not confirmed. Used
     only with a job on file: the job named, one calm question, one answer in
     place and a way to add another. With no job on file the tile shows the
     add line and the question is Your next move. */
  function askBody(u) {
    const a = u.ask || {};
    const withJob = !!u.hasJob;
    return '<div class="metric-ask ask">' +
      '<p class="t-row">' + e(withJob ? a.jobTitle : a.noJobTitle) + C.info(a.info, { label: 'Why we ask' }) + '</p>' +
      '<div class="metric-ask-actions">' +
      choiceHtml({ answer: 'jobsComplete', value: withJob ? 'every' : 'none', label: withJob ? a.every : a.none,
        other: withJob ? a.another : a.addJob, href: a.href || '#/case/jobs' }) +
      '</div></div>';
  }

  /* The card dates on the second and third tiles, from App.record(), never
     fixed strings. Priya, today 2026-09-30 (checked with python3):
       card ends 2027-02-13: daysBetween(2026-09-30, 2027-02-13) = 136
       window opens 2027-02-13 - 90 = 2026-11-15:
         daysBetween(2026-09-30, 2026-11-15) = 46 */
  function cardDates(data) {
    const D = App.dates;
    const t = data.today.iso;
    const until = (App.record().opt || {}).until;
    if (!until || !D.okIso(until)) return null;
    const opens = D.addDays(until, -App.RULE.stemBefore);
    const n = (k) => k + (k === 1 ? ' day' : ' days');
    const left = D.daysBetween(t, until);
    const toOpen = D.daysBetween(t, opens);
    return {
      untilText: C.fmtDate(until, { ref: t }),
      opensText: C.fmtDate(opens, { ref: t }),
      left: n(left),
      toOpen: toOpen > 0 ? 'in ' + n(toOpen) : null,
    };
  }

  /* The three numbers. C.metrics draws them; the unemployment tile's body is
     swapped for the question while the job list is not confirmed. */
  function metricsHtml(data, mode, u) {
    const h = data.home;
    const m = h.metrics;
    const intent = App.stemIntent();
    const noEad = mode === 'no-ead';
    function lines() { return C.raw(Array.prototype.map.call(arguments, C.esc).join('<br>')); }

    let first;
    if (noEad) {
      first = { eyebrow: m[0].eyebrow, add: { action: 'Add your EAD card', rest: 'to count these days.', href: ADD_EAD } };
    } else if (u.state === 'ask' && u.hasJob) {
      first = { eyebrow: m[0].eyebrow, value: '' };
    } else {
      first = Object.assign({}, u.metric);
      /* The working behind the source mark follows the answer given. */
      if (u.counted && data.sources && data.sources.unemployment) {
        first.source = Object.assign({}, data.sources.unemployment, { counted: [u.counted] });
      }
    }
    const cd = noEad ? null : cardDates(data);
    let second = m[1];
    let third = intent === 'no' ? h.metricNoStem : m[2];
    if (cd) {
      second = Object.assign({}, m[1], { value: cd.untilText, unit: cd.left + ' left' });
      third = intent === 'no'
        ? Object.assign({}, h.metricNoStem, { value: cd.untilText, unit: 'Your card ends · in ' + cd.left })
        : Object.assign({}, m[2], { value: cd.opensText, unit: 'STEM OPT window opens' + (cd.toOpen ? ' · ' + cd.toOpen : '') });
    }
    const cells = [
      first,
      noEad ? { eyebrow: m[1].eyebrow, add: { action: 'Add your EAD card', rest: 'to see this date.', href: ADD_EAD } } : second,
      noEad ? h.metricNoEad : Object.assign({}, third, { unit: lines.apply(null, third.unit.split(' · ')) }),
    ];
    const html = C.metrics(cells);
    if (noEad || u.state !== 'ask' || !u.hasJob) return html;

    const box = document.createElement('div');
    box.innerHTML = html;
    const tile = box.querySelector('.metric');
    const row = tile && tile.querySelector('.metric-value-row');
    if (row) row.outerHTML = askBody(u);
    return box.innerHTML;
  }

  /* Feature 5: at most one check-in (C.checkin draws App.checkin()[0], or
     the "Confirmed Sep 30" line with Undo just after a Yes). Only while the
     job count runs and the job list is answered: never on the ask, no-job or
     no-EAD demos, where the job is already asked in the tile or the move.
     Priya: 2026-09-30 - 2026-08-28 = 33 days >= 30, so it shows. */
  function checkinHtml(mode, u) {
    if (mode === 'no-ead' || mode === 'no-job' || !C.checkin) return '';
    if (!u.hasJob || u.state !== 'every') return '';
    const card = C.checkin();
    if (!card) return '';
    return C.section({ eyebrow: 'Check in', cls: 'home-checkin', content: '<div class="list" aria-label="Check in">' + card + '</div>' });
  }

  /* ---- in place: open, answer, fold ---- */
  let ctx = null;
  const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* The list eases from its old height to its new one, so News below glides
     instead of jumping. Painting is clipped to the moving edge only. Under
     reduced motion the new state is simply there. */
  function morph(el, h0) {
    const h1 = el.offsetHeight;
    if (reduced() || !el.animate || Math.abs(h1 - h0) < 2) return;
    const clip = 'inset(-8px -24px 0 -24px)';
    el.animate([{ height: h0 + 'px', clipPath: clip }, { height: h1 + 'px', clipPath: clip }],
      { duration: 280, easing: 'cubic-bezier(.2, .7, .2, 1)' });
  }

  /* Redraw the move in place and return the new list. */
  function redrawMove(root) {
    const list = root.querySelector('[data-stem-home-list]');
    if (!list || !ctx) return null;
    const h0 = list.offsetHeight;
    const tmp = document.createElement('div');
    tmp.innerHTML = stemMoveHtml(ctx.data);
    const next = tmp.firstElementChild;
    list.replaceWith(next);
    App.layoutTimelines(next);
    morph(next, h0);
    return next;
  }

  /* The third number follows the answer (the window opening, or the card's
     end after a no). Swapped quietly, only when it changed. */
  function refreshMetrics(root) {
    if (!ctx) return;
    const cur = root.querySelectorAll('.metrics > .metric')[2];
    const tmp = document.createElement('div');
    tmp.innerHTML = metricsHtml(ctx.data, ctx.mode, ctx.u);
    const fresh = tmp.querySelectorAll('.metrics > .metric')[2];
    if (!cur || !fresh || cur.innerHTML === fresh.innerHTML) return;
    cur.replaceWith(fresh);
    App.play(fresh, 'is-arriving');
  }

  const focusIn = (el, sel) => {
    const f = el && el.querySelector(sel);
    if (f) f.focus({ preventScroll: true });
  };

  function setOpen(root, open) {
    App.state[OPEN_KEY] = !!open;
    const list = redrawMove(root);
    if (!list) return;
    if (open) {
      const panel = list.querySelector('.sm-panel');
      App.play(panel, 'is-arriving');
      focusIn(list, '.sm-panel [aria-pressed="true"], .sm-panel button');
    } else {
      focusIn(list, '.sm-toggle, .sm-change');
    }
  }

  /* An answer folds the row back to its quiet line (or the strip, for a
     yes), with a light tap from App.setStemIntent and a short highlight.
     The answer is the one Next steps reads. Nothing navigates. */
  function answerStem(root, value, btn) {
    App.state[OPEN_KEY] = false;
    App.setStemIntent(value, btn);
    const list = redrawMove(root);
    refreshMetrics(root);
    if (!list) return;
    App.play(list.querySelector('.stem-move'), 'is-arriving');
    focusIn(list, '.sm-change, .sm-toggle');
  }

  window.SCREENS['home'] = {
    title: 'Home',

    render(data, params) {
      const asked = (params && params[0]) || '';
      /* A card left for later in onboarding is no card: nothing is counted
         from it, whatever demo route Home was opened on. */
      const onb = App.state.onb;
      const noEad = asked === 'no-ead' || !!(onb && onb.ead === 'later');
      const mode = noEad ? 'no-ead' : asked;
      const noJob = asked === 'no-job';
      const h = data.home;
      const u = unemploymentFor(mode);
      ctx = { data: data, mode: mode, u: u };

      /* ---- hero: where you stand, from App.record(); the why is behind the ⓘ ----
         A job is open on today when start <= 2026-09-30 and it has no end
         or ends on or after today. Northwind 2026-02-27, no end: open, so
         "You're working on OPT at Northwind Systems." After "This happened"
         saves an end of 2026-09-01, none is open: "You're on OPT." */
      const t = data.today.iso;
      const job = noJob ? null : (App.record().jobs || []).filter((j) => j.start <= t && (!j.end || t <= j.end))[0] || null;
      const heroHtml = C.hero({
        date: data.today.long,
        eyebrow: h.eyebrow,
        title: job ? "You're working on OPT at " + job.employer + '.' : "You're on OPT.",
        info: noEad ? 'Add your EAD card and your dates are counted from it.' : (job ? h.info : 'Counted from your EAD card.'),
        halo: true,
      });
      /* ---- the promise: one quiet line, said once on this page ---- */
      const promiseHtml = data.promise ? C.promise(data.promise, { subline: false }) : '';

      /* ---- your next move: one line ---- */
      const nextHtml = C.section({ eyebrow: 'Your next move', content: moveLine(pickMove(data, mode, u)) });

      /* ---- news: headline, then one line "date · for you"; the dek stays in News ---- */
      const items = (h.whatsNew || []).map((n) => App.findUpdate(n.key)).filter(Boolean);
      const newsRows = items.map((it) => C.updateRow(it, {
        headline: true,
        meta: [it.date, C.affectsFor(it).short].filter(Boolean).join(' · '),
        line: null,
      }));
      const newsHtml = C.section({
        eyebrow: 'News',
        cls: 'home-news',
        content: (newsRows.length ? C.list(newsRows, { accordion: false, label: 'News' })
          : C.empty({ text: (data.updates && data.updates.emptyNews) || 'No news this week.' })) +
          C.rulesLine(data.rules),
      });

      return STYLE + heroHtml + promiseHtml + metricsHtml(data, mode, u) + nextHtml + checkinHtml(mode, u) + newsHtml + C.footer();
    },

    mount(root) {
      root.classList.add('screen-home');
      root.addEventListener('click', (ev) => {
        const b = ev.target.closest('[data-stem-home]');
        if (!b || !root.contains(b)) return;
        ev.preventDefault();
        const act = b.dataset.stemHome;
        if (act === 'toggle') setOpen(root, !App.state[OPEN_KEY]);
        else if (act === 'change') setOpen(root, true);
        else if (act === 'answer') answerStem(root, b.dataset.value, b);
      });
      /* Escape folds the choices away and gives focus back to Decide. */
      root.addEventListener('keydown', (ev) => {
        if (ev.key !== 'Escape' || !App.state[OPEN_KEY]) return;
        if (!ev.target.closest || !ev.target.closest('.stem-move')) return;
        ev.preventDefault();
        setOpen(root, false);
      });
    },
  };
})();
