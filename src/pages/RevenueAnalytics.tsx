import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, TrendingUp, Package, CheckCircle, BarChart3 } from "lucide-react";
import Navigation from "@/components/Navigation";
import CurrencySelector from "@/components/CurrencySelector";
import { formatCurrency, CURRENCY_SYMBOLS, DEFAULT_CURRENCY } from "@/lib/currency";

interface Analytics {
  total_completed_jobs: number;
  total_service_revenue: number;
  total_app_commission: number;
  average_job_value: number;
  monthly_revenue: { [key: string]: number };
  commission_rate: number;
  jobs_by_status: { [key: string]: number };
  payment_success_rate: number;
}

const RevenueAnalytics = () => {
  const { user, isAdmin, isLoading } = useAuth();
  const { toast } = useToast();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCurrency, setSelectedCurrency] = useState<keyof typeof CURRENCY_SYMBOLS>(DEFAULT_CURRENCY);

  useEffect(() => {
    if (user && isAdmin) {
      fetchAnalytics();
    }
  }, [user, isAdmin]);

  const fetchAnalytics = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("get-revenue-analytics");

      if (error) throw error;
      setAnalytics(data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast({
        title: "Error",
        description: "Failed to fetch revenue analytics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
            <p className="text-muted-foreground">You need admin access to view revenue analytics.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">No Data Available</h1>
            <p className="text-muted-foreground">Unable to load analytics data.</p>
          </div>
        </div>
      </div>
    );
  }

  const getMonthlyRevenueArray = () => {
    return Object.entries(analytics.monthly_revenue)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6); // Last 6 months
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Revenue Analytics</h1>
              <p className="text-muted-foreground">Monitor app revenue and commission tracking</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Currency:</span>
              <CurrencySelector 
                value={selectedCurrency} 
                onValueChange={setSelectedCurrency} 
              />
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total App Commission</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(analytics.total_app_commission, selectedCurrency)}</div>
              <p className="text-xs text-muted-foreground">
                {analytics.commission_rate * 100}% of completed repairs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Service Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(analytics.total_service_revenue, selectedCurrency)}</div>
              <p className="text-xs text-muted-foreground">
                Revenue from {analytics.total_completed_jobs} completed jobs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Jobs</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.total_completed_jobs}</div>
              <p className="text-xs text-muted-foreground">
                Successfully completed repairs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Job Value</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(analytics.average_job_value, selectedCurrency)}</div>
              <p className="text-xs text-muted-foreground">
                Average repair cost per job
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Monthly Revenue */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Commission Revenue</CardTitle>
              <CardDescription>App commission earned per month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {getMonthlyRevenueArray().map(([month, revenue]) => (
                  <div key={month} className="flex items-center justify-between">
                    <div className="font-medium">
                      {new Date(month + '-01').toLocaleDateString('en-US', { 
                        month: 'long', 
                        year: 'numeric' 
                      })}
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{formatCurrency(revenue, selectedCurrency)}</div>
                    </div>
                  </div>
                ))}
                {Object.keys(analytics.monthly_revenue).length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    No monthly data available yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Job Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Job Status Distribution</CardTitle>
              <CardDescription>Current status of all repair jobs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(analytics.jobs_by_status).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <div className="font-medium capitalize">
                      {status.replace('_', ' ')}
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{count}</div>
                    </div>
                  </div>
                ))}
                {Object.keys(analytics.jobs_by_status).length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    No job data available yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment Success Rate */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Payment Success Rate</CardTitle>
            <CardDescription>Percentage of successful payments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">
                {(analytics.payment_success_rate * 100).toFixed(1)}%
              </div>
              <p className="text-muted-foreground">
                Payment success rate across all transactions
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Insights */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Revenue Insights</CardTitle>
            <CardDescription>Key performance indicators</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-lg font-semibold text-green-700">
                  {formatCurrency(analytics.total_app_commission / Math.max(analytics.total_completed_jobs, 1), selectedCurrency)}
                </div>
                <p className="text-sm text-green-600">Commission per completed job</p>
              </div>
              
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-lg font-semibold text-blue-700">
                  {analytics.commission_rate * 100}%
                </div>
                <p className="text-sm text-blue-600">App commission rate</p>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-lg font-semibold text-purple-700">
                  {Object.keys(analytics.monthly_revenue).length}
                </div>
                <p className="text-sm text-purple-600">Months with revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RevenueAnalytics;