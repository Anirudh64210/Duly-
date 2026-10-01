/* components/value.js: Round 4: sample mark, promise, pillars, facts, STEM field, the jobs ask. */

(function () {
  'use strict';

  const C = window.C;
  const { esc, escText, raw, cls, row, info } = C;

  /* ---------------------------------------------------------------- */
  /* Round 4: the value a student gets (VALUE.md)                       */
  /* ---------------------------------------------------------------- */

  const SAMPLE = () => window.DULY_SAMPLE || {};
  const APP = () => window.App || {};

  /* sampleMark() : a quiet "Sample" beside a figure the prototype makes up
     (H-1B counts, processing times). Small caps, like "Your school". */
  function sampleMark() { return '<span class="mark is-sample">Sample</span>'; }

  /* promise(p = DULY_SAMPLE.promise, { subline = true, cls? }) : the one-line
     promise and its subline. Once on Welcome, once under the Home title,
     nowhere else. On Home it can also go in as C.hero({ subline: promise.line }). */
  function promise(p, o) {
    const pr = p || SAMPLE().promise || {};
    const opt = o || {};
    return '<div class="' + cls('promise', opt.cls) + '"><p class="promise-line t-lead">' + escText(pr.line) + '</p>' +
      (opt.subline !== false && pr.subline ? '<p class="promise-sub t-meta">' + escText(pr.subline) + '</p>' : '') + '</div>';
  }

  /* pillars(items = DULY_SAMPLE.pillars, { lines = true }) : the three pillars,
     three columns on a wide window, stacked on a phone. lines: false keeps
     titles only and puts each line behind an ⓘ. */
  function pillars(items, o) {
    const list = items || SAMPLE().pillars || [];
    const opt = o || {};
    return '<ul class="pillars">' + list.map((p) => '<li class="pillar">' +
      '<p class="t-row">' + escText(p.title) + (opt.lines === false ? info(p.line) : '') + '</p>' +
      (opt.lines === false ? '' : '<p class="t-meta">' + escText(p.line) + '</p>') + '</li>').join('') + '</ul>';
  }

  /* fact({ key?, title, value?, meta?, source?, info?, sample?, content? (html), href?, trailing? (html), cls? })
     One public or computed fact with where it came from: a row whose meta
     names the source and its date ("E-Verify Employer Search · checked Sep 30"),
     the value on the right, the source mark after it. sample: true adds the
     "Sample" mark after the title. content makes it a disclosure (e.g. the
     H-1B years). Wrap facts in C.list([...], { accordion: false }). */
  function fact(p) {
    const marks = p.sample ? ' <span class="marks">' + sampleMark() + '</span>' : '';
    return row({
      key: p.key, cls: cls('fact', p.cls),
      title: raw(escText(p.title) + marks),
      meta: p.meta, value: p.value, source: p.source, info: p.info,
      content: p.content, href: p.href, trailing: p.trailing,
    });
  }

  /* stemField(sf = App.stemField(), { key? }) : the STEM field from the I-20's
     field code (CIP). One item; wrap it in C.list.
       found      "Your I-20 lists field code 11.0701, Computer Science." with
                  That matches (confirms, in place) and Fix it (opens the I-20)
       confirmed  "Your I-20's field code, 11.0701, is on the STEM list." with
                  the list's date and the source mark
     A fact, never a verdict about the student. */
  function stemField(s, o) {
    const sf = s || (APP().stemField ? APP().stemField() : SAMPLE().stemField) || {};
    const key = (o && o.key) || 'stem-field';
    if (sf.state === 'found') {
      return '<div class="item ask stem-field" data-key="' + esc(key) + '" data-stem-field-wrap><div class="row is-static"><span class="row-text">' +
        '<span class="row-title">' + escText(sf.foundTitle) + '</span>' +
        '<span class="row-meta">' + escText('Read from your I-20') + '</span>' +
        '<span class="ask-actions">' +
        '<button type="button" class="btn btn-pill" data-stem-field="confirm">' + esc(sf.confirmLabel || 'That matches') + '</button>' +
        '<a class="btn btn-text" href="#/documents/i20">' + esc(sf.changeLabel || 'Fix it') + '</a>' +
        '</span></span><span class="row-trail">' + info(sf.info, { inline: false }) + '</span></div></div>';
    }
    return fact({
      key: key, title: sf.line,
      meta: [sf.from ? 'From your I-20' : '', sf.listDate ? 'list dated ' + sf.listDate : '', sf.checked ? 'checked ' + sf.checked : ''].filter(Boolean).join(' · '),
      source: 'stemList',
      sample: !sf.saved,
    });
  }

  /* jobsAsk(u = App.unemployment(), { key? }) : the one place to start the
     unemployment count (analysis move 7.2). One item; wrap it in C.list.
       ask, a job on file   "Northwind Systems, since Feb 27, 2026. Is that every
                            job on your OPT?"  Yes, that's every job · Add another job
       ask, no job on file  "Have you had a job on your OPT yet?"
                            I haven't had a job yet · Add your job
       every / none         one quiet line, "That's every job, as of Sep 30.", Change
     The answer is App.state.jobsComplete ('every' | 'none'); app.js redraws
     the column in place once it is given, so every count on the page updates. */
  function jobsAsk(uu, o) {
    const u = uu || (APP().unemployment ? APP().unemployment() : null) || {};
    const a = u.ask || {};
    const key = (o && o.key) || 'jobs-complete';
    if (u.state === 'every' || u.state === 'none') {
      return '<div class="item jobs-line" data-key="' + esc(key) + '"><div class="row is-static"><span class="row-text">' +
        '<span class="row-title">' + escText(u.state === 'none' ? u.noneLine : u.everyLine) + '</span></span>' +
        '<span class="row-trail"><button type="button" class="btn btn-text is-small" data-jobs="change">Change</button></span></div></div>';
    }
    const withJob = !!u.hasJob;
    const primary = '<button type="button" class="btn btn-pill" data-answer="jobsComplete" data-value="' + (withJob ? 'every' : 'none') + '">' +
      esc(withJob ? a.every : a.none) + '</button>';
    const other = '<a class="btn btn-text" href="' + esc(a.href || '#/case/jobs') + '">' + esc(withJob ? a.another : a.addJob) + '</a>';
    return '<div class="item ask jobs-ask" data-key="' + esc(key) + '"><div class="row is-static"><span class="row-text">' +
      '<span class="row-title">' + escText(withJob ? a.jobTitle : a.noJobTitle) + '</span>' +
      '<span class="ask-actions">' + primary + other + '</span>' +
      '</span><span class="row-trail">' + info(a.info, { inline: false }) + '</span></div></div>';
  }

  Object.assign(C, { sampleMark, promise, pillars, fact, stemField, jobsAsk });
  Object.assign(C._, { APP, SAMPLE });
})();
