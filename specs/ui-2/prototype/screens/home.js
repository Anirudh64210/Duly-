/* Home. Where you stand in one sentence, three numbers, your next move, what's new.
   Demo states: #/home (default), #/home/no-ead (no EAD card yet), #/home/no-job (no job recorded).

   The STEM OPT choice is answered here, in place (Round 2, Note 1). The
   buttons carry data-answer="stemIntent", so app.js stores the answer in
   App.state.stemIntent (shared with What's next, Timeline, Checklists and
   Your case) and announces it; this screen then redraws in place with
   App.rerender(): same scroll, the row stays open, focus moves to the row's
   first action. "Change my answer" sends an empty answer, which clears it.

   What's new rows say inline whether the item affects her and whether to
   act (Note 3), from updates.items, and open #/updates/<id>. Under them sits
   the quiet rules line, the page's one freshness mark: the steps and dates
   are worked out from the current rules (Note 11). The footer is the
   brief's single line, with no second check time.

   The word Duly does not appear in this screen's text (Note 12). */
(function () {
  'use strict';

  /* Layout only. Type sizes come from system.css. */
  const STYLE = '<style>' +
    '.screen-home .metric-value-row { display: block; }' +
    '.screen-home .metric-value { display: block; margin-bottom: var(--s-4); }' +
    '.screen-home .metric .bar { margin-top: var(--s-4); }' +
    '.screen-home .home-step { display: block; }' +
    '</style>';

  const ADD_EAD = '#/documents/add';
  const e = (s) => C.esc(s);

  /* The first open STEM OPT step, school steps included, in checklist order. */
  function nextStemStep() {
    const all = App.steps('stem');
    const open = all.filter((s) => !s.done && !(s.afterOf && !s.afterOf.done));
    return { next: open[0] || null, done: all.filter((s) => s.done).length, total: all.length };
  }

  function answerBtn(label, value, kind) {
    const extra = kind === 'text' ? { cls: 'is-quiet is-small' } : {};
    return C.button(Object.assign({ label: label, kind: kind, attrs: { 'data-answer': 'stemIntent', 'data-value': value } }, extra));
  }

  window.SCREENS['home'] = {
    title: 'Home',

    render(data, params) {
      const mode = params && params[0];
      const noEad = mode === 'no-ead';
      const noJob = mode === 'no-job';
      const h = data.home;
      const stem = data.stem;
      const intent = App.stemIntent();

      /* ---- hero: where you stand, and what this page does for her ---- */
      const title = noJob ? "You're on OPT." : h.headline;
      const subline = noEad
        ? 'Add your EAD card and your dates are counted for you.'
        : 'Your dates and your next move, counted from your documents and the current rules.';
      const heroHtml = C.hero({ date: data.today.long, eyebrow: h.eyebrow, title: title, subline: subline, halo: true });

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

      /* ---- your next move ---- */
      const moves = [];
      if (noJob) moves.push('job');
      moves.push('stemIntent');
      if (intent === 'no') moves.push('changes');

      /* The first row carries the one filled button on the screen, and opens. */
      const primaryKey = moves[0];
      const find = (k) => h.nextMoves.filter((x) => x.key === k)[0] || {};
      const para = (text, src) => '<p>' + e(text) + (src ? C.source(src, { inline: true }) : '') + '</p>';
      const eadLine = '<p>' + C.unknown({ action: 'Add your EAD card', rest: 'to see your STEM OPT dates.', href: ADD_EAD }) + '</p>';

      function stemRow(open, isPrimary) {
        const d = find('stemIntent');
        const change = answerBtn('Change my answer', '', 'text');

        if (intent === 'yes') {
          const st = nextStemStep();
          const step = st.next;
          const stepLine = step
            ? '<p class="home-step">Next step: ' + C.escText(step.step.title) + (step.type === 'school' ? ' <span class="marks">' + C.schoolMark() + '</span>' : '') + '</p>'
            : '<p>Every step is done. File when your window opens.</p>';
          return C.row({
            key: 'stemIntent', open: open,
            title: 'Start preparing for STEM OPT',
            meta: noEad ? 'Your dates come from your EAD card' : 'By Oct 15 · window opens Nov 15, 2026',
            content: C.disclosure({
              content: (noEad ? eadLine : para(stem.yesLine, 'stemOpens')) + stepLine,
              actions: C.button({ label: 'See your plan', kind: isPrimary ? 'primary' : 'pill', href: '#/next' }) + change,
            }),
          });
        }

        if (intent === 'no') {
          return C.row({
            key: 'stemIntent', open: open,
            title: 'Not applying for STEM OPT',
            meta: noEad ? 'Your dates come from your EAD card' : 'Your card ends Feb 13, 2027',
            content: C.disclosure({
              content: noEad ? eadLine : para(stem.noLine, 'eadEnds'),
              actions: change,
            }),
          });
        }

        /* Not answered yet, or not sure: the choice itself, right here. */
        const unsure = intent === 'unsure';
        return C.row({
          key: 'stemIntent', open: open,
          title: 'Planning to apply for STEM OPT?',
          meta: (noEad ? 'Your dates come from your EAD card' : d.meta) + (unsure ? ' · not decided yet' : ''),
          content: C.disclosure({
            content: (noEad ? eadLine : para(d.text, d.source)) +
              (unsure ? '<p>That\'s fine. Your dates stay here while you decide.</p>' : ''),
            actions: answerBtn('Yes, I plan to', 'yes', isPrimary ? 'primary' : 'pill') +
              answerBtn('No, not this time', 'no', 'pill') +
              (unsure ? '' : answerBtn("I'm not sure yet", 'unsure', 'text')),
            link: { label: 'See what it needs', href: '#/next' },
          }),
        });
      }

      function moveRow(k) {
        const isPrimary = k === primaryKey;
        const open = isPrimary;

        if (k === 'job') {
          return C.row({
            key: 'job', open: open,
            title: 'Add your job', meta: 'To count your unemployment days',
            content: C.disclosure({
              content: para('Unemployment days are counted from the day your card starts to your first day of work.', 'unemployment'),
              actions: C.button({ label: 'Add your job', kind: isPrimary ? 'primary' : 'pill', href: '#/case' }),
            }),
          });
        }
        if (k === 'changes') {
          const d = find('changes');
          return C.row({ key: 'changes', title: d.title, meta: d.meta, href: d.href });
        }
        return stemRow(open, isPrimary);
      }

      const nextHtml = C.section({
        eyebrow: 'Your next move',
        content: C.list(moves.map(moveRow), { label: 'Your next move' }),
      });

      /* ---- what's new for your status: the rule change, then the news ---- */
      /* One row formatter with Updates (C.updateRow): the affects answer for
         her (C.affectsFor, which follows her STEM OPT answer), what to do,
         and "Your Form I-765 step was updated Sep 30" when a rule change
         touched a step in her checklist. Row, Updates and the update's page
         read one answer, so they always agree. */
      const newsRows = h.whatsNew.map((n) => C.updateRow(App.findUpdate(n.key) || n, { meta: n.meta }));
      /* The one freshness mark on Home: the quiet rules line, as on
         Checklists, Timeline and What's next. Not a section link, so it never
         reads as a second call to action. */
      const newsHtml = C.section({
        eyebrow: "What's new for your status",
        content: C.list(newsRows, { accordion: false }) + C.rulesLine(data.rules),
      });

      return STYLE + heroHtml + metricsHtml + nextHtml + newsHtml +
        C.footer();
    },

    mount(root) {
      root.classList.add('screen-home');
      wire();
    },
  };

  /* ---------------- behaviour, wired once ---------------- */

  let wired = false;
  function wire() {
    if (wired) return;
    wired = true;
    document.addEventListener('duly:change', (ev) => {
      const d = ev.detail || {};
      if (App.route !== 'home' || d.kind !== 'answer' || d.key !== 'stemIntent') return;
      App.rerender();
      const row = document.querySelector('main.screen-home .item[data-key="stemIntent"]');
      if (!row) return;
      if (!row.classList.contains('is-open')) App.setOpen(row, true);
      const first = row.querySelector('.disc .btn-group .btn') || row.querySelector('[data-disclosure]');
      if (first) first.focus({ preventScroll: true });
      const v = App.stemIntent();
      App.toast(v === 'yes' ? 'Your STEM OPT plan is ready' : v === 'no' ? 'Saved. No STEM OPT this time' : v === 'unsure' ? 'Saved. Decide any time' : 'Answer cleared');
    });
  }
})();
