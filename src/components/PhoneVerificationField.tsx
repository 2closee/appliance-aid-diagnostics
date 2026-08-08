import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Loader2, MessageSquare } from "lucide-react";

interface PhoneVerificationFieldProps {
  value: string;
  onChange: (value: string) => void;
  verified: boolean;
  onVerified: (phone: string) => void;
  label?: string;
  description?: string;
}

const RESEND_SECONDS = 60;

export const PhoneVerificationField = ({
  value,
  onChange,
  verified,
  onVerified,
  label = "Phone number",
  description = "We text a 6-digit code to confirm this number works.",
}: PhoneVerificationFieldProps) => {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (cooldown <= 0) return;
    timer.current = window.setInterval(() => {
      setCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => window.clearInterval(timer.current);
  }, [cooldown]);

  const readError = async (error: unknown) => {
    const ctx = (error as { context?: { text?: () => Promise<string> } })?.context;
    if (ctx?.text) {
      try {
        const parsed = JSON.parse(await ctx.text());
        return parsed.error ?? parsed.message ?? "Something went wrong.";
      } catch {
        /* fall through */
      }
    }
    return (error as Error)?.message ?? "Something went wrong.";
  };

  const sendCode = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-phone-otp", {
        body: { phone: value },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setCodeSent(true);
      setCooldown(RESEND_SECONDS);
      toast({ title: "Code sent", description: `Check ${value} for a 6-digit code.` });
    } catch (e) {
      toast({ title: "Could not send code", description: await readError(e), variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const submitCode = async () => {
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-phone-otp", {
        body: { phone: value, code },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      onVerified(data.phone ?? value);
      setCodeSent(false);
      setCode("");
      toast({ title: "Phone verified", description: "Thanks, your number is confirmed." });
    } catch (e) {
      toast({ title: "Could not verify", description: await readError(e), variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  if (verified) {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{value}</span>
          <span className="ml-auto text-xs text-muted-foreground">Verified</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="phone">{label}</Label>
      <div className="flex gap-2">
        <Input
          id="phone"
          inputMode="tel"
          value={value}
          placeholder="0801 234 5678"
          onChange={(e) => onChange(e.target.value)}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={sendCode}
          disabled={sending || cooldown > 0 || value.replace(/\D/g, "").length < 10}
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : cooldown > 0 ? `${cooldown}s` : "Send code"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>

      {codeSent && (
        <div className="flex gap-2 pt-1">
          <Input
            inputMode="numeric"
            maxLength={6}
            value={code}
            placeholder="6-digit code"
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          />
          <Button type="button" onClick={submitCode} disabled={verifying || code.length !== 6}>
            {verifying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <MessageSquare className="mr-2 h-4 w-4" /> Verify
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default PhoneVerificationField;
