import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface Props {
  typingUsers: { user_id: string }[];
  profileMap: Record<string, Profile>;
}

export function TypingIndicator({ typingUsers, profileMap }: Props) {
  if (typingUsers.length === 0) return null;

  const names = typingUsers
    .map((u) => profileMap[u.user_id]?.full_name?.split(" ")[0] || "Someone")
    .slice(0, 3);

  const label =
    names.length === 1
      ? `${names[0]} is typing`
      : names.length === 2
        ? `${names[0]} and ${names[1]} are typing`
        : `${names[0]}, ${names[1]} and ${typingUsers.length - 2} more are typing`;

  const first = typingUsers[0];
  const profile = profileMap[first.user_id];
  const initials = (profile?.full_name || "?").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="flex items-end gap-2 px-3 sm:px-4 pb-1 max-w-3xl mx-auto w-full">
      <Avatar className="h-7 w-7">
        <AvatarFallback className="bg-primary/10 text-primary text-[10px]">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col items-start">
        <div className="bg-muted rounded-2xl px-3.5 py-2.5 shadow-sm">
          <div className="flex gap-1 items-center h-3">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
        <span className="text-[10px] text-muted-foreground mt-0.5 px-2">{label}</span>
      </div>
    </div>
  );
}
