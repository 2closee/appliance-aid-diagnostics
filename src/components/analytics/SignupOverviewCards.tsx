import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Building2, TrendingUp, TrendingDown, UserPlus, ClipboardList } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays, format } from "date-fns";

interface SignupOverviewCardsProps {
  dateRange: number;
}

interface OverviewData {
  newUsers: number;
  previousUsers: number;
  newCenters: number;
  previousCenters: number;
  pendingApplications: number;
  activeRepairJobs: number;
}

const SignupOverviewCards = ({ dateRange }: SignupOverviewCardsProps) => {
  const { data, isLoading } = useQuery({
    queryKey: ['signup-overview', dateRange],
    queryFn: async (): Promise<OverviewData> => {
      const now = new Date();
      const startDate = subDays(now, dateRange);
      const previousStartDate = subDays(startDate, dateRange);

      // Get new users (from profiles table)
      const { count: newUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString());

      // Get previous period users
      const { count: previousUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', previousStartDate.toISOString())
        .lt('created_at', startDate.toISOString());

      // Get new repair center applications
      const { count: newCenters } = await supabase
        .from('repair_center_applications')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString());

      // Get previous period applications
      const { count: previousCenters } = await supabase
        .from('repair_center_applications')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', previousStartDate.toISOString())
        .lt('created_at', startDate.toISOString());

      // Get pending applications
      const { count: pendingApplications } = await supabase
        .from('repair_center_applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Get active repair jobs
      const { count: activeRepairJobs } = await supabase
        .from('repair_jobs')
        .select('*', { count: 'exact', head: true })
        .not('job_status', 'in', '("completed","cancelled")');

      return {
        newUsers: newUsers || 0,
        previousUsers: previousUsers || 0,
        newCenters: newCenters || 0,
        previousCenters: previousCenters || 0,
        pendingApplications: pendingApplications || 0,
        activeRepairJobs: activeRepairJobs || 0,
      };
    },
  });

  const calculateGrowth = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-4 w-20 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const userGrowth = calculateGrowth(data?.newUsers || 0, data?.previousUsers || 0);
  const centerGrowth = calculateGrowth(data?.newCenters || 0, data?.previousCenters || 0);

  const cards = [
    {
      title: "New Users",
      value: data?.newUsers || 0,
      icon: UserPlus,
      growth: userGrowth,
      description: `vs previous ${dateRange} days`,
    },
    {
      title: "New RC Applications",
      value: data?.newCenters || 0,
      icon: Building2,
      growth: centerGrowth,
      description: `vs previous ${dateRange} days`,
    },
    {
      title: "Pending Applications",
      value: data?.pendingApplications || 0,
      icon: ClipboardList,
      description: "Awaiting review",
      highlight: (data?.pendingApplications || 0) > 0,
    },
    {
      title: "Active Repair Jobs",
      value: data?.activeRepairJobs || 0,
      icon: Users,
      description: "In progress",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <Card key={index} className={card.highlight ? "border-warning" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{card.value.toLocaleString()}</div>
            <div className="flex items-center gap-1 mt-1">
              {card.growth !== undefined && (
                <>
                  {card.growth >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-success" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-destructive" />
                  )}
                  <span className={`text-xs ${card.growth >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {card.growth >= 0 ? '+' : ''}{card.growth}%
                  </span>
                </>
              )}
              <span className="text-xs text-muted-foreground">{card.description}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default SignupOverviewCards;
