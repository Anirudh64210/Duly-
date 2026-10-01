/* Settings. Round 7, rule 5 (the founder's notes, Oct 1): grouped panels,
   like a phone's settings. Each group is a small title over one rounded
   panel; rows inside are separated by inset dividers, never full-width
   rules. Each row is its label, an optional one-line description in quiet
   text, and its control on the right.
     Reminders     on or off (free), time of day, time zone, email, phone,
                   calendar, rule changes and news
     Security      signed in, lock after, face or fingerprint
     Backup        back up to a file, restore from a backup
     Appearance    theme
     Your data     export, delete everything (last on the page), and the
                   privacy line under the panel
   "Rules checked Sep 30" (worked out from DULY_SAMPLE.today) is the quiet
   line at the very bottom. Copy says "your device" or "this device", never
   a platform. Every change happens in place: no redraw, no scroll jump.
   Routes:
     #/settings           the sample settings
     #/settings/offline   the offline line in place of Rules checked
   Shared state it reads and writes (App.state):
     remind, remind:email, remind:phone, statusUpdates, touchId   toggles
     remind:calendar      true once the dates were added (App.addToCalendar)
     remindTime, lockChoice, tz   selects (events.js writes them); lockChoice
                          sets lockOn and lockAfter
     theme                chips (applies itself)
     signedOut            device titles signed out here
     lastBackup           'today' once a backup was made */
(function () {
  'use strict';

  const TZ_HERE = 'New York';
  const TZ_OPTIONS = ['New York', 'Chicago', 'Denver', 'Phoenix', 'Los Angeles', 'Anchorage', 'Honolulu'];
  const TIME_OPTIONS = ['7:00 AM', '8:00 AM', '9:00 AM', '12:00 PM', '6:00 PM'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
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
  /* "Sep 30", read from the ISO date, never through a time zone. */
  function shortDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
    return m ? MONTHS[Number(m[2]) - 1] + ' ' + Number(m[3]) : '';
  }
  function calendarVal() {
    /* App.calendarEvents(): the dates the file holds, worked out from the record. */
    if (st('remind:calendar', false)) return 'Added';
    const n = App.calendarEvents ? App.calendarEvents().length : 0;
    return n + (n === 1 ? ' date' : ' dates');
  }
  /* "Last Sep 12, 2026", or "Last today" once one is made here. */
  function backupVal(data) {
    const m = String(data.settings.backup.meta || '').match(/Last backup: (.*?)\.?$/);
    const when = App.state.lastBackup || (m ? m[1] : '');
    return when ? 'Last ' + when : '';
  }

  function devices(data) {
    const out = App.state.signedOut || [];
    return (data.settings.devices || []).filter((d) => out.indexOf(d.title) === -1);
  }
  /* "This phone, MacBook and Web" */
  function devicesVal(data) {
    const t = devices(data).map((d) => d.title);
    if (t.length < 2) return t.join('');
    return t.slice(0, -1).join(', ') + ' and ' + t[t.length - 1];
  }
  function deviceRows(data) {
    return C.list(devices(data).map((d, i) => line('dev:' + d.title, d.title,
      i === 0 ? '' : pill('Sign out', { 'data-sx': 'signout', 'data-dev': d.title, 'aria-label': 'Sign out of ' + d.title }), d.meta)),
    { accordion: false, label: 'Signed in' });
  }

  /* line(key, title, control, desc?, panel?) : one row: the label, its
     one-line description in quiet text under it (data-sx-val, set in place
     by setMeta; empty hides it), and the control on the right. */
  function line(key, title, control, desc, panelHtml) {
    return '<div class="item srow sx-line" data-key="' + C.esc(key) + '"><div class="row is-static">' +
      '<span class="row-text"><span class="row-title">' + C.esc(title) + '</span>' +
      '<span class="sx-desc" data-sx-val' + (desc ? '' : ' hidden') + '>' + C.esc(desc || '') + '</span></span>' +
      '<span class="s-control">' + (control || '') + '</span>' +
      '</div>' + (panelHtml || '') + '</div>';
  }
  function panel(id, inner) {
    return '<div class="disc sx-panel" id="' + id + '" hidden>' + (inner || '') + '</div>';
  }
  function pill(label, attrs) {
    return C.button({ label: label, kind: 'pill', attrs: attrs });
  }
  function select(key, label, options, selected) {
    return '<select class="select" data-field="' + C.esc(key) + '" aria-label="' + C.esc(label) + '">' +
      options.map((o) => '<option' + (o === selected ? ' selected' : '') + '>' + C.esc(o) + '</option>').join('') + '</select>';
  }
  let gid = 0;
  /* group(title, rows, note?) : the small title, the rounded panel, and an
     optional quiet note under the panel. */
  function group(title, rows, note) {
    gid += 1;
    const id = 'sxg-' + gid;
    return '<section class="sx-group" aria-labelledby="' + id + '">' +
      '<h2 class="sx-group-title" id="' + id + '">' + C.esc(title) + '</h2>' +
      '<div class="sx-box" role="list">' + rows.map((r) => r.replace('<div class="item srow sx-line"', '<div role="listitem" class="item srow sx-line"').replace('<div hidden class="item srow sx-line"', '<div hidden role="listitem" class="item srow sx-line"')).join('') + '</div>' +
      (note ? '<p class="sx-note">' + C.esc(note) + '</p>' : '') +
      '</section>';
  }

  /* Layout only. Type sizes come from system.css. Panels: surface, a
     hairline border, 16px radius; rows 12 by 16, dividers inset 16 from the
     left; 24 between groups, 8 from a group's title to its panel. */
  const STYLE = '<style>' +
    '.screen-settings { flex: 1; display: flex; flex-direction: column; min-width: 0; }' +
    '.col.is-entering > .screen-settings { animation: none; }' +
    '.col.is-entering > .screen-settings > * { animation: rise .55s var(--ease-rise) backwards; }' +
    '.screen-settings .page-header { margin-bottom: var(--s-8); }' +
    '.screen-settings .sx-group { margin-top: var(--s-24); }' +
    '.screen-settings .sx-group-title { margin: 0 0 var(--s-8) var(--s-16); font-size: var(--t-small); line-height: var(--lh-meta); font-weight: 500; color: var(--ink-3); }' +
    '.screen-settings .sx-box { background: var(--surface); border: 1px solid var(--hairline); border-radius: 16px; overflow: hidden; }' +
    '.screen-settings .sx-box > .item { margin: 0; border: 0; }' +
    '.screen-settings .sx-box > .item::before { content: ""; position: absolute; top: 0; left: var(--s-16); right: 0; height: 1px; background: var(--hairline); }' +
    '.screen-settings .sx-box > .item:first-child::before { display: none; }' +
    '.screen-settings .sx-line > .row { min-height: 52px; padding: var(--s-12) var(--s-16); gap: var(--s-16); border-radius: 0; }' +
    '.screen-settings .sx-line .row-text { gap: 0; }' +
    '.screen-settings .sx-desc { font-size: var(--t-small); line-height: var(--lh-meta); color: var(--ink-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }' +
    '.screen-settings .sx-line .s-control { min-width: 0; gap: var(--s-12); }' +
    '.screen-settings .sx-line .btn-pill { height: 32px; padding: 0 var(--s-12); }' +
    '.screen-settings .sx-line .select { height: 32px; }' +
    '.screen-settings .sx-line .chip { height: 32px; padding-top: 0; padding-bottom: 0; }' +
    '.screen-settings .sx-panel { gap: var(--s-8); padding: 0 var(--s-16) var(--s-12); }' +
    '.screen-settings .sx-panel .btn-row { margin-top: var(--s-8); }' +
    '.screen-settings .sx-panel .item { margin: 0; }' +
    '.screen-settings .sx-panel .item > .row { min-height: 0; padding: var(--s-8) 0; }' +
    '.screen-settings .sx-note { margin: var(--s-8) var(--s-16) 0; font-size: var(--t-small); line-height: var(--lh-meta); color: var(--ink-3); }' +
    '.screen-settings .sx-foot { margin: var(--s-32) 0 0 var(--s-16); display: flex; flex-direction: column; gap: var(--s-4); }' +
    '.screen-settings .sx-foot p { margin: 0; font-size: var(--t-small); line-height: var(--lh-meta); color: var(--ink-3); }' +
    '.screen-settings .sx-dialog { width: 360px; max-width: calc(100vw - var(--s-32)); padding: var(--s-24); margin: auto;' +
      ' background: var(--surface); color: var(--ink); border: 1px solid var(--hairline); border-radius: var(--r-card); box-shadow: var(--shadow-pop); }' +
    '.screen-settings .sx-dialog[open] { animation: drop .28s ease-out; }' +
    '.screen-settings .sx-dialog::backdrop { background: var(--scrim); }' +
    '.screen-settings .sx-dialog .t-lead { margin-top: var(--s-8); }' +
    '.screen-settings .sx-dialog { box-sizing: border-box; overflow: visible; }' +
    '.screen-settings .sx-dialog-actions { display: flex; justify-content: flex-end; align-items: center; gap: var(--s-12); margin-top: var(--s-24); }' +
    '.screen-settings .sx-dialog-actions .btn { flex: 0 0 auto; height: 44px; padding: 0 var(--s-24); white-space: nowrap; }' +
    '@media (max-width: 640px) { .screen-settings .sx-line > .row { padding-left: var(--s-12); padding-right: var(--s-12); } .screen-settings .sx-box > .item::before { left: var(--s-12); } .screen-settings .sx-desc { white-space: normal; } }' +
    '</style>';

  window.SCREENS['settings'] = {
    title: 'Settings',

    render(data, params) {
      const s = data.settings;
      const r = rem(data);
      const offline = params[0] === 'offline' || (typeof navigator !== 'undefined' && navigator.onLine === false);
      const remind = st('remind', r.on !== false);
      const time = st('remindTime', defaultTime(data));
      const lockChoice = st('lockChoice', st('lockOn', true) ? st('lockAfter', s.lockAfter) : 'Off');
      const tz = st('tz', TZ_HERE);
      const email = channel(data, 'email');
      const phone = channel(data, 'phone');
      const cal = channel(data, 'calendar');
      const sub = (row) => remind ? row : row.replace('<div class="item srow sx-line"', '<div hidden class="item srow sx-line"');

      const header = C.pageHeader({ title: 'Settings' });

      /* 1. Reminders: free, on by default. The rows that only matter while
         reminders are on hide while the switch is off. */
      const reminders = group('Reminders', [
        line('remind', 'Remind me before dates', C.toggle({ key: 'remind', on: remind, label: 'Remind me before dates' }), remind ? (s.remindShort || r.when) : 'Off'),
        sub(line('remindTime', 'Time of day', select('remindTime', 'Time of day', TIME_OPTIONS, time))),
        line('tz', 'Time zone', select('tz', 'Time zone', TZ_OPTIONS, tz), "Your reminders and today's date use it"),
        sub(line('remind:email', email.label || 'Email', C.toggle({ key: 'remind:email', on: st('remind:email', !!email.on), label: 'Email reminders' }), email.meta || '')),
        sub(line('remind:phone', phone.label || 'Phone notification', C.toggle({ key: 'remind:phone', on: st('remind:phone', !!phone.on), label: 'Phone notifications' }))),
        sub(line('remind:calendar', cal.label || 'Calendar', pill(cal.action || 'Add to calendar', { 'data-calendar': true }), calendarVal())),
        line('statusUpdates', 'Rule changes and news', C.toggle({ key: 'statusUpdates', on: st('statusUpdates', true), label: 'Rule changes and news' }), 'When a court or a rule changes your dates'),
      ]);

      /* 2. Security. */
      const security = group('Security', [
        line('devices', 'Signed in', pill('Manage', { 'data-sx-open': 'sx-devices', 'aria-expanded': 'false', 'aria-controls': 'sx-devices', 'aria-label': 'Manage signed in devices' }),
          devicesVal(data), panel('sx-devices', deviceRows(data))),
        line('lock', 'Lock after', select('lockChoice', 'Lock after', ['Off'].concat(s.lockOptions), lockChoice)),
        line('touchId', 'Unlock with face or fingerprint', C.toggle({ key: 'touchId', on: st('touchId', false), label: 'Unlock with face or fingerprint' })),
      ]);

      /* 3. Backup. */
      const backup = group('Backup', [
        line('backup', 'Back up to a file', pill('Back up now', { 'data-sx': 'backup' }), backupVal(data)),
        line('restore', 'Restore from a backup', pill('Choose a file', { 'data-sx': 'restore', 'aria-controls': 'sx-restore' }) +
          '<input type="file" hidden data-sx-file accept=".duly,application/octet-stream" aria-label="Choose a backup file">', '', panel('sx-restore')),
      ]);

      /* 4. Appearance. */
      const appearance = group('Appearance', [
        line('theme', 'Theme', C.segment({ key: 'theme', label: 'Theme', selected: App.state.theme || s.theme,
          options: [{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }] })),
      ]);

      /* 5. Your data: a copy out, then delete, last on the page. The
         privacy line sits quietly under the panel. */
      const records = group('Your data', [
        line('export', 'Export everything', pill('Export', { 'data-sx': 'export' }), 'Your records and documents, in one folder'),
        line('delete', 'Delete everything', pill('Delete', { 'data-sx': 'delete', 'aria-haspopup': 'dialog' }), 'From your account and every device'),
      ], s.privacy || '');

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

      /* The quiet close: the footer, then when the rules were checked, the
         very last line. */
      const checked = offline ? data.checked.offline : 'Rules checked ' + shortDate(data.today.iso);
      const footer = '<div class="col-spacer"></div><footer class="sx-foot"><p>' + C.esc(data.version) + '</p><p>' + C.esc(checked) + '</p></footer>';

      return '<div class="screen-settings">' + STYLE + header + reminders + security + backup + appearance + records +
        footer + dialog + '</div>';
    },

    mount(root, data) {
      const s = data.settings;
      const item = (k) => root.querySelector('.item[data-key="' + k + '"]');
      /* Sets a row's short value in place; an empty value hides it. */
      const setMeta = (k, text) => {
        const it = item(k);
        const v = it && it.querySelector(':scope > .row [data-sx-val]');
        if (!v) return;
        v.textContent = text || '';
        v.hidden = !text;
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
        setMeta('devices', devicesVal(data));
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
            setMeta('backup', backupVal(data));
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
        if (d.kind === 'field' && d.key === 'lockChoice') {
          App.state.lockOn = d.value !== 'Off';
          if (d.value !== 'Off') App.state.lockAfter = d.value;
        } else if (d.kind === 'toggle' && d.key === 'remind') {
          setMeta('remind', d.value ? (s.remindShort || rem(data).when) : 'Off');
          REMIND_SUB.forEach((k) => { const it = item(k); if (it) it.hidden = !d.value; });
        } else if (d.kind === 'toggle' && d.key === 'statusUpdates') {
          App.state.news = !!d.value;
        } else if (d.kind === 'calendar') {
          setMeta('remind:calendar', calendarVal());
        }
      };
      document.addEventListener('duly:change', onChange);
      offChange = () => { document.removeEventListener('duly:change', onChange); offChange = null; };
    },
  };
})();
