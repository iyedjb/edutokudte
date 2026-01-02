import { useEffect, useState } from "react";
import { getToken, onMessage, deleteToken } from "firebase/messaging";
import { messaging } from "@/lib/firebase";
import { ref, set, remove } from "firebase/database";
import { database } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";
import { useToast } from "@/hooks/use-toast";

// VAPID key from environment variable
const VAPID_KEY = import.meta.env.VITE_VAPID_KEY || "";

export function usePushNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window 
      ? Notification.permission 
      : "default"
  );
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Request notification permission
  const requestPermission = async () => {
    if (!("Notification" in window)) {
      console.log("This browser does not support notifications");
      return false;
    }

    const permission = await Notification.requestPermission();
    setPermission(permission);
    
    // If permission granted, immediately get and save the FCM token
    if (permission === "granted" && user?.uid && messaging) {
      try {
        const token = await getToken(messaging, { vapidKey: VAPID_KEY });
        if (token) {
          setFcmToken(token);
          // Save token to database
          const tokenRef = ref(database, `fcmTokens/${user.uid}`);
          await set(tokenRef, {
            token,
            updatedAt: Date.now(),
          });
        }
      } catch (error) {
        console.error("Error getting FCM token after permission grant:", error);
      }
    }
    
    return permission === "granted";
  };

  // Regenerate FCM token with new VAPID key
  const regenerateToken = async () => {
    if (!user?.uid || !messaging) {
      toast({
        title: "Erro",
        description: "Você precisa estar autenticado para regenerar o token.",
        variant: "destructive",
      });
      return false;
    }

    setIsRegenerating(true);
    
    try {
      // Delete old token from Firebase Messaging
      try {
        await deleteToken(messaging);
        console.log("🗑️ Old FCM token deleted");
      } catch (error) {
        console.log("No old token to delete or deletion failed:", error);
      }

      // Remove old token from database
      const tokenRef = ref(database, `fcmTokens/${user.uid}`);
      await remove(tokenRef);
      console.log("🗑️ Old token removed from database");

      // Get new token with updated VAPID key
      const newToken = await getToken(messaging, { vapidKey: VAPID_KEY });
      
      if (newToken) {
        setFcmToken(newToken);
        
        // Save new token to database
        await set(tokenRef, {
          token: newToken,
          updatedAt: Date.now(),
        });
        
        console.log("✅ New FCM token generated and saved");
        
        toast({
          title: "Sucesso!",
          description: "Token de notificação atualizado. As notificações push já devem funcionar.",
        });
        
        return true;
      } else {
        toast({
          title: "Erro",
          description: "Não foi possível obter um novo token.",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error("Error regenerating FCM token:", error);
      toast({
        title: "Erro",
        description: "Erro ao regenerar token. Tente novamente.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsRegenerating(false);
    }
  };

  // Register service worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/firebase-messaging-sw.js")
        .then((registration) => {
          console.log("Service Worker registered:", registration);
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error);
        });
    }
  }, []);

  // Get FCM token and save to database
  useEffect(() => {
    if (!user?.uid || !messaging) return;

    const initMessaging = async () => {
      try {
        // Check if permission is already granted
        if (Notification.permission === "granted" && messaging) {
          const token = await getToken(messaging, { vapidKey: VAPID_KEY });
          if (token) {
            setFcmToken(token);
            // Save token to database
            const tokenRef = ref(database, `fcmTokens/${user.uid}`);
            await set(tokenRef, {
              token,
              updatedAt: Date.now(),
            });
          }
        }
      } catch (error) {
        console.error("Error getting FCM token:", error);
      }
    };

    initMessaging();
  }, [user?.uid, permission]);

  // Listen for foreground messages
  useEffect(() => {
    if (!messaging) return;

    // Type guard to ensure messaging is not null
    const messagingInstance = messaging;
    
    const unsubscribe = onMessage(messagingInstance, (payload) => {
      console.log("Foreground message received:", payload);
      
      // Show toast notification when app is in foreground
      if (payload.notification) {
        toast({
          title: payload.notification.title || "Nova notificação",
          description: payload.notification.body || "",
        });

        // Also show browser notification
        if (Notification.permission === "granted") {
          new Notification(payload.notification.title || "Nova notificação", {
            body: payload.notification.body || "",
            icon: "/icon-192.png",
            badge: "/badge-72.png",
            tag: payload.data?.notificationId || "default",
          });
        }
      }
    });

    return () => unsubscribe();
  }, [toast]);

  return {
    permission,
    fcmToken,
    requestPermission,
    regenerateToken,
    isRegenerating,
  };
}
