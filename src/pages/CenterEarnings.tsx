import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, DollarSign, TrendingUp, Clock, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";
import BankAccountManager from "@/components/BankAccountManager";

interface PayoutRecord {
  id: string;
  repair_job_id: string;
  gross_amount: number;
  commission_amount: number;
  net_amount: number;
  currency: string;
  payout_status: string;
  payout_method: string | null;
  payout_reference: string | null;
  payout_date: string | null;
  created_at: string;
  notes: string | null;
}

interface EarningsSummary {
  total_gross: number;
  total_commission: number;
  total_net: number;
  pending_count: number;
  completed_count: number;
  currency: string;
}

const CenterEarnings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [repairCenterId, setRepairCenterId] = useState<number | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [summary, setSummary] = useState<EarningsSummary>({
    total_gross: 0,
    total_commission: 0,
    total_net: 0,
    pending_count: 0,
    completed_count: 0,
    currency: "NGN",
  });

  useEffect(() => {
    if (user) {
      fetchCenterInfo();
    }
  }, [user]);

  useEffect(() => {
    if (repairCenterId) {
      fetchPayouts();
    }
  }, [repairCenterId]);

  const fetchCenterInfo = async () => {
    try {
      const { data: staffData, error: staffError } = await supabase
        .from("repair_center_staff")
        .select("repair_center_id")
        .eq("user_id", user?.id)
        .eq("is_active", true)
        .single();

      if (staffError) throw staffError;
      
      if (staffData) {
        setRepairCenterId(staffData.repair_center_id);
        
        // Fetch business name
        const { data: centerData, error: centerError } = await supabase
          .from("Repair Center")
          .select("name")
          .eq("id", staffData.repair_center_id)
          .single();

        if (centerError) throw centerError;
        if (centerData) {
          setBusinessName(centerData.name);
        }
      }
    } catch (error) {
      console.error("Error fetching center info:", error);
      toast.error("Failed to fetch repair center information");
    }
  };

  const fetchPayouts = async () => {
    if (!repairCenterId) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("repair_center_payouts")
        .select("*")
        .eq("repair_center_id", repairCenterId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setPayouts(data || []);

      // Calculate summary
      const summaryData: EarningsSummary = {
        total_gross: 0,
        total_commission: 0,
        total_net: 0,
        pending_count: 0,
        completed_count: 0,
        currency: data?.[0]?.currency || "NGN",
      };

      data?.forEach((payout) => {
        summaryData.total_gross += Number(payout.gross_amount);
        summaryData.total_commission += Number(payout.commission_amount);
        summaryData.total_net += Number(payout.net_amount);
        if (payout.payout_status === "pending") {
          summaryData.pending_count++;
        } else if (payout.payout_status === "completed") {
          summaryData.completed_count++;
        }
      });

      setSummary(summaryData);
    } catch (error) {
      console.error("Error fetching payouts:", error);
      toast.error("Failed to fetch earnings data");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Please log in to view earnings</p>
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

  if (!repairCenterId) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">You are not associated with any repair center</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingPayouts = payouts.filter((p) => p.payout_status === "pending");
  const completedPayouts = payouts.filter((p) => p.payout_status === "completed");
  const pendingAmount = pendingPayouts.reduce((sum, p) => sum + Number(p.net_amount), 0);

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Earnings & Payouts</h1>
        <p className="text-muted-foreground">Track your repair center earnings and payout history</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.total_net, summary.currency as any)}</div>
            <p className="text-xs text-muted-foreground">After platform commission</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payout</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(pendingAmount, summary.currency as any)}</div>
            <p className="text-xs text-muted-foreground">{summary.pending_count} pending transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Commission</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.total_commission, summary.currency as any)}</div>
            <p className="text-xs text-muted-foreground">7.5% platform fee</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Payouts</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.completed_count}</div>
            <p className="text-xs text-muted-foreground">Successful transfers</p>
          </CardContent>
        </Card>
      </div>

      {/* Bank Account Management */}
      {repairCenterId && businessName && (
        <BankAccountManager 
          repairCenterId={repairCenterId} 
          businessName={businessName}
        />
      )}

      {/* Payout Schedule Info */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-lg">Payout Schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">
            <strong>Processing Time:</strong> Payouts are processed weekly, every Friday
          </p>
          <p className="text-sm">
            <strong>Transfer Time:</strong> Allow 2-3 business days for bank transfers to complete
          </p>
          <p className="text-sm">
            <strong>Commission:</strong> 7.5% platform fee is deducted from each transaction
          </p>
        </CardContent>
      </Card>

      {/* Pending Payouts */}
      {pendingPayouts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Payouts</CardTitle>
            <CardDescription>These will be processed in the next payout cycle</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Gross Amount</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Net Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingPayouts.map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell className="font-mono text-sm">{payout.repair_job_id.slice(0, 8)}...</TableCell>
                    <TableCell>{new Date(payout.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>{formatCurrency(Number(payout.gross_amount), payout.currency as any)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatCurrency(Number(payout.commission_amount), payout.currency as any)}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(Number(payout.net_amount), payout.currency as any)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        <Clock className="mr-1 h-3 w-3" />
                        Pending
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Completed Payouts */}
      <Card>
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
          <CardDescription>Completed payouts to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payout Date</TableHead>
                <TableHead>Job ID</TableHead>
                <TableHead>Net Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {completedPayouts.map((payout) => (
                <TableRow key={payout.id}>
                  <TableCell>{payout.payout_date ? new Date(payout.payout_date).toLocaleDateString() : "-"}</TableCell>
                  <TableCell className="font-mono text-sm">{payout.repair_job_id.slice(0, 8)}...</TableCell>
                  <TableCell className="font-semibold">{formatCurrency(Number(payout.net_amount), payout.currency as any)}</TableCell>
                  <TableCell className="capitalize">{payout.payout_method?.replace("_", " ") || "-"}</TableCell>
                  <TableCell className="font-mono text-sm">{payout.payout_reference || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="default">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Paid
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
    </div>
  );
};

export default CenterEarnings;
