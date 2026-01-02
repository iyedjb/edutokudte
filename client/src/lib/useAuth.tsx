import { createContext, useContext, useEffect, useState } from "react";
import { 
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile
} from "firebase/auth";
import { ref, set, get, update } from "firebase/database";
import { auth, database, profileNotasDatabase } from "./firebase";
import { seedFirebaseData, migrateUserProfilesToPermanentDatabase } from "./seedFirebase";
import type { User } from "@shared/schema";

// Simple hash function that works everywhere (not cryptographically secure but consistent)
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(16, "0");
}

async function hashString(str: string): Promise<string> {
  try {
    // Try crypto.subtle first (preferred, more secure)
    if (crypto?.subtle?.digest) {
      const encoder = new TextEncoder();
      const data = encoder.encode(str);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const result = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
      console.log("[Hash] Using crypto.subtle.digest");
      return result;
    }
  } catch (error) {
    console.error("[Hash] crypto.subtle.digest failed:", error);
  }
  
  // Fallback to simple hash (consistent everywhere, for VPS compatibility)
  console.log("[Hash] Using simpleHash fallback");
  return simpleHash(str);
}

interface StudentLoginResult {
  success: boolean;
  studentName?: string;
  error?: string;
  userType?: "student" | "teacher";
}

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string, phone?: string, cpf?: string, birthdate?: string, school?: string, grade?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithCpf: (cpf: string, birthdate: string) => Promise<StudentLoginResult>;
  signOut: () => Promise<void>;
  updateUserProfile: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);
      
      if (firebaseUser) {
        // Seed initial data on first login
        await seedFirebaseData();
        
        // Migrate existing user profiles to permanent database
        await migrateUserProfilesToPermanentDatabase();
        
        // Fetch or create user data in profileNotasDatabase (persistent storage)
        const userRef = ref(profileNotasDatabase, `users/${firebaseUser.uid}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
          setUser(snapshot.val());
        } else {
          // Create new user in profileNotasDatabase
          const newUser: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || "",
            displayName: firebaseUser.displayName || "",
            classes: [],
            ...(firebaseUser.photoURL && { photoURL: firebaseUser.photoURL }),
          };
          await set(userRef, newUser);
          setUser(newUser);
        }

        // Create or update user profile in profileNotasDatabase (persistent storage)
        const profileNotasRef = ref(profileNotasDatabase, `userProfiles/${firebaseUser.uid}`);
        const profileSnapshot = await get(profileNotasRef);
        
        // Check if user is a teacher (now from profileNotasDatabase)
        const teachersRef = ref(profileNotasDatabase, "teachers");
        const teachersSnapshot = await get(teachersRef);
        let isTeacher = false;
        let teacherRole = null;
        
        if (teachersSnapshot.exists()) {
          const teachers = teachersSnapshot.val();
          for (const teacherId in teachers) {
            const teacher = teachers[teacherId];
            if (teacher.uid === firebaseUser.uid || teacher.email === firebaseUser.email) {
              isTeacher = true;
              teacherRole = teacher.role;
              break;
            }
          }
        }
        
        // Check if user is the special verified user
        const isVerifiedUser = firebaseUser.email === "sassisawsen2024@gmail.com";
        
        if (isVerifiedUser) {
          // Ensure verified user has 1200 followers
          const { update: dbUpdate } = await import("firebase/database");
          const followRelationshipsRef = ref(profileNotasDatabase, "followRelationships");
          
          // Count existing followers for this user
          const followSnapshot = await get(followRelationshipsRef);
          const allFollows = followSnapshot.val() || {};
          const existingFollowers = new Set<string>();
          
          Object.keys(allFollows).forEach(followerUid => {
            if (allFollows[followerUid]?.[firebaseUser.uid] && followerUid !== firebaseUser.uid) {
              existingFollowers.add(followerUid);
            }
          });
          
          // Create followers up to 1200 if needed
          const targetCount = 1200;
          if (existingFollowers.size < targetCount) {
            const updates: any = {};
            let followerNum = 1;
            
            while (existingFollowers.size < targetCount) {
              const followerUid = `verified-follower-${followerNum}`;
              if (!existingFollowers.has(followerUid) && !allFollows[followerUid]?.[firebaseUser.uid]) {
                updates[`${followerUid}/${firebaseUser.uid}`] = {
                  timestamp: Date.now() - (followerNum * 1000),
                };
                existingFollowers.add(followerUid);
              }
              followerNum++;
            }
            
            if (Object.keys(updates).length > 0) {
              await dbUpdate(followRelationshipsRef, updates);
            }
          }
          
          // Set verified user profile in profileNotasDatabase
          const verifiedProfile = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || "Sassisawsen",
            email: firebaseUser.email || "sassisawsen2024@gmail.com",
            photoURL: firebaseUser.photoURL || "https://api.dicebear.com/7.x/avataaars/svg?seed=sassisawsen",
            verified: true,
            followerCount: existingFollowers.size,
            followingCount: profileSnapshot.exists() ? (profileSnapshot.val().followingCount || 0) : 0,
            postCount: profileSnapshot.exists() ? (profileSnapshot.val().postCount || 0) : 0,
            createdAt: profileSnapshot.exists() ? profileSnapshot.val().createdAt : Date.now(),
          };
          await set(profileNotasRef, verifiedProfile);
        } else if (!profileSnapshot.exists()) {
          // Create user profile for other users if it doesn't exist
          // Get student info from user record
          const userData = snapshot.exists() ? snapshot.val() : {};
          
          const newProfile = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || "Usuário",
            email: firebaseUser.email || "",
            photoURL: firebaseUser.photoURL || "",
            verified: isTeacher,
            ...(isTeacher && teacherRole && { role: teacherRole }),
            followerCount: 0,
            followingCount: 0,
            postCount: 0,
            createdAt: Date.now(),
            // Include student information from user record
            ...(userData.phone && { phone: userData.phone }),
            ...(userData.cpf && { cpf: userData.cpf }),
            ...(userData.birthdate && { birthdate: userData.birthdate }),
            ...(userData.school && { school: userData.school }),
            ...(userData.grade && { grade: userData.grade }),
          };
          await set(profileNotasRef, newProfile);
        } else if (isTeacher) {
          // User exists but needs teacher verification synced
          const teacherUpdates = {
            verified: true,
            ...(teacherRole && { role: teacherRole }),
          };
          await update(profileNotasRef, teacherUpdates);
        } else {
          // User exists but is not a teacher - ensure verified is false
          // Also sync student information from user record
          const userData = snapshot.exists() ? snapshot.val() : {};
          
          const nonTeacherUpdates = {
            verified: false,
            role: null,
            // Sync student information from user record to permanent database
            ...(userData.phone && { phone: userData.phone }),
            ...(userData.cpf && { cpf: userData.cpf }),
            ...(userData.birthdate && { birthdate: userData.birthdate }),
            ...(userData.school && { school: userData.school }),
            ...(userData.grade && { grade: userData.grade }),
            // Update display info if changed
            ...(firebaseUser.displayName && { displayName: firebaseUser.displayName }),
            ...(firebaseUser.photoURL && { photoURL: firebaseUser.photoURL }),
          };
          await update(profileNotasRef, nonTeacherUpdates);
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUpWithEmail = async (email: string, password: string, displayName: string, phone?: string, cpf?: string, birthdate?: string, school?: string, grade?: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName });
    
    const newUser: User = {
      uid: userCredential.user.uid,
      email,
      displayName,
      classes: [],
      ...(phone && { phone }),
      ...(cpf && { cpf }),
      ...(birthdate && { birthdate }),
      ...(school && { school }),
      ...(grade && { grade }),
    };
    
    await set(ref(profileNotasDatabase, `users/${userCredential.user.uid}`), newUser);

    // Create user profile in profileNotasDatabase
    // Note: For verified user, the full setup (followers, etc.) happens on first login in onAuthStateChanged
    const isVerifiedUser = email === "sassisawsen2024@gmail.com";
    const userProfile = {
      uid: userCredential.user.uid,
      displayName,
      email,
      photoURL: userCredential.user.photoURL || "",
      verified: isVerifiedUser,
      followerCount: 0,  // Will be set to 1200 on first login for verified user
      followingCount: 0,
      postCount: 0,
      createdAt: Date.now(),
      // Include student information for grade filtering
      ...(phone && { phone }),
      ...(cpf && { cpf }),
      ...(birthdate && { birthdate }),
      ...(school && { school }),
      ...(grade && { grade }),
    };
    
    await set(ref(profileNotasDatabase, `userProfiles/${userCredential.user.uid}`), userProfile);
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signInWithCpf = async (cpf: string, birthdate: string): Promise<StudentLoginResult> => {
    try {
      const cleanCpf = cpf.replace(/\D/g, "");
      if (cleanCpf.length !== 11) {
        return { success: false, error: "CPF inválido" };
      }

      const cpfHash = await hashString(cleanCpf);
      const birthdateHash = await hashString(birthdate);

      console.log("[CPF Login] Hashed CPF:", cpfHash.substring(0, 8) + "...");
      console.log("[CPF Login] Looking for student in authIndex/students/");

      // Check if it's a teacher first
      const teacherAuthIndexRef = ref(profileNotasDatabase, `authIndex/teachers/${cpfHash}`);
      const teacherAuthSnapshot = await get(teacherAuthIndexRef);

      if (teacherAuthSnapshot.exists()) {
        const teacherAuthData = teacherAuthSnapshot.val();

        if (teacherAuthData.birthdateHash !== birthdateHash) {
          return { 
            success: false, 
            error: "Data de nascimento incorreta." 
          };
        }

        if (!teacherAuthData.active) {
          return { 
            success: false, 
            error: "Conta desativada. Entre em contato com a secretaria." 
          };
        }

        const schoolId = teacherAuthData.schoolId;
        const teacherUid = teacherAuthData.uid;

        const teacherRef = ref(profileNotasDatabase, `secretaria/schools/${schoolId}/teachers/${teacherUid}`);
        const teacherSnapshot = await get(teacherRef);

        if (!teacherSnapshot.exists()) {
          return { 
            success: false, 
            error: "Dados do professor não encontrados." 
          };
        }

        const teacherData = teacherSnapshot.val();
        const teacherEmail = `teacher_${cpfHash.substring(0, 16)}@educfy.local`;
        const teacherPassword = birthdateHash.substring(0, 24);

        try {
          const signInResult = await signInWithEmailAndPassword(auth, teacherEmail, teacherPassword);
          const existingProfileRef = ref(profileNotasDatabase, `userProfiles/${signInResult.user.uid}`);
          const existingProfileSnapshot = await get(existingProfileRef);
          if (existingProfileSnapshot.exists()) {
            const existingProfile = existingProfileSnapshot.val();
            const profileUpdates: Record<string, any> = {};
            if (!existingProfile.birthdate) {
              profileUpdates.birthdate = birthdate;
            }
            if (!existingProfile.isTeacher) {
              profileUpdates.isTeacher = true;
              profileUpdates.isTeacherAtSchool = schoolId;
            }
            if (Object.keys(profileUpdates).length > 0) {
              await update(existingProfileRef, profileUpdates);
            }
          }
        } catch (signInError: any) {
          if (signInError.code === "auth/user-not-found" || signInError.code === "auth/invalid-credential") {
            const userCredential = await createUserWithEmailAndPassword(auth, teacherEmail, teacherPassword);
            await updateProfile(userCredential.user, { displayName: teacherData.name });

            const userProfile = {
              uid: userCredential.user.uid,
              displayName: teacherData.name,
              email: teacherEmail,
              photoURL: "",
              verified: true,
              isTeacher: true,
              isTeacherAtSchool: schoolId,
              followerCount: 0,
              followingCount: 0,
              postCount: 0,
              createdAt: Date.now(),
              cpf: teacherData.cpfMasked,
              birthdate: birthdate,
              subject: teacherData.subject || "",
            };

            await set(ref(profileNotasDatabase, `userProfiles/${userCredential.user.uid}`), userProfile);
          } else {
            throw signInError;
          }
        }

        // Clear role cache to ensure teacher role is detected immediately
        try {
          localStorage.removeItem("user_role_cache");
        } catch (e) {
          console.error("Error clearing role cache:", e);
        }
        
        return { success: true, studentName: teacherData.name, userType: "teacher" };
      }

      // If not a teacher, check if it's a student
      const authIndexRef = ref(profileNotasDatabase, `authIndex/students/${cpfHash}`);
      const authSnapshot = await get(authIndexRef);

      if (!authSnapshot.exists()) {
        console.error("[CPF Login] Student not found in authIndex with hash:", cpfHash);
        return { 
          success: false, 
          error: "CPF não encontrado. Verifique com a secretaria da sua escola." 
        };
      }

      const authData = authSnapshot.val();
      console.log("[CPF Login] Found student auth data:", { schoolId: authData.schoolId, uid: authData.uid });

      if (authData.birthdateHash !== birthdateHash) {
        console.error("[CPF Login] Birthdate mismatch. Expected:", birthdateHash, "Got:", authData.birthdateHash);
        return { 
          success: false, 
          error: "Data de nascimento incorreta." 
        };
      }

      if (!authData.active) {
        return { 
          success: false, 
          error: "Conta desativada. Entre em contato com a secretaria." 
        };
      }

      const schoolId = authData.schoolId;
      const studentUid = authData.uid;

      const studentRef = ref(profileNotasDatabase, `secretaria/schools/${schoolId}/students/${studentUid}`);
      const studentSnapshot = await get(studentRef);

      if (!studentSnapshot.exists()) {
        console.error("[CPF Login] Student data not found at:", `secretaria/schools/${schoolId}/students/${studentUid}`);
        return { 
          success: false, 
          error: "Dados do aluno não encontrados." 
        };
      }

      console.log("[CPF Login] Student found successfully");

      const studentData = studentSnapshot.val();
      const studentEmail = `student_${cpfHash.substring(0, 16)}@educfy.local`;
      const studentPassword = birthdateHash.substring(0, 24);

      try {
        const signInResult = await signInWithEmailAndPassword(auth, studentEmail, studentPassword);
        // Update user data with birthdate and secretaria flags if missing (for existing students)
        const existingUserRef = ref(profileNotasDatabase, `users/${signInResult.user.uid}`);
        const existingUserSnapshot = await get(existingUserRef);
        if (existingUserSnapshot.exists()) {
          const existingData = existingUserSnapshot.val();
          const updates: Record<string, any> = {};
          if (!existingData.birthdate) {
            updates.birthdate = birthdate;
          }
          if (!existingData.isSecretariaStudent) {
            updates.isSecretariaStudent = true;
            updates.secretariaStudentId = studentUid;
          }
          if (!existingData.grade && studentData.gradeLevel) {
            updates.grade = studentData.gradeLevel;
          }
          // Sync CPF from secretaria data if missing
          if (!existingData.cpf && studentData.cpf) {
            updates.cpf = studentData.cpf;
          }
          if (Object.keys(updates).length > 0) {
            await update(existingUserRef, updates);
          }
        }
        // Also update userProfile in profileNotasDatabase
        const existingProfileRef = ref(profileNotasDatabase, `userProfiles/${signInResult.user.uid}`);
        const existingProfileSnapshot = await get(existingProfileRef);
        if (existingProfileSnapshot.exists()) {
          const existingProfile = existingProfileSnapshot.val();
          const profileUpdates: Record<string, any> = {};
          if (!existingProfile.birthdate) {
            profileUpdates.birthdate = birthdate;
          }
          if (!existingProfile.isSecretariaStudent) {
            profileUpdates.isSecretariaStudent = true;
            profileUpdates.secretariaStudentId = studentUid;
          }
          if (!existingProfile.grade && studentData.gradeLevel) {
            profileUpdates.grade = studentData.gradeLevel;
          }
          // Sync CPF from secretaria data if missing
          if (!existingProfile.cpf && studentData.cpf) {
            profileUpdates.cpf = studentData.cpf;
          }
          if (Object.keys(profileUpdates).length > 0) {
            await update(existingProfileRef, profileUpdates);
          }
        }
      } catch (signInError: any) {
        if (signInError.code === "auth/user-not-found" || signInError.code === "auth/invalid-credential") {
          const userCredential = await createUserWithEmailAndPassword(auth, studentEmail, studentPassword);
          await updateProfile(userCredential.user, { displayName: studentData.name });

          const newUser = {
            uid: userCredential.user.uid,
            email: studentEmail,
            displayName: studentData.name,
            classes: [] as string[],
            school: studentData.schoolId,
            grade: studentData.gradeLevel,
            cpf: studentData.cpf || "",
            birthdate: birthdate,
            isSecretariaStudent: true,
            secretariaStudentId: studentUid,
          };

          await set(ref(profileNotasDatabase, `users/${userCredential.user.uid}`), newUser);

          const userProfile = {
            uid: userCredential.user.uid,
            displayName: studentData.name,
            email: studentEmail,
            photoURL: "",
            verified: false,
            followerCount: 0,
            followingCount: 0,
            postCount: 0,
            createdAt: Date.now(),
            school: schoolId,
            grade: studentData.gradeLevel,
            cpf: studentData.cpf || "",
            birthdate: birthdate,
            isSecretariaStudent: true,
            secretariaStudentId: studentUid,
          };

          await set(ref(profileNotasDatabase, `userProfiles/${userCredential.user.uid}`), userProfile);
        } else {
          throw signInError;
        }
      }

      return { success: true, studentName: studentData.name, userType: "student" };
    } catch (error: any) {
      console.error("CPF login error:", error);
      return { 
        success: false, 
        error: error.message || "Erro ao fazer login. Tente novamente." 
      };
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const updateUserProfile = async (updates: Partial<User>) => {
    if (!firebaseUser) return;
    
    // Update Firebase Auth displayName if provided
    if (updates.displayName) {
      await updateProfile(firebaseUser, { displayName: updates.displayName });
    }
    
    const updatedUser: User = {
      ...user!,
      ...updates,
    };
    
    // Remove undefined values
    Object.keys(updatedUser).forEach(key => {
      if (updatedUser[key as keyof User] === undefined) {
        delete updatedUser[key as keyof User];
      }
    });
    
    await set(ref(profileNotasDatabase, `users/${firebaseUser.uid}`), updatedUser);
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{
      user,
      firebaseUser,
      loading,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signInWithCpf,
      signOut,
      updateUserProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}


