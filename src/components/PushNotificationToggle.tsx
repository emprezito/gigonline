import { useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useToast } from "@/hooks/use-toast";

export const PushNotificationToggle = () => {
  const { permission, subscribed, subscribe, unsubscribe, supported } = usePushNotifications();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  if (!supported) return null;

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (subscribed) {
        await unsubscribe();
        toast({ title: "Push notifications disabled" });
      } else {
        const success = await subscribe();
        if (success) {
          toast({ title: "Push notifications enabled!", description: "You'll now receive real-time alerts." });
        } else if (permission === "denied") {
          toast({ title: "Notifications blocked", description: "Please enable notifications in your browser settings.", variant: "destructive" });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      disabled={loading}
      title={subscribed ? "Disable notifications" : "Enable notifications"}
    >
      {subscribed ? <BellRing className="h-5 w-5 text-primary" /> : <Bell className="h-5 w-5" />}
    </Button>
  );
};
