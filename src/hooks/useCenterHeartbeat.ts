import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Stamps a lightweight "staff was active" heartbeat for a repair centre.
 * Used by admin monitoring and by the offline-nudge sweep so we never SMS a
 * centre that already has someone online.
 */
export const useCenterHeartbeat = (repairCenterId?: number | null, context = "dashboard") => {
  useEffect(() => {
    if (!repairCenterId) return;

    let cancelled = false;
    const ping = async () => {
      if (cancelled || document.visibilityState === "hidden") return;
      try {
        await supabase.rpc("touch_center_activity", {
          _center_id: repairCenterId,
          _context: context,
        });
      } catch {
        // non-critical
      }
    };

    ping();
    const interval = setInterval(ping, 2 * 60 * 1000);
    document.addEventListener("visibilitychange", ping);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", ping);
    };
  }, [repairCenterId, context]);
};
