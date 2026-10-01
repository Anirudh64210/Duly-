/* Settings. Four groups of hairline rows: the title (and a short value, such as a
   date, when there is one) on the left, the control on the right. What a row does
   sits behind an ⓘ by its title; nothing explains itself in a line of its own.
     Reminders     on or off (free), time of day, email, phone, calendar
     Updates       rule changes, news articles
     Devices       where you are signed in, lock, unlock, time zone, theme
     Your records  back up, restore, export, delete everything (last on the page)
   One quiet privacy line closes the page. Duly is web, phone and desktop, one
   account: copy says "your device" or "this device", never a platform.
   Every row action is the same pill; the page has no filled primary (only the
   delete dialog carries one). Every change happens in place: no redraw, no
   scroll jump.
   Routes:
     #/settings           the sample settings
     #/settings/offline   shows the offline line at the bottom
   Shared state it reads and writes (App.state):
     remind, remind:email, remind:phone, statusUpdates, news, lockOn, touchId
                                     toggles (app.js writes them)
     remind:calendar                 true once the dates were added (App.addToCalendar)
     remindTime, lockAfter, tz, theme
                                     chip choices (app.js writes them; theme applies itself)
     signedOut                       device titles signed out here
     lastBackup                      'today' once a backup was made */
(function () {
  'use strict';

  const TZ_HERE = 'New York';
  const TZ_OPTIONS = ['New York', 'Chicago', 'Denver', 'Phoenix', 'Los Angeles', 'Anchorage', 'Honolulu'];
  const TIME_OPTIONS = ['7:00 AM', '8:00 AM', '9:00 AM', '12:00 PM', '6:00 PM'];
  /* The rows that only matter while reminders are on. */
  const REMIND_SUB = ['remindTime', 'remind:email', 'remind:phone', 'remind:calendar'];
  let offChange = null;

  function st(key, fallback) {
    const v = App.state[key];
    return v == null ? fallback : v;
  }
  function rem(data) { return data.reminders || {}; }
  function channel(data, key) {
    return (rem(data).channels || []).find((c) => c.key === key) || {};
  }
  /* "8:00 AM", from "At 8:00 AM, your time" */
  function defaultTime(data) {
    const m = String(rem(data).time || '').match(/\d{1,2}:\d{2} [AP]M/);
    return m ? m[0] : '8:00 AM';
  }
  function timeMeta(t) { return t + ', your time'; }
  function remindMeta(data, on) { return on ? String(rem(data).when || '').replace(/\.$/, '') : 'Off'; }
  function calendarMeta(data) {
    /* App.calendarEvents(): the dates the file holds, worked out from the record. */
    const n = App.calendarEvents ? App.calendarEvents().length : (rem(data).dates || []).length;
    return st('remind:calendar', false) ? 'Added today' : n + (n === 1 ? ' date' : ' dates') + ', added once';
  }
  /* "Last backup Sep 12, 2026", or "Last backup today" once one is made here. */
  function backupMeta(data) {
    const m = String(data.settings.backup.meta || '').match(/Last backup: (.*?)\.?$/);
    const when = App.state.lastBackup || (m ? m[1] : '');
    return when ? 'Last backup ' + when : '';
  }
  /* While the lock is on, the chosen chip says how long; the row says only Off. */
  function lockMeta(on) { return on ? '' : 'Off'; }

  function devices(data) {
    const out = App.state.signedOut || [];
    return (data.settings.devices || []).filter((d) => out.indexOf(d.title) === -1);
  }
  /* "This phone, MacBook and Web" */
  function devicesMeta(data) {
    const t = devices(data).map((d) => d.title);
    if (t.length < 2) return t.join('');
    return t.slice(0, -1).join(', ') + ' and ' + t[t.length - 1];
  }
  function deviceRows(data) {
    return C.list(devices(data).map((d, i) => srow('dev:' + d.title, { title: d.title, meta: d.meta,
      control: i === 0 ? '' : pill('Sign out', { 'data-sx': 'signout', 'data-dev': d.title, 'aria-label': 'Sign out of ' + d.title }) })),
    { accordion: false, label: 'Signed in' });
  }

  /* C.settingRow with a data-key, an optional mark and ⓘ by the title and an
     optional drop-in panel under the row. */
  function srow(key, p, panel) {
    let html = C.settingRow(p).replace('<div class="item srow', '<div data-key="' + C.esc(key) + '" class="item srow');
    if (p.info || p.mark) {
      const t = '<span class="row-title">' + C.esc(p.title) + '</span>';
      const mark = p.mark ? ' <span class="marks"><span class="mark">' + C.esc(p.mark) + '</span></span>' : '';
      html = html.replace(t, '<span class="row-title">' + C.esc(p.title) + mark + (p.info ? C.info(p.info) : '') + '</span>');
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
  function opener(id, label) {
    return pill('Change', { 'data-sx-open': id, 'aria-expanded': 'false', 'aria-controls': id, 'aria-label': label });
  }
  function group(eyebrow, rows, info) {
    return C.section({ eyebrow: eyebrow, info: info, content: C.list(rows, { accordion: false, label: eyebrow }) });
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
    '.screen-settings .sx-privacy { margin-top: var(--s-32); }' +
    '.screen-settings .sx-offline { margin-top: var(--s-16); }' +
    '.screen-settings .sx-dialog { width: 360px; max-width: calc(100vw - var(--s-32)); padding: var(--s-24); margin: auto;' +
      ' background: var(--surface); color: var(--ink); border: 1px solid var(--hairline); border-radius: var(--r-card); box-shadow: var(--shadow-pop); }' +
    '.screen-settings .sx-dialog[open] { animation: drop .28s ease-out; }' +
    '.screen-settings .sx-dialog::backdrop { background: var(--scrim); }' +
    '.screen-settings .sx-dialog .t-lead { margin-top: var(--s-8); }' +
    '.screen-settings .sx-dialog { box-sizing: border-box; overflow: visible; }' +
    '.screen-settings .sx-dialog-actions { display: flex; justify-content: flex-end; align-items: center; gap: var(--s-12); margin-top: var(--s-24); }' +
    '.screen-settings .sx-dialog-actions .btn { flex: 0 0 auto; height: 44px; padding: 0 var(--s-24); white-space: nowrap; }' +
    '</style>';

  window.SCREENS['settings'] = {
    title: 'Settings',

    render(data, params) {
      const s = data.settings;
      const r = rem(data);
      const offline = params[0] === 'offline' || (typeof navigator !== 'undefined' && navigator.onLine === false);
      const remind = st('remind', r.on !== false);
      const time = st('remindTime', defaultTime(data));
      const lockOn = st('lockOn', true);
      const lockAfter = st('lockAfter', s.lockAfter);
      const tz = st('tz', TZ_HERE);
      const email = channel(data, 'email');
      const phone = channel(data, 'phone');
      const cal = channel(data, 'calendar');
      const sub = (row) => remind ? row : row.replace('<div data-key=', '<div hidden data-key=');

      const header = C.pageHeader({ title: 'Settings' });

      /* 1. Reminders: free, on by default, at the student's morning, on the
         channels they pick. The four rows under the switch hide while it is off. */
      const reminders = group('Reminders', [
        srow('remind', { title: 'Remind me before dates', mark: 'Free', meta: remindMeta(data, remind),
          control: C.toggle({ key: 'remind', on: remind, label: 'Remind me before dates' }) }),
        sub(srow('remindTime', { title: 'Time of day', meta: timeMeta(time),
          control: opener('sx-time', 'Change time of day') },
          panel('sx-time', C.segment({ key: 'remindTime', label: 'Time of day', selected: time,
            options: TIME_OPTIONS.map((o) => ({ value: o, label: o })) })))),
        sub(srow('remind:email', { title: email.label || 'Email',
          info: 'An email carries only the date and a title, such as "' + (r.example || 'Nov 15: STEM OPT window opens') + '".',
          control: C.toggle({ key: 'remind:email', on: st('remind:email', !!email.on), label: 'Email reminders' }) })),
        sub(srow('remind:phone', { title: phone.label || 'Phone notification',
          control: C.toggle({ key: 'remind:phone', on: st('remind:phone', !!phone.on), label: 'Phone notifications' }) })),
        sub(srow('remind:calendar', { title: cal.label || 'Calendar', meta: calendarMeta(data),
          control: pill(cal.action || 'Add to calendar', { 'data-calendar': true }) })),
      ]);

      /* 2. Updates: notes about the rules and the news for the status. */
      const updates = group('Updates', [
        srow('statusUpdates', { title: 'Rule changes',
          control: C.toggle({ key: 'statusUpdates', on: st('statusUpdates', true), label: 'Rule changes' }) }),
        srow('news', { title: 'News articles',
          control: C.toggle({ key: 'news', on: st('news', true), label: 'News articles' }) }),
      ]);

      /* 3. Devices: where the account is signed in, then this device's lock,
         unlock, time zone and look. Lock-after chips drop in under the lock row
         while the lock is on; the time zone chips open from Change. */
      const deviceGroup = group('Devices', [
        srow('devices', { title: 'Signed in', meta: devicesMeta(data),
          control: pill('Manage', { 'data-sx-open': 'sx-devices', 'aria-expanded': 'false', 'aria-controls': 'sx-devices', 'aria-label': 'Manage signed in devices' }) },
          panel('sx-devices', deviceRows(data))),
        srow('lock', { title: 'Lock when you step away', meta: lockMeta(lockOn),
          control: C.toggle({ key: 'lockOn', on: lockOn, label: 'Lock when you step away' }) },
          panel('sx-lock', C.segment({ key: 'lockAfter', label: 'Lock after', selected: lockAfter,
            options: s.lockOptions.map((o) => ({ value: o, label: o })) }), lockOn)),
        srow('touchId', { title: 'Unlock with face or fingerprint',
          control: C.toggle({ key: 'touchId', on: st('touchId', false), label: 'Unlock with face or fingerprint' }) }),
        srow('tz', { title: 'Time zone', meta: tz,
          control: opener('sx-tz', 'Change time zone') },
          panel('sx-tz',
            C.segment({ key: 'tz', label: 'Time zone', selected: tz, options: TZ_OPTIONS.map((o) => ({ value: o, label: o })) }))),
        srow('theme', { title: 'Theme', wide: true,
          control: C.segment({ key: 'theme', label: 'Theme', selected: App.state.theme || s.theme,
            options: [{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }] }) }),
      ]);

      /* 4. Your records: copies in and out, then delete, last on the page. All free. */
      const records = group('Your records', [
        srow('backup', { title: s.backup.title, meta: backupMeta(data),
          control: pill('Back up now', { 'data-sx': 'backup' }) }),
        srow('restore', { title: 'Restore from a backup',
          control: pill('Choose a file', { 'data-sx': 'restore', 'aria-controls': 'sx-restore' }) +
            '<input type="file" hidden data-sx-file accept=".duly,application/octet-stream" aria-label="Choose a backup file">' },
          panel('sx-restore')),
        srow('export', { title: 'Export your records',
          control: pill('Export', { 'data-sx': 'export' }) }),
        srow('delete', { title: 'Delete everything', info: s.deleteMeta,
          control: pill('Delete', { 'data-sx': 'delete', 'aria-haspopup': 'dialog' }) }),
      ]);

      const dialog = '<dialog class="sx-dialog" aria-labelledby="sx-del-title">' +
        '<h2 class="t-medium" id="sx-del-title">Delete everything?</h2>' +
        '<p class="t-lead">This can\'t be undone. Your records and documents are removed from your account and every device. Backups you saved stay where you put them.</p>' +
        /* Cancel on the left, quiet; the outcome on the right. Focus starts
           on Cancel; Escape and a click on the scrim cancel too. */
        '<div class="sx-dialog-actions">' +
          C.button({ label: 'Cancel', kind: 'pill', attrs: { 'data-sx': 'delete-no', autofocus: true } }) +
          C.button({ label: 'Delete everything', kind: 'primary', attrs: { 'data-sx': 'delete-yes' } }) +
        '</div>' +
        '</dialog>';

      const privacy = s.privacy ? '<p class="t-meta sx-privacy">' + C.esc(s.privacy) + '</p>' : '';
      const offlineLine = offline ? '<p class="t-meta sx-offline">' + C.esc(data.checked.offline) + '</p>' : '';
      const footer = C.footer(offline ? data.version : data.version + ' · ' + data.checked.rules);

      return '<div class="screen-settings">' + STYLE + header + reminders + updates + deviceGroup + records +
        privacy + offlineLine + footer + dialog + '</div>';
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
        const b = it.querySelector(':scope > .row [data-sx-open]');
        if (b) b.setAttribute('aria-expanded', open ? 'true' : 'false');
      }
      /* After a chip is picked, the panel closes and focus goes back to Change. */
      function closeAfterPick(key, id) {
        setTimeout(() => {
          setPanel(item(key), false);
          const c = root.querySelector('[data-sx-open="' + id + '"]'); if (c) c.focus();
        }, 200);
      }

      /* Restore: pick a file, read it on this device, then one confirm. */
      function restoreFound(name) {
        const p = root.querySelector('#sx-restore');
        const it = item('restore');
        if (!p) return;
        p.innerHTML = '<p class="t-meta" role="status">Reading on this device</p>';
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

      function signOut(btn) {
        const title = btn.dataset.dev;
        App.state.signedOut = (App.state.signedOut || []).concat(title);
        const row = btn.closest('.item');
        const next = row && (row.nextElementSibling || row.previousElementSibling);
        if (row) row.remove();
        setMeta('devices', devicesMeta(data));
        App.toast('Signed out of ' + title);
        const f = next && next.querySelector('button');
        const m = root.querySelector('[data-sx-open="sx-devices"]');
        if (f) f.focus(); else if (m) m.focus();
      }

      /* Round 5 (note 4): a finished copy in or out carries the same check a
         ticked step draws, with a light tap. Under reduced motion the check
         is simply there. */
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
        const open = e.target.closest('[data-sx-open]');
        if (open) {
          const it = open.closest('.item');
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
            confirmed('Backup saved to your downloads');
          });
        } else if (act === 'restore') {
          const input = root.querySelector('[data-sx-file]');
          if (input) input.click();
        } else if (act === 'restore-yes') {
          closeRestore();
          confirmed('Your records are restored');
          const c = root.querySelector('[data-sx="restore"]'); if (c) c.focus();
        } else if (act === 'restore-no') {
          closeRestore();
          const c = root.querySelector('[data-sx="restore"]'); if (c) c.focus();
        } else if (act === 'export') {
          busy(b, 'Preparing', 1100, () => confirmed('Your records are in one folder in your downloads'));
        } else if (act === 'signout') {
          signOut(b);
        } else if (act === 'delete') {
          if (dialog && dialog.showModal) dialog.showModal();
        } else if (act === 'delete-no') {
          dialog.close();
        } else if (act === 'delete-yes') {
          dialog.dataset.leaving = '1';
          dialog.close();
          /* The account is gone: Welcome replaces this entry, onboarding
             starts fresh, and the router keeps every other route on
             Welcome until onboarding is finished again. */
          App.state.deleted = true;
          App.state.onb = null;
          App.toast('Everything is deleted');
          App.go('welcome', { replace: true });
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

      /* Toggles, chips and the calendar file are wired in app.js; this keeps the
         meta lines and the rows under the reminder switch true, in place. */
      if (offChange) offChange();
      const onChange = (e) => {
        if (!document.contains(root)) { if (offChange) offChange(); return; }
        const d = e.detail;
        if (d.kind === 'toggle' && d.key === 'lockOn') {
          setMeta('lock', lockMeta(!!d.value));
          setPanel(item('lock'), !!d.value);
        } else if (d.kind === 'toggle' && d.key === 'remind') {
          setMeta('remind', remindMeta(data, !!d.value));
          REMIND_SUB.forEach((k) => { const it = item(k); if (it) it.hidden = !d.value; });
          if (!d.value) setPanel(item('remindTime'), false);
        } else if (d.kind === 'calendar') {
          setMeta('remind:calendar', calendarMeta(data));
        } else if (d.kind === 'choice' && d.key === 'remindTime') {
          setMeta('remindTime', timeMeta(d.value));
          closeAfterPick('remindTime', 'sx-time');
        } else if (d.kind === 'choice' && d.key === 'tz') {
          setMeta('tz', d.value);
          closeAfterPick('tz', 'sx-tz');
        }
      };
      document.addEventListener('duly:change', onChange);
      offChange = () => { document.removeEventListener('duly:change', onChange); offChange = null; };
    },
  };
})();
