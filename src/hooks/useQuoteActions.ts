import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

export const useQuoteActions = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  const acceptQuote = async (jobId: string) => {
    try {
      const { error } = await supabase.functions.invoke('respond-to-quote', {
        body: { repair_job_id: jobId, response: 'accept' }
      });
      
      if (error) throw error;
      
      toast({
        title: "Quote Accepted!",
        description: "The repair center will contact you to schedule pickup.",
      });
      
      queryClient.invalidateQueries({ queryKey: ['repair-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['customer-repair-jobs'] });
      
      return { success: true };
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to accept quote",
        variant: "destructive",
      });
      return { success: false, error };
    }
  };

  const rejectQuote = async (jobId: string, reason?: string) => {
    try {
      const { error } = await supabase.functions.invoke('respond-to-quote', {
        body: { repair_job_id: jobId, response: 'reject', customer_notes: reason }
      });
      
      if (error) throw error;
      
      toast({
        title: "Quote Declined",
        description: "You can browse other repair centers or request a new quote.",
      });
      
      queryClient.invalidateQueries({ queryKey: ['repair-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['customer-repair-jobs'] });
      
      return { success: true };
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reject quote",
        variant: "destructive",
      });
      return { success: false, error };
    }
  };

  /** Finds (or creates) the conversation for a job so negotiation can start immediately. */
  const openJobConversation = async (jobId: string) => {
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user?.id;
    if (!userId) return null;

    const { data: job } = await supabase
      .from('repair_jobs')
      .select('id, repair_center_id')
      .eq('id', jobId)
      .maybeSingle();

    if (!job?.repair_center_id) return null;

    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('customer_id', userId)
      .eq('repair_center_id', job.repair_center_id)
      .eq('repair_job_id', jobId)
      .order('updated_at', { ascending: false })
      .limit(1);

    let conversationId = existing?.[0]?.id ?? null;

    if (!conversationId) {
      const { data: created, error } = await supabase
        .from('conversations')
        .insert({
          customer_id: userId,
          repair_center_id: job.repair_center_id,
          repair_job_id: jobId,
          status: 'active',
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating negotiation conversation:', error);
        return null;
      }
      conversationId = created.id;
    }

    const { data: center } = await supabase
      .from('Repair Center')
      .select('id, name')
      .eq('id', job.repair_center_id)
      .maybeSingle();

    return {
      conversationId,
      center: { id: job.repair_center_id, name: center?.name || 'Repair Center' },
    };
  };

  const negotiateQuote = async (jobId: string, reason?: string) => {
    try {
      const { error } = await supabase.functions.invoke('respond-to-quote', {
        body: { repair_job_id: jobId, response: 'negotiate', customer_notes: reason }
      });
      
      if (error) throw error;
      
      toast({
        title: "Negotiation Started",
        description: "Opening your chat with the repair center...",
      });
      
      queryClient.invalidateQueries({ queryKey: ['repair-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['customer-repair-jobs'] });

      // Take the customer straight into the conversation
      const opened = await openJobConversation(jobId);
      if (opened) {
        navigate(`/repair-center-chat/${opened.conversationId}`, {
          state: {
            conversationId: opened.conversationId,
            repairJobId: jobId,
            selectedCenter: opened.center,
          },
        });
      }
      
      return { success: true };
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start negotiation",
        variant: "destructive",
      });
      return { success: false, error };
    }
  };

  return { acceptQuote, rejectQuote, negotiateQuote, openJobConversation };
};
