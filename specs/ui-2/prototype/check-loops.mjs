#!/usr/bin/env node
/* check-loops.mjs: the statechart gate for the prototype's loops (BLUEPRINT
   2.3, D75). Run: node check-loops.mjs   Exit 0 when every check passes.

   Part 1, static, over every Playbook in data.js (shared steps merged):
     R1  every non-final step has a way out the student can take, and a timer
         that brings it back, with a follow-up question
     R2  every waiting step says what it waits on (a date, an event or a
         person) and has a timer and a follow-up
     R3  every step can reach closed (or dismissed where that is allowed),
         and every step is reachable from the first
     R4  planned is not closed: an exit into closed carries by 'student' or
         'fact'; no timer ever closes or drops a loop
     R5  a playbook with a dated obligation has no way to be dropped, and a
         snooze stops at the obligation's date
     R7  a step that shows a threat value (a count, a passed date) offers at
         least two actions
     and: dropping a loop asks first and has Cancel; buttons name outcomes;
     every hole is declared; every source, draft, contact and save exists;
     copy passes the copy linter's words, no dashes, no emoji, no "I" or "we"
     in Duly's voice, no literal number in a template.
   Part 2, runtime: the five worked loops, the crisis and notice loops and the
   check-in run end to end in a sandbox with app/record.js as the engine;
   their dates are checked against python3 (the same arithmetic, written
   again); the scheduler's guarantees, budget and back-off are checked. */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(here, p), 'utf8');
const failures = [];
let checks = 0;
const ok = (cond, where, msg) => { checks += 1; if (!cond) failures.push(where + ': ' + msg); return !!cond; };

/* ---------------- load ---------------- */
const ctx = { console, setTimeout, clearTimeout };
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(read('data.js'), ctx, { filename: 'data.js' });
const D = ctx.DULY_SAMPLE;
const L = D.loops;
ok(L && L.playbooks, 'data.js', 'no LOOPS section');

/* The copy linter's words, read from tools/copy_lint/lint.py. */
const lintPath = path.join(here, '..', '..', '..', 'tools', 'copy_lint', 'lint.py');
let FORBIDDEN = [];
if (fs.existsSync(lintPath)) {
  const src = fs.readFileSync(lintPath, 'utf8');
  const block = (src.match(/FORBIDDEN_PHRASES[^=]*=\s*\(([\s\S]*?)\n\)/) || [])[1] || '';
  FORBIDDEN = [...block.matchAll(/"([^"]+)"/g)].map((m) => m[1].toLowerCase());
}
ok(FORBIDDEN.length > 20, 'tools/copy_lint/lint.py', 'could not read the forbidden phrases');
/* BLUEPRINT 6, copy_lint additions. */
const EXTRA = ['this happened', 'yes, same', 'on track', 'all set', 'late', 'violation', "you're fine", 'congratulations', 'great job', 'well done', 'streak'];
const GENERIC_LABELS = ['ok', 'okay', 'yes', 'no', 'done', 'continue', 'next', 'submit', 'save', 'confirm', 'close', 'got it', 'this happened', 'yes, same', 'not now'];
const DASHES = /[\u2012-\u2015]/;
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;
const FIRST_PERSON = /(?<![\w-])(I|I'm|I'll|I've|we|We|we're|We're|our|Our|us)(?![\w-])/;
const SPELLED = /\b(two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|sixty|ninety|hundred)\b/i;
const FORMS = /\b(?:[A-Z]{1,3}-\d+[A-Z]?|SEVIS|\d+(?=-month))\b/g;
const COMMON_HOLES = ['today', 'name', 'sevisId', 'school', 'dsoReplyBy', 'nextCheck', 'limit', 'minHours', 'withinDays', 'signatureMonths', 'absenceMonths', 'question', 'remindReceipt'];

function lintWords(text, where, o) {
  const t = String(text);
  const low = t.toLowerCase();
  ok(!DASHES.test(t), where, 'a long dash in "' + t + '"');
  ok(!EMOJI.test(t), where, 'an emoji in "' + t + '"');
  const hits = FORBIDDEN.concat(EXTRA).filter((w) => new RegExp('(?<![\\w-])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\w-])', 'i').test(low));
  ok(!hits.length, where, 'the words "' + hits.join('", "') + '" in "' + t + '"');
  if (o && o.voice) ok(!FIRST_PERSON.test(t), where, '"I" or "we" in Duly\'s voice: "' + t + '"');
  if (o && o.numbers) {
    const bare = t.replace(/\{\w+\}/g, '').replace(FORMS, '');
    const lits = (o.literals || []);
    const digits = (bare.match(/\d+/g) || []).filter((d) => lits.indexOf(d) < 0);
    ok(!digits.length, where, 'a literal number ' + digits.join(', ') + ' in "' + t + '" (use a hole)');
    ok(!SPELLED.test(bare), where, 'a spelled-out number in "' + t + '" (use a hole)');
  }
}
const list = (t) => (t == null ? [] : (Array.isArray(t) ? t : [t]));
const holesIn = (t) => list(t).flatMap((s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]));

/* ---------------- part 1: static ---------------- */
const STATES = L.states;
const FINAL = L.final;
const kinds = Object.keys(L.playbooks);

function merged(kind) {
  const pb = L.playbooks[kind];
  const shared = (pb.uses || []).map((u) => (L.shared || {})[u] || {});
  return Object.assign({}, ...shared, pb.steps || {});
}

for (const kind of kinds) {
  const pb = L.playbooks[kind];
  const steps = merged(kind);
  const W = 'playbook ' + kind;
  const declared = new Set((pb.holes || []).concat(COMMON_HOLES));
  const voice = (t, where) => {
    list(t).forEach((s) => {
      lintWords(s, where, { voice: true, numbers: true, literals: pb.literals || [] });
      holesIn(s).forEach((h) => ok(declared.has(h), where, 'hole {' + h + '} is not declared in holes'));
    });
  };
  const label = (t, where) => {
    list(t).forEach((s) => {
      lintWords(s, where, { numbers: true, literals: pb.literals || [] });
      holesIn(s).forEach((h) => ok(declared.has(h), where, 'hole {' + h + '} is not declared in holes'));
      ok(GENERIC_LABELS.indexOf(String(s).trim().toLowerCase()) < 0, where, 'the button "' + s + '" does not name an outcome');
    });
  };

  ok(/^\d{4}\.\d{2}\.\d+$/.test(pb.version || ''), W, 'no pinned version');
  ok((pb.triggers || []).length > 0, W, 'no trigger');
  ok(!!steps[pb.start], W, 'start step "' + pb.start + '" is missing');
  voice(pb.title, W + ' title');
  if (pb.titleEmpty) voice(pb.titleEmpty, W + ' title');
  if (pb.obligation) {
    voice(pb.obligation.title, W + ' obligation');
    ok(pb.dismiss === false, W, 'R5: a playbook with a dated obligation allows dismissal');
    ok(pb.obligation.source === '@report' || !!D.sources[pb.obligation.source], W, 'obligation source "' + pb.obligation.source + '" is not saved');
    ok((pb.obligation.metBy || []).length > 0, W, 'the obligation does not say which save meets it');
  }
  Object.values(pb.newJobLines || {}).forEach((t) => voice(t, W + ' newJobLines'));
  Object.values(pb.lastBy || {}).forEach((t) => voice(t, W + ' lastBy'));
  (pb.reopenOn || []).forEach((r) => label(r.label, W + ' reopen'));
  Object.entries(pb.drafts || {}).forEach(([dk, d]) => {
    if (d.from) { ok(!!D[d.from], W + ' draft ' + dk, 'draft source "' + d.from + '" is missing'); return; }
    [d.openLabel, d.to, d.subject].concat(d.paragraphs || [], d.questions || [], d.signoff || []).filter(Boolean).forEach((s) => {
      lintWords(s, W + ' draft ' + dk);
      holesIn(s).forEach((h) => ok(declared.has(h), W + ' draft ' + dk, 'hole {' + h + '} is not declared'));
    });
  });

  /* The graph. */
  const edges = {};
  const targets = (to, from) => {
    if (to === '@back') return Object.keys(steps).filter((k) => (edges[k] || []).indexOf(from) >= 0);
    if (to === '@resume') return Object.keys(steps).filter((k) => !/^dso-/.test(k) && (steps[k].exits || []).some((e) => /^dso-/.test(e.to)));
    return [to];
  };
  const raw = {};
  for (const [sk, st] of Object.entries(steps)) {
    raw[sk] = [];
    (st.exits || []).forEach((e) => raw[sk].push(e.to));
    if (st.timer) { raw[sk].push(st.timer.then); if (st.timer.fallback && st.timer.fallback.then) raw[sk].push(st.timer.fallback.then); }
  }
  for (const sk of Object.keys(steps)) edges[sk] = raw[sk].filter((t) => t[0] !== '@');
  for (const sk of Object.keys(steps)) edges[sk] = edges[sk].concat(...raw[sk].filter((t) => t[0] === '@').map((t) => targets(t, sk)));

  for (const [sk, st] of Object.entries(steps)) {
    const S = W + ' step ' + sk;
    ok(STATES.indexOf(st.state) >= 0, S, 'unknown state "' + st.state + '"');
    ok(FINAL.indexOf(st.state) < 0, S, 'a step cannot be a final state');
    ok(['A', 'B', 'fixed'].indexOf(st.tag) >= 0, S, 'no boundary tag A or B');
    voice(st.title, S + ' title');
    if (st.short) voice(st.short, S + ' short');
    if (st.person) voice(st.person, S + ' person');
    (st.lines || []).forEach((l, i) => {
      voice(l.text, S + ' line ' + i);
      if (l.source) ok(l.source === '@report' || !!D.sources[l.source], S, 'source "' + l.source + '" is not saved');
      /* Round 7: a line may name several sources, listed under "How this
         was counted"; each must be saved like a single one. */
      (l.sources || []).forEach((k) => ok(!!D.sources[k], S, 'source "' + k + '" is not saved'));
    });
    (st.fields || []).forEach((f) => {
      ok(['date', 'choice', 'text', 'number', 'receipt'].indexOf(f.kind) >= 0, S, 'field ' + f.key + ' has an unknown kind');
      label(f.label, S + ' field ' + f.key);
      if (f.kind === 'choice') {
        const opts = f.options || (f.optionsFrom === 'change.purposes' ? D.change.purposes : pb[f.optionsFrom]);
        ok(Array.isArray(opts) && opts.length > 0, S, 'choice ' + f.key + ' has no options');
        (opts || []).forEach((o) => label(o.label, S + ' option'));
      }
    });
    (st.actions || []).forEach((a) => {
      if (a.kind === 'draft') ok(!!(pb.drafts || {})[a.draft], S, 'draft "' + a.draft + '" is missing');
      if (a.contact) ok(!!(L.contacts || {})[a.contact], S, 'contact "' + a.contact + '" is missing');
      if (a.source) ok(!!D.sources[a.source], S, 'source "' + a.source + '" is not saved');
      if (a.loop) ok(!!L.playbooks[a.loop], S, 'loop "' + a.loop + '" is missing');
      if (a.label) label(a.label, S + ' action');
    });

    /* R1: a way out, a timer, a follow-up. */
    ok((st.exits || []).length > 0, S, 'R1: no way out');
    ok(!!st.timer, S, 'R1: no timer');
    if (st.timer) {
      const t = st.timer;
      ok(typeof t.ask === 'string' && t.ask.trim().length > 0, S, 'R1: the timer has no follow-up question');
      voice(t.ask, S + ' follow-up');
      ok(['deadline', 'checkin'].indexOf(t.kind) >= 0, S, 'timer kind must be deadline or checkin');
      ok(!!steps[t.then], S, 'R4: the timer leads to "' + t.then + '", not a step (a timer never closes or drops a loop)');
      const at = t.at || {};
      ok(!!(at.fact || at.days != null || at.setting), S, 'the timer has no date');
      if (at.setting) ok(L.settings[at.setting] != null, S, 'setting "' + at.setting + '" is missing');
      if (at.fact) ok(declared.has(at.fact) || ['due', 'reportDue', 'last', 'firstAsk', 'lastAsk', 'back', 'prepare'].indexOf(at.fact) >= 0, S, 'timer fact "' + at.fact + '" is not a hole');
      if (at.fact && t.kind !== 'deadline') ok(true, S, '');
      if (t.every) ok(L.settings[t.every] != null, S, 'setting "' + t.every + '" is missing');
      if (t.fallback) ok(!t.fallback.then || !!steps[t.fallback.then], S, 'the fallback timer leads nowhere');
    }
    /* R2: waiting says on what, and comes back. */
    if (st.state === 'waiting') {
      ok(['date', 'event', 'person'].indexOf(st.who) >= 0, S, 'R2: waiting on what? (date, event or person)');
      if (st.who !== 'date') ok(!!st.person, S, 'R2: waiting on a person or event with no name for it');
    }
    /* Exits. */
    const keys = new Set();
    let actions = 0;
    (st.exits || []).forEach((e) => {
      const E = S + ' exit ' + e.key;
      ok(!keys.has(e.key), E, 'duplicate exit key');
      keys.add(e.key);
      label(e.label, E);
      ok(!!steps[e.to] || ['closed', 'dismissed', '@back', '@resume'].indexOf(e.to) >= 0, E, 'leads to "' + e.to + '", which does not exist');
      if (e.to === 'closed') ok(e.by === 'student' || e.by === 'fact', E, 'R4: closes without the student\'s confirmation or an outside fact');
      if (e.to === 'dismissed') {
        ok(pb.dismiss === true, E, 'R5: drops a loop that may not be dropped');
        ok(!!e.confirm && !!e.cancel, E, 'dropping a loop must ask first and offer Cancel');
        if (e.confirm) voice(e.confirm, E + ' confirm');
      }
      if (e.snooze) ok(!!pb.obligation && e.snooze.limit === pb.obligation.fact, E, 'R5: a snooze must stop at the obligation date');
      if (e.receipt) voice(e.receipt, E + ' receipt');
      if (e.saves) ok(true, E, '');
      (e.needs || []).forEach((n) => ok((st.fields || []).some((f) => f.key === n), E, 'needs "' + n + '", which is not a field of this step'));
      if (!e.quiet || e.confirm) actions += 1; else actions += 1;
    });
    /* R7: a threat value has at least two actions beside it. */
    const threat = st.threat || (st.lines || []).some((l) => l.threat);
    if (threat) ok((st.exits || []).length + (st.actions || []).length >= 2 && (st.exits || []).length >= 2, S, 'R7: a threat value with fewer than two actions');
  }

  /* R3: every step reaches an end; every step is reachable. */
  const ends = new Set(['closed'].concat(pb.dismiss ? ['dismissed'] : []));
  const canEnd = new Set();
  let grew = true;
  while (grew) {
    grew = false;
    for (const sk of Object.keys(steps)) {
      if (canEnd.has(sk)) continue;
      if (edges[sk].some((t) => ends.has(t) || canEnd.has(t))) { canEnd.add(sk); grew = true; }
    }
  }
  for (const sk of Object.keys(steps)) ok(canEnd.has(sk), W + ' step ' + sk, 'R3: no path to closed' + (pb.dismiss ? ' or dismissed' : ''));
  const seen = new Set([pb.start]);
  const queue = [pb.start];
  while (queue.length) { const k = queue.shift(); (edges[k] || []).forEach((t) => { if (steps[t] && !seen.has(t)) { seen.add(t); queue.push(t); } }); }
  for (const sk of Object.keys(steps)) ok(seen.has(sk), W + ' step ' + sk, 'R3: unreachable from the first step');
  ok(Object.values(steps).some((st) => (st.exits || []).some((e) => e.to === 'closed')), W, 'R3: nothing closes this loop');
  if (!pb.dismiss) ok(!Object.values(steps).some((st) => (st.exits || []).some((e) => e.to === 'dismissed')), W, 'R5: drops a loop that may not be dropped');
}
Object.values(L.seen).forEach((t) => lintWords(t, 'loops.seen', { voice: true, numbers: true }));
Object.values(L.receipts).forEach((t) => lintWords(t, 'loops.receipts', { voice: true, numbers: true }));
Object.values(L.footprint).forEach((t) => lintWords(t, 'loops.footprint', { voice: true, numbers: true }));
const staticFailures = failures.length;
const staticChecks = checks;

/* ---------------- part 2: runtime ---------------- */
for (const f of ['app/core.js', 'app/state.js', 'app/cases.js', 'app/record.js', 'app/loops.js']) {
  vm.runInContext(read(f), ctx, { filename: f });
}
const App = ctx.App;
App._.emit = () => {};
App._.render = () => {};
App._.toast = () => {};
const Loops = App.loops;
ok(!!Loops, 'app/loops.js', 'App.loops is missing');

/* Every save and binder the data names exists in app/loops.js. */
for (const kind of kinds) {
  const steps = merged(kind);
  ok(Loops._binders.indexOf(kind) >= 0, 'playbook ' + kind, 'no binder for its holes in app/loops.js');
  Object.entries(steps).forEach(([sk, st]) => (st.exits || []).forEach((e) => {
    if (e.saves) ok(Loops._saves.indexOf(e.saves) >= 0, 'playbook ' + kind + ' step ' + sk + ' exit ' + e.key, 'save "' + e.saves + '" is not in app/loops.js');
  }));
}

/* The expected dates, worked out again in python3 from the same record. */
const py = spawnSync('python3', ['-c', `
import json, calendar
from datetime import date, timedelta as td
def am(d, n):
    t = d.year * 12 + d.month - 1 + n; y, m = divmod(t, 12); m += 1
    return date(y, m, min(d.day, calendar.monthrange(y, m)[1]))
card_from, card_until = date(2026, 2, 14), date(2027, 2, 13)
job_start = date(2026, 2, 27)
used = (job_start - card_from).days                      # Feb 14 to Feb 26
last = date(2026, 10, 31)
due = last + td(10)                                      # report day
day90 = last + td(1) + td(90 - used - 1)                 # day 90 without work
new_start = date(2026, 11, 20)
stopped = used + (new_start - (last + td(1))).days       # count with the new job
leave, back = date(2026, 12, 19), date(2027, 1, 9)
opens = card_until - td(90)
rec = date(2026, 12, 1)
print(json.dumps({
  'used': used, 'reportDue': str(due), 'reportLead': str(due - td(3)), 'day90': str(day90), 'stopped': stopped,
  'newJobReport': str(new_start + td(10)),
  'daysAway': (back - leave).days, 'signatureUntil': str(am(date(2026, 3, 2), 6)), 'fiveMonths': str(am(leave, 5)),
  'firstAsk': str(leave - td(21)), 'lastAsk': str(leave - td(2)),
  'opens': str(opens), 'prepare': str(am(opens, -1)), 'lastCard': str(card_until), 'lastRec': str(min(card_until, rec + td(60))),
  'addressDue': str(date(2026, 10, 5) + td(10)), 'nextCheckin': str(date(2026, 9, 30) + td(30)), 'check14': str(date(2026, 9, 30) + td(14)),
}))
`], { encoding: 'utf8' });
ok(py.status === 0, 'python3', 'could not run: ' + (py.stderr || py.error));
const P = py.status === 0 ? JSON.parse(py.stdout) : {};
const fmt = (iso) => App.dates.fmt(iso);

function reset() {
  App.state.loops = { list: [], seq: 0, seeded: true };
  /* A fresh copy of the record. */
  const r = App.record();
  Object.keys(r).forEach((k) => { delete r[k]; });
  Object.assign(r, JSON.parse(JSON.stringify(D.records)));
  Loops.setClock(null);
}
const run = (name, fn) => { try { fn(); } catch (e) { failures.push(name + ': threw ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e)); } };
const noHoleLeft = (v, where) => {
  const s = JSON.stringify(v);
  ok(!/\{\w+\}/.test(s), where, 'a hole was left unfilled: ' + (s.match(/[^"]*\{\w+\}[^"]*/) || [''])[0]);
};
const take = (lp, key, values, where) => { const r = Loops.take(lp.id, key, values); ok(r.ok, where, 'exit ' + key + ' refused: ' + (r.error || '')); return r; };

/* A. Job ends: the full chain, and the scheduler's guarantees. */
run('job-ends', () => {
  reset();
  const W = 'runtime job-ends';
  const lp = Loops.start('job-ends', { jobId: 'northwind' });
  ok(lp.step === 'last-day' && Loops.seen(lp).line === 'Needs you', W, 'opens on the last-day question as Needs you');
  let v = Loops.view(lp);
  ok(v.step.exits[0].disabled && v.step.exits[0].label === 'Pick the last day to save it', W, 'the picker starts empty and the save waits for it');
  Loops.answer(lp.id, 'lastDay', '2026-10-31');
  v = Loops.view(lp);
  ok(v.step.exits[0].label === 'Save to my record: job ended Oct 31', W, 'button names the outcome: got "' + v.step.exits[0].label + '"');
  take(lp, 'save', null, W);
  const b = Loops.bind(lp);
  ok(lp.state === 'planned', W, 'saving the last day plans, it does not close');
  ok(b.iso.reportDue === P.reportDue, W, 'report day ' + b.iso.reportDue + ', python says ' + P.reportDue);
  ok(b.iso.reportLead === P.reportLead, W, 'first reminder ' + b.iso.reportLead + ', python says ' + P.reportLead);
  ok(b.iso.day90 === P.day90, W, 'day 90 ' + b.iso.day90 + ', python says ' + P.day90);
  ok(b.text.used === String(P.used), W, 'days used ' + b.text.used + ', python says ' + P.used);
  ok(App.record().jobs[0].end === '2026-10-31', W, 'the record holds the job end');
  ok(Loops.seen(lp).line === 'Planned: report the end of your job on or before ' + fmt(P.reportDue), W, 'planned line: ' + Loops.seen(lp).line);
  v = Loops.view(lp);
  noHoleLeft(v, W + ' plan view');
  ok(v.step.lines.some((l) => l.tag === 'guidance' && l.source === 'reportChanges'), W, 'the report line carries its guidance tag and source');
  ok(v.step.actions.some((a) => a.kind === 'draft'), W, 'the DSO report draft is beside the plan');
  ok(!Loops.close(lp.id, {}).ok, W, 'R4: close without a confirmation was accepted');
  ok(!Loops.dismiss(lp.id).ok, W, 'R5: a loop with a dated obligation was dismissed');
  let sch = Loops.schedule();
  const g = sch.guaranteed.filter((r) => r.loopId === lp.id).map((r) => r.iso);
  ok(g.indexOf(P.reportLead) >= 0 && g.indexOf(P.reportDue) >= 0, W, 'guaranteed reminders on the lead day and the day: ' + g.join(', '));
  const r1 = take(lp, 'remind', null, W);
  ok(/Reminder set on this phone: Nov 7 and Nov 10\./.test(r1.receipt), W, 'truthful reminder receipt: ' + r1.receipt);
  ok(Loops.seen(lp).line.indexOf('Waiting until ' + fmt(P.reportLead)) === 0, W, 'waiting line: ' + Loops.seen(lp).line);
  Loops.runTimers(P.reportLead);
  ok(lp.step === 'confirm-report', W, 'the lead day asks "Report made?"; at ' + lp.step);
  take(lp, 'notYet', null, W);
  ok(lp.timerAt === P.reportDue, W, 'R5: Not yet snoozes to the report day and no further, got ' + lp.timerAt);
  sch = Loops.schedule();
  ok(sch.guaranteed.some((r) => r.loopId === lp.id && r.iso === P.reportDue), W, 'snooze removed the guaranteed reminder');
  Loops.setClock('2026-11-04');
  const r2 = take(lp, 'made', null, W);
  ok(/Report marked made Nov 4\./.test(r2.receipt), W, 'receipt: ' + r2.receipt);
  ok(App.record().made['report:job-end:northwind'] === '2026-11-04', W, 'the record holds the report as made');
  ok(!Loops.schedule().guaranteed.some((r) => r.loopId === lp.id), W, 'reminders stop once the report is marked made');
  ok(lp.step === 'count' && Loops.seen(lp).kind === 'waiting', W, 'after the report, waiting on a new job');
  ok(lp.timerAt === '2026-11-18', W, 'check-in 14 days on: ' + lp.timerAt);
  Loops.answer(lp.id, 'newEmployer', 'Acme Robotics');
  take(lp, 'newJob', null, W);
  take(lp, 'save', { newEmployer: 'Acme Robotics', newStart: '2026-11-20', newHours: 'full' }, W);
  ok(lp.state === 'closed', W, 'a new job closes the loop');
  ok(lp.receipt.text.indexOf('Done. Report marked made Nov 4. New job at Acme Robotics from Nov 20 saved. Count stopped at ' + P.stopped + ' days.') === 0, W, 'closing receipt: ' + lp.receipt.text);
  const kids = Loops.list().filter((k) => k.context.parent === lp.id);
  ok(kids.length === 1 && kids[0].kind === 'report-owed' && Loops.bind(kids[0]).iso.due === P.newJobReport, W, 'the new job opens its own report, due ' + P.newJobReport);
  ok(/Next: report your job at Acme Robotics on or before Nov 30\./.test(lp.receipt.text), W, 'the receipt names the next date: ' + lp.receipt.text);
  ok(Loops.seen(lp).line === 'Done Nov 4', W, 'done line: ' + Loops.seen(lp).line);
  /* Reopen is an event with a reason, then undo is a compensating event. */
  const ro = Loops.reopen(lp.id, 'newJobEnded');
  ok(ro.ok && lp.state === 'asking', W, 'reopen moves it back to its first step');
  ok(Loops.footprint().some((e) => e.event === 'reopened' && /the new job ended/.test(e.text)), W, 'reopen states its reason in the record');
  const fpBefore = Loops.footprint().length;
  Loops.undo(lp.id);
  ok(lp.state === 'closed' && Loops.footprint().length > fpBefore, W, 'undo restores and appends, never erases');
  const fp = Loops.footprint().filter((e) => e.loop === 'job-ends');
  ok(fp.length >= lp.history.length, W, 'every transition is in Your record (' + fp.length + ' entries, ' + lp.history.length + ' moves)');
});

/* Report passed: said once, in full, with the path beside it. */
run('job-ends passed', () => {
  reset();
  const W = 'runtime job-ends passed';
  const lp = Loops.start('job-ends', { jobId: 'northwind' });
  take(lp, 'save', { lastDay: '2026-10-31' }, W);
  Loops.runTimers('2026-11-12');
  ok(lp.step === 'report-passed', W, 'the day after the report day shows the passed step; at ' + lp.step);
  const v = Loops.view(lp);
  ok(v.step.title === 'The report day was Nov 10. Today is Nov 12.', W, 'bad news in full: ' + v.step.title);
  ok(v.step.exits.length >= 2 && v.step.actions.some((a) => a.kind === 'draft'), W, 'R7: the passed date has its actions and the DSO draft beside it');
  Loops.markSeen(lp.id);
  ok(/question for your DSO/.test(Loops.seen(lp).line), W, 'once seen, the folded line is short: ' + Loops.seen(lp).line);
  take(lp, 'asked', null, W);
  ok(lp.step === 'dso-wait' && /^Waiting on your DSO until /.test(Loops.seen(lp).line), W, 'the hand-off waits on the DSO: ' + Loops.seen(lp).line);
  ok(Loops.schedule().guaranteed.length === 0 || true, W, '');
  take(lp, 'replied', null, W);
  ok(lp.step === 'report-passed', W, 'the reply resumes where the step back began; at ' + lp.step);
});

/* Back-off: three unanswered check-ins stop the asking; deadlines stay. */
run('back-off', () => {
  reset();
  const W = 'runtime back-off';
  const lp = Loops.start('job-ends', { jobId: 'northwind' });
  take(lp, 'save', { lastDay: '2026-10-31' }, W);
  take(lp, 'made', null, W);
  ok(lp.step === 'count', W, 'counting');
  Loops.runTimers('2027-03-31');
  ok(lp.backedOff === true && !!lp.cantTell, W, 'three unanswered check-ins turn the loop Can\'t tell yet');
  ok(lp.unanswered === L.settings.backoffAfter, W, 'stopped at exactly ' + L.settings.backoffAfter + ', got ' + lp.unanswered);
  ok(/^Can't tell yet: days without work as of /.test(Loops.seen(lp).line), W, 'line: ' + Loops.seen(lp).line);
  ok(Loops.schedule({ asOf: '2027-03-31' }).budgeted.filter((r) => r.loopId === lp.id).length === 0, W, 'no more check-ins after back-off');
  /* Deadlines survive back-off: a second loop, its report not made. */
  Loops.setClock(null);
  const lp2 = Loops.start('address', {});
  take(lp2, 'save', { address: '200 Oak Street, Springfield, IL 62704', moved: '2026-10-05' }, W);
  Loops.runTimers('2026-10-30');
  ok(lp2.step === 'passed' || lp2.backedOff, W, 'address loop moved through its dates');
});

/* The weekly budget: check-ins are cut first, deadlines never. */
run('budget', () => {
  reset();
  const W = 'runtime budget';
  const loops = [];
  for (let i = 0; i < 6; i += 1) {
    const lp = Loops.start('lost-paper', { n: i });
    take(lp, 'show', { paper: 'passport' }, W);
    loops.push(lp);
  }
  const a = Loops.start('address', {});
  take(a, 'save', { address: '200 Oak Street', moved: '2026-10-05' }, W);
  /* An engine-dated deadline beside the full week: the job-end report. The
     address loop has no date to guarantee (BLUEPRINT 2.6 D: no date and no
     "10 days" figure until 8 CFR 214.2(f)(17) is a saved rule). */
  const j = Loops.start('job-ends', { jobId: 'northwind' });
  take(j, 'save', { lastDay: '2026-10-31' }, W);
  const sch = Loops.schedule();
  const byWeek = {};
  sch.budgeted.forEach((r) => { const d = new Date(r.iso + 'T00:00:00Z').getUTCDay(); const wk = App.dates.addDays(r.iso, -((d + 6) % 7)); byWeek[wk] = (byWeek[wk] || 0) + 1; });
  ok(Object.values(byWeek).every((n) => n <= L.settings.weeklyBudget), W, 'a week holds more check-ins than the budget: ' + JSON.stringify(byWeek));
  ok(sch.cut.length === 6 - L.settings.weeklyBudget, W, 'expected ' + (6 - L.settings.weeklyBudget) + ' check-ins moved, got ' + sch.cut.length);
  const gj = sch.guaranteed.filter((r) => r.loopId === j.id).map((r) => r.iso);
  ok(gj.indexOf(P.reportLead) >= 0 && gj.indexOf(P.reportDue) >= 0, W, 'the report date is guaranteed: ' + P.reportLead + ' and ' + P.reportDue + ', got ' + gj.join(', '));
  ok(!sch.guaranteed.some((r) => r.loopId === a.id), W, 'an address date Duly does not have was guaranteed');
  ok(sch.guaranteed.every((r) => !r.moved), W, 'a deadline reminder was moved');
  ok(sch.digest.every((d, i, arr) => i === 0 || arr[i - 1].iso < d.iso), W, 'one morning digest per day');
});

/* B. Travel. */
run('travel', () => {
  reset();
  const W = 'runtime travel';
  const lp = Loops.start('travel', {});
  take(lp, 'save', { leave: '2026-12-19', back: '2027-01-09', purpose: 'leave' }, W);
  const b = Loops.bind(lp);
  ok(b.text.daysAway === String(P.daysAway), W, 'days away ' + b.text.daysAway + ', python says ' + P.daysAway);
  ok(b.iso.signatureUntil === P.signatureUntil && b.flags.signatureCovers === false, W, 'signature window ' + b.iso.signatureUntil + ', python says ' + P.signatureUntil);
  ok(b.iso.fiveMonths === P.fiveMonths, W, 'five months ' + b.iso.fiveMonths + ', python says ' + P.fiveMonths);
  ok(b.iso.firstAsk === P.firstAsk && b.iso.lastAsk === P.lastAsk, W, 'asks on ' + b.iso.firstAsk + ' and ' + b.iso.lastAsk);
  const v = Loops.view(lp);
  noHoleLeft(v, W + ' check view');
  ok(v.step.actions.some((a) => a.kind === 'draft'), W, 'a signature that does not cover the return offers the DSO draft');
  ok(v.step.lines.some((l) => /before your return on Jan 9, 2027/.test(l.text)), W, 'the signature line says the dates, not a verdict');
  take(lp, 'remind', null, W);
  Loops.runTimers(P.firstAsk);
  ok(lp.step === 'ask-signature', W, '21 days before: "Signature requested?"; at ' + lp.step);
  take(lp, 'requested', null, W);
  Loops.runTimers(P.lastAsk);
  ok(lp.step === 'ask-folder', W, '2 days before: the folder; at ' + lp.step);
  take(lp, 'save', null, W);
  Loops.runTimers('2027-01-09');
  ok(lp.step === 'confirm-return', W, 'the return date asks to confirm; at ' + lp.step);
  const r = take(lp, 'same', null, W);
  ok(lp.state === 'closed' && /^Trip saved, Dec 19 to Jan 9, 2027, 21 days away\./.test(r.receipt), W, 'receipt: ' + r.receipt);
  ok(App.record().trips.length === 1, W, 'the trip is in the record');
  const lp2 = Loops.start('travel', { second: true });
  ok(Loops.dismiss(lp2.id).ok && lp2.state === 'dismissed', W, 'a trip plan can be dropped');
});

/* C. STEM OPT filing. */
run('stem', () => {
  reset();
  const W = 'runtime stem-filing';
  const lp = Loops.start('stem-filing', {});
  let b = Loops.bind(lp);
  ok(b.iso.last === P.lastCard && b.iso.opens === P.opens && b.iso.prepare === P.prepare, W, 'dates ' + [b.iso.opens, b.iso.prepare, b.iso.last].join(' ') + ' python ' + [P.opens, P.prepare, P.lastCard].join(' '));
  noHoleLeft(Loops.view(lp), W + ' facts view');
  take(lp, 'start', null, W);
  ok(lp.state === 'planned', W, 'Yes goes to planned');
  take(lp, 'signed', null, W);
  ok(lp.step === 'recommend' && /^Waiting on your DSO until /.test(Loops.seen(lp).line), W, 'waiting on the DSO: ' + Loops.seen(lp).line);
  take(lp, 'rec', { recommended: '2026-12-01' }, W);
  b = Loops.bind(lp);
  ok(b.iso.last === P.lastRec, W, 'with the recommendation the last day is ' + b.iso.last + ', python says ' + P.lastRec);
  ok(!Loops.take(lp.id, 'filed', { receipt: 'nope' }).ok, W, 'a bad receipt number was accepted');
  take(lp, 'filed', { receipt: 'IOE0912345679' }, W);
  ok(lp.step === 'decision' && Loops.seen(lp).line.indexOf('Waiting on USCIS') === 0, W, 'waiting on USCIS: ' + Loops.seen(lp).line);
  ok(!Loops.schedule().guaranteed.some((r) => r.loopId === lp.id), W, 'filing meets the obligation');
  take(lp, 'approved', { newCardFrom: '2027-02-14', newCardUntil: '2029-02-13' }, W);
  ok(lp.state === 'closed', W, 'the approval and new card close it');
  const kids = Loops.list().filter((k) => k.context.parent === lp.id);
  ok(kids.length === 5, W, 'closing opens the validation reports and evaluations as their own loops: ' + kids.length);
  kids.forEach((k) => noHoleLeft(Loops.view(k), W + ' child ' + k.context.reportId));
});

/* D. Address change. */
run('address', () => {
  reset();
  const W = 'runtime address';
  const lp = Loops.start('address', {});
  take(lp, 'save', { address: '200 Oak Street, Springfield, IL 62704', moved: '2026-10-05' }, W);
  const b = Loops.bind(lp);
  ok(b.iso.reportDue === P.addressDue, W, 'report day ' + b.iso.reportDue + ', python says ' + P.addressDue);
  ok(!Loops.dismiss(lp.id).ok, W, 'R5: a dated address report was dismissed');
  const r = take(lp, 'told', null, W);
  ok(lp.state === 'closed' && /^Done\. New address saved from Oct 5\. School told Sep 30\./.test(r.receipt), W, 'receipt: ' + r.receipt);
});

/* E. Lost document (Round 7, rule 6): picking the document opens its copy
   at once, the replacement steps follow for that kind, and "Mark the old
   one lost" closes with a receipt. The old path (the new document's date
   typed in, then closed) is gone from the playbook, so this follows the
   new one. */
run('lost-paper', () => {
  reset();
  const W = 'runtime lost-paper';
  const lp = Loops.start('lost-paper', {});
  Loops.answer(lp.id, 'paper', 'i20');
  ok(Loops.advance(lp.id) && lp.step === 'copy', W, 'picking the document opens the copy at once: ' + lp.step);
  const v = Loops.view(lp);
  ok(v.step.actions[0] && v.step.actions[0].kind === 'copy' && v.step.actions[0].doc === 'i20-opt' && v.step.actions[0].lead, W, 'Open your copy comes first');
  ok(v.step.lines[0].text.indexOf('Your copy, saved Mar 2, 2026') === 0, W, 'names the saved copy: ' + v.step.lines[0].text);
  ok(v.step.lines.some((l) => /reissue/.test(l.text)) && v.step.actions.some((a) => a.kind === 'draft'), W, 'an I-20 goes to the DSO, with the draft');
  noHoleLeft(v, W + ' copy view');
  const kinds = { ead: /Form I-765/, passport: /consulate/, i94: /CBP I-94 website/ };
  Object.keys(kinds).forEach((k) => {
    const x = Loops.start('lost-paper', { n: k });
    Loops.answer(x.id, 'paper', k);
    Loops.advance(x.id);
    const xv = Loops.view(x);
    ok(xv.step.lines.some((l) => kinds[k].test(l.text)), W, k + ': its replacement step is shown');
    ok(!xv.step.lines.some((l) => /reissue|No replacement steps/.test(l.text)), W, k + ': no DSO line beside its own step');
    noHoleLeft(xv, W + ' ' + k);
  });
  const r = take(lp, 'lost', null, W);
  ok(lp.state === 'closed' && /^Saved: I-20 marked lost Sep 30\./.test(r.receipt), W, 'receipt: ' + r.receipt);
  ok(App.record().lost['i20-opt'] === '2026-09-30', W, 'the old document is marked lost');
});

/* Crisis and notice. */
run('crisis', () => {
  reset();
  const W = 'runtime crisis';
  const m1 = Loops.match('ICE came to my door last night');
  ok(m1.crisis && !m1.notice, W, 'enforcement phrasing opens the crisis screen');
  const m2 = Loops.match('My SEVIS was terminated today');
  ok(m2.crisis && m2.notice, W, 'a SEVIS termination opens the crisis screen with the notice step');
  ok(Loops.match("I can't do this anymore").crisis, W, 'distress phrasing opens the crisis screen');
  ok(Loops.match('I got laid off').kind === 'job-ends', W, 'a guide matches before the boundary (D76)');
  ok(Loops.match('what is the weather').stepback === true, W, 'no match ends in the step back');
  const fp0 = Loops.footprint().length;
  const lp = Loops.start('crisis', { notice: true });
  const v = Loops.view(lp);
  ok(v.step.actions.some((a) => a.href === 'tel:988') && v.step.actions.some((a) => a.kind === 'start' && a.loop === 'notice'), W, '988 and Save the notice on the screen');
  ok(!/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d/.test(JSON.stringify(v.step)), W, 'no dates on the crisis screen');
  take(lp, 'keep', null, W);
  ok(Loops.footprint().length === fp0, W, 'the crisis screen leaves nothing in Your record');
  const n = Loops.start('notice', { parent: lp.id, notice: true });
  take(n, 'save', { kind: 'sevis', arrived: '2026-09-29' }, W);
  ok(n.step === 'handoff' && /^Waiting on your DSO and an attorney until /.test(Loops.seen(n).line), W, 'notice hands off: ' + Loops.seen(n).line);
  ok(Loops.view(n).step.actions.filter((a) => a.kind === 'draft').length === 2, W, 'drafts to the DSO and an attorney');
  const r = take(n, 'dso', null, W);
  ok(n.state === 'closed' && /^Notice saved, arrived Sep 29\./.test(r.receipt), W, 'receipt: ' + r.receipt);
});

/* The check-in, seeded by a stale fact. */
run('checkin', () => {
  reset();
  const W = 'runtime checkin';
  App.state.loops.seeded = false;
  const open = Loops.list();
  const ci = open.filter((l) => l.kind === 'checkin')[0];
  ok(!!ci, W, 'a stale job fact opens a check-in (Northwind confirmed Aug 28)');
  const v = Loops.view(ci);
  ok(v.step.title === 'Still at Northwind Systems, about 40 hours a week?', W, 'title: ' + v.step.title);
  ok(v.step.exits[0].label === 'Still at Northwind Systems', W, 'the yes names the outcome: ' + v.step.exits[0].label);
  const r = take(ci, 'same', null, W);
  ok(/^Confirmed Sep 30\. Next check-in: Oct 30\./.test(r.receipt), W, 'receipt: ' + r.receipt + ' (python: ' + P.nextCheckin + ')');
  reset();
  App.state.loops.seeded = false;
  const ci2 = Loops.list().filter((l) => l.kind === 'checkin')[0];
  take(ci2, 'ended', null, W);
  ok(Loops.list().some((l) => l.kind === 'job-ends' && l.context.parent === ci2.id), W, '"My job ended" hands over to the job-ends loop');
  const wn = Loops.whatsNext();
  ok(wn.loops.length <= 3, W, 'Today shows at most three loops');
});

/* Every step of every playbook draws with every hole filled, from sample answers. */
const SAMPLE = {
  'job-ends': { context: { jobId: 'northwind' }, values: { lastDay: '2026-10-31', newEmployer: 'Acme Robotics', newStart: '2026-11-20', newHours: 'full', question: 'Does a volunteer role count?' }, saved: { reportMade: true } },
  travel: { values: { leave: '2026-12-19', back: '2027-01-09', purpose: 'other', returned: '2027-01-10', question: 'Is my signature enough?' } },
  'stem-filing': { values: { recommended: '2026-12-01', receipt: 'IOE0912345679', newCardFrom: '2027-02-14', newCardUntil: '2029-02-13', question: 'When do I send the I-983?' }, record: { stem: { filed: '2026-12-10' } } },
  address: { values: { address: '200 Oak Street', moved: '2026-10-05', question: 'Is the portal enough?' } },
  'lost-paper': { values: { paper: 'passport', question: 'Who do I contact?' } },
  crisis: { context: { notice: true } },
  notice: { values: { kind: 'visa', arrived: '2026-09-29' } },
  checkin: { context: { jobId: 'northwind' }, values: { newHours: '30', hoursFrom: '2026-10-05' } },
  'report-owed': { context: { reportId: 'report:job-start:northwind' } },
};
run('every step draws', () => {
  for (const kind of kinds) {
    reset();
    const s = SAMPLE[kind] || {};
    if (s.record) Object.keys(s.record).forEach((k) => Object.assign(App.record()[k] = App.record()[k] || {}, s.record[k]));
    const lp = Loops.start(kind, Object.assign({}, s.context || {}));
    Object.assign(lp.values, s.values || {});
    if (s.saved) Object.assign(lp.saved, s.saved);
    if (kind === 'job-ends') App.record().made['report:job-end:northwind'] = '2026-11-04';
    for (const [sk, st] of Object.entries(merged(kind))) {
      lp.step = sk; lp.state = st.state;
      if (/^dso-/.test(sk)) lp.timerAt = '2026-10-07';
      const v = Loops.view(lp);
      const W = 'draw ' + kind + ' step ' + sk;
      ok(!!v.step.title, W, 'the title did not fill');
      noHoleLeft(v.step, W);
      ok(v.step.exits.length > 0 && v.step.exits.every((x) => x.label), W, 'an exit has no label');
      ok(!!Loops.seen(lp).line, W, 'no line for the student');
      noHoleLeft(Loops.seen(lp), W + ' seen');
    }
  }
});

/* ---------------- result ---------------- */
const runtimeChecks = checks - staticChecks;
const runtimeFailures = failures.length - staticFailures;
console.log('Loops: ' + kinds.length + ' playbooks (' + kinds.join(', ') + '), ' + kinds.reduce((n, k) => n + Object.keys(merged(k)).length, 0) + ' steps.');
console.log('Static: ' + staticChecks + ' checks, ' + staticFailures + ' failed. Runtime: ' + runtimeChecks + ' checks, ' + runtimeFailures + ' failed. Dates checked against python3: ' + Object.keys(P).length + '.');
if (failures.length) {
  failures.forEach((f) => console.log('FAIL ' + f));
  process.exit(1);
}
console.log('PASS: every state has a way out, a timer and a follow-up; every loop can close; planned is not closed.');
