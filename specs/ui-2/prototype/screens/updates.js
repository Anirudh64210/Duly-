/* News (Round 3, note 6). Articles about the rules for this student's
   status, like a good news app. The route stays #/updates.
   Routes:
     #/updates          the list: the newest story as the lead, then the rest
     #/updates/<id>     one article (App.findUpdate): label, headline, dek,
                        date and source, short paragraphs, one "For you" box,
                        the source link, then more news
     #/updates/empty    the empty state
   Data: DULY_SAMPLE.updates (the NEWS block in data.js). No links jump to
   other parts of the app; the only links are to other articles and to the
   source itself. */
(function () {
  'use strict';

  const e = (s) => C.esc(s);

  /* Layout only. Type sizes come from system.css. */
  const STYLE = '<style>' +
    '.screen-updates .news-lead .row { padding-top: var(--s-32); padding-bottom: var(--s-32); }' +
    '.screen-updates .art-byline { margin-top: var(--s-12); }' +
    '.screen-updates .art-body { display: flex; flex-direction: column; gap: var(--s-16); max-width: 600px; }' +
    '.screen-updates .art-body p { margin: 0; }' +
    '.screen-updates .for-you { margin-top: var(--s-32); max-width: 600px; padding: var(--s-16) var(--s-24);' +
    '  background: var(--surface); border: 1px solid var(--hairline); border-radius: var(--r-card);' +
    '  display: flex; flex-direction: column; gap: var(--s-4); }' +
    '.screen-updates .fy-head { display: flex; align-items: center; gap: var(--s-8); }' +
    '.screen-updates .fy-head p { margin: 0; }' +
    '.screen-updates .fy-answer { margin: var(--s-4) 0 0; }' +
    '.screen-updates .fy-todo { margin: 0; }' +
    '.screen-updates .fy-changed { margin: var(--s-8) 0 0; padding-left: var(--s-16); }' +
    '.screen-updates .art-source { margin-top: var(--s-24); display: flex; flex-wrap: wrap; column-gap: var(--s-8); }' +
    '.screen-updates .art-source a { white-space: nowrap; }' +
    '@media (max-width: 640px) { .screen-updates .for-you { padding: var(--s-16); } }' +
    '</style>';

  const items = (data) => (data.updates && data.updates.items) || [];
  const byline = (u) => [u.date, u.source && u.source.name].filter(Boolean).join(' · ');

  /* ---------------- the list ---------------- */

  function listPage(data, empty) {
    const all = empty ? [] : items(data);
    const header = C.pageHeader({ title: 'News', info: data.updates.pageInfo });
    if (!all.length) return header + C.empty({ text: data.updates.empty || 'No news yet.' });

    const lead = C.updateRow(all[0], { headline: true }).replace('class="item news-row', 'class="item news-row news-lead');
    const rest = all.slice(1).map((u) => C.updateRow(u, { headline: true }));
    return header + C.section({
      content: C.list([lead].concat(rest), { accordion: false, label: 'News' }),
    });
  }

  /* ---------------- one article ---------------- */

  function sourceLine(u) {
    const src = u.source || {};
    if (!src.name) return '';
    const a = src.href && /^https?:/.test(src.href)
      ? '<a class="link" href="' + e(src.href) + '" target="_blank" rel="noopener">' + e(src.label || 'Read the source') + '</a>'
      : '';
    return '<p class="t-meta art-source"><span>Source: ' + e(src.name) + '</span>' + a + '</p>';
  }

  /* The one box for this student: does it affect you, then what to do. The
     answer follows the STEM OPT plan she gave (C.affectsFor), so it matches
     Home. A step a rule change touched is named in plain words, no link. */
  function forYouBox(u) {
    const ans = C.affectsFor(u);
    const todo = u.forYou || ans.todo;
    const changed = (u.changed || []).filter((c) => c && c.title);
    return '<section class="for-you" aria-label="For you">' +
      '<div class="fy-head"><p class="t-eyebrow">For you</p>' + C.info(u.info) + '</div>' +
      (ans.short ? '<p class="t-medium fy-answer">' + C.escText(ans.short) + '</p>' : '') +
      (todo ? '<p class="t-body fy-todo">' + C.escText(todo) + '</p>' : '') +
      (changed.length ? '<ul class="t-body fy-changed">' + changed.map((c) =>
        '<li>' + C.escText(c.title) + (c.change ? ': ' + C.escText(c.change) : '') + '</li>').join('') + '</ul>' : '') +
      '</section>';
  }

  function detailPage(data, u) {
    const header = C.pageHeader({
      back: { label: 'News', href: '#/updates' },
      eyebrow: u.label,
      title: u.title,
      subline: u.dek,
    }).replace('</header>', '<p class="t-meta num art-byline">' + e(byline(u)) + '</p></header>');

    const body = '<article class="art-body" aria-label="' + e(u.title) + '">' +
      (u.article || []).map((t) => '<p class="t-body">' + C.escText(t) + '</p>').join('') +
      '</article>';

    const more = items(data).filter((x) => x.id !== u.id);
    const moreSec = more.length ? C.section({
      eyebrow: 'More news',
      content: C.list(more.map((x) => C.updateRow(x)), { accordion: false, label: 'More news' }),
    }) : '';

    return header + body + forYouBox(u) + sourceLine(u) + moreSec;
  }

  window.SCREENS['updates'] = {
    title: 'News',
    titleFor(params) {
      const u = params[0] && App.findUpdate(params[0]);
      return u ? u.title : 'News';
    },
    render(data, params) {
      const id = params[0];
      const u = id && id !== 'empty' ? App.findUpdate(id) : null;
      const body = u ? detailPage(data, u) : listPage(data, id === 'empty');
      return STYLE + body + C.footer(data.updates.footer);
    },
    mount(root) {
      root.classList.add('screen-updates');
    },
  };
})();
