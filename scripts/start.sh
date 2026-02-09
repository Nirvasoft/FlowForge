#!/bin/sh
# FlowForge production startup script
# Runs database setup (non-blocking) then starts the server

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

echo "🚀 Starting FlowForge server..."
exec node dist/server.js
