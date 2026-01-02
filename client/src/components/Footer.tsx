import { Link } from "wouter";
import { Separator } from "@/components/ui/separator";

export function Footer() {
  return (
    <footer className="bg-card border-t mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="font-semibold text-lg mb-3">EduTok</h3>
            <p className="text-sm text-muted-foreground">
              Plataforma educacional moderna para o ensino fundamental e médio.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-3">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/privacy-policy">
                  <span className="text-muted-foreground hover:text-primary cursor-pointer" data-testid="link-footer-privacy">
                    Política de Privacidade
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/terms-of-service">
                  <span className="text-muted-foreground hover:text-primary cursor-pointer" data-testid="link-footer-terms">
                    Termos de Uso
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/meus-dados-lgpd">
                  <span className="text-muted-foreground hover:text-primary cursor-pointer" data-testid="link-footer-data-rights">
                    Meus Dados (LGPD)
                  </span>
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-3">Proteção de Dados</h3>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong>Encarregado de Dados (DPO)</strong>
              </p>
              <p>Email: dpo@edutok.vuro.com.br</p>
              <p>Telefone: +55 (31) 97322-1932</p>
              <p className="text-xs mt-3">
                Em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018)
              </p>
            </div>
          </div>
        </div>

        <Separator className="mb-6" />

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>© 2025 EduTok. Todos os direitos reservados.</p>
          <p>
            <a 
              href="https://www.gov.br/anpd/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-primary"
              data-testid="link-anpd"
            >
              ANPD - Autoridade Nacional de Proteção de Dados
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
