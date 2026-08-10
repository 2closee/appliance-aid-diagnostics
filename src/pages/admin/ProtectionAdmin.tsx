import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Wallet, AlertTriangle, TrendingUp, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

const naira = (n: number) =>
  `₦${Number(n ?? 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const ProtectionAdmin = () => {
  const { toast } = useToast();
  const [sweeping, setSweeping] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["protection-admin"],
    queryFn: async () => {
      const [plans, claims, ledger] = await Promise.all([
        supabase.from("repair_protection_plans").select("*").order("created_at", { ascending: false }),
        supabase
          .from("protection_claims")
          .select("*, repair_job:repair_jobs(appliance_type, customer_name)")
          .order("created_at", { ascending: false }),
        supabase.from("protection_ledger").select("*"),
      ]);
      if (plans.error) throw plans.error;
      if (claims.error) throw claims.error;
      if (ledger.error) throw ledger.error;
      return { plans: plans.data ?? [], claims: claims.data ?? [], ledger: ledger.data ?? [] };
    },
  });

  const runSweep = async () => {
    setSweeping(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("expire-protection-plans", {});
      if (error) throw error;
      toast({
        title: "Reserve sweep complete",
        description: `${res?.expired ?? 0} plans expired, ${naira(res?.released ?? 0)} released to revenue.`,
      });
      refetch();
    } catch (err) {
      toast({
        title: "Sweep failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSweeping(false);
    }
  };

  const sum = (type: string) =>
    (data?.ledger ?? [])
      .filter((e: any) => e.entry_type === type)
      .reduce((s: number, e: any) => s + Number(e.amount), 0);

  const collected = sum("fee_collected");
  const paidOut = sum("claim_logistics_paid");
  const released = sum("reserve_released");
  const heldInReserve = collected - paidOut - released;

  const activePlans = (data?.plans ?? []).filter((p: any) => p.status === "active").length;
  const openClaims = (data?.claims ?? []).filter(
    (c: any) => !["resolved", "rejected"].includes(c.status)
  );
  const mediation = openClaims.filter((c: any) => c.status === "in_mediation");
  const claimRate = data?.plans?.length
    ? ((data.claims.length / data.plans.length) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto space-y-8 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Repair Protection</h1>
            <p className="mt-1 text-muted-foreground">
              Plan sales, claims and the protection reserve fund
            </p>
          </div>
          <Button onClick={runSweep} disabled={sweeping} variant="outline">
            {sweeping && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Run 90-day reserve sweep
          </Button>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active plans</CardTitle>
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activePlans}</div>
              <p className="text-xs text-muted-foreground">{data?.plans?.length ?? 0} sold overall</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Held in reserve</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{naira(heldInReserve)}</div>
              <p className="text-xs text-muted-foreground">{naira(collected)} collected</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Claim logistics paid</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{naira(paidOut)}</div>
              <p className="text-xs text-muted-foreground">{naira(released)} released to revenue</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Claim rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{claimRate}%</div>
              <p className="text-xs text-muted-foreground">{openClaims.length} open now</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Claims needing mediation</CardTitle>
            <CardDescription>
              Contested claims awaiting a FixBudi determination (7-day target)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-20 animate-pulse rounded bg-muted" />
            ) : mediation.length ? (
              <div className="space-y-3">
                {mediation.map((c: any) => (
                  <div key={c.id} className="rounded-lg border p-4">
                    <p className="font-medium">
                      {c.repair_job?.appliance_type} — {c.repair_job?.customer_name}
                    </p>
                    <p className="text-sm text-muted-foreground">{c.reported_fault}</p>
                    {c.center_response_notes && (
                      <p className="mt-2 text-sm">
                        <span className="font-medium">Centre says:</span> {c.center_response_notes}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">
                      Contested {format(new Date(c.center_responded_at ?? c.created_at), "d MMM yyyy, h:mm a")}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Nothing in mediation right now.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All claims</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.claims?.length ? (
              <div className="space-y-2">
                {data.claims.map((c: any) => (
                  <div
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {c.repair_job?.appliance_type} — {c.reported_fault}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(c.created_at), "d MMM yyyy")} · logistics{" "}
                        {naira(c.logistics_cost_paid)}
                      </p>
                    </div>
                    <Badge variant="outline">{c.status.replace(/_/g, " ")}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">No claims yet.</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ProtectionAdmin;
