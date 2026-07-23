import { useState } from "react";
import { Star } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RiderRatingDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  deliveryRequestId: string;
  onRated?: () => void;
}

const StarRow = ({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) => (
  <div>
    <div className="text-sm font-medium mb-1">{label}</div>
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="p-1"
          aria-label={`${label} ${n}`}
        >
          <Star
            className={`h-6 w-6 ${n <= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
          />
        </button>
      ))}
    </div>
  </div>
);

export const RiderRatingDialog = ({
  open,
  onOpenChange,
  deliveryRequestId,
  onRated,
}: RiderRatingDialogProps) => {
  const { toast } = useToast();
  const [overall, setOverall] = useState(5);
  const [prof, setProf] = useState(5);
  const [punc, setPunc] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("rate-rider", {
        body: {
          delivery_request_id: deliveryRequestId,
          rating: overall,
          professionalism: prof,
          punctuality: punc,
          comment: comment.trim() || null,
        },
      });
      if (error) throw error;
      toast({ title: "Thanks!", description: "Your rider rating was submitted." });
      onRated?.();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rate your Fixbudi rider</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <StarRow value={overall} onChange={setOverall} label="Overall experience" />
          <StarRow value={prof} onChange={setProf} label="Professionalism" />
          <StarRow value={punc} onChange={setPunc} label="Punctuality" />
          <Textarea
            placeholder="Optional comments"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
          />
          <Button onClick={submit} disabled={submitting} className="w-full">
            {submitting ? "Submitting..." : "Submit rating"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
