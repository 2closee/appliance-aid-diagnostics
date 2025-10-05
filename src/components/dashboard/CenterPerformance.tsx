import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  Wrench, 
  Clock,
  CheckCircle,
  Star,
  Users,
  BarChart3,
  Calendar
} from "lucide-react";
import { formatCurrency, DEFAULT_CURRENCY } from "@/lib/currency";

interface CenterPerformanceProps {
  centerId: number;
  centerName: string;
}

const CenterPerformance = ({ centerId, centerName }: CenterPerformanceProps) => {
  // Fetch jobs for this center
  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ["center-performance-jobs", centerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("repair_jobs")
        .select("*")
        .eq("repair_center_id", centerId);

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch payments for this center
  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ["center-performance-payments", centerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select(`
          *,
          repair_jobs!inner(repair_center_id)
        `)
        .eq("repair_jobs.repair_center_id", centerId);

      if (error) throw error;
      return data || [];
    },
  });

  if (jobsLoading || paymentsLoading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  // Calculate metrics
  const totalJobs = jobs?.length || 0;
  const completedJobs = jobs?.filter(job => job.job_status === 'completed').length || 0;
  const inProgressJobs = jobs?.filter(job => job.job_status === 'in_repair').length || 0;
  const pendingJobs = jobs?.filter(job => job.job_status === 'requested').length || 0;
  
  const totalRevenue = jobs?.reduce((sum, job) => sum + (Number(job.final_cost) || 0), 0) || 0;
  const averageJobValue = completedJobs > 0 ? totalRevenue / completedJobs : 0;
  
  const completionRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;
  
  const completedPayments = payments?.filter(p => p.payment_status === 'completed').length || 0;
  const paymentSuccessRate = payments && payments.length > 0 ? (completedPayments / payments.length) * 100 : 0;

  // Calculate monthly performance (last 6 months)
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  
  const recentJobs = jobs?.filter(job => new Date(job.created_at) >= sixMonthsAgo) || [];
  const monthlyData = recentJobs.reduce((acc: any, job) => {
    const month = new Date(job.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    if (!acc[month]) {
      acc[month] = { jobs: 0, completed: 0, revenue: 0 };
    }
    acc[month].jobs += 1;
    if (job.job_status === 'completed') {
      acc[month].completed += 1;
      acc[month].revenue += Number(job.final_cost) || 0;
    }
    return acc;
  }, {});

  const monthlyEntries = Object.entries(monthlyData).slice(-6);

  // Performance rating (based on completion rate)
  const getPerformanceRating = () => {
    if (completionRate >= 90) return { rating: 'Excellent', color: 'text-green-500', stars: 5 };
    if (completionRate >= 75) return { rating: 'Very Good', color: 'text-blue-500', stars: 4 };
    if (completionRate >= 60) return { rating: 'Good', color: 'text-yellow-500', stars: 3 };
    if (completionRate >= 40) return { rating: 'Fair', color: 'text-orange-500', stars: 2 };
    return { rating: 'Needs Improvement', color: 'text-red-500', stars: 1 };
  };

  const performanceRating = getPerformanceRating();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold mb-2">Performance Analytics: {centerName}</h3>
        <p className="text-sm text-muted-foreground">Comprehensive performance metrics and insights</p>
      </div>

      {/* Performance Rating */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Overall Performance Rating
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <div className={`text-3xl font-bold ${performanceRating.color}`}>
                {performanceRating.rating}
              </div>
              <div className="flex items-center gap-1 mt-2">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`h-5 w-5 ${i < performanceRating.stars ? 'fill-yellow-500 text-yellow-500' : 'text-gray-300'}`} 
                  />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold">{completionRate.toFixed(1)}%</div>
                <div className="text-muted-foreground">Completion Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{paymentSuccessRate.toFixed(1)}%</div>
                <div className="text-muted-foreground">Payment Success</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalJobs}</div>
            <p className="text-xs text-muted-foreground">
              {completedJobs} completed ({completionRate.toFixed(0)}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {formatCurrency(totalRevenue, DEFAULT_CURRENCY)}
            </div>
            <p className="text-xs text-muted-foreground">
              From {completedJobs} completed jobs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Job Value</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {formatCurrency(averageJobValue, DEFAULT_CURRENCY)}
            </div>
            <p className="text-xs text-muted-foreground">
              Per completed job
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{inProgressJobs}</div>
            <p className="text-xs text-muted-foreground">
              {pendingJobs} pending pickup
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Job Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Job Status Distribution
          </CardTitle>
          <CardDescription>Current status of all repair jobs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { status: 'completed', count: completedJobs, icon: CheckCircle, color: 'text-green-500', bgColor: 'bg-green-50 dark:bg-green-950/20' },
              { status: 'in_repair', count: inProgressJobs, icon: Wrench, color: 'text-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-950/20' },
              { status: 'requested', count: pendingJobs, icon: Clock, color: 'text-yellow-500', bgColor: 'bg-yellow-50 dark:bg-yellow-950/20' },
            ].map(({ status, count, icon: Icon, color, bgColor }) => (
              <div key={status} className={`p-3 rounded-lg ${bgColor}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${color}`} />
                    <span className="font-medium capitalize">{status.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xl font-bold ${color}`}>{count}</span>
                    <Badge variant="outline">{((count / totalJobs) * 100 || 0).toFixed(0)}%</Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Performance Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Monthly Performance (Last 6 Months)
          </CardTitle>
          <CardDescription>Jobs completed and revenue generated per month</CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyEntries.length > 0 ? (
            <div className="space-y-4">
              {monthlyEntries.map(([month, data]: [string, any]) => (
                <div key={month} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{month}</div>
                    <div className="flex items-center gap-2">
                      {data.completed > 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Total Jobs</div>
                      <div className="text-lg font-bold">{data.jobs}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Completed</div>
                      <div className="text-lg font-bold text-green-500">{data.completed}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Revenue</div>
                      <div className="text-lg font-bold text-blue-500">
                        {formatCurrency(data.revenue, DEFAULT_CURRENCY)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No data available for the last 6 months
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Payment Performance
          </CardTitle>
          <CardDescription>Payment processing and success metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <div className="text-2xl font-bold text-green-500">{completedPayments}</div>
              <div className="text-sm text-muted-foreground">Successful Payments</div>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-500">{payments?.length || 0}</div>
              <div className="text-sm text-muted-foreground">Total Payments</div>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
              <div className="text-2xl font-bold text-purple-500">{paymentSuccessRate.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">Success Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CenterPerformance;
