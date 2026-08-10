import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ShieldAlert, Loader2, Clock } from "lucide-react";
import { format, differenceInHours } from "date-fns";

interface ProtectionClaimsQueueProps {
  repairCenterId: number;
}

const statusLabels: Record<string, { label: string; className: string }> = {
  submitted: { label: "Awaiting your response", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  center_accepted: { label: "Accepted", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  in_mediation: { label: "In FixBudi mediation", className: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  in_repair: { label: "In re-repair", className: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20" },
  resolved: { label: "Resolved", className: "bg-green-500/10 text-green-600 border-green-500/20" },
  rejected: { label: "Declined", className: "bg-red-500/10 text-red-600 border-red-500/20" },
};

export function ProtectionClaimsQueue({ repairCenterId }: ProtectionClaimsQueueProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [notesByClaim, setNotesByClaim] = useState<Record<string, string>>({});
  const [busyClaim, setBusyClaim] = useState<string | null>(null);

  const { data: claims, isLoading } = useQuery({
    queryKey: ["protection-claims", repairCenterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("protection_claims")
        .select("*, repair_job:repair_jobs(appliance_type, appliance_brand, customer_name)")
        .eq("repair_center_id", repairCenterId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!repairCenterId,
  });

  const respond = async (claimId: string, action: "accept" | "contest" | "resolve") => {
    setBusyClaim(claimId);
    try {
      const { data, error } = await supabase.functions.invoke("respond-to-protection-claim", {
        body: { claim_id: claimId, action, notes: notesByClaim[claimId] || null },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({
        title:
          action === "accept"
            ? "Claim accepted"
            : action === "contest"
            ? "Claim contested"
            : "Claim closed",
        description:
          action === "accept"
            ? "A pickup has been requested. Logistics are funded by FixBudi."
            : action === "contest"
            ? "FixBudi support will review your evidence."
            : "The claim is marked resolved.",
      });
      queryClient.invalidateQueries({ queryKey: ["protection-claims", repairCenterId] });
    } catch (err) {
      toast({
        title: "Action failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusyClaim(null);
    }
  };

  const openClaims = (claims ?? []).filter(
    (c: any) => !["resolved", "rejected"].includes(c.status)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5" />
          Warranty Claims
          {openClaims.length > 0 && <Badge variant="destructive">{openClaims.length} open</Badge>}
        </CardTitle>
        <CardDescription>
          Same-fault returns under your workmanship warranty. Respond within 48 hours — silence counts
          as acceptance.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : claims && claims.length > 0 ? (
          <div className="space-y-4">
            {claims.map((claim: any) => {
              const meta = statusLabels[claim.status] ?? {
                label: claim.status,
                className: "bg-muted text-muted-foreground",
              };
              const hoursOpen = differenceInHours(new Date(), new Date(claim.created_at));
              const needsResponse = claim.status === "submitted";

              return (
                <div key={claim.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {claim.repair_job?.appliance_type} {claim.repair_job?.appliance_brand} —{" "}
                        {claim.repair_job?.customer_name}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">{claim.reported_fault}</p>
                      {claim.description && (
                        <p className="mt-1 text-sm text-muted-foreground">{claim.description}</p>
                      )}
                      <p className="mt-2 text-xs text-muted-foreground">
                        Reported {format(new Date(claim.created_at), "d MMM yyyy, h:mm a")}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={meta.className}>{meta.label}</Badge>
                      {needsResponse && (
                        <span
                          className={`flex items-center gap-1 text-xs ${
                            hoursOpen >= 36 ? "font-semibold text-red-600" : "text-muted-foreground"
                          }`}
                        >
                          <Clock className="h-3 w-3" />
                          {Math.max(0, 48 - hoursOpen)}h left to respond
                        </span>
                      )}
                    </div>
                  </div>

                  {needsResponse && (
                    <div className="mt-4 space-y-3">
                      <Textarea
                        rows={2}
                        placeholder="Optional note. If you contest, describe your evidence (intake photos, tamper marks, unrelated fault)."
                        value={notesByClaim[claim.id] ?? ""}
                        onChange={(e) =>
                          setNotesByClaim((prev) => ({ ...prev, [claim.id]: e.target.value }))
                        }
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => respond(claim.id, "accept")}
                          disabled={busyClaim === claim.id}
                        >
                          {busyClaim === claim.id && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Accept &amp; arrange pickup
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => respond(claim.id, "contest")}
                          disabled={busyClaim === claim.id}
                        >
                          Contest claim
                        </Button>
                      </div>
                    </div>
                  )}

                  {["center_accepted", "in_repair"].includes(claim.status) && (
                    <div className="mt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => respond(claim.id, "resolve")}
                        disabled={busyClaim === claim.id}
                      >
                        Mark re-repair complete
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No warranty claims. Keep intake and release photos on every job to keep it that way.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
