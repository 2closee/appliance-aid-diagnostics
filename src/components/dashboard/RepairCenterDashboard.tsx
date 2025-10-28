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
import { Wrench, Clock, CheckCircle, AlertCircle, DollarSign, Users, MessageCircle, Settings as SettingsIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import RepairCenterSettings from "@/components/RepairCenterSettings";
import { useConversationNotifications } from "@/hooks/useConversationNotifications";

const RepairCenterDashboard = () => {
  const { user, repairCenterId } = useAuth();
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { totalUnread } = useConversationNotifications(repairCenterId || undefined);

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

  const updateJobStatus = async (jobId: string, newStatus: "requested" | "pickup_scheduled" | "picked_up" | "in_repair" | "repair_completed" | "ready_for_return" | "returned" | "completed" | "cancelled") => {
    try {
      const { error } = await supabase
        .from("repair_jobs")
        .update({ job_status: newStatus })
        .eq("id", jobId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Job status updated successfully",
      });
      
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

  const statsData = repairJobs ? {
    total: repairJobs.length,
    completed: repairJobs.filter(job => job.job_status === 'completed').length,
    inProgress: repairJobs.filter(job => job.job_status === 'in_repair').length,
    pending: repairJobs.filter(job => job.job_status === 'requested').length,
    totalRevenue: repairJobs
      .filter(job => job.final_cost)
      .reduce((sum, job) => sum + Number(job.final_cost), 0),
  } : { total: 0, completed: 0, inProgress: 0, pending: 0, totalRevenue: 0 };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Wrench className="h-7 w-7 text-primary" />
              {repairCenter?.name || 'Repair Center'} Portal
            </h1>
            <p className="text-muted-foreground mt-2">Repair Center Admin - Manage your repair jobs and track performance</p>
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
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
              onClick={() => setShowSettings(!showSettings)}
            >
              <SettingsIcon className="h-4 w-4" />
              Settings
            </Button>
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

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">₦{statsData.totalRevenue.toFixed(2)}</div>
            </CardContent>
          </Card>
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
            ) : repairJobs && repairJobs.length > 0 ? (
              <div className="space-y-4">
                {repairJobs.map((job) => (
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
                            <span><strong>Estimated:</strong> ${job.estimated_cost}</span>
                          )}
                          {job.final_cost && (
                            <span><strong>Final Cost:</strong> ${job.final_cost}</span>
                          )}
                        </div>
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
                            <SelectItem value="requested">Requested</SelectItem>
                            <SelectItem value="pickup_scheduled">Pickup Scheduled</SelectItem>
                            <SelectItem value="picked_up">Picked Up</SelectItem>
                            <SelectItem value="in_repair">In Repair</SelectItem>
                            <SelectItem value="repair_completed">Repair Completed</SelectItem>
                            <SelectItem value="ready_for_return">Ready for Return</SelectItem>
                            <SelectItem value="returned">Returned</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
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
      </main>
    </div>
  );
};

export default RepairCenterDashboard;