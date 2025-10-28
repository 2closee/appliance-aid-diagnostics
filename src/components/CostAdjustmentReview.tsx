import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, TrendingUp, TrendingDown, CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CostAdjustmentReviewProps {
  repairJob: {
    id: string;
    appliance_type: string;
    quoted_cost: number;
    final_cost: number;
    cost_adjustment_reason: string;
    repair_center: { name: string };
  };
  onApproved: () => void;
}

export const CostAdjustmentReview = ({ repairJob, onApproved }: CostAdjustmentReviewProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const difference = repairJob.final_cost - repairJob.quoted_cost;
  const isIncrease = difference > 0;
  const serviceFee = repairJob.final_cost * 0.075;
  const totalPayment = repairJob.final_cost + serviceFee;

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('repair_jobs')
        .update({
          cost_adjustment_approved: true,
          job_status: 'in_repair'
        })
        .eq('id', repairJob.id);

      if (error) throw error;

      toast({
        title: "Cost Adjustment Approved",
        description: "The repair center will continue with your repair",
      });

      onApproved();
    } catch (error: any) {
      console.error('Error approving cost adjustment:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to approve adjustment",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecline = async () => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('repair_jobs')
        .update({
          cost_adjustment_approved: false,
          job_status: 'quote_negotiating'
        })
        .eq('id', repairJob.id);

      if (error) throw error;

      toast({
        title: "Adjustment Declined",
        description: "You can now discuss the cost with the repair center",
      });

      onApproved();
    } catch (error: any) {
      console.error('Error declining cost adjustment:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to decline adjustment",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="border-amber-500 border-2 bg-gradient-to-br from-amber-50/50 to-background shadow-lg">
      <CardHeader>
        <div className="flex items-start gap-3">
          <AlertCircle className="h-6 w-6 text-amber-600 mt-1" />
          <div className="flex-1">
            <CardTitle className="text-xl">Cost Adjustment Request</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {repairJob.repair_center.name} has requested a cost adjustment for your {repairJob.appliance_type} repair
            </p>
          </div>
          <Badge variant="destructive">Action Required</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Cost Comparison */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Original Quote</p>
            <p className="text-2xl font-bold">
              ₦{repairJob.quoted_cost.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-gradient-card p-4 rounded-lg border-2 border-primary">
            <p className="text-sm text-muted-foreground mb-1">New Cost</p>
            <p className="text-2xl font-bold text-primary">
              ₦{repairJob.final_cost.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Difference Indicator */}
        <div className={`p-4 rounded-lg flex items-center gap-3 ${isIncrease ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
          {isIncrease ? (
            <>
              <TrendingUp className="h-6 w-6 text-red-600" />
              <div className="flex-1">
                <p className="font-semibold text-red-900">
                  Price Increase: ₦{Math.abs(difference).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-red-700">
                  {((Math.abs(difference) / repairJob.quoted_cost) * 100).toFixed(1)}% higher than original quote
                </p>
              </div>
            </>
          ) : (
            <>
              <TrendingDown className="h-6 w-6 text-green-600" />
              <div className="flex-1">
                <p className="font-semibold text-green-900">
                  Price Decrease: ₦{Math.abs(difference).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-green-700">
                  {((Math.abs(difference) / repairJob.quoted_cost) * 100).toFixed(1)}% lower than original quote
                </p>
              </div>
            </>
          )}
        </div>

        {/* Reason */}
        <div className="bg-muted p-4 rounded-lg border">
          <p className="text-sm font-medium mb-2">Reason for Adjustment:</p>
          <p className="text-sm text-muted-foreground">{repairJob.cost_adjustment_reason}</p>
        </div>

        {/* Payment Breakdown */}
        <div className="bg-background p-4 rounded-lg border">
          <p className="text-sm font-medium mb-3">Your Total Payment (if approved):</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Repair Cost:</span>
              <span className="font-medium">₦{repairJob.final_cost.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Service Fee (7.5%):</span>
              <span>₦{serviceFee.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-2 border-t">
              <span>Total:</span>
              <span className="text-primary">₦{totalPayment.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-4 border-t">
          <Button
            variant="default"
            onClick={handleApprove}
            disabled={isProcessing}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Approve New Cost
          </Button>
          <Button
            variant="outline"
            onClick={handleDecline}
            disabled={isProcessing}
            className="border-red-200 text-red-600 hover:bg-red-50"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Decline & Discuss
          </Button>
        </div>

        <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>Note:</strong> If you decline, you can discuss the pricing with the repair center through the conversation feature before making a decision.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
