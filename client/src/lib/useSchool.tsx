import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";
import { SchoolConfig, getSchoolFromPath, SCHOOLS } from "@shared/school-config";

interface SchoolContextType {
  school: SchoolConfig;
  setSchoolById: (schoolId: string) => void;
}

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

export function SchoolProvider({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [school, setSchool] = useState<SchoolConfig>(() => {
    // Try to get school from path
    const schoolFromPath = getSchoolFromPath(location);
    if (schoolFromPath) {
      return schoolFromPath;
    }
    
    // Default to Zita Lucas
    return SCHOOLS["zita-lucas"];
  });

  useEffect(() => {
    // Update school when location changes
    const schoolFromPath = getSchoolFromPath(location);
    if (schoolFromPath && schoolFromPath.id !== school.id) {
      setSchool(schoolFromPath);
    }
  }, [location]);

  const setSchoolById = (schoolId: string) => {
    const newSchool = SCHOOLS[schoolId];
    if (newSchool) {
      setSchool(newSchool);
    }
  };

  return (
    <SchoolContext.Provider value={{ school, setSchoolById }}>
      {children}
    </SchoolContext.Provider>
  );
}

export function useSchool() {
  const context = useContext(SchoolContext);
  if (context === undefined) {
    throw new Error("useSchool must be used within a SchoolProvider");
  }
  return context;
}
