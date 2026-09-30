/* Updates (Note 3, Note 11). Rule changes and news for this student's
   status. Every item opens its own page, in plain words, and every row shows
   the "affects you?" answer inline.
   Routes:
     #/updates          the list: For your status, then In the news, then a
                        quiet "How updates reach you"
     #/updates/<id>     one item (App.findUpdate): what is happening, does
                        this affect you, anything to do, what changed in your
                        checklist, the source tucked away, and a back link
     #/updates/empty    both empty states
   Data: DULY_SAMPLE.updates.items. A rule change that touched a step lists
   it in item.changed; that step shows "Updated <date>" in its checklist. */
(function () {
  'use strict';

  const e = (s) => C.esc(s);

  /* Layout only. Type sizes come from system.css. */
  const STYLE = '<style>' +
    '.screen-updates .up-text { display: flex; flex-direction: column; gap: var(--s-8); }' +
    '.screen-updates .up-answer { color: var(--ink); }' +
    '.screen-updates .up-quiet { margin-top: var(--s-12); }' +
    '.screen-updates .up-actions { margin-top: var(--s-16); }' +
    '</style>';

  /* The eyebrow already names the group, so a leading "In the news · " or
     "For your status · " is dropped from the meta. */
  function metaWithout(item) {
    const m = item.meta || '';
    const label = (item.label || '').toLowerCase();
    const parts = m.split(' · ');
    if (label && parts.length > 1 && parts[0].toLowerCase() === label) parts.shift();
    return parts.join(' · ');
  }

  /* escText keeps I-765, F-1 and the like whole on a phone. */
  function paras(list, cls) {
    return '<div class="up-text">' + (list || []).map((t) => '<p class="' + (cls || 't-body') + '">' + C.escText(t) + '</p>').join('') + '</div>';
  }

  /* How a change reaches the student. Plain words for the updates-1
     pipeline: sources watched, drafted from the source with its quote,
     checked, approved by a person, then every case worked out again. */
  const HOW = [
    'USCIS, the Federal Register and the courts are watched every day, along with the news for your status.',
    'A rule change is written up from its source with the exact words, checked twice and approved by a person before it reaches you.',
    'Then your dates and checklists are worked out again from the new rule. A step that changed shows when it was updated, and the update appears here without you asking.',
  ];

  /* The answer for this student (affects, and anything to do) comes from
     C.affectsFor, the same call Home's rows use. After a No to STEM OPT the
     fee answer is a plain No with nothing to do (data.js byIntent). */

  /* ---------------- the list ---------------- */

  function listPage(data, empty) {
    const items = empty ? [] : ((data.updates && data.updates.items) || []);
    const rules = items.filter((u) => u.kind === 'rule');
    const news = items.filter((u) => u.kind !== 'rule');
    const rowFor = (u) => C.updateRow(u, { meta: metaWithout(u) });

    const status = C.section({
      eyebrow: 'For your status',
      content: rules.length ? C.list(rules.map(rowFor), { accordion: false, label: 'For your status' })
        : C.empty({ text: data.updates.emptyStatus }),
    });
    const inNews = C.section({
      eyebrow: 'In the news',
      content: news.length ? C.list(news.map(rowFor), { accordion: false, label: 'In the news' })
        : C.empty({ text: data.updates.emptyNews }),
    });
    const how = C.section({
      content: C.list([C.row({
        key: 'how',
        title: 'How updates reach you',
        meta: 'Your steps change when a rule does',
        content: C.disclosure({ text: HOW }),
      })], { label: 'How updates reach you' }),
    });

    return C.pageHeader({
      title: 'Updates',
      meta: data.checked.today,
      subline: 'Rule changes and news for your status, and whether each one affects you.',
    }) + status + inNews + how;
  }

  /* ---------------- one item ---------------- */

  function sourceLink(src) {
    if (!src) return '';
    if (src.href && /^https?:/.test(src.href)) {
      return '<a class="disc-link" href="' + e(src.href) + '" target="_blank" rel="noopener">' + e(src.label) + '</a>';
    }
    /* Prototype: the saved link is not filled in yet, so say where it would open. */
    return '<button type="button" class="link disc-link" data-toast="Opens in your browser">' + e(src.label || 'Open the source') + '</button>';
  }

  /* True when she came here from a page that shows this step (its checklist,
     or for STEM OPT What's next and Timeline, which list the same steps), so
     the row goes back there, to the step she tapped, instead of opening a
     new page on top and starting a loop. */
  function cameFromChecklist(data, path) {
    const from = window.App && App.from && App.from.hash;
    if (!from) return false;
    if (from === '#/checklists/' + path) return true;
    if (path === 'stem' && /^#\/(next|timeline)(\/|$)/.test(from)) return true;
    if (from !== '#/checklists') return false;
    const last = App.state && App.state['checklists:path'];
    return (last || (data.checklists && data.checklists.selected) || 'stem') === path;
  }

  function detailPage(data, item) {
    const u = item;
    const changed = u.changed || [];

    const what = C.section({ eyebrow: 'What is happening', content: paras(u.what) });

    /* The same answer as the rows, following the STEM OPT plan she gave. */
    const ans = C.affectsFor(u);
    const affectsSec = C.section({ eyebrow: 'Does this affect you', content: paras([ans.line], 't-row up-answer') });

    const changedHrefs = changed.map((c) => '#/checklists/' + c.path);
    const extraLink = u.link && changedHrefs.indexOf(u.link.href) === -1
      ? '<div class="up-actions">' + C.button({ label: u.link.label, kind: 'pill', href: u.link.href }) + '</div>' : '';
    const todo = C.section({ eyebrow: 'Anything to do', content: paras([ans.todo]) + extraLink });

    /* What changed in your checklist: each step a rule change touched, with
       the same "Updated" mark it carries in the checklist. */
    let changedBody;
    if (changed.length) {
      changedBody = C.list(changed.map((c) => {
        const back = cameFromChecklist(data, c.path);
        const html = C.row({
          key: 'changed:' + c.step,
          title: C.raw(C.escText(c.title) + ' <span class="marks">' + C.updatedMark({ date: c.date }) + '</span>'),
          meta: c.change,
          href: back ? App.from.hash : '#/checklists/' + c.path,
        });
        /* data-back: app.js turns the click into history.back(), which
           brings the checklist back at the updated step. */
        return back ? html.replace('<a class="row"', '<a class="row" data-back') : html;
      }), { accordion: false, label: 'What changed in your checklist' }) +
        (u.checked ? '<p class="t-meta up-quiet">' + e(u.checked) + '</p>' : '');
    } else {
      changedBody = paras([u.checked || 'Nothing in your checklist changed.']);
    }
    const changedSec = C.section({ eyebrow: 'What changed in your checklist', content: changedBody });

    /* The source, tucked away in one closed row. */
    const src = u.source || {};
    const rule = src.rule ? C.getRule(src.rule) : null;
    const srcSec = C.section({
      content: C.list([C.row({
        key: 'source',
        title: 'Source',
        meta: src.name,
        content: (rule && rule.plain ? '<p>' + e(rule.plain) + '</p>' : '') +
          (rule && rule.quote ? '<p>“' + e(rule.quote) + '”</p>' : '') +
          sourceLink(src),
      })], { label: 'Source' }),
    });

    return C.pageHeader({
      back: { label: 'Updates', href: '#/updates' },
      eyebrow: u.label,
      title: u.title,
      subline: metaWithout(u),
    }) + what + affectsSec + todo + changedSec + srcSec;
  }

  window.SCREENS['updates'] = {
    title: 'Updates',
    titleFor(params) {
      const u = params[0] && App.findUpdate(params[0]);
      return u ? u.title : 'Updates';
    },
    render(data, params) {
      const id = params[0];
      const u = id && id !== 'empty' ? App.findUpdate(id) : null;
      const body = u ? detailPage(data, u) : listPage(data, id === 'empty');
      return STYLE + body + C.footer(data.updates.footer);
    },
    mount(root) {
      root.classList.add('screen-updates');
    },
  };
})();
