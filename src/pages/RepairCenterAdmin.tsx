import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Building, LogOut, Shield, Mail, AlertCircle } from "lucide-react";
import RepairCenterDashboard from '@/components/dashboard/RepairCenterDashboard';
import { StaffManagement } from '@/components/StaffManagement';
import { PasswordChangeDialog } from '@/components/PasswordChangeDialog';

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
    phone: "",
    numberOfStaff: "",
    yearsOfExperience: "",
    cacName: "",
    cacNumber: "",
    taxId: ""
  });
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isRepairCenterStaff, setIsRepairCenterStaff] = useState(false);
  const [repairCenterInfo, setRepairCenterInfo] = useState<any>(null);
  const [showPasswordChangeDialog, setShowPasswordChangeDialog] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const [resetError, setResetError] = useState("");

  useEffect(() => {
    // Check for password reset token in URL
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get('type');
    
    if (type === 'recovery') {
      setIsPasswordReset(true);
    }
  }, []);

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
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      });

      if (error) {
        toast({
          title: "Login Failed",
          description: "Invalid credentials. Try using 'Forgot Password' if you can't remember your password.",
          variant: "destructive",
        });
        return;
      }

      // Check if user needs to change password
      const forcePasswordChange = data.user?.user_metadata?.force_password_change;
      
      if (forcePasswordChange) {
        setShowPasswordChangeDialog(true);
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");

    try {
      // Use our custom edge function that sends emails via Resend
      const { data, error } = await supabase.functions.invoke('send-password-reset', {
        body: { email: forgotPasswordEmail }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || "Failed to send reset link");
      }

      toast({
        title: "Success",
        description: "Password reset link sent to your email!",
      });
      setShowForgotPassword(false);
      setForgotPasswordEmail("");
    } catch (error: any) {
      setResetError(error.message);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handlePasswordReset = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Password updated successfully! Logging you in...",
      });

      setIsPasswordReset(false);
      window.location.hash = '';
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSigningUp(true);
    
    try {
      console.log('Starting quick repair center application...');
      
      // Step 1: Sign up the user
      console.log('Step 1: Creating user account...');
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/repair-center-admin`,
        }
      });

      if (signUpError) {
        console.error('Auth error:', signUpError);
        toast({
          title: "Signup Failed",
          description: signUpError.message,
          variant: "destructive",
        });
        return;
      }

      if (!authData.user) {
        throw new Error("User creation failed");
      }

      const userId = authData.user.id;
      console.log('User created successfully:', userId);

      // Wait for authentication session to be established
      console.log('Waiting for authentication session...');
      let retries = 0;
      const maxRetries = 5;
      let session = null;

      while (retries < maxRetries && !session) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const { data: sessionData } = await supabase.auth.getSession();
        session = sessionData.session;
        retries++;
        console.log(`Authentication check attempt ${retries}, session:`, !!session);
      }

      if (!session) {
        console.warn('No active session found, proceeding without auth (will use RLS policy)');
      }

      // Step 2: Check if the user already exists in the repair_center_staff table
      const { data: existingStaff, error: existingStaffError } = await supabase
        .from("repair_center_staff")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingStaffError) {
        console.error("Error checking existing staff:", existingStaffError);
        toast({
          title: "Signup Error",
          description: "Failed to check existing staff record. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (existingStaff) {
        console.warn("User already exists as repair center staff.");
        toast({
          title: "Existing Account",
          description: "This email is already associated with a repair center account. Please log in.",
          variant: "destructive",
        });
        return;
      }

      console.log('Step 2: Creating repair center record...');
      const { data: centerData, error: centerError } = await supabase
        .from("Repair Center")
        .insert({
          name: signupData.centerName,
          address: "TBD - Application pending completion",
          phone: signupData.phone,
          email: signupData.email,
          hours: "TBD",
          specialties: "TBD",
          number_of_staff: 0,
          years_of_experience: 0,
          status: 'pending'
        })
        .select()
        .single();

      if (centerError) {
        console.error("Center creation error:", centerError);
        let errorMessage = "Failed to create repair center record. Please try again.";
        if (centerError.code === "42501") {
          errorMessage = "Authentication issue. Please try refreshing the page and submitting again.";
        } else if (centerError.message?.includes("violates row-level security")) {
          errorMessage = "Permission denied. Please contact support if this persists.";
        }
        
        toast({
          title: "Application Failed",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      console.log('Repair center created successfully:', centerData.id);

      console.log('Step 3: Creating staff record...');
      const { error: staffError } = await supabase
        .from("repair_center_staff")
        .insert({
          user_id: userId,
          repair_center_id: centerData.id,
          is_active: false,
          is_owner: true,
          role: 'owner'
        });

      if (staffError) {
        console.error("Staff record error:", staffError);
        throw staffError;
      }

      console.log('Staff record created successfully');

      console.log('Step 4: Sending confirmation email...');
      try {
        const { error: emailError } = await supabase.functions.invoke("send-confirmation-email", {
          body: {
            to: signupData.email,
            type: "application",
            data: {
              name: signupData.contactName,
              businessName: signupData.centerName
            }
          }
        });

        if (emailError) {
          console.error("Email sending failed:", emailError);
        } else {
          console.log('Confirmation email sent successfully');
        }
      } catch (emailError) {
        console.error("Email function error:", emailError);
      }

      toast({
        title: "Application Submitted",
        description: "Your repair center application has been submitted. Please check your email for verification, then wait for admin approval.",
      });
      
      setSignupData({ 
        email: "", 
        password: "", 
        centerName: "", 
        contactName: "", 
        phone: "",
        numberOfStaff: "",
        yearsOfExperience: "",
        cacName: "",
        cacNumber: "",
        taxId: ""
      });
    } catch (error: any) {
      console.error("Quick application error:", error);
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred during signup",
        variant: "destructive",
      });
    } finally {
      setIsSigningUp(false);
    }
  };

  const handlePasswordChange = async (newPassword: string) => {
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
      data: { force_password_change: false }
    });
    
    if (updateError) {
      throw new Error(updateError.message);
    }
    
    setShowPasswordChangeDialog(false);
    toast({
      title: "Password Changed Successfully",
      description: "Welcome to your repair center portal!",
    });
  };

  const handlePasswordChangeCancel = async () => {
    setShowPasswordChangeDialog(false);
    await supabase.auth.signOut();
    toast({
      title: "Password Change Cancelled",
      description: "You must change your password to access the portal. Please try logging in again.",
      variant: "destructive",
    });
  };

  const handleSignOut = async () => {
    await signOut();
    setIsRepairCenterStaff(false);
    setRepairCenterInfo(null);
  };

  // If user is resetting password, show reset form
  if (isPasswordReset) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Set Your New Password</CardTitle>
            <CardDescription>
              Create a new password to access your repair center portal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PasswordChangeDialog
              open={true}
              onPasswordChange={handlePasswordReset}
              onCancel={() => {
                setIsPasswordReset(false);
                window.location.hash = '';
              }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

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
                  <Tabs defaultValue="dashboard" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                      <TabsTrigger value="staff">Staff Management</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="dashboard" className="mt-6">
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
                    </TabsContent>
                    
                    <TabsContent value="staff" className="mt-6">
                      <StaffManagement />
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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

  return (
    <>
      <PasswordChangeDialog
        open={showPasswordChangeDialog}
        onPasswordChange={handlePasswordChange}
        onCancel={handlePasswordChangeCancel}
      />
      
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
                  <Button
                    type="button"
                    variant="link"
                    className="w-full"
                    onClick={() => setShowForgotPassword(true)}
                  >
                    Forgot Password?
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="apply">
            <Card>
              <CardHeader>
                <CardTitle>Quick Application</CardTitle>
                <CardDescription>
                  For a detailed application with more fields, use our{" "}
                  <Link to="/repair-center-application" className="text-primary hover:underline">
                    full application form
                  </Link>
                </CardDescription>
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
                      type="tel"
                      value={signupData.phone}
                      onChange={(e) => setSignupData({...signupData, phone: e.target.value})}
                      placeholder="+1234567890"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={signupData.email}
                      onChange={(e) => setSignupData({...signupData, email: e.target.value})}
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={signupData.password}
                      onChange={(e) => setSignupData({...signupData, password: e.target.value})}
                      placeholder="Create a password"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSigningUp}>
                    {isSigningUp ? "Submitting..." : "Submit Application"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
      </div>

      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Your Password</DialogTitle>
            <DialogDescription>
              Enter your email address and we'll send you a link to reset your password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                value={forgotPasswordEmail}
                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />
            </div>
            {resetError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{resetError}</AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForgotPassword(false)}>
                Cancel
              </Button>
              <Button type="submit">Send Reset Link</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RepairCenterAdmin;
