import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Video, Image as ImageIcon, AudioLines, DollarSign, TrendingUp, AlertCircle } from "lucide-react";
import { MediaViewer } from "./MediaViewer";

interface QuoteProvisionFormProps {
  repairJob: {
    id: string;
    appliance_type: string;
    appliance_brand?: string;
    appliance_model?: string;
    issue_description: string;
    ai_diagnosis_summary?: string;
    ai_confidence_score?: number;
    ai_estimated_cost_min?: number;
    ai_estimated_cost_max?: number;
    diagnostic_attachments?: any;
  };
  open: boolean;
  onClose: () => void;
  onQuoteSubmitted: () => void;
}

export const QuoteProvisionForm = ({ repairJob, open, onClose, onQuoteSubmitted }: QuoteProvisionFormProps) => {
  const [quotedCost, setQuotedCost] = useState("");
  const [quoteNotes, setQuoteNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMedia, setShowMedia] = useState(false);
  const { toast } = useToast();

  const serviceFee = quotedCost ? (parseFloat(quotedCost) * 0.075) : 0;
  const totalCustomerPayment = quotedCost ? (parseFloat(quotedCost) + serviceFee) : 0;

  const handleSubmit = async () => {
    if (!quotedCost || parseFloat(quotedCost) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid quote amount",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.functions.invoke('provide-repair-quote', {
        body: {
          repair_job_id: repairJob.id,
          quoted_cost: parseFloat(quotedCost),
          quote_notes: quoteNotes
        }
      });

      if (error) throw error;

      toast({
        title: "Quote Sent!",
        description: "Your quote has been sent to the customer",
      });

      onQuoteSubmitted();
      onClose();
    } catch (error: any) {
      console.error('Error providing quote:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send quote",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const mediaAttachments = repairJob.diagnostic_attachments
    ? [...(repairJob.diagnostic_attachments.videos || []),
       ...(repairJob.diagnostic_attachments.images || []),
       ...(repairJob.diagnostic_attachments.audio || [])]
    : [];

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Provide Quote for Repair</DialogTitle>
            <DialogDescription>
              Review the diagnostic information and provide your quote
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Appliance Info */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-2">Appliance Details</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><strong>Type:</strong> {repairJob.appliance_type}</div>
                  {repairJob.appliance_brand && <div><strong>Brand:</strong> {repairJob.appliance_brand}</div>}
                  {repairJob.appliance_model && <div><strong>Model:</strong> {repairJob.appliance_model}</div>}
                </div>
                <div className="mt-3">
                  <strong className="text-sm">Issue:</strong>
                  <p className="text-sm text-muted-foreground mt-1">{repairJob.issue_description}</p>
                </div>
              </CardContent>
            </Card>

            {/* AI Diagnosis */}
            {repairJob.ai_diagnosis_summary && (
              <Card className="bg-gradient-card border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">AI Diagnostic Analysis</h3>
                    {repairJob.ai_confidence_score && (
                      <Badge variant="outline">
                        Confidence: {Math.round(repairJob.ai_confidence_score * 100)}%
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{repairJob.ai_diagnosis_summary}</p>
                  
                  {(repairJob.ai_estimated_cost_min || repairJob.ai_estimated_cost_max) && (
                    <div className="bg-background p-3 rounded-lg border">
                      <p className="text-sm font-medium mb-1">AI Estimated Cost Range:</p>
                      <p className="text-lg font-bold text-primary">
                        ₦{repairJob.ai_estimated_cost_min?.toLocaleString('en-NG') || '0'} - 
                        ₦{repairJob.ai_estimated_cost_max?.toLocaleString('en-NG') || '0'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Use this as a reference for competitive pricing
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Media Attachments */}
            {mediaAttachments.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Diagnostic Media</h3>
                    <Button variant="outline" size="sm" onClick={() => setShowMedia(true)}>
                      View All Media
                    </Button>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {repairJob.diagnostic_attachments?.videos?.length > 0 && (
                      <Badge variant="secondary">
                        <Video className="h-3 w-3 mr-1" />
                        {repairJob.diagnostic_attachments.videos.length} Video(s)
                      </Badge>
                    )}
                    {repairJob.diagnostic_attachments?.images?.length > 0 && (
                      <Badge variant="secondary">
                        <ImageIcon className="h-3 w-3 mr-1" />
                        {repairJob.diagnostic_attachments.images.length} Image(s)
                      </Badge>
                    )}
                    {repairJob.diagnostic_attachments?.audio?.length > 0 && (
                      <Badge variant="secondary">
                        <AudioLines className="h-3 w-3 mr-1" />
                        {repairJob.diagnostic_attachments.audio.length} Audio
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quote Form */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="quotedCost">Your Quoted Cost (₦) *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="quotedCost"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Enter repair cost"
                    value={quotedCost}
                    onChange={(e) => setQuotedCost(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {quotedCost && parseFloat(quotedCost) > 0 && (
                <Card className="bg-muted">
                  <CardContent className="pt-4">
                    <h4 className="font-semibold mb-2 text-sm">Cost Breakdown</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Repair Cost:</span>
                        <span className="font-medium">₦{parseFloat(quotedCost).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Service Fee (7.5%):</span>
                        <span>₦{serviceFee.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between font-bold text-base pt-2 border-t">
                        <span>Customer Total:</span>
                        <span className="text-primary">₦{totalCustomerPayment.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div>
                <Label htmlFor="quoteNotes">Additional Notes (Optional)</Label>
                <Textarea
                  id="quoteNotes"
                  placeholder="Explain what's included in the quote, expected repair time, warranty, etc."
                  value={quoteNotes}
                  onChange={(e) => setQuoteNotes(e.target.value)}
                  rows={4}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={isSubmitting || !quotedCost || parseFloat(quotedCost) <= 0}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending Quote...
                  </>
                ) : (
                  'Send Quote to Customer'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <MediaViewer
        attachments={mediaAttachments}
        open={showMedia}
        onClose={() => setShowMedia(false)}
      />
    </>
  );
};
