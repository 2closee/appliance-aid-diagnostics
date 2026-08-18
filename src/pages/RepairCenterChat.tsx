import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import LiveChat from "@/components/LiveChat";
import { useConversation } from "@/hooks/useConversation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const RepairCenterChat = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isRepairCenterStaff, repairCenterId } = useAuth();
  const { selectedCenter, repairJobId, conversationId: passedConversationId, diagnosticContext } = location.state || {};
  const [centerName, setCenterName] = useState<string>("");
  const [fetchedConversationId, setFetchedConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Only create/lookup a conversation for customers arriving without an explicit conversation id
  const { conversationId: customerConversationId, isLoading: isCreatingConversation } = useConversation(
    selectedCenter?.id,
    repairJobId,
    diagnosticContext,
    !passedConversationId && !isRepairCenterStaff
  );

  const conversationId = passedConversationId || customerConversationId || fetchedConversationId;
  const isLoading = loading || isCreatingConversation;

  useEffect(() => {
    const fetchConversationDetails = async () => {
      setLoading(true);

      // Anyone (staff or customer) arriving with an explicit conversation id
      if (passedConversationId) {
        try {
          const { data: conversation, error: convError } = await supabase
            .from('conversations')
            .select('*')
            .eq('id', passedConversationId)
            .maybeSingle();

          if (convError) throw convError;

          if (conversation) {
            setFetchedConversationId(conversation.id);

            if (selectedCenter?.name) {
              setCenterName(selectedCenter.name);
            } else {
              const { data: center } = await supabase
                .from('Repair Center')
                .select('name')
                .eq('id', conversation.repair_center_id)
                .maybeSingle();

              setCenterName(center?.name || "Repair Center");
            }
          }
        } catch (error) {
          console.error('Error fetching conversation:', error);
          toast.error("Failed to load conversation details");
        }
      }
      // For customers with selectedCenter
      else if (selectedCenter) {
        setCenterName(selectedCenter.name || "Repair Center");
      }
      // If no context provided, redirect
      else {
        navigate('/repair-centers');
        return;
      }

      setLoading(false);
    };

    fetchConversationDetails();
  }, [selectedCenter, passedConversationId, isRepairCenterStaff, navigate]);

  if (isRepairCenterStaff && !conversationId && !isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle>Conversation Not Found</CardTitle>
              <CardDescription>
                Unable to find the requested conversation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/repair-center-conversations')}>
                Back to Conversations
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3">Connecting to chat...</span>
            </CardContent>
          </Card>
        ) : conversationId ? (
          <LiveChat
            conversationId={conversationId}
            repairCenterName={centerName}
            repairCenterId={selectedCenter?.id}
            diagnosticContext={diagnosticContext}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Unable to Start Chat</CardTitle>
              <CardDescription>
                There was an error connecting to the repair center. Please try again.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/repair-centers')}>
                Back to Repair Centers
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default RepairCenterChat;
