import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Send, ImagePlus, X, Reply } from "lucide-react";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface ReplyTarget {
  id: string;
  content: string;
  user_name: string;
}

interface Props {
  channelId: string;
  canPost: boolean;
  currentUserId: string;
  profiles: Profile[];
  replyTo: ReplyTarget | null;
  onCancelReply: () => void;
}

export function MessageInput({ channelId, canPost, currentUserId, profiles, replyTo, onCancelReply }: Props) {
  const [content, setContent] = useState("");
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [sending, setSending] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const filteredProfiles = mentionQuery
    ? profiles.filter((p) => p.id !== currentUserId && p.full_name?.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 8)
    : [];

  const handleChange = (value: string) => {
    setContent(value);
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

  const handleFileSelect = (file: File) => {
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) return;
    if (file.size > 10 * 1024 * 1024) return; // 10MB limit
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  const clearMedia = () => {
    setMediaFile(null);
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaPreview(null);
  };

  const send = async () => {
    const trimmed = content.trim();
    if ((!trimmed && !mediaFile) || sending) return;

    setSending(true);
    try {
      let mediaUrl: string | null = null;
      let mediaType: string | null = null;

      // Upload media if present
      if (mediaFile) {
        setUploading(true);
        const ext = mediaFile.name.split(".").pop();
        const path = `${currentUserId}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("community-media").upload(path, mediaFile);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from("community-media").getPublicUrl(path);
        mediaUrl = urlData.publicUrl;
        mediaType = mediaFile.type.startsWith("image/") ? "image" : "video";
        setUploading(false);
      }

      const mentionedIds = resolveMentionedIds();

      const insertData: any = {
        channel_id: channelId,
        user_id: currentUserId,
        content: trimmed || "",
        mentioned_user_ids: mentionedIds,
      };
      if (mediaUrl) insertData.media_url = mediaUrl;
      if (mediaType) insertData.media_type = mediaType;
      if (replyTo) insertData.reply_to_id = replyTo.id;

      const { data: msg, error } = await (supabase as any)
        .from("messages")
        .insert(insertData)
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
          message_preview: (trimmed || "[media]").substring(0, 100),
        }));
        await (supabase as any).from("notifications").insert(notifications);
      }

      setContent("");
      clearMedia();
      onCancelReply();
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
      setUploading(false);
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
    <div className="relative border-t px-4 py-3 space-y-2">
      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 rounded-md bg-accent/50 px-3 py-1.5 text-sm">
          <Reply className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground">Replying to</span>
          <span className="font-semibold truncate">{replyTo.user_name}</span>
          <span className="text-muted-foreground truncate flex-1">"{replyTo.content.substring(0, 50)}"</span>
          <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={onCancelReply}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Media preview */}
      {mediaPreview && mediaFile && (
        <div className="relative inline-block">
          {mediaFile.type.startsWith("image/") ? (
            <img src={mediaPreview} alt="Preview" className="h-20 rounded-md border object-cover" />
          ) : (
            <video src={mediaPreview} className="h-20 rounded-md border" />
          )}
          <button onClick={clearMedia} className="absolute -top-1 -right-1 rounded-full bg-destructive p-0.5 text-destructive-foreground">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

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
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          <ImagePlus className="h-4 w-4" />
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFileSelect(f);
            e.target.value = "";
          }}
        />
        <textarea
          ref={inputRef}
          value={content}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (@ to mention)"
          className="flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[40px] max-h-[120px]"
          rows={1}
        />
        <Button size="icon" onClick={send} disabled={(!content.trim() && !mediaFile) || sending} className="shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
