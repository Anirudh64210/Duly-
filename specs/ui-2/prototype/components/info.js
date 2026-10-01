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

  /* popover(rule, id) : rule { name, plain?, quote?, counted?: string[], link {label, href}, checked }
     or an info entry { info: true, plain, link? } drawn as the text alone. */
  function popover(rule, id) {
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
    return '<div class="pop" id="' + id + '" role="dialog" aria-labelledby="' + nameId + '" tabindex="-1">' +
      '<p class="t-eyebrow">The rule</p>' +
      '<p class="pop-name" id="' + nameId + '">' + esc(rule.name) + '</p>' +
      (rule.plain ? '<p class="pop-plain">' + esc(rule.plain) + '</p>' : '') +
      (rule.quote ? '<blockquote class="pop-quote" style="margin:0">“' + esc(rule.quote) + '”</blockquote>' +
        (quoteLong ? '<button type="button" class="link pop-more" data-show-all>Show all</button>' : '') : '') +
      counted +
      '<div class="pop-foot">' + (rule.link ? '<a' + attrs(hrefAttrs(rule.link.href)) + '>' + esc(rule.link.label) + '</a>' : '<span></span>') +
      '<span class="t-micro">' + esc(rule.checked || '') + '</span></div>' +
      '</div>';
  }

  Object.assign(C, { source, getRule, popover, info });
})();
