import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, DollarSign, TrendingUp, TrendingDown } from "lucide-react";

interface CostAdjustmentDialogProps {
  repairJob: {
    id: string;
    appliance_type: string;
    quoted_cost: number;
  };
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CostAdjustmentDialog = ({ repairJob, open, onClose, onSuccess }: CostAdjustmentDialogProps) => {
  const [finalCost, setFinalCost] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const difference = finalCost && !isNaN(parseFloat(finalCost)) 
    ? parseFloat(finalCost) - repairJob.quoted_cost 
    : 0;
  const isIncrease = difference > 0;

  const handleSubmit = async () => {
    if (!finalCost || parseFloat(finalCost) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid cost amount",
        variant: "destructive",
      });
      return;
    }

    if (!adjustmentReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for the cost adjustment",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.functions.invoke('request-cost-adjustment', {
        body: {
          repair_job_id: repairJob.id,
          final_cost: parseFloat(finalCost),
          adjustment_reason: adjustmentReason
        }
      });

      if (error) throw error;

      toast({
        title: "Adjustment Request Sent",
        description: "Customer will be notified to approve the new cost",
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error requesting cost adjustment:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to request cost adjustment",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Request Cost Adjustment</DialogTitle>
          <DialogDescription>
            The actual repair cost differs from the original quote. Request customer approval for the new cost.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Cost Comparison */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Original Quote</p>
                  <p className="text-2xl font-bold">
                    ₦{repairJob.quoted_cost.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">New Cost</p>
                  <p className="text-2xl font-bold text-primary">
                    {finalCost ? `₦${parseFloat(finalCost).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '---'}
                  </p>
                </div>
              </div>

              {finalCost && !isNaN(parseFloat(finalCost)) && (
                <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${isIncrease ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                  {isIncrease ? (
                    <>
                      <TrendingUp className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="text-sm font-medium text-red-900">
                          Increase: ₦{Math.abs(difference).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-red-700">
                          {((Math.abs(difference) / repairJob.quoted_cost) * 100).toFixed(1)}% higher than quoted
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-green-900">
                          Decrease: ₦{Math.abs(difference).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-green-700">
                          {((Math.abs(difference) / repairJob.quoted_cost) * 100).toFixed(1)}% lower than quoted
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Input Fields */}
          <div>
            <Label htmlFor="finalCost">Final Repair Cost (₦) *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="finalCost"
                type="number"
                min="0"
                step="0.01"
                placeholder="Enter actual repair cost"
                value={finalCost}
                onChange={(e) => setFinalCost(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="adjustmentReason">Reason for Adjustment *</Label>
            <Textarea
              id="adjustmentReason"
              placeholder="Explain why the cost changed (e.g., discovered additional damage, required extra parts, issue was simpler than expected...)"
              value={adjustmentReason}
              onChange={(e) => setAdjustmentReason(e.target.value)}
              rows={4}
              required
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || !finalCost || !adjustmentReason.trim()}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                'Request Customer Approval'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
