import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
}

interface Props {
  messageId: string;
  reactions: Reaction[];
  currentUserId: string;
  profileMap: Record<string, { full_name: string | null }>;
}

export function MessageReactions({ messageId, reactions, currentUserId, profileMap }: Props) {
  if (reactions.length === 0) return null;

  // Group by emoji
  const grouped: Record<string, Reaction[]> = {};
  reactions.forEach((r) => {
    if (!grouped[r.emoji]) grouped[r.emoji] = [];
    grouped[r.emoji].push(r);
  });

  const toggleReaction = async (emoji: string) => {
    const existing = reactions.find((r) => r.emoji === emoji && r.user_id === currentUserId);
    if (existing) {
      await (supabase as any).from("message_reactions").delete().eq("id", existing.id);
    } else {
      await (supabase as any).from("message_reactions").insert({
        message_id: messageId,
        user_id: currentUserId,
        emoji,
      });
    }
  };

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {Object.entries(grouped).map(([emoji, reacts]) => {
        const hasOwn = reacts.some((r) => r.user_id === currentUserId);
        const names = reacts
          .map((r) => profileMap[r.user_id]?.full_name || "Unknown")
          .join(", ");

        return (
          <button
            key={emoji}
            onClick={() => toggleReaction(emoji)}
            title={names}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors hover:bg-accent",
              hasOwn && "bg-primary/10 border-primary/30"
            )}
          >
            <span>{emoji}</span>
            <span className="text-muted-foreground">{reacts.length}</span>
          </button>
        );
      })}
    </div>
  );
}
