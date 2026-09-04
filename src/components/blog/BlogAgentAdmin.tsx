import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, PenLine, Sparkles, Trash2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  category: string;
  status: string;
  published_at: string | null;
  view_count: number;
  generated_by: string;
  created_at: string;
};

type Run = {
  id: string;
  status: string;
  trigger_source: string;
  notes: string | null;
  error: string | null;
  started_at: string;
};

type Settings = {
  id: string;
  automation_enabled: boolean;
  posts_per_week: number;
  auto_publish: boolean;
  tone: string;
};

const BlogAgentAdmin = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState<Post | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [postsRes, runsRes, settingsRes] = await Promise.all([
      supabase
        .from("blog_posts")
        .select("id, slug, title, excerpt, body, category, status, published_at, view_count, generated_by, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("blog_agent_runs").select("*").order("started_at", { ascending: false }).limit(8),
      supabase.from("blog_settings").select("*").limit(1).maybeSingle(),
    ]);
    setPosts((postsRes.data as Post[]) ?? []);
    setRuns((runsRes.data as Run[]) ?? []);
    setSettings((settingsRes.data as Settings) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runAgent = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("blog-agent", { body: {} });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      toast.success("New article written");
      await load();
    } catch (e) {
      console.error("Blog agent run failed:", e);
      toast.error("The agent could not write a post. Check the run log below.");
      await load();
    } finally {
      setGenerating(false);
    }
  };

  const updateSettings = async (patch: Partial<Settings>) => {
    if (!settings) return;
    setSettings({ ...settings, ...patch });
    const { error } = await supabase.from("blog_settings").update(patch).eq("id", settings.id);
    if (error) toast.error("Could not save settings");
  };

  const toggleStatus = async (post: Post) => {
    const next = post.status === "published" ? "draft" : "published";
    const { error } = await supabase
      .from("blog_posts")
      .update({ status: next, published_at: next === "published" ? new Date().toISOString() : null })
      .eq("id", post.id);
    if (error) return toast.error("Could not update the post");
    toast.success(next === "published" ? "Published" : "Unpublished");
    load();
  };

  const remove = async (post: Post) => {
    const { error } = await supabase.from("blog_posts").delete().eq("id", post.id);
    if (error) return toast.error("Could not delete the post");
    toast.success("Post deleted");
    load();
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase
      .from("blog_posts")
      .update({ title: editing.title, excerpt: editing.excerpt, body: editing.body })
      .eq("id", editing.id);
    setSaving(false);
    if (error) return toast.error("Could not save changes");
    toast.success("Article updated");
    setEditing(null);
    load();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            SEO blog agent
          </CardTitle>
          <CardDescription>
            Writes and publishes niche repair articles automatically. You can edit, unpublish or delete anything it
            produces.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={runAgent} disabled={generating}>
              {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Write an article now
            </Button>
            <Button variant="outline" asChild>
              <Link to="/blog">
                <ExternalLink className="mr-2 h-4 w-4" />
                View the blog
              </Link>
            </Button>
          </div>

          {settings && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">Automatic publishing</p>
                  <p className="text-sm text-muted-foreground">Runs on schedule, {settings.posts_per_week}x per week</p>
                </div>
                <Switch
                  checked={settings.automation_enabled}
                  onCheckedChange={(v) => updateSettings({ automation_enabled: v })}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">Publish without review</p>
                  <p className="text-sm text-muted-foreground">Off = new articles arrive as drafts</p>
                </div>
                <Switch checked={settings.auto_publish} onCheckedChange={(v) => updateSettings({ auto_publish: v })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ppw">Posts per week</Label>
                <Input
                  id="ppw"
                  type="number"
                  min={1}
                  max={7}
                  value={settings.posts_per_week}
                  onChange={(e) => updateSettings({ posts_per_week: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tone">Writing tone</Label>
                <Textarea
                  id="tone"
                  value={settings.tone}
                  rows={3}
                  onChange={(e) => setSettings({ ...settings, tone: e.target.value })}
                  onBlur={() => updateSettings({ tone: settings.tone })}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Articles</CardTitle>
          <CardDescription>{posts.length} posts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : posts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No articles yet — use “Write an article now”.</p>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
                <div className="min-w-0">
                  <div className="mb-1 flex items-center gap-2">
                    <Badge variant={post.status === "published" ? "default" : "secondary"}>{post.status}</Badge>
                    <Badge variant="outline">{post.category}</Badge>
                    <span className="text-xs text-muted-foreground">{post.view_count} views</span>
                  </div>
                  <p className="truncate font-medium">{post.title}</p>
                  <p className="truncate text-sm text-muted-foreground">/blog/{post.slug}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(post)}>
                    <PenLine className="mr-1 h-4 w-4" />
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toggleStatus(post)}>
                    {post.status === "published" ? "Unpublish" : "Publish"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(post)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent agent runs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No runs yet.</p>
          ) : (
            runs.map((run) => (
              <div key={run.id} className="rounded-lg border p-3 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant={run.status === "success" ? "default" : run.status === "failed" ? "destructive" : "secondary"}>
                    {run.status}
                  </Badge>
                  <span className="text-muted-foreground">{run.trigger_source}</span>
                  <span className="text-muted-foreground">{new Date(run.started_at).toLocaleString()}</span>
                </div>
                {run.notes && <p className="mt-1 text-muted-foreground">{run.notes}</p>}
                {run.error && <p className="mt-1 text-destructive">{run.error}</p>}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit article</DialogTitle>
            <DialogDescription>Changes go live immediately for published posts.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-excerpt">Excerpt</Label>
                <Textarea
                  id="edit-excerpt"
                  rows={2}
                  value={editing.excerpt ?? ""}
                  onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-body">Body (markdown)</Label>
                <Textarea
                  id="edit-body"
                  rows={18}
                  value={editing.body}
                  onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BlogAgentAdmin;
