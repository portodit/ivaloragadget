import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify caller is super_admin
    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const {
      data: { user: caller },
    } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "super_admin")
      .single();

    if (!callerRole) {
      return new Response(
        JSON.stringify({ error: "Forbidden: super_admin only" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { action, user_id, email, password } = await req.json();

    if (!action) {
      return new Response(JSON.stringify({ error: "Missing action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: list_customers - get all users that are NOT admin/super_admin
    if (action === "list_customers") {
      // Get all admin/super_admin user IDs
      const { data: adminRoles } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .in("role", ["super_admin", "admin_branch", "employee"]);

      const adminIds = new Set(
        (adminRoles ?? []).map((r: { user_id: string }) => r.user_id)
      );

      // Get all users from auth.users
      const { data: listData, error: listErr } =
        await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });

      if (listErr) {
        return new Response(JSON.stringify({ error: listErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Filter out admins
      const customers = (listData?.users ?? [])
        .filter((u) => !adminIds.has(u.id))
        .map((u) => ({
          id: u.id,
          email: u.email,
          full_name: u.user_metadata?.full_name ?? null,
          phone: u.phone ?? null,
          email_confirmed: !!u.email_confirmed_at,
          email_confirmed_at: u.email_confirmed_at,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
        }));

      // Get profiles for status info
      const customerIds = customers.map((c) => c.id);
      const { data: profiles } = await supabaseAdmin
        .from("user_profiles")
        .select("id, status, full_name")
        .in("id", customerIds.length > 0 ? customerIds : ["_none_"]);

      const profileMap: Record<
        string,
        { status: string; full_name: string | null }
      > = {};
      for (const p of profiles ?? []) {
        profileMap[p.id] = {
          status: p.status,
          full_name: p.full_name,
        };
      }

      const result = customers.map((c) => ({
        ...c,
        profile_status: profileMap[c.id]?.status ?? "unknown",
        full_name: c.full_name ?? profileMap[c.id]?.full_name ?? null,
      }));

      return new Response(JSON.stringify({ customers: result }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: verify_email - manually confirm email
    if (action === "verify_email" && user_id) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
        email_confirm: true,
      });
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Also update profile status to active
      await supabaseAdmin
        .from("user_profiles")
        .update({ status: "active" })
        .eq("id", user_id);

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: update_email
    if (action === "update_email" && user_id && email) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
        email,
        email_confirm: true,
      });
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await supabaseAdmin
        .from("user_profiles")
        .update({ email })
        .eq("id", user_id);

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: update_password
    if (action === "update_password" && user_id && password) {
      if (password.length < 8) {
        return new Response(
          JSON.stringify({ error: "Password minimal 8 karakter" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
        password,
      });
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: suspend_customer
    if (action === "suspend" && user_id) {
      await supabaseAdmin
        .from("user_profiles")
        .update({ status: "suspended" })
        .eq("id", user_id);
      // Also ban from auth
      await supabaseAdmin.auth.admin.updateUserById(user_id, {
        ban_duration: "876600h",
      }); // ~100 years
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: activate_customer
    if (action === "activate" && user_id) {
      await supabaseAdmin
        .from("user_profiles")
        .update({ status: "active" })
        .eq("id", user_id);
      await supabaseAdmin.auth.admin.updateUserById(user_id, {
        ban_duration: "none",
      });
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: delete_customer
    if (action === "delete" && user_id) {
      await supabaseAdmin.auth.admin.deleteUser(user_id);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
