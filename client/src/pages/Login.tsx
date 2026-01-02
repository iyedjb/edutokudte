import { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "@/lib/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Mail,
  Lock,
  User,
  Phone,
  Calendar,
  School,
  Users,
  QrCode,
  RefreshCw,
  Sparkles,
  Award,
  Brain,
  Shield,
  IdCard,
  MessageCircle,
  Heart,
  GraduationCap,
  Star,
} from "lucide-react";
import { database, auth as firebaseAuth } from "@/lib/firebase";
import { ref, get, set } from "firebase/database";
import { useLocation, Link } from "wouter";
import { QRCodeSVG } from "qrcode.react";
import { signInWithCustomToken } from "firebase/auth";
import { formatCPF, validateCPF, isMinor } from "@/lib/cpfValidation";
import logoUrl from "@assets/Edit the EduTok logo_1763232022292.png";
import esmeraldasLogo from "@assets/image_1765129798526.png";

type LoginMode = "email" | "cpf";

function DateSelect({ 
  value, 
  onChange, 
  disabled,
  testIdPrefix 
}: { 
  value: string; 
  onChange: (date: string) => void;
  disabled?: boolean;
  testIdPrefix: string;
}) {
  const parseValue = (val: string) => {
    if (val && val.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const parts = val.split("-");
      return { year: parts[0], month: parts[1], day: parts[2] };
    }
    return { year: "", month: "", day: "" };
  };

  const initialParsed = parseValue(value);
  const [day, setDay] = useState(initialParsed.day);
  const [month, setMonth] = useState(initialParsed.month);
  const [year, setYear] = useState(initialParsed.year);

  useEffect(() => {
    const parsed = parseValue(value);
    setDay(parsed.day);
    setMonth(parsed.month);
    setYear(parsed.year);
  }, [value]);

  useEffect(() => {
    if (day && month && year) {
      const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      if (formattedDate !== value) {
        onChange(formattedDate);
      }
    }
  }, [day, month, year, value, onChange]);

  const days = useMemo(() => Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')), []);
  
  const months = useMemo(() => [
    { value: "01", label: "Jan" },
    { value: "02", label: "Fev" },
    { value: "03", label: "Mar" },
    { value: "04", label: "Abr" },
    { value: "05", label: "Mai" },
    { value: "06", label: "Jun" },
    { value: "07", label: "Jul" },
    { value: "08", label: "Ago" },
    { value: "09", label: "Set" },
    { value: "10", label: "Out" },
    { value: "11", label: "Nov" },
    { value: "12", label: "Dez" },
  ], []);

  const currentYear = new Date().getFullYear();
  const years = useMemo(() => Array.from({ length: 100 }, (_, i) => String(currentYear - i)), [currentYear]);

  return (
    <div className="flex gap-2">
      <Select value={day} onValueChange={setDay} disabled={disabled}>
        <SelectTrigger 
          className="flex-1 h-12 bg-background/80 border-border/50 rounded-xl text-center"
          data-testid={`${testIdPrefix}-day`}
        >
          <SelectValue placeholder="Dia" />
        </SelectTrigger>
        <SelectContent className="max-h-60">
          {days.map((d) => (
            <SelectItem key={d} value={d}>{d}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={month} onValueChange={setMonth} disabled={disabled}>
        <SelectTrigger 
          className="flex-[1.2] h-12 bg-background/80 border-border/50 rounded-xl text-center"
          data-testid={`${testIdPrefix}-month`}
        >
          <SelectValue placeholder="Mês" />
        </SelectTrigger>
        <SelectContent className="max-h-60">
          {months.map((m) => (
            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={year} onValueChange={setYear} disabled={disabled}>
        <SelectTrigger 
          className="flex-1 h-12 bg-background/80 border-border/50 rounded-xl text-center"
          data-testid={`${testIdPrefix}-year`}
        >
          <SelectValue placeholder="Ano" />
        </SelectTrigger>
        <SelectContent className="max-h-60">
          {years.map((y) => (
            <SelectItem key={y} value={y}>{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loginMode, setLoginMode] = useState<LoginMode>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [school, setSchool] = useState("");
  const [grade, setGrade] = useState("");
  const [loginCpf, setLoginCpf] = useState("");
  const [loginBirthdate, setLoginBirthdate] = useState("");
  const { signInWithEmail, signUpWithEmail, signInWithCpf } =
    useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [showQrLogin, setShowQrLogin] = useState(false);
  const [qrSessionId, setQrSessionId] = useState<string | null>(null);
  const [qrSecret, setQrSecret] = useState<string | null>(null);
  const [qrExpiresAt, setQrExpiresAt] = useState<number | null>(null);
  const [qrTimeRemaining, setQrTimeRemaining] = useState(0);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrAvailable, setQrAvailable] = useState(true);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingErrorCountRef = useRef<number>(0);

  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  useEffect(() => {
    if (showQrLogin && !qrSessionId) {
      createQrSession();
    }
  }, [showQrLogin]);

  useEffect(() => {
    if (!qrSessionId || !qrSecret) return;

    let isPolling = true;

    const pollSessionStatus = async () => {
      if (!isPolling) return;

      try {
        const response = await fetch("/api/auth/qr/retrieve-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionId: qrSessionId, secret: qrSecret }),
        });

        const data = await response.json();

        if (data.success && data.status === "approved" && data.customToken) {
          isPolling = false;
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }

          setQrLoading(true);

          await signInWithCustomToken(firebaseAuth, data.customToken);

          toast({
            title: "Login bem-sucedido!",
            description: `Bem-vindo, ${data.userDisplayName || "Usuário"}!`,
          });

          setQrSessionId(null);
          setQrSecret(null);
        } else if (data.status === "pending") {
          pollingErrorCountRef.current = 0;
        } else {
          isPolling = false;
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }

          setQrSessionId(null);
          setQrSecret(null);

          if (data.status === "expired" || data.status === "consumed") {
            pollingErrorCountRef.current = 0;
            createQrSession();
          } else {
            setQrAvailable(false);
            setShowQrLogin(false);
            toast({
              title: "Erro no login QR",
              description:
                "Ocorreu um erro. Use CPF para fazer login.",
              variant: "destructive",
            });
          }
        }
      } catch (error: any) {
        console.error("Error polling session status:", error);

        pollingErrorCountRef.current++;

        if (pollingErrorCountRef.current >= 3) {
          isPolling = false;
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setQrSessionId(null);
          setQrSecret(null);
          setQrAvailable(false);
          setShowQrLogin(false);
          toast({
            title: "Erro de conexão",
            description:
              "Perdeu conexão com o servidor. Use CPF para fazer login.",
            variant: "destructive",
          });
        }
      }
    };

    pollSessionStatus();
    pollingIntervalRef.current = setInterval(pollSessionStatus, 2000);

    return () => {
      isPolling = false;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [qrSessionId, qrSecret]);

  useEffect(() => {
    if (!qrExpiresAt) return;

    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((qrExpiresAt - Date.now()) / 1000),
      );
      setQrTimeRemaining(remaining);

      if (remaining === 0) {
        createQrSession();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [qrExpiresAt]);

  const createQrSession = async () => {
    try {
      setQrLoading(true);

      const response = await fetch("/api/auth/qr/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.status === 503) {
        setQrAvailable(false);
        setShowQrLogin(false);
        setQrLoading(false);
        toast({
          title: "Login QR não disponível",
          description:
            "O login via QR Code requer configuração do servidor. Use CPF para fazer login.",
          variant: "destructive",
        });
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "Erro ao criar sessão");
      }

      setQrSessionId(data.sessionId);
      setQrSecret(data.secret);
      setQrExpiresAt(data.expiresAt);
      setQrTimeRemaining(Math.floor((data.expiresAt - Date.now()) / 1000));
      setQrLoading(false);
    } catch (error: any) {
      console.error("Error creating QR session:", error);
      setQrLoading(false);

      setQrAvailable(false);
      setShowQrLogin(false);

      toast({
        title: "Login QR não disponível",
        description:
          "Não foi possível conectar ao servidor. Use CPF para fazer login.",
        variant: "destructive",
      });
    }
  };

  const getGradeOptions = () => {
    if (school === "E.m Zita Lucas E Silva") {
      return ["701", "702", "703", "801", "802", "803", "901", "902", "903"];
    } else if (school === "E.E Santa Quitéria") {
      const grades = [];
      for (let year = 1; year <= 3; year++) {
        for (let reg = 1; reg <= 7; reg++) {
          grades.push(`${year} reg ${reg}`);
        }
      }
      return grades;
    }
    return [];
  };

  const handleCPFChange = (value: string) => {
    const formatted = formatCPF(value);
    setCpf(formatted);
  };

  const handleLoginCpfChange = (value: string) => {
    const formatted = formatCPF(value);
    setLoginCpf(formatted);
  };

  const handleCpfLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateCPF(loginCpf)) {
      toast({
        title: "CPF inválido",
        description:
          "Por favor, insira um CPF válido no formato: 000.000.000-00",
        variant: "destructive",
      });
      return;
    }

    if (!loginBirthdate) {
      toast({
        title: "Data de nascimento obrigatória",
        description: "Por favor, selecione sua data de nascimento.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await signInWithCpf(loginCpf, loginBirthdate);

      if (result.success) {
        toast({
          title: "Login bem-sucedido!",
          description: `Bem-vindo, ${result.studentName || "Usuário"}!`,
        });
        
        if (result.userType === "teacher") {
          navigate("/professor/notas");
        } else {
          navigate("/dashboard");
        }
      } else {
        throw new Error(result.error || "Erro ao fazer login");
      }
    } catch (error: any) {
      console.error("CPF login error:", error);
      toast({
        title: "Erro ao fazer login",
        description: error.message || "Verifique seus dados e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await signInWithEmail(email, password);
      toast({
        title: "Bem-vindo de volta!",
        description: "Login realizado com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao fazer login",
        description:
          error.message || "Verifique suas credenciais e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!displayName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, insira seu nome completo.",
        variant: "destructive",
      });
      return;
    }

    if (!validateCPF(cpf)) {
      toast({
        title: "CPF inválido",
        description:
          "Por favor, insira um CPF válido no formato: 000.000.000-00",
        variant: "destructive",
      });
      return;
    }

    if (!birthdate) {
      toast({
        title: "Data de nascimento obrigatória",
        description: "Por favor, selecione sua data de nascimento.",
        variant: "destructive",
      });
      return;
    }

    const userIsMinor = isMinor(birthdate);
    if (userIsMinor) {
      toast({
        title: "Atenção - Menor de Idade",
        description:
          "Um responsável precisa autorizar seu cadastro. Continue para completar o registro.",
      });
    }

    if (!school) {
      toast({
        title: "Escola obrigatória",
        description: "Por favor, selecione sua escola.",
        variant: "destructive",
      });
      return;
    }

    if (!grade) {
      toast({
        title: "Turma obrigatória",
        description: "Por favor, selecione sua turma.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      await signUpWithEmail(
        email,
        password,
        displayName,
        phone,
        cpf,
        birthdate,
        school,
        grade,
      );
      toast({
        title: "Conta criada!",
        description: "Bem-vindo ao EduTok!",
      });
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

  const features = [
    { icon: Brain, label: "IA 24/7", color: "from-cyan-400 to-blue-500" },
    { icon: Award, label: "Notas", color: "from-emerald-400 to-teal-500" },
    { icon: MessageCircle, label: "Chat", color: "from-violet-400 to-purple-500" },
    { icon: Heart, label: "Social", color: "from-rose-400 to-pink-500" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-primary/8 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-cyan-400/6 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col lg:flex-row">
        <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-4 py-6 lg:p-12">
          {showQrLogin && !isSignUp ? (
            <div className="w-full max-w-sm space-y-5">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-primary flex items-center justify-center">
                  <QrCode className="w-7 h-7 text-primary-foreground" />
                </div>
                <h1 className="text-xl font-bold" data-testid="text-qr-login-title">
                  Login por QR Code
                </h1>
                <p className="text-sm text-muted-foreground">
                  Escaneie o código com seu celular
                </p>
              </div>

              <div className="bg-card rounded-2xl p-5 border border-border/40">
                <div className="flex flex-col items-center space-y-4">
                  {qrLoading || !qrSessionId ? (
                    <div className="w-48 h-48 bg-muted/50 rounded-xl flex items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="bg-white p-3 rounded-xl">
                        <QRCodeSVG value={qrSessionId} size={180} level="H" includeMargin={true} />
                      </div>
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary px-3 py-1 rounded-full">
                        <span className="text-xs font-bold text-primary-foreground">{qrTimeRemaining}s</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  variant="outline"
                  onClick={createQrSession}
                  disabled={qrLoading}
                  className="w-full h-11 rounded-xl gap-2"
                  data-testid="button-refresh-qr"
                >
                  <RefreshCw className="w-4 h-4" />
                  Gerar Novo Código
                </Button>

                <Button
                  onClick={() => setShowQrLogin(false)}
                  className="w-full h-11 rounded-xl gap-2"
                  data-testid="button-show-form-login"
                >
                  <IdCard className="w-4 h-4" />
                  Entrar com CPF
                </Button>
              </div>
            </div>
          ) : !isSignUp ? (
            <div className="w-full max-w-sm space-y-5">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 mx-auto rounded-2xl overflow-hidden bg-white border border-border/30">
                  <img src={logoUrl} alt="Eduna" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h1 className="text-xl font-bold" data-testid="text-login-title">
                    Bem-vindo!
                  </h1>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Entre com seu CPF e data de nascimento
                  </p>
                </div>
                <div className="inline-block bg-white dark:bg-card rounded-lg px-3 py-1.5 border border-border/30">
                  <img src={esmeraldasLogo} alt="Prefeitura de Esmeraldas" className="h-5 w-auto" />
                </div>
              </div>

              <div className="bg-card rounded-2xl p-5 border border-border/40">
                <form onSubmit={handleCpfLogin} className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-1.5 flex items-center gap-2">
                        <IdCard className="w-4 h-4 text-primary" />
                        CPF
                      </label>
                      <Input
                        type="text"
                        placeholder="000.000.000-00"
                        value={loginCpf}
                        onChange={(e) => handleLoginCpfChange(e.target.value)}
                        required
                        maxLength={14}
                        disabled={isLoading}
                        className="h-12 rounded-xl bg-background/80 border-border/50 text-base"
                        data-testid="input-login-cpf"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-1.5 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        Data de Nascimento
                      </label>
                      <DateSelect
                        value={loginBirthdate}
                        onChange={setLoginBirthdate}
                        disabled={isLoading}
                        testIdPrefix="select-login-birthdate"
                      />
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground text-center">
                    Login para alunos cadastrados pela secretaria
                  </p>

                  <Button
                    type="submit"
                    className="w-full h-12 rounded-xl font-semibold text-base gap-2"
                    disabled={isLoading}
                    data-testid="button-cpf-login-submit"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Entrar
                      </>
                    )}
                  </Button>
                </form>

                {isDesktop && qrAvailable && (
                  <>
                    <div className="relative py-3">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border/50" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-3 text-muted-foreground">ou</span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      type="button"
                      className="w-full h-11 rounded-xl gap-2"
                      onClick={() => setShowQrLogin(true)}
                      data-testid="button-show-qr-login"
                    >
                      <QrCode className="w-4 h-4" />
                      Login com QR Code
                    </Button>
                  </>
                )}
              </div>

              <div className="grid grid-cols-4 gap-2">
                {features.map((feature, index) => (
                  <div key={index} className="flex flex-col items-center gap-1.5">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center`}>
                      <feature.icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground">{feature.label}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Shield className="w-3 h-3 text-emerald-500" />
                  <span>100% Seguro</span>
                </div>
                <span className="text-border">|</span>
                <div className="flex items-center gap-1">
                  <GraduationCap className="w-3 h-3 text-primary" />
                  <span>BNCC</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-sm space-y-4">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 mx-auto rounded-2xl overflow-hidden bg-white border border-border/30">
                  <img src={logoUrl} alt="EduTok" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h1 className="text-xl font-bold" data-testid="text-signup-title">
                    Criar Conta
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Preencha seus dados
                  </p>
                </div>
              </div>

              <div className="bg-card rounded-2xl p-4 border border-border/40">
                <form onSubmit={handleEmailSignUp} className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-primary" />
                      Nome Completo
                    </label>
                    <Input
                      type="text"
                      placeholder="Seu nome"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required
                      disabled={isLoading}
                      className="h-11 rounded-xl bg-background/80"
                      data-testid="input-signup-name"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-primary" />
                      E-mail
                    </label>
                    <Input
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      className="h-11 rounded-xl bg-background/80"
                      data-testid="input-signup-email"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-primary" />
                      Senha
                    </label>
                    <Input
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      disabled={isLoading}
                      className="h-11 rounded-xl bg-background/80"
                      data-testid="input-signup-password"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-primary" />
                      Telefone (opcional)
                    </label>
                    <Input
                      type="tel"
                      placeholder="(00) 00000-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={isLoading}
                      className="h-11 rounded-xl bg-background/80"
                      data-testid="input-signup-phone"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-primary" />
                      CPF
                    </label>
                    <Input
                      type="text"
                      placeholder="000.000.000-00"
                      value={cpf}
                      onChange={(e) => handleCPFChange(e.target.value)}
                      required
                      maxLength={14}
                      disabled={isLoading}
                      className="h-11 rounded-xl bg-background/80"
                      data-testid="input-signup-cpf"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      Data de Nascimento
                    </label>
                    <DateSelect
                      value={birthdate}
                      onChange={setBirthdate}
                      disabled={isLoading}
                      testIdPrefix="select-signup-birthdate"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                      <School className="w-3.5 h-3.5 text-primary" />
                      Escola
                    </label>
                    <Select
                      value={school}
                      onValueChange={(value) => {
                        setSchool(value);
                        setGrade("");
                      }}
                      disabled={isLoading}
                    >
                      <SelectTrigger
                        className="h-11 bg-background/80 rounded-xl"
                        data-testid="select-signup-school"
                      >
                        <SelectValue placeholder="Selecione sua escola" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="E.m Zita Lucas E Silva">E.m Zita Lucas E Silva</SelectItem>
                        <SelectItem value="E.E Santa Quitéria">E.E Santa Quitéria</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-primary" />
                      Turma
                    </label>
                    <Select value={grade} onValueChange={setGrade} disabled={isLoading || !school}>
                      <SelectTrigger
                        className="h-11 bg-background/80 rounded-xl"
                        data-testid="select-signup-grade"
                      >
                        <SelectValue placeholder={school ? "Selecione sua turma" : "Primeiro selecione a escola"} />
                      </SelectTrigger>
                      <SelectContent>
                        {getGradeOptions().map((gradeOption) => (
                          <SelectItem key={gradeOption} value={gradeOption}>{gradeOption}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 rounded-xl font-semibold gap-2 mt-1"
                    disabled={isLoading}
                    data-testid="button-signup-submit"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      <>
                        <Award className="w-4 h-4" />
                        Criar Conta
                      </>
                    )}
                  </Button>
                </form>
              </div>

              <p className="text-center text-sm text-muted-foreground">
                Já tem uma conta?{" "}
                <button
                  type="button"
                  onClick={() => setIsSignUp(false)}
                  className="text-primary font-semibold"
                  data-testid="button-switch-login"
                >
                  Entrar
                </button>
              </p>
            </div>
          )}
        </div>

        <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent"></div>
          
          <div className="relative z-10 max-w-lg space-y-6">
            <div className="bg-card rounded-3xl p-8 border border-border/30 space-y-6">
              <div className="flex gap-3">
                {features.map((feature, index) => (
                  <div key={index} className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center`}>
                    <feature.icon className="w-5 h-5 text-white" />
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold leading-tight">
                  Sua Jornada de Aprendizado Começa Aqui!
                </h2>
                <p className="text-muted-foreground">
                  Acesse conteúdos educacionais, conecte-se com professores e acompanhe seu progresso
                </p>
              </div>

              <div className="flex gap-3">
                <div className="flex-1 bg-muted/50 rounded-xl p-3 text-center">
                  <div className="text-xl font-bold">24/7</div>
                  <div className="text-xs text-muted-foreground">Suporte IA</div>
                </div>
                <div className="flex-1 bg-muted/50 rounded-xl p-3 text-center">
                  <div className="text-xl font-bold">100%</div>
                  <div className="text-xs text-muted-foreground">Seguro LGPD</div>
                </div>
                <div className="flex-1 bg-muted/50 rounded-xl p-3 text-center">
                  <div className="text-xl font-bold">BNCC</div>
                  <div className="text-xs text-muted-foreground">Alinhado</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <Star className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">Gamificação</span> - Aprenda se divertindo!
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
