import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { Building } from "lucide-react";
import { ForgotPasswordDialog } from "@/components/ForgotPasswordDialog";
import { useAuth } from "@/hooks/useAuth";

const PartnerLogin = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      navigate("/repair-center-admin", { replace: true });
    }
  }, [user, isLoading, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSigningIn(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        toast({
          title: "Login failed",
          description: "Invalid credentials. Use \"Forgot password\" if you can't remember it.",
          variant: "destructive",
        });
        return;
      }

      navigate("/repair-center-admin", { replace: true });
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <Building className="h-12 w-12 text-primary mx-auto mb-3" />
            <h1 className="text-3xl font-bold">Repair Center Login</h1>
            <p className="text-muted-foreground mt-2">
              Partner portal for approved Fixbudi repair centers.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Sign in</CardTitle>
              <CardDescription>Use the email address linked to your repair center.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="partner-email">Email</Label>
                  <Input
                    id="partner-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="center@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="partner-password">Password</Label>
                  <Input
                    id="partner-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSigningIn}>
                  {isSigningIn ? "Signing in..." : "Sign in"}
                </Button>
                <Button
                  type="button"
                  variant="link"
                  className="w-full text-muted-foreground"
                  onClick={() => setShowForgotPassword(true)}
                >
                  Forgot password?
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Not a partner yet? Apply to join the Fixbudi repair network.
              </p>
              <Button variant="outline" className="w-full" asChild>
                <Link to="/apply-repair-center">Apply to join</Link>
              </Button>
            </CardContent>
          </Card>

          <div className="text-center">
            <Button variant="ghost" className="text-muted-foreground" onClick={() => navigate("/")}>
              ← Back to Home
            </Button>
          </div>
        </div>
      </div>

      <ForgotPasswordDialog
        open={showForgotPassword}
        onOpenChange={setShowForgotPassword}
        defaultEmail={email}
      />
    </>
  );
};

export default PartnerLogin;
