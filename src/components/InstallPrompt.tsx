import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Download, Share } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "ghostpen_install_dismissed";
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || (navigator as any).standalone === true;
    setIsStandalone(standalone);
    if (standalone) return;

    // Don't show inside iframes (e.g. Lovable editor preview)
    try {
      if (window.self !== window.top) return;
    } catch {
      return;
    }

    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed && Date.now() - Number(dismissed) < DISMISS_DURATION) return;

    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const android = /Android/.test(ua);
    setIsIOS(ios);
    setIsAndroid(android);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // iOS / fallback (Android browsers that didn't fire the event yet) — show manual instructions after a delay
    const fallbackTimer = setTimeout(() => {
      if (ios || android) setShowPrompt(true);
    }, 3000);

    // Hide if app gets installed
    const installedHandler = () => setShowPrompt(false);
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
      clearTimeout(fallbackTimer);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setShowPrompt(false);
    } catch (err) {
      console.error("Install prompt error:", err);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 80 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 80 }}
        transition={{ type: "spring", damping: 25 }}
        className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm rounded-xl border bg-card p-4 shadow-lg sm:left-auto sm:right-6 sm:bottom-6"
      >
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 rounded-full p-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            {isIOS ? (
              <Share className="h-5 w-5 text-primary" />
            ) : (
              <Download className="h-5 w-5 text-primary" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Install GhostPen</p>
            {isIOS ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Tap <Share className="inline h-3 w-3" /> then <strong>"Add to Home Screen"</strong> to install.
              </p>
            ) : deferredPrompt ? (
              <>
                <p className="mt-1 text-xs text-muted-foreground">
                  Get quick access from your home screen.
                </p>
                <Button size="sm" className="mt-2 h-8 text-xs" onClick={handleInstall}>
                  Install App
                </Button>
              </>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                Open your browser menu and tap <strong>"Install app"</strong> or <strong>"Add to Home Screen"</strong>.
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
