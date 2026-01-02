import { database, profileNotasDatabase } from "./firebase-admin";

// Seed initial data for development/testing
export async function seedData() {
  const db = database();
  const permanentDb = profileNotasDatabase();

  try {
    console.log("🌱 Seeding initial data...");

    // Check if data already exists
    const classesSnapshot = await db.ref("classes").once("value");
    const alreadySeeded = classesSnapshot.exists();
    
    if (alreadySeeded) {
      console.log("✅ Core data already seeded");

      // Always ensure verified user exists
      console.log("🌱 Ensuring verified user profile...");
      const verifiedUserId = "verified-user-sassisawsen";
      const verifiedUserProfile = {
        uid: verifiedUserId,
        displayName: "Sassisawsen",
        email: "sassisawsen2024@gmail.com",
        photoURL: "https://api.dicebear.com/7.x/avataaars/svg?seed=sassisawsen",
        verified: true,
        followerCount: 1200,
        followingCount: 0,
        postCount: 0,
        createdAt: Date.now(),
      };

      await permanentDb.ref(`userProfiles/${verifiedUserId}`).set(verifiedUserProfile);
      console.log("✅ Verified user profile ensured for sassisawsen2024@gmail.com");

      // Ensure 1200 followers exist
      const followersSnapshot = await permanentDb.ref("followRelationships").once("value");
      const existingFollows = followersSnapshot.val() || {};
      let followerCount = 0;
      
      // Count existing followers
      Object.keys(existingFollows).forEach(followerUid => {
        if (existingFollows[followerUid]?.[verifiedUserId]) {
          followerCount++;
        }
      });

      if (followerCount < 1200) {
        console.log(`🌱 Adding ${1200 - followerCount} more followers...`);
        const followRelationships: any = {};
        
        for (let i = followerCount + 1; i <= 1200; i++) {
          const followerUid = `follower-${i}`;
          if (!followRelationships[followerUid]) {
            followRelationships[followerUid] = {};
          }
          followRelationships[followerUid][verifiedUserId] = {
            timestamp: Date.now() - (i * 1000),
          };
        }

        await permanentDb.ref("followRelationships").update(followRelationships);
        console.log(`✅ Added ${1200 - followerCount} followers for verified user`);
      } else {
        console.log("✅ Verified user already has 1200 followers");
      }
      
      // Check if professor assignments exist, if not, seed them
      const assignmentsSnapshot = await db.ref("professorAssignments").once("value");
      if (!assignmentsSnapshot.exists()) {
        console.log("🌱 Seeding professor assignments...");
        
        const professorAssignments = {
          "assignment-1": {
            grade: "701",
            subject: "Matemática",
            professorEmail: "carlos.silva@escola.com",
            professorUid: "teacher-carlos",
          },
          "assignment-2": {
            grade: "701",
            subject: "Português",
            professorEmail: "ana.santos@escola.com",
            professorUid: "teacher-ana",
          },
          "assignment-3": {
            grade: "701",
            subject: "História",
            professorEmail: "roberto.lima@escola.com",
            professorUid: "teacher-roberto",
          },
          "assignment-4": {
            grade: "701",
            subject: "Ciências",
            professorEmail: "maria.costa@escola.com",
            professorUid: "teacher-maria",
          },
          "assignment-5": {
            grade: "702",
            subject: "Matemática",
            professorEmail: "carlos.silva@escola.com",
            professorUid: "teacher-carlos",
          },
          "assignment-6": {
            grade: "702",
            subject: "Português",
            professorEmail: "ana.santos@escola.com",
            professorUid: "teacher-ana",
          },
          "assignment-7": {
            grade: "703",
            subject: "História",
            professorEmail: "roberto.lima@escola.com",
            professorUid: "teacher-roberto",
          },
          "assignment-8": {
            grade: "703",
            subject: "Ciências",
            professorEmail: "maria.costa@escola.com",
            professorUid: "teacher-maria",
          },
          "assignment-9": {
            grade: "801",
            subject: "Matemática",
            professorEmail: "carlos.silva@escola.com",
            professorUid: "teacher-carlos",
          },
          "assignment-10": {
            grade: "801",
            subject: "Física",
            professorEmail: "roberto.lima@escola.com",
            professorUid: "teacher-roberto",
          },
        };

        await db.ref("professorAssignments").set(professorAssignments);
        console.log("✅ Professor assignments seeded");

        // Seed Teacher User Profiles
        const teacherProfiles = {
          "teacher-carlos": {
            displayName: "Prof. Carlos Silva",
            email: "carlos.silva@escola.com",
            photoURL: "https://api.dicebear.com/7.x/avataaars/svg?seed=carlos",
            grade: null,
            role: "teacher",
          },
          "teacher-ana": {
            displayName: "Profa. Ana Santos",
            email: "ana.santos@escola.com",
            photoURL: "https://api.dicebear.com/7.x/avataaars/svg?seed=ana",
            grade: null,
            role: "teacher",
          },
          "teacher-roberto": {
            displayName: "Prof. Roberto Lima",
            email: "roberto.lima@escola.com",
            photoURL: "https://api.dicebear.com/7.x/avataaars/svg?seed=roberto",
            grade: null,
            role: "teacher",
          },
          "teacher-maria": {
            displayName: "Profa. Maria Costa",
            email: "maria.costa@escola.com",
            photoURL: "https://api.dicebear.com/7.x/avataaars/svg?seed=maria",
            grade: null,
            role: "teacher",
          },
        };

        await permanentDb.ref("users").update(teacherProfiles);
        console.log("✅ Teacher profiles seeded to permanent database");
      } else {
        console.log("✅ Professor assignments already exist");
        
        // Always ensure grade 901, 902, 903 assignments exist
        console.log("🌱 Ensuring professor assignments for grades 901, 902, 903...");
        
        const grade9Assignments = {
          "assignment-901-1": {
            grade: "901",
            subject: "Matemática",
            professorEmail: "carlos.silva@escola.com",
            professorUid: "teacher-carlos",
          },
          "assignment-901-2": {
            grade: "901",
            subject: "Português",
            professorEmail: "ana.santos@escola.com",
            professorUid: "teacher-ana",
          },
          "assignment-901-3": {
            grade: "901",
            subject: "História",
            professorEmail: "roberto.lima@escola.com",
            professorUid: "teacher-roberto",
          },
          "assignment-901-4": {
            grade: "901",
            subject: "Ciências",
            professorEmail: "maria.costa@escola.com",
            professorUid: "teacher-maria",
          },
          "assignment-902-1": {
            grade: "902",
            subject: "Matemática",
            professorEmail: "carlos.silva@escola.com",
            professorUid: "teacher-carlos",
          },
          "assignment-902-2": {
            grade: "902",
            subject: "Português",
            professorEmail: "ana.santos@escola.com",
            professorUid: "teacher-ana",
          },
          "assignment-903-1": {
            grade: "903",
            subject: "História",
            professorEmail: "roberto.lima@escola.com",
            professorUid: "teacher-roberto",
          },
          "assignment-903-2": {
            grade: "903",
            subject: "Ciências",
            professorEmail: "maria.costa@escola.com",
            professorUid: "teacher-maria",
          },
        };
        
        await db.ref("professorAssignments").update(grade9Assignments);
        console.log("✅ Grade 901/902/903 professor assignments ensured");
      }
      
      return;
    }

    // Seed Classes
    const classes = {
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
    };

    await db.ref("classes").set(classes);
    console.log("✅ Classes seeded");

    // Seed Events
    const now = Date.now();
    const events = {
      "event-1": {
        title: "Prova de Matemática",
        description: "Capítulos 5-8: Equações e funções",
        date: now + 7 * 24 * 60 * 60 * 1000, // 7 days from now
        type: "exam",
        classId: "class-mat-9a",
      },
      "event-2": {
        title: "Entrega de Trabalho de História",
        description: "Trabalho sobre a Revolução Industrial",
        date: now + 3 * 24 * 60 * 60 * 1000, // 3 days from now
        type: "assignment",
        classId: "class-hist-9a",
      },
      "event-3": {
        title: "Feira de Ciências",
        description: "Apresentação dos projetos científicos",
        date: now + 14 * 24 * 60 * 60 * 1000, // 14 days from now
        type: "other",
      },
      "event-4": {
        title: "Reunião de Pais",
        description: "Reunião trimestral com os responsáveis",
        date: now + 10 * 24 * 60 * 60 * 1000, // 10 days from now
        type: "meeting",
      },
    };

    await db.ref("events").set(events);
    console.log("✅ Events seeded");

    // Seed Sample Videos
    const videos = {
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
    };

    await db.ref("videos").set(videos);
    console.log("✅ Videos seeded");

    // Seed Sample Chat Messages
    const chatMessages = {
      "class-mat-9a": {
        messages: {
          "msg-1": {
            uid: "teacher-carlos",
            userName: "Prof. Carlos Silva",
            text: "Bom dia turma! Não esqueçam de revisar os exercícios para a prova da próxima semana.",
            timestamp: now - 6 * 60 * 60 * 1000,
            isTeacher: true,
          },
          "msg-2": {
            uid: "student-1",
            userName: "João Pedro",
            text: "Professor, pode explicar mais sobre a fórmula de Bhaskara?",
            timestamp: now - 5 * 60 * 60 * 1000,
            isTeacher: false,
          },
        },
      },
      "class-port-9a": {
        messages: {
          "msg-1": {
            uid: "teacher-ana",
            userName: "Profa. Ana Santos",
            text: "Pessoal, o trabalho sobre análise sintática deve ser entregue até sexta-feira!",
            timestamp: now - 12 * 60 * 60 * 1000,
            isTeacher: true,
          },
        },
      },
    };

    await db.ref("chats").set(chatMessages);
    console.log("✅ Chat messages seeded");

    // Seed Sample Grades (for a test user)
    const testUserId = "test-user-123";
    const grades = {
      [testUserId]: {
        "grade-1": {
          uid: testUserId,
          classId: "class-mat-9a",
          className: "Matemática 9º A",
          subject: "Matemática",
          bimestre: 1,
          grade: 8.5,
          teacher: "Prof. Carlos Silva",
          date: now - 30 * 24 * 60 * 60 * 1000,
        },
        "grade-2": {
          uid: testUserId,
          classId: "class-port-9a",
          className: "Português 9º A",
          subject: "Português",
          bimestre: 1,
          grade: 9.0,
          teacher: "Profa. Ana Santos",
          date: now - 28 * 24 * 60 * 60 * 1000,
        },
        "grade-3": {
          uid: testUserId,
          classId: "class-hist-9a",
          className: "História 9º A",
          subject: "História",
          bimestre: 1,
          grade: 7.5,
          teacher: "Prof. Roberto Lima",
          date: now - 25 * 24 * 60 * 60 * 1000,
        },
        "grade-4": {
          uid: testUserId,
          classId: "class-cien-9a",
          className: "Ciências 9º A",
          subject: "Ciências",
          bimestre: 1,
          grade: 8.0,
          teacher: "Profa. Maria Costa",
          date: now - 20 * 24 * 60 * 60 * 1000,
        },
        "grade-5": {
          uid: testUserId,
          classId: "class-mat-9a",
          className: "Matemática 9º A",
          subject: "Matemática",
          bimestre: 2,
          grade: 9.0,
          teacher: "Prof. Carlos Silva",
          date: now - 5 * 24 * 60 * 60 * 1000,
        },
      },
    };

    await permanentDb.ref("grades").set(grades);
    console.log("✅ Grades seeded to permanent database");

    // Seed Professor Assignments
    const professorAssignments = {
      "assignment-1": {
        grade: "701",
        subject: "Matemática",
        professorEmail: "carlos.silva@escola.com",
        professorUid: "teacher-carlos",
      },
      "assignment-2": {
        grade: "701",
        subject: "Português",
        professorEmail: "ana.santos@escola.com",
        professorUid: "teacher-ana",
      },
      "assignment-3": {
        grade: "701",
        subject: "História",
        professorEmail: "roberto.lima@escola.com",
        professorUid: "teacher-roberto",
      },
      "assignment-4": {
        grade: "701",
        subject: "Ciências",
        professorEmail: "maria.costa@escola.com",
        professorUid: "teacher-maria",
      },
      "assignment-5": {
        grade: "702",
        subject: "Matemática",
        professorEmail: "carlos.silva@escola.com",
        professorUid: "teacher-carlos",
      },
      "assignment-6": {
        grade: "702",
        subject: "Português",
        professorEmail: "ana.santos@escola.com",
        professorUid: "teacher-ana",
      },
      "assignment-7": {
        grade: "703",
        subject: "História",
        professorEmail: "roberto.lima@escola.com",
        professorUid: "teacher-roberto",
      },
      "assignment-8": {
        grade: "703",
        subject: "Ciências",
        professorEmail: "maria.costa@escola.com",
        professorUid: "teacher-maria",
      },
      "assignment-9": {
        grade: "801",
        subject: "Matemática",
        professorEmail: "carlos.silva@escola.com",
        professorUid: "teacher-carlos",
      },
      "assignment-10": {
        grade: "801",
        subject: "Física",
        professorEmail: "roberto.lima@escola.com",
        professorUid: "teacher-roberto",
      },
    };

    await db.ref("professorAssignments").set(professorAssignments);
    console.log("✅ Professor assignments seeded");

    // Seed Teacher User Profiles
    const teacherProfiles = {
      "teacher-carlos": {
        displayName: "Prof. Carlos Silva",
        email: "carlos.silva@escola.com",
        photoURL: "https://api.dicebear.com/7.x/avataaars/svg?seed=carlos",
        grade: null,
        role: "teacher",
      },
      "teacher-ana": {
        displayName: "Profa. Ana Santos",
        email: "ana.santos@escola.com",
        photoURL: "https://api.dicebear.com/7.x/avataaars/svg?seed=ana",
        grade: null,
        role: "teacher",
      },
      "teacher-roberto": {
        displayName: "Prof. Roberto Lima",
        email: "roberto.lima@escola.com",
        photoURL: "https://api.dicebear.com/7.x/avataaars/svg?seed=roberto",
        grade: null,
        role: "teacher",
      },
      "teacher-maria": {
        displayName: "Profa. Maria Costa",
        email: "maria.costa@escola.com",
        photoURL: "https://api.dicebear.com/7.x/avataaars/svg?seed=maria",
        grade: null,
        role: "teacher",
      },
    };

    await permanentDb.ref("users").update(teacherProfiles);
    console.log("✅ Teacher profiles seeded to permanent database");

    // Seed special verified user
    const verifiedUserId = "verified-user-sassisawsen";
    const verifiedUserProfile = {
      uid: verifiedUserId,
      displayName: "Sassisawsen",
      email: "sassisawsen2024@gmail.com",
      photoURL: "https://api.dicebear.com/7.x/avataaars/svg?seed=sassisawsen",
      verified: true,
      followerCount: 1200,
      followingCount: 0,
      postCount: 0,
      createdAt: now,
    };

    await permanentDb.ref(`userProfiles/${verifiedUserId}`).set(verifiedUserProfile);
    console.log("✅ Verified user profile created in permanent database for sassisawsen2024@gmail.com");

    // Create 1200 fake followers for the verified user
    console.log("🌱 Creating followers for verified user...");
    const followRelationships: any = {};
    
    for (let i = 1; i <= 1200; i++) {
      const followerUid = `follower-${i}`;
      if (!followRelationships[followerUid]) {
        followRelationships[followerUid] = {};
      }
      followRelationships[followerUid][verifiedUserId] = {
        timestamp: now - (i * 1000), // Stagger timestamps
      };
    }

    await permanentDb.ref("followRelationships").update(followRelationships);
    console.log("✅ 1200 followers created in permanent database for verified user");

    console.log("🎉 All data seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding data:", error);
  }
}
