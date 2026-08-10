import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProtectionBadge } from "./ProtectionBadge";
import { ReportSameIssueDialog } from "./ReportSameIssueDialog";
import { ShieldCheck, Truck, Wrench, Clock } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";

interface CustomerProtectionCardProps {
  repairJobId: string;
}

const claimStatusCopy: Record<string, string> = {
  submitted: "Waiting for your repair centre to respond (48 hours).",
  center_accepted: "Accepted. A rider will collect your device — no cost to you.",
  in_mediation: "Contested. FixBudi support is reviewing the evidence.",
  in_repair: "Your device is back with the centre for a free re-repair.",
  resolved: "Closed as resolved.",
  rejected: "Declined after review.",
};

export function CustomerProtectionCard({ repairJobId }: CustomerProtectionCardProps) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["protection-plan", repairJobId],
    queryFn: async () => {
      const { data: plan, error } = await supabase
        .from("repair_protection_plans")
        .select("*")
        .eq("repair_job_id", repairJobId)
        .maybeSingle();
      if (error) throw error;
      if (!plan) return null;

      const { data: claims } = await supabase
        .from("protection_claims")
        .select("*")
        .eq("plan_id", plan.id)
        .order("created_at", { ascending: false });

      return { plan, claims: claims ?? [] };
    },
    enabled: !!repairJobId,
  });

  if (isLoading || !data) return null;

  const { plan, claims } = data;
  const claimsRemaining = Math.max(0, (plan.max_claims ?? 2) - (plan.claims_used ?? 0));
  const openClaim = claims.find((c: any) => !["resolved", "rejected"].includes(c.status));
  const expired = plan.status === "expired" || new Date(plan.expires_at) < new Date();

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Repair Protection
            </CardTitle>
            <CardDescription>
              Cover to {format(new Date(plan.expires_at), "d MMM yyyy")} · Same fault, free re-repair
              and free logistics
            </CardDescription>
          </div>
          <ProtectionBadge
            status={plan.status}
            expiresAt={plan.expires_at}
            claimsUsed={plan.claims_used ?? 0}
            maxClaims={plan.max_claims ?? 2}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-2 rounded-lg bg-background/70 p-3 text-sm">
            <Wrench className="h-4 w-4 text-primary" />
            Free re-repair of the original fault
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-background/70 p-3 text-sm">
            <Truck className="h-4 w-4 text-primary" />
            Pickup and return paid by FixBudi
          </div>
        </div>

        {openClaim ? (
          <div className="rounded-lg border bg-background p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">{openClaim.reported_fault}</p>
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                {openClaim.status.replace(/_/g, " ")}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {claimStatusCopy[openClaim.status] ?? "In progress."}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Reported {format(new Date(openClaim.created_at), "d MMM yyyy, h:mm a")}
            </p>
          </div>
        ) : expired ? (
          <p className="text-sm text-muted-foreground">
            Your 90-day cover has ended. You can still book a new repair any time.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <ReportSameIssueDialog
              planId={plan.id}
              claimsRemaining={claimsRemaining}
              onSubmitted={() => refetch()}
            />
            <Button variant="ghost" size="sm" asChild>
              <Link to="/legal/repair-protection">What's covered</Link>
            </Button>
          </div>
        )}

        {claims.filter((c: any) => ["resolved", "rejected"].includes(c.status)).length > 0 && (
          <div className="space-y-1 border-t pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Past claims
            </p>
            {claims
              .filter((c: any) => ["resolved", "rejected"].includes(c.status))
              .map((c: any) => (
                <p key={c.id} className="text-sm text-muted-foreground">
                  {format(new Date(c.created_at), "d MMM yyyy")} — {c.reported_fault} ({c.status})
                </p>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
