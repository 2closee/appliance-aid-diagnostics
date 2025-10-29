import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import { ArrowLeft, User, Wrench, Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const AdminConversationView = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const { conversation } = location.state || {};

  const { data: messages, isLoading } = useQuery({
    queryKey: ["conversation-messages", conversation?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!conversation?.id && isAdmin && !authLoading,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    toast.error("Access denied. Admin privileges required.");
    navigate("/");
    return null;
  }

  if (!conversation) {
    navigate("/admin-conversations");
    return null;
  }

  const isDiagnostic = conversation.source === 'diagnostic';

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin-conversations')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Conversation Details</h1>
            <p className="text-muted-foreground mt-2">Read-only investigative view</p>
          </div>
        </div>

        {/* Conversation Info */}
        <Card>
          <CardHeader>
            <CardTitle>Conversation Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Customer</p>
                <p className="text-lg">{conversation.repair_jobs?.[0]?.customer_name || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Repair Center</p>
                <p className="text-lg">{conversation.repair_center_name || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge variant={conversation.status === 'active' ? 'default' : 'secondary'}>
                  {conversation.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Source</p>
                <Badge variant={isDiagnostic ? 'secondary' : 'outline'}>
                  {isDiagnostic && <Bot className="h-3 w-3 mr-1" />}
                  {isDiagnostic ? 'Diagnostic' : 'Direct'}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Created</p>
                <p>{format(new Date(conversation.created_at), 'PPp')}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                <p>{format(new Date(conversation.updated_at), 'PPp')}</p>
              </div>
            </div>

            {isDiagnostic && conversation.diagnostic_summary && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium mb-2">AI Diagnostic Summary</p>
                <p className="text-sm text-muted-foreground">{conversation.diagnostic_summary}</p>
              </div>
            )}

            {conversation.repair_jobs?.[0] && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium mb-2">Related Job</p>
                <p className="text-sm text-muted-foreground">
                  {conversation.repair_jobs[0].appliance_type} - 
                  <span className="ml-1 capitalize">
                    {conversation.repair_jobs[0].job_status?.replace('_', ' ')}
                  </span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Messages */}
        <Card>
          <CardHeader>
            <CardTitle>Message History</CardTitle>
            <CardDescription>Complete conversation thread (read-only)</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : messages && messages.length > 0 ? (
              <ScrollArea className="h-[500px] w-full rounded-md border p-4">
                <div className="space-y-4">
                  {messages.map((message: any) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${message.sender_type === 'customer' ? 'justify-start' : 'justify-end'}`}
                    >
                      {message.sender_type === 'customer' && (
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                      
                      <div className={`flex flex-col ${message.sender_type === 'repair_center' ? 'items-end' : ''} flex-1 max-w-[70%]`}>
                        <div className="flex items-center gap-2 mb-1">
                          {message.is_auto_reply && (
                            <Badge variant="outline" className="text-xs">Auto-reply</Badge>
                          )}
                          {message.priority !== 'normal' && (
                            <Badge variant="destructive" className="text-xs">
                              {message.priority}
                            </Badge>
                          )}
                        </div>
                        <div
                          className={`rounded-lg px-4 py-2 w-full ${
                            message.sender_type === 'repair_center'
                              ? 'bg-primary text-primary-foreground'
                              : message.is_auto_reply
                              ? 'bg-blue-500/10 border border-blue-500/20'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                        </div>
                        <span className="text-xs text-muted-foreground mt-1">
                          {format(new Date(message.created_at), 'PPp')}
                          {message.is_read && <span className="ml-2">✓ Read</span>}
                        </span>
                      </div>

                      {message.sender_type === 'repair_center' && (
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            <Wrench className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No messages in this conversation yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminConversationView;
