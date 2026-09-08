import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, Bell, BellOff, ExternalLink, Loader2 } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const NotificationSettings = () => {
  const { status, busy, diagnostic, enable, disable, sendTest } = usePushNotifications();

  const helper: Record<string, string> = {
    loading: "Checking this device…",
    "not-configured": "The Firebase sending connection works, but this app release is missing browser registration details.",
    unsupported: "This browser can't receive push notifications. Try Chrome on Android or install the app.",
    "open-in-new-tab": "Open Fixbudi in its own browser tab (or the installed app) to allow notifications.",
    denied: "Notifications are blocked for Fixbudi. Re-enable them in your browser's site settings, then try again.",
    off: "Get quotes, messages, rider updates and job progress even when the app is closed.",
    on: "This device will receive Fixbudi alerts.",
  };

  const isOn = status === "on";
  const canToggle = status === "on" || status === "off";

  return (
    <Card data-tour="push-settings">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isOn ? <Bell className="h-5 w-5 text-primary" /> : <BellOff className="h-5 w-5 text-muted-foreground" />}
          Push notifications
        </CardTitle>
        <CardDescription>{helper[status]}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="font-medium">Alerts on this device</p>
            <p className="text-sm text-muted-foreground">Quotes, chat messages, pickups and job updates</p>
          </div>
          <div className="flex items-center gap-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <Switch
              checked={isOn}
              disabled={busy || !canToggle}
              onCheckedChange={(checked) => (checked ? enable() : disable())}
              aria-label="Toggle push notifications"
            />
          </div>
        </div>

        {status === "not-configured" && diagnostic.missingFields.length > 0 && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div>
                <p className="font-medium">Missing from this app release</p>
                <p className="mt-1 text-muted-foreground">{diagnostic.missingFields.join(", ")}</p>
                <p className="mt-2 text-muted-foreground">
                  Update the Firebase Messaging connection with web push included, then publish a new release.
                </p>
              </div>
            </div>
          </div>
        )}

        {diagnostic.error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
            <p className="font-medium">Device registration failed</p>
            <p className="mt-1 break-words text-muted-foreground">{diagnostic.error}</p>
          </div>
        )}

        {status === "open-in-new-tab" && (
          <Button variant="outline" onClick={() => window.open(window.location.href, "_blank")}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Open in a new tab
          </Button>
        )}

        {isOn && (
          <Button variant="outline" onClick={sendTest} disabled={busy}>
            Send a test notification
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationSettings;
