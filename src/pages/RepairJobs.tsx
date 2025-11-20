import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Eye, CreditCard, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { format, differenceInHours } from "date-fns";
import Navigation from "@/components/Navigation";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { QuoteReviewCard } from "@/components/QuoteReviewCard";

interface RepairJob {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  appliance_type: string;
  appliance_brand?: string;
  appliance_model?: string;
  issue_description: string;
  estimated_cost?: number;
  final_cost?: number;
  app_commission?: number;
  job_status: string;
  pickup_date?: string;
  completion_date?: string;
  customer_confirmed: boolean;
  created_at: string;
  quoted_cost?: number;
  quote_notes?: string;
  quote_response_deadline?: string;
  ai_diagnosis_summary?: string;
  diagnostic_attachments?: any;
  repair_center: {
    name: string;
    phone: string;
    address: string;
  };
}

const statusColors = {
  requested: "bg-blue-100 text-blue-800",
  quote_requested: "bg-amber-100 text-amber-800",
  quote_pending_review: "bg-amber-100 text-amber-800",
  quote_accepted: "bg-green-100 text-green-800",
  quote_rejected: "bg-red-100 text-red-800",
  quote_negotiating: "bg-purple-100 text-purple-800",
  pickup_scheduled: "bg-yellow-100 text-yellow-800",
  picked_up: "bg-orange-100 text-orange-800",
  in_repair: "bg-purple-100 text-purple-800",
  repair_completed: "bg-green-100 text-green-800",
  cost_adjustment_pending: "bg-amber-100 text-amber-800",
  ready_for_return: "bg-teal-100 text-teal-800",
  returned: "bg-indigo-100 text-indigo-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800"
};

const statusLabels = {
  requested: "Requested",
  quote_requested: "Quote Requested",
  quote_pending_review: "Quote Pending Review",
  quote_accepted: "Quote Accepted",
  quote_rejected: "Quote Rejected",
  quote_negotiating: "Negotiating",
  pickup_scheduled: "Pickup Scheduled",
  picked_up: "Picked Up",
  in_repair: "In Repair",
  repair_completed: "Repair Completed",
  cost_adjustment_pending: "Cost Adjustment Pending",
  ready_for_return: "Ready for Return",
  returned: "Returned",
  completed: "Completed",
  cancelled: "Cancelled"
};

const RepairJobs = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [paymentLoadingId, setPaymentLoadingId] = useState<string | null>(null);

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["repair-jobs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("repair_jobs")
        .select(`
          *,
          repair_center:"Repair Center"(name, phone, address)
        `)
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    refetchOnMount: true,
    staleTime: 0,
  });

  const handlePayment = async (jobId: string, amount: number) => {
    setPaymentLoadingId(jobId);
    try {
      const { data, error } = await supabase.functions.invoke("create-repair-payment", {
        body: {
          repair_job_id: jobId,
          amount: amount
        }
      });

      if (error) throw error;

      if (data.url) {
        window.location.href = data.url;
        toast({
          title: "Redirecting to Payment",
          description: "You'll be redirected to Paystack to complete your payment securely.",
        });
      }
    } catch (error) {
      console.error("Error creating payment:", error);
      toast({
        title: "Error",
        description: "Failed to create payment session",
        variant: "destructive",
      });
    } finally {
      setPaymentLoadingId(null);
    }
  };

  const isPaymentUrgent = (deadline?: string) => {
    if (!deadline) return false;
    const hoursUntilDeadline = differenceInHours(new Date(deadline), new Date());
    return hoursUntilDeadline <= 48 && hoursUntilDeadline > 0;
  };

  const isPaymentCritical = (deadline?: string) => {
    if (!deadline) return false;
    const hoursUntilDeadline = differenceInHours(new Date(deadline), new Date());
    return hoursUntilDeadline <= 24 && hoursUntilDeadline > 0;
  };

  const confirmCompletion = async (jobId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("update-job-status", {
        body: {
          repair_job_id: jobId,
          status: "completed",
          notes: "Customer confirmed repair completion"
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Repair completion confirmed!",
      });

      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["repair-jobs", user?.id] });
    } catch (error) {
      console.error("Error confirming completion:", error);
      toast({
        title: "Error",
        description: "Failed to confirm completion",
        variant: "destructive",
      });
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
            <h1 className="text-2xl font-bold mb-4">Please sign in to view your repair jobs</h1>
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Repair Jobs</h1>
            <p className="text-muted-foreground">Track your appliance repair requests</p>
          </div>
          <Link to="/pickup-request">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Repair Request
            </Button>
          </Link>
        </div>

        {jobs.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <h3 className="text-lg font-medium mb-2">No repair jobs found</h3>
              <p className="text-muted-foreground mb-4">
                You haven't submitted any repair requests yet.
              </p>
              <Link to="/pickup-request">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Submit Your First Request
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Pending Quotes Section */}
            {jobs.filter(job => job.job_status === 'quote_pending_review').length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <h2 className="text-2xl font-bold">Quotes Awaiting Your Response</h2>
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                    {jobs.filter(job => job.job_status === 'quote_pending_review').length}
                  </Badge>
                </div>
                <div className="grid gap-6">
                  {jobs
                    .filter(job => job.job_status === 'quote_pending_review')
                    .map((job) => (
                      <QuoteReviewCard
                        key={job.id}
                        repairJob={job}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* Active Jobs Section */}
            {jobs.filter(job => job.job_status !== 'quote_pending_review').length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Your Repair Jobs</h2>
                <div className="grid gap-6">
                  {jobs.filter(job => job.job_status !== 'quote_pending_review').map((job) => (
              <Card key={job.id} className="overflow-hidden">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {job.appliance_type} Repair
                      </CardTitle>
                      <CardDescription>
                        {job.appliance_brand} {job.appliance_model} • 
                        Submitted {format(new Date(job.created_at), "MMM d, yyyy")}
                      </CardDescription>
                    </div>
                    <Badge className={statusColors[job.job_status as keyof typeof statusColors]}>
                      {statusLabels[job.job_status as keyof typeof statusLabels]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="font-medium mb-2">Repair Center</h4>
                      <p className="text-sm text-muted-foreground">
                        {job.repair_center?.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {job.repair_center?.phone}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Issue Description</h4>
                      <p className="text-sm text-muted-foreground">
                        {job.issue_description}
                      </p>
                    </div>
                  </div>

                  {job.estimated_cost && (
                    <div className="mb-4">
                      <h4 className="font-medium mb-2">Estimated Cost</h4>
                      <p className="text-lg font-semibold text-primary">
                        ₦{job.estimated_cost.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  )}

                  {job.final_cost && (
                    <div className="mb-4">
                      <h4 className="font-medium mb-2">Final Cost</h4>
                      <p className="text-lg font-semibold text-primary">
                        ₦{job.final_cost.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      {job.app_commission && (
                        <p className="text-sm text-muted-foreground">
                          Service fee: ₦{job.app_commission.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (7.5%)
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* Payment Required Warning */}
                  {job.job_status === 'repair_completed' && job.final_cost && !job.customer_confirmed && (
                    <div className={`mb-4 p-4 rounded-lg border-2 ${
                      isPaymentCritical(job.payment_deadline) 
                        ? 'bg-red-50 border-red-300' 
                        : isPaymentUrgent(job.payment_deadline)
                        ? 'bg-amber-50 border-amber-300'
                        : 'bg-amber-50 border-amber-200'
                    }`}>
                      <div className="flex items-start gap-3">
                        <AlertCircle className={`w-5 h-5 mt-0.5 ${
                          isPaymentCritical(job.payment_deadline) ? 'text-red-600' : 'text-amber-600'
                        }`} />
                        <div>
                          <p className={`text-sm font-semibold ${
                            isPaymentCritical(job.payment_deadline) ? 'text-red-900' : 'text-amber-900'
                          }`}>
                            {isPaymentCritical(job.payment_deadline) ? '⚠️ URGENT: Payment Required' : 'Payment Required'}
                          </p>
                          <p className={`text-xs mt-1 ${
                            isPaymentCritical(job.payment_deadline) ? 'text-red-700' : 'text-amber-700'
                          }`}>
                            Your repair is complete! Please process payment to have your item returned.
                            {job.payment_deadline && (
                              <>
                                {' '}Payment due by {format(new Date(job.payment_deadline), "MMMM d, yyyy 'at' h:mm a")}.
                                {isPaymentCritical(job.payment_deadline) && (
                                  <span className="font-bold text-red-800"> (Less than 24 hours remaining!)</span>
                                )}
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-2 mt-4">
                    {/* Payment Button - Priority Action */}
                    {job.final_cost && job.job_status === "repair_completed" && !job.customer_confirmed && (
                      <Button 
                        className={`w-full text-base font-semibold ${
                          isPaymentCritical(job.payment_deadline)
                            ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 animate-pulse'
                            : isPaymentUrgent(job.payment_deadline)
                            ? 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800'
                            : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
                        }`}
                        size="lg"
                        onClick={() => handlePayment(job.id, job.final_cost!)}
                        disabled={paymentLoadingId === job.id}
                      >
                        {paymentLoadingId === job.id ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-5 h-5 mr-2" />
                            Pay ₦{job.final_cost.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Now
                          </>
                        )}
                      </Button>
                    )}

                    {/* Secondary Actions */}
                    <div className="flex gap-2">
                      <Link to={`/repair-jobs/${job.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </Link>

                      {job.job_status === "returned" && !job.customer_confirmed && (
                        <Button 
                          size="sm"
                          onClick={() => confirmCompletion(job.id)}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Confirm Completion
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RepairJobs;