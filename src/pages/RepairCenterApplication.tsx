import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Phone, Clock, Star, ArrowLeft, CheckCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const RepairCenterApplication = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
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
    numberOfStaff: "",
    // Account Creation
    password: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // First create the user account
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: application.email,
        password: application.password,
        options: {
          emailRedirectTo: `${window.location.origin}/repair-center-admin`,
        }
      });

      if (signUpError) {
        toast({
          title: "Application Failed",
          description: signUpError.message,
          variant: "destructive",
        });
        return;
      }

      if (authData.user) {
        // Create a repair center entry (initially with placeholder data)
        const { data: centerData, error: centerError } = await supabase
          .from("Repair Center")
          .insert({
            name: application.businessName,
            address: `${application.address}, ${application.city}, ${application.state} ${application.zipCode}`.trim(),
            phone: application.phone,
            email: application.email,
            hours: application.operatingHours,
            specialties: application.specialties,
            number_of_staff: parseInt(application.numberOfStaff) || 0,
            years_of_experience: parseInt(application.yearsInBusiness) || 0,
            cac_name: application.cacName,
            cac_number: application.cacNumber,
            tax_id: application.taxId || null
          })
          .select()
          .single();

        if (centerError) {
          console.error("Center creation error:", centerError);
          toast({
            title: "Application submitted and pending review and approval after center verification is complete",
            description: "Account created but repair center details need review. Please contact support.",
            variant: "destructive",
          });
          return;
        }

        // Create repair center staff record (initially inactive, pending approval)
        const { error: staffError } = await supabase
          .from("repair_center_staff")
          .insert({
            user_id: authData.user.id,
            repair_center_id: centerData.id,
            is_active: false, // Pending approval
            is_owner: true,
            role: 'admin'
          });

        if (staffError) {
          console.error("Staff record error:", staffError);
        }

        // Send confirmation email
        try {
          await supabase.functions.invoke("send-confirmation-email", {
            body: {
              email: application.email,
              name: application.ownerName,
              centerName: application.businessName,
              type: "application"
            }
          });
        } catch (emailError) {
          console.error("Failed to send confirmation email:", emailError);
          // Don't fail the whole operation if email fails
        }

        toast({
          title: "Application submitted and pending review and approval after center verification is complete",
          description: "Check your email for verification, then wait for admin approval.",
        });

        setIsSubmitted(true);

        // Reset form
        setApplication({
          businessName: "",
          ownerName: "",
          email: "",
          phone: "",
          website: "",
          address: "",
          city: "",
          state: "",
          zipCode: "",
          operatingHours: "",
          specialties: "",
          certifications: "",
          description: "",
          cacName: "",
          cacNumber: "",
          taxId: "",
          yearsInBusiness: "",
          numberOfStaff: "",
          password: ""
        });

        // Redirect to repair center admin portal
        setTimeout(() => {
          navigate("/repair-center-admin");
        }, 2000);
      }
    } catch (error: any) {
      console.error("Application error:", error);
      toast({
        title: "Application Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show success page if application submitted
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-green-50 dark:bg-green-950">
        <div className="max-w-2xl mx-auto px-6 py-24 text-center">
          <CheckCircle className="h-24 w-24 text-green-600 mx-auto mb-8" />
          <h1 className="text-4xl font-bold text-green-800 dark:text-green-200 mb-4">
            Application Submitted Successfully!
          </h1>
          <p className="text-xl text-green-700 dark:text-green-300 mb-8">
            Your repair center application has been submitted and is pending review and approval after center verification is complete.
          </p>
          <div className="bg-white dark:bg-green-900 rounded-lg p-6 shadow-lg mb-8">
            <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">What happens next?</h3>
            <ul className="text-green-700 dark:text-green-300 space-y-2 text-left">
              <li>• Check your email for verification link</li>
              <li>• Our team will review your application</li>
              <li>• We'll verify your repair center details</li>
              <li>• You'll receive approval notification within 3-5 business days</li>
            </ul>
          </div>
          <Button onClick={() => navigate("/")} className="bg-green-600 hover:bg-green-700">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-12">
        <div className="max-w-4xl mx-auto px-6">
          <Link to="/" className="inline-flex items-center text-primary-foreground/80 hover:text-primary-foreground mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
          <h1 className="text-4xl font-bold mb-4">Join the Fixbudi Network</h1>
          <p className="text-xl text-primary-foreground/90">
            Apply to become an authorized repair center and grow your business with us
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Benefits Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardContent className="p-6 text-center">
              <Star className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Increased Visibility</h3>
              <p className="text-sm text-muted-foreground">
                Get discovered by thousands of customers looking for reliable repair services
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <MapPin className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Local Customers</h3>
              <p className="text-sm text-muted-foreground">
                Connect with customers in your area who need your specific expertise
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Phone className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Direct Leads</h3>
              <p className="text-sm text-muted-foreground">
                Receive direct customer inquiries and pickup requests through our platform
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Application Form */}
        <Card>
          <CardHeader>
            <CardTitle>Repair Center Application</CardTitle>
            <p className="text-muted-foreground">
              Please fill out all required information to apply for partnership with Fixbudi
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Business Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Business Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="businessName">Business Name *</Label>
                    <Input
                      id="businessName"
                      value={application.businessName}
                      onChange={(e) => setApplication({...application, businessName: e.target.value})}
                      placeholder="Your Repair Center Name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="ownerName">Owner/Manager Name *</Label>
                    <Input
                      id="ownerName"
                      value={application.ownerName}
                      onChange={(e) => setApplication({...application, ownerName: e.target.value})}
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Business Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={application.email}
                      onChange={(e) => setApplication({...application, email: e.target.value})}
                      placeholder="business@example.com"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Business Phone *</Label>
                    <Input
                      id="phone"
                      value={application.phone}
                      onChange={(e) => setApplication({...application, phone: e.target.value})}
                      placeholder="+234 xxx xxx xxxx"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="website">Website (Optional)</Label>
                    <Input
                      id="website"
                      value={application.website}
                      onChange={(e) => setApplication({...application, website: e.target.value})}
                      placeholder="https://yourwebsite.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Create Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={application.password}
                      onChange={(e) => setApplication({...application, password: e.target.value})}
                      placeholder="Choose a secure password"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Location Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Location Information</h3>
                <div>
                  <Label htmlFor="address">Street Address *</Label>
                  <Input
                    id="address"
                    value={application.address}
                    onChange={(e) => setApplication({...application, address: e.target.value})}
                    placeholder="123 Main Street"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={application.city}
                      onChange={(e) => setApplication({...application, city: e.target.value})}
                      placeholder="Port Harcourt"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      value={application.state}
                      onChange={(e) => setApplication({...application, state: e.target.value})}
                      placeholder="Rivers State"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="zipCode">ZIP/Postal Code</Label>
                    <Input
                      id="zipCode"
                      value={application.zipCode}
                      onChange={(e) => setApplication({...application, zipCode: e.target.value})}
                      placeholder="500001"
                    />
                  </div>
                </div>
              </div>

              {/* Business Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Business Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="yearsInBusiness">Years in Business *</Label>
                    <Input
                      id="yearsInBusiness"
                      type="number"
                      value={application.yearsInBusiness}
                      onChange={(e) => setApplication({...application, yearsInBusiness: e.target.value})}
                      placeholder="5"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="numberOfStaff">Number of Staff *</Label>
                    <Input
                      id="numberOfStaff"
                      type="number"
                      value={application.numberOfStaff}
                      onChange={(e) => setApplication({...application, numberOfStaff: e.target.value})}
                      placeholder="5"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="operatingHours">Operating Hours *</Label>
                  <Input
                    id="operatingHours"
                    value={application.operatingHours}
                    onChange={(e) => setApplication({...application, operatingHours: e.target.value})}
                    placeholder="Monday-Saturday: 8AM-6PM, Sunday: Closed"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="specialties">Repair Specialties *</Label>
                  <Textarea
                    id="specialties"
                    value={application.specialties}
                    onChange={(e) => setApplication({...application, specialties: e.target.value})}
                    placeholder="Smartphones, Laptops, Refrigerators, Washing Machines, Air Conditioners..."
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="certifications">Certifications & Licenses</Label>
                  <Textarea
                    id="certifications"
                    value={application.certifications}
                    onChange={(e) => setApplication({...application, certifications: e.target.value})}
                    placeholder="List any relevant certifications, licenses, or manufacturer authorizations"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Business Description</Label>
                  <Textarea
                    id="description"
                    value={application.description}
                    onChange={(e) => setApplication({...application, description: e.target.value})}
                    placeholder="Tell us about your business, experience, and what makes you stand out..."
                  />
                </div>
              </div>

              {/* Registration Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Registration Information</h3>
                <div>
                  <Label htmlFor="cacName">CAC Registered Name *</Label>
                  <Input
                    id="cacName"
                    value={application.cacName}
                    onChange={(e) => setApplication({...application, cacName: e.target.value})}
                    placeholder="Corporate Affairs Commission Registered Name"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cacNumber">CAC Number *</Label>
                    <Input
                      id="cacNumber"
                      value={application.cacNumber}
                      onChange={(e) => setApplication({...application, cacNumber: e.target.value})}
                      placeholder="RC123456"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="taxId">Tax ID (Optional)</Label>
                    <Input
                      id="taxId"
                      value={application.taxId}
                      onChange={(e) => setApplication({...application, taxId: e.target.value})}
                      placeholder="Enter Tax Identification Number"
                    />
                  </div>
                </div>
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Submitting Application..." : "Submit Application"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card className="mt-8">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-2">Questions about the application?</h3>
            <p className="text-muted-foreground">
              Contact our partnership team at <strong>partners@fixbudi.com</strong> or call{" "}
              <strong>+234 xxx xxx xxxx</strong>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RepairCenterApplication;