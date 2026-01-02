import { useState, useEffect } from "react";
import { ref, push, onValue, set, get } from "firebase/database";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { profileNotasDatabase, storage } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  School, 
  GraduationCap, 
  Users, 
  Plus, 
  Search, 
  Building2,
  MapPin,
  Camera,
  Loader2,
  Eye,
  UserCheck
} from "lucide-react";
import type { School as SchoolType, SchoolTeacher, SchoolStudent, subjectOptions } from "@shared/schema";

const SUBJECTS = [
  "Matemática", "Português", "Ciências", "História", "Geografia",
  "Inglês", "Educação Física", "Artes", "Filosofia", "Sociologia",
  "Física", "Química", "Biologia", "Literatura", "Redação"
];

const TEACHER_ROLES = ["Professor", "Professora", "Diretor", "Diretora", "Coordenador", "Coordenadora"];

function formatCPF(value: string): string {
  const numbers = value.replace(/\D/g, "").slice(0, 11);
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
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

async function fetchAddressByCEP(cep: string) {
  const cleanCep = cep.replace(/\D/g, "");
  if (cleanCep.length !== 8) return null;
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const data = await response.json();
    if (data.erro) return null;
    return {
      address: data.logradouro || "",
      neighborhood: data.bairro || "",
      city: data.localidade || "",
      state: data.uf || ""
    };
  } catch {
    return null;
  }
}

export default function SecretariaEducacao() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("schools");
  const [schools, setSchools] = useState<SchoolType[]>([]);
  const [teachers, setTeachers] = useState<SchoolTeacher[]>([]);
  const [allStudents, setAllStudents] = useState<(SchoolStudent & { schoolName?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [schoolForm, setSchoolForm] = useState({
    name: "",
    cep: "",
    address: "",
    neighborhood: "",
    city: "",
    state: ""
  });
  const [loadingCep, setLoadingCep] = useState(false);
  const [savingSchool, setSavingSchool] = useState(false);

  const [teacherForm, setTeacherForm] = useState({
    name: "",
    cpf: "",
    birthdate: "",
    email: "",
    role: "Professor" as string,
    schoolIds: [] as string[],
    subjects: [] as string[]
  });
  const [teacherPhoto, setTeacherPhoto] = useState<File | null>(null);
  const [teacherPhotoPreview, setTeacherPhotoPreview] = useState<string | null>(null);
  const [savingTeacher, setSavingTeacher] = useState(false);

  useEffect(() => {
    const schoolsRef = ref(profileNotasDatabase, "secretaria/schools");
    const unsubSchools = onValue(schoolsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const schoolList = Object.entries(data).map(([id, school]) => ({
          id,
          ...(school as Omit<SchoolType, "id">)
        }));
        setSchools(schoolList);
      } else {
        setSchools([]);
      }
    });

    const teachersRef = ref(profileNotasDatabase, "secretaria/teachers");
    const unsubTeachers = onValue(teachersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const teacherList = Object.entries(data).map(([id, teacher]) => ({
          id,
          ...(teacher as Omit<SchoolTeacher, "id">)
        }));
        setTeachers(teacherList);
      } else {
        setTeachers([]);
      }
    });

    setLoading(false);

    return () => {
      unsubSchools();
      unsubTeachers();
    };
  }, []);

  useEffect(() => {
    if (schools.length === 0) {
      setAllStudents([]);
      return;
    }

    const loadAllStudents = async () => {
      const allStudentsList: (SchoolStudent & { schoolName?: string })[] = [];
      
      for (const school of schools) {
        const studentsRef = ref(profileNotasDatabase, `secretaria/schools/${school.id}/students`);
        const snapshot = await get(studentsRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          Object.entries(data).forEach(([id, student]) => {
            allStudentsList.push({
              id,
              ...(student as Omit<SchoolStudent, "id">),
              schoolName: school.name
            });
          });
        }
      }
      
      setAllStudents(allStudentsList);
    };

    loadAllStudents();
  }, [schools]);

  const handleCEPChange = async (cep: string) => {
    setSchoolForm(prev => ({ ...prev, cep }));
    
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length === 8) {
      setLoadingCep(true);
      const address = await fetchAddressByCEP(cleanCep);
      setLoadingCep(false);
      
      if (address) {
        setSchoolForm(prev => ({
          ...prev,
          address: address.address,
          neighborhood: address.neighborhood,
          city: address.city,
          state: address.state
        }));
        toast({
          title: "Endereço encontrado",
          description: `${address.address}, ${address.city} - ${address.state}`
        });
      }
    }
  };

  const handleCreateSchool = async () => {
    if (!schoolForm.name || !schoolForm.cep) {
      toast({ title: "Erro", description: "Preencha o nome e CEP da escola", variant: "destructive" });
      return;
    }

    setSavingSchool(true);
    try {
      const slug = generateSlug(schoolForm.name);
      const schoolData = {
        name: schoolForm.name,
        slug,
        cep: schoolForm.cep,
        address: schoolForm.address,
        neighborhood: schoolForm.neighborhood,
        city: schoolForm.city,
        state: schoolForm.state,
        createdBy: "secretaria-admin",
        createdAt: Date.now(),
        active: true
      };

      const schoolRef = ref(profileNotasDatabase, "secretaria/schools");
      const newSchoolRef = await push(schoolRef, schoolData);

      const indexRef = ref(profileNotasDatabase, `secretaria/schoolsIndex/${slug}`);
      await set(indexRef, { schoolId: newSchoolRef.key });

      toast({
        title: "Escola criada",
        description: `A escola "${schoolForm.name}" foi criada com sucesso. Acesse: /escolas/${slug}`
      });

      setSchoolForm({ name: "", cep: "", address: "", neighborhood: "", city: "", state: "" });
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao criar escola", variant: "destructive" });
    } finally {
      setSavingSchool(false);
    }
  };

  const handleTeacherPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTeacherPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setTeacherPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubjectToggle = (subject: string) => {
    setTeacherForm(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter(s => s !== subject)
        : [...prev.subjects, subject]
    }));
  };

  const handleSchoolToggle = (schoolId: string) => {
    setTeacherForm(prev => ({
      ...prev,
      schoolIds: prev.schoolIds.includes(schoolId)
        ? prev.schoolIds.filter(s => s !== schoolId)
        : [...prev.schoolIds, schoolId]
    }));
  };

  const handleCreateTeacher = async () => {
    if (!teacherForm.name || !teacherForm.cpf || !teacherForm.birthdate) {
      toast({ title: "Erro", description: "Preencha nome, CPF e data de nascimento", variant: "destructive" });
      return;
    }

    if (teacherForm.schoolIds.length === 0) {
      toast({ title: "Erro", description: "Selecione pelo menos uma escola", variant: "destructive" });
      return;
    }

    if (teacherForm.subjects.length === 0) {
      toast({ title: "Erro", description: "Selecione pelo menos uma matéria", variant: "destructive" });
      return;
    }

    if (!teacherPhoto) {
      toast({ title: "Erro", description: "Foto do professor é obrigatória para reconhecimento facial", variant: "destructive" });
      return;
    }

    setSavingTeacher(true);
    try {
      const cleanCpf = teacherForm.cpf.replace(/\D/g, "");
      const cpfHash = await hashString(cleanCpf);
      const birthdateHash = await hashString(teacherForm.birthdate);
      const cpfMasked = `***.${cleanCpf.slice(3, 6)}.***-${cleanCpf.slice(9)}`;

      let photoURL = "";
      if (teacherPhoto) {
        const photoStorageRef = storageRef(storage, `secretaria/teachers/${cpfHash}/face.jpg`);
        await uploadBytes(photoStorageRef, teacherPhoto);
        photoURL = await getDownloadURL(photoStorageRef);
      }

      const teacherData = {
        name: teacherForm.name,
        cpfHash,
        cpfMasked,
        birthdateHash,
        photoURL,
        schoolIds: teacherForm.schoolIds,
        subjects: teacherForm.subjects,
        email: teacherForm.email,
        role: teacherForm.role,
        verified: true,
        createdBy: "secretaria-admin",
        createdAt: Date.now(),
        active: true
      };

      const teacherRef = ref(profileNotasDatabase, "secretaria/teachers");
      const newTeacherRef = await push(teacherRef, teacherData);

      const authIndexRef = ref(profileNotasDatabase, `authIndex/teachers/${cpfHash}`);
      await set(authIndexRef, {
        cpfHash,
        birthdateHash,
        uid: newTeacherRef.key,
        type: "teacher",
        active: true
      });

      for (const schoolId of teacherForm.schoolIds) {
        const schoolTeacherRef = ref(profileNotasDatabase, `secretaria/schools/${schoolId}/teachers/${newTeacherRef.key}`);
        await set(schoolTeacherRef, {
          teacherId: newTeacherRef.key,
          name: teacherForm.name,
          subjects: teacherForm.subjects,
          role: teacherForm.role
        });
      }

      toast({
        title: "Professor cadastrado",
        description: `${teacherForm.name} foi adicionado com sucesso`
      });

      setTeacherForm({ name: "", cpf: "", birthdate: "", email: "", role: "Professor", schoolIds: [], subjects: [] });
      setTeacherPhoto(null);
      setTeacherPhotoPreview(null);
    } catch (error) {
      console.error("Error creating teacher:", error);
      toast({ title: "Erro", description: "Erro ao cadastrar professor", variant: "destructive" });
    } finally {
      setSavingTeacher(false);
    }
  };

  const filteredStudents = allStudents.filter(student => 
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.schoolName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="w-8 h-8" />
            <h1 className="text-2xl font-bold">Secretaria de Educação</h1>
          </div>
          <p className="text-blue-100">MG / Esmeraldas - Painel Administrativo</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="schools" className="flex items-center gap-2" data-testid="tab-schools">
              <School className="w-4 h-4" />
              Escolas
            </TabsTrigger>
            <TabsTrigger value="teachers" className="flex items-center gap-2" data-testid="tab-teachers">
              <GraduationCap className="w-4 h-4" />
              Professores
            </TabsTrigger>
            <TabsTrigger value="students" className="flex items-center gap-2" data-testid="tab-students">
              <Users className="w-4 h-4" />
              Alunos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schools">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Criar Nova Escola
                  </CardTitle>
                  <CardDescription>
                    Cadastre uma nova escola no sistema. Será gerada uma página em /escolas/nome-da-escola
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="school-name">Nome da Escola</Label>
                    <Input
                      id="school-name"
                      placeholder="Ex: E.E. Santa Quitéria"
                      value={schoolForm.name}
                      onChange={(e) => setSchoolForm(prev => ({ ...prev, name: e.target.value }))}
                      data-testid="input-school-name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="school-cep">CEP</Label>
                    <div className="relative">
                      <Input
                        id="school-cep"
                        placeholder="00000-000"
                        value={schoolForm.cep}
                        onChange={(e) => handleCEPChange(e.target.value)}
                        data-testid="input-school-cep"
                      />
                      {loadingCep && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {schoolForm.address && (
                    <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">Endereço encontrado:</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {schoolForm.address}, {schoolForm.neighborhood}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {schoolForm.city} - {schoolForm.state}
                      </p>
                    </div>
                  )}

                  <Button 
                    onClick={handleCreateSchool} 
                    disabled={savingSchool || !schoolForm.name || !schoolForm.cep}
                    className="w-full"
                    data-testid="button-create-school"
                  >
                    {savingSchool ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Criar Escola
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <School className="w-5 h-5" />
                    Escolas Cadastradas ({schools.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    {schools.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhuma escola cadastrada ainda
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {schools.map((school) => (
                          <div 
                            key={school.id} 
                            className="p-4 border rounded-lg hover-elevate"
                            data-testid={`school-card-${school.id}`}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold">{school.name}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {school.city} - {school.state}
                                </p>
                                <Badge variant="secondary" className="mt-2">
                                  /escolas/{school.slug}
                                </Badge>
                              </div>
                              <Button variant="ghost" size="icon" asChild>
                                <a href={`/escolas/${school.slug}`} target="_blank" rel="noopener noreferrer">
                                  <Eye className="w-4 h-4" />
                                </a>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="teachers">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Cadastrar Professor
                  </CardTitle>
                  <CardDescription>
                    Adicione um novo professor com foto para reconhecimento facial
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-center">
                    <div className="relative">
                      <Avatar className="w-32 h-32 border-4 border-muted">
                        {teacherPhotoPreview ? (
                          <AvatarImage src={teacherPhotoPreview} alt="Foto do professor" />
                        ) : (
                          <AvatarFallback>
                            <Camera className="w-12 h-12 text-muted-foreground" />
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <label 
                        htmlFor="teacher-photo" 
                        className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full cursor-pointer hover-elevate"
                      >
                        <Camera className="w-4 h-4" />
                      </label>
                      <input
                        type="file"
                        id="teacher-photo"
                        accept="image/*"
                        capture="user"
                        className="hidden"
                        onChange={handleTeacherPhotoChange}
                        data-testid="input-teacher-photo"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
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
                      <Label htmlFor="teacher-email">Email (opcional)</Label>
                      <Input
                        id="teacher-email"
                        type="email"
                        placeholder="professor@email.com"
                        value={teacherForm.email}
                        onChange={(e) => setTeacherForm(prev => ({ ...prev, email: e.target.value }))}
                        data-testid="input-teacher-email"
                      />
                    </div>

                    <div>
                      <Label htmlFor="teacher-role">Função</Label>
                      <Select 
                        value={teacherForm.role} 
                        onValueChange={(value) => setTeacherForm(prev => ({ ...prev, role: value }))}
                      >
                        <SelectTrigger data-testid="select-teacher-role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TEACHER_ROLES.map(role => (
                            <SelectItem key={role} value={role}>{role}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label className="mb-3 block">Escolas</Label>
                    <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                      {schools.map(school => (
                        <label 
                          key={school.id} 
                          className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                        >
                          <Checkbox
                            checked={teacherForm.schoolIds.includes(school.id)}
                            onCheckedChange={() => handleSchoolToggle(school.id)}
                            data-testid={`checkbox-school-${school.id}`}
                          />
                          <span className="text-sm">{school.name}</span>
                        </label>
                      ))}
                    </div>
                    {schools.length === 0 && (
                      <p className="text-sm text-muted-foreground">Cadastre escolas primeiro</p>
                    )}
                  </div>

                  <div>
                    <Label className="mb-3 block">Matérias</Label>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                      {SUBJECTS.map(subject => (
                        <label 
                          key={subject} 
                          className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                        >
                          <Checkbox
                            checked={teacherForm.subjects.includes(subject)}
                            onCheckedChange={() => handleSubjectToggle(subject)}
                            data-testid={`checkbox-subject-${subject}`}
                          />
                          <span className="text-sm">{subject}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <Button 
                    onClick={handleCreateTeacher} 
                    disabled={savingTeacher}
                    className="w-full"
                    data-testid="button-create-teacher"
                  >
                    {savingTeacher ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Cadastrando...
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4 mr-2" />
                        Cadastrar Professor
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5" />
                    Professores Cadastrados ({teachers.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    {teachers.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhum professor cadastrado ainda
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {teachers.map((teacher) => (
                          <div 
                            key={teacher.id} 
                            className="p-4 border rounded-lg"
                            data-testid={`teacher-card-${teacher.id}`}
                          >
                            <div className="flex items-start gap-3">
                              <Avatar>
                                <AvatarImage src={teacher.photoURL} />
                                <AvatarFallback>{teacher.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold truncate">{teacher.name}</h3>
                                  <Badge variant="secondary">{teacher.role}</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {teacher.subjects.slice(0, 3).join(", ")}
                                  {teacher.subjects.length > 3 && ` +${teacher.subjects.length - 3}`}
                                </p>
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {teacher.schoolIds.map(schoolId => {
                                    const school = schools.find(s => s.id === schoolId);
                                    return school ? (
                                      <Badge key={schoolId} variant="outline" className="text-xs">
                                        {school.name}
                                      </Badge>
                                    ) : null;
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="students">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Todos os Alunos ({allStudents.length})
                    </CardTitle>
                    <CardDescription>
                      Visualize todos os alunos de todas as escolas
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
                      {allStudents.length === 0 
                        ? "Nenhum aluno cadastrado ainda. Os alunos são adicionados pelos painéis das escolas."
                        : "Nenhum aluno encontrado com esse termo"
                      }
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-4 gap-4 p-3 bg-muted rounded-lg font-medium text-sm">
                        <span>Nome</span>
                        <span>Escola</span>
                        <span>Turma</span>
                        <span>Média</span>
                      </div>
                      {filteredStudents.map((student) => (
                        <div 
                          key={student.id} 
                          className="grid grid-cols-4 gap-4 p-3 border rounded-lg hover-elevate cursor-pointer"
                          data-testid={`student-row-${student.id}`}
                        >
                          <span className="font-medium truncate">{student.name}</span>
                          <span className="text-muted-foreground truncate">{student.schoolName}</span>
                          <Badge variant="outline">{student.gradeLevel}</Badge>
                          <span className="text-muted-foreground">
                            {student.averageGrade > 0 ? student.averageGrade.toFixed(1) : "-"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

