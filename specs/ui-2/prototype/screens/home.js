/* Home. Where you stand in one sentence, three numbers, your next move, what's new.
   Demo states: #/home (default), #/home/no-ead (no EAD card yet), #/home/no-job (no job recorded).
   Shared state it reads: App.stemIntent() ('yes' | 'no' | 'unsure' | null).
   The STEM OPT question is owned by What's next; Home links to it.
   The 10-day reporting rule is owned by Checklists > OPT; Home links to it
   only when there is no dated move. App.state.homeOpen keeps a row open
   across re-renders. */
window.SCREENS['home'] = {
  title: 'Home',

  render(data, params) {
    const S = App.state;
    const mode = params && params[0];
    const noEad = mode === 'no-ead';
    const noJob = mode === 'no-job';
    const h = data.home;
    const addEad = '#/documents/add';
    const intent = App.stemIntent();

    /* ---- hero ---- */
    const title = noJob ? "You're on OPT." : h.headline;
    const subline = noEad ? 'Add your EAD card and Duly counts your dates.'
      : intent === 'no' ? h.sublineQuiet : h.subline;
    const heroHtml = C.hero({ date: data.today.long, eyebrow: h.eyebrow, title: title, subline: subline, halo: true });

    /* ---- three numbers ---- */
    const m = h.metrics;
    function lines() { return C.raw(Array.prototype.map.call(arguments, C.esc).join('<br>')); }
    const third = intent === 'no' ? h.metricNoStem : m[2];
    const cells = [
      noJob ? { eyebrow: m[0].eyebrow, add: { action: 'Add your job', rest: 'to count these days.', href: '#/case' } }
        : noEad ? { eyebrow: m[0].eyebrow, add: { action: 'Add your EAD card', rest: 'to count these days.', href: addEad } }
        : m[0],
      noEad ? { eyebrow: m[1].eyebrow, add: { action: 'Add your EAD card', rest: 'to see this date.', href: addEad } } : m[1],
      noEad ? h.metricNoEad : Object.assign({}, third, { unit: lines.apply(null, third.unit.split(' · ')) }),
    ];
    const metricsHtml = C.metrics(cells);

    /* ---- your next move ---- */
    const moves = [];
    if (noJob) moves.push('job');
    if (intent !== 'no') moves.push('stemIntent');
    if (!moves.length) moves.push('changes');

    /* The first row carries the one filled button on the screen. */
    const primaryKey = moves[0];
    const openKey = moves.indexOf(S.homeOpen) !== -1 ? S.homeOpen : primaryKey;
    const find = (k) => h.nextMoves.filter((x) => x.key === k)[0] || {};
    const para = (text, src) => '<p>' + C.esc(text) + (src ? C.source(src, { inline: true }) : '') + '</p>';
    const eadLine = '<p>' + C.unknown({ action: 'Add your EAD card', rest: 'to see your STEM OPT dates.', href: addEad }) + '</p>';

    function moveRow(k) {
      const isPrimary = k === primaryKey;
      const open = k === openKey;
      const kind = isPrimary ? 'primary' : 'pill';

      if (k === 'job') {
        return C.row({
          key: 'job', open: open,
          title: 'Add your job', meta: 'So Duly can count your unemployment days',
          content: C.disclosure({
            content: para('Duly counts unemployment days from the day your card starts to your first day of work.', 'unemployment'),
            actions: C.button({ label: 'Add your job', kind: kind, href: '#/case' }),
          }),
        });
      }

      if (k === 'changes') {
        const d = find('changes');
        return C.row({ key: 'changes', title: d.title, meta: d.meta, href: d.href });
      }

      /* stemIntent: a link to the question on What's next, never the question itself. */
      const d = find('stemIntent');
      if (intent === 'yes') {
        return C.row({
          key: 'stemIntent', open: open,
          title: 'Start preparing for STEM OPT', meta: noEad ? 'Your dates come from your EAD card' : 'By Oct 15 · window opens Nov 15, 2026',
          content: C.disclosure({
            content: noEad ? eadLine : para('Your window to file opens Nov 15, 2026 and closes Feb 13, 2027.', 'stemOpens'),
            actions: C.button({ label: 'See the plan', kind: kind, href: '#/next' }),
          }),
        });
      }
      return C.row({
        key: 'stemIntent', open: open,
        title: d.title,
        meta: (noEad ? 'Your dates come from your EAD card' : d.meta) + (intent === 'unsure' ? ' · not decided yet' : ''),
        content: C.disclosure({
          content: noEad ? eadLine : para(d.text, d.source),
          actions: C.button({ label: d.primary.label, kind: kind, href: d.primary.href }),
        }),
      });
    }

    const nextHtml = C.section({
      eyebrow: 'Your next move',
      content: C.list(moves.map(moveRow), { label: 'Your next move' }),
    });

    /* ---- what's new for your status: the rule change, then the news ---- */
    const newsHtml = C.section({
      eyebrow: "What's new for your status",
      content: C.list(h.whatsNew.map((n) => C.row({ key: n.key, title: n.title, meta: n.meta, href: n.href })), { accordion: false }),
    });

    const style = '<style>' +
      '.screen-home .metric-value-row { display: block; }' +
      '.screen-home .metric-value { display: block; margin-bottom: var(--s-4); }' +
      '.screen-home .metric .bar { margin-top: var(--s-4); }' +
      '</style>';

    return heroHtml + metricsHtml + nextHtml + newsHtml +
      C.footer('Records and dates from your documents, not legal advice. ' + data.checked.today + '.') +
      style;
  },

  mount(root) {
    root.classList.add('screen-home');
  },
};
