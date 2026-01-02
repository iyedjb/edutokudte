import { Badge } from "@/components/ui/badge";
import { TrendingUp, Hash, Flame, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface TrendingHashtag {
  tag: string;
  count: number;
  trend: "up" | "stable" | "down";
}

interface TrendingPanelProps {
  hashtags: TrendingHashtag[];
  onHashtagClick?: (tag: string) => void;
}

export function TrendingPanel({ hashtags, onHashtagClick }: TrendingPanelProps) {
  if (hashtags.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }} 
        animate={{ opacity: 1, x: 0 }} 
        className="bg-card/70 backdrop-blur-xl rounded-[28px] border border-border/20 p-6 shadow-xl"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-lg">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-base">Em Alta</h3>
            <p className="text-xs text-muted-foreground">Tendências agora</p>
          </div>
        </div>
        <div className="text-center py-6 text-muted-foreground text-sm">
          <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Nenhuma tendência ainda</p>
          <p className="text-xs mt-1">Comece a usar hashtags!</p>
        </div>
      </motion.div>
    );
  }
  
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }} 
      className="bg-card/70 backdrop-blur-xl rounded-[28px] border border-border/20 p-6 shadow-xl"
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-lg">
          <Flame className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-base">Em Alta</h3>
          <p className="text-xs text-muted-foreground">Tendências agora</p>
        </div>
      </div>
      
      <div className="space-y-2">
        {hashtags.slice(0, 8).map((item, index) => (
          <motion.button
            key={item.tag}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05, type: "spring", stiffness: 300, damping: 25 }}
            whileHover={{ scale: 1.02, x: 4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onHashtagClick?.(item.tag)}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl hover:bg-muted/40 transition-all text-left group"
            data-testid={`trending-${item.tag}`}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                index === 0 
                  ? 'bg-gradient-to-br from-orange-400 to-red-500 text-white shadow-lg' 
                  : index === 1 
                    ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md'
                    : index === 2
                      ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-md'
                      : 'bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
              }`}>
                {index < 3 ? (
                  <span className="text-xs font-bold">{index + 1}</span>
                ) : (
                  <Hash className="h-4 w-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-sm block truncate group-hover:text-primary transition-colors">
                  #{item.tag.replace("#", "")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {item.count} {item.count === 1 ? 'post' : 'posts'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {item.trend === "up" && (
                <motion.div
                  animate={{ y: [0, -2, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </motion.div>
              )}
            </div>
          </motion.button>
        ))}
      </div>
      
      {hashtags.length > 8 && (
        <button className="w-full mt-4 text-center text-sm text-primary font-semibold hover:underline transition-colors">
          Ver mais tendências
        </button>
      )}
    </motion.div>
  );
}
