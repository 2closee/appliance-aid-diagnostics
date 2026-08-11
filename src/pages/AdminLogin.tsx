import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { ForgotPasswordDialog } from "@/components/ForgotPasswordDialog";
import { useAuth } from "@/hooks/useAuth";

const AdminLogin = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, isAdmin, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  useEffect(() => {
    if (isLoading || !user) return;

    if (isAdmin) {
      navigate("/admin", { replace: true });
    } else {
      toast({
        title: "Access denied",
        description: "This account does not have admin privileges.",
        variant: "destructive",
      });
      supabase.auth.signOut();
    }
  }, [user, isAdmin, isLoading, navigate, toast]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSigningIn(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({
          title: "Login failed",
          description: "Invalid credentials.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <ShieldCheck className="h-12 w-12 text-primary mx-auto mb-3" />
            <h1 className="text-2xl font-bold">Fixbudi Control</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Restricted access. Authorized administrators only.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Administrator sign in</CardTitle>
              <CardDescription>Use your admin credentials.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-email">Email</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="username"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-password">Password</Label>
                  <Input
                    id="admin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
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

export default AdminLogin;
