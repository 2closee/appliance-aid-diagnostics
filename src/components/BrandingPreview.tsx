import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, MessageCircle, Mail, Wrench } from "lucide-react";

interface BrandingPreviewProps {
  logoUrl?: string;
  coverUrl?: string;
  centerName?: string;
}

export const BrandingPreview = ({ logoUrl, coverUrl, centerName = "Your Repair Center" }: BrandingPreviewProps) => {
  const defaultInitials = centerName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        Preview how your branding will appear across the app
      </div>

      {/* Dashboard Header Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Dashboard Header
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative bg-card rounded-lg border p-6">
            {coverUrl && (
              <div className="absolute inset-0 -z-10 rounded-lg overflow-hidden opacity-20">
                <img 
                  src={coverUrl} 
                  alt="Cover preview" 
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt="Logo preview"
                  className="w-16 h-16 rounded-full object-cover border-2 border-primary"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary font-semibold text-primary">
                  {defaultInitials}
                </div>
              )}
              <div>
                <h3 className="text-lg font-bold">{centerName} Portal</h3>
                <p className="text-sm text-muted-foreground">Repair Center Dashboard</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chat Header Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Chat Interface
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-card rounded-lg border overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b bg-muted/30">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt="Logo preview"
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                  {defaultInitials}
                </div>
              )}
              <div>
                <h4 className="font-semibold text-sm">{centerName}</h4>
                <p className="text-xs text-muted-foreground">Online</p>
              </div>
            </div>
            <div className="p-4 space-y-2">
              <div className="text-xs text-muted-foreground text-center">Chat messages appear here</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conversation List Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Store className="h-4 w-4" />
            Conversation List
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-start gap-3">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt="Logo preview"
                  className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary flex-shrink-0">
                  {defaultInitials}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm truncate">{centerName}</h4>
                  <span className="text-xs text-muted-foreground">2m ago</span>
                </div>
                <p className="text-sm text-muted-foreground truncate">Latest message preview...</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Template Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-background rounded-lg border p-6">
            <div className="text-center mb-4">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt="Logo preview"
                  className="w-16 h-16 rounded-full object-cover mx-auto mb-2"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary mx-auto mb-2">
                  {defaultInitials}
                </div>
              )}
              <h3 className="font-semibold">{centerName}</h3>
            </div>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>Dear Customer,</p>
              <p>This is how your logo will appear in email notifications sent to customers...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
