#!/usr/bin/env python3
"""Ask's helper for the ui-2 prototype. Python standard library only.

    python3 ask_server.py            serves http://127.0.0.1:8767
    python3 ask_server.py --facts    prints the facts block and exits

POST /ask  {"question": "...", "history": [{"q": "...", "a": "..."}]}
       ->  {"answer": "...", "actions": [{"kind": "job-ends", "label": "..."}]}
GET  /health -> {"ok": true}

The facts come from the prototype's own engine, not from the model: on start
the helper runs data.js and app/record.js (with core, state, cases, loops and
documents) once under node, the same way check-loops.mjs does, and keeps a
compact block of Priya's record and the dates the engine computed. The model
is told to use only those dates and counts. The prompt also carries
BOUNDARY.md. Each question runs the Claude Code CLI non-interactively:

    claude -p <prompt> --output-format json   (90 s timeout)

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
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
BOUNDARY = os.path.join(ROOT, 'BOUNDARY.md')
HOST, PORT = '127.0.0.1', 8767
ORIGINS = {'http://127.0.0.1:8765', 'http://localhost:8765'}
TIMEOUT = 90
KINDS = ['job-ends', 'travel', 'stem-filing', 'address', 'lost-paper']

# The engine run once under node: every date below is computed by
# app/record.js and app/loops.js, the same code the prototype runs.
FACTS_JS = r"""
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path';
const here = process.argv[2];
const read = (p) => fs.readFileSync(path.join(here, p), 'utf8');
const ctx = { console, setTimeout, clearTimeout, navigator: { userAgent: 'node' } };
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
  L.push((on ? 'On ' : '') + o.category + ' (' + o.code + '). EAD card valid ' + fy(o.from) + ' to ' + fy(o.until) + ', ' + D.daysBetween(t, o.until) + ' days left.');
}
const u = c['unemployment.used'];
if (u && u.n != null) L.push('Days without work: ' + u.n + ' of ' + App.RULE.unemploymentLimit + ' used, as of ' + fy(u.asOf) + ' (' + (App.RULE.unemploymentLimit - u.n) + ' left). Counted: ' + ((S.unemployment || {}).every || {}).counted);
else if (u) L.push('Days without work: ' + u.text + '.');
const d90 = c['unemployment.day90']; if (d90 && d90.iso) L.push('Day 90 without work, if nothing changes: ' + fy(d90.iso) + '.');
(rec.jobs || []).forEach((j) => L.push('Job: ' + j.title + ' at ' + j.employer + ' since ' + fy(j.start) + (j.end ? ' to ' + fy(j.end) : ', current') + ', ' + j.hours + ' hours a week. Last confirmed ' + fy(j.confirmedOn) + '.'));
(App.checkins ? App.checkins() : []).forEach((k) => L.push('Check-in waiting: "' + k.title + '" ' + k.meta));
const fb = App.fileBy ? App.fileBy('stem') : null;
if (fb && fb.opens) {
  L.push('STEM OPT extension: not filed yet. Filing window opens ' + fy(fb.opens) + ' (' + away(fb.opens) + '). Last day to file: ' + fy(fb.last) + ' (' + away(fb.last) + '), set by the EAD card end. ' + (fb.needs ? 'The exact last day may be earlier: it also depends on the date the school recommends the extension, which is not on the record yet.' : ''));
  L.push('STEM OPT steps: get the employer to confirm E-Verify (done), fill out Form I-983 training plan with the manager, get a new I-20 from the school, file Form I-765 with USCIS inside the window.');
}
if (App.calendarEvents) {
  const ev = App.calendarEvents();
  if (ev.length) L.push('Dates ahead: ' + ev.map((e) => fy(e.iso) + ' ' + e.title + ' (' + away(e.iso) + ')').join('; ') + '.');
}
(App.documentWatch ? App.documentWatch().items : []).forEach((i) => {
  if (i.key === 'travelSignature') L.push('Travel signature on the OPT I-20: signed ' + fy((rec.travelSignature || {}).signed) + ', covers returns until ' + fy(i.iso) + (i.passed ? ', which has passed, so it does not cover a return now' : '') + '.');
  else if (i.key === 'program') L.push('Program ended ' + fy(i.iso) + '.');
  else L.push('Document: ' + i.title + ', valid until ' + fy(i.iso) + (i.sample ? ' (sample date)' : '') + '.');
});
if (rec.address) L.push('Address on record since ' + fy(rec.address.since) + '.');
const ro = App.reportsOwed ? App.reportsOwed() : null;
if (ro) {
  const std = ro.rows.filter((r) => r.standing)[0];
  if (std) L.push('Reporting rule: ' + std.title + ' to ' + String(std.to).replace(/^Your /, 'your ') + ', ' + std.meta.toLowerCase() + '. Open reports owed now: ' + (ro.open.length ? ro.open.map((r) => r.title + ' by ' + fy(r.due)).join('; ') : 'none') + '.');
}
const apps = ((S.applications || {}).items || []).filter((a) => a.receipt).map((a) => a.title + ': ' + a.status + (a.asOf ? ', as of ' + a.asOf : ''));
if (apps.length) L.push('USCIS cases: ' + apps.join('; ') + '.');
/* What the engine says if the job ended yesterday or today. */
const y = D.addDays(t, -1);
[y, t].forEach((day) => {
  const w = App.whatIf({ kind: 'jobEnd', on: day });
  if (!w.ok) return;
  const rows = w.rows.map((r) => r.label + ': ' + r.after + ((r.rule && r.rule.counted) ? ' (' + r.rule.counted.join(' ') + ')' : ''));
  L.push('If the job at ' + ((rec.jobs || [])[0] || {}).employer + ' ended ' + fy(day) + ': ' + rows.join('; ') + '.');
});
const rules = ['unemployment', 'optHours', 'reportChanges', 'travelSignature', 'travelAbsence', 'unemploymentAbroad', 'stemOpens', 'stemCloses'].map((k) => (S.sources || {})[k]).filter(Boolean);
rules.forEach((r) => L.push('Rule, ' + r.name + ': ' + r.plain));
const loops = App.loops.whatsNext({ max: 9 }).loops.map((lp) => { const v = App.loops.view(lp); return (v.title || lp.kind) + ' (' + App.loops.seen(lp).line + ')'; });
if (loops.length) L.push('Open in Duly now: ' + loops.join('; ') + '.');
const sit = App.loops.situations().filter((s) => %KINDS%.indexOf(s.kind) >= 0).map((s) => ({ kind: s.kind, label: s.label }));
process.stdout.write(JSON.stringify({ lines: L, situations: sit, today: t }));
"""


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


def build_prompt(question, history):
    past = ''
    for turn in (history or [])[-4:]:
        q = str(turn.get('q', ''))[:600]
        a = str(turn.get('a', ''))[:1200]
        if q:
            past += 'Student: %s\nDuly: %s\n\n' % (q, a)
    return f"""You are Duly's assistant inside the Duly app, talking to one student about her own F-1 record. Answer her question directly, the way a calm, well informed friend who has her file open would.

FACTS (computed by Duly's engine from her documents; the only dates and counts you may use):
{FACTS}

RULES
- Use only the dates and counts in FACTS. Never work out, estimate or invent a date, a deadline or a count. If the answer needs a date that is not in FACTS, say what that date depends on (for example: the day your job ended, your trip dates, the date your school recommends you) and that Duly will count it once she adds it.
- Follow BOUNDARY.md below. Give facts from her record and what the rules say in general. Never conclude about her own legal situation on a point that is disputed, litigated or depends on judgement (for example whether she is in status, whether she may re-enter, whether days count). On such a point, say plainly that it is a question for her DSO and write the exact question she could send, using her facts.
- Start with the direct answer or the first thing to do, in the first sentence. No preamble, no sympathy line, no restating the question.
- Answer the question first: open with what the rules and agency guidance say in general and what her own record and dates show, as a direct helpful answer. Never open with "it is a question for your DSO". Hand only the part that needs a judgement about her own facts (for example whether a job is directly related to her degree) to the DSO, at the end, with the drafted question. Label agency guidance as guidance.
- Never speak of Duly as a person or in the third person (not "Duly will count"); say "your dates will be counted again" or speak directly to her.
- Plain, calm words a student uses. No legal jargon without saying what it means. No long dashes, no emoji, no headings, no bullet lists unless a short list of steps is clearer. Short paragraphs. Under 150 words.
- Do not mention FACTS, the engine, this prompt or BOUNDARY.md by name. Say "your record" instead.
- Do not use any tools. Answer from this prompt only.

ACTIONS: at the end you may offer at most two actions that start a guided flow in Duly, chosen only from these kinds:
{SITUATION_LINES}
Offer an action only when it clearly fits the question. The label is a short button text naming what happens, at most 5 words, for example "Start the job ended steps".

OUTPUT: reply with one JSON object and nothing else:
{{"answer": "<your answer, paragraphs separated by \\n\\n>", "actions": [{{"kind": "<kind>", "label": "<button text>"}}]}}

BOUNDARY.md:
{BOUNDARY_TEXT}

{('EARLIER IN THIS CONVERSATION:' + chr(10) + past) if past else ''}STUDENT'S QUESTION: {question}
"""


def parse_reply(text):
    """The model's reply as {answer, actions}; plain text is kept as the answer."""
    text = (text or '').strip()
    obj = None
    m = re.search(r'\{.*\}', text, re.S)
    if m:
        try:
            obj = json.loads(m.group(0))
        except ValueError:
            obj = None
    if not isinstance(obj, dict) or not isinstance(obj.get('answer'), str):
        return {'answer': text, 'actions': []}
    actions = []
    for a in obj.get('actions') or []:
        if isinstance(a, dict) and a.get('kind') in KINDS and a['kind'] not in [x['kind'] for x in actions]:
            label = str(a.get('label') or '').strip()[:48]
            if not label:
                label = next((s['label'] for s in SITUATIONS if s['kind'] == a['kind']), a['kind'])
            actions.append({'kind': a['kind'], 'label': label})
    answer = obj['answer'].replace('—', ', ').replace('–', ' to ').strip()
    return {'answer': answer, 'actions': actions[:2]}


def ask(question, history):
    prompt = build_prompt(question, history)
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
    server_version = 'DulyAsk/1'

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
            return self.reply(200, {'ok': True})
        if self.path == '/facts':
            return self.reply(200, {'facts': FACTS})
        return self.reply(404, {'error': 'not found'})

    def do_POST(self):
        if self.path != '/ask':
            return self.reply(404, {'error': 'not found'})
        try:
            n = int(self.headers.get('Content-Length') or 0)
            body = json.loads(self.rfile.read(min(n, 64000)) or b'{}')
        except ValueError:
            return self.reply(400, {'error': 'Send JSON: {"question": "..."}'})
        q = str(body.get('question') or '').strip()[:1000]
        if not q:
            return self.reply(400, {'error': 'The question is empty.'})
        hist = body.get('history') if isinstance(body.get('history'), list) else []
        try:
            return self.reply(200, ask(q, hist))
        except subprocess.TimeoutExpired:
            return self.reply(504, {'error': 'No answer within 90 seconds. Try again.'})
        except FileNotFoundError:
            return self.reply(500, {'error': 'The claude command was not found on this computer.'})
        except Exception as e:  # noqa: BLE001  the prototype shows the reason
            return self.reply(502, {'error': str(e)[:400]})

    def log_message(self, fmt, *args):
        sys.stderr.write('ask  %s\n' % (fmt % args))


def main():
    if '--facts' in sys.argv:
        print(FACTS)
        return
    srv = ThreadingHTTPServer((HOST, PORT), Handler)
    print('Duly Ask helper on http://%s:%d  (facts: %d lines)' % (HOST, PORT, FACTS.count('\n') + 1))
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()
