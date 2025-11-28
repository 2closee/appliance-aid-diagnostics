import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface RecommendRepairCenterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RecommendRepairCenterDialog = ({
  open,
  onOpenChange,
}: RecommendRepairCenterDialogProps) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    centerName: "",
    location: "",
    contactInfo: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.centerName.trim() || !formData.location.trim()) {
      toast.error("Please fill in the required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("repair_center_recommendations")
        .insert({
          recommended_by_user_id: user?.id || null,
          center_name: formData.centerName.trim(),
          location: formData.location.trim(),
          contact_info: formData.contactInfo.trim() || null,
          notes: formData.notes.trim() || null,
          status: "pending",
        });

      if (error) throw error;

      toast.success("Thank you for your recommendation!", {
        description: "We'll review it and reach out to the repair center soon.",
      });

      // Reset form and close dialog
      setFormData({
        centerName: "",
        location: "",
        contactInfo: "",
        notes: "",
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting recommendation:", error);
      toast.error("Failed to submit recommendation", {
        description: "Please try again or contact support.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 rounded-full p-2">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle>Recommend a Repair Center</DialogTitle>
          </div>
          <DialogDescription>
            Help us expand our network! Share details about a trusted repair center in your area.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="centerName">
              Repair Center Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="centerName"
              placeholder="e.g., Tech Repair Hub"
              value={formData.centerName}
              onChange={(e) =>
                setFormData({ ...formData, centerName: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">
              Location <span className="text-destructive">*</span>
            </Label>
            <Input
              id="location"
              placeholder="e.g., Lagos, Victoria Island"
              value={formData.location}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactInfo">
              Contact Information (Optional)
            </Label>
            <Input
              id="contactInfo"
              placeholder="Phone number or email"
              value={formData.contactInfo}
              onChange={(e) =>
                setFormData({ ...formData, contactInfo: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">
              Why do you recommend them? (Optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="e.g., Fast service, reasonable prices, excellent customer care..."
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Submit Recommendation
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
