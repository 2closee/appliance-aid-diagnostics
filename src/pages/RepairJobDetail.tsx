import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CreditCard, CheckCircle, Clock, MapPin, Phone, Mail, Loader2, AlertCircle, MessageCircle, Timer, Star, Truck } from "lucide-react";
import { format, differenceInHours } from "date-fns";
import Navigation from "@/components/Navigation";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { DeliveryTracking } from "@/components/DeliveryTracking";
import { useDeliveryActions } from "@/hooks/useDeliveryActions";

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
  payment_deadline?: string;
  customer_confirmed: boolean;
  device_returned_confirmed: boolean;
  device_returned_confirmed_at?: string;
  repair_satisfaction_confirmed: boolean;
  repair_satisfaction_confirmed_at?: string;
  satisfaction_rating?: number;
  satisfaction_feedback?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  repair_center: {
    name: string;
    phone: string;
    email: string;
    address: string;
    logo_url?: string | null;
    cover_image_url?: string | null;
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
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const { createDelivery, isCreatingDelivery } = useDeliveryActions();
  const [job, setJob] = useState<RepairJob | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
  const [deliveryRequests, setDeliveryRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [deviceReturnConfirmed, setDeviceReturnConfirmed] = useState(false);
  const [satisfactionConfirmed, setSatisfactionConfirmed] = useState(false);
  const [showSatisfactionDialog, setShowSatisfactionDialog] = useState(false);
  const [satisfactionRating, setSatisfactionRating] = useState<number>(0);
  const [satisfactionFeedback, setSatisfactionFeedback] = useState("");
  const [confirmationLoading, setConfirmationLoading] = useState(false);

  // Check if conversation exists for this job
  const { data: conversation } = useQuery({
    queryKey: ["job-conversation", id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select(`id, repair_center:"Repair Center"!repair_center_id(id, name)`)
        .eq("repair_job_id", id)
        .eq("customer_id", user?.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!id,
  });

  useEffect(() => {
    if (user && id) {
      fetchJobDetails();
      fetchStatusHistory();
      fetchDeliveryRequests();
      
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
          repair_center:"Repair Center"(name, phone, email, address, logo_url, cover_image_url)
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
      setDeviceReturnConfirmed(data.device_returned_confirmed || false);
      setSatisfactionConfirmed(data.repair_satisfaction_confirmed || false);
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

  const fetchDeliveryRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("delivery_requests")
        .select("*")
        .eq("repair_job_id", id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDeliveryRequests(data || []);
    } catch (error) {
      console.error("Error fetching delivery requests:", error);
    }
  };

  const handleScheduleDelivery = async (deliveryType: 'pickup' | 'return') => {
    if (!job) return;

    try {
      await createDelivery({
        repair_job_id: job.id,
        delivery_type: deliveryType,
        notes: `${deliveryType === 'pickup' ? 'Pickup' : 'Return'} delivery for ${job.appliance_type} repair`
      });
      
      await fetchDeliveryRequests();
    } catch (error) {
      // Error handling is done in the hook
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
        await fetchJobDetails();
        
        // Clean up URL parameters after successful payment
        navigate(`/repair-jobs/${id}`, { replace: true });
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

  const handleDeviceReturnConfirmation = async () => {
    if (!job) return;

    setConfirmationLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("confirm-job-completion", {
        body: {
          repair_job_id: job.id,
          confirmation_type: "device_returned"
        }
      });

      if (error) throw error;

      toast({
        title: "Device Return Confirmed",
        description: "Thank you for confirming you received your device.",
      });

      setDeviceReturnConfirmed(true);
      await fetchJobDetails();
    } catch (error) {
      console.error("Error confirming device return:", error);
      toast({
        title: "Error",
        description: "Failed to confirm device return",
        variant: "destructive",
      });
    } finally {
      setConfirmationLoading(false);
    }
  };

  const handleSatisfactionSubmit = async () => {
    if (!job || satisfactionRating === 0) return;

    setConfirmationLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("confirm-job-completion", {
        body: {
          repair_job_id: job.id,
          confirmation_type: "repair_satisfaction",
          satisfaction_rating: satisfactionRating,
          satisfaction_feedback: satisfactionFeedback
        }
      });

      if (error) throw error;

      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback!",
      });

      setSatisfactionConfirmed(true);
      setShowSatisfactionDialog(false);
      await fetchJobDetails();
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({
        title: "Error",
        description: "Failed to submit feedback",
        variant: "destructive",
      });
    } finally {
      setConfirmationLoading(false);
    }
  };

  const getProgressPercentage = () => {
    if (!job) return 0;
    const currentStepIndex = statusSteps.findIndex(step => step.key === job.job_status);
    return currentStepIndex >= 0 ? ((currentStepIndex + 1) / statusSteps.length) * 100 : 0;
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

  const getTimeRemaining = (deadline?: string) => {
    if (!deadline) return null;
    const hours = differenceInHours(new Date(deadline), new Date());
    if (hours <= 0) return "Overdue";
    if (hours < 24) return `${hours} hours remaining`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} remaining`;
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

            {/* Delivery Tracking */}
            {deliveryRequests.length > 0 && deliveryRequests.map((delivery) => (
              <DeliveryTracking 
                key={delivery.id}
                deliveryRequest={delivery}
                onCancel={fetchDeliveryRequests}
              />
            ))}

            {/* Schedule Delivery Button */}
            {job.job_status === 'quote_accepted' && deliveryRequests.filter(d => d.delivery_type === 'pickup').length === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Schedule Pickup Delivery
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Schedule a pickup delivery to have your appliance collected.
                  </p>
                  <Button 
                    onClick={() => handleScheduleDelivery('pickup')}
                    disabled={isCreatingDelivery}
                    className="w-full"
                  >
                    {isCreatingDelivery ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Scheduling...
                      </>
                    ) : (
                      <>
                        <Truck className="h-4 w-4 mr-2" />
                        Schedule Pickup
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {job.job_status === 'repair_completed' && deliveryRequests.filter(d => d.delivery_type === 'return').length === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Schedule Return Delivery
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Schedule a return delivery to have your repaired appliance delivered back to you.
                  </p>
                  <Button 
                    onClick={() => handleScheduleDelivery('return')}
                    disabled={isCreatingDelivery}
                    className="w-full"
                  >
                    {isCreatingDelivery ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Scheduling...
                      </>
                    ) : (
                      <>
                        <Truck className="h-4 w-4 mr-2" />
                        Schedule Return
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
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
              <CardContent className="space-y-4">
                {/* Branding Section */}
                {(job.repair_center?.logo_url || job.repair_center?.cover_image_url) && (
                  <div className="relative">
                    {job.repair_center?.cover_image_url && (
                      <div className="h-24 rounded-lg overflow-hidden mb-3">
                        <img 
                          src={job.repair_center.cover_image_url} 
                          alt={`${job.repair_center.name} cover`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    {job.repair_center?.logo_url && (
                      <div className="flex items-center gap-3 mb-3">
                        <img 
                          src={job.repair_center.logo_url} 
                          alt={`${job.repair_center.name} logo`}
                          className="w-16 h-16 rounded-full object-cover border-2 border-primary"
                        />
                        <div>
                          <p className="font-medium text-lg">{job.repair_center?.name}</p>
                          <p className="text-xs text-muted-foreground">Your Service Provider</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Repair Center Info - Show name only if no logo */}
                {!job.repair_center?.logo_url && (
                  <div>
                    <p className="font-medium">{job.repair_center?.name}</p>
                  </div>
                )}
                
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

            {/* Payment Required Alert - Urgent Display */}
            {job.job_status === 'repair_completed' && job.final_cost && !job.customer_confirmed && (
              <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
                    <AlertCircle className="w-5 h-5" />
                    Payment Required
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Your repair is complete!</p>
                    <div className="text-3xl font-bold text-amber-900 dark:text-amber-100">
                      ₦{job.final_cost.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    {job.app_commission && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Includes ₦{job.app_commission.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} service fee
                      </p>
                    )}
                  </div>

                  {job.payment_deadline && (
                    <div className={`flex items-center gap-2 p-3 rounded-lg ${
                      isPaymentCritical(job.payment_deadline) ? 'bg-red-100 dark:bg-red-950/30' :
                      isPaymentUrgent(job.payment_deadline) ? 'bg-amber-100 dark:bg-amber-950/30' :
                      'bg-blue-100 dark:bg-blue-950/30'
                    }`}>
                      <Timer className="w-4 h-4" />
                      <div className="text-sm">
                        <p className="font-medium">Payment Deadline</p>
                        <p className="text-xs">{getTimeRemaining(job.payment_deadline)}</p>
                      </div>
                    </div>
                  )}

                  <Button 
                    onClick={handlePayment} 
                    disabled={paymentLoading}
                    className="w-full h-12 text-lg"
                    size="lg"
                  >
                    {paymentLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-5 h-5 mr-2" />
                        Pay Now
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    Your item will be returned after payment is confirmed
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Payment Summary Card - Prominent Display */}
            {job.final_cost && job.job_status === "repair_completed" && !job.customer_confirmed && (
              <Card className={`border-2 ${
                isPaymentCritical(job.payment_deadline)
                  ? 'border-red-300 bg-red-50'
                  : isPaymentUrgent(job.payment_deadline)
                  ? 'border-amber-300 bg-amber-50'
                  : 'border-green-300 bg-green-50'
              }`}>
                <CardHeader>
                  <CardTitle className={`flex items-center gap-2 ${
                    isPaymentCritical(job.payment_deadline)
                      ? 'text-red-900'
                      : isPaymentUrgent(job.payment_deadline)
                      ? 'text-amber-900'
                      : 'text-green-900'
                  }`}>
                    <CreditCard className="w-5 h-5" />
                    {isPaymentCritical(job.payment_deadline) ? '⚠️ URGENT Payment Due' : 'Payment Summary'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Repair Cost</span>
                      <span className="text-lg font-bold">₦{job.final_cost.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    {job.app_commission && (
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Service Fee (7.5%)</span>
                        <span>₦{job.app_commission.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {job.estimated_cost && (
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Original Estimate</span>
                        <span>₦{job.estimated_cost.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </div>

                  {job.payment_deadline && (
                    <div className={`flex items-center gap-2 p-3 rounded-lg ${
                      isPaymentCritical(job.payment_deadline)
                        ? 'bg-red-100 border border-red-200'
                        : isPaymentUrgent(job.payment_deadline)
                        ? 'bg-amber-100 border border-amber-200'
                        : 'bg-blue-50 border border-blue-200'
                    }`}>
                      <Timer className={`w-4 h-4 ${
                        isPaymentCritical(job.payment_deadline) ? 'text-red-600' : 'text-amber-600'
                      }`} />
                      <div className="flex-1">
                        <p className="text-xs font-medium">Payment Deadline</p>
                        <p className="text-sm font-semibold">{format(new Date(job.payment_deadline), "MMM d, yyyy 'at' h:mm a")}</p>
                        <p className={`text-xs font-bold ${
                          isPaymentCritical(job.payment_deadline) ? 'text-red-700' : 'text-amber-700'
                        }`}>
                          {getTimeRemaining(job.payment_deadline)}
                        </p>
                      </div>
                    </div>
                  )}

                  <Button 
                    className={`w-full text-lg font-bold shadow-lg ${
                      isPaymentCritical(job.payment_deadline)
                        ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 animate-pulse'
                        : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
                    }`}
                    size="lg"
                    onClick={handlePayment}
                    disabled={paymentLoading}
                  >
                    {paymentLoading ? (
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
                  
                  <p className="text-xs text-center text-muted-foreground">
                    Secure payment via Paystack • Your item will be ready for pickup after payment
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Cost Information - Regular Display */}
            {(job.estimated_cost || job.final_cost) && job.job_status !== "repair_completed" && job.job_status !== "completed" && (
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
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
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

                {/* Chat Button */}
                {conversation && (
                  <Button 
                    className="w-full"
                    variant="outline"
                    onClick={() => navigate('/repair-center-chat', {
                      state: {
                        conversationId: conversation.id,
                        selectedCenter: conversation.repair_center,
                        repairJobId: id
                      }
                    })}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Continue Chat with Repair Center
                  </Button>
                )}

                {/* Two-Step Confirmation - Only show when status is 'returned' */}
                {job.job_status === "returned" && (
                  <div className="space-y-3">
                    {/* Step 1: Device Return Confirmation */}
                    {!deviceReturnConfirmed ? (
                      <div className="border border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg space-y-3">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                          <div>
                            <p className="font-medium text-blue-900 dark:text-blue-100">Step 1: Confirm Device Return</p>
                            <p className="text-sm text-blue-700 dark:text-blue-300">Have you received your device back?</p>
                          </div>
                        </div>
                        <Button 
                          className="w-full bg-blue-600 hover:bg-blue-700"
                          onClick={handleDeviceReturnConfirmation}
                          disabled={confirmationLoading}
                        >
                          {confirmationLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Confirming...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Yes, I Received My Device
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="border border-green-200 bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <p className="text-sm text-green-800 dark:text-green-200">Device return confirmed ✓</p>
                        </div>
                      </div>
                    )}

                    {/* Step 2: Satisfaction Confirmation - Only show after Step 1 */}
                    {deviceReturnConfirmed && !satisfactionConfirmed && (
                      <div className="border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg space-y-3">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                          <div>
                            <p className="font-medium text-amber-900 dark:text-amber-100">Step 2: Rate Your Experience</p>
                            <p className="text-sm text-amber-700 dark:text-amber-300">Are you satisfied with the repair?</p>
                          </div>
                        </div>
                        <Button 
                          className="w-full bg-amber-600 hover:bg-amber-700"
                          onClick={() => setShowSatisfactionDialog(true)}
                        >
                          <Star className="w-4 h-4 mr-2" />
                          Rate Repair Quality
                        </Button>
                      </div>
                    )}

                    {/* Both confirmations complete */}
                    {deviceReturnConfirmed && satisfactionConfirmed && (
                      <div className="border border-green-200 bg-green-50 dark:bg-green-950/20 p-4 rounded-lg space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <p className="font-medium text-green-800 dark:text-green-200">Repair Job Completed ✓</p>
                        </div>
                        <p className="text-sm text-green-700 dark:text-green-300">Thank you for using our service!</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Satisfaction Feedback Dialog */}
        <Dialog open={showSatisfactionDialog} onOpenChange={setShowSatisfactionDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rate Your Repair Experience</DialogTitle>
              <DialogDescription>
                Your feedback helps us improve our service
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Star Rating */}
              <div>
                <label className="text-sm font-medium">How satisfied are you?</label>
                <div className="flex gap-2 mt-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setSatisfactionRating(star)}
                      className={`text-3xl transition-colors ${
                        satisfactionRating >= star ? 'text-yellow-500' : 'text-gray-300'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              {/* Feedback Text */}
              <div>
                <label className="text-sm font-medium">Additional Comments (Optional)</label>
                <Textarea 
                  value={satisfactionFeedback}
                  onChange={(e) => setSatisfactionFeedback(e.target.value)}
                  placeholder="Tell us about your experience..."
                  rows={4}
                  className="mt-2"
                />
              </div>

              <Button 
                onClick={handleSatisfactionSubmit}
                disabled={satisfactionRating === 0 || confirmationLoading}
                className="w-full"
              >
                {confirmationLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Feedback'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default RepairJobDetail;