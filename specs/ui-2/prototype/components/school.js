/* components/school.js: Email panels and drafts, school marks and school steps. */

(function () {
  'use strict';

  const C = window.C;
  const { esc, escText, cls, attrs, uid, icon, task, buttonRow, info } = C;
  const { hrefAttrs } = C._;

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

  Object.assign(C, { email, emailDraft, schoolMark, updatedMark, rulesLine, schoolStep, schoolImport });
})();
