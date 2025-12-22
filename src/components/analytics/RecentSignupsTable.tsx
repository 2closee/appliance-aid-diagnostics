import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays, format } from "date-fns";
import { Users, Building2, MapPin, Calendar, Mail } from "lucide-react";

interface RecentSignupsTableProps {
  dateRange: number;
  type: 'users' | 'centers';
}

interface UserSignup {
  id: string;
  name: string;
  email: string;
  location: string;
  date: string;
}

interface CenterApplication {
  id: string;
  businessName: string;
  email: string;
  location: string;
  date: string;
  status: string;
}

const RecentSignupsTable = ({ dateRange, type }: RecentSignupsTableProps) => {
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['recent-users', dateRange],
    queryFn: async (): Promise<UserSignup[]> => {
      const startDate = subDays(new Date(), dateRange);

      // Get recent profiles with their job locations
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, created_at')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

      const results: UserSignup[] = [];

      for (const profile of profiles || []) {
        // Get location from their most recent job
        const { data: jobs } = await supabase
          .from('repair_jobs')
          .select('pickup_address')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(1);

        results.push({
          id: profile.id,
          name: profile.full_name || 'Unknown',
          email: profile.email || 'No email',
          location: jobs?.[0]?.pickup_address || 'No location data',
          date: profile.created_at || '',
        });
      }

      return results;
    },
    enabled: type === 'users',
  });

  const { data: centers, isLoading: centersLoading } = useQuery({
    queryKey: ['recent-center-applications', dateRange],
    queryFn: async (): Promise<CenterApplication[]> => {
      const startDate = subDays(new Date(), dateRange);

      const { data: applications } = await supabase
        .from('repair_center_applications')
        .select('id, business_name, email, address, city, state, created_at, status')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

      return (applications || []).map(app => ({
        id: app.id,
        businessName: app.business_name,
        email: app.email,
        location: `${app.city}, ${app.state}`,
        date: app.created_at,
        status: app.status,
      }));
    },
    enabled: type === 'centers',
  });

  const isLoading = type === 'users' ? usersLoading : centersLoading;
  const data = type === 'users' ? users : centers;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-success/20 text-success border-success/30">Approved</Badge>;
      case 'pending':
        return <Badge className="bg-warning/20 text-warning border-warning/30">Pending</Badge>;
      case 'rejected':
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {type === 'users' ? (
            <Users className="h-5 w-5 text-primary" />
          ) : (
            <Building2 className="h-5 w-5 text-success" />
          )}
          {type === 'users' ? 'Recent User Sign-ups' : 'Recent RC Applications'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="p-3 border rounded-lg space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              ))}
            </div>
          ) : data && data.length > 0 ? (
            <div className="space-y-3">
              {type === 'users' ? (
                (data as UserSignup[]).map((user) => (
                  <div key={user.id} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="font-medium text-foreground">{user.name}</div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                      <Mail className="h-3 w-3" />
                      {user.email}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {user.location.length > 40 ? `${user.location.substring(0, 40)}...` : user.location}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Calendar className="h-3 w-3" />
                      {user.date ? format(new Date(user.date), 'MMM dd, yyyy HH:mm') : 'Unknown'}
                    </div>
                  </div>
                ))
              ) : (
                (data as CenterApplication[]).map((center) => (
                  <div key={center.id} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-foreground">{center.businessName}</div>
                      {getStatusBadge(center.status)}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                      <Mail className="h-3 w-3" />
                      {center.email}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {center.location}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(center.date), 'MMM dd, yyyy HH:mm')}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
              {type === 'users' ? <Users className="h-12 w-12 mb-2" /> : <Building2 className="h-12 w-12 mb-2" />}
              <p>No data available for this period</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default RecentSignupsTable;
