import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function hashAccountNumber(accountNumber: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(accountNumber);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. AUTHENTICATION CHECK
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. INPUT VALIDATION
    const { bank_code, account_number } = await req.json();
    if (!bank_code || !account_number) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!/^\d{10}$/.test(account_number)) {
      return new Response(JSON.stringify({ error: "Invalid account number" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (typeof bank_code !== "string" || bank_code.length === 0 || bank_code.length > 10) {
      return new Response(JSON.stringify({ error: "Invalid bank code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. RATE LIMITING — max 3 verifications per user per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("usage_tracking")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("action_type", "bank_verification")
      .gte("created_at", oneHourAgo);

    if ((count ?? 0) >= 3) {
      return new Response(
        JSON.stringify({ error: "Max 3 verifications per hour." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. CHECK DUPLICATE — same account not verified again within 1 hour
    const hashedAccount = await hashAccountNumber(account_number);
    const { data: recentVerification } = await supabase
      .from("usage_tracking")
      .select("id")
      .eq("user_id", user.id)
      .eq("action_type", "bank_verification")
      .gte("created_at", oneHourAgo)
      .filter("metadata->>account_hash", "eq", hashedAccount)
      .limit(1)
      .maybeSingle();

    if (recentVerification) {
      return new Response(
        JSON.stringify({ error: "This account was already verified recently." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. CALL PAYSTACK
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET_KEY) throw new Error("PAYSTACK_SECRET_KEY not configured");

    const paystackRes = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
    );
    const paystackData = await paystackRes.json();

    // 6. LOG USAGE (hashed account number, not plaintext)
    await supabase.from("usage_tracking").insert({
      user_id: user.id,
      action_type: "bank_verification",
      metadata: { account_hash: hashedAccount, bank_code },
    });

    // 7. MINIMAL RESPONSE
    if (!paystackData.status) {
      return new Response(
        JSON.stringify({ error: "Could not verify account." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ verified: true, account_name: paystackData.data.account_name }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("verify-bank-account error:", error);
    return new Response(
      JSON.stringify({ error: "Verification temporarily unavailable" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
