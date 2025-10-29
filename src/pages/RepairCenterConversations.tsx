import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import { useNavigate } from "react-router-dom";
import { MessageCircle, ArrowLeft, Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useConversationNotifications } from "@/hooks/useConversationNotifications";

const RepairCenterConversations = () => {
  const { repairCenterId } = useAuth();
  const navigate = useNavigate();
  const { unreadCounts, markConversationAsRead } = useConversationNotifications(repairCenterId || undefined);

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["repair-center-conversations", repairCenterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select(`
          *,
          repair_jobs (
            id,
            appliance_type,
            customer_name,
            job_status
          )
        `)
        .eq("repair_center_id", repairCenterId)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      
      // Fetch repair center name for each conversation
      if (data) {
        const centerIds = [...new Set(data.map(c => c.repair_center_id))];
        const { data: centers } = await supabase
          .from('Repair Center')
          .select('id, name')
          .in('id', centerIds);
        
        const centerMap = new Map(centers?.map(c => [c.id, c.name]) || []);
        
        return data.map(conv => ({
          ...conv,
          repair_center_name: centerMap.get(conv.repair_center_id)
        }));
      }
      
      return data;
    },
    enabled: !!repairCenterId,
  });

  const handleViewChat = async (conversation: any) => {
    // Mark conversation as read
    await markConversationAsRead(conversation.id);
    
    // Navigate to chat with conversation details
    navigate('/repair-center-chat', {
      state: {
        conversationId: conversation.id,
        repairJobId: conversation.repair_job_id,
        selectedCenter: {
          id: conversation.repair_center_id,
          name: conversation.repair_center_name
        }
      }
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Customer Conversations</h1>
            <p className="text-muted-foreground mt-2">View and manage all customer chats</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Active Conversations</CardTitle>
            <CardDescription>All conversations with customers</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-20 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : conversations && conversations.length > 0 ? (
              <div className="space-y-4">
                {conversations.map((conversation) => {
                  const isDiagnosticOrigin = (conversation as any).source === 'diagnostic';
                  return (
                  <div
                    key={conversation.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <MessageCircle className="h-4 w-4 text-primary" />
                          <h3 className="font-medium">
                            {conversation.repair_jobs?.[0]?.customer_name || 'Customer'}
                          </h3>
                          {isDiagnosticOrigin && (
                            <Badge variant="secondary" className="text-xs">
                              <Bot className="h-3 w-3 mr-1" />
                              From AI Diagnosis
                            </Badge>
                          )}
                          <Badge variant={conversation.status === 'active' ? 'default' : 'secondary'}>
                            {conversation.status}
                          </Badge>
                          {unreadCounts[conversation.id] > 0 && (
                            <Badge variant="destructive" className="ml-2">
                              {unreadCounts[conversation.id]} new
                            </Badge>
                          )}
                        </div>
                        {isDiagnosticOrigin && (conversation as any).diagnostic_summary && (
                          <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                            AI Diagnosis: {(conversation as any).diagnostic_summary}
                          </p>
                        )}
                        {conversation.repair_jobs?.[0] && (
                          <p className="text-sm text-muted-foreground">
                            Job: {conversation.repair_jobs[0].appliance_type} - 
                            <span className="ml-1 capitalize">
                              {conversation.repair_jobs[0].job_status?.replace('_', ' ')}
                            </span>
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Last updated: {format(new Date(conversation.updated_at), 'PPp')}
                        </p>
                      </div>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewChat(conversation)}
                      >
                        View Chat
                      </Button>
                    </div>
                  </div>
                );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No conversations yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default RepairCenterConversations;
