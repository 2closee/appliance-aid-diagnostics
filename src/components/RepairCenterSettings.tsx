import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Save, Settings, Image as ImageIcon, MapPin, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import RepairCenterBrandingUpload from "./RepairCenterBrandingUpload";

const RepairCenterSettings = () => {
  const { repairCenterId, isAdmin } = useAuth();
  const { toast } = useToast();
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true);
  const [autoReplyMessage, setAutoReplyMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [repairCenter, setRepairCenter] = useState<any>(null);
  const [centerName, setCenterName] = useState<string>("Your Repair Center");
  const [address, setAddress] = useState("");
  const [addressUpdatedAt, setAddressUpdatedAt] = useState<string | null>(null);
  const [isUpdatingAddress, setIsUpdatingAddress] = useState(false);

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

    const fetchRepairCenter = async () => {
      if (!repairCenterId) return;

      const { data, error } = await supabase
        .from('Repair Center')
        .select('logo_url, cover_image_url, name, address, address_updated_at')
        .eq('id', repairCenterId)
        .single();

      if (error) {
        console.error('Error fetching repair center:', error);
        return;
      }

      setRepairCenter(data);
      if (data?.name) setCenterName(data.name);
      if (data?.address) setAddress(data.address);
      if (data?.address_updated_at) setAddressUpdatedAt(data.address_updated_at);
    };

    fetchSettings();
    fetchRepairCenter();
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

  const handleUpdateAddress = async () => {
    if (!repairCenterId || !address.trim()) {
      toast({
        title: "Error",
        description: "Address cannot be empty",
        variant: "destructive"
      });
      return;
    }

    const oldAddress = repairCenter?.address || "";
    if (oldAddress === address.trim()) {
      toast({
        title: "Info",
        description: "Address hasn't changed",
      });
      return;
    }

    setIsUpdatingAddress(true);
    const { error } = await supabase
      .from('Repair Center')
      .update({
        address: address.trim(),
        address_updated_at: new Date().toISOString()
      })
      .eq('id', repairCenterId);

    if (error) {
      console.error('Error updating address:', error);
      toast({
        title: "Error",
        description: error.message.includes('policy') 
          ? "You can only update your address once per month" 
          : "Failed to update address",
        variant: "destructive"
      });
    } else {
      setAddressUpdatedAt(new Date().toISOString());
      
      // Send notification email
      try {
        await supabase.functions.invoke('send-address-change-notification', {
          body: {
            repair_center_id: repairCenterId,
            old_address: oldAddress,
            new_address: address.trim(),
            changed_by_admin: isAdmin || false
          }
        });
        console.log('Address change notification sent');
      } catch (emailError) {
        console.error('Failed to send notification:', emailError);
        // Don't fail the update if email fails
      }

      toast({
        title: "Success",
        description: "Address updated successfully. Notification emails sent."
      });
    }

    setIsUpdatingAddress(false);
  };

  const canUpdateAddress = () => {
    if (isAdmin) return true;
    if (!addressUpdatedAt) return true;
    const lastUpdate = new Date(addressUpdatedAt);
    const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceUpdate >= 30;
  };

  const getDaysUntilNextUpdate = () => {
    if (!addressUpdatedAt) return 0;
    const lastUpdate = new Date(addressUpdatedAt);
    const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.ceil(30 - daysSinceUpdate));
  };

  return (
    <div className="space-y-6">
      {/* Branding Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Branding & Visual Identity
          </CardTitle>
          <CardDescription>
            Upload your logo and cover image to personalize your repair center profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RepairCenterBrandingUpload
            repairCenterId={repairCenterId}
            centerName={centerName}
            currentLogoUrl={repairCenter?.logo_url}
            currentCoverUrl={repairCenter?.cover_image_url}
            onUploadComplete={() => {
              // Refetch repair center data
              if (repairCenterId) {
                supabase
                  .from('Repair Center')
                  .select('logo_url, cover_image_url, name')
                  .eq('id', repairCenterId)
                  .single()
                  .then(({ data }) => {
                    setRepairCenter(data);
                    if (data?.name) setCenterName(data.name);
                  });
              }
            }}
          />
        </CardContent>
      </Card>

      {/* Address Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Shop Address
          </CardTitle>
          <CardDescription>
            Update your repair center's physical address
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              placeholder="Enter your full shop address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
            />
          </div>

          {!canUpdateAddress() && !isAdmin && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You can update your address again in {getDaysUntilNextUpdate()} days. 
                Last updated: {addressUpdatedAt ? new Date(addressUpdatedAt).toLocaleDateString() : 'Never'}
              </AlertDescription>
            </Alert>
          )}

          {isAdmin && addressUpdatedAt && (
            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                As an admin, you can update this address anytime. 
                Last updated: {new Date(addressUpdatedAt).toLocaleDateString()}
              </AlertDescription>
            </Alert>
          )}

          <Button 
            onClick={handleUpdateAddress} 
            disabled={isUpdatingAddress || (!canUpdateAddress() && !isAdmin) || !address.trim()}
          >
            <Save className="h-4 w-4 mr-2" />
            Update Address
          </Button>
        </CardContent>
      </Card>

      {/* Auto-Reply Settings */}
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
    </div>
  );
};

export default RepairCenterSettings;
