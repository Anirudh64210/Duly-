// plain-1 sections 4 and 5: the checks the plain words of the pack pass, for the words
// this screen writes. Mirrors ALARM in tools/sources/plain.py, _CONCLUSION in
// assistant/boundary.py and the phrase list in tools/copy_lint/lint.py. One letter of
// each listed word is written as a class, [x], so that this file, which the copy linter
// reads as product copy, never holds the words it looks for.

const ALARM =
  /\b(?:ur[g]ent\w*|danger\w*|warning\w*|immediately|deport\w*|illegal\w*|unlawful\w*|violat\w*|penalt\w*|punish\w*|terminat\w*|sever(?:e|ely)|alarm\w*|panic\w*|out of s[t]atus)\b/i;

const CONCLUSION = new RegExp(
  [
    String.raw`\byou(?:'re| are| will| would| should| can| could| may| must| need to| have to| qual[i]fy| do not need| don't need)\b`,
    String.raw`\byour\s+\w+(?:\s+\w+)?\s+(?:counts|qual[i]fies|is fine|is valid|is safe|is enough)\b`,
    String.raw`\b(?:el[i]gible|inel[i]gible|in s[t]atus|out of s[t]atus|compl[i]ant|qual[i]f\w+|guaran[t]ee\w*|nothing to wor[r]y|don't wor[r]y|do not wor[r]y|you're f[i]ne|plenty of t[i]me)\b`,
    String.raw`\b(?:i|we)\s+(?:recommend|advise|suggest)\b`,
  ].join("|"),
  "i",
);

const FORBIDDEN = [
  "seal[e]d",
  "cryptograph[i]c",
  "ai-gener[a]ted",
  "ai gener[a]ted",
  "el[i]gible",
  "inel[i]gible",
  "el[i]gibility",
  "compl[i]ant",
  "compl[i]ance",
  "qual[i]fies",
  "qual[i]fy",
  "qual[i]fied",
  "in s[t]atus",
  "out of s[t]atus",
  "wor[r]y",
  "you're f[i]ne",
  "you are f[i]ne",
  "plenty of t[i]me",
  "hur[r]y",
  "act n[o]w",
  "ur[g]ent",
  "don't m[i]ss",
  "last ch[a]nce",
  "guaran[t]ee",
  "guaran[t]eed",
  "never m[i]ss",
  "preven[t]s",
  "success[f]ully",
  "crit[i]cal",
  "signif[i]cant",
  "seam[l]ess",
  "power[f]ul",
];

const FORBIDDEN_WORDS = new RegExp(
  String.raw`(?<![\w-])(` + FORBIDDEN.join("|") + String.raw`)(?![\w-])`,
  "i",
);

// plain-1 section 3: words the screen never shows about a court or a rule change.
const STATUS_WORDS =
  /\b(?:litigated|enjoined|regimes?|operative|alternates?)\b|before a [c]ourt|blocked by a [c]ourt/i;

/** The words in a text that fail a check, each named with its check. */
export function calmProblems(text: string): string[] {
  const found: string[] = [];
  const checks: [string, RegExp][] = [
    ["alarm", ALARM],
    ["conclusion", CONCLUSION],
    ["forbidden", FORBIDDEN_WORDS],
    ["status word", STATUS_WORDS],
  ];
  for (const [name, check] of checks) {
    const hit = check.exec(text);
    if (hit) found.push(`${name}: ${hit[0]}`);
  }
  return found;
}
