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
  fullName: string;
  website?: string;
  certifications?: string;
  description?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📥 Starting repair center application submission...');
    
    const applicationData: ApplicationData = await req.json();
    
    // Validate required fields
    if (!applicationData.email || !applicationData.fullName) {
      console.log('❌ Missing required fields');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Email and full name are required" 
        }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        }
      );
    }

    console.log(`📧 Processing application for: ${applicationData.email}`);
    
    // Initialize Supabase client with anon key (public access)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Check if an application with this email already exists
    const { data: existing, error: checkError } = await supabase
      .from('repair_center_applications')
      .select('id, status, created_at')
      .eq('email', applicationData.email)
      .maybeSingle();

    // If application exists, return success with helpful message
    if (existing) {
      console.log(`✅ Application already exists for ${applicationData.email} (Status: ${existing.status})`);
      return new Response(
        JSON.stringify({
          success: true,
          message: "Application already submitted. Our team will review it shortly.",
          applicationId: existing.id,
          status: existing.status,
          submittedAt: existing.created_at
        }),
        { 
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        }
      );
    }

    // Insert new application into repair_center_applications table
    console.log('💾 Creating new application record...');
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
      console.error('❌ Insert failed:', insertError);
      
      // Handle duplicate email constraint violation gracefully
      if (insertError.code === '23505') {
        console.log('ℹ️ Duplicate email detected, returning success');
        return new Response(
          JSON.stringify({ 
            success: true,
            message: "Application already submitted. Our team will review it shortly."
          }),
          { 
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Failed to submit application. Please try again." 
        }),
        { 
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        }
      );
    }

    console.log(`✅ Application submitted successfully! ID: ${newApplication.id}`);

    // Return success
    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Application submitted successfully! Our team will review it within 24-48 hours and contact you via email.",
        applicationId: newApplication.id,
        status: newApplication.status
      }),
      { 
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error("💥 Error in submit-repair-center-application function:", error);
    
    // Always return 200 with error message for client-side handling
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "An unexpected error occurred. Please try again.",
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