import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import Navigation from "@/components/Navigation";
import { Loader2, ArrowLeft, Send, User, Headset } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type SupportTicket = Database["public"]["Tables"]["support_tickets"]["Row"];
type TicketMessage = Database["public"]["Tables"]["support_ticket_messages"]["Row"];

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

export default function SupportTicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (id) {
      fetchTicketDetails();
      subscribeToMessages();
    }
  }, [user, id, navigate]);

  const fetchTicketDetails = async () => {
    try {
      const { data: ticketData, error: ticketError } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("id", id)
        .single();

      if (ticketError) throw ticketError;
      setTicket(ticketData);

      const { data: messagesData, error: messagesError } = await supabase
        .from("support_ticket_messages")
        .select("*")
        .eq("ticket_id", id)
        .order("created_at", { ascending: true });

      if (messagesError) throw messagesError;
      setMessages(messagesData || []);
    } catch (error) {
      console.error("Error fetching ticket:", error);
      toast.error("Failed to load ticket details");
      navigate("/support-tickets");
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`ticket-${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_ticket_messages",
          filter: `ticket_id=eq.${id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as TicketMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !ticket) return;

    setSending(true);
    try {
      const { error } = await supabase.from("support_ticket_messages").insert({
        ticket_id: ticket.id,
        user_id: user.id,
        message: newMessage,
        is_staff_response: false,
      });

      if (error) throw error;

      setNewMessage("");
      toast.success("Message sent");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
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

  if (!ticket) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Navigation />
      
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate("/support-tickets")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Tickets
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${statusConfig[ticket.status].color}`} />
                  <Badge variant={priorityConfig[ticket.priority].color as any}>
                    {priorityConfig[ticket.priority].label}
                  </Badge>
                  <Badge variant="outline">{ticket.category}</Badge>
                </div>
                <div>
                  <CardTitle className="text-2xl">{ticket.subject}</CardTitle>
                  <CardDescription className="mt-2">
                    Created {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Conversation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.is_staff_response ? "flex-row" : "flex-row-reverse"
                }`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    message.is_staff_response ? "bg-primary" : "bg-muted"
                  }`}
                >
                  {message.is_staff_response ? (
                    <Headset className="h-4 w-4 text-primary-foreground" />
                  ) : (
                    <User className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div
                  className={`flex-1 space-y-1 ${
                    message.is_staff_response ? "text-left" : "text-right"
                  }`}
                >
                  <div
                    className={`inline-block rounded-lg px-4 py-2 ${
                      message.is_staff_response
                        ? "bg-muted"
                        : "bg-primary text-primary-foreground"
                    }`}
                  >
                    <p className="text-sm">{message.message}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(message.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {ticket.status !== "closed" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Send a Message</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="min-h-[100px] resize-none"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="w-full"
                >
                  {sending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Message
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}