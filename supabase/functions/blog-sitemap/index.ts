import { createClient } from "npm:@supabase/supabase-js@2";

const SITE_URL = (Deno.env.get("APP_URL") ?? "https://fixbudi.lovable.app").replace(/\/$/, "");

const escape = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const xmlHeaders = { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" };

  if (!supabaseUrl || !serviceKey) {
    return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>', {
      headers: xmlHeaders,
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data: posts } = await supabase
    .from("blog_posts")
    .select("slug, published_at, updated_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(5000);

  const entries = [
    `  <url>\n    <loc>${SITE_URL}/blog</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>`,
    ...(posts ?? []).map((post) => {
      const lastmod = (post.updated_at ?? post.published_at ?? new Date().toISOString()).slice(0, 10);
      return `  <url>\n    <loc>${SITE_URL}/blog/${escape(post.slug)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>`;
    }),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>`;
  return new Response(xml, { headers: xmlHeaders });
});
