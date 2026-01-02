import { useState, useEffect } from "react";
import { useAuth } from "@/lib/useAuth";
import { GradeSelectionDialog } from "./GradeSelectionDialog";
import { ref, onValue, get, query, orderByChild, equalTo } from "firebase/database";
import { profileNotasDatabase } from "@/lib/firebase";

export function GradeSetupWrapper({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [userHasGrade, setUserHasGrade] = useState<boolean | null>(null);
  const [isTeacher, setIsTeacher] = useState<boolean>(false);
  const [isSecretariaStudent, setIsSecretariaStudent] = useState<boolean>(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState<boolean>(true);

  useEffect(() => {
    if (!user) {
      setUserHasGrade(null);
      setIsTeacher(false);
      setIsSecretariaStudent(false);
      setIsCheckingStatus(false);
      return;
    }

    // Check if user is a secretaria student (logged in via CPF)
    // These students already have their grade set by the school
    if (user.email?.endsWith("@educfy.local")) {
      setIsSecretariaStudent(true);
      // Skip showing grade dialog for secretaria students entirely
      setIsCheckingStatus(false);
      return;
    }

    const checkTeacherStatus = async () => {
      try {
        const teachersRef = ref(profileNotasDatabase, "teachers");
        const teachersSnapshot = await get(teachersRef);
        
        if (teachersSnapshot.exists()) {
          const teachers = teachersSnapshot.val();
          const isInTeachersList = Object.values(teachers).some(
            (teacher: any) => teacher.email?.toLowerCase() === user.email?.toLowerCase()
          );
          
          if (isInTeachersList) {
            setIsTeacher(true);
            return;
          }
        }

        const userProfileRef = ref(profileNotasDatabase, `userProfiles/${user.uid}`);
        const profileSnapshot = await get(userProfileRef);
        
        if (profileSnapshot.exists()) {
          const profileData = profileSnapshot.val();
          if (profileData.role || profileData.verified) {
            setIsTeacher(true);
            return;
          }
          // Check if user is a secretaria student
          if (profileData.isSecretariaStudent) {
            setIsSecretariaStudent(true);
          }
        }
      } catch (error) {
        console.error("Error checking teacher status:", error);
      }
    };

    const userRef = ref(profileNotasDatabase, `users/${user.uid}`);
    const unsubscribe = onValue(userRef, async (snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.val();
        setUserHasGrade(!!userData.grade);
        
        // Check if user is a secretaria student from user record
        if (userData.isSecretariaStudent) {
          setIsSecretariaStudent(true);
          setIsCheckingStatus(false);
          return;
        }
        
        if (userData.verified) {
          setIsTeacher(true);
          setIsCheckingStatus(false);
        } else {
          await checkTeacherStatus();
          setIsCheckingStatus(false);
        }
      } else {
        setUserHasGrade(false);
        await checkTeacherStatus();
        setIsCheckingStatus(false);
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Don't show dialog while still checking status
  if (isCheckingStatus && user) {
    return <>{children}</>;
  }

  // Only show grade selection dialog for non-teachers who don't have a grade
  // Secretaria students (logged in via CPF) already have their grade set by the school
  const shouldShowDialog = userHasGrade === false && !isTeacher && !isSecretariaStudent;

  return (
    <>
      {children}
      {shouldShowDialog && <GradeSelectionDialog open={true} />}
    </>
  );
}
