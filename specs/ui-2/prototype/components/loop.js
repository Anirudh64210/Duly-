/* components/loop.js: one loop, folded to a line, unfolding into its step.

   C.loop(loop, { open? }) draws App.loops.view(loop):
     folded    one line: the title, then what the student sees ("Needs you:
               report the end of your job on or before Nov 10", "Waiting on
               your DSO until Oct 7", "Done Nov 4"). A button; it unfolds.
     unfolded  the receipt of the last action (role="status", with Undo and
               Fold), the current step: its title, its lines with their source
               marks, Can't tell yet with the one fact that settles it, its
               fields, its helpers (the DSO draft, links, the rule), and its
               exits as buttons that name the outcome. An exit that drops the
               loop asks first, with Cancel.
     closed    the receipt in full and Reopen with a stated reason.
   C.loops(list, { more? }) draws several, with the overflow line.
   Behaviour is wired once in app/loops.js by data-loop-* attributes.
   Spacing only from the scale; hairlines, not boxes; no red, no alarms. */

(function () {
  'use strict';

  const C = window.C;
  const { esc, escText, cls, uid, icon } = C;
  /* Defined in files loaded earlier or later; looked up when called. */
  const source = (...a) => C.source(...a);
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
    if (a.kind === 'rule') return '<span class="loop-rule">' + escText(a.label) + ' ' + source(a.source, { inline: true }) + '</span>';
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
      '<button type="button" class="btn btn-text is-quiet" data-loop-fold>' + esc(rc().fold || 'Fold') + '</button>' +
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

  function body(v, lp) {
    if (v.closed) {
      return (v.receipt ? receipt(v) : (v.closed.text ? '<p class="loop-closed">' + escText(v.closed.text) + '</p>' : foldedReceipt(lp))) +
        (v.closed.reopen.length ? '<div class="btn-group loop-reopen">' + v.closed.reopen.map((r) =>
          '<button type="button" class="btn btn-text is-quiet" data-loop-reopen="' + esc(r.key) + '">' + escText(r.label) + '</button>').join('') + '</div>' : '');
    }
    const s = v.step;
    const lines = s.lines.map((l) => '<li class="' + cls('loop-li', l.threat && 'is-threat') + '"><span>' + escText(l.text) + '</span>' +
      (l.tag ? ' <span class="mark">' + esc(l.tag === 'guidance' ? 'Guidance' : l.tag) + '</span>' : '') +
      (l.source ? ' ' + source(l.source, { inline: true }) : '') + '</li>').join('');
    const exits = s.exits.filter((x) => !x.quiet);
    const quiet = s.exits.filter((x) => x.quiet);
    return (v.receipt ? receipt(v) : foldedReceipt(lp)) +
      (s.title ? '<h3 class="loop-step">' + escText(s.title) + '</h3>' : '') +
      (s.cantTell ? '<p class="loop-unknown">' + escText(s.cantTell) + '</p>' : '') +
      (lines ? '<ul class="loop-lines">' + lines + '</ul>' : '') +
      (s.fields.length ? '<div class="loop-fields">' + s.fields.map(field).join('') + '</div>' : '') +
      (s.actions.length ? '<div class="loop-actions">' + s.actions.map((a) => action(a, v)).join('') + '</div>' : '') +
      '<div class="loop-exits">' +
      (exits.length ? '<div class="btn-group">' + exits.map(exitButton).join('') + '</div>' : '') +
      (quiet.length ? '<div class="btn-group loop-quiet">' + quiet.map(exitButton).join('') + '</div>' : '') +
      '</div>';
  }

  /* loop(loop, { open? }) */
  function loop(lp, o) {
    if (!lp || !window.App || !App.loops) return '';
    const v = App.loops.view(lp);
    if (v.state === 'dismissed' && !(o && o.record)) return '';
    const open = !!((o && o.open) || App.state['loopOpen:' + v.id]);
    const bodyId = uid('loopb');
    const tone = v.seen.kind === 'done' ? 'is-done' : (v.seen.kind === 'waiting' ? 'is-waiting' : 'is-needs');
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
      '.loop-exits { display: flex; flex-direction: column; gap: var(--s-12); }',
      '.loop-exits .btn { white-space: normal; text-align: left; }',
      '.loop-confirm { display: flex; flex-direction: column; gap: var(--s-8); padding-top: var(--s-8); border-top: 1px solid var(--hairline-inner); flex-basis: 100%; }',
      '.loop-confirm p { margin: 0; font-size: var(--t-small); line-height: var(--lh-small); color: var(--ink-body); }',
      '.loop-receipt { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: var(--s-8); padding: var(--s-12) 0; border-bottom: 1px solid var(--hairline-inner); outline: none; }',
      '.loop-receipt p, .loop-closed { margin: 0; flex: 1 1 240px; font-size: var(--t-small); line-height: var(--lh-small); color: var(--ink); overflow-wrap: anywhere; }',
      '.loop-receipt-line { margin: 0; padding: 0 0 var(--s-12); border-bottom: 1px solid var(--hairline-inner); font-size: var(--t-small); line-height: var(--lh-meta); color: var(--ink-2); overflow-wrap: anywhere; }',
      '.loop-more { margin: var(--s-12) 0 0; }',
      '@media (max-width: 640px) { .loop-body { padding-left: 0; } .loop-exits .btn-group > .btn-primary { width: 100%; justify-content: center; } }',
      '@media (prefers-reduced-motion: reduce) { .loop-head .chev { transition: none; } }',
    ].join('\n');
    const el = document.createElement('style');
    el.id = 'loop-style';
    el.textContent = css;
    (document.head || document.documentElement).appendChild(el);
  }
})();
