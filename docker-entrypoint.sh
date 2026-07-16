#!/bin/sh
set -eu

echo "Applying Prisma schema..."
./node_modules/.bin/prisma db push --skip-generate --accept-data-loss

if [ "${SEED_DATABASE:-true}" = "true" ]; then
  echo "Seeding initial data..."
  ./node_modules/.bin/tsx prisma/seed.ts
fi

exec "$@"
