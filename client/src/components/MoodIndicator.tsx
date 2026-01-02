import { Badge } from "@/components/ui/badge";
import type { PostMood } from "@shared/schema";
import { BookOpen, HelpCircle, Share2, Sparkles, MessageCircle } from "lucide-react";

const MOOD_CONFIG: Record<PostMood, { icon: any; label: string; color: string }> = {
  studying: {
    icon: BookOpen,
    label: "Studying",
    color: "text-blue-500",
  },
  help: {
    icon: HelpCircle,
    label: "Need Help",
    color: "text-orange-500",
  },
  sharing: {
    icon: Share2,
    label: "Sharing",
    color: "text-green-500",
  },
  celebrating: {
    icon: Sparkles,
    label: "Celebrating",
    color: "text-yellow-500",
  },
  question: {
    icon: MessageCircle,
    label: "Question",
    color: "text-purple-500",
  },
};

interface MoodIndicatorProps {
  mood: PostMood;
  size?: "sm" | "default";
}

export function MoodIndicator({ mood, size = "default" }: MoodIndicatorProps) {
  const config = MOOD_CONFIG[mood];
  const Icon = config.icon;
  
  return (
    <Badge
      variant="outline"
      className={`flex items-center gap-1.5 ${size === "sm" ? "text-xs px-2 py-0.5" : ""}`}
      data-testid={`mood-${mood}`}
    >
      <Icon className={`${size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} ${config.color}`} />
      <span>{config.label}</span>
    </Badge>
  );
}
