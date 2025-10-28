import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CreditCard, CheckCircle, Clock, MapPin, Phone, Mail, Loader2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import Navigation from "@/components/Navigation";
import { Link } from "react-router-dom";

interface RepairJob {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  pickup_address: string;
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
  notes?: string;
  created_at: string;
  updated_at: string;
  repair_center: {
    name: string;
    phone: string;
    email: string;
    address: string;
  };
}

interface StatusHistory {
  id: string;
  status: string;
  timestamp: string;
  notes?: string;
}

const statusSteps = [
  { key: "requested", label: "Request Submitted", description: "Your repair request has been submitted" },
  { key: "pickup_scheduled", label: "Pickup Scheduled", description: "Pickup date and time confirmed" },
  { key: "picked_up", label: "Item Picked Up", description: "Your appliance has been collected" },
  { key: "in_repair", label: "In Repair", description: "Repair work is in progress" },
  { key: "repair_completed", label: "Repair Completed", description: "Repair work is finished" },
  { key: "returned", label: "Item Returned", description: "Your appliance has been returned" },
  { key: "completed", label: "Job Completed", description: "Service completed successfully" }
];

const statusColors = {
  requested: "bg-blue-100 text-blue-800",
  pickup_scheduled: "bg-yellow-100 text-yellow-800",
  picked_up: "bg-orange-100 text-orange-800",
  in_repair: "bg-purple-100 text-purple-800",
  repair_completed: "bg-green-100 text-green-800",
  ready_for_return: "bg-teal-100 text-teal-800",
  returned: "bg-indigo-100 text-indigo-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800"
};

const RepairJobDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [job, setJob] = useState<RepairJob | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    if (user && id) {
      fetchJobDetails();
      fetchStatusHistory();
      
      // Handle payment success/failure from URL parameters
      const payment = searchParams.get('payment');
      const reference = searchParams.get('reference');
      
      if (payment === 'success' && reference) {
        verifyPaymentStatus(reference);
      } else if (payment === 'cancelled') {
        toast({
          title: "Payment Cancelled",
          description: "You can try again when you're ready to pay.",
          variant: "default",
        });
      }
    }
  }, [user, id, searchParams]);

  const fetchJobDetails = async () => {
    try {
      // Check if user is repair center staff
      const { data: staffRecord } = await supabase
        .from("repair_center_staff")
        .select("repair_center_id")
        .eq("user_id", user?.id)
        .eq("is_active", true)
        .maybeSingle();

      // Build query
      let query = supabase
        .from("repair_jobs")
        .select(`
          *,
          repair_center:"Repair Center"(name, phone, email, address)
        `)
        .eq("id", id);

      // If not repair center staff, filter by user_id (customer view)
      // If repair center staff, RLS policy will ensure they can only see jobs for their center
      if (!staffRecord) {
        query = query.eq("user_id", user?.id);
      }

      const { data, error } = await query.single();

      if (error) throw error;
      setJob(data);
    } catch (error) {
      console.error("Error fetching job details:", error);
      toast({
        title: "Error",
        description: "Failed to fetch job details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStatusHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("job_status_history")
        .select("*")
        .eq("repair_job_id", id)
        .order("timestamp", { ascending: true });

      if (error) throw error;
      setStatusHistory(data || []);
    } catch (error) {
      console.error("Error fetching status history:", error);
    }
  };

  const verifyPaymentStatus = async (reference: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("verify-payment-status", {
        body: { reference }
      });

      if (error) throw error;

      if (data.payment_status === 'completed') {
        toast({
          title: "Payment Successful!",
          description: "Your payment has been processed and the repair is now complete.",
        });
        
        // Refresh job details to get updated status
        fetchJobDetails();
      } else if (data.payment_status === 'failed') {
        toast({
          title: "Payment Failed",
          description: "There was an issue processing your payment. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error verifying payment:", error);
      toast({
        title: "Error",
        description: "Failed to verify payment status",
        variant: "destructive",
      });
    }
  };

  const handlePayment = async () => {
    if (!job?.final_cost) return;
    
    setPaymentLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-repair-payment", {
        body: {
          repair_job_id: job.id,
          amount: job.final_cost
        }
      });

      if (error) throw error;

      if (data.url) {
        // Redirect to Paystack payment page
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
      setPaymentLoading(false);
    }
  };

  const confirmCompletion = async () => {
    if (!job) return;

    try {
      const { data, error } = await supabase.functions.invoke("update-job-status", {
        body: {
          repair_job_id: job.id,
          status: "completed",
          notes: "Customer confirmed repair completion"
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Repair completion confirmed!",
      });

      setJob({ ...job, job_status: "completed", customer_confirmed: true });
    } catch (error) {
      console.error("Error confirming completion:", error);
      toast({
        title: "Error",
        description: "Failed to confirm completion",
        variant: "destructive",
      });
    }
  };

  const getProgressPercentage = () => {
    if (!job) return 0;
    const currentStepIndex = statusSteps.findIndex(step => step.key === job.job_status);
    return currentStepIndex >= 0 ? ((currentStepIndex + 1) / statusSteps.length) * 100 : 0;
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Repair job not found</h1>
            <Link to="/repair-jobs">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Repair Jobs
              </Button>
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
        <div className="mb-6">
          <Link to="/repair-jobs">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Repair Jobs
            </Button>
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Overview */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl">
                      {job.appliance_type} Repair
                    </CardTitle>
                    <p className="text-muted-foreground">
                      {job.appliance_brand} {job.appliance_model}
                    </p>
                  </div>
                  <Badge className={statusColors[job.job_status as keyof typeof statusColors]}>
                    {job.job_status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Issue Description</h4>
                    <p className="text-muted-foreground">{job.issue_description}</p>
                  </div>
                  
                  {job.notes && (
                    <div>
                      <h4 className="font-medium mb-2">Notes</h4>
                      <p className="text-muted-foreground">{job.notes}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-1">Submitted</h4>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(job.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                    {job.completion_date && (
                      <div>
                        <h4 className="font-medium mb-1">Completed</h4>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(job.completion_date), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Progress Tracking */}
            <Card>
              <CardHeader>
                <CardTitle>Repair Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Progress</span>
                      <span>{Math.round(getProgressPercentage())}%</span>
                    </div>
                    <Progress value={getProgressPercentage()} className="h-2" />
                  </div>

                  <div className="space-y-3">
                    {statusSteps.map((step, index) => {
                      const isCompleted = statusSteps.findIndex(s => s.key === job.job_status) >= index;
                      const isCurrent = step.key === job.job_status;
                      
                      return (
                        <div
                          key={step.key}
                          className={`flex items-center gap-3 p-3 rounded-lg border ${
                            isCurrent ? 'bg-primary/5 border-primary/20' : 
                            isCompleted ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                            isCurrent ? 'bg-primary text-primary-foreground' :
                            isCompleted ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
                          }`}>
                            {isCompleted ? '✓' : index + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{step.label}</p>
                            <p className="text-sm text-muted-foreground">{step.description}</p>
                          </div>
                          {isCurrent && <Clock className="w-4 h-4 text-primary" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{job.customer_email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{job.customer_phone}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <span className="text-sm">{job.pickup_address}</span>
                </div>
              </CardContent>
            </Card>

            {/* Repair Center */}
            <Card>
              <CardHeader>
                <CardTitle>Repair Center</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-medium">{job.repair_center?.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{job.repair_center?.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{job.repair_center?.email}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <span className="text-sm">{job.repair_center?.address}</span>
                </div>
              </CardContent>
            </Card>

            {/* Cost Information */}
            {(job.estimated_cost || job.final_cost) && (
              <Card>
                <CardHeader>
                  <CardTitle>Cost Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {job.estimated_cost && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Estimated Cost</span>
                      <span className="font-medium">₦{job.estimated_cost.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {job.final_cost && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Final Cost</span>
                        <span className="font-medium">₦{job.final_cost.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                       {job.app_commission && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Service Fee (7.5%)</span>
                          <span className="font-medium">₦{job.app_commission.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {job.final_cost && job.job_status === "repair_completed" && (
                  <Button 
                    className="w-full"
                    onClick={handlePayment}
                    disabled={paymentLoading}
                  >
                    {paymentLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CreditCard className="w-4 h-4 mr-2" />
                    )}
                    {paymentLoading ? "Processing..." : `Pay $${job.final_cost.toFixed(2)}`}
                  </Button>
                )}

                {/* Payment Status Indicators */}
                {searchParams.get('payment') === 'success' && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-800">Payment completed successfully!</span>
                  </div>
                )}

                {searchParams.get('payment') === 'cancelled' && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm text-yellow-800">Payment was cancelled. You can try again anytime.</span>
                  </div>
                )}

                {job.job_status === "returned" && !job.customer_confirmed && (
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={confirmCompletion}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirm Completion
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RepairJobDetail;