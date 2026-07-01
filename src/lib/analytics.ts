import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
  }
}

const SESSION_KEY = "fixbudi_session_id";

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "anon-" + Math.random().toString(36).slice(2);
  }
}

async function getUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

/** Log an event to our own analytics table (fire-and-forget). */
export async function logEvent(
  eventName: string,
  metadata: Record<string, any> = {},
  path?: string
) {
  try {
    const user_id = await getUserId();
    await supabase.from("analytics_events").insert({
      session_id: getSessionId(),
      user_id,
      event_name: eventName,
      path: path ?? (typeof window !== "undefined" ? window.location.pathname : null),
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      metadata,
    });
  } catch (e) {
    // silent
  }
}

/** Track a page view in both Meta Pixel and our own store. */
export function trackPageView(path: string) {
  try {
    window.fbq?.("track", "PageView");
  } catch {}
  void logEvent("page_view", { path }, path);
}

/** Track a named feature/custom event in both Meta Pixel and our own store. */
export function trackEvent(
  eventName: string,
  metadata: Record<string, any> = {}
) {
  try {
    window.fbq?.("trackCustom", eventName, metadata);
  } catch {}
  void logEvent(eventName, metadata);
}
