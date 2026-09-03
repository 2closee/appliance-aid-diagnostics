import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const TEXT_MODEL = "google/gemini-3.7-flash";
const IMAGE_MODEL = "google/gemini-3.1-flash-image";

// Public bucket used for blog hero images (workspace policy blocks creating new public buckets).
const IMAGE_BUCKET = "program-images";
const IMAGE_PREFIX = "blog";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const slugify = (input: string) =>
  input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

const stripFence = (text: string) =>
  text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();

type GeneratedPost = {
  title: string;
  slug?: string;
  excerpt: string;
  meta_title: string;
  meta_description: string;
  body: string;
  tags?: string[];
  keywords?: string[];
  hero_image_prompt?: string;
  hero_image_alt?: string;
};

const callModel = async (lovableKey: string, prompt: string, system: string) => {
  const res = await fetch(AI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: TEXT_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`AI gateway failed [${res.status}]: ${await res.text()}`);
  }
  const data = await res.json();
  return (data?.choices?.[0]?.message?.content ?? "") as string;
};

const generateHeroImage = async (
  lovableKey: string,
  prompt: string,
): Promise<{ bytes: Uint8Array; contentType: string } | null> => {
  try {
    const res = await fetch(AI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });
    if (!res.ok) {
      console.error(`[blog-agent] image gen failed [${res.status}]: ${await res.text()}`);
      return null;
    }
    const data = await res.json();
    const url: string | undefined = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!url?.startsWith("data:")) return null;
    const [header, base64] = url.split(",");
    const contentType = header.slice(5).split(";")[0] || "image/png";
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return { bytes, contentType };
  } catch (e) {
    console.error(`[blog-agent] image gen error: ${(e as Error).message}`);
    return null;
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const cronSecret = Deno.env.get("BLOG_CRON_SECRET");

  if (!supabaseUrl || !serviceKey) return json({ error: "Supabase env missing" }, 500);
  if (!lovableKey) return json({ error: "LOVABLE_API_KEY is not configured" }, 500);

  const supabase = createClient(supabaseUrl, serviceKey);
  const body = await req.json().catch(() => ({}));

  // Auth: cron shared secret, or an admin/super_admin user.
  let source = "manual";
  let authorized = false;
  const provided = req.headers.get("x-blog-secret");
  if (cronSecret && provided && provided === cronSecret) {
    authorized = true;
    source = "cron";
  }
  if (!authorized) {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (token) {
      const { data: userData } = await supabase.auth.getUser(token);
      const uid = userData?.user?.id;
      if (uid) {
        const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: uid, _role: "admin" });
        authorized = isAdmin === true;
      }
    }
  }
  if (!authorized) return json({ error: "Unauthorized" }, 401);

  const { data: run } = await supabase
    .from("blog_agent_runs")
    .insert({ status: "running", trigger_source: source })
    .select("id")
    .single();
  const runId = run?.id as string | undefined;

  const finish = async (status: string, patch: Record<string, unknown>) => {
    if (!runId) return;
    await supabase
      .from("blog_agent_runs")
      .update({ status, finished_at: new Date().toISOString(), ...patch })
      .eq("id", runId);
  };

  try {
    const { data: settings } = await supabase
      .from("blog_settings")
      .select("automation_enabled, auto_publish, tone")
      .limit(1)
      .maybeSingle();

    if (source === "cron" && settings?.automation_enabled === false) {
      await finish("skipped", { notes: "Automation is paused in admin settings." });
      return json({ success: true, skipped: "automation paused" });
    }

    // Pick a topic: explicit request wins, otherwise least-recently-used high-priority topic.
    let topic: { id: string; keyword: string; region: string; category: string; times_used: number } | null = null;
    if (typeof body?.topic_id === "string") {
      const { data } = await supabase
        .from("blog_topics")
        .select("id, keyword, region, category, times_used")
        .eq("id", body.topic_id)
        .maybeSingle();
      topic = data ?? null;
    }
    if (!topic) {
      const { data } = await supabase
        .from("blog_topics")
        .select("id, keyword, region, category, times_used")
        .eq("active", true)
        .order("last_used_at", { ascending: true, nullsFirst: true })
        .order("priority", { ascending: false })
        .limit(1)
        .maybeSingle();
      topic = data ?? null;
    }
    if (!topic) {
      await finish("skipped", { notes: "No active topics in the keyword pool." });
      return json({ success: true, skipped: "no topics" });
    }

    const { data: recent } = await supabase
      .from("blog_posts")
      .select("title")
      .order("created_at", { ascending: false })
      .limit(25);
    const recentTitles = (recent ?? []).map((p) => `- ${p.title}`).join("\n") || "- (none yet)";

    const today = new Date().toISOString().slice(0, 10);
    const system = [
      "You are the content editor for FixBudi, a Nigerian device and appliance repair marketplace based in Port Harcourt, Rivers State.",
      "FixBudi lets customers run an AI diagnosis, get quotes from vetted repair centres, and have devices picked up and returned by Ovapass riders.",
      `Tone: ${settings?.tone ?? "Warm, practical, plain Nigerian English. Helpful and specific, never hypey."}`,
      "Hard rules: never invent testimonials, customer names, statistics, ratings, awards or guarantees.",
      "Prices must always be presented as indicative ranges in Naira with a clear note that actual quotes vary by model, parts availability and centre.",
      "Write for real readers first: symptoms, likely causes, what a technician checks, repair-vs-replace guidance, and how to avoid being overcharged.",
      "Output raw JSON only. No markdown fence, no commentary.",
    ].join("\n");

    const prompt = `Today is ${today}. Write one new blog post for the FixBudi blog.

Target keyword: "${topic.keyword}"
Location focus: ${topic.region}
Category: ${topic.category}

Recently published titles (do NOT repeat these angles):
${recentTitles}

Choose a fresh, currently relevant angle for ${today.slice(0, 7)} — for example common fault patterns in this season, current device generations people actually own in Nigeria, or parts-availability realities.

Return JSON with exactly these keys:
{
  "title": "compelling H1, under 65 characters, includes the keyword naturally",
  "slug": "url-safe-slug",
  "excerpt": "1-2 sentence summary, under 200 characters",
  "meta_title": "SEO title under 60 characters",
  "meta_description": "SEO description under 155 characters",
  "body": "markdown body, 900-1400 words, using ## and ### headings, short paragraphs, at least one markdown table where useful, a bulleted checklist, and a '## Frequently asked questions' section with 3-4 ### questions. Include natural internal links written as markdown links to /diagnostic (free AI diagnosis), /repair-centers (browse vetted centres) and /join (repair centres can partner with FixBudi). Do NOT include an H1 - the title is rendered separately.",
  "tags": ["3-6 short tags"],
  "keywords": ["4-8 search keywords this post targets"],
  "hero_image_prompt": "one sentence describing a clean, realistic photo for the article hero",
  "hero_image_alt": "descriptive alt text for the hero image"
}`;

    const raw = await callModel(lovableKey, prompt, system);
    let post: GeneratedPost;
    try {
      post = JSON.parse(stripFence(raw));
    } catch {
      throw new Error(`Model did not return valid JSON: ${raw.slice(0, 300)}`);
    }
    if (!post?.title || !post?.body) throw new Error("Model response missing title or body");

    // Ensure a unique slug.
    let slug = slugify(post.slug || post.title);
    if (!slug) slug = `fixbudi-${Date.now()}`;
    const { data: clash } = await supabase.from("blog_posts").select("id").eq("slug", slug).maybeSingle();
    if (clash) slug = `${slug}-${new Date().toISOString().slice(0, 10)}`;

    // Hero image (best effort — a missing image falls back to a branded gradient in the UI).
    let heroUrl: string | null = null;
    const image = await generateHeroImage(
      lovableKey,
      `Photorealistic editorial hero image for an article titled "${post.title}". ${post.hero_image_prompt ?? ""} Clean, well-lit, West African setting, no text or logos in the image.`,
    );
    if (image) {
      const ext = image.contentType.includes("jpeg") ? "jpg" : "png";
      const path = `${IMAGE_PREFIX}/${slug}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(IMAGE_BUCKET)
        .upload(path, image.bytes, { contentType: image.contentType, upsert: true });
      if (uploadError) {
        console.error(`[blog-agent] image upload failed: ${uploadError.message}`);
      } else {
        heroUrl = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
      }
    }

    const words = post.body.split(/\s+/).length;
    const publish = body?.status === "draft" ? false : settings?.auto_publish !== false;

    const { data: created, error: insertError } = await supabase
      .from("blog_posts")
      .insert({
        slug,
        title: post.title.slice(0, 200),
        excerpt: post.excerpt?.slice(0, 300) ?? null,
        body: post.body,
        meta_title: post.meta_title?.slice(0, 70) ?? post.title.slice(0, 70),
        meta_description: post.meta_description?.slice(0, 170) ?? post.excerpt?.slice(0, 170) ?? null,
        hero_image_url: heroUrl,
        hero_image_alt: post.hero_image_alt?.slice(0, 200) ?? post.title.slice(0, 200),
        category: topic.category,
        tags: Array.isArray(post.tags) ? post.tags.slice(0, 8) : [],
        keywords: Array.isArray(post.keywords) ? post.keywords.slice(0, 10) : [topic.keyword],
        status: publish ? "published" : "draft",
        published_at: publish ? new Date().toISOString() : null,
        reading_minutes: Math.max(2, Math.round(words / 220)),
        generated_by: "agent",
        topic_id: topic.id,
      })
      .select("id, slug, title, status")
      .single();
    if (insertError) throw new Error(insertError.message);

    await supabase
      .from("blog_topics")
      .update({ last_used_at: new Date().toISOString(), times_used: (topic.times_used ?? 0) + 1 })
      .eq("id", topic.id);

    await finish("success", {
      post_id: created.id,
      topic_id: topic.id,
      notes: `${created.status}: ${created.title}`,
    });

    return json({ success: true, post: created, hero_image: !!heroUrl });
  } catch (e) {
    const message = (e as Error).message;
    console.error(`[blog-agent] ${message}`);
    await finish("failed", { error: message.slice(0, 800) });
    return json({ error: message }, 500);
  }
});
