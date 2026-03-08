import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

async function verifySignature(secret: string, body: string, signature: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const hash = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hash === signature;
}

const AFFILIATE_COMMISSION_RATE = 50;

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET_KEY) throw new Error("PAYSTACK_SECRET_KEY not configured");

    const body = await req.text();

    // Verify Paystack signature
    const signature = req.headers.get("x-paystack-signature");
    if (!signature || !(await verifySignature(PAYSTACK_SECRET_KEY, body, signature))) {
      return new Response("Invalid signature", { status: 401 });
    }

    const event = JSON.parse(body);
    if (event.event !== "charge.success") {
      return new Response("OK", { status: 200 });
    }

    const { data } = event;
    const { metadata, reference, amount } = data;
    const { course_id, user_id, affiliate_id } = metadata;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate that the paid amount matches the actual course price
    const { data: course } = await supabase
      .from("courses")
      .select("price")
      .eq("id", course_id)
      .single();

    const paidAmountNaira = amount / 100;
    if (!course || paidAmountNaira < course.price) {
      console.error(`Payment amount mismatch: paid ${paidAmountNaira}, course price ${course?.price}`);
      return new Response("Payment amount does not match course price", { status: 400 });
    }

    // Check if already processed
    const { data: existingSale } = await supabase
      .from("sales")
      .select("id")
      .eq("payment_ref", reference)
      .limit(1);

    if (existingSale && existingSale.length > 0) {
      return new Response("Already processed", { status: 200 });
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

    return new Response("OK", { status: 200 });
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    return new Response("Server error", { status: 500 });
  }
});
