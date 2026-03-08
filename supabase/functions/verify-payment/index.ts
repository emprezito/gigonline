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

    // Authenticate the caller
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authSupabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await authSupabase.auth.getUser(token);
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
      console.error("Paystack verification failed:", result);
      return new Response(JSON.stringify({ error: "Payment could not be verified. Please try again." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { metadata, amount } = result.data;
    const { course_id, user_id, affiliate_id } = metadata;

    // Verify the caller is the payment owner
    if (caller.id !== user_id) {
      return new Response(JSON.stringify({ error: "Forbidden: you can only verify your own payments" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = authSupabase;

    // Validate paid amount matches actual course price
    const { data: course } = await supabase
      .from("courses")
      .select("price, title")
      .eq("id", course_id)
      .single();

    const paidAmountNaira = amount / 100;
    if (!course || paidAmountNaira < course.price) {
      console.error(`Payment amount mismatch: paid ${paidAmountNaira}, course price ${course?.price}`);
      return new Response(JSON.stringify({ error: "Payment amount does not match course price" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // Calculate commission if affiliate
    let commissionAmount = 0;
    if (affiliate_id) {
      const { data: aff } = await supabase
        .from("affiliates")
        .select("approved, enabled")
        .eq("id", affiliate_id)
        .single();

      if (aff?.approved && aff?.enabled) {
        commissionAmount = Math.round((paidAmountNaira * AFFILIATE_COMMISSION_RATE) / 100);
      }
    }

    // Insert sale
    await supabase.from("sales").insert({
      user_id,
      course_id,
      affiliate_id: affiliate_id || null,
      amount: paidAmountNaira,
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

    // Send notifications (fire-and-forget)
    const notifyUrl = `${supabaseUrl}/functions/v1/send-notification`;
    const notifyHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${supabaseServiceKey}` };

    const { data: buyer } = await supabase.auth.admin.getUserById(user_id);
    const courseTitle = course?.title || "Course";

    fetch(notifyUrl, {
      method: "POST",
      headers: notifyHeaders,
      body: JSON.stringify({
        type: "sale_completed",
        data: { amount: paidAmountNaira, courseTitle, buyerEmail: buyer?.user?.email || "", affiliateId: affiliate_id || null },
      }),
    }).catch(console.error);

    if (affiliate_id && commissionAmount > 0) {
      fetch(notifyUrl, {
        method: "POST",
        headers: notifyHeaders,
        body: JSON.stringify({
          type: "affiliate_sale",
          data: { affiliateId: affiliate_id, amount: paidAmountNaira, commission: commissionAmount, courseTitle },
        }),
      }).catch(console.error);
    }

    return new Response(JSON.stringify({ status: "success" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("verify-payment error:", error);
    return new Response(JSON.stringify({ error: "Payment could not be verified. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
