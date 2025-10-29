import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import { useQuery } from "@tanstack/react-query";
import { Wrench, CheckCircle, Clock, FileText, Plus, AlertCircle, MessageCircle, CreditCard, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useConversationNotifications } from "@/hooks/useConversationNotifications";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { differenceInHours } from "date-fns";

const CustomerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { totalUnread } = useConversationNotifications(undefined, user?.id);
  const { toast } = useToast();

  const { data: repairJobs, isLoading } = useQuery({
    queryKey: ["customer-repair-jobs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("repair_jobs")
        .select(`
          *,
          repair_center:"Repair Center"!repair_center_id(*)
        `)
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    refetchOnMount: true,
    staleTime: 0,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'in_repair':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'requested':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'in_repair':
        return <Wrench className="w-4 h-4" />;
      case 'requested':
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const [paymentLoadingId, setPaymentLoadingId] = useState<string | null>(null);

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

  const pendingQuotes = repairJobs?.filter(job => job.job_status === 'quote_pending_review') || [];

  const getQuoteUrgency = (deadline?: string) => {
    if (!deadline) return 'normal';
    const hoursLeft = differenceInHours(new Date(deadline), new Date());
    if (hoursLeft <= 12) return 'critical';
    if (hoursLeft <= 24) return 'urgent';
    return 'normal';
  };

  const statsData = repairJobs ? {
    total: repairJobs.length,
    completed: repairJobs.filter(job => job.job_status === 'completed').length,
    inProgress: repairJobs.filter(job => job.job_status === 'in_repair').length,
    pending: repairJobs.filter(job => job.job_status === 'requested').length,
  } : { total: 0, completed: 0, inProgress: 0, pending: 0 };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Welcome back!</h1>
            <p className="text-muted-foreground mt-2">Manage your appliance repairs and track their progress</p>
          </div>
          <Link to="/diagnostic">
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Repair Request
            </Button>
          </Link>
        </div>

        {/* Quote Alert Banner */}
        {pendingQuotes.length > 0 && (
          <Card className="border-2 border-amber-500/50 bg-amber-50/50">
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-amber-500/10">
                  <AlertCircle className="h-6 w-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl text-amber-900 mb-2">
                    {pendingQuotes.length === 1 ? 'Quote Awaiting Your Response' : `${pendingQuotes.length} Quotes Awaiting Response`}
                  </CardTitle>
                  <CardDescription className="text-amber-700">
                    {pendingQuotes.some(q => getQuoteUrgency(q.quote_response_deadline) === 'critical') 
                      ? '⚠️ URGENT: Some quotes expire in less than 12 hours!'
                      : 'Review and respond to your repair quotes before they expire.'}
                  </CardDescription>
                </div>
                <Link to="/repair-jobs">
                  <Button className="bg-amber-600 hover:bg-amber-700">
                    Review {pendingQuotes.length === 1 ? 'Quote' : 'Quotes'}
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pendingQuotes.slice(0, 2).map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                    <div>
                      <p className="font-medium text-sm">{job.appliance_type} - {job.repair_center?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Quote: ₦{job.quoted_cost?.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                        {job.quote_response_deadline && (
                          <span className={getQuoteUrgency(job.quote_response_deadline) === 'critical' ? 'text-red-600 font-bold ml-2' : 'ml-2'}>
                            • Expires {format(new Date(job.quote_response_deadline), "MMM d, h:mm a")}
                          </span>
                        )}
                      </p>
                    </div>
                    <Badge className={
                      getQuoteUrgency(job.quote_response_deadline) === 'critical'
                        ? 'bg-red-500 text-white'
                        : getQuoteUrgency(job.quote_response_deadline) === 'urgent'
                        ? 'bg-amber-500 text-white'
                        : 'bg-amber-200 text-amber-900'
                    }>
                      {getQuoteUrgency(job.quote_response_deadline) === 'critical' ? 'URGENT' : 'Pending'}
                    </Badge>
                  </div>
                ))}
                {pendingQuotes.length > 2 && (
                  <p className="text-sm text-center text-muted-foreground pt-2">
                    +{pendingQuotes.length - 2} more {pendingQuotes.length - 2 === 1 ? 'quote' : 'quotes'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Repairs</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsData.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{statsData.completed}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Wrench className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">{statsData.inProgress}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{statsData.pending}</div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Repair Jobs */}
        <Card>
          <CardHeader>
            <CardTitle>Your Repair Jobs</CardTitle>
            <CardDescription>Track the status of your appliance repairs</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : repairJobs && repairJobs.length > 0 ? (
              <div className="space-y-4">
                {repairJobs.map((job) => (
                  <Link
                    key={job.id}
                    to={`/repair-jobs/${job.id}`}
                    className="block p-4 border rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{job.appliance_type} - {job.appliance_brand}</h3>
                          <Badge className={getStatusColor(job.job_status)}>
                            {getStatusIcon(job.job_status)}
                            <span className="ml-1 capitalize">{job.job_status.replace('_', ' ')}</span>
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{job.issue_description}</p>
                        {job.estimated_cost && (
                          <p className="text-sm font-medium">Estimated Cost: ₦{job.estimated_cost.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(job.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    
                    {/* Payment Required Card - High Priority CTA */}
                    {job.job_status === 'repair_completed' && job.final_cost && !job.customer_confirmed && (
                      <div 
                        className={`mt-4 p-4 rounded-lg border-2 ${
                          isPaymentCritical(job.payment_deadline) 
                            ? 'bg-red-50 border-red-300 animate-pulse' 
                            : isPaymentUrgent(job.payment_deadline)
                            ? 'bg-amber-50 border-amber-300'
                            : 'bg-amber-50 border-amber-200'
                        }`}
                        onClick={(e) => e.preventDefault()}
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <CreditCard className={`w-5 h-5 mt-0.5 ${
                            isPaymentCritical(job.payment_deadline) ? 'text-red-600' : 'text-amber-600'
                          }`} />
                          <div className="flex-1">
                            <p className={`font-semibold ${
                              isPaymentCritical(job.payment_deadline) ? 'text-red-900' : 'text-amber-900'
                            }`}>
                              {isPaymentCritical(job.payment_deadline) 
                                ? '⚠️ URGENT: Payment Required' 
                                : 'Payment Required'}
                            </p>
                            <p className={`text-sm mt-1 ${
                              isPaymentCritical(job.payment_deadline) ? 'text-red-700' : 'text-amber-700'
                            }`}>
                              Your repair is complete! Pay now to receive your item.
                              {job.payment_deadline && (
                                <span className="font-medium">
                                  {' • Due: '}
                                  {format(new Date(job.payment_deadline), "MMM d, yyyy 'at' h:mm a")}
                                  {isPaymentCritical(job.payment_deadline) && (
                                    <span className="text-red-800 font-bold"> (Less than 24 hours!)</span>
                                  )}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <Button 
                          className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold shadow-lg"
                          size="lg"
                          onClick={(e) => {
                            e.preventDefault();
                            handlePayment(job.id, job.final_cost);
                          }}
                          disabled={paymentLoadingId === job.id}
                        >
                          {paymentLoadingId === job.id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <CreditCard className="w-4 h-4 mr-2" />
                              Pay ₦{job.final_cost.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Now
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Wrench className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No repair jobs yet</p>
                <Link to="/diagnostic">
                  <Button className="mt-4">Create Your First Repair Request</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CustomerDashboard;