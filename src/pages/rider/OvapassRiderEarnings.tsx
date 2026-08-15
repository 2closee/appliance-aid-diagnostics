import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRider } from "@/hooks/useRider";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Loader2, AlertTriangle, Wallet } from "lucide-react";

interface LedgerEntry {
  id: string;
  entry_type: string;
  amount: number;
  currency: string;
  description: string | null;
  settled: boolean;
  settlement_period: string | null;
  created_at: string;
}

interface Payout {
  id: string;
  amount: number;
  status: string;
  settlement_period: string;
  created_at: string;
  paid_at: string | null;
}

const money = (n: number, currency = "NGN") =>
  `${currency === "NGN" ? "₦" : `${currency} `}${Math.abs(Number(n)).toLocaleString()}`;

const OvapassRiderEarnings = () => {
  const { rider } = useRider();
  const { toast } = useToast();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [pricing, setPricing] = useState<{ min_withdrawal: number; max_unsettled_trips: number; max_unsettled_amount: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  const isCompany = rider?.fleet_type === "company";

  const load = useCallback(async () => {
    if (!rider) return;
    const [{ data: ledger }, { data: pay }, { data: price }] = await Promise.all([
      supabase.from("rider_ledger").select("*").eq("rider_id", rider.id).order("created_at", { ascending: false }).limit(200),
      supabase.from("rider_payouts").select("*").eq("rider_id", rider.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("overpass_pricing").select("min_withdrawal, max_unsettled_trips, max_unsettled_amount").eq("active", true).limit(1).maybeSingle(),
    ]);
    setEntries((ledger as LedgerEntry[]) ?? []);
    setPayouts((pay as Payout[]) ?? []);
    setPricing(price as typeof pricing);
    setLoading(false);
  }, [rider]);

  useEffect(() => {
    load();
  }, [load]);

  const currentPeriod = (() => {
    const d = new Date();
    const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const day = target.getUTCDay() || 7;
    target.setUTCDate(target.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
  })();

  const earnings = entries.filter((e) => e.entry_type === "earning");
  const commissions = entries.filter((e) => e.entry_type === "commission");
  const openCommissions = commissions.filter((e) => !e.settled);

  const totalEarned = earnings.reduce((s, e) => s + Number(e.amount), 0);
  const fixbudiCut = commissions.reduce((s, e) => s + Math.abs(Number(e.amount)), 0);
  const grossThisWeek = entries
    .filter((e) => e.settlement_period === currentPeriod && ["earning", "commission"].includes(e.entry_type))
    .reduce((s, e) => s + Math.abs(Number(e.amount)), 0);
  const earnedThisWeek = earnings
    .filter((e) => e.settlement_period === currentPeriod)
    .reduce((s, e) => s + Number(e.amount), 0);

  const walletBalance = entries
    .filter((e) => ["earning", "payout", "adjustment"].includes(e.entry_type))
    .reduce((s, e) => s + Number(e.amount), 0);

  const debtAmount = openCommissions.reduce((s, e) => s + Math.abs(Number(e.amount)), 0);
  const tripsLeft = Math.max(0, Number(pricing?.max_unsettled_trips ?? 5) - openCommissions.length);
  const pendingPayout = payouts.find((p) => ["requested", "approved"].includes(p.status));

  const requestPayout = async () => {
    setRequesting(true);
    const { data, error } = await supabase.functions.invoke("ovapass-request-payout", { body: {} });
    setRequesting(false);
    const message = (data as { error?: string } | null)?.error ?? error?.message;
    if (message) {
      toast({ title: "Withdrawal not sent", description: message, variant: "destructive" });
      return;
    }
    toast({ title: "Withdrawal requested", description: "FixBudi will pay this out on the next payout run." });
    load();
  };

  return (
    <div className="min-h-screen bg-muted/30 px-4 pb-6 pt-20">
      <Navigation />
      <div className="mx-auto max-w-2xl space-y-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/rider">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Link>
        </Button>

        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground">This week's rides (total charged)</p>
              <p className="text-2xl font-bold">{money(grossThisWeek)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Your share: {money(earnedThisWeek)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground">Total your share (all time)</p>
              <p className="text-2xl font-bold">{money(totalEarned)}</p>
              <p className="mt-1 text-xs text-muted-foreground">FixBudi's share: {money(fixbudiCut)}</p>
            </CardContent>
          </Card>
        </div>

        {isCompany ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Wallet className="h-5 w-5" /> Wallet
              </CardTitle>
              <CardDescription>
                Your share of every ride is credited here. Withdraw once a week — FixBudi pays into your bank account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-3xl font-bold">{money(walletBalance)}</p>
              {pendingPayout ? (
                <p className="text-sm text-muted-foreground">
                  Withdrawal of {money(pendingPayout.amount)} is {pendingPayout.status}.
                </p>
              ) : (
                <>
                  <Button onClick={requestPayout} disabled={requesting || walletBalance <= 0}>
                    {requesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Withdraw {money(walletBalance)}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Minimum withdrawal {money(Number(pricing?.min_withdrawal ?? 2000))}.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className={debtAmount > 0 ? "border-destructive/50" : undefined}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                {debtAmount > 0 && <AlertTriangle className="h-5 w-5 text-destructive" />}
                Commission owed to FixBudi
              </CardTitle>
              <CardDescription>
                You collect the full ride fee in cash from the customer. FixBudi's share builds up here — pay it in to keep
                riding.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-3xl font-bold">{money(debtAmount)}</p>
              {rider?.settlement_blocked ? (
                <Badge variant="destructive">Paused — settle your balance to receive new trips</Badge>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {tripsLeft} more {tripsLeft === 1 ? "trip" : "trips"} before your account pauses.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Pay in at any FixBudi office or by transfer, then an admin clears it here.
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Trip history</CardTitle>
            <CardDescription>Every earning and FixBudi share on your account.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : entries.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No trips yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Entry</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {new Date(e.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm">{e.description ?? e.entry_type}</TableCell>
                      <TableCell className={`text-right font-medium ${Number(e.amount) < 0 ? "text-destructive" : ""}`}>
                        {Number(e.amount) < 0 ? "-" : "+"}
                        {money(e.amount, e.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={e.settled ? "secondary" : "outline"}>{e.settled ? "Settled" : "Open"}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OvapassRiderEarnings;
