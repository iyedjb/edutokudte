import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { ref, push, onValue, set, get, update, remove } from "firebase/database";
import { profileNotasDatabase } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { 
  School, 
  Users, 
  Plus, 
  Search,
  UserPlus,
  Loader2,
  ChevronLeft,
  BookOpen,
  Calendar,
  X,
  GraduationCap,
  LogOut,
  Trash2
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { School as SchoolType, SchoolStudent } from "@shared/schema";

const GRADE_LEVELS = [
  "1re1", "1re2", "1re3", "1re4", "1re5", "1re6", "1re7", "1re8",
  "2re1", "2re2", "2re3", "2re4", "2re5", "2re6", "2re7", "2re8",
  "3re1", "3re2", "3re3", "3re4", "3re5", "3re6", "3re7", "3re8",
];

const SUBJECTS = [
  "Matemática", "Português", "Ciências", "História", "Geografia",
  "Inglês", "Educação Física", "Artes", "Física", "Química", "Biologia"
];

function formatCPF(value: string): string {
  const numbers = value.replace(/\D/g, "").slice(0, 11);
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
}

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

interface StudentGrades {
  [subject: string]: {
    [bimester: number]: number | null;
  };
}

interface StudentAbsences {
  [bimester: number]: number;
}

interface Teacher {
  id: string;
  name: string;
  cpfHash: string;
  cpfMasked: string;
  birthdateHash: string;
  subject?: string;
  createdAt: number;
  active: boolean;
}

export default function EscolaPanel() {
  const [, params] = useRoute("/escolas/:slug");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const slug = params?.slug;

  const [school, setSchool] = useState<SchoolType | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [students, setStudents] = useState<SchoolStudent[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("students");
  const [searchQuery, setSearchQuery] = useState("");

  // Teacher login state
  const [loggedInTeacher, setLoggedInTeacher] = useState<Teacher | null>(() => {
    const stored = localStorage.getItem("schoolTeacherLogin");
    return stored ? JSON.parse(stored) : null;
  });
  const [showTeacherLogin, setShowTeacherLogin] = useState(false);
  const [loginForm, setLoginForm] = useState({ cpf: "", birthdate: "" });
  const [loggingIn, setLoggingIn] = useState(false);

  // Student form
  const [studentForm, setStudentForm] = useState({
    name: "",
    cpf: "",
    birthdate: "",
    gradeLevel: ""
  });
  const [savingStudent, setSavingStudent] = useState(false);

  // Teacher form
  const [teacherForm, setTeacherForm] = useState({
    name: "",
    cpf: "",
    birthdate: "",
    subject: ""
  });
  const [savingTeacher, setSavingTeacher] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState<SchoolStudent | null>(null);
  const [studentGrades, setStudentGrades] = useState<StudentGrades>({});
  const [studentAbsences, setStudentAbsences] = useState<StudentAbsences>({});
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Delete state
  const [deletingTeacherId, setDeletingTeacherId] = useState<string | null>(null);
  const [deletingStudentId, setDeletingStudentId] = useState<string | null>(null);

  // Load school
  useEffect(() => {
    if (!slug) return;

    const findSchool = async () => {
      setLoading(true);
      try {
        const schoolsRef = ref(profileNotasDatabase, "secretaria/schools");
        const snapshot = await get(schoolsRef);
        
        if (snapshot.exists()) {
          const data = snapshot.val();
          for (const [id, schoolData] of Object.entries(data)) {
            const school = schoolData as SchoolType;
            if (school.slug === slug) {
              setSchool({ ...school, id });
              setSchoolId(id);
              break;
            }
          }
        }
      } catch (error) {
        console.error("Error finding school:", error);
        toast({ title: "Erro", description: "Erro ao carregar escola", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    findSchool();
  }, [slug, toast]);

  // Load students
  useEffect(() => {
    if (!schoolId) return;

    const studentsRef = ref(profileNotasDatabase, `secretaria/schools/${schoolId}/students`);
    const unsubStudents = onValue(studentsRef, async (snapshot) => {
      const data = snapshot.val();
      if (data) {
        for (const [id] of Object.entries(data)) {
          const indexRef = ref(profileNotasDatabase, `secretaria/studentSchoolIndex/${id}`);
          const indexSnap = await get(indexRef);
          if (!indexSnap.exists()) {
            await set(indexRef, { schoolId, secretariaStudentId: id });
          }
        }

        const studentList = Object.entries(data).map(([id, student]) => {
          const studentData = student as Omit<SchoolStudent, "id">;
          return {
            id,
            ...studentData,
            averageGrade: studentData.averageGrade || 0,
            totalAbsences: studentData.totalAbsences || 0
          };
        });
        setStudents(studentList);
      } else {
        setStudents([]);
      }
    });

    return () => unsubStudents();
  }, [schoolId]);

  // Load teachers and sync with global teachers list
  useEffect(() => {
    if (!schoolId) return;

    const teachersRef = ref(profileNotasDatabase, `secretaria/schools/${schoolId}/teachers`);
    const unsubTeachers = onValue(teachersRef, async (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const teacherList = Object.entries(data).map(([id, teacher]) => {
          const teacherData = teacher as Omit<Teacher, "id">;
          return {
            id,
            ...teacherData
          };
        });
        setTeachers(teacherList);

        // Sync global teachers list - remove orphaned teachers for this school
        const globalTeachersRef = ref(profileNotasDatabase, "teachers");
        const globalSnapshot = await get(globalTeachersRef);
        if (globalSnapshot.exists()) {
          const globalData = globalSnapshot.val();
          const schoolTeacherIds = new Set(teacherList.map(t => t.id));
          const schoolTeacherCpfHashes = new Set(teacherList.map(t => t.cpfHash));
          
          // Remove global teachers that belong to this school but no longer exist
          for (const [globalId, globalTeacher] of Object.entries(globalData)) {
            const teacher = globalTeacher as any;
            const belongsToThisSchool = teacher.schoolId === schoolId;
            const isOrphanedById = belongsToThisSchool && !schoolTeacherIds.has(globalId);
            const isOrphanedByCpf = teacher.cpfHash && !schoolTeacherCpfHashes.has(teacher.cpfHash) && belongsToThisSchool;
            
            if (isOrphanedById || isOrphanedByCpf) {
              // Orphaned teacher - remove from global list
              const orphanRef = ref(profileNotasDatabase, `teachers/${globalId}`);
              await remove(orphanRef);
            }
          }
        }
      } else {
        setTeachers([]);
        
        // Remove all global teachers for this school since none exist locally
        const globalTeachersRef = ref(profileNotasDatabase, "teachers");
        const globalSnapshot = await get(globalTeachersRef);
        if (globalSnapshot.exists()) {
          const globalData = globalSnapshot.val();
          for (const [globalId, globalTeacher] of Object.entries(globalData)) {
            const teacher = globalTeacher as any;
            if (teacher.schoolId === schoolId) {
              const orphanRef = ref(profileNotasDatabase, `teachers/${globalId}`);
              await remove(orphanRef);
            }
          }
        }
      }
    });

    return () => unsubTeachers();
  }, [schoolId]);

  const handleTeacherLogin = async () => {
    if (!loginForm.cpf || !loginForm.birthdate) {
      toast({ title: "Erro", description: "Preencha CPF e data de nascimento", variant: "destructive" });
      return;
    }

    setLoggingIn(true);
    try {
      const cleanCpf = loginForm.cpf.replace(/\D/g, "");
      const cpfHash = await hashString(cleanCpf);
      const birthdateHash = await hashString(loginForm.birthdate);

      const foundTeacher = teachers.find(t => t.cpfHash === cpfHash && t.birthdateHash === birthdateHash);

      if (foundTeacher) {
        setLoggedInTeacher(foundTeacher);
        localStorage.setItem("schoolTeacherLogin", JSON.stringify(foundTeacher));
        setShowTeacherLogin(false);
        setLoginForm({ cpf: "", birthdate: "" });
        setActiveTab("teacher-panel");
        toast({ title: "Bem-vindo!", description: `Olá, ${foundTeacher.name}!` });
      } else {
        toast({ title: "Erro", description: "CPF ou data de nascimento inválidos", variant: "destructive" });
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({ title: "Erro", description: "Erro ao fazer login", variant: "destructive" });
    } finally {
      setLoggingIn(false);
    }
  };

  const handleTeacherLogout = () => {
    setLoggedInTeacher(null);
    localStorage.removeItem("schoolTeacherLogin");
    setActiveTab("students");
    toast({ title: "Desconectado", description: "Você foi desconectado" });
  };

  const handleAddTeacher = async () => {
    if (!schoolId || !teacherForm.name || !teacherForm.cpf || !teacherForm.birthdate) {
      toast({ title: "Erro", description: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }

    setSavingTeacher(true);
    try {
      const cleanCpf = teacherForm.cpf.replace(/\D/g, "");
      const cpfHash = await hashString(cleanCpf);
      const birthdateHash = await hashString(teacherForm.birthdate);
      const cpfMasked = `***.${cleanCpf.slice(3, 6)}.***-${cleanCpf.slice(9)}`;

      const existingAuthRef = ref(profileNotasDatabase, `authIndex/teachers/${cpfHash}`);
      const existingAuth = await get(existingAuthRef);
      
      if (existingAuth.exists()) {
        toast({ title: "Erro", description: "Já existe um professor cadastrado com este CPF", variant: "destructive" });
        setSavingTeacher(false);
        return;
      }

      const teacherData = {
        name: teacherForm.name,
        cpfHash,
        cpfMasked,
        birthdateHash,
        schoolId,
        subject: teacherForm.subject || "",
        createdAt: Date.now(),
        active: true
      };

      const teacherRef = ref(profileNotasDatabase, `secretaria/schools/${schoolId}/teachers`);
      const newTeacherRef = await push(teacherRef, teacherData);

      const authIndexRef = ref(profileNotasDatabase, `authIndex/teachers/${cpfHash}`);
      await set(authIndexRef, {
        cpfHash,
        birthdateHash,
        uid: newTeacherRef.key,
        schoolId,
        type: "teacher",
        active: true
      });

      // Also add to global teachers list so they appear in chat
      const globalTeacherRef = ref(profileNotasDatabase, `teachers/${newTeacherRef.key}`);
      await set(globalTeacherRef, {
        name: teacherForm.name,
        role: "professor",
        subject: teacherForm.subject || "",
        schoolId,
        cpfHash,
        createdAt: Date.now(),
        active: true,
        uid: null // Will be set when teacher registers/logs in
      });

      toast({
        title: "Professor cadastrado",
        description: `${teacherForm.name} foi adicionado com sucesso`
      });

      setTeacherForm({ name: "", cpf: "", birthdate: "", subject: "" });
    } catch (error) {
      console.error("Error adding teacher:", error);
      toast({ title: "Erro", description: "Erro ao cadastrar professor", variant: "destructive" });
    } finally {
      setSavingTeacher(false);
    }
  };

  const loadStudentDetails = async (student: SchoolStudent) => {
    setSelectedStudent(student);
    setLoadingDetails(true);

    try {
      const currentYear = new Date().getFullYear();
      
      const grades: StudentGrades = {};
      SUBJECTS.forEach(subject => {
        grades[subject] = { 1: null, 2: null, 3: null, 4: null };
      });

      const userProfilesRef = ref(profileNotasDatabase, "userProfiles");
      const userProfilesSnapshot = await get(userProfilesRef);
      
      let firebaseUid: string | null = null;
      
      if (userProfilesSnapshot.exists()) {
        const profiles = userProfilesSnapshot.val();
        for (const [uid, profile] of Object.entries(profiles)) {
          const profileData = profile as { secretariaStudentId?: string };
          if (profileData.secretariaStudentId === student.id) {
            firebaseUid = uid;
            break;
          }
        }
      }

      if (firebaseUid) {
        const gradesRef = ref(profileNotasDatabase, `grades/${firebaseUid}`);
        const gradesSnapshot = await get(gradesRef);
        
        if (gradesSnapshot.exists()) {
          const gradesData = gradesSnapshot.val();
          for (const gradeEntry of Object.values(gradesData)) {
            const gradeRecord = gradeEntry as { subject: string; bimestre: number; grade: number };
            if (grades[gradeRecord.subject] && gradeRecord.bimestre >= 1 && gradeRecord.bimestre <= 4) {
              grades[gradeRecord.subject][gradeRecord.bimestre] = gradeRecord.grade;
            }
          }
        }
      }
      
      setStudentGrades(grades);

      const absencesRef = ref(profileNotasDatabase, `secretaria/schools/${schoolId}/students/${student.id}/absences/${currentYear}`);
      const absencesSnapshot = await get(absencesRef);
      
      const absences: StudentAbsences = { 1: 0, 2: 0, 3: 0, 4: 0 };
      if (absencesSnapshot.exists()) {
        const data = absencesSnapshot.val();
        for (const [bimester, absData] of Object.entries(data)) {
          const absCount = Object.keys(absData as Record<string, unknown>).length;
          absences[parseInt(bimester)] = absCount;
        }
      }
      setStudentAbsences(absences);
    } catch (error) {
      console.error("Error loading student details:", error);
      toast({ title: "Erro", description: "Erro ao carregar detalhes do aluno", variant: "destructive" });
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleAddStudent = async () => {
    if (!schoolId || !studentForm.name || !studentForm.cpf || !studentForm.birthdate || !studentForm.gradeLevel) {
      toast({ title: "Erro", description: "Preencha todos os campos", variant: "destructive" });
      return;
    }

    setSavingStudent(true);
    try {
      const cleanCpf = studentForm.cpf.replace(/\D/g, "");
      const cpfHash = await hashString(cleanCpf);
      const birthdateHash = await hashString(studentForm.birthdate);
      const cpfMasked = `***.${cleanCpf.slice(3, 6)}.***-${cleanCpf.slice(9)}`;

      const existingAuthRef = ref(profileNotasDatabase, `authIndex/students/${cpfHash}`);
      const existingAuth = await get(existingAuthRef);
      
      if (existingAuth.exists()) {
        toast({ title: "Erro", description: "Já existe um aluno cadastrado com este CPF", variant: "destructive" });
        setSavingStudent(false);
        return;
      }

      const studentData = {
        name: studentForm.name,
        cpfHash,
        cpfMasked,
        birthdateHash,
        schoolId,
        gradeLevel: studentForm.gradeLevel,
        createdBy: "school-admin",
        createdAt: Date.now(),
        active: true,
        averageGrade: 0,
        totalAbsences: 0
      };

      const studentRef = ref(profileNotasDatabase, `secretaria/schools/${schoolId}/students`);
      const newStudentRef = await push(studentRef, studentData);

      const authIndexRef = ref(profileNotasDatabase, `authIndex/students/${cpfHash}`);
      await set(authIndexRef, {
        cpfHash,
        birthdateHash,
        uid: newStudentRef.key,
        schoolId,
        type: "student",
        active: true
      });

      const studentSchoolIndexRef = ref(profileNotasDatabase, `secretaria/studentSchoolIndex/${newStudentRef.key}`);
      await set(studentSchoolIndexRef, { schoolId, secretariaStudentId: newStudentRef.key });

      toast({
        title: "Aluno cadastrado",
        description: `${studentForm.name} foi adicionado com sucesso`
      });

      setStudentForm({ name: "", cpf: "", birthdate: "", gradeLevel: "" });
    } catch (error) {
      console.error("Error adding student:", error);
      toast({ title: "Erro", description: "Erro ao cadastrar aluno", variant: "destructive" });
    } finally {
      setSavingStudent(false);
    }
  };

  const handleDeleteTeacher = async (teacher: Teacher) => {
    if (!schoolId) return;
    
    setDeletingTeacherId(teacher.id);
    try {
      // Remove from school teachers
      const teacherRef = ref(profileNotasDatabase, `secretaria/schools/${schoolId}/teachers/${teacher.id}`);
      await remove(teacherRef);

      // Remove from auth index
      const authIndexRef = ref(profileNotasDatabase, `authIndex/teachers/${teacher.cpfHash}`);
      await remove(authIndexRef);

      // Remove from global teachers list (chat)
      const globalTeacherRef = ref(profileNotasDatabase, `teachers/${teacher.id}`);
      await remove(globalTeacherRef);

      // If this was the logged in teacher, log them out
      if (loggedInTeacher?.id === teacher.id) {
        handleTeacherLogout();
      }

      toast({
        title: "Professor removido",
        description: `${teacher.name} foi removido com sucesso`
      });
    } catch (error) {
      console.error("Error deleting teacher:", error);
      toast({ title: "Erro", description: "Erro ao remover professor", variant: "destructive" });
    } finally {
      setDeletingTeacherId(null);
    }
  };

  const handleDeleteStudent = async (student: SchoolStudent) => {
    if (!schoolId) return;
    
    setDeletingStudentId(student.id);
    try {
      // Get the student's cpfHash first
      const studentRef = ref(profileNotasDatabase, `secretaria/schools/${schoolId}/students/${student.id}`);
      const studentSnapshot = await get(studentRef);
      const studentData = studentSnapshot.val();

      // Remove from school students
      await remove(studentRef);

      // Remove from auth index if cpfHash exists
      if (studentData?.cpfHash) {
        const authIndexRef = ref(profileNotasDatabase, `authIndex/students/${studentData.cpfHash}`);
        await remove(authIndexRef);
      }

      // Remove from student school index
      const studentSchoolIndexRef = ref(profileNotasDatabase, `secretaria/studentSchoolIndex/${student.id}`);
      await remove(studentSchoolIndexRef);

      // Close details dialog if this student was selected
      if (selectedStudent?.id === student.id) {
        setSelectedStudent(null);
      }

      toast({
        title: "Aluno removido",
        description: `${student.name} foi removido com sucesso`
      });
    } catch (error) {
      console.error("Error deleting student:", error);
      toast({ title: "Erro", description: "Erro ao remover aluno", variant: "destructive" });
    } finally {
      setDeletingStudentId(null);
    }
  };

  const calculateStudentAverage = (grades: StudentGrades): number => {
    let total = 0;
    let count = 0;
    
    for (const subject of Object.values(grades)) {
      for (const grade of Object.values(subject)) {
        if (grade !== null) {
          total += grade;
          count++;
        }
      }
    }
    
    return count > 0 ? total / count : 0;
  };

  const getTotalAbsences = (absences: StudentAbsences): number => {
    return Object.values(absences).reduce((sum, count) => sum + count, 0);
  };

  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.gradeLevel.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando escola...</p>
        </div>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto px-4">
          <School className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Escola não encontrada</h1>
          <p className="text-muted-foreground mb-4">
            A escola "{slug}" não foi encontrada no sistema.
          </p>
          <Button onClick={() => navigate("/")}>
            Voltar ao início
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-white/80 hover:text-white mb-2 -ml-2"
            onClick={() => navigate("/")}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Voltar
          </Button>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <School className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">{school.name}</h1>
                <p className="text-green-100">{school.city} - {school.state}</p>
              </div>
            </div>
            {loggedInTeacher && (
              <Button 
                variant="ghost" 
                size="sm"
                className="text-white/80 hover:text-white"
                onClick={handleTeacherLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="students" className="flex items-center gap-2" data-testid="tab-students">
              <Users className="w-4 h-4" />
              Alunos ({students.length})
            </TabsTrigger>
            <TabsTrigger value="teachers" className="flex items-center gap-2" data-testid="tab-teachers">
              <GraduationCap className="w-4 h-4" />
              Professores ({teachers.length})
            </TabsTrigger>
            {loggedInTeacher && (
              <TabsTrigger value="teacher-panel" className="flex items-center gap-2" data-testid="tab-teacher-panel">
                <BookOpen className="w-4 h-4" />
                Painel do Professor
              </TabsTrigger>
            )}
          </TabsList>

          {/* Students Tab */}
          <TabsContent value="students">
            <Tabs defaultValue="list">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="list">Lista de Alunos</TabsTrigger>
                <TabsTrigger value="add">Adicionar Aluno</TabsTrigger>
              </TabsList>

              <TabsContent value="list">
                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <CardTitle>Lista de Alunos</CardTitle>
                        <CardDescription>
                          Clique em um aluno para ver notas e faltas
                        </CardDescription>
                      </div>
                      <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar aluno..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9"
                          data-testid="input-search-students"
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[500px]">
                      {filteredStudents.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                          {students.length === 0 
                            ? "Nenhum aluno cadastrado"
                            : "Nenhum aluno encontrado"
                          }
                        </p>
                      ) : (
                        <div className="space-y-2">
                          <div className="grid grid-cols-5 gap-4 p-3 bg-muted rounded-lg font-medium text-sm">
                            <span>Nome</span>
                            <span>Turma</span>
                            <span>Faltas</span>
                            <span>Média</span>
                            <span>Ações</span>
                          </div>
                          {filteredStudents.map((student) => (
                            <div 
                              key={student.id} 
                              className="grid grid-cols-5 gap-4 p-3 border rounded-lg hover-elevate cursor-pointer items-center"
                              onClick={() => loadStudentDetails(student)}
                              data-testid={`student-row-${student.id}`}
                            >
                              <div className="flex items-center gap-2">
                                <Avatar className="w-8 h-8">
                                  <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium truncate">{student.name}</span>
                              </div>
                              <Badge variant="outline">{student.gradeLevel}</Badge>
                              <span className="text-muted-foreground">{student.totalAbsences}</span>
                              <span className={student.averageGrade >= 6 ? "text-green-600" : "text-red-600"}>
                                {student.averageGrade > 0 ? student.averageGrade.toFixed(1) : "-"}
                              </span>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="text-destructive hover:text-destructive"
                                    onClick={(e) => e.stopPropagation()}
                                    disabled={deletingStudentId === student.id}
                                    data-testid={`button-delete-student-${student.id}`}
                                  >
                                    {deletingStudentId === student.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-4 h-4" />
                                    )}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remover Aluno</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja remover <strong>{student.name}</strong>? 
                                      Esta ação não pode ser desfeita e todos os dados serão perdidos.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteStudent(student);
                                      }}
                                      data-testid={`button-confirm-delete-student-${student.id}`}
                                    >
                                      Remover
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="add">
                <Card className="max-w-lg mx-auto">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserPlus className="w-5 h-5" />
                      Cadastrar Aluno
                    </CardTitle>
                    <CardDescription>
                      O aluno acessa com CPF e data de nascimento
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="student-name">Nome Completo</Label>
                      <Input
                        id="student-name"
                        placeholder="Nome do aluno"
                        value={studentForm.name}
                        onChange={(e) => setStudentForm(prev => ({ ...prev, name: e.target.value }))}
                        data-testid="input-student-name"
                      />
                    </div>

                    <div>
                      <Label htmlFor="student-cpf">CPF</Label>
                      <Input
                        id="student-cpf"
                        placeholder="000.000.000-00"
                        value={studentForm.cpf}
                        onChange={(e) => setStudentForm(prev => ({ ...prev, cpf: formatCPF(e.target.value) }))}
                        data-testid="input-student-cpf"
                      />
                    </div>

                    <div>
                      <Label htmlFor="student-birthdate">Data de Nascimento</Label>
                      <Input
                        id="student-birthdate"
                        type="date"
                        value={studentForm.birthdate}
                        onChange={(e) => setStudentForm(prev => ({ ...prev, birthdate: e.target.value }))}
                        data-testid="input-student-birthdate"
                      />
                    </div>

                    <div>
                      <Label htmlFor="student-grade">Turma</Label>
                      <Select 
                        value={studentForm.gradeLevel} 
                        onValueChange={(value) => setStudentForm(prev => ({ ...prev, gradeLevel: value }))}
                      >
                        <SelectTrigger data-testid="select-student-grade">
                          <SelectValue placeholder="Selecione a turma" />
                        </SelectTrigger>
                        <SelectContent>
                          {GRADE_LEVELS.map(level => (
                            <SelectItem key={level} value={level}>{level}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button 
                      onClick={handleAddStudent} 
                      disabled={savingStudent}
                      className="w-full"
                      data-testid="button-add-student"
                    >
                      {savingStudent ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Cadastrando...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Cadastrar Aluno
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Teachers Tab */}
          <TabsContent value="teachers">
            <Tabs defaultValue="list">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="list">Lista de Professores</TabsTrigger>
                <TabsTrigger value="add">Adicionar Professor</TabsTrigger>
              </TabsList>

              <TabsContent value="list">
                <Card>
                  <CardHeader>
                    <CardTitle>Lista de Professores</CardTitle>
                    <CardDescription>
                      Professores cadastrados nesta escola
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {teachers.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhum professor cadastrado
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {teachers.map((teacher) => (
                          <div 
                            key={teacher.id} 
                            className="flex items-center justify-between p-4 border rounded-lg"
                            data-testid={`teacher-row-${teacher.id}`}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback>{teacher.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{teacher.name}</p>
                                {teacher.subject && (
                                  <p className="text-sm text-muted-foreground">{teacher.subject}</p>
                                )}
                                <p className="text-xs text-muted-foreground">{teacher.cpfMasked}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={teacher.active ? "default" : "secondary"}>
                                {teacher.active ? "Ativo" : "Inativo"}
                              </Badge>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="text-destructive hover:text-destructive"
                                    disabled={deletingTeacherId === teacher.id}
                                    data-testid={`button-delete-teacher-${teacher.id}`}
                                  >
                                    {deletingTeacherId === teacher.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-4 h-4" />
                                    )}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remover Professor</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja remover <strong>{teacher.name}</strong>? 
                                      Esta ação não pode ser desfeita e todos os dados serão perdidos.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      onClick={() => handleDeleteTeacher(teacher)}
                                      data-testid={`button-confirm-delete-teacher-${teacher.id}`}
                                    >
                                      Remover
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="add">
                <Card className="max-w-lg mx-auto">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserPlus className="w-5 h-5" />
                      Cadastrar Professor
                    </CardTitle>
                    <CardDescription>
                      O professor acessa com CPF e data de nascimento
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="teacher-name">Nome Completo</Label>
                      <Input
                        id="teacher-name"
                        placeholder="Nome do professor"
                        value={teacherForm.name}
                        onChange={(e) => setTeacherForm(prev => ({ ...prev, name: e.target.value }))}
                        data-testid="input-teacher-name"
                      />
                    </div>

                    <div>
                      <Label htmlFor="teacher-cpf">CPF</Label>
                      <Input
                        id="teacher-cpf"
                        placeholder="000.000.000-00"
                        value={teacherForm.cpf}
                        onChange={(e) => setTeacherForm(prev => ({ ...prev, cpf: formatCPF(e.target.value) }))}
                        data-testid="input-teacher-cpf"
                      />
                    </div>

                    <div>
                      <Label htmlFor="teacher-birthdate">Data de Nascimento</Label>
                      <Input
                        id="teacher-birthdate"
                        type="date"
                        value={teacherForm.birthdate}
                        onChange={(e) => setTeacherForm(prev => ({ ...prev, birthdate: e.target.value }))}
                        data-testid="input-teacher-birthdate"
                      />
                    </div>

                    <div>
                      <Label htmlFor="teacher-subject">Disciplina (Opcional)</Label>
                      <Select 
                        value={teacherForm.subject} 
                        onValueChange={(value) => setTeacherForm(prev => ({ ...prev, subject: value }))}
                      >
                        <SelectTrigger data-testid="select-teacher-subject">
                          <SelectValue placeholder="Selecione a disciplina" />
                        </SelectTrigger>
                        <SelectContent>
                          {SUBJECTS.map(subject => (
                            <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button 
                      onClick={handleAddTeacher} 
                      disabled={savingTeacher}
                      className="w-full"
                      data-testid="button-add-teacher"
                    >
                      {savingTeacher ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Cadastrando...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Cadastrar Professor
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Teacher Panel Tab */}
          {loggedInTeacher && (
            <TabsContent value="teacher-panel">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback>{loggedInTeacher.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle>Bem-vindo, {loggedInTeacher.name}!</CardTitle>
                        <CardDescription>
                          {loggedInTeacher.subject ? `Professor de ${loggedInTeacher.subject}` : "Professor"}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Resumo da Escola
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                          <p className="text-sm text-muted-foreground">Total de Alunos</p>
                          <p className="text-3xl font-bold text-blue-600">{students.length}</p>
                        </div>
                        <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                          <p className="text-sm text-muted-foreground">Professores</p>
                          <p className="text-3xl font-bold text-green-600">{teachers.length}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Informações Pessoais</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Nome:</span>
                        <span className="font-medium">{loggedInTeacher.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">CPF:</span>
                        <span className="font-medium">{loggedInTeacher.cpfMasked}</span>
                      </div>
                      {loggedInTeacher.subject && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Disciplina:</span>
                          <span className="font-medium">{loggedInTeacher.subject}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {/* Teacher Login Dialog */}
        {!loggedInTeacher && (
          <div className="mt-8 flex justify-center">
            <Button 
              onClick={() => setShowTeacherLogin(true)}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-teacher-login"
            >
              <GraduationCap className="w-4 h-4 mr-2" />
              Login do Professor
            </Button>
          </div>
        )}
      </main>

      {/* Teacher Login Dialog */}
      <Dialog open={showTeacherLogin} onOpenChange={setShowTeacherLogin}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              Login - Professor
            </DialogTitle>
            <DialogDescription>
              Digite seu CPF e data de nascimento para acessar o painel
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="login-cpf">CPF</Label>
              <Input
                id="login-cpf"
                placeholder="000.000.000-00"
                value={loginForm.cpf}
                onChange={(e) => setLoginForm(prev => ({ ...prev, cpf: formatCPF(e.target.value) }))}
                data-testid="input-login-cpf"
              />
            </div>

            <div>
              <Label htmlFor="login-birthdate">Data de Nascimento</Label>
              <Input
                id="login-birthdate"
                type="date"
                value={loginForm.birthdate}
                onChange={(e) => setLoginForm(prev => ({ ...prev, birthdate: e.target.value }))}
                data-testid="input-login-birthdate"
              />
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline"
                onClick={() => setShowTeacherLogin(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleTeacherLogin}
                disabled={loggingIn}
                className="flex-1"
                data-testid="button-login-submit"
              >
                {loggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Student Details Dialog */}
      <Dialog open={!!selectedStudent} onOpenChange={(open) => !open && setSelectedStudent(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>{selectedStudent?.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <span>{selectedStudent?.name}</span>
                <Badge variant="outline" className="ml-2">{selectedStudent?.gradeLevel}</Badge>
              </div>
            </DialogTitle>
            <DialogDescription>
              Notas e faltas do ano letivo de {new Date().getFullYear()}
            </DialogDescription>
          </DialogHeader>

          {loadingDetails ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Card data-testid="card-student-average">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <GraduationCap className="w-4 h-4" />
                      Média Geral
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold" data-testid="text-student-average">
                      {calculateStudentAverage(studentGrades).toFixed(1)}
                    </div>
                    <Progress 
                      value={calculateStudentAverage(studentGrades) * 10} 
                      className="mt-2"
                    />
                  </CardContent>
                </Card>

                <Card data-testid="card-student-absences">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Total de Faltas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold" data-testid="text-student-total-absences">
                      {getTotalAbsences(studentAbsences)}
                    </div>
                    <div className="flex gap-2 mt-2">
                      {[1, 2, 3, 4].map(bim => (
                        <Badge key={bim} variant="secondary" className="text-xs" data-testid={`badge-absences-bim-${bim}`}>
                          {bim}º: {studentAbsences[bim] || 0}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card data-testid="card-grades-by-subject">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Notas por Matéria
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" data-testid="table-student-grades">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-2">Matéria</th>
                          <th className="text-center py-2 px-2">1º Bim</th>
                          <th className="text-center py-2 px-2">2º Bim</th>
                          <th className="text-center py-2 px-2">3º Bim</th>
                          <th className="text-center py-2 px-2">4º Bim</th>
                          <th className="text-center py-2 px-2">Média</th>
                        </tr>
                      </thead>
                      <tbody>
                        {SUBJECTS.map(subject => {
                          const subjectGrades = studentGrades[subject] || { 1: null, 2: null, 3: null, 4: null };
                          const validGrades = Object.values(subjectGrades).filter((g): g is number => g !== null);
                          const avg = validGrades.length > 0 
                            ? validGrades.reduce((a, b) => a + b, 0) / validGrades.length 
                            : null;
                          
                          return (
                            <tr key={subject} className="border-b last:border-0" data-testid={`row-subject-${subject.toLowerCase().replace(/\s/g, "-")}`}>
                              <td className="py-2 px-2 font-medium">{subject}</td>
                              {[1, 2, 3, 4].map(bim => (
                                <td key={bim} className="text-center py-2 px-2">
                                  {subjectGrades[bim] !== null ? (
                                    <span className={subjectGrades[bim]! >= 6 ? "text-green-600" : "text-red-600"}>
                                      {subjectGrades[bim]!.toFixed(1)}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </td>
                              ))}
                              <td className="text-center py-2 px-2 font-medium">
                                {avg !== null ? (
                                  <span className={avg >= 6 ? "text-green-600" : "text-red-600"}>
                                    {avg.toFixed(1)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

