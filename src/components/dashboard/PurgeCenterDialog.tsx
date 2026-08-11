import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PurgeCenterDialogProps {
  center: { id: number; name: string | null } | null;
  onClose: () => void;
}

const COUNT_LABELS: Record<string, string> = {
  repair_jobs: "Repair jobs",
  conversations: "Conversations",
  delivery_requests: "Deliveries",
  repair_warranties: "Warranties",
  repair_protection_plans: "Protection plans",
  protection_claims: "Protection claims",
  repair_center_payouts: "Payout records",
  center_referrals: "Referrals",
};

/**
 * Super-admin only: permanently delete an archived repair center and every
 * record attached to it. Staff user accounts are never deleted.
 */
export const PurgeCenterDialog = ({ center, onClose }: PurgeCenterDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [confirmName, setConfirmName] = useState("");
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  useEffect(() => {
    setConfirmName("");
    setCounts(null);
    setBlocked(null);
    if (!center) return;

    let cancelled = false;
    setIsPreviewing(true);
    supabase.functions
      .invoke("purge-repair-center", { body: { centerId: center.id, dryRun: true } })
      .then(async ({ data, error }) => {
        if (cancelled) return;
        if (error) {
          const details = (error as any)?.context ? await (error as any).context.text() : error.message;
          let parsed: any = null;
          try {
            parsed = JSON.parse(details);
          } catch {
            /* not JSON */
          }
          setBlocked(parsed?.message || parsed?.error || "Could not load this center's data summary.");
          return;
        }
        setCounts(data?.counts ?? {});
      })
      .finally(() => !cancelled && setIsPreviewing(false));

    return () => {
      cancelled = true;
    };
  }, [center]);

  const purge = useMutation({
    mutationFn: async () => {
      if (!center) throw new Error("No center selected");
      const { data, error } = await supabase.functions.invoke("purge-repair-center", {
        body: { centerId: center.id },
      });
      if (error) {
        const details = (error as any)?.context ? await (error as any).context.text() : error.message;
        let parsed: any = null;
        try {
          parsed = JSON.parse(details);
        } catch {
          /* not JSON */
        }
        throw new Error(parsed?.message || parsed?.error || details || "Delete failed");
      }
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Center permanently deleted",
        description: `${center?.name} and all of its records have been removed.`,
      });
      queryClient.invalidateQueries({ queryKey: ["all-centers"] });
      queryClient.invalidateQueries({ queryKey: ["archived-centers"] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Could not delete center",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const nameMatches = (center?.name ?? "").trim() === confirmName.trim() && confirmName.trim().length > 0;

  return (
    <Dialog open={!!center} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Permanently delete {center?.name}
          </DialogTitle>
          <DialogDescription>
            This frees up database space and cannot be undone. Staff user accounts are kept.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {blocked ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{blocked}</AlertDescription>
            </Alert>
          ) : (
            <div className="rounded-md border p-3 text-sm">
              <p className="font-medium mb-2">These records will be destroyed:</p>
              {isPreviewing || !counts ? (
                <p className="text-muted-foreground">Checking…</p>
              ) : (
                <ul className="space-y-1 text-muted-foreground">
                  {Object.entries(COUNT_LABELS).map(([key, label]) => (
                    <li key={key} className="flex justify-between">
                      <span>{label}</span>
                      <span>{counts[key] ?? 0}</span>
                    </li>
                  ))}
                  <li className="flex justify-between">
                    <span>Messages, photos, status history, staff links, settings</span>
                    <span>all</span>
                  </li>
                </ul>
              )}
            </div>
          )}

          {!blocked && (
            <div className="space-y-2">
              <Label htmlFor="confirm-center-name">
                Type <span className="font-semibold">{center?.name}</span> to confirm
              </Label>
              <Input
                id="confirm-center-name"
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder={center?.name ?? ""}
                autoComplete="off"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!nameMatches || purge.isPending || !!blocked}
            onClick={() => purge.mutate()}
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {purge.isPending ? "Deleting…" : "Delete permanently"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PurgeCenterDialog;
