import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface Props {
  channelId: string;
  canPost: boolean;
  currentUserId: string;
  profiles: Profile[];
}

export function MessageInput({ channelId, canPost, currentUserId, profiles }: Props) {
  const [content, setContent] = useState("");
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const filteredProfiles = mentionQuery
    ? profiles.filter((p) => p.id !== currentUserId && p.full_name?.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 8)
    : [];

  const handleChange = (value: string) => {
    setContent(value);
    // Detect @mention
    const atMatch = value.match(/@(\w*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setShowMentions(true);
    } else {
      setShowMentions(false);
      setMentionQuery("");
    }
  };

  const insertMention = (profile: Profile) => {
    const name = profile.full_name || "Unknown";
    const newContent = content.replace(/@\w*$/, `@${name} `);
    setContent(newContent);
    setShowMentions(false);
    setMentionQuery("");
    inputRef.current?.focus();
  };

  const resolveMentionedIds = useCallback(() => {
    const mentioned: string[] = [];
    profiles.forEach((p) => {
      if (p.full_name && content.includes(`@${p.full_name}`)) {
        mentioned.push(p.id);
      }
    });
    return mentioned;
  }, [content, profiles]);

  const send = async () => {
    const trimmed = content.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      const mentionedIds = resolveMentionedIds();

      const { data: msg, error } = await (supabase as any)
        .from("messages")
        .insert({
          channel_id: channelId,
          user_id: currentUserId,
          content: trimmed,
          mentioned_user_ids: mentionedIds,
        })
        .select()
        .single();

      if (error) throw error;

      // Create notifications for mentioned users
      if (mentionedIds.length > 0 && msg) {
        const notifications = mentionedIds.map((uid: string) => ({
          user_id: uid,
          from_user_id: currentUserId,
          channel_id: channelId,
          message_id: msg.id,
          message_preview: trimmed.substring(0, 100),
        }));
        await (supabase as any).from("notifications").insert(notifications);
      }

      setContent("");
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  if (!canPost) {
    return (
      <div className="border-t px-4 py-3">
        <p className="text-sm text-muted-foreground text-center">This channel is read-only</p>
      </div>
    );
  }

  return (
    <div className="relative border-t px-4 py-3">
      {/* Mention autocomplete */}
      {showMentions && filteredProfiles.length > 0 && (
        <div className="absolute bottom-full left-4 right-4 mb-1 rounded-lg border bg-popover shadow-lg max-h-48 overflow-y-auto z-10">
          {filteredProfiles.map((p) => (
            <button
              key={p.id}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
              onClick={() => insertMention(p)}
            >
              <span className="font-medium">{p.full_name || "Unknown"}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={content}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (@ to mention)"
          className="flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[40px] max-h-[120px]"
          rows={1}
        />
        <Button size="icon" onClick={send} disabled={!content.trim() || sending} className="shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
