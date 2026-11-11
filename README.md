# Biling Media Platform

**A proprietary digital entertainment ecosystem developed for Biling Media.**

© 2026 Biling Media. All rights reserved.

---

## Overview

Biling is a digital entertainment platform built around original productions, interactive experiences, community engagement, and digital services.

The platform aims to bring Biling Media's content, personalities, and audience together through a unified digital experience while establishing sustainable monetization opportunities.

## Product Vision

The platform is designed to evolve into a comprehensive entertainment ecosystem encompassing:

- **Biling Originals:** Shows, episodes, livestreams, replays, music videos, exclusive content, and behind-the-scenes productions.
- **Discover:** Personalized content discovery, trending productions, recommendations, and upcoming livestreams.
- **Music:** Original music, releases, playlists, artist showcases, and music programs.
- **Community:** User profiles, comments, reactions, discussions, polls, fan communities, follows, and achievements.
- **Interactive Entertainment:** Games, quizzes, challenges, competitions, leaderboards, and livestream interactions.
- **Biling Premium:** Membership subscriptions, exclusive content, early access, members-only experiences, and premium community benefits.
- **Biling Points & Rewards:** Loyalty points, achievements, challenges, rewards, and redeemable benefits.
- **Biling Merch:** Branded merchandise, limited editions, collectibles, and exclusive products.
- **Biling Experiences:** Events, tickets, live studio attendance, meet-and-greets, backstage access, and exclusive experiences.
- **Giveaways:** Audience participation campaigns, challenges, and promotional prizes.
- **Advertising & Sponsorship:** Sponsored content, advertising placements, branded campaigns, sponsored shows, and advertiser partnerships.
- **Biling for Business:** A dedicated business-facing experience for advertising opportunities, campaign proposals, sponsorship packages, and campaign reporting.

## Monetization Strategy

The platform is designed to support multiple revenue streams:

- Advertising and sponsorships
- Premium subscriptions
- Exclusive digital content
- Games and digital entertainment
- Merchandise sales
- Events and ticketing
- Experiences and promotional campaigns
- Business partnerships and advertiser services

Monetization mechanisms will be introduced progressively, subject to applicable legal, payment, and platform requirements.

---

# Technical Architecture

The platform follows a **modular, cloud-portable architecture** designed for scalability, maintainability, security, and independent deployment.

## Architectural Principles

- **Monorepo:** Application code and shared packages maintained within a unified repository.
- **Modular Monolith:** Backend organized into independently maintainable domain modules without premature microservices.
- **Independent Deployments:** Frontend, backend, and background workers deploy independently.
- **API-First:** Applications communicate through documented REST APIs.
- **Cloud Portability:** Minimize vendor lock-in and infrastructure-specific application dependencies.
- **Scalability:** Support horizontal scaling, caching, asynchronous processing, and CDN-based media delivery.
- **Security by Design:** Authentication, authorization, secrets management, validation, and secure data handling.
- **Separation of Concerns:** Business logic remains independent of frontend and infrastructure implementations.
- **Incremental Evolution:** Introduce complexity only when justified by actual requirements.

## Repository Architecture

The project follows a monorepo structure.

```text
biling-platform/
│
├── apps/
│   ├── web/                  # Next.js frontend
│   ├── api/                  # NestJS backend
│   └── worker/               # Background processing
│
├── packages/
│   ├── contracts/             # Shared API contracts
│   ├── schemas/                # Shared validation schemas
│   └── config/                  # Shared configurations
│
├── infrastructure/
│   └── terraform/               # Infrastructure as Code
│
├── docker/
├── docs/
│   ├── architecture/
│   ├── decisions/
│   └── setup/
│
└── .github/
    └── workflows/                # CI/CD pipelines
```

Applications share a repository but retain independent build, deployment, configuration, and scaling lifecycles.

## Technology Stack

| Layer                      | Technology           |
| -------------------------- | -------------------- |
| Web frontend               | Next.js              |
| Frontend language          | TypeScript           |
| Backend                    | NestJS               |
| Backend language           | TypeScript           |
| API                        | REST                 |
| API documentation          | OpenAPI / Swagger    |
| Database                   | PostgreSQL           |
| ORM                        | Prisma               |
| Validation                 | Zod                  |
| Package manager            | pnpm                 |
| Monorepo orchestration     | Turborepo            |
| Containerization           | Docker               |
| Infrastructure as Code     | Terraform            |
| CI/CD                      | GitHub Actions       |
| Testing                    | Jest / Playwright    |
| Background processing      | BullMQ               |
| Cache / job infrastructure | Redis                |
| Media delivery             | Object storage + CDN |

## Backend Architecture

The backend follows a modular monolith architecture.

Planned domain boundaries include:

- Authentication & Users
- Content Management
- Shows & Productions
- Community & Engagement
- Games & Challenges
- Subscriptions
- Commerce & Merchandise
- Events & Ticketing
- Advertising & Campaigns
- Payments
- Rewards & Loyalty
- Notifications
- Administration & Moderation
- Analytics

Modules will evolve according to product requirements rather than being implemented all at once.

## API Architecture

- REST-based API
- Versioned endpoints under `/api/v1`
- OpenAPI documentation
- Shared API contracts where appropriate
- Independent frontend/backend deployment
- Environment-based API configuration

## Data & Storage

- PostgreSQL for relational application data.
- Prisma for database access and migrations.
- Redis for caching and background job infrastructure when required.
- Object storage for media assets and uploaded files.
- CDN delivery for static assets and media.
- Database migrations maintained in version control.

Video delivery is intended to rely on dedicated streaming platforms or media infrastructure rather than application servers.

---

# Infrastructure & Deployment

## Initial Hosting Strategy

| Component          | Initial Provider / Technology |
| ------------------ | ----------------------------- |
| Web frontend       | Vercel                        |
| Backend API        | Railway                       |
| Background workers | Railway                       |
| Database           | Managed PostgreSQL            |
| Cache / queues     | Redis                         |
| Media storage      | Object storage                |
| Media delivery     | CDN                           |
| CI/CD              | GitHub Actions                |

Hosting providers are implementation choices rather than permanent architectural dependencies.

## Independent Deployment

Applications can be deployed independently from the same repository.

- `apps/web` → Frontend deployment
- `apps/api` → Backend deployment
- `apps/worker` → Worker deployment

Deployment pipelines should be application-aware and rebuild affected applications when shared packages change.

## Cloud Portability

The architecture aims to minimize provider-specific dependencies.

Portability principles:

- Dockerized backend applications.
- Standard PostgreSQL.
- Environment-based configuration.
- Provider-independent business logic.
- Storage abstraction.
- Standard HTTP APIs.
- Infrastructure managed through Terraform.
- Avoid unnecessary dependence on proprietary infrastructure services.

The platform should be capable of evolving toward AWS, Azure, or other suitable infrastructure without requiring a fundamental application rewrite.

## Scalability Strategy

The platform is designed to evolve progressively through:

- CDN-based content delivery.
- Stateless backend applications.
- Horizontal API scaling.
- Database indexing and query optimization.
- Connection pooling.
- Caching.
- Asynchronous background processing.
- Independent worker scaling.
- Dedicated media delivery infrastructure.

Microservices and Kubernetes are intentionally excluded from the initial architecture unless future operational requirements justify them.

---

# Security & Engineering Standards

Planned engineering practices include:

- Secure authentication and authorization.
- Role-based access control.
- Input validation.
- Environment-based secrets management.
- Rate limiting.
- Secure API design.
- Dependency management and vulnerability scanning.
- Database access controls.
- Logging and monitoring.
- Error tracking.
- Backup and recovery procedures.
- Content moderation and user protection.
- Privacy and data protection compliance.

## Development Workflow

The project will follow a structured development workflow:

- GitHub-based source control.
- Feature branches.
- Pull requests.
- Automated CI checks.
- Code reviews.
- Unit and integration testing.
- End-to-end testing where applicable.
- Separate development, staging, and production environments.
- Version-controlled database migrations.
- Architecture Decision Records (ADRs).

---

# Roadmap

The platform will be developed incrementally.

### Phase 1 — Foundation

- Repository and tooling setup.
- Application scaffolding.
- Backend foundation.
- Database configuration.
- Authentication.
- CI/CD.
- Initial deployment.
- Content management foundation.

### Phase 2 — Core Platform

- Content discovery.
- Shows and episodes.
- Video integration.
- User profiles.
- Community features.
- Comments and reactions.
- Administration and moderation.

### Phase 3 — Engagement

- Interactive games.
- Challenges and competitions.
- Points and rewards.
- Premium subscriptions.
- Livestream interactions.

### Phase 4 — Monetization

- Merchandise.
- Events and ticketing.
- Advertising campaigns.
- Business-facing advertising portal.
- Payment integrations.
- Experiences and giveaways.

### Phase 5 — Expansion

- Native mobile applications using React Native and Expo.
- Advanced analytics.
- Enhanced personalization.
- Additional monetization mechanisms.
- Infrastructure evolution according to growth.

---

# Project Status

**Status:** Under Development

This repository represents the evolving implementation of the Biling Media platform.

Architectural decisions and implementation details will be documented progressively.

---

## Local Development

### Requirements

- Node.js 22.11 or newer (Node.js 24 is the CI runtime).
- Docker Desktop with Docker Compose for local PostgreSQL.
- pnpm 10.34.9. On Windows, use `npx pnpm@10` if a global pnpm command is unavailable.

### Start the project

From the repository root in PowerShell:

```powershell
Copy-Item .env.example .env
npx pnpm@10 install
npx pnpm@10 run db:up
npx pnpm@10 run db:generate
npx pnpm@10 run db:migrate
npx pnpm@10 run db:seed
npx pnpm@10 run dev
```

The web app is available at `http://localhost:3000`. The API listens at `http://localhost:3001`, with
health at `/api/v1/health` and OpenAPI documentation at `/api/v1/docs`. The API validates required
environment configuration on startup and connects to PostgreSQL before serving requests.

The local Compose database uses development-only defaults. Change the values in `.env` before
exposing the database outside your machine. PostgreSQL data is kept in a named Docker volume.

### Publishing shows and YouTube episodes

The homepage reads published content from PostgreSQL through the public API:

- `GET /api/v1/shows` lists published shows and their latest published episode.
- `GET /api/v1/episodes` lists the latest 12 published episodes.

To add local development content, start the database and API, then run `npx pnpm@10 run db:studio`
from the repository root. In Prisma Studio, create a **Show** with a unique slug and set its status
to `PUBLISHED`. Create an **Episode** related to that show; set its status to `PUBLISHED` and
`publishedAt` to a date/time. To link YouTube, enter only the 11-character video ID in
`youtubeVideoId` (the value after `v=` in a standard YouTube watch URL). The homepage fetches the
published records on each request; linked episodes show their YouTube thumbnail and open the
YouTube watch page. Episodes without a video ID remain listed with a clear placeholder.

This is a manual publishing workflow for the MVP; there is no YouTube channel synchronization or
public write/admin API. Never expose Prisma Studio publicly.

The repeatable `npx pnpm@10 run db:seed` command imports the seven current **Infilet** archives from
the Biling Media channel's **Live → Past live streams** section. It does not import uploads from the
Videos tab. New livestreams can be added through Prisma Studio until a secure publishing workflow
or official YouTube synchronization is implemented.

### Quality checks

```powershell
npx pnpm@10 run lint
npx pnpm@10 run typecheck
npx pnpm@10 run test
npx pnpm@10 run build
```

`db:up` and `db:down` manage only the local PostgreSQL service. Redis and background workers are
intentionally not included until asynchronous jobs are needed.

## Initial Implementation Notes

- The web app is a responsive, server-rendered discovery homepage. It reads published shows and
  episodes from the API; YouTube playback opens on YouTube. Show detail pages, native playback,
  search, accounts, and community features remain future work.
- The web visual system uses shared CSS tokens and RTL-aware layout rules. The supplied
  `apps/web/public/logo.png` is used unchanged; production photography and approved portraits should
  replace the clearly marked placeholders. See `apps/web/public/ASSET_GUIDE.md`.
- The API is a modular NestJS application with a `/api/v1` prefix, health endpoint, Swagger
  documentation, request validation, security headers, CORS configuration, and consistent error
  responses.
- Prisma starts with user identity, shows, and episodes. Episodes can reference a YouTube video ID;
  user credentials and authentication are not modeled yet. The schema deliberately avoids premature
  billing, engagement, and moderation models.
- Prisma uses its PostgreSQL driver adapter, and migrations are managed with
  `npx pnpm@10 run db:migrate`.

## License

Proprietary software. All rights reserved.

See [LICENSE](LICENSE) for details.

---

© 2026 Biling Media. All rights reserved.
