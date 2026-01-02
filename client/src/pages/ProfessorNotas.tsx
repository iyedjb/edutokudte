import { useState, useEffect } from "react";
import { useAuth } from "@/lib/useAuth";
import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  GraduationCap, 
  Save, 
  Users, 
  TrendingUp,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BookOpen
} from "lucide-react";
import { ref, onValue, push, get, set, remove } from "firebase/database";
import { database, profileNotasDatabase } from "@/lib/firebase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { notifyStudentOfNewGrade } from "@/lib/notificationTriggers";

const COMMON_SUBJECTS = [
  "Matemática",
  "Português",
  "História",
  "Geografia",
  "Ciências",
  "Inglês",
  "Arte",
  "Educação Física",
  "Filosofia",
  "Sociologia",
  "Física",
  "Química",
  "Biologia",
];

export default function ProfessorNotas() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedTurma, setSelectedTurma] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedBimestre, setSelectedBimestre] = useState<number>(1);
  const [students, setStudents] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [grades, setGrades] = useState<Record<string, string>>({});
  const [gradeIds, setGradeIds] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Read users from profileNotasDatabase (permanent storage) to ensure stable UIDs
    const usersRef = ref(profileNotasDatabase, "userProfiles");
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val() || {};
      const studentArray = Object.keys(data)
        .map(uid => ({ uid, ...data[uid] }))
        .filter(u => u.grade);

      setAllStudents(studentArray);

      const uniqueTurmas = [...Array.from(new Set(studentArray.map(s => s.grade)))].sort();
      setTurmas(uniqueTurmas);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedTurma) {
      const turmaStudents = allStudents.filter(s => s.grade === selectedTurma);
      setStudents(turmaStudents);
      
      loadGrades(turmaStudents);
    } else {
      setStudents([]);
      setGrades({});
    }
  }, [selectedTurma, selectedSubject, selectedBimestre, allStudents]);

  const loadGrades = async (turmaStudents: any[]) => {
    if (!selectedSubject || !selectedBimestre) {
      setGrades({});
      setGradeIds({});
      return;
    }

    const loadedGrades: Record<string, string> = {};
    const loadedGradeIds: Record<string, string> = {};

    for (const student of turmaStudents) {
      const gradesRef = ref(profileNotasDatabase, `grades/${student.uid}`);
      const snapshot = await get(gradesRef);
      
      if (snapshot.exists()) {
        const studentGrades = snapshot.val();
        const matchingGrades: Array<{ id: string; data: any }> = [];
        
        for (const [gradeId, gradeData] of Object.entries(studentGrades)) {
          const grade = gradeData as any;
          if (grade.subject === selectedSubject && grade.bimestre === selectedBimestre) {
            matchingGrades.push({ id: gradeId, data: grade });
          }
        }

        if (matchingGrades.length > 0) {
          matchingGrades.sort((a, b) => (b.data.date || 0) - (a.data.date || 0));
          
          const newestGrade = matchingGrades[0];
          loadedGrades[student.uid] = newestGrade.data.grade.toString();
          loadedGradeIds[student.uid] = newestGrade.id;
          
          if (matchingGrades.length > 1) {
            for (let i = 1; i < matchingGrades.length; i++) {
              const duplicateRef = ref(profileNotasDatabase, `grades/${student.uid}/${matchingGrades[i].id}`);
              await remove(duplicateRef);
            }
          }
        }
      }
    }

    setGrades(loadedGrades);
    setGradeIds(loadedGradeIds);
  };

  const handleGradeChange = (studentUid: string, value: string) => {
    const numValue = parseFloat(value);
    if (value === "" || (numValue >= 0 && numValue <= 25)) {
      setGrades(prev => ({ ...prev, [studentUid]: value }));
    }
  };

  // Hash a string using SHA-256
  const hashString = async (str: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  };

  // Update student aggregate (averageGrade) after saving grades
  const updateStudentAggregate = async (studentUid: string) => {
    try {
      const gradesRef = ref(profileNotasDatabase, `grades/${studentUid}`);
      const snapshot = await get(gradesRef);
      
      let averageGrade = 0;
      
      if (snapshot.exists()) {
        const studentGrades = snapshot.val();
        let total = 0;
        let count = 0;
        
        for (const gradeData of Object.values(studentGrades)) {
          const grade = gradeData as { grade?: number };
          if (grade && typeof grade.grade === 'number') {
            total += grade.grade;
            count++;
          }
        }
        
        averageGrade = count > 0 ? Math.round((total / count) * 10) / 10 : 0;
      }
      
      // Update in userProfiles
      const profileRef = ref(profileNotasDatabase, `userProfiles/${studentUid}/averageGrade`);
      await set(profileRef, averageGrade);
      
      // Try multiple methods to find and update secretaria student record:
      
      // Method 1: Direct studentSchoolIndex lookup (for secretaria students)
      const studentSchoolIndexRef = ref(profileNotasDatabase, `secretaria/studentSchoolIndex/${studentUid}`);
      const indexSnapshot = await get(studentSchoolIndexRef);
      
      if (indexSnapshot.exists()) {
        const { schoolId, secretariaStudentId } = indexSnapshot.val();
        // Use secretariaStudentId (the push key in secretaria) if available, otherwise fall back to studentUid
        const targetId = secretariaStudentId || studentUid;
        if (schoolId) {
          const secretariaStudentRef = ref(
            profileNotasDatabase, 
            `secretaria/schools/${schoolId}/students/${targetId}/averageGrade`
          );
          await set(secretariaStudentRef, averageGrade);
          return; // Successfully updated
        }
      }
      
      // Method 2: Use secretariaStudentId from userProfile to find and update secretaria record
      const userProfileRef = ref(profileNotasDatabase, `userProfiles/${studentUid}`);
      const profileSnapshot = await get(userProfileRef);
      
      if (profileSnapshot.exists()) {
        const profile = profileSnapshot.val();
        // Use secretariaStudentId which was stored when student logged in via CPF
        if (profile.secretariaStudentId && profile.school) {
          const secretariaStudentRef = ref(
            profileNotasDatabase, 
            `secretaria/schools/${profile.school}/students/${profile.secretariaStudentId}/averageGrade`
          );
          await set(secretariaStudentRef, averageGrade);
          
          // Create studentSchoolIndex for future lookups
          const newIndexRef = ref(profileNotasDatabase, `secretaria/studentSchoolIndex/${studentUid}`);
          await set(newIndexRef, { schoolId: profile.school, secretariaStudentId: profile.secretariaStudentId });
        }
      }
    } catch (error) {
      console.error("Error updating student aggregate:", error);
    }
  };

  const handleSaveGrades = async () => {
    if (!selectedSubject || !selectedBimestre) {
      toast({
        title: "Erro",
        description: "Selecione uma matéria e bimestre",
        variant: "destructive",
      });
      return;
    }

    const gradesToSave = Object.entries(grades).filter(([_, value]) => value !== "");

    if (gradesToSave.length === 0) {
      toast({
        title: "Nenhuma nota para salvar",
        description: "Digite pelo menos uma nota antes de salvar",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      for (const [studentUid, gradeValue] of gradesToSave) {
        const student = students.find(s => s.uid === studentUid);
        if (!student) continue;

        const gradeData = {
          uid: studentUid,
          classId: selectedTurma,
          className: `Turma ${selectedTurma}`,
          subject: selectedSubject,
          bimestre: selectedBimestre,
          grade: parseFloat(gradeValue),
          teacher: user?.displayName || "Professor",
          date: Date.now(),
        };

        const existingGradeId = gradeIds[studentUid];
        
        if (existingGradeId) {
          const gradeRef = ref(profileNotasDatabase, `grades/${studentUid}/${existingGradeId}`);
          await set(gradeRef, gradeData);
        } else {
          const gradesRef = ref(profileNotasDatabase, `grades/${studentUid}`);
          await push(gradesRef, gradeData);
        }

        // Send notification to student about new grade
        await notifyStudentOfNewGrade(studentUid, selectedSubject, parseFloat(gradeValue));
        
        // Update student's average grade aggregate
        await updateStudentAggregate(studentUid);
      }

      toast({
        title: "Notas salvas com sucesso!",
        description: `${gradesToSave.length} nota(s) salva(s)`,
      });

      await loadGrades(students);
    } catch (error) {
      console.error("Error saving grades:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as notas",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2) || "??";
  };

  const getGradeStatus = (grade: number) => {
    if (grade >= 15) return { label: "Aprovado", icon: CheckCircle2, color: "text-green-600 dark:text-green-400" };
    if (grade >= 12.5) return { label: "Recuperação", icon: AlertCircle, color: "text-yellow-600 dark:text-yellow-400" };
    return { label: "Reprovado", icon: XCircle, color: "text-red-600 dark:text-red-400" };
  };

  const stats = {
    total: students.length,
    graded: Object.values(grades).filter(g => g !== "").length,
    approved: Object.values(grades).filter(g => g !== "" && parseFloat(g) >= 15).length,
    recovery: Object.values(grades).filter(g => g !== "" && parseFloat(g) >= 12.5 && parseFloat(g) < 15).length,
    failed: Object.values(grades).filter(g => g !== "" && parseFloat(g) < 12.5).length,
    average: Object.values(grades).filter(g => g !== "").length > 0 
      ? (Object.values(grades).filter(g => g !== "").reduce((sum, g) => sum + parseFloat(g), 0) / Object.values(grades).filter(g => g !== "").length).toFixed(1)
      : "0.0"
  };

  return (
    <div className="bg-background pb-20 min-h-screen">
      <header className="bg-gradient-to-r from-blue-600 via-blue-700 to-purple-700 px-4 py-8 sticky top-0 z-40 shadow-lg">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <GraduationCap className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Gerenciar Notas</h1>
                <p className="text-white/90 text-sm">Painel do Professor</p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-white/90 text-blue-700 text-sm px-4 py-2">
              {user?.displayName}
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {selectedTurma && selectedSubject && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <p className="text-xs text-blue-700/70 dark:text-blue-400/70">Alunos</p>
                </div>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{stats.total}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <p className="text-xs text-purple-700/70 dark:text-purple-400/70">Avaliados</p>
                </div>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">{stats.graded}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 border-green-200/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <p className="text-xs text-green-700/70 dark:text-green-400/70">Aprovados</p>
                </div>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.approved}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100/50 dark:from-yellow-950/30 dark:to-yellow-900/20 border-yellow-200/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                  <p className="text-xs text-yellow-700/70 dark:text-yellow-400/70">Recuperação</p>
                </div>
                <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{stats.recovery}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20 border-red-200/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <p className="text-xs text-red-700/70 dark:text-red-400/70">Reprovados</p>
                </div>
                <p className="text-2xl font-bold text-red-700 dark:text-red-400">{stats.failed}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-950/30 dark:to-indigo-900/20 border-indigo-200/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <p className="text-xs text-indigo-700/70 dark:text-indigo-400/70">Média</p>
                </div>
                <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">{stats.average}</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="border-border shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl">Selecione a Turma e Matéria</CardTitle>
                <CardDescription className="mt-1">Configure a avaliação para começar</CardDescription>
              </div>
              {selectedTurma && selectedSubject && (
                <Button 
                  onClick={handleSaveGrades} 
                  disabled={saving || Object.keys(grades).length === 0}
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-purple-600"
                  data-testid="button-save-grades"
                >
                  {saving ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Notas
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Turma</Label>
                <Select value={selectedTurma} onValueChange={setSelectedTurma}>
                  <SelectTrigger data-testid="select-turma">
                    <SelectValue placeholder="Selecione a turma" />
                  </SelectTrigger>
                  <SelectContent>
                    {turmas.map(turma => (
                      <SelectItem key={turma} value={turma}>
                        Turma {turma}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Matéria</Label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger data-testid="select-subject">
                    <SelectValue placeholder="Selecione a matéria" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_SUBJECTS.map(subject => (
                      <SelectItem key={subject} value={subject}>
                        {subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Bimestre</Label>
                <Select value={selectedBimestre.toString()} onValueChange={(v) => setSelectedBimestre(parseInt(v))}>
                  <SelectTrigger data-testid="select-bimestre">
                    <SelectValue placeholder="Selecione o bimestre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1º Bimestre</SelectItem>
                    <SelectItem value="2">2º Bimestre</SelectItem>
                    <SelectItem value="3">3º Bimestre</SelectItem>
                    <SelectItem value="4">4º Bimestre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedTurma && selectedSubject ? (
          <Card className="border-border shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Users className="w-5 h-5" />
                Alunos - Turma {selectedTurma}
              </CardTitle>
              <CardDescription className="mt-1">
                Digite as notas de 0 a 25 para cada aluno
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-20 rounded-lg" />
                  ))}
                </div>
              ) : students.length > 0 ? (
                <div className="space-y-3">
                  {students.map(student => {
                    const gradeValue = grades[student.uid] ? parseFloat(grades[student.uid]) : null;
                    const status = gradeValue !== null ? getGradeStatus(gradeValue) : null;
                    const StatusIcon = status?.icon;
                    
                    return (
                      <div 
                        key={student.uid} 
                        className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl border-2 border-border bg-card hover-elevate"
                        data-testid={`student-row-${student.uid}`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Avatar className="w-12 h-12 ring-2 ring-primary/10">
                            <AvatarImage src={student.photoURL} />
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-bold">
                              {getInitials(student.displayName)}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-foreground truncate">
                              {student.displayName}
                            </h3>
                            <p className="text-sm text-muted-foreground truncate">
                              {student.email}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`grade-${student.uid}`} className="text-sm font-semibold whitespace-nowrap">
                              Nota:
                            </Label>
                            <Input
                              id={`grade-${student.uid}`}
                              type="number"
                              min="0"
                              max="25"
                              step="0.5"
                              value={grades[student.uid] || ""}
                              onChange={(e) => handleGradeChange(student.uid, e.target.value)}
                              placeholder="0-25"
                              className="w-24 text-center text-lg font-semibold"
                              data-testid={`input-grade-${student.uid}`}
                            />
                          </div>
                          {status && StatusIcon && (
                            <div className="flex items-center gap-1.5 text-sm font-medium">
                              <StatusIcon className={`w-4 h-4 ${status.color}`} />
                              <span className={status.color}>{status.label}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Nenhum aluno encontrado
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Esta turma não possui alunos cadastrados
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border shadow-lg">
            <CardContent className="py-16">
              <div className="text-center">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Selecione uma turma e matéria
                </h3>
                <p className="text-sm text-muted-foreground">
                  Configure a turma, matéria e bimestre acima para começar
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
