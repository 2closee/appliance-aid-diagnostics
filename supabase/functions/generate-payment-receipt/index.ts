import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import PDFDocument from "npm:pdfkit@0.15.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    const { payment_id } = await req.json();
    if (!payment_id) throw new Error("Payment ID is required");

    // Fetch payment details with related data
    const { data: payment, error: paymentError } = await supabaseClient
      .from("payments")
      .select(`
        *,
        repair_job:repair_jobs(
          id,
          appliance_type,
          appliance_brand,
          appliance_model,
          customer_name,
          customer_email,
          customer_phone,
          pickup_address,
          repair_center:"Repair Center"(
            name,
            phone,
            email,
            address
          )
        )
      `)
      .eq("id", payment_id)
      .single();

    if (paymentError || !payment) {
      throw new Error("Payment not found");
    }

    // Verify the payment belongs to the authenticated user
    const { data: job, error: jobError } = await supabaseClient
      .from("repair_jobs")
      .select("user_id")
      .eq("id", payment.repair_job_id)
      .single();

    if (jobError || !job || job.user_id !== user.id) {
      throw new Error("Access denied");
    }

    // Generate PDF
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Uint8Array[] = [];

    doc.on("data", (chunk: Uint8Array) => chunks.push(chunk));

    // Header
    doc.fontSize(24).font("Helvetica-Bold").text("PAYMENT RECEIPT", { align: "center" });
    doc.moveDown();
    doc.fontSize(10).font("Helvetica").fillColor("#666666");
    doc.text("Fixbudi - Smart Appliance Repair Solutions", { align: "center" });
    doc.text("www.fixbudi.com", { align: "center" });
    doc.moveDown(2);

    // Receipt Information
    doc.fillColor("#000000").fontSize(10).font("Helvetica-Bold");
    doc.text("RECEIPT INFORMATION", { underline: true });
    doc.moveDown(0.5);
    doc.font("Helvetica");

    const receiptDate = payment.payment_date || payment.created_at;
    doc.text(`Receipt Number: ${payment.payment_reference || payment.id.substring(0, 12).toUpperCase()}`);
    doc.text(`Payment Date: ${new Date(receiptDate).toLocaleString("en-NG", { 
      dateStyle: "long", 
      timeStyle: "short" 
    })}`);
    doc.text(`Payment Status: ${payment.payment_status.toUpperCase()}`);
    if (payment.payment_transaction_id) {
      doc.text(`Transaction ID: ${payment.payment_transaction_id}`);
    }
    doc.moveDown(1.5);

    // Customer Information
    doc.font("Helvetica-Bold");
    doc.text("CUSTOMER INFORMATION", { underline: true });
    doc.moveDown(0.5);
    doc.font("Helvetica");
    doc.text(`Name: ${payment.repair_job.customer_name}`);
    doc.text(`Email: ${payment.repair_job.customer_email}`);
    doc.text(`Phone: ${payment.repair_job.customer_phone}`);
    doc.text(`Address: ${payment.repair_job.pickup_address}`);
    doc.moveDown(1.5);

    // Repair Center Information
    if (payment.repair_job.repair_center) {
      doc.font("Helvetica-Bold");
      doc.text("REPAIR CENTER", { underline: true });
      doc.moveDown(0.5);
      doc.font("Helvetica");
      doc.text(`Name: ${payment.repair_job.repair_center.name}`);
      doc.text(`Phone: ${payment.repair_job.repair_center.phone}`);
      if (payment.repair_job.repair_center.email) {
        doc.text(`Email: ${payment.repair_job.repair_center.email}`);
      }
      doc.moveDown(1.5);
    }

    // Service Details
    doc.font("Helvetica-Bold");
    doc.text("SERVICE DETAILS", { underline: true });
    doc.moveDown(0.5);
    doc.font("Helvetica");
    doc.text(`Appliance: ${payment.repair_job.appliance_type}`);
    if (payment.repair_job.appliance_brand) {
      doc.text(`Brand: ${payment.repair_job.appliance_brand}`);
    }
    if (payment.repair_job.appliance_model) {
      doc.text(`Model: ${payment.repair_job.appliance_model}`);
    }
    doc.text(`Job ID: ${payment.repair_job.id.substring(0, 12).toUpperCase()}`);
    doc.moveDown(1.5);

    // Payment Breakdown
    doc.font("Helvetica-Bold").fontSize(12);
    doc.text("PAYMENT BREAKDOWN", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);

    // Draw table
    const tableTop = doc.y;
    const descriptionX = 50;
    const amountX = 450;

    // Table header
    doc.font("Helvetica-Bold");
    doc.text("Description", descriptionX, tableTop);
    doc.text("Amount", amountX, tableTop);
    doc.moveDown(0.5);

    // Draw line under header
    doc.strokeColor("#cccccc")
       .lineWidth(1)
       .moveTo(50, doc.y)
       .lineTo(550, doc.y)
       .stroke();
    doc.moveDown(0.5);

    // Payment items
    doc.font("Helvetica");
    const itemY = doc.y;
    doc.text("Repair Service Payment", descriptionX, itemY);
    doc.text(`₦${payment.amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, amountX, itemY);
    doc.moveDown(1.5);

    // Draw line
    doc.strokeColor("#cccccc")
       .lineWidth(1)
       .moveTo(50, doc.y)
       .lineTo(550, doc.y)
       .stroke();
    doc.moveDown(0.5);

    // Total
    doc.font("Helvetica-Bold").fontSize(14);
    const totalY = doc.y;
    doc.text("TOTAL PAID:", descriptionX, totalY);
    doc.text(`₦${payment.amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, amountX, totalY);
    doc.moveDown(2);

    // Footer
    doc.fontSize(9).font("Helvetica").fillColor("#666666");
    doc.text("This is an official payment receipt from Fixbudi.", { align: "center" });
    doc.text("For any queries, please contact our support team.", { align: "center" });
    doc.moveDown(0.5);
    doc.text(`Payment processed via ${payment.payment_provider || 'Paystack'}`, { align: "center" });

    // Finalize PDF
    doc.end();

    // Wait for PDF generation to complete
    await new Promise<void>((resolve) => {
      doc.on("end", () => resolve());
    });

    // Combine chunks into a single buffer
    const pdfBuffer = new Uint8Array(
      chunks.reduce((acc, chunk) => acc + chunk.length, 0)
    );
    let offset = 0;
    for (const chunk of chunks) {
      pdfBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    // Return PDF as downloadable file
    return new Response(pdfBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="receipt-${payment.payment_reference || payment.id.substring(0, 8)}.pdf"`,
      },
      status: 200,
    });
  } catch (error) {
    console.error("Error generating receipt:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
