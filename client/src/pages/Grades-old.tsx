import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/useAuth";
import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Award } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Grades() {
  const { user } = useAuth();
  const [selectedBimestre, setSelectedBimestre] = useState<number>(1);

  const { data: grades = [] } = useQuery({
    queryKey: ["/api/grades", `uid=${user?.uid}`],
  });

  const bimestreGrades = grades.filter((g: any) => g.bimestre === selectedBimestre);
  
  const groupedBySubject = bimestreGrades.reduce((acc: any, grade: any) => {
    if (!acc[grade.subject]) {
      acc[grade.subject] = [];
    }
    acc[grade.subject].push(grade);
    return acc;
  }, {});

  const subjects = Object.keys(groupedBySubject);
  
  const calculateAverage = (subjectGrades: any[]) => {
    if (subjectGrades.length === 0) return 0;
    return subjectGrades.reduce((sum, g) => sum + g.grade, 0) / subjectGrades.length;
  };

  const overallAverage = bimestreGrades.length > 0
    ? bimestreGrades.reduce((sum: number, g: any) => sum + g.grade, 0) / bimestreGrades.length
    : 0;

  const getGradeColor = (grade: number) => {
    if (grade >= 7) return "text-chart-2";
    if (grade >= 5) return "text-chart-4";
    return "text-destructive";
  };

  const getGradeBadgeVariant = (grade: number): "default" | "secondary" | "destructive" => {
    if (grade >= 7) return "default";
    if (grade >= 5) return "secondary";
    return "destructive";
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card border-b border-card-border px-4 py-6 sticky top-0 z-40 backdrop-blur-sm">
        <h1 className="text-2xl font-bold text-foreground mb-1">Notas e Desempenho</h1>
        <p className="text-sm text-muted-foreground">Acompanhe seu progresso acadêmico</p>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
        {/* Overall Average */}
        <Card className="border-card-border bg-gradient-to-br from-primary/5 to-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Média Geral</p>
                <p className="text-4xl font-bold text-primary">{overallAverage.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {selectedBimestre}º Bimestre
                </p>
              </div>
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                <Award className="w-12 h-12 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bimestre Tabs */}
        <Tabs value={selectedBimestre.toString()} onValueChange={(v) => setSelectedBimestre(parseInt(v))}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="1" data-testid="tab-bimestre-1">1º Bim</TabsTrigger>
            <TabsTrigger value="2" data-testid="tab-bimestre-2">2º Bim</TabsTrigger>
            <TabsTrigger value="3" data-testid="tab-bimestre-3">3º Bim</TabsTrigger>
            <TabsTrigger value="4" data-testid="tab-bimestre-4">4º Bim</TabsTrigger>
          </TabsList>

          {[1, 2, 3, 4].map((bim) => (
            <TabsContent key={bim} value={bim.toString()} className="space-y-4 mt-6">
              {subjects.length > 0 ? (
                subjects.map((subject) => {
                  const subjectGrades = groupedBySubject[subject];
                  const average = calculateAverage(subjectGrades);
                  const latestGrade = subjectGrades[subjectGrades.length - 1];

                  return (
                    <Card key={subject} className="border-card-border" data-testid={`card-subject-${subject}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg mb-1">{subject}</CardTitle>
                            <p className="text-sm text-muted-foreground">{latestGrade.className}</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-3xl font-bold ${getGradeColor(average)}`}>
                              {average.toFixed(1)}
                            </p>
                            <Badge variant={getGradeBadgeVariant(average)} className="mt-1">
                              {average >= 7 ? "Aprovado" : average >= 5 ? "Regular" : "Atenção"}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                            <span>Progresso</span>
                            <span>{((average / 10) * 100).toFixed(0)}%</span>
                          </div>
                          <Progress value={(average / 10) * 100} className="h-2" />
                        </div>

                        {subjectGrades.length > 1 && (
                          <div className="pt-2 border-t border-border">
                            <p className="text-xs font-semibold text-foreground mb-2">
                              Histórico de Notas
                            </p>
                            <div className="flex gap-2 flex-wrap">
                              {subjectGrades.map((grade: any, index: number) => (
                                <div
                                  key={grade.id}
                                  className="flex items-center gap-1 px-2 py-1 bg-muted rounded-md"
                                >
                                  <span className="text-xs text-muted-foreground">#{index + 1}</span>
                                  <span className={`text-sm font-semibold ${getGradeColor(grade.grade)}`}>
                                    {grade.grade.toFixed(1)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="pt-2 border-t border-border">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Professor: {latestGrade.teacher}</span>
                            <span className="text-muted-foreground">
                              {format(new Date(latestGrade.date), "dd/MM/yyyy")}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <Card className="border-card-border">
                  <CardContent className="p-12 text-center">
                    <TrendingUp className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      Nenhuma nota disponível para o {bim}º bimestre
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Performance Insights */}
        {bimestreGrades.length > 0 && (
          <Card className="border-card-border">
            <CardHeader>
              <CardTitle className="text-lg">Análise de Desempenho</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {subjects.map((subject) => {
                const avg = calculateAverage(groupedBySubject[subject]);
                const diff = avg - overallAverage;
                
                return (
                  <div key={subject} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <span className="text-sm font-medium text-foreground">{subject}</span>
                    <div className="flex items-center gap-2">
                      {Math.abs(diff) < 0.5 ? (
                        <Minus className="w-4 h-4 text-muted-foreground" />
                      ) : diff > 0 ? (
                        <TrendingUp className="w-4 h-4 text-chart-2" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-destructive" />
                      )}
                      <span className={`text-sm font-semibold ${
                        Math.abs(diff) < 0.5 
                          ? "text-muted-foreground" 
                          : diff > 0 
                          ? "text-chart-2" 
                          : "text-destructive"
                      }`}>
                        {diff > 0 ? "+" : ""}{diff.toFixed(1)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
