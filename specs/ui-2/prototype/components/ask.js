/* components/ask.js: Ask, drawn (BLUEPRINT 3.3; D76, D77; BRIEF Round 8,
   note 1).

   Ask lives at the bottom of Home (C.askDock, placed by screens/home.js in
   div#ask-dock). A question opens the answer panel on the right (from the
   bottom on a phone). Each answer has one shape, with clear headings and
   short lists:
     the direct answer in a sentence or two;
     What applies to you;
     Your plan: Now, At STEM OPT, After;
     Watch out for;
     Ask your DSO: only the personal judgement, with a draft to copy;
     one quiet line of sources.
   Under it, at most three actions: start a guided flow, "Save to my record"
   for a fact the student stated, or add a goal to Plan. Each action closes
   its own loop in place: a check draws itself, a light tap, a one-line
   receipt with the follow-up. The conversation stays across pages and
   reloads; "New conversation" clears it. app/ask.js does the talking.

   Public (every function returns an HTML string):
     C.askDock({ placeholder? })  the box at the bottom of Home
     C.askBar({ placeholder? })   the field alone
     C.askAbout({ text, label })  "Ask about this" on a card
     C.askPanel()                 the panel's frame
     C.askTurn(turn, loopsHtml)   one question and what came back
   Behaviour is wired once in app/ask.js by data attributes:
     data-askbar / data-askbar-q   the field (submit asks)
     data-ask-open="<text>"        opens the panel; a text is asked
     data-ask-close                closes it
     data-ask-new                  starts a new conversation
     data-ask-act="<i>"            runs action i of a turn (data-turn)
     data-ask-draft="<turn>"        copies that turn's DSO draft
     data-ask-retry="<turn>"       asks that question again */

(function () {
  'use strict';

  const C = window.C;
  const { esc, escText, icon } = C;

  /* The words, one stable wording each. */
  const W = {
    label: 'Ask',
    placeholder: 'Ask about your visa, work, dates or documents',
    follow: 'Ask a follow-up',
    thinking: 'Thinking',
    note: 'From your record and official sources. Not legal advice.',
    offline: 'Ask is not running on this computer yet.',
    offlineHow: 'In the prototype folder, run',
    offlineCmd: 'python3 ask_server.py',
    offlineThen: 'then ask again.',
    meanwhile: 'Meanwhile, this may help:',
    failed: 'No answer this time.',
    interrupted: 'This answer was interrupted.',
    retry: 'Ask again',
    aboutThis: 'Ask about this',
    newConv: 'New conversation',
    open: 'Open',
    last: 'Last asked',
    applies: 'What applies to you',
    plan: 'Your plan',
    now: 'Now',
    stem: 'At STEM OPT',
    after: 'After',
    watch: 'Watch out for',
    dso: 'Ask your DSO',
    draft: 'Draft to send',
    copy: 'Copy',
    sources: 'Sources',
    saveLabel: 'Save to my record',
  };

  function askBar(o) {
    const opt = o || {};
    const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
    return '<form class="askbar" role="search" data-askbar>' +
      '<label class="sr-only" for="askbar-q">' + esc(W.label) + '</label>' +
      '<input class="askbar-input" id="askbar-q" type="text" data-askbar-q autocomplete="off" autocapitalize="sentences" spellcheck="true" enterkeyhint="send"' +
      ' placeholder="' + esc(opt.placeholder || W.placeholder) + '" aria-keyshortcuts="' + (mac ? 'Meta+K' : 'Control+K') + '">' +
      '<kbd class="askbar-key" aria-hidden="true">' + (mac ? '⌘K' : 'Ctrl K') + '</kbd>' +
      '</form>';
  }

  /* The box at the bottom of Home: the field and, while a conversation is
     kept, one quiet line to reopen it or start again. */
  function askDock(o) {
    const opt = o || {};
    const conv = (window.App && App.ask && App.ask.summary) ? App.ask.summary() : null;
    const line = conv && conv.last ?
      '<div class="ask-dock-line">' +
        '<button type="button" class="ask-dock-last" data-ask-open="">' +
          '<span class="ask-dock-k">' + esc(W.last) + '</span><span class="ask-dock-q">' + escText(conv.last) + '</span></button>' +
        '<button type="button" class="btn btn-text is-small is-quiet" data-ask-new>' + esc(W.newConv) + '</button>' +
      '</div>' : '';
    return '<div class="ask-dock" data-ask-dock>' + askBar(opt) + line + '</div>';
  }

  function askAbout(p) {
    const o = p || {};
    return '<button type="button" class="btn btn-text is-small is-quiet ask-about" data-ask-open="' + esc(o.text || '') + '">' +
      esc(o.label || W.aboutThis) + '</button>';
  }

  function askPanel() {
    return '<div class="sheet-top ask-top"><h2 class="ask-title" id="sheet-title" tabindex="-1">' + esc(W.label) + '</h2>' +
      '<div class="ask-top-acts"><button type="button" class="btn btn-text is-small is-quiet" data-ask-new>' + esc(W.newConv) + '</button>' +
      '<button type="button" class="sheet-x" data-ask-close aria-label="Close">' + icon('close') + '</button></div></div>' +
      '<div class="sheet-body ask-body"><div class="ask-thread" data-ask-thread></div>' +
      '<p class="sr-only" role="status" aria-live="polite" data-ask-live></p></div>' +
      '<div class="sheet-foot ask-foot">' +
      '<form class="ask-follow" data-ask-form><label class="sr-only" for="ask-q">' + esc(W.follow) + '</label>' +
      '<input class="input" id="ask-q" type="text" data-ask-q autocomplete="off" autocapitalize="sentences" enterkeyhint="send" placeholder="' + esc(W.follow) + '"></form>' +
      '<p class="t-meta ask-note">' + esc(W.note) + '</p></div>';
  }

  /* A check that draws itself (off under reduced motion). */
  const CHECK = '<svg class="ask-check" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const list = (xs) => '<ul class="ask-list">' + xs.map((x) => '<li>' + escText(x) + '</li>').join('') + '</ul>';
  const part = (title, inner) => '<section class="ask-part"><h3 class="ask-h">' + esc(title) + '</h3>' + inner + '</section>';

  /* An older answer (plain text) is shown as paragraphs. */
  function paras(text) {
    return String(text || '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
      .map((p) => '<p>' + escText(p).replace(/\n/g, '<br>') + '</p>').join('');
  }

  function shaped(t) {
    const r = t.parts;
    if (!r) return '<div class="ask-a">' + paras(t.answer) + '</div>';
    let h = r.lead ? '<p class="ask-lead">' + escText(r.lead) + '</p>' : '';
    if (r.applies && r.applies.length) h += part(W.applies, list(r.applies));
    const p = r.plan || {};
    const rows = [['now', W.now], ['stem', W.stem], ['after', W.after]].filter((k) => p[k[0]] && p[k[0]].length);
    if (rows.length) {
      h += part(W.plan, '<div class="ask-plan">' + rows.map((k) =>
        '<div class="ask-phase"><p class="ask-phase-k">' + esc(k[1]) + '</p>' + list(p[k[0]]) + '</div>').join('') + '</div>');
    }
    if (r.watch && r.watch.length) h += part(W.watch, list(r.watch));
    if (r.dso && (r.dso.ask || r.dso.draft)) {
      const copied = t.copied;
      h += part(W.dso, (r.dso.ask ? '<p class="ask-dso">' + escText(r.dso.ask) + '</p>' : '') +
        (r.dso.draft ? '<div class="ask-draft"><p class="ask-draft-k">' + esc(W.draft) + '</p><p class="ask-draft-t">' + escText(r.dso.draft) + '</p>' +
          '<button type="button" class="btn btn-text is-small ask-copy' + (copied ? ' is-done' : '') + '" data-ask-draft="' + esc(t.id) + '">' +
          (copied ? CHECK + '<span>Copied</span>' : esc(W.copy)) + '</button></div>' : ''));
    }
    return '<div class="ask-a">' + h + '</div>';
  }
  /* One quiet line of sources, last, under the actions. */
  function sources(t) {
    const r = t.parts;
    if (!r || !r.sources || !r.sources.length) return '';
    return '<p class="ask-src"><span>' + esc(W.sources) + ': </span>' + r.sources.map((s) =>
      '<a href="' + esc(s.href) + '" target="_blank" rel="noopener">' + esc(s.name) + '</a>').join(', ') + '</p>';
  }

  /* The actions under an answer. A done action becomes its receipt: the
     check, one line, and the follow-up where there is one. */
  function actions(t) {
    const acts = t.actions || [];
    if (!acts.length) return '';
    const flowOpen = t.loopIds && t.loopIds.length;
    const out = acts.map((a, i) => {
      const done = (t.done || {})[i];
      if (done) {
        return '<p class="ask-receipt" data-receipt="' + i + '">' + CHECK + '<span>' + escText(done.text) + '</span>' +
          (done.href ? ' <a class="ask-receipt-link" href="' + esc(done.href) + '">' + esc(done.link) + '</a>' : '') + '</p>';
      }
      if (a.type === 'loop' && flowOpen) return '';
      if (a.type === 'save') {
        return '<button type="button" class="ask-save" data-ask-act="' + i + '" data-turn="' + esc(t.id) + '">' +
          '<span class="ask-save-k">' + esc(W.saveLabel) + '</span><span class="ask-save-f">' + escText(a.fact) + '</span></button>';
      }
      return '<button type="button" class="btn btn-pill' + (a.type === 'loop' ? ' is-lead' : '') + '" data-ask-act="' + i + '" data-turn="' + esc(t.id) + '">' + esc(a.label) + '</button>';
    }).filter(Boolean);
    return out.length ? '<div class="ask-acts">' + out.join('') + '</div>' : '';
  }

  /* turn: { id, q, state: thinking|answer|offline|failed|crisis, parts,
     answer, actions: [{ type, kind|fact|goal, label }], done: { i: {text,
     link?, href?} }, copied, error, loopIds } */
  function askTurn(t, loopsHtml) {
    let body = '';
    if (t.state === 'thinking') {
      body = '<p class="ask-thinking"><span>' + esc(W.thinking) + '</span><i></i><i></i><i></i></p>';
    } else if (t.state === 'answer') {
      body = shaped(t) + actions(t) + sources(t);
    } else if (t.state === 'offline') {
      body = '<div class="ask-a"><p>' + esc(W.offline) + ' ' + esc(W.offlineHow) + ' <code>' + esc(W.offlineCmd) + '</code>, ' + esc(W.offlineThen) + '</p>' +
        (t.actions && t.actions.length && !(t.loopIds && t.loopIds.length) ? '<p class="t-meta">' + esc(W.meanwhile) + '</p>' : '') + '</div>' +
        actions(t) +
        '<div class="btn-group"><button type="button" class="btn btn-text is-small" data-ask-retry="' + esc(t.id) + '">' + esc(W.retry) + '</button></div>';
    } else if (t.state === 'failed') {
      body = '<div class="ask-a"><p>' + esc(t.error === 'interrupted' ? W.interrupted : W.failed) + (t.error && t.error !== 'interrupted' ? ' <span class="t-meta">' + escText(t.error) + '</span>' : '') + '</p></div>' +
        '<div class="btn-group"><button type="button" class="btn btn-text is-small" data-ask-retry="' + esc(t.id) + '">' + esc(W.retry) + '</button></div>';
    }
    return '<article class="ask-turn" data-turn-id="' + esc(t.id) + '">' +
      '<p class="ask-q' + (String(t.q).length > 90 ? ' is-long' : '') + '">' + escText(t.q) + '</p>' + body +
      (loopsHtml ? '<div class="ask-loop">' + loopsHtml + '</div>' : '') +
      '</article>';
  }

  Object.assign(C, { askBar, askDock, askAbout, askPanel, askTurn });
  Object.defineProperty(C._, 'askWords', { value: W });

  if (typeof document !== 'undefined' && !document.getElementById('ask-style')) {
    const css = [
      /* The field. */
      '.askbar { position: relative; width: var(--column); max-width: calc(100% - 64px); margin: var(--s-24) auto 0; display: flex; align-items: center; }',
      '.askbar-input { width: 100%; height: 44px; padding: 0 64px 0 var(--s-16); background: var(--surface); color: var(--ink); border: 1px solid var(--control-border); border-radius: var(--r-field); font: inherit; font-size: var(--t-small); transition: border-color .16s ease; }',
      '.askbar-input::placeholder { color: var(--ink-3); }',
      '.askbar-input:hover { border-color: var(--control-border-hover); }',
      '.askbar-input:focus, .askbar-input:focus-visible { outline: none; border-color: var(--accent); box-shadow: var(--focus-ring); }',
      '.askbar-key { position: absolute; right: var(--s-16); font: inherit; font-size: var(--t-small); color: var(--ink-4); pointer-events: none; }',
      '.askbar-input:focus + .askbar-key { opacity: 0; }',
      '@media (max-width: 640px) { .askbar { width: auto; max-width: none; margin: var(--s-16) var(--s-24) 0; } .askbar-key { display: none; } .askbar-input { padding-right: var(--s-16); } }',
      '@media (max-width: 359px) { .askbar { margin-left: var(--s-16); margin-right: var(--s-16); } }',
      /* The box at the bottom of Home. */
      '.ask-dock { display: flex; flex-direction: column; gap: var(--s-8); min-width: 0; }',
      '.ask-dock .askbar { width: 100%; max-width: none; margin: 0; }',
      '.ask-dock-line { display: flex; align-items: center; justify-content: space-between; gap: var(--s-16); min-width: 0; padding: 0 var(--s-4); }',
      '.ask-dock-last { display: flex; align-items: baseline; gap: var(--s-8); min-width: 0; padding: var(--s-8) 0; border: 0; background: none; font: inherit; font-size: var(--t-small); color: var(--ink-2); text-align: left; cursor: pointer; }',
      '.ask-dock-last:hover .ask-dock-q { color: var(--ink); }',
      '.ask-dock-k { flex: none; color: var(--ink-3); }',
      '.ask-dock-q { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--ink-body); }',
      '.ask-dock-line .btn-text { flex: none; padding: var(--s-8) 0; }',
      '@media (max-width: 480px) { .ask-dock-k { display: none; } }',
      /* The panel. */
      '.ask-sheet { width: 520px; }',
      '.ask-top { padding-top: var(--s-12); padding-bottom: var(--s-8); }',
      '.ask-title { font-size: var(--t-small); font-weight: 600; color: var(--ink-2); }',
      '.ask-top-acts { display: flex; align-items: center; gap: var(--s-16); }',
      '.ask-top-acts .btn-text { padding: var(--s-8) 0; }',
      '.ask-body { gap: 0; padding-top: var(--s-8); }',
      '.ask-thread { display: flex; flex-direction: column; gap: var(--s-32); }',
      '.ask-turn { display: flex; flex-direction: column; gap: var(--s-16); min-width: 0; }',
      '.ask-turn + .ask-turn { padding-top: var(--s-32); border-top: 1px solid var(--hairline); }',
      '.ask-q { font-size: var(--t-medium); font-weight: 600; line-height: var(--lh-medium); letter-spacing: -.01em; color: var(--ink); overflow-wrap: anywhere; }',
      '.ask-q.is-long { font-size: 17px; line-height: 1.45; letter-spacing: 0; }',
      '.ask-a { display: flex; flex-direction: column; gap: var(--s-24); font-size: var(--t-small); line-height: var(--lh-small); color: var(--ink-body); }',
      '.ask-a p { margin: 0; overflow-wrap: anywhere; }',
      '.ask-lead { color: var(--ink); }',
      '.ask-part { display: flex; flex-direction: column; gap: var(--s-8); }',
      '.ask-h { font-size: 13px; font-weight: 600; letter-spacing: .01em; color: var(--ink-3); margin: 0; }',
      '.ask-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--s-8); }',
      '.ask-list li { position: relative; padding-left: var(--s-16); overflow-wrap: anywhere; }',
      '.ask-list li::before { content: ""; position: absolute; left: 2px; top: .66em; width: 4px; height: 4px; border-radius: 50%; background: var(--ink-4); }',
      '.ask-plan { display: flex; flex-direction: column; gap: var(--s-12); }',
      '.ask-phase { display: grid; grid-template-columns: 96px 1fr; gap: var(--s-12); align-items: baseline; }',
      '.ask-phase-k { font-weight: 600; color: var(--ink); }',
      '@media (max-width: 480px) { .ask-phase { grid-template-columns: 1fr; gap: var(--s-4); } }',
      '.ask-dso { color: var(--ink-body); }',
      '.ask-draft { margin-top: var(--s-4); padding: var(--s-12) var(--s-16) var(--s-4); border-radius: var(--r-card); background: var(--surface); border: 1px solid var(--hairline); }',
      '.ask-draft-k { font-size: 13px; color: var(--ink-3); margin-bottom: var(--s-4) !important; }',
      '.ask-draft-t { color: var(--ink); }',
      '.ask-copy { display: inline-flex; align-items: center; gap: var(--s-4); padding: var(--s-8) 0; }',
      '.ask-copy.is-done { color: var(--ink-2); }',
      '.ask-src { font-size: 13px; color: var(--ink-3); }',
      '.ask-src a { color: var(--ink-2); text-decoration: underline; text-decoration-color: var(--hairline); text-underline-offset: 2px; }',
      '.ask-src a:hover { color: var(--accent); }',
      '.ask-a code { font: inherit; font-weight: 600; color: var(--ink); background: var(--row-hover); padding: 0 var(--s-4); border-radius: var(--r-tag); white-space: nowrap; }',
      /* Actions, and the receipt each becomes. */
      '.ask-acts { display: flex; flex-direction: column; align-items: flex-start; gap: var(--s-8); }',
      '.ask-acts .btn.is-lead { border-color: var(--accent); color: var(--accent); }',
      '.ask-save { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; width: 100%; padding: var(--s-12) var(--s-16); border: 1px solid var(--hairline); border-radius: var(--r-card); background: var(--surface); font: inherit; text-align: left; cursor: pointer; transition: border-color .16s ease; }',
      '.ask-save:hover { border-color: var(--control-border); }',
      '.ask-save-k { font-size: var(--t-small); font-weight: 600; color: var(--accent); }',
      '.ask-save-f { font-size: var(--t-small); color: var(--ink-body); }',
      '.ask-receipt { display: flex; align-items: center; flex-wrap: wrap; gap: var(--s-8); margin: 0; padding: var(--s-8) 0; font-size: var(--t-small); color: var(--ink); }',
      '.ask-receipt .ask-check { color: var(--accent); flex: none; }',
      '.ask-receipt-link { color: var(--accent); }',
      '.ask-check path { stroke-dasharray: 16; stroke-dashoffset: 0; }',
      '.is-drawing .ask-check path { animation: ask-draw .34s ease-out both; }',
      '.is-drawing { animation: ask-in .24s ease-out both; }',
      '@keyframes ask-draw { from { stroke-dashoffset: 16; } }',
      '@keyframes ask-in { from { opacity: 0; transform: translateY(2px); } }',
      /* Thinking. */
      '.ask-thinking { display: flex; align-items: center; gap: var(--s-4); color: var(--ink-3); font-size: var(--t-small); line-height: var(--lh-small); }',
      '.ask-thinking span { margin-right: var(--s-4); }',
      '.ask-thinking i { width: 4px; height: 4px; border-radius: 50%; background: var(--ink-4); animation: ask-pulse 1.2s ease-in-out infinite; }',
      '.ask-thinking i:nth-of-type(2) { animation-delay: .2s; } .ask-thinking i:nth-of-type(3) { animation-delay: .4s; }',
      '@keyframes ask-pulse { 0%, 100% { opacity: .3; } 50% { opacity: 1; } }',
      '@media (prefers-reduced-motion: reduce) { .is-drawing, .is-drawing .ask-check path, .ask-thinking i { animation: none !important; } }',
      '.ask-loop { display: flex; flex-direction: column; }',
      '.ask-loop .loop-body { padding-left: 0; }',
      '.ask-foot { display: flex; flex-direction: column; gap: var(--s-8); }',
      '.ask-note { text-align: center; color: var(--ink-4); }',
    ].join('\n');
    const el = document.createElement('style');
    el.id = 'ask-style';
    el.textContent = css;
    (document.head || document.documentElement).appendChild(el);
  }
})();
