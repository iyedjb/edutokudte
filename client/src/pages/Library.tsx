import { useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  Video,
  Link as LinkIcon,
  Image,
  Download,
  Search,
  Filter,
  Clock,
  Eye,
  BookOpen,
  FileDown
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Mock data
const mockResources = [
  {
    id: "1",
    classId: "math",
    className: "Matemática",
    title: "Apostila Completa - Álgebra Linear",
    description: "Material completo sobre álgebra linear com exercícios resolvidos e propostos.",
    type: "pdf" as const,
    url: "#",
    uploaderName: "Prof. Carlos Silva",
    uploadedAt: Date.now() - 86400000 * 3,
    tags: ["álgebra", "teoria", "exercícios"],
    downloads: 45
  },
  {
    id: "2",
    classId: "phys",
    className: "Física",
    title: "Vídeo-aula: Leis de Newton",
    description: "Explicação detalhada das três leis de Newton com exemplos práticos.",
    type: "video" as const,
    url: "#",
    uploaderName: "Prof. João Santos",
    uploadedAt: Date.now() - 86400000 * 7,
    tags: ["mecânica", "newton", "vídeo"],
    downloads: 78
  },
  {
    id: "3",
    classId: "chem",
    className: "Química",
    title: "Tabela Periódica Interativa",
    description: "Acesse a tabela periódica completa com informações detalhadas sobre cada elemento.",
    type: "link" as const,
    url: "https://ptable.com",
    uploaderName: "Profa. Maria Oliveira",
    uploadedAt: Date.now() - 86400000 * 14,
    tags: ["elementos", "tabela periódica", "referência"],
    downloads: 120
  },
  {
    id: "4",
    classId: "port",
    className: "Português",
    title: "Resumo - Figuras de Linguagem",
    description: "Documento com todas as figuras de linguagem e exemplos práticos.",
    type: "document" as const,
    url: "#",
    uploaderName: "Profa. Ana Costa",
    uploadedAt: Date.now() - 86400000 * 2,
    tags: ["gramática", "literatura", "resumo"],
    downloads: 62
  },
  {
    id: "5",
    classId: "hist",
    className: "História",
    title: "Mapa Mental - Segunda Guerra Mundial",
    description: "Mapa mental visual com os principais eventos e causas da Segunda Guerra.",
    type: "image" as const,
    url: "#",
    uploaderName: "Prof. Roberto Lima",
    uploadedAt: Date.now() - 86400000 * 5,
    tags: ["guerra", "século XX", "mapa mental"],
    downloads: 89
  },
];

export default function Library() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [loading] = useState(false);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "pdf": return <FileText className="w-5 h-5 text-destructive" />;
      case "video": return <Video className="w-5 h-5 text-chart-3" />;
      case "link": return <LinkIcon className="w-5 h-5 text-primary" />;
      case "document": return <FileText className="w-5 h-5 text-chart-4" />;
      case "image": return <Image className="w-5 h-5 text-chart-2" />;
      default: return <FileText className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const config = {
      pdf: { label: "PDF", variant: "destructive" as const, bg: "bg-destructive/10 text-destructive border-destructive/20" },
      video: { label: "Vídeo", variant: "outline" as const, bg: "bg-purple-50 text-purple-600 border-purple-200" },
      link: { label: "Link", variant: "default" as const, bg: "bg-primary/10 text-primary border-primary/20" },
      document: { label: "Doc", variant: "outline" as const, bg: "bg-amber-50 text-amber-600 border-amber-200" },
      image: { label: "Imagem", variant: "outline" as const, bg: "bg-chart-2/10 text-chart-2 border-chart-2/20" },
    };
    
    const { label, bg } = config[type as keyof typeof config] || config.document;
    return <Badge variant="outline" className={bg}>{label}</Badge>;
  };

  const filterResources = () => {
    let filtered = mockResources;
    
    if (selectedType !== "all") {
      filtered = filtered.filter(r => r.type === selectedType);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(r => 
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    return filtered;
  };

  const filteredResources = filterResources();

  const resourcesByType = {
    all: mockResources.length,
    pdf: mockResources.filter(r => r.type === "pdf").length,
    video: mockResources.filter(r => r.type === "video").length,
    document: mockResources.filter(r => r.type === "document").length,
    link: mockResources.filter(r => r.type === "link").length,
    image: mockResources.filter(r => r.type === "image").length,
  };

  return (
    <div className="bg-background pb-20">
      {/* Header */}
      <header className="bg-gradient-to-r from-chart-2 to-green-600 text-primary-foreground sticky top-0 z-40 shadow-lg">
        <div className="max-w-screen-xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Biblioteca</h1>
              <p className="text-sm text-white/80 mt-1">Seus materiais de estudo</p>
            </div>
            <div className="p-3 bg-white/20 rounded-xl">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por título, matéria ou tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4"
              data-testid="input-search"
            />
          </div>
        </div>

        {/* Type Filter */}
        <Tabs value={selectedType} onValueChange={setSelectedType} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto mb-6">
            <TabsTrigger value="all" data-testid="tab-all">
              Todos ({resourcesByType.all})
            </TabsTrigger>
            <TabsTrigger value="pdf" data-testid="tab-pdf">
              PDFs ({resourcesByType.pdf})
            </TabsTrigger>
            <TabsTrigger value="video" data-testid="tab-video">
              Vídeos ({resourcesByType.video})
            </TabsTrigger>
            <TabsTrigger value="document" data-testid="tab-doc">
              Docs ({resourcesByType.document})
            </TabsTrigger>
            <TabsTrigger value="link" data-testid="tab-link">
              Links ({resourcesByType.link})
            </TabsTrigger>
            <TabsTrigger value="image" data-testid="tab-image">
              Imagens ({resourcesByType.image})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={selectedType} className="space-y-4">
            {filteredResources.length === 0 ? (
              <Card className="border-card-border">
                <CardContent className="p-12 text-center">
                  <div className="p-4 bg-muted rounded-full w-fit mx-auto mb-4">
                    <BookOpen className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-semibold text-foreground mb-2">
                    Nenhum material encontrado
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery 
                      ? "Tente buscar com outros termos" 
                      : "Nenhum material disponível nesta categoria"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredResources.map((resource) => (
                  <Card 
                    key={resource.id} 
                    className="border-card-border hover-elevate cursor-pointer group"
                    data-testid={`resource-${resource.id}`}
                  >
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        <div className="p-3 bg-muted/50 rounded-lg">
                          {getTypeIcon(resource.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className="text-xs">
                              {resource.className}
                            </Badge>
                            {getTypeBadge(resource.type)}
                          </div>
                          <CardTitle className="text-base group-hover:text-primary transition-colors line-clamp-2">
                            {resource.title}
                          </CardTitle>
                          <CardDescription className="text-xs mt-1">
                            Por {resource.uploaderName}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {resource.description}
                      </p>
                      
                      {/* Tags */}
                      <div className="flex flex-wrap gap-1.5">
                        {resource.tags.map((tag, index) => (
                          <Badge 
                            key={index} 
                            variant="outline" 
                            className="text-xs bg-muted/30 hover:bg-muted/50"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{format(resource.uploadedAt, "dd/MM", { locale: ptBR })}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <FileDown className="w-3 h-3" />
                            <span>{resource.downloads}</span>
                          </div>
                        </div>
                        
                        <Button 
                          size="sm" 
                          variant="ghost"
                          data-testid={`button-download-${resource.id}`}
                        >
                          {resource.type === "link" ? (
                            <>
                              <Eye className="w-4 h-4 mr-1" />
                              Abrir
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4 mr-1" />
                              Baixar
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />
    </div>
  );
}
