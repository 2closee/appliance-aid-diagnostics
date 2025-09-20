import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import { Link } from "react-router-dom";
import { 
  Users, 
  Wrench, 
  Building, 
  DollarSign, 
  TrendingUp, 
  Clock,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AdminDashboard = () => {
  const { user } = useAuth();

  // Fetch overall stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [jobsResult, centersResult, usersResult] = await Promise.all([
        supabase.from("repair_jobs").select("*"),
        supabase.from("Repair Center").select("*"),
        supabase.from("user_roles").select("*")
      ]);

      if (jobsResult.error) throw jobsResult.error;
      if (centersResult.error) throw centersResult.error;
      if (usersResult.error) throw usersResult.error;

      const jobs = jobsResult.data || [];
      const totalRevenue = jobs
        .filter(job => job.final_cost)
        .reduce((sum, job) => sum + Number(job.final_cost), 0);
      
      const totalCommission = jobs
        .filter(job => job.app_commission)
        .reduce((sum, job) => sum + Number(job.app_commission), 0);

      return {
        totalJobs: jobs.length,
        completedJobs: jobs.filter(job => job.job_status === 'completed').length,
        pendingJobs: jobs.filter(job => job.job_status === 'requested').length,
        inProgressJobs: jobs.filter(job => job.job_status === 'in_repair').length,
        totalRevenue,
        totalCommission,
        totalCenters: centersResult.data?.length || 0,
        totalUsers: usersResult.data?.length || 0,
      };
    },
  });

  // Fetch recent jobs
  const { data: recentJobs, isLoading: jobsLoading } = useQuery({
    queryKey: ["admin-recent-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("repair_jobs")
        .select(`
          *,
          repair_center:repair_center_id("Repair Center"(*))
        `)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });

  // Fetch repair centers
  const { data: repairCenters, isLoading: centersLoading } = useQuery({
    queryKey: ["admin-repair-centers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Repair Center")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-500';
      case 'in_repair':
        return 'text-blue-500';
      case 'requested':
        return 'text-yellow-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-2">Monitor and manage the entire repair ecosystem</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/revenue-analytics">
              <Button variant="outline">Revenue Analytics</Button>
            </Link>
            <Link to="/admin">
              <Button>Admin Panel</Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalJobs || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.completedJobs || 0} completed
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Repair Centers</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalCenters || 0}</div>
              <p className="text-xs text-muted-foreground">Active centers</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                ${stats?.totalRevenue.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-muted-foreground">Service revenue</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">App Commission</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                ${stats?.totalCommission.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-muted-foreground">Platform earnings</p>
            </CardContent>
          </Card>
        </div>

        {/* Job Status Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Jobs</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{stats?.pendingJobs || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Wrench className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">{stats?.inProgressJobs || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{stats?.completedJobs || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for detailed views */}
        <Tabs defaultValue="recent-jobs" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="recent-jobs">Recent Jobs</TabsTrigger>
            <TabsTrigger value="repair-centers">Repair Centers</TabsTrigger>
          </TabsList>
          
          <TabsContent value="recent-jobs">
            <Card>
              <CardHeader>
                <CardTitle>Recent Repair Jobs</CardTitle>
                <CardDescription>Latest repair requests across all centers</CardDescription>
              </CardHeader>
              <CardContent>
                {jobsLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                    ))}
                  </div>
                ) : recentJobs && recentJobs.length > 0 ? (
                  <div className="space-y-4">
                    {recentJobs.map((job) => (
                      <Link
                        key={job.id}
                        to={`/repair-jobs/${job.id}`}
                        className="block p-4 border rounded-lg hover:shadow-md transition-shadow"
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{job.appliance_type} - {job.appliance_brand}</h3>
                              <span className={`text-sm font-medium capitalize ${getStatusColor(job.job_status)}`}>
                                {job.job_status.replace('_', ' ')}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">{job.issue_description}</p>
                            <div className="flex flex-wrap gap-4 text-sm">
                              <span><strong>Customer:</strong> {job.customer_name}</span>
                              {job.estimated_cost && (
                                <span><strong>Cost:</strong> ${job.estimated_cost}</span>
                              )}
                            </div>
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
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="repair-centers">
            <Card>
              <CardHeader>
                <CardTitle>Repair Centers</CardTitle>
                <CardDescription>Manage registered repair centers</CardDescription>
              </CardHeader>
              <CardContent>
                {centersLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-20 bg-muted animate-pulse rounded" />
                    ))}
                  </div>
                ) : repairCenters && repairCenters.length > 0 ? (
                  <div className="space-y-4">
                    {repairCenters.map((center) => (
                      <div key={center.id} className="p-4 border rounded-lg">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div className="flex-1 space-y-2">
                            <h3 className="font-medium">{center.name}</h3>
                            <p className="text-sm text-muted-foreground">{center.address}</p>
                            <div className="flex flex-wrap gap-4 text-sm">
                              <span><strong>Phone:</strong> {center.phone}</span>
                              <span><strong>Email:</strong> {center.email}</span>
                            </div>
                            {center.specialties && (
                              <p className="text-sm"><strong>Specialties:</strong> {center.specialties}</p>
                            )}
                          </div>
                          <Button variant="outline" size="sm">
                            Manage
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Building className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No repair centers registered</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;