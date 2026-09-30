/* Home. Where you stand in one sentence, three numbers, your next move, what's new.
   Demo states: #/home (default), #/home/no-ead (no EAD card yet), #/home/no-job (no job recorded).
   Shared state it reads and writes:
     App.state['task:sevp']  true once the SEVP check is done (shared with Checklists)
     App.state.stemIntent    'yes' | 'no' | 'unsure' (also mirrored to data.stem.intent)
     App.state.homeOpen      key of the next-move row to show open after a re-render */
window.SCREENS['home'] = {
  title: 'Home',

  render(data, params) {
    const S = App.state;
    const mode = params && params[0];
    const noEad = mode === 'no-ead';
    const noJob = mode === 'no-job';
    const h = data.home;
    const opt = data.opt;
    const addEad = '#/documents/add';

    const sevpDone = S['task:sevp'] === true || S.sevp === "I've done it";
    const intent = S.stemIntent || data.stem.intent || null;

    /* ---- hero ---- */
    const title = noJob ? "You're on OPT." : h.headline;
    let subline = h.subline;
    if (sevpDone) {
      subline = noEad ? 'Nothing else needs you this week.'
        : 'Nothing else needs you this week. Your STEM OPT window opens Nov 15.';
    }
    const heroHtml = C.hero({ date: data.today.long, eyebrow: h.eyebrow, title: title, subline: subline, halo: true });

    /* ---- three numbers ---- */
    const m = h.metrics;
    const cells = [
      noJob ? { eyebrow: m[0].eyebrow, add: { action: 'Add your job', rest: 'to count these days.', href: '#/case' } }
        : noEad ? { eyebrow: m[0].eyebrow, add: { action: 'Add your EAD card', rest: 'to count these days.', href: addEad } }
        : m[0],
      noEad ? { eyebrow: m[1].eyebrow, add: { action: 'Add your EAD card', rest: 'to see this date.', href: addEad } } : m[1],
      noEad ? { eyebrow: m[2].eyebrow, value: 'Oct 3', date: true, unit: lines('Confirm your details', 'in 3 days'), source: 'reportChanges' }
        : Object.assign({}, m[2], { unit: lines.apply(null, m[2].unit.split(' · ')) }),
    ];
    function lines() { return C.raw(Array.prototype.map.call(arguments, C.esc).join('<br>')); }
    const metricsHtml = C.metrics(cells);

    /* ---- your next move ---- */
    const moves = [];
    if (noJob) moves.push({ key: 'job' });
    if (!sevpDone) moves.push({ key: 'sevp' });
    if (intent !== 'no') moves.push({ key: 'stemIntent' });
    moves.push({ key: 'feeUpdate' });

    /* The first row carries the one filled button on the screen. */
    const primaryKey = moves[0].key;
    const openKey = moves.some((x) => x.key === S.homeOpen) ? S.homeOpen : primaryKey;
    const find = (k) => h.nextMoves.filter((x) => x.key === k)[0] || {};
    const para = (text, src) => '<p>' + C.esc(text) + (src ? C.source(src, { inline: true }) : '') + '</p>';

    function moveRow(k) {
      const isPrimary = k === primaryKey;
      const open = k === openKey;

      if (k === 'job') {
        return C.row({
          key: 'job', open: open,
          title: 'Add your job', meta: 'So Duly can count your unemployment days',
          content: C.disclosure({
            content: para('Duly counts unemployment days from the day your card starts to your first day of work.', 'unemployment'),
            actions: C.button({ label: 'Add your job', kind: isPrimary ? 'primary' : 'pill', href: '#/case' }),
          }),
        });
      }

      if (k === 'sevp') {
        const d = find('sevp');
        return C.row({
          key: 'sevp', open: open,
          title: d.title, meta: d.meta,
          content: C.disclosure({
            content: para('Every six months on OPT, you check your address and employer in the SEVP portal. It takes about five minutes.', d.source),
            actions: C.button({ label: d.primary.label, kind: isPrimary ? 'primary' : 'pill', href: d.primary.href }) +
              C.button({ label: d.quiet.label, kind: 'text', attrs: { 'data-home': 'sevp-done' } }),
          }),
        });
      }

      if (k === 'stemIntent') {
        const d = find('stemIntent');
        if (intent === 'yes') {
          return C.row({
            key: 'stemIntent', open: open,
            title: 'STEM OPT: start preparing', meta: noEad ? 'Your dates come from your EAD card' : 'By Oct 15 · window opens Nov 15, 2026',
            content: C.disclosure({
              content: noEad
                ? '<p>' + C.unknown({ action: 'Add your EAD card', rest: 'to see your STEM OPT dates.', href: addEad }) + '</p>'
                : para('Your window to file opens Nov 15, 2026 and closes Feb 13, 2027.', 'stemOpens'),
              actions: C.button({ label: 'See the plan', kind: isPrimary ? 'primary' : 'pill', href: '#/next' }),
            }),
          });
        }
        const unsure = intent === 'unsure';
        const meta = (noEad ? 'Your dates come from your EAD card' : d.meta) + (unsure ? " · We'll ask again later" : '');
        return C.row({
          key: 'stemIntent', open: open,
          title: d.title, meta: meta,
          content: C.disclosure({
            content: noEad
              ? '<p>' + C.unknown({ action: 'Add your EAD card', rest: 'to see your STEM OPT dates.', href: addEad }) + '</p>'
              : para(d.text, d.source),
            actions: C.button({ label: d.choices[0], kind: isPrimary ? 'primary' : 'pill', attrs: { 'data-home': 'stem-yes' } }) +
              C.button({ label: d.choices[1], kind: 'pill', attrs: { 'data-home': 'stem-no' } }) +
              (unsure ? '' : C.button({ label: d.notSure, kind: 'back', attrs: { 'data-home': 'stem-unsure' } })),
          }),
        });
      }

      const d = find('feeUpdate');
      return C.row({
        key: 'feeUpdate', open: open,
        title: d.title, meta: d.meta,
        content: C.disclosure({ content: para(d.text, 'feeChange'), link: d.link }),
      });
    }

    const nextHtml = C.section({
      eyebrow: 'Your next move',
      cls: 'home-next',
      content: C.list(moves.map((x) => moveRow(x.key)), { label: 'Your next move' }),
    });

    /* ---- what's new ---- */
    const newsHtml = C.section({
      eyebrow: "What's new for your status",
      content: C.list([C.row({ title: h.news.title, meta: h.news.meta, href: h.news.href })], { accordion: false }),
    });

    const style = '<style>' +
      '.screen-home .metric-value-row { display: block; }' +
      '.screen-home .metric-value { display: block; margin-bottom: var(--s-4); }' +
      '.screen-home .metric-unit .inline-src, .screen-home .metric-value-row > .inline-src { margin-left: var(--s-4); }' +
      '.screen-home .metric .bar { margin-top: var(--s-4); }' +
      '.screen-home .disc .btn-group { margin-top: var(--s-16); gap: var(--s-12); }' +
      '.screen-home .disc .btn-pill { height: 44px; }' +
      '.screen-home .disc p .inline-src { margin-left: var(--s-4); vertical-align: baseline; }' +
      '.screen-home .disc .disc-link { align-self: flex-start; margin-top: var(--s-4); }' +
      '</style>';

    return heroHtml + metricsHtml + nextHtml + newsHtml +
      C.footer('Records and dates from your documents, not legal advice. ' + data.checked.today + '.') +
      style;
  },

  mount(root, data) {
    root.classList.add('screen-home');
    const S = App.state;
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function leave(item, then) {
      if (!item || reduced) { then(); return; }
      item.classList.add('is-leaving');
      setTimeout(then, 280);
    }
    function setIntent(v) {
      S.stemIntent = v;
      if (data.stem) data.stem.intent = v;
      App.emit('answer', 'stemIntent', v, null);
    }

    root.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-home]');
      if (!btn) return;
      const item = btn.closest('.item');
      const action = btn.dataset.home;

      if (action === 'sevp-done') {
        leave(item, () => {
          S['task:sevp'] = true;
          S.homeOpen = null;
          App.emit('task', 'sevp', true, null);
          App.rerender();
          App.toast('Marked as done', {
            action: 'Undo',
            onAction: () => { S['task:sevp'] = false; S.sevp = null; S.homeOpen = 'sevp'; App.emit('task', 'sevp', false, null); App.rerender(); },
          });
        });
        return;
      }

      if (action === 'stem-yes') {
        setIntent('yes');
        S.homeOpen = 'stemIntent';
        App.go('next');
        return;
      }

      if (action === 'stem-no') {
        const prev = S.stemIntent || null;
        leave(item, () => {
          setIntent('no');
          S.homeOpen = null;
          App.rerender();
          App.toast('Got it. Duly will show what comes after OPT closer to Feb 13, 2027.', {
            action: 'Undo',
            onAction: () => { setIntent(prev); S.homeOpen = 'stemIntent'; App.rerender(); },
          });
        });
        return;
      }

      if (action === 'stem-unsure') {
        setIntent('unsure');
        S.homeOpen = 'stemIntent';
        App.rerender();
      }
    });
  },
};
