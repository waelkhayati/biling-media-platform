# Biling Media - Project Handoff

**Last repository inspection:** 2026-11-20
**Purpose:** Accurate continuation notes for the current Biling Media repository. This document distinguishes implemented behavior from plans and from deployment state reported earlier in the development conversation.

## 1. Product overview

Biling Media is an original digital entertainment platform, not a generic streaming clone or licensed-content aggregator. Its product direction centers on Biling-owned productions, episodes, live programming, personalities, and audience participation. The brand line used by the current website is **“In art we trust.”**

The long-term vision includes:

- Discovering and watching original shows, episodes, music, and livestreams.
- Show, episode, and personality pages.
- User accounts and profiles; following shows and people.
- Comments, reactions, discussions, polls, and fan communities.
- Search, recommendations, and content discovery.
- An administrative content-management and moderation interface.
- Premium subscriptions, advertising and sponsorship, merchandise, events and ticketing, giveaways, games, loyalty points, rewards, and potentially carrier billing.
- A native mobile application built with React Native and Expo.

### MVP actually implemented

The current MVP is deliberately narrower:

- A responsive Next.js discovery homepage.
- A searchable production directory and grouped search across published shows, episodes, and articles.
- A NestJS REST API serving published shows, episodes, and articles.
- PostgreSQL persistence through Prisma.
- Show detail pages with a complete published episode archive and a trailer or featured episode when available.
- Episode detail pages with embedded YouTube playback, publication details, and related episodes.
- A staff-only Admin Studio for managing productions, episodes, artwork links, and publication status.
- An editorial directory and reader, with article authoring, private previews, and publishing in the same Admin Studio.
- Staff authenticator MFA, operator-assisted recovery, administrator revocation, and audited editorial activity.
- Local Phase 6 audience registration, persistent sign-in, personal profiles, and an email verification and password reset integration.
- Local Phase 7 comments, likes, show follows, followed-content profiles, reporting, and staff moderation.
- A development seed containing seven Infilet archives from the channel’s **Live → Past live streams** section.
- Local content provisioning through the development seed, with day-to-day editing in Admin Studio.
- Railway/Vercel deployment configuration for a client demo.

There is no YouTube channel synchronization. “Dynamic” currently means the homepage fetches published content from the API on each server request; it does not automatically discover new channel videos.

### Explicitly not implemented

Analytics, live-status detection or playback, payments, monetization, notifications, private messaging, background jobs, Redis, worker app, native mobile app, and mobile-specific navigation are future work.

## 2. Established architecture and decisions

- **Monorepo:** pnpm workspaces and Turborepo. The API and web application can be built and deployed independently.
- **Modular monolith:** NestJS modules organize backend domains; do not split into microservices without an operational need.
- **API-first and client-neutral:** the backend is REST under `/api/v1` and does not depend on Next.js. The future mobile app should use the same backend, business rules, and data models.
- **Shared API types and validation:** `packages/contracts` and `packages/schemas` are shared by the API and web. Keep these independent of web presentation and extend them only for genuinely shared contracts.
- **Separate platform UI:** the future React Native + Expo app should have its own navigation and interaction design. Do not build it now or force the website into mobile-app patterns.
- **Responsive website, not a shrunk app:** keep the existing desktop experience while improving responsive behavior where needed. Avoid hover-only essential functionality; respect touch interaction and accessible focus states.
- **Brand reuse without UI coupling:** share brand identity, assets, design tokens, backend and rules, but do not assume web components should be reused in React Native. The logo file is separate from components; the current CSS tokens still live in web CSS and are not yet a shared cross-platform token package.
- **Provider portability:** use standard containers, PostgreSQL, environment configuration, REST, and provider-independent domain logic. Railway and Vercel are current hosting choices, not required application dependencies.
- **Build incrementally:** no unnecessary abstractions, speculative billing/auth models, microservices, Kubernetes, Redis, BullMQ, or worker should be introduced before required.
- **Secrets:** use environment variables. `.env` is ignored and was not inspected; never copy its values into documentation or source control.

NestJS owns staff authentication, MFA, authorization, recovery, and session revocation. The Next.js Admin Studio keeps session and sign-in challenge bearers in separate HttpOnly cookies and forwards them server-to-server. See [Admin Studio](#14-admin-studio).

## 3. Repository state and structure

The repository root is `C:\Users\wael.khayati\Documents\GitHub\biling-media-platform`. Phases 2–5 and Staff Studio invitations are deployed. Phase 6 adds local working-tree changes for audience identity. Earlier commits include `ffb1b98` (`Update README.md`) and `210b3de` (`Prepare Railway API deployment`).

```text
apps/
  api/                  NestJS REST API, Prisma schema/migrations/seed
  web/                  Next.js App Router website and assets
packages/
  config/               Shared base TypeScript configuration
  contracts/            Shared TypeScript API data contracts
  schemas/               Shared Zod validation schemas and inferred types
infrastructure/
  docker-compose.yml    Local PostgreSQL 17 service
docs/
  PROJECT_HANDOFF.md   This document
  AI_CONTINUATION_PROMPT.md
.github/workflows/
  ci.yml                GitHub Actions quality workflow
```

`apps/worker`, Terraform, Redis/BullMQ configuration, architecture decision records, and a separate shared brand/tokens package do not exist. Generated Prisma client files, build output, `.next`, `dist`, Turbo caches, and installed dependencies are not source-of-truth files.

### Workspace and toolchain

- Node engine in root `package.json`: `>=22.11.0`. The development environment is Windows with Node.js `24.18.0`, npm `11.16.0`, and Git `2.54.0`.
- pnpm is pinned as `pnpm@10.34.9`; root scripts and CI use pnpm 10.
- On this Windows setup, use `npx pnpm@10` (or `npx.cmd pnpm@10` in PowerShell where command resolution requires it). Do not rely on a global pnpm executable, change PATH, or run `corepack enable`.
- Workspace globs are `apps/*` and `packages/*`.
- Turborepo orchestrates build, dev, lint, typecheck, test, and Prisma tasks.
- TypeScript strict mode is configured in `packages/config/typescript/base.json`.
- ESLint flat config uses ESLint 10 and typescript-eslint; Prettier uses 100-column width, semicolons, double quotes, and trailing commas.

Key direct/resolved versions from the manifests and lockfile include:

| Dependency/tool                          |   Version |
| ---------------------------------------- | --------: |
| Next.js                                  |    16.4.6 |
| React / React DOM                        |    19.3.1 |
| NestJS common/core/platform-express      |    12.4.2 |
| NestJS Swagger                           |    12.1.1 |
| Prisma CLI / client / PostgreSQL adapter |    7.10.1 |
| PostgreSQL local Docker image            | 17-alpine |
| TypeScript                               |     5.9.3 |
| Turborepo                                |   2.11.10 |
| Zod                                      |     4.6.7 |
| pnpm                                     |   10.34.9 |
| ESLint                                   |   10.14.0 |
| Prettier                                 |    3.10.0 |
| Jest                                     |    30.5.2 |

`pnpm-lock.yaml` is authoritative for the complete resolved dependency graph.

## 4. Frontend and visual identity

### Routes and page sections

The public App Router has discovery, editorial, and audience account routes. They load published content from the API on demand (`cache: "no-store"`). Staff routes are listed under [Admin Studio](#14-admin-studio).

| Route                                  | Behavior                                                                                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                                    | Discovery homepage with links into the production and episode pages.                                                                        |
| `/search?q=...`                        | Title and description search with grouped results and suggested production titles before a search or when no matches are found.             |
| `/shows`                               | All published productions, with the first featured production highlighted and filters for text and featured status.                         |
| `/shows/[slug]`                        | Production title, optional description and cover art, metadata, trailer or featured episode, and the entire published archive newest first. |
| `/shows/[slug]/episodes/[episodeSlug]` | YouTube embed, publication date, optional duration and episode number, parent show, and up to three related episodes.                       |

Both detail routes have canonical URLs, Open Graph and Twitter card metadata, loading feedback during in-app navigation, and a 404 screen for invalid or unavailable content. API failures use a retryable detail error boundary. Published shows with no episodes and episode pages with no related items display an empty state.

The global navigation search submits a shareable GET URL. Search and directory filters use loading, validation, empty, and retryable error states. The directory accepts `?q=...` and `?featured=true` to combine a text match with the featured filter.

Homepage sections:

1. Header search and a production-directory link, with homepage anchor links for episodes, people, and the off-air live section.
2. Orange hero with “In art we trust.”
3. Animated brand ticker.
4. Live broadcast section with a static “Off air” state and explicit placeholder art.
5. Featured production and additional production slots.
6. Latest episodes (the UI shows up to three from the API response).
7. People/personality image placeholders.
8. Community callout and footer.

These remain sections on the same page. The “People” section is placeholder presentation only; there are no personality records or personality API.

Discovery and archive thumbnails use the episode's YouTube image and link to detail pages. A show uses its supplied cover first, then a trailer or episode still when available, then a labeled placeholder. The episode and trailer embeds use YouTube's privacy-enhanced domain, with an always-visible link to the corresponding YouTube watch page. Episodes without a valid video ID display an unavailable state.

### Components and styling

Components live under `apps/web/src/components/`: `SiteHeader`, `BrandLogo`, `YouTubeMedia`, `MediaPlaceholder`, `SectionLabel`, and `CommunityCallout`. API fetching and response validation are in `apps/web/src/lib/content-api.ts`.

Styling is hand-authored global CSS in `apps/web/src/app/globals.css`, with CSS custom properties, fluid sizing via `clamp()`, CSS Grid/Flexbox, and breakpoints at 850px and 600px. Some layout and typography rules are RTL-aware, but the document root currently declares `lang="en"`; full locale/RTL support is not implemented.

Brand tokens currently defined in the web CSS:

- Biling orange: `#ff4b0b`
- Near-black: `#090909`
- Lime accent: `#c8ff00`
- Paper: `#f5f0e6`
- Charcoal: `#242424`
- Display font stack: Impact / Arial Narrow / Roboto Condensed with Arabic-capable fallbacks.
- Body font stack: Arial with Arabic-capable fallbacks.

The supplied logo is `apps/web/public/logo.png`, used unchanged. The current lockup adds 4px of padding and an orange background; it has **no black border**. Placeholder asset directories and usage guidance are in `apps/web/public/`; production artwork must be Biling-approved and rights-cleared. Do not redraw the logo or misrepresent placeholders as official photography.

Accessibility basics include a skip link, semantic landmarks/headings, visible keyboard focus styling, descriptive image/link labels, and reduced reliance on tiny text for core actions. Continue to verify small-screen readability and touch target sizes; existing hover styles are decorative and must not become the only way to operate a feature.

## 5. Backend, API, and shared packages

### Backend structure

`apps/api/src` contains:

- `config/`: Joi-validated runtime configuration and typed access service.
- `database/`: Prisma service/module using `@prisma/adapter-pg`.
- `health/`: process health response and controller.
- `content/`: public published-show and published-episode queries.
- `admin/`: staff authentication, session guards, and protected publishing operations.
- `common/`: consistent logged HTTP exception responses.
- `main.ts` / `app.module.ts`: bootstrap, security headers, CORS, global validation, Swagger, and module wiring.

The API uses `helmet`, CORS allow-list configuration, Nest `ValidationPipe` with `whitelist`, `forbidNonWhitelisted`, and `transform`, and a global error filter that logs failed requests. Swagger/OpenAPI is exposed at `/api/v1/docs`. The staff guard protects management endpoints. The health endpoint reports process responsiveness.

### Implemented endpoints

| Method and path                                 | Implemented behavior                                                                                                                                                                    |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/v1/health`                            | Returns `{ status: "ok", timestamp: "<ISO date>" }`.                                                                                                                                    |
| `GET /api/v1/shows`                             | Returns published shows ordered featured-first then newest, with published episode count and latest published episode. Accepts optional `q`, `featured=true\|false`, and `limit=1..24`. |
| `GET /api/v1/episodes`                          | Returns up to 12 latest published episodes with show identity, ordered by publication then creation time.                                                                               |
| `GET /api/v1/search?q=...`                      | Returns `shows`, `episodes`, and a per-group `hasMore` flag. The optional `limit` is 1–24 items per group and defaults to 12.                                                           |
| `GET /api/v1/shows/:slug`                       | Returns a published show, whitelisted metadata, and its full published episode archive ordered newest first.                                                                            |
| `GET /api/v1/shows/:slug/episodes/:episodeSlug` | Returns the published episode, its published parent show, and up to three other published episodes from that show.                                                                      |
| `GET /api/v1/docs`                              | Swagger UI for the API.                                                                                                                                                                 |

The detail API returns HTTP 400 for invalid slugs and HTTP 404 for missing or unpublished content. An episode is public when its own status and its parent show's status are `PUBLISHED` and it has a publication date. Public endpoints remain read-only and the show archive is unpaginated. Content mutations are under the separate `/api/v1/admin` prefix.

Search and directory text filters accept 2–100 characters. NestJS validates the parameters and returns HTTP 400 for invalid input. Prisma matches case-insensitive literal substrings against title and description. Show results are featured-first, then newest. Episode results are newest by publication date. Each search group queries one extra row to detect truncation.

### Shared packages

- `@biling/contracts` (`packages/contracts`) provides TypeScript interfaces/aliases for show and episode data, built from shared schema types.
- `@biling/schemas` (`packages/schemas`) provides Zod schemas for show status, show inputs, YouTube video IDs, published shows, and published episodes, plus inferred TS types.
- `@biling/config` (`packages/config`) currently packages only the shared base TypeScript configuration; it is not a runtime application settings package.

The API, web and native app use these contracts and schemas. Keep shared modules free of platform-specific UI and APIs.

## 6. Database and content

PostgreSQL is the only implemented database. The local Compose service is PostgreSQL 17 with a persistent named volume. Prisma schema is `apps/api/prisma/schema.prisma`. Migrations are `20261111172259_init`, `20261119163000_admin_studio`, and `20261119170000_staff_lifecycle`.

Models:

- `User`: `id`, unique `email`, optional `displayName`, timestamps. Phase 6 adds username, biography, avatar URL, verification timestamp, and a salted password hash for audience accounts. Existing identity rows with null credentials are preserved.
- `Show`: title, unique slug, optional description/poster URL, `featured`, `ContentStatus` (`DRAFT`, `PUBLISHED`, `ARCHIVED`), JSON metadata, timestamps, and episodes.
- `Episode`: show relation, title, per-show slug, optional description/episode number/duration/YouTube video ID/publication time/JSON metadata, status, timestamps. YouTube IDs are unique and constrained to 11 characters. Deleting a show cascades to its episodes.
- `StaffAccount`, `StaffSession`, and `StaffLoginThrottle`: staff-only credentials and roles, hashed session tokens with expiry, and database-backed sign-in counters. Staff accounts are separate from audience accounts.
- `StaffChallenge` stores digests and expiration for one-time setup, recovery, and MFA challenge tokens. `StudioAuditEvent` records editorial changes and staff lifecycle events.

The seed in `apps/api/prisma/seed.ts` upserts the featured published show `Infilet` and seven published archive entries. The content is based on the channel’s **Live → Past live streams**, not its Videos tab. Re-running the seed is designed to upsert the same records.

Phase 2 uses the existing schema. The show detail endpoint reads validated `genre`, `releaseYear`, and `trailerYoutubeVideoId` fields from `Show.metadata` and omits other metadata. The trailer field accepts an 11-character YouTube video ID. The seed supplies episode videos and publication dates. Descriptions, artwork, trailers, and durations appear when those fields have been populated.

For manual development content, use Prisma Studio locally and never expose it publicly. Publish records by setting their status and episode publication date; supply only the YouTube video ID, not a whole URL.

## 7. Environment variables and local development

`.env.example` documents local defaults. Copy it to an ignored root `.env`; do not commit `.env` or paste secret values into handoff notes.

| Variable                                            | Purpose                                                                                                                                                                                |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                      | PostgreSQL connection URI; required by the API and Prisma.                                                                                                                             |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Local Compose database settings, with development-only defaults in the example/Compose file.                                                                                           |
| `PORT`                                              | API listen port; defaults to 3001. Railway supplies its own port.                                                                                                                      |
| `CORS_ORIGIN`                                       | Comma-separated allowed origin(s); defaults to `http://localhost:3000`. Configure the exact deployed web origin if needed.                                                             |
| `API_BASE_URL`                                      | Web server API origin including `/api/v1`; defaults to `http://localhost:3001/api/v1`.                                                                                                 |
| `SITE_URL`                                          | Optional web origin for absolute canonical URLs and social metadata. Defaults to the current public Vercel domain.                                                                     |
| `ADMIN_WEB_ORIGIN`                                  | Exact origin accepted by Admin Studio form actions. Defaults to the canonical site origin on Vercel production and `http://localhost:3000` locally. Set it explicitly for other hosts. |
| `STAFF_MFA_KEY`                                     | API-only 32-byte base64url secret for encrypting authenticator seeds. Persist it across API restarts and instances using the same database.                                            |
| `NODE_ENV`                                          | Validated as `development`, `test`, or `production`.                                                                                                                                   |

From PowerShell at the repository root:

```powershell
Copy-Item .env.example .env
npx pnpm@10 install
npx pnpm@10 run db:up
npx pnpm@10 run db:generate
npx pnpm@10 run db:migrate
npx pnpm@10 run db:seed
npx pnpm@10 run dev
```

The website is at `http://localhost:3000`; the API is at `http://localhost:3001`, health at `/api/v1/health`, Swagger at `/api/v1/docs`. To run a single app, use `npx pnpm@10 --filter @biling/web dev` or `npx pnpm@10 --filter @biling/api dev`. API startup requires a reachable database and valid configuration.

After seeding, open [Infilet](http://localhost:3000/shows/infilet) and [episode six](http://localhost:3000/shows/infilet/episodes/infilet-episode-06). The show should list seven episodes, and episode six should render the YouTube player, the link back to its show, and related episodes. Try `/shows/unknown-show` or an unknown episode slug to check the 404 screen.

Use the navigation search or open [search for Infilet](http://localhost:3000/search?q=Infilet) to see the production and matching published episodes. Try a nonsense term for the empty state, or open [the production directory](http://localhost:3000/shows) and select **Featured**. The default seed contains one featured show, so this filter includes it.

Useful root commands:

```powershell
npx pnpm@10 run lint
npx pnpm@10 run typecheck
npx pnpm@10 run test
npx pnpm@10 run build
npx pnpm@10 run db:studio
npx pnpm@10 run db:down
```

Docker Desktop is required for the local PostgreSQL service. If a normal global pnpm install is unavailable due to Windows PATH/permissions, keep using `npx pnpm@10`; do not change system PATH or require administrator access.

## 8. Quality checks and CI

Root scripts invoke Turbo for `dev`, `build`, `lint`, `typecheck`, and `test`. Generate the Prisma client before typechecking a fresh checkout. The API uses Jest with SWC and Node VM modules to load ESM dependencies. Tests cover health and the public content routes, including slug validation, 404 responses, ordering and visibility filters, empty archives, and related-episode scoping. HTTP route tests use a Prisma test double. Web/shared package test scripts use Node’s built-in test runner.

Phase 2 passed lint, typecheck, all 10 API tests, and the build locally. A production-mode smoke test used local PostgreSQL and Edge to verify the seven seeded episodes, desktop and mobile navigation, social metadata, HTTP 404s, and the player markup. Local fixtures exercised slow navigation, missing art and video, an empty archive, a trailer, and API error recovery.

Phase 3 passed lint, typecheck, all 27 API tests, and the build locally. A temporary PostgreSQL database verified title and description matches, literal wildcards, result caps, featured filters, and exclusion of drafts, archived productions, and undated episodes. Edge verified keyboard submission, loading feedback, suggested searches, combined filters, and navigation to the existing detail routes on desktop and mobile.

Phase 4 passed lint, typecheck, all 37 API tests, and the build. The disposable PostgreSQL test applied the migration over existing published records, provisioned both roles, and verified rate limiting, revocation, publishing, archive permissions, stable URLs, and conflicts. Edge verified protected sign-in and sign-out, the HttpOnly and SameSite cookie attributes, show and episode authoring, and media preview markup. The local preview database was migrated and still serves all seven seeded episodes.

The staff lifecycle update passed lint, typecheck, all 41 API tests, and the build. Disposable PostgreSQL and Edge testing covered setup-code issuance, browser MFA enrollment, replay rejection, separate challenge and session cookies, role separation, staff revocation, suspension and restoration, single-use recovery, and audit history.

GitHub Actions workflow `.github/workflows/ci.yml` installs pnpm 10.34.9 and Node 24, then runs install, lint, typecheck, test, and build. **The workflow push trigger names branch `main`, while the repository’s current branch is `master`;** pull requests trigger the workflow, but direct pushes to `master` do not match that push filter. Check the intended branch policy before relying on push CI. No successful CI run was verified as part of this handoff.

## 9. Deployment history

For the current production state, see [the November 19 deployment verification](#13-production-deployment-verification-on-2026-11-19).

The following deployment state was recorded on November 11, 2026:

- Vercel project `biling-media-platform`, with `apps/web` as Root Directory, monorepo install/build commands, and `API_BASE_URL` set.
- Production site: <https://biling-media-platform.vercel.app/>
- Railway API URL used by Vercel: <https://biling-media-platform-production.up.railway.app>
- A Vercel production deployment was Ready on commit `913104e`.
- Railway PostgreSQL was Online. Initial API requests returned 500 because the Prisma tables did not exist. The migration was manually applied with `pnpm --filter @biling/api exec prisma migrate deploy`, then the seed command was run in the Railway service shell.
- After that recovery, public `/api/v1/health`, `/api/v1/shows`, and `/api/v1/episodes` were checked and returned healthy/content responses; the Vercel homepage showed Infilet and seven episodes.
- No paid Railway billing was enabled; the user explicitly approved use of trial credit only and prohibited enabling paid billing. Preserve that constraint.

Open questions at the time of the November 11 deployment:

The initial deployment left three questions about the effective pre-deploy command, the saved CORS setting, and the second public domain. Section 13 records their resolution.

`railway.json` uses the API Dockerfile, the pre-deploy migration command, API start command, `/api/v1/health` health check, and retry settings. `apps/api/Dockerfile` builds the monorepo API and runs the container as `node`. README deployment instructions describe Vercel and Railway setup. Do not run deployment actions or make provider changes without checking the current provider state and respecting the no-paid-billing instruction.

## 10. Known limitations, failures, and status

- The first production API content calls failed with `relation "public.Show" does not exist` / `relation "public.Episode" does not exist`; applying the migration fixed this.
- If the content API is unavailable or returns an error, `getHomeContent()` throws; there is no homepage fallback/error boundary for API failure.
- The live section always says “Off air”; there is no YouTube live-status integration or player.
- YouTube controls thumbnails and playback availability, including whether a video can play in an embed. The direct watch link is available when the embed is blocked. Biling does not host or transcode video.
- Most content is a single seeded show. Show/personality images are placeholders; there are no client-approved portraits or key art in the repo.
- Search uses literal substring matches and offers up to five production-title suggestions. It has no typo correction, accent folding, live autocomplete, or next-page controls. Search results are capped per group.
- The production directory returns all matching published shows in one list.
- Community interactions are future work. Hosted audience registration and email delivery require provider configuration.
- `README.md` includes a broad long-term architecture/roadmap. Terraform, Redis, BullMQ, CI deployment pipelines, and several listed tests/tools are planned or intended, not present as implemented subsystems.
- CI push branch mismatch (`main` workflow trigger vs current `master`) should be checked.

## 11. Coding and continuation conventions

- Inspect the relevant code and current Git status before changes; do not overwrite existing user work.
- Follow established TypeScript strictness, workspace import conventions, shared schemas, API version prefix, and existing CSS token usage.
- Keep backend business rules and contracts independent of Next.js; keep web presentation inside `apps/web`.
- Make focused, incremental changes; document changes to user-facing setup/deployment behavior.
- Validate the requested behavior with targeted tests, lint, typecheck, and build as appropriate. Do not claim checks passed unless run.
- Do not add a React Native app yet. Do not replace the current website with a mobile-first app design or reuse its UI implementation as a native UI.
- Separate future shared brand assets/tokens from web-specific components where genuine cross-platform reuse exists; avoid a token package merely for speculation.
- Never enable paid Railway billing without the user's explicit approval.

## 12. Next engineering task

Phase 7 community engagement is implemented locally with authenticated follows, reactions, moderated discussions, reporting, and abuse controls tied to audience IDs. Phase 8 adds podcasts, audio and live broadcasting, and Phase 9 onward covers monetization, interactive entertainment, games, contests, events and rewards.

The user deferred the thorough Admin Studio and HTTPS staging tests. Before hosted staff use, run the staff lifecycle and article publication workflow on approved HTTPS staging. Verify secure cookies, backup and recovery of secrets, and operator-assisted recovery. Set an audit retention policy before routine hosted use.

## 13. Production deployment verification on 2026-11-19

This deployment preceded Phases 2–5. Their routes are local repository changes.

- The November 11 API deployment on commit `210b3de` had no effective pre-deploy command. Railway's event history showed no pre-deploy step, and its resolved file config was empty. This accounts for the missing initial migration at startup.
- Before deploying, `prisma migrate status` ran against the API's production PostgreSQL instance and reported one migration and an up-to-date schema. The deployed branch had only a README change since `210b3de`.
- The Railway production API service now sets `CORS_ORIGIN=https://biling-media-platform.vercel.app` and `pnpm --filter @biling/api exec prisma migrate deploy` directly in its service settings. Deployment `91526e00-f8cb-45a1-a551-c3ae346dd0dc` on commit `913104e` succeeded. Railway recorded the pre-deploy command completing before container creation.
- The live API returns the exact Vercel origin in `Access-Control-Allow-Origin` and omits the header for localhost. Health and content requests succeeded, the API returned Infilet and seven published episodes, and Vercel rendered Infilet on the homepage.
- Both Railway hostnames are assigned to the same API service on port 8080. The primary hostname is the Vercel API target. Both hostnames returned healthy responses after the release.
- Railway reported $4.68 in available trial credit before the deployment and no paid usage subscription. The release used the existing trial and left billing settings untouched.
- The migration hook is configured on the service, independent of legacy `railway.json`. The repository file still contains the intended builder, start, health-check, and restart settings. Review their effective values before relying on them. Railway documents a December 1, 2026 cutoff for legacy Config as Code. [Railway Config as Code](https://docs.railway.com/config-as-code)

## 14. Admin Studio

### First administrator

With the local PostgreSQL service running, check that `DATABASE_URL` targets the intended local database. Apply the local migrations and generate the Prisma client:

```powershell
npx.cmd pnpm@10 --filter @biling/api exec prisma migrate deploy
npx.cmd pnpm@10 run db:generate
```

Run the create-only CLI from PowerShell. The prompt hides the password, and the script clears the temporary environment variables afterward:

```powershell
$env:STAFF_EMAIL = Read-Host "Staff email"
$env:STAFF_ROLE = 'ADMIN'
$staffSecret = Read-Host "Staff password (8 to 128 characters)" -AsSecureString
try {
    $env:STAFF_PASSWORD = [System.Net.NetworkCredential]::new('', $staffSecret).Password
    npx.cmd pnpm@10 --filter @biling/api run staff:provision
} finally {
    Remove-Item Env:STAFF_EMAIL,Env:STAFF_ROLE,Env:STAFF_PASSWORD -ErrorAction SilentlyContinue
    $staffSecret.Dispose()
}
```

Use `EDITOR` when provisioning an editor. Run the command once per staff member with their own email and password. It refuses duplicates and preserves existing credentials. There is no public registration or default password.

### Authenticator setup and recovery

Administrators can open **Admin Studio → Staff → Invite staff**, enter an email, and choose Editor or Administrator. Share the one-time invitation code privately with the invitee. They enter it at `/admin/signup`, choose a password, and verify an authenticator before receiving a staff session. They use the invited email for later sign-ins. An invitation expires after 15 minutes. To replace it, issue a fresh invitation with the same email and role.

The first administrator still needs a trusted operator. To create their invitation, run `staff:access-code` with `STAFF_EMAIL`, `STAFF_CODE_PURPOSE=INVITE`, and `STAFF_ROLE=ADMIN` against the intended Studio database. Existing accounts use setup or recovery codes.

Configure the API's `STAFF_MFA_KEY` before the first enrollment. Generate a random 32-byte base64url value with Node's `crypto.randomBytes(32).toString("base64url")`. Store it in the ignored local `.env` for development or a secret manager for hosting. Back it up securely. Replacing it without migrating encrypted seeds makes existing authenticator registrations unreadable.

After verifying the staff member's identity, a trusted operator with database access issues a one-time code from a private terminal:

```powershell
$env:STAFF_EMAIL = Read-Host "Staff email"
$env:STAFF_CODE_PURPOSE = 'SETUP'
try {
    npx.cmd pnpm@10 --filter @biling/api run staff:access-code
} finally {
    Remove-Item Env:STAFF_EMAIL,Env:STAFF_CODE_PURPOSE -ErrorAction SilentlyContinue
}
```

Deliver the code privately. It expires after 15 minutes and a new code replaces the old one. On the sign-in screen, expand **Setting up your authenticator?** and enter the code with the staff credentials. Scan the QR code with a time-based authenticator, or expand **Enter the key manually**. The QR code is generated locally by the web server. Enter the app's six-digit code to finish enrollment. Subsequent sign-ins require the password and current authenticator code.

For a lost password or authenticator, the operator verifies identity through an established channel and runs the same command with `STAFF_CODE_PURPOSE = 'RECOVERY'`. The staff member enters the recovery code and a new password on [Recover access](http://localhost:3000/admin/recovery), then enrolls a new authenticator. Redemption revokes all existing sessions and invalidates old sign-in challenges. It cannot restore a suspended account. If the enrollment challenge expires after a recovery, issue a new `SETUP` code for the new password.

### Studio use

Start the applications with `npx.cmd pnpm@10 run dev` and visit [Admin Studio](http://localhost:3000/admin). The overview shows draft and published counts and recently modified items. Use **Productions** and **Episodes** to create or filter records. A production's **Episodes** link opens the associated list. Choose a publication status and save. A published episode needs a publication date in UTC. Public visibility still depends on its production being published.

Both roles can create, edit, publish, and unpublish. Administrators can also archive, edit, and restore archived content. The Studio confirms archive and unpublish actions. Published URLs stay stable by locking the show's slug and the episode's slug and production after first publication, including after unpublishing. Updates include the last-read revision and reject stale edits.

Artwork uses an approved HTTPS image URL loaded by the browser. YouTube inputs accept validated IDs and supported HTTPS video URLs, and the Studio previews the thumbnail and embed. The database enforces a unique episode YouTube ID. Media availability depends on the external provider.

Administrators use **Staff** to suspend or restore accounts or revoke their current sessions. Suspension blocks new sign-ins. Revocation keeps the account active and requires staff to sign in again. Self-suspension is blocked. **Activity** shows who created or edited each item, status transitions, and the timestamp in UTC. Staff lifecycle activity is visible only to administrators. Editorial saves and their audit records commit together.

### Web routes and API

| Web route                                   | Purpose                                                                         |
| ------------------------------------------- | ------------------------------------------------------------------------------- |
| `/admin/login`                              | Staff sign-in.                                                                  |
| `/admin/signup`                             | Accept an operator-issued staff invitation and choose a password.               |
| `/admin/mfa`, `/admin/recovery`             | Authenticator verification or first enrollment, and operator-assisted recovery. |
| `/admin`                                    | Protected overview.                                                             |
| `/admin/shows`, `/admin/episodes`           | Protected, filtered lists with 50 records per page.                             |
| `/admin/shows/new`, `/admin/episodes/new`   | Create a production or episode.                                                 |
| `/admin/shows/[id]`, `/admin/episodes/[id]` | Edit and manage publication status.                                             |
| `/admin/staff`, `/admin/audit`              | Administrator access management and paginated activity.                         |

| Methods and API paths                                                                 | Purpose                                                                                                             |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `POST /api/v1/admin/auth/login`                                                       | Exchange a staff email and password for an expiring sign-in challenge, with a setup code for an unenrolled account. |
| `GET /api/v1/admin/auth/challenge`, `POST /api/v1/admin/auth/verify`                  | Read challenge details and exchange a valid authenticator code for the staff bearer session.                        |
| `POST /api/v1/admin/auth/recover`                                                     | Redeem an operator-issued recovery code, reset access, and start authenticator re-enrollment.                       |
| `POST /api/v1/admin/auth/signup`                                                      | Redeem an invitation for a pending staff account and start authenticator enrollment.                                |
| `GET /api/v1/admin/auth/me`, `POST /api/v1/admin/auth/logout`                         | Check identity or revoke the active session.                                                                        |
| `GET /api/v1/admin/dashboard`, `GET /api/v1/admin/show-options`                       | Counts, recent edits, and production choices for episode forms.                                                     |
| `GET` and `POST /api/v1/admin/shows`, `GET` and `PATCH /api/v1/admin/shows/:id`       | List, create, read, or update shows.                                                                                |
| `GET` and `POST /api/v1/admin/episodes`, `GET` and `PATCH /api/v1/admin/episodes/:id` | List, create, read, or update episodes.                                                                             |
| `GET /api/v1/admin/staff`, `POST /api/v1/admin/staff/:id/access`                      | Administrator-only staff roster, suspension, restoration, and revocation.                                           |
| `POST /api/v1/admin/staff/invitations`                                                | Issue or replace a one-time invitation. Requires an active administrator session.                                   |
| `GET /api/v1/admin/audit`                                                             | Filterable, paginated activity. Staff security events require the administrator role.                               |

Swagger documents the staff bearer scheme and authoring payloads. The browser uses HttpOnly, SameSite=Strict cookies and exact Origin checks on staff form actions. Hosted cookies require HTTPS and use a host-only `__Host-` prefix. NestJS stores salted scrypt password hashes, digests of opaque tokens, and AES-GCM-encrypted TOTP seeds. MFA challenges expire after ten minutes, allow five OTP attempts, and consume the accepted TOTP step to prevent replay. Sessions expire after eight hours. Password sign-in permits eight attempts per email and 60 per API-observed IP in ten minutes. Recovery permits 20 attempts per API-observed IP in ten minutes. Deployments behind a proxy may share the IP bucket. The API bearer contract can be used by a future native client over HTTPS.

The transaction in `20261119163000_admin_studio` adds the staff tables and backfills URL-lock markers. `20261119170000_staff_lifecycle` preserves staff accounts and content and invalidates the pre-MFA sessions. Production migration and deployment require separate approval. Recovery is operator-assisted. The Studio uses manual authenticator enrollment and records activity from this migration onward, with no historical backfill or retention automation.

`20261119173000_staff_signup` adds the invitation challenge type. Existing staff accounts and sessions are preserved.

## 15. Editorial Publishing

The dedicated Prisma `Article` model stores drafts, published and archived articles, editorial metadata, a byline and category, normalized tags, and validated JSON body blocks. The additive migration `20261119180000_editorial_articles` creates the article table, indexes and two join tables for optional show and episode links. Phase 5 and its GTA VI release article are deployed. Existing production, episode and staff records are preserved.

### Editorial workflow

The Phase 5 local preview uses [the website on port 3100](http://127.0.0.1:3100/articles) and [the API on port 3102](http://127.0.0.1:3102/api/v1/docs) to avoid the existing preview ports. For a standard development run, use the configured origin and ports in section 7.

1. Start PostgreSQL and the local API/web apps using the commands in section 7. For an existing local database, apply the checked-in migrations with `npx.cmd pnpm@10 --filter @biling/api exec prisma migrate deploy` after targeting local PostgreSQL.
2. Sign in at [the Phase 5 Admin Studio](http://127.0.0.1:3100/admin/login) or your configured Studio origin with your staff account and authenticator. Go to **Articles** and select **Write an article**.
3. Add a title, slug, byline, category and language. Add an excerpt, tags, artwork with alternative text and credits, and related productions or episodes as needed. Use rights-cleared image URLs.
4. Add or reorder paragraphs, headings, quotes, numbered or bulleted lists, images and YouTube blocks. The toolbar inserts bold, italic and HTTPS link formatting. Add SEO title and description if needed.
5. Select **Draft**, save, and open **Preview saved article**. The preview requires an active staff session and is marked noindex. Save again before previewing new changes.
6. Select **Published** and save. The publication time is set automatically and the slug becomes fixed. Return the article to **Draft** to unpublish it. Administrators can archive or restore articles. Activity appears under **Activity → Articles**.

### Routes and API

| Route                                                                | Behavior                                                                                                              |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `/articles`                                                          | Featured and latest publications, categories, tag filters and pagination.                                             |
| `/articles/[slug]`                                                   | Published article, byline, media, related articles and productions, sharing and article metadata.                     |
| `/sitemap.xml`                                                       | Public root routes and published article URLs.                                                                        |
| `/admin/articles`                                                    | Staff list filtered by status, category and byline.                                                                   |
| `/admin/articles/new`, `/admin/articles/[id]`                        | Staff article editor.                                                                                                 |
| `/admin/articles/[id]/preview`                                       | Private preview of the saved article, including drafts.                                                               |
| `GET /api/v1/articles`                                               | Published summaries, with optional category, tag, featured, show and episode filters. Supports page and limit (1–24). |
| `GET /api/v1/articles/:slug`                                         | Published body and related content. Drafts and archived articles return 404.                                          |
| `GET /api/v1/articles/sitemap`                                       | Published slugs and modification dates for the sitemap.                                                               |
| `GET /api/v1/search`                                                 | Adds a bounded article group matching title, excerpt, byline or category.                                             |
| `GET /api/v1/admin/articles`, `POST /api/v1/admin/articles`          | Filter staff list or create an article.                                                                               |
| `GET /api/v1/admin/articles/:id`, `PATCH /api/v1/admin/articles/:id` | Read any publication state or update using the current revision.                                                      |
| `GET /api/v1/admin/article-options`                                  | Related production and episode choices and existing byline/category suggestions.                                      |

The homepage features selected articles alongside the existing production sections. Shows and episodes display links to articles associated with them. Staff writes reuse the existing role policy, transaction-backed audit history, opaque bearer sessions and origin checks. Rich text is rendered as React elements from validated blocks. HTTPS images load directly from their host, and only validated YouTube IDs are embedded.

Bylines and categories are reusable text labels. The editor previews saved drafts and supports English, French, and Arabic with RTL article layout. Translation linking, scheduled publication, uploads, and full-body search are outside the current implementation. The seed contains no articles.

Workspace lint, TypeScript, tests, and production builds passed. A separate, disposable local PostgreSQL database verified the migration chain, draft and staff preview, publishing, safe article HTML, related productions and episodes, discovery, search, sitemap inclusion, and unpublishing.

Before an approved production release, review and back up PostgreSQL, verify the Railway pre-deploy Prisma command against the intended database, and deploy the compatible API before the web release. Check the canonical `SITE_URL`, smoke-test published and draft visibility and staff workflows over HTTPS, and use Biling-approved copy and artwork for the first story.

## 16. Audience accounts and profiles

Phase 6 uses the existing `User` table with nullable new columns to preserve legacy rows. Active audience accounts have an email, unique lowercase username, display name, salted scrypt password hash, and optional biography and HTTPS avatar URL. Existing email-only records keep their IDs and metadata and require an operator decision before they can become audience accounts. Public registration never grants staff privileges. The `USER` role is derived from the audience identity, and private profile fields are never served on a public route.

The additive `20261120100000_audience_accounts` migration adds separate audience session, challenge and rate-limit tables. Staff identities, cookies, credentials, MFA, and permissions continue through their existing paths. Audience sessions last up to 30 days. Logout revokes the current bearer. Resetting a password consumes the current reset token and revokes all audience sessions and outstanding account email challenges. The API stores token digests and verifies expiry on every protected request. Database rate limits cover account identifiers and API-observed source IPs. Behind a proxy, a shared IP bucket may limit multiple visitors together.

### Audience routes and endpoints

| Web route                             | Purpose                                                                            |
| ------------------------------------- | ---------------------------------------------------------------------------------- |
| `/register`, `/login`                 | Register and sign in.                                                              |
| `/profile`, `/profile/edit`           | Read and edit the signed-in audience member's own profile.                         |
| `/forgot-password`, `/reset-password` | Request a reset email and redeem its token.                                        |
| `/verify-email`                       | Verify with the emailed token and account password, or request a replacement link. |

All API paths below are under `/api/v1/audience`.

| Method and path                               | Purpose                                                                             |
| --------------------------------------------- | ----------------------------------------------------------------------------------- |
| GET /capabilities                             | Indicate whether registration and account email are available.                      |
| POST /register, POST /login                   | Register an audience user, or return an opaque audience bearer and expiry.          |
| GET /me, PATCH /me                            | Read or update the authenticated audience profile.                                  |
| POST /logout                                  | Revoke the supplied audience bearer.                                                |
| POST /forgot-password, POST /reset-password   | Request a reset or consume a 30-minute reset token.                                 |
| POST /resend-verification, POST /verify-email | Request a verification link or consume its 24-hour token with the account password. |

Next.js sends bearer tokens to NestJS server-to-server. The browser stores only the web host's HttpOnly audience cookie. HTTPS uses a Secure `__Host-` cookie with `SameSite=Lax` and no Domain attribute. Mutating web actions require an exact matching Origin. The browser does not need access to API-domain cookies or credentialed CORS. Future native clients can use the same JSON endpoints and store their bearer with OS-backed secure storage.

### Local testing and email integration

1. Point `DATABASE_URL` at the local PostgreSQL database and use `NODE_ENV=development` for the API. From the repo root, run:

   ```PowerShell
   npx.cmd pnpm@10 run db:up
   npx.cmd pnpm@10 --filter @biling/api exec prisma migrate deploy
   npx.cmd pnpm@10 run db:generate
   npx.cmd pnpm@10 run dev
   ```

2. Open [local registration](http://localhost:3000/register) or [the current preview](http://127.0.0.1:3100/register), register with a unique username and a password of at least 12 characters, then sign in. Open Profile, edit the display name or biography, save, and sign out. The default local fallback allows unverified sign-in only with a non-production API and loopback web and database origins.
3. Set `AUDIENCE_WEB_ORIGIN` to the exact browser origin in both apps when using an alternate local port or a custom domain. On the hosted API use the HTTPS public web origin for email links. The web defaults to the canonical site origin on Vercel production.
4. To enable hosted registration, verification and reset email, configure `AUDIENCE_RESEND_API_KEY` and `AUDIENCE_EMAIL_FROM` on the API. Use a sender on a verified Resend domain. Keep the API key out of web settings and source control. Configure HTTPS on hosted environments. Without the provider, hosted registration and email requests report unavailable. Already verified accounts can still sign in. [Resend send email API](https://resend.com/docs/api-reference/emails/send-email)

Email links place tokens in URL fragments so ordinary HTTP requests and referrers omit them. The web form removes the fragment from history after loading it. Verification requires the signup password as well as the email token. Recovery responses intentionally avoid confirming registered email addresses. A disposable PostgreSQL smoke run preserved a legacy user and exercised verification and reset through a stubbed Resend transport. Real inbox delivery still needs configured credentials and a verified sender. Workspace lint, typecheck, tests, and build passed. A 390px-wide Edge run verified signup, sign-in, the HttpOnly cookie, the account menu, profile editing and sign-out. The migration was applied to the local preview on port 3100.

Public profile URLs and account deletion remain future work. Phase 6 has not been deployed and its migration has not been applied to production.

## 17. Community engagement

Phase 7 is implemented in the local working tree on top of the undeployed Phase 6 audience identity. The additive `20261120150000_community_engagement` migration was applied only to the local `biling_media` database. It creates comments, reports, article and episode reactions, show follows, and moderation history. Production has not received either Phase 6 or Phase 7 migrations.

Published articles and episodes have idempotent Like controls and counts. Published productions have Follow controls and follower counts. Article, episode, and show pages include public comment reading, authenticated posting, editing and soft deletion by the owner, one-level replies, newest/oldest sorting, bounded pagination, and reporting. The private profile lists followed published productions. Plain-text validation and React rendering prevent executable comment markup; database-backed audience throttles limit comment, reaction, follow, and report writes. Draft or archived content cannot receive interactions.

Admin Studio includes `/admin/community` for ADMIN and EDITOR accounts. Staff can filter reports by status, inspect reporter reasons, hide, restore or remove comments, dismiss reports, and review the immutable moderation history. Comment state, report state, and audit writes use a transaction. Audience accounts cannot access these endpoints.

Public community API paths are under `/api/v1/community`: `GET/POST /comments`, `PATCH/DELETE /comments/:id`, `POST /comments/:id/reports`, `GET /engagement`, `PUT/DELETE /likes`, `PUT/DELETE /shows/:slug/follow`, and authenticated `GET /following`. Protected moderation uses `GET /api/v1/admin/community/reports` and `PATCH /api/v1/admin/community/comments/:id`.

The community API uses page/limit bounds rather than cursor pagination. It has no real-time updates, notifications, block/mute controls, automated spam scoring, trust levels, or public activity feed. These are deliberate limitations. Workspace type checking and the local migration passed; the community test suite covers visibility, reply depth, ownership, unpublished targets, idempotent reactions/follows, reporting, and audited moderation. Before any hosted release, back up and review production PostgreSQL, then deploy the API/migrations before the web application and smoke-test audience email, authentication, comments, and Studio moderation over HTTPS.

## 18. Games Hub

Phase 8 Games Hub is implemented locally and the additive `20261120160000_games_hub` migration was applied only to local PostgreSQL. It introduces a dedicated `Game` model with ordered questions/options, personality outcomes, and authenticated attempt records. Supported formats are `TRIVIA`, `PERSONALITY`, and `DAILY_CHALLENGE`.

Public routes are `/games` and `/games/[slug]`. Published games must be within their configured availability window. Public responses never include correct answers, option mappings, explanations, or scoring rules. `POST /api/v1/games/:slug/attempts` evaluates option IDs on NestJS and then returns the scored result and explanations. Anonymous trivia/personality play is supported. Signed-in users have attempts saved and can see the most recent 30 in Profile. Daily challenges require sign-in for one official attempt; the server uses UTC dates and a database constraint prevents a second official score for the same game/user/date. Practice does not consume an official attempt.

Admin Studio adds `/admin/games` and `/admin/games/[id]`, backed by `GET/POST/PATCH /api/v1/admin/games`. ADMIN and EDITOR may create/update drafts or published games; only ADMIN can archive or edit archived content. The MVP editor accepts question/outcome JSON, validates trivia/daily correct answers and personality outcome keys, and exposes attempt totals. No games are seeded because Biling-approved questions and artwork were not supplied.

The focused Games service tests cover server-side trivia scoring, personality outcomes, daily authentication, and duplicate official attempt prevention. Time-limit configuration is displayed but is not yet enforced with a server-issued start token. Leaderboards, rewards, contests, sponsorship, payments, and prizes are deliberately out of scope. No production migration or deployment was performed.

## 19. Native mobile application

The Expo Router application in `apps/mobile` implements Home, Explore, Games, Following and Profile with native React Native screens for productions, episodes, articles and gameplay. It reuses published REST routes and shared schemas. The existing audience bearer is stored in SecureStore, and official games and community writes are validated by NestJS. Hosting and local device setup are in [Mobile development](MOBILE_DEVELOPMENT.md).

Mobile release readiness requires device tests on both iOS and Android. Confirm YouTube player identity and fullscreen, session persistence and expiry, official daily attempts, safe areas, keyboard avoidance, large text and Arabic article layout. Games and community depend on the target API revision and database migrations. Verification and password recovery use the existing website email links.

## 20. Biling Arcade

The web and native Games hubs include daily Mot, Links and Recall boards alongside the quiz collection. The API owns puzzle definitions, attempt timing, move validation and persisted account progress. The Studio Arcade editor schedules immutable daily puzzles by UTC date. Official legacy daily quiz selections are persisted, while casual quizzes reset when leaving the player. See [Arcade development](ARCADE_DEVELOPMENT.md) for migrations, local sample content, endpoints and the device checklist.
