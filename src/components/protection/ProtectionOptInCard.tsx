import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ShieldCheck, Truck, Wrench, CalendarClock, Loader2, X } from "lucide-react";
import { Link } from "react-router-dom";
import { PROTECTION_COVERED, PROTECTION_NOT_COVERED } from "@/lib/protection/pricing";

interface ProtectionQuote {
  eligible: boolean;
  reason?: string;
  fee_amount?: number;
  period_days?: number;
  device_category?: string;
}

interface ProtectionOptInCardProps {
  repairJobId: string;
  repairCost: number;
  selected: boolean;
  onSelectedChange: (selected: boolean) => void;
  onQuoteLoaded?: (fee: number | null) => void;
}

const naira = (n: number) =>
  `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function ProtectionOptInCard({
  repairJobId,
  repairCost,
  selected,
  onSelectedChange,
  onQuoteLoaded,
}: ProtectionOptInCardProps) {
  const [quote, setQuote] = useState<ProtectionQuote | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("calculate-protection-quote", {
        body: { repair_job_id: repairJobId },
      });
      if (!active) return;
      if (error) {
        setQuote({ eligible: false, reason: "Protection is unavailable right now." });
        onQuoteLoaded?.(null);
      } else {
        setQuote(data as ProtectionQuote);
        onQuoteLoaded?.(data?.eligible ? data.fee_amount ?? null : null);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repairJobId, repairCost]);

  if (loading) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking Repair Protection availability…
        </CardContent>
      </Card>
    );
  }

  if (!quote?.eligible || !quote.fee_amount) return null;

  const fee = quote.fee_amount;

  return (
    <Card
      className={`transition-colors ${
        selected ? "border-2 border-primary bg-primary/5" : "border-2 border-border"
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <Checkbox
            id="repair-protection"
            checked={selected}
            onCheckedChange={(v) => onSelectedChange(v === true)}
            className="mt-1"
            aria-describedby="repair-protection-desc"
          />
          <div className="flex-1">
            <label htmlFor="repair-protection" className="cursor-pointer">
              <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Add FixBudi Repair Protection
                <Badge variant="secondary">{naira(fee)}</Badge>
              </CardTitle>
            </label>
            <p id="repair-protection-desc" className="mt-1 text-sm text-muted-foreground">
              {quote.period_days ?? 90} days of cover on this repair. If the same fault comes back,
              we collect your {quote.device_category ?? "device"}, get it re-fixed and return it —
              you pay nothing.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
            <Wrench className="mt-0.5 h-4 w-4 text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium">Free re-repair</p>
              <p className="text-xs text-muted-foreground">Same fault, no labour charge</p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
            <Truck className="mt-0.5 h-4 w-4 text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium">Free logistics</p>
              <p className="text-xs text-muted-foreground">Pickup and return, both legs</p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
            <CalendarClock className="mt-0.5 h-4 w-4 text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium">90 days</p>
              <p className="text-xs text-muted-foreground">From the day you get it back</p>
            </div>
          </div>
        </div>

        <Separator />

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              What's covered
            </p>
            <ul className="space-y-1">
              {PROTECTION_COVERED.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 text-primary shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Not covered
            </p>
            <ul className="space-y-1">
              {PROTECTION_NOT_COVERED.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <X className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Repair Protection is a FixBudi service guarantee, not an insurance policy. It does not
          cover loss, theft or new damage.{" "}
          <Link to="/legal/repair-protection" className="underline">
            Read the full terms
          </Link>
          .
        </p>
      </CardContent>
    </Card>
  );
}
