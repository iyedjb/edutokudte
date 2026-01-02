import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { ref, onValue, get } from "firebase/database";
import { profileNotasDatabase } from "./firebase";
import { useAuth } from "./useAuth";

type UserRole = "student" | "professor" | "admin" | null;

interface RoleContextType {
  role: UserRole;
  isProfessor: boolean;
  isStudent: boolean;
  isAdmin: boolean;
  loading: boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

const ROLE_CACHE_KEY = "user_role_cache";
const ADMIN_EMAIL = "sassisawsen2024@gmail.com";

interface RoleCache {
  role: UserRole;
  uid: string;
  email: string;
  timestamp: number;
}

function getCachedRole(uid: string, email: string): UserRole | null {
  try {
    const cached = localStorage.getItem(ROLE_CACHE_KEY);
    if (!cached) return null;
    
    const cacheData: RoleCache = JSON.parse(cached);
    
    if (cacheData.uid === uid && cacheData.email === email) {
      const age = Date.now() - cacheData.timestamp;
      if (age < 5 * 60 * 1000) {
        return cacheData.role;
      }
    }
  } catch (error) {
    console.error("Error reading role cache:", error);
  }
  return null;
}

function setCachedRole(role: UserRole, uid: string, email: string) {
  try {
    const cacheData: RoleCache = {
      role,
      uid,
      email,
      timestamp: Date.now(),
    };
    localStorage.setItem(ROLE_CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.error("Error setting role cache:", error);
  }
}

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const teachersDataRef = useRef<Record<string, any>>({});

  const updateRole = useCallback((newRole: UserRole) => {
    setRole(newRole);
    if (user?.uid && user?.email && newRole) {
      setCachedRole(newRole, user.uid, user.email);
    }
  }, [user?.uid, user?.email]);

  const checkRole = useCallback(async () => {
    if (!user?.uid || !user?.email) {
      updateRole(null);
      setLoading(false);
      return;
    }

    try {
      if (user.email === ADMIN_EMAIL) {
        updateRole("admin");
        setLoading(false);
        return;
      }

      const teachers = teachersDataRef.current;
      const isTeacher = Object.values(teachers).some((teacher: any) => 
        teacher.email?.toLowerCase() === user.email?.toLowerCase()
      );
      
      if (isTeacher) {
        updateRole("professor");
        setLoading(false);
        return;
      }

      const userProfileRef = ref(profileNotasDatabase, `userProfiles/${user.uid}`);
      const profileSnapshot = await get(userProfileRef);
      
      if (profileSnapshot.exists()) {
        const profile = profileSnapshot.val();
        const userRole = profile.role;
        const hasTeacherRole = userRole === 'teacher' || userRole === 'professor' || userRole === 'professora' || userRole === 'director' || userRole === 'vice_director';
        
        // Also check isTeacher flag for CPF-authenticated teachers
        const isTeacherByCpf = profile.isTeacher === true;
        
        if (hasTeacherRole || isTeacherByCpf) {
          updateRole("professor");
        } else {
          updateRole("student");
        }
      } else {
        updateRole("student");
      }
    } catch (error) {
      console.error("Error checking role:", error);
      updateRole("student");
    } finally {
      setLoading(false);
    }
  }, [user?.uid, user?.email, updateRole]);

  useEffect(() => {
    if (!user?.uid || !user?.email) {
      setRole(null);
      setLoading(false);
      return;
    }

    const cachedRole = getCachedRole(user.uid, user.email);
    if (cachedRole) {
      setRole(cachedRole);
      setLoading(false);
    }

    const teachersRef = ref(profileNotasDatabase, "teachers");
    const unsubscribeTeachers = onValue(teachersRef, (snapshot) => {
      teachersDataRef.current = snapshot.val() || {};
      checkRole();
    });

    const userProfileRef = ref(profileNotasDatabase, `userProfiles/${user.uid}`);
    const unsubscribeProfile = onValue(userProfileRef, () => {
      checkRole();
    });

    return () => {
      unsubscribeTeachers();
      unsubscribeProfile();
    };
  }, [user?.uid, user?.email, checkRole]);

  const value: RoleContextType = {
    role,
    isProfessor: role === "professor" || role === "admin",
    isStudent: role === "student",
    isAdmin: role === "admin",
    loading,
  };

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
}
