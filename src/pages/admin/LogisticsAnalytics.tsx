import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigation } from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";

interface Row {
  provider_name: string | null;
  count: number;
  avg_rating: number;
  failover_count: number;
}

export default function LogisticsAnalytics() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: deliveries } = await supabase
        .from("delivery_requests")
        .select("provider_name, failover_from, delivery_status")
        .not("provider_name", "is", null)
        .limit(1000);
      const { data: ratings } = await supabase
        .from("rider_ratings")
        .select("provider_name, rating")
        .limit(1000);

      const map: Record<string, Row> = {};
      (deliveries ?? []).forEach((d: any) => {
        const key = d.provider_name ?? "unknown";
        map[key] = map[key] ?? { provider_name: key, count: 0, avg_rating: 0, failover_count: 0 };
        map[key].count++;
        if (d.failover_from) map[key].failover_count++;
      });
      const ratingBuckets: Record<string, number[]> = {};
      (ratings ?? []).forEach((r: any) => {
        const k = r.provider_name ?? "unknown";
        ratingBuckets[k] = ratingBuckets[k] ?? [];
        ratingBuckets[k].push(r.rating);
      });
      Object.keys(map).forEach((k) => {
        const arr = ratingBuckets[k] ?? [];
        map[k].avg_rating = arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
      });

      setRows(Object.values(map));
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container max-w-4xl py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Logistics Analytics</h1>
          <p className="text-muted-foreground">Provider performance across all dispatches.</p>
        </div>
        <Card>
          <CardHeader><CardTitle>By provider</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : rows.length === 0 ? (
              <div className="text-sm text-muted-foreground">No dispatches recorded yet.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-2">Provider</th>
                    <th>Dispatches</th>
                    <th>Failovers to this provider</th>
                    <th>Avg rider rating</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.provider_name ?? "unknown"} className="border-b">
                      <td className="py-2 font-medium capitalize">{r.provider_name}</td>
                      <td>{r.count}</td>
                      <td>{r.failover_count}</td>
                      <td>{r.avg_rating ? r.avg_rating.toFixed(2) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
