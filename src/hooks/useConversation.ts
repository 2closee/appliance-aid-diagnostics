import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface Conversation {
  id: string;
  repair_job_id?: string;
  repair_center_id: number;
  customer_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface DiagnosticContext {
  conversationId: string;
  summary: string;
  attachments?: any;
}

export const useConversation = (
  repairCenterId?: number, 
  repairJobId?: string, 
  diagnosticContext?: DiagnosticContext
) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !repairCenterId) return;

    const findOrCreateConversation = async () => {
      setIsLoading(true);

      // Try to find existing conversation
      const { data: existing, error: fetchError } = await supabase
        .from('conversations')
        .select('id')
        .eq('customer_id', user.id)
        .eq('repair_center_id', repairCenterId)
        .eq('status', 'active')
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching conversation:', fetchError);
        toast({
          title: "Error",
          description: "Failed to load conversation",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      if (existing) {
        setConversationId(existing.id);
        setIsLoading(false);
        return;
      }

      // Create new conversation with diagnostic context if provided
      const insertData: any = {
        customer_id: user.id,
        repair_center_id: repairCenterId,
        repair_job_id: repairJobId,
        status: 'active'
      };

      if (diagnosticContext) {
        insertData.diagnostic_conversation_id = diagnosticContext.conversationId;
        insertData.source = 'diagnostic';
        insertData.diagnostic_summary = diagnosticContext.summary;
      }

      const { data: newConv, error: createError } = await supabase
        .from('conversations')
        .insert(insertData)
        .select('id')
        .single();

      if (createError) {
        console.error('Error creating conversation:', createError);
        toast({
          title: "Error",
          description: "Failed to create conversation",
          variant: "destructive"
        });
      } else {
        setConversationId(newConv.id);
      }

      setIsLoading(false);
    };

    findOrCreateConversation();
  }, [user, repairCenterId, repairJobId, diagnosticContext, toast]);

  return { conversationId, isLoading };
};
