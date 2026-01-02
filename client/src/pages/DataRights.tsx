import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";
import { ArrowLeft, Download, Trash2, FileText, AlertCircle, CheckCircle2, Cookie } from "lucide-react";
import { useAuth } from "@/lib/useAuth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { reopenCookieConsent } from "@/components/CookieConsent";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function DataRights() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleExportData = async () => {
    if (!user) return;

    setIsExporting(true);
    setExportSuccess(false);

    try {
      const { getAuth } = await import("firebase/auth");
      const auth = getAuth();
      const idToken = await auth.currentUser?.getIdToken();

      if (!idToken) {
        throw new Error("Autenticação necessária");
      }

      const response = await fetch("/api/lgpd/export-data", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) throw new Error("Erro ao exportar dados");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `meus-dados-edutok-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setExportSuccess(true);
      toast({
        title: "Dados exportados com sucesso!",
        description: "Seus dados foram baixados em formato JSON.",
      });
    } catch (error) {
      toast({
        title: "Erro ao exportar dados",
        description: "Por favor, tente novamente ou entre em contato com o suporte.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    setIsDeleting(true);

    try {
      const { getAuth } = await import("firebase/auth");
      const auth = getAuth();
      const idToken = await auth.currentUser?.getIdToken();

      if (!idToken) {
        throw new Error("Autenticação necessária");
      }

      const response = await fetch("/api/lgpd/delete-account", {
        method: "DELETE",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) throw new Error("Erro ao excluir conta");

      toast({
        title: "Solicitação de exclusão enviada",
        description: "Sua conta será excluída em até 15 dias. Você receberá uma confirmação por email.",
      });

      setTimeout(() => {
        window.location.href = "/";
      }, 3000);
    } catch (error) {
      toast({
        title: "Erro ao processar solicitação",
        description: "Por favor, tente novamente ou entre em contato com o suporte.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!user) {
    return (
      <div className="bg-background p-4 flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acesso Restrito</CardTitle>
            <CardDescription>
              Você precisa estar autenticado para acessar esta página.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button className="w-full" data-testid="button-go-home">Ir para Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/">
          <Button variant="ghost" className="mb-4" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Meus Dados e Direitos LGPD</CardTitle>
            <CardDescription>
              Gerencie seus dados pessoais e exerça seus direitos conforme a Lei Geral de Proteção de Dados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                De acordo com o Art. 18 da LGPD, você tem direito a acessar, corrigir, exportar e excluir seus dados pessoais. 
                Todas as solicitações serão processadas em até 15 dias corridos.
              </AlertDescription>
            </Alert>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">Seus Dados Pessoais</h2>
              <div className="bg-card p-4 rounded-lg border space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nome:</span>
                  <span className="font-medium">{user.displayName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium">{user.email}</span>
                </div>
                {user.phone && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Telefone:</span>
                    <span className="font-medium">{user.phone}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ID de Usuário:</span>
                  <span className="font-medium text-xs">{user.uid}</span>
                </div>
                {user.grade && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Série:</span>
                    <span className="font-medium">{user.grade}</span>
                  </div>
                )}
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">Direitos do Titular</h2>
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-primary mt-1" />
                      <div className="flex-1">
                        <CardTitle className="text-lg">1. Acesso aos Dados</CardTitle>
                        <CardDescription className="mt-1">
                          Confirme quais dados pessoais tratamos sobre você
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      A seção "Seus Dados Pessoais" acima mostra as informações básicas. Para um relatório completo 
                      incluindo mensagens, notas, e atividades, use a exportação de dados.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <Cookie className="w-5 h-5 text-primary mt-1" />
                      <div className="flex-1">
                        <CardTitle className="text-lg">2. Gerenciar Cookies</CardTitle>
                        <CardDescription className="mt-1">
                          Revise e altere suas preferências de cookies
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      Você pode revisar e modificar suas preferências de cookies a qualquer momento. 
                      Isso inclui cookies de analytics e marketing.
                    </p>
                    <Button
                      onClick={reopenCookieConsent}
                      variant="outline"
                      className="w-full sm:w-auto"
                      data-testid="button-manage-cookies"
                    >
                      <Cookie className="w-4 h-4 mr-2" />
                      Gerenciar Preferências de Cookies
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <Download className="w-5 h-5 text-primary mt-1" />
                      <div className="flex-1">
                        <CardTitle className="text-lg">3. Portabilidade de Dados</CardTitle>
                        <CardDescription className="mt-1">
                          Baixe todos os seus dados em formato JSON estruturado
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      Você receberá um arquivo contendo: perfil, mensagens, notas, vídeos enviados, 
                      comentários, atividades e todo o histórico acadêmico.
                    </p>
                    <Button
                      onClick={handleExportData}
                      disabled={isExporting}
                      className="w-full sm:w-auto"
                      data-testid="button-export-data"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {isExporting ? "Exportando..." : "Exportar Meus Dados"}
                    </Button>
                    {exportSuccess && (
                      <div className="flex items-center gap-2 mt-3 text-sm text-green-600">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Download iniciado com sucesso!</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <Trash2 className="w-5 h-5 text-destructive mt-1" />
                      <div className="flex-1">
                        <CardTitle className="text-lg">4. Exclusão de Dados</CardTitle>
                        <CardDescription className="mt-1">
                          Solicite a exclusão permanente de sua conta e dados
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Alert className="mb-3">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        <strong>ATENÇÃO:</strong> Esta ação é irreversível. Todos os seus dados (mensagens, notas, 
                        vídeos, atividades) serão permanentemente excluídos após 15 dias. Alguns dados podem ser 
                        retidos por obrigações legais.
                      </AlertDescription>
                    </Alert>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          className="w-full sm:w-auto"
                          data-testid="button-delete-account"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir Minha Conta
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                          <AlertDialogDescription className="space-y-2">
                            <p>
                              Esta ação não pode ser desfeita. Isso irá permanentemente excluir sua conta e 
                              remover seus dados de nossos servidores.
                            </p>
                            <p className="font-semibold">
                              Você perderá acesso a:
                            </p>
                            <ul className="list-disc list-inside text-sm space-y-1 ml-2">
                              <li>Todas as suas mensagens e conversas</li>
                              <li>Histórico de notas e avaliações</li>
                              <li>Vídeos enviados e comentários</li>
                              <li>Materiais de estudo salvos</li>
                              <li>Configurações e preferências</li>
                            </ul>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteAccount}
                            disabled={isDeleting}
                            className="bg-destructive hover:bg-destructive/90"
                            data-testid="button-confirm-delete"
                          >
                            {isDeleting ? "Processando..." : "Sim, Excluir Permanentemente"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardContent>
                </Card>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">Outros Direitos</h2>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Correção de Dados</h3>
                  <p>
                    Para corrigir informações incorretas ou desatualizadas, acesse seu Perfil na plataforma 
                    ou entre em contato com o suporte.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Revogação de Consentimento</h3>
                  <p>
                    Você pode revogar consentimentos para cookies não essenciais através do botão 
                    "Gerenciar Preferências de Cookies" acima ou entrando em contato com o DPO.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Informações sobre Compartilhamento</h3>
                  <p>
                    Para saber com quem compartilhamos seus dados, consulte nossa{" "}
                    <Link href="/privacy-policy">
                      <a className="text-primary hover:underline" data-testid="link-privacy-policy">
                        Política de Privacidade
                      </a>
                    </Link>
                    .
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Revisão de Decisões Automatizadas</h3>
                  <p>
                    Se você discordar de alguma decisão automatizada (como recomendações de conteúdo), 
                    pode solicitar revisão humana através do suporte.
                  </p>
                </div>
              </div>
            </section>

            <Separator />

            <section className="bg-card p-4 rounded-lg border">
              <h3 className="font-semibold mb-2">Precisa de Ajuda?</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Entre em contato com nosso Encarregado de Proteção de Dados (DPO):
              </p>
              <div className="space-y-1 text-sm">
                <p className="text-muted-foreground">
                  <strong>Email:</strong> dpo@edutok.vuro.com.br
                </p>
                <p className="text-muted-foreground">
                  <strong>Prazo de resposta:</strong> Até 15 dias corridos
                </p>
              </div>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
