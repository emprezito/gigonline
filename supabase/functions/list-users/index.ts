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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabase.auth.getUser(token);
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: caller.id,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all users from auth
    const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (error) throw error;

    // Fetch profiles and roles
    const { data: profiles } = await supabase.from("profiles").select("*");
    const { data: roles } = await supabase.from("user_roles").select("*");
    const { data: enrollments } = await supabase.from("enrollments").select("user_id, course_id");

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
    const roleMap = new Map<string, string[]>();
    for (const r of roles || []) {
      const existing = roleMap.get(r.user_id) || [];
      existing.push(r.role);
      roleMap.set(r.user_id, existing);
    }
    const enrollmentMap = new Map<string, number>();
    for (const e of enrollments || []) {
      enrollmentMap.set(e.user_id, (enrollmentMap.get(e.user_id) || 0) + 1);
    }

    const result = users.map((u: any) => {
      const profile = profileMap.get(u.id);
      return {
        id: u.id,
        email: u.email,
        full_name: profile?.full_name || "",
        avatar_url: profile?.avatar_url || null,
        roles: roleMap.get(u.id) || [],
        enrollments: enrollmentMap.get(u.id) || 0,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
      };
    });

    return new Response(JSON.stringify({ users: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("List users error:", error);
    return new Response(JSON.stringify({ error: "Unable to fetch users" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
