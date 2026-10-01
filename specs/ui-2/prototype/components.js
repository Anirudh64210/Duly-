/* Duly ui-2 components. Every function returns an HTML string.
   Text props are escaped. Props documented as "html" are inserted as they
   are, so pass the output of other C functions there. To pass markup in a
   text prop, wrap it: C.raw('<strong>..</strong>').
   Behaviour (disclosure, popover, checkbox, choices, toggles, copy, edit in
   place, destructive confirm) is wired once in app.js by data attributes. */

(function () {
  'use strict';

  const MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(v) {
    if (v == null || v === false) return '';
    if (typeof v === 'object' && '__html' in v) return v.__html;
    return String(v).replace(/[&<>"']/g, (c) => MAP[c]);
  }
  /* Display text: escaped, and the hyphen in a form or status name (I-20,
     I-983, E-Verify, F-1, H-1B) made non-breaking, so a phone never splits
     it across two lines. Used for titles, metas and hero text; not for
     attributes, fields or the email a student copies. */
  function escText(v) {
    if (v != null && typeof v === 'object' && '__html' in v) return v.__html;
    return esc(v).replace(/\b([A-Z])-(?=[0-9A-Z])/g, '$1\u2011');
  }
  function raw(html) { return { __html: html == null ? '' : String(html) }; }
  function cls() { return Array.prototype.filter.call(arguments, Boolean).join(' '); }
  function attrs(obj) {
    if (!obj) return '';
    return Object.keys(obj).map((k) => {
      const v = obj[k];
      if (v == null || v === false) return '';
      if (v === true) return ' ' + k;
      return ' ' + k + '="' + esc(String(v)) + '"';
    }).join('');
  }
  let seq = 0;
  function uid(p) { seq += 1; return (p || 'c') + '-' + seq; }
  function isExternal(href) { return /^https?:/.test(href || ''); }
  function hrefAttrs(href) {
    return isExternal(href) ? { href: href, target: '_blank', rel: 'noopener' } : { href: href };
  }

  /* ---------------------------------------------------------------- */
  /* Icons                                                              */
  /* ---------------------------------------------------------------- */

  const ICONS = {
    shield: [16, '<path d="M8 1.5l5.5 2.5v4c0 3.2-2.3 5.6-5.5 6.5-3.2-.9-5.5-3.3-5.5-6.5v-4z" fill="currentColor"/><path d="M5.6 8.1l1.7 1.7 3.1-3.7" stroke="var(--on-accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'],
    chevron: [14, '<path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>', '0 0 16 16'],
    tick: [12, '<path d="M3.2 8.3l3 3 6.6-6.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>', '0 0 16 16'],
    checkFilled: [18, '<circle cx="9" cy="9" r="9" fill="currentColor"/><path d="M5.4 9.3l2.4 2.4 4.8-5" fill="none" stroke="var(--on-accent)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>'],
    calendar: [16, '<rect x="2.5" y="3.5" width="11" height="10" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>'],
    home: [24, '<path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>'],
    next: [24, '<circle cx="12" cy="12" r="8.25" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10.5 8.5 14 12l-3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>'],
    timeline: [24, '<path d="M7 4v16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="7" cy="8" r="2" fill="var(--ground)" stroke="currentColor" stroke-width="1.6"/><circle cx="7" cy="16" r="2" fill="var(--ground)" stroke="currentColor" stroke-width="1.6"/><path d="M12 8h7M12 16h7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'],
    documents: [24, '<path d="M7 3.5h6.5l4 4v12.5a.5.5 0 0 1-.5.5H7a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M13.5 3.5v4h4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>'],
    uscis: [24, '<path d="M12 3.5 19 6.5v5c0 4.2-2.9 7.4-7 8.9-4.1-1.5-7-4.7-7-8.9v-5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 12l2.2 2.2L15.2 10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>'],
    news: [24, '<rect x="3.5" y="5" width="13" height="14.5" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M16.5 9h3a1 1 0 0 1 1 1v8a1.5 1.5 0 0 1-3 0V9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M7 9h6M7 12.5h6M7 16h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'],
    link: [16, '<path d="M6.8 9.2a2.6 2.6 0 0 0 3.7 0l2.2-2.2a2.6 2.6 0 0 0-3.7-3.7l-.9.9M9.2 6.8a2.6 2.6 0 0 0-3.7 0L3.3 9a2.6 2.6 0 0 0 3.7 3.7l.9-.9" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>'],
    file: [16, '<path d="M4.5 2h5l3 3v8.5a.5.5 0 0 1-.5.5H4.5a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M9.5 2v3h3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>'],
    close: [16, '<path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'],
    source: [16, '<circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M8 7.2v3.8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="8" cy="5.1" r=".85" fill="currentColor"/>'],
    share: [16, '<path d="M8 10V2.5M5.2 5.1 8 2.3l2.8 2.8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 7H4.5a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-1" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>'],
  };
  function icon(name, opts) {
    const def = ICONS[name];
    if (!def) return '';
    const o = opts || {};
    const size = o.size || def[0];
    const box = def[2] || ('0 0 ' + def[0] + ' ' + def[0]);
    return '<svg class="' + esc(cls('icon', 'icon-' + name, o.cls)) + '" width="' + size + '" height="' + size +
      '" viewBox="' + box + '" aria-hidden="true" focusable="false">' + def[1] + '</svg>';
  }

  /* ---------------------------------------------------------------- */
  /* Shell                                                              */
  /* ---------------------------------------------------------------- */

  /* Navigation (Round 3, note 7): human labels, each distinct from the rest.
     Old routes redirect (App.ALIASES in app.js): next and checklists go to
     steps, applications to uscis. Tab and sidebar use the same label;
     Timeline lives in Menu on a phone. */
  const NAV = [
    { name: 'home', label: 'Home', tab: true, icon: 'home' },
    { name: 'steps', label: 'Next steps', tab: true, icon: 'next' },
    { name: 'uscis', label: 'USCIS status', tab: true, icon: 'uscis' },
    { name: 'documents', label: 'Documents', tab: true, icon: 'documents' },
    { name: 'updates', label: 'News', tab: true, icon: 'news' },
    { name: 'timeline', label: 'Timeline' },
  ];
  const NAV_SECONDARY = [
    { name: 'case', label: 'Your profile' },
    { name: 'settings', label: 'Settings' },
    { name: 'feedback', label: 'Feedback' },
  ];

  /* wordmark({ large?, link = true }) : link false draws it as plain text,
     for onboarding, where the logo must not be a way out of setup. */
  function wordmark(o) {
    const p = o || {};
    const c = cls('wordmark', p.large && 'is-large');
    const inner = 'Duly<span class="dot" aria-hidden="true">.</span>';
    return p.link === false ? '<span class="' + c + '">' + inner + '</span>' : '<a class="' + c + '" href="#/home">' + inner + '</a>';
  }

  function navItem(p) {
    return '<a class="nav-item" href="#/' + esc(p.name) + '"' + (p.active ? ' aria-current="page"' : '') + '>' +
      '<span>' + esc(p.label) + '</span>' +
      (p.waiting ? '<span class="wait-dot" role="img" aria-label="Something here is waiting for you"></span>' : '') +
      '</a>';
  }
  function navList(items, route, waiting) {
    return '<nav class="nav">' + items.map((n) => navItem({
      name: n.name, label: n.label, active: n.name === route, waiting: (waiting || []).indexOf(n.name) !== -1,
    })).join('') + '</nav>';
  }
  function sidebar(p) {
    return '<aside class="sidebar" aria-label="Main">' + wordmark() +
      navList(NAV, p.route, p.waiting) +
      '<div class="sidebar-spacer"></div>' +
      navList(NAV_SECONDARY, p.route, p.waiting) +
      '</aside>';
  }
  function topbar(p) {
    return '<header class="topbar">' + wordmark() +
      '<div class="topbar-right">' + (p && p.date ? '<span class="t-micro">' + esc(p.date) + '</span>' : '') +
      '<button class="btn btn-text" type="button" data-menu aria-expanded="false" aria-controls="menu">Menu</button></div>' +
      '</header>';
  }
  function menuSheet(p) {
    return '<div class="menu" id="menu" role="dialog" aria-label="Menu">' +
      navList(NAV, p.route, p.waiting) + navList(NAV_SECONDARY, p.route, p.waiting) + '</div>';
  }
  function tabbar(p) {
    return '<nav class="tabbar" aria-label="Main">' + NAV.filter((n) => n.tab).map((n) =>
      '<a class="tab" href="#/' + n.name + '"' + (n.name === p.route ? ' aria-current="page"' : '') + '>' +
      icon(n.icon) + '<span>' + esc(n.label) + '</span></a>').join('') + '</nav>';
  }

  /* ---------------------------------------------------------------- */
  /* Headers and hero                                                   */
  /* ---------------------------------------------------------------- */

  /* backLink({ label?, href? }) : the quiet link at the top of a drilled-in
     page (an update, an application, a document). It points to the page the
     student came from (App.from, kept by the router); label and href are the
     fallback when the page was opened directly. app.js turns a click into
     history.back() when that returns to the same place, so the scroll
     position comes back too. */
  function backLink(p) {
    const o = p || {};
    const from = window.App && window.App.from;
    const href = from && from.hash ? from.hash : (o.href || '#/home');
    const label = from && from.title ? from.title : (o.label || 'Home');
    return '<a class="back-link" href="' + esc(href) + '" data-back>' + icon('chevron', { cls: 'back-chev' }) + '<span>' + esc(label) + '</span></a>';
  }

  /* titleWith(h1Html, infoText) : the h1 with its ⓘ beside it, outside the
     heading so the heading's name stays the title alone. */
  function titleWith(h1, text) {
    return text ? '<div class="title-row">' + h1 + info(text) + '</div>' : h1;
  }

  /* pageHeader({ title, info?, subline?, meta?, eyebrow?, aside? (html), progress? {pct, label},
                  back? (true or backLink props) })
     info: what the page does, behind an ⓘ beside the title (Round 3). Prefer it
     to subline; keep subline for a fact the student must see (a date). */
  function pageHeader(p) {
    const hasMeta = !!p.meta;
    return (p.back ? backLink(p.back === true ? null : p.back) : '') +
      '<header class="page-header">' +
      (p.eyebrow ? '<p class="ph-eyebrow t-eyebrow-hero">' + escText(p.eyebrow) + '</p>' : '') +
      '<div class="' + cls('ph-top', hasMeta && 'has-meta') + '">' +
      titleWith('<h1 class="t-big" tabindex="-1">' + escText(p.title) + '</h1>', p.info) +
      (hasMeta ? '<span class="ph-meta">' + esc(p.meta) + '</span>' : '') +
      (p.aside ? '<div class="ph-aside">' + p.aside + '</div>' : '') +
      '</div>' +
      (p.subline ? '<p class="ph-sub t-lead">' + escText(p.subline) + '</p>' : '') +
      (p.progress ? progress(p.progress) : '') +
      '</header>';
  }

  function dateLine(text) { return '<p class="date-line num">' + esc(text) + '</p>'; }

  /* hero({ eyebrow, title, info?, subline?, meta?, icon: 'shield'|null, halo?, source?, date?, actions? (html) })
     The one hero per screen. Where a screen has a hero, the hero is its h1
     and the screen has no pageHeader. info: the explanation, behind an ⓘ
     beside the title. meta is a quiet line under the subline, e.g.
     'Rules checked Sep 30'. */
  function hero(p) {
    const iconHtml = p.icon === null ? '' : shield({ halo: p.halo });
    return (p.back ? backLink(p.back === true ? null : p.back) : '') +
      (p.date ? dateLine(p.date) : '') +
      '<section class="hero" aria-labelledby="hero-title">' +
      (p.eyebrow ? '<p class="hero-eyebrow">' + iconHtml + '<span class="t-eyebrow-hero">' + esc(p.eyebrow) + '</span></p>' : '') +
      titleWith('<h1 class="hero-title t-big" id="hero-title" tabindex="-1">' + escText(p.title) + '</h1>', p.info) +
      (p.subline ? '<p class="hero-sub t-lead"><span>' + escText(p.subline) + '</span>' + (p.source ? source(p.source, { inline: true }) : '') + '</p>' : '') +
      (p.meta ? '<p class="hero-meta">' + esc(p.meta) + '</p>' : '') +
      (p.actions ? '<div class="hero-actions">' + p.actions + '</div>' : '') +
      '</section>';
  }

  function shield(o) {
    return '<span class="shield" aria-hidden="true">' + (o && o.halo ? '<span class="halo"></span>' : '') + icon('shield') + '</span>';
  }

  /* metrics([{ eyebrow, value?, unit?, bar? (0..100), source?, info?, asOf?, add? {action, rest, href} }])
     Every value, a count or a date, is set at the one metric figure size.
     info: a short explanation behind an ⓘ, used when there is no source.
     asOf: a quiet line under the value (and its bar), e.g. 'As of Sep 30'. */
  function metrics(cells) {
    const out = [];
    cells.forEach((m, i) => {
      if (i > 0) out.push('<div class="metric-divider" aria-hidden="true"></div>');
      let body;
      if (m.add) {
        body = '<p class="metric-add">' + unknown(m.add) + '</p>';
      } else {
        body = '<div class="metric-value-row">' +
          '<span class="metric-value">' + esc(m.value) + '</span>' +
          (m.unit ? '<span class="metric-unit">' + esc(m.unit) + '</span>' : '') +
          (m.source ? source(m.source, { inline: true }) : (m.info ? info(m.info) : '')) + '</div>' +
          (m.bar != null ? bar(m.bar) : '') +
          (m.asOf ? '<p class="metric-asof num">' + esc(m.asOf) + '</p>' : '');
      }
      out.push('<div class="metric"><p class="t-eyebrow">' + esc(m.eyebrow) + '</p>' + body + '</div>');
    });
    return '<section class="metrics" aria-label="Your numbers">' + out.join('') + '</section>';
  }

  function bar(pct, label) {
    const v = Math.max(0, Math.min(100, Number(pct) || 0));
    return '<div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + v + '"' +
      (label ? ' aria-label="' + esc(label) + '"' : '') + '><i style="width:' + v + '%"></i></div>';
  }
  /* progress({ pct, label, suffix? }) : 180px bar, 16, meta. With suffix, app.js rewrites the
     label as "N of M done · suffix" when a task is checked. */
  function progress(p) {
    return '<div class="progress" data-progress>' + bar(p.pct, p.label) + '<span class="t-meta num" data-progress-label' +
      (p.suffix ? ' data-suffix="' + esc(p.suffix) + '"' : '') + '>' + esc(p.label) + '</span></div>';
  }

  /* ---------------------------------------------------------------- */
  /* Sections, lists, rows                                              */
  /* ---------------------------------------------------------------- */

  /* section({ eyebrow, info?, content (html), link? {label, href}, waiting?, id?, label? })
     info: a short explanation behind an ⓘ beside the eyebrow. */
  function section(p) {
    const headId = uid('sh');
    const h2 = '<h2 class="sh-label t-eyebrow" id="' + headId + '">' +
      (p.waiting ? '<span class="wait-dot" aria-hidden="true"></span>' : '') + esc(p.eyebrow) + '</h2>';
    return '<section class="' + cls('section', p.waiting && 'waiting', p.cls) + '"' + (p.id ? ' id="' + esc(p.id) + '"' : '') +
      (p.eyebrow ? ' aria-labelledby="' + headId + '"' : '') + '>' +
      (p.eyebrow ? '<div class="section-head">' + (p.info ? '<div class="sh-start">' + h2 + info(p.info) + '</div>' : h2) +
        (p.link ? link(p.link) : '') + '</div>' : '') +
      (p.content || '') + '</section>';
  }

  /* list(items: html[], { accordion = true, label? }) */
  function list(items, o) {
    const opt = o || {};
    const acc = opt.accordion === false ? '' : ' data-accordion';
    return '<div class="list"' + acc + (opt.label ? ' aria-label="' + esc(opt.label) + '"' : '') + '>' + items.join('') + '</div>';
  }

  /* row({ title, meta?, metaAct?, value?, source?, info?, lead? (html), content? (html, makes a disclosure),
           open?, href?, trailing? (html), key?, cls?, nowTag? })
     info: a short explanation behind an ⓘ in the trailing column. Not on a
     link row (the whole row is the link); put it on the page it opens.
     With content: the whole row is the button, chevron right, one open per list.
     With href: the row is a link with a chevron.
     Otherwise: a static row. */
  function row(p) {
    const isDisc = !!p.content;
    const isLink = !isDisc && !!p.href;
    const discId = isDisc ? uid('disc') : '';
    const chevron = (isDisc || isLink) && p.chevron !== false ? icon('chevron', { cls: 'chev' }) : '';
    const trail = [
      p.value ? '<span class="row-value">' + esc(p.value) + '</span>' : '',
      p.trailing || '',
      p.source ? source(p.source) : '',
      p.info && !isLink ? info(p.info, { inline: false }) : '',
      chevron,
    ].join('');
    const inner = (p.lead ? '<span class="row-lead">' + p.lead + '</span>' : '') +
      '<span class="row-text">' +
      '<span class="row-title">' + (p.nowTag ? nowTag() : '') + escText(p.title) + '</span>' +
      (p.meta ? '<span class="' + cls('row-meta', p.metaAct && 'is-act') + '">' + escText(p.meta) + '</span>' : '') +
      (p.below || '') +
      '</span>' +
      (trail ? '<span class="row-trail">' + trail + '</span>' : '');
    let head;
    if (isDisc) {
      head = '<div class="row" role="button" tabindex="0" data-disclosure aria-expanded="' + (p.open ? 'true' : 'false') + '" aria-controls="' + discId + '">' + inner + '</div>';
    } else if (isLink) {
      head = '<a class="row"' + attrs(hrefAttrs(p.href)) + '>' + inner + '</a>';
    } else {
      head = '<div class="row is-static">' + inner + '</div>';
    }
    return '<div class="' + cls('item', p.lead && 'has-lead', p.open && 'is-open', p.cls) + '"' + (p.key ? ' data-key="' + esc(p.key) + '"' : '') + '>' +
      head +
      (isDisc ? '<div class="disc" id="' + discId + '"' + (p.open ? '' : ' hidden') + '>' + p.content + '</div>' : '') +
      '</div>';
  }

  /* disclosure({ text?: string|string[], content? (html), actions? (html), link? {label, href} }) */
  function disclosure(p) {
    const paras = p.text == null ? [] : (Array.isArray(p.text) ? p.text : [p.text]);
    return paras.map((t) => '<p>' + escText(t) + '</p>').join('') +
      (p.content || '') +
      (p.actions ? '<div class="btn-group">' + p.actions + '</div>' : '') +
      (p.link ? '<a class="disc-link"' + attrs(hrefAttrs(p.link.href)) + '>' + esc(p.link.label) + '</a>' : '');
  }

  /* valueRow({ label, value, key?, editable = true, source?, num? })
     The question in a 200px column, the answer beside it (left-aligned), and
     the source mark trailing the answer text, so every answer shares one edge. */
  function valueRow(p) {
    const editable = p.editable !== false;
    const val = editable
      ? '<button type="button" class="' + cls('v-value', p.num && 'num') + '" data-edit="' + esc(p.key || '') + '" aria-label="' + esc(p.label + ': ' + p.value + '. Change') + '">' + esc(p.value) + '</button>'
      : '<span class="' + cls('v-value', p.num && 'num') + '">' + esc(p.value) + '</span>';
    return '<div class="item vrow"' + (p.key ? ' data-key="' + esc(p.key) + '"' : '') + '><div class="row is-static">' +
      '<span class="v-label">' + esc(p.label) + '</span>' +
      '<span class="v-cell">' + val + (p.source ? source(p.source) : '') + '</span>' +
      '</div></div>';
  }

  /* settingRow({ title, meta?, control (html), wide? }) */
  function settingRow(p) {
    return '<div class="' + cls('item srow', p.wide && 'is-wide') + '"><div class="row is-static">' +
      '<span class="row-text"><span class="row-title">' + esc(p.title) + '</span>' +
      (p.meta ? '<span class="row-meta">' + esc(p.meta) + '</span>' : '') + '</span>' +
      (p.control ? '<span class="s-control">' + p.control + '</span>' : '') +
      '</div></div>';
  }

  /* ---------------------------------------------------------------- */
  /* Tasks                                                              */
  /* ---------------------------------------------------------------- */

  function checkbox(p) {
    return '<button type="button" class="check" role="checkbox" aria-checked="' + (p.checked ? 'true' : 'false') + '"' +
      (p.key ? ' data-task="' + esc(p.key) + '"' : '') +
      ' aria-label="' + esc(p.label || 'Done') + '">' + icon('tick', { size: 12 }) + '</button>';
  }

  /* task({ key, title, meta?, info?, done?, doneMeta?, source?, open? {label, href}, caution?, cautionSource?,
             below? (html), action? (html), onDone? (html) })
     meta: a date or a fact, short. info: any explanation, behind an ⓘ.
     caution: a quiet line under the meta (e.g. a fee change), with its own
     source mark when cautionSource is given. below: extra html under the
     meta (e.g. C.unknown). onDone: html shown only while the task is
     checked; app.js shows and hides it when the checkbox changes. */
  /* task(... also:
       school?     true: a quiet "Your school" mark beside the title
       updated?    { date, href }: a rule change touched this step, "Updated Sep 30"
       waitingOn?  { key, title, done }: a Before school step. Shows
                   "Waiting on: <title>" until that step is done; app.js hides
                   and shows it in place when the school step is checked.
       afterOf?    { key, done }: an After school step. The row stays hidden
                   until the federal step <key> is done; app.js reveals it in place.
     Round 5 (note 3):
       current?    true: the step that is now. A quiet tinted row. When the
                   student ticks it, app.js moves "current" to the next open
                   step in the same list, with a short highlight
                   (App.advanceCurrent). Mark one step per list.
       detail?     html: the step expands in place. A chevron at the end of the
                   row (and a tap on the title) opens it, the same as any
                   disclosure row; expanded? true starts it open. */
  function task(p) {
    const openLink = p.open ? '<a class="task-open"' + attrs(hrefAttrs(p.open.href)) + '>' + esc(p.open.label) + '</a>' : '';
    const w = p.waitingOn;
    const below = (w ? '<span class="task-waiting" data-waits="' + esc(w.key) + '"' + (w.done ? ' hidden' : '') + '>Waiting on: ' + esc(w.title) + '</span>' : '') +
      (p.caution ? '<span class="caution">' + escText(p.caution) + (p.cautionSource ? source(p.cautionSource, { inline: true }) : '') + '</span>' : '') +
      (p.below ? '<span class="task-below">' + p.below + '</span>' : '') +
      (p.onDone ? '<span class="task-on-done" data-on-done' + (p.done ? '' : ' hidden') + '>' + p.onDone + '</span>' : '') +
      (p.action ? '<span class="task-action">' + p.action + '</span>' : '');
    const marks = (p.school ? schoolMark() : '') + (p.updated ? updatedMark(p.updated) : '');
    const after = p.afterOf ? ' data-after="' + esc(p.afterOf.key) + '"' + (p.afterOf.done ? '' : ' hidden') : '';
    const metaText = p.done && p.doneMeta ? p.doneMeta : p.meta;
    const discId = p.detail ? uid('disc') : '';
    const more = p.detail ? '<button type="button" class="task-more" data-disclosure aria-expanded="' + (p.expanded ? 'true' : 'false') + '" aria-controls="' + discId + '" aria-label="' + esc('Details: ' + p.title) + '">' + icon('chevron', { cls: 'chev' }) + '</button>' : '';
    const trail = openLink + (p.source ? source(p.source) : '') + (p.info ? info(p.info, { inline: false }) : '') + more;
    return '<div class="' + cls('item task', p.done && 'is-done', p.school && 'is-school', p.current && 'is-current', p.detail && 'has-detail', p.detail && p.expanded && 'is-open') + '" data-key="' + esc(p.key || '') + '"' + after +
      (p.current ? ' aria-current="step"' : '') + '><div class="row is-static">' +
      checkbox({ checked: p.done, key: p.key, label: p.title }) +
      '<span class="row-text"><span class="row-title">' + escText(p.title) + (marks ? ' <span class="marks">' + marks + '</span>' : '') + '</span>' +
      '<span class="row-meta" data-meta="' + escText(p.meta || '') + '"' + (p.doneMeta ? ' data-done-meta="' + escText(p.doneMeta) + '"' : '') +
      (metaText ? '' : ' hidden') + '>' +
      escText(metaText) + '</span>' + below + '</span>' +
      (trail ? '<span class="row-trail">' + trail + '</span>' : '') +
      '</div>' +
      (p.detail ? '<div class="disc task-detail" id="' + discId + '"' + (p.expanded ? '' : ' hidden') + '>' + p.detail + '</div>' : '') +
      '</div>';
  }

  /* ongoing({ key?, title, meta?, source?, info? }) : a standing rule, e.g. "Report any job change
     within 10 days". A plain row with no checkbox, since it is never done. */
  function ongoing(p) {
    const trail = (p.source ? source(p.source) : '') + (p.info ? info(p.info, { inline: false }) : '');
    return '<div class="item ongoing"' + (p.key ? ' data-key="' + esc(p.key) + '"' : '') + '><div class="row is-static">' +
      '<span class="row-text"><span class="row-title">' + escText(p.title) + '</span>' +
      (p.meta ? '<span class="row-meta">' + escText(p.meta) + '</span>' : '') + '</span>' +
      (trail ? '<span class="row-trail">' + trail + '</span>' : '') +
      '</div></div>';
  }

  /* doneGroup({ count, content (html), title = 'You did this' }) : done steps folded into one row */
  function doneGroup(p) {
    return row({ title: p.title || 'You did this', meta: p.count + ' done', content: p.content, key: 'done-group' });
  }

  function phaseMark(state) {
    if (state === 'done') return '<span class="phase-mark is-done" role="img" aria-label="Done">' + icon('tick', { size: 10 }) + '</span>';
    if (state === 'now') return '<span class="phase-mark is-now" role="img" aria-label="Now"></span>';
    return '<span class="phase-mark is-next" role="img" aria-label="Later"></span>';
  }
  function nowTag() { return '<span class="now-tag">NOW</span>'; }

  /* ---------------------------------------------------------------- */
  /* Waiting for you and inline asks                                    */
  /* ---------------------------------------------------------------- */

  /* ask({ key, title, meta?, choices: string[] | [{label, value}], notSure?, note? }) */
  function ask(p) {
    const choices = (p.choices || []).map((c) => {
      const o = typeof c === 'string' ? { label: c, value: c } : c;
      return '<button type="button" class="btn btn-pill" data-answer="' + esc(p.key) + '" data-value="' + esc(o.value) + '">' + esc(o.label) + '</button>';
    }).join('');
    const unsure = p.notSure ? '<button type="button" class="btn btn-text is-quiet is-small" data-answer="' + esc(p.key) + '" data-value="unsure">' + esc(p.notSure) + '</button>' : '';
    return '<div class="item ask" data-key="' + esc(p.key) + '"><div class="row is-static"><span class="row-text">' +
      '<span class="row-title">' + esc(p.title) + '</span>' +
      (p.meta ? '<span class="row-meta">' + esc(p.meta) + '</span>' : '') +
      '<span class="ask-actions">' + choices + unsure + '</span>' +
      '<span class="ask-note" data-ask-note' + (p.note ? '' : ' hidden') + '>' + esc(p.note || "You'll be asked again later.") + '</span>' +
      '</span></div></div>';
  }

  /* waiting({ items: [{ title, meta?, add? {label='Add', href} } | ask props with choices], max = 3, more? {label, href}, eyebrow?, id? })
     The one look for "Waiting for you": a section eyebrow with the dot, then
     plain rows. Use it on every screen that asks something; never put an
     eyebrow inside a row. Items that are asks render with C.ask. A row
     without add has no trailing action (e.g. onboarding's finish list). */
  function waiting(p) {
    const max = p.max || 3;
    const shown = p.items.slice(0, max).map((it) => {
      if (it.choices) return ask(it);
      const add = it.add;
      return row({
        title: it.title, meta: it.meta, key: it.key,
        trailing: add ? '<a class="btn btn-text is-small"' + attrs(hrefAttrs(add.href || '#')) + '>' + esc(add.label || 'Add') + '</a>' : '',
      });
    });
    const rest = p.items.length - max;
    const more = rest > 0 ? '<div class="waiting-more">' + link({ label: (p.more && p.more.label) || ('See ' + rest + ' more'), href: (p.more && p.more.href) || '#' }) + '</div>' : '';
    return section({ eyebrow: p.eyebrow || 'Waiting for you', waiting: true, id: p.id, content: list(shown, { accordion: false }) + more });
  }

  /* unknown({ action, rest?, href }) : "Add your EAD card to see this date." with the action as the link */
  function unknown(p) {
    return '<span class="unknown"><a' + attrs(hrefAttrs(p.href || '#')) + '>' + esc(p.action) + '</a>' + (p.rest ? ' ' + esc(p.rest) : '') + '</span>';
  }

  /* empty({ text, action? (html) }) */
  function empty(p) {
    return '<div class="empty"><p class="t-lead">' + esc(p.text) + '</p>' + (p.action || '') + '</div>';
  }

  /* ---------------------------------------------------------------- */
  /* Buttons and links                                                  */
  /* ---------------------------------------------------------------- */

  /* button({ label, kind: 'primary'|'pill'|'text'|'back', href?, key?, disabled?, full?, attrs? }) */
  function button(p) {
    const kind = p.kind || 'pill';
    const c = cls('btn',
      kind === 'primary' && 'btn-primary',
      kind === 'pill' && 'btn-pill',
      (kind === 'text' || kind === 'back') && 'btn-text',
      kind === 'back' && 'is-quiet',
      p.small && 'is-small',
      p.full && 'is-full', p.cls);
    const extra = Object.assign({}, p.attrs || {}, p.key ? { 'data-action': p.key } : {});
    if (p.href && !p.disabled) return '<a class="' + c + '"' + attrs(Object.assign(hrefAttrs(p.href), extra)) + '>' + esc(p.label) + '</a>';
    return '<button type="' + (p.type || 'button') + '" class="' + c + '"' + attrs(extra) + (p.disabled ? ' disabled' : '') + '>' + esc(p.label) + '</button>';
  }
  /* buttonRow({ back? (html or html[]), primary? (html) }) : the one placement rule
     (system.css): a right-aligned group, the quiet actions (Back, Cancel, Fix one)
     first on the left, the primary last on the right, 24 above. */
  function buttonRow(p) {
    const quiet = Array.isArray(p.back) ? p.back.join('') : (p.back || '');
    return '<div class="btn-row">' + quiet + (p.primary || '') + '</div>';
  }
  function btnGroup(html) { return '<div class="btn-group">' + (Array.isArray(html) ? html.join('') : html) + '</div>'; }

  /* link({ label, href, quiet? }) */
  function link(p) {
    return '<a class="' + cls('link', p.quiet && 'is-quiet') + '"' + attrs(hrefAttrs(p.href || '#')) + '>' + esc(p.label) + '</a>';
  }

  /* danger({ label, confirm, confirmLabel, keepLabel, key }) : quiet pill, inline confirm, no red */
  function danger(p) {
    const id = uid('danger');
    return '<div class="danger" data-danger="' + esc(p.key || '') + '">' +
      '<button type="button" class="btn btn-pill" data-confirm="' + id + '">' + esc(p.label) + '</button>' +
      '<div class="danger-confirm" id="' + id + '" hidden role="group" aria-label="' + esc(p.label) + '">' +
      '<p>' + esc(p.confirm) + '</p>' +
      buttonRow({
        back: '<button type="button" class="btn btn-text is-quiet" data-keep="' + id + '">' + esc(p.keepLabel || 'Keep') + '</button>',
        primary: '<button type="button" class="btn btn-pill" data-confirmed="' + esc(p.key || '') + '">' + esc(p.confirmLabel || p.label) + '</button>',
      }) +
      '</div></div>';
  }

  /* ---------------------------------------------------------------- */
  /* Fields and choices                                                 */
  /* ---------------------------------------------------------------- */

  /* field({ label?, key, value?, placeholder?, help?, error?, type = 'text', inputmode?, autocomplete? }) */
  function field(p) {
    const id = uid('f');
    const helpId = p.help || p.error ? id + '-help' : '';
    return '<div class="field">' +
      (p.label ? '<label class="field-label" for="' + id + '">' + esc(p.label) + '</label>' : '') +
      '<input class="input" id="' + id + '"' + attrs({
        type: p.type || 'text', name: p.key, 'data-field': p.key, value: p.value, placeholder: p.placeholder,
        inputmode: p.inputmode, autocomplete: p.autocomplete || 'off', 'aria-describedby': helpId || null,
        'aria-label': p.label ? null : (p.ariaLabel || p.placeholder), 'aria-invalid': p.error ? 'true' : null,
      }) + '>' +
      (p.suggest ? '<div class="suggest" role="listbox" data-suggest="' + esc(p.key) + '" hidden></div>' : '') +
      (p.error ? '<p class="field-error" id="' + helpId + '">' + esc(p.error) + '</p>' : (p.help ? '<p class="field-help" id="' + helpId + '">' + esc(p.help) + '</p>' : '')) +
      '</div>';
  }

  /* textarea({ label?, key, value?, placeholder?, help?, rows = 5, ariaLabel? }) */
  function textarea(p) {
    const id = uid('f');
    return '<div class="field">' +
      (p.label ? '<label class="field-label" for="' + id + '">' + esc(p.label) + '</label>' : '') +
      '<textarea class="input" id="' + id + '" rows="' + (p.rows || 5) + '"' + attrs({
        name: p.key, 'data-field': p.key, placeholder: p.placeholder,
        'aria-label': p.label ? null : (p.ariaLabel || p.placeholder),
        'aria-describedby': p.help ? id + '-help' : null,
      }) + '>' + esc(p.value || '') + '</textarea>' +
      (p.help ? '<p class="field-help" id="' + id + '-help">' + esc(p.help) + '</p>' : '') +
      '</div>';
  }

  /* dateField({ label, key, value?, from? 'From your EAD card', notSure?, help? }) */
  function dateField(p) {
    const id = uid('d');
    return '<div class="field">' +
      (p.label ? '<label class="field-label" for="' + id + '">' + esc(p.label) + '</label>' : '') +
      '<div class="date-wrap"><div class="date-box">' +
      '<input class="input" id="' + id + '"' + attrs({ type: 'text', name: p.key, 'data-field': p.key, 'data-date': '', value: p.value, placeholder: p.placeholder || 'Feb 9, 2027', autocomplete: 'off', inputmode: 'text' }) + '>' +
      icon('calendar') + '</div>' +
      (p.notSure ? '<button type="button" class="link" data-answer="' + esc(p.key) + '" data-value="unsure">I\'m not sure</button>' : '') +
      '</div>' +
      (p.from ? '<p class="date-prov"><span>' + esc(p.from) + '</span><button type="button" class="link" data-focus="' + id + '">Change</button></p>' : '') +
      (p.help ? '<p class="field-help">' + esc(p.help) + '</p>' : '') +
      '</div>';
  }
  /* dateRange({ from: dateField props, to: dateField props }) */
  function dateRange(p) {
    return '<div class="date-range">' + dateField(p.from) + '<span class="to" aria-hidden="true">to</span>' + dateField(p.to) + '</div>';
  }

  /* choices({ key, options: [{ value, title, meta? }], selected?, notSure? (true or meta text), layout: 'stack'|'pair'|'row', cols?, label? }) */
  function choices(p) {
    const opts = (p.options || []).slice();
    if (p.notSure) opts.push({ value: 'unsure', title: "I'm not sure", meta: typeof p.notSure === 'string' ? p.notSure : null });
    const layout = p.layout || 'stack';
    const style = layout === 'row' ? ' style="--cols:' + (p.cols || opts.length) + '"' : '';
    return '<div class="' + cls('choices', layout === 'pair' && 'is-pair', layout === 'row' && 'is-row') + '" role="radiogroup" data-choices="' + esc(p.key) + '"' +
      (p.label ? ' aria-label="' + esc(p.label) + '"' : '') + style + '>' +
      opts.map((o, i) => {
        const on = p.selected != null && String(p.selected) === String(o.value);
        const tabbable = on || (p.selected == null && i === 0);
        return '<button type="button" class="choice" role="radio" aria-checked="' + (on ? 'true' : 'false') + '" tabindex="' + (tabbable ? '0' : '-1') + '" data-value="' + esc(o.value) + '">' +
          '<span class="choice-text"><span class="choice-title">' + esc(o.title) + '</span>' +
          (o.meta ? '<span class="choice-meta">' + esc(o.meta) + '</span>' : '') + '</span>' +
          '<span class="choice-mark">' + icon('checkFilled') + '</span></button>';
      }).join('') + '</div>';
  }

  /* chips({ key, items: [{ value, label, href?, selected?, done?, count? }], inline?, label? }) */
  function chips(p) {
    const asLinks = p.items.some((i) => i.href);
    const inner = p.items.map((it) => {
      const content = esc(it.label) + (it.count != null ? ' <span class="chip-count">' + esc(it.count) + '</span>' : '') + (it.done ? icon('tick', { cls: 'chip-check' }) : '');
      if (asLinks) return '<a class="chip" href="' + esc(it.href) + '"' + (it.selected ? ' aria-current="page"' : '') + '>' + content + '</a>';
      return '<button type="button" class="chip" role="radio" aria-checked="' + (it.selected ? 'true' : 'false') + '" data-value="' + esc(it.value) + '">' + content + '</button>';
    }).join('');
    const role = asLinks ? '<nav class="' + cls('chips', p.inline && 'is-inline') + '" aria-label="' + esc(p.label || 'Paths') + '">'
      : '<div class="' + cls('chips', p.inline && 'is-inline') + '" role="radiogroup" data-choices="' + esc(p.key) + '"' + (p.label ? ' aria-label="' + esc(p.label) + '"' : '') + '>';
    return role + inner + (asLinks ? '</nav>' : '</div>');
  }

  /* segment({ key, options: [{value, label}], selected, label }) : small chip group, e.g. Theme */
  function segment(p) {
    return chips({ key: p.key, label: p.label, inline: true, items: p.options.map((o) => ({ value: o.value, label: o.label, selected: String(o.value) === String(p.selected) })) });
  }

  /* toggle({ key, on, label }) */
  function toggle(p) {
    return '<button type="button" class="toggle" role="switch" aria-checked="' + (p.on ? 'true' : 'false') + '" data-toggle="' + esc(p.key) + '" aria-label="' + esc(p.label) + '"></button>';
  }

  /* select({ key, options: string[], selected, label }) */
  function select(p) {
    return '<select class="select" data-field="' + esc(p.key) + '" aria-label="' + esc(p.label) + '">' +
      p.options.map((o) => '<option' + (o === p.selected ? ' selected' : '') + '>' + esc(o) + '</option>').join('') + '</select>';
  }

  /* ---------------------------------------------------------------- */
  /* Source mark and popover                                            */
  /* ---------------------------------------------------------------- */

  const registry = {};
  /* source(keyOrRule, { inline? }) : the small source mark, a 16px glyph with no
     visible word. Its accessible name is 'Source: <rule name>'. keyOrRule is a key
     into DULY_SAMPLE.sources or a rule object. */
  function source(ref, o) {
    let key = ref;
    if (ref && typeof ref === 'object') { key = uid('src'); registry[key] = ref; }
    const rule = getRule(key);
    const name = 'Source' + (rule && rule.name ? ': ' + rule.name : '');
    return '<button type="button" class="' + cls('src', o && o.inline && 'inline-src') + '" data-source="' + esc(key) + '" aria-haspopup="dialog" aria-expanded="false" aria-label="' + esc(name) + '" title="' + esc(name) + '">' +
      icon('source') + '</button>';
  }
  function getRule(key) {
    return registry[key] || ((window.DULY_SAMPLE && window.DULY_SAMPLE.sources) || {})[key] || null;
  }

  /* info(text, { label?, link? {label, href}, inline = true }) : the ⓘ for an
     explanation (Round 3). The same 16px glyph as the source mark; a tap opens
     a small popover (a sheet on a phone) with the text alone, and the link if
     given. Use it wherever a line would otherwise explain something: the
     screen stays self-explanatory and the why is one tap away. Keep text to
     one or two short sentences. inline: false for a trailing column. */
  const infoKeys = {};
  function info(text, o) {
    if (!text) return '';
    const opt = o || {};
    const sig = String(text) + '|' + (opt.link ? opt.link.href : '');
    let key = infoKeys[sig];
    if (!key) {
      key = uid('info');
      infoKeys[sig] = key;
      registry[key] = { info: true, plain: String(text), link: opt.link || null };
    }
    const name = opt.label || 'More about this';
    return '<button type="button" class="' + cls('src is-info', opt.inline !== false && 'inline-src') + '" data-source="' + esc(key) + '" aria-haspopup="dialog" aria-expanded="false" aria-label="' + esc(name) + '" title="' + esc(name) + '">' +
      icon('source') + '</button>';
  }

  /* popover(rule, id) : rule { name, plain?, quote?, counted?: string[], link {label, href}, checked }
     or an info entry { info: true, plain, link? } drawn as the text alone. */
  function popover(rule, id) {
    if (rule.info) {
      return '<div class="pop is-info" id="' + id + '" role="dialog" aria-label="More about this" tabindex="-1">' +
        '<p class="pop-plain">' + escText(rule.plain) + '</p>' +
        (rule.link ? '<div class="pop-foot"><a' + attrs(hrefAttrs(rule.link.href)) + '>' + esc(rule.link.label) + '</a></div>' : '') +
        '</div>';
    }
    const nameId = id + '-name';
    const counted = rule.counted && rule.counted.length
      ? '<div class="pop-counted"><h3>How it was counted</h3>' + rule.counted.map((c) => '<p>' + esc(c) + '</p>').join('') + '</div>' : '';
    const quoteLong = rule.quote && rule.quote.length > 220;
    return '<div class="pop" id="' + id + '" role="dialog" aria-labelledby="' + nameId + '" tabindex="-1">' +
      '<p class="t-eyebrow">The rule</p>' +
      '<p class="pop-name" id="' + nameId + '">' + esc(rule.name) + '</p>' +
      (rule.plain ? '<p class="pop-plain">' + esc(rule.plain) + '</p>' : '') +
      (rule.quote ? '<blockquote class="pop-quote" style="margin:0">“' + esc(rule.quote) + '”</blockquote>' +
        (quoteLong ? '<button type="button" class="link pop-more" data-show-all>Show all</button>' : '') : '') +
      counted +
      '<div class="pop-foot">' + (rule.link ? '<a' + attrs(hrefAttrs(rule.link.href)) + '>' + esc(rule.link.label) + '</a>' : '<span></span>') +
      '<span class="t-micro">' + esc(rule.checked || '') + '</span></div>' +
      '</div>';
  }

  /* ---------------------------------------------------------------- */
  /* Email, note, dates, tracker, misc                                  */
  /* ---------------------------------------------------------------- */

  /* email({ to, subject, paragraphs: string[], questions?: string[], signoff?: string[], foot?, primary?,
             head? = true, copyBelow?, extra? (html) })
     head: false drops the panel's own header row (use it when the section
     eyebrow already names the email). copyBelow: true puts Copy (plus any
     extra buttons) in a group under the panel instead of in the header.
     foot: the note on the email, behind an ⓘ beside the fields. */
  function email(p) {
    const id = uid('email');
    const below = !!p.copyBelow;
    const showHead = p.head !== false && !below;
    const copyBtn = '<button type="button" class="' + cls('btn', p.primary ? 'btn-primary' : 'btn-pill') + '" data-copy="' + id + '">Copy email</button>';
    const body = (p.paragraphs || []).map((t) => '<p>' + esc(t) + '</p>').join('') +
      (p.questions && p.questions.length ? '<ol>' + p.questions.map((q) => '<li>' + esc(q) + '</li>').join('') + '</ol>' : '') +
      (p.signoff && p.signoff.length ? '<p>' + p.signoff.filter(Boolean).map(esc).join('<br>') + '</p>' : '');
    const panel = '<section class="email"' + (showHead ? ' aria-labelledby="' + id + '-h"' : ' aria-label="Email to your DSO"') + '>' +
      (showHead ? '<div class="email-head"><h2 class="t-eyebrow" id="' + id + '-h">Email to your DSO</h2>' + copyBtn + '</div>' : '') +
      '<div class="email-top"><dl class="email-fields" style="margin:0"><div><dt>To</dt><dd>' + esc(p.to) + '</dd></div>' +
      '<div><dt>Subject</dt><dd data-subject>' + esc(p.subject) + '</dd></div></dl>' +
      info(p.foot || 'Edit anything before you send it. You send it yourself.', { inline: false }) + '</div>' +
      '<div class="email-body" id="' + id + '" contenteditable="true" spellcheck="true" role="textbox" aria-multiline="true" aria-label="Email text">' + body + '</div><!--/email-body-->' +
      '</section>';
    /* Under the panel the buttons follow the one placement rule: the quiet
       extra (Open in Mail) on the left, Copy on the right. */
    const actions = below ? '<div class="btn-row email-actions">' + (p.extra || '') + copyBtn + '</div>' : '';
    return panel + actions;
  }

  /* emailDraft({ key, to, subject, paragraphs, questions?, signoff?, foot?, step?, openLabel?,
                  primary?, today? })
     The DSO email as a step, not a panel stuck open (Note 4). Four states, kept in
     App.state['draft:' + key] and switched in place by app.js:
       closed  one button, openLabel ('Write the email to your DSO')
       open    the editable email, then Close, Open in Mail and Copy email
       left    after Copy or Open in Mail: "Email sent?" Mark done, Reopen the draft
       done    "Email sent Sep 30." Reopen the draft
     step: a task key ('school:su-stem-request'). Mark done also checks that task.
     primary: Copy is the screen's one filled button while the draft is open.
     Edits to the text are kept in App.state['draftHtml:' + key]. */
  function emailDraft(p) {
    const st = (window.App && window.App.state) || {};
    const key = p.key || 'dso';
    const state = st['draft:' + key] || 'closed';
    const saved = st['draftHtml:' + key];
    const today = p.today || (window.DULY_SAMPLE ? window.DULY_SAMPLE.today.short.replace(/, \d{4}$/, '') : '');
    let panel = email(Object.assign({}, p, { head: false, copyBelow: false, extra: null }));
    if (saved) panel = panel.replace(/(<div class="email-body"[^>]*>)[\s\S]*?(<\/div><!--\/email-body-->)/, function (m, a, b) { return a + saved + b; });
    const act = (a, label, kind, extra) => '<button type="button" class="' + cls('btn', kind) + '" data-draft-act="' + a + '"' + (extra || '') + '>' + esc(label) + '</button>';
    return '<div class="draft" data-draft="' + esc(key) + '" data-state="' + esc(state) + '"' + (p.step ? ' data-draft-step="' + esc(p.step) + '"' : '') + '>' +
      '<div class="draft-part" data-part="closed">' + act('open', p.openLabel || 'Write the email to your DSO', 'btn-pill', ' aria-expanded="false"') + '</div>' +
      '<div class="draft-part" data-part="open">' + panel +
      '<div class="btn-row draft-actions">' +
      act('close', 'Close', 'btn-text is-quiet') +
      act('mail', 'Open in Mail', 'btn-text') +
      act('copy', 'Copy email', p.primary ? 'btn-primary' : 'btn-pill') +
      '</div></div>' +
      '<div class="draft-part" data-part="left"><p class="draft-line">Email sent?</p><div class="btn-group">' +
      act('done', 'Mark done', 'btn-pill') + act('open', 'Reopen the draft', 'btn-text') + '</div></div>' +
      '<div class="draft-part" data-part="done"><div class="btn-group"><p class="draft-line">Email sent ' + esc(today) + '.</p>' +
      act('open', 'Reopen the draft', 'btn-text is-quiet') + '</div></div>' +
      '</div>';
  }

  /* schoolMark() : the quiet "Your school" mark on every school step. */
  function schoolMark() { return '<span class="mark">Your school</span>'; }
  /* updatedMark({ date, href? }) : "Updated Sep 30" on a step a rule change touched. */
  function updatedMark(u) {
    const text = 'Updated ' + (u.date || '');
    return u.href ? '<a class="mark is-updated" href="' + esc(u.href) + '">' + esc(text) + '</a>'
      : '<span class="mark is-updated">' + esc(text) + '</span>';
  }

  /* rulesLine(rules = DULY_SAMPLE.rules) : "Rules checked Sep 30" with an ⓘ,
     on every screen that shows federal steps or dates. The why (the steps are
     worked out from the current rules and change when a rule changes) sits
     behind the ⓘ (Round 3). The date links to News. */
  function rulesLine(r) {
    const rules = r || (window.DULY_SAMPLE && window.DULY_SAMPLE.rules) || {};
    return '<p class="rules-line t-meta"><a class="link is-quiet" href="' + esc(rules.href || '#/updates') + '">' + esc(rules.checked || 'Rules checked') + '</a>' +
      info(rules.info) + '</p>';
  }

  /* schoolStep(entry, { email?, primary?, action? }) : one school step, from an
     App.steps() entry of type 'school' (or a DULY_SAMPLE.schoolSteps item). A
     task with the "Your school" mark and Open, to the school page it came from.
     A step with draft: 'dso' carries the DSO email draft (pass email:
     DULY_SAMPLE.email). */
  function schoolStep(entry, o) {
    const opt = o || {};
    const s = entry.step || entry;
    const key = entry.key || ('school:' + s.id);
    return task({
      key: key, title: s.title, meta: s.meta, info: s.info, done: entry.done != null ? entry.done : !!s.done,
      school: true,
      open: s.link ? { label: s.link.label || 'Open', href: s.link.href } : null,
      afterOf: entry.afterOf || null,
      current: !!(entry.current || opt.current),
      detail: opt.detail || null,
      action: s.draft && opt.email ? emailDraft(Object.assign({}, opt.email, { step: key, primary: opt.primary })) : (opt.action || null),
    });
  }

  /* schoolImport({ path = 'stem' }) : school steps come from the school's own
     page, never typed in (Round 3, note 4). Three states, from
     App.schoolImport(path).state, switched in place by app.js:
       empty      paste the school's OPT or STEM OPT page link, or drop its PDF
       found      the steps read from it, each marked "Your school" with where
                  it goes, and one "Add to my steps"
       confirmed  one quiet line: where the steps came from, with Change
     Confirming adds the steps to DULY_SAMPLE.schoolSteps, so App.steps(path)
     places them among the federal steps. In the prototype any link or PDF
     yields DULY_SAMPLE.schoolImport.found. */
  function schoolImport(p) {
    const o = p || {};
    const path = o.path || 'stem';
    const imp = (window.App && window.App.schoolImport) ? window.App.schoolImport(path) : { state: 'empty' };
    const d = (window.DULY_SAMPLE && window.DULY_SAMPLE.schoolImport) || {};
    const fed = path === 'stem' && window.DULY_SAMPLE ? window.DULY_SAMPLE.stem.tasks : [];
    const fedTitle = (k) => ((fed.filter((f) => f.key === k)[0]) || {}).title || '';
    const where = { before: 'Before', alongside: 'With', after: 'After' };
    let body;
    if (imp.state === 'confirmed') {
      body = '<p class="school-src t-meta">' + icon('link') +
        '<span>Your school steps from ' + (imp.href ? '<a class="link is-quiet"' + attrs(hrefAttrs(imp.href)) + '>' + esc(imp.label) + '</a>' : esc(imp.label)) + '</span>' +
        '<button type="button" class="link is-quiet" data-school-import="reset">Change</button></p>';
    } else if (imp.state === 'found') {
      const rows = (imp.steps || []).map((s) => '<div class="item"><div class="row is-static"><span class="row-text">' +
        '<span class="row-title">' + escText(s.title) + ' <span class="marks">' + schoolMark() + '</span></span>' +
        '<span class="row-meta">' + esc(where[s.placement] || '') + (fedTitle(s.federal) ? ': ' + escText(fedTitle(s.federal)) : '') + '</span>' +
        '</span></div></div>').join('');
      body = '<div class="school-found">' +
        '<p class="t-row">' + esc((imp.steps || []).length + ' steps from ' + imp.label) + '</p>' +
        '<div class="list">' + rows + '</div>' +
        buttonRow({
          back: '<button type="button" class="btn btn-text is-quiet" data-school-import="dismiss">Not now</button>',
          primary: '<button type="button" class="btn btn-pill" data-school-import="confirm">Add to my steps</button>',
        }) + '</div>';
    } else {
      body = '<div class="school-paste" data-school-import-zone>' +
        '<div class="school-paste-row">' +
        '<input class="input" type="url" inputmode="url" autocomplete="off" data-school-import-url placeholder="' + esc(d.placeholder || "Paste your school's STEM OPT page link") + '" aria-label="Link to your school\'s STEM OPT page">' +
        '<button type="button" class="btn btn-pill" data-school-import="fetch">Get my school\'s steps</button>' +
        '</div>' +
        '<p class="t-meta school-or"><label class="link is-quiet">Or add the school\'s PDF<input type="file" accept="application/pdf" data-school-import-pdf hidden></label>' +
        info(d.info) + '</p>' +
        '</div>';
    }
    return '<div class="school-import" data-school-import-wrap="' + esc(path) + '" data-state="' + esc(imp.state) + '">' + body + '</div>';
  }

  /* affectsFor(item, intent = App.stemIntent()) : the "for you" answer for this
     student, { short, line, todo }. The one place for Home, News and the
     article page, so they never disagree. byIntent overrides by the STEM OPT
     choice. */
  function affectsFor(item, intent) {
    const a = item && item.affects && typeof item.affects === 'object' ? item.affects : { short: item && item.affects, line: '' };
    const want = intent !== undefined ? intent : (window.App && window.App.stemIntent ? window.App.stemIntent() : null);
    const b = (a.byIntent && want && a.byIntent[want]) || {};
    return { short: b.short || a.short || '', line: b.line || a.line || '', todo: b.todo || (item && item.todo) || '' };
  }
  /* The first sentence of "anything to do", for a row. */
  function todoShort(t) {
    if (!t) return '';
    return String(t).split(/\.\s/)[0].replace(/\.$/, '');
  }
  /* updateRow(item, { meta?, line?, headline? }) : a News row for Home and News,
     like a news app: the headline (medium size with headline: true), then
     "Sep 14, 2026 · U.S. District Court", then one short line (item.dek, or the
     "for you" answer). No jump links. Opens the article at #/updates/<id>. */
  function updateRow(item, o) {
    const opt = o || {};
    const id = item.id || item.key;
    const meta = opt.meta != null ? opt.meta : [item.date, item.source && item.source.name].filter(Boolean).join(' · ');
    const line = opt.line !== undefined ? opt.line : (item.dek || affectsFor(item).short);
    return '<div class="' + cls('item news-row', opt.headline && 'is-headline') + '" data-key="' + esc(id) + '">' +
      '<a class="row" href="' + esc(item.href || ('#/updates/' + id)) + '"><span class="row-text">' +
      '<span class="' + (opt.headline ? 'news-title t-medium' : 'row-title') + '">' + escText(item.title) + '</span>' +
      (meta ? '<span class="row-meta num">' + escText(meta) + '</span>' : '') +
      (line ? '<span class="news-dek">' + escText(line) + '</span>' : '') +
      '</span><span class="row-trail">' + icon('chevron', { cls: 'chev' }) + '</span></a></div>';
  }

  /* applicationRow(app) : one application, from DULY_SAMPLE.applications.items.
     Opens #/uscis/<id>. Status is always shown with its "as of" date. */
  function applicationRow(a) {
    return row({
      key: a.id, title: a.title,
      meta: (a.receipt ? a.receipt + ' · ' : '') + statusLine(a),
      href: '#/uscis/' + a.id,
    });
  }
  /* statusLine(app) : "Approved, as of Dec 20, 2025" */
  function statusLine(a) {
    if (/^unknown$/i.test(a.status || '')) {
      const add = ((window.DULY_SAMPLE || {}).applications || {}).add || {};
      return (add.unknown || 'Unknown') + (a.added ? ', added ' + a.added : '');
    }
    return a.status + (a.asOf ? ', as of ' + a.asOf : '');
  }

  /* note({ title, text?, source?, actions? (html), icon = 'shield' }) : inline finding, e.g. STEM detected */
  function note(p) {
    return '<div class="note">' + (p.icon === null ? '' : shield()) + '<div class="note-text">' +
      '<p class="note-title"><span>' + esc(p.title) + '</span>' + (p.source ? source(p.source, { inline: true }) : '') + '</p>' +
      (p.text ? '<p class="note-line">' + esc(p.text) + '</p>' : '') +
      (p.actions ? '<div class="btn-group">' + p.actions + '</div>' : '') +
      '</div></div>';
  }

  function caution(text) { return '<p class="caution">' + esc(text) + '</p>'; }

  /* dates({ points: [{ date, label, source?, end?, today? }], today? { label, pct } })
     A point with today: true is today as its own first point, drawn as a
     small quiet dot, so it never sits over a dated milestone. */
  function dates(p) {
    const today = p.today ? '<span class="dates-today" style="left:' + Number(p.today.pct) + '%"><span>' + esc(p.today.label) + '</span><i></i></span>' : '';
    return '<div class="' + cls('dates', p.today && 'has-today') + '" style="--n:' + p.points.length + '">' + today +
      p.points.map((d) => '<div class="' + cls('date-pt', d.end && 'is-end', d.today && 'is-today') + '">' +
        '<span class="dp-date">' + esc(d.date) + '</span><span class="dp-label">' + esc(d.label) + '</span>' +
        (d.source ? source(d.source) : '') + '</div>').join('') + '</div>';
  }

  /* tracker({ steps: string[], current: index|null }) */
  function tracker(p) {
    return '<ol class="tracker" aria-label="Application status">' + p.steps.map((s, i) => {
      const reached = p.current != null && i <= p.current;
      return '<li class="' + cls(reached && 'is-reached', i === p.current && 'is-current') + '"' + (i === p.current ? ' aria-current="step"' : '') + '>' +
        '<div class="bar"><i></i></div><span class="t-step">' + esc(s) + '</span></li>';
    }).join('') + '</ol>';
  }

  /* found({ rows: [[label, value]] }) : fields read from a document, label left and value right */
  function found(rows) {
    return '<div class="list found">' + rows.map((r) => valueRow({ label: r[0], value: r[1], editable: false })).join('') + '</div>';
  }

  /* footer(text) : pushes to the bottom of the column. Only on screens that show dates. */
  function footer(text) {
    return '<div class="col-spacer"></div><footer class="footer">' + esc(text || 'Records and dates from your documents, not legal advice.') + '</footer>';
  }

  /* ---------------------------------------------------------------- */
  /* Onboarding                                                         */
  /* ---------------------------------------------------------------- */

  /* steps({ steps: [{ key, label, answer? }], current: index, reached: index }) */
  function steps(p) {
    return '<nav class="steps" aria-label="Steps">' + p.steps.map((s, i) => {
      const state = i === p.current ? 'is-current' : (i <= (p.reached == null ? p.current - 1 : p.reached) ? 'is-done' : 'is-todo');
      const canOpen = state === 'is-done';
      return '<button type="button" class="step ' + state + '"' + (canOpen ? ' data-step="' + i + '" title="' + esc(s.answer || '') + '"' : ' disabled') +
        (i === p.current ? ' aria-current="step"' : '') + '>' +
        '<span class="pip"></span><span class="step-label">' + (canOpen ? icon('tick', { size: 12 }) : '') + esc(s.label) + '</span></button>';
    }).join('') + '<span class="sr-only">Step ' + (p.current + 1) + ' of ' + p.steps.length + '</span></nav>';
  }

  /* onboarding({ steps? (html from C.steps), title, why?, content? (html), notSure? (html), back? (html), primary? (html) }) */
  function onboarding(p) {
    return '<div class="onb">' + wordmark({ large: true, link: false }) + (p.steps || '') +
      '<div class="onb-body">' +
      pageHeader({ title: p.title, subline: p.why }) +
      (p.content ? '<div class="onb-content">' + p.content + '</div>' : '') +
      (p.notSure ? '<div class="onb-unsure">' + p.notSure + '</div>' : '') +
      ((p.back || p.primary) ? buttonRow({ back: p.back, primary: p.primary }) : '') +
      '</div></div>';
  }

  /* ---------------------------------------------------------------- */
  /* Round 4: the value a student gets (VALUE.md)                       */
  /* ---------------------------------------------------------------- */

  const SAMPLE = () => window.DULY_SAMPLE || {};
  const APP = () => window.App || {};

  /* sampleMark() : a quiet "Sample" beside a figure the prototype makes up
     (H-1B counts, processing times). Small caps, like "Your school". */
  function sampleMark() { return '<span class="mark is-sample">Sample</span>'; }

  /* promise(p = DULY_SAMPLE.promise, { subline = true, cls? }) : the one-line
     promise and its subline. Once on Welcome, once under the Home title,
     nowhere else. On Home it can also go in as C.hero({ subline: promise.line }). */
  function promise(p, o) {
    const pr = p || SAMPLE().promise || {};
    const opt = o || {};
    return '<div class="' + cls('promise', opt.cls) + '"><p class="promise-line t-lead">' + escText(pr.line) + '</p>' +
      (opt.subline !== false && pr.subline ? '<p class="promise-sub t-meta">' + escText(pr.subline) + '</p>' : '') + '</div>';
  }

  /* pillars(items = DULY_SAMPLE.pillars, { lines = true }) : the three pillars,
     three columns on a wide window, stacked on a phone. lines: false keeps
     titles only and puts each line behind an ⓘ. */
  function pillars(items, o) {
    const list = items || SAMPLE().pillars || [];
    const opt = o || {};
    return '<ul class="pillars">' + list.map((p) => '<li class="pillar">' +
      '<p class="t-row">' + escText(p.title) + (opt.lines === false ? info(p.line) : '') + '</p>' +
      (opt.lines === false ? '' : '<p class="t-meta">' + escText(p.line) + '</p>') + '</li>').join('') + '</ul>';
  }

  /* fact({ key?, title, value?, meta?, source?, info?, sample?, content? (html), href?, trailing? (html), cls? })
     One public or computed fact with where it came from: a row whose meta
     names the source and its date ("E-Verify Employer Search · checked Sep 30"),
     the value on the right, the source mark after it. sample: true adds the
     "Sample" mark after the title. content makes it a disclosure (e.g. the
     H-1B years). Wrap facts in C.list([...], { accordion: false }). */
  function fact(p) {
    const marks = p.sample ? ' <span class="marks">' + sampleMark() + '</span>' : '';
    return row({
      key: p.key, cls: cls('fact', p.cls),
      title: raw(escText(p.title) + marks),
      meta: p.meta, value: p.value, source: p.source, info: p.info,
      content: p.content, href: p.href, trailing: p.trailing,
    });
  }

  /* stemField(sf = App.stemField(), { key? }) : the STEM field from the I-20's
     field code (CIP). One item; wrap it in C.list.
       found      "Your I-20 lists field code 11.0701, Computer Science." with
                  That matches (confirms, in place) and Fix it (opens the I-20)
       confirmed  "Your I-20's field code, 11.0701, is on the STEM list." with
                  the list's date and the source mark
     A fact, never a verdict about the student. */
  function stemField(s, o) {
    const sf = s || (APP().stemField ? APP().stemField() : SAMPLE().stemField) || {};
    const key = (o && o.key) || 'stem-field';
    if (sf.state === 'found') {
      return '<div class="item ask stem-field" data-key="' + esc(key) + '" data-stem-field-wrap><div class="row is-static"><span class="row-text">' +
        '<span class="row-title">' + escText(sf.foundTitle) + '</span>' +
        '<span class="row-meta">' + escText('Read from your I-20') + '</span>' +
        '<span class="ask-actions">' +
        '<button type="button" class="btn btn-pill" data-stem-field="confirm">' + esc(sf.confirmLabel || 'That matches') + '</button>' +
        '<a class="btn btn-text" href="#/documents/i20">' + esc(sf.changeLabel || 'Fix it') + '</a>' +
        '</span></span><span class="row-trail">' + info(sf.info, { inline: false }) + '</span></div></div>';
    }
    return fact({
      key: key, title: sf.line,
      meta: [sf.from ? 'From your I-20' : '', sf.listDate ? 'list dated ' + sf.listDate : '', sf.checked ? 'checked ' + sf.checked : ''].filter(Boolean).join(' · '),
      source: 'stemList',
      sample: !sf.saved,
    });
  }

  /* jobsAsk(u = App.unemployment(), { key? }) : the one place to start the
     unemployment count (analysis move 7.2). One item; wrap it in C.list.
       ask, a job on file   "Northwind Systems, since Feb 27, 2026. Is that every
                            job on your OPT?"  Yes, that's every job · Add another job
       ask, no job on file  "Have you had a job on your OPT yet?"
                            I haven't had a job yet · Add your job
       every / none         one quiet line, "That's every job, as of Sep 30.", Change
     The answer is App.state.jobsComplete ('every' | 'none'); app.js redraws
     the column in place once it is given, so every count on the page updates. */
  function jobsAsk(uu, o) {
    const u = uu || (APP().unemployment ? APP().unemployment() : null) || {};
    const a = u.ask || {};
    const key = (o && o.key) || 'jobs-complete';
    if (u.state === 'every' || u.state === 'none') {
      return '<div class="item jobs-line" data-key="' + esc(key) + '"><div class="row is-static"><span class="row-text">' +
        '<span class="row-title">' + escText(u.state === 'none' ? u.noneLine : u.everyLine) + '</span></span>' +
        '<span class="row-trail"><button type="button" class="btn btn-text is-small" data-jobs="change">Change</button></span></div></div>';
    }
    const withJob = !!u.hasJob;
    const primary = '<button type="button" class="btn btn-pill" data-answer="jobsComplete" data-value="' + (withJob ? 'every' : 'none') + '">' +
      esc(withJob ? a.every : a.none) + '</button>';
    const other = '<a class="btn btn-text" href="' + esc(a.href || '#/case/jobs') + '">' + esc(withJob ? a.another : a.addJob) + '</a>';
    return '<div class="item ask jobs-ask" data-key="' + esc(key) + '"><div class="row is-static"><span class="row-text">' +
      '<span class="row-title">' + escText(withJob ? a.jobTitle : a.noJobTitle) + '</span>' +
      '<span class="ask-actions">' + primary + other + '</span>' +
      '</span><span class="row-trail">' + info(a.info, { inline: false }) + '</span></div></div>';
  }

  /* employerCheck(emp = DULY_SAMPLE.employer, { next? }) : the two public facts
     about the student's own employer, as one list:
       E-Verify                takes part · source and checked date · source mark
       H-1B petitions approved the latest year on the right, Sample mark; opens
                               to the yearly counts and the data lag
     next: true adds the one quiet line after it ("Ask HR for the E-Verify
     company ID. It goes on your I-983."). Never a verdict on the employer. */
  function employerCheck(e, o) {
    const emp = e || SAMPLE().employer;
    if (!emp) return '';
    const opt = o || {};
    const ev = emp.everify || {};
    const h = emp.h1b || {};
    const years = (h.years || []).map((y) => valueRow({ label: y.fy, value: y.count + (h.unit ? ' ' + h.unit : ''), editable: false, num: true })).join('');
    const rows = [
      fact({ key: 'employer-everify', title: ev.label, value: ev.value, meta: ev.meta, sample: !ev.saved, source: ev.rule }),
      fact({
        key: 'employer-h1b', title: h.label, value: h.latest, meta: h.meta, sample: h.sample, source: h.rule,
        content: '<div class="list">' + years + '</div>' + (h.lag ? '<p class="t-meta">' + escText(h.lag) + '</p>' : ''),
      }),
    ];
    return list(rows, { accordion: false, label: emp.title || 'Employer check' }) +
      (opt.next && ev.next ? '<p class="employer-next t-meta">' + escText(ev.next) + '</p>' : '');
  }

  /* employerRow(emp = DULY_SAMPLE.employer) : one link row to #/employer, for
     Your profile's Job section or a STEM OPT step. */
  function employerRow(e) {
    const emp = e || SAMPLE().employer;
    if (!emp) return '';
    const bits = [emp.everify ? emp.everify.label + ': ' + String(emp.everify.value || '').toLowerCase() : '', emp.h1b ? 'H-1B: ' + emp.h1b.latest : ''];
    return row({ key: 'employer', title: emp.title || 'Employer check', meta: bits.filter(Boolean).join(' · '), href: '#/employer' });
  }

  /* processingTime(pt) : USCIS's published processing time for a filed
     application, from App.processingFor(app). The line is USCIS's figure,
     never a prediction: "USCIS says 80% of these cases are decided within
     3 months." with form, office and as-of date under it, the Sample mark in
     the prototype, and the source mark. One item; wrap it in C.list. */
  function processingTime(pt) {
    if (!pt) return '';
    return fact({ key: 'processing-' + pt.key, title: pt.line, meta: pt.meta, sample: pt.sample, source: pt.rule });
  }

  /* reminders(r = DULY_SAMPLE.reminders) : the channels, as setting rows. Email
     and phone are switches (App.state['remind:email'], 'remind:phone');
     Calendar is one button that saves every date as a calendar file
     (App.addToCalendar). All free; say so once, behind the section's ⓘ. */
  function reminders(r) {
    const rr = r || SAMPLE().reminders;
    if (!rr) return '';
    const st = APP().state || {};
    const rows = (rr.channels || []).map((ch) => {
      const k = 'remind:' + ch.key;
      const on = st[k] != null ? !!st[k] : !!ch.on;
      const control = ch.action
        ? '<button type="button" class="btn btn-pill" data-calendar>' + esc(ch.action) + '</button>'
        : toggle({ key: k, on: on, label: ch.label });
      return '<div class="item srow" data-key="' + esc(k) + '"><div class="row is-static">' +
        '<span class="row-text"><span class="row-title">' + esc(ch.label) + '</span>' +
        (ch.meta ? '<span class="row-meta">' + esc(ch.meta) + '</span>' : '') + '</span>' +
        '<span class="s-control">' + (ch.info ? info(ch.info, { inline: false }) : '') + control + '</span>' +
        '</div></div>';
    });
    return list(rows, { accordion: false, label: 'Reminder channels' });
  }

  /* shareButton({ title, label = 'Share', reveal = true }) : Share on a document
     row. One tap opens the phone's own share sheet (App.share; navigator.share
     where the browser has it). On a wide window it shows on hover or focus;
     on a touch screen it always shows. */
  function shareButton(p) {
    const o = p || {};
    return '<button type="button" class="' + cls('btn btn-text is-small share-btn', o.reveal !== false && 'row-reveal') + '" data-share="' + esc(o.title || '') + '" aria-label="' + esc('Share ' + (o.title || 'document')) + '">' +
      icon('share') + '<span>' + esc(o.label || 'Share') + '</span></button>';
  }

  /* ---------------------------------------------------------------- */
  /* Round 5: the timeline, the STEM OPT choice in place, track a case  */
  /* ---------------------------------------------------------------- */

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function isoTime(iso) { return Date.parse(String(iso).slice(0, 10) + 'T12:00:00Z'); }
  /* fmtDate('2027-02-13', { year: true|false|'auto', ref: '2026-09-30' }) : 'Feb 13, 2027'.
     'auto' (the default) adds the year only when it differs from ref's. */
  function fmtDate(iso, o) {
    const opt = o || {};
    const t = new Date(isoTime(iso));
    if (isNaN(t.getTime())) return String(iso || '');
    const ref = opt.ref ? new Date(isoTime(opt.ref)) : null;
    const withYear = opt.year === true || (opt.year !== false && (!ref || ref.getUTCFullYear() !== t.getUTCFullYear()));
    return MONTHS[t.getUTCMonth()] + ' ' + t.getUTCDate() + (withYear ? ', ' + t.getUTCFullYear() : '');
  }

  /* timeline({ today, marks: [{ label, date, display?, source? }], caption?, label?, key?, compact?,
                from?, to?, spans?, todayLabel? })
     A stepper, like order tracking. Today and each mark are points evenly
     spaced on one straight line, in date order: the first and last sit at
     the edges, every label centred under its point (the first and last
     aligned to the edges). Under each point the date in ink, its name quiet
     on the next line, a source mark beside the date. Passed points and
     Today are filled, the next point is ringed in accent, the rest are
     open; the line is accent up to Today. caption is the one sentence above
     ("Window opens in 46 days"). compact (Home): smaller points, dates only.
     app.js wraps a name, or stacks the steps, only where a phone needs it.
     The line fills once per key; off under reduced motion. from, to and
     spans are accepted and unused. */
  function timeline(p) {
    const today = p.today;
    const tT = isoTime(today);
    const key = p.key || p.label || 'timeline';
    const todayLabel = p.todayLabel || 'Today';
    const pts = (p.marks || []).map((m) => ({ m: m, t: isoTime(m.date) })).sort((a, b) => a.t - b.t);
    /* Today sits in date order. On a mark's own date the mark is Today. */
    const same = pts.find((x) => x.t === tT);
    if (same) same.today = true;
    else {
      const at = pts.findIndex((x) => x.t > tT);
      pts.splice(at < 0 ? pts.length : at, 0, { today: true, t: tT, m: null });
    }
    const n = pts.length;
    const ti = pts.findIndex((x) => x.today);
    /* In the small strip a year can drop to a quiet second line when a
       phone has no room for it beside the day (app.js, .is-tight). */
    const dateHtml = (d) => {
      const yr = p.compact && String(d).match(/^(.*), (\d{4})$/);
      return yr ? esc(yr[1]) + '<span class="tl-y"><span class="tl-c">, </span>' + esc(yr[2]) + '</span>' : esc(d);
    };
    const pos = (i) => (n > 1 ? Number(((i / (n - 1)) * 100).toFixed(3)) : 0);
    const items = pts.map((x, i) => {
      const m = x.m;
      const state = x.today ? 'is-today' : (i < ti ? 'is-past' : (i === ti + 1 ? 'is-next' : 'is-ahead'));
      /* Today reads as a date with its name under it, like the rest; the
         small strip has no names, so there it reads "Today". On a mark's
         own date the date line reads "Today". */
      const date = m ? (x.today ? todayLabel : (m.display || fmtDate(m.date, { ref: today })))
        : (p.compact ? todayLabel : fmtDate(today, { ref: today }));
      const name = m ? m.label : todayLabel;
      const src = m && m.source && !p.compact ? source(m.source, { inline: true }) : '';
      const edge = i === 0 ? 'is-first' : (i === n - 1 ? 'is-last' : '');
      const sr = p.compact ? ', ' + (x.today ? fmtDate(today, { year: true }) : name) : '';
      return '<li class="' + cls('tl-step', state, edge) + '" style="--x:' + pos(i) + '%;--x-f:' + (pos(i) / 100) + '"' + (x.today ? ' aria-current="date"' : '') + '>' +
        '<span class="tl-date num"><span class="tl-d">' + dateHtml(date) + '</span>' + (sr ? '<span class="sr-only">' + esc(sr) + '</span>' : '') + src + '</span>' +
        (p.compact ? '' : '<span class="tl-name">' + esc(name) + '</span>') +
        '</li>';
    }).join('');
    const dots = pts.map((x, i) => {
      const state = x.today ? 'is-today' : (i < ti ? 'is-past' : (i === ti + 1 ? 'is-next' : 'is-ahead'));
      return '<i class="' + cls('tl-dot', state) + '" style="--x:' + pos(i) + '%;--x-f:' + (pos(i) / 100) + '"></i>';
    }).join('');
    return '<figure class="' + cls('tl', p.compact && 'is-compact') + '" data-timeline="' + esc(key) + '" style="--fill:' + pos(ti) + '%;--n:' + n + '"' +
      (p.label ? ' aria-label="' + esc(p.label) + '"' : '') + '>' +
      (p.caption ? '<figcaption class="tl-now">' + esc(p.caption) + '</figcaption>' : '') +
      '<div class="tl-rail" aria-hidden="true"><span class="tl-line"></span><span class="tl-fill"></span>' + dots + '</div>' +
      '<ol class="tl-steps">' + items + '</ol>' +
      '</figure>';
  }

  /* stemDecide({ seeAll = true, label? }) : Home's next move, answered in
     place (Round 5, note 1). Reads App.stemPlan(), so Home and Next steps
     share one answer and one set of dates.
       not answered  "Decide on STEM OPT", its date and source, Yes, No, Not sure
       yes           "You plan to apply · Change", the three dates as a small
                     timeline, and See all steps (seeAll: false hides it)
       no            "Not applying this time · Change"
       not sure      "Decide any time", the three choices kept
     The buttons are data-answer="stemIntent"; app.js redraws every
     [data-stem-decide] in place when the answer changes, with a light tap
     and a short highlight, and never leaves the page. */
  function stemDecide(o) {
    const opt = o || {};
    const plan = window.App && App.stemPlan ? App.stemPlan() : null;
    if (!plan) return '';
    const d = plan.decide;
    const intent = plan.intent;
    const btn = (c, kind) => '<button type="button" class="' + cls('btn', kind) + '" data-answer="stemIntent" data-value="' + esc(c.value) + '"' +
      (intent === c.value ? ' aria-pressed="true"' : '') + '>' + esc(c.label) + '</button>';
    const change = '<button type="button" class="btn btn-text is-small" data-answer="stemIntent" data-value="">' + esc(d.change) + '</button>';
    const prep = plan.byKey.prepare || {};
    let body;
    if (intent === 'yes') {
      body = '<p class="sd-state t-meta"><span>' + esc(d.yes) + '</span>' + change + '</p>' +
        timeline(Object.assign(App.stemTimeline(), { compact: true, key: 'stem-home' })) +
        (opt.seeAll !== false && d.seeAll ? '<p class="sd-more">' + link(d.seeAll) + '</p>' : '');
    } else if (intent === 'no') {
      body = '<p class="sd-state t-meta"><span>' + esc(d.no) + '</span>' + change + '</p>';
    } else {
      body = '<div class="sd-ask">' +
        '<p class="sd-q"><span class="row-title">' + esc(d.title) + '</span>' + (prep.source ? source(prep.source, { inline: true }) : '') +
        (prep.date ? '<span class="sd-date row-value num">By ' + esc(fmtDate(prep.iso, { ref: plan.today })) + '</span>' : '') + '</p>' +
        '<div class="btn-group" role="group" aria-label="' + esc(d.title) + '">' +
        d.choices.map((c, i) => btn(c, i === 0 ? 'btn-primary' : (c.value === 'unsure' ? 'btn-text is-quiet' : 'btn-pill'))).join('') +
        '</div>' +
        (intent === 'unsure' ? '<p class="sd-state t-meta">' + esc(d.unsure) + '</p>' : '') +
        '</div>';
    }
    return '<div class="stem-decide" data-stem-decide' + (opt.seeAll === false ? ' data-see-all="no"' : '') + ' data-intent="' + esc(intent || 'none') + '">' + body + '</div>';
  }

  /* trackCase({ open? }) : "Track another case" on USCIS status (Round 5,
     note 2). Closed, one quiet button; open, the receipt number, what the
     case is for (a short list plus Other, which asks for the form by name),
     Cancel and Track this case. app.js wires it: App.addCase() checks and
     saves, an error shows under its field in place, and a saved case joins
     App.data.applications.items with status Unknown until rechecked. The
     open state is App.state['trackCase:open']. */
  function trackCase(o) {
    const opt = o || {};
    const apps = (window.DULY_SAMPLE || {}).applications || {};
    const a = apps.add || {};
    const st = (window.App && App.state) || {};
    const open = opt.open != null ? opt.open : !!st['trackCase:open'];
    if (!open) {
      return '<div class="track-case" data-track-case="closed">' +
        '<button type="button" class="btn btn-text" data-case-act="open">' + esc(a.open || 'Track another case') + '</button></div>';
    }
    const err = st['trackCase:error'] || {};
    const form = st['trackCase:form'] || null;
    const types = apps.formTypes || [];
    return '<div class="track-case is-open" data-track-case="open" role="group" aria-label="' + esc(a.open || 'Track another case') + '">' +
      field({ label: a.receiptLabel, key: 'trackCase:receipt', value: st['trackCase:receipt'] || null, placeholder: apps.receiptPlaceholder,
        autocomplete: 'off', error: err.receipt || null }) +
      '<div class="field"><p class="field-label" id="tc-form-label">' + esc(a.formLabel) + '</p>' +
      chips({ key: 'trackCase:form', label: a.formLabel, items: types.map((t) => ({ value: t.key, label: t.label, selected: form === t.key })) }) +
      (err.form ? '<p class="field-error">' + esc(err.form) + '</p>' : '') + '</div>' +
      '<div class="tc-other"' + (form === 'other' ? '' : ' hidden') + '>' +
      field({ label: a.otherLabel, key: 'trackCase:other', value: st['trackCase:other'] || null, placeholder: a.otherPlaceholder, error: err.other || null }) +
      '</div>' +
      buttonRow({
        back: '<button type="button" class="btn btn-text is-quiet" data-case-act="cancel">' + esc(a.cancel || 'Cancel') + '</button>',
        primary: '<button type="button" class="btn btn-pill" data-case-act="save">' + esc(a.save || 'Track this case') + '</button>',
      }) +
      '</div>';
  }

  window.C = {
    esc, raw, cls, attrs, uid, icon,
    NAV, NAV_SECONDARY,
    wordmark, navItem, sidebar, topbar, menuSheet, tabbar,
    backLink, titleWith, pageHeader, dateLine, hero, shield, metrics, bar, progress,
    section, list, row, disclosure, valueRow, settingRow,
    checkbox, task, ongoing, doneGroup, phaseMark, nowTag,
    ask, waiting, unknown, empty,
    button, buttonRow, btnGroup, link, danger,
    field, textarea, dateField, dateRange, choices, chips, segment, toggle, select,
    source, getRule, popover,
    email, emailDraft, schoolMark, updatedMark, rulesLine, schoolStep, schoolImport, info,
    escText, affectsFor, todoShort, updateRow, applicationRow, statusLine,
    note, caution, dates, tracker, found, footer,
    steps, onboarding,
    sampleMark, promise, pillars, fact, stemField, jobsAsk, employerCheck, employerRow, processingTime, reminders, shareButton,
    fmtDate, timeline, stemDecide, trackCase,
  };
})();
