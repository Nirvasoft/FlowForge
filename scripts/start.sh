#!/bin/sh
# FlowForge production startup script
# Runs database setup + all seeds (non-blocking) then starts the server

echo "🔄 Running database setup..."

# Try prisma db push first (works with dev databases that lack migration permissions)
# Falls back gracefully if it fails — app still starts
npx prisma db push --accept-data-loss 2>&1 || {
  echo "⚠️  prisma db push failed, trying migrate deploy..."
  npx prisma migrate deploy 2>&1 || {
    echo "⚠️  Database migration failed (non-fatal). App will start anyway."
    echo "   You may need to run migrations manually."
  }
}

# Run seeds only when RUN_SEEDS=true is set as an environment variable
# To trigger: set RUN_SEEDS=true in DigitalOcean App Platform env vars, deploy,
# then remove the variable after seeds have run.
if [ "$RUN_SEEDS" = "true" ]; then
  echo "🌱 RUN_SEEDS=true detected. Running database seeds..."

  echo "  → Main seed (accounts, users, permissions)..."
  tsx prisma/seed.ts 2>&1 || echo "  ⚠️  Main seed skipped or failed"

  echo "  → Leave Request flow..."
  tsx prisma/seed-leave-request.ts 2>&1 || echo "  ⚠️  Leave Request seed skipped or failed"

  echo "  → Purchase Order flow..."
  tsx prisma/seed-purchase-order.ts 2>&1 || echo "  ⚠️  Purchase Order seed skipped or failed"

  echo "  → Employee Onboarding flow..."
  tsx prisma/seed-employee-onboarding.ts 2>&1 || echo "  ⚠️  Employee Onboarding seed skipped or failed"

  echo "  → Expense Claim flow..."
  tsx prisma/seed-expense-claim.ts 2>&1 || echo "  ⚠️  Expense Claim seed skipped or failed"

  echo "  → IT Support Ticket flow..."
  tsx prisma/seed-it-support.ts 2>&1 || echo "  ⚠️  IT Support seed skipped or failed"

  echo "  → Contract Lifecycle Management..."
  tsx prisma/seed-contract-lifecycle.ts 2>&1 || echo "  ⚠️  Contract Lifecycle seed skipped or failed"

  echo "  → Multi-Level Procurement System..."
  tsx prisma/seed-procurement.ts 2>&1 || echo "  ⚠️  Procurement seed skipped or failed"

  echo "  → Company Event flow..."
  tsx prisma/seed-company-event.ts 2>&1 || echo "  ⚠️  Company Event seed skipped or failed"

  echo "  → Business Card Request flow..."
  tsx prisma/seed-business-card.ts 2>&1 || echo "  ⚠️  Business Card seed skipped or failed"

  echo "  → Business Trip flow..."
  tsx prisma/seed-business-trip.ts 2>&1 || echo "  ⚠️  Business Trip seed skipped or failed"

  echo "  → Stationery / Sundry / Tissue / Toner flow..."
  tsx prisma/seed-stationery-sundry.ts 2>&1 || echo "  ⚠️  Stationery/Sundry seed skipped or failed"

  echo "✅ All seeds complete"
else
  echo "⏭️  Skipping seeds (set RUN_SEEDS=true to run)"
fi

echo "🚀 Starting FlowForge server..."
exec node dist/server.js
