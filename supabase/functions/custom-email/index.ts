import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Ivalora logo as inline base64 or use public URL
const APP_URL = "https://ivalora.lovable.app";
const LOGO_URL = `${APP_URL}/favicon.ico`;
const BRAND_NAME = "Ivalora Gadget RMS";
const BRAND_SUBTITLE = "Retail Management System";
const FOOTER_CREDIT = "© 2026 Tim IT Ivalora Gadget · Ivalora Gadget RMS";
const FOOTER_NOTE = "Email ini dikirim otomatis, jangan balas email ini.";

function baseEmailTemplate(title: string, preheader: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f5f6fa;font-family:'Segoe UI',Arial,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <!-- Preheader text (hidden) -->
  <div style="display:none;font-size:1px;color:#f5f6fa;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</div>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f6fa;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

          <!-- Logo area above card -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:#1e1e1e;border-radius:12px;padding:12px 20px;">
                    <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.5px;">${BRAND_NAME}</p>
                    <p style="margin:3px 0 0;color:#888888;font-size:11px;letter-spacing:0.5px;text-transform:uppercase;">${BRAND_SUBTITLE}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main card -->
          <tr>
            <td style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

              <!-- Card header bar -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:linear-gradient(135deg,#1e1e1e 0%,#2d2d2d 100%);padding:32px 40px 28px;">
                    <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">${title}</h1>
                  </td>
                </tr>
              </table>

              <!-- Card body -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:32px 40px;">
                    ${bodyContent}
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:11px;color:#aaaaaa;">${FOOTER_CREDIT}</p>
              <p style="margin:4px 0 0;font-size:11px;color:#aaaaaa;">${FOOTER_NOTE}</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buttonHtml(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#1e1e1e;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;font-size:14px;font-weight:600;letter-spacing:0.2px;margin-top:8px;">${label} →</a>`;
}

function warningBox(content: string): string {
  return `<div style="background:#fff8ed;border:1px solid #f5c518;border-radius:12px;padding:16px 20px;margin:20px 0;">
    <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">${content}</p>
  </div>`;
}

function infoText(content: string): string {
  return `<p style="font-size:14px;color:#555555;line-height:1.7;margin:0 0 20px;">${content}</p>`;
}

// ── Template builders ──────────────────────────────────────────────────

function buildConfirmSignupEmail(name: string, confirmUrl: string): string {
  const firstName = name || "Pengguna";
  const body = `
    ${infoText(`Halo, <strong>${firstName}</strong> 👋`)}
    ${infoText("Terima kasih telah mendaftarkan akun di <strong>Ivalora Gadget RMS</strong>. Klik tombol di bawah untuk mengonfirmasi alamat email Anda dan mengaktifkan akun.")}
    ${buttonHtml(confirmUrl, "Konfirmasi Email")}
    ${warningBox("Link konfirmasi ini berlaku selama <strong>24 jam</strong>. Jika Anda tidak mendaftar di Ivalora Gadget RMS, abaikan email ini.")}
    ${infoText("Jika tombol di atas tidak berfungsi, salin dan tempel URL berikut ke browser Anda:")}
    <p style="font-size:12px;color:#888;word-break:break-all;margin:0;">${confirmUrl}</p>
  `;
  return baseEmailTemplate("Konfirmasi Alamat Email Anda", "Konfirmasi email untuk mengaktifkan akun Ivalora Gadget RMS Anda.", body);
}

function buildResetPasswordEmail(name: string, resetUrl: string): string {
  const firstName = name || "Pengguna";
  const body = `
    ${infoText(`Halo, <strong>${firstName}</strong> 👋`)}
    ${infoText("Kami menerima permintaan untuk mereset kata sandi akun <strong>Ivalora Gadget RMS</strong> Anda. Klik tombol di bawah untuk membuat kata sandi baru.")}
    ${buttonHtml(resetUrl, "Reset Kata Sandi")}
    ${warningBox("Link ini berlaku selama <strong>1 jam</strong> dan hanya dapat digunakan sekali. Jika Anda tidak meminta reset kata sandi, abaikan email ini — akun Anda tetap aman.")}
    ${infoText("Jika tombol di atas tidak berfungsi, salin dan tempel URL berikut ke browser Anda:")}
    <p style="font-size:12px;color:#888;word-break:break-all;margin:0;">${resetUrl}</p>
  `;
  return baseEmailTemplate("Reset Kata Sandi", "Link reset kata sandi Ivalora Gadget RMS Anda.", body);
}

function buildMagicLinkEmail(name: string, magicUrl: string): string {
  const firstName = name || "Pengguna";
  const body = `
    ${infoText(`Halo, <strong>${firstName}</strong> 👋`)}
    ${infoText("Berikut adalah link masuk tanpa kata sandi untuk akun <strong>Ivalora Gadget RMS</strong> Anda. Klik tombol di bawah untuk langsung masuk.")}
    ${buttonHtml(magicUrl, "Masuk Sekarang")}
    ${warningBox("Link ini berlaku selama <strong>1 jam</strong> dan hanya dapat digunakan sekali. Jika Anda tidak meminta link ini, abaikan email ini.")}
    ${infoText("Jika tombol di atas tidak berfungsi, salin dan tempel URL berikut ke browser Anda:")}
    <p style="font-size:12px;color:#888;word-break:break-all;margin:0;">${magicUrl}</p>
  `;
  return baseEmailTemplate("Link Masuk ke Ivalora RMS", "Link masuk tanpa kata sandi Ivalora Gadget RMS.", body);
}

function buildEmailChangeEmail(name: string, confirmUrl: string, newEmail: string): string {
  const firstName = name || "Pengguna";
  const body = `
    ${infoText(`Halo, <strong>${firstName}</strong> 👋`)}
    ${infoText(`Kami menerima permintaan untuk mengubah alamat email akun <strong>Ivalora Gadget RMS</strong> Anda menjadi <strong>${newEmail}</strong>. Klik tombol di bawah untuk mengonfirmasi perubahan ini.`)}
    ${buttonHtml(confirmUrl, "Konfirmasi Perubahan Email")}
    ${warningBox("Jika Anda tidak meminta perubahan email ini, segera hubungi administrator sistem Anda karena akun Anda mungkin dalam bahaya.")}
    ${infoText("Jika tombol di atas tidak berfungsi, salin dan tempel URL berikut ke browser Anda:")}
    <p style="font-size:12px;color:#888;word-break:break-all;margin:0;">${confirmUrl}</p>
  `;
  return baseEmailTemplate("Konfirmasi Perubahan Email", "Konfirmasi perubahan email akun Ivalora Gadget RMS Anda.", body);
}

function buildInviteEmail(name: string, inviteUrl: string): string {
  const firstName = name || "Tim";
  const body = `
    ${infoText(`Halo, <strong>${firstName}</strong> 👋`)}
    ${infoText("Anda telah diundang untuk bergabung dengan <strong>Ivalora Gadget RMS</strong> — sistem manajemen retail Ivalora Gadget. Klik tombol di bawah untuk menerima undangan dan membuat kata sandi akun Anda.")}
    ${buttonHtml(inviteUrl, "Terima Undangan")}
    ${warningBox("Link undangan ini berlaku selama <strong>24 jam</strong>. Jika Anda tidak merasa diundang, abaikan email ini.")}
    ${infoText("Jika tombol di atas tidak berfungsi, salin dan tempel URL berikut ke browser Anda:")}
    <p style="font-size:12px;color:#888;word-break:break-all;margin:0;">${inviteUrl}</p>
  `;
  return baseEmailTemplate("Undangan ke Ivalora Gadget RMS", "Anda diundang untuk bergabung dengan tim Ivalora Gadget RMS.", body);
}

// ── Main handler ──────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log("custom-email hook payload:", JSON.stringify(payload));

    const { user, email_data } = payload;

    const toEmail: string = user?.email ?? email_data?.email ?? "";
    const name: string = user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "";
    const emailType: string = email_data?.email_action_type ?? "";
    const token: string = email_data?.token ?? "";
    const tokenHash: string = email_data?.token_hash ?? "";
    const redirectTo: string = email_data?.redirect_to ?? APP_URL;
    const newEmail: string = email_data?.new_email ?? "";

    if (!toEmail) {
      console.error("No recipient email");
      return new Response(JSON.stringify({ error: "No recipient email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build confirmation/action URL
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    function buildActionUrl(type: string): string {
      const base = `${supabaseUrl}/auth/v1/verify`;
      const params = new URLSearchParams({ token_hash: tokenHash, type, redirect_to: redirectTo });
      return `${base}?${params.toString()}`;
    }

    let subject = "";
    let htmlBody = "";

    switch (emailType) {
      case "signup":
      case "email":
      case "confirm_signup": {
        const url = buildActionUrl("email");
        subject = "Konfirmasi Email — Ivalora Gadget RMS";
        htmlBody = buildConfirmSignupEmail(name, url);
        break;
      }
      case "recovery":
      case "reset_password": {
        // Use the redirect_to URL from email_data which should be our /reset-password page
        const resetUrl = redirectTo && redirectTo.includes("reset-password")
          ? `${redirectTo}${redirectTo.includes("?") ? "&" : "?"}token_hash=${tokenHash}&type=recovery`
          : buildActionUrl("recovery");
        subject = "Reset Kata Sandi — Ivalora Gadget RMS";
        htmlBody = buildResetPasswordEmail(name, resetUrl);
        break;
      }
      case "magiclink": {
        const url = buildActionUrl("magiclink");
        subject = "Link Masuk — Ivalora Gadget RMS";
        htmlBody = buildMagicLinkEmail(name, url);
        break;
      }
      case "email_change": {
        const url = buildActionUrl("email_change");
        subject = "Konfirmasi Perubahan Email — Ivalora Gadget RMS";
        htmlBody = buildEmailChangeEmail(name, url, newEmail);
        break;
      }
      case "invite": {
        const url = buildActionUrl("invite");
        subject = "Undangan ke Ivalora Gadget RMS";
        htmlBody = buildInviteEmail(name, url);
        break;
      }
      default: {
        console.warn("Unknown email action type:", emailType, "— falling back to generic");
        subject = "Notifikasi Akun — Ivalora Gadget RMS";
        htmlBody = buildConfirmSignupEmail(name, buildActionUrl("email"));
        break;
      }
    }

    // Send via Gmail SMTP
    const GMAIL_USER = Deno.env.get("GMAIL_USER");
    const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      console.error("GMAIL credentials not configured");
      return new Response(JSON.stringify({ error: "SMTP not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");

    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: { username: GMAIL_USER, password: GMAIL_APP_PASSWORD },
      },
    });

    await client.send({
      from: `Tim IT Ivalora Gadget <${GMAIL_USER}>`,
      to: toEmail,
      subject,
      html: htmlBody,
    });

    await client.close();

    console.log(`Email [${emailType}] sent to ${toEmail}`);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("custom-email error:", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
