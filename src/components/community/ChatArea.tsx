import { useEffect, useRef, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Hash } from "lucide-react";
import { MessageInput } from "./MessageInput";

interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  mentioned_user_ids: string[];
  created_at: string;
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
  const [loading, setLoading] = useState(true);
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

  // Real-time subscription
  useEffect(() => {
    const sub = supabase
      .channel(`messages:${channel.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `channel_id=eq.${channel.id}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message]);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages", filter: `channel_id=eq.${channel.id}` }, (payload) => {
        setMessages((prev) => prev.filter((m) => m.id !== (payload.old as any).id));
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

  // Group consecutive messages
  const grouped = useMemo(() => {
    return messages.map((msg, i) => {
      const prev = messages[i - 1];
      const showHeader = !prev || prev.user_id !== msg.user_id ||
        new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() > 5 * 60 * 1000;
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
                    {msg.showHeader && (
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-sm">{name}</span>
                        {roles.map((r) => <span key={r}>{roleBadge(r)}</span>)}
                        <span className="text-xs text-muted-foreground">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    )}
                    <p className="text-sm break-words whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  {canDelete && (
                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-6 w-6 shrink-0" onClick={() => deleteMessage(msg.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
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
        canPost={canPost}
        currentUserId={currentUserId}
        profiles={profiles}
      />
    </div>
  );
}
