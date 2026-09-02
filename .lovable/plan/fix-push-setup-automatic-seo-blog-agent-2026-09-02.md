# Fix push setup + automatic SEO blog agent

## Part 1 — Why push says "not configured", and the fix

The Firebase Cloud Messaging connection **is** linked to this project, but only the server-side half. The browser half is missing: the project has none of the four public web-push values the app needs (`WEB_API_KEY`, `PROJECT_ID`, `APP_ID`, `VAPID_KEY`) — verified by inspecting the project's environment, which contains no `VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_*` entries. The hook `usePushNotifications` correctly reports `not-configured` in that case, so nothing is broken in code — the connection just needs the web app details.

### What the admin does (5 minutes, no code)
In the Firebase console for the Fixbudi project:

1. **Project settings > General**. Under "Your apps", if there is no **Web app** yet, click the `</>` icon and register one (any nickname). Then copy:
   - `apiKey` → Web API key
   - `appId` → App ID (looks like `1:123456789:web:abc...`)
2. **Project settings > Cloud Messaging > Web configuration > Web Push certificates**. Click **Generate key pair** if empty, then copy the **Key pair** value → VAPID key.
3. In chat I open a **reconnect card** for the Firebase Cloud Messaging connection with **Include web push** selected; the three values are pasted into that form (never into chat).

Right after reconnect I will verify the values landed, then send a live test push so we confirm delivery end to end.

Also worth knowing for testing: the Lovable preview runs in an iframe, so browsers refuse the permission prompt there. The page already handles this and asks the user to open the app in its own tab — test on `https://fixbudi.lovable.app`.

## Part 2 — Automatic blog agent for SEO

Hybrid autonomy: the agent auto-publishes on schedule, and an admin can edit, unpublish or delete any post afterwards. Cadence: **3 posts per week** (Mon/Wed/Fri).

### Public blog
- `/blog` — index with search, category chips, newest first, paginated.
- `/blog/:slug` — article page: single H1, meta title/description, canonical, Open Graph + Twitter card, `Article` JSON-LD, author "FixBudi Team", published/updated dates, related posts, and an inline CTA to start a diagnosis or find a repair center.
- Hero image per post generated at publish time and stored in Supabase Storage.
- `sitemap.xml` extended to include every published post; `/blog/rss.xml` feed; blog linked from the site footer and the main navigation so posts are crawlable from the homepage.

### The agent
An edge function runs on a schedule and, per run:
1. Picks the next topic. Topics come from a seeded keyword pool built from your niche — laptops, phones, computers/systems, washing machines, televisions, refrigerators/freezers, repair centers, best prices — crossed with Port Harcourt, Rivers State and Nigeria, plus a live web search for trending angles (new device launches, common fault waves, price changes). Already-covered slugs are skipped so it never repeats itself.
2. Writes the post with the Lovable AI Gateway: title, slug, meta description, 900–1,400 words of genuinely useful local content (symptoms, likely causes, realistic Port Harcourt price ranges framed as ranges not promises, when to repair vs replace), FAQ block, and internal links to `/diagnostic`, `/repair-centers` and `/join`.
3. Generates the hero image, saves the post as `published`, and pings search engines by updating the sitemap.
4. Logs the run (success, skip reason, or error) so the admin can see the agent's health.

Guardrails: no invented testimonials, statistics, guarantees or ratings; prices always shown as indicative ranges; every run is one post max; failures are logged and never retried in a loop.

### Admin control (`/admin` → Blog tab)
- List of all posts with status, publish date and view count.
- Edit any post (title, body, meta, image), unpublish, delete.
- "Write a post now" button, plus a topic-pool editor to add or remove keywords.
- Pause/resume the automation and change cadence.
- Recent agent runs with their outcome.

## Technical notes
- New tables: `blog_posts` (slug unique, title, excerpt, body markdown, meta title/description, hero image, category, tags, status, published_at, view_count, generated_by), `blog_topics` (keyword, region, priority, last_used_at, active), `blog_agent_runs` (started_at, status, post_id, notes), `blog_settings` (enabled, posts_per_week, tone). Each with explicit GRANTs; `anon` gets SELECT only on published posts, writes limited to admins/super-admins via `has_role`, plus `service_role` for the edge function.
- New public storage bucket `blog-images`.
- New edge function `blog-agent`: web search for trends, Lovable AI Gateway for copy (structured output kept schema-light), image generation, insert + storage upload. Invoked by a database-native cron three times a week and by the admin button.
- Sitemap becomes a small edge function (`sitemap`) so it always reflects published posts, with the static `public/sitemap.xml` kept as fallback; `robots.txt` gains the `Sitemap:` line pointing at `https://fixbudi.lovable.app/sitemap.xml`.
- Blog routes are added to `src/App.tsx`; head tags use the existing `react-helmet-async` setup.
