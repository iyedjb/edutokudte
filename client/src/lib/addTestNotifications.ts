import { ref, push } from "firebase/database";
import { database } from "@/lib/firebase";

// Function to add test notifications to a user
export async function addTestNotifications(userId: string) {
  const notifications = [
    {
      type: "message",
      title: "Nova mensagem",
      message: "Você recebeu uma nova mensagem de João Silva",
      read: false,
      timestamp: Date.now() - 1000 * 60 * 5, // 5 minutes ago
      data: {
        senderId: "test123",
        senderName: "João Silva",
        senderPhoto: "",
        chatId: "chat123"
      }
    },
    {
      type: "efeed_post",
      title: "Novo post do Professor",
      message: "Prof. Maria postou um novo conteúdo sobre Matemática",
      read: false,
      timestamp: Date.now() - 1000 * 60 * 30, // 30 minutes ago
      data: {
        senderId: "prof123",
        senderName: "Prof. Maria",
        senderPhoto: "",
        postId: "post123"
      }
    },
    {
      type: "grade",
      title: "Nova nota disponível",
      message: "Sua nota de Matemática foi adicionada: 8.5",
      read: true,
      timestamp: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
      data: {}
    }
  ];

  const notificationsRef = ref(database, `notifications/${userId}`);
  
  for (const notification of notifications) {
    await push(notificationsRef, {
      ...notification,
      userId,
    });
  }
  
  console.log("✅ Test notifications added!");
}
