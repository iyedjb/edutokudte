import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  color: string;
  rotation: number;
  delay: number;
}

interface ConfettiEffectProps {
  trigger: boolean;
  onComplete?: () => void;
}

export function ConfettiEffect({ trigger, onComplete }: ConfettiEffectProps) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  
  useEffect(() => {
    if (!trigger) return;
    
    const colors = ["#0B72FF", "#6C63FF", "#FF6B6B", "#FFD93D", "#6BCF7F"];
    const newPieces: ConfettiPiece[] = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -10,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      delay: Math.random() * 0.2,
    }));
    
    setPieces(newPieces);
    
    const timeout = setTimeout(() => {
      setPieces([]);
      onComplete?.();
    }, 3000);
    
    return () => clearTimeout(timeout);
  }, [trigger, onComplete]);
  
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {pieces.map((piece) => (
          <motion.div
            key={piece.id}
            initial={{
              x: `${piece.x}vw`,
              y: "-10px",
              rotate: piece.rotation,
              opacity: 1,
            }}
            animate={{
              y: "110vh",
              rotate: piece.rotation + 720,
              opacity: 0,
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 2.5,
              delay: piece.delay,
              ease: "easeIn",
            }}
            style={{
              position: "absolute",
              width: "10px",
              height: "10px",
              backgroundColor: piece.color,
              borderRadius: "2px",
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
