import { z } from "zod";

// User schema for Firebase Auth + RTDB
export const userSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  displayName: z.string(),
  photoURL: z.string().optional(),
  phone: z.string().optional(),
  cpf: z.string().optional(), // Brazilian tax ID
  birthdate: z.string().optional(), // ISO date string
  school: z.string().optional(), // "E.m Zita Lucas E Silva" or "E.E Santa Quitéria"
  grade: z.string().optional(), // e.g., "701", "802", "903", "1 reg 1", "2 reg 3"
  classes: z.array(z.string()).default([]), // Array of classIds
  lgpdConsent: z.object({
    analytics: z.boolean().default(false),
    marketing: z.boolean().default(false),
    functional: z.boolean().default(true),
    timestamp: z.number(),
    ipAddress: z.string().optional(),
  }).optional(),
});

export type User = z.infer<typeof userSchema>;

export const insertUserSchema = userSchema.omit({ uid: true });
export type InsertUser = z.infer<typeof insertUserSchema>;

// LGPD Consent schema
export const lgpdConsentSchema = z.object({
  analytics: z.boolean(),
  marketing: z.boolean(),
  functional: z.boolean(),
  timestamp: z.number(),
  ipAddress: z.string().optional(),
});

export type LGPDConsent = z.infer<typeof lgpdConsentSchema>;

// Class/Turma schema
export const classSchema = z.object({
  id: z.string(),
  name: z.string(),
  subject: z.string().optional(),
  teacher: z.string(),
  teacherUid: z.string(),
  schedule: z.string().optional(),
});

export type Class = z.infer<typeof classSchema>;

// Chat message schema
export const chatMessageSchema = z.object({
  id: z.string(),
  classId: z.string(),
  uid: z.string(),
  userName: z.string(),
  userPhoto: z.string().optional(),
  text: z.string(),
  timestamp: z.number(),
  isTeacher: z.boolean().default(false),
  attachment: z.object({
    type: z.enum(["image", "document"]),
    data: z.string(), // base64 for images, base64 for docs
    fileName: z.string().optional(),
    fileSize: z.number().optional(),
  }).optional(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const insertChatMessageSchema = chatMessageSchema.omit({ id: true });
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

// Direct message schema
export const directMessageSchema = z.object({
  id: z.string(),
  senderUid: z.string(),
  senderName: z.string(),
  senderPhoto: z.string().optional(),
  text: z.string(),
  timestamp: z.number(),
  read: z.boolean().default(false),
  attachment: z.object({
    type: z.enum(["image", "document"]),
    data: z.string(), // base64
    fileName: z.string().optional(),
    fileSize: z.number().optional(),
  }).optional(),
});

export type DirectMessage = z.infer<typeof directMessageSchema>;

export const insertDirectMessageSchema = directMessageSchema.omit({ id: true, read: true });
export type InsertDirectMessage = z.infer<typeof insertDirectMessageSchema>;

// Video schema for EduTok
export const videoCommentSchema = z.object({
  uid: z.string(),
  userName: z.string(),
  userPhoto: z.string().optional(),
  text: z.string(),
  timestamp: z.number(),
});

export const videoSchema = z.object({
  id: z.string(),
  title: z.string(),
  caption: z.string(),
  uploaderUid: z.string(),
  uploaderName: z.string(),
  uploaderPhoto: z.string().optional(),
  classId: z.string(),
  className: z.string().optional(),
  timestamp: z.number(),
  url: z.string(),
  likes: z.number().default(0),
  likedBy: z.array(z.string()).default([]), // Array of uids
  comments: z.record(z.string(), videoCommentSchema).default({}),
  views: z.number().default(0),
});

export type Video = z.infer<typeof videoSchema>;
export type VideoComment = z.infer<typeof videoCommentSchema>;

export const insertVideoSchema = videoSchema.omit({ 
  id: true, 
  likes: true, 
  likedBy: true, 
  comments: true, 
  views: true 
});
export type InsertVideo = z.infer<typeof insertVideoSchema>;

// Grade schema
export const gradeSchema = z.object({
  id: z.string(),
  uid: z.string(),
  classId: z.string(),
  className: z.string(),
  subject: z.string(),
  bimestre: z.number().min(1).max(4), // 1-4 quarters
  grade: z.number().min(0).max(25),
  teacher: z.string(),
  date: z.number(),
});

export type Grade = z.infer<typeof gradeSchema>;

export const insertGradeSchema = gradeSchema.omit({ id: true });
export type InsertGrade = z.infer<typeof insertGradeSchema>;

// Event schema for calendar
export const eventSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  date: z.number(),
  type: z.enum(["exam", "assignment", "holiday", "meeting", "other"]),
  classId: z.string().optional(),
  createdBy: z.string().optional(), // Teacher UID who created the event
  creatorName: z.string().optional(), // Teacher name for display
  visibility: z.enum(["all", "class", "private"]).default("all").optional(), // all students, specific class, or private (creator only)
});

export type Event = z.infer<typeof eventSchema>;

export const insertEventSchema = eventSchema.omit({ id: true });
export type InsertEvent = z.infer<typeof insertEventSchema>;

// AI Chat message schema
export const aiChatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  timestamp: z.number(),
});

export type AIChatMessage = z.infer<typeof aiChatMessageSchema>;

export const insertAIChatMessageSchema = aiChatMessageSchema.omit({ id: true, timestamp: true });
export type InsertAIChatMessage = z.infer<typeof insertAIChatMessageSchema>;

// Assignment schema
export const assignmentSchema = z.object({
  id: z.string(),
  classId: z.string(),
  className: z.string(),
  title: z.string(),
  description: z.string(),
  dueDate: z.number(),
  createdAt: z.number(),
  teacherUid: z.string(),
  teacherName: z.string(),
  status: z.enum(["pending", "submitted", "graded"]).default("pending"),
  grade: z.number().optional(),
  maxGrade: z.number().default(25),
  attachments: z.array(z.string()).default([]),
});

export type Assignment = z.infer<typeof assignmentSchema>;

export const insertAssignmentSchema = assignmentSchema.omit({ id: true });
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;

// Study Resource schema
export const studyResourceSchema = z.object({
  id: z.string(),
  classId: z.string(),
  className: z.string(),
  title: z.string(),
  description: z.string().optional(),
  type: z.enum(["pdf", "video", "link", "document", "image"]),
  url: z.string(),
  uploadedBy: z.string(),
  uploaderName: z.string(),
  uploadedAt: z.number(),
  tags: z.array(z.string()).default([]),
  downloads: z.number().default(0),
});

export type StudyResource = z.infer<typeof studyResourceSchema>;

export const insertStudyResourceSchema = studyResourceSchema.omit({ id: true });
export type InsertStudyResource = z.infer<typeof insertStudyResourceSchema>;

// Announcement schema
export const announcementSchema = z.object({
  id: z.string(),
  classId: z.string().optional(),
  title: z.string(),
  message: z.string(),
  createdBy: z.string(),
  creatorName: z.string(),
  createdAt: z.number(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  read: z.boolean().default(false),
});

export type Announcement = z.infer<typeof announcementSchema>;

export const insertAnnouncementSchema = announcementSchema.omit({ id: true });
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;

// Professor Assignment schema - assigns professors to grades
export const professorAssignmentSchema = z.object({
  id: z.string(),
  grade: z.string(), // e.g., "701", "802"
  professorEmail: z.string().email(),
  professorName: z.string().optional(),
  professorUid: z.string().optional(),
  subject: z.string().optional(),
  assignedAt: z.number(),
  assignedBy: z.string(), // admin uid
});

export type ProfessorAssignment = z.infer<typeof professorAssignmentSchema>;

export const insertProfessorAssignmentSchema = professorAssignmentSchema.omit({ id: true });
export type InsertProfessorAssignment = z.infer<typeof insertProfessorAssignmentSchema>;

// Professor-Student Conversation schema - tracks approval status
export const professorConversationSchema = z.object({
  id: z.string(),
  studentUid: z.string(),
  studentName: z.string(),
  studentPhoto: z.string().optional(),
  studentGrade: z.string(),
  professorUid: z.string(),
  professorName: z.string(),
  professorPhoto: z.string().optional(),
  status: z.enum(["pending", "approved", "rejected"]).default("pending"),
  initialMessage: z.string(), // The first message from student
  createdAt: z.number(),
  approvedAt: z.number().optional(),
  messageCount: z.number().default(1), // Tracks how many messages student has sent
});

export type ProfessorConversation = z.infer<typeof professorConversationSchema>;

export const insertProfessorConversationSchema = professorConversationSchema.omit({ id: true, messageCount: true });
export type InsertProfessorConversation = z.infer<typeof insertProfessorConversationSchema>;

// Professor-Student Message schema
export const professorMessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  senderUid: z.string(),
  senderName: z.string(),
  senderPhoto: z.string().optional(),
  isProfessor: z.boolean(),
  text: z.string(),
  timestamp: z.number(),
  read: z.boolean().default(false),
  attachment: z.object({
    type: z.enum(["image", "document"]),
    data: z.string(), // base64
    fileName: z.string().optional(),
    fileSize: z.number().optional(),
  }).optional(),
});

export type ProfessorMessage = z.infer<typeof professorMessageSchema>;

export const insertProfessorMessageSchema = professorMessageSchema.omit({ id: true, read: true });
export type InsertProfessorMessage = z.infer<typeof insertProfessorMessageSchema>;

// Efeed Post Comment schema
export const efeedCommentSchema = z.object({
  uid: z.string(),
  userName: z.string(),
  userPhoto: z.string().optional(),
  text: z.string(),
  timestamp: z.number(),
});

export type EfeedComment = z.infer<typeof efeedCommentSchema>;

// Poll Option schema
export const pollOptionSchema = z.object({
  id: z.string(),
  text: z.string(),
  votes: z.number().default(0),
  voters: z.array(z.string()).default([]), // Array of uids who voted for this option
});

export type PollOption = z.infer<typeof pollOptionSchema>;

// Poll schema
export const pollSchema = z.object({
  question: z.string(),
  options: z.array(pollOptionSchema),
  totalVotes: z.number().default(0),
  endsAt: z.number().optional(), // Timestamp when poll ends
});

export type Poll = z.infer<typeof pollSchema>;

// Reaction types for posts
export const reactionTypeSchema = z.enum(["heart", "thumbs_up", "laugh", "celebrate", "fire", "hundred"]);
export type ReactionType = z.infer<typeof reactionTypeSchema>;

// Reaction metadata
export const reactionMetadataSchema = z.object({
  uid: z.string(),
  type: reactionTypeSchema,
  timestamp: z.number(),
});

export type ReactionMetadata = z.infer<typeof reactionMetadataSchema>;

// Post mood types
export const postMoodSchema = z.enum(["studying", "help", "sharing", "celebrating", "question"]);
export type PostMood = z.infer<typeof postMoodSchema>;

// Educational subjects
export const subjectTagSchema = z.enum([
  "Matemática",
  "Português", 
  "Ciências",
  "História",
  "Geografia",
  "Inglês",
  "Educação Física",
  "Artes",
  "Filosofia",
  "Sociologia",
  "Física",
  "Química",
  "Biologia",
  "Literatura",
  "Redação",
  "Geral"
]);
export type SubjectTag = z.infer<typeof subjectTagSchema>;

// Efeed Post schema (enhanced with photos, polls, and creative features)
export const efeedPostSchema = z.object({
  id: z.string(),
  text: z.string(),
  authorUid: z.string(),
  authorName: z.string(),
  authorUsername: z.string().optional(), // @username handle
  authorPhoto: z.string().optional(),
  authorVerified: z.boolean().default(false),
  timestamp: z.number(),
  // Legacy likes (kept for backward compatibility)
  likes: z.number().default(0),
  likedBy: z.array(z.string()).default([]),
  // New reaction system
  reactionCounts: z.record(reactionTypeSchema, z.number()).optional(), // {"love": 10, "fire": 5}
  reactionsByUser: z.record(z.string(), reactionTypeSchema).optional(), // {uid: "love"}
  totalReactions: z.number().default(0),
  // Other interactions
  retweets: z.number().default(0),
  retweetedBy: z.array(z.string()).default([]),
  quotes: z.number().default(0),
  quotedBy: z.array(z.string()).default([]),
  bookmarks: z.number().default(0),
  bookmarkedBy: z.array(z.string()).default([]),
  shares: z.number().default(0),
  views: z.number().default(0),
  comments: z.record(z.string(), efeedCommentSchema).default({}),
  commentCount: z.number().default(0),
  // Media
  photoURL: z.string().optional(), // Firebase Storage URL
  videoURL: z.string().optional(), // Video URL
  photoModerated: z.boolean().default(true), // AI moderation approved
  // Poll support
  poll: pollSchema.optional(),
  // Creative educational features
  mood: postMoodSchema.optional(), // Post vibe/intent
  subjects: z.array(subjectTagSchema).default([]), // Subject tags
  hashtags: z.array(z.string()).default([]), // Extracted hashtags
  featured: z.boolean().default(false), // Featured by admin/algorithm
  // Moderation
  textModerated: z.boolean().default(true), // AI text moderation
  moderationStatus: z.enum(["pending", "approved", "rejected"]).default("approved"),
});

export type EfeedPost = z.infer<typeof efeedPostSchema>;

export const insertEfeedPostSchema = efeedPostSchema.omit({ 
  id: true, 
  likes: true, 
  likedBy: true,
  reactionCounts: true,
  reactionsByUser: true,
  totalReactions: true,
  retweets: true,
  retweetedBy: true,
  quotes: true,
  quotedBy: true,
  bookmarks: true,
  bookmarkedBy: true,
  shares: true,
  views: true,
  comments: true,
  commentCount: true,
  authorVerified: true,
  featured: true,
});
export type InsertEfeedPost = z.infer<typeof insertEfeedPostSchema>;

// User Profile schema (extended)
export const userProfileSchema = z.object({
  uid: z.string(),
  displayName: z.string(),
  email: z.string(),
  photoURL: z.string().optional(),
  bio: z.string().optional(),
  verified: z.boolean().default(false), // Verified badge
  followerCount: z.number().default(0),
  followingCount: z.number().default(0),
  postCount: z.number().default(0),
  createdAt: z.number(),
});

export type UserProfile = z.infer<typeof userProfileSchema>;

// Follow Relationship schema
export const followRelationshipSchema = z.object({
  followerUid: z.string(), // User who is following
  followingUid: z.string(), // User being followed
  timestamp: z.number(),
});

export type FollowRelationship = z.infer<typeof followRelationshipSchema>;

// Notification schema
export const notificationSchema = z.object({
  id: z.string(),
  recipientUid: z.string(),
  type: z.enum(["follow", "like", "comment", "post", "mention"]),
  senderUid: z.string(),
  senderName: z.string(),
  senderPhoto: z.string().optional(),
  senderVerified: z.boolean().default(false),
  message: z.string(),
  postId: z.string().optional(),
  timestamp: z.number(),
  read: z.boolean().default(false),
});

export type Notification = z.infer<typeof notificationSchema>;

export const insertNotificationSchema = notificationSchema.omit({ id: true, read: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// Eduzão Exercise schema
export const eduzaoExerciseSchema = z.object({
  id: z.string(),
  question: z.string(),
  options: z.array(z.string()),
  correctAnswer: z.number(), // Index of correct option (0-3)
  explanation: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
});

export type EduzaoExercise = z.infer<typeof eduzaoExerciseSchema>;

// Eduzão Lesson schema
export const eduzaoLessonSchema = z.object({
  id: z.string(),
  uid: z.string(), // User who created this lesson
  subject: z.string(), // Matéria (e.g., "Matemática", "Física")
  theme: z.string(), // Theme name (e.g., "Álgebra Linear", "Leis de Newton")
  exercises: z.array(eduzaoExerciseSchema),
  createdAt: z.number(),
  totalExercises: z.number(),
});

export type EduzaoLesson = z.infer<typeof eduzaoLessonSchema>;

export const insertEduzaoLessonSchema = eduzaoLessonSchema.omit({ id: true });
export type InsertEduzaoLesson = z.infer<typeof insertEduzaoLessonSchema>;

// Eduzão User Progress schema
export const eduzaoProgressSchema = z.object({
  id: z.string(),
  uid: z.string(),
  lessonId: z.string(),
  subject: z.string(),
  theme: z.string(),
  currentExerciseIndex: z.number().default(0),
  correctAnswers: z.number().default(0),
  wrongAnswers: z.number().default(0),
  score: z.number().default(0),
  level: z.number().default(1),
  completed: z.boolean().default(false),
  lastAccessedAt: z.number(),
  startedAt: z.number(),
  completedAt: z.number().optional(),
  mistakes: z.array(z.number()).default([]), // Track which exercises were wrong
});

export type EduzaoProgress = z.infer<typeof eduzaoProgressSchema>;

export const insertEduzaoProgressSchema = eduzaoProgressSchema.omit({ id: true });
export type InsertEduzaoProgress = z.infer<typeof insertEduzaoProgressSchema>;

// Eduzão Leaderboard Entry schema
export const eduzaoLeaderboardSchema = z.object({
  uid: z.string(),
  userName: z.string(),
  userPhoto: z.string().optional(),
  totalScore: z.number().default(0),
  lessonsCompleted: z.number().default(0),
  averageAccuracy: z.number().default(0), // Percentage
  currentStreak: z.number().default(0), // Days of consecutive activity
  lastActivityAt: z.number(),
});

export type EduzaoLeaderboard = z.infer<typeof eduzaoLeaderboardSchema>;

// Eduzão Progress Share (for Efeed)
export const eduzaoShareSchema = z.object({
  lessonId: z.string(),
  subject: z.string(),
  theme: z.string(),
  score: z.number(),
  level: z.number(),
  accuracy: z.number(), // Percentage
  completedAt: z.number(),
});

export type EduzaoShare = z.infer<typeof eduzaoShareSchema>;

// Achievement Badge types
export const achievementBadgeSchema = z.enum([
  "top_contributor", // Posted 10+ helpful posts
  "helpful_student", // 50+ reactions on comments
  "study_champion", // Active for 7 days straight
  "poll_master", // Created 5+ polls
  "knowledge_sharer", // 20+ posts with "sharing" mood
  "question_asker", // 15+ posts with "help" mood
  "early_adopter", // One of first 100 users
  "verified_teacher", // Verified teacher badge
]);

export type AchievementBadge = z.infer<typeof achievementBadgeSchema>;

// User Achievement schema
export const userAchievementSchema = z.object({
  badgeId: achievementBadgeSchema,
  awardedAt: z.number(),
  source: z.enum(["auto", "admin"]), // Automated or admin-assigned
  progress: z.number().optional(), // For tracking partial progress (0-100)
});

export type UserAchievement = z.infer<typeof userAchievementSchema>;

// User Achievements Record schema (for storing in Firebase)
export const userAchievementsRecordSchema = z.object({
  uid: z.string(),
  achievements: z.record(achievementBadgeSchema, userAchievementSchema),
  lastUpdated: z.number(),
});

export type UserAchievementsRecord = z.infer<typeof userAchievementsRecordSchema>;

// QR Code Login Session schema
export const qrSessionSchema = z.object({
  sessionId: z.string().min(32), // 128-bit random ID
  secretHash: z.string(), // SHA-256 hash of the secret (not the secret itself)
  status: z.enum(["pending", "approved", "consumed", "expired"]).default("pending"),
  createdAt: z.number(),
  expiresAt: z.number(), // TTL ~90 seconds
  customToken: z.string().optional(), // Firebase custom token set by backend
  approvedBy: z.string().optional(), // UID of user who scanned/approved
  approvedAt: z.number().optional(),
  userDisplayName: z.string().optional(), // For display on desktop
  userPhotoURL: z.string().optional(), // For display on desktop
});

export type QrSession = z.infer<typeof qrSessionSchema>;

export const insertQrSessionSchema = qrSessionSchema.omit({ 
  secretHash: true, // Generated server-side
  customToken: true, 
  approvedBy: true, 
  approvedAt: true,
  userDisplayName: true,
  userPhotoURL: true
});
export type InsertQrSession = z.infer<typeof insertQrSessionSchema>;

// QR Session Creation Request
export const qrSessionCreateRequestSchema = z.object({
  // No parameters needed - session ID generated server-side
});

export type QrSessionCreateRequest = z.infer<typeof qrSessionCreateRequestSchema>;

// QR Session Authorization Request
export const qrSessionAuthorizeRequestSchema = z.object({
  sessionId: z.string().min(32),
});

export type QrSessionAuthorizeRequest = z.infer<typeof qrSessionAuthorizeRequestSchema>;

// Temporary Grade Report schema
export const tempGradeReportSchema = z.object({
  id: z.string(),
  uid: z.string(),
  studentName: z.string(),
  studentCpf: z.string().optional(),
  gradesData: z.any(), // Will store the complete grades structure
  createdAt: z.number(),
  expiresAt: z.number(), // 7 days from creation
  accessCount: z.number().default(0),
});

export type TempGradeReport = z.infer<typeof tempGradeReportSchema>;

export const insertTempGradeReportSchema = tempGradeReportSchema.omit({ id: true, accessCount: true });
export type InsertTempGradeReport = z.infer<typeof insertTempGradeReportSchema>;

// ============================================
// EDUCATIONAL ADMINISTRATION SYSTEM SCHEMAS
// ============================================

// School schema - created by Secretaria de Educação
export const schoolSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(), // URL-friendly name for routing
  cep: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  neighborhood: z.string().optional(),
  createdBy: z.string(), // Secretaria user UID
  createdAt: z.number(),
  active: z.boolean().default(true),
});

export type School = z.infer<typeof schoolSchema>;

export const insertSchoolSchema = schoolSchema.omit({ id: true, createdAt: true });
export type InsertSchool = z.infer<typeof insertSchoolSchema>;

// Teacher in school system - with facial recognition support
export const schoolTeacherSchema = z.object({
  id: z.string(),
  name: z.string(),
  cpf: z.string(),
  cpfHash: z.string(), // SHA-256 hash for auth lookup
  birthdate: z.string(), // ISO date string
  birthdateHash: z.string(), // SHA-256 hash for auth
  photoURL: z.string().optional(), // Face photo for recognition
  faceTemplateRef: z.string().optional(), // Reference to facial recognition template
  schoolIds: z.array(z.string()), // Schools where teacher works
  subjects: z.array(z.string()), // Matérias the teacher teaches
  email: z.string().email().optional(),
  role: z.enum(["Professor", "Professora", "Diretor", "Diretora", "Coordenador", "Coordenadora"]).default("Professor"),
  verified: z.boolean().default(true),
  createdBy: z.string(), // Secretaria user UID
  createdAt: z.number(),
  active: z.boolean().default(true),
});

export type SchoolTeacher = z.infer<typeof schoolTeacherSchema>;

export const insertSchoolTeacherSchema = schoolTeacherSchema.omit({ 
  id: true, 
  createdAt: true,
  cpfHash: true,
  birthdateHash: true 
});
export type InsertSchoolTeacher = z.infer<typeof insertSchoolTeacherSchema>;

// Student in school system
export const schoolStudentSchema = z.object({
  id: z.string(),
  name: z.string(),
  cpf: z.string(),
  cpfHash: z.string(), // SHA-256 hash for auth lookup
  birthdate: z.string(), // ISO date string
  birthdateHash: z.string(), // SHA-256 hash for auth
  schoolId: z.string(), // School the student belongs to
  gradeLevel: z.string(), // e.g., "1re1", "2re3", "3re8"
  photoURL: z.string().optional(),
  createdBy: z.string(), // School admin who created
  createdAt: z.number(),
  active: z.boolean().default(true),
  // Cached stats for quick access
  averageGrade: z.number().default(0),
  totalAbsences: z.number().default(0),
});

export type SchoolStudent = z.infer<typeof schoolStudentSchema>;

export const insertSchoolStudentSchema = schoolStudentSchema.omit({ 
  id: true, 
  createdAt: true,
  cpfHash: true,
  birthdateHash: true,
  averageGrade: true,
  totalAbsences: true 
});
export type InsertSchoolStudent = z.infer<typeof insertSchoolStudentSchema>;

// Student Report Card - grades per subject per bimester
export const studentReportCardSchema = z.object({
  id: z.string(),
  studentId: z.string(),
  schoolId: z.string(),
  year: z.number(), // e.g., 2025
  bimester: z.number().min(1).max(4), // 1-4
  subject: z.string(), // Matéria
  grade: z.number().min(0).max(10).optional(), // 0-10 scale
  teacherId: z.string().optional(),
  updatedAt: z.number(),
});

export type StudentReportCard = z.infer<typeof studentReportCardSchema>;

export const insertStudentReportCardSchema = studentReportCardSchema.omit({ id: true, updatedAt: true });
export type InsertStudentReportCard = z.infer<typeof insertStudentReportCardSchema>;

// Student Absence Record
export const studentAbsenceSchema = z.object({
  id: z.string(),
  studentId: z.string(),
  schoolId: z.string(),
  date: z.string(), // ISO date string
  year: z.number(),
  bimester: z.number().min(1).max(4),
  subject: z.string().optional(), // Which class they missed
  justified: z.boolean().default(false),
  reason: z.string().optional(),
  createdAt: z.number(),
});

export type StudentAbsence = z.infer<typeof studentAbsenceSchema>;

export const insertStudentAbsenceSchema = studentAbsenceSchema.omit({ id: true, createdAt: true });
export type InsertStudentAbsence = z.infer<typeof insertStudentAbsenceSchema>;

// Auth Index for CPF/Birthdate Login
export const authIndexSchema = z.object({
  cpfHash: z.string(),
  birthdateHash: z.string(),
  uid: z.string(), // Reference to the actual user record
  type: z.enum(["student", "teacher"]),
  schoolId: z.string().optional(), // Primary school for students
  active: z.boolean().default(true),
});

export type AuthIndex = z.infer<typeof authIndexSchema>;

// Secretaria User - admin for the education system
export const secretariaUserSchema = z.object({
  uid: z.string(),
  name: z.string(),
  email: z.string().email(),
  region: z.string(), // e.g., "mg/esmeraldas"
  role: z.enum(["admin", "viewer"]).default("admin"),
  createdAt: z.number(),
  active: z.boolean().default(true),
});

export type SecretariaUser = z.infer<typeof secretariaUserSchema>;

// Grade levels available
export const gradeLevelOptions = [
  "1re1", "1re2", "1re3", "1re4", "1re5", "1re6", "1re7", "1re8",
  "2re1", "2re2", "2re3", "2re4", "2re5", "2re6", "2re7", "2re8",
  "3re1", "3re2", "3re3", "3re4", "3re5", "3re6", "3re7", "3re8",
] as const;

export type GradeLevel = typeof gradeLevelOptions[number];

// Subject options for teachers
export const subjectOptions = [
  "Matemática",
  "Português",
  "Ciências",
  "História",
  "Geografia",
  "Inglês",
  "Educação Física",
  "Artes",
  "Filosofia",
  "Sociologia",
  "Física",
  "Química",
  "Biologia",
  "Literatura",
  "Redação",
] as const;

export type Subject = typeof subjectOptions[number];

// ============================================
// EDUTOK API KEY SYSTEM SCHEMAS
// ============================================

// EduTok API Key schema - for users who want to use EduTok AI in their apps
export const eduApiKeySchema = z.object({
  id: z.string(), // The actual key (edu_xxxxxxxxxxxx)
  keyHash: z.string(), // SHA-256 hash of the key for validation
  name: z.string(), // User-given name for the key
  ownerUid: z.string(), // Firebase UID of the key owner
  ownerEmail: z.string().email(),
  createdAt: z.number(),
  lastUsedAt: z.number().optional(),
  usageCount: z.number().default(0),
  rateLimit: z.number().default(60), // Requests per minute
  dailyTokenLimit: z.number().default(500), // Max tokens per day
  tokensUsedToday: z.number().default(0), // Tokens used today
  totalTokensUsed: z.number().default(0), // All-time tokens
  lastTokenResetDate: z.string().optional(), // YYYY-MM-DD format
  active: z.boolean().default(true),
  revokedAt: z.number().optional(),
});

export type EduApiKey = z.infer<typeof eduApiKeySchema>;

export const insertEduApiKeySchema = eduApiKeySchema.omit({ 
  id: true, 
  keyHash: true,
  createdAt: true, 
  lastUsedAt: true, 
  usageCount: true,
  tokensUsedToday: true,
  totalTokensUsed: true,
  lastTokenResetDate: true,
  revokedAt: true
});
export type InsertEduApiKey = z.infer<typeof insertEduApiKeySchema>;

// API Key usage log for rate limiting and analytics
export const apiKeyUsageLogSchema = z.object({
  keyId: z.string(),
  timestamp: z.number(),
  endpoint: z.string(),
  tokens: z.number().default(0),
  promptTokens: z.number().optional(),
  completionTokens: z.number().optional(),
  success: z.boolean(),
  error: z.string().optional(),
  model: z.string().optional(),
  latencyMs: z.number().optional(),
  costUsd: z.number().optional(), // Estimated cost in USD
});

export type ApiKeyUsageLog = z.infer<typeof apiKeyUsageLogSchema>;

// API Key Analytics aggregated data
export const apiKeyAnalyticsSchema = z.object({
  keyId: z.string(),
  date: z.string(), // YYYY-MM-DD
  requestCount: z.number().default(0),
  successCount: z.number().default(0),
  errorCount: z.number().default(0),
  tokensUsed: z.number().default(0),
  estimatedCostUsd: z.number().default(0),
  avgLatencyMs: z.number().default(0),
});

export type ApiKeyAnalytics = z.infer<typeof apiKeyAnalyticsSchema>;

