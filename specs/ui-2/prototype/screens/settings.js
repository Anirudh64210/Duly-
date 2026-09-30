/* Settings. Three groups, each three or four hairline rows: the title (and a short
   value, such as a date, when there is one) on the left, the control on the right.
   Round 3: no explaining lines. What a row does sits behind an ⓘ by its title.
     Reminders and updates   remind before dates, rule changes, news articles
     This Mac                lock, Touch ID, time zone, theme
     Your records            back up, restore, export, delete everything (last on the page)
   Where the records live is the ⓘ by the page title, not a row of its own.
   Every row action is the same pill; the page has no filled primary (only the delete
   dialog carries one). Every change happens in place: no redraw, no scroll jump.
   Routes:
     #/settings           the sample settings
     #/settings/offline   shows the offline line at the bottom
   Shared state it reads and writes (App.state):
     remind, statusUpdates, news, lockOn, touchId   toggles (app.js writes them)
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
  function tzMeta(tz) { return tz; }
  /* "Last backup Sep 12, 2026", or "Last backup today" once one is made here. */
  function backupMeta(data) {
    const m = String(data.settings.backup.meta || '').match(/Last backup: (.*?)\.?$/);
    const when = App.state.lastBackup || (m ? m[1] : '');
    return when ? 'Last backup ' + when : '';
  }
  /* While the lock is on, the chosen chip says how long; the row says only Off. */
  function lockMeta(on) { return on ? '' : 'Off'; }

  /* C.settingRow with a data-key, an optional ⓘ by the title and an optional
     drop-in panel under the row. */
  function srow(key, p, panel) {
    let html = C.settingRow(p).replace('<div class="item srow', '<div data-key="' + C.esc(key) + '" class="item srow');
    if (p.info) {
      const t = '<span class="row-title">' + C.esc(p.title) + '</span>';
      html = html.replace(t, '<span class="row-title">' + C.esc(p.title) + C.info(p.info) + '</span>');
    }
    if (panel) html = html.replace(/<\/div>$/, panel + '</div>');
    return html;
  }
  function panel(id, inner, open) {
    return '<div class="disc sx-panel" id="' + id + '"' + (open ? '' : ' hidden') + '>' + (inner || '') + '</div>';
  }
  function pill(label, attrs) {
    return C.button({ label: label, kind: 'pill', attrs: attrs });
  }
  function group(eyebrow, rows) {
    return C.section({ eyebrow: eyebrow, content: C.list(rows, { accordion: false, label: eyebrow }) });
  }

  /* Layout only. Type sizes come from system.css. */
  const STYLE = '<style>' +
    '.screen-settings { flex: 1; display: flex; flex-direction: column; min-width: 0; }' +
    '.col.is-entering > .screen-settings { animation: none; }' +
    '.col.is-entering > .screen-settings > * { animation: rise .55s var(--ease-rise) backwards; }' +
    '.col.is-entering > .screen-settings > :nth-child(3) { animation-delay: .06s; }' +
    '.col.is-entering > .screen-settings > :nth-child(4) { animation-delay: .16s; }' +
    '.col.is-entering > .screen-settings > :nth-child(n+5) { animation-delay: .28s; }' +
    '.screen-settings .sx-panel { gap: var(--s-12); }' +
    /* the panel already has a 12 gap, so 12 more makes the usual 24 above the buttons */
    '.screen-settings .sx-panel .btn-row { margin-top: var(--s-12); }' +
    '.screen-settings .sx-panel .chips { flex-wrap: wrap; }' +
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
      const remind = st('remind', true);
      const rulesOn = st('statusUpdates', true);
      const lockOn = st('lockOn', true);
      const lockAfter = st('lockAfter', s.lockAfter);
      const tz = st('tz', TZ_MAC);

      const header = C.pageHeader({
        title: 'Settings',
        info: 'Your records stay encrypted on this Mac.',
      });

      /* 1. Reminders and updates: what reaches the student, and when. */
      const reminders = group('Reminders and updates', [
        srow('remind', { title: 'Remind me before dates', meta: remind ? s.remind : 'Off',
          control: C.toggle({ key: 'remind', on: remind, label: 'Remind me before dates' }) }),
        srow('statusUpdates', { title: 'Rule changes',
          info: 'A note when a rule behind your dates changes. Your dates update either way.',
          control: C.toggle({ key: 'statusUpdates', on: rulesOn, label: 'Rule changes' }) }),
        srow('news', { title: 'News articles',
          info: 'New articles about the rules for your status.',
          control: C.toggle({ key: 'news', on: st('news', true), label: 'News articles' }) }),
      ]);

      /* 2. This Mac: lock, unlock, time zone, look. The lock-after chips drop in under
         the lock row while the lock is on; the time zone chips open from Change. */
      const thisMac = group('This Mac', [
        srow('lock', { title: 'Lock when you step away', meta: lockMeta(lockOn),
          control: C.toggle({ key: 'lockOn', on: lockOn, label: 'Lock when you step away' }) },
          panel('sx-lock', C.segment({ key: 'lockAfter', label: 'Lock after', selected: lockAfter,
            options: s.lockOptions.map((o) => ({ value: o, label: o })) }), lockOn)),
        srow('touchId', { title: 'Unlock with Touch ID',
          control: C.toggle({ key: 'touchId', on: st('touchId', false), label: 'Unlock with Touch ID' }) }),
        srow('tz', { title: 'Time zone', meta: tzMeta(tz), info: 'Every date is counted in this time zone. It starts as the one set on this Mac.',
          control: pill('Change', { 'data-sx-open': 'sx-tz', 'aria-expanded': 'false', 'aria-controls': 'sx-tz', 'aria-label': 'Change time zone' }) },
          panel('sx-tz',
            C.segment({ key: 'tz', label: 'Time zone', selected: tz, options: TZ_OPTIONS.map((o) => ({ value: o, label: o })) }))),
        srow('theme', { title: 'Theme', wide: true,
          control: C.segment({ key: 'theme', label: 'Theme', selected: App.state.theme || s.theme,
            options: [{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }] }) }),
      ]);

      /* 3. Your records: copies in and out, then delete, last on the page. */
      const records = group('Your records', [
        srow('backup', { title: s.backup.title, meta: backupMeta(data), info: 'An encrypted copy you keep.',
          control: pill('Back up now', { 'data-sx': 'backup' }) }),
        srow('restore', { title: 'Restore from a backup', info: 'Replaces what is on this Mac with a backup you saved.',
          control: pill('Choose a file', { 'data-sx': 'restore', 'aria-controls': 'sx-restore' }) +
            '<input type="file" hidden data-sx-file accept=".duly,application/octet-stream" aria-label="Choose a backup file">' },
          panel('sx-restore')),
        srow('export', { title: 'Export your records', info: 'A PDF summary and your ' + data.documents.count + ' documents, in one folder.',
          control: pill('Export', { 'data-sx': 'export' }) }),
        srow('delete', { title: 'Delete everything', info: s.deleteMeta,
          control: pill('Delete', { 'data-sx': 'delete', 'aria-haspopup': 'dialog' }) }),
      ]);

      const dialog = '<dialog class="sx-dialog" aria-labelledby="sx-del-title">' +
        '<h2 class="t-medium" id="sx-del-title">Delete everything on this Mac?</h2>' +
        '<p class="t-lead">This can\'t be undone. Backups you saved stay where you put them.</p>' +
        /* The one placement rule: the other choice on the left, the primary
           (keep, the safe answer) on the right, in a right-aligned row. */
        C.buttonRow({
          back: C.button({ label: 'Delete everything', kind: 'pill', attrs: { 'data-sx': 'delete-yes' } }),
          primary: C.button({ label: 'Keep my records', kind: 'primary', attrs: { 'data-sx': 'delete-no', autofocus: true } }),
        }) +
        '</dialog>';

      const offlineLine = offline ? '<p class="t-meta sx-offline">' + C.esc(data.checked.offline) + '</p>' : '';
      const footer = C.footer(offline ? data.version : data.version + ' · ' + data.checked.rules);

      return '<div class="screen-settings">' + STYLE + header + reminders + thisMac + records +
        offlineLine + footer + dialog + '</div>';
    },

    mount(root, data) {
      const s = data.settings;
      const item = (k) => root.querySelector('.item[data-key="' + k + '"]');
      /* Sets a row's short value in place; an empty value removes the line. */
      const setMeta = (k, text) => {
        const it = item(k);
        const box = it && it.querySelector('.row-text');
        if (!box) return;
        let m = box.querySelector('.row-meta');
        if (!text) { if (m) m.remove(); return; }
        if (!m) { m = document.createElement('span'); m.className = 'row-meta'; box.appendChild(m); }
        m.textContent = text;
      };

      function setPanel(it, open) {
        if (!it) return;
        const p = it.querySelector('.sx-panel');
        if (!p) return;
        p.hidden = !open;
        it.classList.toggle('is-open', open);
        const b = it.querySelector('[data-sx-open]');
        if (b) b.setAttribute('aria-expanded', open ? 'true' : 'false');
      }

      /* Restore: pick a file, read it on this Mac, then one confirm. */
      function restoreFound(name) {
        const p = root.querySelector('#sx-restore');
        const it = item('restore');
        if (!p) return;
        p.innerHTML = '<p class="t-meta" role="status">Reading on this Mac</p>';
        setPanel(it, true);
        setTimeout(() => {
          if (!document.contains(p)) return;
          p.innerHTML = C.found([['File', name || 'Backup file'], ['Name', data.student.name], ['From', s.restoreFrom.replace(/^From /, '')], ['Documents', String(data.documents.count)]]) +
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
        if (!b || b.disabled) return;
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
          const c = root.querySelector('[data-sx="restore"]'); if (c) c.focus();
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
          dialog.dataset.leaving = '1';
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
          if (dialog.dataset.leaving) return;
          const t = root.querySelector('[data-sx="delete"]'); if (t && document.contains(t)) t.focus();
        });
        /* A click on the scrim keeps the records. */
        dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
      }

      /* Toggles and chip choices are wired in app.js; this keeps the meta lines true, in place. */
      if (offChange) offChange();
      const onChange = (e) => {
        if (!document.contains(root)) { if (offChange) offChange(); return; }
        const d = e.detail;
        if (d.kind === 'toggle' && d.key === 'lockOn') {
          setMeta('lock', lockMeta(!!d.value));
          setPanel(item('lock'), !!d.value);
        } else if (d.kind === 'toggle' && d.key === 'remind') {
          setMeta('remind', d.value ? s.remind : 'Off');
        } else if (d.kind === 'choice' && d.key === 'tz') {
          setMeta('tz', tzMeta(d.value));
          setTimeout(() => {
            setPanel(item('tz'), false);
            const c = root.querySelector('[data-sx-open="sx-tz"]'); if (c) c.focus();
          }, 200);
        }
      };
      document.addEventListener('duly:change', onChange);
      offChange = () => { document.removeEventListener('duly:change', onChange); offChange = null; };
    },
  };
})();
