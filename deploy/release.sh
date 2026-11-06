#!/bin/sh
set -eu
: "${CRM_IMAGE:?Set CRM_IMAGE to the image to release}"
docker compose pull api
docker compose up -d --wait db
docker compose run --rm --no-deps api alembic upgrade head
docker compose up -d --no-build api
