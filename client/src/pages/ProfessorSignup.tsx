import { useState } from "react";
import { useAuth } from "@/lib/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Lock, Shield, GraduationCap, Brain, PlayCircle, Award, ArrowLeft } from "lucide-react";
import { profileNotasDatabase } from "@/lib/firebase";
import { ref, get } from "firebase/database";
import { useLocation, Link } from "wouter";
import { formatCPF, validateCPF } from "@/lib/cpfValidation";

export default function ProfessorSignup() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cpf, setCpf] = useState("");
  const { signUpWithEmail } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const handleCPFChange = (value: string) => {
    const formatted = formatCPF(value);
    setCpf(formatted);
  };

  const handleProfessorSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateCPF(cpf)) {
      toast({
        title: "CPF inválido",
        description: "Por favor, insira um CPF válido no formato: 000.000.000-00",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const teachersRef = ref(profileNotasDatabase, "teachers");
      const teachersSnapshot = await get(teachersRef);
      
      if (!teachersSnapshot.exists()) {
        toast({
          title: "Erro no sistema",
          description: "Não há professores cadastrados no sistema. Entre em contato com a administração.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const teachers = teachersSnapshot.val();
      const teacherEntry = Object.entries(teachers).find(([_, teacher]: [string, any]) => 
        teacher.email?.toLowerCase() === email.toLowerCase()
      );

      if (teacherEntry) {
        const matchingTeacher = teacherEntry[1] as any;
        const teacherName = matchingTeacher.name || "Professor";
        await signUpWithEmail(email, password, teacherName, "", cpf, "", "", "");
        
        toast({
          title: "Bem-vindo, Professor!",
          description: "Conta criada com sucesso.",
        });
        
        navigate("/professor/notas");
      } else {
        toast({
          title: "Email não cadastrado",
          description: "Este email não está registrado como professor. Entre em contato com a administração.",
          variant: "destructive",
        });
        
        setEmail("");
        setPassword("");
        setCpf("");
      }
    } catch (error: any) {
      toast({
        title: "Erro ao criar conta",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-background dark:via-card dark:to-background">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-40 right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float-delayed"></div>
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-blue-300/10 rounded-full blur-3xl animate-float"></div>
      </div>

      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 relative z-10">
        <div className="w-full max-w-md">
          <div className="space-y-6">
            <Link href="/login">
              <Button
                variant="ghost"
                className="gap-2 hover-elevate active-elevate-2 mb-4"
                data-testid="button-back-to-login"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar para login
              </Button>
            </Link>

            <div className="text-center space-y-3">
              <div className="relative inline-flex">
                <div className="absolute -inset-2 bg-gradient-to-r from-primary via-primary/50 to-primary rounded-full blur-lg opacity-60 animate-pulse-slow"></div>
                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary via-primary to-primary/90 flex items-center justify-center shadow-2xl">
                  <GraduationCap className="w-10 h-10 text-primary-foreground" />
                </div>
              </div>
              <h1 className="text-4xl font-black bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent" data-testid="text-professor-signup-title">
                Cadastro Professor
              </h1>
              <p className="text-sm text-muted-foreground">
                Crie sua conta de professor
              </p>
            </div>

            <form onSubmit={handleProfessorSignUp} className="space-y-4">
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-primary/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 blur"></div>
                <div className="relative flex items-center">
                  <div className="absolute left-4 text-muted-foreground">
                    <Mail className="w-5 h-5" />
                  </div>
                  <Input
                    type="email"
                    placeholder="E-mail Institucional *"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pl-12 h-14 bg-card/80 border-2 border-border/50 rounded-2xl text-base focus:border-primary/50 transition-all"
                    data-testid="input-professor-email"
                  />
                </div>
              </div>

              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-primary/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 blur"></div>
                <div className="relative flex items-center">
                  <div className="absolute left-4 text-muted-foreground">
                    <Lock className="w-5 h-5" />
                  </div>
                  <Input
                    type="password"
                    placeholder="Senha *"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={isLoading}
                    className="pl-12 h-14 bg-card/80 border-2 border-border/50 rounded-2xl text-base focus:border-primary/50 transition-all"
                    data-testid="input-professor-password"
                  />
                </div>
              </div>

              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-primary/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 blur"></div>
                <div className="relative flex items-center">
                  <div className="absolute left-4 text-muted-foreground">
                    <Shield className="w-5 h-5" />
                  </div>
                  <Input
                    type="text"
                    placeholder="CPF * (000.000.000-00)"
                    value={cpf}
                    onChange={(e) => handleCPFChange(e.target.value)}
                    required
                    maxLength={14}
                    disabled={isLoading}
                    className="pl-12 h-14 bg-card/80 border-2 border-border/50 rounded-2xl text-base focus:border-primary/50 transition-all"
                    data-testid="input-professor-cpf"
                  />
                </div>
              </div>

              <div className="relative group pt-2">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary via-primary/80 to-primary rounded-2xl blur-md opacity-40 group-hover:opacity-70 transition-all duration-300 animate-pulse-slow"></div>
                <Button 
                  type="submit" 
                  className="relative w-full h-14 bg-gradient-to-r from-primary via-primary to-primary hover:from-primary/90 hover:via-primary/90 hover:to-primary/90 text-primary-foreground rounded-2xl font-bold text-base shadow-2xl hover:shadow-primary/50 transition-all duration-500 transform hover:scale-105 no-default-hover-elevate gap-2"
                  disabled={isLoading}
                  data-testid="button-professor-signup-submit"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    <>
                      <GraduationCap className="w-5 h-5" />
                      Criar Conta de Professor
                    </>
                  )}
                </Button>
              </div>
            </form>

            <div className="bg-card/50 border-2 border-border/30 rounded-2xl p-4">
              <p className="text-sm text-muted-foreground text-center">
                <strong>Atenção:</strong> Apenas professores previamente cadastrados pela administração podem criar contas nesta página.
              </p>
            </div>

            <div className="text-center pt-4">
              <p className="text-sm text-muted-foreground">
                É um aluno?{" "}
                <Link href="/login">
                  <button
                    type="button"
                    className="text-primary hover:text-primary/80 font-bold transition-colors"
                    data-testid="button-switch-student-signup"
                  >
                    Criar conta de aluno
                  </button>
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Hero Section */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/95 via-primary to-primary/90 relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-float-delayed"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full">
            <div className="absolute top-10 left-10 w-20 h-20 bg-white/20 rounded-2xl blur-xl animate-float rotate-12"></div>
            <div className="absolute top-1/3 right-20 w-16 h-16 bg-white/15 rounded-full blur-lg animate-float-delayed"></div>
            <div className="absolute bottom-20 right-1/3 w-24 h-24 bg-white/10 rounded-3xl blur-2xl animate-float"></div>
          </div>
        </div>
        
        <div className="relative z-10 max-w-lg space-y-8">
          <div className="relative">
            <div className="absolute -inset-3 bg-white/20 rounded-3xl blur-2xl"></div>
            <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="relative">
                    <div className="absolute -inset-1 bg-white/30 rounded-2xl blur-md"></div>
                    <div className="relative w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-xl">
                      <Brain className="w-8 h-8 text-primary" />
                    </div>
                  </div>
                  <div className="relative">
                    <div className="absolute -inset-1 bg-white/30 rounded-2xl blur-md"></div>
                    <div className="relative w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-xl">
                      <PlayCircle className="w-8 h-8 text-primary" />
                    </div>
                  </div>
                  <div className="relative">
                    <div className="absolute -inset-1 bg-white/30 rounded-2xl blur-md"></div>
                    <div className="relative w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-xl">
                      <Award className="w-8 h-8 text-primary" />
                    </div>
                  </div>
                </div>
                
                <h2 className="text-4xl font-black text-white leading-tight">
                  Bem-vindo, Professor!
                </h2>
                
                <p className="text-xl text-white/90 leading-relaxed">
                  Gerencie suas turmas, acompanhe o progresso dos alunos e crie conteúdos educacionais incríveis
                </p>

                <div className="flex flex-col gap-3 pt-4">
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <GraduationCap className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="text-sm text-white/80">Gerenciamento</div>
                        <div className="text-lg font-bold text-white">Completo de Turmas</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <Award className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="text-sm text-white/80">Acompanhamento</div>
                        <div className="text-lg font-bold text-white">Do Desempenho</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
