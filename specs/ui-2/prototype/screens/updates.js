/* Updates. One hero (the rule change for this student's status), then the
   news. The section eyebrow "In the news" labels the rows; each row's meta
   carries only its source and date, with no per-row "News" tag.
   The hero is the page title here: no pageHeader above it.
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
    const intent = App.stemIntent();

    /* ---- For your status: the one hero ---- */
    let hero;
    if (empty || !u.status) {
      hero = C.hero({ eyebrow: 'For your status', title: u.emptyStatus, meta: data.checked.today, icon: null });
    } else {
      const s = u.status;
      /* Until the student has said yes, the link explains STEM OPT instead of
         pointing at steps they have not planned. */
      const link = intent === 'yes' ? s.linkPlanned : s.link;
      hero = C.hero({
        eyebrow: 'For your status',
        title: s.title,
        subline: s.body,
        source: s.source,
        meta: s.meta + ' · ' + data.checked.today,
        icon: null,
        actions: C.button({ label: link.label, kind: 'primary', href: link.href }) +
          C.button({ label: s.notice.label, kind: 'text', href: s.notice.href }),
      });
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
      newsBody = C.empty({ text: u.emptyNews });
    } else {
      /* The eyebrow already says news: drop a leading "News · " from the meta. */
      const newsMeta = (m) => (m || '').replace(/^\s*news\s*·\s*/i, '');
      newsBody = C.list(u.news.map((n) => C.row({
        key: n.key,
        title: n.title,
        meta: newsMeta(n.meta),
        open: n.key === openKey,
        content: C.disclosure({ text: n.text }) + courtLink(n.link),
      })));
    }
    const news = C.section({ eyebrow: 'In the news', content: newsBody });

    return hero + news + C.footer(u.footer);
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
