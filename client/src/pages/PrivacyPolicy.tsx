import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicy() {
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
            <CardTitle className="text-3xl font-bold">Política de Privacidade LGPD</CardTitle>
            <p className="text-sm text-muted-foreground">
              Última atualização: 31 de outubro de 2025
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <section>
              <h2 className="text-2xl font-semibold mb-3">1. Informações do Controlador</h2>
              <p className="text-muted-foreground mb-2">
                <strong>Razão Social:</strong> EduTok Tecnologia Educacional
              </p>
              <p className="text-muted-foreground mb-2">
                <strong>CNPJ:</strong> 62.261.696/0001-67
              </p>
              <p className="text-muted-foreground mb-2">
                <strong>Endereço:</strong> Plataforma digital - Operação online em todo território brasileiro
              </p>
              <p className="text-muted-foreground mb-2">
                <strong>Email de Contato:</strong> privacidade@edutok.vuro.com.br
              </p>
              <p className="text-muted-foreground mb-2">
                <strong>Encarregado de Dados (DPO):</strong> dpo@edutok.vuro.com.br
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-3">2. Dados Pessoais Coletados</h2>
              <p className="text-muted-foreground mb-3">
                Coletamos os seguintes tipos de dados pessoais:
              </p>
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold mb-2">2.1 Dados de Cadastro</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                    <li>Nome completo</li>
                    <li>Endereço de e-mail</li>
                    <li>Número de telefone (opcional)</li>
                    <li>Foto de perfil (opcional)</li>
                    <li>Identificador único de usuário (UID)</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">2.2 Dados Acadêmicos</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                    <li>Turmas e séries matriculadas</li>
                    <li>Notas e avaliações</li>
                    <li>Trabalhos e tarefas enviadas</li>
                    <li>Materiais de estudo acessados</li>
                    <li>Eventos e calendário acadêmico</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">2.3 Dados de Comunicação</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                    <li>Mensagens em chats de turma</li>
                    <li>Mensagens diretas entre usuários</li>
                    <li>Conversas com professores</li>
                    <li>Comentários em vídeos educacionais</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">2.4 Dados de Conteúdo</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                    <li>Vídeos enviados para a plataforma EduTok</li>
                    <li>Curtidas e interações em conteúdos</li>
                    <li>Histórico de visualizações</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">2.5 Dados Técnicos</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                    <li>Endereço IP</li>
                    <li>Tipo de dispositivo e navegador</li>
                    <li>Cookies e identificadores de sessão</li>
                    <li>Logs de acesso e uso da plataforma</li>
                  </ul>
                </div>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-3">3. Finalidades do Tratamento</h2>
              <p className="text-muted-foreground mb-3">
                Utilizamos seus dados pessoais para as seguintes finalidades:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li><strong>Prestação de Serviços Educacionais:</strong> Permitir acesso à plataforma, gestão de turmas, acompanhamento acadêmico e comunicação entre alunos e professores</li>
                <li><strong>Melhorias na Plataforma:</strong> Análise de uso para aprimorar funcionalidades e experiência do usuário</li>
                <li><strong>Comunicações:</strong> Envio de notificações sobre atividades acadêmicas, avisos importantes e atualizações da plataforma</li>
                <li><strong>Segurança:</strong> Proteção contra fraudes, abusos e garantia da segurança dos usuários</li>
                <li><strong>Cumprimento Legal:</strong> Atendimento a obrigações legais e regulatórias</li>
                <li><strong>Assistência IA:</strong> Fornecimento de suporte educacional através de assistente inteligente</li>
              </ul>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-3">4. Base Legal do Tratamento</h2>
              <p className="text-muted-foreground mb-3">
                O tratamento de seus dados pessoais é fundamentado nas seguintes bases legais previstas na LGPD:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li><strong>Consentimento (Art. 7º, I):</strong> Para dados opcionais como telefone, foto de perfil, e cookies de analytics/marketing</li>
                <li><strong>Execução de Contrato (Art. 7º, V):</strong> Para prestação dos serviços educacionais contratados</li>
                <li><strong>Legítimo Interesse (Art. 7º, IX):</strong> Para segurança da plataforma, prevenção de fraudes e melhorias no serviço</li>
                <li><strong>Proteção da Vida (Art. 7º, VII):</strong> Em situações emergenciais envolvendo segurança de alunos</li>
              </ul>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-3">5. Compartilhamento de Dados</h2>
              <p className="text-muted-foreground mb-3">
                Seus dados podem ser compartilhados com:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li><strong>Professores e Gestores Escolares:</strong> Para gestão acadêmica e acompanhamento pedagógico</li>
                <li><strong>Firebase/Google Cloud:</strong> Provedor de infraestrutura e banco de dados (EUA - transferência baseada em Cláusulas Contratuais Padrão aprovadas pela ANPD)</li>
                <li><strong>Groq AI:</strong> Serviço de assistente inteligente (dados anonimizados quando possível)</li>
                <li><strong>Autoridades Competentes:</strong> Quando exigido por lei ou ordem judicial</li>
              </ul>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-3">6. Transferência Internacional de Dados</h2>
              <p className="text-muted-foreground mb-3">
                Alguns de nossos prestadores de serviço estão localizados fora do Brasil, especialmente nos Estados Unidos (Firebase, Groq). Estas transferências são realizadas com base em:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Cláusulas Contratuais Padrão (SCCs) aprovadas pela ANPD</li>
                <li>Certificações internacionais de proteção de dados</li>
                <li>Garantias contratuais de proteção equivalente aos padrões brasileiros</li>
              </ul>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-3">7. Período de Retenção</h2>
              <p className="text-muted-foreground mb-3">
                Mantemos seus dados pessoais pelos seguintes períodos:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li><strong>Dados de Cadastro:</strong> Enquanto sua conta estiver ativa + 5 anos após encerramento (obrigações legais)</li>
                <li><strong>Dados Acadêmicos:</strong> Durante o período letivo + 5 anos (documentação escolar)</li>
                <li><strong>Mensagens e Comunicações:</strong> 2 anos após o envio</li>
                <li><strong>Logs de Acesso:</strong> 6 meses (segurança e investigação de incidentes)</li>
                <li><strong>Dados com Consentimento:</strong> Até a revogação do consentimento pelo titular</li>
              </ul>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-3">8. Seus Direitos como Titular de Dados</h2>
              <p className="text-muted-foreground mb-3">
                De acordo com a LGPD (Art. 18), você possui os seguintes direitos:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li><strong>Confirmação e Acesso:</strong> Confirmar se tratamos seus dados e acessá-los</li>
                <li><strong>Correção:</strong> Solicitar correção de dados incompletos ou desatualizados</li>
                <li><strong>Anonimização ou Bloqueio:</strong> Solicitar anonimização ou bloqueio de dados desnecessários</li>
                <li><strong>Eliminação:</strong> Solicitar exclusão de dados tratados com seu consentimento</li>
                <li><strong>Portabilidade:</strong> Receber seus dados em formato estruturado e interoperável</li>
                <li><strong>Informação sobre Compartilhamento:</strong> Saber com quem compartilhamos seus dados</li>
                <li><strong>Revogação de Consentimento:</strong> Retirar consentimento a qualquer momento</li>
                <li><strong>Oposição:</strong> Opor-se ao tratamento realizado sem consentimento</li>
                <li><strong>Revisão de Decisões Automatizadas:</strong> Solicitar revisão humana de decisões automatizadas</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                <strong>Para exercer seus direitos, acesse:</strong>
              </p>
              <Link href="/meus-dados-lgpd">
                <Button variant="default" className="mt-2" data-testid="link-data-rights">
                  Portal de Direitos LGPD
                </Button>
              </Link>
              <p className="text-muted-foreground mt-4">
                Responderemos sua solicitação em até 15 dias corridos, conforme Art. 18, §3º da LGPD.
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-3">9. Segurança dos Dados</h2>
              <p className="text-muted-foreground mb-3">
                Implementamos medidas técnicas e organizacionais para proteção de seus dados:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Criptografia de dados em trânsito (HTTPS/TLS)</li>
                <li>Criptografia de dados em repouso no Firebase</li>
                <li>Autenticação robusta com Firebase Authentication</li>
                <li>Controles de acesso baseados em funções</li>
                <li>Monitoramento de segurança e logs de auditoria</li>
                <li>Backups regulares e planos de recuperação</li>
                <li>Treinamento de equipe em proteção de dados</li>
              </ul>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-3">10. Incidentes de Segurança</h2>
              <p className="text-muted-foreground">
                Em caso de incidente de segurança que possa acarretar risco ou dano relevante aos titulares, comunicaremos à Autoridade Nacional de Proteção de Dados (ANPD) e aos usuários afetados em prazo razoável, conforme Art. 48 da LGPD, incluindo:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mt-3">
                <li>Descrição do incidente</li>
                <li>Dados afetados</li>
                <li>Medidas técnicas de proteção utilizadas</li>
                <li>Riscos aos titulares</li>
                <li>Medidas adotadas para reversão ou mitigação</li>
              </ul>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-3">11. Uso de Cookies</h2>
              <p className="text-muted-foreground mb-3">
                Utilizamos cookies e tecnologias similares para:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li><strong>Cookies Essenciais:</strong> Necessários para funcionamento da plataforma (autenticação, segurança)</li>
                <li><strong>Cookies de Funcionalidade:</strong> Preferências de idioma, tema e configurações</li>
                <li><strong>Cookies de Analytics:</strong> Análise de uso e melhorias (requer consentimento)</li>
                <li><strong>Cookies de Marketing:</strong> Comunicações personalizadas (requer consentimento)</li>
              </ul>
              <p className="text-muted-foreground mt-3">
                Você pode gerenciar suas preferências de cookies através do banner de consentimento ou nas configurações do navegador.
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-3">12. Dados de Menores</h2>
              <p className="text-muted-foreground">
                Por se tratar de plataforma educacional, coletamos dados de menores de idade. O tratamento é realizado:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mt-3">
                <li>Com consentimento específico de pelo menos um dos pais ou responsável legal</li>
                <li>No melhor interesse da criança/adolescente</li>
                <li>Com medidas de segurança reforçadas</li>
                <li>Sem compartilhamento para fins publicitários</li>
              </ul>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-3">13. Alterações nesta Política</h2>
              <p className="text-muted-foreground">
                Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos sobre alterações significativas através de:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mt-3">
                <li>Aviso na plataforma</li>
                <li>Email para usuários cadastrados</li>
                <li>Atualização da data no topo deste documento</li>
              </ul>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-3">14. Contato</h2>
              <p className="text-muted-foreground mb-3">
                Para dúvidas, solicitações ou exercício de direitos relacionados a dados pessoais:
              </p>
              <div className="bg-card p-4 rounded-lg border">
                <p className="text-muted-foreground mb-2">
                  <strong>Encarregado de Proteção de Dados (DPO):</strong>
                </p>
                <p className="text-muted-foreground mb-1">Email: dpo@edutok.vuro.com.br</p>
                <p className="text-muted-foreground mb-1">Telefone: +55 (31) 97322-1932</p>
                <p className="text-muted-foreground">Horário de atendimento: Segunda a Sexta, 9h às 18h</p>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-3">15. Autoridade Nacional de Proteção de Dados (ANPD)</h2>
              <p className="text-muted-foreground">
                Caso não fique satisfeito com nossas respostas, você pode contatar a ANPD:
              </p>
              <div className="bg-card p-4 rounded-lg border mt-3">
                <p className="text-muted-foreground mb-1">Site: https://www.gov.br/anpd/</p>
                <p className="text-muted-foreground">Email: atendimento@anpd.gov.br</p>
              </div>
            </section>

            <div className="mt-8 p-4 bg-primary/10 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Esta Política de Privacidade está em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018) e demais normas aplicáveis.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
