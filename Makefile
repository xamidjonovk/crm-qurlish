.PHONY: up dev down migrate bootstrap test lint
up:
	docker compose up -d --build

dev:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

down:
	docker compose down

migrate:
	docker compose run --rm api alembic upgrade head

bootstrap:
	docker compose run --rm api python -m app.bootstrap

test:
	cd backend && uv run --locked pytest

lint:
	cd backend && uv run --locked ruff check app tests
