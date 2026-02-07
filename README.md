# FlowForge

> AI-Powered Workflow Management Platform

FlowForge is an enterprise-grade workflow management platform built with Node.js, React, and PostgreSQL.

## 🚀 Quick Start

```bash
# Start services
docker-compose up -d

# Install dependencies
npm install

# Run migrations
npm run db:generate
npm run db:migrate

# Seed database
npm run db:seed

# Start server
npm run dev
```

**Demo Login**: `admin@demo.com` / `Demo123!@#`

**API Docs**: http://localhost:3000/docs

## 📁 Project Structure

```
src/
├── api/           # Route handlers
├── config/        # Configuration
├── middleware/    # Auth, error handling
├── services/      # Business logic
├── types/         # TypeScript types
├── utils/         # Utilities
└── server.ts      # Entry point
```

## 🔧 Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Build for production |
| `npm run db:migrate` | Run migrations |
| `npm run db:seed` | Seed database |
| `npm test` | Run tests |

## ✅ Phase 1 Complete

- [x] Project scaffold with TypeScript
- [x] Multi-tenant database schema (30+ tables)
- [x] JWT authentication with refresh tokens
- [x] OAuth ready (Google, Microsoft)
- [x] RBAC with permissions
- [x] User management API
- [x] Swagger/OpenAPI docs
- [x] Docker setup
- [x] Error handling & logging
