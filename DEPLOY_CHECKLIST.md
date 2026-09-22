# Social Copilot — Production Deployment Checklist

This document contains mandatory human infrastructure and environment steps required to transition the application from Development keys to Production GA.

---

## 1. Clerk Production Instance Setup (BE-08)
- [ ] Create a **Production Instance** in Clerk Dashboard.
- [ ] Configure custom domain and production DNS records (CNAME, MX/SPF if email active).
- [ ] In Clerk Billing Dashboard, recreate subscription plans (Pro, Business) and link Stripe account.
- [ ] Copy live publishable key and secret key:
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...`
  - `CLERK_SECRET_KEY=sk_live_...`
  - `NEXT_PUBLIC_CLERK_PRO_PLAN_ID=cplan_...`
  - `NEXT_PUBLIC_CLERK_BUSINESS_PLAN_ID=cplan_...`
- [ ] Set up Svix Webhook endpoint pointing to `https://social-copilot-ten.vercel.app/api/webhooks/clerk` for events: `user.created`, `user.updated`, `user.deleted`, `subscription.created`, `subscription.updated`, `subscription.deleted`.
- [ ] Set `CLERK_WEBHOOK_SECRET=whsec_...` in Vercel environment variables.

---

## 2. Inngest Cloud Synchronization (BE-02)
- [ ] Log in to Inngest Cloud Dashboard.
- [ ] Connect App with endpoint `https://social-copilot-ten.vercel.app/api/inngest`.
- [ ] Generate signing key & event key and add to Vercel:
  - `INNGEST_SIGNING_KEY=signkey_prod_...`
  - `INNGEST_EVENT_KEY=inkey_prod_...`
- [ ] Verify `post-publish`, `token-refresh`, `auto-reply-handler`, `media-alt-text` functions register properly in Inngest dashboard.

---

## 3. ImageKit Production Verification (BE-07)
- [ ] Confirm ImageKit account status, billing, and bandwidth limits.
- [ ] Retrieve API credentials from ImageKit Dashboard:
  - `NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY=public_...`
  - `IMAGEKIT_PRIVATE_KEY=private_...`
  - `NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/<your_id>`
- [ ] Test upload signature generation against `/api/media/upload-auth`.

---

## 4. Google Gemini AI Key Setup (BE-06)
- [ ] Generate Google Gemini API Key in Google AI Studio.
- [ ] Set `GEMINI_API_KEY=AIzaSy...` in Vercel.
- [ ] Set `GEMINI_MODEL=gemini-2.5-flash` in Vercel.

---

## 5. OAuth 2.0 Social Platform Credentials (BE-03, BE-04, BE-05)
For each platform, register developer apps with redirect URI `https://social-copilot-ten.vercel.app/api/accounts/callback/<platform>`:

- [ ] **Twitter/X**: OAuth 2.0 PKCE, Confidential Client, Scopes: `tweet.read tweet.write users.read offline.access`
  - `TWITTER_CLIENT_ID=...`
  - `TWITTER_CLIENT_SECRET=...`
- [ ] **LinkedIn**: OpenID Connect, Scopes: `openid profile email w_member_social`
  - `LINKEDIN_CLIENT_ID=...`
  - `LINKEDIN_CLIENT_SECRET=...`
- [ ] **Instagram & Facebook Page**: Instagram Login API & Facebook Graph API (Meta Business), Scopes: `instagram_business_basic instagram_business_content_publish instagram_business_manage_comments pages_show_list pages_read_engagement pages_manage_posts`
  - Privacy policy URL: `https://social-copilot-ten.vercel.app/privacy`
  - Terms URL: `https://social-copilot-ten.vercel.app/terms`
  - Webhook callback URL: `https://social-copilot-ten.vercel.app/api/webhooks/social?platform=instagram`
  - `INSTAGRAM_CLIENT_ID=...`
  - `INSTAGRAM_CLIENT_SECRET=...`
- [ ] **YouTube / Google**: Scopes: `https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly`
  - `YOUTUBE_CLIENT_ID=...`
  - `YOUTUBE_CLIENT_SECRET=...`
- [ ] **TikTok, Pinterest, Discord, Slack**: Register client IDs and secrets in Vercel environment.

---

## 6. Security Keys & Database Migration
- [ ] Generate 32-byte hex encryption key (`openssl rand -hex 32`):
  - `ENCRYPTION_KEY=...`
  - `ENCRYPTION_KEY_VERSION=v1`
  - `ENCRYPTION_KEY_V1=...`
- [ ] Run Neon DB migrations: `npx drizzle-kit migrate`.
- [ ] Set `NEXT_PUBLIC_APP_URL=https://social-copilot-ten.vercel.app`.
