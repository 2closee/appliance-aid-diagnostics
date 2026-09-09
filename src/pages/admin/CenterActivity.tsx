import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, RefreshCw, Send, Wifi, WifiOff } from "lucide-react";
import { format } from "date-fns";

const mins = (v: number | null) => (v === null || v === undefined ? "—" : `${Math.round(v)} min`);

export default function CenterActivity() {
  const { isAdmin, rolesLoaded } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [centers, setCenters] = useState<any[]>([]);
  const [nudges, setNudges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sweeping, setSweeping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase.functions.invoke("get-admin-insights", {
      body: { action: "centers" },
    });
    if (err) setError(err.message);
    else if ((data as any)?.error) setError((data as any).error);
    else {
      setCenters((data as any).centers ?? []);
      setNudges((data as any).nudges ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (rolesLoaded && !isAdmin) {
      navigate("/");
      return;
    }
    if (rolesLoaded && isAdmin) void load();
  }, [rolesLoaded, isAdmin]);

  const runSweep = async (dryRun: boolean) => {
    setSweeping(true);
    const { data, error: err } = await supabase.functions.invoke("center-nudge-sweep", {
      body: { dry_run: dryRun },
    });
    setSweeping(false);
    if (err) {
      toast({ title: "Could not run", description: err.message, variant: "destructive" });
      return;
    }
    const res = data as any;
    toast({
      title: dryRun ? "Preview complete" : "Reminders sent",
      description: `${res?.candidates ?? 0} centre(s) waiting on a customer, ${res?.sent ?? 0} text message(s) ${
        dryRun ? "would be sent" : "sent"
      }.`,
    });
    if (!dryRun) void load();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container max-w-6xl py-8 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Repair Centre Activity</h1>
            <p className="text-muted-foreground">
              Who is online, how fast they answer, and who needs a nudge.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
            <Button variant="outline" onClick={() => runSweep(true)} disabled={sweeping}>
              Preview reminders
            </Button>
            <Button onClick={() => runSweep(false)} disabled={sweeping}>
              {sweeping ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Send reminders now
            </Button>
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading centres…
          </div>
        )}
        {error && <Card><CardContent className="pt-6 text-sm text-destructive">{error}</CardContent></Card>}

        <div className="grid gap-4">
          {centers.map((c) => (
            <Card key={c.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {c.name}
                      {c.online_now ? (
                        <Badge className="gap-1">
                          <Wifi className="h-3 w-3" /> Online
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <WifiOff className="h-3 w-3" /> Offline
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {c.phone ?? "no phone"} • {c.staff_count} staff •{" "}
                      {c.last_seen_at
                        ? `last seen ${format(new Date(c.last_seen_at), "d MMM, HH:mm")}`
                        : "never seen online"}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">{c.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 grid-cols-2 md:grid-cols-4 text-sm">
                  <Metric label="Open jobs" value={c.open_jobs} />
                  <Metric label="Waiting for a price" value={c.waiting_for_quote} warn={c.waiting_for_quote > 0} />
                  <Metric
                    label="Unanswered chats"
                    value={c.unanswered_conversations}
                    warn={c.unanswered_conversations > 0}
                  />
                  <Metric label="Completed repairs" value={c.jobs_completed} />
                  <Metric label="Typical reply time" text={mins(c.median_first_reply_minutes)} />
                  <Metric label="Typical price time" text={mins(c.median_quote_minutes)} />
                  <Metric label="Rating" text={c.rating ? `${c.rating} (${c.reviews})` : "no reviews"} />
                  <Metric label="Reminders sent" value={c.nudges_sent} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent reminders</CardTitle>
            <CardDescription>Text messages sent to offline centres</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {nudges.length === 0 && <p className="text-sm text-muted-foreground">No reminders sent yet.</p>}
            {nudges.slice(0, 30).map((n) => (
              <div key={n.id} className="flex flex-wrap justify-between gap-2 rounded-lg border p-3 text-sm">
                <span>
                  {centers.find((c) => Number(c.id) === Number(n.repair_center_id))?.name ?? "Centre"} •{" "}
                  {String(n.reason).replace(/_/g, " ")}
                </span>
                <span className="text-muted-foreground">
                  {n.status} • {n.created_at ? format(new Date(n.created_at), "d MMM, HH:mm") : ""}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const Metric = ({
  label,
  value,
  text,
  warn,
}: {
  label: string;
  value?: number;
  text?: string;
  warn?: boolean;
}) => (
  <div>
    <p className="text-muted-foreground">{label}</p>
    <p className={`font-semibold ${warn ? "text-destructive" : ""}`}>{text ?? value ?? 0}</p>
  </div>
);
