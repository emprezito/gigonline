import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AFFILIATE_COMMISSION_RATE = 50;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET_KEY) throw new Error("PAYSTACK_SECRET_KEY not configured");

    const { reference } = await req.json();
    if (!reference) {
      return new Response(JSON.stringify({ error: "Missing reference" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify transaction with Paystack
    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
    });

    const result = await res.json();
    if (!res.ok || !result.data || result.data.status !== "success") {
      return new Response(JSON.stringify({ error: "Payment not successful", details: result }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { metadata, amount } = result.data;
    const { course_id, user_id, affiliate_id } = metadata;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if already processed
    const { data: existingSale } = await supabase
      .from("sales")
      .select("id")
      .eq("payment_ref", reference)
      .limit(1);

    if (existingSale && existingSale.length > 0) {
      // Already processed, ensure enrollment exists
      const { data: existingEnrollment } = await supabase
        .from("enrollments")
        .select("id")
        .eq("user_id", user_id)
        .eq("course_id", course_id)
        .limit(1);

      if (!existingEnrollment || existingEnrollment.length === 0) {
        await supabase.from("enrollments").insert({ user_id, course_id });
      }

      return new Response(JSON.stringify({ status: "already_processed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amountNaira = amount / 100;

    // Calculate commission if affiliate
    let commissionAmount = 0;
    if (affiliate_id) {
      const { data: aff } = await supabase
        .from("affiliates")
        .select("approved, enabled")
        .eq("id", affiliate_id)
        .single();

      if (aff?.approved && aff?.enabled) {
        commissionAmount = Math.round((amountNaira * AFFILIATE_COMMISSION_RATE) / 100);
      }
    }

    // Insert sale
    await supabase.from("sales").insert({
      user_id,
      course_id,
      affiliate_id: affiliate_id || null,
      amount: amountNaira,
      commission_amount: commissionAmount,
      payment_ref: reference,
      status: "completed",
    });

    // Enroll user
    const { data: existing } = await supabase
      .from("enrollments")
      .select("id")
      .eq("user_id", user_id)
      .eq("course_id", course_id)
      .limit(1);

    if (!existing || existing.length === 0) {
      await supabase.from("enrollments").insert({ user_id, course_id });
    }

    return new Response(JSON.stringify({ status: "success" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("verify-payment error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
