import { ref, get } from "firebase/database";
import { database, efeedDatabase, profileNotasDatabase } from "@/lib/firebase";
import { createNotification, createNotificationForUsers } from "@/lib/useNotifications";
import { getAuth } from "firebase/auth";

/**
 * Send a push notification via FCM
 * Note: This is a best-effort attempt - in-app notifications will still work if push fails
 */
async function sendPushNotification(
  recipientUid: string,
  title: string,
  body: string,
  data?: Record<string, string>
) {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      console.warn("⚠️  Cannot send push notification: user not authenticated");
      return;
    }

    const token = await user.getIdToken();
    
    const response = await fetch("/api/notifications/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        recipientUid,
        title,
        body,
        data,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        console.log("✅ Push notification sent successfully");
      } else {
        console.warn("⚠️  Push notification not sent:", result.message);
      }
    } else {
      const errorData = await response.json().catch(() => null);
      console.warn("⚠️  Push notification failed (in-app notification still works):", errorData?.message || "Unknown error");
    }
  } catch (error) {
    console.warn("⚠️  Push notification failed (in-app notification still works):", error);
  }
}

/**
 * Trigger notification when someone likes a post on Efeed
 */
export async function notifyPostLike(
  postAuthorUid: string,
  likerUid: string,
  likerName: string,
  postPreview: string
) {
  // Don't notify if user likes their own post
  if (postAuthorUid === likerUid) return;

  try {
    // Create in-app notification
    await createNotification(postAuthorUid, {
      type: "efeed_post",
      title: `${likerName} curtiu seu post`,
      message: postPreview.substring(0, 100) + (postPreview.length > 100 ? '...' : ''),
      data: {},
    });

    // Send push notification
    await sendPushNotification(
      postAuthorUid,
      "Nova curtida",
      `${likerName} curtiu seu post: ${postPreview.substring(0, 50)}${postPreview.length > 50 ? '...' : ''}`,
      {
        type: "like",
        postPreview: postPreview.substring(0, 50),
      }
    );
  } catch (error) {
    console.error("Error sending like notification:", error);
  }
}

/**
 * Trigger notification when a student sends a message to a teacher
 */
export async function notifyTeacherOfNewMessage(
  teacherId: string,
  studentId: string,
  studentName: string,
  studentPhoto: string | undefined,
  messagePreview: string,
  chatId: string
) {
  try {
    // Create in-app notification
    await createNotification(teacherId, {
      type: "message",
      title: "Nova mensagem",
      message: `${studentName}: ${messagePreview.substring(0, 50)}${messagePreview.length > 50 ? '...' : ''}`,
      data: {
        chatId,
        senderId: studentId,
        senderName: studentName,
        senderPhoto: studentPhoto || "",
      },
    });

    // Send push notification
    await sendPushNotification(
      teacherId,
      "Nova mensagem",
      `${studentName}: ${messagePreview.substring(0, 50)}${messagePreview.length > 50 ? '...' : ''}`,
      {
        type: "message",
        chatId,
        senderId: studentId,
      }
    );
  } catch (error) {
    console.error("Error creating message notification:", error);
  }
}

/**
 * Trigger notification when a verified teacher posts on Efeed
 */
export async function notifyFollowersOfNewPost(
  authorId: string,
  authorName: string,
  authorPhoto: string | undefined,
  postPreview: string,
  postId: string,
  isAuthorVerified: boolean
) {
  // Only send notifications if author is verified (teacher)
  if (!isAuthorVerified) {
    return;
  }

  try {
    // Get followers from efeedDatabase
    const followersRef = ref(efeedDatabase, `followRelationships`);
    const followersSnapshot = await get(followersRef);
    
    if (!followersSnapshot.exists()) {
      return;
    }

    const followRelationships = followersSnapshot.val();
    const followerIds: string[] = [];

    // Find all users who follow this author
    Object.entries(followRelationships).forEach(([userId, following]: [string, any]) => {
      if (following && following[authorId]) {
        followerIds.push(userId);
      }
    });

    if (followerIds.length === 0) {
      return;
    }

    // Send notifications to all followers
    await createNotificationForUsers(followerIds, {
      type: "efeed_post",
      title: `Novo post de ${authorName}`,
      message: postPreview.substring(0, 100) + (postPreview.length > 100 ? '...' : ''),
      data: {
        postId,
        senderId: authorId,
        senderName: authorName,
        senderPhoto: authorPhoto || "",
      },
    });

    console.log(`✅ Sent post notifications to ${followerIds.length} followers`);
  } catch (error) {
    console.error("Error creating post notification:", error);
  }
}

/**
 * Trigger notification when a teacher sends a message to a student
 */
export async function notifyStudentOfTeacherMessage(
  studentId: string,
  teacherId: string,
  teacherName: string,
  teacherPhoto: string | undefined,
  messagePreview: string,
  chatId: string
) {
  try {
    // Create in-app notification
    await createNotification(studentId, {
      type: "message",
      title: `Mensagem de ${teacherName}`,
      message: messagePreview.substring(0, 50) + (messagePreview.length > 50 ? '...' : ''),
      data: {
        chatId,
        senderId: teacherId,
        senderName: teacherName,
        senderPhoto: teacherPhoto || "",
      },
    });

    // Send push notification
    await sendPushNotification(
      studentId,
      `Mensagem de ${teacherName}`,
      messagePreview.substring(0, 50) + (messagePreview.length > 50 ? '...' : ''),
      {
        type: "message",
        chatId,
        senderId: teacherId,
      }
    );
  } catch (error) {
    console.error("Error creating teacher message notification:", error);
  }
}

/**
 * Trigger notification when anyone sends a message in chat
 */
export async function notifyMessageReceived(
  recipientUid: string,
  senderUid: string,
  senderName: string,
  senderPhoto: string | undefined,
  messagePreview: string,
  chatId: string
) {
  // Don't notify if user messages themselves
  if (recipientUid === senderUid) return;

  try {
    // Create in-app notification
    await createNotification(recipientUid, {
      type: "message",
      title: `Nova mensagem de ${senderName}`,
      message: messagePreview.substring(0, 50) + (messagePreview.length > 50 ? '...' : ''),
      data: {
        chatId,
        senderId: senderUid,
        senderName: senderName,
        senderPhoto: senderPhoto || "",
      },
    });

    // Send push notification
    await sendPushNotification(
      recipientUid,
      `Mensagem de ${senderName}`,
      messagePreview.substring(0, 50) + (messagePreview.length > 50 ? '...' : ''),
      {
        type: "message",
        chatId,
        senderId: senderUid,
      }
    );
  } catch (error) {
    console.error("Error creating message notification:", error);
  }
}

/**
 * Trigger notification for new grade
 */
export async function notifyStudentOfNewGrade(
  studentId: string,
  subject: string,
  grade: number
) {
  try {
    // Create in-app notification
    await createNotification(studentId, {
      type: "grade",
      title: "Nova nota disponível",
      message: `Sua nota de ${subject} foi adicionada: ${grade.toFixed(1)}`,
      data: {},
    });

    // Send push notification
    await sendPushNotification(
      studentId,
      "Nova nota disponível",
      `Sua nota de ${subject} foi adicionada: ${grade.toFixed(1)}`,
      {
        type: "grade",
        subject,
        grade: grade.toString(),
      }
    );
  } catch (error) {
    console.error("Error creating grade notification:", error);
  }
}

/**
 * Trigger notification when someone sends a message in a group chat (Grupo da Turma)
 */
export async function notifyGroupChatMessage(
  gradeGroup: string,
  senderUid: string,
  senderName: string,
  senderPhoto: string | undefined,
  messagePreview: string
) {
  try {
    // Get all users in this grade group (from permanent database)
    const usersRef = ref(profileNotasDatabase, "users");
    const usersSnapshot = await get(usersRef);
    
    if (!usersSnapshot.exists()) {
      return;
    }

    const allUsers = usersSnapshot.val();
    const groupMemberIds: string[] = [];

    // Find all users who are in this grade group
    Object.entries(allUsers).forEach(([userId, userData]: [string, any]) => {
      // Don't notify the sender
      if (userId === senderUid) return;

      // Check if user is in this grade group
      if (userData.grade === gradeGroup) {
        groupMemberIds.push(userId);
      }
    });

    if (groupMemberIds.length === 0) {
      console.log(`No members found in grade group: ${gradeGroup}`);
      return;
    }

    console.log(`Sending group message notifications to ${groupMemberIds.length} members in ${gradeGroup}`);

    // Send in-app notifications to all group members
    await createNotificationForUsers(groupMemberIds, {
      type: "message",
      title: `Grupo da Turma: ${senderName}`,
      message: messagePreview.substring(0, 100) + (messagePreview.length > 100 ? '...' : ''),
      data: {
        senderId: senderUid,
        senderName: senderName,
        senderPhoto: senderPhoto || "",
      },
    });

    // Send push notifications to all group members
    for (const memberId of groupMemberIds) {
      await sendPushNotification(
        memberId,
        `Grupo da Turma`,
        `${senderName}: ${messagePreview.substring(0, 50)}${messagePreview.length > 50 ? '...' : ''}`,
        {
          type: "group_message",
          gradeGroup,
          senderId: senderUid,
        }
      );
    }

    console.log(`✅ Sent group message notifications to ${groupMemberIds.length} members`);
  } catch (error) {
    console.error("Error sending group chat notification:", error);
  }
}
