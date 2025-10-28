import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export const useQuoteActions = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

  const negotiateQuote = async (jobId: string) => {
    try {
      const { error } = await supabase.functions.invoke('respond-to-quote', {
        body: { repair_job_id: jobId, response: 'negotiate' }
      });
      
      if (error) throw error;
      
      toast({
        title: "Negotiation Started",
        description: "You can now chat with the repair center about pricing.",
      });
      
      queryClient.invalidateQueries({ queryKey: ['repair-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['customer-repair-jobs'] });
      
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

  return { acceptQuote, rejectQuote, negotiateQuote };
};
