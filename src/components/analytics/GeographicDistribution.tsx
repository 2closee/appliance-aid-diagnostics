import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays } from "date-fns";
import { MapPin, Users, Building2 } from "lucide-react";

interface GeographicDistributionProps {
  dateRange: number;
  type: 'users' | 'centers';
}

interface LocationCount {
  location: string;
  count: number;
  percentage: number;
}

// Helper function to extract state from Nigerian addresses
const extractState = (address: string): string => {
  const nigerianStates = [
    'Lagos', 'Abuja', 'FCT', 'Kano', 'Rivers', 'Oyo', 'Kaduna', 'Enugu',
    'Delta', 'Ogun', 'Imo', 'Edo', 'Abia', 'Anambra', 'Benue', 'Borno',
    'Cross River', 'Ebonyi', 'Ekiti', 'Gombe', 'Jigawa', 'Kebbi', 'Kogi',
    'Kwara', 'Nassarawa', 'Niger', 'Ondo', 'Osun', 'Plateau', 'Sokoto',
    'Taraba', 'Yobe', 'Zamfara', 'Bauchi', 'Bayelsa', 'Adamawa', 'Akwa Ibom'
  ];

  const addressLower = address.toLowerCase();
  for (const state of nigerianStates) {
    if (addressLower.includes(state.toLowerCase())) {
      return state;
    }
  }
  return 'Other';
};

const GeographicDistribution = ({ dateRange, type }: GeographicDistributionProps) => {
  const { data: distribution, isLoading } = useQuery({
    queryKey: ['geographic-distribution', dateRange, type],
    queryFn: async (): Promise<LocationCount[]> => {
      const startDate = subDays(new Date(), dateRange);
      const locationCounts: Record<string, number> = {};

      if (type === 'users') {
        // Get user locations from repair jobs
        const { data: jobs } = await supabase
          .from('repair_jobs')
          .select('pickup_address')
          .gte('created_at', startDate.toISOString());

        jobs?.forEach(job => {
          if (job.pickup_address) {
            const state = extractState(job.pickup_address);
            locationCounts[state] = (locationCounts[state] || 0) + 1;
          }
        });
      } else {
        // Get repair center application locations
        const { data: applications } = await supabase
          .from('repair_center_applications')
          .select('state')
          .gte('created_at', startDate.toISOString());

        applications?.forEach(app => {
          const state = app.state || 'Other';
          locationCounts[state] = (locationCounts[state] || 0) + 1;
        });

        // Also get active repair centers
        const { data: centers } = await supabase
          .from('Repair Center')
          .select('address')
          .eq('status', 'active')
          .is('deleted_at', null);

        centers?.forEach(center => {
          if (center.address && center.address !== 'Full address') {
            const state = extractState(center.address);
            locationCounts[state] = (locationCounts[state] || 0) + 1;
          }
        });
      }

      // Convert to array and calculate percentages
      const total = Object.values(locationCounts).reduce((sum, count) => sum + count, 0);
      const result = Object.entries(locationCounts)
        .map(([location, count]) => ({
          location,
          count,
          percentage: total > 0 ? Math.round((count / total) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5); // Top 5

      return result;
    },
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {type === 'users' ? (
            <Users className="h-4 w-4 text-primary" />
          ) : (
            <Building2 className="h-4 w-4 text-success" />
          )}
          {type === 'users' ? 'Top User Locations' : 'Top Center Locations'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </>
        ) : distribution && distribution.length > 0 ? (
          distribution.map((item, index) => (
            <div key={index} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-foreground">{item.location}</span>
                <span className="text-muted-foreground">{item.count} ({item.percentage}%)</span>
              </div>
              <Progress 
                value={item.percentage} 
                className="h-2" 
              />
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No location data available
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default GeographicDistribution;
