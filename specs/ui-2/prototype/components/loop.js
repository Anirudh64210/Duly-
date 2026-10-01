/* components/loop.js: one loop, folded to a line, unfolding into its step.

   C.loop(loop, { open? }) draws App.loops.view(loop):
     folded    one line: the title, then what the student sees ("Needs you:
               report the end of your job on or before Nov 10", "Waiting on
               your DSO until Oct 7", "Done Nov 4"). A button; it unfolds.
     unfolded  the receipt of the last action (role="status", with Undo and
               Fold), the current step: its title, a lead action (the saved
               copy) first, its lines, quiet notes, Can't tell yet with the
               one fact that settles it, its fields, its helpers (the DSO
               draft, links, the rule), its exits as buttons that name the
               outcome, then one "How this was counted" listing every source
               of the step (Round 7: no ⓘ on a line). An exit that drops the
               loop asks first, with Cancel.
     closed    the receipt in full and Reopen with a stated reason.
     settling  Round 8, rule 7: right after an action that leaves nothing
               for the student to do now, a self-drawing check and the
               receipt as one line ("Confirmed Sep 30. Next check-in Oct
               30"). app/motion.js holds it 1.6 s, then the item leaves on
               its own and Undo moves to a toast. Nothing is folded by hand,
               so a receipt has no Fold button.
     flat      { flat: true }, or the loop Home's sheet holds
               (App.homeSheetLoop): no folded line, only the step, since the
               sheet's own title names the item.
   C.loops(list, { more? }) draws several, with the overflow line.
   Behaviour is wired once in app/loops.js by data-loop-* attributes.
   Spacing only from the scale; hairlines, not boxes; no red, no alarms. */

(function () {
  'use strict';

  const C = window.C;
  const { esc, escText, cls, uid, icon } = C;
  /* Defined in files loaded earlier or later; looked up when called. */
  const emailDraft = (...a) => C.emailDraft(...a);

  function field(f) {
    const id = uid('lf');
    const err = '<p class="field-error loop-err" data-loop-error="' + esc(f.key) + '"' + (f.error ? '' : ' hidden') + '>' + esc(f.error || '') + '</p>';
    if (f.kind === 'choice') {
      return '<div class="field loop-field"><span class="field-label" id="' + id + '">' + escText(f.label) + '</span>' +
        '<div class="chips loop-chips" role="radiogroup" data-choices="loop:' + esc(f.key) + '" aria-labelledby="' + id + '">' +
        (f.options || []).map((o) => {
          const on = String(f.value) === String(o.value);
          return '<button type="button" class="chip" role="radio" aria-checked="' + (on ? 'true' : 'false') + '" data-loop-choice="' + esc(f.key) + '" data-value="' + esc(o.value) + '">' + escText(o.label) + '</button>';
        }).join('') + '</div>' + err + '</div>';
    }
    const type = f.kind === 'date' ? 'date' : (f.kind === 'number' ? 'number' : 'text');
    return '<div class="field loop-field"><label class="field-label" for="' + id + '">' + escText(f.label) + '</label>' +
      '<input class="input" id="' + id + '" type="' + type + '" data-loop-field="' + esc(f.key) + '" value="' + esc(f.value) + '"' +
      (f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : '') +
      (f.kind === 'receipt' ? ' autocomplete="off" autocapitalize="characters" spellcheck="false"' : '') +
      (type === 'number' ? ' inputmode="numeric" min="0"' : '') + '>' + err + '</div>';
  }

  function action(a, v) {
    if (a.kind === 'draft') return '<div class="loop-draft">' + emailDraft(Object.assign({ key: a.key }, a.draft)) + '</div>';
    if (a.kind === 'link') {
      const ext = /^https?:/.test(a.href);
      return '<a class="link loop-link" href="' + esc(a.href) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' + escText(a.label) + '</a>';
    }
    /* The saved copy, opened in one tap (screens/documents.js wires
       data-doc-open on every page). */
    if (a.kind === 'copy') return '<button type="button" class="btn btn-primary loop-copy" data-doc-open="' + esc(a.doc) + '">' + escText(a.label) + '</button>';
    /* The rule's name only: its source is in "How this was counted". */
    if (a.kind === 'rule') return '<span class="loop-rule">' + escText(a.label) + '</span>';
    if (a.kind === 'calendar') return '<button type="button" class="link loop-link" data-loop-calendar>' + escText(a.label) + '</button>';
    if (a.kind === 'start') return '<button type="button" class="btn btn-pill" data-loop-start="' + esc(a.loop) + '">' + escText(a.label) + '</button>';
    return '';
  }

  function exitButton(x) {
    if (x.confirm) {
      return '<button type="button" class="btn btn-text is-quiet" data-loop-ask="' + esc(x.key) + '">' + escText(x.label) + '</button>' +
        '<div class="loop-confirm" data-loop-confirm="' + esc(x.key) + '" role="group" aria-label="' + esc(x.label) + '" hidden>' +
        '<p>' + escText(x.confirm) + '</p><div class="btn-group">' +
        '<button type="button" class="btn btn-text is-quiet" data-loop-cancel>' + esc(x.cancel || 'Cancel') + '</button>' +
        '<button type="button" class="btn btn-pill" data-loop-act="' + esc(x.key) + '">' + escText(x.label) + '</button>' +
        '</div></div>';
    }
    const kind = x.primary ? 'btn-primary' : (x.quiet ? 'btn-text' : 'btn-pill');
    return '<button type="button" class="' + cls('btn', kind, x.quiet && 'is-quiet') + '" data-loop-act="' + esc(x.key) + '"' + (x.disabled ? ' disabled' : '') + '>' + escText(x.label) + '</button>';
  }

  function receipt(v) {
    if (!v.receipt) return '';
    return '<div class="loop-receipt" role="status" tabindex="-1"><p>' + escText(v.receipt) + '</p>' +
      '<div class="btn-group">' +
      (v.canUndo ? '<button type="button" class="btn btn-text is-quiet" data-loop-undo>' + esc(rc().undo || 'Undo') + '</button>' : '') +
      '</div></div>';
  }
  const rc = () => ((window.DULY_SAMPLE && DULY_SAMPLE.loops && DULY_SAMPLE.loops.receipts) || {});

  /* A folded receipt stays as one line: its first sentence, without the
     closing period ("Saved: I-983 signed Sep 30"). A sentence ends at a
     period after a lowercase letter, a digit or a bracket and before a
     capital, so "U.S. Citizenship" does not split. The view drops a folded
     receipt, so this reads it from the loop itself. */
  function firstSentence(t) {
    const s = String(t || '').trim();
    const m = s.match(/^(.*?[a-z0-9)])\.\s+(?=[A-Z])/);
    return (m ? m[1] : s.replace(/\.$/, '')).trim();
  }
  function foldedReceipt(lp) {
    const r = lp && lp.receipt;
    if (!r || !r.folded || !r.text) return '';
    const line = firstSentence(r.text);
    return line ? '<p class="loop-receipt-line">' + escText(line) + '</p>' : '';
  }

  function body(v, lp, flat) {
    if (v.closed) {
      return (v.receipt ? receipt(v) : (v.closed.text ? '<p class="loop-closed">' + escText(v.closed.text) + '</p>' : foldedReceipt(lp))) +
        (v.closed.reopen.length ? '<div class="btn-group loop-reopen">' + v.closed.reopen.map((r) =>
          '<button type="button" class="btn btn-text is-quiet" data-loop-reopen="' + esc(r.key) + '">' + escText(r.label) + '</button>').join('') + '</div>' : '');
    }
    const s = v.step;
    /* Round 7, rule 2: no ⓘ on a line. Every source of the step (its lines
       and its rule) is listed once, behind "How this was counted" at the
       bottom. A field marked reveal (and any exit that needs it) stays
       hidden until its quiet line's link is tapped, or it has a value. */
    const shown = App.state['loopReveal:' + v.id] || {};
    const hiddenField = (f) => !!(f.reveal && !shown[f.key] && (f.value == null || f.value === ''));
    const hidden = s.fields.filter(hiddenField).map((f) => f.key);
    const lines = s.lines.filter((l) => !l.quiet).map((l) => '<li class="' + cls('loop-li', l.threat && 'is-threat') + '"><span>' + escText(l.text) + '</span>' +
      (l.tag ? ' <span class="mark">' + esc(l.tag === 'guidance' ? 'Guidance' : l.tag) + '</span>' : '') + '</li>').join('');
    const quietLines = s.lines.filter((l) => l.quiet).map((l) => '<p class="loop-note">' + escText(l.text) +
      (l.reveal && hidden.indexOf(l.reveal) >= 0 ? ' <button type="button" class="link loop-reveal" data-loop-reveal="' + esc(l.reveal) + '">' + escText(l.revealLabel || 'Add it') + '</button>' : '') + '</p>').join('');
    const refs = [];
    s.lines.forEach((l) => { if (l.source) refs.push(l.source); (l.sources || []).forEach((x) => refs.push(x)); });
    s.actions.forEach((a) => { if (a.kind === 'rule' && a.source) refs.push(a.source); });
    const lead = s.actions.filter((a) => a.lead);
    const rest = s.actions.filter((a) => !a.lead);
    const hideExit = (x) => (x.needs || []).some((k) => hidden.indexOf(k) >= 0);
    /* An exit the step takes by itself once answered (step.advance) has
       no button. */
    const exits = s.exits.filter((x) => !x.quiet && !x.auto);
    const quiet = s.exits.filter((x) => x.quiet);
    const exitHtml = (x) => (hideExit(x) ? exitButton(x).replace(/^<button /, '<button hidden data-loop-needs-reveal ') : exitButton(x));
    return (v.receipt ? receipt(v) : foldedReceipt(lp)) +
      (s.title ? '<h3 class="' + cls('loop-step', flat && 'is-lead') + '">' + escText(s.title) + '</h3>' : '') +
      (lead.length ? '<div class="loop-lead">' + lead.map((a) => action(a, v)).join('') + '</div>' : '') +
      (s.cantTell ? '<p class="loop-unknown">' + escText(s.cantTell) + '</p>' : '') +
      (lines ? '<ul class="loop-lines">' + lines + '</ul>' : '') + quietLines +
      (s.fields.length ? '<div class="loop-fields">' + s.fields.map((f) => (hiddenField(f) ? field(f).replace(/^<div class="field loop-field"/, '<div class="field loop-field" hidden data-loop-revealed="' + esc(f.key) + '"') : field(f))).join('') + '</div>' : '') +
      (rest.length ? '<div class="loop-actions">' + rest.map((a) => action(a, v)).join('') + '</div>' : '') +
      '<div class="loop-exits">' +
      (exits.length ? '<div class="btn-group">' + exits.map(exitHtml).join('') + '</div>' : '') +
      (quiet.length ? '<div class="btn-group loop-quiet">' + quiet.map(exitHtml).join('') + '</div>' : '') +
      '</div>' + (refs.length ? C.how(refs) : '');
  }

  /* The check that draws itself: a ring, then the tick. Under reduced
     motion it is simply there. */
  const CHECK = '<svg class="settle-check" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">' +
    '<circle cx="12" cy="12" r="10.25" pathLength="1"/><path d="M7.6 12.3l3 3.1 5.8-6.3" pathLength="1"/></svg>';

  /* loop(loop, { open?, flat? }) */
  function loop(lp, o) {
    if (!lp || !window.App || !App.loops) return '';
    const v = App.loops.view(lp);
    const settle = App.settleLine ? App.settleLine(v.id) : null;
    if (v.state === 'dismissed' && !settle && !(o && o.record)) return '';
    const flat = !!((o && o.flat) || (App.homeSheetLoop === v.id && typeof document !== 'undefined' && document.querySelector('.sheet-layer')));
    const tone = v.seen.kind === 'done' ? 'is-done' : (v.seen.kind === 'waiting' ? 'is-waiting' : 'is-needs');
    if (settle) {
      /* In a list the check takes the dot's place and the receipt is the
         line under the title; in the sheet, the check and the line alone. */
      const head = '<section class="' + cls('loop is-settled', flat && 'is-flat') + '" data-loop="' + esc(v.id) + '" aria-label="' + esc(v.title) + '">';
      if (flat) return head + '<div class="loop-receipt loop-settle" role="status" tabindex="-1">' + CHECK + '<p>' + escText(settle) + '</p></div></section>';
      return head + '<div class="loop-head is-still"><span class="loop-dot is-check" aria-hidden="true">' + CHECK + '</span><span class="loop-head-text"><span class="loop-title">' + escText(v.title) + '</span>' +
        '<span class="loop-receipt loop-settle-line" role="status" tabindex="-1">' + escText(settle) + '</span></span></div></section>';
    }
    if (flat) {
      return '<section class="' + cls('loop is-flat', tone) + '" data-loop="' + esc(v.id) + '" aria-label="' + esc(v.title) + '">' +
        '<div class="loop-body">' + body(v, lp, true) + '</div></section>';
    }
    const open = !!((o && o.open) || App.state['loopOpen:' + v.id]);
    const bodyId = uid('loopb');
    return '<section class="' + cls('loop', tone) + '" data-loop="' + esc(v.id) + '" aria-label="' + esc(v.title) + '">' +
      '<button type="button" class="loop-head" data-loop-toggle aria-expanded="' + (open ? 'true' : 'false') + '" aria-controls="' + bodyId + '">' +
      '<span class="loop-dot" aria-hidden="true"></span>' +
      '<span class="loop-head-text"><span class="loop-title">' + escText(v.title) + '</span>' +
      '<span class="loop-seen">' + escText(v.seen.line || '') + '</span></span>' +
      icon('chevron', { cls: 'chev' }) + '</button>' +
      '<div class="loop-body" id="' + bodyId + '"' + (open ? '' : ' hidden') + '>' + body(v, lp) + '</div>' +
      '</section>';
  }

  /* loops(list, { more?, label? }) : several loops, one line each, and the
     overflow ("2 more, next on Nov 1"). */
  function loops(list, o) {
    const opt = o || {};
    const items = (list || []).map((lp) => loop(lp)).filter(Boolean);
    return '<div class="loops"' + (opt.label ? ' aria-label="' + esc(opt.label) + '"' : '') + '>' + items.join('') +
      (opt.more ? '<p class="loop-more t-meta">' + esc(opt.more) + '</p>' : '') + '</div>';
  }

  Object.assign(C, { loop, loops });

  /* Styles for loops, from the system tokens. */
  if (typeof document !== 'undefined' && !document.getElementById('loop-style')) {
    const css = [
      '.loops { display: flex; flex-direction: column; }',
      '.loop { border-top: 1px solid var(--hairline); }',
      '.loops > .loop:last-of-type { border-bottom: 1px solid var(--hairline); }',
      '.loop-head { display: flex; align-items: flex-start; gap: var(--s-12); width: 100%; padding: var(--s-16) 0; background: none; border: 0; text-align: left; color: var(--ink); font: inherit; cursor: pointer; }',
      '.loop-head:focus-visible { outline: none; box-shadow: var(--focus-ring); border-radius: var(--r-nav); }',
      '.loop-head .chev { flex: none; width: 16px; height: 16px; margin-top: var(--s-4); color: var(--ink-3); transition: transform .16s ease; }',
      '.loop-head[aria-expanded="true"] .chev { transform: rotate(90deg); }',
      '.loop-dot { flex: none; width: 8px; height: 8px; margin-top: var(--s-8); border-radius: 50%; background: var(--accent); }',
      '.loop.is-waiting .loop-dot { background: var(--ink-4); }',
      '.loop.is-done .loop-dot { background: transparent; border: 1px solid var(--ink-4); }',
      '.loop-head-text { display: flex; flex-direction: column; min-width: 0; flex: 1; }',
      '.loop-title { font-size: var(--t-small); line-height: var(--lh-small); font-weight: 500; overflow-wrap: anywhere; }',
      '.loop-seen { font-size: var(--t-small); line-height: var(--lh-meta); color: var(--ink-3); overflow-wrap: anywhere; }',
      '.loop.is-needs .loop-seen { color: var(--ink-2); }',
      '.loop-body { padding: 0 0 var(--s-24) var(--s-24); display: flex; flex-direction: column; gap: var(--s-16); }',
      '.loop-step { font-size: var(--t-small); line-height: var(--lh-small); font-weight: 600; color: var(--ink); margin: 0; overflow-wrap: anywhere; }',
      '.loop-lines { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--s-8); }',
      '.loop-li { font-size: var(--t-small); line-height: var(--lh-small); color: var(--ink-body); overflow-wrap: anywhere; }',
      '.loop-li.is-threat { color: var(--ink); font-weight: 500; }',
      '.loop-unknown { font-size: var(--t-small); line-height: var(--lh-small); color: var(--ink-2); margin: 0; }',
      '.loop-fields { display: flex; flex-direction: column; gap: var(--s-16); max-width: 420px; }',
      '.loop-chips { display: flex; flex-wrap: wrap; gap: var(--s-8); }',
      '.loop-actions { display: flex; flex-direction: column; align-items: flex-start; gap: var(--s-12); }',
      '.loop-draft { align-self: stretch; }',
      '.loop-rule { display: inline-flex; align-items: center; gap: var(--s-4); font-size: var(--t-small); line-height: var(--lh-meta); color: var(--ink-2); }',
      '.loop-lead { display: flex; flex-wrap: wrap; gap: var(--s-8); }',
      '.loop-note { margin: 0; font-size: var(--t-small); line-height: var(--lh-meta); color: var(--ink-3); overflow-wrap: anywhere; }',
      '.loop-note .loop-reveal { font-weight: 600; }',
      '.loop-body > .how-btn { margin-top: calc(-1 * var(--s-4)); }',
      '.loop-exits { display: flex; flex-direction: column; gap: var(--s-12); }',
      '.loop-exits .btn { white-space: normal; text-align: left; }',
      '.loop-confirm { display: flex; flex-direction: column; gap: var(--s-8); padding-top: var(--s-8); border-top: 1px solid var(--hairline-inner); flex-basis: 100%; }',
      '.loop-confirm p { margin: 0; font-size: var(--t-small); line-height: var(--lh-small); color: var(--ink-body); }',
      '.loop-receipt { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: var(--s-8); padding: var(--s-12) 0; border-bottom: 1px solid var(--hairline-inner); outline: none; }',
      '.loop-receipt p, .loop-closed { margin: 0; flex: 1 1 240px; font-size: var(--t-small); line-height: var(--lh-small); color: var(--ink); overflow-wrap: anywhere; }',
      '.loop-receipt-line { margin: 0; padding: 0 0 var(--s-12); border-bottom: 1px solid var(--hairline-inner); font-size: var(--t-small); line-height: var(--lh-meta); color: var(--ink-2); overflow-wrap: anywhere; }',
      '.loop-more { margin: var(--s-12) 0 0; }',
      '@media (max-width: 640px) { .loop-body { padding-left: 0; } .loop-exits .btn-group > .btn-primary { width: 100%; justify-content: center; } }',
      /* Flat, in Home's sheet: the step alone, no line above it. */
      '.loop.is-flat { border: 0; }',
      '.loop.is-flat > .loop-body { padding: 0; gap: var(--s-16); }',
      '.loop-step.is-lead { font-size: var(--t-medium); line-height: var(--lh-medium); letter-spacing: -.01em; }',
      /* Settling: the check and the one-line receipt. */
      '.loop.is-settled > .loop-head.is-still { cursor: default; }',
      /* The check sits centred on the dot's own slot, so nothing shifts. */
      '.loop.is-settled .loop-dot.is-check { position: relative; background: transparent; border: 0; }',
      '.loop-dot.is-check > .settle-check { position: absolute; left: 50%; top: 50%; width: 18px; height: 18px; transform: translate(-50%, -50%); }',
      '.loop-receipt.loop-settle-line { display: block; padding: 0; border: 0; font-size: var(--t-small); line-height: var(--lh-meta); color: var(--ink); overflow-wrap: anywhere; }',
      '.loop-receipt.loop-settle { display: flex; flex-wrap: nowrap; align-items: center; justify-content: flex-start; gap: var(--s-12); padding: var(--s-8) 0; border: 0; }',
      '.loop-settle p { margin: 0; flex: 1 1 auto; font-size: var(--t-small); line-height: var(--lh-small); font-weight: 500; color: var(--ink); overflow-wrap: anywhere; }',
      '.settle-check { flex: none; width: 22px; height: 22px; fill: none; stroke: var(--accent); stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }',
      '.settle-check path { stroke-width: 2; stroke-dasharray: 1; stroke-dashoffset: 0; animation: settle-tick .32s .2s cubic-bezier(.4,0,.2,1) backwards; }',
      '.settle-check circle { stroke-dasharray: 1; stroke-dashoffset: 0; transform: rotate(-90deg); transform-origin: 12px 12px; animation: settle-tick .36s cubic-bezier(.4,0,.2,1) backwards; }',
      '@keyframes settle-tick { from { stroke-dashoffset: 1; } }',
      '@media (prefers-reduced-motion: reduce) { .loop-head .chev { transition: none; } .settle-check path, .settle-check circle { animation: none; } }',
    ].join('\n');
    const el = document.createElement('style');
    el.id = 'loop-style';
    el.textContent = css;
    (document.head || document.documentElement).appendChild(el);
  }
})();
