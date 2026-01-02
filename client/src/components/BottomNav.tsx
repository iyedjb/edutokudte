import { Link, useLocation } from "wouter";
import { LayoutGrid, PlaySquare, MessagesSquare, Award, Brain } from "lucide-react";
import { usePendingConversationsCount } from "@/lib/useFirebaseData";
import { useSchool } from "@/lib/useSchool";
import { useRole } from "@/lib/useRole";
import { Badge } from "@/components/ui/badge";

export function BottomNav() {
  const [location] = useLocation();
  const { school } = useSchool();
  const { count: pendingCount } = usePendingConversationsCount();
  const { isProfessor } = useRole();

  const baseNavItems = [
    { icon: LayoutGrid, label: "Início", path: "/dashboard" },
    { icon: PlaySquare, label: "Efeed", path: "/efeed" },
    { icon: MessagesSquare, label: "Chat", path: "/chat" },
    { icon: Award, label: "Notas", path: isProfessor ? "/professor/notas" : "/grades" },
    { icon: Brain, label: "IA", path: "/ai-chat" },
  ];
  
  const navItems = baseNavItems.map(item => ({
    ...item,
    path: school.basePath ? `${school.basePath}${item.path}` : item.path
  }));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe pointer-events-none">
      <div className="relative mx-auto max-w-sm px-4 pb-4">
        <div className="pointer-events-auto animate-slide-in-up">
          <div className="relative">
            <div className="absolute -inset-3 bg-primary/10 rounded-full blur-2xl animate-breath opacity-30" />
            
            <div className="relative backdrop-blur-xl bg-gradient-to-b from-white/95 to-white/85 dark:from-card/95 dark:to-card/85 rounded-full px-3 py-2.5 shadow-[0_12px_40px_-10px_rgba(0,0,0,0.25)] dark:shadow-[0_12px_40px_-10px_rgba(0,0,0,0.5)] border border-white/60 dark:border-primary/20">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 via-transparent to-transparent dark:from-white/5 pointer-events-none" />
              
              <div className="relative flex items-center justify-around gap-1">
                {navItems.map(({ icon: Icon, label, path }, index) => {
                  const isActive = location === path;
                  const showBadge = path.endsWith("/chat") && pendingCount > 0;
                  
                  return (
                    <Link 
                      key={path} 
                      href={path}
                      className="group/bubble relative flex flex-col items-center justify-center"
                      data-testid={`nav-${label.toLowerCase().replace(" ", "-")}`}
                      style={{
                        animation: `slide-in-up 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 60}ms backwards`
                      }}
                    >
                      <div className="relative">
                        <div 
                          className={`
                            relative w-12 h-12 rounded-full flex flex-col items-center justify-center gap-0.5
                            transition-all duration-500 ease-out
                            ${isActive 
                              ? 'scale-100' 
                              : 'scale-90 group-hover/bubble:scale-95 group-active/bubble:scale-85'
                            }
                          `}
                        >
                          {isActive && (
                            <>
                              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/25 via-primary/15 to-primary/20 shadow-md shadow-primary/15" />
                              <div className="absolute -inset-0.5 rounded-full bg-primary/10 blur-sm animate-pulse-slow" />
                            </>
                          )}
                          
                          {!isActive && (
                            <div className="absolute inset-0 rounded-full bg-foreground/5 opacity-0 group-hover/bubble:opacity-100 transition-opacity duration-300" />
                          )}
                          
                          <div className="relative flex flex-col items-center justify-center gap-0.5">
                            <div className="relative">
                              {showBadge && (
                                <div className="absolute -top-1 -right-1 z-20">
                                  <Badge 
                                    variant="destructive" 
                                    className="min-w-[14px] h-[14px] px-1 flex items-center justify-center text-[7px] font-bold p-0 shadow-sm"
                                    data-testid="badge-pending-conversations"
                                  >
                                    {pendingCount}
                                  </Badge>
                                </div>
                              )}
                              <Icon 
                                className={`
                                  w-5 h-5 transition-all duration-400
                                  ${isActive 
                                    ? 'text-primary stroke-[2.5]' 
                                    : 'text-foreground/60 dark:text-foreground/50 stroke-[2] group-hover/bubble:text-foreground/80'
                                  }
                                `}
                              />
                            </div>
                            
                            <span 
                              className={`
                                text-[7px] font-semibold tracking-tight transition-all duration-400
                                ${isActive 
                                  ? 'text-primary' 
                                  : 'text-foreground/45 dark:text-foreground/35 group-hover/bubble:text-foreground/65'
                                }
                              `}
                            >
                              {label}
                            </span>
                          </div>
                        </div>
                        
                        {isActive && (
                          <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2">
                            <div className="w-1 h-1 rounded-full bg-primary shadow-[0_0_6px_rgba(33,150,243,0.6)]" />
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <style>{`
        @supports (padding-bottom: env(safe-area-inset-bottom)) {
          .pb-safe {
            padding-bottom: max(1rem, env(safe-area-inset-bottom));
          }
        }
      `}</style>
    </nav>
  );
}
