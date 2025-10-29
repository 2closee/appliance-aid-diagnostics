import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, User, Wrench, Circle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: 'customer' | 'repair_center';
  content: string;
  attachment_url?: string;
  is_read: boolean;
  is_auto_reply: boolean;
  priority: 'normal' | 'high' | 'urgent';
  created_at: string;
}

interface DiagnosticContext {
  conversationId: string;
  summary: string;
  attachments?: any;
  estimatedCost?: { min: number; max: number };
  confidenceScore?: number;
}

interface LiveChatProps {
  conversationId: string;
  repairCenterName?: string;
  repairCenterId?: number;
  diagnosticContext?: DiagnosticContext;
}

const LiveChat = ({ conversationId, repairCenterName, repairCenterId, diagnosticContext }: LiveChatProps) => {
  const { user, isRepairCenterStaff, repairCenterId: userRepairCenterId } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('normal');
  const scrollRef = useRef<HTMLDivElement>(null);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!conversationId) return;

    // Fetch initial messages
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      setMessages((data || []) as Message[]);
    };

    fetchMessages();

    // Fetch repair center online status
    if (repairCenterId) {
      const fetchOnlineStatus = async () => {
        const { data } = await supabase
          .from('repair_center_settings')
          .select('is_online')
          .eq('repair_center_id', repairCenterId)
          .maybeSingle();
        
        if (data) {
          setIsOnline(data.is_online);
        }
      };
      fetchOnlineStatus();
    }

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    // Presence tracking for online status
    if (!isRepairCenterStaff && repairCenterId) {
      presenceChannelRef.current = supabase.channel(`presence-rc-${repairCenterId}`)
        .on('presence', { event: 'sync' }, () => {
          const state = presenceChannelRef.current?.presenceState();
          setIsOnline(state && Object.keys(state).length > 0);
        })
        .subscribe();
    }

    // Update online status for repair center staff
    if (isRepairCenterStaff && userRepairCenterId) {
      supabase
        .from('repair_center_settings')
        .update({ 
          is_online: true,
          last_activity_at: new Date().toISOString()
        })
        .eq('repair_center_id', userRepairCenterId)
        .then();

      // Join presence channel
      presenceChannelRef.current = supabase.channel(`presence-rc-${userRepairCenterId}`)
        .on('presence', { event: 'sync' }, () => {
          const state = presenceChannelRef.current?.presenceState();
          const typing = Object.values(state || {})
            .flat()
            .filter((p: any) => p.typing && p.user_id !== user?.id)
            .map((p: any) => p.user_id);
          setTypingUsers(new Set(typing));
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await presenceChannelRef.current?.track({
              user_id: user?.id,
              online_at: new Date().toISOString(),
              typing: false
            });
          }
        });
    }

    return () => {
      supabase.removeChannel(channel);
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
      }
      if (isRepairCenterStaff && userRepairCenterId) {
        supabase
          .from('repair_center_settings')
          .update({ is_online: false })
          .eq('repair_center_id', userRepairCenterId)
          .then();
      }
    };
  }, [conversationId, repairCenterId, isRepairCenterStaff, userRepairCenterId, user?.id]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }

    // Mark messages as read for repair center staff
    if (isRepairCenterStaff && messages.length > 0) {
      const unreadMessages = messages.filter(
        m => !m.is_read && m.sender_type === 'customer'
      );
      
      if (unreadMessages.length > 0) {
        supabase
          .from('messages')
          .update({ is_read: true })
          .in('id', unreadMessages.map(m => m.id))
          .then();
      }
    }
  }, [messages, isRepairCenterStaff]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    setIsLoading(true);

    // Insert user message
    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        sender_type: isRepairCenterStaff ? 'repair_center' : 'customer',
        content: newMessage.trim(),
        priority
      });

    if (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    // Check if auto-reply needed (customer sending to offline repair center)
    // Skip auto-reply for diagnostic-originated conversations
    if (!isRepairCenterStaff && repairCenterId && !isOnline && !diagnosticContext) {
      const { data: settings } = await supabase
        .from('repair_center_settings')
        .select('auto_reply_enabled, auto_reply_message')
        .eq('repair_center_id', repairCenterId)
        .maybeSingle();

      if (settings?.auto_reply_enabled && settings?.auto_reply_message) {
        // Send auto-reply
        await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender_id: user.id, // System uses user's ID to avoid auth issues
            sender_type: 'repair_center',
            content: settings.auto_reply_message,
            is_auto_reply: true
          });
      }
    }

    setNewMessage("");
    setPriority('normal');
    setIsLoading(false);
  };

  const handleTyping = () => {
    if (!presenceChannelRef.current || !user?.id) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Update presence to show typing
    presenceChannelRef.current.track({
      user_id: user.id,
      online_at: new Date().toISOString(),
      typing: true
    });

    // Clear typing status after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      presenceChannelRef.current?.track({
        user_id: user.id,
        online_at: new Date().toISOString(),
        typing: false
      });
    }, 3000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      default:
        return '';
    }
  };

  return (
    <Card className="w-full h-[600px] flex flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            {repairCenterName ? `Chat with ${repairCenterName}` : 'Live Chat'}
          </CardTitle>
          {!isRepairCenterStaff && (
            <div className="flex items-center gap-2">
              <Circle className={`h-2 w-2 ${isOnline ? 'fill-green-500 text-green-500' : 'fill-gray-400 text-gray-400'}`} />
              <span className="text-sm text-muted-foreground">
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        {/* Diagnostic Context Card */}
        {diagnosticContext && (
          <div className="p-4 bg-muted/50 border-b">
            <div className="flex items-start gap-3">
              <Badge variant="secondary" className="mt-0.5">AI Diagnosis</Badge>
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium">{diagnosticContext.summary}</p>
                {diagnosticContext.estimatedCost && (
                  <p className="text-xs text-muted-foreground">
                    Estimated: ₦{diagnosticContext.estimatedCost.min.toLocaleString()} - 
                    ₦{diagnosticContext.estimatedCost.max.toLocaleString()}
                  </p>
                )}
                {diagnosticContext.confidenceScore && (
                  <p className="text-xs text-muted-foreground">
                    Confidence: {(diagnosticContext.confidenceScore * 100).toFixed(0)}%
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message) => {
              const isOwnMessage = message.sender_id === user?.id && !message.is_auto_reply;
              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {message.sender_type === 'customer' ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Wrench className="h-4 w-4" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`flex flex-col ${isOwnMessage ? 'items-end' : ''} flex-1 max-w-[70%]`}>
                    <div className="flex items-center gap-2 mb-1">
                      {message.is_auto_reply && (
                        <Badge variant="outline" className="text-xs">Auto-reply</Badge>
                      )}
                      {message.priority !== 'normal' && (
                        <Badge className={getPriorityColor(message.priority)}>
                          {message.priority === 'urgent' && <AlertCircle className="h-3 w-3 mr-1" />}
                          {message.priority}
                        </Badge>
                      )}
                    </div>
                    <div
                      className={`rounded-lg px-4 py-2 w-full ${
                        isOwnMessage
                          ? 'bg-primary text-primary-foreground'
                          : message.is_auto_reply
                          ? 'bg-blue-500/10 border border-blue-500/20'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                    </div>
                    <span className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              );
            })}
            {typingUsers.size > 0 && (
              <div className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    <Wrench className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-lg px-4 py-2">
                  <p className="text-sm text-muted-foreground italic">Typing...</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="p-4 border-t space-y-2">
          {!isRepairCenterStaff && (
            <div className="flex gap-2">
              <Button
                variant={priority === 'normal' ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setPriority('normal')}
              >
                Normal
              </Button>
              <Button
                variant={priority === 'high' ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setPriority('high')}
              >
                High
              </Button>
              <Button
                variant={priority === 'urgent' ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setPriority('urgent')}
                className="text-red-500"
              >
                <AlertCircle className="h-4 w-4 mr-1" />
                Urgent
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            <Input
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
            />
            <Button onClick={sendMessage} disabled={isLoading || !newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LiveChat;
