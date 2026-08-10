import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Loader2, ShieldCheck } from "lucide-react";

interface ReportSameIssueDialogProps {
  planId: string;
  claimsRemaining: number;
  onSubmitted?: () => void;
}

export function ReportSameIssueDialog({
  planId,
  claimsRemaining,
  onSubmitted,
}: ReportSameIssueDialogProps) {
  const [open, setOpen] = useState(false);
  const [fault, setFault] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!fault.trim()) {
      toast({ title: "Tell us what's wrong", description: "Describe the fault that came back.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("submit-protection-claim", {
        body: { plan_id: planId, reported_fault: fault.trim(), description: description.trim() || null },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Claim submitted",
        description: "Your repair centre has 48 hours to respond. Pickup is on us.",
      });
      setOpen(false);
      setFault("");
      setDescription("");
      onSubmitted?.();
    } catch (err) {
      toast({
        title: "Could not submit claim",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2" disabled={claimsRemaining <= 0}>
          <AlertTriangle className="h-4 w-4" />
          {claimsRemaining > 0 ? "Report same issue" : "No claims left"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Report the same issue
          </DialogTitle>
          <DialogDescription>
            Your Repair Protection covers this. We arrange pickup, the centre re-repairs it free, and
            we bring it back — at no cost to you. You have {claimsRemaining}{" "}
            {claimsRemaining === 1 ? "claim" : "claims"} left.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="claim-fault">What has come back?</Label>
            <Input
              id="claim-fault"
              value={fault}
              maxLength={200}
              placeholder="e.g. Speaker is crackling again"
              onChange={(e) => setFault(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="claim-description">Any details that help the technician (optional)</Label>
            <Textarea
              id="claim-description"
              value={description}
              maxLength={2000}
              rows={4}
              placeholder="When it started, what you were doing, whether it happens all the time…"
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting…
              </>
            ) : (
              "Submit claim"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
