import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface UnreadCounts {
  [conversationId: string]: number;
}

export const useConversationNotifications = (repairCenterId?: number, customerId?: string) => {
  const { toast } = useToast();
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({});
  const [totalUnread, setTotalUnread] = useState(0);

  useEffect(() => {
    if (!repairCenterId && !customerId) return;

    let channel: RealtimeChannel;

    const setupNotifications = async () => {
      // Fetch initial unread counts for all conversations
      let conversationsQuery = supabase
        .from('conversations')
        .select('id');
      
      if (repairCenterId) {
        conversationsQuery = conversationsQuery.eq('repair_center_id', repairCenterId);
      } else if (customerId) {
        conversationsQuery = conversationsQuery.eq('customer_id', customerId);
      }

      const { data: conversations } = await conversationsQuery;

      if (conversations) {
        const counts: UnreadCounts = {};
        const senderType = repairCenterId ? 'customer' : 'repair_center';
        
        for (const conv of conversations) {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('is_read', false)
            .eq('sender_type', senderType);
          
          if (count) {
            counts[conv.id] = count;
          }
        }
        setUnreadCounts(counts);
        setTotalUnread(Object.values(counts).reduce((sum, count) => sum + count, 0));
      }

      // Subscribe to new messages across all conversations
      const channelName = repairCenterId 
        ? 'repair-center-notifications' 
        : 'customer-notifications';
      const filterSenderType = repairCenterId ? 'customer' : 'repair_center';
      
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `sender_type=eq.${filterSenderType}`
          },
          async (payload: any) => {
            // Check if message belongs to user's conversations
            let conversationQuery = supabase
              .from('conversations')
              .select('id, repair_job_id, repair_jobs(customer_name, appliance_type), repair_center:"Repair Center"!repair_center_id(name)')
              .eq('id', payload.new.conversation_id);
            
            if (repairCenterId) {
              conversationQuery = conversationQuery.eq('repair_center_id', repairCenterId);
            } else if (customerId) {
              conversationQuery = conversationQuery.eq('customer_id', customerId);
            }

            const { data: conversation } = await conversationQuery.single();

            if (conversation) {
              // Update unread count for this conversation
              setUnreadCounts(prev => ({
                ...prev,
                [conversation.id]: (prev[conversation.id] || 0) + 1
              }));
              setTotalUnread(prev => prev + 1);

              // Show toast notification
              if (repairCenterId) {
                const jobInfo: any = conversation.repair_jobs;
                toast({
                  title: "New Message",
                  description: `${jobInfo?.customer_name || 'A customer'} sent you a message about ${jobInfo?.appliance_type || 'their repair'}.`,
                });
              } else {
                const centerInfo: any = conversation.repair_center;
                toast({
                  title: "New Message",
                  description: `${centerInfo?.name || 'A repair center'} sent you a message.`,
                });
              }
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
  }, [repairCenterId, customerId, toast]);

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
