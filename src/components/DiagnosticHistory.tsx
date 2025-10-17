import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Clock, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface DiagnosticConversation {
  id: string;
  appliance_type: string;
  appliance_brand?: string;
  appliance_model?: string;
  final_diagnosis: string;
  confidence_score: number;
  created_at: string;
}

interface DiagnosticHistoryProps {
  onSelectConversation?: (conversationId: string) => void;
}

export const DiagnosticHistory = ({ onSelectConversation }: DiagnosticHistoryProps) => {
  const [conversations, setConversations] = useState<DiagnosticConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('diagnostic_conversations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error fetching diagnostic history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getConfidenceBadge = (score: number) => {
    if (score >= 0.8) return <Badge variant="default">High Confidence</Badge>;
    if (score >= 0.6) return <Badge variant="secondary">Medium Confidence</Badge>;
    return <Badge variant="outline">Low Confidence</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Diagnostic History
        </CardTitle>
        <CardDescription>Your previous diagnostic sessions</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No diagnostic history yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {conversations.map((conv) => (
                <Card key={conv.id} className="hover:bg-accent/50 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold">
                          {conv.appliance_brand && conv.appliance_model
                            ? `${conv.appliance_brand} ${conv.appliance_model}`
                            : conv.appliance_type}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(conv.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      {conv.confidence_score && getConfidenceBadge(conv.confidence_score)}
                    </div>
                    <p className="text-sm mb-3">{conv.final_diagnosis}</p>
                    {onSelectConversation && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onSelectConversation(conv.id)}
                        className="w-full"
                      >
                        <TrendingUp className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
