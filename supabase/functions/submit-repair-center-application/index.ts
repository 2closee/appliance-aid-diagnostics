import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema - relaxed for Nigerian formats
const applicationSchema = z.object({
  businessName: z.string().trim().min(2, "Business name must be at least 2 characters").max(200, "Business name too long"),
  address: z.string().trim().min(5, "Address must be at least 5 characters").max(300, "Address too long"),
  city: z.string().trim().min(2, "City must be at least 2 characters").max(100, "City name too long"),
  state: z.string().trim().min(2, "State must be at least 2 characters").max(100, "State name too long"),
  // Relaxed: Allow 3-15 characters, letters, numbers, spaces, hyphens (supports Nigerian postal codes)
  zipCode: z.string().trim().min(3, "ZIP/Postal code must be at least 3 characters").max(15, "ZIP/Postal code too long"),
  // Relaxed: Allow Nigerian formats like 08012345678, +2348012345678, or international formats
  phone: z.string().trim().min(7, "Phone number must be at least 7 digits").max(25, "Phone number too long")
    .refine((val) => /[\d]/.test(val), "Phone number must contain digits"),
  email: z.string().trim().email("Please enter a valid email address").max(255, "Email too long"),
  operatingHours: z.string().trim().min(3, "Operating hours required (e.g., Mon-Fri: 9AM-6PM)").max(200, "Operating hours too long"),
  specialties: z.string().trim().min(2, "Please list at least one specialty").max(500, "Specialties list too long"),
  numberOfStaff: z.string().refine((val) => /^\d+$/.test(val), "Number of staff must be a valid number"),
  yearsInBusiness: z.string().refine((val) => /^\d+$/.test(val), "Years in business must be a valid number"),
  cacName: z.string().trim().min(2, "CAC registered name must be at least 2 characters").max(200, "CAC name too long"),
  cacNumber: z.string().trim().min(2, "CAC number must be at least 2 characters").max(50, "CAC number too long"),
  taxId: z.string().trim().max(50, "Tax ID too long").optional().or(z.literal("")),
  // Relaxed: Allow empty string or valid URL (optional field)
  website: z.string().trim().max(255, "Website URL too long").optional()
    .refine((val) => !val || val === "" || /^https?:\/\/.+/.test(val), "Website must start with http:// or https://")
    .or(z.literal("")),
  certifications: z.string().trim().max(1000, "Certifications text too long").optional().or(z.literal("")),
  description: z.string().trim().max(2000, "Description too long").optional().or(z.literal("")),
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(200, "Full name too long")
});

interface ApplicationData {
  businessName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  operatingHours: string;
  specialties: string;
  numberOfStaff: string;
  yearsInBusiness: string;
  cacName: string;
  cacNumber: string;
  taxId?: string;
  website?: string;
  certifications?: string;
  description?: string;
  fullName: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting repair center application submission...');
    
    const body = await req.json();
    
    // Validate input data
    const validation = applicationSchema.safeParse(body);
    if (!validation.success) {
      console.error('Validation error:', validation.error.errors);
      return new Response(
        JSON.stringify({ 
          success: false,
          message: "Invalid application data",
          errors: validation.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
        }),
        { 
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          }
        }
      );
    }
    
    const applicationData = validation.data;
    
    // Use SERVICE_ROLE_KEY to bypass RLS for application submissions
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    console.log('Supabase URL:', supabaseUrl);
    console.log('Service role key exists:', !!supabaseKey);
    
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Debug: Test auth context
    const { data: authData } = await supabase.auth.getUser();
    console.log('Auth context - User:', authData?.user?.id || 'No user (anon)');
    console.log('Auth context - Role:', authData?.user?.role || 'anon');

    // Check if email exists in auth.users table
    console.log('Checking for existing user account...');
    const { data: existingUsers, error: userCheckError } = await supabase.auth.admin.listUsers();
    
    if (userCheckError) {
      console.error('Error checking existing users:', userCheckError);
    } else {
      const emailExists = existingUsers.users.some(
        user => user.email?.toLowerCase() === applicationData.email.toLowerCase()
      );
      
      if (emailExists) {
        console.log('Email already exists in auth.users:', applicationData.email);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'This email is already associated with an account. Please use a different email or contact support.' 
          }),
          { 
            status: 409, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Check if an application with this email already exists
    console.log('Checking for existing application...');
    const { data: existing, error: checkError } = await supabase
      .from('repair_center_applications')
      .select('id, status, business_name')
      .eq('email', applicationData.email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing application:', checkError);
      // Continue anyway - will handle duplicates below
    }

    // Handle existing applications based on their status
    if (existing) {
      console.log('Found existing application for email:', applicationData.email, 'Status:', existing.status);
      
      if (existing.status === 'pending') {
        // Prevent duplicate pending applications
        return new Response(
          JSON.stringify({
            success: true,
            message: "You have a pending application under review. Our team will contact you within 24-48 hours.",
            applicationId: existing.id,
            status: existing.status,
            businessName: existing.business_name
          }),
          { 
            status: 200,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            }
          }
        );
      } else if (existing.status === 'approved') {
        // Already approved
        return new Response(
          JSON.stringify({
            success: true,
            message: "Your business is already registered in our system. Please check your email for login credentials.",
            applicationId: existing.id,
            status: existing.status,
            businessName: existing.business_name
          }),
          { 
            status: 200,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            }
          }
        );
      }
      // If rejected, allow resubmission (continue to insert)
      console.log('Previous application was rejected, allowing resubmission');
    }

    // Insert new application
    console.log('Creating new application for email:', applicationData.email);
    console.log('Application data:', JSON.stringify(applicationData, null, 2));
    
    // Try insert without select first to isolate the issue
    const { data: insertData, error: insertError } = await supabase
      .from('repair_center_applications')
      .insert({
        email: applicationData.email,
        full_name: applicationData.fullName,
        business_name: applicationData.businessName,
        phone: applicationData.phone,
        address: applicationData.address,
        city: applicationData.city,
        state: applicationData.state,
        zip_code: applicationData.zipCode,
        operating_hours: applicationData.operatingHours,
        specialties: applicationData.specialties,
        number_of_staff: parseInt(applicationData.numberOfStaff) || 0,
        years_in_business: parseInt(applicationData.yearsInBusiness) || 0,
        cac_name: applicationData.cacName,
        cac_number: applicationData.cacNumber,
        tax_id: applicationData.taxId || null,
        website: applicationData.website || null,
        certifications: applicationData.certifications || null,
        description: applicationData.description || null,
        status: 'pending'
      });

    console.log('Insert result - data:', insertData);
    console.log('Insert result - error:', insertError);

    if (insertError) {
      console.error('Insert error:', insertError);
      
      // Handle duplicate email for pending application (unique index violation)
      if (insertError.code === '23505') { // PostgreSQL unique constraint violation
        console.log('Duplicate pending application detected via constraint');
        return new Response(
          JSON.stringify({
            success: true,
            message: "You have a pending application under review. Our team will contact you within 24-48 hours."
          }),
          { 
            status: 200,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            }
          }
        );
      }
      
      // Other errors
      return new Response(
        JSON.stringify({ 
          success: false,
          message: "Failed to submit application. Please try again.",
          error: insertError.message,
          code: insertError.code
        }),
        { 
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          }
        }
      );
    }

    console.log('Application created successfully');

    // Try to select the created application
    let newApplication = null;
    const { data: selectData, error: selectError } = await supabase
      .from('repair_center_applications')
      .select('id')
      .eq('email', applicationData.email)
      .single();
    
    if (selectError) {
      console.log('Select error (non-fatal):', selectError);
    } else {
      newApplication = selectData;
    }


    // Return success
    return new Response(
      JSON.stringify({
        success: true,
        message: "Application submitted successfully! Our team will review your application within 24-48 hours.",
        applicationId: newApplication?.id || 'pending'
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error("Error in submit-repair-center-application function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "An unexpected error occurred. Please try again.",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
};

serve(handler);
