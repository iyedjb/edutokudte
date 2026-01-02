import { useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Upload,
  Download,
  ChevronRight,
  Filter
} from "lucide-react";
import { format, differenceInDays, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";

// Mock data - replace with Firebase query
const mockAssignments = [
  {
    id: "1",
    classId: "math",
    className: "Matemática",
    title: "Lista de Exercícios - Funções Quadráticas",
    description: "Resolver os exercícios 1 a 15 do capítulo 4 sobre funções quadráticas. Mostrar todos os cálculos.",
    dueDate: Date.now() + 86400000 * 2, // 2 days from now
    createdAt: Date.now() - 86400000 * 5,
    teacherName: "Prof. Carlos Silva",
    status: "pending" as const,
    maxGrade: 10,
    attachments: ["exercicios.pdf"]
  },
  {
    id: "2",
    classId: "port",
    className: "Português",
    title: "Redação - Análise Literária",
    description: "Escrever uma análise de 2 páginas sobre o livro 'Dom Casmurro' focando nos temas principais.",
    dueDate: Date.now() + 86400000 * 5,
    createdAt: Date.now() - 86400000 * 3,
    teacherName: "Profa. Ana Costa",
    status: "submitted" as const,
    maxGrade: 10,
    attachments: []
  },
  {
    id: "3",
    classId: "hist",
    className: "História",
    title: "Trabalho sobre a Revolução Industrial",
    description: "Criar uma apresentação sobre os impactos sociais e econômicos da Revolução Industrial.",
    dueDate: Date.now() - 86400000, // 1 day ago
    createdAt: Date.now() - 86400000 * 10,
    teacherName: "Prof. Roberto Lima",
    status: "pending" as const,
    maxGrade: 10,
    attachments: ["template.pptx"]
  },
  {
    id: "4",
    classId: "phys",
    className: "Física",
    title: "Relatório de Experimento - Movimento",
    description: "Documentar os resultados do experimento sobre movimento uniforme realizado em sala.",
    dueDate: Date.now() + 86400000 * 7,
    createdAt: Date.now() - 86400000 * 2,
    teacherName: "Prof. João Santos",
    status: "graded" as const,
    grade: 9.5,
    maxGrade: 10,
    attachments: ["roteiro.pdf"]
  },
];

export default function Assignments() {
  const [selectedTab, setSelectedTab] = useState("pending");
  const [loading] = useState(false);

  const getStatusBadge = (assignment: typeof mockAssignments[0]) => {
    if (assignment.status === "graded") {
      return <Badge variant="outline" className="bg-chart-2/10 text-chart-2 border-chart-2/20">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Corrigida
      </Badge>;
    }
    if (assignment.status === "submitted") {
      return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
        <Upload className="w-3 h-3 mr-1" />
        Enviada
      </Badge>;
    }
    
    const daysLeft = differenceInDays(assignment.dueDate, Date.now());
    const isOverdue = isPast(assignment.dueDate);
    
    if (isOverdue) {
      return <Badge variant="destructive">
        <AlertCircle className="w-3 h-3 mr-1" />
        Atrasada
      </Badge>;
    }
    
    if (daysLeft <= 1) {
      return <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20">
        <Clock className="w-3 h-3 mr-1" />
        Urgente
      </Badge>;
    }
    
    return <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">
      <FileText className="w-3 h-3 mr-1" />
      Pendente
    </Badge>;
  };

  const getDueDateText = (timestamp: number) => {
    const daysLeft = differenceInDays(timestamp, Date.now());
    const isOverdue = isPast(timestamp);
    
    if (isOverdue) {
      const daysOverdue = Math.abs(daysLeft);
      return `Atrasada ${daysOverdue} dia${daysOverdue > 1 ? 's' : ''}`;
    }
    
    if (daysLeft === 0) return "Hoje";
    if (daysLeft === 1) return "Amanhã";
    if (daysLeft < 7) return `${daysLeft} dias`;
    
    return format(timestamp, "dd 'de' MMM", { locale: ptBR });
  };

  const filterAssignments = (status: string) => {
    if (status === "all") return mockAssignments;
    return mockAssignments.filter(a => a.status === status);
  };

  const pendingCount = mockAssignments.filter(a => a.status === "pending").length;
  const submittedCount = mockAssignments.filter(a => a.status === "submitted").length;
  const gradedCount = mockAssignments.filter(a => a.status === "graded").length;

  return (
    <div className="bg-background pb-20">
      {/* Header */}
      <header className="bg-gradient-to-r from-primary to-blue-600 text-primary-foreground sticky top-0 z-40 shadow-lg">
        <div className="max-w-screen-xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Tarefas</h1>
              <p className="text-sm text-white/80 mt-1">Gerencie suas atividades</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              data-testid="button-filter"
            >
              <Filter className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
              <p className="text-xs text-amber-600/70 mt-1">Pendentes</p>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{submittedCount}</p>
              <p className="text-xs text-blue-600/70 mt-1">Enviadas</p>
            </CardContent>
          </Card>
          <Card className="border-chart-2/30 bg-chart-2/5">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-chart-2">{gradedCount}</p>
              <p className="text-xs text-chart-2/70 mt-1">Corrigidas</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="all" data-testid="tab-all">
              Todas
            </TabsTrigger>
            <TabsTrigger value="pending" data-testid="tab-pending">
              Pendentes
            </TabsTrigger>
            <TabsTrigger value="submitted" data-testid="tab-submitted">
              Enviadas
            </TabsTrigger>
            <TabsTrigger value="graded" data-testid="tab-graded">
              Corrigidas
            </TabsTrigger>
          </TabsList>

          {["all", "pending", "submitted", "graded"].map((tab) => (
            <TabsContent key={tab} value={tab} className="space-y-4">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="border-card-border">
                      <CardHeader>
                        <Skeleton className="h-5 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-16 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filterAssignments(tab).length === 0 ? (
                <Card className="border-card-border">
                  <CardContent className="p-12 text-center">
                    <div className="p-4 bg-muted rounded-full w-fit mx-auto mb-4">
                      <FileText className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-lg font-semibold text-foreground mb-2">
                      Nenhuma tarefa encontrada
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Você não tem tarefas nesta categoria
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filterAssignments(tab).map((assignment) => (
                  <Card 
                    key={assignment.id} 
                    className="border-card-border hover-elevate cursor-pointer group"
                    data-testid={`assignment-${assignment.id}`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className="text-xs">
                              {assignment.className}
                            </Badge>
                            {getStatusBadge(assignment)}
                          </div>
                          <CardTitle className="text-lg group-hover:text-primary transition-colors">
                            {assignment.title}
                          </CardTitle>
                          <CardDescription className="text-xs mt-1">
                            {assignment.teacherName}
                          </CardDescription>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {assignment.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className={`font-medium ${
                            isPast(assignment.dueDate) && assignment.status === "pending"
                              ? 'text-destructive'
                              : 'text-foreground'
                          }`}>
                            {getDueDateText(assignment.dueDate)}
                          </span>
                        </div>
                        
                        {assignment.status === "graded" && assignment.grade !== undefined && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Nota:</span>
                            <Badge variant="outline" className={`
                              ${assignment.grade >= 7 ? 'bg-chart-2/10 text-chart-2 border-chart-2/20' : 
                                assignment.grade >= 5 ? 'bg-amber-50 text-amber-600 border-amber-200' : 
                                'bg-destructive/10 text-destructive border-destructive/20'}
                            `}>
                              {assignment.grade.toFixed(1)}/{assignment.maxGrade}
                            </Badge>
                          </div>
                        )}
                      </div>

                      {assignment.attachments.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Download className="w-4 h-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {assignment.attachments.length} anexo(s)
                          </span>
                        </div>
                      )}

                      {assignment.status === "pending" && (
                        <Button className="w-full" data-testid={`button-submit-${assignment.id}`}>
                          <Upload className="w-4 h-4 mr-2" />
                          Enviar Tarefa
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          ))}
        </Tabs>
      </main>

      <BottomNav />
    </div>
  );
}
