# AI Continuation Prompt - Biling Media

You are continuing development of **Biling Media**, an original Tunisian entertainment platform centered on Biling-owned productions, shows, episodes, personalities, live programming, and community. The current product goal is a realistic, maintainable MVP - not a generic streaming clone and not an implementation of every future monetization idea.

## Read and inspect first

1. Read [`docs/PROJECT_HANDOFF.md`](./PROJECT_HANDOFF.md) before proposing or changing code. It records the verified implementation, architecture, development commands, deployment state, and unresolved issues.
2. Inspect the actual repository, current Git status/branch, relevant source and configuration, and tests before assuming the handoff is still current. Do not expose `.env` values.
3. Treat repository evidence as authoritative if it has changed since the handoff. Distinguish implemented features from planned or hypothetical work.

## Architecture and implementation

- This is a pnpm 10.34.9/Turborepo monorepo: `apps/web` is Next.js App Router + React + TypeScript; `apps/api` is a NestJS REST API; PostgreSQL and Prisma persist data; `packages/contracts`, `packages/schemas`, and `packages/config` contain shared contracts, Zod schemas, and TypeScript configuration.
- Keep backend business logic and API contracts independent of Next.js so a future React Native + Expo client can use the same backend, data models, and business rules.
- Share genuinely client-neutral contracts, schemas, brand assets, or tokens where useful - not web React components. The native app is future work and must not be created now.
- The website should remain responsive and preserve its desktop experience. Do not simply shrink it to imitate a native app; consider touch targets, accessible focus, small-screen layout, and avoid essential hover-only interactions.
- Preserve the Biling visual identity: “In art we trust,” orange `#ff4b0b`, near-black `#090909`, lime `#c8ff00`, paper `#f5f0e6`, bold editorial display type, and the supplied logo used unchanged. The current logo lockup has padding and an orange background, with no black border. Use labeled placeholders until Biling-approved, rights-cleared assets are supplied.
- The current repository includes show and episode pages, discovery and grouped search, staff authentication with MFA and recovery, Admin Studio, and editorial publishing with structured article blocks. Verify the deployed revision separately from the working tree. Phase 6 adds audience registration, authentication, email verification and recovery, and private profiles locally. Phase 7 adds comments, reports, likes, show follows, and staff moderation locally. Staff and audience credentials and permissions remain separate. The native app remains future work.
- Do not redesign the established architecture or add speculative microservices, Redis/BullMQ, billing, or broad abstractions.

## Where development stopped

The Vercel homepage and Railway API/PostgreSQL were verified on November 19, 2026. Railway's first successful deploy skipped the migration step, so the initial migration had been applied manually. The production API now has a service-level Prisma pre-deploy command and the exact Vercel `CORS_ORIGIN`. On the November 19 release, Railway recorded the hook completing before container creation, and live requests confirmed CORS, Infilet, and seven published episodes. Both public Railway hostnames point to the same API service. The handoff records the release and production URLs. The user authorized only trial credit and prohibited enabling paid billing.

Phase 5 adds public editorial discovery, article pages, search and related content, with staff article editing and protected saved previews. Phase 5 and Staff Studio invitations are deployed. Phase 6 remains local and the production database has not received its migration. Review the migration and Railway pre-deploy event for an explicitly approved hosted release. Thorough Admin Studio and HTTPS staging tests remain deferred at the user's request.

Phases 6 and 7 remain local and undeployed. Their additive migrations were applied only to the local database. Before a hosted release, review both migrations together, back up production, deploy the compatible API before the web application, and smoke-test Resend delivery, audience identity, engagement, and Studio moderation. The next planned product phase is multimedia expansion (podcasts, audio and live broadcasting); do not begin it without a new brief. Keep secret values out of responses and tracked files.

## Development environment

The developer environment is Windows. Use PowerShell and Windows paths for tool operations. Node.js 24.18.0 is installed; the root supports Node `>=22.11.0`. pnpm is not reliable as a global command; use `npx pnpm@10` (or `npx.cmd pnpm@10` in PowerShell). Do not modify PATH, install global pnpm, use `corepack enable`, or require administrator access.

From the repository root, the usual local setup is:

```powershell
Copy-Item .env.example .env
npx pnpm@10 install
npx pnpm@10 run db:up
npx pnpm@10 run db:generate
npx pnpm@10 run db:migrate
npx pnpm@10 run db:seed
npx pnpm@10 run dev
```

Run quality checks with `npx pnpm@10 run lint`, `typecheck`, `test`, and `build`. Docker Desktop is needed for local PostgreSQL. Read the handoff for environment variable names, provider state, exact routes, and limitations; never copy secrets into responses or tracked files.

## Working style

Proceed incrementally: inspect → make a focused change → run the smallest relevant validation → report what changed and what remains. Preserve existing behavior, add/update directly relevant tests and documentation, and do not claim a command or deployment was verified unless it was actually checked. Respect user work in a dirty worktree. Ask one clear question if a material product or behavioral decision is genuinely ambiguous.

The user prefers concise, step-by-step explanations. Keep updates brief, explain any necessary decisions, and do not continue unrelated implementation after completing the requested task.
