import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface DiagnosticContext {
  conversationId: string;
  summary: string;
  attachments?: any;
}

export const useConversation = (
  repairCenterId?: number,
  repairJobId?: string,
  diagnosticContext?: DiagnosticContext,
  enabled: boolean = true
) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !user || !repairCenterId) return;

    let cancelled = false;

    const findOrCreateConversation = async () => {
      setIsLoading(true);

      // Try to find an existing conversation. Multiple conversations can exist
      // for the same customer/center pair (per repair job), so never use
      // maybeSingle() on an unfiltered set — it errors with multiple rows.
      let query = supabase
        .from('conversations')
        .select('id, repair_job_id')
        .eq('customer_id', user.id)
        .eq('repair_center_id', repairCenterId)
        .eq('status', 'active')
        .order('updated_at', { ascending: false });

      if (repairJobId) {
        query = query.eq('repair_job_id', repairJobId);
      }

      const { data: existing, error: fetchError } = await query.limit(1);

      if (cancelled) return;

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

      if (existing && existing.length > 0) {
        setConversationId(existing[0].id);
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

      if (cancelled) return;

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

    return () => {
      cancelled = true;
    };
  }, [enabled, user, repairCenterId, repairJobId, diagnosticContext, toast]);

  return { conversationId, isLoading };
};
