import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import LiveChat from "@/components/LiveChat";
import { useConversation } from "@/hooks/useConversation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const RepairCenterChat = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedCenter, repairJobId } = location.state || {};
  const [centerName, setCenterName] = useState<string>("");

  const { conversationId, isLoading } = useConversation(
    selectedCenter?.id,
    repairJobId
  );

  useEffect(() => {
    if (!selectedCenter) {
      navigate('/repair-centers');
      return;
    }
    setCenterName(selectedCenter.name || "Repair Center");
  }, [selectedCenter, navigate]);

  if (!selectedCenter) {
    return null;
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
