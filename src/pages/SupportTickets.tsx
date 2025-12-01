import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/Navigation";
import { Loader2, Plus, MessageCircle, Clock, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type SupportTicket = Database["public"]["Tables"]["support_tickets"]["Row"];

const statusConfig = {
  open: { icon: MessageCircle, color: "bg-blue-500", label: "Open" },
  in_progress: { icon: Clock, color: "bg-yellow-500", label: "In Progress" },
  resolved: { icon: CheckCircle2, color: "bg-green-500", label: "Resolved" },
  closed: { icon: XCircle, color: "bg-gray-500", label: "Closed" },
};

const priorityConfig = {
  low: { color: "secondary", label: "Low" },
  medium: { color: "default", label: "Medium" },
  high: { color: "destructive", label: "High" },
  urgent: { color: "destructive", label: "Urgent" },
};

export default function SupportTickets() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    fetchTickets();
  }, [user, navigate]);

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast.error("Failed to load support tickets");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <Navigation />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Navigation />
      
      <div className="container max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Support Tickets</h1>
            <p className="text-muted-foreground mt-2">
              Track and manage your support requests
            </p>
          </div>
          <Button onClick={() => navigate("/contact-support")}>
            <Plus className="mr-2 h-4 w-4" />
            New Ticket
          </Button>
        </div>

        {tickets.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent className="space-y-4">
              <MessageCircle className="h-16 w-16 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-xl font-semibold mb-2">No support tickets yet</h3>
                <p className="text-muted-foreground mb-6">
                  Need help? Create a support ticket and we'll assist you right away.
                </p>
                <Button onClick={() => navigate("/contact-support")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Ticket
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => {
              const StatusIcon = statusConfig[ticket.status].icon;
              const statusColor = statusConfig[ticket.status].color;
              
              return (
                <Card
                  key={ticket.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate(`/support-tickets/${ticket.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`h-2 w-2 rounded-full ${statusColor}`} />
                          <Badge variant={priorityConfig[ticket.priority].color as any}>
                            {priorityConfig[ticket.priority].label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {ticket.category}
                          </span>
                        </div>
                        <CardTitle className="text-xl mb-1">{ticket.subject}</CardTitle>
                        <CardDescription className="line-clamp-2">
                          {ticket.description}
                        </CardDescription>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground ml-4 flex-shrink-0" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4 text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <StatusIcon className="h-4 w-4" />
                          <span>{statusConfig[ticket.status].label}</span>
                        </div>
                        <span>•</span>
                        <span>
                          Created {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}