import { Hash, Lock, Volume2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Channel {
  id: string;
  name: string;
  category: string;
  is_read_only: boolean;
  is_locked: boolean;
}

interface Props {
  channels: Channel[];
  activeChannelId: string;
  onSelect: (id: string) => void;
}

export function ChannelList({ channels, activeChannelId, onSelect }: Props) {
  const grouped = channels.reduce<Record<string, Channel[]>>((acc, ch) => {
    (acc[ch.category] = acc[ch.category] || []).push(ch);
    return acc;
  }, {});

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-4">
        {Object.entries(grouped).map(([category, chs]) => (
          <div key={category}>
            <p className="px-2 mb-1 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              {category}
            </p>
            {chs.map((ch) => (
              <button
                key={ch.id}
                onClick={() => !ch.is_locked && onSelect(ch.id)}
                disabled={ch.is_locked}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                  ch.id === activeChannelId
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                } ${ch.is_locked ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                {ch.is_locked ? (
                  <Lock className="h-4 w-4 shrink-0" />
                ) : ch.is_read_only ? (
                  <Volume2 className="h-4 w-4 shrink-0" />
                ) : (
                  <Hash className="h-4 w-4 shrink-0" />
                )}
                <span className="truncate">{ch.name}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
