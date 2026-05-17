# jobsy.lv — Production Deployment Guide

## Prerequisites

- Domain: jobsy.lv (reserved)
- Stripe account (verified business)
- Kimi OAuth credentials (already in .env)
- MySQL database (already provisioned)

---

## Step 1: Set Environment Variables

All of these must be configured in your hosting platform's environment settings:

| Variable | Value | Source |
|----------|-------|--------|
| `APP_ID` | Keep as-is | Kimi Developer Portal |
| `APP_SECRET` | Keep as-is | Kimi Developer Portal |
| `DATABASE_URL` | Keep as-is | Platform provisioned |
| `KIMI_AUTH_URL` | Keep as-is | Platform default |
| `KIMI_OPEN_URL` | Keep as-is | Platform default |
| `OWNER_UNION_ID` | Your Kimi unionId | Makes you admin |
| `STRIPE_SECRET_KEY` | `sk_live_...` | Stripe Dashboard → API Keys |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Stripe Dashboard → Webhooks |
| `SITE_URL` | `https://jobsy.lv` | Your domain |
| `POSTING_FEE_CENTS` | `200` | €2.00 |

---

## Step 2: Stripe Configuration

### 2a. Get Live Keys
1. Go to https://dashboard.stripe.com
2. Complete account activation (business details)
3. Copy **Live Secret Key** (starts with `sk_live_`)

### 2b. Create Webhook Endpoint
1. Stripe Dashboard → Developers → Webhooks
2. Click "+ Add endpoint"
3. Endpoint URL: `https://jobsy.lv/api/webhook`
4. Select event: `checkout.session.completed`
5. Save → Copy **Signing Secret** (starts with `whsec_`)

### 2c. Test Mode
Use `sk_test_...` keys for testing. In test mode:
- Use Stripe test card: `4242 4242 4242 4242`, any future date, any CVC

---

## Step 3: Deploy

Deploy version `37296a8` (or latest) through your platform's deployment interface.

After deployment, you'll receive:
- Server IP address (e.g., `192.0.2.1`)
- Or a platform domain (e.g., `your-app.platform.com`)

---

## Step 4: Configure DNS

### Option A: Root domain (jobsy.lv)

In your domain registrar's DNS settings:

| Type | Host | Value | TTL |
|------|------|-------|-----|
| A | `@` | `<server-ip>` | 300 |
| A | `www` | `<server-ip>` | 300 |

### Option B: Using platform subdomain first

Point `jobsy.lv` CNAME to your platform's domain:

| Type | Host | Value | TTL |
|------|------|-------|-----|
| CNAME | `www` | `your-app.platform.com` | 300 |

Then redirect root `@` to `www`.

### DNS Propagation
- Usually takes 5–30 minutes
- Check with: `dig jobsy.lv` or `nslookup jobsy.lv`

---

## Step 5: SSL / HTTPS

SSL is usually auto-provisioned by your platform via Let's Encrypt once DNS resolves.

Verify: `https://jobsy.lv` should show a lock icon.

---

## Step 6: Verify Everything

### 6a. Health Check
```
GET https://jobsy.lv/health
→ {"status":"ok","db":"connected"}
```

### 6b. End-to-End Test
1. Visit `https://jobsy.lv` — homepage loads
2. Click "Pieslēgties" → OAuth works → redirects back
3. Click "Izveidot sludinājumu" → create a post (first one free)
4. Post appears on homepage
5. Log out → click post → "Log in to see contact info" shows
6. Log in again → click "Sazināties" → contact info reveals
7. Create second post → Stripe Checkout opens
8. Complete payment → redirected to Success page

### 6c. Referral Test
1. Copy your referral code from homepage
2. Log out → log in as different user
3. Enter referral code on login page
4. That user creates first post → you get +1 credit

---

## Step 7: Post-Launch Monitoring

### Uptime
- Health check: `https://jobsy.lv/health`
- Set up ping monitor (e.g., UptimeRobot free tier)

### Stripe Dashboard
- Monitor failed payments
- Check webhook delivery logs

### Database
- Run `npm run db:push` after any schema changes
- Backups are usually handled by platform

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| OAuth callback fails | Ensure `VITE_KIMI_AUTH_URL` matches portal config |
| Stripe webhook 400 | Check `STRIPE_WEBHOOK_SECRET` is correct |
| Database errors | Run `npm run db:push` |
| Images not showing | Check `/uploads/` directory exists and is writable |
| CSS missing | Ensure `dist/public/` was built correctly |
| 404 on refresh | Server must serve `index.html` for all non-API routes |

---

## File Structure (Production)

```
jobsy.lv/
├── uploads/              # User uploaded images
├── dist/
│   ├── public/          # Frontend build (index.html, assets)
│   └── boot.js          # Server bundle
├── .env                 # Production environment variables
└── package.json
```

---

## Support

- Email: info@jobsy.lv
- Health check: https://jobsy.lv/health
