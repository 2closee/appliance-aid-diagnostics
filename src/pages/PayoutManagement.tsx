import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, DollarSign, Calendar, Building2, CheckCircle, Clock, Download } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/currency";

interface PayoutRecord {
  id: string;
  repair_center_id: number;
  repair_job_id: string;
  gross_amount: number;
  commission_amount: number;
  net_amount: number;
  currency: string;
  payout_status: string;
  payout_method: string | null;
  payout_reference: string | null;
  payout_date: string | null;
  settlement_period: string | null;
  created_at: string;
  notes: string | null;
  repair_center?: {
    name: string;
    email: string;
  };
}

interface CenterSummary {
  repair_center_id: number;
  center_name: string;
  center_email: string;
  total_pending: number;
  pending_count: number;
  currency: string;
}

const PayoutManagement = () => {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pendingPayouts, setPendingPayouts] = useState<PayoutRecord[]>([]);
  const [completedPayouts, setCompletedPayouts] = useState<PayoutRecord[]>([]);
  const [centerSummaries, setCenterSummaries] = useState<CenterSummary[]>([]);
  const [selectedPayout, setSelectedPayout] = useState<PayoutRecord | null>(null);
  const [processingPayout, setProcessingPayout] = useState(false);
  const [payoutReference, setPayoutReference] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("bank_transfer");
  const [payoutNotes, setPayoutNotes] = useState("");

  useEffect(() => {
    if (user && isAdmin) {
      fetchPayouts();
    }
  }, [user, isAdmin]);

  const fetchPayouts = async () => {
    try {
      setLoading(true);

      // Fetch pending payouts with repair center info
      const { data: pending, error: pendingError } = await supabase
        .from("repair_center_payouts")
        .select("*")
        .eq("payout_status", "pending")
        .order("created_at", { ascending: false });

      if (pendingError) throw pendingError;

      // Fetch repair center details separately
      const centerIds = [...new Set(pending?.map(p => p.repair_center_id))];
      const { data: centers } = await supabase
        .from("Repair Center")
        .select("id, name, email")
        .in("id", centerIds);

      const centerMap = new Map(centers?.map(c => [c.id, c]));
      const pendingWithCenters = pending?.map(p => ({
        ...p,
        repair_center: centerMap.get(p.repair_center_id)
      }));

      // Fetch completed payouts
      const { data: completed, error: completedError } = await supabase
        .from("repair_center_payouts")
        .select("*")
        .eq("payout_status", "completed")
        .order("payout_date", { ascending: false })
        .limit(50);

      if (completedError) throw completedError;

      const completedCenterIds = [...new Set(completed?.map(p => p.repair_center_id))];
      const { data: completedCenters } = await supabase
        .from("Repair Center")
        .select("id, name, email")
        .in("id", completedCenterIds);

      const completedCenterMap = new Map(completedCenters?.map(c => [c.id, c]));
      const completedWithCenters = completed?.map(p => ({
        ...p,
        repair_center: completedCenterMap.get(p.repair_center_id)
      }));

      setPendingPayouts(pendingWithCenters || []);
      setCompletedPayouts(completedWithCenters || []);

      // Calculate center summaries
      const summaries: { [key: number]: CenterSummary } = {};
      pending?.forEach((payout) => {
        const centerInfo = centerMap.get(payout.repair_center_id);
        if (!summaries[payout.repair_center_id]) {
          summaries[payout.repair_center_id] = {
            repair_center_id: payout.repair_center_id,
            center_name: centerInfo?.name || "Unknown Center",
            center_email: centerInfo?.email || "",
            total_pending: 0,
            pending_count: 0,
            currency: payout.currency,
          };
        }
        summaries[payout.repair_center_id].total_pending += Number(payout.net_amount);
        summaries[payout.repair_center_id].pending_count += 1;
      });

      setCenterSummaries(Object.values(summaries));
    } catch (error) {
      console.error("Error fetching payouts:", error);
      toast.error("Failed to fetch payouts");
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayout = async () => {
    if (!selectedPayout || !payoutReference.trim()) {
      toast.error("Please provide a payout reference");
      return;
    }

    try {
      setProcessingPayout(true);

      const { error } = await supabase.functions.invoke("process-repair-center-payout", {
        body: {
          payout_id: selectedPayout.id,
          payout_reference: payoutReference,
          payout_method: payoutMethod,
          notes: payoutNotes,
        },
      });

      if (error) throw error;

      toast.success("Payout processed successfully");
      setSelectedPayout(null);
      setPayoutReference("");
      setPayoutMethod("bank_transfer");
      setPayoutNotes("");
      fetchPayouts();
    } catch (error: any) {
      console.error("Error processing payout:", error);
      toast.error(error.message || "Failed to process payout");
    } finally {
      setProcessingPayout(false);
    }
  };

  const exportToCSV = (data: PayoutRecord[], filename: string) => {
    const headers = ["Center Name", "Center Email", "Job ID", "Gross Amount", "Commission", "Net Amount", "Status", "Date", "Reference"];
    const rows = data.map((p) => [
      p.repair_center?.name || "",
      p.repair_center?.email || "",
      p.repair_job_id,
      p.gross_amount,
      p.commission_amount,
      p.net_amount,
      p.payout_status,
      p.created_at,
      p.payout_reference || "",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  };

  if (!user || !isAdmin) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Access Denied: Admin privileges required</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalPending = pendingPayouts.reduce((sum, p) => sum + Number(p.net_amount), 0);
  const totalCommission = pendingPayouts.reduce((sum, p) => sum + Number(p.commission_amount), 0);

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Payout Management</h1>
          <p className="text-muted-foreground">Manage repair center payouts and settlements</p>
        </div>
        <Button onClick={() => exportToCSV(pendingPayouts, "pending-payouts.csv")} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Pending
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pending Payouts</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPending, "NGN")}</div>
            <p className="text-xs text-muted-foreground">{pendingPayouts.length} pending transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Commission</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCommission, "NGN")}</div>
            <p className="text-xs text-muted-foreground">7.5% platform fee</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Repair Centers</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{centerSummaries.length}</div>
            <p className="text-xs text-muted-foreground">Centers with pending payouts</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pending Payouts</TabsTrigger>
          <TabsTrigger value="by-center">By Center</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Payouts</CardTitle>
              <CardDescription>Process individual payouts to repair centers</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Center</TableHead>
                    <TableHead>Job ID</TableHead>
                    <TableHead>Gross Amount</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Net Payout</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingPayouts.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{payout.repair_center?.name}</p>
                          <p className="text-sm text-muted-foreground">{payout.repair_center?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{payout.repair_job_id.slice(0, 8)}...</TableCell>
                      <TableCell>{formatCurrency(Number(payout.gross_amount), payout.currency as any)}</TableCell>
                      <TableCell className="text-green-600">{formatCurrency(Number(payout.commission_amount), payout.currency as any)}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(Number(payout.net_amount), payout.currency as any)}</TableCell>
                      <TableCell>{new Date(payout.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" onClick={() => setSelectedPayout(payout)}>
                              Process
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Process Payout</DialogTitle>
                              <DialogDescription>
                                Processing payout of {formatCurrency(Number(payout.net_amount), payout.currency as any)} to {payout.repair_center?.name}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="method">Payout Method</Label>
                                <Select value={payoutMethod} onValueChange={setPayoutMethod}>
                                  <SelectTrigger id="method">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                    <SelectItem value="paystack_transfer">Paystack Transfer</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="reference">Transaction Reference *</Label>
                                <Input
                                  id="reference"
                                  value={payoutReference}
                                  onChange={(e) => setPayoutReference(e.target.value)}
                                  placeholder="e.g., TXN123456789"
                                />
                              </div>
                              <div>
                                <Label htmlFor="notes">Notes (optional)</Label>
                                <Textarea
                                  id="notes"
                                  value={payoutNotes}
                                  onChange={(e) => setPayoutNotes(e.target.value)}
                                  placeholder="Additional notes about this payout..."
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setSelectedPayout(null)}>
                                Cancel
                              </Button>
                              <Button onClick={handleProcessPayout} disabled={processingPayout}>
                                {processingPayout && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Confirm Payout
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                  {pendingPayouts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No pending payouts
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="by-center" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payouts by Repair Center</CardTitle>
              <CardDescription>Aggregated view of pending payouts per center</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Center Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Pending Jobs</TableHead>
                    <TableHead>Total Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {centerSummaries.map((summary) => (
                    <TableRow key={summary.repair_center_id}>
                      <TableCell className="font-medium">{summary.center_name}</TableCell>
                      <TableCell>{summary.center_email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{summary.pending_count} jobs</Badge>
                      </TableCell>
                      <TableCell className="font-semibold">{formatCurrency(summary.total_pending, summary.currency as any)}</TableCell>
                    </TableRow>
                  ))}
                  {centerSummaries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No pending payouts
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Completed Payouts</CardTitle>
              <CardDescription>History of processed payouts</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Center</TableHead>
                    <TableHead>Net Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Payout Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedPayouts.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell>{payout.repair_center?.name}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(Number(payout.net_amount), payout.currency as any)}</TableCell>
                      <TableCell className="capitalize">{payout.payout_method?.replace("_", " ")}</TableCell>
                      <TableCell className="font-mono text-sm">{payout.payout_reference}</TableCell>
                      <TableCell>{payout.payout_date ? new Date(payout.payout_date).toLocaleDateString() : "-"}</TableCell>
                      <TableCell>
                        <Badge variant="default">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Completed
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {completedPayouts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No completed payouts yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PayoutManagement;
