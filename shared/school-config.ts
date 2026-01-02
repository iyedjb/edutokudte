export interface SchoolConfig {
  id: string;
  name: string;
  fullName: string;
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  brandName: string; // e.g., "Edutok X E.E Santa Quitéria"
  grades: string[];
  basePath: string; // e.g., "/escolas/E.E/Santa Quitéria"
}

export const SCHOOLS: Record<string, SchoolConfig> = {
  "santa-quiteria": {
    id: "santa-quiteria",
    name: "E.E Santa Quitéria",
    fullName: "Escola Estadual Santa Quitéria",
    logo: "/attached_assets/santa-quiteria-logo.png",
    primaryColor: "#1e3a8a", // navy blue from logo
    secondaryColor: "#dc2626", // red from logo
    brandName: "Edutok X E.E Santa Quitéria",
    grades: (() => {
      const grades = [];
      // 1reg1 through 1reg8
      for (let reg = 1; reg <= 8; reg++) {
        grades.push(`1reg${reg}`);
      }
      // 2reg1 through 2reg8
      for (let reg = 1; reg <= 8; reg++) {
        grades.push(`2reg${reg}`);
      }
      // 3reg1 through 3reg7
      for (let reg = 1; reg <= 7; reg++) {
        grades.push(`3reg${reg}`);
      }
      return grades;
    })(),
    basePath: "/escolas/E.E/Santa Quitéria"
  },
  "zita-lucas": {
    id: "zita-lucas",
    name: "E.M Zita Lucas E Silva",
    fullName: "Escola Municipal Zita Lucas E Silva",
    logo: "", // Default logo
    primaryColor: "#6366f1",
    secondaryColor: "#8b5cf6",
    brandName: "Edutok",
    grades: ["701", "702", "703", "801", "802", "803", "901", "902", "903"],
    basePath: ""
  }
};

export function getSchoolFromPath(pathname: string): SchoolConfig | null {
  for (const school of Object.values(SCHOOLS)) {
    if (school.basePath && pathname.startsWith(school.basePath)) {
      return school;
    }
  }
  return null;
}

export function getSchoolById(schoolId: string): SchoolConfig | null {
  return SCHOOLS[schoolId] || null;
}

export function getSchoolByName(schoolName: string): SchoolConfig | null {
  return Object.values(SCHOOLS).find(s => s.name === schoolName) || null;
}
