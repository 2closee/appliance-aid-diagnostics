import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import Navigation from "@/components/Navigation";
import { Link } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wrench, Clock, CheckCircle, AlertCircle, DollarSign, Users, MessageCircle, Settings as SettingsIcon, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import RepairCenterSettings from "@/components/RepairCenterSettings";
import { useConversationNotifications } from "@/hooks/useConversationNotifications";
import { QuoteProvisionForm } from "@/components/QuoteProvisionForm";
import BankAccountManager from "@/components/BankAccountManager";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const RepairCenterDashboard = () => {
  const { user, repairCenterId } = useAuth();
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedQuoteJob, setSelectedQuoteJob] = useState<any>(null);
  const [showBankAccount, setShowBankAccount] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const { totalUnread } = useConversationNotifications(repairCenterId || undefined);

  useEffect(() => {
    const hasSeenSettingsGuide = localStorage.getItem('hasSeenSettingsGuide');
    if (!hasSeenSettingsGuide) {
      setShowTooltip(true);
      setTimeout(() => {
        setShowTooltip(false);
        localStorage.setItem('hasSeenSettingsGuide', 'true');
      }, 8000);
    }
  }, []);

  const { data: repairJobs, isLoading, refetch } = useQuery({
    queryKey: ["repair-center-jobs", repairCenterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("repair_jobs")
        .select("*")
        .eq("repair_center_id", repairCenterId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!repairCenterId,
    refetchOnMount: true,
    staleTime: 0,
  });

  const { data: repairCenter } = useQuery({
    queryKey: ["repair-center", repairCenterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Repair Center")
        .select("*")
        .eq("id", repairCenterId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!repairCenterId,
  });

  const { data: settings } = useQuery({
    queryKey: ["repair-center-settings", repairCenterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("repair_center_settings")
        .select("*")
        .eq("repair_center_id", repairCenterId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setIsOnline(data.is_online);
      }
      return data;
    },
    enabled: !!repairCenterId,
  });

  const handleOnlineToggle = async (checked: boolean) => {
    if (!repairCenterId) return;

    setIsOnline(checked);
    const { error } = await supabase
      .from('repair_center_settings')
      .upsert({
        repair_center_id: repairCenterId,
        is_online: checked,
        last_activity_at: new Date().toISOString()
      }, {
        onConflict: 'repair_center_id'
      });

    if (error) {
      console.error('Error updating online status:', error);
      toast({
        title: "Error",
        description: "Failed to update online status",
        variant: "destructive"
      });
      setIsOnline(!checked);
    } else {
      toast({
        title: "Success",
        description: `You are now ${checked ? 'online' : 'offline'}`
      });
    }
  };

  // Define sequential workflow - only allow valid next statuses
  const statusWorkflow: Record<string, string[]> = {
    'requested': ['pickup_scheduled', 'cancelled'],
    'pickup_scheduled': ['picked_up', 'cancelled'],
    'picked_up': ['in_repair', 'cancelled'],
    'in_repair': ['repair_completed', 'cancelled'],
    'repair_completed': ['returned', 'cancelled'],
    'returned': ['completed', 'cancelled'],
    'completed': [], // Terminal state
    'cancelled': [] // Terminal state
  };

  const getNextValidStatuses = (currentStatus: string): string[] => {
    return statusWorkflow[currentStatus] || [];
  };

  const formatStatusLabel = (status: string): string => {
    return status.replace('_', ' ').split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const updateJobStatus = async (jobId: string, newStatus: "requested" | "pickup_scheduled" | "picked_up" | "in_repair" | "repair_completed" | "ready_for_return" | "returned" | "completed" | "cancelled") => {
    try {
      const job = repairJobs?.find(j => j.id === jobId);
      if (!job) {
        toast({
          title: "Error",
          description: "Job not found",
          variant: "destructive",
        });
        return;
      }

      // Validate workflow progression (skip validation for cancelled)
      if (newStatus !== 'cancelled' && !getNextValidStatuses(job.job_status).includes(newStatus)) {
        toast({
          title: "Invalid Status Change",
          description: `Cannot skip stages. Current stage: ${formatStatusLabel(job.job_status)}. Next valid stages: ${getNextValidStatuses(job.job_status).map(formatStatusLabel).join(', ')}`,
          variant: "destructive",
        });
        return;
      }

      const updateData: any = { job_status: newStatus };
      
      // When completing repair, automatically set final_cost from quoted_cost if not set
      if (newStatus === 'repair_completed') {
        if (!job.final_cost && job.quoted_cost) {
          updateData.final_cost = job.quoted_cost;
          updateData.app_commission = job.quoted_cost * 0.075;
          updateData.payment_deadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
        }
      }

      const { error } = await supabase
        .from("repair_jobs")
        .update(updateData)
        .eq("id", jobId);

      if (error) throw error;

      // Send notification email when repair is completed
      if (newStatus === 'repair_completed') {
        try {
          const { error: notifError } = await supabase.functions.invoke('send-job-notification', {
            body: {
              email_type: 'repair_completed',
              repair_job_id: jobId,
              customer_email: job.customer_email,
              customer_name: job.customer_name,
              appliance_type: job.appliance_type,
              final_cost: job.quoted_cost || job.final_cost,
            }
          });
          
          if (notifError) {
            console.error('Failed to send notification:', notifError);
          } else {
            toast({
              title: "Repair Completed!",
              description: "Customer has been notified and can now make payment.",
            });
          }
        } catch (notifError) {
          console.error('Failed to send notification:', notifError);
          // Don't fail the status update if email fails
          toast({
            title: "Success",
            description: "Job status updated. Note: Email notification may have failed.",
          });
        }
      } else {
        toast({
          title: "Success",
          description: "Job status updated successfully",
        });
      }
      
      refetch();
    } catch (error) {
      console.error("Error updating job status:", error);
      toast({
        title: "Error",
        description: "Failed to update job status",
        variant: "destructive",
      });
    }
  };

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

  const quoteRequests = repairJobs?.filter(job => job.job_status === 'quote_requested') || [];
  const otherJobs = repairJobs?.filter(job => job.job_status !== 'quote_requested') || [];

  const statsData = repairJobs ? {
    total: repairJobs.length,
    completed: repairJobs.filter(job => job.job_status === 'completed').length,
    inProgress: repairJobs.filter(job => job.job_status === 'in_repair').length,
    pending: repairJobs.filter(job => job.job_status === 'requested').length,
    quoteRequests: quoteRequests.length,
    totalRevenue: repairJobs
      .filter(job => job.final_cost)
      .reduce((sum, job) => sum + Number(job.final_cost), 0),
  } : { total: 0, completed: 0, inProgress: 0, pending: 0, quoteRequests: 0, totalRevenue: 0 };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative">
            {repairCenter?.cover_image_url && (
              <div className="absolute inset-0 -z-10 rounded-lg overflow-hidden opacity-20">
                <img 
                  src={repairCenter.cover_image_url} 
                  alt="Cover" 
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex items-center gap-4">
              {repairCenter?.logo_url && (
                <img 
                  src={repairCenter.logo_url} 
                  alt={`${repairCenter.name} logo`}
                  className="w-16 h-16 rounded-full object-cover border-2 border-primary"
                />
              )}
              <div>
                <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                  {!repairCenter?.logo_url && <Wrench className="h-7 w-7 text-primary" />}
                  {repairCenter?.name || 'Repair Center'} Portal
                </h1>
                <p className="text-muted-foreground mt-2">Repair Center Admin - Manage your repair jobs and track performance</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Label htmlFor="online-status" className="text-sm font-medium">
                  Online Status
                </Label>
                <Switch
                  id="online-status"
                  checked={isOnline}
                  onCheckedChange={handleOnlineToggle}
                />
                <span className="text-sm text-muted-foreground">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </Card>
            <TooltipProvider>
              <Tooltip open={showTooltip} onOpenChange={setShowTooltip}>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-2"
                    onClick={() => setShowSettings(!showSettings)}
                  >
                    <SettingsIcon className="h-4 w-4" />
                    Settings
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs p-4" side="bottom">
                  <div className="space-y-2">
                    <p className="font-semibold text-sm">Available Settings:</p>
                    <ul className="text-xs space-y-1 list-disc list-inside">
                      <li>Update your shop logo and cover image</li>
                      <li>Change your shop address (once per month)</li>
                      <li>Configure auto-reply messages for customers</li>
                    </ul>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Link to="/repair-center-conversations">
              <Button variant="outline" className="flex items-center gap-2 relative">
                <MessageCircle className="h-4 w-4" />
                Conversations
                {totalUnread > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {totalUnread}
                  </Badge>
                )}
              </Button>
            </Link>
          </div>
        </div>

        {showSettings && <RepairCenterSettings />}

        {/* Quote Requests Section */}
        {quoteRequests.length > 0 && (
          <Card className="bg-gradient-to-br from-amber-50 to-background border-amber-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                Quote Requests ({quoteRequests.length})
              </CardTitle>
              <CardDescription>New repair requests awaiting your quote</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {quoteRequests.map((job) => (
                  <div key={job.id} className="p-4 border rounded-lg bg-background hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <h3 className="font-medium mb-1">{job.appliance_type} - {job.appliance_brand}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{job.issue_description}</p>
                        {job.ai_diagnosis_summary && (
                          <Badge variant="outline" className="text-xs">AI Diagnosis Available</Badge>
                        )}
                      </div>
                      <Button onClick={() => setSelectedQuoteJob(job)} size="sm">
                        Provide Quote
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="hover:shadow-medium transition-all cursor-pointer bg-gradient-to-br from-card to-secondary/30 border-primary/10" onClick={() => setShowBankAccount(true)}>
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <h3 className="font-semibold text-lg">Bank Information</h3>
                <p className="text-sm text-muted-foreground">Add or update your bank details</p>
              </div>
              <CreditCard className="h-8 w-8 text-primary" />
            </CardContent>
          </Card>

          <Link to="/center-earnings" className="block">
            <Card className="hover:shadow-medium hover:scale-[1.02] transition-all cursor-pointer bg-gradient-to-br from-success/90 to-success border-success/20">
              <CardContent className="flex items-center justify-between p-6">
                <div>
                  <h3 className="font-semibold text-lg text-success-foreground">Request Payout</h3>
                  <p className="text-sm text-success-foreground/80">View earnings & request payouts</p>
                </div>
                <DollarSign className="h-8 w-8 text-success-foreground" />
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsData.total}</div>
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
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{statsData.completed}</div>
            </CardContent>
          </Card>

          <Link to="/center-earnings" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">₦{statsData.totalRevenue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">Click to view earnings details</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Repair Jobs */}
        <Card>
          <CardHeader>
            <CardTitle>Repair Jobs</CardTitle>
            <CardDescription>Manage and track all repair jobs for your center</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-20 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : otherJobs && otherJobs.length > 0 ? (
              <div className="space-y-4">
                {otherJobs.map((job) => (
                  <div
                    key={job.id}
                    className="p-4 border rounded-lg space-y-4"
                  >
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{job.appliance_type} - {job.appliance_brand}</h3>
                          <Badge className={getStatusColor(job.job_status)}>
                            {getStatusIcon(job.job_status)}
                            <span className="ml-1 capitalize">{job.job_status.replace('_', ' ')}</span>
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{job.issue_description}</p>
                        <div className="flex flex-wrap gap-4 text-sm">
                          <span><strong>Customer:</strong> {job.customer_name}</span>
                          <span><strong>Phone:</strong> {job.customer_phone}</span>
                          {job.estimated_cost && (
                            <span><strong>Estimated:</strong> ₦{job.estimated_cost.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          )}
                          {job.final_cost && (
                            <span><strong>Final Cost:</strong> ₦{job.final_cost.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          )}
                        </div>
                        
                        {/* Payment Status Alert */}
                        {job.job_status === 'repair_completed' && (
                          <div className="mt-3 pt-3 border-t flex items-start gap-2">
                            <CreditCard className="w-4 h-4 text-amber-500 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-amber-700">Awaiting Customer Payment</p>
                              <p className="text-xs text-muted-foreground">
                                Item cannot be returned until payment is received
                                {job.payment_deadline && (
                                  <> • Due: {format(new Date(job.payment_deadline), "MMM d, yyyy")}</>
                                )}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Select
                          value={job.job_status}
                          onValueChange={(value: "requested" | "pickup_scheduled" | "picked_up" | "in_repair" | "repair_completed" | "ready_for_return" | "returned" | "completed" | "cancelled") => updateJobStatus(job.id, value)}
                        >
                          <SelectTrigger className="w-full sm:w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {/* Current status - disabled */}
                            <SelectItem value={job.job_status} disabled>
                              {formatStatusLabel(job.job_status)} (Current)
                            </SelectItem>
                            
                            {/* Valid next statuses - enabled */}
                            {getNextValidStatuses(job.job_status).map(status => (
                              <SelectItem key={status} value={status}>
                                {formatStatusLabel(status)}
                              </SelectItem>
                            ))}
                            
                            {/* All other statuses - disabled & locked */}
                            {['requested', 'pickup_scheduled', 'picked_up', 'in_repair', 'repair_completed', 'returned', 'completed']
                              .filter(s => s !== job.job_status && !getNextValidStatuses(job.job_status).includes(s))
                              .map(status => (
                                <SelectItem key={status} value={status} disabled className="opacity-50">
                                  {formatStatusLabel(status)} 🔒
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        
                        <Link to={`/repair-jobs/${job.id}`}>
                          <Button variant="outline" size="sm">View Details</Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Wrench className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No repair jobs assigned yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {selectedQuoteJob && (
          <QuoteProvisionForm
            repairJob={selectedQuoteJob}
            open={!!selectedQuoteJob}
            onClose={() => setSelectedQuoteJob(null)}
            onQuoteSubmitted={() => {
              setSelectedQuoteJob(null);
              refetch();
            }}
          />
        )}

        <Dialog open={showBankAccount} onOpenChange={setShowBankAccount}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Bank Account Management</DialogTitle>
              <DialogDescription>
                Add or update your bank account for receiving payouts
              </DialogDescription>
            </DialogHeader>
            {repairCenterId && repairCenter && (
              <BankAccountManager 
                repairCenterId={repairCenterId} 
                businessName={repairCenter.name}
              />
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default RepairCenterDashboard;