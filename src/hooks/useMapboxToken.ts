import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

let cachedToken: string | null = null;
let inflight: Promise<string | null> | null = null;

async function fetchToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  if (!inflight) {
    inflight = supabase.functions
      .invoke("get-mapbox-token")
      .then(({ data }) => {
        cachedToken = (data as { token?: string })?.token ?? null;
        return cachedToken;
      })
      .catch(() => null)
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** Shared Mapbox public token, fetched once per session from the edge function. */
export function useMapboxToken() {
  const [token, setToken] = useState<string | null>(cachedToken);
  const [isLoading, setIsLoading] = useState(!cachedToken);

  useEffect(() => {
    if (cachedToken) return;
    let active = true;
    fetchToken().then((t) => {
      if (!active) return;
      setToken(t);
      setIsLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return { token, isLoading };
}
