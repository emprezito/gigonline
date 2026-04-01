import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface UserRole {
  user_id: string;
  role: string;
}

interface Props {
  profiles: Profile[];
  userRoles: UserRole[];
  onlineUserIds: Set<string>;
}

const roleOrder: Record<string, number> = { admin: 0, moderator: 1, student: 2, affiliate: 2 };
const roleLabel: Record<string, string> = { admin: "Admins", moderator: "Moderators" };
const roleColor: Record<string, string> = { admin: "text-yellow-500", moderator: "text-blue-400" };

export function MemberList({ profiles, userRoles, onlineUserIds }: Props) {
  const grouped = useMemo(() => {
    const roleMap = new Map<string, Set<string>>();
    userRoles.forEach((r) => {
      if (!roleMap.has(r.user_id)) roleMap.set(r.user_id, new Set());
      roleMap.get(r.user_id)!.add(r.role);
    });

    const groups: { label: string; members: (Profile & { online: boolean; topRole: string })[] }[] = [
      { label: "Admins", members: [] },
      { label: "Moderators", members: [] },
      { label: "Members", members: [] },
    ];

    profiles.forEach((p) => {
      const roles = roleMap.get(p.id) || new Set<string>();
      const online = onlineUserIds.has(p.id);
      const member = { ...p, online, topRole: "student" };

      if (roles.has("admin")) {
        member.topRole = "admin";
        groups[0].members.push(member);
      } else if (roles.has("moderator")) {
        member.topRole = "moderator";
        groups[1].members.push(member);
      } else {
        groups[2].members.push(member);
      }
    });

    // Sort: online first, then by name
    groups.forEach((g) => {
      g.members.sort((a, b) => {
        if (a.online !== b.online) return a.online ? -1 : 1;
        return (a.full_name || "").localeCompare(b.full_name || "");
      });
    });

    return groups.filter((g) => g.members.length > 0);
  }, [profiles, userRoles, onlineUserIds]);

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-4">
        {grouped.map((group) => (
          <div key={group.label}>
            <p className="px-2 mb-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              {group.label} — {group.members.length}
            </p>
            {group.members.map((m) => {
              const name = m.full_name || "Unknown";
              const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
              return (
                <div key={m.id} className="flex items-center gap-2 rounded-md px-2 py-1.5">
                  <div className="relative">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
                    </Avatar>
                    <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-sidebar ${m.online ? "bg-green-500" : "bg-gray-400"}`} />
                  </div>
                  <span className={`text-sm truncate ${roleColor[m.topRole] || "text-sidebar-foreground/80"} ${!m.online ? "opacity-50" : ""}`}>
                    {name}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
