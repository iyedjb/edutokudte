import { ref, set, get } from "firebase/database";
import { database, profileNotasDatabase } from "./firebase";

// Migration function to sync user profiles from primary to permanent database
export async function migrateUserProfilesToPermanentDatabase() {
  try {
    // Check if migration has already been completed
    const migrationFlagRef = ref(profileNotasDatabase, "_migrations/userProfilesMigrated");
    const migrationSnapshot = await get(migrationFlagRef);
    
    if (migrationSnapshot.exists() && migrationSnapshot.val() === true) {
      console.log("✅ User profiles migration already completed");
      return;
    }

    console.log("🔄 Starting migration: copying user profiles to permanent database...");

    // Get all users from both primary and permanent databases
    const primaryUsersRef = ref(database, "users");
    const primaryProfilesRef = ref(database, "userProfiles");
    const permanentUsersRef = ref(profileNotasDatabase, "users");
    const permanentProfilesRef = ref(profileNotasDatabase, "userProfiles");
    
    const [primaryUsersSnapshot, primaryProfilesSnapshot, permanentUsersSnapshot, permanentProfilesSnapshot] = await Promise.all([
      get(primaryUsersRef),
      get(primaryProfilesRef),
      get(permanentUsersRef),
      get(permanentProfilesRef)
    ]);

    const primaryUsers = primaryUsersSnapshot.exists() ? primaryUsersSnapshot.val() : {};
    const primaryProfiles = primaryProfilesSnapshot.exists() ? primaryProfilesSnapshot.val() : {};
    const permanentUsers = permanentUsersSnapshot.exists() ? permanentUsersSnapshot.val() : {};
    const permanentProfiles = permanentProfilesSnapshot.exists() ? permanentProfilesSnapshot.val() : {};
    
    // Merge all sources
    const users = { ...primaryUsers, ...permanentUsers };
    const userProfiles = { ...primaryProfiles, ...permanentProfiles };

    // Merge data from both sources
    const allUserIds = Array.from(new Set([
      ...Object.keys(users),
      ...Object.keys(userProfiles)
    ]));

    if (allUserIds.length === 0) {
      console.log("ℹ️ No users found in primary database to migrate");
      await set(migrationFlagRef, true);
      return;
    }

    let migratedCount = 0;

    // Copy each user to profileNotasDatabase
    for (const uid of allUserIds) {
      const userData = users[uid] || {};
      const userProfileData = userProfiles[uid] || {};
      
      // Merge data from both sources, preferring userProfiles for rich data
      const mergedUserData = {
        ...userData,
        ...userProfileData,
      };
      
      // Check if user profile already exists in permanent database
      const profileNotasRef = ref(profileNotasDatabase, `userProfiles/${uid}`);
      const existingProfileSnapshot = await get(profileNotasRef);

      if (!existingProfileSnapshot.exists()) {
        // Create user profile in permanent database with merged data
        const userProfile = {
          uid: mergedUserData.uid || uid,
          displayName: mergedUserData.displayName || "Usuário",
          email: mergedUserData.email || "",
          photoURL: mergedUserData.photoURL || "",
          verified: mergedUserData.verified || false,
          followerCount: mergedUserData.followerCount || 0,
          followingCount: mergedUserData.followingCount || 0,
          postCount: mergedUserData.postCount || 0,
          createdAt: mergedUserData.createdAt || Date.now(),
          // Include student information from either source
          ...(mergedUserData.phone && { phone: mergedUserData.phone }),
          ...(mergedUserData.cpf && { cpf: mergedUserData.cpf }),
          ...(mergedUserData.birthdate && { birthdate: mergedUserData.birthdate }),
          ...(mergedUserData.school && { school: mergedUserData.school }),
          ...(mergedUserData.grade && { grade: mergedUserData.grade }),
          // Include role if present (for teachers)
          ...(mergedUserData.role && { role: mergedUserData.role }),
        };

        // Only write to permanent database, do NOT overwrite primary database
        await set(profileNotasRef, userProfile);
        migratedCount++;
      }
    }

    // Mark migration as completed
    await set(migrationFlagRef, true);
    console.log(`✅ Migration completed: ${migratedCount} user profile(s) copied to permanent database`);

  } catch (error) {
    console.error("❌ Error during user profiles migration:", error);
  }
}

export async function seedFirebaseData() {
  try {
    const now = Date.now();
    
    // Check if other data already exists
    const classesRef = ref(database, "classes");
    const snapshot = await get(classesRef);
    
    if (snapshot.exists()) {
      console.log("✅ Firebase data already seeded");
      return;
    }

    console.log("🌱 Seeding Firebase data...");

    // Seed Classes
    await set(ref(database, "classes"), {
      "class-mat-9a": {
        name: "Matemática 9º A",
        subject: "Matemática",
        teacher: "Prof. Carlos Silva",
        teacherUid: "teacher-carlos",
        schedule: "Seg, Qua, Sex - 08:00",
      },
      "class-port-9a": {
        name: "Português 9º A",
        subject: "Português",
        teacher: "Profa. Ana Santos",
        teacherUid: "teacher-ana",
        schedule: "Ter, Qui - 10:00",
      },
      "class-hist-9a": {
        name: "História 9º A",
        subject: "História",
        teacher: "Prof. Roberto Lima",
        teacherUid: "teacher-roberto",
        schedule: "Seg, Qua - 14:00",
      },
      "class-cien-9a": {
        name: "Ciências 9º A",
        subject: "Ciências",
        teacher: "Profa. Maria Costa",
        teacherUid: "teacher-maria",
        schedule: "Ter, Sex - 09:00",
      },
    });

    // Seed Events
    await set(ref(database, "events"), {
      "event-1": {
        title: "Prova de Matemática",
        description: "Capítulos 5-8: Equações e funções",
        date: now + 7 * 24 * 60 * 60 * 1000,
        type: "exam",
        classId: "class-mat-9a",
      },
      "event-2": {
        title: "Entrega de Trabalho de História",
        description: "Trabalho sobre a Revolução Industrial",
        date: now + 3 * 24 * 60 * 60 * 1000,
        type: "assignment",
        classId: "class-hist-9a",
      },
      "event-3": {
        title: "Feira de Ciências",
        description: "Apresentação dos projetos científicos",
        date: now + 14 * 24 * 60 * 60 * 1000,
        type: "other",
      },
    });

    // Seed Videos
    await set(ref(database, "videos"), {
      "video-1": {
        title: "Introdução às Equações de 2º Grau",
        caption: "Aprenda a resolver equações quadráticas de forma simples! 📐✨",
        uploaderUid: "teacher-carlos",
        uploaderName: "Prof. Carlos Silva",
        classId: "class-mat-9a",
        className: "Matemática 9º A",
        timestamp: now - 2 * 60 * 60 * 1000,
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        likes: 45,
        likedBy: [],
        comments: {},
        views: 120,
      },
      "video-2": {
        title: "Fotossíntese Explicada",
        caption: "Como as plantas produzem seu próprio alimento? Descubra! 🌱🔬",
        uploaderUid: "teacher-maria",
        uploaderName: "Profa. Maria Costa",
        classId: "class-cien-9a",
        className: "Ciências 9º A",
        timestamp: now - 5 * 60 * 60 * 1000,
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
        likes: 38,
        likedBy: [],
        comments: {},
        views: 95,
      },
      "video-3": {
        title: "Análise Sintática Descomplicada",
        caption: "Sujeito, predicado e complementos. Vamos aprender juntos! 📚",
        uploaderUid: "teacher-ana",
        uploaderName: "Profa. Ana Santos",
        classId: "class-port-9a",
        className: "Português 9º A",
        timestamp: now - 24 * 60 * 60 * 1000,
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        likes: 52,
        likedBy: [],
        comments: {},
        views: 140,
      },
    });

    console.log("✅ Firebase data seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding Firebase data:", error);
  }
}

// Clean up test efeed posts
export async function cleanupTestEfeedPosts() {
  try {
    const efeedRef = ref(database, 'efeed');
    const snapshot = await get(efeedRef);
    if (!snapshot.exists()) return;

    const posts = snapshot.val() || {};
    const testPostIds = Object.keys(posts).filter(id => 
      id === 'post-1' || id === 'post-2' || id === 'post-3'
    );

    for (const postId of testPostIds) {
      await set(ref(database, `efeed/${postId}`), null);
    }

    if (testPostIds.length > 0) {
      console.log(`✅ Deleted ${testPostIds.length} test efeed posts`);
    }
  } catch (error) {
    console.error("Error cleaning up test posts:", error);
  }
}
