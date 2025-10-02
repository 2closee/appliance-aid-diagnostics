import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    
    const applicationData: ApplicationData = await req.json();
    
    // Validate required fields
    if (!applicationData.email || !applicationData.fullName || !applicationData.businessName) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({ 
          success: false,
          message: "Email, name, and business name are required" 
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
    
    // Initialize Supabase client (no service role needed)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if an application with this email already exists
    console.log('Checking for existing application...');
    const { data: existing, error: checkError } = await supabase
      .from('repair_center_applications')
      .select('id, status, business_name')
      .eq('email', applicationData.email)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing application:', checkError);
      // Continue anyway - insert will fail if duplicate due to unique constraint
    }

    // If application exists, return success with helpful message
    if (existing) {
      console.log('Application already exists for email:', applicationData.email);
      return new Response(
        JSON.stringify({
          success: true,
          message: "Application already submitted. Our team will review it shortly.",
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

    // Insert new application
    console.log('Creating new application...');
    const { data: newApplication, error: insertError } = await supabase
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
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      
      // Handle duplicate email (in case of race condition)
      if (insertError.code === '23505') { // PostgreSQL unique constraint violation
        console.log('Duplicate detected via constraint, returning success');
        return new Response(
          JSON.stringify({
            success: true,
            message: "Application already submitted. Our team will review it shortly."
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
          message: "Failed to submit application. Please try again." 
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

    console.log('Application created successfully:', newApplication.id);

    // Return success
    return new Response(
      JSON.stringify({
        success: true,
        message: "Application submitted successfully! Our team will review your application within 24-48 hours.",
        applicationId: newApplication.id
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
