import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Star, MessageCircle, Loader2, Wrench } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface RecommendedCenter {
  id: number;
  name: string;
  general_location: string;
  specialties?: string;
  years_of_experience?: number;
  average_rating?: number;
  total_reviews?: number;
  reason: string;
}

interface RecommendedCentersPanelProps {
  appliance: string;
  diagnosis: string;
  report?: any;
  transcript?: { role: string; content: string }[];
  diagnosticConversationId?: string | null;
  attachments?: any;
}

export const RecommendedCentersPanel = ({
  appliance,
  diagnosis,
  report,
  transcript = [],
  diagnosticConversationId,
  attachments,
}: RecommendedCentersPanelProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [centers, setCenters] = useState<RecommendedCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [handingOff, setHandingOff] = useState<number | null>(null);
  const [area, setArea] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('recommend-centers-for-diagnosis', {
        body: { applianceType: appliance, diagnosis, area },
      });
      if (cancelled) return;
      if (error) {
        console.error('Failed to load recommendations:', error);
      } else {
        setCenters(data?.centers || []);
      }
      setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [appliance, diagnosis, area]);

  // Best-effort area hint from saved addresses (used to rank nearby centers).
  useEffect(() => {
    if (!user) return;
    supabase
      .from('saved_addresses')
      .select('city, state')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setArea([data.city, data.state].filter(Boolean).join(' '));
      });
  }, [user]);

  const handleSelect = async (center: RecommendedCenter) => {
    if (!user) {
      navigate('/auth?redirect=/diagnostic');
      return;
    }

    setHandingOff(center.id);
    try {
      const { data, error } = await supabase.functions.invoke('handoff-diagnostic-to-center', {
        body: {
          repairCenterId: center.id,
          appliance,
          diagnosis,
          report,
          transcript,
          diagnosticConversationId,
          attachments,
        },
      });

      if (error) throw error;

      toast({
        title: `Sent to ${center.name}`,
        description: 'Your AI diagnosis and chat history were shared. They will respond shortly.',
      });

      navigate('/repair-center-chat', {
        state: {
          conversationId: data.conversationId,
          selectedCenter: { id: center.id, name: center.name },
          diagnosticContext: {
            conversationId: diagnosticConversationId,
            summary: diagnosis,
            attachments,
            estimatedCost: report?.estimatedCost,
            confidenceScore: report?.confidenceScore,
          },
        },
      });
    } catch (err: any) {
      toast({
        title: 'Could not connect you',
        description: err.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setHandingOff(null);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wrench className="h-5 w-5 text-primary" />
          Recommended repair centers
        </CardTitle>
        <CardDescription>
          FixBudi partners that handle this kind of fault near you. Your diagnosis and chat are shared automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Finding centers that can handle this...
          </div>
        ) : centers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            No partner centers available yet. You can still{' '}
            <Button variant="link" className="p-0 h-auto" onClick={() => navigate('/repair-centers')}>
              browse all centers
            </Button>
            .
          </p>
        ) : (
          centers.map((center) => (
            <div
              key={center.id}
              className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg border hover:border-primary/50 transition-colors"
            >
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold">{center.name}</h4>
                  {!!center.average_rating && (
                    <Badge variant="outline" className="text-xs">
                      <Star className="h-3 w-3 mr-1 text-primary" />
                      {Number(center.average_rating).toFixed(1)}
                      {!!center.total_reviews && ` (${center.total_reviews})`}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {center.general_location}
                </p>
                <p className="text-xs text-primary">Why: {center.reason}</p>
                {center.specialties && (
                  <div className="flex gap-1 flex-wrap pt-1">
                    {center.specialties.split(',').slice(0, 3).map((s) => (
                      <Badge key={s.trim()} variant="secondary" className="text-[10px]">
                        {s.trim()}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <Button
                onClick={() => handleSelect(center)}
                disabled={handingOff !== null}
                className="sm:w-44 shrink-0"
              >
                {handingOff === center.id ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <MessageCircle className="h-4 w-4 mr-2" />
                )}
                Chat with this center
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default RecommendedCentersPanel;
