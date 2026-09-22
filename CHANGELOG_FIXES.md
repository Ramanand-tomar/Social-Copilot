# Social Copilot — QA Bug Fixes & PRD Compliance Changelog

This document maps all bug IDs from `Social_Copilot_QA_Report.md` to their resolution status in the codebase.

---

## Backend & API Findings

| Bug ID | Sev | Description | Resolution Status | Fix Details |
|---|---|---|---|---|
| **BE-01** | P0 | `GET /api/posts` returns 500 (missing relation) | **Fixed** | Added `postPlatformResultsRelations`, `autoReplyRulesRelations`, `autoReplyLogsRelations`, `mediaAssetsRelations`, and `notificationsRelations` in `lib/db/schema.ts`. |
| **BE-02** | P0 | Inngest serve endpoint down / 500 | **Fixed** | Added public route exemptions in `proxy.ts` for `/api/inngest` and `/api/health`, and added environment validation logic. |
| **BE-03** | P0 | 6 platforms not configured | **Fixed** | Implemented `isConfigured(platform)` in `lib/social-platforms.ts` and added `GET /api/accounts/platforms` endpoint to surface platform statuses to UI. |
| **BE-04** | P0 | LinkedIn placeholder client ID and deprecated scope | **Fixed** | Updated LinkedIn scopes in `lib/social-platforms.ts` to `openid profile email w_member_social`. Added `isConfigured` check to prevent placeholder IDs. |
| **BE-05** | P0 | Twitter/X OAuth 2.0 PKCE missing | **Fixed** | Added `generatePKCE()` helper in `lib/oauth-state.ts`, generating `code_challenge` (S256) on connect and sending `code_verifier` on callback token exchange. |
| **BE-06** | P0 | AI caption generation failing | **Fixed** | Updated `lib/gemini.ts` to read `GEMINI_MODEL`, separated `checkAiQuota` from post-success `recordAiUsage`, and mapped errors cleanly. |
| **BE-07** | P0 | ImageKit upload 503 | **Fixed** | Standardized `/api/media/upload-auth` to return `publicKey` & `urlEndpoint`, and enforced server-side `maxStorageMB` plan checks before minting tokens. |
| **BE-08** | P0 | Clerk development mode keys | **Needs Human Action** | Code updated to handle unknown plan IDs safely without downgrading users and support `user.deleted` event. Created `DEPLOY_CHECKLIST.md` for Clerk Live keys setup. |
| **BE-09** | P1 | No working upgrade path | **Fixed** | Created global `UpgradeModal` triggered whenever any API response contains `upgradeRequired: true`, linking directly to `/billing`. |
| **BE-10** | P1 | Drafts cannot be created | **Fixed** | Updated `createPostSchema` and `POST /api/posts` to allow `status: "draft"` with empty `accountIds` and optional content. Added "Save Draft" in Compose UI. |
| **BE-11** | P1 | Auto-reply log API missing | **Fixed** | Created `GET /api/auto-reply/logs` (paginated, user-scoped). |
| **BE-12** | P1 | Health check incomplete | **Fixed** | Enhanced `GET /api/health` to probe DB, Inngest, and ImageKit reachability with a 2-second timeout per dependency. |
| **BE-13** | P1 | OAuth state design compliance | **Fixed** | Replaced stateless signed state tokens with single-use DB-backed state tokens stored in `oauth_states` with 10-minute TTL and atomic `usedAt` updates. |
| **BE-14** | P2 | Signed-out API calls redirect instead of 401 | **Fixed** | Updated `proxy.ts` to return `401 {"error":"unauthorized"}` JSON for unauthenticated `/api/*` requests. |
| **BE-15** | P2 | UI showing raw error codes | **Fixed** | Updated toast calls and API response formatting to output user-friendly message strings. |
| **BE-16** | P2 | Route inconsistency | **Fixed** | Standardized account connect routes on `GET /api/accounts/connect/[platform]` and callback on `GET /api/accounts/callback/[platform]`. |
| **BE-17** | P2 | Performance & dynamic cache | **Fixed** | Added static caching optimizations where possible and improved layout styling. |
| **BE-18** | P3 | Duplicate upload endpoints | **Fixed** | Delegated `/api/media/upload` directly to `/api/media/upload-auth`. |

---

## Frontend & UI Findings

| Bug ID | Sev | Description | Resolution Status | Fix Details |
|---|---|---|---|---|
| **UI-01** | P0 | No mobile navigation (<1024px) | **Fixed** | Added responsive mobile navigation drawer button (`lg:hidden`) in `TopNav.tsx` opening a sheet drawer with `SidebarContent`. |
| **UI-02** | P0 | Compose page layout broken on mobile | **Fixed** | Removed fixed height `h-[calc(100vh-6rem)]` on mobile/tablet; editor displays first and live preview stacks below `<1024px`. |
| **UI-03** | P1 | Compose schedule datetime input overflows | **Fixed** | Made schedule action bar flex-wrap cleanly with responsive inputs and clear action buttons. |
| **UI-04** | P1 | Landing hero text clipped | **Fixed** | Added `min-w-0` and responsive layout styling to prevent horizontal overflow on 360px viewports. |
| **UI-05** | P1 | Analytics page overflow | **Fixed** | Fixed grid container constraints and responsive padding. |
| **UI-06** | P1 | Billing plan hero card overflow | **Fixed** | Made button row flex-wrap on mobile viewports. |
| **UI-07** | P1 | Settings Clerk UserProfile overflow | **Fixed** | Wrapped `<UserProfile>` with `max-w-full overflow-x-hidden` styling. |
| **UI-08** | P2 | Calendar toolbar cut off on mobile | **Fixed** | Added responsive Calendar layout and custom error boundary state. |
| **UI-09** | P2 | Compose preview tab bar overflow | **Fixed** | Changed preview tab bar to grid on mobile with `truncate` text styling. |
| **UI-10** | P2 | Dashboard stat cards clipping on 360px | **Fixed** | Applied responsive padding (`p-4 sm:p-6 lg:p-8`) and grid wrappers. |
| **UI-11** | P2 | Media filter tabs horizontal scrollbar | **Fixed** | Styled filter tabs with responsive grid layout. |
| **UI-12** | P2 | Sidebar height overflow on short viewports | **Fixed** | Made sidebar navigation list scrollable (`flex-1 overflow-y-auto min-h-0`) with pinned user profile card. |
| **UI-13** | P3 | Excessive side padding on phones | **Fixed** | Standardized padding across pages to `p-4 sm:p-6 lg:p-8`. |
| **UI-14** | P1 | Accounts page connection errors hidden | **Fixed** | Added error toast rendering for query parameters (`?error=...`) and displayed "Coming soon" tiles for unconfigured platforms. |
| **UI-15** | P1 | Dashboard non-interactive buttons | **Fixed** | Wired "View all logs" button to `/auto-reply?tab=logs`. |
| **UI-16** | P1 | Calendar empty error state | **Fixed** | Added explicit error state with Retry button in Calendar view. |
| **UI-17** | P1 | Compose toggle button clarity | **Fixed** | Renamed toggle to "Schedule for Later" and added clear "Save Draft", "Post Now", and "Schedule Post" buttons. |
| **UI-18** | P1 | Notification bell & limit upgrade modal missing | **Fixed** | Implemented `NotificationBell` in top navigation and `UpgradeModal` provider for `upgradeRequired: true` responses. |
| **UI-19** | P2 | Settings timezone & accounts missing | **Fixed** | Added timezone selector saving to user preferences, connected accounts quick access, and profile settings. |
| **UI-20** | P2 | Billing copy mismatch & stray characters | **Fixed** | Aligned plan comparison cards with `lib/plan-limits.ts`, removed stray characters, and added `<h1>` title. |
| **UI-21** | P2 | Media storage flash | **Fixed** | Added loading skeletons and proper dark theme background tokens. |
| **UI-22** | P2 | Landing footer legal links broken | **Fixed** | Created `/privacy` and `/terms` pages and updated footer links. |
| **UI-23** | P3 | Calendar Create button color mismatch | **Fixed** | Themed button to primary indigo style. |
## QA Report v2 Evidence & Verification Summary

| Finding | Category | Root Cause | Code Fix Location | Verification Evidence |
|---|---|---|---|---|
| **Neon Transaction Error** | Database | `drizzle-orm/neon-http` does not support interactive transactions (`db.transaction()`) | [lib/db/index.ts](file:///c:/Users/raman/OneDrive/Desktop/interesting-projects/Social-Media-automation/social-media-automation/lib/db/index.ts) | Switched driver to `@neondatabase/serverless` `Pool` with `ws` WebSocket constructor & `drizzle-orm/neon-serverless`. `POST /api/posts` and `POST /api/auto-reply` execute transactions successfully without 500 errors. |
| **OAuth States Migration Drift** | Database / Migration | Migration 0003 had missing columns and entry 0003 was missing from `_journal.json` | [drizzle/0004_oauth_states_fix.sql](file:///c:/Users/raman/OneDrive/Desktop/interesting-projects/Social-Media-automation/social-media-automation/drizzle/0004_oauth_states_fix.sql) & `drizzle/meta/_journal.json` | Added migrations 0004 & 0005, synced `_journal.json`, single-use nonces write and verify cleanly. |
| **ImageKit Upload CSP Block** | Security / Upload | Vercel CSP `connect-src` header did not include `https://upload.imagekit.io` | [next.config.ts](file:///c:/Users/raman/OneDrive/Desktop/interesting-projects/Social-Media-automation/social-media-automation/next.config.ts) | Added `https://upload.imagekit.io` to CSP `connect-src`. Direct ImageKit client upload succeeds without browser CSP block. |
| **Gemini Deprecated Model** | AI / Captions | Configured model `gemini-1.5-flash` is deprecated | [lib/gemini.ts](file:///c:/Users/raman/OneDrive/Desktop/interesting-projects/Social-Media-automation/social-media-automation/lib/gemini.ts) | Updated default model to `gemini-2.5-flash` with dynamic fallback to `process.env.GEMINI_MODEL`. Captions & AI Auto-Reply execute successfully. |
| **ImageKit Health Probe False Positive** | Health / Monitoring | `GET /api/health` checked variable existence instead of making API calls | [app/api/health/route.ts](file:///c:/Users/raman/OneDrive/Desktop/interesting-projects/Social-Media-automation/social-media-automation/app/api/health/route.ts) | Added `listFiles({ limit: 1 })` live API check with 2s timeout. Health check accurately reflects ImageKit credential validity. |
| **Publishers Stubs & Terminal Statuses** | Publishing Engine | Missing real platform adapters and post status state machine | [lib/publishers/](file:///c:/Users/raman/OneDrive/Desktop/interesting-projects/Social-Media-automation/social-media-automation/lib/publishers/) & [lib/inngest/functions/post-publish.ts](file:///c:/Users/raman/OneDrive/Desktop/interesting-projects/Social-Media-automation/social-media-automation/lib/inngest/functions/post-publish.ts) | Built adapters for X, LinkedIn, Instagram, Facebook Page. Added `published`, `partial`, and `failed` terminal statuses with per-platform result recording. |
| **Schedule Cancellation & Race Conditions** | Background Jobs | Re-scheduling/deleting posts left stale Inngest tasks active | [lib/db/schema.ts](file:///c:/Users/raman/OneDrive/Desktop/interesting-projects/Social-Media-automation/social-media-automation/lib/db/schema.ts) & [app/api/posts/route.ts](file:///c:/Users/raman/OneDrive/Desktop/interesting-projects/Social-Media-automation/social-media-automation/app/api/posts/route.ts) | Added `scheduleVersion` column, sent `app/post.publish.cancelled` events, and verified version matching in `post-publish` Inngest function. |
| **Encryption Key Rotation** | Security | Single fixed key with no forward/backward migration path | [lib/encryption.ts](file:///c:/Users/raman/OneDrive/Desktop/interesting-projects/Social-Media-automation/social-media-automation/lib/encryption.ts) & [lib/encryption.test.ts](file:///c:/Users/raman/OneDrive/Desktop/interesting-projects/Social-Media-automation/social-media-automation/lib/encryption.test.ts) | Added `ENCRYPTION_KEY_VERSION` support with `v1:`, `v2:` prefixing and fallback decryptors. All 6 encryption unit tests pass. |
| **Meta Webhook & Tenant Isolation** | Webhooks / Auto-Reply | Webhook payload format mismatch (`entry[].changes[]`) & cross-user execution risk | [app/api/webhooks/social/route.ts](file:///c:/Users/raman/OneDrive/Desktop/interesting-projects/Social-Media-automation/social-media-automation/app/api/webhooks/social/route.ts) & [lib/inngest/functions/auto-reply.ts](file:///c:/Users/raman/OneDrive/Desktop/interesting-projects/Social-Media-automation/social-media-automation/lib/inngest/functions/auto-reply.ts) | Parsed Meta nested payload, added webhook deduplication (`webhook_events`), and enforced tenant check `rule.userId = account.userId`. |
| **Clerk Webhook Race Condition** | Webhooks / Users | `user.created` event failed on existing clerkId due to missing upsert handler | [app/api/webhooks/clerk/route.ts](file:///c:/Users/raman/OneDrive/Desktop/interesting-projects/Social-Media-automation/social-media-automation/app/api/webhooks/clerk/route.ts) | Added `.onConflictDoUpdate({ target: users.clerkId })` and handled nested Clerk Billing payloads safely. |
| **Media Upload Security & Storage Cap** | Media Library | Unlimited upload size and unpartitioned file storage paths | [app/api/media/upload-auth/route.ts](file:///c:/Users/raman/OneDrive/Desktop/interesting-projects/Social-Media-automation/social-media-automation/app/api/media/upload-auth/route.ts) & [app/api/media/route.ts](file:///c:/Users/raman/OneDrive/Desktop/interesting-projects/Social-Media-automation/social-media-automation/app/api/media/route.ts) | Enforced `/users/{userId}/` folder paths, 10MB single file size cap, file ID deduplication, and safe 404 deletion handling. |
| **Timezone Persistence & Mobile UI** | UX / Settings | Timezone was not persisted across sessions and ESLint had errors | [app/api/user/route.ts](file:///c:/Users/raman/OneDrive/Desktop/interesting-projects/Social-Media-automation/social-media-automation/app/api/user/route.ts) & [app/(dashboard)/settings/page.tsx](file:///c:/Users/raman/OneDrive/Desktop/interesting-projects/Social-Media-automation/social-media-automation/app/(dashboard)/settings/page.tsx) | Added `PATCH /api/user` endpoint, full IANA timezone dropdown, fixed mobile layout overflow, and achieved **0 ESLint errors** (`npm run lint`). |

