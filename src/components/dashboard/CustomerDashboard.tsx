import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/Navigation";
import { Link } from "react-router-dom";
import { Plus, Wrench, Clock, CheckCircle, AlertCircle } from "lucide-react";

const CustomerDashboard = () => {
  const { user } = useAuth();

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
                          <p className="text-sm font-medium">Estimated Cost: ${job.estimated_cost}</p>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(job.created_at).toLocaleDateString()}
                      </div>
                    </div>
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