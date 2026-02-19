import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface LogActivityParams {
  action: string;
  actor_id?: string | null;
  actor_email?: string | null;
  actor_role?: string | null;
  target_id?: string | null;
  target_email?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Fire-and-forget activity logger.
 * Never throws — failures are silently swallowed so they don't block UI.
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    await db.from("activity_logs").insert({
      action: params.action,
      actor_id: params.actor_id ?? null,
      actor_email: params.actor_email ?? null,
      actor_role: params.actor_role ?? null,
      target_id: params.target_id ?? null,
      target_email: params.target_email ?? null,
      metadata: params.metadata ?? null,
    });
  } catch {
    // Intentionally silenced
  }
}
