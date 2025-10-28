import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface UnreadCounts {
  [conversationId: string]: number;
}

export const useConversationNotifications = (repairCenterId?: number) => {
  const { toast } = useToast();
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({});
  const [totalUnread, setTotalUnread] = useState(0);

  useEffect(() => {
    if (!repairCenterId) return;

    let channel: RealtimeChannel;

    const setupNotifications = async () => {
      // Fetch initial unread counts for all conversations
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id')
        .eq('repair_center_id', repairCenterId);

      if (conversations) {
        const counts: UnreadCounts = {};
        for (const conv of conversations) {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('is_read', false)
            .eq('sender_type', 'customer');
          
          if (count) {
            counts[conv.id] = count;
          }
        }
        setUnreadCounts(counts);
        setTotalUnread(Object.values(counts).reduce((sum, count) => sum + count, 0));
      }

      // Subscribe to new messages across all conversations
      channel = supabase
        .channel('repair-center-notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `sender_type=eq.customer`
          },
          async (payload: any) => {
            // Check if message belongs to this repair center's conversations
            const { data: conversation } = await supabase
              .from('conversations')
              .select('id, repair_job_id, repair_jobs(customer_name, appliance_type)')
              .eq('id', payload.new.conversation_id)
              .eq('repair_center_id', repairCenterId)
              .single();

            if (conversation) {
              // Update unread count for this conversation
              setUnreadCounts(prev => ({
                ...prev,
                [conversation.id]: (prev[conversation.id] || 0) + 1
              }));
              setTotalUnread(prev => prev + 1);

              // Show toast notification
              const jobInfo: any = conversation.repair_jobs;
              toast({
                title: "New Message",
                description: `${jobInfo?.customer_name || 'A customer'} sent you a message about ${jobInfo?.appliance_type || 'their repair'}.`,
              });
            }
          }
        )
        .subscribe();
    };

    setupNotifications();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [repairCenterId, toast]);

  const markConversationAsRead = async (conversationId: string) => {
    // Mark all messages in conversation as read
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .eq('sender_type', 'customer')
      .eq('is_read', false);

    if (!error) {
      setUnreadCounts(prev => {
        const newCounts = { ...prev };
        const prevCount = newCounts[conversationId] || 0;
        delete newCounts[conversationId];
        setTotalUnread(current => Math.max(0, current - prevCount));
        return newCounts;
      });
    }
  };

  return {
    unreadCounts,
    totalUnread,
    markConversationAsRead
  };
};
