import { useState } from "react";
import { Copy, ShieldCheck, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface OTPHandoffCardProps {
  otp: string | null | undefined;
  phase: "pickup" | "return";
  verifiedAt?: string | null;
}

export const OTPHandoffCard = ({ otp, phase, verifiedAt }: OTPHandoffCardProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  if (!otp) return null;

  const copy = async () => {
    await navigator.clipboard.writeText(otp);
    setCopied(true);
    toast({ title: "Copied", description: "Handoff code copied to clipboard." });
    setTimeout(() => setCopied(false), 2000);
  };

  const verified = !!verifiedAt;

  return (
    <Card className={verified ? "border-green-500/40 bg-green-500/5" : "border-primary/40 bg-primary/5"}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Secure {phase === "pickup" ? "Pickup" : "Return"} Code
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {verified
            ? `Handoff verified ${new Date(verifiedAt!).toLocaleString()}.`
            : `Share this 4-digit code with the Fixbudi rider only when they arrive. Do not share by SMS or phone before the rider is on-site.`}
        </p>
        <div className="flex items-center gap-3">
          <div className="flex-1 text-3xl font-mono tracking-widest text-center py-4 bg-background rounded-lg border">
            {otp.split("").join(" ")}
          </div>
          <Button variant="outline" size="icon" onClick={copy} disabled={verified}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
