import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Users, Eye, Clock, Activity } from "lucide-react";

interface AnalyticsRow {
  id: string;
  session_id: string;
  user_id: string | null;
  event_name: string;
  path: string | null;
  created_at: string;
  metadata: any;
}

const TrafficAnalytics = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [days, setDays] = useState("7");
  const [rows, setRows] = useState<AnalyticsRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("has_role", { _user_id: user.id, _role: "super_admin" }).then(({ data }) => {
      setIsSuperAdmin(!!data);
    });
  }, [user]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    setLoading(true);
    const since = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000).toISOString();
    supabase
      .from("analytics_events")
      .select("*")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000)
      .then(({ data }) => {
        setRows((data ?? []) as AnalyticsRow[]);
        setLoading(false);
      });
  }, [days, isSuperAdmin]);

  const stats = useMemo(() => {
    const sessions = new Set(rows.map((r) => r.session_id));
    const pageViews = rows.filter((r) => r.event_name === "page_view").length;
    const sessionTimes: Record<string, { min: number; max: number }> = {};
    rows.forEach((r) => {
      const t = new Date(r.created_at).getTime();
      const s = sessionTimes[r.session_id];
      if (!s) sessionTimes[r.session_id] = { min: t, max: t };
      else {
        s.min = Math.min(s.min, t);
        s.max = Math.max(s.max, t);
      }
    });
    const durations = Object.values(sessionTimes).map((s) => (s.max - s.min) / 1000);
    const avgDuration =
      durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

    const pathCounts: Record<string, number> = {};
    rows.filter((r) => r.event_name === "page_view").forEach((r) => {
      const p = r.path || "unknown";
      pathCounts[p] = (pathCounts[p] || 0) + 1;
    });
    const topPages = Object.entries(pathCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);

    const featureCounts: Record<string, number> = {};
    rows.filter((r) => r.event_name !== "page_view").forEach((r) => {
      featureCounts[r.event_name] = (featureCounts[r.event_name] || 0) + 1;
    });
    const topFeatures = Object.entries(featureCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);

    const dailyMap: Record<string, { date: string; visitors: Set<string>; views: number }> = {};
    rows.forEach((r) => {
      const day = new Date(r.created_at).toISOString().slice(0, 10);
      if (!dailyMap[day]) dailyMap[day] = { date: day, visitors: new Set(), views: 0 };
      dailyMap[day].visitors.add(r.session_id);
      if (r.event_name === "page_view") dailyMap[day].views += 1;
    });
    const daily = Object.values(dailyMap)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({ date: d.date.slice(5), visitors: d.visitors.size, views: d.views }));

    return {
      visitors: sessions.size,
      pageViews,
      avgDuration,
      events: rows.filter((r) => r.event_name !== "page_view").length,
      topPages,
      topFeatures,
      daily,
    };
  }, [rows]);

  if (authLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (isSuperAdmin === false) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">Traffic Analytics</h1>
            <p className="text-muted-foreground">Visitor traffic, sessions, and feature usage.</p>
          </div>
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 24 hours</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <Skeleton className="h-96" />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard icon={<Users className="h-5 w-5" />} label="Unique visitors" value={stats.visitors} />
              <StatCard icon={<Eye className="h-5 w-5" />} label="Page views" value={stats.pageViews} />
              <StatCard
                icon={<Clock className="h-5 w-5" />}
                label="Avg. session"
                value={`${Math.floor(stats.avgDuration / 60)}m ${Math.floor(stats.avgDuration % 60)}s`}
              />
              <StatCard icon={<Activity className="h-5 w-5" />} label="Feature events" value={stats.events} />
            </div>

            <Card>
              <CardHeader><CardTitle>Daily traffic</CardTitle></CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.daily}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="visitors" stroke="hsl(var(--primary))" strokeWidth={2} />
                    <Line type="monotone" dataKey="views" stroke="hsl(var(--muted-foreground))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle>Top pages</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>Path</TableHead><TableHead className="text-right">Views</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {stats.topPages.map(([p, c]) => (
                        <TableRow key={p}><TableCell className="font-mono text-xs">{p}</TableCell><TableCell className="text-right">{c}</TableCell></TableRow>
                      ))}
                      {stats.topPages.length === 0 && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">No data</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Top features</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>Event</TableHead><TableHead className="text-right">Count</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {stats.topFeatures.map(([e, c]) => (
                        <TableRow key={e}><TableCell>{e}</TableCell><TableCell className="text-right">{c}</TableCell></TableRow>
                      ))}
                      {stats.topFeatures.length === 0 && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">No feature events yet</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className="text-muted-foreground">{icon}</div>
      </div>
    </CardContent>
  </Card>
);

export default TrafficAnalytics;
