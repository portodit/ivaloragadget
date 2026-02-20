import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "super_admin")
      .single();

    if (!callerRole) {
      return new Response(JSON.stringify({ error: "Forbidden: super_admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { target_user_id, action } = await req.json();
    if (!target_user_id || !["approve", "reject", "suspend"].includes(action)) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const statusMap: Record<string, string> = {
      approve: "active",
      reject: "rejected",
      suspend: "suspended",
    };

    const { error: updateError } = await supabaseAdmin
      .from("user_profiles")
      .update({ status: statusMap[action] })
      .eq("id", target_user_id);

    if (updateError) throw updateError;

    // If approving, assign role and branch from user metadata
    if (action === "approve") {
      // Get user metadata to find requested role and branch
      const { data: { user: targetUser } } = await supabaseAdmin.auth.admin.getUserById(target_user_id);
      const metadata = targetUser?.user_metadata ?? {};
      const requestedRole = metadata.requested_role;
      const requestedBranchId = metadata.requested_branch_id;

      // Determine role: use requested_role if valid, fallback to admin_branch
      const validRoles = ["admin_branch", "employee"];
      const role = validRoles.includes(requestedRole) ? requestedRole : "admin_branch";

      // Assign role
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: target_user_id, role }, { onConflict: "user_id,role" });

      // Assign branch if provided
      if (requestedBranchId) {
        // Verify branch exists
        const { data: branch } = await supabaseAdmin
          .from("branches")
          .select("id")
          .eq("id", requestedBranchId)
          .eq("is_active", true)
          .single();

        if (branch) {
          await supabaseAdmin
            .from("user_branches")
            .upsert(
              { user_id: target_user_id, branch_id: requestedBranchId, is_default: true, assigned_by: caller.id },
              { onConflict: "user_id,branch_id" }
            );
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, status: statusMap[action] }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
