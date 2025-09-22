import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Building, LogOut, Shield, Mail } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const RepairCenterAdmin = () => {
  const { toast } = useToast();
  const { user, isLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [signupData, setSignupData] = useState({ 
    email: "", 
    password: "", 
    centerName: "",
    contactName: "",
    phone: ""
  });
  const [isSigningUp, setIsSigningUp] = useState(false);

  // Check if user is already a repair center staff
  const [isRepairCenterStaff, setIsRepairCenterStaff] = useState(false);
  const [repairCenterInfo, setRepairCenterInfo] = useState<any>(null);

  useEffect(() => {
    const checkRepairCenterStatus = async () => {
      if (user) {
        const { data: staffData, error } = await supabase
          .from("repair_center_staff")
          .select(`
            *,
            repair_center:repair_center_id("Repair Center"(*))
          `)
          .eq("user_id", user.id)
          .eq("is_active", true)
          .maybeSingle();

        if (!error && staffData) {
          setIsRepairCenterStaff(true);
          setRepairCenterInfo(staffData);
        }
      }
    };

    if (user && !isLoading) {
      checkRepairCenterStatus();
    }
  }, [user, isLoading]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      });

      if (error) {
        toast({
          title: "Login Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Welcome back to your repair center portal!",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSigningUp(true);
    
    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/repair-center-admin`,
          data: {
            center_name: signupData.centerName,
            contact_name: signupData.contactName,
            phone: signupData.phone
          }
        }
      });

      if (signUpError) {
        toast({
          title: "Signup Failed",
          description: signUpError.message,
          variant: "destructive",
        });
        return;
      }

      if (authData.user) {
        toast({
          title: "Application Submitted",
          description: "Your repair center application has been submitted. Please check your email for verification, then wait for admin approval.",
        });
        
        setSignupData({ email: "", password: "", centerName: "", contactName: "", phone: "" });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred during signup",
        variant: "destructive",
      });
    } finally {
      setIsSigningUp(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setIsRepairCenterStaff(false);
    setRepairCenterInfo(null);
  };

  // If user is logged in and is repair center staff, show dashboard
  if (user && isRepairCenterStaff && repairCenterInfo) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Repair Center Portal</h1>
                <p className="text-muted-foreground">{repairCenterInfo.repair_center?.name}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSignOut} variant="outline">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
              <Button onClick={() => navigate("/dashboard")}>
                Dashboard
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Welcome to Your Repair Center Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2">Center Information</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Name:</strong> {repairCenterInfo.repair_center?.name}</p>
                    <p><strong>Address:</strong> {repairCenterInfo.repair_center?.address}</p>
                    <p><strong>Phone:</strong> {repairCenterInfo.repair_center?.phone}</p>
                    <p><strong>Email:</strong> {repairCenterInfo.repair_center?.email}</p>
                    <p><strong>Your Role:</strong> {repairCenterInfo.role}</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Quick Actions</h3>
                  <div className="space-y-2">
                    <Button onClick={() => navigate("/dashboard")} className="w-full">
                      View Jobs & Analytics
                    </Button>
                    <Button onClick={() => navigate("/repair-jobs")} variant="outline" className="w-full">
                      Manage Repair Jobs
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // If user is logged in but not repair center staff
  if (user && !isLoading && !isRepairCenterStaff) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-md mx-auto space-y-8">
          <div className="text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold">Access Pending</h1>
            <p className="text-muted-foreground mt-2">
              Your repair center application is being reviewed by our admin team. 
              You'll receive access once approved.
            </p>
          </div>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <Mail className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Check your email for verification instructions and approval status updates.
                </p>
                <Button onClick={handleSignOut} variant="outline" className="w-full">
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Login/Signup form for non-authenticated users
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-md mx-auto space-y-8">
        <div className="text-center">
          <Building className="h-12 w-12 text-primary mx-auto mb-4" />
          <h1 className="text-3xl font-bold">Repair Center Portal</h1>
          <p className="text-muted-foreground mt-2">
            Login to your approved repair center account or apply to join our network
          </p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="apply">Apply to Join</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Login to Your Portal</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={loginData.email}
                      onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                      placeholder="Your password"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Login to Portal
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="apply">
            <Card>
              <CardHeader>
                <CardTitle>Apply to Join Our Network</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignup} className="space-y-4">
                  <div>
                    <Label htmlFor="centerName">Repair Center Name</Label>
                    <Input
                      id="centerName"
                      value={signupData.centerName}
                      onChange={(e) => setSignupData({...signupData, centerName: e.target.value})}
                      placeholder="Tech Solutions Hub"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactName">Contact Person Name</Label>
                    <Input
                      id="contactName"
                      value={signupData.contactName}
                      onChange={(e) => setSignupData({...signupData, contactName: e.target.value})}
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={signupData.phone}
                      onChange={(e) => setSignupData({...signupData, phone: e.target.value})}
                      placeholder="+234 xxx xxx xxxx"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="signupEmail">Email</Label>
                    <Input
                      id="signupEmail"
                      type="email"
                      value={signupData.email}
                      onChange={(e) => setSignupData({...signupData, email: e.target.value})}
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="signupPassword">Password</Label>
                    <Input
                      id="signupPassword"
                      type="password"
                      value={signupData.password}
                      onChange={(e) => setSignupData({...signupData, password: e.target.value})}
                      placeholder="Create a password"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSigningUp}>
                    {isSigningUp ? "Submitting Application..." : "Submit Application"}
                  </Button>
                </form>
                <p className="text-xs text-muted-foreground mt-4">
                  Your application will be reviewed by our admin team. You'll receive access once approved.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="text-center">
          <Button onClick={() => navigate("/")} variant="outline">
            Back to Main Site
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RepairCenterAdmin;