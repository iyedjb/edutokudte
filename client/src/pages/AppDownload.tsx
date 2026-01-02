import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Download, 
  Smartphone, 
  Check, 
  Star,
  Shield,
  Zap,
  ArrowLeft
} from "lucide-react";
import { useLocation } from "wouter";

export default function AppDownload() {
  const [, setLocation] = useLocation();

  const features = [
    {
      icon: Zap,
      title: "Acesso Offline",
      description: "Use o app mesmo sem internet"
    },
    {
      icon: Shield,
      title: "Seguro e Privado",
      description: "Seus dados protegidos"
    },
    {
      icon: Star,
      title: "Experiência Nativa",
      description: "Interface otimizada para mobile"
    }
  ];

  const handleDownload = () => {
    // Create a link element and trigger download
    const link = document.createElement('a');
    link.href = 'https://github.com/edunaapp/eduna-android/releases/latest/download/eduna.apk';
    link.download = 'eduna.apk';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50 via-blue-50/30 to-background">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-border/50 sticky top-0 z-40">
        <div className="max-w-screen-xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/dashboard")}
              className="hover-elevate active-elevate-2"
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">Download do App</h1>
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-cyan-500 to-blue-500 rounded-3xl flex items-center justify-center shadow-xl">
            <Smartphone className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-foreground">
            Eduna para Android
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Baixe nosso app e tenha acesso completo a todas as funcionalidades diretamente do seu celular
          </p>
        </div>

        {/* Download Card */}
        <Card className="bg-gradient-to-br from-cyan-500 to-blue-500 border-none shadow-xl max-w-md mx-auto">
          <CardContent className="p-8 text-center space-y-4">
            <div className="space-y-2">
              <p className="text-white/90 text-sm font-medium">Versão Atual</p>
              <p className="text-white text-4xl font-bold">1.0.0</p>
              <p className="text-white/80 text-sm">Compatível com Android 7.0+</p>
            </div>
            
            <Button
              onClick={handleDownload}
              size="lg"
              className="w-full bg-white text-cyan-600 hover:bg-gray-50 font-bold text-lg h-14"
              data-testid="button-download-apk"
            >
              <Download className="w-5 h-5 mr-2" />
              Baixar APK
            </Button>
            
            <p className="text-white/70 text-xs">
              Tamanho: ~15MB
            </p>
          </CardContent>
        </Card>

        {/* Features */}
        <div className="space-y-4 max-w-md mx-auto">
          <h3 className="text-lg font-semibold text-center text-foreground">
            Por que baixar o app?
          </h3>
          <div className="space-y-3">
            {features.map((feature, index) => (
              <Card key={index} className="bg-white/60 backdrop-blur-sm border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-900/20 flex items-center justify-center flex-shrink-0">
                      <feature.icon className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground mb-1">
                        {feature.title}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Installation Steps */}
        <div className="space-y-4 max-w-md mx-auto">
          <h3 className="text-lg font-semibold text-center text-foreground">
            Como instalar
          </h3>
          <Card className="bg-white/60 backdrop-blur-sm border-border/50">
            <CardContent className="p-6 space-y-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                  1
                </div>
                <div>
                  <p className="font-medium text-foreground">Permita fontes desconhecidas</p>
                  <p className="text-sm text-muted-foreground">
                    Vá em Configurações {'>'} Segurança e ative "Fontes desconhecidas"
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                  2
                </div>
                <div>
                  <p className="font-medium text-foreground">Baixe o APK</p>
                  <p className="text-sm text-muted-foreground">
                    Clique no botão acima para fazer o download
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                  3
                </div>
                <div>
                  <p className="font-medium text-foreground">Instale o app</p>
                  <p className="text-sm text-muted-foreground">
                    Abra o arquivo baixado e siga as instruções de instalação
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Security Note */}
        <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-200/50 max-w-md mx-auto">
          <CardContent className="p-6">
            <div className="flex gap-3">
              <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  Segurança e Privacidade
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Este APK é oficial e seguro. Sempre baixe apenas através deste site oficial para garantir sua segurança.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
