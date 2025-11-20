import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CreateDeliveryParams {
  repair_job_id: string;
  delivery_type: 'pickup' | 'return';
  scheduled_pickup_time?: string;
  notes?: string;
}

interface DeliveryQuoteParams {
  pickup_address: string;
  delivery_address: string;
  package_description?: string;
}

export const useDeliveryActions = () => {
  const { toast } = useToast();
  const [isCreatingDelivery, setIsCreatingDelivery] = useState(false);
  const [isCancellingDelivery, setIsCancellingDelivery] = useState(false);
  const [isFetchingQuote, setIsFetchingQuote] = useState(false);

  const createDelivery = async (params: CreateDeliveryParams) => {
    setIsCreatingDelivery(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-sendstack-delivery", {
        body: params
      });

      if (error) throw error;

      toast({
        title: "Delivery Created",
        description: "Your delivery has been scheduled successfully.",
      });

      return data;
    } catch (error) {
      console.error("Error creating delivery:", error);
      toast({
        title: "Error",
        description: "Failed to create delivery. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsCreatingDelivery(false);
    }
  };

  const cancelDelivery = async (deliveryRequestId: string) => {
    setIsCancellingDelivery(true);
    try {
      const { data, error } = await supabase.functions.invoke("cancel-sendstack-delivery", {
        body: { delivery_request_id: deliveryRequestId }
      });

      if (error) throw error;

      toast({
        title: "Delivery Cancelled",
        description: "The delivery has been cancelled successfully.",
      });

      return data;
    } catch (error) {
      console.error("Error cancelling delivery:", error);
      toast({
        title: "Error",
        description: "Failed to cancel delivery. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsCancellingDelivery(false);
    }
  };

  const getDeliveryQuote = async (params: DeliveryQuoteParams) => {
    setIsFetchingQuote(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-sendstack-quote", {
        body: params
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error("Error getting delivery quote:", error);
      toast({
        title: "Error",
        description: "Failed to get delivery quote.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsFetchingQuote(false);
    }
  };

  return {
    createDelivery,
    cancelDelivery,
    getDeliveryQuote,
    isCreatingDelivery,
    isCancellingDelivery,
    isFetchingQuote
  };
};
