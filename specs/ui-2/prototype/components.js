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
    file: [16, '<path d="M4.5 2h5l3 3v8.5a.5.5 0 0 1-.5.5H4.5a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M9.5 2v3h3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>'],
    close: [16, '<path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'],
    source: [16, '<circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M8 7.2v3.8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="8" cy="5.1" r=".85" fill="currentColor"/>'],
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

  const NAV = [
    { name: 'home', label: 'Home', tab: 'Home', icon: 'home' },
    { name: 'next', label: "What's next", tab: 'Next', icon: 'next' },
    { name: 'timeline', label: 'Timeline', tab: 'Timeline', icon: 'timeline' },
    { name: 'checklists', label: 'Checklists' },
    { name: 'documents', label: 'Documents', tab: 'Documents', icon: 'documents' },
    { name: 'updates', label: 'Updates' },
  ];
  const NAV_SECONDARY = [
    { name: 'case', label: 'Your case' },
    { name: 'settings', label: 'Settings' },
    { name: 'feedback', label: 'Feedback' },
  ];

  function wordmark(o) {
    const p = o || {};
    return '<a class="' + cls('wordmark', p.large && 'is-large') + '" href="#/home" aria-label="Duly, home">Duly<span class="dot">.</span></a>';
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
    return '<aside class="sidebar" aria-label="Duly">' + wordmark() +
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
      icon(n.icon) + '<span>' + esc(n.tab) + '</span></a>').join('') + '</nav>';
  }

  /* ---------------------------------------------------------------- */
  /* Headers and hero                                                   */
  /* ---------------------------------------------------------------- */

  /* pageHeader({ title, subline?, meta?, eyebrow?, aside? (html), progress? {pct, label} }) */
  function pageHeader(p) {
    const hasMeta = !!p.meta;
    return '<header class="page-header">' +
      (p.eyebrow ? '<p class="ph-eyebrow t-eyebrow-hero">' + esc(p.eyebrow) + '</p>' : '') +
      '<div class="' + cls('ph-top', hasMeta && 'has-meta') + '">' +
      '<h1 class="t-title" tabindex="-1">' + esc(p.title) + '</h1>' +
      (hasMeta ? '<span class="ph-meta">' + esc(p.meta) + '</span>' : '') +
      (p.aside ? '<div class="ph-aside">' + p.aside + '</div>' : '') +
      '</div>' +
      (p.subline ? '<p class="ph-sub t-lead">' + esc(p.subline) + '</p>' : '') +
      (p.progress ? progress(p.progress) : '') +
      '</header>';
  }

  function dateLine(text) { return '<p class="date-line num">' + esc(text) + '</p>'; }

  /* hero({ eyebrow, title, subline?, meta?, icon: 'shield'|null, halo?, source?, date?, actions? (html) })
     The one hero per screen. Where a screen has a hero, the hero is its h1
     and the screen has no pageHeader. meta is a quiet line under the subline,
     e.g. 'Checked today, 6:00 AM'. */
  function hero(p) {
    const iconHtml = p.icon === null ? '' : shield({ halo: p.halo });
    return (p.date ? dateLine(p.date) : '') +
      '<section class="hero" aria-labelledby="hero-title">' +
      (p.eyebrow ? '<p class="hero-eyebrow">' + iconHtml + '<span class="t-eyebrow-hero">' + esc(p.eyebrow) + '</span></p>' : '') +
      '<h1 class="hero-title t-hero" id="hero-title" tabindex="-1">' + esc(p.title) + '</h1>' +
      (p.subline ? '<p class="hero-sub t-lead"><span>' + esc(p.subline) + '</span>' + (p.source ? source(p.source, { inline: true }) : '') + '</p>' : '') +
      (p.meta ? '<p class="hero-meta">' + esc(p.meta) + '</p>' : '') +
      (p.actions ? '<div class="hero-actions">' + p.actions + '</div>' : '') +
      '</section>';
  }

  function shield(o) {
    return '<span class="shield" aria-hidden="true">' + (o && o.halo ? '<span class="halo"></span>' : '') + icon('shield') + '</span>';
  }

  /* metrics([{ eyebrow, value?, unit?, bar? (0..100), source?, add? {action, rest, href} }])
     Every value, a count or a date, is set at the one metric figure size. */
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
          (m.source ? source(m.source, { inline: true }) : '') + '</div>' +
          (m.bar != null ? bar(m.bar) : '');
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

  /* section({ eyebrow, content (html), link? {label, href}, waiting?, id?, label? }) */
  function section(p) {
    const headId = uid('sh');
    return '<section class="' + cls('section', p.waiting && 'waiting', p.cls) + '"' + (p.id ? ' id="' + esc(p.id) + '"' : '') +
      (p.eyebrow ? ' aria-labelledby="' + headId + '"' : '') + '>' +
      (p.eyebrow ? '<div class="section-head"><h2 class="sh-label t-eyebrow" id="' + headId + '">' +
        (p.waiting ? '<span class="wait-dot" aria-hidden="true"></span>' : '') + esc(p.eyebrow) + '</h2>' +
        (p.link ? link(p.link) : '') + '</div>' : '') +
      (p.content || '') + '</section>';
  }

  /* list(items: html[], { accordion = true, label? }) */
  function list(items, o) {
    const opt = o || {};
    const acc = opt.accordion === false ? '' : ' data-accordion';
    return '<div class="list"' + acc + (opt.label ? ' aria-label="' + esc(opt.label) + '"' : '') + '>' + items.join('') + '</div>';
  }

  /* row({ title, meta?, metaAct?, value?, source?, lead? (html), content? (html, makes a disclosure),
           open?, href?, trailing? (html), key?, cls?, nowTag? })
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
      chevron,
    ].join('');
    const inner = (p.lead ? '<span class="row-lead">' + p.lead + '</span>' : '') +
      '<span class="row-text">' +
      '<span class="row-title">' + (p.nowTag ? nowTag() : '') + esc(p.title) + '</span>' +
      (p.meta ? '<span class="' + cls('row-meta', p.metaAct && 'is-act') + '">' + esc(p.meta) + '</span>' : '') +
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
    return paras.map((t) => '<p>' + esc(t) + '</p>').join('') +
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

  /* task({ key, title, meta?, done?, doneMeta?, source?, open? {label, href}, caution?, cautionSource?,
             below? (html), action? (html), onDone? (html) })
     caution: a quiet line under the meta (e.g. a fee change), with its own
     source mark when cautionSource is given. below: extra html under the
     meta (e.g. C.unknown). onDone: html shown only while the task is
     checked; app.js shows and hides it when the checkbox changes. */
  function task(p) {
    const openLink = p.open ? '<a class="task-open"' + attrs(hrefAttrs(p.open.href)) + '>' + esc(p.open.label) + '</a>' : '';
    const below = (p.caution ? '<span class="caution">' + esc(p.caution) + (p.cautionSource ? source(p.cautionSource, { inline: true }) : '') + '</span>' : '') +
      (p.below ? '<span class="task-below">' + p.below + '</span>' : '') +
      (p.onDone ? '<span class="task-on-done" data-on-done' + (p.done ? '' : ' hidden') + '>' + p.onDone + '</span>' : '') +
      (p.action ? '<span class="task-action">' + p.action + '</span>' : '');
    return '<div class="' + cls('item task', p.done && 'is-done') + '" data-key="' + esc(p.key || '') + '"><div class="row is-static">' +
      checkbox({ checked: p.done, key: p.key, label: p.title }) +
      '<span class="row-text"><span class="row-title">' + esc(p.title) + '</span>' +
      '<span class="row-meta" data-meta="' + esc(p.meta || '') + '"' + (p.doneMeta ? ' data-done-meta="' + esc(p.doneMeta) + '"' : '') + '>' +
      esc(p.done && p.doneMeta ? p.doneMeta : p.meta) + '</span>' + below + '</span>' +
      ((openLink || p.source) ? '<span class="row-trail">' + openLink + (p.source ? source(p.source) : '') + '</span>' : '') +
      '</div></div>';
  }

  /* ongoing({ key?, title, meta?, source? }) : a standing rule, e.g. "Report any job change
     within 10 days". A plain row with no checkbox, since it is never done. */
  function ongoing(p) {
    return '<div class="item ongoing"' + (p.key ? ' data-key="' + esc(p.key) + '"' : '') + '><div class="row is-static">' +
      '<span class="row-text"><span class="row-title">' + esc(p.title) + '</span>' +
      (p.meta ? '<span class="row-meta">' + esc(p.meta) + '</span>' : '') + '</span>' +
      (p.source ? '<span class="row-trail">' + source(p.source) + '</span>' : '') +
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
      '<span class="ask-note" data-ask-note' + (p.note ? '' : ' hidden') + '>' + esc(p.note || 'Duly will ask again later.') + '</span>' +
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
    if (p.notSure) opts.push({ value: 'unsure', title: "I'm not sure", meta: typeof p.notSure === 'string' ? p.notSure : 'Duly will ask again later' });
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
  /* popover(rule, id) : rule { name, plain?, quote?, counted?: string[], link {label, href}, checked } */
  function popover(rule, id) {
    const nameId = id + '-name';
    const counted = rule.counted && rule.counted.length
      ? '<div class="pop-counted"><h3>How Duly counted</h3>' + rule.counted.map((c) => '<p>' + esc(c) + '</p>').join('') + '</div>' : '';
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
     Use the same options on What's next and Checklists so the email looks
     the same in both places. */
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
      '<dl class="email-fields" style="margin:0"><div><dt>To</dt><dd>' + esc(p.to) + '</dd></div>' +
      '<div><dt>Subject</dt><dd data-subject>' + esc(p.subject) + '</dd></div></dl>' +
      '<div class="email-body" id="' + id + '" contenteditable="true" spellcheck="true" role="textbox" aria-multiline="true" aria-label="Email text">' + body + '</div>' +
      '<p class="email-foot">' + esc(p.foot || 'Edit anything before you send. Duly never sends it for you.') + '</p>' +
      '</section>';
    /* Under the panel the buttons follow the one placement rule: the quiet
       extra (Open in Mail) on the left, Copy on the right. */
    const actions = below ? '<div class="btn-row email-actions">' + (p.extra || '') + copyBtn + '</div>' : '';
    return panel + actions;
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

  /* dates({ points: [{ date, label, source?, end? }], today? { label, pct } }) */
  function dates(p) {
    const today = p.today ? '<span class="dates-today" style="left:' + Number(p.today.pct) + '%"><span>' + esc(p.today.label) + '</span><i></i></span>' : '';
    return '<div class="' + cls('dates', p.today && 'has-today') + '" style="--n:' + p.points.length + '">' + today +
      p.points.map((d) => '<div class="' + cls('date-pt', d.end && 'is-end') + '">' +
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
    return '<div class="onb">' + wordmark({ large: true }) + (p.steps || '') +
      '<div class="onb-body">' +
      pageHeader({ title: p.title, subline: p.why }) +
      (p.content ? '<div class="onb-content">' + p.content + '</div>' : '') +
      (p.notSure ? '<div class="onb-unsure">' + p.notSure + '</div>' : '') +
      ((p.back || p.primary) ? buttonRow({ back: p.back, primary: p.primary }) : '') +
      '</div></div>';
  }

  window.C = {
    esc, raw, cls, attrs, uid, icon,
    NAV, NAV_SECONDARY,
    wordmark, navItem, sidebar, topbar, menuSheet, tabbar,
    pageHeader, dateLine, hero, shield, metrics, bar, progress,
    section, list, row, disclosure, valueRow, settingRow,
    checkbox, task, ongoing, doneGroup, phaseMark, nowTag,
    ask, waiting, unknown, empty,
    button, buttonRow, btnGroup, link, danger,
    field, textarea, dateField, dateRange, choices, chips, segment, toggle, select,
    source, getRule, popover,
    email, note, caution, dates, tracker, found, footer,
    steps, onboarding,
  };
})();
