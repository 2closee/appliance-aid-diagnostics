# Use fixbudi.com in every link (no more lovable.app)

## Confirmed current state

- The project has no custom domain connected yet; it is served at `fixbudi.lovable.app`.
- The reminder text message builds its link from an `APP_URL` setting that falls back to `https://fixbudi.lovable.app` (`supabase/functions/center-nudge-sweep/index.ts:120`).
- The same fallback appears in the partner approval email, job notification emails, the blog sitemap function, `src/components/email-templates.ts`, the sitemap/robots files, and page previews for `/join`, `/ovapass`, and the protection terms page.

## Step 1 — Connect fixbudi.com

I will open the domain connection flow for `fixbudi.com`. You add the records it shows at your domain provider (or approve the automatic setup). Both `fixbudi.com` and `www.fixbudi.com` get added, with the plain `fixbudi.com` set as the primary address so `www` redirects to it.

Links only start working at the new address once the domain shows as Active and the app is published.

## Step 2 — Point every link at the new address

- Set the shared `APP_URL` value to `https://fixbudi.com`, so the reminder text messages, partner approval emails, password reset links, and job notification emails all use it.
- Replace the leftover `fixbudi.lovable.app` fallbacks in code with `https://fixbudi.com`, so nothing can slip back to a Lovable address.
- Update the search-engine files and page preview/canonical addresses (`sitemap.xml`, `sitemap-static.xml`, `robots.txt`, `/join`, `/ovapass`, protection terms) to `fixbudi.com`.

## Step 3 — Check it

- Run a preview of the centre reminder sweep and confirm the message text contains `https://fixbudi.com/partner-login`.
- Confirm the reminder message still fits comfortably in one text message.

## Notes

- Files touched: `supabase/functions/center-nudge-sweep/index.ts`, `supabase/functions/approve-repair-center-application/index.ts`, `supabase/functions/send-job-notification/index.ts`, `supabase/functions/blog-sitemap/index.ts`, `src/components/email-templates.ts`, `src/pages/JoinRepairCenter.tsx`, `src/pages/Ovapass.tsx`, `src/pages/legal/RepairProtectionTerms.tsx`, `public/sitemap.xml`, `public/sitemap-static.xml`, `public/robots.txt`.
- Until DNS finishes propagating, `fixbudi.lovable.app` keeps working, so no reminder link breaks in the meantime.
