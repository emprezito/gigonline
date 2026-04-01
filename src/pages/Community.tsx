import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ChannelList } from "@/components/community/ChannelList";
import { ChatArea } from "@/components/community/ChatArea";
import { MemberList } from "@/components/community/MemberList";
import { NotificationBell } from "@/components/community/NotificationBell";
import { Button } from "@/components/ui/button";
import { GraduationCap, Loader2, Menu, X } from "lucide-react";
import { Link } from "react-router-dom";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface UserRole {
  user_id: string;
  role: string;
}

interface Channel {
  id: string;
  name: string;
  category: string;
  description: string | null;
  is_read_only: boolean;
  is_locked: boolean;
  sort_order: number;
}

export default function Community() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }

    const init = async () => {
      const [chRes, prRes, roRes] = await Promise.all([
        (supabase as any).from("channels").select("*").order("sort_order"),
        supabase.from("profiles").select("id, full_name, avatar_url"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      const ch = chRes.data || [];
      setChannels(ch);
      setProfiles(prRes.data || []);
      setUserRoles(roRes.data || []);
      if (ch.length > 0) setActiveChannelId(ch[0].id);
      setLoading(false);
    };
    init();
  }, [user, authLoading]);

  // Presence
  useEffect(() => {
    if (!user) return;
    const presenceChannel = supabase.channel("community-presence");
    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        const online = new Set<string>();
        Object.values(state).forEach((presences) => {
          (presences as any[]).forEach((p) => online.add(p.user_id));
        });
        setOnlineUserIds(online);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({ user_id: user.id });
        }
      });
    return () => { supabase.removeChannel(presenceChannel); };
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeChannel = channels.find((c) => c.id === activeChannelId);
  const profileMap = Object.fromEntries(profiles.map((p) => [p.id, p]));

  const getRoles = (userId: string) => userRoles.filter((r) => r.user_id === userId).map((r) => r.role);

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card px-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setShowSidebar(!showSidebar)}>
            {showSidebar ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
            <GraduationCap className="h-5 w-5 text-primary" />
            <span className="hidden sm:inline">GhostPen Community</span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell profileMap={profileMap} />
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setShowMembers(!showMembers)}>
            <span className="text-xs">👥</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>Dashboard</Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Channel list - sidebar */}
        <div className={`${showSidebar ? "absolute inset-y-14 left-0 z-30 w-60" : "hidden"} md:relative md:block md:w-60 shrink-0 border-r bg-sidebar`}>
          <ChannelList channels={channels} activeChannelId={activeChannelId} onSelect={(id) => { setActiveChannelId(id); setShowSidebar(false); }} />
        </div>

        {/* Chat area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {activeChannel && (
            <ChatArea
              channel={activeChannel}
              profileMap={profileMap}
              getRoles={getRoles}
              currentUserId={user!.id}
            />
          )}
        </div>

        {/* Member list */}
        <div className={`${showMembers ? "absolute inset-y-14 right-0 z-30 w-56" : "hidden"} md:relative md:block md:w-56 shrink-0 border-l bg-sidebar`}>
          <MemberList profiles={profiles} userRoles={userRoles} onlineUserIds={onlineUserIds} />
        </div>
      </div>
    </div>
  );
}
