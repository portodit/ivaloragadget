const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const siteKey = Deno.env.get("RECAPTCHA_SITE_KEY");
  if (!siteKey) {
    return new Response(JSON.stringify({ error: "Not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ siteKey }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
