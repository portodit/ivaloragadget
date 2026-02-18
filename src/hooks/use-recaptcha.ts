import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    grecaptcha: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
    _recaptchaSiteKey?: string;
  }
}

let siteKeyPromise: Promise<string | null> | null = null;

async function fetchSiteKey(): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke("get-recaptcha-sitekey");
    if (error || !data?.siteKey) return null;
    return data.siteKey as string;
  } catch {
    return null;
  }
}

function getSiteKey(): Promise<string | null> {
  if (!siteKeyPromise) {
    siteKeyPromise = fetchSiteKey();
  }
  return siteKeyPromise;
}

export function useRecaptcha() {
  const scriptLoaded = useRef(false);

  const showBadge = useCallback(() => {
    const badge = document.querySelector(".grecaptcha-badge");
    if (badge) badge.classList.add("recaptcha-visible");
  }, []);

  const hideBadge = useCallback(() => {
    const badge = document.querySelector(".grecaptcha-badge");
    if (badge) badge.classList.remove("recaptcha-visible");
  }, []);

  const ensureScript = useCallback(async () => {
    if (scriptLoaded.current) return;
    const key = await getSiteKey();
    if (!key) return;
    window._recaptchaSiteKey = key;

    if (document.getElementById("recaptcha-script")) {
      scriptLoaded.current = true;
      showBadge();
      return;
    }

    await new Promise<void>((resolve) => {
      const script = document.createElement("script");
      script.id = "recaptcha-script";
      script.src = `https://www.google.com/recaptcha/api.js?render=${key}`;
      script.async = true;
      script.onload = () => {
        scriptLoaded.current = true;
        resolve();
      };
      script.onerror = () => resolve();
      document.head.appendChild(script);
    });
  }, [showBadge]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    // Load script then show badge — properly handle async + cleanup
    ensureScript()
      .then(() => {
        if (cancelled) return;
        showBadge();
        // Badge may need extra time to be injected by Google's script
        timer = setTimeout(() => {
          if (!cancelled) showBadge();
        }, 600);
      })
      .catch(() => {
        // Silently ignore reCAPTCHA errors
      });

    // Cleanup: cancel pending ops and hide badge on unmount (navigating to dashboard)
    return () => {
      cancelled = true;
      clearTimeout(timer);
      hideBadge();
    };
  }, [ensureScript, showBadge, hideBadge]);

  const getToken = useCallback(async (action: string): Promise<string | null> => {
    await ensureScript();
    const key = window._recaptchaSiteKey;
    if (!key || !window.grecaptcha) return null;

    return new Promise((resolve) => {
      window.grecaptcha.ready(async () => {
        try {
          const token = await window.grecaptcha.execute(key, { action });
          resolve(token);
        } catch {
          resolve(null);
        }
      });
    });
  }, [ensureScript]);

  const verifyToken = useCallback(async (token: string, action: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke("verify-recaptcha", {
        body: { token, action },
      });
      // "browser-error" is expected in preview/localhost — treat as soft failure
      if (error) {
        console.debug("[reCAPTCHA] Verification skipped (preview or domain mismatch):", error.message);
        return false;
      }
      return !!data?.success;
    } catch (e) {
      // Silently swallow — reCAPTCHA is informational only, never blocks login
      console.debug("[reCAPTCHA] Verification error (ignored):", e);
      return false;
    }
  }, []);

  return { getToken, verifyToken };
}
