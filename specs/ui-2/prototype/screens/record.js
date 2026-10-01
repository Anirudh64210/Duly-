/* Your record (#/record): the student's journey in about six milestones,
   oldest first (founder review, Oct 1). Each is one line, its name and its
   dates, and opens in place to a few facts and its papers. No loop events,
   no filters, no year headings; Updates live in their own page (#/updates).

   Every date is read from the record (App.record(), data.js records) and
   from the papers (data.documents); nothing is typed here. Copy is in
   data.js journey. Priya on Sep 30, 2026:
     Arrived in the US          Aug 2023 (I-94, month only)
     Master's in Computer Science  Aug 21, 2023 to Dec 18, 2025
     CPT                        Jun 1, 2024 to May 2, 2025 (Acme Robotics,
                                then Lumen Labs)
     OPT                        Feb 14, 2026 to Feb 13, 2027 (the card)
     Job at Northwind Systems   Since Feb 27, 2026
     Now                        Sep 30, 2026
   A STEM OPT milestone shows once the record has its recommendation, its
   filing or its card; an H-1B one once a petition is saved; each job has
   its own.

   Routes:
     #/record          the page
     #/record/empty    nothing in it yet (review only) */
(function () {
  'use strict';

  const e = (s) => C.esc(s);
  const J = () => App.data.journey || {};

  const STYLE = '<style>' +
    '.screen-record .page-header { margin-bottom: var(--s-24); }' +
    '.screen-record .rec-list .row { padding-top: var(--s-12); padding-bottom: var(--s-12); min-height: 48px; }' +
    '.screen-record .rec-list .item.is-open > .row { padding-bottom: var(--s-8); }' +
    '.screen-record .rec-list .row-value { color: var(--ink-2); }' +
    '.screen-record .rec-list .disc { padding: 0 var(--s-12) var(--s-16); gap: var(--s-4); }' +
    '.screen-record .rec-facts { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--s-4); }' +
    '.screen-record .rec-facts li { font-size: var(--t-small); line-height: var(--lh-small); color: var(--ink-body); }' +
    '.screen-record .rec-papers { margin: var(--s-8) 0 0; display: flex; flex-wrap: wrap; gap: var(--s-4) var(--s-16); }' +
    '.screen-record .rec-papers a { font-size: var(--t-small); font-weight: 600; }' +
    '.screen-record .rec-now .row-title { color: var(--accent); }' +
    '</style>';

  /* ---------------- dates ---------------- */
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const okIso = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
  const today = () => (App.loops && App.loops.now ? App.loops.now() : App.data.today.iso);
  const fmtY = (iso) => App.dates.fmtY(iso);
  const span = (a, b) => (okIso(b) ? fmtY(a) + ' to ' + fmtY(b) : 'Since ' + fmtY(a));
  /* The papers' dates are written for people: "Mar 2, 2026" or "Aug 2023"
     (month only, kept as the month). */
  function parse(text) {
    const t = String(text || '').trim();
    const m = /^([A-Z][a-z]{2}) (\d{1,2}), (\d{4})$/.exec(t);
    if (m && MON.indexOf(m[1]) >= 0) return { iso: m[3] + '-' + String(MON.indexOf(m[1]) + 1).padStart(2, '0') + '-' + m[2].padStart(2, '0'), text: t };
    const n = /^([A-Z][a-z]{2}) (\d{4})$/.exec(t);
    if (n && MON.indexOf(n[1]) >= 0) return { iso: n[2] + '-' + String(MON.indexOf(n[1]) + 1).padStart(2, '0') + '-01', text: t, month: true };
    return null;
  }

  /* ---------------- the papers, by id ---------------- */
  function allDocs(data) {
    const d = data.documents || {};
    const out = [];
    (d.i20Groups || []).forEach((g) => (g.items || []).forEach((it) => out.push(it)));
    ['work', 'identity', 'school'].forEach((k) => (d[k] || []).forEach((it) => out.push(it)));
    return out;
  }
  const docOf = (data, id) => allDocs(data).filter((x) => x.id === id)[0] || null;
  const dateField = (doc, label) => {
    const f = ((doc && doc.dates) || []).filter((d) => d[0] === label)[0];
    return f ? parse(f[1]) : null;
  };

  /* ---------------- the milestones ---------------- */
  const fill = (s, v) => String(s || '').replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? v[k] : m));
  const sampleTag = () => ' <span class="marks">' + C.sampleMark() + '</span>';

  /* milestones(data) : oldest first.
     { key, sort, title, dates, facts: [text | {html}], papers: [id], now? } */
  function milestones(data) {
    const r = App.record();
    const t = today();
    const out = [];
    const add = (m) => { if (m && m.sort && m.sort <= t) out.push(m); };
    const made = r.made || {};

    /* Arrived: the I-94 entry, with the visa and passport. */
    const i94 = dateField(docOf(data, 'i94'), 'Entered');
    const visa = r.visa || {};
    const pass = r.passport || {};
    const arrived = i94 ? i94.iso : (okIso(visa.issued) ? visa.issued : null);
    if (arrived) {
      const facts = [];
      if (i94) facts.push('Entered the US ' + i94.text + ', on your I-94');
      if (okIso(visa.issued)) facts.push({ html: e('F-1 visa issued ' + fmtY(visa.issued) + (okIso(visa.expires) ? ', valid until ' + fmtY(visa.expires) : '')) + (visa.sample ? sampleTag() : '') });
      if (okIso(pass.expires)) facts.push({ html: e('Passport valid until ' + fmtY(pass.expires)) + (pass.sample ? sampleTag() : '') });
      add({ key: 'arrived', sort: arrived, title: J().arrived, dates: i94 ? i94.text : fmtY(arrived), facts: facts,
        papers: ['i94', visa.doc, pass.doc] });
    }

    /* The program. */
    const pg = r.program || {};
    if (okIso(pg.start)) {
      const name = [pg.level, pg.major].filter(Boolean).join(' in ') || 'Your program';
      const facts = [];
      if (pg.school) facts.push(pg.school);
      if (okIso(pg.end)) facts.push((pg.end <= t ? 'Finished ' : 'Ends ') + fmtY(pg.end));
      add({ key: 'program', sort: pg.start, title: name, dates: span(pg.start, pg.end), facts: facts,
        papers: [pg.doc, okIso(pg.end) && pg.end <= t ? 'degree' : null] });
    }

    /* CPT: every placement in one milestone. */
    const cpt = (r.cpt || []).filter((c) => okIso(c.start)).sort((a, b) => (a.start < b.start ? -1 : 1));
    if (cpt.length) {
      const last = cpt.map((c) => c.end).filter(okIso).sort().pop();
      add({ key: 'cpt', sort: cpt[0].start, title: J().cpt, dates: span(cpt[0].start, last),
        facts: cpt.map((c) => c.employer + ', ' + (c.fullTime ? 'full time' : 'part time') + ', ' + span(c.start, c.end).replace(/^Since/, 'since')),
        papers: cpt.map((c) => c.doc) });
    }

    /* OPT: recommended, filed, approved, and the card. */
    const opt = r.opt || {};
    const approved = dateField(docOf(data, 'i797'), 'Approved');
    const optStart = okIso(opt.from) ? opt.from : (okIso(opt.filed) ? opt.filed : opt.recommended);
    if (okIso(optStart)) {
      const facts = [];
      if (okIso(opt.recommended)) facts.push('School recommended ' + fmtY(opt.recommended));
      if (okIso(opt.filed)) facts.push('Filed Form I-765 ' + fmtY(opt.filed) + (opt.receipt ? ', receipt ' + opt.receipt : ''));
      if (approved) facts.push('Approved ' + approved.text);
      add({ key: 'opt', sort: optStart, title: J().opt, dates: okIso(opt.from) ? span(opt.from, opt.until) : 'Filed ' + fmtY(opt.filed),
        facts: facts, papers: [opt.recommendedDoc, 'i797', opt.doc] });
    }

    /* STEM OPT, once the record has any of it (never the sample card). */
    const st = r.stem || {};
    const card = st.card && !st.card.sample && okIso(st.card.from) ? st.card : null;
    const stStart = card ? card.from : (okIso(st.filed) ? st.filed : (okIso(st.recommended) ? st.recommended : null));
    if (stStart) {
      const facts = [];
      if (okIso(st.recommended)) facts.push('School recommended ' + fmtY(st.recommended));
      if (okIso(st.filed)) facts.push('Filed Form I-765 ' + fmtY(st.filed) + (st.receipt ? ', receipt ' + st.receipt : ''));
      add({ key: 'stem', sort: stStart, title: J().stem, dates: card ? span(card.from, card.until) : 'Filed ' + fmtY(st.filed || stStart),
        facts: facts, papers: [] });
    }

    /* Each job. */
    (r.jobs || []).filter((j) => okIso(j.start)).forEach((j) => {
      const facts = [];
      const hours = (j.hoursChanges || []).filter((h) => okIso(h.on) && h.on <= t).sort((a, b) => (a.on < b.on ? -1 : 1)).pop();
      const h = hours ? hours.hours : j.hours;
      facts.push([j.title, h != null ? h + ' hours a week' : null].filter(Boolean).join(', '));
      const rep = made['report:job-start:' + j.id];
      if (okIso(rep)) facts.push('Reported to your DSO ' + fmtY(rep));
      if (okIso(j.confirmedOn) && !(okIso(j.end) && j.end <= t)) facts.push('Last confirmed ' + fmtY(j.confirmedOn));
      add({ key: 'job:' + j.id, sort: j.start, title: fill(J().job, { employer: j.employer }), dates: span(j.start, j.end),
        facts: facts.filter(Boolean), papers: [j.doc] });
    });

    /* H-1B petitions. */
    (r.petitions || []).filter((p) => okIso(p.filed)).forEach((p, i) => {
      add({ key: 'petition:' + i, sort: p.filed, title: J().petition, dates: 'Filed ' + fmtY(p.filed),
        facts: okIso(p.start) ? ['For a start of ' + fmtY(p.start)] : [], papers: [] });
    });

    out.sort((a, b) => (a.sort < b.sort ? -1 : (a.sort > b.sort ? 1 : 0)));

    /* Now: where she stands today, and what changed lately. */
    if (out.length) {
      const facts = [];
      if (card && card.from <= t && card.until >= t) facts.push('On STEM OPT until ' + fmtY(card.until));
      else if (okIso(opt.from) && opt.from <= t && (!okIso(opt.until) || opt.until >= t)) facts.push('On OPT until ' + fmtY(opt.until));
      else if (okIso(pg.start) && pg.start <= t && (!okIso(pg.end) || pg.end >= t)) facts.push('In your program until ' + fmtY(pg.end));
      const addr = r.address || {};
      if (okIso(addr.since)) {
        const rep = made['report:address:' + addr.since];
        const lines = addr.lines || [];
        facts.push({ html: e('Living at ' + (lines[lines.length - 1] || 'your address') + ' since ' + fmtY(addr.since) + (okIso(rep) ? ', reported ' + fmtY(rep) : '')) + (addr.sample ? sampleTag() : '') });
      }
      const sig = r.travelSignature || {};
      if (okIso(sig.signed)) facts.push('Travel signature ' + fmtY(sig.signed));
      (r.trips || []).filter((x) => okIso(x.leave)).forEach((x) => {
        const days = okIso(x.back) ? App.dates.daysBetween(x.leave, x.back) : null;
        facts.push('Trip abroad ' + span(x.leave, x.back).replace(/^Since/, 'from') + (days != null ? ', ' + days + (days === 1 ? ' day' : ' days') + ' away' : ''));
      });
      out.push({ key: 'now', sort: t, title: J().now, dates: fmtY(t), facts: facts, papers: [sig.doc], now: true });
    }
    return out;
  }

  /* ---------------- drawing ---------------- */
  const paperName = (doc) => (doc ? doc.name || doc.title : '');

  function row(data, m) {
    const papers = (m.papers || []).filter(Boolean).filter((id, i, a) => a.indexOf(id) === i).map((id) => docOf(data, id)).filter(Boolean);
    const facts = (m.facts || []).filter(Boolean).map((f) => '<li>' + (typeof f === 'object' ? f.html : C.escText(f)) + '</li>').join('');
    const extra = m.now ? '<a href="#/case">' + e(J().profile) + '</a>' : '';
    const links = papers.map((d) => '<a href="#/documents/' + e(d.id) + '">' + C.escText(paperName(d)) + '</a>').join('') + extra;
    return C.row({
      key: 'rec:' + m.key,
      cls: m.now ? 'rec-now' : '',
      title: m.title,
      value: m.dates,
      content: (facts ? '<ul class="rec-facts">' + facts + '</ul>' : '') + (links ? '<p class="rec-papers">' + links + '</p>' : ''),
    });
  }

  /* Save a copy: the journey as a plain text file, made on this device. */
  function saveCopy(data) {
    const list = milestones(data);
    const text = (m) => (m.facts || []).filter(Boolean).map((f) => '    ' + (typeof f === 'object' ? f.html.replace(/<[^>]+>/g, '').trim() : f));
    const lines = [J().title + ', ' + data.student.name, ''];
    list.forEach((m) => { lines.push(m.title + ': ' + m.dates); text(m).forEach((l) => lines.push(l)); lines.push(''); });
    if (window.URL && URL.createObjectURL) {
      const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain' }));
      const a = document.createElement('a');
      a.href = url; a.download = 'your-record.txt';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    if (App.toast) App.toast('Copy ready: your-record.txt');
  }

  window.SCREENS['record'] = {
    title: 'Your record',
    render(data, params) {
      const list = params && params[0] === 'empty' ? [] : milestones(data);
      const header = C.pageHeader({
        title: J().title,
        aside: list.length ? C.button({ label: J().save, kind: 'text', attrs: { 'data-rec-save': '' } }) : '',
      });
      const body = list.length
        ? C.list(list.map((m) => row(data, m)), { accordion: false, label: J().title }).replace('class="list"', 'class="list rec-list"')
        : C.empty({ text: J().empty });
      return STYLE + header + body + C.footer();
    },
    mount(root) {
      root.classList.add('screen-record');
      root.addEventListener('click', (ev) => {
        if (ev.target.closest('[data-rec-save]')) { ev.preventDefault(); saveCopy(App.data); }
      });
    },
  };
})();
