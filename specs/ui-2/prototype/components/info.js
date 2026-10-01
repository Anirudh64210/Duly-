/* components/info.js: The source mark, the info mark and their popover. */

(function () {
  'use strict';

  const C = window.C;
  const { esc, escText, cls, attrs, uid, icon } = C;
  const { hrefAttrs } = C._;

  /* ---------------------------------------------------------------- */
  /* Source mark and popover                                            */
  /* ---------------------------------------------------------------- */

  const registry = {};
  /* source(keyOrRule, { inline? }) : the small source mark, a 16px glyph with no
     visible word. Its accessible name is 'Source: <rule name>'. keyOrRule is a key
     into DULY_SAMPLE.sources or a rule object. */
  function source(ref, o) {
    let key = ref;
    if (ref && typeof ref === 'object') { key = uid('src'); registry[key] = ref; }
    const rule = getRule(key);
    const name = 'Source' + (rule && rule.name ? ': ' + rule.name : '');
    return '<button type="button" class="' + cls('src', o && o.inline && 'inline-src') + '" data-source="' + esc(key) + '" aria-haspopup="dialog" aria-expanded="false" aria-label="' + esc(name) + '" title="' + esc(name) + '">' +
      icon('source') + '</button>';
  }
  function getRule(key) {
    return registry[key] || ((window.DULY_SAMPLE && window.DULY_SAMPLE.sources) || {})[key] || null;
  }

  /* info(text, { label?, link? {label, href}, inline = true }) : the ⓘ for an
     explanation (Round 3). The same 16px glyph as the source mark; a tap opens
     a small popover (a sheet on a phone) with the text alone, and the link if
     given. Use it wherever a line would otherwise explain something: the
     screen stays self-explanatory and the why is one tap away. Keep text to
     one or two short sentences. inline: false for a trailing column. */
  const infoKeys = {};
  function info(text, o) {
    if (!text) return '';
    const opt = o || {};
    const sig = String(text) + '|' + (opt.link ? opt.link.href : '');
    let key = infoKeys[sig];
    if (!key) {
      key = uid('info');
      infoKeys[sig] = key;
      registry[key] = { info: true, plain: String(text), link: opt.link || null };
    }
    const name = opt.label || 'More about this';
    return '<button type="button" class="' + cls('src is-info', opt.inline !== false && 'inline-src') + '" data-source="' + esc(key) + '" aria-haspopup="dialog" aria-expanded="false" aria-label="' + esc(name) + '" title="' + esc(name) + '">' +
      icon('source') + '</button>';
  }

  /* how(refs, { label? }) : Round 7, rule 2. The one ⓘ an opened item
     carries, at its bottom: the glyph and "How this was counted" as one
     quiet button. Its popover lists every source behind the item, each
     with its name, its plain line, how it was counted and its link. refs
     are source keys or rule objects; repeats are dropped. */
  function how(refs, o) {
    const seen = [];
    const rules = [];
    (refs || []).forEach((ref) => {
      if (!ref) return;
      const rule = typeof ref === 'object' ? ref : getRule(ref);
      if (!rule || seen.indexOf(rule) >= 0 || (typeof ref === 'string' && seen.indexOf(ref) >= 0)) return;
      seen.push(rule);
      if (typeof ref === 'string') seen.push(ref);
      rules.push(rule);
    });
    if (!rules.length) return '';
    const label = (o && o.label) || 'How this was counted';
    const key = uid('how');
    registry[key] = { multi: true, title: label, rules: rules };
    return '<button type="button" class="how-btn" data-source="' + esc(key) + '" aria-haspopup="dialog" aria-expanded="false">' +
      '<span class="src is-info" aria-hidden="true">' + icon('source') + '</span><span>' + esc(label) + '</span></button>';
  }

  function oneSource(rule) {
    const counted = rule.counted && rule.counted.length ? rule.counted.map((c) => '<p class="pop-plain">' + esc(c) + '</p>').join('') : '';
    return '<div class="pop-src">' +
      '<p class="pop-name">' + esc(rule.name || '') + '</p>' +
      (rule.plain ? '<p class="pop-plain">' + esc(rule.plain) + '</p>' : '') + counted +
      ((rule.link || rule.checked) ? '<div class="pop-foot">' + (rule.link ? '<a' + attrs(hrefAttrs(rule.link.href)) + '>' + esc(rule.link.label) + '</a>' : '<span></span>') +
        '<span class="t-micro">' + esc(rule.checked || '') + '</span></div>' : '') +
      '</div>';
  }

  /* popover(rule, id) : rule { name, plain?, quote?, counted?: string[], link {label, href}, checked }
     or an info entry { info: true, plain, link? } drawn as the text alone,
     or a list from how() { multi: true, title, rules }. */
  function popover(rule, id) {
    if (rule.multi) {
      return '<div class="pop is-multi" id="' + id + '" role="dialog" aria-label="' + esc(rule.title) + '" tabindex="-1">' +
        '<p class="t-eyebrow">' + esc(rule.title) + '</p>' + rule.rules.map(oneSource).join('') + '</div>';
    }
    if (rule.info) {
      return '<div class="pop is-info" id="' + id + '" role="dialog" aria-label="More about this" tabindex="-1">' +
        '<p class="pop-plain">' + escText(rule.plain) + '</p>' +
        (rule.link ? '<div class="pop-foot"><a' + attrs(hrefAttrs(rule.link.href)) + '>' + esc(rule.link.label) + '</a></div>' : '') +
        '</div>';
    }
    const nameId = id + '-name';
    const counted = rule.counted && rule.counted.length
      ? '<div class="pop-counted"><h3>How it was counted</h3>' + rule.counted.map((c) => '<p>' + esc(c) + '</p>').join('') + '</div>' : '';
    const quoteLong = rule.quote && rule.quote.length > 220;
    /* D74: "From your paper", the field read off a paper beside the date it
       fed, under How it was counted. */
    const all = (window.DULY_SAMPLE && window.DULY_SAMPLE.sources) || {};
    const key = Object.keys(all).filter((k) => all[k] === rule)[0];
    const paper = key && window.App && App.fromPaper && C.fromPaper ? C.fromPaper(App.fromPaper(key)) : '';
    return '<div class="pop" id="' + id + '" role="dialog" aria-labelledby="' + nameId + '" tabindex="-1">' +
      '<p class="t-eyebrow">The rule</p>' +
      '<p class="pop-name" id="' + nameId + '">' + esc(rule.name) + '</p>' +
      (rule.plain ? '<p class="pop-plain">' + esc(rule.plain) + '</p>' : '') +
      (rule.quote ? '<blockquote class="pop-quote" style="margin:0">“' + esc(rule.quote) + '”</blockquote>' +
        (quoteLong ? '<button type="button" class="link pop-more" data-show-all>Show all</button>' : '') : '') +
      counted + paper +
      '<div class="pop-foot">' + (rule.link ? '<a' + attrs(hrefAttrs(rule.link.href)) + '>' + esc(rule.link.label) + '</a>' : '<span></span>') +
      '<span class="t-micro">' + esc(rule.checked || '') + '</span></div>' +
      '</div>';
  }

  Object.assign(C, { source, getRule, popover, info, how });

  if (typeof document !== 'undefined' && !document.getElementById('how-style')) {
    const el = document.createElement('style');
    el.id = 'how-style';
    el.textContent = [
      '.how-btn { display: inline-flex; align-items: center; gap: var(--s-8); align-self: flex-start; padding: var(--s-4) 0; min-height: 32px; background: none; border: 0; font: inherit; font-size: var(--t-small); line-height: var(--lh-meta); color: var(--ink-3); cursor: pointer; }',
      '.how-btn:hover, .how-btn:focus-visible { color: var(--ink-2); }',
      '.how-btn:hover .src, .how-btn:focus-visible .src { color: var(--ink-2); }',
      '.how-btn[aria-expanded="true"], .how-btn[aria-expanded="true"] .src { color: var(--accent); }',
      '.how-btn:focus-visible { outline: none; box-shadow: var(--focus-ring); border-radius: var(--r-nav); }',
      '.how-btn .src::after { display: none; }',
      '.pop.is-multi { gap: var(--s-12); max-height: 60vh; overflow-y: auto; }',
      '.pop.is-multi .pop-src { display: flex; flex-direction: column; gap: var(--s-4); }',
      '.pop.is-multi .pop-src + .pop-src { padding-top: var(--s-12); border-top: 1px solid var(--hairline-inner); }',
      '.pop.is-multi .pop-plain { margin-top: 0; }',
      '.pop.is-multi .pop-foot { padding-top: 0; }',
    ].join('\n');
    (document.head || document.documentElement).appendChild(el);
  }
})();
