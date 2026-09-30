# The contract change, reconciled

Two approved SPECs change the contracts: specs/path-1/programs.md (Part 2) and specs/design-1/SPEC.md (section 2, round B). They land here as one change. Where they describe the same thing in different ways, the record model of programs.md wins, and design-1's needs are met inside it. Each choice made is below.

## Where the two SPECs met

1. **Every program, with its level, its standing and a changed end date (design-1 RQ-P1).** These are held as records, not as a path feature. Each program is a `program` record with `level` and `state`. A changed end date is an `end_date_change` record, read through the field's `history`. The kinds are declared in the pack under `path.records`. rulepack.schema.json gains no separate program list.

2. **Standing.** design-1 names four standings: studying, completed, transferred, stopped. The record model holds three values of `program.state` (in_progress, completed, left_before_completing). A transfer is a `move` record between two programs, not a standing. The screen words the standing from the state and the moves.

3. **CPT and pre-completion OPT periods, each with full_time (design-1 RQ-P2).** Each is an `authorization` record, of type cpt or opt_pre_completion, linked to its program. Full or part time is the record's `time` field, a choice of full_time or part_time, with "not sure" allowed. That field is the full_time flag design-1 asks for. The days of full-time CPT come from the `sum_of_days` calculator over those records, grouped by level, and the typed count stays only as the translation field `cpt_days_stated`.

4. **Case periods gain full_time and reported_on (design-1 section 2).** The new case no longer takes periods as facts. Periods remain only as the values of a record field of kind `periods`, such as a job's `hours_changes`. The period definition gains optional `full_time` and `reported_on` there, so a pack may use them. The F-1 pack records full or part time on the authorization, and a report on a `report` record, as in point 3 and point 5.

5. **reported_on on an employment period (design-1 RQ-P5).** A job is a `work` record. A report that a job ended or changed is a `report` record with `made_on`. The pack may also declare a `reported_on` date field on `work`. No contract change is needed for that, because a record's fields are the pack's.

6. **Facts the student may add on OPT and STEM (design-1 RQ-P5).** approval_notice_date, card_received_date and rfe_received become fields of the `authorization` kind in the pack. No contract change is needed.

7. **Stages in the output (design-1 RQ-P3).** A stage entered for each record has the id `<stage id>.<record id>`, as programs.md section 13 says. So each entry of `stages` carries `record` and the pack's `stage` id beside design-1's fields. Its `facts` holds fact ids or `<record id>.<field>` paths with their values.

8. **Windows and checklists in the output.** Each window and each checklist may carry `record` too, for the same reason. A checklist's id is the pack's checklist id, or `<checklist id>.<record id>` when its stage is entered for each record.

9. **Checklist steps in the pack (design-1 RQ-P4).** `path.checklists` holds each checklist, with a required `reading` flag and ordered steps. A stage names its checklist by id in `checklist`. Checklist and step ids hold no point, so that a confirmation id `step.<checklist>.<step>` reads one way only.

10. **POST /v1/compute.** Both SPECs ask for it. It takes the new case.schema.json, which holds records. /v1/compute/f1 and case_f1.schema.json stay as they are.

11. **The case bridge (design-1 RQ-K1).** desktop_case_bridge.schema.json carries the new case.schema.json, the records case. A reply that refuses names only where the case fails, never a value from it.

12. **documents_count.** programs.md takes it out of the case, and design-1 section 4 (F12) sends it as 0. It stays in case_f1.schema.json and in the output's `scope`, where design-1 reads it. The new case has no field for it, so for POST /v1/compute the engine fills `scope.documents_count` from what it holds.

## Choices made where a SPEC left the shape open

13. **GET /v1/updates.** A GET carries no case body. Matching reads the categories, the stage ids and the field ids sent as query values: names only, never a value the person entered. The reply holds `matching` and, for each approved update, `matched` with its stages and fields.

14. **product.feedback_address.** It is a string or null, not a number the engine reads. So it sits under its own `product` key in product_settings.yaml, beside the `settings` list and outside it. The engine's settings reader and its tests read only that list.

15. **Output rules.** The description of `rules` now says every rule named by computed, upcoming, lists, stages, windows and checklist steps is there, also for a stage that is only next (design-1 RQ-E2). The shape is unchanged.

16. **New fields are optional.** Every field added to engine_output, update and rulepack is optional, so outputs, updates and packs of today stay valid. Inside a new object, such as a stage entry, a window or a checklist, the fields each SPEC names are required.
