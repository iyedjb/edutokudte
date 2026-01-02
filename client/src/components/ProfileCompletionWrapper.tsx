import { useState, useEffect } from "react";
import { useAuth } from "@/lib/useAuth";
import { ProfileCompletionModal } from "./ProfileCompletionModal";
import { ref, get } from "firebase/database";
import { profileNotasDatabase } from "@/lib/firebase";

interface ProfileCompletionWrapperProps {
  children: React.ReactNode;
}

export function ProfileCompletionWrapper({ children }: ProfileCompletionWrapperProps) {
  const { user, loading } = useAuth();
  const [shouldSkipModal, setShouldSkipModal] = useState<boolean>(false);
  const [checkingStatus, setCheckingStatus] = useState<boolean>(true);

  useEffect(() => {
    const checkUserStatus = async () => {
      if (!user) {
        setShouldSkipModal(false);
        setCheckingStatus(false);
        return;
      }

      try {
        // Check if user is a secretaria student (logged in via CPF)
        // These students have their data from the school and don't need to complete profile
        // They can be identified by email pattern or isSecretariaStudent flag
        if (user.email?.endsWith("@educfy.local")) {
          setShouldSkipModal(true);
          setCheckingStatus(false);
          return;
        }

        const profileNotasRef = ref(profileNotasDatabase, `userProfiles/${user.uid}`);
        const profileNotasSnapshot = await get(profileNotasRef);
        
        if (profileNotasSnapshot.exists()) {
          const profileData = profileNotasSnapshot.val();
          if (profileData.isSecretariaStudent) {
            setShouldSkipModal(true);
            setCheckingStatus(false);
            return;
          }
        }

        // Check if user is in teachers list (permanent database)
        const teachersRef = ref(profileNotasDatabase, "teachers");
        const teachersSnapshot = await get(teachersRef);
        
        if (teachersSnapshot.exists()) {
          const teachers = teachersSnapshot.val();
          const isInTeachersList = Object.values(teachers).some(
            (teacher: any) => teacher.email?.toLowerCase() === user.email?.toLowerCase()
          );
          
          if (isInTeachersList) {
            setShouldSkipModal(true);
            setCheckingStatus(false);
            return;
          }
        }

        // Check user profile for role/verified status (permanent database)
        const userProfileRef = ref(profileNotasDatabase, `userProfiles/${user.uid}`);
        const profileSnapshot = await get(userProfileRef);
        
        if (profileSnapshot.exists()) {
          const profileData = profileSnapshot.val();
          if (profileData.role || profileData.verified) {
            setShouldSkipModal(true);
            setCheckingStatus(false);
            return;
          }
        }

        // Check if user has verified flag in users collection (permanent database)
        const userRef = ref(profileNotasDatabase, `users/${user.uid}`);
        const userSnapshot = await get(userRef);
        
        if (userSnapshot.exists()) {
          const userData = userSnapshot.val();
          if (userData.verified) {
            setShouldSkipModal(true);
            setCheckingStatus(false);
            return;
          }
        }

        setShouldSkipModal(false);
        setCheckingStatus(false);
      } catch (error) {
        console.error("Error checking user status:", error);
        setShouldSkipModal(false);
        setCheckingStatus(false);
      }
    };

    checkUserStatus();
  }, [user]);

  // Don't show modal while loading or checking status
  if (loading || checkingStatus) {
    return <>{children}</>;
  }

  // Teachers and secretaria students don't need to complete profile
  if (shouldSkipModal) {
    return <>{children}</>;
  }

  // Check if user is missing required profile data
  const isProfileIncomplete = user && (!user.cpf || !user.birthdate || !user.school || !user.grade);

  return (
    <>
      {children}
      {isProfileIncomplete && <ProfileCompletionModal open={true} />}
    </>
  );
}
