import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { ReactionType } from "@shared/schema";

const REACTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: "heart", emoji: "❤️", label: "Love" },
];

interface ReactionPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (reaction: ReactionType) => void;
  currentReaction?: ReactionType;
}

export function ReactionPicker({ isOpen, onClose, onSelect, currentReaction }: ReactionPickerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 10 }}
          transition={{ duration: 0.15 }}
          className="absolute bottom-full left-0 mb-2 bg-card border border-border rounded-full shadow-lg px-2 py-1.5 flex gap-1 z-50"
          onMouseLeave={onClose}
        >
          {REACTIONS.map((reaction) => (
            <Button
              key={reaction.type}
              variant="ghost"
              size="icon"
              className={`h-9 w-9 text-2xl hover-elevate active-elevate-2 transition-transform ${
                currentReaction === reaction.type ? "scale-125 toggle-elevated" : ""
              }`}
              onClick={() => {
                onSelect(reaction.type);
                onClose();
              }}
              data-testid={`reaction-${reaction.type}`}
              title={reaction.label}
            >
              {reaction.emoji}
            </Button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface ReactionDisplayProps {
  reactionCounts: Record<string, number>;
  reactionsByUser: Record<string, ReactionType>;
  currentUserId?: string;
  onReactionClick: () => void;
}

export function ReactionDisplay({ reactionCounts, reactionsByUser, currentUserId, onReactionClick }: ReactionDisplayProps) {
  const userReaction = currentUserId ? reactionsByUser[currentUserId] : undefined;
  const totalReactions = Object.values(reactionCounts).reduce((sum, count) => sum + (count || 0), 0);
  
  if (totalReactions === 0) {
    return null;
  }
  
  // Get top 3 reactions
  const topReactions = Object.entries(reactionCounts)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  
  return (
    <button
      onClick={onReactionClick}
      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors hover-elevate active-elevate-2 rounded-full px-2 py-1"
      data-testid="reaction-summary"
    >
      <div className="flex -space-x-1">
        {topReactions.map(([type]) => {
          const reaction = REACTIONS.find((r) => r.type === type);
          return (
            <span key={type} className="text-sm">
              {reaction?.emoji}
            </span>
          );
        })}
      </div>
      <span className="font-medium">{totalReactions}</span>
      {userReaction && (
        <span className="text-primary text-xs ml-1">
          • You reacted
        </span>
      )}
    </button>
  );
}
