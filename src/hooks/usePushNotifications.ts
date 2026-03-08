import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (!user || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
    checkExistingSubscription();
  }, [user]);

  const checkExistingSubscription = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
    } catch {
      // ignore
    }
  };

  const subscribe = async () => {
    if (!user) return false;

    try {
      // Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return false;

      // Register service worker
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // Get VAPID public key
      const { data: vapidData } = await supabase.functions.invoke("send-push", {
        method: "GET",
      });

      if (!vapidData?.publicKey) {
        console.error("Could not get VAPID public key");
        return false;
      }

      // Subscribe
      const applicationServerKey = urlBase64ToUint8Array(vapidData.publicKey);
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });

      const subJson = sub.toJSON();

      // Save to database
      await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: subJson.endpoint!,
          p256dh: subJson.keys!.p256dh!,
          auth: subJson.keys!.auth!,
        },
        { onConflict: "user_id,endpoint" }
      );

      setSubscribed(true);
      return true;
    } catch (err) {
      console.error("Push subscription error:", err);
      return false;
    }
  };

  const unsubscribe = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("user_id", user!.id)
          .eq("endpoint", sub.endpoint);
      }
      setSubscribed(false);
    } catch (err) {
      console.error("Unsubscribe error:", err);
    }
  };

  return { permission, subscribed, subscribe, unsubscribe, supported: "PushManager" in window };
}
