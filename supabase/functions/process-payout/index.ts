import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET_KEY) throw new Error("PAYSTACK_SECRET_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin caller
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    // Check admin role
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) throw new Error("Only admins can process payouts");

    const { payoutId } = await req.json();

    // Get payout & affiliate info
    const { data: payout, error: payoutError } = await supabase
      .from("payouts")
      .select("*, affiliates(*)")
      .eq("id", payoutId)
      .single();

    if (payoutError || !payout) throw new Error("Payout not found");

    const affiliate = (payout as any).affiliates;
    if (!affiliate) throw new Error("Affiliate not found");
    if (payout.status !== "pending") throw new Error("Payout is not in pending status");

    // Check bank details
    if (!affiliate.bank_code || !affiliate.account_number || !affiliate.account_name) {
      throw new Error("Affiliate has not added bank details");
    }

    // Update to processing
    await supabase
      .from("payouts")
      .update({ status: "processing", approved_at: new Date().toISOString() })
      .eq("id", payoutId);

    // Create or reuse transfer recipient
    let recipientCode = affiliate.transfer_recipient_code;
    if (!recipientCode) {
      const recipientRes = await fetch("https://api.paystack.co/transferrecipient", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "nuban",
          name: affiliate.account_name,
          account_number: affiliate.account_number,
          bank_code: affiliate.bank_code,
          currency: "NGN",
        }),
      });

      const recipientData = await recipientRes.json();
      if (!recipientRes.ok) {
        // Revert status
        await supabase.from("payouts").update({ status: "pending", approved_at: null }).eq("id", payoutId);
        throw new Error(`Failed to create recipient: ${recipientData?.message || JSON.stringify(recipientData)}`);
      }

      recipientCode = recipientData.data.recipient_code;
      await supabase
        .from("affiliates")
        .update({ transfer_recipient_code: recipientCode })
        .eq("id", affiliate.id);
    }

    // Initiate transfer
    const transferRes = await fetch("https://api.paystack.co/transfer", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: "balance",
        reason: `Affiliate payout #${payoutId.slice(0, 8)}`,
        amount: Math.round(payout.amount * 100),
        recipient: recipientCode,
      }),
    });

    const transferData = await transferRes.json();
    if (!transferRes.ok) {
      await supabase.from("payouts").update({ status: "failed" }).eq("id", payoutId);
      throw new Error(`Transfer failed: ${transferData?.message || JSON.stringify(transferData)}`);
    }

    // Update payout with transfer reference
    await supabase
      .from("payouts")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        transfer_reference: transferData.data?.transfer_code || transferData.data?.reference || null,
      })
      .eq("id", payoutId);

    return new Response(
      JSON.stringify({ success: true, message: "Payout processed successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("process-payout error:", msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
