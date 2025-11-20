import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock, CheckCircle, XCircle, MessageCircle, Eye, TrendingUp, Truck, Info } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuoteActions } from "@/hooks/useQuoteActions";
import { useDeliveryActions } from "@/hooks/useDeliveryActions";
import { MediaViewer } from "./MediaViewer";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface QuoteReviewCardProps {
  repairJob: {
    id: string;
    appliance_type: string;
    appliance_brand?: string;
    repair_center: { name: string; address: string };
    quoted_cost: number;
    quote_notes?: string;
    quote_response_deadline?: string;
    ai_diagnosis_summary?: string;
    ai_estimated_cost_min?: number;
    ai_estimated_cost_max?: number;
    diagnostic_attachments?: any;
    pickup_address: string;
  };
}

export const QuoteReviewCard = ({ repairJob }: QuoteReviewCardProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showMedia, setShowMedia] = useState(false);
  const [deliveryQuote, setDeliveryQuote] = useState<any>(null);
  const { acceptQuote, rejectQuote, negotiateQuote } = useQuoteActions();
  const { getDeliveryQuote, isFetchingQuote } = useDeliveryActions();

  const serviceFee = repairJob.quoted_cost * 0.075;
  const totalRepairPayment = repairJob.quoted_cost + serviceFee;
  const deliveryCost = deliveryQuote?.estimated_cost || 0;
  const deliveryCommission = deliveryQuote?.app_commission || 0;
  const totalDeliveryCost = deliveryCost + deliveryCommission;
  const grandTotal = totalRepairPayment + deliveryCost;

  // Fetch delivery quote on component mount
  useEffect(() => {
    const fetchDeliveryQuote = async () => {
      try {
        const quote = await getDeliveryQuote({
          pickup_address: repairJob.pickup_address,
          delivery_address: repairJob.repair_center.address,
          package_description: `${repairJob.appliance_type} repair pickup`
        });
        setDeliveryQuote(quote);
      } catch (error: any) {
        console.error('Failed to fetch delivery quote:', error);
        // Set delivery quote to null but don't block quote acceptance
        setDeliveryQuote(null);
        
        // Log specific error type for debugging
        if (error?.message?.includes('service is only available')) {
          console.log('Delivery not available in this service area');
        }
      }
    };

    if (repairJob.pickup_address && repairJob.repair_center.address) {
      fetchDeliveryQuote();
    }
  }, [repairJob.pickup_address, repairJob.repair_center.address]);

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
          {/* Full Cost Breakdown */}
          <div className="bg-background p-4 rounded-lg border-2 border-primary/20 space-y-3">
            {/* Repair Costs Section */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold text-primary">Repair Service (Pay Online)</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Repair Cost:</span>
                  <span className="font-medium">
                    ₦{repairJob.quoted_cost.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <span>Service Fee (7.5%):</span>
                  <span>₦{serviceFee.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center font-semibold pt-1 border-t">
                  <span>Repair Total:</span>
                  <span className="text-primary">
                    ₦{totalRepairPayment.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Delivery Costs Section */}
            <div className="pt-3 border-t">
              <div className="flex items-center gap-2 mb-2">
                <Truck className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-semibold text-amber-700">Pickup Delivery (Pay Cash to Rider)</span>
              </div>
              {isFetchingQuote ? (
                <div className="text-sm text-muted-foreground italic">Calculating delivery cost...</div>
              ) : deliveryQuote ? (
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Delivery Cost:</span>
                    <span className="font-medium">
                      ₦{deliveryCost.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <span>Platform Fee (5%):</span>
                    <span>₦{deliveryCommission.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center font-semibold pt-1 border-t">
                    <span>Delivery Total:</span>
                    <span className="text-amber-700">
                      ₦{totalDeliveryCost.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <Alert className="mt-2 bg-amber-50 border-amber-200">
                    <Info className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-xs text-amber-800">
                      Pickup delivery will be scheduled automatically. Pay the rider in cash upon pickup.
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground italic">Delivery cost unavailable for this location</div>
                  <Alert className="mt-2 bg-blue-50 border-blue-200">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-xs text-blue-800">
                      Delivery cost will be confirmed after quote acceptance. Service may not be available in your area.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </div>

            {/* Grand Total */}
            <div className="flex justify-between items-center font-bold text-xl pt-3 border-t-2 border-primary/20">
              <span>Total Cost:</span>
              <span className="text-primary">
                ₦{grandTotal.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Online: ₦{totalRepairPayment.toLocaleString('en-NG')} | Cash to Rider: ₦{totalDeliveryCost.toLocaleString('en-NG')}
            </p>
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
