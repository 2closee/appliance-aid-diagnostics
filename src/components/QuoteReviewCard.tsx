import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock, CheckCircle, XCircle, MessageCircle, Eye, TrendingUp } from "lucide-react";
import { useState } from "react";
import { useQuoteActions } from "@/hooks/useQuoteActions";
import { MediaViewer } from "./MediaViewer";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

interface QuoteReviewCardProps {
  repairJob: {
    id: string;
    appliance_type: string;
    appliance_brand?: string;
    repair_center: { name: string };
    quoted_cost: number;
    quote_notes?: string;
    quote_response_deadline?: string;
    ai_diagnosis_summary?: string;
    ai_estimated_cost_min?: number;
    ai_estimated_cost_max?: number;
    diagnostic_attachments?: any;
  };
}

export const QuoteReviewCard = ({ repairJob }: QuoteReviewCardProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showMedia, setShowMedia] = useState(false);
  const { acceptQuote, rejectQuote, negotiateQuote } = useQuoteActions();

  const serviceFee = repairJob.quoted_cost * 0.075;
  const totalPayment = repairJob.quoted_cost + serviceFee;

  const handleAccept = async () => {
    setIsProcessing(true);
    await acceptQuote(repairJob.id);
    setIsProcessing(false);
  };

  const handleReject = async () => {
    setIsProcessing(true);
    await rejectQuote(repairJob.id);
    setIsProcessing(false);
  };

  const handleNegotiate = async () => {
    setIsProcessing(true);
    await negotiateQuote(repairJob.id);
    setIsProcessing(false);
  };

  const getTimeRemaining = () => {
    if (!repairJob.quote_response_deadline) return null;
    const deadline = new Date(repairJob.quote_response_deadline);
    const now = new Date();
    const hoursRemaining = Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60)));
    return hoursRemaining;
  };

  const hoursRemaining = getTimeRemaining();
  const isUrgent = hoursRemaining !== null && hoursRemaining < 12;

  const mediaAttachments = repairJob.diagnostic_attachments
    ? [...(repairJob.diagnostic_attachments.videos || []),
       ...(repairJob.diagnostic_attachments.images || []),
       ...(repairJob.diagnostic_attachments.audio || [])]
    : [];

  return (
    <>
      <Card className={`${isUrgent ? 'border-amber-500 border-2 shadow-lg' : 'border-amber-200 border'} bg-gradient-to-br from-amber-50/50 to-background`}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <CardTitle className="text-xl">Quote Awaiting Your Response</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                {repairJob.appliance_type} {repairJob.appliance_brand && `- ${repairJob.appliance_brand}`}
              </p>
              <p className="text-sm font-medium text-amber-700">
                From: {repairJob.repair_center.name}
              </p>
            </div>
            {hoursRemaining !== null && (
              <Badge variant={isUrgent ? "destructive" : "secondary"} className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {hoursRemaining}h remaining
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Price Display */}
          <div className="bg-background p-4 rounded-lg border-2 border-primary/20">
            <div className="flex justify-between items-start mb-2">
              <span className="text-sm font-medium">Repair Cost:</span>
              <span className="text-2xl font-bold text-primary">
                ₦{repairJob.quoted_cost.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>Service Fee (7.5%):</span>
              <span>₦{serviceFee.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center font-bold text-lg pt-2 mt-2 border-t">
              <span>Your Total Payment:</span>
              <span className="text-primary">
                ₦{totalPayment.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Quote Notes */}
          {repairJob.quote_notes && (
            <div className="bg-muted p-3 rounded-lg border">
              <p className="text-sm font-medium mb-1">Repair Center Notes:</p>
              <p className="text-sm text-muted-foreground">{repairJob.quote_notes}</p>
            </div>
          )}

          {/* Diagnostic Details Collapsible */}
          {(repairJob.ai_diagnosis_summary || mediaAttachments.length > 0) && (
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-primary w-full">
                <ChevronDown className="h-4 w-4" />
                View Diagnostic Details
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-3">
                {repairJob.ai_diagnosis_summary && (
                  <div className="bg-gradient-card p-3 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">AI Diagnosis</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{repairJob.ai_diagnosis_summary}</p>
                    {(repairJob.ai_estimated_cost_min || repairJob.ai_estimated_cost_max) && (
                      <p className="text-xs text-muted-foreground mt-2">
                        AI Estimate: ₦{repairJob.ai_estimated_cost_min?.toLocaleString('en-NG')} - 
                        ₦{repairJob.ai_estimated_cost_max?.toLocaleString('en-NG')}
                      </p>
                    )}
                  </div>
                )}
                {mediaAttachments.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => setShowMedia(true)} className="w-full">
                    <Eye className="h-4 w-4 mr-2" />
                    View Diagnostic Media ({mediaAttachments.length})
                  </Button>
                )}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t">
            <Button
              variant="default"
              onClick={handleAccept}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Accept Quote
            </Button>
            <Button
              variant="outline"
              onClick={handleNegotiate}
              disabled={isProcessing}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Negotiate
            </Button>
            <Button
              variant="outline"
              onClick={handleReject}
              disabled={isProcessing}
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Decline
            </Button>
          </div>

          {isUrgent && (
            <div className="bg-amber-100 border border-amber-300 p-3 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-800">
                <strong>Urgent:</strong> This quote expires soon. Please respond within {hoursRemaining} hours to avoid missing this opportunity.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <MediaViewer
        attachments={mediaAttachments}
        open={showMedia}
        onClose={() => setShowMedia(false)}
      />
    </>
  );
};
