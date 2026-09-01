import { useCallback, useEffect, useState } from "react";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { playChime } from "@/lib/chime";
import { toast } from "sonner";

const appId = import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_APP_ID as string | undefined;
const vapidKey = import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_VAPID_KEY as string | undefined;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_WEB_API_KEY as string | undefined,
  projectId: import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_PROJECT_ID as string | undefined,
  appId,
  messagingSenderId: appId?.split(":")[1] ?? "",
};

export type PushStatus =
  | "loading"
  | "not-configured"
  | "unsupported"
  | "open-in-new-tab"
  | "denied"
  | "off"
  | "on";

const isConfigured = () =>
  !!firebaseConfig.apiKey && !!firebaseConfig.projectId && !!appId && !!vapidKey && !!firebaseConfig.messagingSenderId;

const getFirebaseApp = () =>
  getApps().length ? getApp() : initializeApp(firebaseConfig as Record<string, string>);

/** Manages the browser's FCM registration token and its row in push_subscriptions. */
export const usePushNotifications = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<PushStatus>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;

    const resolve = async () => {
      if (!isConfigured()) return setStatus("not-configured");
      if (typeof window === "undefined" || !("Notification" in window)) return setStatus("unsupported");
      if (!(await isSupported())) return setStatus("unsupported");
      if (window.top !== window.self) return setStatus("open-in-new-tab");
      if (Notification.permission === "denied") return setStatus("denied");
      if (Notification.permission !== "granted") return setStatus("off");

      if (!user) return setStatus("off");
      const { data } = await supabase
        .from("push_subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);
      if (!active) return;
      setStatus(data?.length ? "on" : "off");
    };

    resolve().catch(() => active && setStatus("unsupported"));
    return () => {
      active = false;
    };
  }, [user]);

  // Foreground messages: browsers suppress the OS notification, so surface a toast.
  useEffect(() => {
    if (status !== "on" || !isConfigured()) return;
    let unsubscribe: (() => void) | undefined;
    (async () => {
      if (!(await isSupported())) return;
      const messaging = getMessaging(getFirebaseApp());
      unsubscribe = onMessage(messaging, (payload) => {
        playChime();
        toast(payload.notification?.title ?? "Fixbudi", {
          description: payload.notification?.body,
        });
      });
    })().catch(() => undefined);
    return () => unsubscribe?.();
  }, [status]);

  const enable = useCallback(async () => {
    if (!user) {
      toast.error("Sign in first to turn on notifications.");
      return;
    }
    if (!isConfigured()) return setStatus("not-configured");
    if (!("Notification" in window) || !(await isSupported())) return setStatus("unsupported");
    if (window.top !== window.self) return setStatus("open-in-new-tab");

    setBusy(true);
    try {
      const permission =
        Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }

      const query = new URLSearchParams(
        Object.entries(firebaseConfig).filter(([, v]) => !!v) as [string, string][],
      ).toString();
      const registration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${query}`);
      const messaging = getMessaging(getFirebaseApp());
      const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });

      if (!token) {
        setStatus("denied");
        return;
      }

      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          token,
          platform: "web",
          device_label: navigator.userAgent.slice(0, 120),
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "token" },
      );
      if (error) throw error;

      setStatus("on");
      toast.success("Push notifications enabled");
    } catch (e) {
      console.error("Push enable failed:", e);
      toast.error("Could not enable push notifications. Please try again.");
    } finally {
      setBusy(false);
    }
  }, [user]);

  const disable = useCallback(async () => {
    if (!user) return;
    setBusy(true);
    try {
      await supabase.from("push_subscriptions").delete().eq("user_id", user.id);
      setStatus("off");
      toast.success("Push notifications turned off on this device");
    } finally {
      setBusy(false);
    }
  }, [user]);

  const sendTest = useCallback(async () => {
    setBusy(true);
    try {
      const { error } = await supabase.functions.invoke("send-push", { body: {} });
      if (error) throw error;
      toast.success("Test notification sent");
    } catch (e) {
      console.error("Test push failed:", e);
      toast.error("Could not send the test notification.");
    } finally {
      setBusy(false);
    }
  }, []);

  return { status, busy, enable, disable, sendTest };
};
