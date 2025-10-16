import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const applicationSchema = z.object({
  businessName: z.string().trim().min(2, "Business name required").max(200),
  address: z.string().trim().min(5, "Address required").max(300),
  city: z.string().trim().min(2, "City required").max(100),
  state: z.string().trim().min(2, "State required").max(100),
  zipCode: z.string().trim().regex(/^[0-9A-Za-z\s-]{3,10}$/, "Invalid zip code"),
  phone: z.string().trim().regex(/^[\d\s()+.-]{7,20}$/, "Invalid phone number"),
  email: z.string().trim().email("Invalid email").max(255),
  operatingHours: z.string().trim().min(3, "Operating hours required").max(200),
  specialties: z.string().trim().min(2, "Specialties required").max(500),
  numberOfStaff: z.string().regex(/^\d+$/, "Must be a number"),
  yearsInBusiness: z.string().regex(/^\d+$/, "Must be a number"),
  cacName: z.string().trim().min(2, "CAC name required").max(200),
  cacNumber: z.string().trim().min(2, "CAC number required").max(50),
  taxId: z.string().trim().max(50).optional(),
  website: z.string().trim().url("Invalid URL").max(255).optional().or(z.literal("")),
  certifications: z.string().trim().max(1000).optional(),
  description: z.string().trim().max(2000).optional(),
  fullName: z.string().trim().min(2, "Full name required").max(200)
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
