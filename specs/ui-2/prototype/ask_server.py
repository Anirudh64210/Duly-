#!/usr/bin/env python3
"""Ask's helper for the ui-2 prototype. Python standard library only.

    python3 ask_server.py            serves http://127.0.0.1:8767
    python3 ask_server.py --facts    prints the facts block and exits
    python3 ask_server.py --prompt   prints a whole prompt for a sample question
    python3 ask_server.py --eval     runs ask_eval.json, writes ask_eval_results.json

POST /ask  {"question": "...",
            "history": [{"q": "...", "a": "..."}],        the whole conversation
            "saved":   ["Works part time at Northwind Systems", ...],
            "goals":   ["own-company", "o1"]}
       ->  {"lead": "...", "applies": [...], "plan": {"now": [...], "stem": [...], "after": [...]},
            "watch": [...], "dso": {"ask": "...", "draft": "..."} | null,
            "sources": [{"name": "...", "href": "..."}],
            "answer": "<the same, as plain text>",
            "actions": [{"type": "loop", "kind": "job-ends", "label": "..."},
                        {"type": "save", "fact": "...", "label": "Save to my record"},
                        {"type": "goal", "goal": "o1", "label": "Add O-1 to my plan"}]}
GET  /health -> {"ok": true}

Round 8, note 1 (BRIEF.md): Ask is a real advisor. It answers the general
rules directly with named official sources, takes what the student says in
the conversation as given for that conversation (and offers to save it), and
answers in one shape: what applies to you, your plan (now, at STEM OPT,
after), watch out for, and only the personal judgement for the DSO, with a
draft. It still never concludes on a disputed point about her own status.

The facts come from the prototype's own engine, not from the model: on start
the helper runs data.js and app/record.js (with core, state, cases, loops and
documents) once under node, the same way check-loops.mjs does, and keeps a
compact block of Priya's record and the dates the engine computed. The model
is told to use only those dates and counts. The rules block below is written
from rulepacks/f1-us/v2026.09 (each line names its citation and status) and,
for O-1 and H-1B, from the uscis.gov pages named beside each line; a line
that is not settled says so and tells the model to say "verify". Sources are
given to the model by id only, so a link on screen is always one of ours.

Each question runs the Claude Code CLI non-interactively:

    claude -p <prompt> --output-format json   (120 s timeout)

with every tool turned off and no saved session, from an empty folder so no
project file is read. Sample data only: this is the prototype's made-up
student, never a real person's record.
"""

import json
import os
import re
import subprocess
import sys
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
BOUNDARY = os.path.join(ROOT, 'BOUNDARY.md')
HOST, PORT = '127.0.0.1', 8767
ORIGINS = {'http://127.0.0.1:8765', 'http://localhost:8765'}
TIMEOUT = 120
KINDS = ['job-ends', 'travel', 'stem-filing', 'address', 'lost-paper']
GOALS = {'own-company': 'Start my own company', 'o1': 'O-1 later'}
MAX_TURNS = 12  # the whole conversation, up to this many earlier turns

# The engine run once under node: every date below is computed by
# app/record.js and app/loops.js, the same code the prototype runs.
FACTS_JS = r"""
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path';
const here = process.argv[2];
const read = (p) => fs.readFileSync(path.join(here, p), 'utf8');
const noop = () => {};
const ctx = { console, setTimeout, clearTimeout, navigator: { userAgent: 'node' }, addEventListener: noop, removeEventListener: noop };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(read('data.js'), ctx, { filename: 'data.js' });
for (const f of ['app/core.js', 'app/state.js', 'app/cases.js', 'app/record.js', 'app/loops.js']) vm.runInContext(read(f), ctx, { filename: f });
try { vm.runInContext(read('app/documents.js'), ctx, { filename: 'app/documents.js' }); } catch (e) { /* calendar dates are optional */ }
const App = ctx.App; App._.emit = () => {}; App._.render = () => {}; App._.toast = () => {};
const D = App.dates, S = ctx.DULY_SAMPLE, t = S.today.iso, rec = App.record(), c = App.compute();
const fy = (iso) => (D.okIso(iso) ? D.fmtY(iso) : null);
const away = (iso) => { const n = D.daysBetween(t, iso); return n === 0 ? 'today' : (n > 0 ? 'in ' + n + ' days' : n * -1 + ' days ago'); };
const L = [];
const st = S.student || {};
L.push('Today: ' + fy(t) + '.');
L.push('Student: ' + st.name + ', ' + st.visa + ', ' + (rec.program || {}).level + ' in ' + (rec.program || {}).major + ' at ' + st.school + ', program ended ' + fy((rec.program || {}).end) + '.');
const o = rec.opt || {};
if (D.okIso(o.until)) {
  const on = o.from <= t && t <= o.until;
  L.push((on ? 'Now on ' : '') + o.category + ' (' + o.code + '), her first OPT period, not yet the STEM extension. EAD card valid ' + fy(o.from) + ' to ' + fy(o.until) + ', ' + D.daysBetween(t, o.until) + ' days left.');
}
/* Her jobs, each with its hours, dates and last confirmation. */
const jobs = rec.jobs || [];
const cur = jobs.filter((j) => !j.end || j.end >= t);
L.push('Jobs on the record: ' + (cur.length ? cur.length + ' current' : 'none current') + '.');
jobs.forEach((j) => L.push('Job: ' + (j.title ? j.title + ' at ' : '') + j.employer + ', started ' + fy(j.start) + (j.end ? ', ended ' + fy(j.end) : ', current') +
  (j.hours != null ? ', ' + j.hours + ' hours a week' : '') + (j.kind ? ', ' + j.kind : '') + (j.confirmedOn ? ', last confirmed ' + fy(j.confirmedOn) : '') + '.' +
  ((j.hoursChanges || []).length ? ' Hours changed: ' + j.hoursChanges.map((h) => h.hours + ' hours from ' + fy(h.from || h.on)).join('; ') + '.' : '')));
(rec.cpt || (S.records || {}).cpt || []).forEach((j) => L.push('Earlier CPT: ' + j.employer + ', ' + fy(j.start) + ' to ' + fy(j.end) + (j.fullTime ? ', full time' : ', part time') + '.'));
const u = c['unemployment.used'];
if (u && u.n != null) {
  L.push('Days without work on this OPT: ' + u.n + ' of ' + App.RULE.unemploymentLimit + ' used, as of ' + fy(u.asOf) + ' (' + (App.RULE.unemploymentLimit - u.n) + ' left). Counted: ' + ((S.unemployment || {}).every || {}).counted);
  /* The STEM limit counts over the whole OPT period, days already used
     included: 150 minus 13 used = 137 left, if no more days are used. */
  const sl = App.RULE.stemUnemploymentLimit;
  L.push('If STEM OPT is approved, the limit becomes ' + sl + ' days in all over the whole OPT period. With ' + u.n + ' used as of ' + fy(u.asOf) + ', ' + (sl - u.n) + ' would be left over the whole OPT, if no more days are used (' + sl + ' minus ' + u.n + ').');
} else if (u) L.push('Days without work: ' + u.text + '.');
/* Her 40 hours at her current job against the 20-hour minimum. */
cur.filter((j) => j.hours != null).forEach((j) => L.push('Hours check: ' + j.employer + ' alone is ' + j.hours + ' hours a week, ' + (j.hours >= App.RULE.minHours ? 'which already meets' : 'which is under') + ' the ' + App.RULE.minHours + '-hour weekly minimum on its own.'));
/* The STEM period if approved: the day after the card ends, plus 24 months,
   less a day. Feb 13, 2027 + 1 day = Feb 14, 2027; + 24 months = Feb 14,
   2029; less 1 day = Feb 13, 2029. The approval notice sets the real dates. */
let stemTo = null;
if (D.okIso(o.until)) {
  const sf = D.addDays(o.until, 1);
  stemTo = D.addDays(D.addMonths(sf, App.RULE.stemMonths), -1);
  L.push('If STEM OPT is approved, it runs ' + App.RULE.stemMonths + ' months from the day after the EAD card ends: ' + fy(sf) + ' to ' + fy(stemTo) + ' (computed; the approval notice sets the dates). A trip or a date before ' + fy(o.until) + ' is inside the current card.');
}
/* H-1B cap seasons ahead: registration each spring of year y, start Oct 1 of
   y (fiscal year y + 1), cap-gap at most to Apr 1 of y + 1. Each start is
   compared with the STEM end above. */
if (stemTo) {
  const y0 = Number(t.slice(0, 4)) + 1;
  const seasons = [y0, y0 + 1, y0 + 2].map((y) => {
    const start = y + '-10-01';
    return 'spring ' + y + ' season, H-1B start ' + fy(start) + ' (' + (start <= stemTo ? 'before' : 'after') + ' the STEM OPT end if approved, ' + fy(stemTo) + ')';
  });
  L.push('H-1B cap seasons ahead: ' + seasons.join('; ') + '. Cap-gap only matters when OPT would end between the petition and the H-1B start.');
}
const d90 = c['unemployment.day90']; if (d90 && d90.iso) L.push('Day 90 without work, if nothing changes: ' + fy(d90.iso) + '.');
(App.checkins ? App.checkins() : []).forEach((k) => L.push('Check-in waiting: "' + k.title + '" ' + k.meta));
const fb = App.fileBy ? App.fileBy('stem') : null;
if (fb && fb.opens) {
  L.push('STEM OPT extension: not filed yet. Filing window opens ' + fy(fb.opens) + ' (' + away(fb.opens) + '). Last day to file: ' + fy(fb.last) + ' (' + away(fb.last) + '), set by the EAD card end. ' + (fb.needs ? 'The exact last day may be earlier: it also depends on the date the school recommends the extension, which is not on the record yet.' : ''));
}
/* The STEM OPT steps, each with its status. */
try {
  const steps = App.steps('stem') || [];
  if (steps.length) L.push('STEM OPT steps: ' + steps.map((s, i) => (i + 1) + ') ' + ((s.step || {}).title || s.key) + ': ' + (s.done ? 'done' : 'open') + ((s.step || {}).meta ? ' (' + s.step.meta + ')' : '')).join('; ') + '.');
} catch (e) { /* steps are optional */ }
if (App.calendarEvents) {
  try {
    const ev = App.calendarEvents();
    /* "Start preparing" is the window opening less one month: a planning
       date, not a rule, and said so. */
    if (ev.length) L.push('Dates ahead: ' + ev.map((e) => fy(e.iso) + ' ' + e.title + (/^Start preparing/.test(e.title) ? ', a planning date one month before the window opens, not a rule' : '') + ' (' + away(e.iso) + ')').join('; ') + '.');
  } catch (e) { /* calendar dates are optional */ }
}
(App.documentWatch ? App.documentWatch().items : []).forEach((i) => {
  if (i.key === 'travelSignature') L.push('Travel signature on the OPT I-20: signed ' + fy((rec.travelSignature || {}).signed) + ', covers returns until ' + fy(i.iso) + (i.passed ? ', which has passed, so it does not cover a return now' : '') + '.');
  else if (i.key === 'program') return;
  else L.push('Document: ' + i.title + ', valid until ' + fy(i.iso) + (i.sample ? ' (sample date)' : '') + '.');
});
if (rec.address) L.push('Address on record since ' + fy(rec.address.since) + '.');
const ro = App.reportsOwed ? App.reportsOwed() : null;
if (ro) L.push('Reports owed to the DSO now: ' + (ro.open.length ? ro.open.map((r) => r.title + ' by ' + fy(r.due)).join('; ') : 'none') + '.');
const apps = ((S.applications || {}).items || []).filter((a) => a.receipt).map((a) => a.title + ': ' + a.status + (a.asOf ? ', as of ' + a.asOf : ''));
if (apps.length) L.push('USCIS cases: ' + apps.join('; ') + '.');
/* What the engine says if the first job ended yesterday or today. */
const y = D.addDays(t, -1);
[y, t].forEach((day) => {
  const w = App.whatIf({ kind: 'jobEnd', on: day });
  if (!w.ok) return;
  const rows = w.rows.map((r) => r.label + ': ' + r.after + ((r.rule && r.rule.counted) ? ' (' + r.rule.counted.join(' ') + ')' : ''));
  L.push('If the job at ' + (jobs[0] || {}).employer + ' ended ' + fy(day) + ': ' + rows.join('; ') + '.');
});
const loops = App.loops.whatsNext({ max: 9 }).loops.map((lp) => { const v = App.loops.view(lp); return (v.title || lp.kind) + ' (' + App.loops.seen(lp).line + ')'; });
if (loops.length) L.push('Open in the app now: ' + loops.join('; ') + '.');
const sit = App.loops.situations().filter((s) => %KINDS%.indexOf(s.kind) >= 0).map((s) => ({ kind: s.kind, label: s.label }));
process.stdout.write(JSON.stringify({ lines: L, situations: sit, today: t }));
"""

# The sources the model may name, by id. Only these reach the screen.
SOURCES = {
    'sits-opt': ('Study in the States, F-1 OPT', 'https://studyinthestates.dhs.gov/sevis-help-hub/student-records/fm-student-employment/f-1-optional-practical-training-opt'),
    'sits-stem': ('Study in the States, STEM OPT Hub', 'https://studyinthestates.dhs.gov/stem-opt-hub'),
    'sevp-1004': ('SEVP Policy Guidance 1004-03', 'https://www.ice.gov/doclib/sevis/pdf/opt_policy_guidance_042010.pdf'),
    'cfr-f': ('8 CFR 214.2(f), F-1 students', 'https://www.ecfr.gov/current/title-8/section-214.2'),
    'fr-stem': ('81 FR 13040, the STEM OPT rule', 'https://www.federalregister.gov/d/2016-04828'),
    'fr-capgap': ('89 FR 103054, the cap-gap rule', 'https://www.federalregister.gov/d/2024-29354'),
    'cfr-o': ('8 CFR 214.2(o), O-1', 'https://www.ecfr.gov/current/title-8/section-214.2'),
    'uscis-o1': ('uscis.gov, O-1 extraordinary ability', 'https://www.uscis.gov/working-in-the-united-states/temporary-workers/o-1-visa-individuals-with-extraordinary-ability-or-achievement'),
    'uscis-pm-o': ('USCIS Policy Manual, O-1', 'https://www.uscis.gov/policy-manual/volume-2-part-m'),
    'uscis-h1b': ('uscis.gov, H-1B cap season', 'https://www.uscis.gov/working-in-the-united-states/temporary-workers/h-1b-specialty-occupations-and-fashion-models/h-1b-cap-season'),
    'uscis-i765': ('uscis.gov, Form I-765', 'https://www.uscis.gov/i-765'),
    'uscis-address': ('uscis.gov, change of address', 'https://www.uscis.gov/addresschange'),
    'cfr-265': ('8 CFR 265.1, address reports', 'https://www.ecfr.gov/current/title-8/section-265.1'),
    'everify': ('E-Verify Employer Search', 'https://www.e-verify.gov/about-e-verify/e-verify-data/e-verify-employer-search'),
    'cbp-i94': ('CBP, I-94 website', 'https://i94.cbp.dhs.gov'),
    'uscis-i9-receipts': ('uscis.gov, I-9 Central, receipts', 'https://www.uscis.gov/i-9-central/form-i-9-acceptable-documents/receipts'),
}

# The rules, compact, each with its status and source ids. Written from
# rulepacks/f1-us/v2026.09/parameters.yaml (ids in brackets) unless named.
RULES = [
    ('OPT hours', 'guidance', 'Post-completion OPT is at least 20 hours a week or full time. [opt.min_hours_per_week]', 'sits-opt sevp-1004'),
    ('Kinds of OPT work', 'guidance', 'On post-completion OPT a student may work for more than one employer, each job related to the degree; may do contract (1099) work; and may be a self-employed business owner, with the proper business licences and actively engaged in a business related to the degree. Hours for a self-employed owner: Study in the States guidance says a self-employed business owner on post-completion OPT works full time, while SEVP 1004-03 asks full time only under the old 17-month extension, so tell her to plan to work full time in the business, not 20 hours, and verify with the DSO. The guidance does not tie this to the business being her only work: never narrow it that way. Keep evidence of each job (title, dates, supervisor or contact, duties). Whether hours from several jobs are added up toward 20 is not spelled out: say verify, but first check whether one job already meets 20 on its own (see Hours check in her record); if it does, the adding-up question does not decide anything.', 'sevp-1004 sits-opt'),
    ('Days without work, OPT', 'settled', 'At most 90 days of unemployment in all during post-completion OPT. [opt.unemployment_limit_days, 8 CFR 214.2(f)(10)(ii)(E)]', 'cfr-f'),
    ('Days without work, STEM OPT', 'settled', 'With the 24-month STEM extension, at most 150 days in all over the whole OPT period, which includes the days already used on post-completion OPT. [stem.unemployment_limit_days]', 'cfr-f'),
    ('Days abroad', 'guidance', 'Time outside the US on post-completion OPT counts as unemployment unless on leave the employer allowed or travelling for the job. [opt.unemployment_abroad]', 'sevp-1004'),
    ('Reporting on OPT', 'settled', 'Report a change of name, address, a new employer (each one, including self-employment) or an interruption of work to the DSO within 10 days, in the SEVP Portal or through the DSO. [opt.report_employer_within_days]', 'sits-opt cfr-f'),
    ('Reporting on STEM OPT', 'settled', 'Within 10 days report a change of name, address, employer name or address, or loss of a job; a validation report every 6 months, due within 10 business days of each reporting date; a 12-month and a final evaluation on Form I-983 within 10 days of each period ending. [stem.report_change_within_days, stem.validation_*, stem.evaluation_due_days]', 'cfr-f sits-stem'),
    ('STEM OPT employer', 'settled', 'The employer is enrolled in E-Verify and in good standing and has an EIN; the job is directly related to the STEM degree; at least 20 hours a week; a Form I-983 training plan signed by an appropriate person at the employer, never the student, before the DSO recommends; a real employer-employee relationship. The 20 hours are per STEM employer: a job under 20 hours a week cannot be a STEM OPT employer on its own. When the student leaves or the job ends early, the employer must report it to the DSO within 5 business days (8 CFR 214.2(f)(10)(ii)(C)(6)); the student reports it too, within 10 days. A new employer during STEM OPT means a new I-983 to the DSO within 10 days, and the days between jobs count toward the 150. [stem.requires.*, stem.min_hours_per_week, stem.new_plan_due_days, stem.employer_reports_departure]', 'cfr-f sits-stem'),
    ('STEM OPT and a start-up', 'settled', 'A start-up can be the STEM employer only if it meets each STEM employer requirement, and an answer must name them: enrolled in E-Verify, has an EIN, at least 20 paid hours a week related to the STEM degree, a Form I-983 signed by someone at the company other than her (she may not sign the employer attestations on her own behalf), and a bona fide employer-employee relationship (the 2016 rule), and sole proprietorships and arrangements without a real employer-employee relationship are named as not apt. Self-employment as on post-completion OPT does not carry over. Whether a given company meets this is a DSO judgement.', 'fr-stem sits-stem'),
    ('Filing for STEM OPT', 'settled', 'File Form I-765 up to 90 days before the OPT card ends, while still inside the OPT period, and within 60 days of the DSO entering the recommendation. The degree is on the STEM list. [stem.apply_before_expiry_days, stem.file_within_days_of_recommendation]', 'cfr-f sits-stem uscis-i765'),
    ('While STEM OPT is pending', 'settled', 'If the extension was filed on time and the card ends before a decision, work permission is extended automatically under 8 CFR 274a.12(b)(6)(iv); the length is not in these rules: say verify on uscis.gov. [stem.pending_card_extended]', 'cfr-f uscis-i765'),
    ('Travel on OPT', 'settled', 'To return on OPT a student carries the EAD card and an I-20 the DSO signed for travel within the last 6 months, with a valid passport and visa. A return before the EAD card ends is made with an unexpired card, plus a new travel signature if hers has passed; the harder case is a return after the card ends while STEM OPT is still pending, and what to carry then is not in these rules: say verify. The trip itself is a DSO judgement. [travel.opt_signature_months]', 'cfr-f sits-opt'),
    ('Cap-gap', 'settled', 'With a timely H-1B cap petition that asks for a change of status, F-1 status and OPT work permission run on until April 1 of the H-1B fiscal year, or the H-1B start if earlier (petitions filed on or after Jan 17, 2025). It ends if the petition is rejected, denied, revoked or withdrawn. The unemployment limit that applies to her OPT period continues during cap-gap (guidance): 90 days on post-completion OPT, 150 days in all once on STEM OPT; by an H-1B season she would most likely be on STEM OPT, so name the 150. Before talking about cap-gap, test whether a gap exists: compare the H-1B start in the cap seasons in her record with the STEM OPT end if approved; if the start comes before that end, there is no gap to bridge and say so. Leaving the US while a change of status is pending is treated as abandoning it (guidance). [capgap.*]', 'cfr-f fr-capgap sevp-1004'),
    ('Grace after OPT', 'litigated', 'A 60-day period follows the end of OPT. A 2026 DHS rule that would change admission periods was enjoined nationwide on Sep 14, 2026, so duration of status and the 60 days stay in place for now: say this is litigated and verify.', 'cfr-f'),
    ('H-1B', 'guidance', 'Cap H-1B starts with an electronic registration by an employer each spring and a selection by USCIS, for a start on Oct 1. The employer files; a student does not file for herself. How selection is weighted changed recently: say verify on uscis.gov. The $100,000 payment in the Sept 2025 proclamation is litigated (a federal court vacated the policy on Jun 8, 2026): never conclude, say verify. Mention it only when she asks about it. O-1 has no cap and no lottery and is another route; name it as an option, without recommending it.', 'uscis-h1b uscis-o1'),
    ('O-1', 'settled', 'O-1 has no annual cap and no lottery: say both whenever O-1 comes up. A US employer, a US agent, or a foreign employer through a US agent files Form I-129 on her behalf (uscis.gov); she cannot petition for herself (8 CFR 214.2(o)(2)(i)). O-1A evidence is a major internationally recognised award, or at least 3 of these 8 (say "at least 3"): lesser awards, membership needing outstanding achievement, press about her work, judging others\' work, original contributions of major significance, scholarly articles, a critical role at distinguished organisations, high pay. A written advisory opinion from a peer group or an expert is required, with narrow exceptions (uscis.gov). The USCIS Policy Manual lists founding a start-up with a distinguished reputation as evidence of a critical role. Whether a company she owns can be the petitioner is not settled in these rules: say verify. From F-1 it is a change of status or a visa abroad.', 'uscis-o1 cfr-o uscis-pm-o'),
    ('Address with USCIS', 'settled', 'Non-citizens report a new address to USCIS within 10 days, online (Form AR-11), separate from the report to the DSO.', 'cfr-265 uscis-address'),
    ('Lost EAD card', 'guidance', 'A lost or stolen card is replaced by filing Form I-765 for a replacement with the fee shown on uscis.gov; the dates of the work permission do not change and losing the card does not end them. For Form I-9, a receipt showing she applied to replace a lost, stolen or damaged document is accepted for 90 days at hire or at reverification, and the replacement card is shown within those 90 days (uscis.gov, I-9 Central). A current employer that already completed her I-9 usually needs no new I-9 for a lost card; what Northwind asks for is an HR question. If her STEM OPT filing is near (her record gives the window), the STEM approval brings a new card anyway: say to weigh a replacement against that and against replacement processing times on uscis.gov (verify), and note she needs the card itself to travel.', 'uscis-i765 uscis-i9-receipts'),
    ('I-94', 'settled', 'The I-94 record is on the CBP website after each entry.', 'cbp-i94'),
]


def load_facts():
    """Runs the engine once under node and returns (facts_text, situations)."""
    src = FACTS_JS.replace('%KINDS%', json.dumps(KINDS))
    with tempfile.NamedTemporaryFile('w', suffix='.mjs', delete=False) as f:
        f.write(src)
        path = f.name
    try:
        out = subprocess.run(['node', path, HERE], capture_output=True, text=True, timeout=30)
        if out.returncode != 0:
            raise RuntimeError(out.stderr.strip()[-600:])
        data = json.loads(out.stdout)
    finally:
        os.unlink(path)
    lines = [re.sub(r'\s+', ' ', x).strip() for x in data['lines'] if x]
    return '\n'.join('- ' + x for x in lines), data['situations']


def read_boundary():
    try:
        with open(BOUNDARY, encoding='utf8') as f:
            return f.read()
    except OSError:
        return '(BOUNDARY.md was not found. Never give a legal conclusion about this student; step back to the DSO.)'


FACTS, SITUATIONS = load_facts()
BOUNDARY_TEXT = read_boundary()
SITUATION_LINES = '\n'.join('- %s: %s' % (s['kind'], s['label']) for s in SITUATIONS)
RULE_LINES = '\n'.join('- %s [%s]: %s Sources: %s' % (n, tag, text, ', '.join(ids.split())) for n, tag, text, ids in RULES)
SOURCE_LINES = '\n'.join('- %s: %s' % (k, v[0]) for k, v in SOURCES.items())


def clean(s, n=2000):
    return re.sub(r'\s+', ' ', str(s or '')).strip()[:n]


def build_prompt(question, history, saved=None, goals=None):
    past = ''
    for turn in (history or [])[-MAX_TURNS:]:
        q = clean(turn.get('q'), 800)
        a = clean(turn.get('a'), 2400)
        if q:
            past += 'Student: %s\nYou: %s\n\n' % (q, a or '(no answer)')
    said = '\n'.join('- ' + clean(x, 300) for x in (saved or [])[:20] if clean(x))
    goal_lines = '\n'.join('- ' + GOALS[g] for g in (goals or []) if g in GOALS)
    return f"""You are the advisor inside the student's own immigration app. You talk to one F-1 student about her own record, like a calm, well informed friend who knows the rules and has her file open. Be useful: answer what the rules say, directly, and turn it into a plan for her.

HER RECORD (computed from her documents; the only dates and counts you may use):
{FACTS}

WHAT SHE SAVED TO HER RECORD EARLIER (take as true):
{said or '- nothing yet'}

HER GOALS IN HER PLAN:
{goal_lines or '- none yet'}

THE RULES (each with its status and source ids):
{RULE_LINES}

SOURCE IDS YOU MAY CITE (only these):
{SOURCE_LINES}

HOW TO ANSWER
1. Answer the general rules directly and with confidence when THE RULES cover them, naming the source in plain words (Study in the States, uscis.gov, 8 CFR). Agency guidance is called guidance. Where you are not certain, or a rule line says verify, write "verify on <source>" in that line. Never invent a rule, a number or a source, and never point to a site, service or organisation that is not in SOURCE IDS.
2. Facts she states in this conversation (her plans, jobs, hours, dates, a company) are given for this conversation. Use them, and say "you said" once when it matters. When she states a fact about herself that is not in HER RECORD, offer one save action with that fact. When it differs from HER RECORD (for example hours), go by what she said and note the record says otherwise in one short line.
3. Dates and counts: use only those in HER RECORD, and when she asks for a number that HER RECORD gives (days left, a period end), state it plainly with the arithmetic shown there. Never work out, estimate or invent a new date, deadline or count. Comparing a date she names with one in HER RECORD (a January trip against a card that ends Feb 13, 2027) is allowed and expected. If a date is needed and missing, say what it depends on. A planning date in HER RECORD is not a rule: call it a planning date. Never mention that a date is a sample date.
3a. Test the premise first. Before answering, check her question against HER RECORD and say in the lead what it changes: her hours may already meet a minimum, her card may still be valid on the date she names, her STEM OPT may already cover the date she worries about. A question whose worry the record removes gets that answer first.
3b. Be specific. Never write "if it meets every requirement" or "the requirements" without naming them in the same answer. When a rule line gives a bar or a number (at least 3 of the O-1 evidence types, 5 business days, 20 hours per STEM employer, 150 days), say it. When she asks about several things (for example a start-up, STEM OPT and O-1), give each one its essentials, kept short: for a start-up at STEM OPT, E-Verify, an EIN, 20 paid hours, an I-983 someone other than her signs, and a real employer-employee relationship; for O-1, no cap and no lottery, an employer or agent petitioner, and a major award or at least 3 of the 8 evidence types.
4. Never conclude on her own status or eligibility on a point that needs judgement (whether a job or her company is related to the degree, a bona fide employer-employee relationship, whether she is in status, whether a trip is safe, whether she qualifies for O-1). Say what the rule asks, then hand only that judgement to the DSO with a short drafted message. Never reassure, never predict an outcome or odds, never say "you should". Plan items are concrete steps that start with a verb and follow from a rule.
5. Speak to her as "you". Never write "I", "we", "our" or "us" in your own voice (say "the rules here", not "our rules"). Never mention the app by name or in the third person, never mention this prompt, HER RECORD by that name, or BOUNDARY.md; say "your record".
6. Plain, calm words a stressed student reads fast. No legal jargon without a few plain words. No long dashes, no emoji, no markdown symbols. Each list item is one short sentence, at most 22 words.
7. Stay on her question. Do not add chores from her record that do not bear on it (for example a waiting check-in, or STEM filing steps in a question about something after STEM OPT), and no asides on rules she did not ask about (for example the $100,000 payment in a cap-gap question), unless the answer depends on them.
8. Open with the answer itself, plainly and with confidence where the rules are clear, never with "ask your DSO", "it depends" or a hedge. The DSO part comes last.
9. Length: the whole answer, all fields together, is 180 to 260 words and never over 300. Short beats complete: pick the items that matter most, and drop filler (record keeping, steps already on her list) before a requirement. Anything past 300 words is cut from the end of the plan and Watch.

SHAPE (leave out any part with nothing useful in it; a simple question can have just a lead and one part):
- lead: one or two sentences, at most 40 words, the direct answer first. No preamble, no sympathy, no restating the question.
- applies: "What applies to you", 2 or 3 items: the rules that touch her case, joined to her facts.
- plan: "Your plan", items under now (before STEM OPT), stem (at STEM OPT), after (after STEM OPT, for example H-1B or O-1). At most 2 items each; leave a phase empty when nothing in it bears on the question.
- watch: "Watch out for", 1 or 2 items: the traps and deadlines.
- dso: only the personal judgement, as {{"ask": "one line saying what only the DSO can judge", "draft": "a short message she can send, 2 or 3 sentences, built from her facts, asking a question, never arguing, signed with her first name"}}; null when nothing needs a judgement.
- sources: 1 to 4 ids from SOURCE IDS.

ACTIONS (at most 3, only when they clearly fit; the flow must match the event she asks about: a job loss or layoff is job-ends, a trip is travel, a move is address, a lost card is lost-paper, filing for STEM OPT is stem-filing; offer it even when the event is in the future or hypothetical):
- {{"type": "loop", "kind": "<kind>", "label": "<button, at most 5 words>"}} starts a guided flow, kinds:
{SITUATION_LINES}
- {{"type": "save", "fact": "<the fact she stated, short, in third person about her record, e.g. Works part time at Northwind Systems, 20 hours a week>"}}
- {{"type": "goal", "goal": "own-company" or "o1"}} adds that goal to her plan, when she says she is aiming for it and it is not in HER GOALS yet.

OUTPUT: one JSON object and nothing else:
{{"lead": "...", "applies": ["..."], "plan": {{"now": ["..."], "stem": ["..."], "after": ["..."]}}, "watch": ["..."], "dso": {{"ask": "...", "draft": "..."}}, "sources": ["sits-opt"], "actions": [{{"type": "save", "fact": "..."}}]}}

BOUNDARY.md (the line; THE RULES and HOW TO ANSWER above say how this app applies it now):
{BOUNDARY_TEXT}

{('THE CONVERSATION SO FAR:' + chr(10) + past) if past else ''}HER QUESTION NOW: {question}
"""


def tidy(s, n=400):
    """One line of copy: no long dashes, no markdown marks, no spare spaces."""
    s = str(s or '').replace('—', ', ').replace('–', ' to ').replace('**', '').replace('`', '')
    s = re.sub(r'^\s*[-*•]\s+', '', s)
    s = re.sub(r'\s+([,.;:])', r'\1', re.sub(r'[ \t]+', ' ', s)).strip()
    return s[:n]


def items(v, most):
    if isinstance(v, str):
        v = [v]
    if not isinstance(v, list):
        return []
    return [tidy(x) for x in v if isinstance(x, str) and tidy(x)][:most]


def flatten(r):
    """The answer as plain text: for history, the screen reader and the eval."""
    out = [r['lead']] if r['lead'] else []

    def block(title, xs):
        if xs:
            out.append(title + '\n' + '\n'.join('- ' + x for x in xs))
    block('What applies to you', r['applies'])
    p = r['plan']
    if any(p.values()):
        rows = []
        for key, label in (('now', 'Now'), ('stem', 'At STEM OPT'), ('after', 'After')):
            rows += ['- %s: %s' % (label, x) for x in p[key]]
        out.append('Your plan\n' + '\n'.join(rows))
    block('Watch out for', r['watch'])
    if r['dso']:
        out.append('Ask your DSO\n' + r['dso']['ask'] + (('\nDraft: ' + r['dso']['draft']) if r['dso']['draft'] else ''))
    return '\n\n'.join(out)


def words(r):
    return len(re.findall(r"[A-Za-z0-9$][A-Za-z0-9'$.,()/-]*", flatten(r)))


def parse_reply(text):
    """The model's reply in the answer shape; plain text is kept as the lead."""
    text = (text or '').strip()
    obj = None
    m = re.search(r'\{.*\}', text, re.S)
    if m:
        raw = m.group(0)
        # A stray "}" that closes the object early (seen once in the eval:
        # '"stem": [...]}, "watch": [...]}, "dso": ...') leaves "Extra data"
        # that starts with a comma: drop that brace and parse again.
        for _ in range(3):
            try:
                obj = json.loads(raw)
                break
            except json.JSONDecodeError as e:
                cut = raw.rfind('}', 0, e.pos)
                if e.msg != 'Extra data' or cut < 0 or not raw[e.pos:].lstrip().startswith(','):
                    obj = None
                    break
                raw = raw[:cut] + raw[cut + 1:]
    if not isinstance(obj, dict):
        r = {'lead': tidy(text, 2000), 'applies': [], 'plan': {'now': [], 'stem': [], 'after': []}, 'watch': [], 'dso': None, 'sources': [], 'actions': []}
        r['answer'] = flatten(r)
        return r
    plan = obj.get('plan') if isinstance(obj.get('plan'), dict) else {}
    dso = obj.get('dso') if isinstance(obj.get('dso'), dict) else None
    if dso:
        dso = {'ask': tidy(dso.get('ask'), 300), 'draft': tidy(dso.get('draft'), 900)}
        if not dso['ask'] and not dso['draft']:
            dso = None
    srcs = []
    for s in obj.get('sources') or []:
        k = str(s).strip()
        if k in SOURCES and k not in [x['id'] for x in srcs]:
            srcs.append({'id': k, 'name': SOURCES[k][0], 'href': SOURCES[k][1]})
    actions = []
    for a in obj.get('actions') or []:
        if not isinstance(a, dict):
            continue
        typ = a.get('type') or ('loop' if a.get('kind') else '')
        if typ == 'loop' and a.get('kind') in KINDS and a['kind'] not in [x.get('kind') for x in actions]:
            label = tidy(a.get('label'), 48) or next((s['label'] for s in SITUATIONS if s['kind'] == a['kind']), a['kind'])
            actions.append({'type': 'loop', 'kind': a['kind'], 'label': label})
        elif typ == 'save' and tidy(a.get('fact'), 160):
            fact = tidy(a.get('fact'), 160).rstrip('.')
            if fact not in [x.get('fact') for x in actions]:
                actions.append({'type': 'save', 'fact': fact, 'label': 'Save to my record'})
        elif typ == 'goal' and a.get('goal') in GOALS and a['goal'] not in [x.get('goal') for x in actions]:
            actions.append({'type': 'goal', 'goal': a['goal'], 'label': 'Add "%s" to my plan' % GOALS[a['goal']]})
    r = {
        'lead': tidy(obj.get('lead') or obj.get('answer'), 600),
        'applies': items(obj.get('applies'), 3),
        'plan': {k: items(plan.get(k), 2) for k in ('now', 'stem', 'after')},
        'watch': items(obj.get('watch'), 2),
        'dso': dso,
        'sources': srcs[:4],
        'actions': actions[:3],
    }
    # Under 300 words, always: past the limit, the last item of the longest
    # plan phase goes first, then of Watch, and the rules in "What applies"
    # last, since they carry the requirements (a list keeps at least one item).
    while words(r) >= 300:
        for tier in ([r['plan']['now'], r['plan']['stem'], r['plan']['after']], [r['watch']], [r['applies']]):
            pools = [p for p in tier if len(p) > 1]
            if pools:
                max(pools, key=lambda p: sum(len(x) for x in p)).pop()
                break
        else:
            break
    r['answer'] = flatten(r)
    return r


def ask(question, history, saved=None, goals=None):
    prompt = build_prompt(question, history, saved, goals)
    cmd = ['claude', '-p', prompt, '--output-format', 'json', '--tools', '', '--no-session-persistence']
    with tempfile.TemporaryDirectory() as empty:
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=TIMEOUT, cwd=empty)
    if out.returncode != 0 and not out.stdout.strip():
        raise RuntimeError((out.stderr or 'claude exited with ' + str(out.returncode)).strip()[-400:])
    try:
        env = json.loads(out.stdout)
    except ValueError:
        return parse_reply(out.stdout)
    if env.get('is_error'):
        raise RuntimeError(str(env.get('result') or 'claude returned an error')[:400])
    return parse_reply(env.get('result', ''))


class Handler(BaseHTTPRequestHandler):
    server_version = 'DulyAsk/2'

    def cors(self):
        origin = self.headers.get('Origin', '')
        if origin in ORIGINS:
            self.send_header('Access-Control-Allow-Origin', origin)
            self.send_header('Vary', 'Origin')
            self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.send_header('Access-Control-Max-Age', '600')

    def reply(self, code, body):
        raw = json.dumps(body).encode('utf8')
        self.send_response(code)
        self.cors()
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(raw)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(raw)

    def do_OPTIONS(self):
        self.send_response(204)
        self.cors()
        self.end_headers()

    def do_GET(self):
        if self.path == '/health':
            return self.reply(200, {'ok': True, 'shape': 2})
        if self.path == '/facts':
            return self.reply(200, {'facts': FACTS, 'rules': RULE_LINES})
        return self.reply(404, {'error': 'not found'})

    def do_POST(self):
        if self.path != '/ask':
            return self.reply(404, {'error': 'not found'})
        try:
            n = int(self.headers.get('Content-Length') or 0)
            body = json.loads(self.rfile.read(min(n, 200000)) or b'{}')
        except ValueError:
            return self.reply(400, {'error': 'Send JSON: {"question": "..."}'})
        q = str(body.get('question') or '').strip()[:1500]
        if not q:
            return self.reply(400, {'error': 'The question is empty.'})
        hist = body.get('history') if isinstance(body.get('history'), list) else []
        hist = [h for h in hist if isinstance(h, dict)]
        saved = [str(x) for x in body.get('saved') or [] if isinstance(x, str)]
        goals = [str(x) for x in body.get('goals') or [] if isinstance(x, str)]
        try:
            return self.reply(200, ask(q, hist, saved, goals))
        except subprocess.TimeoutExpired:
            return self.reply(504, {'error': 'No answer within %d seconds. Try again.' % TIMEOUT})
        except FileNotFoundError:
            return self.reply(500, {'error': 'The claude command was not found on this computer.'})
        except Exception as e:  # noqa: BLE001  the prototype shows the reason
            return self.reply(502, {'error': str(e)[:400]})

    def log_message(self, fmt, *args):
        sys.stderr.write('ask  %s\n' % (fmt % args))


def run_eval():
    """Runs every question in ask_eval.json through ask() and saves the answers."""
    with open(os.path.join(HERE, 'ask_eval.json'), encoding='utf8') as f:
        cases = json.load(f)['questions']

    def one(c):
        t0 = time.time()
        try:
            r = ask(c['question'], c.get('history') or [], c.get('saved') or [], c.get('goals') or [])
            err = None
        except Exception as e:  # noqa: BLE001  saved with the result
            r, err = None, str(e)[:400]
        out = {'id': c['id'], 'question': c['question'], 'ideal': c['ideal'], 'seconds': round(time.time() - t0, 1)}
        if r is None:
            out['error'] = err
            return out
        flat = r['answer']
        out.update({
            'result': r,
            'checks': {
                'words': words(r),
                'under_300_words': words(r) < 300,
                'has_lead': bool(r['lead']),
                'parts': [k for k in ('applies', 'watch') if r[k]] + (['plan'] if any(r['plan'].values()) else []) + (['dso'] if r['dso'] else []),
                'sources': [s['id'] for s in r['sources']],
                'no_long_dash': not re.search('[\\u2014\\u2013]', flat),
                'no_third_person': not re.search(r'\bDuly\b', flat),
                'no_first_person': not re.search(r'\b(we|our)\b', flat, re.I) and not re.search(r'\bus\b', flat),
                'no_should':not re.search(r'\byou should\b', flat, re.I),
                'no_reassurance': not re.search(r"\b(you're fine|you are fine|nothing to worry|you are safe|you're safe)\b", flat, re.I),
            },
        })
        return out

    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(one, cases))
    path = os.path.join(HERE, 'ask_eval_results.json')
    with open(path, 'w', encoding='utf8') as f:
        json.dump({'ran': time.strftime('%Y-%m-%d %H:%M'), 'results': results}, f, indent=2, ensure_ascii=False)
        f.write('\n')
    for r in results:
        c = r.get('checks') or {}
        print('%-16s %5ss  %s' % (r['id'], r['seconds'], r.get('error') or '%d words, %s' % (c.get('words', 0), ', '.join(c.get('parts', [])))))
    print('saved', path)


def main():
    if '--facts' in sys.argv:
        print(FACTS)
        print()
        print(RULE_LINES)
        return
    if '--prompt' in sys.argv:
        print(build_prompt('Can I start my own company on OPT?', []))
        return
    if '--eval' in sys.argv:
        run_eval()
        return
    srv = ThreadingHTTPServer((HOST, PORT), Handler)
    print('Duly Ask helper on http://%s:%d  (facts: %d lines)' % (HOST, PORT, FACTS.count('\n') + 1))
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()
