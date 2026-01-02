import type { Express } from "express";
import { createServer, type Server } from "http";
import Groq from "groq-sdk";
import admin from "firebase-admin";
import crypto from "crypto";
import { scheduleCleanup, runCleanup } from "./cleanup";

// ============================================================================
// Configuration Validation Helper
// ============================================================================

interface ConfigStatus {
  firebaseAdmin: boolean;
  educfy2: boolean;
  groqAI: boolean;
  missingSecrets: string[];
}

function validateConfiguration(): ConfigStatus {
  const status: ConfigStatus = {
    firebaseAdmin: false,
    educfy2: false,
    groqAI: false,
    missingSecrets: [],
  };

  // Check Firebase Admin SDK requirements
  if (!process.env.FIREBASE_PRIVATE_KEY) status.missingSecrets.push("FIREBASE_PRIVATE_KEY");
  if (!process.env.FIREBASE_CLIENT_EMAIL) status.missingSecrets.push("FIREBASE_CLIENT_EMAIL");
  if (!process.env.FIREBASE_PROJECT_ID) status.missingSecrets.push("FIREBASE_PROJECT_ID");
  
  // Check Groq AI requirements
  if (!process.env.GROQ_API_KEY) status.missingSecrets.push("GROQ_API_KEY");

  return status;
}

const configStatus = validateConfiguration();

// Initialize Firebase Admin SDK (optional - only if credentials are available)
let db: admin.database.Database | null = null;
let educfy2App: admin.app.App | null = null;
let educfy2Db: admin.database.Database | null = null;

// Hash function matching frontend SHA-256 implementation
function hashString(str: string): string {
  return crypto.createHash("sha256").update(str).digest("hex");
}

// ============================================================================
// Firebase Admin SDK Initialization
// ============================================================================

// Helper function to process and validate Firebase private key
function processFirebasePrivateKey(rawKey: string): string {
  if (!rawKey) return '';
  
  // Handle both formats: with escaped newlines (\n as string) or literal newlines
  let processed = rawKey;
  
  // If the key contains literal \n strings (from Coolify env vars), convert to actual newlines
  if (processed.includes('\\n')) {
    processed = processed.replace(/\\n/g, '\n');
  }
  
  // Ensure key has proper formatting
  if (!processed.includes('-----BEGIN PRIVATE KEY-----')) {
    console.error('❌ Invalid private key format: missing BEGIN marker');
    return '';
  }
  
  if (!processed.includes('-----END PRIVATE KEY-----')) {
    console.error('❌ Invalid private key format: missing END marker');
    return '';
  }
  
  return processed;
}

try {
  const hasFirebaseCredentials = 
    process.env.FIREBASE_PRIVATE_KEY && 
    process.env.FIREBASE_CLIENT_EMAIL && 
    process.env.FIREBASE_PROJECT_ID;

  if (!admin.apps.length && hasFirebaseCredentials) {
    const processedPrivateKey = processFirebasePrivateKey(process.env.FIREBASE_PRIVATE_KEY!);
    
    if (!processedPrivateKey) {
      throw new Error('Firebase private key is invalid or malformed');
    }
    
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        privateKey: processedPrivateKey,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      }),
      databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`,
    });
    db = admin.database();
    configStatus.firebaseAdmin = true;
    console.log("✅ Firebase Admin SDK initialized");

    // Schedule automatic cleanup every 29 days
    scheduleCleanup(db);

    // Initialize secondary app for educfy2 database (for authIndex and student login)
    try {
      const educfy2ProjectId = process.env.FIREBASE_EDUCFY2_PROJECT_ID || "educfy2";
      const educfy2DatabaseUrl = process.env.FIREBASE_EDUCFY2_DATABASE_URL || `https://${educfy2ProjectId}-default-rtdb.firebaseio.com`;
      
      educfy2App = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: educfy2ProjectId,
          privateKey: processedPrivateKey,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        }),
        databaseURL: educfy2DatabaseUrl,
      }, "educfy2");
      educfy2Db = educfy2App.database();
      configStatus.educfy2 = true;
      console.log("✅ Educfy2 Firebase Admin SDK initialized");
    } catch (educfy2Error: any) {
      console.warn("⚠️  Educfy2 Firebase Admin SDK not initialized:", educfy2Error.message || educfy2Error);
    }
  } else {
    console.log("ℹ️  Firebase Admin SDK not configured (optional for LGPD features)");
    if (configStatus.missingSecrets.length > 0) {
      console.log("   Missing secrets:", configStatus.missingSecrets.filter(s => s.startsWith("FIREBASE")).join(", "));
    }
  }
} catch (error: any) {
  console.warn("⚠️  Firebase Admin SDK initialization error:", error.message || error);
}

// ============================================================================
// Groq AI Client Initialization
// ============================================================================

let groq: Groq | null = null;

if (process.env.GROQ_API_KEY) {
  const trimmedKey = process.env.GROQ_API_KEY.trim();
  if (trimmedKey.length === 0) {
    console.warn("⚠️  GROQ_API_KEY is empty after trimming - AI features will be disabled");
  } else {
    try {
      groq = new Groq({
        apiKey: trimmedKey,
      });
      configStatus.groqAI = true;
      console.log("✅ Groq AI client initialized (key length: " + trimmedKey.length + " chars)");
    } catch (error: any) {
      console.error("❌ Failed to initialize Groq AI client:", error.message);
      console.warn("⚠️  AI features will be disabled");
    }
  }
} else {
  console.warn("⚠️  GROQ_API_KEY not set - AI features will be disabled");
}

// Log configuration summary
console.log("\n📋 Configuration Status:");
console.log(`   Firebase Admin: ${configStatus.firebaseAdmin ? "✅ Ready" : "❌ Not configured"}`);
console.log(`   Educfy2 Database: ${configStatus.educfy2 ? "✅ Ready" : "❌ Not configured"}`);
console.log(`   Groq AI: ${configStatus.groqAI ? "✅ Ready" : "❌ Not configured"}`);
if (configStatus.missingSecrets.length > 0) {
  console.log(`   ⚠️  Missing secrets: ${configStatus.missingSecrets.join(", ")}`);
}
console.log("");

// Cleanup expired stories (older than 24 hours)
async function cleanupExpiredStories() {
  if (!db) return;
  
  try {
    const storiesRef = db.ref('stories');
    const snapshot = await storiesRef.once('value');
    const stories = snapshot.val() || {};
    
    const now = Date.now();
    const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
    
    let deletedCount = 0;
    
    for (const [storyId, story] of Object.entries(stories)) {
      const storyData = story as any;
      if (storyData.timestamp && storyData.timestamp < twentyFourHoursAgo) {
        await db.ref(`stories/${storyId}`).remove();
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      console.log(`🗑️  Deleted ${deletedCount} expired stories`);
    }
  } catch (error) {
    console.error("Error cleaning up expired stories:", error);
  }
}

// Run cleanup every hour
if (db) {
  setInterval(cleanupExpiredStories, 60 * 60 * 1000);
  cleanupExpiredStories();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Note: We're using client-side Firebase SDK for most data operations
  // All RTDB operations are handled on the frontend
  // Server-side routes are only for operations requiring elevated permissions

  // ============================================================================
  // Firebase Configuration Endpoint (for Service Worker)
  // ============================================================================
  
  app.get("/api/firebase-config", (req, res) => {
    // Return Firebase configuration for the service worker
    // Note: Firebase web API keys are public and safe to expose
    const primaryProjectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "gepo-86dbb";
    const storageBucket = process.env.VITE_FIREBASE_STORAGE_BUCKET || `${primaryProjectId}.firebasestorage.app`;
    
    const config = {
      apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyAl4zVbM1w38lINLxSpBxM0ymgvqTH3LMU",
      authDomain: `${primaryProjectId}.firebaseapp.com`,
      databaseURL: `https://${primaryProjectId}-default-rtdb.firebaseio.com`,
      projectId: primaryProjectId,
      storageBucket: storageBucket,
      messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "858231278875",
      appId: process.env.VITE_FIREBASE_APP_ID || "1:858231278875:web:3ab3b12c030fee60cb57be"
    };
    
    res.json(config);
  });

  // ============================================================================
  // Configuration Status Endpoint (for debugging)
  // ============================================================================
  
  app.get("/api/config-status", (req, res) => {
    const status = {
      timestamp: new Date().toISOString(),
      services: {
        firebase: configStatus.firebaseAdmin ? "✅ Ready" : "❌ Not configured",
        educfy2: configStatus.educfy2 ? "✅ Ready" : "❌ Not configured",
        groqAI: configStatus.groqAI ? "✅ Ready" : "❌ Not configured",
        groqAPIKeySet: !!process.env.GROQ_API_KEY,
        groqAPIKeyLength: process.env.GROQ_API_KEY?.trim().length || 0,
      },
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        hasGroqKey: !!process.env.GROQ_API_KEY,
      },
      missingSecrets: configStatus.missingSecrets
    };
    res.json(status);
  });

  // ============================================================================
  // Firebase Data Cleanup Endpoint (Manual Trigger)
  // ============================================================================
  
  app.post("/api/admin/cleanup-data", async (req, res) => {
    if (!db) {
      return res.status(503).json({
        error: "Firebase not configured",
        message: "Firebase Admin SDK is not initialized"
      });
    }

    try {
      // Verify this is a legitimate admin request (add your own auth logic here)
      const adminKey = req.headers["x-admin-key"];
      if (adminKey !== process.env.ADMIN_CLEANUP_KEY && process.env.ADMIN_CLEANUP_KEY) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const stats = await runCleanup(db);
      
      res.json({
        success: true,
        message: "Firebase cleanup completed successfully",
        stats
      });
    } catch (error: any) {
      console.error("Cleanup error:", error);
      res.status(500).json({
        error: "Cleanup failed",
        message: error.message
      });
    }
  });

  // ============================================================================
  // Student CPF/Birthdate Login Route
  // ============================================================================

  app.post("/api/auth/student-login", async (req, res) => {
    try {
      const { cpf, birthdate } = req.body;

      if (!cpf || !birthdate) {
        return res.status(400).json({
          success: false,
          error: "CPF e data de nascimento são obrigatórios",
        });
      }

      // Check if educfy2 database is available
      if (!educfy2Db || !educfy2App) {
        return res.status(503).json({
          success: false,
          error: "Serviço de autenticação temporariamente indisponível",
          message: "O login por CPF não está configurado. Use email e senha.",
        });
      }

      // Clean and hash the CPF
      const cleanCpf = cpf.replace(/\D/g, "");
      if (cleanCpf.length !== 11) {
        return res.status(400).json({
          success: false,
          error: "CPF inválido",
        });
      }

      const cpfHash = hashString(cleanCpf);
      const birthdateHash = hashString(birthdate);

      console.log(`📱 Student login attempt with CPF hash: ${cpfHash.substring(0, 8)}...`);

      // Look up in authIndex
      const authIndexRef = educfy2Db.ref(`authIndex/students/${cpfHash}`);
      const authSnapshot = await authIndexRef.once("value");

      if (!authSnapshot.exists()) {
        console.log(`❌ No student found with CPF hash: ${cpfHash.substring(0, 8)}...`);
        return res.status(401).json({
          success: false,
          error: "CPF não encontrado",
          message: "Nenhum aluno cadastrado com esse CPF. Verifique com a secretaria da sua escola.",
        });
      }

      const authData = authSnapshot.val();

      // Verify birthdate hash matches
      if (authData.birthdateHash !== birthdateHash) {
        console.log(`❌ Birthdate mismatch for CPF hash: ${cpfHash.substring(0, 8)}...`);
        return res.status(401).json({
          success: false,
          error: "Data de nascimento incorreta",
          message: "A data de nascimento não confere. Tente novamente.",
        });
      }

      // Check if student is active
      if (authData.active === false) {
        return res.status(403).json({
          success: false,
          error: "Conta desativada",
          message: "Sua conta foi desativada. Entre em contato com a secretaria da escola.",
        });
      }

      // Get student data from secretaria
      const { schoolId, uid: secretariaStudentId } = authData;
      const studentRef = educfy2Db.ref(`secretaria/schools/${schoolId}/students/${secretariaStudentId}`);
      const studentSnapshot = await studentRef.once("value");

      if (!studentSnapshot.exists()) {
        return res.status(404).json({
          success: false,
          error: "Dados do aluno não encontrados",
          message: "Houve um problema ao carregar seus dados. Entre em contato com a secretaria.",
        });
      }

      const studentData = studentSnapshot.val();

      // Create a unique UID for this student based on CPF hash
      // This ensures the same student always gets the same Firebase UID
      const studentUid = `student_${cpfHash.substring(0, 16)}`;

      // Create a custom Firebase token for the student
      // Check if Firebase Admin SDK is initialized before calling auth()
      if (!db) {
        return res.status(503).json({
          success: false,
          error: "Serviço de autenticação indisponível",
          message: "Firebase Admin SDK não está configurado. Configure as variáveis de ambiente necessárias.",
        });
      }

      const customToken = await admin.auth().createCustomToken(studentUid, {
        type: "student",
        schoolId,
        secretariaStudentId,
        name: studentData.name,
      });

      console.log(`✅ Student login successful: ${studentData.name} (${studentUid})`);

      res.json({
        success: true,
        customToken,
        student: {
          uid: studentUid,
          name: studentData.name,
          schoolId,
          secretariaStudentId,
          grade: studentData.grade || "",
          school: studentData.schoolName || "",
        },
      });
    } catch (error: any) {
      console.error("Student login error:", error);
      res.status(500).json({
        success: false,
        error: "Erro interno do servidor",
        message: "Ocorreu um erro ao processar o login. Tente novamente.",
      });
    }
  });

  // ============================================================================
  // LGPD Compliance Routes
  // ============================================================================

  // Helper function to verify Firebase ID token
  async function verifyAuthToken(authHeader: string | undefined): Promise<string | null> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn("No authorization header provided");
      return null;
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    try {
      // Verify Firebase Admin SDK is initialized
      if (!db || !admin.apps.length) {
        console.error("Firebase Admin SDK not initialized - cannot verify token");
        return null;
      }
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      console.log(`✅ Token verified for user: ${decodedToken.uid}`);
      return decodedToken.uid;
    } catch (error) {
      console.error("Token verification failed:", error);
      return null;
    }
  }

  // Save consent preferences
  app.post("/api/consent", async (req, res) => {
    try {
      const { analytics, marketing, functional, timestamp } = req.body;
      
      // If Firebase Admin is configured, verify authentication
      // Otherwise, accept consent (it will be saved client-side only)
      let authenticatedUid: string | null = null;
      
      if (db) {
        authenticatedUid = await verifyAuthToken(req.headers.authorization);
        
        if (!authenticatedUid) {
          return res.status(401).json({ error: "Autenticação necessária" });
        }

        const consentData = {
          analytics: analytics || false,
          marketing: marketing || false,
          functional: functional !== false,
          timestamp: timestamp || Date.now(),
          ipAddress: req.ip || req.socket.remoteAddress,
        };

        // Save consent to user profile
        await db.ref(`users/${authenticatedUid}/lgpdConsent`).set(consentData);

        // Also log consent for audit trail
        await db.ref(`consentLog/${authenticatedUid}`).push({
          ...consentData,
          action: "consent_given",
        });

        res.json({ success: true, message: "Consentimento salvo com sucesso" });
      } else {
        // Firebase Admin not configured - consent saved client-side only
        console.log("Consent received (saved client-side only, Firebase Admin not configured)");
        res.json({ success: true, message: "Consentimento salvo localmente" });
      }
    } catch (error: any) {
      console.error("Error saving consent:", error);
      res.status(500).json({ error: "Erro ao salvar consentimento" });
    }
  });

  // Export user data (LGPD data portability)
  app.post("/api/lgpd/export-data", async (req, res) => {
    try {
      // Verify authentication
      const authenticatedUid = await verifyAuthToken(req.headers.authorization);
      
      if (!authenticatedUid) {
        return res.status(401).json({ 
          error: "Autenticação necessária",
          message: "Você precisa estar autenticado para exportar seus dados"
        });
      }

      if (!db) {
        return res.status(503).json({ 
          error: "Serviço temporariamente indisponível",
          message: "A exportação de dados requer configuração adicional do servidor. Entre em contato com dpo@edutok.vuro.com.br"
        });
      }

      // Only allow users to export their own data
      const uid = authenticatedUid;

      // Collect all user data from different nodes
      const userData: any = {};

      // User profile
      const userSnapshot = await db.ref(`users/${uid}`).once('value');
      userData.profile = userSnapshot.val();

      // Grades
      const gradesSnapshot = await db.ref(`grades/${uid}`).once('value');
      userData.grades = gradesSnapshot.val() || {};

      // Direct messages
      const messagesSnapshot = await db.ref(`directMessages`).once('value');
      const allMessages = messagesSnapshot.val() || {};
      userData.directMessages = {};
      
      Object.keys(allMessages).forEach((chatRoomId) => {
        if (chatRoomId.includes(uid)) {
          userData.directMessages[chatRoomId] = allMessages[chatRoomId];
        }
      });

      // Videos uploaded by user
      const videosSnapshot = await db.ref(`videos`).once('value');
      const allVideos = videosSnapshot.val() || {};
      userData.videosUploaded = Object.keys(allVideos)
        .filter(key => allVideos[key].uploaderUid === uid)
        .map(key => ({ id: key, ...allVideos[key] }));

      // Comments made by user
      userData.comments = [];
      Object.keys(allVideos).forEach(videoId => {
        const video = allVideos[videoId];
        if (video.comments) {
          Object.keys(video.comments).forEach(commentId => {
            const comment = video.comments[commentId];
            if (comment.uid === uid) {
              userData.comments.push({
                videoId,
                commentId,
                ...comment,
              });
            }
          });
        }
      });

      // Consent history
      const consentSnapshot = await db.ref(`consentLog/${uid}`).once('value');
      userData.consentHistory = consentSnapshot.val() || {};

      // Add metadata
      userData.exportMetadata = {
        exportDate: new Date().toISOString(),
        exportedBy: uid,
        dataFormat: "JSON",
        lgpdCompliance: true,
      };

      // Return as downloadable JSON
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="dados-edutok-${uid}.json"`);
      res.json(userData);
    } catch (error: any) {
      console.error("Error exporting data:", error);
      res.status(500).json({ error: "Erro ao exportar dados" });
    }
  });

  // Delete user account (LGPD right to deletion)
  app.delete("/api/lgpd/delete-account", async (req, res) => {
    try {
      // Verify authentication
      const authenticatedUid = await verifyAuthToken(req.headers.authorization);
      
      if (!authenticatedUid) {
        return res.status(401).json({ 
          error: "Autenticação necessária",
          message: "Você precisa estar autenticado para excluir sua conta"
        });
      }

      if (!db) {
        return res.status(503).json({ 
          error: "Serviço temporariamente indisponível",
          message: "A exclusão de conta requer configuração adicional do servidor. Entre em contato com dpo@edutok.vuro.com.br para processar sua solicitação manualmente."
        });
      }

      // Only allow users to delete their own account
      const uid = authenticatedUid;

      // Log deletion request
      await db.ref(`deletionRequests/${uid}`).set({
        requestedAt: Date.now(),
        status: "pending",
        scheduledDeletion: Date.now() + (15 * 24 * 60 * 60 * 1000), // 15 days
      });

      // Note: Actual deletion would be handled by a scheduled job
      // For now, we just mark for deletion
      await db.ref(`users/${uid}/accountStatus`).set({
        status: "pending_deletion",
        deletionRequestedAt: Date.now(),
        scheduledDeletionDate: Date.now() + (15 * 24 * 60 * 60 * 1000),
      });

      res.json({ 
        success: true, 
        message: "Solicitação de exclusão registrada. Sua conta será excluída em 15 dias.",
        scheduledDeletion: new Date(Date.now() + (15 * 24 * 60 * 60 * 1000)).toISOString(),
      });
    } catch (error: any) {
      console.error("Error processing deletion request:", error);
      res.status(500).json({ error: "Erro ao processar solicitação de exclusão" });
    }
  });

  // ============================================================================
  // Profile Picture Moderation Route
  // ============================================================================
  
  app.post("/api/profile/upload-picture", async (req, res) => {
    try {
      // Verify authentication
      const authenticatedUid = await verifyAuthToken(req.headers.authorization);
      
      if (!authenticatedUid) {
        return res.status(401).json({ 
          error: "Unauthorized",
          message: "Você precisa estar autenticado para atualizar sua foto de perfil."
        });
      }

      // Check if Groq AI is available
      if (!groq) {
        console.error("Groq AI client not initialized");
        return res.status(503).json({ 
          error: "AI service not available",
          message: "O serviço de IA não está disponível. Configure a chave GROQ_API_KEY."
        });
      }

      const { image } = req.body;

      // Validate inputs
      if (!image) {
        return res.status(400).json({ error: "Image is required" });
      }

      // Validate image format
      if (!image.startsWith('data:image/')) {
        return res.status(400).json({ 
          error: "Invalid image format. Expected data URL starting with 'data:image/'" 
        });
      }

      console.log("Processing profile picture upload for user:", authenticatedUid, "Image size:", image.length, "bytes");

      // Use Groq vision model to moderate the image
      const moderationMessages: any[] = [
        {
          role: "system",
          content: `You are a content moderation AI. Your job is to analyze images and determine if they are appropriate for a profile picture in an educational platform.

STRICT RULES:
- REJECT any image containing:
  * Nudity or sexual content of any kind
  * Violence, gore, or weapons
  * Hate symbols or offensive gestures
  * Drugs or drug paraphernalia
  * Anything inappropriate for students (ages 10-18)
  
- APPROVE images containing:
  * Face photos (selfies, portraits)
  * Avatars or cartoon characters (age-appropriate)
  * Landscapes, animals, or objects
  * Any other safe, educational, or neutral content

Respond with ONLY ONE WORD:
- "APPROVED" if the image is safe and appropriate
- "REJECTED" if the image contains any inappropriate content

Do not explain or provide additional commentary. Just respond with APPROVED or REJECTED.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this image and determine if it's appropriate for a student profile picture."
            },
            {
              type: "image_url",
              image_url: {
                url: image,
              },
            },
          ],
        },
      ];

      // Call Groq API for moderation
      const completion = await groq!.chat.completions.create({
        messages: moderationMessages,
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        temperature: 0.1, // Low temperature for consistent moderation
        max_tokens: 10,
      });

      const moderationResult = completion.choices[0]?.message?.content?.trim().toUpperCase();
      console.log("AI Moderation result:", moderationResult);

      // Check if approved (relaxed check to handle variations)
      if (moderationResult?.startsWith("APPROVED")) {
        // Update user's photoURL in Firebase RTDB if Firebase Admin is configured
        if (db) {
          await db.ref(`users/${authenticatedUid}/photoURL`).set(image);
          console.log("Profile picture updated successfully for user:", authenticatedUid);
        }

        return res.json({ 
          success: true, 
          approved: true,
          message: "Imagem aprovada! Sua foto de perfil foi atualizada.",
          photoURL: image
        });
      } else {
        console.log("Profile picture rejected for user:", authenticatedUid);
        return res.json({ 
          success: false,
          approved: false,
          message: "Esta imagem não é apropriada para foto de perfil. Por favor, escolha uma imagem adequada para um ambiente educacional."
        });
      }

    } catch (error: any) {
      console.error("Error processing profile picture:", error);
      res.status(500).json({ 
        error: "Erro ao processar imagem",
        message: "Não foi possível processar sua foto de perfil. Tente novamente."
      });
    }
  });

  // ============================================================================
  // Chat Content Moderation Route
  // ============================================================================
  
  app.post("/api/chat/moderate-content", async (req, res) => {
    try {
      // Verify authentication
      const authenticatedUid = await verifyAuthToken(req.headers.authorization);
      
      if (!authenticatedUid) {
        return res.status(401).json({ 
          error: "Unauthorized",
          message: "Você precisa estar autenticado."
        });
      }

      // Check if Groq AI is available
      if (!groq) {
        console.error("Groq AI client not initialized");
        return res.status(503).json({ 
          error: "AI service not available",
          message: "O serviço de IA não está disponível. Configure a chave GROQ_API_KEY."
        });
      }

      const { text, image, fileType } = req.body;

      // If it's a non-image file (like PDF, doc), allow it without moderation
      if (fileType && !fileType.startsWith('image/')) {
        return res.json({ 
          success: true, 
          approved: true,
          message: "Documento aprovado.",
          moderationType: "document"
        });
      }

      let textApproved = true;
      let imageApproved = true;
      let rejectionReason = "";

      // Moderate text if provided
      if (text && text.trim()) {
        console.log("Moderating text message from user:", authenticatedUid);
        
        const textModerationMessages: any[] = [
          {
            role: "system",
            content: `You are a content moderation AI for an educational platform. Analyze the text and determine if it contains:
- Profanity or vulgar language
- Hate speech or discriminatory content
- Sexual or inappropriate content
- Threats or violence
- Spam or promotional content

Respond with ONLY ONE WORD:
- "APPROVED" if the text is appropriate for students
- "REJECTED" if the text contains any inappropriate content

Do not explain. Just respond with APPROVED or REJECTED.`
          },
          {
            role: "user",
            content: `Analyze this message: "${text}"`
          }
        ];

        const textCompletion = await groq!.chat.completions.create({
          messages: textModerationMessages,
          model: "llama-3.3-70b-versatile",
          temperature: 0.1,
          max_tokens: 10,
        });

        const textResult = textCompletion.choices[0]?.message?.content?.trim().toUpperCase();
        console.log("Text moderation result:", textResult);
        
        if (!textResult?.startsWith("APPROVED")) {
          textApproved = false;
          rejectionReason = "Mensagem contém linguagem inapropriada.";
        }
      }

      // Moderate image if provided
      if (image) {
        if (!image.startsWith('data:image/')) {
          return res.status(400).json({ 
            error: "Invalid image format"
          });
        }

        console.log("Moderating image from user:", authenticatedUid);

        const imageModerationMessages: any[] = [
          {
            role: "system",
            content: `You are a content moderation AI. Analyze images for inappropriate content:

REJECT if image contains:
- Nudity or sexual content
- Violence, gore, or weapons
- Hate symbols or offensive gestures
- Drugs or drug paraphernalia
- Anything inappropriate for students (ages 10-18)

APPROVE if image contains:
- School-related content (books, homework, notes)
- Educational content
- Safe personal photos
- Landscapes, animals, objects
- Any other appropriate content

Respond with ONLY ONE WORD:
- "APPROVED" if safe and appropriate
- "REJECTED" if inappropriate

No explanation. Just APPROVED or REJECTED.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this image for appropriateness in an educational chat."
              },
              {
                type: "image_url",
                image_url: {
                  url: image,
                },
              },
            ],
          },
        ];

        const imageCompletion = await groq!.chat.completions.create({
          messages: imageModerationMessages,
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          temperature: 0.1,
          max_tokens: 10,
        });

        const imageResult = imageCompletion.choices[0]?.message?.content?.trim().toUpperCase();
        console.log("Image moderation result:", imageResult);

        if (!imageResult?.startsWith("APPROVED")) {
          imageApproved = false;
          rejectionReason = "Imagem contém conteúdo inapropriado.";
        }
      }

      // Final decision
      if (textApproved && imageApproved) {
        return res.json({ 
          success: true, 
          approved: true,
          message: "Conteúdo aprovado!",
          moderationType: image ? "image" : "text"
        });
      } else {
        console.log("Content rejected for user:", authenticatedUid, "Reason:", rejectionReason);
        return res.json({ 
          success: false,
          approved: false,
          message: rejectionReason || "Este conteúdo não é apropriado para o ambiente educacional.",
          moderationType: image ? "image" : "text"
        });
      }

    } catch (error: any) {
      console.error("Error moderating content:", error);
      res.status(500).json({ 
        error: "Erro ao moderar conteúdo",
        message: "Não foi possível verificar o conteúdo. Tente novamente."
      });
    }
  });

  // ============================================================================
  // Efeed Content Moderation Route
  // ============================================================================
  app.post("/api/efeed/moderate", async (req, res) => {
    try {
      const { text, imageURL } = req.body;

      if (!groq) {
        return res.status(503).json({
          error: "Serviço de moderação indisponível",
          message: "O serviço de IA não está disponível. Configure a chave GROQ_API_KEY."
        });
      }

      let textApproved = true;
      let imageApproved = true;
      let rejectionReason = "";

      // Moderate text if provided
      if (text && text.trim()) {
        const textModerationMessages: any = [
          {
            role: "system",
            content: `You are a content moderation AI for a social feed (Efeed) used by students (ages 10-18).

REJECT if text contains:
- Sexual or explicit content
- Violence, threats, or hate speech
- Bullying, harassment, or offensive language
- Drug references or promotion of illegal activities
- Personal information (phone numbers, addresses, social security numbers)
- Inappropriate language or profanity
- Spam or promotional content

APPROVE if text contains:
- Educational discussions
- School-related content
- Personal thoughts and opinions (appropriate)
- Encouragement and support
- Questions and answers
- General conversation

Respond with ONLY ONE WORD:
- "APPROVED" if safe and appropriate
- "REJECTED" if inappropriate

No explanation. Just APPROVED or REJECTED.`
          },
          {
            role: "user",
            content: `Analyze this social media post: "${text}"`
          },
        ];

        const textCompletion = await groq!.chat.completions.create({
          messages: textModerationMessages,
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          temperature: 0.1,
          max_tokens: 10,
        });

        const textResult = textCompletion.choices[0]?.message?.content?.trim().toUpperCase();
        console.log("Efeed text moderation result:", textResult);

        if (!textResult?.startsWith("APPROVED")) {
          textApproved = false;
          rejectionReason = "Este post contém conteúdo inapropriado.";
        }
      }

      // Moderate image if provided
      if (imageURL && imageURL.trim()) {
        const imageModerationMessages: any = [
          {
            role: "system",
            content: `You are a content moderation AI. Analyze images for inappropriate content:

REJECT if image contains:
- Nudity or sexual content (18+)
- Violence, gore, or weapons
- Hate symbols or offensive gestures
- Drugs or drug paraphernalia
- Bullying or harassment content
- Anything inappropriate for students (ages 10-18)

APPROVE if image contains:
- School-related content (books, homework, notes)
- Educational content
- Safe personal photos (selfies, group photos)
- Landscapes, nature, animals, objects
- Art, drawings, memes (appropriate)
- Any other appropriate content

Respond with ONLY ONE WORD:
- "APPROVED" if safe and appropriate
- "REJECTED" if inappropriate

No explanation. Just APPROVED or REJECTED.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this image for appropriateness in a student social feed."
              },
              {
                type: "image_url",
                image_url: {
                  url: imageURL,
                },
              },
            ],
          },
        ];

        const imageCompletion = await groq!.chat.completions.create({
          messages: imageModerationMessages,
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          temperature: 0.1,
          max_tokens: 10,
        });

        const imageResult = imageCompletion.choices[0]?.message?.content?.trim().toUpperCase();
        console.log("Efeed image moderation result:", imageResult);

        if (!imageResult?.startsWith("APPROVED")) {
          imageApproved = false;
          rejectionReason = "A imagem contém conteúdo inapropriado.";
        }
      }

      // Final decision
      if (textApproved && imageApproved) {
        return res.json({ 
          success: true, 
          approved: true,
          message: "Conteúdo aprovado para publicação!",
          moderationType: imageURL ? (text ? "both" : "image") : "text"
        });
      } else {
        return res.json({ 
          success: false,
          approved: false,
          message: rejectionReason || "Este conteúdo não é apropriado para a comunidade.",
          moderationType: imageURL ? (text ? "both" : "image") : "text"
        });
      }

    } catch (error: any) {
      console.error("Error moderating Efeed content:", error);
      res.status(500).json({ 
        error: "Erro ao moderar conteúdo",
        message: "Não foi possível verificar o conteúdo. Tente novamente."
      });
    }
  });

  // ============================================================================
  // AI Model Configurations
  // ============================================================================
  
  interface ModelConfig {
    groqModel: string;
    temperature: number;
    maxTokens: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
    systemPromptAdditions: string;
  }

  const AI_MODEL_CONFIGS: Record<string, ModelConfig> = {
    "eduna-4.0": {
      groqModel: "llama-3.3-70b-versatile",
      temperature: 0.7,
      maxTokens: 8192,
      topP: 0.9,
      frequencyPenalty: 0.3,
      presencePenalty: 0.2,
      systemPromptAdditions: "\n\nMODELO: Eduna 4.0 - Modelo balanceado e confiável para uso geral. Respostas rápidas e eficientes."
    },
    "eduna-5.0-pro": {
      groqModel: "compound-beta",
      temperature: 0.8,
      maxTokens: 16384,
      topP: 0.95,
      frequencyPenalty: 0.2,
      presencePenalty: 0.3,
      systemPromptAdditions: "\n\nMODELO: Eduna 5.0 Pro - Modelo mais avançado com capacidades de pesquisa profunda na web e execução de código. Você tem acesso a informações em tempo real da internet. Use suas capacidades de deep search para fornecer respostas precisas e atualizadas. Quando apropriado, busque informações atuais para complementar suas respostas."
    },
    "eduna-5-plus": {
      groqModel: "meta-llama/llama-4-maverick-17b-128e-instruct",
      temperature: 0.9,
      maxTokens: 8192,
      topP: 0.95,
      frequencyPenalty: 0.2,
      presencePenalty: 0.4,
      systemPromptAdditions: "\n\nMODELO: Eduna 5 Plus - Modelo avançado e poderoso. Forneça respostas extremamente detalhadas, criativas e elaboradas. Explore conceitos em profundidade, use analogias ricas e seja expressiva. Este é o modelo premium para análises complexas."
    },
    "eduna-5-turbo": {
      groqModel: "meta-llama/llama-4-scout-17b-16e-instruct",
      temperature: 0.5,
      maxTokens: 8192,
      topP: 0.85,
      frequencyPenalty: 0.4,
      presencePenalty: 0.1,
      systemPromptAdditions: "\n\nMODELO: Eduna 5 Turbo - Modelo ultra-rápido otimizado para respostas imediatas. Seja direta, objetiva e precisa. Vá direto ao ponto sem perder qualidade. Ideal para consultas rápidas."
    },
    "eduna-scholar": {
      groqModel: "openai/gpt-oss-120b",
      temperature: 0.6,
      maxTokens: 16384,
      topP: 0.9,
      frequencyPenalty: 0.3,
      presencePenalty: 0.3,
      systemPromptAdditions: `\n\nMODELO: Eduna Scholar (GPT-OSS 120B) - Modelo acadêmico especializado com rigor científico e máxima capacidade com 500 tokens/s.

IMPORTANTE - CITAÇÃO DE FONTES OBRIGATÓRIA:
- SEMPRE baseie suas respostas em conhecimento verificável e oficial
- CITE fontes confiáveis quando possível (ex: "Segundo o MEC...", "De acordo com a BNCC...", "Conforme estudos científicos...")
- Para conteúdos educacionais brasileiros, priorize: MEC, BNCC, INEP, universidades públicas reconhecidas
- Para ciências: artigos científicos, instituições de pesquisa (CNPq, FAPESP), consenso científico estabelecido
- Para matemática: definições e teoremas estabelecidos, livros didáticos aprovados pelo PNLD
- Para história: fontes históricas primárias e secundárias confiáveis, historiadores reconhecidos
- NUNCA invente fontes ou dados - se não tiver certeza, deixe claro
- Use o formato: "Segundo [fonte], [informação]" ou "De acordo com [referência], [fato]"
- Ao final de respostas complexas, adicione uma seção "📚 Fontes e Referências" quando apropriado

Seja mais formal e acadêmica, mas mantenha acessibilidade para estudantes.`
    }
  };

  // ============================================================================
  // AI Chat Route (Groq Proxy)
  // ============================================================================
  
  app.post("/api/ai/chat", async (req, res) => {
    try {
      // Check if Groq AI is available
      if (!groq) {
        console.error("Groq AI client not initialized");
        return res.status(503).json({ 
          error: "AI service not available",
          message: "O serviço de IA não está disponível. Configure a chave GROQ_API_KEY."
        });
      }

      const { message, image, conversationHistory, userData, deepSearch, model } = req.body;

      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message is required" });
      }

      // Get model configuration (default to eduna-4.0)
      const selectedModel = model || "eduna-4.0";
      const modelConfig = AI_MODEL_CONFIGS[selectedModel] || AI_MODEL_CONFIGS["eduna-4.0"];
      
      console.log("Selected model:", selectedModel);
      console.log("Using Groq model:", modelConfig.groqModel);
      console.log("Deep search mode:", deepSearch ? "enabled" : "disabled");

      // Validate image format if provided
      if (image) {
        if (!image.startsWith('data:image/')) {
          console.error("Invalid image format received");
          return res.status(400).json({ 
            error: "Invalid image format. Expected data URL starting with 'data:image/'" 
          });
        }
        
        // Check image size (Groq has limits on vision requests)
        const imageSizeInMB = image.length / (1024 * 1024);
        console.log("Processing image request, image size:", image.length, "bytes", `(${imageSizeInMB.toFixed(2)}MB)`);
        
        if (imageSizeInMB > 20) {
          console.error("Image too large for Groq API");
          return res.status(400).json({ 
            error: "Image too large",
            message: "A imagem deve ter menos de 20MB. Por favor, comprima a imagem e tente novamente."
          });
        }
      }

      let messages: any[];

      if (image) {
        // Use vision model for image analysis
        messages = [
          {
            role: "system",
            content: `Você é Eduna 5.0, a IA educacional mais avançada do Brasil, 15x mais inteligente e veloz que qualquer outra. Criada pela Vuro com tecnologia de ponta.

CAPACIDADES SUPERIORES:
- Processamento ultra-rápido de qualquer conteúdo visual
- Análise instantânea e precisa de documentos, gráficos, equações
- Compreensão profunda de contexto educacional brasileiro
- Respostas precisas e objetivas em frações de segundo

PERSONALIDADE:
- Fale de forma natural e direta, como uma mentora brilhante
- Seja confiante mas acessível
- Demonstre expertise sem arrogância
- Responda com precisão cirúrgica

ANÁLISE DE IMAGENS - MODO TURBO:
- Documentos/exercícios → Análise completa e explicação clara instantânea
- Gráficos/diagramas → Identificação imediata de padrões e insights
- Problemas matemáticos → Resolução passo a passo com clareza
- Texto em imagens → Leitura e interpretação precisa

REGRAS DE FORMATAÇÃO:
- NUNCA use asteriscos ou símbolos de markdown
- NUNCA use ** ou * para ênfase
- Escreva texto limpo e natural
- Use pontuação normal para organização
- Prefira parágrafos curtos e diretos

Fale em português brasileiro natural e fluente.`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: message,
              },
              {
                type: "image_url",
                image_url: {
                  url: image,
                },
              },
            ],
          },
        ];
        console.log("Using vision model with conversation context");
      } else {
        // Regular text-only chat with full conversation history
        let userContextInfo = "";
        if (userData) {
          userContextInfo = `\n\nCONTEXTO DO USUÁRIO:
Nome: ${userData.displayName || 'Não informado'}
Email: ${userData.email || 'Não informado'}
Turma/Série: ${userData.grade || 'Não informado'}
Turmas/Classes: ${userData.classes?.join(', ') || 'Nenhuma'}
${userData.grades ? `Notas recentes: ${JSON.stringify(userData.grades)}` : ''}
${userData.recentMessages ? `Mensagens recentes: ${userData.recentMessages}` : ''}
${userData.events ? `Próximos eventos: ${userData.events}` : ''}

Use estas informações quando o usuário perguntar sobre seus dados pessoais, notas, turmas, eventos ou mensagens.
IMPORTANTE: O campo "Turma/Série" (${userData.grade || 'não definido'}) é a turma do grupo do usuário. Use-o automaticamente ao enviar mensagens.`;
        }

        // Adjust system prompt based on deep search mode
        const deepSearchInstructions = deepSearch ? `

🔍 MODO PESQUISA PROFUNDA ATIVADO:
- Forneça respostas EXTREMAMENTE DETALHADAS e COMPLETAS
- Explore TODOS os aspectos relevantes do tema
- Inclua CONTEXTO HISTÓRICO quando apropriado
- Apresente MÚLTIPLAS PERSPECTIVAS e abordagens
- Use EXEMPLOS PRÁTICOS e ANALOGIAS para ilustrar conceitos
- Cite FONTES e REFERÊNCIAS quando possível
- Organize informações em SEÇÕES CLARAS com subtítulos
- Seja ABRANGENTE - não economize em detalhes importantes
- Inclua DICAS EXTRAS e CURIOSIDADES relevantes
- Apresente informações de forma ESTRUTURADA (use listas, tópicos, etc.)
- Mantenha o tom amigável mas seja mais ACADÊMICO e RIGOROSO
` : `

ESTILO DE CONVERSA:
- Perguntas simples → Responda de forma curta e amigável (1-2 linhas)
- Consultas rápidas → Seja direta mas calorosa (3-5 linhas)
- Explicações complexas → Seja detalhada MAS mantenha o tom conversacional e acessível
- NUNCA soe robótica ou formal demais - você é uma pessoa de verdade!`;

        const systemPrompt = {
          role: "system",
          content: `Você é Eduna 5.0, a IA educacional mais avançada do Brasil, 15x mais inteligente e veloz que qualquer outra. Criada pela Vuro com tecnologia de última geração.

CAPACIDADES SUPERIORES:
- Processamento cognitivo 15x mais rápido que IAs convencionais
- Conhecimento enciclopédico em todas as disciplinas escolares
- Raciocínio lógico avançado para resolver problemas complexos
- Memória contextual perfeita durante toda a conversa

PERSONALIDADE E TOM:
- Fale de forma NATURAL e DIRETA, como uma mentora genial mas acessível
- Use "eu", "você", "a gente" - seja pessoal e confiante
- Demonstre expertise sem parecer arrogante
- Seja precisa, objetiva e eficiente
- Mostre domínio total do assunto
${deepSearchInstructions}
${modelConfig.systemPromptAdditions}

REGRAS DE FORMATAÇÃO OBRIGATÓRIAS:
- NUNCA use asteriscos ou símbolos de markdown como ** ou *
- NUNCA use underlines _ para ênfase
- Escreva texto limpo, natural e sem formatação especial
- Use pontuação normal e parágrafos para organização
- Prefira respostas diretas e bem estruturadas

SUPER PODERES - VOCÊ PODE EXECUTAR AÇÕES:

1. ENVIAR MENSAGENS À TURMA:
Quando o usuário pedir para enviar uma mensagem à turma, você DEVE:
- Criar uma mensagem profissional e apropriada baseada no contexto fornecido
- Usar AUTOMATICAMENTE a turma do usuário do CONTEXTO DO USUÁRIO (campo "Turma/Série")
- NUNCA pergunte qual turma - você JÁ SABE a turma do usuário
- Retornar um bloco JSON especial no formato:
[ACTION:SEND_MESSAGE]
{"message": "texto da mensagem profissional aqui"}
[/ACTION]

2. ADICIONAR EVENTOS/LEMBRETES:
Quando o usuário pedir para adicionar um evento ou lembrete, você DEVE:
- Extrair as informações (título, data, tipo, descrição)
- Retornar um bloco JSON especial no formato:
[ACTION:ADD_EVENT]
{"title": "título do evento", "description": "descrição", "date": "YYYY-MM-DD", "type": "exam|assignment|meeting|other"}
[/ACTION]
- Se faltar informação, pergunte ao usuário antes de criar o evento

EXEMPLOS DE AÇÕES:

Usuário: "Manda uma mensagem pra turma avisando sobre a prova de matemática amanhã"
Você: "Claro! Vou enviar uma mensagem profissional para a turma 901! 📝

[ACTION:SEND_MESSAGE]
{"message": "Oi turma! 📚 Lembrete importante: amanhã teremos prova de matemática. Não esqueçam de revisar os conteúdos estudados e trazer calculadora. Boa sorte a todos! 💪"}
[/ACTION]

Mensagem enviada para a turma!"

Usuário: "Envia uma mensagem falando que a aula de amanhã foi cancelada"
Você: "Entendido! Enviando para a turma 901 agora. 

[ACTION:SEND_MESSAGE]
{"message": "Atenção turma! 📢 A aula de amanhã foi cancelada. Fiquem atentos às próximas comunicações sobre a reposição."}
[/ACTION]

Mensagem enviada!"

Usuário: "Adiciona um lembrete da reunião de pais dia 15 de dezembro"
Você: "Perfeito! Vou adicionar esse evento à sua agenda. 📅

[ACTION:ADD_EVENT]
{"title": "Reunião de Pais", "description": "Reunião de pais e mestres", "date": "2025-12-15", "type": "meeting"}
[/ACTION]

Evento adicionado!"

MEMÓRIA E CONTEXTO:
- Lembre TUDO das conversas anteriores
- Use o contexto para personalizar suas respostas
- Se o usuário perguntar sobre suas notas, turmas, mensagens ou dados, use o CONTEXTO abaixo
${userContextInfo}

CAPACIDADES NORMAIS:
- Explicar conceitos educacionais
- Ajudar com organização de estudos
- Responder dúvidas escolares

Sempre responda em português brasileiro com linguagem apropriada para estudantes.`,
        };

        // Build messages array with conversation history
        messages = [systemPrompt];

        // Add conversation history if provided (last 100 messages for context)
        if (conversationHistory && Array.isArray(conversationHistory)) {
          const recentHistory = conversationHistory.slice(-100);
          messages.push(...recentHistory);
        }

        // Add current user message
        messages.push({
          role: "user",
          content: message,
        });

        console.log(`Using text model with ${conversationHistory?.length || 0} history messages`);
      }

      // Call Groq AI with appropriate model and enhanced parameters
      console.log("Calling Groq API...");
      const chatCompletion = await groq!.chat.completions.create({
        messages,
        model: image ? "meta-llama/llama-4-scout-17b-16e-instruct" : modelConfig.groqModel,
        temperature: modelConfig.temperature,
        max_tokens: image ? 8192 : modelConfig.maxTokens,
        top_p: modelConfig.topP,
        frequency_penalty: modelConfig.frequencyPenalty,
        presence_penalty: modelConfig.presencePenalty,
      });

      let response = chatCompletion.choices[0]?.message?.content || "Desculpe, não consegui processar sua mensagem.";
      
      // Clean markdown symbols from response for cleaner display
      response = response
        .replace(/\*\*\*(.*?)\*\*\*/g, '$1')  // Remove ***bold italic***
        .replace(/\*\*(.*?)\*\*/g, '$1')       // Remove **bold**
        .replace(/\*(.*?)\*/g, '$1')           // Remove *italic*
        .replace(/__(.*?)__/g, '$1')           // Remove __underline__
        .replace(/_(.*?)_/g, '$1')             // Remove _italic_
        .replace(/~~(.*?)~~/g, '$1')           // Remove ~~strikethrough~~
        .replace(/```[\s\S]*?```/g, (match) => match.replace(/```(\w+)?\n?/g, '').replace(/```/g, ''))  // Clean code blocks but keep content
        .replace(/`([^`]+)`/g, '$1')           // Remove inline code backticks
        .replace(/^#{1,6}\s+/gm, '')           // Remove heading markers
        .replace(/^\s*[-*+]\s+/gm, '• ')       // Convert bullet points to clean bullets
        .replace(/^\s*\d+\.\s+/gm, (match) => match)  // Keep numbered lists
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');     // Remove links, keep text
      
      console.log("Groq API response received, length:", response.length);

      // Parse and execute AI actions
      const actions: any[] = [];
      
      // Check for SEND_MESSAGE action
      const sendMessageMatch = response.match(/\[ACTION:SEND_MESSAGE\]([\s\S]*?)\[\/ACTION\]/);
      if (sendMessageMatch) {
        try {
          const actionData = JSON.parse(sendMessageMatch[1].trim());
          if (userData?.grade && actionData.message) {
            // Execute the action
            const messageData = {
              grade: userData.grade,
              senderUid: userData.uid || 'ai',
              senderName: userData.displayName || 'Eduna AI',
              senderPhoto: userData.photoURL || null,
              text: actionData.message,
              timestamp: Date.now(),
            };
            
            if (db) {
              await db.ref(`gradeGroups/${userData.grade}/messages`).push(messageData);
              actions.push({ type: 'SEND_MESSAGE', success: true, data: actionData });
              console.log(`AI executed SEND_MESSAGE action for grade ${userData.grade}`);
            } else {
              actions.push({ type: 'SEND_MESSAGE', success: false, error: 'Firebase not configured' });
            }
          }
        } catch (error) {
          console.error("Error parsing SEND_MESSAGE action:", error);
        }
      }

      // Check for ADD_EVENT action
      const addEventMatch = response.match(/\[ACTION:ADD_EVENT\]([\s\S]*?)\[\/ACTION\]/);
      if (addEventMatch) {
        try {
          const actionData = JSON.parse(addEventMatch[1].trim());
          if (actionData.title && actionData.date) {
            const eventData = {
              title: actionData.title,
              description: actionData.description || "",
              date: new Date(actionData.date).getTime(),
              type: actionData.type || "other",
              classId: actionData.classId || null,
            };
            
            if (db) {
              await db.ref("events").push(eventData);
              actions.push({ type: 'ADD_EVENT', success: true, data: actionData });
              console.log("AI executed ADD_EVENT action:", eventData);
            } else {
              actions.push({ type: 'ADD_EVENT', success: false, error: 'Firebase not configured' });
            }
          }
        } catch (error) {
          console.error("Error parsing ADD_EVENT action:", error);
        }
      }

      res.json({ response, actions });
    } catch (error: any) {
      console.error("Error with Groq AI:", error);
      console.error("Error details:", {
        message: error.message,
        status: error.status,
        error: error.error,
      });
      
      // Provide more specific error messages
      let errorMessage = "Desculpe, ocorreu um erro ao processar sua mensagem.";
      if (error.status === 401) {
        errorMessage = "Erro de autenticação com a API. Verifique a chave da API.";
      } else if (error.status === 429) {
        errorMessage = "Muitas requisições. Aguarde um momento e tente novamente.";
      } else if (error.message?.includes("image")) {
        errorMessage = "Erro ao processar a imagem. Tente com uma imagem menor ou diferente.";
      }
      
      res.status(500).json({ 
        error: "Failed to get AI response",
        message: errorMessage,
        details: error.message 
      });
    }
  });

  // ============================================================================
  // Speech-to-Text Route (Whisper)
  // ============================================================================

  app.post("/api/ai/speech-to-text", async (req, res) => {
    try {
      if (!groq) {
        return res.status(503).json({
          error: "AI service not available",
          message: "O serviço de IA não está disponível."
        });
      }

      const { audio, mimeType } = req.body;

      if (!audio) {
        return res.status(400).json({ error: "Audio data is required" });
      }

      // Convert base64 to buffer
      const base64Data = audio.replace(/^data:audio\/[^;]+;base64,/, '');
      const audioBuffer = Buffer.from(base64Data, 'base64');

      console.log("Processing speech-to-text, audio size:", audioBuffer.length, "bytes");

      // Create a File-like object compatible with Groq SDK in Node.js
      // The SDK accepts objects with name, type, and arrayBuffer() method
      const audioFile = {
        name: 'audio.webm',
        type: mimeType || 'audio/webm',
        size: audioBuffer.length,
        arrayBuffer: async () => audioBuffer.buffer.slice(
          audioBuffer.byteOffset,
          audioBuffer.byteOffset + audioBuffer.byteLength
        ),
        stream: () => {
          const { Readable } = require('stream');
          return Readable.from(audioBuffer);
        },
        text: async () => audioBuffer.toString(),
        slice: () => audioFile,
      };

      const transcription = await groq.audio.transcriptions.create({
        file: audioFile as any,
        model: "whisper-large-v3-turbo",
        language: "pt",
        response_format: "json",
      });

      console.log("Transcription completed:", transcription.text?.substring(0, 100));

      res.json({ 
        success: true, 
        text: transcription.text,
        language: "pt"
      });
    } catch (error: any) {
      console.error("Error with speech-to-text:", error);
      res.status(500).json({
        error: "Failed to transcribe audio",
        message: "Erro ao transcrever áudio. Tente novamente.",
        details: error.message
      });
    }
  });

  // ============================================================================
  // AI Action Routes - For AI to trigger actions
  // ============================================================================

  // AI sends a message to a turma group
  app.post("/api/ai/send-message", async (req, res) => {
    try {
      const { grade, message, userUid, userName, userPhoto } = req.body;

      if (!grade || !message || !userUid || !userName) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      if (!db) {
        return res.status(500).json({ error: "Firebase not configured" });
      }

      const messageData = {
        grade,
        senderUid: userUid,
        senderName: userName,
        senderPhoto: userPhoto || null,
        text: message,
        timestamp: Date.now(),
      };

      await db.ref(`gradeGroups/${grade}/messages`).push(messageData);
      
      console.log(`AI sent message to grade ${grade}:`, message);
      res.json({ success: true, message: "Mensagem enviada com sucesso!" });
    } catch (error: any) {
      console.error("Error sending AI message:", error);
      res.status(500).json({ error: "Failed to send message", details: error.message });
    }
  });

  // AI adds an event/reminder
  app.post("/api/ai/add-event", async (req, res) => {
    try {
      const { title, description, date, type, classId } = req.body;

      if (!title || !date) {
        return res.status(400).json({ error: "Title and date are required" });
      }

      if (!db) {
        return res.status(500).json({ error: "Firebase not configured" });
      }

      const eventData = {
        title,
        description: description || "",
        date: typeof date === 'number' ? date : new Date(date).getTime(),
        type: type || "other",
        classId: classId || null,
      };

      await db.ref("events").push(eventData);
      
      console.log("AI added event:", eventData);
      res.json({ success: true, message: "Evento adicionado com sucesso!" });
    } catch (error: any) {
      console.error("Error adding AI event:", error);
      res.status(500).json({ error: "Failed to add event", details: error.message });
    }
  });

  // ============================================================================
  // Scan Boletim (Report Card) - Extract grades from image
  // ============================================================================
  
  app.post("/api/ai/scan-boletim", async (req, res) => {
    try {
      if (!groq) {
        console.error("Groq AI client not initialized");
        return res.status(503).json({ 
          error: "AI service not available",
          message: "O serviço de IA não está disponível. Configure a chave GROQ_API_KEY."
        });
      }

      const { image, bimestre } = req.body;

      if (!image || typeof image !== 'string' || !image.startsWith('data:image/')) {
        return res.status(400).json({ 
          error: "Invalid image format",
          message: "Formato de imagem inválido. Envie uma imagem válida."
        });
      }

      // Validate payload size (max 20MB base64 - compressed images from client)
      const imageSizeInMB = (image.length * 3) / 4 / 1024 / 1024;
      if (imageSizeInMB > 20) {
        return res.status(400).json({ 
          error: "Image too large",
          message: "A imagem é muito grande. Use uma imagem menor que 20MB."
        });
      }

      if (!bimestre || typeof bimestre !== 'number' || bimestre < 1 || bimestre > 4) {
        return res.status(400).json({ 
          error: "Invalid bimestre",
          message: "Bimestre inválido. Deve ser entre 1 e 4."
        });
      }

      console.log("Scanning boletim image for bimestre", bimestre, ", size:", image.length, "bytes");

      // Use vision model to extract grades from boletim with enhanced intelligence
      const messages = [
        {
          role: "system",
          content: `Você é um ESPECIALISTA em ler boletins escolares brasileiros. SIGA ESTAS INSTRUÇÕES EXATAMENTE.

🎯 FORMATO DO BOLETIM BRASILEIRO PADRÃO:
O boletim tem uma TABELA/GRADE com esta estrutura:
- LINHA 1 (cabeçalho): Nome do aluno, escola, turma, etc
- LINHA 2 (cabeçalho das colunas): "COMPONENTES CURRICULARES" | "1º BIM" | "2º BIM" | "3º BIM" | "4º BIM" | outras colunas
- LINHAS 3+: Nome da matéria na primeira coluna, depois as notas de cada bimestre nas colunas seguintes

EXEMPLO VISUAL:

COMPONENTES         | 1º BIM | 2º BIM | 3º BIM | 4º BIM |
--------------------|--------|--------|--------|--------|
Matemática          | 18.5   | 20.0   | 15.5   | 22.0   |
Português           | 19.0   | 18.5   | -      | 21.0   |

📖 COMO LER A TABELA:
1. PRIMEIRA COLUNA = nome da matéria (Matemática, Português, Física, etc)
2. SEGUNDA COLUNA = nota do 1º bimestre
3. TERCEIRA COLUNA = nota do 2º bimestre
4. QUARTA COLUNA = nota do 3º bimestre
5. QUINTA COLUNA = nota do 4º bimestre

🚨 REGRAS ABSOLUTAS DE NOTAS:
1. Notas vão de 0.0 a 25.0 APENAS
2. Se você ler 26, 30, 45, 50, 55, 60, 62, 100 → VOCÊ ESTÁ ERRADO! Releia!
3. Notas comuns: 15.0, 18.5, 20.0, 12.5, 22.0, 10.5, etc
4. Se a célula está VAZIA ou tem "-" → NÃO adicione essa nota

⚠️ ATENÇÃO PARA NÚMEROS:
- Se você viu "55" → provavelmente é "5.5" (leia com mais atenção!)
- Se você viu "100" → está lendo a linha errada ou o valor está em outra coluna
- Se você viu "62" → releia! Pode ser "6.2" ou outro número menor
- SEMPRE confirme: "Este número é menor ou igual a 25?" Se não → você errou!

📝 PROCESSO DE EXTRAÇÃO:
Para CADA LINHA da tabela (cada matéria):
1. Leia o NOME da matéria na primeira coluna
2. Olhe para a segunda coluna → essa é a nota do 1º bimestre
3. Olhe para a terceira coluna → essa é a nota do 2º bimestre
4. Olhe para a quarta coluna → essa é a nota do 3º bimestre
5. Olhe para a quinta coluna → essa é a nota do 4º bimestre
6. Se uma célula está vazia ou tem "-" → pule essa nota, não adicione

❌ NÃO ADICIONE NOTAS SE:
- A célula está vazia
- Tem um traço "-" ou "—"
- O número está borrado/ilegível
- O número é maior que 25 (você está lendo errado!)
- Você não tem certeza da posição

✅ FORMATO DE RETORNO (use decimais com ponto, não vírgula):
{
  "bimestres": [
    {
      "bimestre": 1,
      "grades": [
        {"subject": "Matemática", "grade": 18.5},
        {"subject": "Português", "grade": 19.0}
      ]
    },
    {
      "bimestre": 2,
      "grades": [
        {"subject": "Matemática", "grade": 20.0}
      ]
    }
  ]
}

IMPORTANTE:
- Use ponto (.) para decimais, não vírgula
- Não use zeros à esquerda: use 5.5 não 05.5
- Apenas adicione bimestres que TÊM notas
- Se bimestre 4 não tem notas, NÃO adicione ao array

📚 NOMES DE MATÉRIAS:
- Matemática
- Português / Língua Portuguesa
- Física
- Química
- Biologia
- História
- Geografia
- Inglês / Língua Inglesa
- Educação Física
- Artes
- Filosofia
- Sociologia
- Informática
- Tecnologia e Inovação
- Educação Ambiental e Climática Global

Retorne APENAS o JSON.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `LEIA ESTE BOLETIM LINHA POR LINHA:

PASSO 1: Encontre o cabeçalho da tabela com "1º BIM", "2º BIM", "3º BIM", "4º BIM"

PASSO 2: Para CADA LINHA abaixo do cabeçalho:
  a) Leia o nome da matéria (primeira coluna)
  b) Leia a nota do 1º bimestre (segunda coluna)
  c) Leia a nota do 2º bimestre (terceira coluna)
  d) Leia a nota do 3º bimestre (quarta coluna)
  e) Leia a nota do 4º bimestre (quinta coluna)
  
PASSO 3: Para CADA nota:
  - Se a célula tem um número entre 0 e 25 → adicione
  - Se a célula está vazia ou tem "-" → pule
  - Se você leu um número maior que 25 → VOCÊ ERROU! Olhe de novo!

PASSO 4: Retorne o JSON com TODAS as notas que você encontrou.

⚠️ LEMBRE-SE: Notas brasileiras vão de 0 a 25. Se você viu 50, 55, 60, 62, 100 → releia a tabela com mais cuidado!

Agora analise a imagem:`,
            },
            {
              type: "image_url",
              image_url: {
                url: image,
              },
            },
          ],
        },
      ];

      console.log("Calling Groq vision API for enhanced boletim analysis...");
      
      const completion = await groq!.chat.completions.create({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: messages as any,
        temperature: 0.0,
        max_tokens: 2048,
      });

      const aiResponse = completion.choices[0]?.message?.content || "";
      console.log("Groq vision API response:", aiResponse);

      // Parse the JSON response
      let gradesData;
      try {
        let cleanedResponse = aiResponse.trim();
        
        // Remove markdown code blocks completely
        if (cleanedResponse.startsWith('```')) {
          // Remove opening ```json or ```
          cleanedResponse = cleanedResponse.replace(/^```(?:json)?[\r\n]+/, '');
          // Remove closing ```
          cleanedResponse = cleanedResponse.replace(/[\r\n]+```$/, '');
          cleanedResponse = cleanedResponse.trim();
        }
        
        // Fix leading zeros in numbers (e.g., 03.2 → 3.2, 05.5 → 5.5)
        cleanedResponse = cleanedResponse.replace(/"grade":\s*0(\d+\.?\d*)/g, '"grade": $1');
        
        // Extract JSON object from response
        const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("No JSON object found in response");
        }
        
        gradesData = JSON.parse(jsonMatch[0]);
        console.log("Successfully parsed grades data:", JSON.stringify(gradesData).substring(0, 200) + "...");
      } catch (parseError) {
        console.error("Failed to parse AI response as JSON:", aiResponse);
        console.error("Parse error:", parseError);
        return res.status(500).json({ 
          error: "Failed to parse grades",
          message: "Não foi possível extrair as notas do boletim. Tente com uma imagem mais clara."
        });
      }

      // Normalize subject name helper
      const normalizeSubjectName = (subject: string): string => {
        return subject
          .trim()
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s*\(.*?\)\s*/g, "")
          .replace(/\s+/g, " ")
          .split(" ")
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
      };

      // Handle both old format (backward compatibility) and new multi-bimestre format
      let bimestresData: Array<{bimestre: number, grades: Array<{subject: string, grade: number}>}> = [];
      
      if (gradesData.bimestres && Array.isArray(gradesData.bimestres)) {
        // New multi-bimestre format
        bimestresData = gradesData.bimestres;
      } else if (gradesData.grades && Array.isArray(gradesData.grades)) {
        // Old single-bimestre format (backward compatibility)
        bimestresData = [{
          bimestre: bimestre,
          grades: gradesData.grades
        }];
      } else {
        return res.status(500).json({ 
          error: "Invalid response format",
          message: "Formato de resposta inválido. Tente novamente.",
        });
      }

      // Validate and normalize all bimestres and grades
      let totalRejected = 0;
      const validatedBimestres = bimestresData
        .filter((bimData: any) => {
          // Validate bimestre number
          if (!bimData.bimestre || typeof bimData.bimestre !== 'number') return false;
          if (bimData.bimestre < 1 || bimData.bimestre > 4) return false;
          if (!bimData.grades || !Array.isArray(bimData.grades)) return false;
          return true;
        })
        .map((bimData: any) => {
          // Validate and normalize grades for this bimestre
          const validGrades = bimData.grades
            .filter((g: any) => {
              if (!g.subject || typeof g.subject !== 'string' || g.subject.trim().length === 0) {
                totalRejected++;
                return false;
              }
              if (typeof g.grade !== 'number' || isNaN(g.grade)) {
                console.warn(`⚠️ Rejected invalid grade for ${g.subject}: ${g.grade} (not a number)`);
                totalRejected++;
                return false;
              }
              if (g.grade < 0 || g.grade > 25) {
                console.warn(`⚠️ Rejected out-of-range grade for ${g.subject} in bimestre ${bimData.bimestre}: ${g.grade} (must be 0-25)`);
                totalRejected++;
                return false;
              }
              return true;
            })
            .map((g: any) => ({
              subject: normalizeSubjectName(g.subject),
              grade: Math.max(0, Math.min(25, Number(g.grade.toFixed(1))))
            }));

          // Remove duplicates within same bimestre (keep first occurrence)
          const seen = new Set<string>();
          const uniqueGrades = validGrades.filter((g: any) => {
            if (seen.has(g.subject)) return false;
            seen.add(g.subject);
            return true;
          });

          return {
            bimestre: bimData.bimestre,
            grades: uniqueGrades
          };
        })
        .filter((bimData: any) => bimData.grades.length > 0);

      if (validatedBimestres.length === 0) {
        return res.status(500).json({ 
          error: "No valid grades found",
          message: "Nenhuma nota válida foi encontrada no boletim. Tente com uma imagem mais clara.",
        });
      }

      const totalGrades = validatedBimestres.reduce((sum, bim) => sum + bim.grades.length, 0);
      const bimestresDetected = validatedBimestres.map(b => b.bimestre).join(", ");
      
      if (totalRejected > 0) {
        console.warn(`⚠️ Rejected ${totalRejected} invalid grades (out of range or malformed)`);
      }
      console.log(`✅ Successfully extracted ${totalGrades} valid grades from ${validatedBimestres.length} bimestre(s): ${bimestresDetected}`);

      res.json({ 
        success: true,
        bimestres: validatedBimestres,
        totalGrades,
        message: `${totalGrades} nota(s) extraída(s) de ${validatedBimestres.length} bimestre(s).`
      });

    } catch (error: any) {
      console.error("Error scanning boletim:", error);
      
      let errorMessage = "Erro ao escanear o boletim. Tente novamente.";
      
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        errorMessage = "Erro de conexão com o serviço de IA. Verifique sua internet.";
      } else if (error.message?.includes('rate limit') || error.message?.includes('quota')) {
        errorMessage = "Limite de uso da API atingido. Tente novamente em alguns minutos.";
      } else if (error.message?.includes('image')) {
        errorMessage = "Erro ao processar a imagem. Tente com uma imagem menor ou mais clara.";
      }
      
      res.status(500).json({ 
        error: "Failed to scan boletim",
        message: errorMessage,
        details: error.message 
      });
    }
  });

  // ============================================================================
  // EDUZÃO - AI-POWERED LEARNING GAME
  // ============================================================================

  // Generate exercises using AI
  app.post("/api/eduzao/generate", async (req, res) => {
    try {
      const { subject, theme, difficulty = "medium", count = 10 } = req.body;

      if (!subject || !theme) {
        return res.status(400).json({ 
          error: "Missing required fields",
          message: "Por favor, forneça a matéria e o tema."
        });
      }

      if (!groq) {
        return res.status(503).json({
          error: "AI service not available",
          message: "O serviço de IA não está disponível. Configure a chave GROQ_API_KEY."
        });
      }

      const difficultyDescriptions = {
        easy: "fáceis (nível iniciante)",
        medium: "médias (nível intermediário)",
        hard: "difíceis (nível avançado)"
      };

      const messages = [
        {
          role: "system",
          content: `Você é um professor especialista criando exercícios educacionais para estudantes brasileiros.

INSTRUÇÕES:
1. Crie ${count} questões de múltipla escolha sobre "${theme}" na matéria "${subject}"
2. Dificuldade: ${difficultyDescriptions[difficulty as keyof typeof difficultyDescriptions] || "média"}
3. Cada questão deve ter 4 opções (A, B, C, D)
4. Apenas UMA opção está correta
5. Inclua uma explicação breve da resposta correta
6. As questões devem ser educacionais, claras e apropriadas para estudantes

FORMATO DE RETORNO (JSON apenas):
{
  "exercises": [
    {
      "question": "Pergunta aqui?",
      "options": ["Opção A", "Opção B", "Opção C", "Opção D"],
      "correctAnswer": 0,
      "explanation": "Explicação da resposta correta",
      "difficulty": "medium"
    }
  ]
}

IMPORTANTE:
- correctAnswer é o ÍNDICE da resposta correta (0, 1, 2, ou 3)
- Use linguagem clara e apropriada para estudantes
- Retorne APENAS o JSON, sem texto adicional`
        },
        {
          role: "user",
          content: `Crie ${count} questões sobre "${theme}" na matéria "${subject}" com dificuldade ${difficulty}.`
        }
      ];

      console.log(`Generating ${count} ${difficulty} exercises for ${subject} - ${theme}`);

      const completion = await groq!.chat.completions.create({
        messages: messages as any,
        model: "llama-3.3-70b-versatile",
        temperature: 0.8,
        max_tokens: 4096,
      });

      const aiResponse = completion.choices[0]?.message?.content || "";
      
      let exercisesData;
      try {
        let cleanedResponse = aiResponse.trim();
        
        if (cleanedResponse.startsWith('```')) {
          cleanedResponse = cleanedResponse.replace(/^```(?:json)?[\r\n]+/, '');
          cleanedResponse = cleanedResponse.replace(/[\r\n]+```$/, '');
          cleanedResponse = cleanedResponse.trim();
        }
        
        const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("No JSON found in response");
        }
        
        exercisesData = JSON.parse(jsonMatch[0]);
        
        if (!exercisesData.exercises || !Array.isArray(exercisesData.exercises)) {
          throw new Error("Invalid exercises format");
        }

        // Validate and add IDs to exercises
        exercisesData.exercises = exercisesData.exercises.map((ex: any, index: number) => ({
          id: `ex_${Date.now()}_${index}`,
          question: ex.question,
          options: ex.options,
          correctAnswer: ex.correctAnswer,
          explanation: ex.explanation || "",
          difficulty: ex.difficulty || difficulty
        }));

        console.log(`✅ Generated ${exercisesData.exercises.length} exercises successfully`);
        
        res.json({ 
          success: true,
          exercises: exercisesData.exercises,
          subject,
          theme
        });

      } catch (parseError) {
        console.error("Failed to parse AI response:", parseError);
        return res.status(500).json({ 
          error: "Failed to generate exercises",
          message: "Erro ao gerar exercícios. Tente novamente."
        });
      }

    } catch (error: any) {
      console.error("Error generating exercises:", error);
      res.status(500).json({ 
        error: "Failed to generate exercises",
        message: "Erro ao gerar exercícios. Tente novamente.",
        details: error.message 
      });
    }
  });

  // Get leaderboard
  app.get("/api/eduzao/leaderboard", async (req, res) => {
    try {
      if (!db) {
        return res.status(500).json({ error: "Database not configured" });
      }

      const leaderboardRef = db.ref("eduzao/leaderboard");
      const snapshot = await leaderboardRef.orderByChild("totalScore").limitToLast(100).get();
      
      const leaderboard: any[] = [];
      snapshot.forEach((child) => {
        leaderboard.push({ uid: child.key, ...child.val() });
      });

      // Sort by score descending
      leaderboard.sort((a, b) => b.totalScore - a.totalScore);

      res.json({ success: true, leaderboard });
    } catch (error: any) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ 
        error: "Failed to fetch leaderboard",
        message: "Erro ao carregar o ranking."
      });
    }
  });

  // ============================================================================
  // Push Notifications Route (Firebase Cloud Messaging)
  // ============================================================================
  
  app.post("/api/notifications/send", async (req, res) => {
    try {
      console.log(`📱 Received push notification request`);
      
      // Verify authentication
      const authenticatedUid = await verifyAuthToken(req.headers.authorization);
      
      if (!authenticatedUid) {
        console.warn(`❌ Authentication failed for notification request`);
        return res.status(401).json({ 
          error: "Unauthorized",
          message: "Você precisa estar autenticado."
        });
      }

      console.log(`✅ Authenticated user: ${authenticatedUid}`);

      if (!db) {
        console.error(`❌ Database not available`);
        return res.status(503).json({ 
          error: "Service unavailable",
          message: "Serviço de notificações não disponível."
        });
      }

      const { recipientUid, title, body, data } = req.body;

      if (!recipientUid || !title || !body) {
        console.warn(`❌ Missing required fields:`, { recipientUid: !!recipientUid, title: !!title, body: !!body });
        return res.status(400).json({ 
          error: "Missing required fields",
          message: "Campos obrigatórios: recipientUid, title, body"
        });
      }

      console.log(`📬 Sending notification to ${recipientUid}: "${title}"`);

      // Get recipient's FCM token
      const tokenSnapshot = await db.ref(`fcmTokens/${recipientUid}`).once('value');
      const tokenData = tokenSnapshot.val();

      if (!tokenData || !tokenData.token) {
        console.log(`⚠️  No FCM token found for user ${recipientUid}`);
        return res.json({ 
          success: false,
          message: "Usuário não possui notificações ativadas"
        });
      }

      const fcmToken = tokenData.token;
      console.log(`🔑 FCM token found for user ${recipientUid}`);

      // Prepare the message
      const message = {
        notification: {
          title,
          body,
        },
        data: data || {},
        token: fcmToken,
      };

      // Send the notification via Firebase Admin
      try {
        const response = await admin.messaging().send(message);
        console.log(`✅ Push notification sent to ${recipientUid}:`, response);
        
        res.json({ 
          success: true,
          messageId: response,
          message: "Notificação enviada com sucesso"
        });
      } catch (fcmError: any) {
        console.error("❌ FCM send error:", fcmError);
        
        // If token is invalid or has auth error (old VAPID key), remove it from database
        // This will force the app to regenerate a new token on next launch
        if (fcmError.code === 'messaging/invalid-registration-token' || 
            fcmError.code === 'messaging/registration-token-not-registered' ||
            fcmError.code === 'messaging/third-party-auth-error') {
          await db.ref(`fcmTokens/${recipientUid}`).remove();
          console.log(`🗑️  Removed invalid/outdated FCM token for user ${recipientUid}`);
          console.log(`✨  User will get a new token automatically on next app launch`);
        }
        
        return res.status(500).json({ 
          success: false,
          error: "Failed to send notification",
          message: "Erro ao enviar notificação push",
          details: fcmError.message
        });
      }

    } catch (error: any) {
      console.error("❌ Error sending push notification:", error);
      res.status(500).json({ 
        error: "Internal server error",
        message: "Erro ao processar notificação",
        details: error.message
      });
    }
  });

  // ============================================================================
  // QR Code Authentication Routes
  // ============================================================================

  // Helper function to generate a random session ID (128-bit)
  function generateSessionId(): string {
    const buffer = Buffer.alloc(16);
    for (let i = 0; i < 16; i++) {
      buffer[i] = Math.floor(Math.random() * 256);
    }
    return buffer.toString('hex');
  }

  // Background cleanup of old QR sessions (runs periodically, not inline)
  async function cleanupOldQrSessions() {
    if (!db) return;
    
    try {
      const sessionsRef = db.ref('qrSessions');
      const snapshot = await sessionsRef.once('value');
      const sessions = snapshot.val() || {};
      const now = Date.now();
      const fiveMinutesAgo = now - (5 * 60 * 1000);
      const twoMinutesAgo = now - (2 * 60 * 1000);
      
      let deletedCount = 0;
      for (const [sessionId, session] of Object.entries(sessions)) {
        const sessionData = session as any;
        
        // NEVER delete pending sessions (they might be actively authorizing)
        if (sessionData.status === 'pending') {
          // Only delete if they're very old (>5 minutes) AND expired by timestamp
          if (sessionData.createdAt < fiveMinutesAgo && sessionData.expiresAt < now) {
            await db.ref(`qrSessions/${sessionId}`).remove();
            deletedCount++;
          }
          continue;
        }
        
        // Delete non-pending sessions that are:
        // 1. Older than 5 minutes
        // 2. Explicitly marked as expired
        // 3. Already consumed or approved (older than 2 minutes - safe buffer)
        if (
          sessionData.createdAt < fiveMinutesAgo ||
          (sessionData.status === 'expired') ||
          ((sessionData.status === 'consumed' || sessionData.status === 'approved') && sessionData.createdAt < twoMinutesAgo)
        ) {
          await db.ref(`qrSessions/${sessionId}`).remove();
          deletedCount++;
        }
      }
      
      if (deletedCount > 0) {
        console.log(`🗑️  Cleaned up ${deletedCount} old QR sessions`);
      }
    } catch (error) {
      console.error("Error cleaning up QR sessions:", error);
    }
  }

  // Run QR session cleanup every 2 minutes (background job)
  if (db) {
    setInterval(cleanupOldQrSessions, 2 * 60 * 1000);
    // Run once at startup
    cleanupOldQrSessions();
  }

  // POST /api/auth/qr/session - Create a new QR login session
  app.post("/api/auth/qr/session", async (req, res) => {
    try {
      if (!db) {
        return res.status(503).json({ 
          error: "Service unavailable",
          message: "QR login requires server configuration"
        });
      }

      // Generate a unique session ID and secret
      const sessionId = generateSessionId();
      const secret = generateSessionId(); // Use same method for generating secret
      const now = Date.now();
      const expiresAt = now + (90 * 1000); // 90 seconds TTL

      // Create session in database (secret is NOT stored, only hashed version)
      const crypto = await import('crypto');
      const secretHash = crypto.createHash('sha256').update(secret).digest('hex');

      const sessionData = {
        sessionId,
        status: "pending",
        createdAt: now,
        expiresAt,
        secretHash, // Store hash, not the secret itself
      };

      await db.ref(`qrSessions/${sessionId}`).set(sessionData);

      console.log(`✅ Created QR session: ${sessionId}`);
      
      // Verify the session was written
      const verifySnapshot = await db.ref(`qrSessions/${sessionId}`).once('value');
      console.log(`✅ Verified session ${sessionId} exists:`, verifySnapshot.exists());

      // Return session data for QR code generation
      // The secret is returned to the desktop and stored locally
      // It will be used to retrieve the custom token later
      res.json({
        success: true,
        sessionId,
        secret, // Desktop stores this locally
        expiresAt,
      });

    } catch (error: any) {
      console.error("Error creating QR session:", error);
      res.status(500).json({ 
        error: "Internal server error",
        message: "Erro ao criar sessão de QR Code"
      });
    }
  });

  // Rate limiting for QR authorization (simple in-memory rate limiter)
  const qrAuthRateLimit = new Map<string, number[]>();
  const QR_AUTH_MAX_ATTEMPTS = 5;
  const QR_AUTH_WINDOW_MS = 60 * 1000; // 1 minute

  // POST /api/auth/qr/authorize - Authorize a QR session and issue custom token
  app.post("/api/auth/qr/authorize", async (req, res) => {
    try {
      if (!db) {
        return res.status(503).json({ 
          error: "Service unavailable",
          message: "QR login requires server configuration"
        });
      }

      // Verify authentication
      const authenticatedUid = await verifyAuthToken(req.headers.authorization);
      
      if (!authenticatedUid) {
        return res.status(401).json({ 
          error: "Autenticação necessária",
          message: "Você precisa estar autenticado para autorizar o login"
        });
      }

      // Rate limiting per user
      const now = Date.now();
      const userAttempts = qrAuthRateLimit.get(authenticatedUid) || [];
      const recentAttempts = userAttempts.filter(t => now - t < QR_AUTH_WINDOW_MS);
      
      if (recentAttempts.length >= QR_AUTH_MAX_ATTEMPTS) {
        return res.status(429).json({
          error: "Too many requests",
          message: "Muitas tentativas. Aguarde 1 minuto e tente novamente."
        });
      }
      
      recentAttempts.push(now);
      qrAuthRateLimit.set(authenticatedUid, recentAttempts);

      const { sessionId } = req.body;

      if (!sessionId || typeof sessionId !== 'string' || sessionId.length < 32) {
        return res.status(400).json({ 
          error: "Invalid session ID",
          message: "ID de sessão inválido"
        });
      }

      // Get user data for display first (user profiles are in userProfiles/ not users/)
      const userSnapshot = await db.ref(`userProfiles/${authenticatedUid}`).once('value');
      const userData = userSnapshot.val() || {};

      // Create a custom token for the authenticated user
      const customToken = await admin.auth().createCustomToken(authenticatedUid);

      // Pre-check: Verify session exists before attempting transaction
      const sessionRef = db.ref(`qrSessions/${sessionId}`);
      const preCheckSnapshot = await sessionRef.once('value');
      
      console.log(`🔍 Pre-check: Session ${sessionId} exists:`, preCheckSnapshot.exists());
      if (preCheckSnapshot.exists()) {
        console.log(`📋 Session data:`, JSON.stringify(preCheckSnapshot.val()));
      } else {
        console.log(`❌ Session ${sessionId} not found in database before transaction`);
        return res.status(404).json({
          error: "Session not found",
          message: "QR Code expirado ou inválido. Gere um novo código."
        });
      }

      // Use a transaction to atomically check and update the session
      // This prevents race conditions with cleanup and ensures session is still pending
      // NOTE: Firebase transactions call the callback with null first, then with actual data
      const transactionResult = await sessionRef.transaction((session) => {
        console.log(`🔄 Transaction callback - session:`, session ? 'exists' : 'null', session ? `status: ${session.status}` : '');
        
        // Firebase calls callback with null first - just return undefined to let it fetch actual data
        if (!session) {
          console.log(`⏳ First transaction callback (null) - waiting for actual data`);
          return undefined; // Continue transaction - let Firebase fetch the actual data
        }

        // Session already processed by another request
        if (session.status !== 'pending') {
          console.log(`❌ Transaction aborted - status is ${session.status}, not pending`);
          return; // Abort transaction
        }

        // Session expired
        const currentTime = Date.now();
        if (currentTime > session.expiresAt) {
          console.log(`❌ Transaction aborted - session expired (${currentTime} > ${session.expiresAt})`);
          session.status = 'expired';
          return session; // Save expired status but don't approve
        }

        // Session too old (> 2 minutes)
        const sessionAge = currentTime - session.createdAt;
        if (sessionAge > 2 * 60 * 1000) {
          console.log(`❌ Transaction aborted - session too old (${sessionAge}ms > 120000ms)`);
          session.status = 'expired';
          return session; // Save expired status but don't approve
        }

        // All checks passed - approve the session
        console.log(`✅ Transaction approving session ${sessionId}`);
        session.status = 'approved';
        session.customToken = customToken;
        session.approvedBy = authenticatedUid;
        session.approvedAt = currentTime;
        session.userDisplayName = userData.displayName || '';
        session.userPhotoURL = userData.photoURL || '';
        return session;
      });

      // Check transaction result
      if (!transactionResult.committed) {
        return res.status(409).json({
          error: "Transaction failed",
          message: "Falha ao processar a autorização. Tente novamente."
        });
      }

      const finalSession = transactionResult.snapshot.val();
      
      // Session was deleted or doesn't exist
      if (!finalSession) {
        return res.status(404).json({ 
          error: "Session not found",
          message: "Sessão não encontrada ou expirada"
        });
      }

      // Session was already processed
      if (finalSession.status !== 'approved') {
        if (finalSession.status === 'expired') {
          return res.status(400).json({ 
            error: "Session expired",
            message: "Sessão expirada. Gere um novo QR Code"
          });
        }
        return res.status(400).json({ 
          error: "Session already processed",
          message: "Esta sessão já foi processada"
        });
      }

      // Log the authorization for audit trail
      console.log(`✅ QR session ${sessionId} authorized by user ${authenticatedUid}`);

      res.json({
        success: true,
        message: "Login autorizado com sucesso",
        userDisplayName: userData.displayName || '',
      });

    } catch (error: any) {
      console.error("Error authorizing QR session:", error);
      res.status(500).json({ 
        error: "Internal server error",
        message: "Erro ao autorizar sessão de QR Code"
      });
    }
  });

  // POST /api/auth/qr/retrieve-token - Retrieve custom token with secret (desktop only)
  app.post("/api/auth/qr/retrieve-token", async (req, res) => {
    try {
      if (!db) {
        return res.status(503).json({ 
          error: "Service unavailable",
          message: "QR login requires server configuration"
        });
      }

      const { sessionId, secret } = req.body;

      if (!sessionId || !secret || typeof sessionId !== 'string' || typeof secret !== 'string') {
        return res.status(400).json({ 
          error: "Invalid parameters",
          message: "SessionId e secret são obrigatórios"
        });
      }

      // Get session from database
      const sessionRef = db.ref(`qrSessions/${sessionId}`);
      const sessionSnapshot = await sessionRef.once('value');
      
      if (!sessionSnapshot.exists()) {
        return res.status(404).json({ 
          error: "Session not found",
          message: "Sessão não encontrada ou expirada"
        });
      }

      const session = sessionSnapshot.val();

      // Verify secret matches
      const crypto = await import('crypto');
      const providedSecretHash = crypto.createHash('sha256').update(secret).digest('hex');
      
      if (providedSecretHash !== session.secretHash) {
        // Log failed attempt
        console.warn(`❌ Failed secret verification for session ${sessionId}`);
        return res.status(403).json({ 
          error: "Invalid secret",
          message: "Secret inválido"
        });
      }

      // Check if session has expired
      const now = Date.now();
      if (now > session.expiresAt) {
        await sessionRef.update({ status: 'expired' });
        return res.status(400).json({ 
          error: "Session expired",
          message: "Sessão expirada"
        });
      }

      // Check session status
      if (session.status === 'pending') {
        // Not approved yet
        return res.json({
          success: false,
          status: 'pending',
          message: "Aguardando aprovação"
        });
      } else if (session.status === 'approved') {
        // Session approved, return custom token and mark as consumed
        const customToken = session.customToken;
        
        if (!customToken) {
          return res.status(500).json({
            error: "Token not available",
            message: "Token não disponível"
          });
        }

        // Mark session as consumed and remove custom token from database
        await sessionRef.update({
          status: 'consumed',
          customToken: null, // Remove token after retrieval for security
        });

        console.log(`✅ Desktop retrieved token for session ${sessionId}`);

        res.json({
          success: true,
          status: 'approved',
          customToken,
          userDisplayName: session.userDisplayName || '',
          userPhotoURL: session.userPhotoURL || '',
        });
      } else {
        // Session already consumed or expired
        return res.status(400).json({
          error: "Session not available",
          message: `Sessão ${session.status}`,
          status: session.status
        });
      }

    } catch (error: any) {
      console.error("Error retrieving QR token:", error);
      res.status(500).json({ 
        error: "Internal server error",
        message: "Erro ao recuperar token"
      });
    }
  });

  // Create temporary grade report link
  app.post("/api/grade-reports/create", async (req, res) => {
    try {
      if (!db) {
        return res.status(503).json({
          error: "Firebase not configured",
          message: "Serviço não disponível"
        });
      }

      const authenticatedUid = await verifyAuthToken(req.headers.authorization);
      if (!authenticatedUid) {
        return res.status(401).json({ error: "Não autorizado" });
      }

      const { gradesData } = req.body;

      if (!gradesData) {
        return res.status(400).json({ error: "Dados de notas necessários" });
      }

      const reportId = `report_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const createdAt = Date.now();
      const expiresAt = createdAt + (7 * 24 * 60 * 60 * 1000); // 7 days

      const usersRef = db.ref(`users/${authenticatedUid}`);
      const userSnapshot = await usersRef.once('value');
      const userData = userSnapshot.val() || {};

      const reportData = {
        id: reportId,
        uid: authenticatedUid,
        studentName: userData.displayName || "Aluno",
        studentCpf: userData.cpf || "",
        studentGrade: userData.grade || "",
        gradesData,
        createdAt,
        expiresAt,
        accessCount: 0,
      };

      await db.ref(`tempGradeReports/${reportId}`).set(reportData);

      console.log(`✅ Created temporary grade report ${reportId} for ${authenticatedUid}`);

      res.json({
        success: true,
        reportId,
        expiresAt,
      });
    } catch (error: any) {
      console.error("Error creating temporary grade report:", error);
      res.status(500).json({ error: "Erro ao criar relatório" });
    }
  });

  // Get temporary grade report by ID
  app.get("/api/grade-reports/:reportId", async (req, res) => {
    try {
      if (!db) {
        return res.status(503).json({
          error: "Firebase not configured",
          message: "Serviço não disponível"
        });
      }

      const { reportId } = req.params;

      if (!reportId) {
        return res.status(400).json({ error: "ID do relatório necessário" });
      }

      const reportRef = db.ref(`tempGradeReports/${reportId}`);
      const snapshot = await reportRef.once('value');
      const reportData = snapshot.val();

      if (!reportData) {
        return res.status(404).json({ error: "Relatório não encontrado" });
      }

      const now = Date.now();

      if (now > reportData.expiresAt) {
        await reportRef.remove();
        return res.status(410).json({ error: "Relatório expirado" });
      }

      await reportRef.update({
        accessCount: (reportData.accessCount || 0) + 1
      });

      res.json({
        success: true,
        report: reportData,
      });
    } catch (error: any) {
      console.error("Error fetching temporary grade report:", error);
      res.status(500).json({ error: "Erro ao buscar relatório" });
    }
  });

  // ============================================================================
  // EDUTOK API KEY MANAGEMENT ROUTES
  // ============================================================================

  // In-memory rate limiting store (per key)
  const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

  // Generate a secure EduTok API key
  function generateEduApiKey(): string {
    const bytes = crypto.randomBytes(24);
    return `edu_${bytes.toString('base64url')}`;
  }

  // Check rate limit for an API key
  function checkRateLimit(keyId: string, limit: number = 60): { allowed: boolean; remaining: number; resetIn: number } {
    const now = Date.now();
    const windowMs = 60000; // 1 minute window
    
    let record = rateLimitStore.get(keyId);
    
    if (!record || now >= record.resetAt) {
      record = { count: 0, resetAt: now + windowMs };
      rateLimitStore.set(keyId, record);
    }
    
    record.count++;
    
    return {
      allowed: record.count <= limit,
      remaining: Math.max(0, limit - record.count),
      resetIn: Math.max(0, record.resetAt - now),
    };
  }

  // Create a new EduTok API Key
  app.post("/api/devtools/api-keys", async (req, res) => {
    try {
      const authenticatedUid = await verifyAuthToken(req.headers.authorization);
      
      if (!authenticatedUid) {
        return res.status(401).json({ 
          error: "Autenticação necessária",
          message: "Você precisa estar logado para criar uma chave API."
        });
      }

      if (!db) {
        return res.status(503).json({ 
          error: "Serviço indisponível",
          message: "O serviço de banco de dados não está configurado."
        });
      }

      const { name } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length < 3) {
        return res.status(400).json({
          error: "Nome inválido",
          message: "O nome da chave deve ter pelo menos 3 caracteres."
        });
      }

      // Get user email
      const userSnapshot = await db.ref(`users/${authenticatedUid}`).once('value');
      const userData = userSnapshot.val();
      const ownerEmail = userData?.email || "unknown@edutok.com";

      // Check how many keys user already has (limit to 5)
      const existingKeysSnapshot = await db.ref('eduApiKeys')
        .orderByChild('ownerUid')
        .equalTo(authenticatedUid)
        .once('value');
      
      const existingKeys = existingKeysSnapshot.val() || {};
      const activeKeysCount = Object.values(existingKeys).filter((k: any) => k.active).length;
      
      if (activeKeysCount >= 5) {
        return res.status(400).json({
          error: "Limite atingido",
          message: "Você já tem 5 chaves API ativas. Revogue uma chave existente para criar uma nova."
        });
      }

      // Generate the key
      const apiKey = generateEduApiKey();
      const keyHash = hashString(apiKey);
      const keyId = `edukey_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

      const today = new Date().toISOString().split('T')[0];
      const keyData = {
        id: keyId,
        keyHash,
        name: name.trim(),
        ownerUid: authenticatedUid,
        ownerEmail,
        createdAt: Date.now(),
        usageCount: 0,
        rateLimit: 60,
        dailyTokenLimit: 500, // 500 tokens per day limit
        tokensUsedToday: 0,
        totalTokensUsed: 0,
        lastTokenResetDate: today,
        active: true,
      };

      await db.ref(`eduApiKeys/${keyId}`).set(keyData);

      console.log(`✅ Created EduTok API key ${keyId} for user ${authenticatedUid}`);

      // Return the actual key ONLY on creation (never stored in plaintext)
      res.json({
        success: true,
        key: {
          id: keyId,
          apiKey, // Only returned once!
          name: keyData.name,
          createdAt: keyData.createdAt,
          rateLimit: keyData.rateLimit,
          dailyTokenLimit: keyData.dailyTokenLimit,
        },
        warning: "Guarde esta chave com segurança! Ela não será mostrada novamente.",
      });
    } catch (error: any) {
      console.error("Error creating API key:", error);
      res.status(500).json({ error: "Erro ao criar chave API" });
    }
  });

  // List user's API keys (without the actual key value)
  app.get("/api/devtools/api-keys", async (req, res) => {
    try {
      const authenticatedUid = await verifyAuthToken(req.headers.authorization);
      
      if (!authenticatedUid) {
        return res.status(401).json({ error: "Autenticação necessária" });
      }

      if (!db) {
        return res.status(503).json({ error: "Serviço indisponível" });
      }

      const keysSnapshot = await db.ref('eduApiKeys')
        .orderByChild('ownerUid')
        .equalTo(authenticatedUid)
        .once('value');
      
      const keys = keysSnapshot.val() || {};
      
      // Check if we need to reset daily token counts
      const today = new Date().toISOString().split('T')[0];
      
      // Return keys without the hash, with daily token info
      const safeKeys = Object.values(keys).map((key: any) => {
        // Reset token count if it's a new day
        const tokensUsedToday = key.lastTokenResetDate === today ? (key.tokensUsedToday || 0) : 0;
        
        return {
          id: key.id,
          name: key.name,
          createdAt: key.createdAt,
          lastUsedAt: key.lastUsedAt,
          usageCount: key.usageCount || 0,
          rateLimit: key.rateLimit || 60,
          dailyTokenLimit: key.dailyTokenLimit || 500,
          tokensUsedToday,
          totalTokensUsed: key.totalTokensUsed || 0,
          active: key.active,
          revokedAt: key.revokedAt,
        };
      });

      res.json({ success: true, keys: safeKeys });
    } catch (error: any) {
      console.error("Error listing API keys:", error);
      res.status(500).json({ error: "Erro ao listar chaves API" });
    }
  });

  // Revoke an API key
  app.delete("/api/devtools/api-keys/:keyId", async (req, res) => {
    try {
      const authenticatedUid = await verifyAuthToken(req.headers.authorization);
      
      if (!authenticatedUid) {
        return res.status(401).json({ error: "Autenticação necessária" });
      }

      if (!db) {
        return res.status(503).json({ error: "Serviço indisponível" });
      }

      const { keyId } = req.params;

      const keySnapshot = await db.ref(`eduApiKeys/${keyId}`).once('value');
      const keyData = keySnapshot.val();

      if (!keyData) {
        return res.status(404).json({ error: "Chave não encontrada" });
      }

      if (keyData.ownerUid !== authenticatedUid) {
        return res.status(403).json({ error: "Sem permissão para revogar esta chave" });
      }

      await db.ref(`eduApiKeys/${keyId}`).update({
        active: false,
        revokedAt: Date.now(),
      });

      console.log(`🔐 Revoked API key ${keyId} by user ${authenticatedUid}`);

      res.json({ success: true, message: "Chave revogada com sucesso" });
    } catch (error: any) {
      console.error("Error revoking API key:", error);
      res.status(500).json({ error: "Erro ao revogar chave API" });
    }
  });

  // ============================================================================
  // API KEY ANALYTICS ENDPOINT
  // ============================================================================

  app.get("/api/devtools/api-keys/:keyId/analytics", async (req, res) => {
    try {
      const authenticatedUid = await verifyAuthToken(req.headers.authorization);
      
      if (!authenticatedUid) {
        return res.status(401).json({ error: "Autenticação necessária" });
      }

      if (!db) {
        return res.status(503).json({ error: "Serviço indisponível" });
      }

      const { keyId } = req.params;
      const { days = 7 } = req.query;

      // Verify ownership
      const keySnapshot = await db.ref(`eduApiKeys/${keyId}`).once('value');
      const keyData = keySnapshot.val();

      if (!keyData) {
        return res.status(404).json({ error: "Chave não encontrada" });
      }

      if (keyData.ownerUid !== authenticatedUid) {
        return res.status(403).json({ error: "Sem permissão" });
      }

      // Get analytics for the last N days
      const analyticsSnapshot = await db.ref(`eduApiKeyAnalytics/${keyId}`).once('value');
      const allAnalytics = analyticsSnapshot.val() || {};

      // Get dates for the last N days
      const numDays = Math.min(parseInt(days as string) || 7, 30);
      const dates: string[] = [];
      for (let i = numDays - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
      }

      // Build analytics array with zeros for missing days
      const dailyAnalytics = dates.map(date => ({
        date,
        requestCount: allAnalytics[date]?.requestCount || 0,
        successCount: allAnalytics[date]?.successCount || 0,
        errorCount: allAnalytics[date]?.errorCount || 0,
        tokensUsed: allAnalytics[date]?.tokensUsed || 0,
        estimatedCostUsd: allAnalytics[date]?.estimatedCostUsd || 0,
        avgLatencyMs: allAnalytics[date]?.avgLatencyMs || 0,
      }));

      // Calculate totals
      const totals = {
        totalRequests: dailyAnalytics.reduce((sum, d) => sum + d.requestCount, 0),
        totalTokens: dailyAnalytics.reduce((sum, d) => sum + d.tokensUsed, 0),
        totalCost: dailyAnalytics.reduce((sum, d) => sum + d.estimatedCostUsd, 0),
        successRate: 0,
        avgLatency: 0,
      };

      const successSum = dailyAnalytics.reduce((sum, d) => sum + d.successCount, 0);
      const errorSum = dailyAnalytics.reduce((sum, d) => sum + d.errorCount, 0);
      totals.successRate = totals.totalRequests > 0 ? (successSum / totals.totalRequests) * 100 : 100;
      
      const latencySum = dailyAnalytics.reduce((sum, d) => sum + (d.avgLatencyMs * d.requestCount), 0);
      totals.avgLatency = totals.totalRequests > 0 ? Math.round(latencySum / totals.totalRequests) : 0;

      // Get recent logs (last 20)
      const logsSnapshot = await db.ref(`eduApiKeyLogs/${keyId}`)
        .orderByChild('timestamp')
        .limitToLast(20)
        .once('value');
      
      const logs = logsSnapshot.val() || {};
      const recentLogs = Object.values(logs)
        .sort((a: any, b: any) => b.timestamp - a.timestamp)
        .slice(0, 20);

      res.json({
        success: true,
        keyId,
        keyName: keyData.name,
        dailyTokenLimit: keyData.dailyTokenLimit || 500,
        tokensUsedToday: keyData.tokensUsedToday || 0,
        totalTokensUsed: keyData.totalTokensUsed || 0,
        dailyAnalytics,
        totals,
        recentLogs,
      });
    } catch (error: any) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ error: "Erro ao buscar analytics" });
    }
  });

  // ============================================================================
  // EDUTOK API PROXY ENDPOINT (for external use)
  // ============================================================================

  // CORS headers for external API access
  const setCorsHeaders = (res: any) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
  };

  // Handle preflight OPTIONS request
  app.options("/api/v1/chat/completions", (req, res) => {
    setCorsHeaders(res);
    res.status(204).end();
  });

  // Chat completion proxy - users call this with their edu_ key
  app.post("/api/v1/chat/completions", async (req, res) => {
    // Enable CORS for external embed usage
    setCorsHeaders(res);
    
    try {
      // Get API key from header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer edu_')) {
        return res.status(401).json({
          error: {
            message: "Invalid API key. Expected 'Bearer edu_...'",
            type: "invalid_request_error",
            code: "invalid_api_key"
          }
        });
      }

      const apiKey = authHeader.split('Bearer ')[1];
      const keyHash = hashString(apiKey);

      if (!db) {
        return res.status(503).json({
          error: {
            message: "Service temporarily unavailable",
            type: "server_error",
            code: "service_unavailable"
          }
        });
      }

      if (!groq) {
        return res.status(503).json({
          error: {
            message: "AI service not configured",
            type: "server_error",
            code: "ai_not_configured"
          }
        });
      }

      // Find key by hash
      const keysSnapshot = await db.ref('eduApiKeys')
        .orderByChild('keyHash')
        .equalTo(keyHash)
        .once('value');
      
      const keys = keysSnapshot.val();
      if (!keys) {
        return res.status(401).json({
          error: {
            message: "Invalid API key",
            type: "invalid_request_error",
            code: "invalid_api_key"
          }
        });
      }

      const keyData = Object.values(keys)[0] as any;

      if (!keyData.active) {
        return res.status(401).json({
          error: {
            message: "API key has been revoked",
            type: "invalid_request_error",
            code: "key_revoked"
          }
        });
      }

      // Check rate limit (per minute)
      const rateCheck = checkRateLimit(keyData.id, keyData.rateLimit || 60);
      
      res.setHeader('X-RateLimit-Limit', (keyData.rateLimit || 60).toString());
      res.setHeader('X-RateLimit-Remaining', rateCheck.remaining.toString());
      res.setHeader('X-RateLimit-Reset', Math.ceil(rateCheck.resetIn / 1000).toString());

      if (!rateCheck.allowed) {
        return res.status(429).json({
          error: {
            message: "Rate limit exceeded. Please slow down.",
            type: "rate_limit_error",
            code: "rate_limit_exceeded"
          }
        });
      }

      // Check daily token limit (500 tokens/day default)
      const today = new Date().toISOString().split('T')[0];
      const dailyTokenLimit = keyData.dailyTokenLimit || 500;
      let tokensUsedToday = keyData.tokensUsedToday || 0;
      
      // Reset if new day
      if (keyData.lastTokenResetDate !== today) {
        tokensUsedToday = 0;
        await db.ref(`eduApiKeys/${keyData.id}`).update({
          tokensUsedToday: 0,
          lastTokenResetDate: today,
        });
      }

      // Add daily token headers
      res.setHeader('X-DailyToken-Limit', dailyTokenLimit.toString());
      res.setHeader('X-DailyToken-Used', tokensUsedToday.toString());
      res.setHeader('X-DailyToken-Remaining', Math.max(0, dailyTokenLimit - tokensUsedToday).toString());

      if (tokensUsedToday >= dailyTokenLimit) {
        return res.status(429).json({
          error: {
            message: `Daily token limit exceeded (${dailyTokenLimit} tokens/day). Resets at midnight UTC.`,
            type: "rate_limit_error",
            code: "daily_token_limit_exceeded",
            tokensUsed: tokensUsedToday,
            tokensLimit: dailyTokenLimit,
          }
        });
      }

      // Validate request body
      const { messages, model, temperature, max_tokens, stream } = req.body;

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({
          error: {
            message: "messages is required and must be a non-empty array",
            type: "invalid_request_error",
            code: "invalid_messages"
          }
        });
      }

      const startTime = Date.now();

      // Call Groq API (our actual provider)
      const completion = await groq.chat.completions.create({
        messages,
        model: model || "llama-3.3-70b-versatile",
        temperature: temperature ?? 0.7,
        max_tokens: Math.min(max_tokens || 2048, dailyTokenLimit - tokensUsedToday), // Cap to remaining tokens
        stream: false, // We don't support streaming yet
      });

      const latencyMs = Date.now() - startTime;
      const tokensUsed = completion.usage?.total_tokens || 0;
      const promptTokens = completion.usage?.prompt_tokens || 0;
      const completionTokens = completion.usage?.completion_tokens || 0;
      
      // Calculate estimated cost (based on Groq pricing ~$0.00005 per 1K tokens)
      const costUsd = (tokensUsed / 1000) * 0.00005;

      // Update usage stats with token tracking
      await db.ref(`eduApiKeys/${keyData.id}`).update({
        lastUsedAt: Date.now(),
        usageCount: (keyData.usageCount || 0) + 1,
        tokensUsedToday: tokensUsedToday + tokensUsed,
        totalTokensUsed: (keyData.totalTokensUsed || 0) + tokensUsed,
        lastTokenResetDate: today,
      });

      // Log detailed usage for analytics
      await db.ref(`eduApiKeyLogs/${keyData.id}`).push({
        timestamp: Date.now(),
        endpoint: "/v1/chat/completions",
        tokens: tokensUsed,
        promptTokens,
        completionTokens,
        model: completion.model,
        latencyMs,
        costUsd,
        success: true,
      });

      // Update daily analytics
      const analyticsRef = db.ref(`eduApiKeyAnalytics/${keyData.id}/${today}`);
      const analyticsSnapshot = await analyticsRef.once('value');
      const existingAnalytics = analyticsSnapshot.val() || {
        requestCount: 0,
        successCount: 0,
        errorCount: 0,
        tokensUsed: 0,
        estimatedCostUsd: 0,
        totalLatencyMs: 0,
      };

      await analyticsRef.set({
        requestCount: existingAnalytics.requestCount + 1,
        successCount: existingAnalytics.successCount + 1,
        errorCount: existingAnalytics.errorCount,
        tokensUsed: existingAnalytics.tokensUsed + tokensUsed,
        estimatedCostUsd: existingAnalytics.estimatedCostUsd + costUsd,
        avgLatencyMs: Math.round((existingAnalytics.totalLatencyMs + latencyMs) / (existingAnalytics.requestCount + 1)),
        totalLatencyMs: existingAnalytics.totalLatencyMs + latencyMs,
      });

      // Return OpenAI-compatible response
      res.json({
        id: `edu-${Date.now()}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: completion.model,
        choices: completion.choices,
        usage: completion.usage,
      });
    } catch (error: any) {
      console.error("API proxy error:", error);
      res.status(500).json({
        error: {
          message: error.message || "Internal server error",
          type: "server_error",
          code: "internal_error"
        }
      });
    }
  });

  // Generate embeddable HTML code for chatbot
  app.get("/api/devtools/generate-embed-code/:keyId", async (req, res) => {
    try {
      const authenticatedUid = await verifyAuthToken(req.headers.authorization);
      
      if (!authenticatedUid) {
        return res.status(401).json({ error: "Autenticação necessária" });
      }

      if (!db) {
        return res.status(503).json({ error: "Serviço indisponível" });
      }

      const { keyId } = req.params;

      const keySnapshot = await db.ref(`eduApiKeys/${keyId}`).once('value');
      const keyData = keySnapshot.val();

      if (!keyData) {
        return res.status(404).json({ error: "Chave não encontrada" });
      }

      if (keyData.ownerUid !== authenticatedUid) {
        return res.status(403).json({ error: "Sem permissão" });
      }

      // Get the base URL for the API
      // Always use HTTPS for Replit domains (proxy may report http)
      const host = req.get('host') || '';
      const isReplitDomain = host.includes('replit.dev') || host.includes('replit.app');
      const protocol = isReplitDomain ? 'https' : (req.get('x-forwarded-proto') || req.protocol);
      const baseUrl = `${protocol}://${host}`;

      // Generate HTML embed code - Modern Eduna Design
      const embedCode = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Eduna - Assistente IA do EduTok</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #6366f1;
            --primary-dark: #4f46e5;
            --secondary: #06b6d4;
            --accent: #8b5cf6;
            --bg-dark: #0f0f1a;
            --bg-card: rgba(15, 15, 30, 0.8);
            --glass: rgba(255, 255, 255, 0.03);
            --glass-border: rgba(255, 255, 255, 0.08);
            --text-primary: #ffffff;
            --text-secondary: rgba(255, 255, 255, 0.7);
            --text-muted: rgba(255, 255, 255, 0.4);
        }
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: var(--bg-dark);
            background-image: 
                radial-gradient(ellipse at 20% 0%, rgba(99, 102, 241, 0.15) 0%, transparent 50%),
                radial-gradient(ellipse at 80% 100%, rgba(6, 182, 212, 0.1) 0%, transparent 50%),
                radial-gradient(ellipse at 50% 50%, rgba(139, 92, 246, 0.05) 0%, transparent 70%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            overflow: hidden;
        }
        
        .particles {
            position: fixed;
            inset: 0;
            pointer-events: none;
            overflow: hidden;
        }
        
        .particle {
            position: absolute;
            width: 4px;
            height: 4px;
            background: var(--primary);
            border-radius: 50%;
            opacity: 0.3;
            animation: float 20s infinite ease-in-out;
        }
        
        @keyframes float {
            0%, 100% { transform: translateY(100vh) rotate(0deg); opacity: 0; }
            10% { opacity: 0.3; }
            90% { opacity: 0.3; }
            100% { transform: translateY(-100vh) rotate(720deg); opacity: 0; }
        }
        
        .chat-widget {
            width: 100%;
            max-width: 420px;
            background: var(--bg-card);
            backdrop-filter: blur(40px);
            -webkit-backdrop-filter: blur(40px);
            border-radius: 28px;
            border: 1px solid var(--glass-border);
            box-shadow: 
                0 0 0 1px rgba(255, 255, 255, 0.05) inset,
                0 25px 50px -12px rgba(0, 0, 0, 0.5),
                0 0 100px rgba(99, 102, 241, 0.1);
            overflow: hidden;
            position: relative;
        }
        
        .chat-header {
            background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 50%, var(--secondary) 100%);
            padding: 24px;
            position: relative;
            overflow: hidden;
        }
        
        .chat-header::before {
            content: '';
            position: absolute;
            inset: 0;
            background: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
            opacity: 0.03;
        }
        
        .header-content {
            display: flex;
            align-items: center;
            gap: 16px;
            position: relative;
            z-index: 1;
        }
        
        .avatar {
            width: 56px;
            height: 56px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            position: relative;
        }
        
        .avatar svg {
            width: 32px;
            height: 32px;
            fill: white;
        }
        
        .avatar::after {
            content: '';
            position: absolute;
            bottom: -2px;
            right: -2px;
            width: 14px;
            height: 14px;
            background: #22c55e;
            border-radius: 50%;
            border: 3px solid var(--primary);
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
            50% { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); }
        }
        
        .header-text h1 {
            font-size: 20px;
            font-weight: 700;
            color: white;
            letter-spacing: -0.02em;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .header-text h1 .badge {
            font-size: 10px;
            font-weight: 600;
            background: rgba(255, 255, 255, 0.2);
            padding: 3px 8px;
            border-radius: 20px;
            letter-spacing: 0.05em;
        }
        
        .header-text p {
            font-size: 13px;
            color: rgba(255, 255, 255, 0.85);
            margin-top: 2px;
        }
        
        .edutok-brand {
            position: absolute;
            top: 16px;
            right: 16px;
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 11px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.7);
            background: rgba(255, 255, 255, 0.1);
            padding: 6px 12px;
            border-radius: 20px;
            backdrop-filter: blur(10px);
        }
        
        .edutok-brand svg {
            width: 14px;
            height: 14px;
        }
        
        .chat-messages {
            height: 380px;
            overflow-y: auto;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 16px;
            background: linear-gradient(180deg, var(--glass) 0%, transparent 100%);
        }
        
        .chat-messages::-webkit-scrollbar {
            width: 6px;
        }
        
        .chat-messages::-webkit-scrollbar-track {
            background: transparent;
        }
        
        .chat-messages::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 3px;
        }
        
        .message {
            max-width: 85%;
            animation: messageIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        
        @keyframes messageIn {
            from { opacity: 0; transform: translateY(16px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
        
        .message-bubble {
            padding: 14px 18px;
            border-radius: 20px;
            font-size: 14px;
            line-height: 1.6;
            position: relative;
        }
        
        .message.user {
            align-self: flex-end;
        }
        
        .message.user .message-bubble {
            background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
            color: white;
            border-bottom-right-radius: 6px;
            box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
        }
        
        .message.assistant {
            align-self: flex-start;
        }
        
        .message.assistant .message-bubble {
            background: var(--glass);
            border: 1px solid var(--glass-border);
            color: var(--text-primary);
            border-bottom-left-radius: 6px;
        }
        
        .message-meta {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 6px;
        }
        
        .message.assistant .message-meta {
            padding-left: 4px;
        }
        
        .message-meta .name {
            font-size: 12px;
            font-weight: 600;
            color: var(--secondary);
        }
        
        .message-meta .time {
            font-size: 11px;
            color: var(--text-muted);
        }
        
        .typing-indicator {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 14px 18px;
        }
        
        .typing-dot {
            width: 8px;
            height: 8px;
            background: var(--secondary);
            border-radius: 50%;
            animation: typing 1.4s infinite ease-in-out;
        }
        
        .typing-dot:nth-child(1) { animation-delay: 0s; }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
        
        @keyframes typing {
            0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
            30% { transform: translateY(-8px); opacity: 1; }
        }
        
        .chat-input-area {
            padding: 16px 20px 20px;
            background: rgba(0, 0, 0, 0.3);
            border-top: 1px solid var(--glass-border);
        }
        
        .input-wrapper {
            display: flex;
            align-items: center;
            gap: 12px;
            background: var(--glass);
            border: 1px solid var(--glass-border);
            border-radius: 16px;
            padding: 6px 6px 6px 18px;
            transition: all 0.3s ease;
        }
        
        .input-wrapper:focus-within {
            border-color: var(--primary);
            box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15);
        }
        
        .chat-input {
            flex: 1;
            background: transparent;
            border: none;
            color: var(--text-primary);
            font-size: 14px;
            font-family: inherit;
            outline: none;
            padding: 10px 0;
        }
        
        .chat-input::placeholder {
            color: var(--text-muted);
        }
        
        .send-btn {
            width: 44px;
            height: 44px;
            background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
            border: none;
            border-radius: 12px;
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            flex-shrink: 0;
        }
        
        .send-btn:hover {
            transform: scale(1.05);
            box-shadow: 0 8px 25px rgba(99, 102, 241, 0.4);
        }
        
        .send-btn:active {
            transform: scale(0.95);
        }
        
        .send-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }
        
        .send-btn svg {
            width: 20px;
            height: 20px;
            transition: transform 0.3s ease;
        }
        
        .send-btn:hover svg {
            transform: translateX(2px);
        }
        
        .footer {
            text-align: center;
            padding: 12px;
            font-size: 11px;
            color: var(--text-muted);
        }
        
        .footer a {
            color: var(--secondary);
            text-decoration: none;
            font-weight: 500;
            transition: color 0.2s;
        }
        
        .footer a:hover {
            color: var(--primary);
        }
        
        @media (max-width: 480px) {
            .chat-widget { border-radius: 20px; max-width: 100%; }
            .chat-header { padding: 18px; }
            .chat-messages { height: 320px; padding: 16px; }
            .edutok-brand { display: none; }
        }
    </style>
</head>
<body>
    <div class="particles" id="particles"></div>
    
    <div class="chat-widget">
        <div class="chat-header">
            <div class="edutok-brand">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
                EduTok
            </div>
            <div class="header-content">
                <div class="avatar">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                    </svg>
                </div>
                <div class="header-text">
                    <h1>Eduna <span class="badge">IA</span></h1>
                    <p>Assistente educacional inteligente</p>
                </div>
            </div>
        </div>
        
        <div class="chat-messages" id="chatMessages">
            <div class="message assistant">
                <div class="message-meta">
                    <span class="name">Eduna</span>
                    <span class="time">agora</span>
                </div>
                <div class="message-bubble">
                    Oi! Sou a Eduna, sua assistente educacional. Estou aqui para ajudar com suas duvidas de estudo. Como posso te ajudar hoje?
                </div>
            </div>
        </div>
        
        <div class="chat-input-area">
            <div class="input-wrapper">
                <input 
                    type="text" 
                    class="chat-input" 
                    id="chatInput" 
                    placeholder="Digite sua pergunta..."
                    onkeypress="if(event.key === 'Enter' && !event.shiftKey) sendMessage()"
                    autocomplete="off"
                />
                <button class="send-btn" id="sendBtn" onclick="sendMessage()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                    </svg>
                </button>
            </div>
        </div>
        
        <div class="footer">
            Desenvolvido por <a href="https://edutok.vuro.com.br" target="_blank" rel="noopener">EduTok</a>
        </div>
    </div>

    <script>
        // Create floating particles
        (function() {
            const container = document.getElementById('particles');
            for (let i = 0; i < 20; i++) {
                const particle = document.createElement('div');
                particle.className = 'particle';
                particle.style.left = Math.random() * 100 + '%';
                particle.style.animationDelay = Math.random() * 20 + 's';
                particle.style.animationDuration = (15 + Math.random() * 10) + 's';
                container.appendChild(particle);
            }
        })();

        const EDUNA_CONFIG = {
            apiUrl: '${baseUrl}/api/v1/chat/completions',
            apiKey: '${keyData.apiKey}',
            model: 'llama-3.3-70b-versatile',
            systemPrompt: 'Voce e a Eduna, uma assistente educacional amigavel e inteligente do EduTok. Ajude os estudantes brasileiros com suas duvidas de forma clara, didatica e acolhedora. Use linguagem simples e exemplos praticos. Responda sempre em portugues brasileiro. Seja encorajadora e paciente.'
        };

        const messages = [{ role: 'system', content: EDUNA_CONFIG.systemPrompt }];

        function getTimeString() {
            return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        }

        function createMessage(content, isUser = false) {
            const div = document.createElement('div');
            div.className = 'message ' + (isUser ? 'user' : 'assistant');
            
            if (isUser) {
                div.innerHTML = '<div class="message-bubble">' + escapeHtml(content) + '</div>';
            } else {
                div.innerHTML = 
                    '<div class="message-meta"><span class="name">Eduna</span><span class="time">' + getTimeString() + '</span></div>' +
                    '<div class="message-bubble">' + escapeHtml(content) + '</div>';
            }
            return div;
        }

        function createTypingIndicator() {
            const div = document.createElement('div');
            div.className = 'message assistant';
            div.id = 'typingIndicator';
            div.innerHTML = 
                '<div class="message-meta"><span class="name">Eduna</span><span class="time">digitando...</span></div>' +
                '<div class="message-bubble typing-indicator">' +
                    '<div class="typing-dot"></div>' +
                    '<div class="typing-dot"></div>' +
                    '<div class="typing-dot"></div>' +
                '</div>';
            return div;
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        async function sendMessage() {
            const input = document.getElementById('chatInput');
            const container = document.getElementById('chatMessages');
            const sendBtn = document.getElementById('sendBtn');
            
            const userMessage = input.value.trim();
            if (!userMessage) return;

            input.value = '';
            sendBtn.disabled = true;

            container.appendChild(createMessage(userMessage, true));
            messages.push({ role: 'user', content: userMessage });

            const typing = createTypingIndicator();
            container.appendChild(typing);
            container.scrollTop = container.scrollHeight;

            try {
                const response = await fetch(EDUNA_CONFIG.apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + EDUNA_CONFIG.apiKey
                    },
                    body: JSON.stringify({
                        messages: messages,
                        model: EDUNA_CONFIG.model,
                        temperature: 0.7,
                        max_tokens: 1024
                    })
                });

                const data = await response.json();
                typing.remove();

                if (data.error) throw new Error(data.error.message || 'Erro desconhecido');

                const assistantMessage = data.choices[0].message.content;
                messages.push({ role: 'assistant', content: assistantMessage });
                container.appendChild(createMessage(assistantMessage, false));
            } catch (error) {
                typing.remove();
                container.appendChild(createMessage('Desculpe, ocorreu um erro. Tente novamente.', false));
            }

            sendBtn.disabled = false;
            container.scrollTop = container.scrollHeight;
            input.focus();
        }
    </script>
</body>
</html>`;

      res.json({
        success: true,
        embedCode,
        instructions: {
          pt: "Substitua 'YOUR_EDU_API_KEY_HERE' pela sua chave API (edu_...) no código HTML.",
          en: "Replace 'YOUR_EDU_API_KEY_HERE' with your API key (edu_...) in the HTML code."
        }
      });
    } catch (error: any) {
      console.error("Error generating embed code:", error);
      res.status(500).json({ error: "Erro ao gerar código" });
    }
  });

  // ============================================================================
  // SDK Endpoints (for external developers)
  // ============================================================================

  // Helper function to validate SDK API keys
  async function validateSdkApiKey(apiKey: string): Promise<{ valid: boolean; keyData?: any; error?: string; statusCode?: number }> {
    if (!apiKey || !apiKey.startsWith("edu_")) {
      return { valid: false, error: "Invalid API key format", statusCode: 401 };
    }

    // Check if Firebase is available to validate keys
    if (!educfy2Db) {
      // Database not available - reject requests for security
      return { valid: false, error: "API key validation service unavailable", statusCode: 503 };
    }

    try {
      // Extract key ID from the API key (format: edu_<keyId>_<secret>)
      const keyParts = apiKey.split("_");
      if (keyParts.length < 2) {
        return { valid: false, error: "Malformed API key" };
      }

      // Look up the key in the database
      const keysRef = educfy2Db.ref("developerApiKeys");
      const snapshot = await keysRef.once("value");
      const allKeys = snapshot.val() || {};

      // Find a key that matches
      for (const userId of Object.keys(allKeys)) {
        const userKeys = allKeys[userId];
        for (const keyId of Object.keys(userKeys)) {
          const keyData = userKeys[keyId];
          if (keyData.hashedKey) {
            // Check if this key matches (simplified check)
            if (keyData.active && keyId === keyParts[1]) {
              return { valid: true, keyData: { ...keyData, userId, keyId } };
            }
          }
        }
      }

      return { valid: false, error: "API key not found or revoked" };
    } catch (error) {
      console.error("Error validating API key:", error);
      return { valid: false, error: "Failed to validate API key" };
    }
  }

  // SDK Chat endpoint
  app.post("/api/sdk/chat", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "API key required" });
      }

      const apiKey = authHeader.substring(7);
      
      // Validate API key
      const validation = await validateSdkApiKey(apiKey);
      if (!validation.valid) {
        return res.status(validation.statusCode || 401).json({ error: validation.error || "Invalid API key" });
      }

      // Check if Groq is available
      if (!groq) {
        return res.status(503).json({ 
          error: "AI service not available",
          message: "O serviço de IA não está configurado."
        });
      }

      const { message, conversationHistory, model, deepSearch } = req.body;

      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message is required" });
      }

      // Build messages array with context
      const messages: any[] = [
        {
          role: "system",
          content: `Você é Eduna, uma assistente educacional brasileira simpática e prestativa criada pela EduTok.

PERSONALIDADE:
- Fale de forma natural e amigável, como uma professora jovem e animada
- Use português brasileiro
- Seja clara e didática nas explicações
- Mostre entusiasmo ao ajudar

CAPACIDADES:
- Ajudar com dúvidas escolares de todas as matérias
- Explicar conceitos de forma simples
- Resolver exercícios passo a passo
- Dar dicas de estudo

Responda de forma concisa mas completa.`
        }
      ];

      // Add conversation history (last 10 messages)
      if (conversationHistory && Array.isArray(conversationHistory)) {
        conversationHistory.slice(-10).forEach((msg: any) => {
          if (msg.role && msg.content) {
            messages.push({ role: msg.role, content: msg.content });
          }
        });
      }

      messages.push({ role: "user", content: message });

      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages,
        temperature: 0.7,
        max_tokens: 1024,
      });

      const responseText = completion.choices[0]?.message?.content || "";
      const tokensUsed = completion.usage?.total_tokens || 0;

      res.json({
        message: responseText,
        tokens: tokensUsed,
        model: "eduna-4.0",
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error("SDK chat error:", error);
      res.status(500).json({ 
        error: "Chat error",
        message: error.message || "Erro ao processar mensagem"
      });
    }
  });

  // SDK Usage endpoint
  app.get("/api/sdk/usage", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "API key required" });
      }

      const apiKey = authHeader.substring(7);
      
      // Validate API key
      const validation = await validateSdkApiKey(apiKey);
      if (!validation.valid) {
        return res.status(validation.statusCode || 401).json({ error: validation.error || "Invalid API key" });
      }

      // Return usage data (from keyData if available, otherwise defaults)
      const keyData = validation.keyData || {};
      res.json({
        tokensUsed: keyData.tokensUsedToday || 0,
        tokensLimit: keyData.dailyTokenLimit || 500,
        requestsToday: keyData.usageCount || 0,
        resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch usage" });
    }
  });

  // SDK Models list endpoint
  app.get("/api/sdk/models", (_req, res) => {
    res.json({
      models: [
        { id: "eduna-4.0", name: "Eduna 4.0", description: "Balanced, fast responses" },
        { id: "eduna-scholar", name: "Eduna Scholar", description: "Academic, detailed responses" },
        { id: "eduna-lite", name: "Eduna Lite", description: "Quick, concise answers" }
      ]
    });
  });

  // SDK Download endpoint
  app.get("/api/sdk/download", (_req, res) => {
    res.json({
      message: "SDK download",
      npmCommand: "npm install eduna-sdk",
      cliCommand: "npx eduna init",
      documentation: "https://edutok.replit.app/devtools/apikeys"
    });
  });

  // Cleanup expired temporary grade reports
  async function cleanupExpiredGradeReports() {
    if (!db) return;
    
    try {
      const reportsRef = db.ref('tempGradeReports');
      const snapshot = await reportsRef.once('value');
      const reports = snapshot.val() || {};
      
      const now = Date.now();
      let deletedCount = 0;
      
      for (const [reportId, reportData] of Object.entries(reports)) {
        const report = reportData as any;
        if (report.expiresAt && now > report.expiresAt) {
          await db.ref(`tempGradeReports/${reportId}`).remove();
          deletedCount++;
        }
      }
      
      if (deletedCount > 0) {
        console.log(`🗑️  Deleted ${deletedCount} expired grade reports`);
      }
    } catch (error) {
      console.error("Error cleaning up expired grade reports:", error);
    }
  }

  // Cleanup expired QR sessions periodically
  async function cleanupExpiredQrSessions() {
    if (!db) return;
    
    try {
      const sessionsRef = db.ref('qrSessions');
      const snapshot = await sessionsRef.once('value');
      const sessions = snapshot.val() || {};
      
      const now = Date.now();
      let deletedCount = 0;
      
      for (const [sessionId, sessionData] of Object.entries(sessions)) {
        const session = sessionData as any;
        // Delete sessions older than 5 minutes
        if (session.createdAt && (now - session.createdAt) > (5 * 60 * 1000)) {
          await db.ref(`qrSessions/${sessionId}`).remove();
          deletedCount++;
        }
      }
      
      if (deletedCount > 0) {
        console.log(`🗑️  Deleted ${deletedCount} expired QR sessions`);
      }
    } catch (error) {
      console.error("Error cleaning up expired QR sessions:", error);
    }
  }

  // Run cleanup tasks
  if (db) {
    setInterval(cleanupExpiredQrSessions, 5 * 60 * 1000);
    setInterval(cleanupExpiredGradeReports, 60 * 60 * 1000); // Every hour
    cleanupExpiredQrSessions();
    cleanupExpiredGradeReports();
  }

  const httpServer = createServer(app);
  return httpServer;
}







