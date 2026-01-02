import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  GraduationCap, 
  Video, 
  MessageSquare, 
  BookOpen, 
  Calendar, 
  BarChart3, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight,
  Users,
  Clock,
  Award,
  Shield,
  Lock,
  FileCheck,
  Building2,
  BookMarked,
  ClipboardCheck,
  PlayCircle,
  Clapperboard,
  Zap,
  Brain,
  MessageCircle,
  MessagesSquare,
  Hash,
  TrendingUp,
  LineChart,
  Library,
  Notebook,
  CalendarDays,
  CalendarCheck2
} from "lucide-react";

export default function LandingPage() {
  const features = [
    {
      icon: Clapperboard,
      title: "Conteúdo Educacional Audiovisual",
      description: "Acesso a conteúdo educacional em formato de vídeo, alinhado à Base Nacional Comum Curricular (BNCC), com curadoria pedagógica especializada.",
    },
    {
      icon: Brain,
      title: "Assistente Virtual Educacional",
      description: "Sistema de assistência pedagógica automatizada para suporte ao aprendizado, disponível de forma contínua aos estudantes.",
    },
    {
      icon: Hash,
      title: "Comunicação Institucional",
      description: "Sistema de comunicação seguro entre alunos, professores e gestores educacionais, com registro e auditoria completa.",
    },
    {
      icon: TrendingUp,
      title: "Gestão de Desempenho Acadêmico",
      description: "Acompanhamento integral do desempenho acadêmico com relatórios analíticos e visualização de dados educacionais.",
    },
    {
      icon: Library,
      title: "Acervo Digital Pedagógico",
      description: "Biblioteca digital com materiais didáticos, recursos educacionais abertos e conteúdo organizado por disciplina e série.",
    },
    {
      icon: CalendarDays,
      title: "Gestão de Atividades Escolares",
      description: "Sistema de organização e acompanhamento de atividades acadêmicas, avaliações e eventos do calendário escolar.",
    }
  ];

  const compliance = [
    {
      icon: Shield,
      title: "Conformidade LGPD",
      description: "Total adequação à Lei Geral de Proteção de Dados (Lei nº 13.709/2018), garantindo privacidade e segurança das informações pessoais."
    },
    {
      icon: Lock,
      title: "Segurança de Dados",
      description: "Infraestrutura com criptografia avançada, controle de acesso e políticas rigorosas de segurança da informação."
    },
    {
      icon: FileCheck,
      title: "Transparência e Auditoria",
      description: "Registros detalhados de operações, permitindo auditoria completa e transparência no tratamento de dados."
    }
  ];

  const benefits = [
    "Interface acessível conforme diretrizes WCAG",
    "Armazenamento seguro em nuvem com backup automático",
    "Suporte multiplataforma (desktop, tablet, smartphone)",
    "Sincronização em tempo real entre dispositivos",
    "Relatórios gerenciais para gestores educacionais",
    "Sistema de controle de acesso por perfil",
    "Conformidade total com LGPD (Lei nº 13.709/2018)",
    "Política de privacidade e termos de uso transparentes"
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Ultra-Futuristic Animated Navbar */}
      <div className="fixed top-0 left-0 right-0 z-50 px-3 sm:px-6 lg:px-8 pt-3 sm:pt-4">
        <nav className="max-w-7xl mx-auto relative group nav-float">
          <div className="absolute -inset-2 bg-gradient-to-r from-primary/30 via-primary/50 to-primary/30 rounded-3xl blur-2xl opacity-20 group-hover:opacity-40 animate-glow-pulse"></div>
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-transparent to-primary/20 rounded-3xl blur-xl animate-shimmer-slow"></div>
          
          <div className="relative bg-card border-2 border-primary/40 dark:border-primary/30 rounded-3xl shadow-2xl overflow-visible">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/15 via-transparent to-transparent"></div>
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/70 to-transparent animate-shimmer"></div>
            <div className="absolute -top-8 left-1/4 w-32 h-32 bg-primary/20 rounded-full blur-3xl animate-float"></div>
            <div className="absolute -top-8 right-1/4 w-24 h-24 bg-primary/15 rounded-full blur-3xl animate-float-delayed"></div>
            
            <div className="relative flex justify-between items-center h-14 sm:h-16 px-4 sm:px-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="relative group/logo">
                  <div className="absolute -inset-2 bg-gradient-to-r from-primary via-primary/50 to-primary rounded-2xl blur-lg opacity-60 group-hover/logo:opacity-100 transition-all duration-500 animate-pulse-slow"></div>
                  <div className="absolute inset-0 bg-primary/40 rounded-[18px] blur-md group-hover/logo:blur-lg transition-all duration-300"></div>
                  <div className="relative w-11 h-11 sm:w-12 sm:h-12 bg-gradient-to-br from-primary via-primary to-primary/90 rounded-[18px] flex items-center justify-center shadow-2xl transform group-hover/logo:scale-110 group-hover/logo:rotate-6 transition-all duration-500 border border-white/30 nav-logo-shine">
                    <div className="relative">
                      <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-primary-foreground transform group-hover/logo:scale-110 transition-transform duration-300 absolute top-0 left-0 animate-pulse" />
                      <Award className="w-6 h-6 sm:w-7 sm:h-7 text-primary-foreground transform group-hover/logo:scale-110 transition-transform duration-300" />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-base sm:text-lg font-black tracking-tight bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent nav-text-shimmer">
                    EduTok
                  </span>
                  <span className="hidden sm:block text-[10px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
                    Plataforma Educacional
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 sm:gap-3">
                <Link href="/privacy-policy" className="hidden md:block">
                  <div className="relative group/btn">
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl blur opacity-0 group-hover/btn:opacity-100 transition-all duration-300"></div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="relative bg-card hover:bg-accent border border-border/50 hover:border-border/70 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 no-default-hover-elevate gap-2"
                      data-testid="button-privacy"
                    >
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 absolute -top-0.5 -left-0.5 text-primary/40" />
                        <Shield className="w-3.5 h-3.5" />
                      </div>
                      Privacidade
                    </Button>
                  </div>
                </Link>
                <Link href="/login">
                  <div className="relative group/btn">
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary via-primary/80 to-primary rounded-xl blur-md opacity-40 group-hover/btn:opacity-70 transition-all duration-300 animate-pulse-slow"></div>
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="relative bg-gradient-to-r from-primary via-primary to-primary hover:from-primary/90 hover:via-primary/90 hover:to-primary/90 border-2 border-primary/40 hover:border-primary/60 font-bold shadow-2xl hover:shadow-primary/50 transition-all duration-500 transform hover:scale-110 hover:-translate-y-0.5 no-default-hover-elevate nav-cta-glow gap-1.5"
                      data-testid="button-login"
                    >
                      <span className="hidden sm:inline flex items-center gap-1.5">
                        <div className="relative">
                          <ArrowRight className="w-4 h-4 animate-pulse absolute" />
                          <Sparkles className="w-4 h-4" />
                        </div>
                        Acessar Plataforma
                      </span>
                      <span className="sm:hidden flex items-center gap-1">
                        <div className="relative">
                          <ArrowRight className="w-3.5 h-3.5 animate-pulse absolute opacity-60" />
                          <Sparkles className="w-3.5 h-3.5" />
                        </div>
                        Entrar
                      </span>
                    </Button>
                  </div>
                </Link>
              </div>
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 dark:via-white/20 to-transparent"></div>
          </div>
        </nav>
      </div>
      
      <div className="h-20 sm:h-24"></div>

      {/* Hero Section */}
      <section className="py-12 sm:py-16 md:py-24 border-b bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="mb-4 sm:mb-6 text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2" variant="secondary">
              <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
              <span className="text-xs sm:text-sm">Plataforma Educacional</span>
            </Badge>
            
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 text-foreground px-2">
              Sistema Integrado de Gestão Educacional
            </h1>
            
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 sm:mb-10 max-w-3xl mx-auto leading-relaxed px-2">
              Plataforma digital para instituições de ensino fundamental e médio, oferecendo ferramentas para gestão pedagógica, 
              comunicação institucional e acompanhamento do desempenho acadêmico dos estudantes.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-10 sm:mb-12 px-4">
              <Link href="/login">
                <Button size="lg" className="px-6 sm:px-8 gap-2 w-full sm:w-auto min-h-[48px]" data-testid="button-hero-start">
                  Acessar Sistema
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
              </Link>
              <a href="#features" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="px-6 sm:px-8 w-full min-h-[48px]" data-testid="button-hero-features">
                  Conhecer Funcionalidades
                </Button>
              </a>
            </div>

            {/* Institutional Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mt-10 sm:mt-16">
              <Card className="p-3 sm:p-4">
                <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                  <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                  <div className="text-xl sm:text-2xl font-bold">100%</div>
                  <div className="text-xs sm:text-sm text-muted-foreground text-center leading-tight">Conformidade LGPD</div>
                </div>
              </Card>
              <Card className="p-3 sm:p-4">
                <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                  <Lock className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                  <div className="text-xl sm:text-2xl font-bold">24/7</div>
                  <div className="text-xs sm:text-sm text-muted-foreground text-center leading-tight">Segurança Ativa</div>
                </div>
              </Card>
              <Card className="p-3 sm:p-4">
                <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                  <ClipboardCheck className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                  <div className="text-xl sm:text-2xl font-bold">BNCC</div>
                  <div className="text-xs sm:text-sm text-muted-foreground text-center leading-tight">Alinhamento Total</div>
                </div>
              </Card>
              <Card className="p-3 sm:p-4">
                <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                  <FileCheck className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                  <div className="text-xl sm:text-2xl font-bold">Total</div>
                  <div className="text-xs sm:text-sm text-muted-foreground text-center leading-tight">Auditoria</div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-12 sm:py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-16">
            <Badge className="mb-3 sm:mb-4 text-xs sm:text-sm" variant="secondary">
              Funcionalidades do Sistema
            </Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 px-2">
              Recursos Pedagógicos e Administrativos
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-2">
              Ferramentas integradas para apoio ao processo de ensino-aprendizagem e gestão educacional
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border hover-elevate">
                <CardHeader className="pb-3 sm:pb-6">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-md bg-primary/10 flex items-center justify-center mb-3 sm:mb-4">
                    <feature.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  </div>
                  <CardTitle className="text-base sm:text-lg leading-snug">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription className="text-sm leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance Section */}
      <section className="py-12 sm:py-16 md:py-24 bg-muted/30 border-y">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-16">
            <Badge className="mb-3 sm:mb-4 text-xs sm:text-sm" variant="secondary">
              Segurança e Conformidade
            </Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 px-2">
              Proteção de Dados e Privacidade
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-2">
              Compromisso com a segurança da informação e adequação à legislação vigente
            </p>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
            {compliance.map((item, index) => (
              <Card key={index} className="border-2">
                <CardHeader className="pb-3 sm:pb-6">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-md bg-primary/10 flex items-center justify-center mb-3 sm:mb-4">
                    <item.icon className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                  </div>
                  <CardTitle className="text-base sm:text-lg">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription className="text-sm leading-relaxed">
                    {item.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-card border">
            <CardContent className="p-4 sm:p-6 md:p-8">
              <div className="flex items-start gap-3 sm:gap-4">
                <FileCheck className="w-6 h-6 sm:w-8 sm:h-8 text-primary flex-shrink-0 mt-0.5 sm:mt-1" />
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">Encarregado de Proteção de Dados (DPO)</h3>
                  <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4 leading-relaxed">
                    Em conformidade com o Art. 41 da Lei nº 13.709/2018 (LGPD), disponibilizamos canal direto de comunicação 
                    com nosso Encarregado de Proteção de Dados para esclarecimentos sobre tratamento de dados pessoais.
                  </p>
                  <div className="space-y-2 text-sm">
                    <p className="font-medium text-sm sm:text-base">Contato do DPO: <span className="font-normal text-muted-foreground break-all">dpo@edutok.vuro.com.br</span></p>
                    <div className="flex gap-2 sm:gap-4 flex-wrap mt-3">
                      <Link href="/privacy-policy">
                        <Button variant="outline" size="sm" className="text-xs sm:text-sm" data-testid="button-privacy-policy">
                          Privacidade
                        </Button>
                      </Link>
                      <Link href="/terms-of-service">
                        <Button variant="outline" size="sm" className="text-xs sm:text-sm" data-testid="button-terms">
                          Termos
                        </Button>
                      </Link>
                      <Link href="/meus-dados-lgpd">
                        <Button variant="outline" size="sm" className="text-xs sm:text-sm" data-testid="button-data-rights">
                          Meus Dados
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-12 sm:py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-16">
            <Badge className="mb-3 sm:mb-4 text-xs sm:text-sm" variant="secondary">
              Características Técnicas
            </Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 px-2">
              Especificações do Sistema
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-2">
              Plataforma desenvolvida com tecnologia moderna e padrões de qualidade reconhecidos
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <Card className="border">
              <CardContent className="p-4 sm:p-6 md:p-8">
                <ul className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                  {benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-2 sm:gap-3">
                      <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm leading-relaxed">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 md:py-24 bg-muted/30 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="border-2">
            <CardContent className="py-8 sm:py-10 md:py-12 px-4 sm:px-6 md:px-8 text-center">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
                Acesse a Plataforma Educacional
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto px-2">
                Sistema disponível para estudantes, professores e gestores educacionais autorizados
              </p>
              <Link href="/login">
                <Button 
                  size="lg" 
                  className="px-6 sm:px-8 gap-2 min-h-[48px]"
                  data-testid="button-cta-final"
                >
                  Fazer Login
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 md:py-12">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-6 sm:mb-8">
            <div className="sm:col-span-2">
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary rounded-md flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
                </div>
                <div className="flex flex-col">
                  <span className="text-base sm:text-lg font-semibold">EduTok</span>
                  <span className="text-xs text-muted-foreground">Plataforma Educacional</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                Sistema integrado de gestão educacional para instituições de ensino fundamental e médio, 
                com foco em ferramentas pedagógicas e conformidade com a legislação brasileira.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-3 sm:mb-4 text-sm">Sistema</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-primary transition-colors">Funcionalidades</a></li>
                <li><Link href="/login" className="hover:text-primary transition-colors">Acessar Plataforma</Link></li>
                <li><Link href="/privacy-policy" className="hover:text-primary transition-colors">Privacidade</Link></li>
                <li><Link href="/terms-of-service" className="hover:text-primary transition-colors">Termos de Uso</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-3 sm:mb-4 text-sm">Informações Institucionais</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <span className="block font-medium text-foreground text-sm">CNPJ</span>
                  <span className="text-xs sm:text-sm">62.261.696/0001-67</span>
                </li>
                <li>
                  <span className="block font-medium text-foreground text-sm">DPO (LGPD)</span>
                  <span className="text-xs sm:text-sm break-all">dpo@edutok.vuro.com.br</span>
                </li>
                <li>
                  <span className="block font-medium text-foreground text-sm">Telefone</span>
                  <span className="text-xs sm:text-sm">+55 (31) 97322-1932</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t pt-6 sm:pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
              <p className="text-center md:text-left">© 2025 EduTok - Plataforma Educacional. Todos os direitos reservados.</p>
              <div className="flex gap-3 sm:gap-4 text-xs sm:text-sm">
                <Link href="/privacy-policy" className="hover:text-primary transition-colors">
                  Privacidade
                </Link>
                <Link href="/terms-of-service" className="hover:text-primary transition-colors">
                  Termos
                </Link>
                <Link href="/meus-dados-lgpd" className="hover:text-primary transition-colors">
                  LGPD
                </Link>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-3 sm:mt-4 leading-relaxed px-2">
              Esta plataforma está em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018) 
              e segue as diretrizes da Base Nacional Comum Curricular (BNCC).
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
