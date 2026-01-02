import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNotifications } from "@/lib/useNotifications";
import { usePushNotifications } from "@/lib/usePushNotifications";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Bell,
  BellOff,
  CheckCheck,
  MessageCircle,
  Send,
  Trophy,
  BookOpen,
  X,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useLocation } from "wouter";
import { ScrollArea } from "@/components/ui/scroll-area";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
}

export function NotificationPanel() {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
  const { permission, requestPermission, regenerateToken, isRegenerating } = usePushNotifications();

  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id);
    
    if (notification.type === "message" && notification.data?.chatId) {
      setLocation("/chat");
      setOpen(false);
    } else if (notification.type === "efeed_post") {
      setLocation("/efeed");
      setOpen(false);
    } else if (notification.type === "grade") {
      setLocation("/grades");
      setOpen(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "message":
        return MessageCircle;
      case "efeed_post":
        return Send;
      case "grade":
        return Trophy;
      case "assignment":
        return BookOpen;
      default:
        return Bell;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "message":
        return "text-blue-500";
      case "efeed_post":
        return "text-purple-500";
      case "grade":
        return "text-amber-500";
      case "assignment":
        return "text-green-500";
      default:
        return "text-muted-foreground";
    }
  };

  const NotificationContent = ({ fullScreen = false }: { fullScreen?: boolean }) => (
    <>
      <div className="flex items-center justify-between p-4 border-b border-border/30">
        <div>
          <h3 className="font-semibold text-lg">Notificações</h3>
          {unreadCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {unreadCount} {unreadCount === 1 ? "não lida" : "não lidas"}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {permission !== "granted" && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8 rounded-full"
              onClick={requestPermission}
              data-testid="button-enable-notifications"
            >
              <Bell className="w-3 h-3 mr-1" />
              Ativar
            </Button>
          )}
          {permission === "granted" && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8 rounded-full"
              onClick={regenerateToken}
              disabled={isRegenerating}
              data-testid="button-regenerate-token"
            >
              {isRegenerating ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3 mr-1" />
              )}
              Atualizar
            </Button>
          )}
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8 rounded-full"
              onClick={markAllAsRead}
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="w-3 h-3 mr-1" />
              Marcar
            </Button>
          )}
          {fullScreen && (
            <Button
              variant="ghost"
              size="icon"
              className="w-9 h-9 rounded-full"
              onClick={() => setOpen(false)}
              data-testid="button-close-notifications"
            >
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className={fullScreen ? "flex-1" : "h-96"}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <BellOff className="w-10 h-10 text-muted-foreground" />
            </div>
            <p className="text-base font-medium text-foreground">
              Nenhuma notificação
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Você está em dia com tudo!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            <AnimatePresence>
              {notifications.map((notification) => {
                const Icon = getNotificationIcon(notification.type);
                const colorClass = getNotificationColor(notification.type);

                return (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                      !notification.read ? "bg-primary/5" : ""
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                    data-testid={`notification-${notification.id}`}
                  >
                    <div className="flex gap-3">
                      {notification.data?.senderPhoto ? (
                        <Avatar className="w-12 h-12 flex-shrink-0">
                          <AvatarImage src={notification.data.senderPhoto} />
                          <AvatarFallback>
                            {notification.data.senderName?.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div
                          className={`w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0 ${colorClass}`}
                        >
                          <Icon className="w-6 h-6" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-foreground line-clamp-1">
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <div className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1.5">
                          {formatDistanceToNow(notification.timestamp, {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </ScrollArea>
    </>
  );

  const TriggerButton = (
    <Button
      variant="ghost"
      size="icon"
      className="relative group rounded-full w-9 h-9 sm:w-8 sm:h-8"
      data-testid="button-notifications"
      onClick={isMobile ? () => setOpen(true) : undefined}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5 rounded-full opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity"></div>
      <Bell className="w-[18px] h-[18px] sm:w-4 sm:h-4 relative z-10" />
      {unreadCount > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] sm:min-w-4 sm:h-4 px-1 bg-gradient-to-br from-red-500 to-pink-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg z-20"
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </motion.span>
      )}
    </Button>
  );

  if (isMobile) {
    return (
      <>
        {TriggerButton}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="absolute inset-4 top-8 bottom-8 bg-background rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-border/50"
                onClick={(e) => e.stopPropagation()}
              >
                <NotificationContent fullScreen />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {TriggerButton}
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0 rounded-3xl overflow-hidden border-border/50 shadow-xl" align="end">
        <NotificationContent />
      </PopoverContent>
    </Popover>
  );
}
