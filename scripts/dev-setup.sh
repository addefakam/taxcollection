#!/usr/bin/env bash
# dev-setup.sh — one-time setup for the local dev sandbox.
# Run this whenever the sandbox is fresh (db folder missing / dev server down).
#
# What it does:
# 1. Swap the production prisma schema (postgresql) to sqlite for local dev
#    (git keeps the postgres version — this swap is local only).
# 2. Recreate the local SQLite db file.
# 3. Push the schema + regenerate the Prisma client.
# 4. Re-seed all sample data (woredas, staff, taxpayers, targets, assignments).
# 5. Start the Next.js dev server on port 3000.
#
# Production deployments on Neon use the committed postgres schema — this script
# is purely for local development convenience.

set -e
cd "$(dirname "$0")/.."  # go to project root

echo "=== 1. Swap schema to sqlite (local only — git keeps postgres) ==="
SCHEMA=prisma/schema.prisma
if ! grep -q 'provider = "sqlite"' "$SCHEMA"; then
  sed -i 's|provider = "postgresql"|provider = "sqlite"|' "$SCHEMA"
  echo "   swapped to sqlite"
else
  echo "   already sqlite"
fi

echo ""
echo "=== 2. Recreate local SQLite db folder ==="
mkdir -p db
echo "   db/ ready"

echo ""
echo "=== 3. Ensure .env points at local SQLite + has SESSION_SECRET ==="
if ! grep -q 'DATABASE_URL="file:' .env 2>/dev/null; then
  cat > .env <<'EOF'
DATABASE_URL="file:/home/z/my-project/db/custom.db"
SESSION_SECRET="bishoftu-finance-dev-secret-change-in-production-min-32-chars"
EOF
  echo "   .env written"
else
  # Make sure SESSION_SECRET is present
  if ! grep -q 'SESSION_SECRET' .env; then
    echo 'SESSION_SECRET="bishoftu-finance-dev-secret-change-in-production-min-32-chars"' >> .env
    echo "   SESSION_SECRET added"
  fi
  echo "   .env already ok"
fi

echo ""
echo "=== 4. Push schema + regenerate Prisma client ==="
bunx prisma db push --accept-data-loss --force-reset 2>&1 | tail -3
bunx prisma generate 2>&1 | tail -2

echo ""
echo "=== 5. Verify new fields are in the generated client ==="
COUNT=$(grep -c "assignedWoredaId" node_modules/.prisma/client/index.d.ts 2>/dev/null || echo 0)
if [ "$COUNT" -gt 0 ]; then
  echo "   ✓ assignedWoredaId found ($COUNT refs in client)"
else
  echo "   ✗ assignedWoredaId MISSING — aborting"
  exit 1
fi

echo ""
echo "=== 6. Seed sample data ==="
bun run scripts/seed.ts 2>&1 | grep -vE "prisma:query" | tail -5
bun run scripts/seed-assignments.ts 2>&1 | grep -vE "prisma:query" | tail -3

echo ""
echo "=== 7. Kill any stale dev server, start fresh ==="
pkill -f "next-server" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
pkill -f "bun x next" 2>/dev/null || true
sleep 2
nohup bun x next dev -p 3000 > /home/z/my-project/dev.log 2>&1 &
disown
sleep 12

echo ""
echo "=== 8. Health check ==="
LOGIN_HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login)
echo "   /login: HTTP $LOGIN_HTTP"

LOGIN_API=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"leader@bishoftu.gov.et","password":"Bishoftu@2026"}' \
  -o /tmp/login_response.json -w "%{http_code}")
echo "   /api/auth/login (Leader): HTTP $LOGIN_API"
if [ "$LOGIN_API" = "200" ]; then
  echo "   ✓ Leader login successful"
else
  echo "   ✗ Leader login FAILED — response:"
  cat /tmp/login_response.json
  exit 1
fi

COLLECTOR_API=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"collector.woreda01@bishoftu.gov.et","password":"Woreda01@lemma"}' \
  -o /tmp/collector_response.json -w "%{http_code}")
echo "   /api/auth/login (Galmeewwan): HTTP $COLLECTOR_API"
if [ "$COLLECTOR_API" = "200" ]; then
  echo "   ✓ Galmeewwan login successful"
else
  echo "   ✗ Galmeewwan login FAILED — response:"
  cat /tmp/collector_response.json
fi

echo ""
echo "=== Done. Dev server running on http://localhost:3000 ==="
