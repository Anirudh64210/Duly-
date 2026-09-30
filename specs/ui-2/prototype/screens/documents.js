/* Documents: everything in one place, sorted by kind and phase, every version kept.
   The bar (BRIEF.md): faster than a WhatsApp self chat or the school's
   approval email. A tap on a row opens the document; Share sits on the row
   (on hover or focus with a mouse, always visible on touch). Earlier
   versions of a document fold under it ("3 earlier versions").
   Search sits under the title: typing filters the documents live by name,
   kind and phase ('I-20', 'EAD', 'Lumen', 'OPT'), within the chosen chip.
   Enter opens the first match; Escape clears the search.
   Routes: #/documents, #/documents/<tab> (i20, work, identity, school), #/documents/add.
   A file dropped anywhere, or Cmd O, arrives here through App.addDocument and opens the
   document sheet. Reading is simulated: the file shows "Reading on this Mac", then the
   found fields with one "Looks right". */
(function () {
  'use strict';

  const TABS = ['all', 'i20', 'work', 'identity', 'school'];
  const S = { ready: false, docs: [], groups: [], tab: 'all', query: '', sheet: null, timer: null, seq: 0, newId: null, requested: false, returnFocus: null, expanded: {} };

  const STYLE = '<style>' +
    '.screen-documents .page-header .ph-top { align-items: center; flex-wrap: wrap; row-gap: var(--s-16); }' +
    '.screen-documents .doc-view > .section:first-child { margin-top: 0; }' +
    '.screen-documents .doc-search { margin-bottom: var(--s-16); }' +
    /* the whole row opens the document: the title button stretches over the row */
    '.screen-documents .doc-open { background: none; border: 0; padding: 0; font: inherit; color: inherit; text-align: left; cursor: pointer; }' +
    '.screen-documents .doc-open::after { content: ""; position: absolute; inset: 0; border-radius: var(--r-field); }' +
    '.screen-documents .doc-open:focus-visible { box-shadow: none; }' +
    '.screen-documents .doc-open:focus-visible::after { box-shadow: var(--focus-ring); }' +
    '.screen-documents .doc-row > .row:hover { background: var(--row-hover); }' +
    '.screen-documents .doc-row .row-trail, .screen-documents .doc-versions { position: relative; z-index: 1; }' +
    '.screen-documents .doc-earlier > .row { padding-left: calc(var(--s-12) + var(--s-16)); }' +
    '.screen-documents .doc-earlier .row-title { color: var(--ink-2); }' +
    '.screen-documents .doc-group > .disc .item { margin: 0 calc(-1 * var(--s-12)); }' +
    '.screen-documents .doc-group > .disc .item:first-child { border-top-color: transparent; }' +
    '.screen-documents .doc-group > .disc .item:last-child { border-bottom: 0; }' +
    '.screen-documents .doc-group > .disc .doc-add-another { align-self: flex-start; padding: var(--s-8) 0; }' +
    '.screen-documents .doc-new > .row { animation: doc-flash 1.8s ease-out; }' +
    '@keyframes doc-flash { from { background: var(--accent-tint); } to { background: transparent; } }' +
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
    '.doc-layer .doc-fix-hint { margin-bottom: var(--s-12); }' +
    '.doc-layer .doc-dup { margin-top: var(--s-24); display: flex; flex-direction: column; gap: var(--s-12); }' +
    '.doc-layer .doc-unsure { align-self: flex-start; margin-top: var(--s-24); }' +
    '.doc-layer .doc-reading { display: flex; flex-direction: column; gap: var(--s-12); }' +
    '.doc-layer .doc-reading .bar > i { width: 40%; animation: doc-scan 1.2s ease-in-out infinite; }' +
    '@keyframes doc-scan { from { transform: translateX(-100%); } to { transform: translateX(250%); } }' +
    '@media (max-width: 640px) {' +
    '  .doc-layer .doc-sheet { top: auto; left: 0; width: auto; max-height: 85vh; border-left: 0; border-radius: var(--r-sheet) var(--r-sheet) 0 0; padding: var(--s-16) var(--s-24) calc(var(--s-24) + env(safe-area-inset-bottom)); animation: sheet .28s var(--ease-rise); }' +
    '}' +
    '</style>';

  /* ---------------- model ---------------- */

  function init(data) {
    if (S.ready) return;
    const d = data.documents;
    S.groups = d.i20Groups.map((g) => ({ key: g.key, title: g.title, add: g.add }));
    const push = (kind, it, extra) => S.docs.push(Object.assign({
      id: nextId(), kind: kind, title: it.title, meta: it.meta, current: !!it.current,
      earlier: (it.versions || []).map((v) => ({ title: v, meta: 'Earlier version, kept' })),
    }, extra));
    d.i20Groups.forEach((g) => g.items.forEach((it) => push('i20', it, { group: g.key, type: 'i20' })));
    d.work.forEach((it) => push('work', it, { type: /^EAD/.test(it.title) ? 'ead' : (/^I-797/.test(it.title) ? 'i797' : 'letter') }));
    d.identity.forEach((it) => push('identity', it, { type: 'identity' }));
    d.school.forEach((it) => push('school', it, { type: 'school' }));
    S.ready = true;
  }
  function nextId() { S.seq += 1; return 'doc-' + S.seq; }
  function ofKind(kind) { return S.docs.filter((x) => x.kind === kind); }
  function shortToday(data) { return data.today.short.replace(/, \d{4}$/, ''); }
  function plural(n, one) { return n + ' ' + one + (n === 1 ? '' : 's'); }
  function isBlank(v) { return !v || /^\[/.test(v); }

  /* What Duly reads from each kind of document (illustrative sample values). */
  function kinds(data) {
    const st = data.student, opt = data.opt, today = shortToday(data), read = data.documents.sampleRead;
    return {
      ead: {
        name: 'EAD card', tab: 'work',
        fields: () => data.onboarding.eadFound,
        title: () => 'EAD card',
        meta: (f) => f['Valid from'] + ' to ' + f['Valid until'],
      },
      i20: {
        name: 'I-20', tab: 'i20', group: 'cpt', many: true,
        fields: () => [['Name', st.name], ['School', st.school], ['Program', data.program.degree], ['Issued for', 'CPT'], ['Employer', read.employer], ['Dates', read.dates]],
        title: (f) => (isBlank(f.Employer) ? 'New CPT I-20' : f.Employer),
        meta: (f) => (isBlank(f.Dates) ? 'Added ' + today : f.Dates),
      },
      i797: {
        name: 'I-797', tab: 'work',
        fields: () => [['Name', st.name], ['Notice', 'Approval'], ['Receipt number', opt.receipt], ['Date', opt.approved]],
        title: () => 'I-797 approval notice',
        meta: (f) => f.Date,
      },
      other: {
        name: 'document', tab: 'all', many: true,
        fields: (file) => [['File', file], ['Kind', 'Other']],
        title: () => 'Other document',
        meta: (f) => f.File + ' · added ' + today,
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

  /* ---------------- page ---------------- */

  /* The title is the open button, stretched over the row. */
  function openTitle(label, title) {
    return C.raw('<button type="button" class="doc-open" data-toast="' + C.esc('Opening ' + title + ' in Preview') + '">' + C.esc(label) + '</button>');
  }
  function shareBtn(title) {
    return '<button type="button" class="btn btn-text is-small row-reveal" data-doc-share="' + C.esc(title) + '" aria-label="' + C.esc('Share ' + title) + '">Share</button>';
  }
  function docRows(list, prefixFor) {
    const out = [];
    list.forEach((doc) => {
      const prefix = prefixFor ? prefixFor(doc) : '';
      const n = doc.earlier.length;
      /* A search that matches only an earlier version opens the versions. */
      const auto = searching() && !hasAll(haystack(doc), tokens(S.query));
      const open = Object.prototype.hasOwnProperty.call(S.expanded, doc.id) ? S.expanded[doc.id] : auto;
      const versions = n ? ' · <button type="button" class="link doc-versions" data-doc-versions="' + C.esc(doc.id) + '" aria-expanded="' + (open ? 'true' : 'false') + '">' +
        C.esc(n + ' earlier version' + (n === 1 ? '' : 's')) + '</button>' : '';
      out.push(C.row({
        key: doc.id,
        title: openTitle(doc.title, doc.title),
        meta: C.raw(C.esc((prefix ? prefix + ' · ' : '') + doc.meta) + versions),
        trailing: shareBtn(doc.title),
        cls: C.cls('doc-row', S.newId === doc.id && 'doc-new'),
      }));
      if (open) {
        doc.earlier.forEach((e) => out.push(C.row({
          title: openTitle(e.title, 'the earlier ' + doc.title),
          meta: e.meta,
          trailing: shareBtn('the earlier ' + doc.title),
          cls: 'doc-row doc-earlier',
        })));
      }
    });
    return out;
  }
  function groupTitle(key) { const g = S.groups.find((x) => x.key === key); return g ? g.title : ''; }

  /* ---------------- search ---------------- */

  /* Words a student might type for each kind of document, besides its name. */
  const TYPE_WORDS = {
    i20: 'I-20 Form I-20',
    ead: 'EAD card work permit I-766',
    i797: 'I-797 approval notice',
    letter: 'letter',
    identity: '',
    school: 'degree',
    other: 'other',
  };
  /* The phase a kind of document belongs to, for kinds without their own group. */
  const PHASE_OF_KIND = { work: 'OPT', identity: 'Arrival', school: "Master's" };

  /* Lower case, with hyphens, dots and apostrophes taken out, so 'I-20' and
     'i20' meet, and so do "Master's" and 'masters'. */
  function norm(v) { return String(v || '').toLowerCase().replace(/[-.'\u2019]/g, ''); }
  function tokens(q) { return norm(q).split(/[\s,·]+/).filter(Boolean); }
  function kindLabel(kind) {
    const t = App.data.documents.tabs.find((x) => x.key === kind);
    return t ? t.label : '';
  }
  function haystack(doc) {
    return norm([doc.title, doc.meta, kindLabel(doc.kind), TYPE_WORDS[doc.type] || '',
      doc.group ? groupTitle(doc.group) : '', PHASE_OF_KIND[doc.kind] || ''].join(' '));
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
  /* The documents of one kind that match the search (all of them when it is empty). */
  function shown(kind) {
    const toks = tokens(S.query);
    return ofKind(kind).filter((d) => matches(d, toks));
  }
  function inTab(tab) {
    const kinds = tab === 'all' ? ['i20', 'work', 'identity', 'school', 'other'] : [tab];
    return kinds.reduce((n, k) => n + shown(k).length, 0);
  }

  function searchHtml() {
    return '<div class="doc-search" role="search">' +
      C.field({ key: 'docSearch', type: 'search', value: S.query, placeholder: 'Search by name, kind or phase', ariaLabel: 'Search documents' }) +
      '<p class="sr-only" role="status" aria-live="polite" data-doc-status></p>' +
      '</div>';
  }
  function statusText() {
    if (!searching()) return '';
    const n = inTab(S.tab);
    return n ? plural(n, 'document') + ' match' + (n === 1 ? 'es' : '') : 'No documents match';
  }
  /* The quiet line when nothing matches. When the chosen chip hides matches
     of another kind, one tap shows them. */
  function noneHtml() {
    const all = S.tab === 'all' ? 0 : inTab('all');
    return '<p class="t-meta doc-none">No documents match.' +
      (all ? ' <button type="button" class="link" data-doc-all>' + C.esc('See ' + all + ' in All') + '</button>' : '') + '</p>';
  }

  function i20View() {
    const groups = S.groups.map((g) => {
      const items = shown('i20').filter((x) => x.group === g.key);
      if (!items.length) return '';
      const add = g.add ? '<button type="button" class="link doc-add-another" data-doc-add="i20">' + C.esc(g.add) + '</button>' : '';
      return C.row({
        title: g.title,
        value: plural(items.length, 'document'),
        lead: C.icon('chevron', { cls: 'chev' }),
        chevron: false,
        open: true,
        cls: 'doc-group',
        content: C.list(docRows(items), { accordion: false }) + add,
      });
    });
    return C.list(groups, { accordion: false, label: 'I-20s by phase' });
  }

  function allView() {
    const sec = (eyebrow, html) => C.section({ eyebrow: eyebrow, content: html });
    const kinds = [
      ['i20', 'I-20s', (d) => groupTitle(d.group)],
      ['work', 'Work'],
      ['identity', 'Identity'],
      ['school', 'School'],
      ['other', 'Other'],
    ];
    /* Other shows only once a document of that kind exists; while searching,
       a kind with no match is left out. */
    return kinds.map((k) => {
      const docs = shown(k[0]);
      if (!docs.length && (searching() || k[0] === 'other')) return '';
      return sec(k[1], C.list(docRows(docs, k[2]), { accordion: false }));
    }).join('');
  }

  function viewHtml(tab) {
    if (searching() && !inTab(tab)) return noneHtml();
    if (tab === 'i20') return i20View();
    if (tab === 'all') return allView();
    return C.list(docRows(shown(tab)), { accordion: false, label: kindLabel(tab) });
  }

  /* Redraw the list only, so the search field keeps focus while typing. */
  function refreshView() {
    const view = document.querySelector('[data-doc-view]');
    if (view) view.innerHTML = viewHtml(S.tab);
    const status = document.querySelector('[data-doc-status]');
    if (status) status.textContent = statusText();
  }

  function tabsHtml(data) {
    return C.chips({
      key: 'docTab',
      label: 'Kinds of document',
      items: data.documents.tabs.map((t) => ({
        value: t.key, label: t.label,
        count: t.key === 'all' ? null : ofKind(t.key).length,
        selected: t.key === S.tab,
      })),
    });
  }


  function setHash(tab) {
    const h = '#/documents' + (tab && tab !== 'all' ? '/' + tab : '');
    if (location.hash !== h) history.replaceState(null, '', h);
  }

  /* ---------------- sheet ---------------- */

  function sheetInner(data) {
    const sh = S.sheet;
    const K = kinds(data);
    const head = (title, meta) => '<h2 class="t-sub" id="doc-sheet-title" tabindex="-1">' + C.esc(title) + '</h2>' +
      (meta ? '<p class="t-meta doc-sheet-meta">' + C.esc(meta) + '</p>' : '');

    if (sh.stage === 'pick') {
      const samples = [
        ['An EAD card', 'ead-card.pdf'],
        ['A CPT I-20', 'i20-cpt.pdf'],
        ['A photo of a document', 'IMG_2041.jpg'],
      ];
      return head(sh.hint === 'i20' ? 'Add a CPT I-20.' : 'Add a document.', 'Duly reads it on this Mac. Nothing is uploaded anywhere.') +
        '<div class="doc-sheet-body">' +
        '<input type="file" accept=".pdf,image/*" hidden data-doc-file>' +
        C.button({ label: 'Choose a file', kind: 'primary', full: true, attrs: { 'data-doc-choose': '' } }) +
        '<p class="t-meta doc-or">Or drop a file anywhere in Duly, or press ⌘O.</p>' +
        '<div class="doc-samples"><p class="t-eyebrow">Try a sample file</p><div class="list">' +
        samples.map((s) => '<div class="item has-lead"><button type="button" class="row" role="button" data-doc-sample="' + C.esc(s[1]) + '">' +
          '<span class="row-lead">' + C.icon('file') + '</span>' +
          '<span class="row-text"><span class="row-title">' + C.esc(s[0]) + '</span><span class="row-meta">' + C.esc(s[1]) + '</span></span>' +
          '<span class="row-trail">' + C.icon('chevron', { cls: 'chev' }) + '</span></button></div>').join('') +
        '</div></div></div>';
    }

    if (sh.stage === 'reading') {
      return head('Reading on this Mac', sh.file) +
        '<div class="doc-sheet-body"><div class="doc-reading" role="status" aria-live="polite">' +
        '<div class="bar" aria-hidden="true"><i></i></div>' +
        '<p class="t-meta">Nothing leaves this Mac while Duly reads it.</p></div></div>';
    }

    if (sh.stage === 'kind') {
      return head('What is this document?', sh.file + ' · read on this Mac') +
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
      ? '<p class="t-meta doc-fix-hint">Tap a value to change it.</p><div class="list found">' +
        sh.fields.map((f, i) => C.valueRow({ label: f[0], value: f[1], key: 'docf:' + i })).join('') + '</div>'
      : C.found(sh.fields);
    const dup = sh.dup
      ? '<div class="doc-dup"><p class="row-title">You already have ' + C.esc(sh.kind === 'ead' ? 'an EAD card' : 'an ' + k.name + ' notice') + '.</p>' +
        C.choices({
          key: 'docVersion', selected: sh.version, label: 'Save this one as',
          options: [
            { value: 'version', title: 'The newer version', meta: 'The one you have is kept for the record' },
            { value: 'separate', title: 'A separate document', meta: 'Kept next to the one you have' },
          ],
        }) + '</div>'
      : '';
    const title = sh.kind === 'other' ? 'Duly read your document.' : 'Duly read your ' + k.name + '.';
    return head(title, 'Read on this Mac. Nothing left it.') +
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
    S.sheet = { stage: 'pick', hint: o.hint || null };
    if (o.file) startReading(o.file, false);
    createLayer();
  }

  function closeSheet(returnFocus) {
    clearTimeout(S.timer);
    S.sheet = null;
    removeLayer();
    setHash(S.tab);
    if (returnFocus) {
      const back = (S.returnFocus && document.contains(S.returnFocus)) ? S.returnFocus : document.querySelector('[data-doc-add]');
      if (back) back.focus();
    }
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
      const existing = S.docs.find((x) => x.type === kind);
      existing.earlier.unshift({ title: existing.meta, meta: 'Earlier version, replaced ' + shortToday(data) });
      existing.meta = k.meta(f);
      existing.current = true;
      S.newId = existing.id;
      message = 'Saved as the newer version. The earlier one is kept.';
    } else {
      const doc = {
        id: nextId(),
        kind: kind === 'other' ? 'other' : k.tab,
        group: k.group,
        type: kind,
        title: k.title(f),
        meta: unsure ? sh.file + ' · Duly will ask what it is later' : k.meta(f),
        current: false,
        earlier: [],
      };
      S.docs.unshift(doc);
      S.newId = doc.id;
      message = 'Saved to Documents. ' + plural(S.docs.length, 'document') + ' now.';
    }
    S.tab = k.tab;
    S.query = ''; /* the new document is always in view */
    closeSheet(false);
    App.rerender();
    App.toast(message);
  }

  function onLayerClick(e) {
    const t = e.target;
    if (t.closest('[data-doc-close]')) { closeSheet(true); return; }
    if (t.closest('[data-doc-choose]')) { const input = layerEl().querySelector('[data-doc-file]'); if (input) input.click(); return; }
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
    const input = e.target.closest('[data-doc-file]');
    if (input && input.files && input.files[0]) startReading(input.files[0].name);
  }
  function onLayerKey(e) {
    const layer = layerEl();
    if (e.key === 'Escape') {
      if (layer.querySelector('.vrow.is-editing')) return;
      e.preventDefault();
      closeSheet(true);
      return;
    }
    if (e.key === 'Tab') {
      const sheet = layer.querySelector('.doc-sheet');
      const f = Array.from(sheet.querySelectorAll('button:not([disabled]):not([tabindex="-1"]), input:not([hidden]), a[href]'));
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
    if (d.kind === 'choice' && d.key === 'docTab') {
      S.tab = d.value;
      setHash(S.tab);
      refreshView();
      return;
    }
    if (d.kind === 'field' && d.key === 'docSearch') {
      if (S.query === d.value) return;
      S.query = d.value;
      refreshView();
      return;
    }
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
    if (name !== 'documents') { clearTimeout(S.timer); S.sheet = null; S.query = ''; removeLayer(); }
  });

  function focusSearch() {
    const input = document.querySelector('#main [data-field="docSearch"]');
    if (!input) return;
    input.focus();
    const n = input.value.length;
    try { input.setSelectionRange(n, n); } catch (err) { /* not every input type allows a caret */ }
  }

  /* ---------------- screen ---------------- */

  window.SCREENS['documents'] = {
    title: 'Documents',
    render(data, params) {
      init(data);
      const p = params && params[0];
      if (TABS.indexOf(p) !== -1) S.tab = p;
      else if (p !== 'add') S.tab = 'all';

      if (p === 'add' || S.requested) {
        const file = App.state.pendingDocument;
        delete App.state.pendingDocument;
        S.requested = false;
        clearTimeout(S.timer);
        S.sheet = { stage: 'pick', hint: null };
        if (file) startReading(file, false);
      }

      /* No hero here: the count is a plain line under the title. */
      const header = C.pageHeader({
        title: 'Documents',
        subline: plural(S.docs.length, 'document') + ', one record. ' + data.documents.meta,
        aside: C.button({ label: 'Add a document', kind: 'primary', attrs: { 'data-doc-add': '' } }),
      });
      return STYLE +
        '<div class="screen-documents">' +
        header + searchHtml() + tabsHtml(data) +
        '<div class="doc-view" data-doc-view>' + viewHtml(S.tab) + '</div>' +
        '</div>' +
        C.footer();
    },
    mount(root) {
      removeLayer();
      if (S.sheet) createLayer();
      if (S.newId) {
        const el = root.querySelector('[data-key="' + S.newId + '"]');
        if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        S.newId = null;
      }
      root.addEventListener('click', (e) => {
        const add = e.target.closest('[data-doc-add]');
        if (add) { e.preventDefault(); openSheet({ hint: add.dataset.docAdd || null }); return; }
        const ver = e.target.closest('[data-doc-versions]');
        if (ver) {
          const id = ver.dataset.docVersions;
          S.expanded[id] = ver.getAttribute('aria-expanded') !== 'true';
          refreshView();
          const again = root.querySelector('[data-doc-versions="' + id + '"]');
          if (again) again.focus();
          return;
        }
        /* "See N in All": the matches were under another chip. */
        if (e.target.closest('[data-doc-all]')) {
          S.tab = 'all';
          setHash('all');
          App.rerender();
          focusSearch();
          return;
        }
        const share = e.target.closest('[data-doc-share]');
        if (share) App.toast('Share ' + share.dataset.docShare + ' to Messages, Mail or any app');
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
