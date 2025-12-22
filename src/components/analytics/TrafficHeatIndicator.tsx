import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays, format, eachWeekOfInterval, startOfWeek, endOfWeek } from "date-fns";
import { Activity, TrendingUp, TrendingDown, Minus, Flame, Snowflake } from "lucide-react";

interface TrafficHeatIndicatorProps {
  dateRange: number;
  type: 'users' | 'centers';
}

interface WeeklyTraffic {
  week: string;
  count: number;
  trend: 'up' | 'down' | 'stable';
  heat: 'hot' | 'warm' | 'cool' | 'cold';
}

const TrafficHeatIndicator = ({ dateRange, type }: TrafficHeatIndicatorProps) => {
  const { data: trafficData, isLoading } = useQuery({
    queryKey: ['traffic-heat', dateRange, type],
    queryFn: async (): Promise<WeeklyTraffic[]> => {
      const now = new Date();
      const startDate = subDays(now, dateRange);
      const weeks = eachWeekOfInterval({ start: startDate, end: now });

      const weeklyData: WeeklyTraffic[] = [];

      for (let i = 0; i < weeks.length; i++) {
        const weekStart = startOfWeek(weeks[i]);
        const weekEnd = endOfWeek(weeks[i]);

        let count = 0;

        if (type === 'users') {
          const { count: userCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', weekStart.toISOString())
            .lte('created_at', weekEnd.toISOString());
          count = userCount || 0;
        } else {
          const { count: centerCount } = await supabase
            .from('repair_center_applications')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', weekStart.toISOString())
            .lte('created_at', weekEnd.toISOString());
          count = centerCount || 0;
        }

        // Calculate trend based on previous week
        const prevCount = weeklyData[i - 1]?.count || 0;
        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (count > prevCount * 1.1) trend = 'up';
        else if (count < prevCount * 0.9) trend = 'down';

        // Determine heat level
        let heat: 'hot' | 'warm' | 'cool' | 'cold' = 'cool';
        if (count >= 10) heat = 'hot';
        else if (count >= 5) heat = 'warm';
        else if (count >= 2) heat = 'cool';
        else heat = 'cold';

        weeklyData.push({
          week: format(weekStart, 'MMM dd'),
          count,
          trend,
          heat,
        });
      }

      return weeklyData;
    },
  });

  const getHeatColor = (heat: string) => {
    switch (heat) {
      case 'hot': return 'bg-destructive/20 text-destructive border-destructive/30';
      case 'warm': return 'bg-warning/20 text-warning border-warning/30';
      case 'cool': return 'bg-primary/20 text-primary border-primary/30';
      case 'cold': return 'bg-muted text-muted-foreground border-muted';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-3 w-3 text-success" />;
      case 'down': return <TrendingDown className="h-3 w-3 text-destructive" />;
      default: return <Minus className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const currentHeat = trafficData?.[trafficData.length - 1]?.heat || 'cold';
  const totalCount = trafficData?.reduce((sum, week) => sum + week.count, 0) || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {type === 'users' ? 'User Traffic Heat' : 'RC Application Traffic'}
          </span>
          <Badge className={getHeatColor(currentHeat)}>
            {currentHeat === 'hot' && <Flame className="h-3 w-3 mr-1" />}
            {currentHeat === 'cold' && <Snowflake className="h-3 w-3 mr-1" />}
            {currentHeat.toUpperCase()}
          </Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Total: <strong className="text-foreground">{totalCount}</strong> in last {dateRange} days
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
            {trafficData?.map((week, index) => (
              <div
                key={index}
                className={`rounded-lg p-2 text-center border ${getHeatColor(week.heat)}`}
              >
                <div className="text-xs opacity-70">{week.week}</div>
                <div className="text-lg font-bold">{week.count}</div>
                <div className="flex justify-center">{getTrendIcon(week.trend)}</div>
              </div>
            ))}
          </div>
        )}
        
        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-2 justify-center text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-destructive/20 border border-destructive/30" />
            <span>Hot (10+)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-warning/20 border border-warning/30" />
            <span>Warm (5-9)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-primary/20 border border-primary/30" />
            <span>Cool (2-4)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-muted border border-muted" />
            <span>Cold (0-1)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TrafficHeatIndicator;
