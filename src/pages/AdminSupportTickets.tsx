import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navigation from "@/components/Navigation";
import { Loader2, Filter, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type SupportTicket = Database["public"]["Tables"]["support_tickets"]["Row"];

const statusConfig = {
  open: { color: "bg-blue-500", label: "Open" },
  in_progress: { color: "bg-yellow-500", label: "In Progress" },
  resolved: { color: "bg-green-500", label: "Resolved" },
  closed: { color: "bg-gray-500", label: "Closed" },
};

const priorityConfig = {
  low: { color: "secondary", label: "Low" },
  medium: { color: "default", label: "Medium" },
  high: { color: "destructive", label: "High" },
  urgent: { color: "destructive", label: "Urgent" },
};

export default function AdminSupportTickets() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");

  useEffect(() => {
    if (!user || !isAdmin) {
      navigate("/dashboard");
      return;
    }

    fetchTickets();
    subscribeToTickets();
  }, [user, isAdmin, navigate]);

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

  const subscribeToTickets = () => {
    const channel = supabase
      .channel("admin-tickets")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_tickets",
        },
        () => {
          fetchTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === "resolved" && !tickets.find(t => t.id === ticketId)?.resolved_at) {
        updateData.resolved_at = new Date().toISOString();
      }
      if (newStatus === "closed" && !tickets.find(t => t.id === ticketId)?.closed_at) {
        updateData.closed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("support_tickets")
        .update(updateData)
        .eq("id", ticketId);

      if (error) throw error;
      toast.success("Ticket status updated");
    } catch (error) {
      console.error("Error updating ticket:", error);
      toast.error("Failed to update ticket status");
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    if (filterStatus !== "all" && ticket.status !== filterStatus) return false;
    if (filterPriority !== "all" && ticket.priority !== filterPriority) return false;
    return true;
  });

  const ticketsByStatus = {
    open: filteredTickets.filter((t) => t.status === "open"),
    in_progress: filteredTickets.filter((t) => t.status === "in_progress"),
    resolved: filteredTickets.filter((t) => t.status === "resolved"),
    closed: filteredTickets.filter((t) => t.status === "closed"),
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

  const TicketCard = ({ ticket }: { ticket: SupportTicket }) => (
    <Card
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => navigate(`/support-tickets/${ticket.id}`)}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className={`h-2 w-2 rounded-full ${statusConfig[ticket.status].color}`} />
              <Badge variant={priorityConfig[ticket.priority].color as any}>
                {priorityConfig[ticket.priority].label}
              </Badge>
              <span className="text-xs text-muted-foreground">{ticket.category}</span>
            </div>
            <CardTitle className="text-lg mb-1">{ticket.subject}</CardTitle>
            <CardDescription className="line-clamp-2">
              {ticket.description}
            </CardDescription>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground ml-4 flex-shrink-0" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
          </span>
          <div onClick={(e) => e.stopPropagation()}>
            <Select
              value={ticket.status}
              onValueChange={(value) => handleStatusChange(ticket.id, value)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Navigation />
      
      <div className="container max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Support Tickets Management</h1>
          <p className="text-muted-foreground">View and manage all customer support tickets</p>
        </div>

        <div className="flex gap-4 mb-6">
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter by priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="open" onValueChange={setFilterStatus}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="open">
              Open ({ticketsByStatus.open.length})
            </TabsTrigger>
            <TabsTrigger value="in_progress">
              In Progress ({ticketsByStatus.in_progress.length})
            </TabsTrigger>
            <TabsTrigger value="resolved">
              Resolved ({ticketsByStatus.resolved.length})
            </TabsTrigger>
            <TabsTrigger value="closed">
              Closed ({ticketsByStatus.closed.length})
            </TabsTrigger>
          </TabsList>

          {(["open", "in_progress", "resolved", "closed"] as const).map((status) => (
            <TabsContent key={status} value={status} className="space-y-4">
              {ticketsByStatus[status].length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <p className="text-muted-foreground">
                      No {statusConfig[status].label.toLowerCase()} tickets
                    </p>
                  </CardContent>
                </Card>
              ) : (
                ticketsByStatus[status].map((ticket) => (
                  <TicketCard key={ticket.id} ticket={ticket} />
                ))
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}