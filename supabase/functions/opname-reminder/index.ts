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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { session_id, session_type, target_time } = await req.json();

    if (!session_id || !session_type) {
      return new Response(JSON.stringify({ ok: false, error: "Missing params" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch assigned admins for this session
    const { data: assignments } = await supabase
      .from("opname_session_assignments")
      .select("admin_id")
      .eq("session_id", session_id);

    const adminIds: string[] = (assignments ?? []).map((a: { admin_id: string }) => a.admin_id);

    if (adminIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, message: "No assigned admins" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sessionLabel = session_type === "opening" ? "Opening (Jam Buka)" : "Closing (Jam Tutup)";
    const title = `⏰ Pengingat Opname ${sessionLabel}`;
    const body = `Sesi ${sessionLabel} akan dimulai dalam 15 menit (${target_time}). Harap bersiap untuk melakukan scan IMEI.`;

    // Insert in-app notification for each admin
    const notifRows = adminIds.map((uid) => ({
      user_id: uid,
      type: "opname_reminder",
      title,
      body,
      link: "/stok-opname",
    }));

    await supabase.from("notifications").insert(notifRows);

    // Also send email via Gmail SMTP
    const GMAIL_USER = Deno.env.get("GMAIL_USER");
    const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD");

    let emailsSent = 0;
    if (GMAIL_USER && GMAIL_APP_PASSWORD && adminIds.length > 0) {
      // Fetch admin emails
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("id, email, full_name")
        .in("id", adminIds);

      const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");

      for (const profile of profiles ?? []) {
        try {
          const client = new SMTPClient({
            connection: {
              hostname: "smtp.gmail.com",
              port: 465,
              tls: true,
              auth: { username: GMAIL_USER, password: GMAIL_APP_PASSWORD },
            },
          });

          const firstName = (profile.full_name ?? profile.email ?? "Admin").split(" ")[0];

          await client.send({
            from: `Tim IT Ivalora Gadget <${GMAIL_USER}>`,
            to: profile.email,
            subject: title,
            html: `
<!DOCTYPE html>
<html lang="id">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f6fa;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6fa;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:#1e1e1e;padding:24px 32px;text-align:center;">
            <p style="color:#ffffff;font-size:20px;font-weight:700;margin:0;letter-spacing:-0.5px;">Ivalora Gadget RMS</p>
            <p style="color:#aaaaaa;font-size:12px;margin:4px 0 0;">Retail Management System</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="font-size:14px;color:#666;margin:0 0 8px;">Halo, <strong>${firstName}</strong> 👋</p>
            <h2 style="font-size:20px;color:#1e1e1e;margin:0 0 16px;font-weight:700;">⏰ Pengingat Sesi Opname</h2>
            <div style="background:#fff8ed;border:1px solid #f5c842;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
              <p style="margin:0;font-size:14px;color:#92400e;font-weight:600;">Sesi ${sessionLabel}</p>
              <p style="margin:8px 0 0;font-size:13px;color:#92400e;">Dimulai dalam <strong>15 menit</strong> pada pukul <strong>${target_time} WIB</strong></p>
            </div>
            <p style="font-size:13px;color:#555;line-height:1.6;margin:0 0 20px;">
              Harap bersiap untuk melakukan scan IMEI pada sistem. Pastikan kamu sudah login ke aplikasi dan siap memulai sesi tepat waktu.
            </p>
            <a href="${Deno.env.get("SUPABASE_URL")?.replace("https://", "https://ivalora.lovable.app") ?? "https://ivalora.lovable.app"}/stok-opname"
               style="display:inline-block;background:#1e1e1e;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:13px;font-weight:600;">
              Buka Stok Opname →
            </a>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #eee;text-align:center;">
            <p style="font-size:11px;color:#aaa;margin:0;">© 2026 Tim IT Ivalora Gadget · Ivalora Gadget RMS</p>
            <p style="font-size:11px;color:#aaa;margin:4px 0 0;">Email ini dikirim otomatis, jangan balas email ini.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
          });

          await client.close();
          emailsSent++;
        } catch (emailErr) {
          console.error(`Failed to send email to ${profile.email}:`, emailErr);
        }
      }
    }

    return new Response(
      JSON.stringify({ ok: true, notif_sent: notifRows.length, email_sent: emailsSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("opname-reminder error:", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
