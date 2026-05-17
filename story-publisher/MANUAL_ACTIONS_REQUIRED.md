# Arion World — Manual Setup Required

These items cannot be automated and require your personal action.
Check them off as you complete them.

## Critical (do before first run)

- [ ] **Printful account**: Create free account at printful.com, get API key, add as GitHub Secret `PRINTFUL_API_KEY`
- [ ] **Discord server**: Create server at discord.com, create channels: #announcements, #episodes, #theories, #fan-art, #general. Enable Community mode.
- [ ] **Discord bot**: Go to discord.com/developers, create Application "Arion World Bot", add Bot, copy token → GitHub Secret `DISCORD_BOT_TOKEN`. Invite bot to your server with permissions: Send Messages, Embed Links, Read Message History.
- [ ] **Discord announcement channel**: Copy channel ID of #announcements → GitHub Secret `DISCORD_ANNOUNCEMENT_CHANNEL_ID`
- [ ] **Contact email**: Create contact@arionworld.com (or use Gmail: arionworld.contact@gmail.com). Set as GitHub Secret `CONTACT_EMAIL` and update ChatWidget.astro
- [ ] **Formspree**: Create free account at formspree.io, create form, copy Form ID → replace `FORMSPREE_FORM_ID` in website/src/components/ContactForm.astro
- [ ] **Website URL**: Once domain is set up, add GitHub Secret `ARION_WEBSITE_URL` (e.g. https://arionworld.com)
- [ ] **Instagram TRAILER_PUBLIC_URL**: Instagram requires a public URL for video upload. Options:
  - Easy: Use `transfer.sh` (add a workflow step: `curl -F "file=@$TRAILER" https://transfer.sh/trailer.mp4`)
  - Better: Set up Cloudflare R2 (free 10GB/month) and add `R2_ACCESS_KEY`, `R2_SECRET_KEY` secrets
  - For now: Instagram will show FAILED in pipeline results but everything else publishes fine

## Additional GitHub Secrets Needed

These are required by the monthly token refresh workflow:
- `FACEBOOK_APP_ID` — from Meta Developer Portal
- `FACEBOOK_APP_SECRET` — from Meta Developer Portal  
- `TIKTOK_CLIENT_KEY` — from TikTok Developer Portal
- `TIKTOK_CLIENT_SECRET` — from TikTok Developer Portal
- `TIKTOK_REFRESH_TOKEN` — from TikTok OAuth flow

## Nice to Have (after launch)

- [ ] **Custom domain**: Point arionworld.com to your GitHub Pages or Vercel deployment
- [ ] **Printful store**: Connect Printful to your website URL in Printful dashboard
- [ ] **YouTube channel art**: Upload banner and profile picture that match the Arion World visual style
- [ ] **Link in bio**: Set Instagram bio link to your website URL
- [ ] **Discord roles**: Set up Watcher, Theorist, Supporter roles with channel access tiers
