import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Navigation from "@/components/Navigation";
import { useNavigate } from "react-router-dom";
import { MessageCircle, ArrowLeft, Bot, Search, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const AdminConversations = () => {
  const navigate = useNavigate();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["admin-conversations"],
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
        .order("updated_at", { ascending: false });

      if (error) throw error;
      
      // Fetch repair center names
      if (data) {
        const centerIds = [...new Set(data.map(c => c.repair_center_id))];
        const { data: centers } = await supabase
          .from('Repair Center')
          .select('id, name')
          .in('id', centerIds);
        
        const centerMap = new Map(centers?.map(c => [c.id, c.name]) || []);
        
        return data.map((conv: any) => ({
          ...conv,
          repair_center_name: centerMap.get(conv.repair_center_id)
        })) as any[];
      }
      
      return data;
    },
    enabled: isAdmin && !authLoading,
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

  const filteredConversations = conversations?.filter((conv: any) => {
    const matchesSearch = !searchQuery || 
      (conv.repair_jobs?.[0]?.customer_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (conv.repair_center_name?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesSource = sourceFilter === "all" || conv.source === sourceFilter;
    const matchesStatus = statusFilter === "all" || conv.status === statusFilter;
    
    return matchesSearch && matchesSource && matchesStatus;
  });

  const handleViewConversation = (conversation: any) => {
    navigate('/admin-conversation-view', {
      state: { conversation }
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">All Conversations</h1>
            <p className="text-muted-foreground mt-2">Investigative view of all customer and repair center conversations</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Conversation Filters</CardTitle>
            <CardDescription>Filter and search all conversations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customer or center..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="direct">Direct Contact</SelectItem>
                  <SelectItem value="diagnostic">From Diagnostic</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All Conversations ({filteredConversations?.length || 0})</CardTitle>
            <CardDescription>Complete conversation history for investigation</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-20 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : filteredConversations && filteredConversations.length > 0 ? (
              <div className="space-y-4">
                {filteredConversations.map((conversation: any) => {
                  const isDiagnostic = conversation.source === 'diagnostic';
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
                              {' → '} 
                              {conversation.repair_center_name || 'Repair Center'}
                            </h3>
                            {isDiagnostic && (
                              <Badge variant="secondary" className="text-xs">
                                <Bot className="h-3 w-3 mr-1" />
                                Diagnostic Origin
                              </Badge>
                            )}
                            <Badge variant={conversation.status === 'active' ? 'default' : 'secondary'}>
                              {conversation.status}
                            </Badge>
                          </div>
                          
                          {isDiagnostic && conversation.diagnostic_summary && (
                            <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                              AI Diagnosis: {conversation.diagnostic_summary}
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
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Created: {format(new Date(conversation.created_at), 'PPp')}</span>
                            <span>Updated: {format(new Date(conversation.updated_at), 'PPp')}</span>
                          </div>
                        </div>
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewConversation(conversation)}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No conversations found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminConversations;
