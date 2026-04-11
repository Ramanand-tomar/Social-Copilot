# Product Requirements Document — Social Media Automation Platform

**Project name:** Social Media Automation (internal codename: *Social Copilot*)
**Document version:** 1.0
**Status:** Draft
**Last updated:** 2026-04-12
**Owner:** Product Engineering

---

## 1. Overview

### 1.1 Product Summary
A web-based SaaS that lets creators, marketers, and small-to-mid-sized businesses schedule, publish, and automate engagement across nine social networks from a single dashboard. The product combines a unified post composer, AI-assisted content generation (Google Gemini), AI-powered media transformations (ImageKit), reliable background publishing (Inngest), and keyword/AI-driven auto-reply workflows.

### 1.2 Problem Statement
Creators and marketing teams who post to multiple networks today must either:
1. Juggle 3–9 separate native apps, each with its own composer, media constraints, and reply inbox; or
2. Pay for enterprise-grade tools (Hootsuite, Buffer, Sprout Social) priced for agencies and overbuilt for solo users.

This leads to missed posting windows, inconsistent messaging, slow audience replies, and wasted creative hours.

### 1.3 Value Proposition
- **Efficiency** — one composer publishes to every connected network.
- **AI-enhanced** — Gemini drafts captions, image transforms enhance media, AI rules reply to comments.
- **Reliability** — Inngest-backed background jobs guarantee at-least-once publishing with idempotent retries.
- **Engagement** — keyword and AI auto-reply rules maintain presence with minimal manual effort.
- **Fair pricing** — Free tier for creators, Pro for power users, Business for agencies.

### 1.4 Goals (MVP — in scope)
- One composer that publishes to Instagram, Twitter/X, LinkedIn, Facebook, YouTube, TikTok, Pinterest, Discord, and Slack.
- Schedule posts in the user's local timezone with reliable background execution.
- AI caption generation and AI image transformations.
- Auto-reply to public comments via keyword rules or AI-generated responses.
- Tiered plans (Free / Pro / Business) gated by Clerk Billing.
- Unified media library.
- In-app notifications for publish outcomes and token/billing events.

### 1.5 Non-Goals (explicitly out of v1 scope)
- Team collaboration / multi-seat workspaces and approval workflows.
- Deep per-platform analytics (impressions, reach, click-through) — placeholder only.
- Direct-message inbox (public comment auto-reply only).
- Native mobile apps (responsive web only).
- White-label / agency reseller features.
- Fine-tuned brand-voice AI models.

### 1.6 Target Users & Personas

**Persona A — "Solo Creator Sam"**
Freelance creator posting daily to IG, X, and TikTok. Wants fast composing and AI help. Price-sensitive. Free → Pro.

**Persona B — "Small-Biz Marketer Maria"**
In-house marketing lead at a 10–50 person company, posting to LinkedIn, Facebook, and IG. Needs reliable scheduling and comment moderation. Pro → Business.

**Persona C — "Agency Lite Alex"**
Manages 3–5 client brands. Runs separate logins; team features are a post-MVP ask. Business.

---

## 2. User Stories

### 2.1 Authentication & Onboarding
- **US-1** As a new visitor, I can sign up with email, Google, or GitHub via Clerk.
- **US-2** On first sign-in, I land on an empty dashboard that prompts me to connect at least one social account.
- **US-3** I can connect a social account via OAuth 2.0 and see it listed on the Accounts page.

### 2.2 Composing & Publishing
- **US-4** I can draft a post with text + media, select one or more destination accounts, and either publish now or schedule for later.
- **US-5** I can see per-platform previews (IG card, tweet card, LinkedIn post) before publishing.
- **US-6** I can generate a caption from a prompt using AI and edit it before posting.
- **US-7** I can apply an AI image transformation (e.g., background removal, upscale) via ImageKit.
- **US-8** I receive an in-app notification if any destination fails while others succeed.

### 2.3 Scheduling & Calendar
- **US-9** I can view draft, scheduled, and published posts on a month/week calendar.
- **US-10** (stretch) I can drag a scheduled post to reschedule it.
- **US-11** My scheduled times display in the timezone I was in when I scheduled them, regardless of where I view from.

### 2.4 Auto-Reply
- **US-12** I can create a keyword-based rule that replies to any comment containing configured keywords.
- **US-13** I can create an AI-based rule where the response is generated per-comment by Gemini using my custom prompt.
- **US-14** I can view a log of all auto-replies, including the source comment, generated reply, and status.
- **US-15** I can enable/disable rules without deleting them.

### 2.5 Billing & Plans
- **US-16** I can upgrade my plan through Clerk Billing checkout and see limits update immediately.
- **US-17** When I exceed my plan's limit, the UI blocks the action with a clear upgrade CTA.

---

## 3. Functional Requirements

### 3.1 Authentication & User Management
- **FR-1.1** Clerk-hosted sign-in / sign-up at `/sign-in` and `/sign-up`.
- **FR-1.2** Clerk webhooks (`user.created`, `user.updated`, `subscription.updated`) synced to the `users` table via `/api/webhooks/clerk`, verified by Svix signature.
- **FR-1.3** Plan changes from Clerk Billing must update `users.subscriptionPlan` and `users.clerkSubscriptionId` atomically. Unknown Clerk plan IDs must NOT silently drop users to free — log and alert instead.
- **FR-1.4** Authenticated routes enforced via Next.js middleware and Clerk's `auth()` helper.
- **FR-1.5** Unauthenticated visits to dashboard routes redirect to `/sign-in` via middleware, avoiding Clerk's in-component render warnings.

### 3.2 Social Account Connections
- **FR-2.1** Support OAuth 2.0 (PKCE where applicable) for: Instagram (Instagram API with Instagram Login), Twitter/X, LinkedIn, Facebook, YouTube, TikTok, Pinterest, Discord, Slack.
- **FR-2.2** Store `accessToken` and `refreshToken` encrypted at rest with AES-256-GCM via [lib/encryption.ts](social-media-automation/lib/encryption.ts), using versioned keys for rotation.
- **FR-2.3** CSRF `oauth_state` tokens stored and validated on callback ([lib/oauth-state.ts](social-media-automation/lib/oauth-state.ts)), TTL ≤ 10 minutes, one-time use.
- **FR-2.4** Background `token-refresh` Inngest job refreshes tokens at least 10 minutes before expiry.
- **FR-2.5** Unique constraint on `(userId, platform, platformAccountId)`.
- **FR-2.6** Enforce `PLAN_LIMITS.maxSocialAccounts` on connect.
- **FR-2.7** Real profile fetch on connect (username, display name, avatar) — verified implemented for Twitter/X and Instagram; remaining platforms pending adapters.

### 3.3 Post Composer
- **FR-3.1** Rich text editor at [/compose](social-media-automation/app/(dashboard)/compose) with emoji picker.
- **FR-3.2** Multi-platform selector (chips). Content length enforcement uses `getStrictestContentLimit()` across selected platforms. Twitter/X caps the group at 280 characters.
- **FR-3.3** Media upload flow — client requests a signed upload token from `/api/media/upload`, uploads directly to ImageKit, then server persists a `mediaAssets` row.
- **FR-3.4** AI caption generation — `/api/ai/generate` calls Gemini, increments `users.totalAiCaptions`, and enforces the monthly quota reset against `users.aiCaptionsPeriodStart`.
- **FR-3.5** AI image transformations (background removal, upscale, enhance) routed through ImageKit.
- **FR-3.6** Per-platform preview cards that mimic native UI.
- **FR-3.7** "Publish Now" triggers an immediate Inngest `post.publish.requested` event.
- **FR-3.8** "Schedule" persists `scheduledAt` + `scheduledTimezone` (IANA) and schedules an Inngest function at that timestamp.

### 3.4 Publishing Pipeline
- **FR-4.1** A single `post-publish` Inngest function fans out per destination account.
- **FR-4.2** Each destination write records a `post_platform_results` row with a unique `(postId, socialAccountId)` index for idempotency on retry.
- **FR-4.3** Post status transitions:
  - All succeed → `posts.status = 'published'`.
  - Some fail → `posts.status = 'partial'` + `notifications` row of kind `publish.partial`.
  - All fail → `posts.status = 'failed'` + `notifications` row of kind `publish.failed`.
- **FR-4.4** `publishLockAt` acts as a distributed-lock window preventing double-publishing from overlapping retries.
- **FR-4.5** Inngest default retry policy applies; hard failures after max retries raise a notification.

### 3.5 Calendar View
- **FR-5.1** `react-big-calendar` showing draft, scheduled, published, partial, failed posts with status-coded chips.
- **FR-5.2** Times rendered using `posts.scheduledTimezone` as source of truth; viewer TZ used only as fallback.
- **FR-5.3** (Stretch) Drag-to-reschedule updates `scheduledAt` and re-enqueues the Inngest job.

### 3.6 Auto-Reply Engine
- **FR-6.1** CRUD for `auto_reply_rules` with trigger type `keywords` or `ai`.
- **FR-6.2** Inbound comment webhooks at `/api/webhooks/social/*` verified via platform-specific HMAC + `SOCIAL_WEBHOOK_SECRET`, constant-time comparison.
- **FR-6.3** Deduplicated via `webhook_events` unique index on `(provider, externalEventId)`.
- **FR-6.4** Keyword rules — case-insensitive match against `keywords` JSON array. AI rules — call Gemini with `aiPrompt` + comment text, enforce the same quota pool as captions.
- **FR-6.5** Reply posted via matching `social_accounts` access token; outcome logged in `auto_reply_logs` with `externalCommentId` unique constraint to prevent duplicate replies.
- **FR-6.6** Increment `auto_reply_rules.replyCount` on success.
- **FR-6.7** Rules can target a subset of accounts via `selectedAccounts`.

### 3.7 Media Library
- **FR-7.1** [/media](social-media-automation/app/(dashboard)/media) grid lists `mediaAssets` with thumbnails, name, size, mime.
- **FR-7.2** Delete removes both the DB row and the ImageKit file.
- **FR-7.3** Storage usage aggregated from `mediaAssets.size` against `PLAN_LIMITS.maxStorageMB`.

### 3.8 Billing & Plan Gating
- **FR-8.1** Clerk Billing handles checkout; internal plans mapped via `NEXT_PUBLIC_CLERK_PRO_PLAN_ID` / `NEXT_PUBLIC_CLERK_BUSINESS_PLAN_ID`.
- **FR-8.2** [lib/plan-limits.ts](social-media-automation/lib/plan-limits.ts) is the single source of truth for quotas.
- **FR-8.3** Limit checks enforced server-side at every mutation endpoint, not only in the UI.

### 3.9 Notifications
- **FR-9.1** In-app notification bell consuming `notifications` rows newest-first.
- **FR-9.2** System-generated kinds: `publish.partial`, `publish.failed`, `token.expired`, `billing.updated`.
- **FR-9.3** Mark-as-read sets `readAt`; no destructive delete in v1.

### 3.10 Settings & Profile
- **FR-10.1** User profile (name, timezone) editable; timezone defaults to browser IANA on first load.
- **FR-10.2** Connected account list with disconnect and "reconnect" actions.
- **FR-10.3** Plan summary and manage-billing link.

### 3.11 Dashboard Home
- **FR-11.1** Server-rendered dashboard with real DB-backed stats: total posts, scheduled posts, auto-reply count, connected accounts.
- **FR-11.2** Recent activity feed pulled from `posts` and `auto_reply_logs`.
- **FR-11.3** Charts rendered via client component [components/dashboard/DashboardCharts.tsx](social-media-automation/components/dashboard/DashboardCharts.tsx).

---

## 4. Non-Functional Requirements

### 4.1 Performance
- **NFR-1** p95 page TTI under 2.5s on a cold Vercel edge start.
- **NFR-2** Composer submit → UI "Scheduled/Published" ack in under 1s (Inngest handles background fanout).
- **NFR-3** Calendar page loads 100 scheduled posts in under 500ms (backed by `posts_user_scheduled_idx`).

### 4.2 Reliability
- **NFR-4** Publishing pipeline must be at-least-once with idempotency — no post written twice to the same destination.
- **NFR-5** Webhook handlers tolerate replays (enforced via `webhook_events` unique index).
- **NFR-6** Token refresh must run with a ≥10-minute buffer before expiry.
- **NFR-7** Inngest functions must be idempotent across retries.

### 4.3 Security
- **NFR-8** All social tokens encrypted at rest with AES-256-GCM; key in `ENCRYPTION_KEY` env var; versioned rotation via `ENCRYPTION_KEY_V1`.
- **NFR-9** Clerk webhooks verified with Svix signatures.
- **NFR-10** Social webhooks verified with platform-specific HMAC and constant-time comparison.
- **NFR-11** OAuth `state` param one-time-use, TTL ≤ 10 minutes.
- **NFR-12** No secrets logged; `.env.local` never committed.
- **NFR-13** Rate limiting on `/api/ai/generate`, `/api/media/upload`, OAuth callbacks ([lib/rate-limit.ts](social-media-automation/lib/rate-limit.ts)).
- **NFR-14** Input validation via Zod on every API boundary.

### 4.4 Scalability
- **NFR-15** Stateless Next.js handlers — all persistent state in Neon Postgres / ImageKit / Inngest.
- **NFR-16** A burst of 1,000 scheduled posts must not degrade UI latency (handled in background).

### 4.5 Observability
- **NFR-17** `/api/health` endpoint returns DB + Inngest + ImageKit reachability.
- **NFR-18** Structured JSON logs in production; error traces include `userId` and `postId` when available.
- **NFR-19** Inngest function failures surfaced on the Inngest dashboard.

### 4.6 Accessibility & UX
- **NFR-20** WCAG 2.1 AA for all primary flows (compose, accounts, billing).
- **NFR-21** Dark theme default (`#0a0a1a` background) with proper contrast.
- **NFR-22** Fully responsive from 360px mobile to 1920px desktop.

### 4.7 Compliance & Privacy
- **NFR-23** Users can delete their account; cascade removes all owned rows (enforced by FK `onDelete: 'cascade'`).
- **NFR-24** No PII in analytics events; Clerk is the authoritative identity store.

---

## 5. Technical Architecture

### 5.1 Stack
| Layer          | Choice                                                    |
|----------------|-----------------------------------------------------------|
| Framework      | Next.js 16 (App Router, RSC)                              |
| Language       | TypeScript 5                                              |
| UI             | React 19, Tailwind v4, shadcn/ui, Base UI                 |
| Auth & Billing | Clerk + Clerk Billing                                     |
| Database       | Neon Postgres (serverless) via Drizzle ORM                |
| Background     | Inngest v4                                                |
| AI             | Google Gemini (`@google/generative-ai`)                   |
| Media          | ImageKit (storage + transformations)                     |
| Validation     | Zod                                                       |
| Data fetching  | TanStack Query (client), React Server Components (server) |
| Calendar       | react-big-calendar                                        |
| Drag & drop    | react-dnd                                                 |
| Charts         | Recharts                                                  |
| Testing        | Vitest                                                    |

> ⚠️ Per [AGENTS.md](social-media-automation/AGENTS.md), Next.js 16 has breaking changes from prior versions — consult `node_modules/next/dist/docs/` before writing new routing or middleware code.

### 5.2 Application Layout
```
app/
  (auth)/         → sign-in, sign-up
  (landing)/      → public marketing
  (dashboard)/    → accounts, analytics, auto-reply, billing, calendar, compose, dashboard, media, settings
  api/
    accounts/     → OAuth connect/callback/disconnect
    ai/           → /generate
    auto-reply/   → rules + logs CRUD
    billing/      → plan info
    health/       → readiness probe
    inngest/      → Inngest webhook handler
    media/        → signed upload tokens
    posts/        → create, update, list, delete
    webhooks/     → clerk, social/<platform>
```

### 5.3 Data Model
Authoritative schema lives in [lib/db/schema.ts](social-media-automation/lib/db/schema.ts).

| Table                      | Purpose                                                                 |
|----------------------------|-------------------------------------------------------------------------|
| `users`                    | Clerk-linked user profile, plan, AI usage, timezone                     |
| `social_accounts`          | Per-platform OAuth credentials (encrypted) and profile                  |
| `posts`                    | Draft/scheduled/published post records + target accounts                |
| `post_platform_results`    | One row per (post, account); holds external ID + status (idempotency)   |
| `webhook_events`           | Dedup log for inbound social webhooks                                   |
| `notifications`            | Per-user in-app notifications                                           |
| `auto_reply_rules`         | Keyword or AI rules for automated replies                               |
| `auto_reply_logs`          | Per-comment log of automated reply outcomes                             |
| `media_assets`             | ImageKit-backed media metadata                                          |

Key indexes / constraints:
- `social_accounts_unique_per_user` on `(userId, platform, platformAccountId)`
- `post_platform_results_unique_post_account` on `(postId, socialAccountId)` — idempotency guard
- `webhook_events_unique` on `(provider, externalEventId)` — replay protection
- `auto_reply_logs.externalCommentId` unique — no duplicate auto-replies
- `posts_user_scheduled_idx` — fast calendar queries

### 5.4 Background Jobs (Inngest)
| Event                             | Handler                | Responsibility                              |
|-----------------------------------|------------------------|---------------------------------------------|
| `token.refresh.requested`         | `token-refresh`        | Refresh one social account's tokens         |
| `post.publish.requested`          | `post-publish`         | Fan out publishing to selected platforms    |
| `post.scheduled.due`              | `post-publish`         | Scheduled enqueue for future posts          |
| `auto-reply.comment.received`     | `auto-reply-handler`   | Match rule, generate/reply, log outcome     |

### 5.5 External Integrations
- **Gemini** via server-only [lib/gemini.ts](social-media-automation/lib/gemini.ts).
- **ImageKit** via [lib/imagekit.ts](social-media-automation/lib/imagekit.ts) — client uploads use signed tokens from `/api/media/upload`.
- **Social platforms** configured in [lib/social-platforms.ts](social-media-automation/lib/social-platforms.ts).
- **Clerk** for auth + billing + webhooks.

### 5.6 Key Internal APIs
| Method | Path                          | Purpose                                        |
|--------|-------------------------------|------------------------------------------------|
| POST   | `/api/posts`                  | Create a draft / scheduled / immediate post   |
| GET    | `/api/posts`                  | List posts for calendar / dashboard            |
| POST   | `/api/ai/generate`            | Gemini caption generation                      |
| POST   | `/api/media/upload`           | Signed ImageKit upload token                   |
| GET    | `/api/accounts`               | List connected social accounts                 |
| POST   | `/api/accounts/[platform]`    | Begin OAuth connect                            |
| GET    | `/api/accounts/[platform]/callback` | OAuth callback                           |
| POST   | `/api/auto-reply/rules`       | Create/update rule                             |
| GET    | `/api/auto-reply/logs`        | Paginated reply logs                           |
| POST   | `/api/webhooks/clerk`         | Clerk sync                                     |
| POST   | `/api/webhooks/social/[p]`    | Inbound social events                          |
| POST   | `/api/inngest`                | Inngest function registration & invocations   |
| GET    | `/api/health`                 | Liveness / readiness                           |

---

## 6. Plans & Pricing

| Feature              | Free | Pro   | Business |
|----------------------|------|-------|----------|
| Social accounts      | 2    | 10    | 100      |
| Scheduled posts      | 5    | 100   | 9,999    |
| Auto-reply rules     | 1    | 10    | 9,999    |
| Media storage        | 500MB| 10GB  | 100GB    |
| AI captions / month  | 10   | 500   | 9,999    |

Source of truth: [lib/plan-limits.ts](social-media-automation/lib/plan-limits.ts).

---

## 7. Acceptance Criteria (MVP Ship Gate)

1. A brand-new user can sign up, connect one account on each supported platform, compose a post, schedule it for +5 minutes, and see it appear on the destination network within 30 seconds of the scheduled time.
2. Exceeding any `PLAN_LIMITS` entry returns a structured error from the API with `upgradeRequired: true`, and the UI surfaces an upgrade modal.
3. A partial-publish (1 of 3 destinations fails) leaves `posts.status = 'partial'`, creates a `notifications` row of kind `publish.partial`, and never retries the two successful destinations.
4. A comment event replayed 3× from a platform webhook produces exactly one `auto_reply_logs` row and exactly one reply on the network.
5. Rotating `ENCRYPTION_KEY` with `ENCRYPTION_KEY_V1` retained still decrypts all existing social-account tokens.
6. `npm run build` passes with zero TypeScript or ESLint errors.
7. `npm run test` passes all unit tests (encryption, oauth-state, rate-limit).
8. Authenticated pages do not render Clerk's in-component warning banner (redirect handled in middleware).

---

## 8. Risks & Mitigations

| Risk                                                                 | Severity | Mitigation                                                                  |
|----------------------------------------------------------------------|----------|-----------------------------------------------------------------------------|
| Platform API deprecations (e.g., IG Basic Display removed Dec 2024)  | High     | Version-pinned configs in `social-platforms.ts`; watch deprecation feeds.   |
| Token leakage                                                        | Critical | AES-256-GCM at rest, rate-limited admin surfaces, no token in logs.         |
| Double-publishing on retry                                           | High     | Unique `(postId, socialAccountId)` index + `publishLockAt` window.          |
| AI cost spikes                                                       | Medium   | Monthly quota counter in `users.totalAiCaptions`, hard-block past limit.    |
| Next.js 16 pre-GA quirks                                             | Medium   | Mandated review of local Next docs before new routing/middleware code.     |
| OAuth CSRF                                                           | High     | One-time, TTL-bound `oauth_state` rows.                                     |
| Auto-reply flood → spam classification                               | Medium   | Per-rule reply rate cap (see open question §10.2).                          |
| Unknown Clerk plan ID silently downgrading users to Free             | High     | Webhook must reject unknown IDs and page on-call rather than defaulting.    |

---

## 9. Current Implementation Status (as of 2026-04-12)

**Shipped** (per [task.md](social-media-automation/task.md)):
- Dashboard shell, dark theming, auth pages.
- Composer with AI writer, platform selector, media upload, per-platform preview.
- Inngest wiring for `token-refresh` and `post-publish` on the v4 signature.
- Encryption with lazy key init; single shared Inngest client instance.
- Real profile fetch for Twitter/X and Instagram.
- DB-backed dashboard stats and recent-activity feed.
- Analytics placeholder ("Coming Soon").
- Clerk middleware redirect to fix the `<SignIn />` render warning.
- Plan-based gating on accounts page using API plan source.

**Remaining for v1 GA:**
- Full per-platform publish adapter coverage (Facebook, YouTube, TikTok, Pinterest, Discord, Slack).
- Social webhook HMAC verification for all 9 platforms.
- Drag-to-reschedule on calendar.
- Real analytics (post-MVP).
- End-to-end test suite ([testsprite_tests/](social-media-automation/testsprite_tests/) staged).
- Notifications bell UI.

---

## 10. Open Questions

1. **Slack/Discord semantics** — destinations (post to a channel) or notification targets (ping on publish)? Current configs treat them as destinations.
2. **Auto-reply rate limit** — should we cap replies per rule per hour to avoid spam-bot classification on networks?
3. **Approval workflow** — needed on Business tier before team features ship?
4. **Plan downgrade grace period** — when a user downgrades and is over the new limit, what's the policy? Block new actions immediately, or a 7-day grace window?
5. **Post editing after schedule** — allow edits up to N minutes before publish, or lock on schedule?

---

## 11. Roadmap

**Q2 2026 (v1 GA)**
- Close remaining per-platform adapters.
- Notifications bell UI.
- Social webhook verification for all networks.
- End-to-end test coverage.

**Q3 2026 (v1.1)**
- Drag-to-reschedule calendar.
- Real platform analytics (reach, impressions, engagement) for IG, LinkedIn, X.
- Post-performance comparison in dashboard charts.

**Q4 2026 (v2.0)**
- Team workspaces with roles and approval workflows.
- Content approval queue.
- Shared brand-voice prompts across a workspace.

**Future**
- Native mobile apps.
- Fine-tuned brand-voice AI models.
- AI-driven best-time-to-post suggestions.
- Direct-message inbox and unified engagement stream.

---

## 12. Appendix — Key Files

- Schema — [lib/db/schema.ts](social-media-automation/lib/db/schema.ts)
- Plan limits — [lib/plan-limits.ts](social-media-automation/lib/plan-limits.ts)
- Platforms — [lib/social-platforms.ts](social-media-automation/lib/social-platforms.ts)
- Encryption — [lib/encryption.ts](social-media-automation/lib/encryption.ts)
- OAuth state — [lib/oauth-state.ts](social-media-automation/lib/oauth-state.ts)
- Rate limiting — [lib/rate-limit.ts](social-media-automation/lib/rate-limit.ts)
- Inngest client — [lib/inngest/](social-media-automation/lib/inngest/)
- Gemini wrapper — [lib/gemini.ts](social-media-automation/lib/gemini.ts)
- ImageKit wrapper — [lib/imagekit.ts](social-media-automation/lib/imagekit.ts)
- AI quota — [lib/ai-quota.ts](social-media-automation/lib/ai-quota.ts)
- Env template — [.env.local.example](social-media-automation/.env.local.example)
- Engineering notes — [AGENTS.md](social-media-automation/AGENTS.md)
- Migrations — [drizzle/](social-media-automation/drizzle/)
