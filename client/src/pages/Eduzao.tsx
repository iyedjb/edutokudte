import { useAuth } from "@/lib/useAuth";
import { useSchool } from "@/lib/useSchool";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Gamepad2,
  Sparkles,
  Trophy,
  Target,
  Zap,
  Crown,
  TrendingUp,
  Rocket,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import { useLocation } from "wouter";

export default function Eduzao() {
  const { user } = useAuth();
  const { school } = useSchool();
  const [, setLocation] = useLocation();
  
  const basePath = school.basePath || "";

  const features = [
    {
      icon: Sparkles,
      title: "IA Avançada",
      description: "Exercícios gerados por inteligência artificial Llama 3.3 70B",
      gradient: "from-cyan-500 to-blue-500",
    },
    {
      icon: Trophy,
      title: "Ranking Global",
      description: "Compete com outros estudantes e suba no ranking",
      gradient: "from-amber-500 to-orange-500",
    },
    {
      icon: Target,
      title: "Gamificação",
      description: "Ganhe pontos, suba de nível e desbloqueie conquistas",
      gradient: "from-green-500 to-emerald-500",
    },
    {
      icon: Zap,
      title: "Personalizado",
      description: "Escolha qualquer matéria e tema para estudar",
      gradient: "from-blue-500 to-cyan-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50/50 via-background to-background pb-20">
      <header className="bg-card border-b sticky top-0 z-40 shadow-lg">
        <div className="max-w-screen-xl mx-auto px-4 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="relative group"
                onClick={() => setLocation(`${basePath}/dashboard`)}
                data-testid="button-back"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <ArrowLeft className="w-5 h-5 relative z-10" />
              </Button>
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
                <Gamepad2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Eduzão</h1>
                <p className="text-xs text-muted-foreground">Aprendizado gamificado</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="space-y-8">
          {/* Coming Soon Hero */}
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-cyan-500 to-blue-500 mb-4 shadow-2xl">
              <Rocket className="w-12 h-12 text-white" />
            </div>
            
            <div className="space-y-3">
              <Badge className="bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 border-0 px-4 py-1.5 text-sm font-semibold">
                Em Breve
              </Badge>
              <h2 className="text-4xl font-bold text-foreground">
                Eduzão está chegando!
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Uma nova forma de aprender através de jogos educativos com inteligência artificial. 
                Prepare-se para uma experiência única de gamificação educacional.
              </p>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12">
            {features.map((feature, index) => (
              <Card key={index} className="border-2">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                      <feature.icon className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-foreground mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Preview Cards */}
          <div className="space-y-4 mt-12">
            <h3 className="text-xl font-bold text-center text-foreground mb-6">
              O que você poderá fazer
            </h3>
            
            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/10 border-purple-200/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="text-lg font-semibold text-foreground">Criar Lições Personalizadas</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Escolha qualquer matéria e tema que você queira estudar. A IA irá gerar exercícios personalizados 
                  especialmente para você, com diferentes níveis de dificuldade.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/10 border-amber-200/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="text-lg font-semibold text-foreground">Competir no Ranking</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Ganhe pontos a cada resposta correta e suba no ranking global. Veja como você se compara 
                  com outros estudantes e seja o melhor!
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/10 border-green-200/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="text-lg font-semibold text-foreground">Acompanhar Seu Progresso</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Veja estatísticas detalhadas do seu desempenho, taxa de acertos, temas dominados 
                  e áreas que precisam de mais atenção.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* CTA */}
          <Card className="bg-gradient-to-br from-purple-500 via-purple-600 to-pink-600 border-0 shadow-xl mt-12">
            <CardContent className="p-8 text-center">
              <Crown className="w-16 h-16 text-white/90 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-3">
                Fique de olho!
              </h3>
              <p className="text-white/90 mb-6 max-w-lg mx-auto">
                O Eduzão será lançado em breve. Será a ferramenta perfeita para você estudar de forma 
                divertida e eficiente. Aguarde mais novidades!
              </p>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => setLocation(`${basePath}/dashboard`)}
                className="bg-white text-purple-600 hover:bg-white/90 font-semibold"
                data-testid="button-back-dashboard"
              >
                Voltar ao Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
