/* components/ask.js: Ask, drawn (BLUEPRINT 3.3; D76, D77).

   Ask is one field at the top of every page, in the same place always
   (Cmd K or Ctrl K puts the cursor in it). A question opens the answer
   panel on the right (from the bottom on a phone): the question, a quiet
   "Thinking", then the answer in plain words and at most two buttons that
   start a guided flow in place. A follow-up field sits at the foot.
   Answers come from the helper (ask_server.py), which works only from the
   dates Duly's engine computed; app/ask.js does the talking.

   Public (every function returns an HTML string):
     C.askBar()                 the field at the top of the content
     C.askAbout({ text, label })  "Ask about this" on a card
     C.askPanel()               the panel's frame
     C.askTurn(turn, loopsHtml) one question and what came back
   Behaviour is wired once in app/ask.js by data attributes:
     data-askbar / data-askbar-q   the top field (submit asks)
     data-ask-open="<text>"        opens the panel and asks the text
     data-ask-close                closes it
     data-ask-start="<kind>"       starts that flow in place (data-turn)
     data-ask-retry="<turn>"       asks that question again */

(function () {
  'use strict';

  const C = window.C;
  const { esc, escText, icon } = C;

  /* The words, one stable wording each. */
  const W = {
    label: 'Ask Duly',
    placeholder: 'Ask about your visa, dates or documents',
    placeholderShort: 'Ask anything',
    follow: 'Ask a follow-up',
    thinking: 'Thinking',
    note: 'From your record. Not legal advice.',
    offline: 'Ask is not running on this computer yet.',
    offlineHow: 'In the prototype folder, run',
    offlineCmd: 'python3 ask_server.py',
    offlineThen: 'then ask again.',
    meanwhile: 'Meanwhile, this may help:',
    failed: 'No answer this time.',
    retry: 'Ask again',
    aboutThis: 'Ask about this',
  };

  function askBar() {
    const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
    return '<form class="askbar" role="search" data-askbar>' +
      '<label class="sr-only" for="askbar-q">' + esc(W.label) + '</label>' +
      '<input class="askbar-input" id="askbar-q" type="text" data-askbar-q autocomplete="off" autocapitalize="sentences" spellcheck="true" enterkeyhint="send"' +
      ' placeholder="' + esc(W.placeholder) + '" aria-keyshortcuts="' + (mac ? 'Meta+K' : 'Control+K') + '">' +
      '<kbd class="askbar-key" aria-hidden="true">' + (mac ? '⌘K' : 'Ctrl K') + '</kbd>' +
      '</form>';
  }

  function askAbout(p) {
    const o = p || {};
    return '<button type="button" class="btn btn-text is-small is-quiet ask-about" data-ask-open="' + esc(o.text || '') + '">' +
      esc(o.label || W.aboutThis) + '</button>';
  }

  function askPanel() {
    return '<div class="sheet-top ask-top"><h2 class="sr-only" id="sheet-title" tabindex="-1">' + esc(W.label) + '</h2>' +
      '<button type="button" class="sheet-x" data-ask-close aria-label="Close">' + icon('close') + '</button></div>' +
      '<div class="sheet-body ask-body"><div class="ask-thread" data-ask-thread></div>' +
      '<p class="sr-only" role="status" aria-live="polite" data-ask-live></p></div>' +
      '<div class="sheet-foot ask-foot">' +
      '<form class="ask-follow" data-ask-form><label class="sr-only" for="ask-q">' + esc(W.follow) + '</label>' +
      '<input class="input" id="ask-q" type="text" data-ask-q autocomplete="off" autocapitalize="sentences" enterkeyhint="send" placeholder="' + esc(W.follow) + '"></form>' +
      '<p class="t-meta ask-note">' + esc(W.note) + '</p></div>';
  }

  /* The answer's paragraphs; a quoted question for the DSO stays in its
     paragraph. */
  function paras(text) {
    return String(text || '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
      .map((p) => '<p>' + escText(p).replace(/\n/g, '<br>') + '</p>').join('');
  }
  function actions(t) {
    if (!t.actions || !t.actions.length || (t.loopIds && t.loopIds.length)) return '';
    return '<div class="btn-group ask-acts">' + t.actions.map((a, i) =>
      '<button type="button" class="btn ' + (i === 0 ? 'btn-pill is-lead' : 'btn-pill') + '" data-ask-start="' + esc(a.kind) + '" data-turn="' + esc(t.id) + '">' + esc(a.label) + '</button>').join('') + '</div>';
  }

  /* turn: { id, q, state: thinking|answer|offline|failed|crisis, answer,
     actions: [{ kind, label }], error, loopIds } */
  function askTurn(t, loopsHtml) {
    let body = '';
    if (t.state === 'thinking') {
      body = '<p class="ask-thinking"><span>' + esc(W.thinking) + '</span><i></i><i></i><i></i></p>';
    } else if (t.state === 'answer') {
      body = '<div class="ask-a">' + paras(t.answer) + '</div>' + actions(t);
    } else if (t.state === 'offline') {
      body = '<div class="ask-a"><p>' + esc(W.offline) + ' ' + esc(W.offlineHow) + ' <code>' + esc(W.offlineCmd) + '</code>, ' + esc(W.offlineThen) + '</p>' +
        (t.actions && t.actions.length && !(t.loopIds && t.loopIds.length) ? '<p class="t-meta">' + esc(W.meanwhile) + '</p>' : '') + '</div>' +
        actions(t) +
        '<div class="btn-group"><button type="button" class="btn btn-text" data-ask-retry="' + esc(t.id) + '">' + esc(W.retry) + '</button></div>';
    } else if (t.state === 'failed') {
      body = '<div class="ask-a"><p>' + esc(W.failed) + (t.error ? ' <span class="t-meta">' + escText(t.error) + '</span>' : '') + '</p></div>' +
        '<div class="btn-group"><button type="button" class="btn btn-text" data-ask-retry="' + esc(t.id) + '">' + esc(W.retry) + '</button></div>';
    }
    return '<article class="ask-turn" data-turn-id="' + esc(t.id) + '">' +
      '<p class="ask-q">' + escText(t.q) + '</p>' + body +
      (loopsHtml ? '<div class="ask-loop">' + loopsHtml + '</div>' : '') +
      '</article>';
  }

  Object.assign(C, { askBar, askAbout, askPanel, askTurn });
  Object.defineProperty(C._, 'askWords', { value: W });

  if (typeof document !== 'undefined' && !document.getElementById('ask-style')) {
    const css = [
      /* The field at the top of the content: the column's width, one line. */
      '.askbar { position: relative; width: var(--column); max-width: calc(100% - 64px); margin: var(--s-24) auto 0; display: flex; align-items: center; }',
      '.askbar-input { width: 100%; height: 44px; padding: 0 64px 0 var(--s-16); background: var(--surface); color: var(--ink); border: 1px solid var(--control-border); border-radius: var(--r-field); font: inherit; font-size: var(--t-small); transition: border-color .16s ease; }',
      '.askbar-input::placeholder { color: var(--ink-3); }',
      '.askbar-input:hover { border-color: var(--control-border-hover); }',
      '.askbar-input:focus, .askbar-input:focus-visible { outline: none; border-color: var(--accent); box-shadow: var(--focus-ring); }',
      '.askbar-key { position: absolute; right: var(--s-16); font: inherit; font-size: var(--t-small); color: var(--ink-4); pointer-events: none; }',
      '.askbar-input:focus + .askbar-key { opacity: 0; }',
      '@media (max-width: 640px) { .askbar { width: auto; max-width: none; margin: var(--s-16) var(--s-24) 0; } .askbar-key { display: none; } .askbar-input { padding-right: var(--s-16); } }',
      '@media (max-width: 359px) { .askbar { margin-left: var(--s-16); margin-right: var(--s-16); } }',
      /* The panel. */
      '.ask-sheet { width: 480px; }',
      '.ask-top { justify-content: flex-end; padding-top: var(--s-12); padding-bottom: 0; }',
      '.ask-body { gap: 0; padding-top: 0; }',
      '.ask-thread { display: flex; flex-direction: column; gap: var(--s-24); }',
      '.ask-turn { display: flex; flex-direction: column; gap: var(--s-12); min-width: 0; }',
      '.ask-turn + .ask-turn { padding-top: var(--s-24); border-top: 1px solid var(--hairline); }',
      '.ask-q { font-size: var(--t-medium); font-weight: 600; line-height: var(--lh-medium); letter-spacing: -.01em; color: var(--ink); overflow-wrap: anywhere; }',
      '.ask-a { display: flex; flex-direction: column; gap: var(--s-12); font-size: var(--t-small); line-height: var(--lh-small); color: var(--ink-body); }',
      '.ask-a p { margin: 0; overflow-wrap: anywhere; }',
      '.ask-a code { font: inherit; font-weight: 600; color: var(--ink); background: var(--row-hover); padding: 0 var(--s-4); border-radius: var(--r-tag); white-space: nowrap; }',
      '.ask-acts { margin-top: var(--s-4); }',
      '.ask-acts .btn.is-lead { border-color: var(--accent); color: var(--accent); }',
      '.ask-thinking { display: flex; align-items: center; gap: var(--s-4); color: var(--ink-3); font-size: var(--t-small); line-height: var(--lh-small); }',
      '.ask-thinking span { margin-right: var(--s-4); }',
      '.ask-thinking i { width: 4px; height: 4px; border-radius: 50%; background: var(--ink-4); animation: ask-pulse 1.2s ease-in-out infinite; }',
      '.ask-thinking i:nth-of-type(2) { animation-delay: .2s; } .ask-thinking i:nth-of-type(3) { animation-delay: .4s; }',
      '@keyframes ask-pulse { 0%, 100% { opacity: .3; } 50% { opacity: 1; } }',
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
