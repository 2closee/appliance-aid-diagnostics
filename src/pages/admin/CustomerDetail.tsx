import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Loader2, MapPin } from "lucide-react";
import { format } from "date-fns";

const when = (ts?: string | null) => (ts ? format(new Date(ts), "d MMM yyyy, HH:mm") : "—");

export default function CustomerDetail() {
  const { customerId } = useParams<{ customerId: string }>();
  const { isAdmin, rolesLoaded } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (rolesLoaded && !isAdmin) {
      navigate("/");
      return;
    }
    if (!rolesLoaded || !isAdmin || !customerId) return;
    (async () => {
      setLoading(true);
      const { data: res, error: err } = await supabase.functions.invoke("get-admin-insights", {
        body: { action: "customer", customer_id: customerId },
      });
      if (err) setError(err.message);
      else if ((res as any)?.error) setError((res as any).error);
      else setData(res);
      setLoading(false);
    })();
  }, [rolesLoaded, isAdmin, customerId]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container max-w-4xl py-8 space-y-6">
        <Button variant="ghost" onClick={() => navigate("/admin/customer-insights")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to insights
        </Button>

        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading customer…
          </div>
        )}
        {error && <Card><CardContent className="pt-6 text-destructive text-sm">{error}</CardContent></Card>}

        {data && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>{data.profile?.full_name || "No name"}</CardTitle>
                <CardDescription>
                  {data.profile?.email ?? "no email"} {data.profile?.phone ? `• ${data.profile.phone}` : ""} • joined{" "}
                  {when(data.profile?.created_at)}
                </CardDescription>
              </CardHeader>
              {data.blocker && (
                <CardContent>
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                    <span className="font-medium">What's blocking this customer: </span>
                    {data.blocker}
                  </div>
                </CardContent>
              )}
            </Card>

            <Section title="Repair requests" empty="No repair requests yet.">
              {data.jobs.map((j: any) => (
                <div key={j.id} className="rounded-lg border p-3 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">
                      {j.appliance_type ?? "Device"} {j.appliance_brand ?? ""} {j.appliance_model ?? ""}
                    </span>
                    <Badge variant="outline">{String(j.job_status).replace(/_/g, " ")}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{j.issue_description ?? "No description"}</p>
                  <p className="text-sm">
                    Centre: {j.center_name ?? "none"} • price:{" "}
                    {j.quoted_cost ? `₦${Number(j.quoted_cost).toLocaleString()}` : "not given"} • requested{" "}
                    {when(j.created_at)}
                    {j.quote_provided_at ? ` • priced ${when(j.quote_provided_at)}` : ""}
                    {j.quote_accepted_at ? ` • accepted ${when(j.quote_accepted_at)}` : ""}
                  </p>
                </div>
              ))}
            </Section>

            <Section title="Conversations with centres" empty="No conversations yet.">
              {data.conversations.map((c: any) => (
                <div key={c.id} className="rounded-lg border p-3 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{c.center_name ?? "Unknown centre"}</span>
                    <Badge variant={c.center_replied ? "outline" : "destructive"}>
                      {c.center_replied ? `replied in ${c.first_reply_minutes ?? "?"} min` : "never replied"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {c.message_count} messages • started {when(c.created_at)} • last {when(c.last_message_at)}
                  </p>
                </div>
              ))}
            </Section>

            <Section title="AI diagnoses" empty="No diagnoses run.">
              {data.diagnostics.map((d: any) => (
                <div key={d.id} className="rounded-lg border p-3">
                  <p className="font-medium">{d.appliance_type ?? "Device"}</p>
                  <p className="text-sm text-muted-foreground">
                    {d.final_diagnosis || d.initial_diagnosis || "No conclusion recorded"} • {when(d.created_at)}
                  </p>
                </div>
              ))}
            </Section>

            <Section title="Pickups and returns" empty="No pickups arranged.">
              {data.trips.map((t: any) => (
                <div key={t.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{t.trip_type === "return" ? "Return" : "Pickup"}</span>
                    <Badge variant={t.rider_id ? "outline" : "destructive"}>
                      {String(t.status).replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t.pickup_address ?? "no address"} → {t.dropoff_address ?? "no address"} • {when(t.created_at)}
                  </p>
                </div>
              ))}
            </Section>

            {data.last_location && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Last known customer location
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p>{data.last_location.pickup_address ?? "No address recorded"}</p>
                  <p className="text-muted-foreground">
                    {data.last_location.lat ?? "?"}, {data.last_location.lng ?? "?"} • {when(data.last_location.at)}
                  </p>
                </CardContent>
              </Card>
            )}

            <Section title="Payments" empty="No payments.">
              {data.payments.map((p: any) => (
                <div key={p.id} className="rounded-lg border p-3 flex justify-between text-sm">
                  <span>
                    ₦{Number(p.amount ?? 0).toLocaleString()} • {p.payment_type}
                  </span>
                  <Badge variant={p.payment_status === "completed" ? "outline" : "destructive"}>
                    {p.payment_status}
                  </Badge>
                </div>
              ))}
            </Section>

            <Section title="Support tickets" empty="No tickets raised.">
              {data.tickets.map((t: any) => (
                <div key={t.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">{t.subject}</span>
                    <Badge variant="outline">{t.status}</Badge>
                  </div>
                  <p className="text-muted-foreground">{when(t.created_at)}</p>
                </div>
              ))}
            </Section>

            <Section title="Recent activity" empty="No tracked activity.">
              {data.events.slice(0, 40).map((e: any, i: number) => (
                <div key={i} className="flex justify-between text-sm border-b py-1 last:border-0">
                  <span>
                    {e.event_name === "page_view" ? `Viewed ${e.path}` : e.event_name}
                  </span>
                  <span className="text-muted-foreground">{when(e.created_at)}</span>
                </div>
              ))}
            </Section>
          </>
        )}
      </div>
    </div>
  );
}

const Section = ({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) => {
  const hasChildren = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {hasChildren ? children : <p className="text-sm text-muted-foreground">{empty}</p>}
      </CardContent>
    </Card>
  );
};
