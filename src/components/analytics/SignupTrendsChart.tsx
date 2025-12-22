import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays, format, eachDayOfInterval, startOfDay } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { TrendingUp, Users, Building2 } from "lucide-react";

interface SignupTrendsChartProps {
  dateRange: number;
  type: 'users' | 'centers';
}

const SignupTrendsChart = ({ dateRange, type }: SignupTrendsChartProps) => {
  const { data: chartData, isLoading } = useQuery({
    queryKey: ['signup-trends', dateRange, type],
    queryFn: async () => {
      const now = new Date();
      const startDate = subDays(now, dateRange);
      
      // Generate all days in the range
      const days = eachDayOfInterval({ start: startDate, end: now });
      
      if (type === 'users') {
        // Get user signups from profiles
        const { data: signups } = await supabase
          .from('profiles')
          .select('created_at')
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: true });

        // Group by day
        const signupsByDay: Record<string, number> = {};
        signups?.forEach(signup => {
          const day = format(new Date(signup.created_at!), 'yyyy-MM-dd');
          signupsByDay[day] = (signupsByDay[day] || 0) + 1;
        });

        return days.map(day => {
          const dayStr = format(day, 'yyyy-MM-dd');
          return {
            date: format(day, 'MMM dd'),
            count: signupsByDay[dayStr] || 0,
          };
        });
      } else {
        // Get repair center applications
        const { data: applications } = await supabase
          .from('repair_center_applications')
          .select('created_at, status')
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: true });

        // Group by day
        const appsByDay: Record<string, number> = {};
        applications?.forEach(app => {
          const day = format(new Date(app.created_at), 'yyyy-MM-dd');
          appsByDay[day] = (appsByDay[day] || 0) + 1;
        });

        return days.map(day => {
          const dayStr = format(day, 'yyyy-MM-dd');
          return {
            date: format(day, 'MMM dd'),
            count: appsByDay[dayStr] || 0,
          };
        });
      }
    },
  });

  const total = chartData?.reduce((sum, item) => sum + item.count, 0) || 0;
  const average = chartData?.length ? Math.round(total / chartData.length) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {type === 'users' ? (
            <Users className="h-5 w-5 text-primary" />
          ) : (
            <Building2 className="h-5 w-5 text-success" />
          )}
          {type === 'users' ? 'User Sign-up Trends' : 'Repair Center Application Trends'}
        </CardTitle>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>Total: <strong className="text-foreground">{total}</strong></span>
          <span>Daily Avg: <strong className="text-foreground">{average}</strong></span>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[250px] w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id={`color-${type}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={type === 'users' ? '#3b82f6' : '#22c55e'} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={type === 'users' ? '#3b82f6' : '#22c55e'} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke={type === 'users' ? '#3b82f6' : '#22c55e'}
                strokeWidth={2}
                fillOpacity={1}
                fill={`url(#color-${type})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default SignupTrendsChart;
