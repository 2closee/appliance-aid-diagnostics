import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Clock } from "lucide-react";
import Navigation from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  meta_title: string | null;
  meta_description: string | null;
  hero_image_url: string | null;
  hero_image_alt: string | null;
  category: string;
  tags: string[];
  keywords: string[];
  reading_minutes: number;
  published_at: string | null;
  updated_at: string;
};

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [related, setRelated] = useState<{ slug: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    let active = true;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (!active) return;
      setPost((data as Post) ?? null);
      setLoading(false);

      if (data) {
        supabase.rpc("increment_blog_view", { _slug: slug }).then(() => undefined);
        const { data: more } = await supabase
          .from("blog_posts")
          .select("slug, title")
          .eq("status", "published")
          .eq("category", (data as Post).category)
          .neq("slug", slug)
          .order("published_at", { ascending: false })
          .limit(3);
        if (active) setRelated(more ?? []);
      }
    })();
    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto max-w-3xl px-4 pt-24 pb-16 space-y-4">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-40 w-full" />
        </main>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto max-w-2xl px-4 pt-24 pb-16 text-center">
          <h1 className="text-2xl font-bold">Article not found</h1>
          <p className="mt-2 text-muted-foreground">This guide may have been moved or unpublished.</p>
          <Button asChild className="mt-6">
            <Link to="/blog">Back to the blog</Link>
          </Button>
        </main>
      </div>
    );
  }

  const published = post.published_at ?? post.updated_at;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.meta_description ?? post.excerpt ?? undefined,
    image: post.hero_image_url ?? undefined,
    datePublished: published,
    dateModified: post.updated_at,
    articleSection: post.category,
    keywords: post.keywords?.join(", "),
    author: { "@type": "Organization", name: "FixBudi" },
    publisher: { "@type": "Organization", name: "FixBudi" },
    mainEntityOfPage: { "@type": "WebPage", "@id": `/blog/${post.slug}` },
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{(post.meta_title ?? post.title).slice(0, 60)}</title>
        <meta name="description" content={(post.meta_description ?? post.excerpt ?? post.title).slice(0, 158)} />
        <link rel="canonical" href={`/blog/${post.slug}`} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={post.meta_title ?? post.title} />
        <meta property="og:description" content={post.meta_description ?? post.excerpt ?? ""} />
        <meta property="og:url" content={`/blog/${post.slug}`} />
        {post.hero_image_url && <meta property="og:image" content={post.hero_image_url} />}
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <Navigation />

      <main className="container mx-auto max-w-3xl px-4 pt-24 pb-16">
        <Link to="/blog" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> All guides
        </Link>

        <article>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">{post.category}</Badge>
            <span>
              {new Date(published).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {post.reading_minutes} min read
            </span>
          </div>

          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">{post.title}</h1>
          {post.excerpt && <p className="mt-4 text-lg text-muted-foreground">{post.excerpt}</p>}

          {post.hero_image_url && (
            <img
              src={post.hero_image_url}
              alt={post.hero_image_alt ?? post.title}
              className="mt-8 aspect-[16/9] w-full rounded-xl object-cover"
              loading="eager"
            />
          )}

          <div className="prose prose-neutral mt-8 max-w-none dark:prose-invert prose-headings:font-bold prose-a:text-primary">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body}</ReactMarkdown>
          </div>

          {post.tags?.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </article>

        <Card className="mt-12 border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
            <h2 className="text-xl font-bold">Get a real diagnosis and a quote today</h2>
            <p className="max-w-lg text-sm text-muted-foreground">
              FixBudi checks the fault, connects you to vetted repair centres, and arranges doorstep pickup and return.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link to="/diagnostic">Start a free diagnosis</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/repair-centers">Find a repair centre</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-4 text-lg font-semibold">More {post.category.toLowerCase()} guides</h2>
            <ul className="space-y-2">
              {related.map((item) => (
                <li key={item.slug}>
                  <Link to={`/blog/${item.slug}`} className="text-primary hover:underline">
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
};

export default BlogPost;
