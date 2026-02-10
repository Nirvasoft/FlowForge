#!/bin/sh
# FlowForge production startup script
# Runs database setup + seed (non-blocking) then starts the server

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

# Run seed if tables were created successfully
echo "🌱 Running database seed..."
tsx prisma/seed.ts 2>&1 || {
  echo "⚠️  Main seed failed or already seeded (non-fatal)."
}

echo "🚀 Starting FlowForge server..."
exec node dist/server.js
