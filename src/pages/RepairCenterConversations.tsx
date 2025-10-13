import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import { Link, useNavigate } from "react-router-dom";
import { MessageCircle, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const RepairCenterConversations = () => {
  const { repairCenterId } = useAuth();
  const navigate = useNavigate();

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
      return data;
    },
    enabled: !!repairCenterId,
  });

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
                {conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <MessageCircle className="h-4 w-4 text-primary" />
                          <h3 className="font-medium">
                            {conversation.repair_jobs?.[0]?.customer_name || 'Customer'}
                          </h3>
                          <Badge variant={conversation.status === 'active' ? 'default' : 'secondary'}>
                            {conversation.status}
                          </Badge>
                        </div>
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
                      
                      <Link 
                        to="/repair-center-chat" 
                        state={{ 
                          conversationId: conversation.id,
                          repairJobId: conversation.repair_job_id 
                        }}
                      >
                        <Button variant="outline" size="sm">
                          View Chat
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
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
