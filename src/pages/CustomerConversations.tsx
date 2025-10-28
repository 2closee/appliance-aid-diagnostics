import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, ArrowLeft, Loader2, Store } from "lucide-react";
import { format } from "date-fns";
import { useConversationNotifications } from "@/hooks/useConversationNotifications";

interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  status: string;
  repair_center: {
    id: number;
    name: string;
  };
  repair_jobs?: {
    id: string;
    appliance_type: string;
    job_status: string;
  };
}

const CustomerConversations = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { unreadCounts } = useConversationNotifications(undefined, user?.id);

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["customer-conversations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select(`
          *,
          repair_center:"Repair Center"!repair_center_id(id, name),
          repair_jobs(id, appliance_type, job_status)
        `)
        .eq("customer_id", user?.id)
        .order("updated_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const handleViewChat = (conversation: Conversation) => {
    navigate("/repair-center-chat", {
      state: {
        conversationId: conversation.id,
        selectedCenter: conversation.repair_center,
        repairJobId: conversation.repair_jobs?.id
      }
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  const activeConversations = conversations?.filter(c => c.status === 'active') || [];
  const closedConversations = conversations?.filter(c => c.status !== 'active') || [];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Conversations</h1>
          <p className="text-muted-foreground">
            View and manage your conversations with repair centers
          </p>
        </div>

        {!conversations || conversations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No conversations yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Start a conversation with a repair center from your repair jobs
              </p>
              <Button onClick={() => navigate("/repair-jobs")}>
                View My Repair Jobs
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Active Conversations */}
            {activeConversations.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Active Conversations</h2>
                <div className="grid gap-4">
                  {activeConversations.map((conversation) => {
                    const unreadCount = unreadCounts[conversation.id] || 0;
                    return (
                      <Card key={conversation.id} className="hover:shadow-md transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <Store className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <CardTitle className="text-lg">
                                  {conversation.repair_center?.name}
                                </CardTitle>
                                {conversation.repair_jobs && (
                                  <CardDescription>
                                    {conversation.repair_jobs.appliance_type} Repair
                                  </CardDescription>
                                )}
                              </div>
                            </div>
                            {unreadCount > 0 && (
                              <Badge variant="destructive">
                                {unreadCount} new
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              Last updated {format(new Date(conversation.updated_at), "MMM d, yyyy 'at' h:mm a")}
                            </span>
                            <Button onClick={() => handleViewChat(conversation)}>
                              <MessageCircle className="h-4 w-4 mr-2" />
                              View Chat
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Closed Conversations */}
            {closedConversations.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Past Conversations</h2>
                <div className="grid gap-4">
                  {closedConversations.map((conversation) => (
                    <Card key={conversation.id} className="opacity-75">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                              <Store className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">
                                {conversation.repair_center?.name}
                              </CardTitle>
                              {conversation.repair_jobs && (
                                <CardDescription>
                                  {conversation.repair_jobs.appliance_type} Repair
                                </CardDescription>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline">Closed</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Last updated {format(new Date(conversation.updated_at), "MMM d, yyyy 'at' h:mm a")}
                          </span>
                          <Button variant="outline" onClick={() => handleViewChat(conversation)}>
                            <MessageCircle className="h-4 w-4 mr-2" />
                            View History
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerConversations;
