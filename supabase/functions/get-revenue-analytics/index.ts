import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GET-REVENUE-ANALYTICS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Check if user is admin (TODO: implement proper admin check)
    // For now, allowing all authenticated users to view analytics
    
    // Get total revenue analytics
    const { data: totalRevenue, error: revenueError } = await supabaseClient
      .from("repair_jobs")
      .select("final_cost, app_commission, job_status, completion_date")
      .eq("job_status", "completed")
      .not("final_cost", "is", null);

    if (revenueError) {
      throw new Error(`Failed to fetch revenue data: ${revenueError.message}`);
    }

    // Get payment analytics
    const { data: payments, error: paymentError } = await supabaseClient
      .from("payments")
      .select("amount, payment_type, payment_status, commission_rate, payment_date")
      .eq("payment_status", "completed");

    if (paymentError) {
      throw new Error(`Failed to fetch payment data: ${paymentError.message}`);
    }

    // Calculate analytics
    const analytics = {
      total_completed_jobs: totalRevenue?.length || 0,
      total_service_revenue: totalRevenue?.reduce((sum, job) => sum + (parseFloat(job.final_cost) || 0), 0) || 0,
      total_app_commission: totalRevenue?.reduce((sum, job) => sum + (parseFloat(job.app_commission) || 0), 0) || 0,
      average_job_value: 0,
      monthly_revenue: {},
      commission_rate: 0.05,
      jobs_by_status: {},
      payment_success_rate: 0
    };

    if (analytics.total_completed_jobs > 0) {
      analytics.average_job_value = analytics.total_service_revenue / analytics.total_completed_jobs;
    }

    // Calculate monthly revenue breakdown
    const monthlyRevenue: { [key: string]: number } = {};
    totalRevenue?.forEach(job => {
      if (job.completion_date) {
        const month = new Date(job.completion_date).toISOString().slice(0, 7); // YYYY-MM
        monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (parseFloat(job.app_commission) || 0);
      }
    });
    analytics.monthly_revenue = monthlyRevenue;

    // Get job status distribution
    const { data: jobStatusData, error: statusError } = await supabaseClient
      .from("repair_jobs")
      .select("job_status");

    if (!statusError && jobStatusData) {
      const statusCounts: { [key: string]: number } = {};
      jobStatusData.forEach(job => {
        statusCounts[job.job_status] = (statusCounts[job.job_status] || 0) + 1;
      });
      analytics.jobs_by_status = statusCounts;
    }

    // Calculate payment success rate
    if (payments && payments.length > 0) {
      const successfulPayments = payments.filter(p => p.payment_status === 'completed').length;
      analytics.payment_success_rate = successfulPayments / payments.length;
    }

    logStep("Analytics calculated", analytics);

    return new Response(JSON.stringify(analytics), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});