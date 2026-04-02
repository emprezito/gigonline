import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Hash, Reply, Pencil, Check, X } from "lucide-react";
import { MessageInput } from "./MessageInput";
import { EmojiPicker } from "./EmojiPicker";
import { MessageReactions } from "./MessageReactions";

interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  mentioned_user_ids: string[];
  created_at: string;
  reply_to_id: string | null;
  media_url: string | null;
  media_type: string | null;
  edited_at: string | null;
}

interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
}

interface Channel {
  id: string;
  name: string;
  description: string | null;
  is_read_only: boolean;
  is_locked: boolean;
}

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface Props {
  channel: Channel;
  profileMap: Record<string, Profile>;
  getRoles: (userId: string) => string[];
  currentUserId: string;
}

const roleBadge = (role: string) => {
  if (role === "admin") return <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">Admin</Badge>;
  if (role === "moderator") return <Badge className="text-[10px] px-1 py-0 h-4 bg-blue-500 text-white">Mod</Badge>;
  return null;
};

export function ChatArea({ channel, profileMap, getRoles, currentUserId }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState<{ id: string; content: string; user_name: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const currentRoles = getRoles(currentUserId);
  const canModerate = currentRoles.includes("admin") || currentRoles.includes("moderator");
  const canPost = !channel.is_locked && (!channel.is_read_only || canModerate);
  const profiles = useMemo(() => Object.values(profileMap), [profileMap]);

  // Fetch messages
  useEffect(() => {
    setLoading(true);
    (supabase as any)
      .from("messages")
      .select("*")
      .eq("channel_id", channel.id)
      .order("created_at", { ascending: true })
      .limit(200)
      .then(({ data }: any) => {
        setMessages(data || []);
        setLoading(false);
      });
  }, [channel.id]);

  // Fetch reactions for current channel messages
  useEffect(() => {
    if (messages.length === 0) return;
    const msgIds = messages.map((m) => m.id);
    (supabase as any)
      .from("message_reactions")
      .select("*")
      .in("message_id", msgIds)
      .then(({ data }: any) => {
        setReactions(data || []);
      });
  }, [messages.length, messages[0]?.id]);

  // Real-time subscription for messages
  useEffect(() => {
    const sub = supabase
      .channel(`messages:${channel.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `channel_id=eq.${channel.id}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `channel_id=eq.${channel.id}` }, (payload) => {
        setMessages((prev) => prev.map((m) => m.id === (payload.new as Message).id ? payload.new as Message : m));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages", filter: `channel_id=eq.${channel.id}` }, (payload) => {
        setMessages((prev) => prev.filter((m) => m.id !== (payload.old as any).id));
      })
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [channel.id]);

  // Real-time subscription for reactions
  useEffect(() => {
    const sub = supabase
      .channel(`reactions:${channel.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "message_reactions" }, (payload) => {
        const newReaction = payload.new as Reaction;
        setReactions((prev) => {
          if (prev.some((r) => r.id === newReaction.id)) return prev;
          return [...prev, newReaction];
        });
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "message_reactions" }, (payload) => {
        setReactions((prev) => prev.filter((r) => r.id !== (payload.old as any).id));
      })
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [channel.id]);

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const deleteMessage = async (id: string) => {
    await (supabase as any).from("messages").delete().eq("id", id);
  };

  const handleReply = useCallback((msg: Message) => {
    const profile = profileMap[msg.user_id];
    setReplyTo({
      id: msg.id,
      content: msg.content || "[media]",
      user_name: profile?.full_name || "Unknown",
    });
  }, [profileMap]);

  const startEdit = (msg: Message) => {
    setEditingId(msg.id);
    setEditContent(msg.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent("");
  };

  const saveEdit = async () => {
    if (!editingId || !editContent.trim()) return;
    await (supabase as any)
      .from("messages")
      .update({ content: editContent.trim(), edited_at: new Date().toISOString() })
      .eq("id", editingId);
    cancelEdit();
  };

  const addReaction = async (messageId: string, emoji: string) => {
    const existing = reactions.find((r) => r.message_id === messageId && r.user_id === currentUserId && r.emoji === emoji);
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

  // Build maps
  const messageMap = useMemo(() => {
    const map: Record<string, Message> = {};
    messages.forEach((m) => { map[m.id] = m; });
    return map;
  }, [messages]);

  const reactionsByMessage = useMemo(() => {
    const map: Record<string, Reaction[]> = {};
    reactions.forEach((r) => {
      if (!map[r.message_id]) map[r.message_id] = [];
      map[r.message_id].push(r);
    });
    return map;
  }, [reactions]);

  // Group consecutive messages
  const grouped = useMemo(() => {
    return messages.map((msg, i) => {
      const prev = messages[i - 1];
      const showHeader = !prev || prev.user_id !== msg.user_id ||
        new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() > 5 * 60 * 1000 ||
        !!msg.reply_to_id;
      return { ...msg, showHeader };
    });
  }, [messages]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Channel header */}
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Hash className="h-5 w-5 text-muted-foreground" />
        <h2 className="font-display font-semibold">{channel.name}</h2>
        {channel.description && <span className="text-sm text-muted-foreground hidden sm:inline">— {channel.description}</span>}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4">
        <div className="py-4 space-y-0.5">
          {loading ? (
            <p className="text-center text-sm text-muted-foreground py-8">Loading messages...</p>
          ) : grouped.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No messages yet. Be the first to say something!</p>
          ) : (
            grouped.map((msg) => {
              const profile = profileMap[msg.user_id];
              const roles = getRoles(msg.user_id);
              const name = profile?.full_name || "Unknown";
              const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
              const canDelete = msg.user_id === currentUserId || canModerate;
              const canEdit = msg.user_id === currentUserId;
              const isEditing = editingId === msg.id;

              // Reply context
              const replyMsg = msg.reply_to_id ? messageMap[msg.reply_to_id] : null;
              const replyProfile = replyMsg ? profileMap[replyMsg.user_id] : null;
              const msgReactions = reactionsByMessage[msg.id] || [];

              return (
                <div key={msg.id} className={`group flex gap-3 px-2 py-0.5 hover:bg-muted/50 rounded ${msg.showHeader ? "mt-4" : ""}`}>
                  {msg.showHeader ? (
                    <Avatar className="h-9 w-9 shrink-0 mt-0.5">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">{initials}</AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-9 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    {/* Reply reference */}
                    {replyMsg && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
                        <Reply className="h-3 w-3" />
                        <span className="font-medium">{replyProfile?.full_name || "Unknown"}</span>
                        <span className="truncate max-w-[200px]">{replyMsg.content || "[media]"}</span>
                      </div>
                    )}
                    {msg.showHeader && (
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-sm">{name}</span>
                        {roles.map((r) => <span key={r}>{roleBadge(r)}</span>)}
                        <span className="text-xs text-muted-foreground">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {msg.edited_at && <span className="text-xs text-muted-foreground italic">(edited)</span>}
                      </div>
                    )}
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(); }
                            if (e.key === "Escape") cancelEdit();
                          }}
                          className="flex-1 resize-none rounded-md border bg-background px-3 py-1.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[36px] max-h-[100px]"
                          rows={1}
                          autoFocus
                        />
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={saveEdit}>
                          <Check className="h-4 w-4 text-green-500" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={cancelEdit}>
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        {msg.content && (
                          <p className="text-sm break-words whitespace-pre-wrap">
                            {msg.content}
                            {msg.edited_at && !msg.showHeader && <span className="text-xs text-muted-foreground italic ml-1">(edited)</span>}
                          </p>
                        )}
                      </>
                    )}
                    {/* Media */}
                    {msg.media_url && msg.media_type === "image" && (
                      <img src={msg.media_url} alt="" className="mt-1 max-w-xs rounded-lg border cursor-pointer" onClick={() => window.open(msg.media_url!, "_blank")} />
                    )}
                    {msg.media_url && msg.media_type === "video" && (
                      <video src={msg.media_url} controls className="mt-1 max-w-xs rounded-lg border" />
                    )}
                    {/* Reactions */}
                    <MessageReactions
                      messageId={msg.id}
                      reactions={msgReactions}
                      currentUserId={currentUserId}
                      profileMap={profileMap}
                    />
                  </div>
                  <div className="flex items-start gap-0.5 opacity-0 group-hover:opacity-100 shrink-0">
                    <EmojiPicker onSelect={(emoji) => addReaction(msg.id, emoji)} />
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleReply(msg)}>
                      <Reply className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    {canEdit && !isEditing && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => startEdit(msg)}>
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteMessage(msg.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Message input */}
      <MessageInput
        channelId={channel.id}
        channelName={channel.name}
        canPost={canPost}
        currentUserId={currentUserId}
        profiles={profiles}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
      />
    </div>
  );
}
