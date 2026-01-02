import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  Code2,
  ArrowLeft,
  Sparkles,
  Shield,
  Zap,
  Clock,
  Eye,
  EyeOff,
  BarChart3,
  TrendingUp,
  Coins,
  Activity,
  RefreshCw,
  Download,
  Terminal,
  FileCode,
  Blocks,
  Globe,
  BookOpen,
  Play,
  ExternalLink,
  Package,
  FileText,
  Braces,
  Webhook,
  Settings,
  Rocket,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { SiReact, SiNodedotjs, SiPython, SiTypescript, SiJavascript, SiHtml5 } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { queryClient } from "@/lib/queryClient";
import { auth } from "@/lib/firebase";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Area,
  AreaChart,
} from "recharts";

interface ApiKey {
  id: string;
  name: string;
  createdAt: number;
  lastUsedAt?: number;
  usageCount: number;
  rateLimit: number;
  dailyTokenLimit: number;
  tokensUsedToday: number;
  totalTokensUsed: number;
  active: boolean;
  revokedAt?: number;
}

interface DailyAnalytics {
  date: string;
  requestCount: number;
  successCount: number;
  errorCount: number;
  tokensUsed: number;
  estimatedCostUsd: number;
  avgLatencyMs: number;
}

interface AnalyticsResponse {
  success: boolean;
  keyId: string;
  keyName: string;
  dailyTokenLimit: number;
  tokensUsedToday: number;
  totalTokensUsed: number;
  dailyAnalytics: DailyAnalytics[];
  totals: {
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    successRate: number;
    avgLatency: number;
  };
  recentLogs: any[];
}

interface NewKeyResponse {
  success: boolean;
  key: {
    id: string;
    apiKey: string;
    name: string;
    createdAt: number;
    rateLimit: number;
    dailyTokenLimit: number;
  };
  warning: string;
}

const CODE_EXAMPLES = {
  html: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Meu Site com Eduna AI</title>
</head>
<body>
  <h1>Bem-vindo</h1>
  
  <!-- Eduna Chat Widget -->
  <script src="https://edutok.replit.app/sdk/eduna-widget.js"></script>
  <script>
    EdunaAI.init({
      apiKey: 'SUA_CHAVE_API_AQUI',
      position: 'bottom-right',
      theme: 'auto'
    });
  </script>
</body>
</html>`,
  javascript: `// Usar a API HTTP diretamente
const API_KEY = 'SUA_CHAVE_API_AQUI';
const BASE_URL = 'https://edutok.replit.app/api/sdk';

async function perguntar(mensagem) {
  const response = await fetch(\`\${BASE_URL}/chat\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${API_KEY}\`
    },
    body: JSON.stringify({ message: mensagem })
  });
  
  const data = await response.json();
  return data.message;
}

// Exemplo de uso
perguntar('Explique fotossíntese de forma simples')
  .then(resposta => console.log(resposta));`,
  react: `import { useState } from 'react';

const API_KEY = 'SUA_CHAVE_API_AQUI';

function EdunaChat() {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const res = await fetch('https://edutok.replit.app/api/sdk/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${API_KEY}\`
      },
      body: JSON.stringify({ message })
    });
    
    const data = await res.json();
    setResponse(data.message);
    setLoading(false);
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input 
          value={message} 
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Pergunte algo..."
        />
        <button disabled={loading}>
          {loading ? 'Pensando...' : 'Enviar'}
        </button>
      </form>
      {response && <p>{response}</p>}
    </div>
  );
}`,
  nodejs: `// Node.js - Usar a API HTTP diretamente
const API_KEY = process.env.EDUNA_API_KEY;

async function chat(mensagem) {
  const response = await fetch('https://edutok.replit.app/api/sdk/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${API_KEY}\`
    },
    body: JSON.stringify({ message: mensagem })
  });
  
  return await response.json();
}

async function getUsage() {
  const response = await fetch('https://edutok.replit.app/api/sdk/usage', {
    headers: { 'Authorization': \`Bearer \${API_KEY}\` }
  });
  return await response.json();
}

// Exemplo de uso
async function main() {
  const resposta = await chat('Qual é a capital do Brasil?');
  console.log(resposta.message);
  
  const uso = await getUsage();
  console.log(\`Tokens: \${uso.tokensUsedToday}/\${uso.dailyTokenLimit}\`);
}

main();`,
  python: `import requests
import os

API_KEY = os.getenv('EDUNA_API_KEY')
BASE_URL = 'https://edutok.replit.app/api/sdk'

def chat(mensagem):
    response = requests.post(
        f'{BASE_URL}/chat',
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {API_KEY}'
        },
        json={'message': mensagem}
    )
    return response.json()

def get_usage():
    response = requests.get(
        f'{BASE_URL}/usage',
        headers={'Authorization': f'Bearer {API_KEY}'}
    )
    return response.json()

# Exemplo de uso
resposta = chat('Explique a fotossíntese')
print(resposta['message'])

uso = get_usage()
print(f"Tokens: {uso['tokensUsedToday']}/{uso['dailyTokenLimit']}")`,
  typescript: `// TypeScript - Usar a API HTTP diretamente
interface ChatResponse {
  message: string;
  tokens: number;
  model: string;
}

const API_KEY = process.env.EDUNA_API_KEY as string;

async function chat(mensagem: string): Promise<ChatResponse> {
  const response = await fetch('https://edutok.replit.app/api/sdk/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${API_KEY}\`
    },
    body: JSON.stringify({ 
      message: mensagem,
      model: 'eduna-4.0',
      temperature: 0.7
    })
  });
  
  return response.json();
}

// Exemplo de uso
chat('Explique a fotossíntese')
  .then(res => console.log(res.message));`,
  curl: `# Chat simples
curl -X POST https://edutok.replit.app/api/sdk/chat \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer SUA_CHAVE_API_AQUI" \\
  -d '{"message": "Explique a fotossíntese"}'

# Verificar uso
curl https://edutok.replit.app/api/sdk/usage \\
  -H "Authorization: Bearer SUA_CHAVE_API_AQUI"`,
};

function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-primary rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -20, 0],
            x: [0, Math.random() * 20 - 10, 0],
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 4 + Math.random() * 3,
            repeat: Infinity,
            delay: Math.random() * 2,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

function TokenUsageCard({ apiKey }: { apiKey: ApiKey }) {
  const percentage = Math.min(100, (apiKey.tokensUsedToday / apiKey.dailyTokenLimit) * 100);
  const remaining = Math.max(0, apiKey.dailyTokenLimit - apiKey.tokensUsedToday);
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Tokens usados hoje</span>
        <span className="font-mono font-medium">
          {apiKey.tokensUsedToday.toLocaleString()} / {apiKey.dailyTokenLimit.toLocaleString()}
        </span>
      </div>
      <Progress value={percentage} className="h-2" />
      <div className="flex items-center justify-between text-xs">
        <span className={percentage >= 90 ? "text-destructive" : "text-muted-foreground"}>
          {percentage >= 90 ? "Quase no limite!" : `${remaining.toLocaleString()} restantes`}
        </span>
        <span className="text-muted-foreground">Reseta à meia-noite UTC</span>
      </div>
    </div>
  );
}

function CodeBlock({ code, language, onCopy }: { code: string; language: string; onCopy: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    onCopy();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-zinc-900 dark:bg-zinc-950 text-zinc-100 p-4 rounded-lg text-sm overflow-x-auto">
        <code>{code}</code>
      </pre>
      <Button
        variant="secondary"
        size="sm"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleCopy}
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </Button>
    </div>
  );
}

function SDKDocumentation() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("quickstart");
  const [activeCodeLang, setActiveCodeLang] = useState("html");

  const handleCopy = () => {
    toast({ title: "Copiado!", description: "Código copiado para a área de transferência." });
  };

  const handleDownloadSDK = () => {
    window.open('/api/sdk/download', '_blank');
    toast({ title: "Download iniciado", description: "O SDK está sendo baixado." });
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-lg">
          <TabsTrigger value="quickstart" className="gap-1">
            <Rocket className="w-4 h-4" />
            <span className="hidden sm:inline">Quick Start</span>
          </TabsTrigger>
          <TabsTrigger value="examples" className="gap-1">
            <Code2 className="w-4 h-4" />
            <span className="hidden sm:inline">Exemplos</span>
          </TabsTrigger>
          <TabsTrigger value="api" className="gap-1">
            <Braces className="w-4 h-4" />
            <span className="hidden sm:inline">API</span>
          </TabsTrigger>
          <TabsTrigger value="sdk" className="gap-1">
            <Package className="w-4 h-4" />
            <span className="hidden sm:inline">SDK</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quickstart" className="space-y-6 mt-6">
          <div className="grid gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">1</div>
                  Adicione o Widget (HTML) ou use a API
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Para sites HTML, adicione o widget com uma linha de script:
                </p>
                <div className="bg-zinc-900 dark:bg-zinc-950 rounded-lg p-4 font-mono text-sm flex items-center justify-between">
                  <code className="text-green-400 text-xs">&lt;script src="https://edutok.replit.app/sdk/eduna-widget.js"&gt;&lt;/script&gt;</code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText('<script src="https://edutok.replit.app/sdk/eduna-widget.js"></script>');
                      handleCopy();
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-3">
                  Para outros ambientes, use a API HTTP diretamente (veja exemplos abaixo).
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">2</div>
                  Obtenha sua Chave API
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Crie uma chave API usando o botão no topo desta página. Você receberá uma chave única que começará com <code className="bg-muted px-1 rounded">edu_</code>.
                </p>
                <div className="mt-3 flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm">
                  <Shield className="w-4 h-4" />
                  <span>Guarde sua chave em local seguro. Ela só é mostrada uma vez!</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">3</div>
                  Integre no seu Projeto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="html" className="w-full">
                  <TabsList className="flex flex-wrap h-auto gap-1">
                    <TabsTrigger value="html" className="gap-1 text-xs">
                      <SiHtml5 className="w-3 h-3" />
                      HTML
                    </TabsTrigger>
                    <TabsTrigger value="react" className="gap-1 text-xs">
                      <SiReact className="w-3 h-3" />
                      React
                    </TabsTrigger>
                    <TabsTrigger value="node" className="gap-1 text-xs">
                      <SiNodedotjs className="w-3 h-3" />
                      Node.js
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="html" className="mt-4">
                    <CodeBlock code={CODE_EXAMPLES.html} language="html" onCopy={handleCopy} />
                  </TabsContent>
                  <TabsContent value="react" className="mt-4">
                    <CodeBlock code={CODE_EXAMPLES.react} language="tsx" onCopy={handleCopy} />
                  </TabsContent>
                  <TabsContent value="node" className="mt-4">
                    <CodeBlock code={CODE_EXAMPLES.nodejs} language="javascript" onCopy={handleCopy} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="examples" className="space-y-6 mt-6">
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              { id: "html", icon: SiHtml5, label: "HTML" },
              { id: "javascript", icon: SiJavascript, label: "JavaScript" },
              { id: "react", icon: SiReact, label: "React" },
              { id: "nodejs", icon: SiNodedotjs, label: "Node.js" },
              { id: "typescript", icon: SiTypescript, label: "TypeScript" },
              { id: "python", icon: SiPython, label: "Python" },
              { id: "curl", icon: Terminal, label: "cURL" },
            ].map((lang) => (
              <Button
                key={lang.id}
                variant={activeCodeLang === lang.id ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCodeLang(lang.id)}
                className="gap-1"
              >
                <lang.icon className="w-4 h-4" />
                {lang.label}
              </Button>
            ))}
          </div>
          <CodeBlock 
            code={CODE_EXAMPLES[activeCodeLang as keyof typeof CODE_EXAMPLES]} 
            language={activeCodeLang} 
            onCopy={handleCopy} 
          />
        </TabsContent>

        <TabsContent value="api" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Endpoints da API
              </CardTitle>
              <CardDescription>Base URL: https://edutok.replit.app/api</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border rounded-lg overflow-hidden">
                <div className="grid grid-cols-12 gap-2 p-3 bg-muted/50 font-medium text-sm">
                  <div className="col-span-2">Método</div>
                  <div className="col-span-4">Endpoint</div>
                  <div className="col-span-6">Descrição</div>
                </div>
                {[
                  { method: "POST", endpoint: "/sdk/chat", desc: "Enviar mensagem para a Eduna AI" },
                  { method: "POST", endpoint: "/sdk/analyze-image", desc: "Analisar uma imagem com IA" },
                  { method: "GET", endpoint: "/sdk/usage", desc: "Ver estatísticas de uso da chave" },
                  { method: "GET", endpoint: "/sdk/models", desc: "Listar modelos disponíveis" },
                ].map((ep, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 p-3 border-t text-sm items-center">
                    <div className="col-span-2">
                      <Badge variant={ep.method === "POST" ? "default" : "secondary"}>
                        {ep.method}
                      </Badge>
                    </div>
                    <div className="col-span-4 font-mono text-xs">{ep.endpoint}</div>
                    <div className="col-span-6 text-muted-foreground">{ep.desc}</div>
                  </div>
                ))}
              </div>

              <div className="mt-6 space-y-4">
                <h4 className="font-semibold">Autenticação</h4>
                <p className="text-sm text-muted-foreground">
                  Todas as requisições devem incluir o header de autorização:
                </p>
                <div className="bg-zinc-900 dark:bg-zinc-950 rounded-lg p-4 font-mono text-sm">
                  <code className="text-cyan-400">Authorization: Bearer SUA_CHAVE_API</code>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <h4 className="font-semibold">Modelos Disponíveis</h4>
                <div className="grid gap-3">
                  {[
                    { id: "eduna-4.0", name: "Eduna 4.0", desc: "Balanceado, respostas rápidas", badge: "Padrão" },
                    { id: "eduna-scholar", name: "Eduna Scholar", desc: "Acadêmico, respostas detalhadas", badge: "Premium" },
                    { id: "eduna-lite", name: "Eduna Lite", desc: "Rápido, respostas concisas", badge: "Fast" },
                  ].map((model) => (
                    <div key={model.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{model.name}</span>
                          <Badge variant="outline" className="text-xs">{model.badge}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{model.desc}</p>
                      </div>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{model.id}</code>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sdk" className="space-y-6 mt-6">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="hover-elevate">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  Widget JavaScript
                </CardTitle>
                <CardDescription>Adicione o chat widget ao seu site</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-zinc-900 dark:bg-zinc-950 rounded-lg p-3 font-mono text-xs overflow-x-auto">
                  <code className="text-green-400">&lt;script src="https://edutok.replit.app/sdk/eduna-widget.js"&gt;&lt;/script&gt;</code>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText('<script src="https://edutok.replit.app/sdk/eduna-widget.js"></script>');
                      handleCopy();
                    }}
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Copiar
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Braces className="w-5 h-5 text-primary" />
                  API REST
                </CardTitle>
                <CardDescription>Use a API HTTP diretamente</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-zinc-900 dark:bg-zinc-950 rounded-lg p-3 font-mono text-xs">
                  <code className="text-cyan-400">POST /api/sdk/chat</code>
                </div>
                <p className="text-sm text-muted-foreground">
                  Funciona com qualquer linguagem: JavaScript, Python, Node.js, etc.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="w-5 h-5 text-primary" />
                  Download Direto
                </CardTitle>
                <CardDescription>Baixe os arquivos do SDK</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={handleDownloadSDK} className="w-full gap-2">
                  <Download className="w-4 h-4" />
                  Baixar SDK (ZIP)
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Inclui README, templates e exemplos
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Documentação
                </CardTitle>
                <CardDescription>Guias completos e referência</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <BookOpen className="w-4 h-4" />
                    Guia de Início Rápido
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <Braces className="w-4 h-4" />
                    Referência da API
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <Blocks className="w-4 h-4" />
                    Exemplos de Projetos
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recursos do SDK</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { icon: Zap, title: "TypeScript", desc: "Tipagem completa incluída" },
                  { icon: Globe, title: "Multi-plataforma", desc: "Browser, Node.js, React" },
                  { icon: Shield, title: "Seguro", desc: "Chaves nunca expostas no cliente" },
                  { icon: Webhook, title: "Webhooks", desc: "Receba notificações em tempo real" },
                  { icon: Activity, title: "Analytics", desc: "Métricas de uso detalhadas" },
                  { icon: Settings, title: "Configurável", desc: "Personalize temas e comportamento" },
                ].map((feature, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg border">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <feature.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">{feature.title}</h4>
                      <p className="text-sm text-muted-foreground">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AnalyticsDashboard({ keyId, onClose }: { keyId: string; onClose: () => void }) {
  const { toast } = useToast();
  
  const getAuthHeaders = async () => {
    const token = await auth.currentUser?.getIdToken();
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/devtools/api-keys", keyId, "analytics"],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/devtools/api-keys/${keyId}/analytics?days=7`, { headers });
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json() as Promise<AnalyticsResponse>;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Erro ao carregar analytics</p>
        <Button variant="outline" onClick={() => refetch()} className="mt-4">
          Tentar novamente
        </Button>
      </div>
    );
  }

  const chartData = data.dailyAnalytics.map((d) => ({
    ...d,
    date: new Date(d.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
    cost: d.estimatedCostUsd * 100,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{data.keyName}</h3>
          <p className="text-sm text-muted-foreground">Últimos 7 dias</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Activity className="w-4 h-4" />
              <span className="text-xs">Requisições</span>
            </div>
            <p className="text-2xl font-bold" data-testid="text-total-requests">
              {data.totals.totalRequests.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Zap className="w-4 h-4" />
              <span className="text-xs">Tokens</span>
            </div>
            <p className="text-2xl font-bold" data-testid="text-total-tokens">
              {data.totals.totalTokens.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Coins className="w-4 h-4" />
              <span className="text-xs">Custo Est.</span>
            </div>
            <p className="text-2xl font-bold" data-testid="text-total-cost">
              ${data.totals.totalCost.toFixed(4)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs">Sucesso</span>
            </div>
            <p className="text-2xl font-bold text-green-500" data-testid="text-success-rate">
              {data.totals.successRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Limite Diário de Tokens</span>
          <Badge variant={data.tokensUsedToday >= data.dailyTokenLimit ? "destructive" : "secondary"}>
            {data.tokensUsedToday} / {data.dailyTokenLimit}
          </Badge>
        </div>
        <Progress 
          value={Math.min(100, (data.tokensUsedToday / data.dailyTokenLimit) * 100)} 
          className="h-3"
        />
      </div>

      <Tabs defaultValue="tokens" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="tokens" className="flex-1">Tokens</TabsTrigger>
          <TabsTrigger value="requests" className="flex-1">Requisições</TabsTrigger>
          <TabsTrigger value="cost" className="flex-1">Custo</TabsTrigger>
        </TabsList>
        
        <TabsContent value="tokens" className="mt-4">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="tokenGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--popover))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Area 
                  type="monotone" 
                  dataKey="tokensUsed" 
                  stroke="hsl(var(--primary))" 
                  fill="url(#tokenGradient)"
                  name="Tokens"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>
        
        <TabsContent value="requests" className="mt-4">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--popover))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="successCount" fill="hsl(142 76% 36%)" name="Sucesso" radius={[4, 4, 0, 0]} />
                <Bar dataKey="errorCount" fill="hsl(var(--destructive))" name="Erros" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>
        
        <TabsContent value="cost" className="mt-4">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `$${(v / 100).toFixed(3)}`} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--popover))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [`$${(value / 100).toFixed(4)}`, "Custo"]}
                />
                <Line 
                  type="monotone" 
                  dataKey="cost" 
                  stroke="hsl(var(--chart-2))" 
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--chart-2))", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>
      </Tabs>

      {data.recentLogs.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Chamadas Recentes</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {data.recentLogs.slice(0, 5).map((log: any, i: number) => (
              <div 
                key={i} 
                className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${log.success ? "bg-green-500" : "bg-destructive"}`} />
                  <span className="text-muted-foreground">
                    {new Date(log.timestamp).toLocaleTimeString("pt-BR")}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs">{log.tokens} tokens</span>
                  {log.latencyMs && (
                    <span className="text-muted-foreground text-xs">{log.latencyMs}ms</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button variant="outline" onClick={onClose}>
          Fechar
        </Button>
      </div>
    </div>
  );
}

export default function DevToolsApiKeys() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedKeyForEmbed, setSelectedKeyForEmbed] = useState<string | null>(null);
  const [embedCode, setEmbedCode] = useState<string | null>(null);
  const [analyticsKeyId, setAnalyticsKeyId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"keys" | "docs">("keys");

  const getAuthHeaders = async () => {
    const token = await auth.currentUser?.getIdToken();
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  const { data: keysData, isLoading, error: keysError } = useQuery({
    queryKey: ["/api/devtools/api-keys"],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/devtools/api-keys", { headers });
      if (res.status === 503) {
        throw new Error("SERVICE_UNAVAILABLE");
      }
      if (!res.ok) throw new Error("Failed to fetch keys");
      return res.json();
    },
    enabled: !!user,
    retry: false,
  });

  const serviceUnavailable = keysError?.message === "SERVICE_UNAVAILABLE";

  const createKeyMutation = useMutation({
    mutationFn: async (name: string) => {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/devtools/api-keys", {
        method: "POST",
        headers,
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create key");
      }
      return res.json() as Promise<NewKeyResponse>;
    },
    onSuccess: (data) => {
      setCreatedKey(data.key.apiKey);
      setNewKeyName("");
      queryClient.invalidateQueries({ queryKey: ["/api/devtools/api-keys"] });
      toast({
        title: "Chave criada com sucesso!",
        description: "Guarde sua chave em um local seguro.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar chave",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const revokeKeyMutation = useMutation({
    mutationFn: async (keyId: string) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/devtools/api-keys/${keyId}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) throw new Error("Failed to revoke key");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/devtools/api-keys"] });
      toast({
        title: "Chave revogada",
        description: "A chave API foi desativada com sucesso.",
      });
    },
  });

  const fetchEmbedCode = async (keyId: string) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/devtools/generate-embed-code/${keyId}`, { headers });
      if (!res.ok) throw new Error("Failed to fetch embed code");
      const data = await res.json();
      setEmbedCode(data.embedCode);
      setSelectedKeyForEmbed(keyId);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível gerar o código.",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Copiado!",
      description: "Texto copiado para a área de transferência.",
    });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const keys: ApiKey[] = keysData?.keys || [];
  const activeKeys = keys.filter((k) => k.active);
  const revokedKeys = keys.filter((k) => !k.active);

  const totalTokensUsed = activeKeys.reduce((sum, k) => sum + (k.totalTokensUsed || 0), 0);
  const totalRequests = activeKeys.reduce((sum, k) => sum + (k.usageCount || 0), 0);

  if (serviceUnavailable) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-amber-500/10 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold mb-2">Serviço em Manutenção</h2>
            <p className="text-muted-foreground mb-4">
              O sistema de chaves API está temporariamente indisponível. 
              Por favor, tente novamente mais tarde.
            </p>
            <Button onClick={() => navigate("/dashboard")} data-testid="button-back-dashboard">
              Voltar ao Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <Key className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-bold mb-2">Autenticação necessária</h2>
            <p className="text-muted-foreground mb-4">
              Faça login para acessar as ferramentas de desenvolvedor.
            </p>
            <Button onClick={() => navigate("/login")} data-testid="button-login">
              Fazer Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <FloatingParticles />

      <div className="relative z-10">
        <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/dashboard")}
                data-testid="button-back"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-primary" />
                  DevTools API
                </h1>
                <p className="text-xs text-muted-foreground">
                  Gerencie chaves, SDK e documentação
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={activeSection === "keys" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveSection("keys")}
                className="gap-1"
              >
                <Key className="w-4 h-4" />
                <span className="hidden sm:inline">Chaves API</span>
              </Button>
              <Button
                variant={activeSection === "docs" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveSection("docs")}
                className="gap-1"
              >
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">SDK & Docs</span>
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
          <AnimatePresence mode="wait">
            {activeSection === "keys" ? (
              <motion.div
                key="keys"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-background border border-primary/20 p-6"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl" />
                  
                  <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-6 h-6 text-primary" />
                        <h2 className="text-2xl font-bold text-foreground">Eduna AI API</h2>
                      </div>
                      <p className="text-muted-foreground max-w-md">
                        Integre a inteligência artificial do EduTok em seus projetos. 
                        Limite de 500 tokens/dia por chave.
                      </p>
                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        <Badge variant="secondary" className="gap-1">
                          <Shield className="w-3 h-3" />
                          Seguro
                        </Badge>
                        <Badge variant="secondary" className="gap-1">
                          <Zap className="w-3 h-3" />
                          500 tokens/dia
                        </Badge>
                        <Badge variant="secondary" className="gap-1">
                          <Clock className="w-3 h-3" />
                          60 req/min
                        </Badge>
                      </div>
                    </div>

                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          size="lg"
                          className="gap-2 shadow-lg"
                          data-testid="button-create-key"
                        >
                          <Plus className="w-5 h-5" />
                          Criar Minha Chave API
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <Key className="w-5 h-5 text-primary" />
                            Nova Chave API
                          </DialogTitle>
                          <DialogDescription>
                            Dê um nome para identificar sua chave (ex: "Meu Site", "Projeto Escola")
                          </DialogDescription>
                        </DialogHeader>

                        {createdKey ? (
                          <div className="space-y-4 py-4">
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                              <p className="text-sm text-amber-600 dark:text-amber-400 font-medium mb-2">
                                Guarde esta chave em um local seguro! Ela não será mostrada novamente.
                              </p>
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Sua Chave API</Label>
                              <div className="flex gap-2">
                                <div className="flex-1 relative">
                                  <Input
                                    value={showKey ? createdKey : "edu_" + "•".repeat(24)}
                                    readOnly
                                    className="font-mono pr-10"
                                    data-testid="input-created-key"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                                    onClick={() => setShowKey(!showKey)}
                                  >
                                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                  </Button>
                                </div>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => copyToClipboard(createdKey)}
                                  data-testid="button-copy-key"
                                >
                                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                </Button>
                              </div>
                            </div>

                            <DialogFooter>
                              <Button
                                onClick={() => {
                                  setCreatedKey(null);
                                  setShowKey(false);
                                  setIsCreateDialogOpen(false);
                                }}
                                data-testid="button-close-dialog"
                              >
                                Entendi, guardei minha chave
                              </Button>
                            </DialogFooter>
                          </div>
                        ) : (
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="keyName">Nome da Chave</Label>
                              <Input
                                id="keyName"
                                placeholder="Ex: Meu Chatbot Escolar"
                                value={newKeyName}
                                onChange={(e) => setNewKeyName(e.target.value)}
                                data-testid="input-key-name"
                              />
                            </div>

                            <DialogFooter>
                              <Button
                                onClick={() => createKeyMutation.mutate(newKeyName)}
                                disabled={newKeyName.length < 3 || createKeyMutation.isPending}
                                data-testid="button-confirm-create"
                              >
                                {createKeyMutation.isPending ? "Criando..." : "Criar Chave"}
                              </Button>
                            </DialogFooter>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </motion.div>

                {activeKeys.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4"
                  >
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Key className="w-4 h-4" />
                          <span className="text-xs">Chaves Ativas</span>
                        </div>
                        <p className="text-3xl font-bold" data-testid="text-active-keys">
                          {activeKeys.length}<span className="text-lg text-muted-foreground">/5</span>
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Activity className="w-4 h-4" />
                          <span className="text-xs">Total de Requisições</span>
                        </div>
                        <p className="text-3xl font-bold" data-testid="text-overview-requests">
                          {totalRequests.toLocaleString()}
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Zap className="w-4 h-4" />
                          <span className="text-xs">Tokens Usados (Total)</span>
                        </div>
                        <p className="text-3xl font-bold" data-testid="text-overview-tokens">
                          {totalTokensUsed.toLocaleString()}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground">
                      Minhas Chaves ({activeKeys.length}/5)
                    </h3>
                  </div>

                  {isLoading ? (
                    <div className="space-y-3">
                      {[1, 2].map((i) => (
                        <Card key={i} className="animate-pulse">
                          <CardContent className="p-4">
                            <div className="h-6 bg-muted rounded w-1/3 mb-2" />
                            <div className="h-4 bg-muted rounded w-1/2" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : activeKeys.length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="p-8 text-center">
                        <Key className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <h4 className="font-medium text-foreground mb-1">Nenhuma chave criada</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Crie sua primeira chave API para começar a integrar a Eduna AI.
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => setIsCreateDialogOpen(true)}
                          data-testid="button-create-first-key"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Criar Primeira Chave
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <AnimatePresence mode="popLayout">
                      {activeKeys.map((key, index) => (
                        <motion.div
                          key={key.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -100 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <Card className="hover-elevate transition-all duration-200">
                            <CardContent className="p-5">
                              <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <Key className="w-4 h-4 text-primary" />
                                      <h4 className="font-semibold text-foreground" data-testid={`text-key-name-${key.id}`}>
                                        {key.name}
                                      </h4>
                                      <Badge variant="secondary" className="text-xs">
                                        {key.usageCount} uso{key.usageCount !== 1 ? "s" : ""}
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      Criada em {formatDate(key.createdAt)}
                                      {key.lastUsedAt && ` • Último uso: ${formatDate(key.lastUsedAt)}`}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setAnalyticsKeyId(key.id)}
                                      data-testid={`button-analytics-${key.id}`}
                                    >
                                      <BarChart3 className="w-4 h-4 mr-1" />
                                      Analytics
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => fetchEmbedCode(key.id)}
                                      data-testid={`button-get-code-${key.id}`}
                                    >
                                      <Code2 className="w-4 h-4 mr-1" />
                                      Código
                                    </Button>

                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="text-destructive hover:text-destructive"
                                          data-testid={`button-revoke-${key.id}`}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Revogar chave API?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Esta ação é irreversível. A chave "{key.name}" será desativada 
                                            e não funcionará mais em nenhuma integração.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => revokeKeyMutation.mutate(key.id)}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                          >
                                            Revogar
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </div>

                                <TokenUsageCard apiKey={key} />
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </section>

                {revokedKeys.length > 0 && (
                  <section className="space-y-4">
                    <h3 className="text-lg font-semibold text-muted-foreground">
                      Chaves Revogadas ({revokedKeys.length})
                    </h3>
                    {revokedKeys.map((key) => (
                      <Card key={key.id} className="opacity-50">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Key className="w-4 h-4 text-muted-foreground" />
                                <h4 className="font-semibold text-muted-foreground line-through">
                                  {key.name}
                                </h4>
                                <Badge variant="outline" className="text-xs">
                                  Revogada
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Revogada em {key.revokedAt && formatDate(key.revokedAt)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </section>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="docs"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <SDKDocumentation />
              </motion.div>
            )}
          </AnimatePresence>

          <Dialog open={!!analyticsKeyId} onOpenChange={() => setAnalyticsKeyId(null)}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Analytics da Chave
                </DialogTitle>
              </DialogHeader>
              {analyticsKeyId && (
                <AnalyticsDashboard 
                  keyId={analyticsKeyId} 
                  onClose={() => setAnalyticsKeyId(null)} 
                />
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={!!embedCode} onOpenChange={() => { setEmbedCode(null); setSelectedKeyForEmbed(null); }}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-primary" />
                  Código de Integração
                </DialogTitle>
                <DialogDescription>
                  Copie e cole este código HTML em seu site para adicionar o chatbot Eduna.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto max-h-96">
                    <code>{embedCode}</code>
                  </pre>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => embedCode && copyToClipboard(embedCode)}
                    data-testid="button-copy-embed"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <h4 className="font-medium text-blue-600 dark:text-blue-400 mb-2">
                    Como usar
                  </h4>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Copie o código HTML acima</li>
                    <li>Cole em um arquivo .html ou em seu site</li>
                    <li>O chatbot Eduna aparecerá automaticamente</li>
                  </ol>
                </div>
              </div>

              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => { setEmbedCode(null); setSelectedKeyForEmbed(null); }}
                >
                  Fechar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}
