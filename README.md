<div align="center">

# Social Copilot

**One composer. Nine networks. AI-assisted content, reliable background publishing, and automated engagement.**

[![Next.js](https://img.shields.io/badge/Next.js-16.2-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle-ORM-C5F74F?logo=drizzle&logoColor=black)](https://orm.drizzle.team)
[![Neon Postgres](https://img.shields.io/badge/Neon-Postgres-00E599?logo=postgresql&logoColor=white)](https://neon.tech)
[![Inngest](https://img.shields.io/badge/Inngest-Background%20Jobs-4636F5)](https://www.inngest.com)
[![Clerk](https://img.shields.io/badge/Clerk-Auth%20%26%20Billing-6C47FF?logo=clerk&logoColor=white)](https://clerk.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Status](https://img.shields.io/badge/status-beta-f59e0b)](#project-status)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [Background Jobs](#background-jobs)
- [API Reference](#api-reference)
- [Plans & Limits](#plans--limits)
- [Security](#security)
- [Testing & Quality](#testing--quality)
- [Deployment](#deployment)
- [Project Status](#project-status)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Creators and small marketing teams either juggle nine native apps — each with its own composer, media rules, and reply inbox — or pay agency prices for tools built for agencies.

**Social Copilot** collapses that workflow into a single dashboard: write once, preview per network, schedule in your own timezone, and let durable background jobs handle delivery and retries. Gemini drafts captions, ImageKit stores and transforms media, and keyword or AI-driven rules reply to incoming comments so your accounts stay responsive without manual babysitting.

**Supported networks:** Instagram · Twitter/X · LinkedIn · Facebook · YouTube · TikTok · Pinterest · Discord · Slack

> **Who this is for:** solo creators posting daily across three networks, in-house marketers who need scheduling that does not silently fail, and lean agencies managing a handful of brands.

---

## Features

| Area | What it does |
|---|---|
| **Unified composer** | One editor, multi-select platform chips, per-platform live previews, emoji picker, media attachments |
| **AI writing** | Gemini-backed caption generation and rewriting from a prompt, with per-plan monthly quotas |
| **Media library** | ImageKit-backed uploads with signed client auth, thumbnails, AI alt-text generation, reusable assets |
| **Scheduling** | Timezone-aware scheduling (the IANA zone is stored with the post) and a drag-enabled calendar view |
| **Durable publishing** | Inngest `post-publish` job with retries, a publish lease lock, and per-account idempotency |
| **Auto-reply** | Keyword or AI rules that answer public comments, with per-comment deduplication and activity logs |
| **OAuth connections** | Nine provider integrations with one-time-use state nonces, encrypted tokens, and hourly token refresh |
| **Billing & gating** | Clerk Billing plans (Free / Pro / Business) enforced server-side on accounts, posts, rules, storage, and AI usage |
| **Notifications** | Per-user records for partial publishes, expired tokens, and billing events |
| **Observability** | `/api/health` liveness probe with a database latency check, structured job logging |

---

## Architecture

```
                 ┌──────────────────────────────────────────────┐
  Browser  ──▶   │  Next.js 16 App Router (React 19, RSC)       │
                 │  (landing) · (auth) · (dashboard)            │
                 └───────────────┬──────────────────────────────┘
                                 │  Clerk middleware (proxy.ts)
                                 ▼
                 ┌──────────────────────────────────────────────┐
                 │  Route Handlers  /api/*                      │
                 │  posts · accounts · media · ai · auto-reply  │
                 │  billing · webhooks · health · inngest       │
                 └───┬───────────────┬──────────────┬───────────┘
                     │               │              │
       Drizzle ORM   │               │ emit events  │  signed webhooks
                     ▼               ▼              ▼
        ┌────────────────────┐ ┌───────────┐ ┌──────────────────┐
        │  Neon Postgres     │ │  Inngest  │ │ Clerk · Meta ·   │
        │  (serverless)      │ │  runtime  │ │ platform senders │
        └────────────────────┘ └─────┬─────┘ └──────────────────┘
                                     │
              ┌──────────────────────┴───────────────────────┐
              │ post-publish · token-refresh (cron)          │
              │ auto-reply · media-alt-text                  │
              └──────────────────────────────────────────────┘

        External services: Google Gemini (captions, alt text) · ImageKit (media CDN + transforms)
```

### Publish flow

1. The composer `POST`s to `/api/posts`. Plan limits and payload are validated server-side.
2. **Publish now** emits `app/post.publish` immediately; **Schedule** emits it with the target timestamp so Inngest sleeps until then.
3. `post-publish` acquires a time-boxed lease on the post (`publish_lock_at`) so concurrent workers and retries cannot double-post.
4. Target accounts are re-fetched **scoped to the post owner**, so a spoofed event cannot publish through someone else's tokens.
5. Each account is published in its own `step.run`; a unique index on `(post_id, social_account_id)` makes a retried insert a no-op.
6. The post lands on `posted`, `partial`, or `failed`, and the lease is released on the same write.

### Auto-reply flow

Platform webhook → HMAC signature verification → dedupe insert into `webhook_events` → emit `social/comment.received` → `auto-reply` job matches active rules, generates a keyword or AI response, and writes an `auto_reply_logs` row keyed by the external comment id.

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 16** (App Router, RSC, Turbopack) | Middleware lives in `proxy.ts` per Next 16 conventions |
| UI | **React 19**, Tailwind CSS 4, shadcn/ui, Base UI, Lucide | Dark-first design system |
| Data fetching | TanStack Query 5 | Client cache for dashboard and calendar |
| Database | **Neon** serverless Postgres | HTTP driver, no connection pooling needed |
| ORM | **Drizzle ORM** + drizzle-kit | SQL-first schema, versioned migrations in `drizzle/` |
| Auth & billing | **Clerk** (+ Svix webhooks) | Sessions, user sync, subscription plans |
| Background jobs | **Inngest v4** | Durable steps, retries, cron, concurrency control |
| AI | **Google Gemini** (`gemini-1.5-flash`) | Caption generation, alt text |
| Media | **ImageKit** | Signed uploads, CDN delivery, AI transforms |
| Validation | **Zod 4** | Request and payload schemas |
| Charts | Recharts | Dashboard analytics widgets |
| Testing | Vitest | Unit tests for crypto, OAuth state, rate limiting |

---

## Project Structure

```
.
├── app/
│   ├── (landing)/              # Marketing site — hero, features, pricing, FAQ
│   ├── (auth)/                 # Clerk sign-in / sign-up (catch-all routes)
│   ├── (dashboard)/            # Authenticated app shell
│   │   ├── dashboard/          # Stats, charts, recent activity (Server Component)
│   │   ├── compose/            # Post composer
│   │   ├── calendar/           # Scheduled post calendar
│   │   ├── accounts/           # Connected social accounts
│   │   ├── media/              # Media library
│   │   ├── auto-reply/         # Rule builder and logs
│   │   ├── analytics/          # Placeholder (see Roadmap)
│   │   ├── billing/ settings/  # Plan management and profile
│   └── api/                    # Route handlers (see API Reference)
├── components/
│   ├── dashboard/              # Composer, calendar, media, rule editor
│   ├── landing/                # Marketing sections
│   ├── providers/              # React Query provider
│   └── ui/                     # shadcn/ui primitives
├── lib/
│   ├── db/                     # Drizzle client + schema
│   ├── inngest/                # Client + functions (publish, refresh, reply, alt-text)
│   ├── encryption.ts           # AES-256-GCM with key versioning
│   ├── oauth-state.ts          # One-time-use OAuth nonces
│   ├── rate-limit.ts           # Sliding-window limiter
│   ├── social-platforms.ts     # Provider registry (auth URLs, scopes)
│   ├── plan-limits.ts          # Plan matrix
│   ├── gemini.ts imagekit.ts   # External service wrappers
│   └── env.ts validation.ts    # Env guards and Zod schemas
├── drizzle/                    # SQL migrations + snapshots
├── proxy.ts                    # Clerk middleware (Next 16)
├── next.config.ts              # CSP + security headers, image domains
└── PRD.md                      # Full product requirements document
```

---

## Getting Started

### Prerequisites

- **Node.js 20+** and npm
- A **Neon** (or any Postgres) database URL
- Accounts for **Clerk**, **Inngest**, **ImageKit**, and **Google AI Studio** (Gemini)
- OAuth app credentials for each social network you want to connect

### Installation

```bash
git clone https://github.com/Ramanand-tomar/Social-Copilot.git
cd Social-Copilot
npm install
```

> The repo ships `.npmrc` with `legacy-peer-deps=true` — React 19 peer ranges are not yet published by every dependency.

### Configure environment

```bash
cp .env.example .env.local   # then fill in the values below
```

Generate an encryption key (32 bytes, hex):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Set up the database

```bash
npx drizzle-kit generate   # only when you change lib/db/schema.ts
npx drizzle-kit migrate    # apply migrations in drizzle/
```

### Run it

Run the app and the Inngest dev server side by side:

```bash
# terminal 1
npm run dev

# terminal 2 — discovers functions at /api/inngest
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

| URL | What |
|---|---|
| http://localhost:3000 | Application |
| http://localhost:8288 | Inngest dev dashboard (event stream, runs, replays) |
| http://localhost:3000/api/health | Liveness + DB probe |

### Webhooks in development

Clerk and social platform webhooks need a public URL. Tunnel with ngrok and add the hostname to `allowedDevOrigins` in `next.config.ts`:

```bash
ngrok http 3000
```

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint (Next.js config) |
| `npm test` | Vitest unit tests |

---

## Environment Variables

### Core (required)

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon/Postgres connection string |
| `ENCRYPTION_KEY` | 32-byte hex key for AES-256-GCM token encryption |
| `NEXT_PUBLIC_APP_URL` | Public origin, e.g. `https://app.example.com` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk frontend key |
| `CLERK_SECRET_KEY` | Clerk backend key |
| `CLERK_WEBHOOK_SECRET` | Svix secret for `/api/webhooks/clerk` |

### Background jobs, AI & media

| Variable | Description |
|---|---|
| `INNGEST_EVENT_KEY` | Inngest event key (required in production) |
| `INNGEST_SIGNING_KEY` | Inngest signing key — **without it `/api/inngest` is unauthenticated** |
| `GEMINI_API_KEY` | Google Generative AI key |
| `IMAGEKIT_PRIVATE_KEY` | ImageKit private key (server-side signing) |
| `NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY` | ImageKit public key |
| `NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT` | ImageKit delivery endpoint |

### Webhooks & billing

| Variable | Description |
|---|---|
| `WEBHOOK_VERIFY_TOKEN` | Token echoed during platform webhook subscription handshakes |
| `META_APP_SECRET` | Meta app secret for `x-hub-signature-256` verification |
| `SOCIAL_WEBHOOK_SECRET` | Shared secret for generic HMAC webhook verification |
| `NEXT_PUBLIC_CLERK_PRO_PLAN_ID` | Clerk Billing plan id (Pro) |
| `NEXT_PUBLIC_CLERK_BUSINESS_PLAN_ID` | Clerk Billing plan id (Business) |

### Social OAuth (per platform)

Each network needs a client id/secret pair. Omit a pair to leave that network disabled.

```
INSTAGRAM_CLIENT_ID / INSTAGRAM_CLIENT_SECRET
TWITTER_CLIENT_ID   / TWITTER_CLIENT_SECRET
LINKEDIN_CLIENT_ID  / LINKEDIN_CLIENT_SECRET
FACEBOOK_CLIENT_ID  / FACEBOOK_CLIENT_SECRET
YOUTUBE_CLIENT_ID   / YOUTUBE_CLIENT_SECRET
TIKTOK_CLIENT_ID    / TIKTOK_CLIENT_SECRET
PINTEREST_CLIENT_ID / PINTEREST_CLIENT_SECRET
DISCORD_CLIENT_ID   / DISCORD_CLIENT_SECRET
SLACK_CLIENT_ID     / SLACK_CLIENT_SECRET
```

Callback URL for every provider: `{NEXT_PUBLIC_APP_URL}/api/accounts/callback/{platform}`

### Optional

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_FEATURE_ANALYTICS` | Feature flag for the analytics surface |
| `ENCRYPTION_KEY_V1`, `ENCRYPTION_KEY_V2`, … | Retired keys kept for decrypting older rows during rotation |

---

## Database

Schema lives in [`lib/db/schema.ts`](lib/db/schema.ts); migrations are checked into [`drizzle/`](drizzle/).

| Table | Purpose |
|---|---|
| `users` | Clerk-synced profile, plan, timezone, AI usage counters |
| `social_accounts` | Connected networks with encrypted access/refresh tokens; unique per `(user, platform, account)` |
| `posts` | Content, media, status, scheduled time + IANA timezone, publish lease |
| `post_platform_results` | Per-account publish outcome; unique per `(post, account)` for idempotency |
| `oauth_states` | One-time-use OAuth nonces with expiry; unique `nonce` rejects replays |
| `webhook_events` | Inbound webhook dedupe, unique per `(provider, external_event_id)` |
| `notifications` | Per-user publish, token, and billing events |
| `auto_reply_rules` / `auto_reply_logs` | Rule definitions and per-comment reply audit trail |
| `media_assets` | ImageKit file references, thumbnails, alt text, size accounting |

**Migration workflow**

```bash
# 1. edit lib/db/schema.ts
npx drizzle-kit generate   # 2. emit SQL into drizzle/
npx drizzle-kit migrate    # 3. apply
```

---

## Background Jobs

Registered in [`app/api/inngest/route.ts`](app/api/inngest/route.ts).

| Function | Trigger | Retries | Responsibility |
|---|---|---|---|
| `post-publish` | event `app/post.publish` | 3 | Lease the post, publish per account, record results, set terminal status |
| `refresh-tokens` | cron `0 * * * *` | — | Refresh OAuth tokens nearing expiry; notify the user when refresh fails |
| `auto-reply` | event `social/comment.received` | 2 | Match rules, generate the reply, log it (deduped per comment) |
| `media-alt-text` | event `media/alt-text.generate` | 2 | Generate accessible alt text for uploaded media via Gemini |

---

## API Reference

All routes except the landing page and webhooks require an authenticated Clerk session.

| Method | Endpoint | Description |
|---|---|---|
| `GET` `POST` | `/api/posts` | List posts (filterable) · create a draft, schedule, or publish now |
| `PATCH` `DELETE` | `/api/posts/[id]` | Update or delete a post |
| `GET` | `/api/accounts` | List connected accounts with plan context |
| `GET` | `/api/accounts/connect/[platform]` | Begin OAuth — issues a one-time state nonce |
| `GET` | `/api/accounts/callback/[platform]` | OAuth callback — validates nonce, encrypts and stores tokens |
| `POST` `DELETE` | `/api/accounts/[id]` | Refresh profile · disconnect an account |
| `POST` | `/api/ai/generate` | Generate or rewrite a caption (quota enforced) |
| `GET` `POST` | `/api/media` | List media assets · register an uploaded asset |
| `GET` | `/api/media/upload-auth` | ImageKit client upload signature |
| `DELETE` | `/api/media/[id]` | Delete an asset |
| `GET` `POST` | `/api/auto-reply` | List and create auto-reply rules |
| `PATCH` `DELETE` | `/api/auto-reply/[id]` | Update or delete a rule |
| `GET` | `/api/billing/usage` | Current plan, limits, and consumption |
| `POST` | `/api/webhooks/clerk` | Svix-verified user lifecycle sync |
| `GET` `POST` | `/api/webhooks/social` | Subscription handshake · HMAC-verified platform events |
| `GET` | `/api/health` | Liveness with DB latency (`200` / `503`) |
| `GET` `POST` `PUT` | `/api/inngest` | Inngest function serving endpoint |

---

## Plans & Limits

Enforced server-side in [`lib/plan-limits.ts`](lib/plan-limits.ts).

| Limit | Free | Pro | Business |
|---|---:|---:|---:|
| Connected accounts | 2 | 10 | 100 |
| Scheduled posts | 5 | 100 | Unlimited* |
| Auto-reply rules | 1 | 10 | Unlimited* |
| Media storage | 500 MB | 10 GB | 100 GB |
| AI captions / month | 10 | 500 | Unlimited* |

<sub>*Capped at 9,999 in code as a practical ceiling.</sub>

---

## Security

- **Token encryption at rest** — AES-256-GCM with versioned keys (`v1:` prefix). Rotate by setting a new `ENCRYPTION_KEY` and moving the old value to `ENCRYPTION_KEY_V1`; historic rows stay readable.
- **OAuth replay protection** — a one-time-use nonce is inserted before the authorize redirect and atomically deleted on callback; a unique index rejects replays even under a race.
- **Owner-scoped publishing** — target accounts are re-queried against the post owner inside the job, so a forged event cannot publish through another user's tokens.
- **Idempotent delivery** — a publish lease plus a unique `(post, account)` index makes retries safe.
- **Webhook verification** — Svix for Clerk, `x-hub-signature-256` for Meta, and generic HMAC-SHA256 elsewhere, all compared in constant time; verified events are deduped.
- **Inngest endpoint signing** — `INNGEST_SIGNING_KEY` makes `/api/inngest` reject unsigned invocations; the app logs an explicit error if it is missing in production.
- **Security headers** — CSP (production), `X-Frame-Options: DENY`, `nosniff`, strict referrer policy, restrictive `Permissions-Policy`, and HSTS with preload, configured in `next.config.ts`.
- **Rate limiting** — sliding-window limiter on sensitive routes (in-memory by default; swap the backend for Redis/Upstash for multi-instance deployments).
- **Route protection** — Clerk middleware in `proxy.ts` gates everything outside the landing page, auth pages, and webhooks.

> **Reporting a vulnerability:** please open a private security advisory on this repository rather than a public issue.

---

## Testing & Quality

```bash
npm test          # Vitest unit suite
npm run lint      # ESLint
npm run build     # type-check + production build
```

Current unit coverage targets the security-critical primitives: `lib/encryption.test.ts`, `lib/oauth-state.test.ts`, and `lib/rate-limit.test.ts`. An end-to-end suite is on the roadmap.

---

## Deployment

The app is designed for Vercel, but any Node 20+ host works.

1. **Database** — create a Neon project and set `DATABASE_URL`; run `npx drizzle-kit migrate` against it.
2. **Clerk** — add the production instance keys and point the webhook at `/api/webhooks/clerk`.
3. **Inngest** — connect the app and register `{APP_URL}/api/inngest`; set `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY`.
4. **ImageKit** — set the public/private keys and URL endpoint; allow your domain in ImageKit settings.
5. **Social apps** — register `{APP_URL}/api/accounts/callback/{platform}` as the redirect URI for every provider.
6. **Deploy** — push to your host and set all variables above.

### Production checklist

- [ ] `ENCRYPTION_KEY` is a fresh 32-byte hex value, stored in a secret manager and never committed
- [ ] `INNGEST_SIGNING_KEY` is set (otherwise the jobs endpoint is publicly invokable)
- [ ] `NEXT_PUBLIC_APP_URL` matches the deployed origin exactly — OAuth callbacks depend on it
- [ ] Clerk and social webhook secrets configured; handshakes verified
- [ ] Migrations applied; `/api/health` returns `200`
- [ ] Rate-limit backend swapped to Redis if running more than one instance
- [ ] `allowedDevOrigins` in `next.config.ts` trimmed of tunnel hostnames

---

## Project Status

Social Copilot is in **active development**. The product surface — auth, composer, scheduling, calendar, media library, auto-reply rules, billing gates, and the full job pipeline — is implemented and builds clean.

**Known gaps before v1 GA:**

- Per-platform publish adapters are stubbed: `post-publish` runs the complete durable pipeline (locking, idempotency, result recording, status transitions) but writes mock external post ids instead of calling the network APIs. Real adapters plug in at the marked seam in [`lib/inngest/functions/post-publish.ts`](lib/inngest/functions/post-publish.ts).
- Webhook HMAC verification covers Meta and a generic scheme; the remaining networks need provider-specific schemes.
- Analytics is a placeholder page.
- Notifications are persisted but the bell UI is not yet built.
- Drag-to-reschedule on the calendar is pending.

See [`PRD.md`](PRD.md) for the full requirements, acceptance criteria, and open questions.

---

## Roadmap

| Milestone | Scope |
|---|---|
| **v1 GA** | Real publish adapters for all nine networks · per-provider webhook verification · notifications bell · end-to-end tests |
| **v1.1** | Drag-to-reschedule calendar · real platform analytics (reach, impressions, engagement) · post-performance comparison |
| **v2.0** | Team workspaces with roles · content approval queue · shared brand-voice prompts |
| **Future** | Native mobile apps · fine-tuned brand-voice models · best-time-to-post suggestions · unified DM inbox |

---

## Contributing

Contributions are welcome.

1. Fork the repository and create a branch: `git checkout -b feat/your-feature`
2. Make your change; keep TypeScript strict and add tests for security-sensitive logic
3. Verify locally: `npm run lint && npm test && npm run build`
4. Commit using [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:` …)
5. Open a pull request describing the change, the reasoning, and how you tested it

Schema changes must ship with a generated migration in `drizzle/`. Never commit `.env.local` or any credential.

> **Note for AI coding agents:** this project targets Next.js 16, which differs from older App Router conventions (middleware lives in `proxy.ts`). Read `AGENTS.md` and the bundled docs under `node_modules/next/dist/docs/` before writing code.

---

## License

No license file is currently included, which means all rights are reserved by default. If you intend this to be open source, add a `LICENSE` file — MIT is the conventional choice for a project like this.

---

## Acknowledgements

Built with [Next.js](https://nextjs.org), [Clerk](https://clerk.com), [Neon](https://neon.tech), [Drizzle ORM](https://orm.drizzle.team), [Inngest](https://www.inngest.com), [ImageKit](https://imagekit.io), [Google Gemini](https://ai.google.dev), and [shadcn/ui](https://ui.shadcn.com).

<div align="center">
<sub>Maintained by <a href="https://github.com/Ramanand-tomar">Ramanand Tomar</a></sub>
</div>
