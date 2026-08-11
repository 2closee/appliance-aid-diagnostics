import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Save } from "lucide-react";

interface Pricing {
  id: string;
  city: string;
  rider_share_company: number;
  commission_rate_partner: number;
  max_unsettled_trips: number;
  max_unsettled_amount: number;
  payout_day: number;
  min_withdrawal: number;
}

interface PayoutRow {
  id: string;
  rider_id: string;
  amount: number;
  status: string;
  settlement_period: string;
  bank_details: string | null;
  created_at: string;
}

interface DebtRow {
  rider_id: string;
  name: string;
  phone: string;
  blocked: boolean;
  entries: number;
  amount: number;
}

const money = (n: number) => `₦${Math.abs(Number(n ?? 0)).toLocaleString()}`;

const OvapassPaymentsAdmin = () => {
  const { toast } = useToast();
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [form, setForm] = useState({
    rider_share_company: "50",
    commission_rate_partner: "30",
    max_unsettled_trips: "5",
    max_unsettled_amount: "20000",
    payout_day: "1",
    min_withdrawal: "2000",
  });
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [riderNames, setRiderNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: price }, { data: pay }, { data: riders }, { data: ledger }] = await Promise.all([
      supabase.from("overpass_pricing").select("*").eq("active", true).limit(1).maybeSingle(),
      supabase.from("rider_payouts").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("riders").select("id, full_name, phone, fleet_type, settlement_blocked"),
      supabase.from("rider_ledger").select("rider_id, amount, entry_type, settled").eq("entry_type", "commission").eq("settled", false),
    ]);

    if (price) {
      const p = price as Pricing;
      setPricing(p);
      setForm({
        rider_share_company: String(Math.round(Number(p.rider_share_company) * 100)),
        commission_rate_partner: String(Math.round(Number(p.commission_rate_partner) * 100)),
        max_unsettled_trips: String(p.max_unsettled_trips),
        max_unsettled_amount: String(p.max_unsettled_amount),
        payout_day: String(p.payout_day),
        min_withdrawal: String(p.min_withdrawal),
      });
    }

    setPayouts((pay as PayoutRow[]) ?? []);

    const names: Record<string, string> = {};
    (riders ?? []).forEach((r: { id: string; full_name: string }) => {
      names[r.id] = r.full_name;
    });
    setRiderNames(names);

    const grouped = new Map<string, { entries: number; amount: number }>();
    (ledger ?? []).forEach((e: { rider_id: string; amount: number }) => {
      const current = grouped.get(e.rider_id) ?? { entries: 0, amount: 0 };
      grouped.set(e.rider_id, {
        entries: current.entries + 1,
        amount: current.amount + Math.abs(Number(e.amount)),
      });
    });

    setDebts(
      (riders ?? [])
        .filter((r: { fleet_type: string }) => r.fleet_type !== "company")
        .map((r: { id: string; full_name: string; phone: string; settlement_blocked: boolean }) => ({
          rider_id: r.id,
          name: r.full_name,
          phone: r.phone,
          blocked: r.settlement_blocked,
          entries: grouped.get(r.id)?.entries ?? 0,
          amount: grouped.get(r.id)?.amount ?? 0,
        }))
        .filter((d: DebtRow) => d.amount > 0 || d.blocked)
        .sort((a: DebtRow, b: DebtRow) => b.amount - a.amount),
    );

    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!pricing) return;
    setSaving(true);
    const { error } = await supabase
      .from("overpass_pricing")
      .update({
        rider_share_company: Number(form.rider_share_company) / 100,
        commission_rate_company: 1 - Number(form.rider_share_company) / 100,
        commission_rate_partner: Number(form.commission_rate_partner) / 100,
        max_unsettled_trips: Number(form.max_unsettled_trips),
        max_unsettled_amount: Number(form.max_unsettled_amount),
        payout_day: Number(form.payout_day),
        min_withdrawal: Number(form.min_withdrawal),
      })
      .eq("id", pricing.id);
    setSaving(false);
    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Payment settings saved", description: "New trips use these rates from now on." });
    load();
  };

  const markPayout = async (id: string, status: "approved" | "paid" | "rejected") => {
    const payout = payouts.find((p) => p.id === id);
    const patch: Record<string, unknown> = { status };
    if (status === "paid") patch.paid_at = new Date().toISOString();
    // Only transition to paid from a not-yet-paid row, so the wallet is debited once.
    let query = supabase.from("rider_payouts").update(patch).eq("id", id);
    if (status === "paid") query = query.neq("status", "paid");
    const { data: updated, error } = await query.select("id").maybeSingle();
    if (error) {
      toast({ title: "Could not update payout", description: error.message, variant: "destructive" });
      return;
    }
    if (status === "paid" && !updated) {
      toast({ title: "Already paid", description: "This withdrawal was already marked paid." });
      load();
      return;
    }
    if (status === "paid" && payout) {
      // Debit the rider wallet so the same earnings cannot be withdrawn again.
      const { error: ledgerError } = await supabase.from("rider_ledger").insert({
        rider_id: payout.rider_id,
        entry_type: "payout",
        amount: -Math.abs(Number(payout.amount)),
        description: `Withdrawal paid (${payout.settlement_period})`,
        settled: true,
        settled_at: new Date().toISOString(),
      });
      if (ledgerError) {
        toast({
          title: "Payout marked paid, wallet not updated",
          description: ledgerError.message,
          variant: "destructive",
        });
        load();
        return;
      }
    }
    toast({ title: `Payout ${status}` });
    load();
  };

  const settleDebt = async (riderId: string, amount: number) => {
    const { data, error } = await supabase.functions.invoke("ovapass-settle-debt", {
      body: { rider_id: riderId, amount },
    });
    const message = (data as { error?: string } | null)?.error ?? error?.message;
    if (message) {
      toast({ title: "Could not record settlement", description: message, variant: "destructive" });
      return;
    }
    toast({ title: "Settlement recorded", description: "The rider's balance has been cleared." });
    load();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment settings</CardTitle>
          <CardDescription>
            Change how ride fees are split without touching code. Completed trips keep the rate they were priced at.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="riderShare">FixBudi rider share (%)</Label>
              <Input
                id="riderShare"
                type="number"
                min={0}
                max={100}
                value={form.rider_share_company}
                onChange={(e) => setForm({ ...form, rider_share_company: e.target.value })}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                What a rider on a FixBudi bike keeps from each in-app ride fee.
              </p>
            </div>
            <div>
              <Label htmlFor="partnerCommission">Third-party commission (%)</Label>
              <Input
                id="partnerCommission"
                type="number"
                min={0}
                max={100}
                value={form.commission_rate_partner}
                onChange={(e) => setForm({ ...form, commission_rate_partner: e.target.value })}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                What FixBudi takes from each ride a partner rider collects in cash.
              </p>
            </div>
            <div>
              <Label htmlFor="maxTrips">Trips allowed while owing</Label>
              <Input
                id="maxTrips"
                type="number"
                min={1}
                value={form.max_unsettled_trips}
                onChange={(e) => setForm({ ...form, max_unsettled_trips: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="maxAmount">Maximum unpaid commission (₦)</Label>
              <Input
                id="maxAmount"
                type="number"
                min={0}
                value={form.max_unsettled_amount}
                onChange={(e) => setForm({ ...form, max_unsettled_amount: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="payoutDay">Weekly payout day (1 = Monday)</Label>
              <Input
                id="payoutDay"
                type="number"
                min={1}
                max={7}
                value={form.payout_day}
                onChange={(e) => setForm({ ...form, payout_day: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="minWithdrawal">Minimum withdrawal (₦)</Label>
              <Input
                id="minWithdrawal"
                type="number"
                min={0}
                value={form.min_withdrawal}
                onChange={(e) => setForm({ ...form, min_withdrawal: e.target.value })}
              />
            </div>
          </div>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save settings
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Weekly payout queue</CardTitle>
          <CardDescription>Withdrawals requested by riders on FixBudi bikes.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rider</TableHead>
                <TableHead>Week</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payouts.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <p className="font-medium">{riderNames[p.rider_id] ?? "Rider"}</p>
                    {p.bank_details && <p className="text-xs text-muted-foreground">{p.bank_details}</p>}
                  </TableCell>
                  <TableCell className="text-sm">{p.settlement_period}</TableCell>
                  <TableCell className="font-medium">{money(p.amount)}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === "paid" ? "default" : p.status === "rejected" ? "destructive" : "secondary"}>
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {p.status === "requested" && (
                      <Button size="sm" variant="outline" className="mr-2" onClick={() => markPayout(p.id, "approved")}>
                        Approve
                      </Button>
                    )}
                    {["requested", "approved"].includes(p.status) && (
                      <Button size="sm" onClick={() => markPayout(p.id, "paid")}>
                        Mark paid
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {payouts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    No withdrawal requests yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Commission owed by third-party riders</CardTitle>
          <CardDescription>Confirm a payment to clear a rider's balance and unblock them.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rider</TableHead>
                <TableHead>Open trips</TableHead>
                <TableHead>Owed</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {debts.map((d) => (
                <TableRow key={d.rider_id}>
                  <TableCell>
                    <p className="font-medium">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{d.phone}</p>
                  </TableCell>
                  <TableCell>{d.entries}</TableCell>
                  <TableCell className="font-medium">{money(d.amount)}</TableCell>
                  <TableCell>
                    <Badge variant={d.blocked ? "destructive" : "secondary"}>{d.blocked ? "paused" : "active"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" disabled={d.amount <= 0} onClick={() => settleDebt(d.rider_id, d.amount)}>
                      Payment received
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {debts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    No outstanding commission.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default OvapassPaymentsAdmin;
