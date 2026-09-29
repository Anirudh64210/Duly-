COMPOSE := docker compose -f infra/docker-compose.yml
BASE ?= main

.PHONY: up down seed logs test e2e attack lane prove-gates \
        gate-1 gate-2 gate-3 gate-4 gate-5 gate-6 ops-block-demo watch stop resume status doctor factory-clean factory-metrics factory-test

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
	npx prettier --check "{web,ops}/**/*.{ts,tsx,css,html,json}"
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

test: gate-1 gate-2 gate-3 gate-4 gate-5 gate-6
	@echo "gates 1 to 6: green"

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

factory-test:
	uv run pytest tests/unit/tools -q

lane:
	@test -n "$(NAME)" || (echo "usage: make lane NAME=L-web" && exit 1)
	@test -f .claude/lanes/$(NAME).yaml || (echo "unknown lane $(NAME)" && exit 1)
	git worktree add -b lane/$(NAME)/work ../duly-$(NAME) $(BASE)
	@echo "$(NAME)" > ../duly-$(NAME)/.lane
	@echo "worktree ready at ../duly-$(NAME)"
