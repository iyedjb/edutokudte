import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Award, TrendingUp, CheckCircle2, AlertCircle, XCircle, Clock, User, FileText, Calendar } from "lucide-react";

export default function GradeReport() {
  const [, params] = useRoute("/report/:reportId");
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params?.reportId) {
      fetchReport(params.reportId);
    }
  }, [params?.reportId]);

  const fetchReport = async (reportId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/grade-reports/${reportId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao carregar relatório");
      }

      setReport(data.report);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center px-4">
        <Card className="max-w-md w-full border-red-200 dark:border-red-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5" />
              Erro ao carregar boletim
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!report) {
    return null;
  }

  const grades = report.gradesData || [];
  const allSubjectsGrouped = grades.reduce((acc: any, grade: any) => {
    if (!acc[grade.subject]) {
      acc[grade.subject] = {};
    }
    if (!acc[grade.subject][grade.bimestre]) {
      acc[grade.subject][grade.bimestre] = [];
    }
    acc[grade.subject][grade.bimestre].push(grade);
    return acc;
  }, {});

  const allSubjects = [...Object.keys(allSubjectsGrouped)].sort();
  
  const subjectAverages: Record<string, number> = {};
  allSubjects.forEach(subject => {
    const bimestres = allSubjectsGrouped[subject];
    const bimestreAverages = Object.keys(bimestres).map(bim => {
      const grades = bimestres[bim];
      return grades[grades.length - 1]?.grade || 0;
    });
    const subjectAvg = bimestreAverages.reduce((sum, g) => sum + g, 0) / bimestreAverages.length;
    subjectAverages[subject] = subjectAvg;
  });

  const overallAverage = allSubjects.length > 0
    ? allSubjects.reduce((sum, s) => sum + subjectAverages[s], 0) / allSubjects.length
    : 0;

  const stats = {
    approved: allSubjects.filter(s => subjectAverages[s] >= 15).length,
    recovery: allSubjects.filter(s => subjectAverages[s] >= 12.5 && subjectAverages[s] < 15).length,
    failed: allSubjects.filter(s => subjectAverages[s] < 12.5).length,
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 15) return "text-emerald-600 dark:text-emerald-400";
    if (grade >= 12.5) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const expiresDate = new Date(report.expiresAt);
  const currentYear = new Date().getFullYear();

  // Format turma display
  const formatTurma = (turma: string) => {
    if (!turma) return "Não informada";
    return turma.toUpperCase().replace(/(\d+)(RE)(\d+)/i, "$1 REG $3");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-6 px-4">
      <div className="max-w-4xl mx-auto space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <Award className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Boletim Escolar</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Ano Letivo {currentYear}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">EduTok</p>
            <p className="text-xs text-slate-400">edutok.online</p>
          </div>
        </div>

        {/* Student Info Card */}
        <Card className="border-slate-200 dark:border-slate-700 shadow-sm">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                  <User className="w-3 h-3" />
                  ALUNO
                </div>
                <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{report.studentName}</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                  <FileText className="w-3 h-3" />
                  CPF
                </div>
                <p className="font-medium text-slate-600 dark:text-slate-300 text-sm">{report.studentCpf || "Não informado"}</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                  <Calendar className="w-3 h-3" />
                  TURMA
                </div>
                <p className="font-medium text-slate-600 dark:text-slate-300 text-sm">{formatTurma(report.studentGrade)}</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                  <Clock className="w-3 h-3" />
                  VÁLIDO ATÉ
                </div>
                <p className="font-medium text-slate-600 dark:text-slate-300 text-sm">{expiresDate.toLocaleDateString("pt-BR")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{overallAverage.toFixed(1)}</p>
              <p className="text-xs text-blue-600/70 dark:text-blue-400/70 font-medium">Média Geral</p>
            </CardContent>
          </Card>

          <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{stats.approved}</p>
              </div>
              <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 font-medium">Aprovado</p>
            </CardContent>
          </Card>

          <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{stats.recovery}</p>
              </div>
              <p className="text-xs text-amber-600/70 dark:text-amber-400/70 font-medium">Recuperação</p>
            </CardContent>
          </Card>
        </div>

        {/* Grades Table */}
        <Card className="shadow-sm border-slate-200 dark:border-slate-700">
          <CardHeader className="pb-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Notas por Disciplina
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-800 dark:bg-slate-700 text-white">
                    <th className="text-left py-2.5 px-4 text-xs font-semibold">Disciplina</th>
                    <th className="text-center py-2.5 px-3 text-xs font-semibold w-16">1º</th>
                    <th className="text-center py-2.5 px-3 text-xs font-semibold w-16">2º</th>
                    <th className="text-center py-2.5 px-3 text-xs font-semibold w-16">3º</th>
                    <th className="text-center py-2.5 px-3 text-xs font-semibold w-16">4º</th>
                  </tr>
                </thead>
                <tbody>
                  {allSubjects.map((subject, index) => {
                    const bimestres = allSubjectsGrouped[subject];
                    return (
                      <tr 
                        key={subject} 
                        className={`border-b border-slate-100 dark:border-slate-700 ${index % 2 === 0 ? "bg-slate-50/50 dark:bg-slate-800/30" : ""}`}
                      >
                        <td className="py-2.5 px-4 text-sm text-slate-700 dark:text-slate-300">{subject}</td>
                        {[1, 2, 3, 4].map((bim) => {
                          const bimGrades = bimestres[bim];
                          const grade = bimGrades && bimGrades.length > 0 ? bimGrades[bimGrades.length - 1].grade : null;
                          return (
                            <td key={bim} className="text-center py-2.5 px-3">
                              {grade !== null ? (
                                <span className={`font-bold text-sm ${getGradeColor(grade)}`}>
                                  {grade.toFixed(1)}
                                </span>
                              ) : (
                                <span className="text-slate-300 dark:text-slate-600">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 py-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-slate-500">Aprovado (≥15)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-xs text-slate-500">Recuperação</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-xs text-slate-500">Reprovado</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-2 pb-4">
          <p className="text-xs text-slate-400">
            Documento gerado eletronicamente por <span className="font-semibold text-blue-500">EduTok</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">
            edutok.online
          </p>
        </div>
      </div>
    </div>
  );
}
