COMPOSE := docker compose -f infra/docker-compose.yml
BASE ?= main

.PHONY: up down seed logs test ci e2e attack lane prove-gates \
        gate-1 gate-2 gate-3 gate-4 gate-5 gate-6 gate-7 test-offline ops-block-demo watch stop resume status doctor factory-clean factory-metrics handled workflow-tokens factory-test golden weekly mutation register desktop desktop-smoke prototype-app desktop-python desktop-package desktop-verify desktop-launch-time

up:
	$(COMPOSE) up -d --build --wait
	@echo "web  http://localhost:5173"
	@echo "ops  http://localhost:5174"
	@echo "api  http://localhost:8000/v1/status"
	@echo "mail http://localhost:8025"

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f --tail=50

seed:
	@echo "Nothing to seed yet. Tables arrive in Phase 1."

ops-block-demo:
	DULY_OPS_IP_ALLOWLIST=203.0.113.0/24 $(COMPOSE) up -d --wait api
	@echo "Ops now refuses this machine. Open http://localhost:5174, then run make up to undo."

gate-1:
	uv run ruff check .
	uv run ruff format --check .
	npx eslint . --max-warnings 0
	npx prettier --check "{web,ops,desktop}/**/*.{ts,tsx,css,html,json}"
	uv run python -m tools.copy_lint.lint

gate-2:
	uv run mypy
	npm run typecheck

gate-3:
	uv run python -m tools.diff_policy.check --base $(BASE)

gate-4:
	gitleaks git . --no-banner --redact
	uvx semgrep scan --config security/semgrep --error --quiet --metrics=off \
	  --exclude .venv --exclude node_modules --exclude docs --exclude tests .
	uv run pip-audit --strict
	npm audit --audit-level=high

gate-5:
	uv run pytest --cov --cov-report=xml --cov-report=term
	npm test

gate-6:
	uv run python -m tools.gates.diff_coverage --base $(BASE)

gate-7:
	uv run python -m tools.factory.validate
	uv run python -m tools.requirements.register check
	uv run python -m tools.gates.engine_literals
	uv run python -m tools.sources.verify rulepacks
	uv run python -m tools.sources.plain rulepacks

# The gates that need no network. The orchestrator runs these in the jail, where the
# network is closed. Dependency audits need the network and run in clean CI.
test-offline: gate-1 gate-2 gate-3 gate-5 gate-6 gate-7
	gitleaks git . --no-banner --redact
	@echo "offline gates: green"

test: gate-1 gate-2 gate-3 gate-4 gate-5 gate-6 gate-7
	@echo "gates 1 to 7: green"

# Exactly the gate steps of .github/workflows/ci.yml, in its order, with its base branch and
# the hidden tests. Run before every push; tests/unit/tools/test_ci_mirror.py keeps the two
# in step.
ci:
	$(MAKE) --no-print-directory gate-1
	$(MAKE) --no-print-directory gate-2
	$(MAKE) --no-print-directory gate-3 BASE=main
	$(MAKE) --no-print-directory gate-4
	$(MAKE) --no-print-directory gate-5
	$(MAKE) --no-print-directory gate-7
	uv run pytest tests/holdout -q -p no:cacheprovider
	$(MAKE) --no-print-directory gate-6 BASE=main
	@echo "ci: green, the same steps as .github/workflows/ci.yml"

prove-gates:
	uv run python -m tools.gates.prove

e2e:
	@echo "The e2e profile arrives in Phase 3." && exit 1

attack:
	@echo "The attack profile arrives in Phase 10." && exit 1

watch:
	@(nohup uv run --script dashboard/app.py >/dev/null 2>&1 &)
	@echo "Factory window is opening."

stop:
	@uv run python -m tools.factory.control stop

resume:
	@uv run python -m tools.factory.control resume

status:
	@uv run python -m tools.factory.control status

doctor:
	@uv run python -m tools.factory.control doctor

factory-clean:
	@uv run python -m tools.factory.control clean

factory-metrics:
	@uv run python -m tools.factory.control metrics

handled:
	@uv run python -m tools.factory.control handled --alert "$(ALERT)" --note "$(NOTE)" $(if $(CAUSE),--cause $(CAUSE)) $(if $(UPHELD),--upheld $(UPHELD))

workflow-tokens:
	@uv run python -m tools.factory.control workflow --name "$(NAME)" $(if $(TOKENS),--tokens $(TOKENS))

efficiency:
	uv run python -m tools.factory.efficiency $(if $(SINCE),--since $(SINCE))

factory-test:
	uv run pytest tests/unit/tools -q --cov=tools/factory --cov-report=xml:.scratch/coverage/factory.xml
	uv run diff-cover .scratch/coverage/factory.xml --include "tools/factory/*" --fail-under=80 --compare-branch=$(BASE)

# The golden tasks, then the judge's drift check when the pinned model changed since the last.
golden:
	uv run python -m tools.factory.golden

# The newest scorecards, with the runs to read by hand and the questions for each.
weekly:
	@uv run python -m tools.factory.efficiency --latest 3

mutation:
	uv run python -m tools.gates.mutation $(FILES)

desktop:
	npm run build -w web
	npm run start -w desktop

samples:
	cd web && uv run python samples/make.py && npx prettier --write --log-level warn "samples/*.json"

# Step W1 (specs/step-w/SPEC-W1.md point 25). Run outside the agents' jail: they need the network.
desktop-python:
	bash desktop/scripts/build-python.sh

desktop-package:
	npm run build -w web
	npm run build -w desktop
	cd desktop && npx electron-forge make

desktop-verify:
	node desktop/scripts/verify-bundle.mjs
	node desktop/scripts/read-fuses.mjs
	codesign --verify --deep --strict desktop/out/Duly-darwin-arm64/Duly.app
	desktop/out/Duly-darwin-arm64/Duly.app/Contents/MacOS/Duly --verify-start

desktop-launch-time:
	node desktop/scripts/launch-time.mjs

prototype-app:
	./node_modules/.bin/electron specs/ui-2/prototype/desktop/main.cjs

design-shots: samples
	DULY_SHOTS=1 npm run build -w web
	npm run build -w desktop
	rm -rf .scratch/shots && mkdir -p .scratch/shots
	cd desktop && npx electron . --shots $(CURDIR)/.scratch/shots
	@ls .scratch/shots

desktop-smoke:
	npm run build -w web
	npm run build -w desktop
	rm -rf .scratch/smoke && mkdir -p .scratch/smoke
	cd desktop && npx electron . --smoke $(CURDIR)/.scratch/smoke
	@cat .scratch/smoke/screen.json

register:
	uv run python -m tools.requirements.register build

lane:
	@test -n "$(NAME)" || (echo "usage: make lane NAME=L-web" && exit 1)
	@test -f .claude/lanes/$(NAME).yaml || (echo "unknown lane $(NAME)" && exit 1)
	git worktree add -b lane/$(NAME)/work ../duly-$(NAME) $(BASE)
	@echo "$(NAME)" > ../duly-$(NAME)/.lane
	@echo "worktree ready at ../duly-$(NAME)"
