import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Clock, Search } from "lucide-react";
import Navigation from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";

export type BlogListItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  hero_image_url: string | null;
  hero_image_alt: string | null;
  category: string;
  tags: string[];
  reading_minutes: number;
  published_at: string | null;
};

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "";

const HeroFallback = ({ label }: { label: string }) => (
  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 via-primary/5 to-secondary/20 p-6">
    <span className="text-center text-sm font-semibold text-primary">{label}</span>
  </div>
);

const Blog = () => {
  const [posts, setPosts] = useState<BlogListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, slug, title, excerpt, hero_image_url, hero_image_alt, category, tags, reading_minutes, published_at")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(60);
      if (!active) return;
      if (error) console.error("Failed to load blog posts:", error.message);
      setPosts((data as BlogListItem[]) ?? []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(posts.map((p) => p.category))).sort()],
    [posts],
  );

  const visible = posts.filter((post) => {
    const matchesCategory = category === "All" || post.category === category;
    const haystack = `${post.title} ${post.excerpt ?? ""} ${post.tags.join(" ")}`.toLowerCase();
    return matchesCategory && (!query.trim() || haystack.includes(query.trim().toLowerCase()));
  });

  const [featured, ...rest] = visible;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Repair Advice & Device Guides | FixBudi Blog</title>
        <meta
          name="description"
          content="Practical repair guides, fault diagnosis tips and indicative price ranges for phones, laptops, TVs, fridges and washing machines in Port Harcourt and across Nigeria."
        />
        <link rel="canonical" href="/blog" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Repair Advice & Device Guides | FixBudi Blog" />
        <meta
          property="og:description"
          content="Fault diagnosis tips, repair-vs-replace advice and indicative repair prices for phones, laptops and home appliances in Nigeria."
        />
        <meta property="og:url" content="/blog" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <Navigation />

      <main className="container mx-auto max-w-6xl px-4 pt-24 pb-16">
        <header className="mb-10 max-w-3xl">
          <Badge variant="secondary" className="mb-3">FixBudi Blog</Badge>
          <h1 className="text-3xl font-bold sm:text-4xl">Repair advice you can actually use</h1>
          <p className="mt-3 text-muted-foreground">
            Fault-by-fault guides, indicative price ranges and honest repair-or-replace advice for phones, laptops,
            televisions, fridges and washing machines — written for Port Harcourt and the rest of Nigeria.
          </p>
        </header>

        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search guides…"
              className="pl-9"
              aria-label="Search blog posts"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.slice(0, 7).map((item) => (
              <Button
                key={item}
                size="sm"
                variant={category === item ? "default" : "outline"}
                onClick={() => setCategory(item)}
              >
                {item}
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-72 w-full rounded-xl" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <Card>
            <CardContent className="py-14 text-center">
              <p className="font-medium">No articles yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                New guides are published automatically a few times each week — check back soon.
              </p>
              <Button asChild className="mt-6">
                <Link to="/diagnostic">Start a free AI diagnosis</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-10">
            {featured && (
              <Link to={`/blog/${featured.slug}`} className="group block">
                <Card className="overflow-hidden transition-shadow hover:shadow-lg">
                  <div className="grid md:grid-cols-2">
                    <div className="h-56 md:h-full">
                      {featured.hero_image_url ? (
                        <img
                          src={featured.hero_image_url}
                          alt={featured.hero_image_alt ?? featured.title}
                          loading="eager"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <HeroFallback label={featured.category} />
                      )}
                    </div>
                    <div className="p-6">
                      <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary">{featured.category}</Badge>
                        <span>{formatDate(featured.published_at)}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {featured.reading_minutes} min
                        </span>
                      </div>
                      <h2 className="text-2xl font-bold group-hover:text-primary">{featured.title}</h2>
                      <p className="mt-3 text-muted-foreground">{featured.excerpt}</p>
                      <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary">
                        Read the guide <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {rest.map((post) => (
                <Link key={post.id} to={`/blog/${post.slug}`} className="group block">
                  <Card className="h-full overflow-hidden transition-shadow hover:shadow-lg">
                    <div className="h-40">
                      {post.hero_image_url ? (
                        <img
                          src={post.hero_image_url}
                          alt={post.hero_image_alt ?? post.title}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <HeroFallback label={post.category} />
                      )}
                    </div>
                    <CardHeader className="pb-2">
                      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary">{post.category}</Badge>
                        <span>{formatDate(post.published_at)}</span>
                      </div>
                      <CardTitle className="text-lg leading-snug group-hover:text-primary">{post.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="line-clamp-3 text-sm text-muted-foreground">{post.excerpt}</p>
                      <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {post.reading_minutes} min read
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        <Card className="mt-14 border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <h2 className="text-2xl font-bold">Something not working? Find out why in minutes</h2>
            <p className="max-w-xl text-muted-foreground">
              Describe the fault, get a free AI diagnosis, then compare quotes from vetted FixBudi repair centres with
              doorstep pickup and return.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link to="/diagnostic">Start a free diagnosis</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/repair-centers">Browse repair centres</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Blog;
