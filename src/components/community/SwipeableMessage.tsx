import { useRef, useState, ReactNode, TouchEvent } from "react";
import { Reply } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  onReply: () => void;
  isOwn: boolean;
}

const SWIPE_THRESHOLD = 60;
const MAX_SWIPE = 80;

/**
 * Wraps a message bubble to add WhatsApp/Messenger-style swipe-to-reply on touch devices.
 * Swipe right (for others' messages) or left (for own messages) to trigger reply.
 */
export function SwipeableMessage({ children, onReply, isOwn }: Props) {
  const [offset, setOffset] = useState(0);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const triggered = useRef(false);
  const isHorizontalSwipe = useRef<boolean | null>(null);

  const direction = isOwn ? -1 : 1; // own swipes left, others swipe right

  const handleTouchStart = (e: TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    triggered.current = false;
    isHorizontalSwipe.current = null;
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (startX.current === null || startY.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    // Lock direction on first significant move
    if (isHorizontalSwipe.current === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      isHorizontalSwipe.current = Math.abs(dx) > Math.abs(dy);
    }
    if (!isHorizontalSwipe.current) return;

    // Only allow swipe in the correct direction
    const swipe = direction === 1 ? Math.max(0, dx) : Math.min(0, dx);
    const clamped = Math.max(-MAX_SWIPE, Math.min(MAX_SWIPE, swipe));
    setOffset(clamped);

    if (Math.abs(clamped) >= SWIPE_THRESHOLD && !triggered.current) {
      triggered.current = true;
      // haptic feedback if available
      if (navigator.vibrate) navigator.vibrate(20);
    }
  };

  const handleTouchEnd = () => {
    if (triggered.current) {
      onReply();
    }
    setOffset(0);
    startX.current = null;
    startY.current = null;
    triggered.current = false;
    isHorizontalSwipe.current = null;
  };

  const showIcon = Math.abs(offset) > 10;
  const iconActive = Math.abs(offset) >= SWIPE_THRESHOLD;

  return (
    <div className="relative">
      {/* Reply icon revealed during swipe */}
      {showIcon && (
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 z-0 flex items-center justify-center rounded-full transition-all",
            iconActive ? "bg-primary text-primary-foreground scale-110" : "bg-muted text-muted-foreground",
            direction === 1 ? "left-2" : "right-2"
          )}
          style={{
            width: 32,
            height: 32,
            opacity: Math.min(1, Math.abs(offset) / SWIPE_THRESHOLD),
          }}
        >
          <Reply className="h-4 w-4" />
        </div>
      )}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${offset}px)`,
          transition: offset === 0 ? "transform 0.2s ease-out" : "none",
        }}
        className="relative z-10"
      >
        {children}
      </div>
    </div>
  );
}
