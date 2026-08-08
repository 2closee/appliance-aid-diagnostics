import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRider } from "@/hooks/useRider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Loader2 } from "lucide-react";

interface LedgerEntry {
  id: string;
  entry_type: string;
  amount: number;
  currency: string;
  description: string | null;
  settled: boolean;
  created_at: string;
}

const money = (n: number, currency = "NGN") =>
  `${currency === "NGN" ? "₦" : `${currency} `}${Math.abs(Number(n)).toLocaleString()}`;

const OverpassRiderEarnings = () => {
  const { rider } = useRider();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!rider) return;
    supabase
      .from("rider_ledger")
      .select("*")
      .eq("rider_id", rider.id)
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setEntries((data as LedgerEntry[]) ?? []);
        setLoading(false);
      });
  }, [rider]);

  const earned = entries.filter((e) => e.entry_type === "earning").reduce((s, e) => s + Number(e.amount), 0);
  const commissionOwed = entries
    .filter((e) => e.entry_type === "commission" && !e.settled)
    .reduce((s, e) => s + Math.abs(Number(e.amount)), 0);

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-6">
      <div className="mx-auto max-w-2xl space-y-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/rider">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Link>
        </Button>

        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground">Total earned</p>
              <p className="text-2xl font-bold">{money(earned)}</p>
            </CardContent>
          </Card>
          <Card className={commissionOwed > 0 ? "border-destructive/50" : undefined}>
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground">Commission owed to FixBudi</p>
              <p className="text-2xl font-bold">{money(commissionOwed)}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Trip history</CardTitle>
            <CardDescription>Every earning and commission entry on your account.</CardDescription>
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

export default OverpassRiderEarnings;
