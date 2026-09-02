CREATE TABLE public.blog_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  excerpt text,
  body text NOT NULL,
  meta_title text,
  meta_description text,
  hero_image_url text,
  hero_image_alt text,
  category text NOT NULL DEFAULT 'Repair Guides',
  tags text[] NOT NULL DEFAULT '{}',
  keywords text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'published',
  published_at timestamptz,
  view_count integer NOT NULL DEFAULT 0,
  reading_minutes integer NOT NULL DEFAULT 5,
  generated_by text NOT NULL DEFAULT 'agent',
  topic_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.blog_topics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword text NOT NULL,
  region text NOT NULL DEFAULT 'Port Harcourt, Rivers State',
  category text NOT NULL DEFAULT 'Repair Guides',
  priority integer NOT NULL DEFAULT 5,
  active boolean NOT NULL DEFAULT true,
  times_used integer NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.blog_agent_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status text NOT NULL DEFAULT 'running',
  trigger_source text NOT NULL DEFAULT 'cron',
  topic_id uuid,
  post_id uuid,
  notes text,
  error text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.blog_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  automation_enabled boolean NOT NULL DEFAULT true,
  posts_per_week integer NOT NULL DEFAULT 3,
  tone text NOT NULL DEFAULT 'Warm, practical, plain Nigerian English. Helpful and specific, never hypey.',
  auto_publish boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX blog_posts_status_published_idx ON public.blog_posts (status, published_at DESC);
CREATE INDEX blog_posts_category_idx ON public.blog_posts (category);

GRANT SELECT ON public.blog_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_topics TO authenticated;
GRANT ALL ON public.blog_topics TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_agent_runs TO authenticated;
GRANT ALL ON public.blog_agent_runs TO service_role;

GRANT SELECT ON public.blog_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_settings TO authenticated;
GRANT ALL ON public.blog_settings TO service_role;

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published posts are public"
  ON public.blog_posts FOR SELECT
  USING (status = 'published' OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage posts"
  ON public.blog_posts FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update posts"
  ON public.blog_posts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete posts"
  ON public.blog_posts FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage topics"
  ON public.blog_topics FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins read agent runs"
  ON public.blog_agent_runs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone signed in can read blog settings"
  ON public.blog_settings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins update blog settings"
  ON public.blog_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_blog_topics_updated_at BEFORE UPDATE ON public.blog_topics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_blog_agent_runs_updated_at BEFORE UPDATE ON public.blog_agent_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_blog_settings_updated_at BEFORE UPDATE ON public.blog_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.increment_blog_view(_slug text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.blog_posts
  SET view_count = view_count + 1
  WHERE slug = _slug AND status = 'published';
$$;

GRANT EXECUTE ON FUNCTION public.increment_blog_view(text) TO anon, authenticated;