import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Users, AlertTriangle, Activity, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface Insights {
  totals: Record<string, number>;
  signupTrend: { date: string; count: number }[];
  funnel: { step: string; count: number }[];
  friction: any[];
  customers: any[];
  featureUsage: { event_name: string; count: number; users: number }[];
}

const prettyEvent = (name: string) =>
  name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());

export default function CustomerInsights() {
  const { isAdmin, rolesLoaded } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data: res, error: err } = await supabase.functions.invoke("get-admin-insights", {
      body: { action: "overview" },
    });
    if (err) setError(err.message);
    else if ((res as any)?.error) setError((res as any).error);
    else setData(res as Insights);
    setLoading(false);
  };

  useEffect(() => {
    if (rolesLoaded && !isAdmin) {
      navigate("/");
      return;
    }
    if (rolesLoaded && isAdmin) void load();
  }, [rolesLoaded, isAdmin]);

  const filteredCustomers = useMemo(() => {
    const list = data?.customers ?? [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((c) =>
      [c.full_name, c.email, c.phone, c.stage].some((v: string | null) => (v ?? "").toLowerCase().includes(q)),
    );
  }, [data, search]);

  const maxFunnel = Math.max(1, ...(data?.funnel ?? []).map((f) => f.count));

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container max-w-6xl py-8 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Customer Insights</h1>
            <p className="text-muted-foreground">
              Who signed up, what they tried to do, and where they got stuck.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
            <Button variant="outline" onClick={() => navigate("/admin/center-activity")}>
              Repair centre activity
            </Button>
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading customer data…
          </div>
        )}

        {error && (
          <Card>
            <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        )}

        {data && (
          <>
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              <Stat label="Customers" value={data.totals.customers} icon={<Users className="h-4 w-4" />} />
              <Stat label="New this week" value={data.totals.new_last_7_days} icon={<Activity className="h-4 w-4" />} />
              <Stat label="Prices given" value={data.totals.quotes_given} />
              <Stat
                label="Needs attention"
                value={data.totals.open_friction}
                icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
              />
            </div>

            <Tabs defaultValue="friction">
              <TabsList>
                <TabsTrigger value="friction">Needs attention</TabsTrigger>
                <TabsTrigger value="signups">Signups</TabsTrigger>
                <TabsTrigger value="funnel">Journey</TabsTrigger>
                <TabsTrigger value="features">Feature use</TabsTrigger>
              </TabsList>

              <TabsContent value="friction" className="space-y-3">
                <Card>
                  <CardHeader>
                    <CardTitle>What isn't working</CardTitle>
                    <CardDescription>
                      Longest waits first. Click a row to open the full customer history.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {data.friction.length === 0 && (
                      <p className="text-sm text-muted-foreground">Nothing is stuck right now.</p>
                    )}
                    {data.friction.map((f, i) => (
                      <button
                        key={i}
                        className="w-full text-left rounded-lg border p-3 hover:bg-muted/50 transition"
                        onClick={() => f.customer_id && navigate(`/admin/customers/${f.customer_id}`)}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive">{f.type}</Badge>
                            <span className="font-medium">{f.customer}</span>
                            {f.center && <span className="text-sm text-muted-foreground">→ {f.center}</span>}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            waiting {f.waiting_hours}h
                          </span>
                        </div>
                        {f.detail && <p className="text-sm text-muted-foreground mt-1">{f.detail}</p>}
                      </button>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="signups" className="space-y-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Signups</CardTitle>
                    <CardDescription>{data.customers.length} customer accounts</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Input
                      placeholder="Search by name, email, phone or stage"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    <div className="space-y-2">
                      {filteredCustomers.map((c) => (
                        <button
                          key={c.id}
                          className="w-full text-left rounded-lg border p-3 hover:bg-muted/50 transition"
                          onClick={() => navigate(`/admin/customers/${c.id}`)}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="font-medium">{c.full_name || "No name"}</p>
                              <p className="text-sm text-muted-foreground">
                                {c.email ?? "no email"} {c.phone ? `• ${c.phone}` : ""}
                              </p>
                            </div>
                            <div className="text-right space-y-1">
                              <Badge variant="outline">{c.stage}</Badge>
                              <p className="text-xs text-muted-foreground">
                                joined {format(new Date(c.created_at), "d MMM yyyy")}
                              </p>
                            </div>
                          </div>
                          {c.centers?.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Centres: {c.centers.join(", ")}
                            </p>
                          )}
                          {c.first_path && (
                            <p className="text-xs text-muted-foreground">
                              First seen on {c.first_path}
                              {c.referrer ? ` from ${c.referrer}` : ""}
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="funnel" className="space-y-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Customer journey</CardTitle>
                    <CardDescription>How far people get after signing up</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {data.funnel.map((f) => (
                      <div key={f.step} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{f.step}</span>
                          <span className="font-medium">{f.count}</span>
                        </div>
                        <div className="h-2 rounded bg-muted">
                          <div
                            className="h-2 rounded bg-primary"
                            style={{ width: `${(f.count / maxFunnel) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>New customers per day</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {data.signupTrend.map((d) => (
                      <div key={d.date} className="flex items-center gap-2 text-sm">
                        <span className="w-24 text-muted-foreground">{d.date}</span>
                        <div className="h-2 rounded bg-primary" style={{ width: `${d.count * 24}px` }} />
                        <span>{d.count}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="features">
                <Card>
                  <CardHeader>
                    <CardTitle>Feature use</CardTitle>
                    <CardDescription>Actions people take, and how many people take them</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {data.featureUsage.length === 0 && (
                      <p className="text-sm text-muted-foreground">No feature activity recorded yet.</p>
                    )}
                    {data.featureUsage.map((f) => (
                      <div key={f.event_name} className="flex items-center justify-between rounded-lg border p-3">
                        <span>{prettyEvent(f.event_name)}</span>
                        <span className="text-sm text-muted-foreground">
                          {f.count} times • {f.users} people
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}

const Stat = ({ label, value, icon }: { label: string; value: number; icon?: React.ReactNode }) => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        {icon}
        {label}
      </div>
      <p className="text-2xl font-bold mt-1">{value ?? 0}</p>
    </CardContent>
  </Card>
);
