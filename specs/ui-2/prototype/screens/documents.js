/* Documents: everything in one place, ready to open.
   Round 3 note 5: label chips filter in one click. All (every document,
   grouped, every row ready to open), Most used (the latest I-20, the
   EAD card, the approval notice, the passport), then Status, Work,
   School, Identity, and Other once a file of no known kind is saved.
   Each chip carries its count. The chips stay on one line; on a narrow
   screen the strip scrolls sideways inside itself, never the page. Search looks inside the chosen chip; when
   nothing matches there but something matches elsewhere, one tap searches
   all. Enter opens the first match; Escape clears the search.
   Round 4 (web, phone and desktop): one tap opens a document, one tap
   shares it. A tap on a row opens the document in the sheet: the page, what
   was read from it, Save a copy and Share. Share (C.shareButton, on hover
   or focus with a mouse, always visible on touch, the glyph alone on a
   phone) hands the file straight to the device's own share sheet, in one
   tap, wherever the browser can share files (phones and most browsers).
   Where it cannot, a small sheet offers Save a copy. Both work for real on
   a small sample PDF made in the page.
   Earlier versions fold under a document ("3 earlier versions"), and each
   opens and shares the same way.
   Routes: #/documents (All), #/documents/<label> (most, status, employment,
   school, identity, other); #/documents/add opens the add sheet. The older
   links #/documents/i20 and #/documents/work open Status.
   A chip click updates the address in place (no redraw, no scroll jump).
   A file dropped anywhere, or Cmd O (Ctrl O off a Mac), arrives here through
   App.addDocument and opens the document sheet; on a phone the add sheet
   also offers Take a photo. Reading is simulated: the file shows "Reading on
   this device", then the found fields with one "Looks right".
   Round 2 note 1: an add that came through #/documents/add from another page
   returns there when the sheet closes, with its scroll, and the toast shows
   there. A saved EAD card also lifts that page's no-EAD view. */
(function () {
  'use strict';

  /* The groups, in the order a student looks for them. */
  const GROUPS = [
    { key: 'status', title: 'Status', words: 'status permit permits immigration' },
    { key: 'employment', title: 'Work', words: 'work job employment employer offer' },
    { key: 'school', title: 'School', words: 'school university degree diploma' },
    { key: 'identity', title: 'Identity', words: 'identity id travel' },
    { key: 'other', title: 'Other', words: 'other' },
  ];
  const ALIAS = { all: 'all', most: 'most', i20: 'status', work: 'status', status: 'status', employment: 'employment', job: 'employment', school: 'school', identity: 'identity', other: 'other' };
  /* The label chips, in order. 'all' and 'most' are views, the rest groups. */
  const LABELS = [{ key: 'all', title: 'All' }, { key: 'most', title: 'Most used' }]
    .concat(GROUPS.map((g) => ({ key: g.key, title: g.title })));
  /* Order inside a group: the latest I-20, the EAD card, the approval
     notice, then the CPT I-20s and the first I-20. */
  const RANK = { current: 0, ead: 1, i797: 2, cpt: 3, start: 4 };
  const I20_PHASE = { opt: 'OPT', cpt: 'CPT', start: 'Starting school' };

  const S = { ready: false, docs: [], group: 'all', query: '', sheet: null, timer: null, seq: 0, newId: null, requested: false, returnFocus: null, expanded: {}, backTo: null };

  /* Layout only: type sizes come from system.css. */
  const STYLE = '<style>' +
    '.screen-documents .page-header .ph-top { align-items: center; flex-wrap: wrap; row-gap: var(--s-16); }' +
    /* the whole row opens the document: the title button stretches over the row */
    '.screen-documents .doc-open { background: none; border: 0; padding: 0; font: inherit; color: inherit; text-align: left; cursor: pointer; }' +
    '.screen-documents .doc-open::after { content: ""; position: absolute; inset: 0; border-radius: var(--r-field); }' +
    '.screen-documents .doc-open:focus-visible { box-shadow: none; }' +
    '.screen-documents .doc-open:focus-visible::after { box-shadow: var(--focus-ring); }' +
    '.screen-documents .doc-row > .row:hover { background: var(--row-hover); }' +
    '.screen-documents .doc-row .row-trail, .screen-documents .doc-versions { position: relative; z-index: 1; }' +
    '.screen-documents .doc-earlier > .row { padding-left: calc(var(--s-12) + var(--s-16)); }' +
    '.screen-documents .doc-earlier .row-title { color: var(--ink-2); }' +
    '.screen-documents .doc-search { margin-bottom: var(--s-16); }' +
    '.screen-documents .doc-labels { margin-bottom: 0; flex-wrap: nowrap; max-width: 100%; min-width: 0; overflow-x: auto; overscroll-behavior-x: contain; scrollbar-width: none; padding: var(--s-4); margin: calc(-1 * var(--s-4)); scroll-padding-inline: var(--s-16); }' +
    '.screen-documents .doc-labels::-webkit-scrollbar { display: none; }' +
    '.screen-documents .doc-view > .section:first-child { margin-top: var(--s-32); }' +
    '.screen-documents .doc-view > .section + .section { margin-top: var(--s-32); }' +
    '.screen-documents .doc-add-another { align-self: flex-start; margin-top: var(--s-12); }' +
    '.screen-documents .doc-none { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--s-8); }' +
    /* the document sheet, appended to body while open */
    '.screen-documents.doc-layer { position: fixed; inset: 0; z-index: 45; }' +
    '.doc-layer .doc-scrim { position: absolute; inset: 0; background: var(--scrim); animation: fade .2s ease-out; }' +
    '.doc-layer .doc-sheet { position: absolute; top: 0; right: 0; bottom: 0; width: 360px; max-width: 100%; overflow-y: auto; background: var(--ground); border-left: 1px solid var(--hairline); box-shadow: var(--shadow-pop); padding: var(--s-16) var(--s-24) var(--s-32); animation: drop .28s ease-out; }' +
    '.doc-layer .doc-sheet:focus-visible { box-shadow: var(--shadow-pop); border-radius: 0; }' +
    '.doc-layer .doc-sheet-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--s-16); }' +
    '.doc-layer .doc-close { width: 44px; height: 44px; margin-right: calc(-1 * var(--s-12)); padding: 0; color: var(--ink-3); }' +
    '.doc-layer .doc-close:hover { color: var(--ink); }' +
    '.doc-layer .doc-sheet-inner { display: flex; flex-direction: column; animation: fade .2s ease-out; }' +
    '.doc-layer .doc-sheet-inner > h2:focus-visible { box-shadow: none; }' +
    '.doc-layer .doc-sheet-meta { margin-top: var(--s-8); }' +
    '.doc-layer .doc-sheet-body { margin-top: var(--s-24); display: flex; flex-direction: column; }' +
    '.doc-layer .doc-or { margin-top: var(--s-12); }' +
    '.doc-layer .doc-samples { margin-top: var(--s-48); }' +
    '.doc-layer .doc-samples .t-eyebrow { margin-bottom: var(--s-12); }' +
    '.doc-layer .doc-dup { margin-top: var(--s-24); display: flex; flex-direction: column; gap: var(--s-12); }' +
    '.doc-layer .doc-unsure { align-self: flex-start; margin-top: var(--s-24); }' +
    '.doc-layer .doc-reading { display: flex; flex-direction: column; gap: var(--s-12); }' +
    '.doc-layer .doc-reading .bar > i { width: 40%; animation: doc-scan 1.2s ease-in-out infinite; }' +
    '@keyframes doc-scan { from { transform: translateX(-100%); } to { transform: translateX(250%); } }' +
    /* round 4: the open document, the share sheet, phone and pointer parts */
    '.doc-layer .doc-paper { display: flex; flex-direction: column; gap: var(--s-8); width: 136px; aspect-ratio: 8.5 / 11; padding: var(--s-16) var(--s-12); background: var(--surface); border: 1px solid var(--hairline); border-radius: var(--r-tag); box-shadow: var(--shadow-pop); }' +
    '.doc-layer .doc-paper.is-card { width: 216px; aspect-ratio: 1.586; border-radius: var(--r-card); }' +
    '.doc-layer .doc-paper-title { font-size: var(--t-small); line-height: var(--lh-meta); font-weight: 600; color: var(--ink-2); overflow-wrap: anywhere; }' +
    '.doc-layer .doc-paper i { display: block; height: 4px; border-radius: 2px; background: var(--hairline); }' +
    '.doc-layer .doc-paper i.is-short { width: 60%; }' +
    '.doc-layer .doc-fields { margin-top: var(--s-24); }' +
    '.doc-layer .doc-file .row-lead { color: var(--ink-2); }' +
    '.doc-layer .doc-photo { margin-top: var(--s-12); }' +
    '@media (hover: none) { .doc-layer .doc-pointer { display: none; } }' +
    '@media (hover: hover) { .doc-layer .doc-touch { display: none; } }' +
    '@media (max-width: 640px) {' +
    '  .screen-documents .doc-row .share-btn { min-width: 44px; justify-content: center; }' +
    '  .screen-documents .doc-row .share-btn > span { display: none; }' +
    '  .doc-layer .doc-sheet { top: auto; left: 0; width: auto; max-height: 85vh; border-left: 0; border-radius: var(--r-sheet) var(--r-sheet) 0 0; padding: var(--s-16) var(--s-24) calc(var(--s-24) + env(safe-area-inset-bottom)); animation: sheet .28s var(--ease-rise); }' +
    '}' +
    '</style>';

  /* ---------------- model ---------------- */

  /* Every document: { id, group, type, rank, title, meta, current, earlier[] }.
     type is the kind of file (i20, ead, i797, letter, identity, school, other);
     group is where it sits on the page. */
  function init(data) {
    if (S.ready) return;
    const d = data.documents;
    const push = (it, extra) => S.docs.push(Object.assign({
      id: nextId(), title: it.title, meta: it.meta, current: !!it.current,
      earlier: (it.versions || []).map((v) => ({ title: v, meta: 'Earlier version, kept' })),
    }, extra));
    d.i20Groups.forEach((g) => g.items.forEach((it) => {
      const title = g.key === 'opt' ? 'I-20 for OPT' : g.key === 'cpt' ? 'CPT I-20, ' + it.title : it.title;
      const meta = it.current ? 'Latest, ' + it.meta : it.meta;
      push({ title: title, versions: it.versions, current: it.current, meta: meta }, {
        group: 'status', type: 'i20', phase: g.key, rank: it.current ? RANK.current : (RANK[g.key] != null ? RANK[g.key] : RANK.cpt),
      });
    }));
    d.work.forEach((it) => {
      const type = /^EAD/.test(it.title) ? 'ead' : (/^I-797/.test(it.title) ? 'i797' : 'letter');
      push(it, { type: type, group: type === 'letter' ? 'employment' : 'status', rank: RANK[type] != null ? RANK[type] : 0 });
    });
    d.identity.forEach((it) => push(it, { type: 'identity', group: 'identity', rank: 0 }));
    d.school.forEach((it) => push(it, { type: 'school', group: 'school', rank: 0 }));
    S.ready = true;
  }
  function nextId() { S.seq += 1; return 'doc-' + S.seq; }
  function inGroup(key) {
    return S.docs.map((d, i) => ({ d: d, i: i })).filter((x) => x.d.group === key)
      .sort((a, b) => (a.d.rank - b.d.rank) || (a.i - b.i)).map((x) => x.d);
  }
  function groupOf(key) { return GROUPS.filter((g) => g.key === key)[0] || null; }
  function shortToday(data) { return data.today.short.replace(/, \d{4}$/, ''); }
  function plural(n, one) { return n + ' ' + one + (n === 1 ? '' : 's'); }
  function isBlank(v) { return !v || /^\[/.test(v); }

  /* What is read from each kind of document (illustrative sample values). */
  function kinds(data) {
    const st = data.student, opt = data.opt, today = shortToday(data), read = data.documents.sampleRead;
    return {
      ead: {
        name: 'EAD card', group: 'status', rank: RANK.ead,
        fields: () => data.onboarding.eadFound,
        title: () => 'EAD card',
        meta: (f) => f['Valid from'] + ' to ' + f['Valid until'],
      },
      i20: {
        name: 'I-20', group: 'status', rank: RANK.cpt, phase: 'cpt', many: true,
        fields: () => [['Name', st.name], ['School', st.school], ['Program', data.program.degree], ['Issued for', 'CPT'], ['Employer', read.employer], ['Dates', read.dates]],
        title: (f) => (isBlank(f.Employer) ? 'CPT I-20' : 'CPT I-20, ' + f.Employer),
        meta: (f) => (isBlank(f.Dates) ? 'Added ' + today : f.Dates),
      },
      i797: {
        name: 'I-797', group: 'status', rank: RANK.i797,
        fields: () => [['Name', st.name], ['Notice', 'Approval'], ['Receipt number', opt.receipt], ['Date', opt.approved]],
        title: () => 'I-797 approval notice',
        meta: (f) => f.Date,
      },
      other: {
        name: 'document', group: 'other', rank: 0, many: true,
        fields: (file) => [['File', file], ['Kind', 'Other']],
        title: () => 'Other document',
        meta: (f) => f.File + ', added ' + today,
      },
    };
  }
  function guessKind(name, hint) {
    const n = String(name || '').toLowerCase();
    if (/ead|i-?766|work.?permit/.test(n)) return 'ead';
    if (/i-?797|notice/.test(n)) return 'i797';
    if (/i-?20(?!\d)/.test(n)) return 'i20';
    return hint || null;
  }

  /* What an opened document shows as read from it (illustrative sample
     values). A saved document keeps the fields confirmed when it was added. */
  function fieldsOf(doc) {
    if (doc.fields) return doc.fields;
    const data = App.data, st = data.student, pr = data.program, name = ['Name', st.name];
    if (doc.type === 'i20') {
      if (doc.phase === 'cpt') return [name, ['Issued for', 'CPT'], ['Employer', doc.title.replace(/^CPT I-20, /, '')], ['Dates', doc.meta]];
      if (doc.phase === 'start') return [name, ['SEVIS ID', st.sevisId], ['School', st.school], ['Program', pr.degree], ['Program start', pr.start]];
      return [name, ['SEVIS ID', st.sevisId], ['School', st.school], ['Program', pr.degree], ['Issued for', 'OPT']];
    }
    if (doc.type === 'ead') return data.onboarding.eadFound;
    if (doc.type === 'i797') return kinds(data).i797.fields();
    if (doc.type === 'letter') {
      const job = data.job || {};
      return doc.title.indexOf(job.employer) !== -1 ? [name, ['Employer', job.employer], ['Job title', job.title], ['Dated', doc.meta]] : [name, ['Dated', doc.meta]];
    }
    if (doc.type === 'identity' && /^passport/i.test(doc.title)) return [name, ['Valid until', doc.meta.replace(/^Valid until /, '')]];
    if (doc.type === 'school' && /degree/i.test(doc.title)) return [name, ['Degree', pr.degree], ['Awarded', pr.awarded]];
    if (doc.type === 'school') return [name, ['School', st.school]];
    return [name, ['Dated', doc.meta]];
  }

  /* ---------------- files ---------------- */

  /* The prototype holds no real files: Save a copy and Share use a one
     page sample PDF made here, so both work end to end. */
  function fileName(r) { return r.title.replace(/[^\w ,.()-]/g, '').replace(/\s+/g, ' ').trim() + '.pdf'; }
  function samplePdf(r) {
    const ascii = (s) => String(s).replace(/[^\x20-\x7E]/g, ' ').replace(/([\\()])/g, '\\$1');
    const lines = ['Sample copy made by the prototype, not the real document.', ' ']
      .concat((r.fields || [['Dated', r.meta]]).map((f) => f[0] + ': ' + f[1]));
    const text = ['BT', '/F1 18 Tf', '72 720 Td', '(' + ascii(r.title) + ') Tj', '/F1 11 Tf']
      .concat(lines.map((l) => '0 -22 Td (' + ascii(l) + ') Tj'), ['ET']).join('\n');
    const objs = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
      '<< /Length ' + text.length + ' >>\nstream\n' + text + '\nendstream',
    ];
    let out = '%PDF-1.4\n';
    const at = [];
    objs.forEach((o, i) => { at.push(out.length); out += (i + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
    const xref = out.length;
    out += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n' +
      at.map((n) => String(n).padStart(10, '0') + ' 00000 n \n').join('') +
      'trailer\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
    return new Blob([out], { type: 'application/pdf' });
  }
  function saveCopy(r) {
    const url = URL.createObjectURL(samplePdf(r));
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName(r);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    App.toast('Saved ' + fileName(r));
  }
  /* The device's own share sheet with the file, in the same tap, where the
     browser can share files. False when it cannot. */
  function shareNative(r) {
    let file = null;
    try { file = new File([samplePdf(r)], fileName(r), { type: 'application/pdf' }); } catch (err) { file = null; }
    if (!file || !navigator.share || !navigator.canShare || !navigator.canShare({ files: [file] })) return false;
    navigator.share({ files: [file], title: r.title }).catch(() => { /* closed */ });
    return true;
  }

  /* ---------------- rows ---------------- */

  /* A ref names one file: 'doc-3' (the document) or 'doc-3~1' (its second
     earlier version). */
  function refOf(doc, i) { return i == null ? doc.id : doc.id + '~' + i; }
  function resolve(ref) {
    const parts = String(ref || '').split('~');
    const doc = S.docs.filter((d) => d.id === parts[0])[0];
    if (!doc) return null;
    if (parts.length > 1) {
      const e = doc.earlier[Number(parts[1])];
      return e ? { ref: ref, doc: doc, earlier: true, title: doc.title + ', ' + e.title, meta: e.meta, fields: null } : null;
    }
    return { ref: ref, doc: doc, earlier: false, title: doc.title, meta: doc.meta, fields: fieldsOf(doc) };
  }

  /* The title is the open button, stretched over the row. */
  function openTitle(label, ref) {
    return C.raw('<button type="button" class="doc-open" data-doc-open="' + C.esc(ref) + '">' + C.esc(label) + '</button>');
  }
  /* The shared Share button, tied to this file so the click opens the share
     sheet here (the page catches it before App.share). */
  function shareBtn(ref, title, reveal) {
    return C.shareButton({ title: title, label: (App.data.documents.share || {}).label, reveal: reveal !== false })
      .replace('<button ', '<button data-doc-ref="' + C.esc(ref) + '" ');
  }
  /* docRows(list, { prefix?: doc -> text, keyOf?: doc -> key, versions = true, reveal = true }) */
  function docRows(list, o) {
    const opt = o || {};
    const out = [];
    list.forEach((doc) => {
      const prefix = opt.prefix ? opt.prefix(doc) : '';
      const n = opt.versions === false ? 0 : doc.earlier.length;
      /* A search that matches only an earlier version opens the versions. */
      const auto = searching() && !hasAll(haystack(doc), tokens(S.query));
      const open = n > 0 && (Object.prototype.hasOwnProperty.call(S.expanded, doc.id) ? S.expanded[doc.id] : auto);
      const versions = n ? ', <button type="button" class="link is-quiet doc-versions" data-doc-versions="' + C.esc(doc.id) + '" aria-expanded="' + (open ? 'true' : 'false') + '">' +
        C.esc(n + ' earlier version' + (n === 1 ? '' : 's')) + '</button>' : '';
      const key = opt.keyOf ? opt.keyOf(doc) : doc.id;
      out.push(C.row({
        key: key,
        title: openTitle(doc.title, refOf(doc)),
        meta: C.raw(C.esc((prefix ? prefix + ', ' : '') + doc.meta) + versions),
        trailing: shareBtn(refOf(doc), doc.title, opt.reveal),
        cls: 'doc-row',
      }));
      if (open) {
        doc.earlier.forEach((e, i) => out.push(C.row({
          title: openTitle(e.title, refOf(doc, i)),
          meta: e.meta,
          trailing: shareBtn(refOf(doc, i), doc.title + ', ' + e.title, opt.reveal),
          cls: 'doc-row doc-earlier',
        })));
      }
    });
    return out;
  }

  /* ---------------- search ---------------- */

  /* Words a student might type for each kind of document, besides its name. */
  const TYPE_WORDS = {
    i20: 'I-20 Form I-20',
    ead: 'EAD card work permit I-766 employment authorization OPT',
    i797: 'I-797 approval notice receipt OPT',
    letter: 'letter',
    identity: '',
    school: '',
    other: 'other',
  };

  /* Lower case, with hyphens, dots and apostrophes taken out, so 'I-20' and
     'i20' meet, and so do "Master's" and 'masters'. */
  function norm(v) { return String(v || '').toLowerCase().replace(/[-.'’]/g, ''); }
  function tokens(q) { return norm(q).split(/[\s,·]+/).filter(Boolean); }
  function haystack(doc) {
    const g = groupOf(doc.group);
    return norm([doc.title, doc.meta, g ? g.title + ' ' + g.words : '', TYPE_WORDS[doc.type] || '',
      doc.phase ? I20_PHASE[doc.phase] : ''].join(' '));
  }
  function hasAll(text, toks) { return toks.every((t) => text.indexOf(t) !== -1); }
  /* An earlier version matches on its own words plus the document's. */
  function earlierMatch(doc, toks) {
    const base = haystack(doc);
    return doc.earlier.some((e) => hasAll(base + ' ' + norm(e.title + ' ' + e.meta), toks));
  }
  function matches(doc, toks) {
    if (!toks.length) return true;
    return hasAll(haystack(doc), toks) || earlierMatch(doc, toks);
  }
  function searching() { return tokens(S.query).length > 0; }

  /* ---------------- labels ---------------- */

  /* Every document, in the order of the groups. */
  function allDocs() { return GROUPS.reduce((all, g) => all.concat(inGroup(g.key)), []); }
  /* Most used: the latest I-20, the EAD card, the approval notice and
     the passport, the ones an employer or a DSO asks for. */
  function mostDocs() {
    const first = (fn) => S.docs.filter(fn)[0];
    return [
      first((d) => d.type === 'i20' && d.current) || first((d) => d.type === 'i20'),
      first((d) => d.type === 'ead'),
      first((d) => d.type === 'i797'),
      first((d) => d.type === 'identity' && /^passport/i.test(d.title)),
    ].filter(Boolean);
  }
  function docsFor(label) {
    if (label === 'all') return allDocs();
    if (label === 'most') return mostDocs();
    return inGroup(label);
  }
  /* A label with nothing in it is hidden, except All. */
  function labels() { return LABELS.filter((l) => l.key === 'all' || docsFor(l.key).length > 0); }
  function labelOf(key) { return LABELS.filter((l) => l.key === key)[0] || LABELS[0]; }
  function current() {
    const k = ALIAS[S.group] || 'all';
    return (k === 'all' || docsFor(k).length) ? k : 'all';
  }
  /* Matches inside the chosen label. */
  function results(label) {
    const toks = tokens(S.query);
    return docsFor(label || current()).filter((d) => matches(d, toks));
  }

  function labelsHtml() {
    const cur = current();
    return C.chips({
      key: 'docLabel', label: 'Show documents',
      items: labels().map((l) => ({ value: l.key, label: l.title, count: docsFor(l.key).length, selected: l.key === cur })),
    }).replace('class="chips', 'class="chips doc-labels')
      /* one tab stop for the group; the arrow keys move between chips */
      .replace(/aria-checked="(true|false)"/g, (m, on) => m + ' tabindex="' + (on === 'true' ? '0' : '-1') + '"');
  }

  function searchHtml() {
    return '<div class="doc-search" role="search">' +
      C.field({ key: 'docSearch', type: 'search', value: S.query, placeholder: 'Search, like I-20 or passport', ariaLabel: 'Search documents' }) +
      '<p class="sr-only" role="status" aria-live="polite" data-doc-status></p>' +
      '</div>';
  }
  function statusText() {
    if (!searching()) return '';
    const n = results().length;
    return n ? plural(n, 'document') + ' match' + (n === 1 ? 'es' : '') : 'No documents match';
  }

  /* ---------------- views ---------------- */

  const addAnother = '<button type="button" class="link doc-add-another" data-doc-add="i20">Add another CPT I-20</button>';

  /* All: every document, under its group, each ready to open. The ones
     asked for most have their own chip, Most used, so they are not
     repeated here. */
  function allView() {
    return GROUPS.map((g) => {
      const docs = inGroup(g.key);
      if (!docs.length) return '';
      return C.section({
        eyebrow: g.title,
        content: C.list(docRows(docs), { accordion: false, label: g.title }) + (g.key === 'status' ? addAnother : ''),
      });
    }).join('');
  }

  function labelView(label) {
    const docs = docsFor(label);
    const most = label === 'most';
    return C.section({
      content: C.list(docRows(docs, { keyOf: most ? (d) => 'most:' + d.id : null, versions: !most }), { accordion: false, label: labelOf(label).title }) +
        (label === 'status' ? addAnother : ''),
    });
  }

  function resultsView() {
    const cur = current();
    const list = results(cur);
    if (!list.length) {
      const elsewhere = cur !== 'all' ? results('all').length : 0;
      return C.section({
        content: '<p class="t-meta doc-none"><span>No match' + (cur !== 'all' ? ' in ' + C.esc(labelOf(cur).title) : '') + '.</span>' +
          (elsewhere ? '<button type="button" class="link" data-doc-label="all">' + C.esc(plural(elsewhere, 'match').replace('matchs', 'matches')) + ' in All</button>' : '') +
          '</p>',
      });
    }
    const prefix = cur === 'all' || cur === 'most' ? (d) => groupOf(d.group).title : null;
    return C.section({
      content: C.list(docRows(list, { prefix: prefix }), { accordion: false, label: 'Matching documents' }),
    });
  }

  function viewHtml() {
    if (searching()) return resultsView();
    const cur = current();
    return cur === 'all' ? allView() : labelView(cur);
  }

  /* Redraw the list only, so the search field keeps focus while typing. */
  function refreshView() {
    const view = document.querySelector('[data-doc-view]');
    if (view) view.innerHTML = viewHtml();
    const status = document.querySelector('[data-doc-status]');
    if (status) status.textContent = statusText();
  }
  /* Redraw the chips too (a count changed, or the label was set in code). */
  function refreshLabels() {
    const el = document.querySelector('#main .doc-labels');
    if (!el) return;
    const x = el.scrollLeft;
    el.outerHTML = labelsHtml();
    const strip = document.querySelector('#main .doc-labels');
    if (strip) { strip.scrollLeft = x; revealChip(); }
  }
  /* Bring the chosen chip into view inside the strip; the page never moves. */
  function revealChip() {
    const strip = document.querySelector('#main .doc-labels');
    const chip = strip && strip.querySelector('[aria-checked="true"]');
    if (!chip || strip.scrollWidth <= strip.clientWidth) return;
    const s = strip.getBoundingClientRect(), c = chip.getBoundingClientRect(), pad = 16;
    if (c.left < s.left + pad) strip.scrollLeft -= (s.left + pad - c.left);
    else if (c.right > s.right - pad) strip.scrollLeft += (c.right - (s.right - pad));
  }

  /* The address follows the chosen label, so Back, a reload and a shared
     link land on the same view. The history entry keeps its state. */
  function setHash(label) {
    const h = '#/documents' + (label && label !== 'all' ? '/' + label : '');
    if (location.hash !== h) {
      try { history.replaceState(history.state, '', h); } catch (err) { /* file:// */ }
    }
  }
  function setLabel(label, o) {
    S.group = ALIAS[label] || 'all';
    if (!S.sheet) setHash(current());
    if (o && o.chips) refreshLabels();
    const y = window.scrollY;
    refreshView();
    window.scrollTo(0, y);
  }

  /* ---------------- sheet ---------------- */

  function sheetInner(data) {
    const sh = S.sheet;
    const K = kinds(data);
    const head = (title, meta) => '<h2 class="t-medium" id="doc-sheet-title" tabindex="-1">' + C.esc(title) + '</h2>' +
      (meta ? '<p class="t-meta doc-sheet-meta">' + C.esc(meta) + '</p>' : '');

    const dev = data.device || { here: 'this device' };

    if (sh.stage === 'view') {
      const r = resolve(sh.ref);
      if (!r) return head('This document was removed');
      const card = r.doc.type === 'ead';
      const paper = '<div class="' + C.cls('doc-paper', card && 'is-card') + '" aria-hidden="true">' +
        '<span class="doc-paper-title">' + C.esc(r.doc.title) + '</span><i></i><i></i><i></i><i class="is-short"></i></div>';
      return head(r.title, r.meta) +
        '<div class="doc-sheet-body">' + paper +
        (r.fields ? '<div class="doc-fields">' + C.found(r.fields) + '</div>' : '') +
        C.buttonRow({
          back: '<button type="button" class="btn btn-text is-quiet" data-doc-copy>Save a copy</button>',
          primary: C.button({ label: 'Share', kind: 'primary', attrs: { 'data-doc-sharesheet': '' } }),
        }) +
        '</div>';
    }

    if (sh.stage === 'share') {
      const r = resolve(sh.ref);
      if (!r) return head('This document was removed');
      /* Only where the browser cannot share files: save it, then attach it. */
      return head('Share ' + r.title, 'Save a copy, then attach it') +
        '<div class="doc-sheet-body">' +
        '<div class="list doc-file">' + C.row({ title: fileName(r), meta: 'PDF', lead: C.icon('file') }) + '</div>' +
        C.buttonRow({
          back: sh.fromView ? '<button type="button" class="btn btn-text is-quiet" data-doc-backview>Back</button>' : '',
          primary: C.button({ label: 'Save a copy', kind: 'primary', attrs: { 'data-doc-copy': '' } }),
        }) +
        '</div>';
    }

    if (sh.stage === 'pick') {
      const samples = [
        ['An EAD card', 'ead-card.pdf'],
        ['A CPT I-20', 'i20-cpt.pdf'],
        ['A photo of a document', 'IMG_2041.jpg'],
      ];
      const mac = /mac|iphone|ipad/i.test((navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '');
      return head(sh.hint === 'i20' ? 'Add a CPT I-20' : 'Add a document', 'Read on ' + dev.here) +
        '<div class="doc-sheet-body">' +
        '<input type="file" accept=".pdf,image/*" hidden data-doc-file>' +
        '<input type="file" accept="image/*" capture="environment" hidden data-doc-camera>' +
        C.button({ label: 'Choose a file', kind: 'primary', full: true, attrs: { 'data-doc-choose': '' } }) +
        '<div class="doc-touch doc-photo">' + C.button({ label: 'Take a photo', kind: 'pill', full: true, attrs: { 'data-doc-photo': '' } }) + '</div>' +
        '<p class="t-meta doc-or doc-pointer">Or drop it anywhere · ' + (mac ? '⌘O' : 'Ctrl O') + '</p>' +
        '<div class="doc-samples"><p class="t-eyebrow">Try a sample file</p><div class="list">' +
        samples.map((s) => '<div class="item has-lead"><button type="button" class="row" data-doc-sample="' + C.esc(s[1]) + '">' +
          '<span class="row-lead">' + C.icon('file') + '</span>' +
          '<span class="row-text"><span class="row-title">' + C.esc(s[0]) + '</span><span class="row-meta">' + C.esc(s[1]) + '</span></span>' +
          '<span class="row-trail">' + C.icon('chevron', { cls: 'chev' }) + '</span></button></div>').join('') +
        '</div></div></div>';
    }

    if (sh.stage === 'reading') {
      return head('Reading on ' + dev.here, sh.file) +
        '<div class="doc-sheet-body"><div class="doc-reading" role="status" aria-live="polite">' +
        '<div class="bar" aria-hidden="true"><i></i></div></div></div>';
    }

    if (sh.stage === 'kind') {
      return head('What is this document?', sh.file) +
        '<div class="doc-sheet-body">' +
        C.choices({
          key: 'docKind', layout: 'row', cols: 2, label: 'Kind of document',
          options: data.documents.kinds.map((k) => ({ value: k === 'I-20' ? 'i20' : k === 'EAD card' ? 'ead' : k === 'I-797' ? 'i797' : 'other', title: k })),
        }) +
        '<button type="button" class="btn btn-text is-quiet is-small doc-unsure" data-doc-unsure>I\'m not sure</button>' +
        '</div>';
    }

    /* found */
    const k = K[sh.kind];
    const rows = sh.fixing
      ? '<div class="list found">' +
        sh.fields.map((f, i) => C.valueRow({ label: f[0], value: f[1], key: 'docf:' + i })).join('') + '</div>'
      : C.found(sh.fields);
    const dup = sh.dup
      ? '<div class="doc-dup"><p class="row-title">You already have ' + C.esc(sh.kind === 'ead' ? 'an EAD card' : 'an ' + k.name + ' notice') + '.</p>' +
        C.choices({
          key: 'docVersion', selected: sh.version, label: 'Save this one as',
          options: [
            { value: 'version', title: 'The newer version' },
            { value: 'separate', title: 'A separate document' },
          ],
        }) + '</div>'
      : '';
    const title = sh.kind === 'other' ? 'Here is your file' : 'Here is what your ' + k.name + ' says';
    return head(title, sh.file) +
      '<div class="doc-sheet-body">' + rows + dup +
      /* The one placement rule: Fix one on the left, Looks right on the right. */
      C.buttonRow({
        back: sh.fixing ? '' : '<button type="button" class="btn btn-text is-quiet" data-doc-fix>Fix one</button>',
        primary: C.button({ label: 'Looks right', kind: 'primary', attrs: { 'data-doc-save': '' } }),
      }) +
      '</div>';
  }

  function layerEl() { return document.querySelector('.doc-layer'); }
  function removeLayer() { const l = layerEl(); if (l) l.remove(); }

  function createLayer() {
    removeLayer();
    const layer = document.createElement('div');
    layer.className = 'screen-documents doc-layer';
    layer.innerHTML = '<div class="doc-scrim" data-doc-close></div>' +
      '<div class="doc-sheet" role="dialog" aria-modal="true" aria-labelledby="doc-sheet-title" tabindex="-1">' +
      '<div class="doc-sheet-top"><span class="t-eyebrow">Documents</span>' +
      '<button type="button" class="btn btn-text doc-close" data-doc-close aria-label="Close">' + C.icon('close') + '</button></div>' +
      '<div class="doc-sheet-inner">' + sheetInner(App.data) + '</div></div>';
    document.body.appendChild(layer);
    layer.addEventListener('click', onLayerClick);
    layer.addEventListener('change', onLayerChange);
    layer.addEventListener('keydown', onLayerKey);
    const sheet = layer.querySelector('.doc-sheet');
    sheet.focus({ preventScroll: true });
  }

  function updateSheet() {
    const layer = layerEl();
    if (!layer || !S.sheet) return;
    const inner = layer.querySelector('.doc-sheet-inner');
    inner.outerHTML = '<div class="doc-sheet-inner">' + sheetInner(App.data) + '</div>';
    const h = layer.querySelector('#doc-sheet-title');
    if (h) h.focus({ preventScroll: true });
  }

  function openSheet(opts) {
    const o = opts || {};
    S.returnFocus = document.activeElement;
    clearTimeout(S.timer);
    S.backTo = null;
    S.sheet = { stage: 'pick', hint: o.hint || null };
    if (o.file) startReading(o.file, false);
    createLayer();
  }

  /* One tap on a row: the document opens in the sheet. */
  function openDoc(ref) {
    if (!resolve(ref)) return;
    S.returnFocus = document.activeElement;
    clearTimeout(S.timer);
    S.backTo = null;
    S.sheet = { stage: 'view', ref: ref };
    createLayer();
  }
  /* One tap on Share (or Share inside the open document): the device's own
     share sheet with the file. Only where the browser cannot share files,
     a small sheet with Save a copy. */
  function openShare(ref, fromView) {
    const r = resolve(ref);
    if (!r) return;
    App.emit('share', r.title, true, null);
    if (shareNative(r)) return;
    if (fromView && S.sheet) {
      S.sheet = { stage: 'share', ref: ref, fromView: true };
      updateSheet();
      return;
    }
    S.returnFocus = document.activeElement;
    clearTimeout(S.timer);
    S.backTo = null;
    S.sheet = { stage: 'share', ref: ref, fromView: false };
    createLayer();
  }

  function closeSheet(returnFocus) {
    clearTimeout(S.timer);
    S.sheet = null;
    removeLayer();
    setHash(current());
    /* Dismissed after arriving from another page: back to that page. */
    if (S.backTo) { S.backTo = null; goBack('', false); return; }
    if (returnFocus) {
      const main = document.getElementById('main');
      const back = (S.returnFocus && main && main.contains(S.returnFocus)) ? S.returnFocus : document.querySelector('#main [data-doc-add]');
      if (back) back.focus();
    }
  }

  /* Back to the page the add came from, with its scroll (app.js restores
     it). The toast shows there once it has arrived. When an EAD card was
     saved, that page's no-EAD view gives way to the dates it now has. */
  function goBack(message, eadSaved) {
    let arrived = false;
    let fallback = null;
    const arrive = () => {
      if (arrived) return;
      arrived = true;
      window.removeEventListener('hashchange', onArrive);
      clearTimeout(fallback);
      if (App.route === 'documents') App.rerender();
      else if (eadSaved && /\/no-ead(\/|$)/.test(location.hash)) {
        App.go(location.hash.split('/').filter((part) => part !== 'no-ead').join('/'), { replace: true, inPlace: true });
      }
      if (message) confirmed(message);
    };
    const onArrive = () => setTimeout(arrive, 0);
    window.addEventListener('hashchange', onArrive);
    fallback = setTimeout(arrive, 600);
    history.back();
  }

  function startReading(file, update) {
    const hint = S.sheet ? S.sheet.hint : null;
    S.sheet = { stage: 'reading', file: file || 'document.pdf', hint: hint };
    clearTimeout(S.timer);
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    S.timer = setTimeout(() => {
      if (!S.sheet || S.sheet.stage !== 'reading') return;
      const k = guessKind(S.sheet.file, S.sheet.hint);
      if (k) toFound(k); else S.sheet.stage = 'kind';
      updateSheet();
    }, reduced ? 500 : 1400);
    if (update !== false) updateSheet();
  }

  function toFound(kind) {
    const K = kinds(App.data)[kind];
    const sh = S.sheet;
    sh.stage = 'found';
    sh.kind = kind;
    sh.fields = K.fields(sh.file).map((f) => f.slice());
    sh.fixing = false;
    sh.dup = !K.many && S.docs.some((x) => x.type === kind);
    sh.version = sh.dup ? 'version' : null;
  }

  function saveDocument(unsure) {
    const data = App.data;
    const sh = S.sheet;
    const K = kinds(data);
    let kind = sh.kind;
    let fields = sh.fields;
    if (unsure) {
      kind = 'other';
      fields = K.other.fields(sh.file);
    }
    const k = K[kind];
    const f = {};
    fields.forEach((r) => { f[r[0]] = r[1]; });
    let message;
    if (!unsure && sh.dup && sh.version === 'version') {
      const existing = S.docs.filter((x) => x.type === kind)[0];
      existing.earlier.unshift({ title: existing.meta, meta: 'Earlier version, replaced ' + shortToday(data) });
      existing.meta = k.meta(f);
      existing.fields = fields.map((r) => r.slice());
      S.newId = existing.id;
      message = 'Saved as the newer version. The earlier one is kept.';
    } else {
      const doc = {
        id: nextId(),
        group: k.group,
        type: kind,
        phase: k.phase,
        rank: k.rank,
        title: k.title(f),
        meta: k.meta(f),
        current: false,
        earlier: [],
        fields: fields.map((r) => r.slice()),
      };
      S.docs.unshift(doc);
      S.newId = doc.id;
      message = 'Saved to ' + groupOf(k.group).title + '. ' + plural(S.docs.length, 'document') + ' now.';
    }
    /* The new document is always in view: its label is chosen, the search clears. */
    S.group = k.group;
    S.query = '';
    App.state.docSearch = '';
    /* Came from another page: the answer belongs there, not here. */
    if (S.backTo) {
      S.backTo = null;
      closeSheet(false);
      goBack(kind === 'ead' ? 'EAD card saved. Your dates are counted from it.' : message, kind === 'ead');
      return;
    }
    closeSheet(false);
    App.rerender();
    confirmed(message);
  }

  /* Round 5 (note 4): a confirmed document's line carries the same check a
     ticked step draws, with a light tap. Under reduced motion the check is
     simply there. */
  function confirmed(message) {
    App.toast(message);
    const line = document.querySelector('.toast > span');
    if (line) {
      line.style.cssText = 'display: inline-flex; align-items: center; gap: var(--s-8);';
      line.insertAdjacentHTML('afterbegin', '<span class="check" aria-checked="true" aria-hidden="true" style="margin-top: 0;">' + C.icon('tick', { size: 12 }) + '</span>');
      App.play(line.firstElementChild, 'is-ticking');
    }
    App.haptic('tick');
  }

  function onLayerClick(e) {
    const t = e.target;
    if (t.closest('[data-doc-close]')) { closeSheet(true); return; }
    if (t.closest('[data-doc-choose]')) { const input = layerEl().querySelector('[data-doc-file]'); if (input) input.click(); return; }
    if (t.closest('[data-doc-photo]')) { const cam = layerEl().querySelector('[data-doc-camera]'); if (cam) cam.click(); return; }
    if (t.closest('[data-doc-sharesheet]')) { openShare(S.sheet.ref, true); return; }
    if (t.closest('[data-doc-copy]')) {
      const r = resolve(S.sheet.ref);
      if (!r) return;
      if (S.sheet.stage === 'share') closeSheet(true);
      saveCopy(r);
      return;
    }
    if (t.closest('[data-doc-backview]')) { S.sheet = { stage: 'view', ref: S.sheet.ref }; updateSheet(); return; }
    const sample = t.closest('[data-doc-sample]');
    if (sample) { startReading(sample.dataset.docSample); return; }
    if (t.closest('[data-doc-fix]')) { S.sheet.fixing = true; updateSheet(); return; }
    if (t.closest('[data-doc-save]')) {
      const editing = layerEl().querySelector('.vrow.is-editing [data-edit-save]');
      if (editing) editing.click();
      saveDocument(false);
      return;
    }
    if (t.closest('[data-doc-unsure]')) { saveDocument(true); }
  }
  function onLayerChange(e) {
    const input = e.target.closest('[data-doc-file], [data-doc-camera]');
    if (input && input.files && input.files[0]) startReading(input.files[0].name);
  }
  function onLayerKey(e) {
    const layer = layerEl();
    if (e.key === 'Escape') {
      if (layer.querySelector('.vrow.is-editing')) return;
      e.preventDefault();
      /* From the share sheet opened inside a document: back to it. */
      if (S.sheet && S.sheet.stage === 'share' && S.sheet.fromView) { S.sheet = { stage: 'view', ref: S.sheet.ref }; updateSheet(); return; }
      closeSheet(true);
      return;
    }
    if (e.key === 'Tab') {
      const sheet = layer.querySelector('.doc-sheet');
      const f = Array.from(sheet.querySelectorAll('button:not([disabled]):not([tabindex="-1"]), input:not([hidden]), a[href], [role="radio"][tabindex="0"]'))
        .filter((el) => el.offsetParent !== null || el.getClientRects().length > 0);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || !sheet.contains(document.activeElement) || document.activeElement === sheet)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  /* ---------------- shared events (registered once) ---------------- */

  document.addEventListener('duly:change', (e) => {
    const d = e.detail || {};
    if (d.kind === 'document') { S.requested = true; return; }
    if (!window.App || App.route !== 'documents') return;
    if (d.kind === 'field' && d.key === 'docSearch') {
      if (S.query === d.value) return;
      S.query = d.value;
      refreshView();
      return;
    }
    if (d.kind === 'choice' && d.key === 'docLabel') { setLabel(d.value); revealChip(); return; }
    if (!S.sheet) return;
    if (d.kind === 'choice' && d.key === 'docKind') { toFound(d.value); updateSheet(); return; }
    if (d.kind === 'choice' && d.key === 'docVersion') { S.sheet.version = d.value; return; }
    if (d.kind === 'edit' && /^docf:\d+$/.test(d.key || '')) {
      const i = Number(d.key.split(':')[1]);
      if (S.sheet.fields && S.sheet.fields[i]) S.sheet.fields[i][1] = d.value;
    }
  });

  window.addEventListener('hashchange', () => {
    const name = (location.hash || '').replace(/^#\/?/, '').split('/')[0];
    if (name !== 'documents') { clearTimeout(S.timer); S.sheet = null; S.backTo = null; S.query = ''; App.state.docSearch = ''; removeLayer(); }
  });

  /* ---------------- screen ---------------- */

  window.SCREENS['documents'] = {
    title: 'Documents',
    paramsInPlace: true,
    titleFor() { return 'Documents'; },
    render(data, params) {
      init(data);
      const p = params && params[0];
      S.group = ALIAS[p] || 'all';

      if (p === 'add' || S.requested) {
        const file = App.state.pendingDocument;
        delete App.state.pendingDocument;
        S.requested = false;
        clearTimeout(S.timer);
        S.sheet = { stage: 'pick', hint: null };
        /* Opened by a link or a drop on another page: remember to go back. */
        S.backTo = p === 'add' && App.from && !/^#\/documents(\/|$)/.test(App.from.hash) ? App.from.hash : null;
        if (file) startReading(file, false);
      }

      /* No hero and no subline: the chips carry the counts. */
      const header = C.pageHeader({
        title: 'Documents',
        info: 'Every version is kept and encrypted. Files are read on ' + ((data.device && data.device.yours) || 'your device') + ', with no outside AI.',
        aside: C.button({ label: 'Add a document', kind: 'primary', attrs: { 'data-doc-add': '' } }),
      });
      return STYLE +
        '<div class="screen-documents">' +
        header + searchHtml() + labelsHtml() +
        '<div class="doc-view" data-doc-view>' + viewHtml() + '</div>' +
        '</div>' +
        C.footer();
    },
    mount(root) {
      removeLayer();
      if (S.sheet) createLayer();
      /* A legacy link (#/documents/work) settles on its label's address. */
      if (!S.sheet) setHash(current());
      revealChip();
      /* A new document gets the short highlight every new row gets. Scroll
         only when it is out of view, never over a restored scroll. */
      if (S.newId) {
        const el = root.querySelector('[data-doc-view] [data-key="' + S.newId + '"]');
        const r = el && el.getBoundingClientRect();
        if (r && (r.top < 0 || r.bottom > window.innerHeight)) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        if (el) App.play(el, 'is-arriving');
      }
      S.newId = null;
      root.addEventListener('click', (e) => {
        const add = e.target.closest('[data-doc-add]');
        if (add) { e.preventDefault(); openSheet({ hint: add.dataset.docAdd || null }); return; }
        /* "N matches in All": search every document instead. */
        const lab = e.target.closest('[data-doc-label]');
        if (lab) {
          setLabel(lab.dataset.docLabel, { chips: true });
          const chip = root.querySelector('.doc-labels [data-value="' + lab.dataset.docLabel + '"]');
          if (chip) chip.focus({ preventScroll: true });
          return;
        }
        const ver = e.target.closest('[data-doc-versions]');
        if (ver) {
          const id = ver.dataset.docVersions;
          S.expanded[id] = ver.getAttribute('aria-expanded') !== 'true';
          const y = window.scrollY;
          refreshView();
          window.scrollTo(0, y);
          const again = root.querySelector('[data-doc-versions="' + id + '"]');
          if (again) again.focus({ preventScroll: true });
          return;
        }
        /* Share is caught here, before App.share, so it opens this page's
           share sheet for the very file on the row. */
        const share = e.target.closest('[data-doc-ref]');
        if (share) { e.preventDefault(); e.stopPropagation(); openShare(share.dataset.docRef, false); return; }
        const open = e.target.closest('[data-doc-open]');
        if (open) { openDoc(open.dataset.docOpen); }
      });
      /* Enter opens the first match; Escape clears the search. */
      root.addEventListener('keydown', (e) => {
        if (!e.target.matches || !e.target.matches('[data-field="docSearch"]')) return;
        if (e.key === 'Enter') {
          e.preventDefault();
          const first = root.querySelector('[data-doc-view] .doc-open');
          if (first && searching()) first.click();
        } else if (e.key === 'Escape' && e.target.value) {
          e.preventDefault();
          e.target.value = '';
          App.state.docSearch = '';
          S.query = '';
          refreshView();
        }
      });
      const status = root.querySelector('[data-doc-status]');
      if (status) status.textContent = statusText();
    },
  };
})();
