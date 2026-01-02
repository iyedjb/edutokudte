import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";
import { X, Cookie, Shield, Sparkles, BarChart3 } from "lucide-react";
import { useAuth } from "@/lib/useAuth";

interface ConsentPreferences {
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
  timestamp: number;
}

let reopenCookieConsentCallback: (() => void) | null = null;

export function reopenCookieConsent() {
  if (reopenCookieConsentCallback) {
    reopenCookieConsentCallback();
  }
}

export function CookieConsent() {
  const { user } = useAuth();
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<ConsentPreferences>({
    analytics: false,
    marketing: false,
    functional: true,
    timestamp: Date.now(),
  });

  useEffect(() => {
    reopenCookieConsentCallback = () => {
      const consent = localStorage.getItem("lgpd_cookie_consent");
      if (consent) {
        try {
          const saved = JSON.parse(consent) as ConsentPreferences;
          setPreferences(saved);
        } catch (e) {
          console.error("Error parsing saved consent:", e);
        }
      }
      setShowBanner(true);
      setShowDetails(false);
    };

    return () => {
      reopenCookieConsentCallback = null;
    };
  }, []);

  useEffect(() => {
    const consent = localStorage.getItem("lgpd_cookie_consent");
    if (!consent && user) {
      setTimeout(() => setShowBanner(true), 1000);
    }
  }, [user]);

  const saveConsent = async (prefs: ConsentPreferences) => {
    const consentData = {
      ...prefs,
      timestamp: Date.now(),
    };

    localStorage.setItem("lgpd_cookie_consent", JSON.stringify(consentData));

    try {
      if (user) {
        const { getAuth } = await import("firebase/auth");
        const auth = getAuth();
        const idToken = await auth.currentUser?.getIdToken();
        
        if (idToken) {
          await fetch("/api/consent", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${idToken}`
            },
            body: JSON.stringify(consentData),
          });
        }
      }
    } catch (error) {
      console.error("Erro ao salvar consentimento:", error);
    }

    setShowBanner(false);
  };

  const acceptAll = () => {
    saveConsent({
      analytics: true,
      marketing: true,
      functional: true,
      timestamp: Date.now(),
    });
  };

  const acceptEssential = () => {
    saveConsent({
      analytics: false,
      marketing: false,
      functional: true,
      timestamp: Date.now(),
    });
  };

  const saveCustom = () => {
    saveConsent(preferences);
  };

  if (!showBanner) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4 animate-in fade-in duration-300"
      data-testid="cookie-consent-backdrop"
    >
      <Card className="w-full max-w-lg p-0 relative overflow-hidden border-0 shadow-2xl animate-in slide-in-from-bottom-4 zoom-in-95 duration-500 rounded-2xl">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#4FC3F7] via-[#29B6F6] to-[#03A9F4]"></div>
        
        {/* Content */}
        <div className="relative z-10 p-6">
          <button
            onClick={() => setShowBanner(false)}
            className="absolute top-3 right-3 text-white/80 hover:text-white transition-colors rounded-full p-1"
            data-testid="button-close-consent"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              {/* Cookie Icon */}
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Cookie className="w-7 h-7 text-white" />
                </div>
              </div>
              
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white mb-1.5">
                  Cookies e Privacidade
                </h2>
                <p className="text-white/90 text-sm leading-relaxed">
                  Usamos cookies e tecnologias similares para melhorar sua experiência, analisar o uso da plataforma e personalizar conteúdo. 
                  De acordo com a LGPD, precisamos do seu consentimento explícito para cookies não essenciais.
                </p>
              </div>
            </div>

          {showDetails && (
            <>
              <Separator className="bg-white/30" />
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/10 backdrop-blur-sm">
                  <div className="space-y-0.5 flex-1 pr-4">
                    <Label htmlFor="functional-cookies" className="font-medium text-white text-sm flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Cookies Funcionais (Essenciais)
                    </Label>
                    <p className="text-xs text-white/80">
                      Necessários para o funcionamento básico da plataforma.
                    </p>
                  </div>
                  <Switch
                    id="functional-cookies"
                    checked={true}
                    disabled={true}
                    data-testid="switch-functional-cookies"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-white/10 backdrop-blur-sm">
                  <div className="space-y-0.5 flex-1 pr-4">
                    <Label htmlFor="analytics-cookies" className="font-medium text-white text-sm flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Cookies de Analytics
                    </Label>
                    <p className="text-xs text-white/80">
                      Ajudam-nos a melhorar os serviços. Dados anonimizados.
                    </p>
                  </div>
                  <Switch
                    id="analytics-cookies"
                    checked={preferences.analytics}
                    onCheckedChange={(checked) =>
                      setPreferences({ ...preferences, analytics: checked })
                    }
                    data-testid="switch-analytics-cookies"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-white/10 backdrop-blur-sm">
                  <div className="space-y-0.5 flex-1 pr-4">
                    <Label htmlFor="marketing-cookies" className="font-medium text-white text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Cookies de Marketing
                    </Label>
                    <p className="text-xs text-white/80">
                      Conteúdos personalizados relevantes para você.
                    </p>
                  </div>
                  <Switch
                    id="marketing-cookies"
                    checked={preferences.marketing}
                    onCheckedChange={(checked) =>
                      setPreferences({ ...preferences, marketing: checked })
                    }
                    data-testid="switch-marketing-cookies"
                  />
                </div>
              </div>
            </>
          )}

          <Separator className="bg-white/30" />

          <div className="flex flex-col gap-2">
            {!showDetails ? (
              <>
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-white/30 rounded-xl blur opacity-50 group-hover:opacity-70 transition-all"></div>
                  <Button
                    onClick={acceptAll}
                    className="relative w-full h-11 bg-white text-[#03A9F4] hover:bg-white/95 font-semibold shadow-lg transition-all"
                    data-testid="button-accept-all"
                  >
                    <Cookie className="w-4 h-4 mr-2" />
                    Aceitar Todos
                  </Button>
                </div>
                <Button
                  onClick={acceptEssential}
                  variant="ghost"
                  className="w-full h-10 text-white hover:bg-white/10"
                  data-testid="button-accept-essential"
                >
                  Apenas Essenciais
                </Button>
                <Button
                  onClick={() => setShowDetails(true)}
                  variant="ghost"
                  className="w-full h-10 text-white hover:bg-white/10"
                  data-testid="button-customize"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Personalizar
                </Button>
              </>
            ) : (
              <>
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-white/30 rounded-xl blur opacity-50 group-hover:opacity-70 transition-all"></div>
                  <Button
                    onClick={saveCustom}
                    className="relative w-full h-11 bg-white text-[#03A9F4] hover:bg-white/95 font-semibold shadow-lg transition-all"
                    data-testid="button-save-preferences"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Salvar Preferências
                  </Button>
                </div>
                <Button
                  onClick={acceptAll}
                  variant="ghost"
                  className="w-full h-10 text-white hover:bg-white/10"
                  data-testid="button-accept-all-detailed"
                >
                  Aceitar Todos
                </Button>
              </>
            )}
          </div>

          <p className="text-xs text-white/90 text-center leading-relaxed">
            Ao continuar, você concorda com nossos{" "}
            <Link href="/terms-of-service" className="text-white hover:underline font-semibold" data-testid="link-terms">
              Termos de Uso
            </Link>{" "}
            e{" "}
            <Link href="/privacy-policy" className="text-white hover:underline font-semibold" data-testid="link-privacy">
              Política de Privacidade
            </Link>
            . Você pode alterar suas preferências a qualquer momento.
          </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
