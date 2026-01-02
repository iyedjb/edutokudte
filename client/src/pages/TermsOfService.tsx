import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TermsOfService() {
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
            <CardTitle className="text-3xl font-bold">Termos de Uso</CardTitle>
            <p className="text-sm text-muted-foreground">
              Última atualização: 31 de outubro de 2025
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <section>
              <h2 className="text-2xl font-semibold mb-3">1. Aceitação dos Termos</h2>
              <p className="text-muted-foreground">
                Ao acessar e usar a plataforma EduTok, você concorda com estes Termos de Uso e nossa Política de Privacidade. Se você não concordar com qualquer parte destes termos, não deve usar nossos serviços.
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-3">2. Descrição do Serviço</h2>
              <p className="text-muted-foreground mb-3">
                O EduTok é uma plataforma educacional que oferece:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Gestão de tarefas e atividades escolares</li>
                <li>Biblioteca digital de materiais de estudo</li>
                <li>Calendário acadêmico e eventos</li>
                <li>Sistema de comunicação entre alunos e professores</li>
                <li>Feed de vídeos educacionais (EduTok)</li>
                <li>Acompanhamento de notas e desempenho</li>
                <li>Assistente inteligente para suporte educacional</li>
              </ul>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-3">3. Cadastro e Conta de Usuário</h2>
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold mb-2">3.1 Requisitos de Cadastro</h3>
                  <p className="text-muted-foreground">
                    Para usar nossa plataforma, você deve criar uma conta fornecendo informações verdadeiras, precisas e completas. Para menores de 18 anos, é necessário consentimento de pais ou responsáveis legais.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">3.2 Responsabilidade pela Conta</h3>
                  <p className="text-muted-foreground">
                    Você é responsável por manter a confidencialidade de sua senha e por todas as atividades realizadas em sua conta. Notifique-nos imediatamente sobre qualquer uso não autorizado.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">3.3 Suspensão e Encerramento</h3>
                  <p className="text-muted-foreground">
                    Reservamo-nos o direito de suspender ou encerrar contas que violem estes termos ou apresentem comportamento inadequado.
                  </p>
                </div>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-3">4. Uso Aceitável</h2>
              <p className="text-muted-foreground mb-3">
                Ao usar o EduTok, você concorda em NÃO:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Publicar conteúdo ilegal, ofensivo, difamatório ou inadequado</li>
                <li>Assediar, intimidar ou ameaçar outros usuários</li>
                <li>Compartilhar informações falsas ou enganosas</li>
                <li>Violar direitos autorais ou propriedade intelectual de terceiros</li>
                <li>Tentar acessar áreas restritas ou contas de outros usuários</li>
                <li>Distribuir vírus, malware ou códigos maliciosos</li>
                <li>Usar a plataforma para fins comerciais não autorizados</li>
                <li>Fazer engenharia reversa ou tentar extrair código-fonte</li>
                <li>Coletar dados de outros usuários sem consentimento</li>
              </ul>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-3">5. Conteúdo do Usuário</h2>
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold mb-2">5.1 Propriedade</h3>
                  <p className="text-muted-foreground">
                    Você mantém todos os direitos sobre o conteúdo que envia (vídeos, mensagens, trabalhos). Ao publicar conteúdo, você nos concede uma licença não exclusiva, mundial e gratuita para hospedar, armazenar, reproduzir e exibir esse conteúdo na plataforma.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">5.2 Responsabilidade pelo Conteúdo</h3>
                  <p className="text-muted-foreground">
                    Você é o único responsável pelo conteúdo que publica. Não revisamos todo o conteúdo enviado, mas podemos removê-lo se violar estes termos.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">5.3 Moderação</h3>
                  <p className="text-muted-foreground">
                    Reservamo-nos o direito de moderar, remover ou restringir qualquer conteúdo que viole nossas diretrizes, mesmo sem aviso prévio.
                  </p>
                </div>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-3">6. Propriedade Intelectual</h2>
              <p className="text-muted-foreground">
                Todos os direitos de propriedade intelectual sobre a plataforma EduTok, incluindo design, código, marca e conteúdo original, pertencem ao EduTok. Você não pode copiar, modificar, distribuir ou criar trabalhos derivados sem autorização expressa.
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-3">7. Privacidade e Proteção de Dados</h2>
              <p className="text-muted-foreground mb-3">
                O tratamento de seus dados pessoais é regido por nossa Política de Privacidade, em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
              </p>
              <Link href="/privacy-policy">
                <Button variant="outline" className="mt-2" data-testid="link-privacy-policy">
                  Ver Política de Privacidade
                </Button>
              </Link>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-3">8. Disponibilidade do Serviço</h2>
              <p className="text-muted-foreground">
                Nos esforçamos para manter a plataforma disponível 24/7, mas não garantimos disponibilidade ininterrupta. Podemos realizar manutenções programadas ou enfrentar interrupções técnicas. Não nos responsabilizamos por perdas decorrentes de indisponibilidade.
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-3">9. Limitação de Responsabilidade</h2>
              <p className="text-muted-foreground mb-3">
                O EduTok é fornecido "como está". Na máxima extensão permitida por lei:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Não garantimos que o serviço será livre de erros ou ininterrupto</li>
                <li>Não nos responsabilizamos por conteúdo publicado por usuários</li>
                <li>Não garantimos resultados acadêmicos específicos</li>
                <li>Não nos responsabilizamos por perdas de dados devido a problemas técnicos</li>
                <li>Nossa responsabilidade máxima é limitada ao valor pago pelos serviços nos últimos 12 meses</li>
              </ul>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-3">10. Indenização</h2>
              <p className="text-muted-foreground">
                Você concorda em indenizar e isentar o EduTok, seus diretores, funcionários e parceiros de quaisquer reclamações, danos ou despesas (incluindo honorários advocatícios) decorrentes de:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mt-3">
                <li>Seu uso da plataforma</li>
                <li>Violação destes Termos de Uso</li>
                <li>Conteúdo que você publicar</li>
                <li>Violação de direitos de terceiros</li>
              </ul>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-3">11. Modificações nos Termos</h2>
              <p className="text-muted-foreground">
                Podemos modificar estes Termos de Uso a qualquer momento. Alterações significativas serão comunicadas através de aviso na plataforma ou por email. O uso continuado após as alterações constitui aceitação dos novos termos.
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-3">12. Rescisão</h2>
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold mb-2">12.1 Por Você</h3>
                  <p className="text-muted-foreground">
                    Você pode encerrar sua conta a qualquer momento através das configurações ou solicitando ao suporte.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">12.2 Por Nós</h3>
                  <p className="text-muted-foreground">
                    Podemos suspender ou encerrar sua conta por violação destes termos, comportamento inadequado ou por qualquer motivo, com ou sem aviso prévio.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">12.3 Efeitos da Rescisão</h3>
                  <p className="text-muted-foreground">
                    Após o encerramento, você perde o acesso à plataforma. Podemos reter certos dados conforme obrigações legais descritas na Política de Privacidade.
                  </p>
                </div>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-3">13. Lei Aplicável e Foro</h2>
              <p className="text-muted-foreground">
                Estes Termos de Uso são regidos pelas leis da República Federativa do Brasil. Qualquer disputa será resolvida no foro da comarca de [CIDADE], com exclusão de qualquer outro, por mais privilegiado que seja.
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-3">14. Disposições Gerais</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Se qualquer disposição destes termos for considerada inválida, as demais permanecerão em vigor</li>
                <li>Nossa falha em fazer cumprir qualquer direito não constitui renúncia</li>
                <li>Você não pode transferir seus direitos sob estes termos sem nossa autorização</li>
                <li>Estes termos constituem o acordo completo entre você e o EduTok</li>
              </ul>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-3">15. Contato</h2>
              <p className="text-muted-foreground mb-3">
                Para dúvidas sobre estes Termos de Uso:
              </p>
              <div className="bg-card p-4 rounded-lg border">
                <p className="text-muted-foreground mb-1">Email: suporte@edutok.vuro.com.br</p>
                <p className="text-muted-foreground mb-1">Telefone: +55 (31) 97322-1932</p>
                <p className="text-muted-foreground">Horário: Segunda a Sexta, 9h às 18h</p>
              </div>
            </section>

            <div className="mt-8 p-4 bg-primary/10 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Ao usar o EduTok, você confirma que leu, compreendeu e concorda com estes Termos de Uso e nossa Política de Privacidade.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
