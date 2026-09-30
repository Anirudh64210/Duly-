/* Settings. Hairline rows: title and one meta line on the left, the control on the right.
   One hero line (your data, kept on this Mac) and one filled button (Back up now).
   Routes:
     #/settings           the sample settings
     #/settings/offline   shows the offline line at the bottom
   Shared state it reads and writes (App.state):
     lockOn, touchId, remind, statusUpdates, news   toggles (app.js writes them)
     lockAfter, tz, theme                           chip choices (app.js writes them; theme applies itself)
     lastBackup                                     'today' once a backup was made */
(function () {
  'use strict';

  const TZ_MAC = 'New York';
  const TZ_OPTIONS = ['New York', 'Chicago', 'Denver', 'Phoenix', 'Los Angeles', 'Anchorage', 'Honolulu'];
  let offChange = null;

  function st(key, fallback) {
    const v = App.state[key];
    return v == null ? fallback : v;
  }
  function tzMeta(tz) { return tz === TZ_MAC ? TZ_MAC + ', set from this Mac' : tz + ', set by you'; }
  function backupMeta(data) {
    const m = data.settings.backup.meta;
    return App.state.lastBackup ? m.replace(/never\.?$/, App.state.lastBackup + '.') : m;
  }

  /* C.settingRow with a data-key and an optional drop-in panel under the row. */
  function srow(key, p, panel) {
    let html = C.settingRow(p).replace('<div class="item srow', '<div data-key="' + C.esc(key) + '" class="item srow');
    if (panel) html = html.replace(/<\/div>$/, panel + '</div>');
    return html;
  }
  function panel(id, inner) {
    return '<div class="disc sx-panel" id="' + id + '" hidden>' + (inner || '') + '</div>';
  }
  function changeBtn(id, hidden) {
    return C.button({ label: 'Change', kind: 'text', small: true, attrs: { 'data-sx-open': id, 'aria-expanded': 'false', 'aria-controls': id, hidden: !!hidden } });
  }

  const STYLE = '<style>' +
    '.screen-settings { flex: 1; display: flex; flex-direction: column; }' +
    '.col.is-entering > .screen-settings { animation: none; }' +
    '.col.is-entering > .screen-settings > * { animation: rise .55s var(--ease-rise) backwards; }' +
    '.col.is-entering > .screen-settings > :nth-child(2) { animation-delay: .06s; }' +
    '.col.is-entering > .screen-settings > :nth-child(3) { animation-delay: .16s; }' +
    '.col.is-entering > .screen-settings > :nth-child(4) { animation-delay: .28s; }' +
    '.col.is-entering > .screen-settings > :nth-child(n+5) { animation-delay: .42s; }' +
    '.screen-settings .page-header { margin-bottom: var(--s-48); }' +
    '.screen-settings .page-header + .section { margin-top: 0; }' +
    '.screen-settings .section-head { padding-bottom: var(--s-12); }' +
    '.screen-settings .sx-hero .row-title { font-size: var(--t-body); font-weight: 600; }' +
    '.screen-settings .sx-panel { gap: var(--s-12); }' +
    '.screen-settings .sx-panel .btn-group { margin-top: var(--s-12); }' +
    '.screen-settings .sx-ink { color: var(--ink); }' +
    '.screen-settings .sx-ink:hover { color: var(--ink-2); }' +
    '.screen-settings .sx-offline { margin-top: var(--s-48); }' +
    '.screen-settings .footer { margin-top: var(--s-64); }' +
    '.screen-settings .sx-dialog { width: 360px; max-width: calc(100vw - var(--s-32)); padding: var(--s-24); margin: auto;' +
      ' background: var(--surface); color: var(--ink); border: 1px solid var(--hairline); border-radius: var(--r-card); box-shadow: var(--shadow-pop); }' +
    '.screen-settings .sx-dialog[open] { animation: drop .28s ease-out; }' +
    '.screen-settings .sx-dialog::backdrop { background: var(--scrim); }' +
    '.screen-settings .sx-dialog .t-lead { margin-top: var(--s-8); }' +
    '.screen-settings .sx-dialog .btn-group { margin-top: var(--s-24); justify-content: flex-end; gap: var(--s-12); }' +
    '</style>';

  window.SCREENS['settings'] = {
    title: 'Settings',

    render(data, params) {
      const s = data.settings;
      const offline = params[0] === 'offline' || (typeof navigator !== 'undefined' && navigator.onLine === false);
      const lockOn = st('lockOn', true);
      const lockAfter = st('lockAfter', s.lockAfter);
      const remind = st('remind', true);
      const tz = st('tz', TZ_MAC);

      const header = C.pageHeader({ title: 'Settings' });

      /* Your data: the one hero line */
      const yourData = C.section({
        eyebrow: 'Your data', cls: 'sx-hero',
        content: C.list([C.row({ lead: C.shield(), title: s.storage.title, meta: s.storage.meta, href: '#/documents' })], { accordion: false }),
      });

      /* Backup */
      const backup = C.section({
        eyebrow: 'Backup',
        content: C.list([
          srow('backup', { title: s.backup.title, meta: backupMeta(data), wide: true,
            control: C.button({ label: 'Back up now', kind: 'primary', attrs: { 'data-sx': 'backup' } }) }),
          srow('restore', { title: 'Restore from a backup', meta: 'Replaces what is on this Mac with a backup you saved.',
            control: C.button({ label: 'Choose a file', kind: 'text', small: true, attrs: { 'data-sx': 'restore', 'aria-controls': 'sx-restore' } }) +
              '<input type="file" hidden data-sx-file accept=".duly,application/octet-stream" aria-label="Choose a backup file">' },
            panel('sx-restore')),
        ], { accordion: false }),
      });

      /* Lock */
      const lock = C.section({
        eyebrow: 'Lock',
        content: C.list([
          srow('lock', { title: 'Lock Duly when you step away', meta: lockOn ? 'After ' + lockAfter : 'Off',
            control: changeBtn('sx-lock', !lockOn) + C.toggle({ key: 'lockOn', on: lockOn, label: 'Lock Duly when you step away' }) },
            panel('sx-lock', C.segment({ key: 'lockAfter', label: 'Lock after', selected: lockAfter,
              options: s.lockOptions.map((o) => ({ value: o, label: o })) }))),
          srow('touchId', { title: 'Unlock with Touch ID', meta: 'Instead of typing your Mac password.',
            control: C.toggle({ key: 'touchId', on: st('touchId', false), label: 'Unlock with Touch ID' }) }),
        ], { accordion: false }),
      });

      /* Notifications */
      const notes = C.section({
        eyebrow: 'Notifications',
        content: C.list([
          srow('remind', { title: 'Remind me before dates', meta: remind ? s.remind : 'Off',
            control: C.toggle({ key: 'remind', on: remind, label: 'Remind me before dates' }) }),
          srow('statusUpdates', { title: 'Updates for my status', meta: 'Rule changes that touch your dates.',
            control: C.toggle({ key: 'statusUpdates', on: st('statusUpdates', true), label: 'Updates for my status' }) }),
          srow('news', { title: 'News', meta: 'Court cases and other news for F-1 students.',
            control: C.toggle({ key: 'news', on: st('news', false), label: 'News' }) }),
        ], { accordion: false }),
      });

      /* Dates */
      const dates = C.section({
        eyebrow: 'Dates',
        content: C.list([
          srow('tz', { title: 'Time zone', meta: tzMeta(tz), control: changeBtn('sx-tz') },
            panel('sx-tz', '<p>Duly counts every date in this time zone.</p>' +
              C.segment({ key: 'tz', label: 'Time zone', selected: tz, options: TZ_OPTIONS.map((o) => ({ value: o, label: o })) }))),
        ], { accordion: false }),
      });

      /* Appearance */
      const look = C.section({
        eyebrow: 'Appearance',
        content: C.list([
          srow('theme', { title: 'Theme', meta: 'System follows your Mac.', wide: true,
            control: C.segment({ key: 'theme', label: 'Theme', selected: App.state.theme || s.theme,
              options: [{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }] }) }),
        ], { accordion: false }),
      });

      /* Export */
      const exp = C.section({
        eyebrow: 'Export',
        content: C.list([
          srow('export', { title: 'Export your records', meta: 'A PDF summary and your documents, in one folder.',
            control: C.button({ label: 'Export', kind: 'pill', attrs: { 'data-sx': 'export' } }) }),
        ], { accordion: false }),
      });

      /* Delete */
      const del = C.section({
        eyebrow: 'Delete',
        content: C.list([
          srow('delete', { title: 'Delete everything', meta: s.deleteMeta,
            control: C.button({ label: 'Delete', kind: 'text', cls: 'sx-ink', attrs: { 'data-sx': 'delete', 'aria-haspopup': 'dialog' } }) }),
        ], { accordion: false }),
      });

      const dialog = '<dialog class="sx-dialog" aria-labelledby="sx-del-title">' +
        '<h2 class="t-sub" id="sx-del-title">Delete everything on this Mac?</h2>' +
        '<p class="t-lead">This can\'t be undone.</p>' +
        '<div class="btn-group">' +
        C.button({ label: 'Delete everything', kind: 'pill', attrs: { 'data-sx': 'delete-yes' } }) +
        C.button({ label: 'Keep my records', kind: 'primary', attrs: { 'data-sx': 'delete-no', autofocus: true } }) +
        '</div></dialog>';

      const offlineLine = offline ? '<p class="t-meta sx-offline">' + C.esc(data.checked.offline) + '</p>' : '';
      const footer = C.footer(offline ? data.version : data.version + ' · ' + data.checked.rules);

      return '<div class="screen-settings">' + STYLE + header + yourData + backup + lock + notes + dates + look + exp + del +
        offlineLine + footer + dialog + '</div>';
    },

    mount(root, data) {
      const s = data.settings;
      const item = (k) => root.querySelector('.item[data-key="' + k + '"]');
      const setMeta = (k, text) => { const m = item(k) && item(k).querySelector('.row-meta'); if (m) m.textContent = text; };

      function setPanel(it, open) {
        if (!it) return;
        const p = it.querySelector('.sx-panel');
        if (!p) return;
        p.hidden = !open;
        it.classList.toggle('is-open', open);
        const b = it.querySelector('[data-sx-open]');
        if (b) b.setAttribute('aria-expanded', open ? 'true' : 'false');
      }

      /* Restore: pick a file, read it on this device, then one confirm. */
      function restoreFound(name) {
        const p = root.querySelector('#sx-restore');
        const it = item('restore');
        p.innerHTML = '<p class="t-meta" role="status">Reading on this device</p>';
        setPanel(it, true);
        setTimeout(() => {
          if (!document.contains(p)) return;
          p.innerHTML = '<p class="t-meta" role="status">Read on this Mac. Nothing left it.</p>' +
            C.found([['File', name || 'Duly backup'], ['Name', data.student.name], ['Made on', 'Sep 12, 2026'], ['Documents', String(data.documents.count)]]) +
            C.btnGroup([
              C.button({ label: 'Restore this backup', kind: 'pill', attrs: { 'data-sx': 'restore-yes' } }),
              C.button({ label: 'Cancel', kind: 'back', attrs: { 'data-sx': 'restore-no' } }),
            ]);
          const first = p.querySelector('[data-sx="restore-yes"]');
          if (first) first.focus();
        }, 900);
      }
      function closeRestore() {
        const p = root.querySelector('#sx-restore');
        setPanel(item('restore'), false);
        if (p) p.innerHTML = '';
        const input = root.querySelector('[data-sx-file]');
        if (input) input.value = '';
      }

      function busy(btn, label, ms, done) {
        const was = btn.textContent;
        btn.disabled = true; btn.textContent = label;
        setTimeout(() => {
          if (!document.contains(btn)) return;
          btn.disabled = false; btn.textContent = was;
          done();
        }, ms);
      }

      const dialog = root.querySelector('.sx-dialog');

      root.addEventListener('click', (e) => {
        const opener = e.target.closest('[data-sx-open]');
        if (opener) {
          const it = opener.closest('.item');
          setPanel(it, it.querySelector('.sx-panel').hidden);
          return;
        }
        const b = e.target.closest('[data-sx]');
        if (!b) return;
        const act = b.dataset.sx;
        if (act === 'backup') {
          busy(b, 'Backing up', 1100, () => {
            App.state.lastBackup = 'today';
            setMeta('backup', backupMeta(data));
            App.toast('Backup saved to your Downloads folder');
          });
        } else if (act === 'restore') {
          const input = root.querySelector('[data-sx-file]');
          if (input) input.click();
        } else if (act === 'restore-yes') {
          closeRestore();
          App.toast('Your records are restored');
        } else if (act === 'restore-no') {
          closeRestore();
          const c = root.querySelector('[data-sx="restore"]'); if (c) c.focus();
        } else if (act === 'export') {
          busy(b, 'Preparing', 1100, () => App.toast('Your records are in a folder in Downloads'));
        } else if (act === 'delete') {
          if (dialog && dialog.showModal) dialog.showModal();
        } else if (act === 'delete-no') {
          dialog.close();
        } else if (act === 'delete-yes') {
          dialog.close();
          App.toast('Everything on this Mac is deleted');
          App.go('welcome');
        }
      });

      const fileInput = root.querySelector('[data-sx-file]');
      if (fileInput) {
        fileInput.addEventListener('change', () => {
          const f = fileInput.files && fileInput.files[0];
          if (f) restoreFound(f.name);
        });
      }
      if (dialog) {
        dialog.addEventListener('close', () => {
          const t = root.querySelector('[data-sx="delete"]'); if (t && document.contains(t)) t.focus();
        });
        /* A click on the scrim keeps the records. */
        dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
      }

      /* Toggles and chip choices are wired in app.js; this keeps the meta lines true. */
      if (offChange) offChange();
      const onChange = (e) => {
        if (!document.contains(root)) { if (offChange) offChange(); return; }
        const d = e.detail;
        if (d.kind === 'toggle' && d.key === 'lockOn') {
          setMeta('lock', d.value ? 'After ' + st('lockAfter', s.lockAfter) : 'Off');
          const c = item('lock').querySelector('[data-sx-open]');
          if (c) c.hidden = !d.value;
          if (!d.value) setPanel(item('lock'), false);
        } else if (d.kind === 'toggle' && d.key === 'remind') {
          setMeta('remind', d.value ? s.remind : 'Off');
        } else if (d.kind === 'choice' && d.key === 'lockAfter') {
          setMeta('lock', 'After ' + d.value);
          setTimeout(() => setPanel(item('lock'), false), 200);
        } else if (d.kind === 'choice' && d.key === 'tz') {
          setMeta('tz', tzMeta(d.value));
          setTimeout(() => setPanel(item('tz'), false), 200);
        }
      };
      document.addEventListener('duly:change', onChange);
      offChange = () => { document.removeEventListener('duly:change', onChange); offChange = null; };
    },
  };
})();
