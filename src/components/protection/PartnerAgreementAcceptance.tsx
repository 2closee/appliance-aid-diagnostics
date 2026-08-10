import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, FileSignature, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { PROTECTION_TERMS_VERSION } from "@/lib/protection/pricing";

interface PartnerAgreementAcceptanceProps {
  repairCenterId: number;
}

const CLAUSES: { heading: string; body: string }[] = [
  {
    heading: "1. The undertaking",
    body: "Every phone or laptop repair you complete through FixBudi carries a 90-day workmanship warranty. If the same fault recurs within that period, you re-diagnose and re-repair the device, or replace the part you fitted, at no charge for labour, parts, testing or handling.",
  },
  {
    heading: "2. Turnaround",
    body: "You start work within 24 hours of receiving a returned device and complete the re-repair within 72 hours, unless a part must be sourced, in which case you notify FixBudi in writing with a revised date.",
  },
  {
    heading: "3. No charge to the customer",
    body: "You will not request or accept payment from a customer for a re-repair under this warranty. Any such payment must be refunded immediately.",
  },
  {
    heading: "4. Exclusions you may rely on",
    body: "New or unrelated faults; liquid, impact or surge damage occurring after the device left your custody; third-party interference; customer software changes; consumables and battery wear below 80% of rated capacity; cosmetic wear; loss or theft. You must substantiate any exclusion with photographic or diagnostic evidence within 48 hours of the claim.",
  },
  {
    heading: "5. Records",
    body: "For every repair you record the fault diagnosed, work performed, parts fitted, and dated intake and release condition photographs. Missing records create a rebuttable presumption in the customer's favour.",
  },
  {
    heading: "6. Claims and mediation",
    body: "You accept or contest a claim within 48 hours; silence is deemed acceptance. Contested claims go to FixBudi mediation, decided in writing within 7 days. Upheld claims: you bear the re-repair, FixBudi bears the logistics from the Repair Protection fund.",
  },
  {
    heading: "7. Breach",
    body: "On refusal to honour this warranty FixBudi may charge back the repair fee, recover the cost of remedying the fault elsewhere, withhold payouts to that extent, suspend you from new jobs, and delist you after two upheld refusals in any six-month period.",
  },
  {
    heading: "8. Repair Protection is not your liability",
    body: "The customer's Repair Protection plan is a contract between FixBudi and the customer. You receive no part of the plan fee and take on no liability under it beyond clause 1. Your warranty applies whether or not the customer bought a plan.",
  },
  {
    heading: "9. Law, arbitration and data",
    body: "Governed by Nigerian law and the law of your State of operation, with reference to the Federal Competition and Consumer Protection Act 2018. Disputes go to arbitration under the Arbitration and Mediation Act 2023, seated in your State capital (Port Harcourt for Rivers State). Customer data is processed under the Nigeria Data Protection Act 2023; breaches are reported to FixBudi within 24 hours.",
  },
  {
    heading: "10. Electronic signature",
    body: "Checking the box and entering your full name binds your business to this Schedule A. Your name, account, timestamp and network address are recorded as your signature under the Evidence Act 2011 (as amended).",
  },
];

export function PartnerAgreementAcceptance({ repairCenterId }: PartnerAgreementAcceptanceProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [agreed, setAgreed] = useState(false);
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: acceptance, isLoading } = useQuery({
    queryKey: ["partner-agreement", repairCenterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_agreement_acceptances")
        .select("*")
        .eq("repair_center_id", repairCenterId)
        .eq("agreement_version", PROTECTION_TERMS_VERSION)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!repairCenterId,
  });

  const handleAccept = async () => {
    if (!agreed || fullName.trim().length < 3) {
      toast({
        title: "Complete the acceptance",
        description: "Tick the box and enter your full name as signatory.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("partner_agreement_acceptances").insert({
        repair_center_id: repairCenterId,
        agreement_version: PROTECTION_TERMS_VERSION,
        accepted_by: user?.id,
        accepted_full_name: fullName.trim(),
      });
      if (error) throw error;
      toast({
        title: "Agreement accepted",
        description: "Schedule A is now on file for your business.",
      });
      queryClient.invalidateQueries({ queryKey: ["partner-agreement", repairCenterId] });
    } catch (err) {
      toast({
        title: "Could not record acceptance",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) return null;

  if (acceptance) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Workmanship Warranty Undertaking signed
            <Badge variant="secondary">{acceptance.agreement_version}</Badge>
          </CardTitle>
          <CardDescription>
            Accepted by {acceptance.accepted_full_name} on{" "}
            {format(new Date(acceptance.accepted_at), "d MMM yyyy, h:mm a")}. You owe every FixBudi
            phone and laptop repair a 90-day same-fault warranty.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-amber-500/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSignature className="h-5 w-5" />
          Action required: Schedule A — Workmanship Warranty Undertaking
        </CardTitle>
        <CardDescription>
          Accepting this is a condition of receiving phone and laptop jobs through FixBudi.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ScrollArea className="h-72 rounded-md border p-4">
          <div className="space-y-3 text-sm leading-relaxed">
            {CLAUSES.map((c) => (
              <div key={c.heading}>
                <p className="font-semibold">{c.heading}</p>
                <p className="text-muted-foreground">{c.body}</p>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex items-start gap-3">
          <Checkbox
            id="accept-schedule-a"
            checked={agreed}
            onCheckedChange={(v) => setAgreed(v === true)}
            className="mt-1"
          />
          <Label htmlFor="accept-schedule-a" className="text-sm font-normal leading-relaxed">
            I am authorised to bind this business and accept Schedule A version{" "}
            {PROTECTION_TERMS_VERSION}, including the 90-day free re-repair obligation on the same
            fault.
          </Label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="signatory-name">Full name of signatory</Label>
          <Input
            id="signatory-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Loveday Okoro"
          />
        </div>

        <Button onClick={handleAccept} disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Accept and sign
        </Button>
      </CardContent>
    </Card>
  );
}
