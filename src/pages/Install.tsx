import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, Download, CheckCircle, Wifi, Zap, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <img 
              src="/fixbudi-icon.png" 
              alt="Fixbudi" 
              className="h-24 w-24 mx-auto mb-4"
            />
            <h1 className="text-4xl font-bold mb-2">Install Fixbudi App</h1>
            <p className="text-muted-foreground text-lg">
              Get the best experience with our mobile app
            </p>
          </div>

          {isInstalled ? (
            <Card className="border-primary">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-6 w-6 text-primary" />
                  <CardTitle>App Already Installed!</CardTitle>
                </div>
                <CardDescription>
                  You're all set. Start using Fixbudi now.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate('/dashboard')} className="w-full">
                  Open Dashboard
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Why Install?</CardTitle>
                  <CardDescription>
                    Get the full Fixbudi experience on your phone
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="flex items-start gap-3">
                    <Wifi className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h3 className="font-semibold mb-1">Works Offline</h3>
                      <p className="text-sm text-muted-foreground">
                        Access your diagnostics even without internet connection
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Zap className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h3 className="font-semibold mb-1">Lightning Fast</h3>
                      <p className="text-sm text-muted-foreground">
                        Instant loading with cached content for Nigerian networks
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h3 className="font-semibold mb-1">Secure & Private</h3>
                      <p className="text-sm text-muted-foreground">
                        Your data is encrypted and stored securely on your device
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Smartphone className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h3 className="font-semibold mb-1">Home Screen Access</h3>
                      <p className="text-sm text-muted-foreground">
                        Launch Fixbudi directly from your phone's home screen
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {deferredPrompt ? (
                <Button 
                  onClick={handleInstall} 
                  size="lg" 
                  className="w-full"
                >
                  <Download className="mr-2 h-5 w-5" />
                  Install Now
                </Button>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>How to Install</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">On iPhone (Safari):</h4>
                      <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Tap the Share button (square with arrow)</li>
                        <li>Scroll down and tap "Add to Home Screen"</li>
                        <li>Tap "Add" in the top right corner</li>
                      </ol>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">On Android (Chrome):</h4>
                      <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Tap the menu button (three dots)</li>
                        <li>Tap "Add to Home screen" or "Install app"</li>
                        <li>Tap "Add" or "Install"</li>
                      </ol>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          <div className="mt-8 text-center">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')}
            >
              Continue in Browser
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Install;