import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Building, Users, Award, Phone, Mail, MapPin, MessageCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Validation rules
const validateField = (field: string, value: string): string | null => {
  const trimmed = value.trim();
  
  switch (field) {
    case 'businessName':
      if (!trimmed) return "Business name is required";
      if (trimmed.length < 2) return "Business name must be at least 2 characters";
      return null;
    case 'ownerName':
      if (!trimmed) return "Owner name is required";
      if (trimmed.length < 2) return "Owner name must be at least 2 characters";
      return null;
    case 'email':
      if (!trimmed) return "Email is required";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "Please enter a valid email address";
      return null;
    case 'phone':
      if (!trimmed) return "Phone number is required";
      if (!/^(\+?234|0)?[789][01]\d{8}$/.test(trimmed.replace(/\s/g, ''))) return "Please enter a valid Nigerian phone number";
      return null;
    case 'website':
      if (trimmed && !/^https?:\/\/.+/.test(trimmed)) return "Website must start with http:// or https://";
      return null;
    case 'address':
      if (!trimmed) return "Address is required";
      if (trimmed.length < 5) return "Please enter a complete address";
      return null;
    case 'city':
      if (!trimmed) return "City is required";
      return null;
    case 'state':
      if (!trimmed) return "State is required";
      return null;
    case 'zipCode':
      if (!trimmed) return "ZIP code is required";
      return null;
    case 'operatingHours':
      if (!trimmed) return "Operating hours are required";
      return null;
    case 'specialties':
      if (!trimmed) return "Specialties are required";
      return null;
    case 'yearsInBusiness':
      if (!trimmed) return "Years in business is required";
      if (isNaN(Number(trimmed)) || Number(trimmed) < 0) return "Please enter a valid number";
      return null;
    case 'numberOfStaff':
      if (!trimmed) return "Number of staff is required";
      if (isNaN(Number(trimmed)) || Number(trimmed) < 1) return "Please enter at least 1";
      return null;
    case 'cacName':
      if (!trimmed) return "CAC registered name is required";
      return null;
    case 'cacNumber':
      if (!trimmed) return "CAC number is required";
      return null;
    default:
      return null;
  }
};

export default function RepairCenterApplication() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [emailWarning, setEmailWarning] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string>("");
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [application, setApplication] = useState({
    // Business Information
    businessName: "",
    ownerName: "",
    email: "",
    phone: "",
    website: "",
    // Location Information
    address: "",
    city: "",
    state: "",
    zipCode: "",
    // Business Details
    operatingHours: "",
    specialties: "",
    certifications: "",
    description: "",
    // Registration Details
    cacName: "",
    cacNumber: "",
    taxId: "",
    // Experience
    yearsInBusiness: "",
    numberOfStaff: ""
  });

  // Calculate validation errors for all fields
  const fieldErrors = useMemo(() => {
    const errors: Record<string, string | null> = {};
    Object.keys(application).forEach(field => {
      errors[field] = validateField(field, application[field as keyof typeof application]);
    });
    return errors;
  }, [application]);

  // Check if form is valid
  const isFormValid = useMemo(() => {
    const requiredFields = [
      'businessName', 'ownerName', 'email', 'phone', 'address', 'city', 
      'state', 'zipCode', 'operatingHours', 'specialties', 'yearsInBusiness', 
      'numberOfStaff', 'cacName', 'cacNumber'
    ];
    return requiredFields.every(field => !fieldErrors[field]);
  }, [fieldErrors]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Pre-submit validation - single source of truth for fullName
      const trimmedOwnerName = application.ownerName.trim();
      if (trimmedOwnerName.length < 2) {
        toast({
          title: "Invalid Owner Name",
          description: "Owner Full Name must be at least 2 characters",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      console.log('Starting repair center application submission with fullName:', trimmedOwnerName);
      
      // Submit application using edge function
      const { data, error } = await supabase.functions.invoke('submit-repair-center-application', {
        body: {
          businessName: application.businessName,
          address: application.address,
          city: application.city,
          state: application.state,
          zipCode: application.zipCode,
          phone: application.phone,
          email: application.email,
          operatingHours: application.operatingHours,
          specialties: application.specialties,
          numberOfStaff: application.numberOfStaff,
          yearsInBusiness: application.yearsInBusiness,
          cacName: application.cacName,
          cacNumber: application.cacNumber,
          taxId: application.taxId,
          website: application.website,
          certifications: application.certifications,
          description: application.description,
          fullName: trimmedOwnerName
        }
      });

      if (error) {
        console.error('Application submission error:', error);
        throw new Error(error.message || 'Failed to submit application');
      }

      // Handle validation errors from edge function
      if (!data?.success) {
        // Check for field-level validation errors
        if (data?.errors && Array.isArray(data.errors)) {
          const errorMessages = data.errors.map((err: { field: string; message: string }) => 
            `${err.field}: ${err.message}`
          ).join('\n');
          throw new Error(`Validation errors:\n${errorMessages}`);
        }
        throw new Error(data?.error || data?.message || 'Application submission failed');
      }

      console.log('Application submitted successfully:', data);
      
      // Check email status
      if (data.emailWarning || data.emailSent === false) {
        setEmailWarning(data.emailWarning || "Confirmation email may be delayed. Please check your spam folder.");
      }
      
      toast({
        title: "Application Submitted!",
        description: data.message || "Your application has been submitted successfully. Our team will review it shortly.",
      });

      // Store email for potential resend
      setSubmittedEmail(application.email);
      
      // Reset form and show success state
      setApplication({
        businessName: '',
        ownerName: '',
        email: '',
        phone: '',
        website: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        operatingHours: '',
        specialties: '',
        certifications: '',
        description: '',
        cacName: '',
        cacNumber: '',
        taxId: '',
        yearsInBusiness: '',
        numberOfStaff: ''
      });
      setIsSubmitted(true);

    } catch (error: any) {
      console.error('Application submission error:', error);
      
      // Enhanced error handling with specific error detection
      let errorMessage = "Application failed. Please try again.";
      let errorTitle = "Application Failed";
      
      const errorMsg = error.message || '';
      
      if (errorMsg.toLowerCase().includes("email is already") || 
          errorMsg.toLowerCase().includes("duplicate email") ||
          errorMsg.toLowerCase().includes("already associated")) {
        errorTitle = "Email Already in Use";
        errorMessage = errorMsg;
      } else if (errorMsg.includes("Validation errors")) {
        errorTitle = "Please Fix These Fields";
        // Show validation errors more clearly
        errorMessage = errorMsg.replace("Validation errors:\n", "");
      } else if (errorMsg.includes("rate limit")) {
        errorMessage = "Too many requests. Please wait a few minutes and try again.";
      } else if (errorMsg.includes("network") || errorMsg.includes("fetch")) {
        errorMessage = "Network error. Please check your connection and try again.";
      } else if (errorMsg.includes("phone")) {
        errorTitle = "Invalid Phone Number";
        errorMessage = "Please enter a valid phone number (e.g., 08012345678 or +2348012345678)";
      } else if (errorMsg.includes("zipCode") || errorMsg.includes("ZIP")) {
        errorTitle = "Invalid ZIP/Postal Code";
        errorMessage = "Please enter a valid postal code";
      } else if (errorMsg.includes("website") || errorMsg.includes("URL")) {
        errorTitle = "Invalid Website URL";
        errorMessage = "Website must start with http:// or https:// (or leave empty)";
      } else if (errorMsg.toLowerCase().includes('fullname') || errorMsg.toLowerCase().includes('full name')) {
        errorTitle = "Invalid Owner Name";
        errorMessage = "Owner Full Name must be at least 2 characters";
      } else if (errorMsg) {
        errorMessage = errorMsg;
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setApplication(prev => ({ ...prev, [field]: value }));
  };

  const handleBlur = (field: string) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
  };

  // Helper to show error only if field was touched
  const getFieldError = (field: string) => {
    return touchedFields[field] ? fieldErrors[field] : null;
  };

  const handleResendEmail = async () => {
    if (!submittedEmail || resendCooldown > 0) return;
    
    setIsResendingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke('resend-verification-email', {
        body: { email: submittedEmail }
      });
      
      if (error) throw error;
      
      if (data?.success) {
        toast({
          title: "Email Sent!",
          description: data.message || "Please check your inbox and spam folder.",
        });
        setEmailWarning(null);
        // Start 60-second cooldown
        setResendCooldown(60);
        const interval = setInterval(() => {
          setResendCooldown(prev => {
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        // Handle specific error codes
        const errorCode = data?.code;
        let errorTitle = "Couldn't Send Email";
        let errorDescription = "Please try again later.";
        
        switch (errorCode) {
          case "APPLICATION_NOT_FOUND":
            errorTitle = "No Application Found";
            errorDescription = "We couldn't find an application with this email. Please submit a new application.";
            break;
          case "ALREADY_APPROVED":
            errorTitle = "Application Approved";
            errorDescription = data.error || "Check your email for login credentials.";
            break;
          case "APPLICATION_REJECTED":
            errorTitle = "Application Status";
            errorDescription = data.error || "Please contact support for more information.";
            break;
          case "RATE_LIMITED":
            errorTitle = "Too Many Attempts";
            errorDescription = data.error || "Please wait an hour before trying again.";
            break;
          case "EMAIL_SERVICE_ERROR":
          case "EMAIL_SEND_FAILED":
            errorTitle = "Email Service Unavailable";
            errorDescription = "Our email service is temporarily unavailable. Please try again in a few minutes.";
            break;
          default:
            errorDescription = data?.error || "Please contact support@fixbudi.com for assistance.";
        }
        
        toast({
          title: errorTitle,
          description: errorDescription,
          variant: errorCode === "ALREADY_APPROVED" ? "default" : "destructive",
        });
      }
    } catch (err: any) {
      console.error('Resend email error:', err);
      toast({
        title: "Connection Error",
        description: "Unable to reach our servers. Please check your internet connection and try again.",
        variant: "destructive",
      });
    } finally {
      setIsResendingEmail(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <CardTitle className="text-2xl">Application Submitted Successfully!</CardTitle>
            <CardDescription>
              Your repair center application has been received and is being processed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {emailWarning && (
              <Alert variant="default" className="border-amber-500 bg-amber-50 dark:bg-amber-950">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 dark:text-amber-200">
                  <div className="flex flex-col gap-2">
                    <span>{emailWarning}</span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleResendEmail}
                      disabled={isResendingEmail || resendCooldown > 0}
                      className="w-fit"
                    >
                      {isResendingEmail ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : resendCooldown > 0 ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Wait {resendCooldown}s
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Resend Confirmation Email
                        </>
                      )}
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
            
            <div className="text-center space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Next Steps:
                </h3>
                <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 text-left">
                  <li>1. Our team will review your application within 24-48 hours</li>
                  <li>2. You'll receive an email notification once approved</li>
                  <li>3. Follow the instructions in the email to set up your account</li>
                  <li>4. Access your repair center admin portal to start managing jobs</li>
                </ol>
              </div>
              
              <div className="space-y-3">
                <Button onClick={() => navigate("/")} variant="outline" className="w-full">
                  Return to Home
                </Button>
                
                <div className="text-sm text-muted-foreground">
                  Questions about your application? Contact us at{" "}
                  <a href="mailto:support@fixbudi.com" className="text-primary hover:underline">
                    support@fixbudi.com
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">Join the FixBudi Network</h1>
            <p className="text-xl text-muted-foreground">
              Become an authorized repair center and grow your business
            </p>
          </div>

          {/* Benefits Section */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">More Customers</h3>
                <p className="text-sm text-muted-foreground">
                  Access to our growing customer base looking for reliable repair services
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Building className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Business Growth</h3>
                <p className="text-sm text-muted-foreground">
                  Streamlined job management and automated customer communication
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Award className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Trusted Network</h3>
                <p className="text-sm text-muted-foreground">
                  Join a vetted network of professional repair centers
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Application Form */}
          <Card>
            <CardHeader>
              <CardTitle>Application Form</CardTitle>
              <CardDescription>
                Please provide accurate information about your repair center business
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Business Information */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Building className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Business Information</h3>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="businessName">Business Name *</Label>
                      <Input
                        id="businessName"
                        value={application.businessName}
                        onChange={(e) => handleInputChange('businessName', e.target.value)}
                        onBlur={() => handleBlur('businessName')}
                        required
                        placeholder="Your repair center name"
                        className={getFieldError('businessName') ? 'border-destructive' : ''}
                      />
                      {getFieldError('businessName') && (
                        <p className="text-xs text-destructive">{getFieldError('businessName')}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="ownerName">Owner Full Name *</Label>
                      <Input
                        id="ownerName"
                        value={application.ownerName}
                        onChange={(e) => handleInputChange('ownerName', e.target.value)}
                        onBlur={() => handleBlur('ownerName')}
                        required
                        minLength={2}
                        placeholder="Your full name"
                        className={getFieldError('ownerName') ? 'border-destructive' : ''}
                      />
                      {getFieldError('ownerName') && (
                        <p className="text-xs text-destructive">{getFieldError('ownerName')}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="email">Business Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={application.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        onBlur={() => handleBlur('email')}
                        required
                        placeholder="business@example.com"
                        className={getFieldError('email') ? 'border-destructive' : ''}
                      />
                      {getFieldError('email') && (
                        <p className="text-xs text-destructive">{getFieldError('email')}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="phone">Business Phone *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={application.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        onBlur={() => handleBlur('phone')}
                        required
                        placeholder="08012345678 or +2348012345678"
                        className={getFieldError('phone') ? 'border-destructive' : ''}
                      />
                      {getFieldError('phone') && (
                        <p className="text-xs text-destructive">{getFieldError('phone')}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="website">Website (Optional)</Label>
                    <Input
                      id="website"
                      type="url"
                      value={application.website}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                      onBlur={() => handleBlur('website')}
                      placeholder="https://yourwebsite.com"
                      className={getFieldError('website') ? 'border-destructive' : ''}
                    />
                    {getFieldError('website') && (
                      <p className="text-xs text-destructive">{getFieldError('website')}</p>
                    )}
                  </div>
                </div>

                {/* Location Information */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Location Information</h3>
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="address">Street Address *</Label>
                    <Input
                      id="address"
                      value={application.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      onBlur={() => handleBlur('address')}
                      required
                      placeholder="123 Main Street"
                      className={getFieldError('address') ? 'border-destructive' : ''}
                    />
                    {getFieldError('address') && (
                      <p className="text-xs text-destructive">{getFieldError('address')}</p>
                    )}
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        value={application.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        onBlur={() => handleBlur('city')}
                        required
                        placeholder="City name"
                        className={getFieldError('city') ? 'border-destructive' : ''}
                      />
                      {getFieldError('city') && (
                        <p className="text-xs text-destructive">{getFieldError('city')}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="state">State *</Label>
                      <Input
                        id="state"
                        value={application.state}
                        onChange={(e) => handleInputChange('state', e.target.value)}
                        onBlur={() => handleBlur('state')}
                        required
                        placeholder="State"
                        className={getFieldError('state') ? 'border-destructive' : ''}
                      />
                      {getFieldError('state') && (
                        <p className="text-xs text-destructive">{getFieldError('state')}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="zipCode">ZIP Code *</Label>
                      <Input
                        id="zipCode"
                        value={application.zipCode}
                        onChange={(e) => handleInputChange('zipCode', e.target.value)}
                        onBlur={() => handleBlur('zipCode')}
                        required
                        placeholder="12345"
                        className={getFieldError('zipCode') ? 'border-destructive' : ''}
                      />
                      {getFieldError('zipCode') && (
                        <p className="text-xs text-destructive">{getFieldError('zipCode')}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Business Details */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Award className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Business Details</h3>
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="operatingHours">Operating Hours *</Label>
                    <Input
                      id="operatingHours"
                      value={application.operatingHours}
                      onChange={(e) => handleInputChange('operatingHours', e.target.value)}
                      onBlur={() => handleBlur('operatingHours')}
                      required
                      placeholder="Mon-Fri: 9AM-6PM, Sat: 9AM-4PM"
                      className={getFieldError('operatingHours') ? 'border-destructive' : ''}
                    />
                    {getFieldError('operatingHours') && (
                      <p className="text-xs text-destructive">{getFieldError('operatingHours')}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="specialties">Specialties *</Label>
                    <Input
                      id="specialties"
                      value={application.specialties}
                      onChange={(e) => handleInputChange('specialties', e.target.value)}
                      onBlur={() => handleBlur('specialties')}
                      required
                      placeholder="e.g., Refrigerators, Washing Machines, Air Conditioners"
                      className={getFieldError('specialties') ? 'border-destructive' : ''}
                    />
                    {getFieldError('specialties') && (
                      <p className="text-xs text-destructive">{getFieldError('specialties')}</p>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="yearsInBusiness">Years in Business *</Label>
                      <Input
                        id="yearsInBusiness"
                        type="number"
                        min="0"
                        value={application.yearsInBusiness}
                        onChange={(e) => handleInputChange('yearsInBusiness', e.target.value)}
                        onBlur={() => handleBlur('yearsInBusiness')}
                        required
                        placeholder="5"
                        className={getFieldError('yearsInBusiness') ? 'border-destructive' : ''}
                      />
                      {getFieldError('yearsInBusiness') && (
                        <p className="text-xs text-destructive">{getFieldError('yearsInBusiness')}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="numberOfStaff">Number of Staff *</Label>
                      <Input
                        id="numberOfStaff"
                        type="number"
                        min="1"
                        value={application.numberOfStaff}
                        onChange={(e) => handleInputChange('numberOfStaff', e.target.value)}
                        onBlur={() => handleBlur('numberOfStaff')}
                        required
                        placeholder="3"
                        className={getFieldError('numberOfStaff') ? 'border-destructive' : ''}
                      />
                      {getFieldError('numberOfStaff') && (
                        <p className="text-xs text-destructive">{getFieldError('numberOfStaff')}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="certifications">Certifications (Optional)</Label>
                    <Textarea
                      id="certifications"
                      value={application.certifications}
                      onChange={(e) => handleInputChange('certifications', e.target.value)}
                      placeholder="List any relevant certifications or licenses"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Business Description (Optional)</Label>
                    <Textarea
                      id="description"
                      value={application.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Brief description of your repair center and services"
                      rows={4}
                    />
                  </div>
                </div>

                {/* Registration Details */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Registration Details</h3>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="cacName">CAC Registered Name *</Label>
                      <Input
                        id="cacName"
                        value={application.cacName}
                        onChange={(e) => handleInputChange('cacName', e.target.value)}
                        onBlur={() => handleBlur('cacName')}
                        required
                        placeholder="As registered with CAC"
                        className={getFieldError('cacName') ? 'border-destructive' : ''}
                      />
                      {getFieldError('cacName') && (
                        <p className="text-xs text-destructive">{getFieldError('cacName')}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="cacNumber">CAC Number *</Label>
                      <Input
                        id="cacNumber"
                        value={application.cacNumber}
                        onChange={(e) => handleInputChange('cacNumber', e.target.value)}
                        onBlur={() => handleBlur('cacNumber')}
                        required
                        placeholder="RC1234567"
                        className={getFieldError('cacNumber') ? 'border-destructive' : ''}
                      />
                      {getFieldError('cacNumber') && (
                        <p className="text-xs text-destructive">{getFieldError('cacNumber')}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="taxId">Tax ID (Optional)</Label>
                    <Input
                      id="taxId"
                      value={application.taxId}
                      onChange={(e) => handleInputChange('taxId', e.target.value)}
                      placeholder="Tax identification number"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-6 border-t">
                  <Button
                    type="submit"
                    disabled={isSubmitting || !isFormValid}
                    className="w-full"
                    size="lg"
                  >
                    {isSubmitting ? "Submitting Application..." : "Submit Application"}
                  </Button>
                  {!isFormValid && Object.keys(touchedFields).length > 0 && (
                    <p className="text-sm text-destructive mt-2 text-center">
                      Please fix the errors above before submitting.
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground mt-2 text-center">
                    By submitting this application, you agree to our terms of service and privacy policy.
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardContent className="p-6 text-center">
              <h3 className="font-semibold mb-2">Questions about the application process?</h3>
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4 text-sm">
                <a 
                  href="mailto:partnerships@fixbudi.com" 
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
                >
                  <Mail className="h-4 w-4 text-primary" />
                  <span>partnerships@fixbudi.com</span>
                </a>
                <a 
                  href="tel:+2348145397946" 
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
                >
                  <Phone className="h-4 w-4 text-primary" />
                  <span>+234 814 539 7946</span>
                </a>
                <a 
                  href="https://wa.me/2348145397946?text=Hello%2C%20I%20have%20a%20question%20about%20the%20FixBudi%20repair%20center%20application%20process."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#25D366] text-white hover:bg-[#20BD5A] transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>WhatsApp</span>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}