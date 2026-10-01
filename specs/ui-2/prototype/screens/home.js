/* Home (Round 3, note 1). Less explaining, more intent:
     1. the hero: where you stand, with the why behind an ⓘ beside it;
     2. the three numbers;
     3. Your next move: one line, its date and one action;
     4. News: big skimmable headlines, each with one line: its date and the "for you" answer,
        opening the article in News; then the small "Rules checked Sep 30"
        line, whose ⓘ says the steps update when a rule changes.
   Everything else sits behind an ⓘ or a source mark.
   Demo states: #/home (default), #/home/no-ead (no EAD card yet), #/home/no-job (no job recorded).

   The STEM OPT choice is asked on Next steps (#/steps); the next move here
   follows the answer in App.stemIntent(). The word Duly does not appear in
   this screen's text. */
(function () {
  'use strict';

  /* Layout only. Type sizes come from system.css. */
  const STYLE = '<style>' +
    '.screen-home .metric-value-row { display: block; }' +
    '.screen-home .metric-value { display: block; margin-bottom: var(--s-4); }' +
    '.screen-home .metric .bar { margin-top: var(--s-4); }' +
    '.screen-home .move > .row { flex-wrap: wrap; row-gap: var(--s-8); }' +
    '.screen-home .move .row-text { flex: 1 1 240px; }' +
    '.screen-home .move .row-title .marks { margin-left: var(--s-8); }' +
    '.screen-home .move .row-trail { gap: var(--s-16); margin-left: auto; }' +
    '.screen-home .move .row-value { white-space: nowrap; }' +
    '.screen-home .home-news .rules-line { margin-top: var(--s-16); }' +
    '</style>';

  const ADD_EAD = '#/documents/add';
  const e = (s) => C.esc(s);

  /* The first open STEM OPT step, school steps included, in checklist order. */
  function nextStemStep() {
    const all = App.steps('stem');
    const open = all.filter((s) => !s.done && !(s.afterOf && !s.afterOf.done));
    return open[0] || null;
  }

  /* One line: the title (with its source mark), the date, one action. */
  function moveLine(m) {
    const src = m.source ? C.source(m.source, { inline: true }) : '';
    const mark = m.school ? ' <span class="marks">' + C.schoolMark() + '</span>' : '';
    return '<div class="list" aria-label="Your next move"><div class="item move" data-key="' + e(m.key) + '">' +
      '<div class="row is-static">' +
      '<span class="row-text"><span class="row-title">' + C.escText(m.title) + mark + src + '</span></span>' +
      '<span class="row-trail">' +
      (m.date ? '<span class="row-value num">' + e(m.date) + '</span>' : '') +
      C.button({ label: m.action, kind: 'primary', href: m.href }) +
      '</span></div></div></div>';
  }

  /* The one move for this student, from the demo state and the STEM OPT answer. */
  function pickMove(h, noEad, noJob) {
    const find = (k) => h.nextMoves.filter((x) => x.key === k)[0] || {};
    if (noJob) return { key: 'job', title: 'Add your job', action: 'Add job', href: '#/case', source: 'unemployment' };
    if (noEad) return { key: 'ead', title: 'Add your EAD card', action: 'Add card', href: ADD_EAD };

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

  window.SCREENS['home'] = {
    title: 'Home',

    render(data, params) {
      const mode = params && params[0];
      const noEad = mode === 'no-ead';
      const noJob = mode === 'no-job';
      const h = data.home;
      const intent = App.stemIntent();

      /* ---- hero: where you stand; the why is behind the ⓘ ---- */
      const heroHtml = C.hero({
        date: data.today.long,
        eyebrow: h.eyebrow,
        title: noJob ? "You're on OPT." : h.headline,
        info: noEad ? 'Add your EAD card and your dates are counted from it.' : (noJob ? 'Counted from your EAD card.' : h.info),
        halo: true,
      });

      /* ---- three numbers ---- */
      const m = h.metrics;
      function lines() { return C.raw(Array.prototype.map.call(arguments, C.esc).join('<br>')); }
      const third = intent === 'no' ? h.metricNoStem : m[2];
      const cells = [
        noJob ? { eyebrow: m[0].eyebrow, add: { action: 'Add your job', rest: 'to count these days.', href: '#/case' } }
          : noEad ? { eyebrow: m[0].eyebrow, add: { action: 'Add your EAD card', rest: 'to count these days.', href: ADD_EAD } }
          : m[0],
        noEad ? { eyebrow: m[1].eyebrow, add: { action: 'Add your EAD card', rest: 'to see this date.', href: ADD_EAD } } : m[1],
        noEad ? h.metricNoEad : Object.assign({}, third, { unit: lines.apply(null, third.unit.split(' · ')) }),
      ];
      const metricsHtml = C.metrics(cells);

      /* ---- your next move: one line ---- */
      const nextHtml = C.section({ eyebrow: 'Your next move', content: moveLine(pickMove(h, noEad, noJob)) });

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

      return STYLE + heroHtml + metricsHtml + nextHtml + newsHtml + C.footer();
    },

    mount(root) {
      root.classList.add('screen-home');
    },
  };
})();
