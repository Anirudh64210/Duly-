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
   The STEM OPT choice is asked on Next steps (#/steps); the next move here
   follows the answer in App.stemIntent(). The word Duly does not appear in
   this screen's text. */
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
    '@media (prefers-reduced-motion: reduce) { .screen-home .metric-ask.is-leaving { transition: none; } }' +
    '</style>';

  const ADD_EAD = '#/documents/add';
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

  /* Two answers in place: a pill that answers, a text link that adds. */
  function choiceHtml(c) {
    return '<button type="button" class="btn btn-pill" data-answer="' + e(c.answer) + '" data-value="' + e(c.value) + '">' + e(c.label) + '</button>' +
      '<a class="btn btn-text" href="' + e(c.href) + '">' + e(c.other) + '</a>';
  }

  /* One line: the title (with its source mark), the date, one action.
     m.draft puts an email draft under the line instead of a button;
     m.choice puts two answers there instead (the job question). */
  function moveLine(m) {
    const src = m.info ? C.info(m.info, { label: 'Why we ask' }) : (m.source ? C.source(m.source, { inline: true }) : '');
    const mark = m.school ? ' <span class="marks">' + C.schoolMark() + '</span>' : '';
    const action = m.draft ? '' : (m.choice ? choiceHtml(m.choice) : C.button({ label: m.action, kind: 'primary', href: m.href }));
    return '<div class="list" aria-label="Your next move"><div class="item move' + (m.draft ? ' has-draft' : '') + '" data-key="' + e(m.key) + '">' +
      '<div class="row is-static">' +
      '<span class="row-text"><span class="row-title">' + C.escText(m.title) + mark + src + '</span></span>' +
      '<span class="row-trail">' +
      (m.date ? '<span class="row-value num">' + e(m.date) + '</span>' : '') +
      action +
      '</span></div>' +
      (m.draft ? C.emailDraft(m.draft) : '') +
      '</div></div>';
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

    const intent = App.stemIntent();
    const d = find('stemIntent');
    if (intent === 'no') {
      const c = find('changes');
      return { key: 'changes', title: c.title, date: 'Within 10 days', action: 'See how', href: c.href || '#/steps', source: c.source };
    }
    if (intent === 'yes') {
      const step = nextStemStep();
      if (!step) return { key: 'uscis', title: 'Track your application', action: 'Open', href: '#/uscis' };
      const anyDone = App.steps('stem').some((s) => s.done);
      const filing = step.key === 'i765';
      return {
        key: 'stemStep', title: step.step.title, school: step.type === 'school',
        date: filing ? 'From Nov 15' : 'By ' + d.date,
        action: anyDone ? 'Continue' : 'Start', href: '#/steps',
        source: filing ? 'stemOpens' : d.source,
      };
    }
    /* Not answered yet, or not sure. */
    return {
      key: 'stemIntent', title: d.title, date: d.date ? 'By ' + d.date : null,
      action: (d.primary && d.primary.label) || 'Decide', href: (d.primary && d.primary.href) || '#/steps', source: d.source,
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
    const third = intent === 'no' ? h.metricNoStem : m[2];
    const cells = [
      first,
      noEad ? { eyebrow: m[1].eyebrow, add: { action: 'Add your EAD card', rest: 'to see this date.', href: ADD_EAD } } : m[1],
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

      /* ---- hero: where you stand; the why is behind the ⓘ ---- */
      const heroHtml = C.hero({
        date: data.today.long,
        eyebrow: h.eyebrow,
        title: noJob ? "You're on OPT." : h.headline,
        info: noEad ? 'Add your EAD card and your dates are counted from it.' : (noJob ? 'Counted from your EAD card.' : h.info),
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

      return STYLE + heroHtml + promiseHtml + metricsHtml(data, mode, u) + nextHtml + newsHtml + C.footer();
    },

    mount(root) {
      root.classList.add('screen-home');
    },
  };
})();
