import { useState, useEffect } from "react";
import { useAuth } from "@/lib/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, Plus, Trash2, UserCheck, UserX, ShieldCheck, Loader2 } from "lucide-react";
import { ref, onValue, push, remove, update, get } from "firebase/database";
import { profileNotasDatabase } from "@/lib/firebase";
import { Redirect } from "wouter";

const ADMIN_EMAIL = "sassisawsen2024@gmail.com";

const ROLES = [
  { value: "teacher", label: "Teacher" },
  { value: "professora", label: "Professora" },
  { value: "professor", label: "Professor" },
  { value: "director", label: "Director" },
  { value: "vice_director", label: "Vice Director" },
];

export default function AdminProfessores() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTeacher, setNewTeacher] = useState({
    name: "",
    email: "",
    role: "teacher",
  });
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Sync all teacher verifications
  const syncAllTeachers = async () => {
    setSyncing(true);
    try {
      const teachersRef = ref(profileNotasDatabase, "teachers");
      const teachersSnapshot = await get(teachersRef);
      
      if (!teachersSnapshot.exists()) {
        toast({
          title: "Nenhum professor encontrado",
          description: "Não há professores para sincronizar.",
        });
        setSyncing(false);
        return;
      }

      const teachers = teachersSnapshot.val();
      let syncCount = 0;

      for (const [teacherId, teacher] of Object.entries(teachers)) {
        const teacherData = teacher as any;
        
        if (teacherData.uid) {
          // Use profileNotasDatabase for persistent user profiles
          const userProfileRef = ref(profileNotasDatabase, `userProfiles/${teacherData.uid}`);
          const profileSnapshot = await get(userProfileRef);
          
          if (profileSnapshot.exists()) {
            const updates = {
              verified: true,
              role: teacherData.role,
            };
            await update(userProfileRef, updates);
            syncCount++;
          } else {
            const userRef = ref(profileNotasDatabase, `users/${teacherData.uid}`);
            const userSnapshot = await get(userRef);
            if (userSnapshot.exists()) {
              const userData = userSnapshot.val();
              const profileData = {
                uid: teacherData.uid,
                displayName: userData.displayName,
                email: userData.email,
                photoURL: userData.photoURL || "",
                verified: true,
                role: teacherData.role,
                createdAt: Date.now(),
                followerCount: 0,
                followingCount: 0,
                postCount: 0,
              };
              await update(userProfileRef, profileData);
              syncCount++;
            }
          }
        }
      }

      toast({
        title: "Sincronização concluída!",
        description: `${syncCount} professor(es) verificado(s) com sucesso.`,
      });
    } catch (error) {
      console.error("Error syncing teachers:", error);
      toast({
        title: "Erro na sincronização",
        description: "Não foi possível sincronizar os professores.",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  // Check if user is admin
  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }

    if (user.email === ADMIN_EMAIL) {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }
  }, [user]);

  // Load teachers
  useEffect(() => {
    const teachersRef = ref(profileNotasDatabase, "teachers");
    const unsubscribe = onValue(teachersRef, async (snapshot) => {
      const data = snapshot.val() || {};
      const teacherArray = Object.keys(data).map(id => ({ id, ...data[id] }));

      // Check which teachers are registered users
      const teachersWithStatus = await Promise.all(
        teacherArray.map(async (teacher) => {
          if (teacher.uid) {
            const userRef = ref(profileNotasDatabase, `users/${teacher.uid}`);
            const userSnapshot = await get(userRef);
            
            if (userSnapshot.exists()) {
              const userData = userSnapshot.val();
              return {
                ...teacher,
                isRegistered: true,
                displayName: userData.displayName,
                photoURL: userData.photoURL,
              };
            }
          }
          return { ...teacher, isRegistered: false };
        })
      );

      setTeachers(teachersWithStatus);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Listen for new user registrations to link them to teachers
  useEffect(() => {
    const usersRef = ref(profileNotasDatabase, "users");
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val() || {};
      
      // Find teachers without uid
      teachers.forEach((teacher) => {
        if (!teacher.uid) {
          // Check if any user has this email
          Object.keys(data).forEach((uid) => {
            const userData = data[uid];
            if (userData.email === teacher.email) {
              // Link the teacher
              const teacherRef = ref(profileNotasDatabase, `teachers/${teacher.id}`);
              update(teacherRef, {
                uid: uid,
              });

              // Mark user as verified in profileNotasDatabase (persistent data)
              const userProfileRef = ref(profileNotasDatabase, `userProfiles/${uid}`);
              get(userProfileRef).then((profileSnapshot) => {
                if (profileSnapshot.exists()) {
                  const updates = {
                    verified: true,
                    role: teacher.role,
                  };
                  update(userProfileRef, updates);
                } else {
                  // Create profile
                  const profileData = {
                    uid: uid,
                    displayName: userData.displayName,
                    email: userData.email,
                    photoURL: userData.photoURL || "",
                    verified: true,
                    role: teacher.role,
                    createdAt: Date.now(),
                    followerCount: 0,
                    followingCount: 0,
                    postCount: 0,
                  };
                  update(userProfileRef, profileData);
                }
              });
            }
          });
        }
      });
    });

    return () => unsubscribe();
  }, [teachers]);

  const handleAddTeacher = async () => {
    if (!newTeacher.name.trim()) {
      toast({
        title: "Erro",
        description: "Digite o nome do professor",
        variant: "destructive",
      });
      return;
    }

    if (!newTeacher.email || !newTeacher.email.includes("@")) {
      toast({
        title: "Erro",
        description: "Digite um e-mail válido",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check if teacher already exists
      const existingTeacher = teachers.find(t => t.email === newTeacher.email);

      if (existingTeacher) {
        toast({
          title: "Erro",
          description: "Este e-mail já está cadastrado",
          variant: "destructive",
        });
        return;
      }

      // Check if teacher is already registered as a user
      let uid = null;
      
      const usersRef = ref(profileNotasDatabase, "users");
      const usersSnapshot = await get(usersRef);

      if (usersSnapshot.exists()) {
        const users = usersSnapshot.val();
        Object.keys(users).forEach((userId) => {
          if (users[userId].email === newTeacher.email) {
            uid = userId;
          }
        });
      }

      const teacherData = {
        name: newTeacher.name.trim(),
        email: newTeacher.email.toLowerCase().trim(),
        role: newTeacher.role,
        uid: uid || null,
        addedAt: Date.now(),
        addedBy: user?.uid,
      };

      const teachersRef = ref(profileNotasDatabase, "teachers");
      await push(teachersRef, teacherData);

      // If teacher is already registered, mark them as verified in profileNotasDatabase
      if (uid) {
        const userProfileRef = ref(profileNotasDatabase, `userProfiles/${uid}`);
        const profileSnapshot = await get(userProfileRef);
        
        if (profileSnapshot.exists()) {
          const updates = {
            verified: true,
            role: newTeacher.role,
          };
          await update(userProfileRef, updates);
        } else {
          // Create profile
          const userRef = ref(profileNotasDatabase, `users/${uid}`);
          const userSnapshot = await get(userRef);
          if (userSnapshot.exists()) {
            const userData = userSnapshot.val();
            const profileData = {
              uid: uid,
              displayName: userData.displayName,
              email: userData.email,
              photoURL: userData.photoURL || "",
              verified: true,
              role: newTeacher.role,
              createdAt: Date.now(),
              followerCount: 0,
              followingCount: 0,
              postCount: 0,
            };
            await update(userProfileRef, profileData);
          }
        }
      }

      toast({
        title: "Professor adicionado!",
        description: `${newTeacher.name} foi adicionado com sucesso`,
      });

      setNewTeacher({ name: "", email: "", role: "teacher" });
      setShowAddDialog(false);
    } catch (error) {
      console.error("Error adding teacher:", error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o professor",
        variant: "destructive",
      });
    }
  };

  const handleRemoveTeacher = async (teacherId: string, teacherName: string, teacherUid: string | null) => {
    if (!confirm(`Tem certeza que deseja remover ${teacherName}?`)) {
      return;
    }

    try {
      // Remove teacher
      const teacherRef = ref(profileNotasDatabase, `teachers/${teacherId}`);
      await remove(teacherRef);

      // If teacher is registered, remove verified status in profileNotasDatabase
      if (teacherUid) {
        const userProfileRef = ref(profileNotasDatabase, `userProfiles/${teacherUid}`);
        const profileSnapshot = await get(userProfileRef);
        
        if (profileSnapshot.exists()) {
          const updates = {
            verified: false,
            role: null,
          };
          await update(userProfileRef, updates);
        }
      }

      toast({
        title: "Professor removido",
        description: `${teacherName} foi removido`,
      });
    } catch (error) {
      console.error("Error removing teacher:", error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o professor",
        variant: "destructive",
      });
    }
  };

  if (isAdmin === null) {
    return (
      <div className="flex items-center justify-center bg-background py-12 min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Redirect to="/chat" />;
  }

  return (
    <div className="bg-background pb-20 min-h-screen">
      <header className="bg-gradient-to-r from-primary to-primary/80 px-4 py-6 sticky top-0 z-40 shadow-md">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck className="w-8 h-8 text-white" />
            <div>
              <h1 className="text-2xl font-bold text-white">Administração</h1>
              <p className="text-sm text-white/80">Gerenciar Professores</p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-white/20 text-white">
            {user?.email}
          </Badge>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <Card className="border-card-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Todos os Professores</CardTitle>
                <CardDescription>
                  Professores adicionados aqui ficam verificados no Efeed e Chat, visíveis para todos os alunos
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={syncAllTeachers}
                  disabled={syncing}
                  data-testid="button-sync-teachers"
                >
                  {syncing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sincronizando...
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4 mr-2" />
                      Sincronizar Verificação
                    </>
                  )}
                </Button>
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-add-teacher">
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Professor
                    </Button>
                  </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Novo Professor</DialogTitle>
                    <DialogDescription>
                      Cadastre o professor. Quando ele se cadastrar com este e-mail, será automaticamente verificado.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="teacher-name">Nome do Professor *</Label>
                      <Input
                        id="teacher-name"
                        placeholder="Nome completo"
                        value={newTeacher.name}
                        onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
                        data-testid="input-teacher-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="teacher-email">E-mail *</Label>
                      <Input
                        id="teacher-email"
                        type="email"
                        placeholder="professor@email.com"
                        value={newTeacher.email}
                        onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
                        data-testid="input-teacher-email"
                      />
                    </div>
                    <div>
                      <Label htmlFor="teacher-role">Cargo *</Label>
                      <Select value={newTeacher.role} onValueChange={(value) => setNewTeacher({ ...newTeacher, role: value })}>
                        <SelectTrigger id="teacher-role" data-testid="select-teacher-role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      onClick={handleAddTeacher} 
                      disabled={!newTeacher.name || !newTeacher.email}
                      className="w-full"
                      data-testid="button-confirm-add-teacher"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : teachers.length > 0 ? (
              <div className="space-y-3">
                {teachers.map((teacher) => (
                  <Card key={teacher.id} className="border-card-border hover-elevate">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            teacher.isRegistered 
                              ? "bg-green-100 dark:bg-green-900" 
                              : "bg-yellow-100 dark:bg-yellow-900"
                          }`}>
                            {teacher.isRegistered ? (
                              <UserCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
                            ) : (
                              <UserX className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <p className="font-semibold text-foreground truncate">
                                {teacher.name}
                              </p>
                              <Badge variant="outline" className="capitalize">
                                {ROLES.find(r => r.value === teacher.role)?.label || teacher.role}
                              </Badge>
                              {teacher.isRegistered ? (
                                <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                                  ✓ Cadastrado
                                </Badge>
                              ) : (
                                <Badge variant="secondary">
                                  Aguardando Cadastro
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {teacher.email}
                            </p>
                          </div>
                        </div>

                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveTeacher(teacher.id, teacher.name, teacher.uid)}
                          data-testid={`button-remove-teacher-${teacher.id}`}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remover
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <GraduationCap className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">Nenhum professor cadastrado ainda</p>
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Primeiro Professor
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-900/10 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                  Sobre a verificação de professores
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Professores adicionados aqui ficam automaticamente verificados no Efeed (com badge azul) e no Chat (com badge de cargo). 
                  Todos os alunos podem ver e conversar com eles.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
