import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationPayload {
  type:
    | "sale_completed"
    | "payout_requested"
    | "payout_approved"
    | "payout_paid"
    | "affiliate_sale";
  data: Record<string, unknown>;
}

async function sendEmail(to: string, subject: string, html: string) {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY not set");
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "GhostPen <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Resend error:", err);
  }
}

function formatCurrency(amount: number) {
  return `₦${amount.toLocaleString()}`;
}

function emailTemplate(title: string, body: string) {
  return `
    <div style="font-family:'Space Grotesk',Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#ffffff;border-radius:12px;">
      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="font-size:20px;color:hsl(263,70%,50%);margin:0;">🎓 GhostPen</h1>
      </div>
      <h2 style="font-size:18px;color:hsl(240,10%,3.9%);margin-bottom:16px;">${title}</h2>
      <div style="font-size:14px;color:hsl(240,3.8%,46.1%);line-height:1.6;">${body}</div>
      <hr style="border:none;border-top:1px solid hsl(240,5.9%,90%);margin:24px 0;" />
      <p style="font-size:12px;color:hsl(240,3.8%,46.1%);text-align:center;margin:0;">GhostPen — Ghostwriting Mastery</p>
    </div>
  `;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { type, data } = (await req.json()) as NotificationPayload;

    // Helper to send push notification
    const sendPush = async (userIds: string[], title: string, body: string, url = "/") => {
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-push`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseServiceKey}` },
          body: JSON.stringify({ userIds, title, body, url }),
        });
      } catch (err) {
        console.error("Push notification error:", err);
      }
    };

    // Helper to get admin user IDs and emails
    const getAdminInfo = async (): Promise<{ emails: string[]; userIds: string[] }> => {
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (!adminRoles || adminRoles.length === 0) return { emails: [], userIds: [] };

      const emails: string[] = [];
      const userIds: string[] = [];
      for (const role of adminRoles) {
        userIds.push(role.user_id);
        const { data: userData } = await supabase.auth.admin.getUserById(role.user_id);
        if (userData?.user?.email) emails.push(userData.user.email);
      }
      return { emails, userIds };
    };

    // Helper to get affiliate email
    const getAffiliateEmail = async (affiliateId: string): Promise<string | null> => {
      const { data: aff } = await supabase
        .from("affiliates")
        .select("user_id")
        .eq("id", affiliateId)
        .single();

      if (!aff) return null;

      const { data: userData } = await supabase.auth.admin.getUserById(aff.user_id);
      return userData?.user?.email ?? null;
    };

    switch (type) {
      case "sale_completed": {
        const { amount, courseTitle, buyerEmail, affiliateId } = data as {
          amount: number;
          courseTitle: string;
          buyerEmail: string;
          affiliateId?: string;
        };

        // Notify admins
        const adminEmails = await getAdminEmails();
        for (const email of adminEmails) {
          await sendEmail(
            email,
            `💰 New Sale — ${formatCurrency(amount)}`,
            emailTemplate(
              "New Sale Completed!",
              `<p><strong>Course:</strong> ${courseTitle}</p>
               <p><strong>Buyer:</strong> ${buyerEmail}</p>
               <p><strong>Amount:</strong> ${formatCurrency(amount)}</p>
               ${affiliateId ? `<p><strong>Referred by affiliate</strong></p>` : ""}`
            )
          );
        }
        break;
      }

      case "affiliate_sale": {
        const { affiliateId, amount, commission, courseTitle } = data as {
          affiliateId: string;
          amount: number;
          commission: number;
          courseTitle: string;
        };

        const email = await getAffiliateEmail(affiliateId);
        if (email) {
          await sendEmail(
            email,
            `🎉 You earned ${formatCurrency(commission)} commission!`,
            emailTemplate(
              "New Referral Sale!",
              `<p>Someone purchased <strong>${courseTitle}</strong> through your link.</p>
               <p><strong>Sale Amount:</strong> ${formatCurrency(amount)}</p>
               <p><strong>Your Commission:</strong> ${formatCurrency(commission)}</p>
               <p>Keep sharing and earning! 🚀</p>`
            )
          );
        }
        break;
      }

      case "payout_requested": {
        const { affiliateId, amount, affiliateName } = data as {
          affiliateId: string;
          amount: number;
          affiliateName: string;
        };

        const adminEmails = await getAdminEmails();
        for (const email of adminEmails) {
          await sendEmail(
            email,
            `📤 New Payout Request — ${formatCurrency(amount)}`,
            emailTemplate(
              "New Payout Request",
              `<p><strong>Affiliate:</strong> ${affiliateName}</p>
               <p><strong>Amount:</strong> ${formatCurrency(amount)}</p>
               <p>Log in to the admin dashboard to review and process this request.</p>`
            )
          );
        }
        break;
      }

      case "payout_approved": {
        const { affiliateId, amount } = data as {
          affiliateId: string;
          amount: number;
        };

        const email = await getAffiliateEmail(affiliateId);
        if (email) {
          await sendEmail(
            email,
            `✅ Payout Approved — ${formatCurrency(amount)}`,
            emailTemplate(
              "Your Payout Has Been Approved!",
              `<p>Your withdrawal request of <strong>${formatCurrency(amount)}</strong> has been approved.</p>
               <p>The transfer will be processed shortly. You'll receive another notification once it's completed.</p>`
            )
          );
        }
        break;
      }

      case "payout_paid": {
        const { affiliateId, amount } = data as {
          affiliateId: string;
          amount: number;
        };

        const email = await getAffiliateEmail(affiliateId);
        if (email) {
          await sendEmail(
            email,
            `💸 Payout Sent — ${formatCurrency(amount)}`,
            emailTemplate(
              "Your Payout Has Been Sent!",
              `<p>Your withdrawal of <strong>${formatCurrency(amount)}</strong> has been transferred to your bank account.</p>
               <p>Please allow 1–2 business days for the funds to reflect.</p>`
            )
          );
        }
        break;
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Notification error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
