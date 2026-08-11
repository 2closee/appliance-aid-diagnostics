import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ForgotPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEmail?: string;
}

/**
 * Shared "forgot password" request dialog used by the customer, partner and
 * admin sign-in pages. Sends the recovery link to /reset-password.
 */
export const ForgotPasswordDialog = ({ open, onOpenChange, defaultEmail = "" }: ForgotPasswordDialogProps) => {
  const { toast } = useToast();
  const [email, setEmail] = useState(defaultEmail);
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSending(true);

    const redirectTo = `${window.location.origin}/reset-password`;

    try {
      // Preferred path: branded email via our edge function.
      const { data, error: fnError } = await supabase.functions.invoke("send-password-reset", {
        body: { email, redirectTo },
      });

      if (fnError || !data?.success) {
        // Fallback to Supabase's built-in recovery email.
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
        if (authError) throw authError;
      }

      toast({
        title: "Check your email",
        description: "If an account exists for that address, a password reset link is on its way.",
      });
      onOpenChange(false);
      setEmail("");
    } catch (err: any) {
      setError(err.message || "Could not send the reset link. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset your password</DialogTitle>
          <DialogDescription>
            Enter your email address and we'll send you a link to set a new password.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="forgot-email">Email</Label>
            <Input
              id="forgot-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSending}>
              {isSending ? "Sending..." : "Send reset link"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ForgotPasswordDialog;
