# Copilot Workspace Instructions

## Overview
This is a Next.js monorepo bootstrapped with `create-next-app`. The main app is in the `client/` directory. The backend (API, server logic) and frontend (React components, pages) are colocated under `client/app/` and related subfolders. The project uses Prisma for database access and Upstash for rate limiting.

## Build & Development
- **Start dev server:** `npm run dev` (or `yarn dev`, `pnpm dev`, `bun dev`) in `client/`
- **Build for production:** `npm run build`
- **Start production server:** `npm start`
- **Lint:** `npm run lint`
- **API server (if needed):** `npm run api`
- **Prisma seed:** `npm run prisma:seed`

## Key Conventions
- **Pages:** Located in `client/app/` using Next.js App Router.
- **API routes:** Under `client/app/api/` (Next.js API routes) and `client/server/routes/` (custom Express endpoints).
- **Database:** Prisma schema in `client/prisma/schema.prisma`. Use `prisma/seed.ts` for seeding.
- **Environment:** Use `.env` files in `client/` (not committed by default).
- **Rate limiting:** Upstash Redis, see `client/proxy.ts`.
- **Component structure:** Feature-based folders under `client/app/components/`.
- **Admin:** Admin pages and actions under `client/app/admin/`.

## Patterns & Pitfalls
- **Session/auth:** Use NextAuth, see `client/app/api/auth/` and `client/app/lib/auth.ts`.
- **Prisma:** Always use the `prisma` instance from `client/app/lib/prisma.ts`.
- **Edge compatibility:** Some features (e.g., Upstash) require valid env vars; see `client/proxy.ts` for guards.
- **Do not edit generated files** (e.g., `.next/`, `types/validator.ts`).
- **Do not commit secrets** (see `.gitignore`).

## Documentation
- Main docs: `client/README.md`
- Prisma: https://www.prisma.io/docs/
- Next.js: https://nextjs.org/docs

## Example Prompts
- "How do I add a new API route?"
- "How do I seed the database?"
- "Where do I put a new admin page?"

## Next Steps
- For custom agent workflows, consider applyTo patterns for `app/api/`, `app/admin/`, or `server/`.
- See `README.md` for more getting started info.
