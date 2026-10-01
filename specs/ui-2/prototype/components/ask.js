/* components/ask.js: Ask, the assistant's front door (BLUEPRINT 3.3; D76, D77).

   Ask is an entry, not a tab (BLUEPRINT 3.1): a quiet field at the top of
   the sidebar on a laptop (Cmd K or Ctrl K), an Ask button in the phone's
   top bar, a field at the bottom of Today, and "Ask about this" on a card.
   No AI model: app/ask.js matches the words on the device against the
   guides' phrases, the papers, the pages and the dates the engine holds.
   Every question ends somewhere useful: a Situation's loop started in
   place, a paper, a page, what is next, or the step back with the DSO
   question drafted (BOUNDARY, "The step back").

   Public (every function returns an HTML string):
     C.askEntry({ where: 'sidebar'|'top', key? })  the shell's quiet entry
     C.askField({ label? })                       the field-like button for
                                                  Today, slot after the four
     C.askAbout({ text, label? })                 "Ask about this" on a card;
                                                  opens Ask with text filled in
     C.askPanel()                                 the sheet's inside
     C.askResults(found, view)                    the results under the field
   Behaviour is wired once in app/ask.js by data attributes:
     data-ask-open="<text?>"  opens Ask (text is put in the field)
     data-ask-close           closes it
     data-ask-start="<kind>"  starts that Situation's loop in place
     data-ask-back            from a loop back to the results
     data-ask-stepback        shows the step back for the typed words
     data-ask-clear           empties the field and shows every Situation
     data-ask-whatif          opens What if (App.openChange), never saves
   Spacing only from the scale; hairlines, not boxes; no red, no alarms. */

(function () {
  'use strict';

  const C = window.C;
  const { esc, escText, cls, icon } = C;
  const SAMPLE = () => window.DULY_SAMPLE || {};
  const loopsData = () => SAMPLE().loops || {};

  /* The words, kept in one place so each has one stable wording. */
  const W = {
    title: 'Ask',
    entry: 'Ask',
    fieldLabel: 'Ask about a paper, a date or something that happened',
    placeholder: 'For example: I lost my job',
    local: 'Matched on this device. What you type is not saved.',
    situations: 'Situations',
    situationsLine: 'Something that happened. Each step you take is saved to your record.',
    whatIf: 'What if',
    whatIfLine: 'Try a change and see which dates move. Nothing is saved to your record.',
    whatIfButton: 'Try a change without saving',
    papers: 'Papers',
    next: "What's next",
    nextEmpty: 'Nothing open needs you right now.',
    pages: 'Pages',
    noneOfThese: 'Write the question to your DSO instead',
    noGuide: 'No guide in Duly matches these words.',
    stepback: 'This part depends on your own situation, so it is a question for your DSO.',
    stepbackLine: 'The email is drafted from your record. Edit it, then send it yourself.',
    attorney: 'Find an immigration attorney',
    everySituation: 'See every situation',
    back: 'Back to Ask',
    draftOpen: 'Write the question to your DSO',
    aboutThis: 'Ask about this',
  };

  /* askEntry({ where }) : sidebar draws a quiet field with the shortcut;
     top draws a text button for the phone's top bar. */
  function askEntry(p) {
    const o = p || {};
    if (o.where === 'top') {
      return '<button type="button" class="btn btn-text ask-top" data-ask-open="" aria-haspopup="dialog">' + esc(W.entry) + '</button>';
    }
    const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
    const key = o.key || (mac ? '⌘K' : 'Ctrl K');
    return '<button type="button" class="ask-entry" data-ask-open="" aria-haspopup="dialog" aria-keyshortcuts="' + (mac ? 'Meta+K' : 'Control+K') + '">' +
      '<span>' + esc(W.entry) + '</span><kbd>' + esc(key) + '</kbd></button>';
  }

  /* askField({ label? }) : a button drawn like a field, for the bottom of
     Today. It opens the sheet, where the real field is. */
  function askField(p) {
    const o = p || {};
    return '<button type="button" class="ask-field" data-ask-open="" aria-haspopup="dialog">' +
      '<span>' + escText(o.label || W.fieldLabel) + '</span></button>';
  }

  /* askAbout({ text, label? }) : the quiet "Ask about this" on a card. */
  function askAbout(p) {
    const o = p || {};
    return '<button type="button" class="btn btn-text is-small is-quiet ask-about" data-ask-open="' + esc(o.text || '') + '" aria-haspopup="dialog">' +
      esc(o.label || W.aboutThis) + '</button>';
  }

  function askPanel() {
    return '<div class="sheet-top"><h2 class="t-medium" id="sheet-title" tabindex="-1">' + esc(W.title) + '</h2>' +
      '<button type="button" class="sheet-x" data-ask-close aria-label="Close">' + icon('close') + '</button></div>' +
      '<div class="sheet-body ask-body">' +
      '<form class="ask-form field" role="search" data-ask-form>' +
      '<label class="field-label" for="ask-q">' + escText(W.fieldLabel) + '</label>' +
      '<input class="input" id="ask-q" type="search" data-ask-q autocomplete="off" autocapitalize="sentences" spellcheck="true" enterkeyhint="search"' +
      ' placeholder="' + esc(W.placeholder) + '" aria-describedby="ask-local">' +
      '<p class="field-help" id="ask-local">' + esc(W.local) + '</p>' +
      '</form>' +
      '<p class="sr-only" role="status" aria-live="polite" data-ask-live></p>' +
      '<div class="ask-results" data-ask-results></div>' +
      '</div>';
  }

  function row(p) {
    const inner = '<span class="ask-row-text"><span class="t-row">' + escText(p.title) + '</span>' +
      (p.meta ? '<span class="t-meta">' + escText(p.meta) + '</span>' : '') + '</span>' + icon('chevron', { cls: 'chev' });
    if (p.href) return '<a class="ask-row" href="' + esc(p.href) + '" data-ask-go>' + inner + '</a>';
    return '<button type="button" class="ask-row" data-ask-start="' + esc(p.kind) + '">' + inner + '</button>';
  }
  function section(title, body, line) {
    return '<section class="ask-sec"><h3 class="t-eyebrow">' + esc(title) + '</h3>' +
      (line ? '<p class="t-meta ask-line">' + esc(line) + '</p>' : '') + body + '</section>';
  }
  function list(rows) { return '<div class="ask-list">' + rows.join('') + '</div>'; }

  function situationRows(items) {
    return list(items.map((s) => row({ kind: s.kind, title: s.label, meta: s.openLine || null })));
  }

  /* The step back (BOUNDARY): the sentence, the DSO draft (opened), and
     where to find an attorney. The draft carries the student's own words. */
  function stepback(found, view) {
    const d = view.draft || {};
    const c = (loopsData().contacts || {}).attorney || {};
    return '<section class="ask-sec ask-stepback">' +
      (found.none ? '<p class="t-small">' + esc(W.noGuide) + '</p>' : '') +
      '<p class="t-row">' + esc(W.stepback) + '</p>' +
      '<p class="t-meta ask-line">' + esc(W.stepbackLine) + '</p>' +
      C.emailDraft(Object.assign({ key: 'ask', openLabel: W.draftOpen }, d)) +
      '<div class="btn-group">' +
      (c.href ? '<a class="link" href="' + esc(c.href) + '" target="_blank" rel="noopener">' + esc(W.attorney) + '</a>' : '') +
      '</div>' +
      '<div class="btn-group"><button type="button" class="btn btn-text is-quiet" data-ask-clear>' + esc(W.everySituation) + '</button></div>' +
      '</section>';
  }

  /* askResults(found, view)
     found: App.ask.find(text) : { empty, crisis, situations, papers, next, pages, none }
     view:  { mode: 'results'|'loop'|'stepback', loops?: [loop], draft?, nextList? } */
  function askResults(found, view) {
    const v = view || {};
    const f = found || { empty: true };
    if (v.mode === 'loop' && v.loops && v.loops.length) {
      return '<div class="ask-loop">' +
        '<div class="btn-group"><button type="button" class="btn btn-text is-quiet" data-ask-back>' + esc(W.back) + '</button></div>' +
        C.loops(v.loops) +
        '</div>';
    }
    if (f.crisis && v.loops && v.loops.length) {
      /* Crisis is matched first and shown alone: a fixed screen, no dates,
         no verdict (BLUEPRINT 2.7). */
      return '<div class="ask-loop ask-crisis">' + C.loops(v.loops) + '</div>';
    }
    if (f.empty) {
      return section(W.situations, situationRows(f.situations || []), W.situationsLine) +
        section(W.whatIf, '<div class="btn-group"><button type="button" class="btn btn-pill" data-ask-whatif>' + esc(W.whatIfButton) + '</button></div>', W.whatIfLine);
    }
    if (v.mode === 'stepback' || f.none) return stepback(f, v);

    /* The order of BLUEPRINT 3.3: a paper, a date, a page, a Situation. */
    let out = '';
    if (f.papers && f.papers.length) out += section(W.papers, list(f.papers.map(row)));
    if (f.next) {
      const n = v.nextList || { loops: [] };
      out += section(W.next, n.loops.length ? C.loops(n.loops, { more: n.more }) : '<p class="t-meta">' + esc(W.nextEmpty) + '</p>');
    }
    if (f.pages && f.pages.length) out += section(W.pages, list(f.pages.map((p) => row({ title: p.label, href: p.href }))));
    if (f.situations && f.situations.length) out += section(W.situations, situationRows(f.situations), W.situationsLine);
    out += '<div class="btn-group ask-none"><button type="button" class="btn btn-text" data-ask-stepback>' + esc(W.noneOfThese) + '</button></div>';
    return out;
  }

  Object.assign(C, { askEntry, askField, askAbout, askPanel, askResults });
  Object.defineProperty(C._, 'askWords', { value: W });

  /* Styles for Ask, from the system tokens. */
  if (typeof document !== 'undefined' && !document.getElementById('ask-style')) {
    const css = [
      '.ask-entry { display: flex; align-items: center; gap: var(--s-8); width: 100%; min-height: 36px; margin: 0 0 var(--s-24); padding: 0 var(--s-12); background: var(--surface); color: var(--ink-3); border: 1px solid var(--hairline); border-radius: var(--r-field); font: inherit; font-size: var(--t-small); line-height: var(--lh-meta); text-align: left; cursor: pointer; transition: border-color .16s ease; }',
      '.ask-entry:hover { border-color: var(--control-border-hover); color: var(--ink-2); }',
      '.ask-entry:focus-visible { outline: none; box-shadow: var(--focus-ring); }',
      '.ask-entry kbd { margin-left: auto; font: inherit; color: var(--ink-4); }',
      '@media (pointer: coarse) { .ask-entry { min-height: 44px; } }',
      '.ask-top { padding: var(--s-12) 0; }',
      '.ask-field { display: flex; align-items: center; width: 100%; min-height: 44px; padding: 0 var(--s-16); background: var(--surface); color: var(--ink-3); border: 1.5px solid var(--control-border); border-radius: var(--r-field); font: inherit; font-size: var(--t-small); line-height: var(--lh-meta); text-align: left; cursor: text; transition: border-color .16s ease; }',
      '.ask-field:hover { border-color: var(--control-border-hover); }',
      '.ask-field:focus-visible { outline: none; border-color: var(--accent); box-shadow: var(--focus-ring); }',
      '.ask-field span { overflow-wrap: anywhere; }',
      '.ask-body { gap: var(--s-24); }',
      '.ask-form .field-help { margin-bottom: 0; }',
      '.ask-results { display: flex; flex-direction: column; gap: var(--s-32); min-width: 0; }',
      '.ask-sec { display: flex; flex-direction: column; gap: var(--s-8); min-width: 0; }',
      '.ask-sec > .t-eyebrow { margin: 0; }',
      '.ask-line { margin: 0 0 var(--s-4); }',
      '.ask-list { display: flex; flex-direction: column; }',
      '.ask-row { display: flex; align-items: center; gap: var(--s-12); width: 100%; min-height: 48px; padding: var(--s-12) 0; background: none; border: 0; border-top: 1px solid var(--hairline-inner); color: var(--ink); font: inherit; text-align: left; cursor: pointer; }',
      '.ask-list > .ask-row:last-child { border-bottom: 1px solid var(--hairline-inner); }',
      '.ask-row:hover .t-row { color: var(--accent); }',
      '.ask-row:focus-visible { outline: none; box-shadow: var(--focus-ring); border-radius: var(--r-nav); }',
      '.ask-row-text { display: flex; flex-direction: column; min-width: 0; flex: 1; }',
      '.ask-row .t-row, .ask-row .t-meta { overflow-wrap: anywhere; }',
      '.ask-row .chev { flex: none; width: 14px; height: 14px; color: var(--ink-3); }',
      '.ask-stepback { gap: var(--s-12); }',
      '.ask-stepback > p { margin: 0; }',
      '.ask-stepback .draft { align-self: stretch; }',
      '.ask-none { margin-top: calc(-1 * var(--s-16)); }',
      '.ask-loop { display: flex; flex-direction: column; gap: var(--s-8); }',
      '.ask-loop .loop-body { padding-left: 0; }',
    ].join('\n');
    const el = document.createElement('style');
    el.id = 'ask-style';
    el.textContent = css;
    (document.head || document.documentElement).appendChild(el);
  }
})();
