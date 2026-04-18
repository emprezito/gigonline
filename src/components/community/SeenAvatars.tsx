import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface Props {
  userIds: string[];
  profileMap: Record<string, Profile>;
  align?: "left" | "right";
}

export function SeenAvatars({ userIds, profileMap, align = "right" }: Props) {
  if (userIds.length === 0) return null;
  const visible = userIds.slice(0, 4);
  const extra = userIds.length - visible.length;

  return (
    <div
      className={cn("flex items-center gap-0.5 mt-0.5 px-1", align === "right" ? "justify-end" : "justify-start")}
      title={`Seen by ${userIds.map((id) => profileMap[id]?.full_name || "Unknown").join(", ")}`}
    >
      {visible.map((uid) => {
        const p = profileMap[uid];
        const initials = (p?.full_name || "?").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
        return (
          <Avatar key={uid} className="h-3.5 w-3.5 border border-background">
            <AvatarFallback className="bg-primary/20 text-primary text-[8px]">{initials}</AvatarFallback>
          </Avatar>
        );
      })}
      {extra > 0 && (
        <span className="text-[9px] text-muted-foreground ml-0.5">+{extra}</span>
      )}
    </div>
  );
}
