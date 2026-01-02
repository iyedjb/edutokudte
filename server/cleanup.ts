import admin from "firebase-admin";

// 29 days in milliseconds
const CLEANUP_INTERVAL_MS = 29 * 24 * 60 * 60 * 1000;

export interface CleanupStats {
  messagesDeleted: number;
  directMessagesDeleted: number;
  postsDeleted: number;
  timestamp: number;
  error?: string;
}

/**
 * Delete messages older than 29 days from class chats
 */
async function cleanupClassMessages(
  db: admin.database.Database
): Promise<number> {
  let totalDeleted = 0;
  const thirtyDaysAgo = Date.now() - CLEANUP_INTERVAL_MS;

  try {
    // Get all classes
    const classesRef = db.ref("classes");
    const classesSnapshot = await classesRef.once("value");
    
    if (!classesSnapshot.exists()) return 0;

    const classesData = classesSnapshot.val();
    
    // For each class, delete old messages
    for (const classId of Object.keys(classesData)) {
      const messagesRef = db.ref(`chats/${classId}/messages`);
      const messagesSnapshot = await messagesRef.once("value");
      
      if (!messagesSnapshot.exists()) continue;

      const messages = messagesSnapshot.val();
      const updates: Record<string, null> = {};

      for (const messageId of Object.keys(messages)) {
        const message = messages[messageId];
        if (message.timestamp && message.timestamp < thirtyDaysAgo) {
          updates[messageId] = null; // Delete by setting to null
          totalDeleted++;
        }
      }

      // Batch delete
      if (Object.keys(updates).length > 0) {
        await messagesRef.update(updates);
      }
    }
  } catch (error) {
    console.error("Error cleaning up class messages:", error);
  }

  return totalDeleted;
}

/**
 * Delete direct messages older than 29 days
 */
async function cleanupDirectMessages(
  db: admin.database.Database
): Promise<number> {
  let totalDeleted = 0;
  const thirtyDaysAgo = Date.now() - CLEANUP_INTERVAL_MS;

  try {
    const directMessagesRef = db.ref("directMessages");
    const snapshot = await directMessagesRef.once("value");
    
    if (!snapshot.exists()) return 0;

    const allChats = snapshot.val();

    for (const chatRoomId of Object.keys(allChats)) {
      const chatRef = db.ref(`directMessages/${chatRoomId}`);
      const chatSnapshot = await chatRef.once("value");
      
      if (!chatSnapshot.exists()) continue;

      const messages = chatSnapshot.val();
      const updates: Record<string, null> = {};

      for (const messageId of Object.keys(messages)) {
        const message = messages[messageId];
        if (message.timestamp && message.timestamp < thirtyDaysAgo) {
          updates[messageId] = null;
          totalDeleted++;
        }
      }

      if (Object.keys(updates).length > 0) {
        await chatRef.update(updates);
      }
    }
  } catch (error) {
    console.error("Error cleaning up direct messages:", error);
  }

  return totalDeleted;
}

/**
 * Delete efeed posts older than 29 days
 */
async function cleanupEfeedPosts(
  db: admin.database.Database
): Promise<number> {
  let totalDeleted = 0;
  const thirtyDaysAgo = Date.now() - CLEANUP_INTERVAL_MS;

  try {
    const postsRef = db.ref("efeedPosts");
    const snapshot = await postsRef.once("value");
    
    if (!snapshot.exists()) return 0;

    const posts = snapshot.val();
    const updates: Record<string, null> = {};

    for (const postId of Object.keys(posts)) {
      const post = posts[postId];
      if (post.timestamp && post.timestamp < thirtyDaysAgo) {
        updates[postId] = null;
        totalDeleted++;
      }
    }

    if (Object.keys(updates).length > 0) {
      await postsRef.update(updates);
    }
  } catch (error) {
    console.error("Error cleaning up efeed posts:", error);
  }

  return totalDeleted;
}

/**
 * Run all cleanup operations
 */
export async function runCleanup(
  db: admin.database.Database
): Promise<CleanupStats> {
  const stats: CleanupStats = {
    messagesDeleted: 0,
    directMessagesDeleted: 0,
    postsDeleted: 0,
    timestamp: Date.now(),
  };

  try {
    console.log("🧹 Starting Firebase cleanup (29-day retention)...");

    stats.messagesDeleted = await cleanupClassMessages(db);
    stats.directMessagesDeleted = await cleanupDirectMessages(db);
    stats.postsDeleted = await cleanupEfeedPosts(db);

    console.log(
      `✅ Cleanup complete: ${stats.messagesDeleted} class messages, ${stats.directMessagesDeleted} direct messages, ${stats.postsDeleted} posts deleted`
    );
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
    stats.error = error instanceof Error ? error.message : "Unknown error";
  }

  return stats;
}

/**
 * Schedule cleanup to run every 29 days
 */
export function scheduleCleanup(db: admin.database.Database): void {
  // Run cleanup immediately on startup
  runCleanup(db).catch(console.error);

  // Schedule to run every 29 days (in milliseconds)
  setInterval(() => {
    runCleanup(db).catch(console.error);
  }, CLEANUP_INTERVAL_MS);

  console.log("📅 Firebase cleanup scheduled to run every 29 days");
}
