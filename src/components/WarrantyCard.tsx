import { useState } from "react";
import { Shield, ShieldCheck, Calendar, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, format } from "date-fns";

interface WarrantyCardProps {
  warranty: {
    id: string;
    repair_job_id: string;
    warranty_type: "standard" | "extended" | "premium";
    warranty_period_days: number;
    warranty_start_date: string;
    warranty_end_date: string;
    is_active: boolean;
    claim_count: number;
    max_claims: number;
    terms_text?: string | null;
    covered_issues?: string[] | null;
  };
  onClaimSubmitted?: () => void;
}

const warrantyColors = {
  standard: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800",
  extended: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800",
  premium: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
};

const warrantyIconColors = {
  standard: "text-emerald-600",
  extended: "text-blue-600",
  premium: "text-amber-600"
};

export function WarrantyCard({ warranty, onClaimSubmitted }: WarrantyCardProps) {
  const [isClaimDialogOpen, setIsClaimDialogOpen] = useState(false);
  const [claimReason, setClaimReason] = useState("");
  const [claimDescription, setClaimDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const startDate = new Date(warranty.warranty_start_date);
  const endDate = new Date(warranty.warranty_end_date);
  const now = new Date();
  const totalDays = warranty.warranty_period_days;
  const daysUsed = differenceInDays(now, startDate);
  const daysRemaining = differenceInDays(endDate, now);
  const progressPercent = Math.min(100, Math.max(0, (daysUsed / totalDays) * 100));
  const isExpired = daysRemaining < 0;
  const canClaim = warranty.is_active && !isExpired && warranty.claim_count < warranty.max_claims;

  const handleSubmitClaim = async () => {
    if (!claimReason) {
      toast({
        title: "Please select a reason",
        description: "Choose the issue you're experiencing",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("warranty_claims")
        .insert({
          warranty_id: warranty.id,
          repair_job_id: warranty.repair_job_id,
          claim_reason: claimReason,
          claim_description: claimDescription || null
        });

      if (error) throw error;

      toast({
        title: "Warranty claim submitted",
        description: "We'll review your claim and contact you within 24 hours."
      });

      setIsClaimDialogOpen(false);
      setClaimReason("");
      setClaimDescription("");
      onClaimSubmitted?.();
    } catch (error: any) {
      toast({
        title: "Failed to submit claim",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Card className={`${warrantyColors[warranty.warranty_type]} border-2`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full bg-background ${warrantyIconColors[warranty.warranty_type]}`}>
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-lg">
                  FixBudi {warranty.warranty_type.charAt(0).toUpperCase() + warranty.warranty_type.slice(1)} Warranty
                </CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Valid until {format(endDate, "MMMM d, yyyy")}
                </CardDescription>
              </div>
            </div>
            <Badge 
              variant={isExpired ? "secondary" : "default"}
              className={isExpired ? "" : "bg-emerald-600 hover:bg-emerald-700"}
            >
              {isExpired ? "Expired" : `${daysRemaining} days left`}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Warranty Period</span>
              <span>{daysUsed} of {totalDays} days</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* Covered Issues */}
          {warranty.covered_issues && warranty.covered_issues.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                What's Covered
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                {warranty.covered_issues.map((issue, index) => (
                  <li key={index} className="list-disc">{issue}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Terms */}
          {warranty.terms_text && (
            <div className="p-3 bg-background/50 rounded-lg text-sm text-muted-foreground">
              <FileText className="h-4 w-4 inline mr-2" />
              {warranty.terms_text}
            </div>
          )}

          {/* Claims Info */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-sm">
              <span className="text-muted-foreground">Claims used: </span>
              <span className="font-medium">{warranty.claim_count} / {warranty.max_claims}</span>
            </div>
            <Button 
              onClick={() => setIsClaimDialogOpen(true)}
              disabled={!canClaim}
              variant={canClaim ? "default" : "secondary"}
              size="sm"
            >
              {isExpired ? "Warranty Expired" : 
               warranty.claim_count >= warranty.max_claims ? "No Claims Left" : 
               "File a Claim"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Claim Dialog */}
      <Dialog open={isClaimDialogOpen} onOpenChange={setIsClaimDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              File a Warranty Claim
            </DialogTitle>
            <DialogDescription>
              Describe the issue you're experiencing. We'll coordinate with the repair center for a free re-repair.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>What issue are you experiencing?</Label>
              <Select value={claimReason} onValueChange={setClaimReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select the issue" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="same_issue_recurrence">Same issue has returned</SelectItem>
                  <SelectItem value="parts_failure">Replaced parts failed</SelectItem>
                  <SelectItem value="workmanship_defect">Workmanship issue</SelectItem>
                  <SelectItem value="related_issue">Related issue appeared</SelectItem>
                  <SelectItem value="other">Other issue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Describe the problem (optional)</Label>
              <Textarea
                placeholder="Provide details about what's happening..."
                value={claimDescription}
                onChange={(e) => setClaimDescription(e.target.value)}
                rows={4}
              />
            </div>

            <div className="p-3 bg-muted rounded-lg text-sm flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-muted-foreground">
                Claims are typically reviewed within 24 hours. If approved, we'll arrange for the repair center to fix the issue at no additional cost.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsClaimDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitClaim} disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Claim"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
