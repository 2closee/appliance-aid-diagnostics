import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar,
  Clock,
  Mail,
  Phone,
  MapPin,
  User,
  Package,
  CheckCircle,
  AlertCircle,
  Send,
  Bookmark,
  AlertTriangle
} from "lucide-react";
import { useLocation, Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type FormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  repairCenter: string;
  applianceType: string;
  applianceBrand: string;
  applianceModel: string;
  issueDescription: string;
  preferredDate: string;
  preferredTime: string;
  urgency: string;
  agreeToTerms: boolean;
};

interface RepairCenter {
  id: number;
  name: string;
  general_location: string;
  hours: string;
  specialties: string;
  number_of_staff: number;
  years_of_experience: number;
}

interface SavedAddress {
  id: string;
  label: string | null;
  address_line: string;
  city: string;
  state: string;
  zip_code: string;
  is_default: boolean;
}

interface AddressSuggestion {
  address: string;
  coordinates: [number, number];
}

const PickupRequest = () => {
  const location = useLocation();
  const { toast } = useToast();
  const { user, isLoading } = useAuth();
  const selectedCenter = location.state?.selectedCenter;
  const passedApplianceType = location.state?.applianceType;
  const passedIssueDescription = location.state?.issueDescription;
  const diagnosticData = location.state?.diagnosticData;
  
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    repairCenter: '',
    applianceType: '',
    applianceBrand: '',
    applianceModel: '',
    issueDescription: '',
    preferredDate: '',
    preferredTime: '',
    urgency: 'normal',
    agreeToTerms: false
  });

  const [repairCenters, setRepairCenters] = useState<RepairCenter[]>([]);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isVerifyingAddress, setIsVerifyingAddress] = useState(false);
  const [addressVerified, setAddressVerified] = useState(false);
  const [addressVerificationMessage, setAddressVerificationMessage] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);

  useEffect(() => {
    fetchRepairCenters();
    
    const fetchUserProfile = async () => {
      if (user) {
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('full_name, email, phone')
            .eq('id', user.id)
            .maybeSingle();

          if (error) throw error;

          if (profile) {
            const nameParts = profile.full_name?.split(' ') || [];
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';

            setFormData(prev => ({
              ...prev,
              firstName,
              lastName,
              email: profile.email || user.email || '',
              phone: profile.phone || '',
            }));
          } else {
            setFormData(prev => ({
              ...prev,
              email: user.email || '',
            }));
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setFormData(prev => ({
            ...prev,
            email: user.email || '',
          }));
        }
      }
    };

    const fetchSavedAddresses = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from('saved_addresses')
            .select('*')
            .eq('user_id', user.id)
            .order('is_default', { ascending: false })
            .order('created_at', { ascending: false });

          if (error) throw error;
          setSavedAddresses(data || []);
        } catch (error) {
          console.error('Error fetching saved addresses:', error);
        }
      }
    };

    fetchUserProfile();
    fetchSavedAddresses();
    
    // Pre-select repair center if passed via state
    if (selectedCenter) {
      setFormData(prev => ({ 
        ...prev, 
        repairCenter: selectedCenter.id.toString() 
      }));
    }

    // Pre-fill appliance type and issue description from diagnostic session
    if (passedApplianceType || passedIssueDescription) {
      setFormData(prev => ({
        ...prev,
        ...(passedApplianceType && { applianceType: passedApplianceType }),
        ...(passedIssueDescription && { issueDescription: passedIssueDescription })
      }));
    }
  }, [user, selectedCenter, passedApplianceType, passedIssueDescription]);

  const fetchRepairCenters = async () => {
    try {
      const { data, error } = await supabase
        .rpc("get_public_repair_centers")
        .order("name");

      if (error) throw error;
      setRepairCenters(data || []);
    } catch (error) {
      console.error("Error fetching repair centers:", error);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    // Reset verification when address fields change
    if (['address', 'city', 'state', 'zipCode'].includes(field as string)) {
      setAddressVerified(false);
      setAddressVerificationMessage('');
      setAddressSuggestions([]);
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSavedAddressSelect = (addressId: string) => {
    setSelectedAddressId(addressId);
    
    if (addressId === 'new') {
      setFormData(prev => ({
        ...prev,
        address: '',
        city: '',
        state: '',
        zipCode: ''
      }));
      setAddressVerified(false);
      setAddressVerificationMessage('');
      setAddressSuggestions([]);
      return;
    }

    const address = savedAddresses.find(a => a.id === addressId);
    if (address) {
      setFormData(prev => ({
        ...prev,
        address: address.address_line,
        city: address.city,
        state: address.state,
        zipCode: address.zip_code
      }));
      // Saved addresses are pre-verified
      setAddressVerified(true);
      setAddressVerificationMessage('Using saved verified address');
      setAddressSuggestions([]);
    }
  };

  const handleSuggestionSelect = (suggestion: AddressSuggestion) => {
    // Parse the suggestion address
    const parts = suggestion.address.split(',').map(p => p.trim());
    const zipMatch = parts[parts.length - 1].match(/\d{5,6}/);
    
    setFormData(prev => ({
      ...prev,
      address: parts[0] || '',
      city: parts[1] || '',
      state: parts[2]?.split(' ')[0] || '',
      zipCode: zipMatch ? zipMatch[0] : ''
    }));
    
    setAddressVerified(true);
    setAddressVerificationMessage('Address selected from suggestions');
    setAddressSuggestions([]);
    
    toast({
      title: "Address Selected",
      description: "Address has been populated from suggestions.",
    });
  };

  const verifyAddress = async () => {
    if (!formData.address || !formData.city) {
      toast({
        title: "Incomplete Address",
        description: "Please enter at least street address and city.",
        variant: "destructive",
      });
      return;
    }

    setIsVerifyingAddress(true);
    setAddressVerificationMessage('');

    try {
      const { data, error } = await supabase.functions.invoke('verify-address', {
        body: {
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode
        }
      });

      if (error) throw error;

      if (data.valid) {
        setAddressVerified(true);
        setAddressVerificationMessage(data.message);
        setAddressSuggestions([]);
        toast({
          title: "Address Verified",
          description: "Your address has been verified successfully.",
        });
      } else {
        setAddressVerified(false);
        setAddressVerificationMessage(data.error || 'Address could not be verified');
        setAddressSuggestions(data.suggestions || []);
        
        if (data.suggestions && data.suggestions.length > 0) {
          toast({
            title: "Multiple Addresses Found",
            description: "Please select the correct address from suggestions below.",
          });
        } else {
          toast({
            title: "Address Verification Failed",
            description: data.error || 'Please check your address and try again.',
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Error verifying address:', error);
      setAddressVerified(false);
      setAddressVerificationMessage('Failed to verify address');
      toast({
        title: "Verification Error",
        description: "Could not verify address. Please check and try again.",
        variant: "destructive",
      });
    } finally {
      setIsVerifyingAddress(false);
    }
  };

  const saveAddressIfNew = async () => {
    if (!user || !formData.address) return;

    // Check if this address already exists
    const addressExists = savedAddresses.some(
      addr => 
        addr.address_line.toLowerCase() === formData.address.toLowerCase() &&
        addr.city.toLowerCase() === formData.city.toLowerCase() &&
        addr.zip_code === formData.zipCode
    );

    if (addressExists) return;

    try {
      await supabase.from('saved_addresses').insert({
        user_id: user.id,
        address_line: formData.address,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zipCode,
        is_default: savedAddresses.length === 0
      });
    } catch (error) {
      console.error('Error saving address:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.agreeToTerms) {
      toast({
        title: "Terms Required",
        description: "Please agree to the terms and conditions before submitting.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to submit a repair request.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.repairCenter) {
      toast({
        title: "Repair Center Required",
        description: "Please select a repair center.",
        variant: "destructive",
      });
      return;
    }

    if (!addressVerified) {
      toast({
        title: "Address Not Verified",
        description: "Your request will be submitted with an unverified address.",
        variant: "default",
      });
    }

    setIsSubmitting(true);

    try {
      // Create repair job
      const { data: jobData, error: jobError } = await supabase
        .from("repair_jobs")
        .insert({
          user_id: user.id,
          repair_center_id: parseInt(formData.repairCenter),
          customer_name: `${formData.firstName} ${formData.lastName}`,
          customer_email: formData.email,
          customer_phone: formData.phone,
          pickup_address: `${formData.address}, ${formData.city}, ${formData.state} ${formData.zipCode}`,
          appliance_type: formData.applianceType,
          appliance_brand: formData.applianceBrand,
          appliance_model: formData.applianceModel,
          issue_description: formData.issueDescription,
          pickup_date: formData.preferredDate ? new Date(formData.preferredDate).toISOString() : null,
          job_status: "quote_requested",
          diagnostic_conversation_id: diagnosticData?.conversationId,
          ai_diagnosis_summary: diagnosticData?.diagnosis,
          ai_confidence_score: diagnosticData?.confidenceScore,
          ai_estimated_cost_min: diagnosticData?.estimatedCost?.min,
          ai_estimated_cost_max: diagnosticData?.estimatedCost?.max,
          diagnostic_attachments: diagnosticData?.attachments
        })
        .select()
        .single();

      if (jobError) throw jobError;
      
      // Save address if it's new
      await saveAddressIfNew();
      
      setIsSubmitted(true);
      
      toast({
        title: "Request Submitted Successfully!",
        description: "Your request has been sent! You'll receive a quote within 24 hours.",
      });
    } catch (error) {
      console.error("Error submitting repair request:", error);
      toast({
        title: "Error",
        description: "Failed to submit request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card className="shadow-medium">
              <CardContent className="text-center py-12">
                <CheckCircle className="h-16 w-16 text-success mx-auto mb-6" />
                <h1 className="text-3xl font-bold text-foreground mb-4">
                  Request Submitted Successfully!
                </h1>
                <p className="text-lg text-muted-foreground mb-6">
                  Your repair request has been sent! The repair center will review your diagnostic information and send you a quote within 24 hours.
                </p>
                <div className="bg-gradient-card p-6 rounded-lg border mb-6">
                  <h3 className="font-semibold mb-2">What happens next?</h3>
                  <ul className="text-sm text-muted-foreground space-y-1 text-left">
                    <li>• The repair center will review your diagnostic information</li>
                    <li>• You'll receive a quote within 24 hours</li>
                    <li>• Accept the quote to schedule pickup</li>
                    <li>• Track your repair progress in real-time</li>
                  </ul>
                </div>
                <div className="flex gap-4 justify-center">
                  <Link to="/repair-jobs">
                    <Button>View My Repair Jobs</Button>
                  </Link>
                  <Link to="/">
                    <Button variant="outline">Return to Home</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-4 flex items-center justify-center">
              <Package className="h-10 w-10 text-primary mr-4" />
              Schedule Pickup Request
            </h1>
            <p className="text-lg text-muted-foreground">
              Fill out the form below and we'll contact you to schedule a pickup
            </p>
          </div>

          {selectedCenter && (
            <Card className="shadow-medium mb-8">
              <CardHeader>
                <CardTitle className="text-lg">Selected Repair Center</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{selectedCenter.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedCenter.general_location}</p>
                  </div>
                  <Badge variant="outline">{selectedCenter.years_of_experience} years exp.</Badge>
                </div>
              </CardContent>
            </Card>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Personal Information */}
            <Card className="shadow-medium">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        className="pl-10"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        className="pl-10"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Address Information */}
            <Card className="shadow-medium">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Pickup Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {savedAddresses.length > 0 && (
                  <div>
                    <Label htmlFor="savedAddress" className="flex items-center gap-2">
                      <Bookmark className="h-4 w-4" />
                      Use Saved Address
                    </Label>
                    <Select value={selectedAddressId} onValueChange={handleSavedAddressSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a saved address or enter new" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">+ Enter New Address</SelectItem>
                        <Separator className="my-1" />
                        {savedAddresses.map((address) => (
                          <SelectItem key={address.id} value={address.id}>
                            {address.label && (
                              <span className="font-medium">{address.label} - </span>
                            )}
                            {address.address_line}, {address.city}, {address.state} {address.zip_code}
                            {address.is_default && (
                              <Badge variant="secondary" className="ml-2 text-xs">Default</Badge>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label htmlFor="address">Street Address *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    required
                  />
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      required
                      placeholder="e.g., Lagos, Abuja"
                    />
                  </div>
                  <div>
                    <Label htmlFor="zipCode">ZIP Code *</Label>
                    <Input
                      id="zipCode"
                      value={formData.zipCode}
                      onChange={(e) => handleInputChange('zipCode', e.target.value)}
                      required
                    />
                  </div>
                </div>
                
                {/* Address Verification */}
                <div className="space-y-2">
                  <Button
                    type="button"
                    onClick={verifyAddress}
                    disabled={isVerifyingAddress || !formData.address || !formData.city}
                    variant={addressVerified ? "outline" : "default"}
                    className="w-full"
                  >
                    {isVerifyingAddress ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        Verifying Address...
                      </>
                    ) : addressVerified ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Address Verified
                      </>
                    ) : (
                      <>
                        <MapPin className="h-4 w-4 mr-2" />
                        Verify Address
                      </>
                    )}
                  </Button>
                  
                  {addressVerificationMessage && (
                    <div className={`flex items-start gap-2 p-3 rounded-md text-sm ${
                      addressVerified 
                        ? 'bg-success/10 text-success border border-success/20' 
                        : 'bg-destructive/10 text-destructive border border-destructive/20'
                    }`}>
                      {addressVerified ? (
                        <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      )}
                      <p>{addressVerificationMessage}</p>
                    </div>
                  )}
                  
                  {/* Address Suggestions */}
                  {addressSuggestions.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Did you mean:</Label>
                      {addressSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleSuggestionSelect(suggestion)}
                          className="w-full text-left p-3 rounded-md border border-border hover:border-primary hover:bg-accent transition-colors"
                        >
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium">{suggestion.address}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Click to use this address
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Appliance Information */}
            <Card className="shadow-medium">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  Appliance Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="applianceType">Appliance Type *</Label>
                    <Select value={formData.applianceType} onValueChange={(value) => handleInputChange('applianceType', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select appliance type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tv">TV</SelectItem>
                        <SelectItem value="smartphone">Smartphone</SelectItem>
                        <SelectItem value="laptop">Laptop</SelectItem>
                        <SelectItem value="tablet">Tablet</SelectItem>
                        <SelectItem value="headphones">Headphones</SelectItem>
                        <SelectItem value="gaming-console">Gaming Console</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="applianceModel">Brand/Model</Label>
                    <Input
                      id="applianceModel"
                      placeholder="e.g., Samsung 55' QLED TV"
                      value={formData.applianceModel}
                      onChange={(e) => handleInputChange('applianceModel', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="issueDescription">Issue Description *</Label>
                  <Textarea
                    id="issueDescription"
                    placeholder="Please describe the issue you're experiencing..."
                    value={formData.issueDescription}
                    onChange={(e) => handleInputChange('issueDescription', e.target.value)}
                    rows={4}
                    required
                  />
                </div>
              </CardContent>
            </Card>

            {/* Scheduling */}
            <Card className="shadow-medium">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Preferred Pickup Time
                </CardTitle>
                <CardDescription>
                  Select your preferred date and time (we'll confirm availability)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="preferredDate">Preferred Date</Label>
                    <Input
                      id="preferredDate"
                      type="date"
                      value={formData.preferredDate}
                      onChange={(e) => handleInputChange('preferredDate', e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <Label htmlFor="preferredTime">Preferred Time</Label>
                    <Select value={formData.preferredTime} onValueChange={(value) => handleInputChange('preferredTime', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select time slot" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="morning">Morning (9AM - 12PM)</SelectItem>
                        <SelectItem value="afternoon">Afternoon (12PM - 5PM)</SelectItem>
                        <SelectItem value="evening">Evening (5PM - 8PM)</SelectItem>
                        <SelectItem value="flexible">Flexible</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="urgency">Urgency Level</Label>
                  <Select value={formData.urgency} onValueChange={(value) => handleInputChange('urgency', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low - Within a week</SelectItem>
                      <SelectItem value="normal">Normal - Within 2-3 days</SelectItem>
                      <SelectItem value="high">High - Within 24 hours</SelectItem>
                      <SelectItem value="urgent">Urgent - Same day if possible</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Address Warning Banner */}
            {!addressVerified && formData.address && (
              <Card className="shadow-medium border-warning bg-warning/5">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-warning mb-1">
                        Unverified Address
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Your address has not been verified. While you can still submit the request, 
                        we recommend verifying your address to ensure accurate pickup and delivery.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Terms and Submit */}
            <Card className="shadow-medium">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="terms"
                      checked={formData.agreeToTerms}
                      onCheckedChange={(checked) => handleInputChange('agreeToTerms', checked as boolean)}
                    />
                    <Label htmlFor="terms" className="text-sm">
                      I agree to the terms and conditions and privacy policy *
                    </Label>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-end space-x-4">
                    <Button type="button" variant="outline" onClick={() => window.history.back()}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Submit Request
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PickupRequest;