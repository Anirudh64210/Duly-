# plain-1: calm, plain words, backed by the law

The founder tested Duly on 2026-09-29 and said three things (DECISIONS.md D56, D57):

- The draft emails should not mention Duly anywhere, and should sound like the student: a default student voice.
- The law quoted directly "makes it very big to read and by itself very hard to understand for an average student". Cite it, and at the same time explain it in plain words, without legal risk.
- "Before a court" is still confusing. Everything should be dumbed down in how it is given, but backed by legal and real sources and real court filings, in the spirit of the CK approach: relieve the pain and fear, keep it calm, keep the legal backing.

Nothing here changes what Duly computes. It changes how the law is shown, and the one text Duly writes in the student's voice.

## Covers

Register rows: DEC-D56-001, DEC-D56-002, DEC-D56-003, DEC-D57-001, DEC-D57-002. That is 5 of 2443 requirements.

## 1. Plain words in the pack (L-content)

Every rule and every regime of the F-1 pack carries `plain` (contracts/rulepack.schema.json). The words:

- say what the rule says, in general: "a student", "the rule". Never "you", never a conclusion about a person, never an instruction;
- use only numbers the rule's quote, note or value holds;
- are calm: no alarm words; a rule that ends something says it "ends", and the exact words say the rest;
- are short: at most three sentences for a rule and four for a regime, at a reading grade no higher than 9;
- keep a reading a reading: where a rule's derivation is `reading`, the plain words say that this is how Duly reads the rule, in those words;
- keep the rule's terms of art word for word (at most three a rule, listed in `plain_terms`), and say everything else in everyday words: no citation and no legal phrasing in plain words (specs/product-1/SPEC-resolutions.md point 58).

`python -m tools.sources.plain rulepacks --require f1` checks every one of these and runs in gate 7. Its count of sentences, words and syllables is the measure of record for the reading grade, so every review measures the same way; a text a reviewer finds hard to read is named for its words, not for a different count. The reviewer reads each plain text beside its quote and vetoes any that says more, less or other than the quote.

A regime's plain words say what its legal status means today, from the source the regime cites. For the paused rule, from the court's own order: what the new rule would change, that a federal court paused it on the date of the order while the case goes on, and that the earlier rule applies today.

## 2. The screen shows plain words first (L-web)

Wherever a rule is shown (beside the verdict, in an item's working, under What comes next):

- the plain words come first, under "In plain words";
- one tap on "Read the exact words" opens the quote, the citation with its link, and the day it was checked; for a reading, the pack's note, marked as Duly's reading;
- a rule with no plain words (another pack) shows its quote as it does now.

## 3. What a court did, in plain words (L-web)

The screen never shows the words litigated, enjoined, regime, operative or alternate, and never "Before a court" or "blocked by a court".

- An item whose value depends on a regime that is not simply in effect shows that regime's plain words, from the output's `regimes`, with a link "Read the court's order" to the regime's source.
- What the paused rule would change sits behind one tap, "What the paused rule would change", with its value.
- The order is calm: first what is true today, then, behind a tap, the paused change.
- The status tags on items read: settled "Regulation", guidance "Government guidance", school "School policy", litigated "A court paused a change", proposed "Proposed, not in force".

## 4. The drafted email to the DSO (L-web, D57)

- It is written as the student, in plain, polite first person, and it never contains the word Duly.
- It states only the student's own facts as entered (card dates, program end date, the dates in a question's `about`) and asks. It never states a date Duly computed or a reading as the student's own claim, and it never characterises the law or the student's status.
- It has a subject line and ends "Thank you," and "[Your name]".
- There is a draft for the STEM next step (as now, without the computed dates) and one for each talk_to_dso verdict, built from the facts behind its reasons.
- A test runs every draft through the same checks as the plain words that apply to it: no word Duly, no conclusion, no alarm word.

## 5. Calm words across the verdict (L-web)

Every fixed line in web/src/lib/labels.ts is read against section 1's list of alarm words by a test beside the code. Verdict lines lead with what is known and settled, then what needs an answer, in the order the canvas uses (verdict before data, data before detail).

## Done

- `tools.sources.plain rulepacks --require f1` passes.
- Web tests show: plain words first with the exact words one tap away; no forbidden status word on the screen; the court line with its link to the order; no draft containing Duly or a computed date.
- The reviewer approves after reading every plain text beside its quote.
