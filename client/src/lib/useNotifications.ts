import { useState, useEffect } from "react";
import { ref, onValue, push, update, query, orderByChild, limitToLast, get } from "firebase/database";
import { database } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";

export interface Notification {
  id: string;
  userId: string;
  type: "message" | "efeed_post" | "grade" | "assignment" | "general";
  title: string;
  message: string;
  read: boolean;
  timestamp: number;
  data?: {
    chatId?: string;
    postId?: string;
    senderId?: string;
    senderName?: string;
    senderPhoto?: string;
  };
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);

    const notificationsRef = query(
      ref(database, `notifications/${user.uid}`),
      orderByChild("timestamp"),
      limitToLast(50)
    );

    const unsubscribe = onValue(notificationsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const notificationsList: Notification[] = Object.entries(data).map(
          ([id, notification]: [string, any]) => ({
            id,
            ...notification,
          })
        );
        
        notificationsList.sort((a, b) => b.timestamp - a.timestamp);
        
        setNotifications(notificationsList);
        setUnreadCount(notificationsList.filter((n) => !n.read).length);
      } else {
        setNotifications([]);
        setUnreadCount(0);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const markAsRead = async (notificationId: string) => {
    if (!user?.uid) return;

    const notificationRef = ref(database, `notifications/${user.uid}/${notificationId}`);
    await update(notificationRef, { read: true });
  };

  const markAllAsRead = async () => {
    if (!user?.uid || notifications.length === 0) return;

    const updates: Record<string, any> = {};
    notifications
      .filter((n) => !n.read)
      .forEach((notification) => {
        updates[`notifications/${user.uid}/${notification.id}/read`] = true;
      });

    if (Object.keys(updates).length > 0) {
      await update(ref(database), updates);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    if (!user?.uid) return;

    const notificationRef = ref(database, `notifications/${user.uid}/${notificationId}`);
    await update(notificationRef, { deleted: true });
  };

  return {
    notifications: notifications.filter((n) => !(n as any).deleted),
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}

export async function createNotification(
  userId: string,
  notification: Omit<Notification, "id" | "userId" | "timestamp" | "read">
) {
  const notificationsRef = ref(database, `notifications/${userId}`);
  
  await push(notificationsRef, {
    ...notification,
    userId,
    read: false,
    timestamp: Date.now(),
  });
}

export async function createNotificationForUsers(
  userIds: string[],
  notification: Omit<Notification, "id" | "userId" | "timestamp" | "read">
) {
  const updates: Record<string, any> = {};
  
  userIds.forEach((userId) => {
    const notificationRef = push(ref(database, `notifications/${userId}`));
    const notificationId = notificationRef.key;
    
    if (notificationId) {
      updates[`notifications/${userId}/${notificationId}`] = {
        ...notification,
        userId,
        read: false,
        timestamp: Date.now(),
      };
    }
  });

  if (Object.keys(updates).length > 0) {
    await update(ref(database), updates);
  }
}

export async function getFollowers(userId: string): Promise<string[]> {
  const followersRef = ref(database, `followers/${userId}`);
  const snapshot = await get(followersRef);
  
  if (snapshot.exists()) {
    return Object.keys(snapshot.val());
  }
  
  return [];
}
