import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { sessionId, completedBy } = await req.json();
    if (!sessionId) throw new Error("sessionId is required");

    // Fetch session details
    const { data: session, error: sessErr } = await supabase
      .from("opname_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();
    if (sessErr || !session) throw new Error("Session not found");

    // Fetch completing admin's name
    const { data: adminProfile } = await supabase
      .from("user_profiles")
      .select("full_name, email")
      .eq("id", completedBy)
      .single();
    const adminName = adminProfile?.full_name || adminProfile?.email || "Admin";

    // Fetch all super admins to notify
    const { data: superAdminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "super_admin");

    if (!superAdminRoles || superAdminRoles.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: "No super admins to notify" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const superAdminIds = superAdminRoles.map((r) => r.user_id);
    const { data: superAdminProfiles } = await supabase
      .from("user_profiles")
      .select("email, full_name")
      .in("id", superAdminIds);

    if (!superAdminProfiles || superAdminProfiles.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: "No super admin emails found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build session summary
    const sessionTypeLabel =
      session.session_type === "opening"
        ? "Opening"
        : session.session_type === "closing"
        ? "Closing"
        : "Ad-Hoc";

    const completedAt = session.completed_at
      ? new Date(session.completed_at).toLocaleString("id-ID", {
          timeZone: "Asia/Jakarta",
          dateStyle: "full",
          timeStyle: "short",
        })
      : new Date().toLocaleString("id-ID", {
          timeZone: "Asia/Jakarta",
          dateStyle: "full",
          timeStyle: "short",
        });

    const selisih = (session.total_missing ?? 0) + (session.total_unregistered ?? 0);

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f0; margin: 0; padding: 24px; }
    .card { background: #ffffff; border-radius: 12px; padding: 32px; max-width: 520px; margin: 0 auto; border: 1px solid #e5e5e5; }
    .header { border-bottom: 1px solid #f0f0f0; padding-bottom: 20px; margin-bottom: 24px; }
    .brand { font-size: 13px; color: #888; margin-bottom: 6px; }
    h1 { font-size: 20px; font-weight: 700; color: #1a1a1a; margin: 0; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
    .badge-ok { background: #dcfce7; color: #166534; }
    .badge-warn { background: #fef9c3; color: #854d0e; }
    .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0; }
    .stat { background: #f9f9f7; border-radius: 8px; padding: 14px; }
    .stat-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .stat-value { font-size: 22px; font-weight: 700; color: #1a1a1a; }
    .stat-value.green { color: #16a34a; }
    .stat-value.red { color: #dc2626; }
    .stat-value.yellow { color: #d97706; }
    .footer { margin-top: 24px; font-size: 12px; color: #aaa; text-align: center; }
    .cta { display: block; text-align: center; background: #1e1e1e; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin: 24px 0 0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="brand">Ivalora Gadget RMS</div>
      <h1>📋 Stok Opname Selesai</h1>
      <p style="color:#555; margin: 8px 0 0; font-size:14px;">
        <strong>${adminName}</strong> telah menyelesaikan sesi <strong>${sessionTypeLabel}</strong>.
      </p>
    </div>

    <div class="stat-grid">
      <div class="stat">
        <div class="stat-label">Expected</div>
        <div class="stat-value">${session.total_expected ?? 0}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Discan</div>
        <div class="stat-value">${session.total_scanned ?? 0}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Match</div>
        <div class="stat-value green">${session.total_match ?? 0}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Missing</div>
        <div class="stat-value ${(session.total_missing ?? 0) > 0 ? "red" : ""}">${session.total_missing ?? 0}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Unregistered</div>
        <div class="stat-value ${(session.total_unregistered ?? 0) > 0 ? "yellow" : ""}">${session.total_unregistered ?? 0}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Selisih Total</div>
        <div class="stat-value ${selisih > 0 ? "red" : "green"}">${selisih}</div>
      </div>
    </div>

    <p style="font-size:13px; color:#555; margin: 0;">
      <strong>Diselesaikan:</strong> ${completedAt}<br/>
      ${session.notes ? `<strong>Catatan:</strong> ${session.notes}` : ""}
    </p>

    <div class="footer">
      Notifikasi otomatis dari Ivalora Gadget RMS
    </div>
  </div>
</body>
</html>
    `.trim();

    // Send email to each super admin via Gmail SMTP
    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!gmailUser || !gmailPassword) {
      throw new Error("GMAIL_USER or GMAIL_APP_PASSWORD not configured");
    }

    const sendResults: string[] = [];

    for (const admin of superAdminProfiles) {
      if (!admin.email) continue;

      const emailPayload = {
        personalizations: [
          {
            to: [{ email: admin.email, name: admin.full_name || "Super Admin" }],
          },
        ],
        from: { email: gmailUser, name: "Ivalora Gadget RMS" },
        subject: `[Stok Opname] Sesi ${sessionTypeLabel} Selesai — ${completedAt}`,
        content: [{ type: "text/html", value: htmlBody }],
      };

      // Use nodemailer-style SMTP via fetch to our own SMTP relay edge approach
      // Since we have GMAIL credentials, send via Gmail SMTP API (OAuth not needed for app passwords)
      // We'll use the smtp2go or similar approach; since we have Gmail App Password,
      // we simulate an SMTP call via a fetch to Gmail's SMTP endpoint is not directly possible from Deno.
      // Instead we use the existing pattern in this codebase (check other edge functions for SMTP approach).

      // Use SMTP via the Deno smtp library
      const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");
      
      const client = new SMTPClient({
        connection: {
          hostname: "smtp.gmail.com",
          port: 465,
          tls: true,
          auth: {
            username: gmailUser,
            password: gmailPassword,
          },
        },
      });

      try {
        await client.send({
          from: `Ivalora Gadget RMS <${gmailUser}>`,
          to: admin.email,
          subject: `[Stok Opname] Sesi ${sessionTypeLabel} Selesai — ${completedAt}`,
          html: htmlBody,
        });
        await client.close();
        sendResults.push(`✓ ${admin.email}`);
      } catch (emailErr) {
        console.error(`Failed to send to ${admin.email}:`, emailErr);
        sendResults.push(`✗ ${admin.email}: ${emailErr}`);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, sent: sendResults }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("opname-notify error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
