import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Save, Settings } from "lucide-react";

const RepairCenterSettings = () => {
  const { repairCenterId } = useAuth();
  const { toast } = useToast();
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true);
  const [autoReplyMessage, setAutoReplyMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!repairCenterId) return;

      const { data, error } = await supabase
        .from('repair_center_settings')
        .select('*')
        .eq('repair_center_id', repairCenterId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching settings:', error);
        return;
      }

      if (data) {
        setAutoReplyEnabled(data.auto_reply_enabled);
        setAutoReplyMessage(data.auto_reply_message);
      }
    };

    fetchSettings();
  }, [repairCenterId]);

  const handleSaveSettings = async () => {
    if (!repairCenterId) return;

    setIsLoading(true);
    const { error } = await supabase
      .from('repair_center_settings')
      .upsert({
        repair_center_id: repairCenterId,
        auto_reply_enabled: autoReplyEnabled,
        auto_reply_message: autoReplyMessage
      });

    if (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Auto-reply settings saved successfully"
      });
    }

    setIsLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Auto-Reply Settings
        </CardTitle>
        <CardDescription>
          Configure automatic replies when you're offline
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-reply-toggle">Enable Auto-Reply</Label>
            <p className="text-sm text-muted-foreground">
              Automatically send a message when you're offline
            </p>
          </div>
          <Switch
            id="auto-reply-toggle"
            checked={autoReplyEnabled}
            onCheckedChange={setAutoReplyEnabled}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="auto-reply-message">Auto-Reply Message</Label>
          <Textarea
            id="auto-reply-message"
            placeholder="Enter your auto-reply message..."
            value={autoReplyMessage}
            onChange={(e) => setAutoReplyMessage(e.target.value)}
            rows={4}
            disabled={!autoReplyEnabled}
          />
          <p className="text-xs text-muted-foreground">
            This message will be sent automatically to customers when you're offline
          </p>
        </div>

        <Button onClick={handleSaveSettings} disabled={isLoading}>
          <Save className="h-4 w-4 mr-2" />
          Save Settings
        </Button>
      </CardContent>
    </Card>
  );
};

export default RepairCenterSettings;
