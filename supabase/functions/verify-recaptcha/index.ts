import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MIN_SCORE = 0.5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, action } = await req.json();

    if (!token) {
      return new Response(JSON.stringify({ error: "reCAPTCHA token required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const secretKey = Deno.env.get("RECAPTCHA_SECRET_KEY");
    if (!secretKey) {
      return new Response(JSON.stringify({ error: "reCAPTCHA not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify with Google
    const verifyRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${secretKey}&response=${token}`,
    });

    const result = await verifyRes.json();

    if (!result.success) {
      const errorCodes: string[] = result["error-codes"] ?? [];
      // "browser-error" means the domain isn't whitelisted in the reCAPTCHA console
      // (common in preview/dev environments). Return 200 so the client treats it as
      // a soft failure rather than an HTTP error.
      const isBrowserError = errorCodes.includes("browser-error");
      return new Response(
        JSON.stringify({ success: false, error: "reCAPTCHA verification failed", details: errorCodes }),
        {
          status: isBrowserError ? 200 : 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (result.score < MIN_SCORE) {
      return new Response(JSON.stringify({ success: false, error: "Score too low — possible bot", score: result.score }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Optional: action validation
    if (action && result.action !== action) {
      return new Response(JSON.stringify({ success: false, error: "Action mismatch" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, score: result.score }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
