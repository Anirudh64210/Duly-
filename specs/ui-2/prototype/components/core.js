/* Duly ui-2 components. Every function returns an HTML string.
   Text props are escaped. Props documented as "html" are inserted as they
   are, so pass the output of other C functions there. To pass markup in a
   text prop, wrap it: C.raw('<strong>..</strong>').
   Behaviour (disclosure, popover, checkbox, choices, toggles, copy, edit in
   place, destructive confirm) is wired once in app.js by data attributes. */

/* components/core.js: Escaping, class and attribute helpers, ids, icons.
   Creates window.C; every other file in components/ adds to it. This was
   components.js before the split; a comment that says app.js means app/*.js. */

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

  window.C = { esc, raw, cls, attrs, uid, icon, escText };
  /* Helpers the other component files share; not part of the public C. */
  Object.defineProperty(window.C, '_', { value: { hrefAttrs } });
})();
