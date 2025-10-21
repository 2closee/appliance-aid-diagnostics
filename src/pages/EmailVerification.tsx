import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function EmailVerification() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleEmailVerification = async () => {
      try {
        // Get the current session after email verification
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw new Error(`Session error: ${sessionError.message}`);
        }

        if (!session || !session.user) {
          throw new Error('No authenticated session found. Please try clicking the verification link again.');
        }

        console.log('Email verification - user found:', session.user.id);

        // Check if user is a repair center staff member
        const { data: staffData, error: staffError } = await supabase
          .from('repair_center_staff')
          .select('id')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (staffError) {
          console.error('Error checking staff status:', staffError);
        }

        const isRepairCenterUser = !!staffData;

        if (isRepairCenterUser) {
          // Repair center user - call verification function
          const { data, error } = await supabase.functions.invoke('verify-repair-center-email', {
            body: { userId: session.user.id }
          });

          if (error) {
            throw new Error(error.message || 'Failed to complete verification');
          }

          if (!data?.success) {
            throw new Error(data?.error || 'Verification failed');
          }

          setVerificationStatus('success');
          setMessage(data.message || 'Email verified successfully! Your application is now under review.');

          toast({
            title: "Email Verified!",
            description: "Your account has been verified. Your application is now under review.",
          });

          // Redirect to repair center admin after a delay
          setTimeout(() => {
            navigate('/repair-center-admin');
          }, 3000);
        } else {
          // Regular user - email is already verified by Supabase
          setVerificationStatus('success');
          setMessage('Email verified successfully! You can now access your dashboard.');

          toast({
            title: "Email Verified!",
            description: "Your account has been verified successfully.",
          });

          // Redirect to dashboard or home after a delay
          setTimeout(() => {
            navigate('/dashboard');
          }, 3000);
        }

      } catch (error: any) {
        console.error('Email verification error:', error);
        setVerificationStatus('error');
        setMessage(error.message || 'Email verification failed. Please try again.');
        
        toast({
          title: "Verification Failed",
          description: error.message || 'Please try clicking the verification link again.',
          variant: "destructive",
        });
      }
    };

    // Start verification process
    handleEmailVerification();
  }, [navigate, toast]);

  const handleRetryVerification = async () => {
    setVerificationStatus('loading');
    
    // Get current user and retry verification
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      try {
        const { data, error } = await supabase.functions.invoke('verify-repair-center-email', {
          body: { userId: user.id }
        });

        if (error) {
          throw new Error(error.message);
        }

        if (data?.success) {
          setVerificationStatus('success');
          setMessage(data.message);
          toast({
            title: "Email Verified!",
            description: "Your account has been verified successfully.",
          });
          setTimeout(() => navigate('/repair-center-admin'), 3000);
        } else {
          throw new Error(data?.error || 'Verification failed');
        }
      } catch (error: any) {
        setVerificationStatus('error');
        setMessage(error.message);
        toast({
          title: "Verification Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } else {
      setVerificationStatus('error');
      setMessage('No user session found. Please try clicking the verification link again.');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {verificationStatus === 'loading' && <Loader2 className="h-6 w-6 animate-spin" />}
            {verificationStatus === 'success' && <CheckCircle className="h-6 w-6 text-green-600" />}
            {verificationStatus === 'error' && <XCircle className="h-6 w-6 text-red-600" />}
            Email Verification
          </CardTitle>
          <CardDescription>
            {verificationStatus === 'loading' && 'Verifying your email address...'}
            {verificationStatus === 'success' && 'Email verified successfully!'}
            {verificationStatus === 'error' && 'Verification failed'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            {message}
          </p>
          
          {verificationStatus === 'success' && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Redirecting to your admin portal in a few seconds...
              </p>
              <Button onClick={async () => {
                // Check if repair center user
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                  const { data } = await supabase.from('repair_center_staff')
                    .select('id')
                    .eq('user_id', user.id)
                    .maybeSingle();
                  navigate(data ? '/repair-center-admin' : '/dashboard');
                } else {
                  navigate('/dashboard');
                }
              }} className="w-full">
                Go to Portal
              </Button>
            </div>
          )}
          
          {verificationStatus === 'error' && (
            <div className="space-y-2">
              <Button onClick={handleRetryVerification} className="w-full">
                Retry Verification
              </Button>
              <Button variant="outline" onClick={() => navigate('/')} className="w-full">
                Back to Home
              </Button>
            </div>
          )}
          
          {verificationStatus === 'loading' && (
            <div className="text-center">
              <Button variant="outline" onClick={() => navigate('/')} className="w-full">
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}