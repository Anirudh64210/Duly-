/* Updates. One hero (the rule change for this student's status), then the
   news, each labelled as news with its source and date.
   Routes:
     #/updates            the sample week
     #/updates/<newsKey>  opens that news row (for links from Home)
     #/updates/empty      both empty states */
window.SCREENS['updates'] = {
  title: 'Updates',

  render(data, params) {
    const u = data.updates;
    const empty = params[0] === 'empty';
    const openKey = !empty && params[0] ? params[0] : null;

    const style = '<style>' +
      '.screen-updates { flex: 1; display: flex; flex-direction: column; }' +
      '.col.is-entering > .screen-updates { animation: none; }' +
      '.col.is-entering > .screen-updates > * { animation: rise .55s var(--ease-rise) backwards; }' +
      '.col.is-entering > .screen-updates > :nth-child(2) { animation-delay: .06s; }' +
      '.col.is-entering > .screen-updates > :nth-child(3) { animation-delay: .16s; }' +
      '.col.is-entering > .screen-updates > :nth-child(4) { animation-delay: .28s; }' +
      '.col.is-entering > .screen-updates > :nth-child(n+5) { animation-delay: .42s; }' +
      '.screen-updates .page-header { margin-bottom: var(--s-48); }' +
      '.screen-updates .section-head { padding-bottom: var(--s-12); }' +
      '.screen-updates .up-kicker { display: flex; flex-wrap: wrap; align-items: baseline; column-gap: var(--s-12); row-gap: var(--s-4); }' +
      '.screen-updates .up-title { margin-top: var(--s-12); max-width: 600px; }' +
      '.screen-updates .up-body { margin-top: var(--s-12); }' +
      '.screen-updates .up-actions { margin-top: var(--s-24); display: flex; flex-wrap: wrap; align-items: center; column-gap: var(--s-24); row-gap: var(--s-8); }' +
      '.screen-updates .up-tag { display: block; margin-bottom: var(--s-4); }' +
      '.screen-updates .up-empty { margin: 0; }' +
      '.screen-updates .disc .disc-link { align-self: flex-start; }' +
      '.screen-updates .footer { margin-top: var(--s-64); }' +
      '</style>';

    const header = C.pageHeader({ title: 'Updates', meta: data.checked.today });

    /* ---- For your status: the one hero ---- */
    const kicker = (meta) => '<p class="up-kicker"><span class="t-eyebrow-hero">For your status</span>' +
      (meta ? '<span class="t-meta">' + C.esc(meta) + '</span>' : '') + '</p>';

    let hero;
    if (empty || !u.status) {
      hero = '<section class="section up-hero" aria-labelledby="up-hero-title">' + kicker(null) +
        '<h2 class="t-sub up-title" id="up-hero-title">' + C.esc(u.emptyStatus) + '</h2>' +
        '</section>';
    } else {
      const s = u.status;
      const readRule = s.source
        ? '<button type="button" class="btn btn-text is-quiet" data-source="' + C.esc(s.source) + '" aria-haspopup="dialog" aria-expanded="false">Read the rule</button>'
        : '';
      hero = '<section class="section up-hero" aria-labelledby="up-hero-title">' + kicker(s.meta) +
        '<h2 class="t-sub up-title" id="up-hero-title">' + C.esc(s.title) + '</h2>' +
        '<p class="t-body up-body">' + C.esc(s.body) + '</p>' +
        '<div class="up-actions">' + C.button({ label: s.link.label, kind: 'primary', href: s.link.href }) + readRule + '</div>' +
        '</section>';
    }

    /* ---- In the news ---- */
    const courtLink = (l) => {
      if (!l) return '';
      if (/^https?:/.test(l.href || '')) {
        return '<a class="disc-link" href="' + C.esc(l.href) + '" target="_blank" rel="noopener">' + C.esc(l.label) + '</a>';
      }
      /* Prototype: the saved link is not filled in yet, so say where it would open. */
      return '<button type="button" class="link disc-link" data-toast="Opens in your browser">' + C.esc(l.label) + '</button>';
    };

    let newsBody;
    if (empty || !u.news || !u.news.length) {
      newsBody = '<p class="t-lead up-empty">' + C.esc(u.emptyNews) + '</p>';
    } else {
      newsBody = C.list(u.news.map((n) => C.row({
        key: n.key,
        title: C.raw('<span class="up-tag t-eyebrow">News</span>' + C.esc(n.title)),
        meta: n.meta.replace(/^News · /, ''),
        open: n.key === openKey,
        content: C.disclosure({ text: n.text }) + courtLink(n.link),
      })), { label: 'News' });
    }
    const news = C.section({ eyebrow: 'In the news', content: newsBody });

    const footer = C.footer('Rule changes appear once their source is checked. News is labelled as news.');

    return '<div class="screen-updates">' + style + header + hero + news + footer + '</div>';
  },

  mount(root, data, params) {
    const key = params[0];
    if (!key || key === 'empty') return;
    const item = root.querySelector('.item[data-key="' + key + '"]');
    if (!item) return;
    App.setOpen(item, true);
    item.scrollIntoView({ block: 'center' });
  },
};
