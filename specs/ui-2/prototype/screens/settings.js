/* Settings. Hairline rows: title and one meta line on the left, the control on the right.
   Four groups (Your data, Privacy, Notifications, General), then Delete everything
   as a quiet row with no heading of its own. Every row action is the same 36px pill;
   the page has no filled primary (only the delete dialog carries one).
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
    return App.state.lastBackup ? m.replace(/Last backup: .*$/, 'Last backup: ' + App.state.lastBackup + '.') : m;
  }

  /* C.settingRow with a data-key and an optional drop-in panel under the row. */
  function srow(key, p, panel) {
    let html = C.settingRow(p).replace('<div class="item srow', '<div data-key="' + C.esc(key) + '" class="item srow');
    if (panel) html = html.replace(/<\/div>$/, panel + '</div>');
    return html;
  }
  function panel(id, inner, open) {
    return '<div class="disc sx-panel" id="' + id + '"' + (open ? '' : ' hidden') + '>' + (inner || '') + '</div>';
  }
  function pill(label, attrs) {
    return C.button({ label: label, kind: 'pill', attrs: attrs });
  }

  const STYLE = '<style>' +
    '.screen-settings { flex: 1; display: flex; flex-direction: column; }' +
    '.col.is-entering > .screen-settings { animation: none; }' +
    '.col.is-entering > .screen-settings > * { animation: rise .55s var(--ease-rise) backwards; }' +
    '.col.is-entering > .screen-settings > :nth-child(2) { animation-delay: .06s; }' +
    '.col.is-entering > .screen-settings > :nth-child(3) { animation-delay: .16s; }' +
    '.col.is-entering > .screen-settings > :nth-child(4) { animation-delay: .28s; }' +
    '.col.is-entering > .screen-settings > :nth-child(n+5) { animation-delay: .42s; }' +
    '.screen-settings .sx-panel { gap: var(--s-12); }' +
    /* the panel already has a 12 gap, so 12 more makes the usual 24 above the buttons */
    '.screen-settings .sx-panel .btn-row { margin-top: var(--s-12); }' +
    '.screen-settings .sx-offline { margin-top: var(--s-48); }' +
    '.screen-settings .sx-dialog { width: 360px; max-width: calc(100vw - var(--s-32)); padding: var(--s-24); margin: auto;' +
      ' background: var(--surface); color: var(--ink); border: 1px solid var(--hairline); border-radius: var(--r-card); box-shadow: var(--shadow-pop); }' +
    '.screen-settings .sx-dialog[open] { animation: drop .28s ease-out; }' +
    '.screen-settings .sx-dialog::backdrop { background: var(--scrim); }' +
    '.screen-settings .sx-dialog .t-lead { margin-top: var(--s-8); }' +
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

      /* Your data: where it lives, back up, restore, export */
      const yourData = C.section({
        eyebrow: 'Your data',
        content: C.list([
          srow('storage', { title: s.storage.title, meta: s.storage.meta }),
          srow('backup', { title: s.backup.title, meta: backupMeta(data),
            control: pill('Back up now', { 'data-sx': 'backup' }) }),
          srow('restore', { title: 'Restore from a backup', meta: 'Replaces what is on this Mac with a backup you saved.',
            control: pill('Choose a file', { 'data-sx': 'restore', 'aria-controls': 'sx-restore' }) +
              '<input type="file" hidden data-sx-file accept=".duly,application/octet-stream" aria-label="Choose a backup file">' },
            panel('sx-restore')),
          srow('export', { title: 'Export your records', meta: 'A PDF summary and your documents, in one folder.',
            control: pill('Export', { 'data-sx': 'export' }) }),
        ], { accordion: false }),
      });

      /* Privacy: one control per row. The lock-after chips drop in under the row while the lock is on. */
      const privacy = C.section({
        eyebrow: 'Privacy',
        content: C.list([
          srow('lock', { title: 'Lock Duly when you step away', meta: lockOn ? 'After ' + lockAfter : 'Off',
            control: C.toggle({ key: 'lockOn', on: lockOn, label: 'Lock Duly when you step away' }) },
            panel('sx-lock', C.segment({ key: 'lockAfter', label: 'Lock after', selected: lockAfter,
              options: s.lockOptions.map((o) => ({ value: o, label: o })) }), lockOn)),
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

      /* General: time zone and theme */
      const general = C.section({
        eyebrow: 'General',
        content: C.list([
          srow('tz', { title: 'Time zone', meta: tzMeta(tz),
            control: pill('Change', { 'data-sx-open': 'sx-tz', 'aria-expanded': 'false', 'aria-controls': 'sx-tz', 'aria-label': 'Change time zone' }) },
            panel('sx-tz', '<p>Duly counts every date in this time zone.</p>' +
              C.segment({ key: 'tz', label: 'Time zone', selected: tz, options: TZ_OPTIONS.map((o) => ({ value: o, label: o })) }))),
          srow('theme', { title: 'Theme', meta: 'System follows your Mac.', wide: true,
            control: C.segment({ key: 'theme', label: 'Theme', selected: App.state.theme || s.theme,
              options: [{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }] }) }),
        ], { accordion: false }),
      });

      /* Delete everything: last, a quiet row with no heading of its own */
      const del = C.section({
        content: C.list([
          srow('delete', { title: 'Delete everything', meta: s.deleteMeta,
            control: pill('Delete', { 'data-sx': 'delete', 'aria-haspopup': 'dialog' }) }),
        ], { accordion: false, label: 'Delete everything' }),
      });

      const dialog = '<dialog class="sx-dialog" aria-labelledby="sx-del-title">' +
        '<h2 class="t-sub" id="sx-del-title">Delete everything on this Mac?</h2>' +
        '<p class="t-lead">This can\'t be undone.</p>' +
        /* The one placement rule: the other choice on the left, the primary
           (keep, the safe answer) on the right, in a right-aligned row. */
        C.buttonRow({
          back: C.button({ label: 'Delete everything', kind: 'pill', attrs: { 'data-sx': 'delete-yes' } }),
          primary: C.button({ label: 'Keep my records', kind: 'primary', attrs: { 'data-sx': 'delete-no', autofocus: true } }),
        }) +
        '</dialog>';

      const offlineLine = offline ? '<p class="t-meta sx-offline">' + C.esc(data.checked.offline) + '</p>' : '';
      const footer = C.footer(offline ? data.version : data.version + ' · ' + data.checked.rules);

      return '<div class="screen-settings">' + STYLE + header + yourData + privacy + notes + general + del +
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
            C.found([['File', name || 'Duly backup'], ['Name', data.student.name], ['From', s.restoreFrom], ['Documents', String(data.documents.count)]]) +
            C.buttonRow({
              back: C.button({ label: 'Cancel', kind: 'back', attrs: { 'data-sx': 'restore-no' } }),
              primary: C.button({ label: 'Restore this backup', kind: 'pill', attrs: { 'data-sx': 'restore-yes' } }),
            });
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
      /* The lock-after chips show whenever the lock is on. */
      setPanel(item('lock'), st('lockOn', true));

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
          setPanel(item('lock'), !!d.value);
        } else if (d.kind === 'toggle' && d.key === 'remind') {
          setMeta('remind', d.value ? s.remind : 'Off');
        } else if (d.kind === 'choice' && d.key === 'lockAfter') {
          setMeta('lock', 'After ' + d.value);
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
