# Duly

Your immigration record, kept. Documents, deadlines, cited updates, and proof of work.

Duly states what a rule says, where it is written, its legal status today, and what the arithmetic gives for the dates you entered. It does not give legal advice.

## Run it

```
make up
```

Then open http://localhost:5173 (app) and http://localhost:5174 (Ops).

Needs: Docker (colima works), uv, Node 22 or later.

## Check it

```
make test
make prove-gates
```

## Where things are

| Path | What |
|---|---|
| DECISIONS.md | Founder decisions. Overrides everything else |
| BOUNDARY.md | Where Duly helps and where it stops |
| specs/ | One SPEC per phase or lane |
| engine/ | Pure functions: clocks, rule packs, verdict |
| rulepacks/ | The rules as data, one pack per visa category |
| assistant/ | The boundary classifier and answer validator |
| pipeline/ | The law updates pipeline |
| api/, web/, ops/ | Backend, student app, admin app |
| contracts/ | The shapes everything else agrees on |
| tools/ | Copy linter, diff policy, gates |
| evals/, tests/, security/ | What grades the code. Implementation lanes cannot edit these |
| .claude/ | The agent factory: lanes, hooks, agents, skills, lessons |
| duly-plan/, workbook-handoff/, docs/research/ | The original plan, the WorkBook design, and the research |
