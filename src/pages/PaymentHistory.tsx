import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/Navigation";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CreditCard, ExternalLink, CheckCircle, XCircle, Clock, AlertCircle, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface Payment {
  id: string;
  amount: number;
  currency: string;
  payment_status: string;
  payment_date: string | null;
  payment_reference: string | null;
  payment_transaction_id: string | null;
  payment_provider: string | null;
  payment_type: string;
  created_at: string;
  repair_job: {
    id: string;
    appliance_type: string;
    appliance_brand: string | null;
    appliance_model: string | null;
    job_status: string;
    repair_center: {
      name: string;
    };
  };
}

const statusConfig = {
  completed: {
    label: "Completed",
    icon: CheckCircle,
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    iconColor: "text-green-600 dark:text-green-400"
  },
  pending: {
    label: "Pending",
    icon: Clock,
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    iconColor: "text-amber-600 dark:text-amber-400"
  },
  processing: {
    label: "Processing",
    icon: AlertCircle,
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    iconColor: "text-blue-600 dark:text-blue-400"
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    iconColor: "text-red-600 dark:text-red-400"
  },
  refunded: {
    label: "Refunded",
    icon: AlertCircle,
    className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    iconColor: "text-purple-600 dark:text-purple-400"
  }
};

const PaymentHistory = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["payment-history", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select(`
          *,
          repair_job:repair_jobs(
            id,
            appliance_type,
            appliance_brand,
            appliance_model,
            job_status,
            repair_center:"Repair Center"(name)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Payment[];
    },
    enabled: !!user?.id,
  });

  const handleDownloadReceipt = async (paymentId: string, reference: string | null) => {
    setDownloadingId(paymentId);
    try {
      const { data, error } = await supabase.functions.invoke("generate-payment-receipt", {
        body: { payment_id: paymentId },
      });

      if (error) throw error;

      // Create a blob from the response
      const blob = new Blob([data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `receipt-${reference || paymentId.substring(0, 8)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Receipt downloaded successfully",
      });
    } catch (error) {
      console.error("Error downloading receipt:", error);
      toast({
        title: "Error",
        description: "Failed to download receipt",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Please sign in to view your payment history</h1>
            <Link to="/auth">
              <Button>Sign In</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Payment History</h1>
          <p className="text-muted-foreground">View all your payment transactions and details</p>
        </div>

        {payments.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <CreditCard className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No payments found</h3>
              <p className="text-muted-foreground mb-4">
                You haven't made any payments yet.
              </p>
              <Link to="/repair-jobs">
                <Button>View Repair Jobs</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {payments.map((payment) => {
              const status = statusConfig[payment.payment_status as keyof typeof statusConfig] || statusConfig.pending;
              const StatusIcon = status.icon;

              return (
                <Card key={payment.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <CreditCard className="w-5 h-5 text-primary" />
                          {payment.repair_job?.appliance_type} Repair Payment
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {payment.repair_job?.appliance_brand} {payment.repair_job?.appliance_model} • 
                          {payment.repair_job?.repair_center?.name}
                        </CardDescription>
                      </div>
                      <Badge className={status.className}>
                        <StatusIcon className={`w-3 h-3 mr-1 ${status.iconColor}`} />
                        {status.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Amount</h4>
                        <p className="text-2xl font-bold text-primary">
                          ₦{payment.amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Payment Date</h4>
                        <p className="text-sm">
                          {payment.payment_date 
                            ? format(new Date(payment.payment_date), "MMMM d, yyyy 'at' h:mm a")
                            : format(new Date(payment.created_at), "MMMM d, yyyy 'at' h:mm a")
                          }
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                      {payment.payment_reference && (
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Payment Reference</h4>
                          <p className="text-sm font-mono bg-muted px-2 py-1 rounded">
                            {payment.payment_reference}
                          </p>
                        </div>
                      )}
                      {payment.payment_transaction_id && (
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Transaction ID</h4>
                          <p className="text-sm font-mono bg-muted px-2 py-1 rounded">
                            {payment.payment_transaction_id}
                          </p>
                        </div>
                      )}
                      {payment.payment_provider && (
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Payment Provider</h4>
                          <p className="text-sm capitalize">
                            {payment.payment_provider}
                          </p>
                        </div>
                      )}
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Payment Type</h4>
                        <p className="text-sm capitalize">
                          {payment.payment_type.replace('_', ' ')}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4 pt-4 border-t">
                      {payment.payment_status === 'completed' && (
                        <Button 
                          variant="default" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => handleDownloadReceipt(payment.id, payment.payment_reference)}
                          disabled={downloadingId === payment.id}
                        >
                          {downloadingId === payment.id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4 mr-2" />
                              Download Receipt
                            </>
                          )}
                        </Button>
                      )}
                      <Link to={`/repair-jobs/${payment.repair_job?.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View Repair Job
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentHistory;
