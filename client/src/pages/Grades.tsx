import { useState } from "react";
import { useGrades } from "@/lib/useFirebaseData";
import { useAuth } from "@/lib/useAuth";
import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Award, Download, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import jsPDF from "jspdf";
import QRCode from "qrcode";
import edutokLogo from "@assets/Edit the EduTok logo_1763232022292.png";
import { useSchool } from "@/lib/useSchool";
import { useLocation } from "wouter";

export default function Grades() {
  const { grades, loading } = useGrades();
  const { user } = useAuth();
  const { school } = useSchool();
  const [, setLocation] = useLocation();
  const [selectedBimestre, setSelectedBimestre] = useState<number>(1);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  const basePath = school.basePath || "";

  const bimestreGrades = grades.filter((g) => g.bimestre === selectedBimestre);
  
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
    const latestGrade = subjectGrades[subjectGrades.length - 1];
    return latestGrade.grade;
  };

  const overallAverage = subjects.length > 0
    ? subjects.reduce((sum, subject) => sum + calculateAverage(groupedBySubject[subject]), 0) / subjects.length
    : 0;

  const getGradeColor = (grade: number) => {
    if (grade >= 15) return "text-emerald-600 dark:text-emerald-400";
    if (grade >= 12.5) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const getGradeStatus = (grade: number) => {
    if (grade >= 15) return { label: "Aprovado", icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" };
    if (grade >= 12.5) return { label: "Recuperação", icon: AlertCircle, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" };
    return { label: "Reprovado", icon: XCircle, color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10" };
  };

  const stats = {
    total: subjects.length,
    approved: subjects.filter(s => calculateAverage(groupedBySubject[s]) >= 15).length,
    recovery: subjects.filter(s => {
      const avg = calculateAverage(groupedBySubject[s]);
      return avg >= 12.5 && avg < 15;
    }).length,
    failed: subjects.filter(s => calculateAverage(groupedBySubject[s]) < 12.5).length,
  };

  const generatePDF = async () => {
    setGeneratingPDF(true);
    
    try {
      const idToken = await (await import("@/lib/firebase")).auth.currentUser?.getIdToken();
      
      if (!idToken) {
        throw new Error("Você precisa estar autenticado para gerar o relatório");
      }

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
      
      const allGradesStats = {
        totalSubjects: allSubjects.length,
        approved: 0,
        recovery: 0,
        failed: 0,
        totalAverage: 0
      };

      const subjectAverages: Record<string, number> = {};
      allSubjects.forEach(subject => {
        const bimestres = allSubjectsGrouped[subject];
        const bimestreAverages = Object.keys(bimestres).map(bim => {
          const grades = bimestres[bim];
          return grades[grades.length - 1]?.grade || 0;
        });
        const subjectAvg = bimestreAverages.reduce((sum, g) => sum + g, 0) / bimestreAverages.length;
        subjectAverages[subject] = subjectAvg;
        
        if (subjectAvg >= 15) allGradesStats.approved++;
        else if (subjectAvg >= 12.5) allGradesStats.recovery++;
        else allGradesStats.failed++;
      });

      allGradesStats.totalAverage = allSubjects.length > 0
        ? allSubjects.reduce((sum, s) => sum + subjectAverages[s], 0) / allSubjects.length
        : 0;

      const reportResponse = await fetch("/api/grade-reports/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          gradesData: grades
        }),
      });

      if (!reportResponse.ok) {
        const errorData = await reportResponse.json();
        throw new Error(errorData.message || "Falha ao criar link temporário");
      }

      const tempReportResponse = await reportResponse.json();

      if (!tempReportResponse.success) {
        throw new Error("Falha ao criar link temporário");
      }

      const reportUrl = `${window.location.origin}/report/${tempReportResponse.reportId}`;
      const expiryDate = new Date(tempReportResponse.expiresAt);
      
      // Professional claire blue color palette - minimal and clean
      const claireBlue = { r: 191, g: 219, b: 254 }; // Light claire blue
      const accentBlue = { r: 59, g: 130, b: 246 };  // Primary blue
      const darkSlate = { r: 30, g: 41, b: 59 };     // Text primary
      const mediumSlate = { r: 71, g: 85, b: 105 };  // Text secondary
      const lightSlate = { r: 148, g: 163, b: 184 }; // Text muted
      
      const qrCodeDataUrl = await QRCode.toDataURL(reportUrl, {
        width: 200,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: {
          dark: "#1e293b",
          light: "#ffffff"
        }
      });

      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const currentYear = new Date().getFullYear();
      
      // Clean white background
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      
      // Subtle EduTok watermark in background
      pdf.setFontSize(80);
      pdf.setTextColor(248, 250, 252);
      pdf.setFont("helvetica", "bold");
      pdf.text("EduTok", pageWidth / 2, pageHeight / 2 - 20, { align: "center", angle: 35 });
      
      // Load and add EduTok logo
      const img = new Image();
      img.src = edutokLogo;
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      
      let yPos = 16;
      
      // Header - Clean and minimal
      const logoSize = 18;
      pdf.addImage(img, 'PNG', margin, yPos, logoSize, logoSize);
      
      pdf.setFontSize(20);
      pdf.setTextColor(darkSlate.r, darkSlate.g, darkSlate.b);
      pdf.setFont("helvetica", "bold");
      pdf.text("Boletim Escolar", margin + logoSize + 6, yPos + 12);
      
      // EduTok branding on right side of header
      pdf.setFontSize(9);
      pdf.setTextColor(accentBlue.r, accentBlue.g, accentBlue.b);
      pdf.setFont("helvetica", "bold");
      pdf.text("EduTok", pageWidth - margin, yPos + 8, { align: "right" });
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(lightSlate.r, lightSlate.g, lightSlate.b);
      pdf.text("edutok.online", pageWidth - margin, yPos + 14, { align: "right" });
      
      yPos += 28;
      
      // Thin blue accent line
      pdf.setDrawColor(claireBlue.r, claireBlue.g, claireBlue.b);
      pdf.setLineWidth(1.5);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      
      yPos += 12;
      
      // Student Information Section - Professional layout
      pdf.setFillColor(250, 251, 252);
      pdf.setDrawColor(241, 245, 249);
      pdf.setLineWidth(0.5);
      pdf.roundedRect(margin, yPos, pageWidth - 2 * margin, 36, 4, 4, 'FD');
      
      // Student Name
      pdf.setFontSize(7);
      pdf.setTextColor(lightSlate.r, lightSlate.g, lightSlate.b);
      pdf.setFont("helvetica", "bold");
      pdf.text("ALUNO", margin + 8, yPos + 8);
      
      pdf.setFontSize(12);
      pdf.setTextColor(darkSlate.r, darkSlate.g, darkSlate.b);
      pdf.setFont("helvetica", "bold");
      const studentName = user?.displayName || "Não informado";
      pdf.text(studentName.substring(0, 35), margin + 8, yPos + 17);
      
      // CPF
      const cpfValue = (user as any)?.cpf || "Não informado";
      pdf.setFontSize(7);
      pdf.setTextColor(lightSlate.r, lightSlate.g, lightSlate.b);
      pdf.setFont("helvetica", "bold");
      pdf.text("CPF", margin + 8, yPos + 26);
      
      pdf.setFontSize(9);
      pdf.setTextColor(mediumSlate.r, mediumSlate.g, mediumSlate.b);
      pdf.setFont("helvetica", "normal");
      pdf.text(cpfValue, margin + 8, yPos + 33);
      
      // Turma
      const turmaValue = (user as any)?.grade || "Não informada";
      const formattedTurma = turmaValue.toUpperCase().replace(/(\d+)(RE)(\d+)/i, "$1 REG $3");
      pdf.setFontSize(7);
      pdf.setTextColor(lightSlate.r, lightSlate.g, lightSlate.b);
      pdf.setFont("helvetica", "bold");
      pdf.text("TURMA", margin + 70, yPos + 26);
      
      pdf.setFontSize(9);
      pdf.setTextColor(mediumSlate.r, mediumSlate.g, mediumSlate.b);
      pdf.setFont("helvetica", "normal");
      pdf.text(formattedTurma, margin + 70, yPos + 33);
      
      // Year
      pdf.setFontSize(7);
      pdf.setTextColor(lightSlate.r, lightSlate.g, lightSlate.b);
      pdf.setFont("helvetica", "bold");
      pdf.text("ANO LETIVO", pageWidth - margin - 40, yPos + 8);
      
      pdf.setFontSize(12);
      pdf.setTextColor(accentBlue.r, accentBlue.g, accentBlue.b);
      pdf.setFont("helvetica", "bold");
      pdf.text(currentYear.toString(), pageWidth - margin - 40, yPos + 17);
      
      // Emission date
      pdf.setFontSize(7);
      pdf.setTextColor(lightSlate.r, lightSlate.g, lightSlate.b);
      pdf.setFont("helvetica", "bold");
      pdf.text("EMISSÃO", pageWidth - margin - 40, yPos + 26);
      
      pdf.setFontSize(9);
      pdf.setTextColor(mediumSlate.r, mediumSlate.g, mediumSlate.b);
      pdf.setFont("helvetica", "normal");
      pdf.text(new Date().toLocaleDateString("pt-BR"), pageWidth - margin - 40, yPos + 33);
      
      yPos += 46;
      
      // Performance summary - Clean horizontal cards
      const cardWidth = (pageWidth - 2 * margin - 8) / 3;
      const cardHeight = 28;
      
      // Average card
      pdf.setFillColor(claireBlue.r, claireBlue.g, claireBlue.b);
      pdf.roundedRect(margin, yPos, cardWidth, cardHeight, 4, 4, 'F');
      pdf.setFontSize(7);
      pdf.setTextColor(30, 64, 175);
      pdf.setFont("helvetica", "bold");
      pdf.text("MÉDIA GERAL", margin + cardWidth/2, yPos + 9, { align: "center" });
      pdf.setFontSize(16);
      pdf.text(allGradesStats.totalAverage.toFixed(1), margin + cardWidth/2, yPos + 22, { align: "center" });
      
      // Approved card - subtle green
      pdf.setFillColor(240, 253, 244);
      pdf.roundedRect(margin + cardWidth + 4, yPos, cardWidth, cardHeight, 4, 4, 'F');
      pdf.setFontSize(7);
      pdf.setTextColor(22, 101, 52);
      pdf.setFont("helvetica", "bold");
      pdf.text("APROVADO", margin + cardWidth + 4 + cardWidth/2, yPos + 9, { align: "center" });
      pdf.setFontSize(16);
      pdf.text(allGradesStats.approved.toString(), margin + cardWidth + 4 + cardWidth/2, yPos + 22, { align: "center" });
      
      // Recovery card - subtle amber
      pdf.setFillColor(254, 252, 232);
      pdf.roundedRect(margin + (cardWidth + 4) * 2, yPos, cardWidth, cardHeight, 4, 4, 'F');
      pdf.setFontSize(7);
      pdf.setTextColor(146, 64, 14);
      pdf.setFont("helvetica", "bold");
      pdf.text("RECUPERAÇÃO", margin + (cardWidth + 4) * 2 + cardWidth/2, yPos + 9, { align: "center" });
      pdf.setFontSize(16);
      pdf.text(allGradesStats.recovery.toString(), margin + (cardWidth + 4) * 2 + cardWidth/2, yPos + 22, { align: "center" });
      
      yPos += 36;
      
      // Grades table - Clean and professional
      const tableWidth = pageWidth - 2 * margin;
      const colWidths = {
        subject: tableWidth - 80,
        bim: 20
      };
      
      // Table header
      pdf.setFillColor(darkSlate.r, darkSlate.g, darkSlate.b);
      pdf.roundedRect(margin, yPos, tableWidth, 10, 3, 3, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "bold");
      
      pdf.text("DISCIPLINA", margin + 6, yPos + 7);
      const bimStartX = margin + colWidths.subject;
      pdf.text("1º", bimStartX + 10, yPos + 7, { align: "center" });
      pdf.text("2º", bimStartX + 30, yPos + 7, { align: "center" });
      pdf.text("3º", bimStartX + 50, yPos + 7, { align: "center" });
      pdf.text("4º", bimStartX + 70, yPos + 7, { align: "center" });
      
      yPos += 10;
      
      pdf.setFont("helvetica", "normal");
      allSubjects.forEach((subject, index) => {
        const bimestres = allSubjectsGrouped[subject];
        
        if (yPos > pageHeight - 52) {
          pdf.addPage();
          yPos = 20;
          
          // Subtle EduTok watermark on new pages
          pdf.setFontSize(70);
          pdf.setTextColor(250, 251, 252);
          pdf.setFont("helvetica", "bold");
          pdf.text("EduTok", pageWidth / 2, pageHeight / 2, { align: "center", angle: 35 });
          
          // Repeat header
          pdf.setFillColor(darkSlate.r, darkSlate.g, darkSlate.b);
          pdf.roundedRect(margin, yPos, tableWidth, 10, 3, 3, 'F');
          
          pdf.setTextColor(255, 255, 255);
          pdf.setFontSize(7);
          pdf.setFont("helvetica", "bold");
          pdf.text("DISCIPLINA", margin + 6, yPos + 7);
          pdf.text("1º", bimStartX + 10, yPos + 7, { align: "center" });
          pdf.text("2º", bimStartX + 30, yPos + 7, { align: "center" });
          pdf.text("3º", bimStartX + 50, yPos + 7, { align: "center" });
          pdf.text("4º", bimStartX + 70, yPos + 7, { align: "center" });
          
          yPos += 10;
          pdf.setFont("helvetica", "normal");
        }
        
        // Subtle alternating row colors
        if (index % 2 === 0) {
          pdf.setFillColor(250, 251, 252);
          pdf.rect(margin, yPos, tableWidth, 8, 'F');
        }
        
        pdf.setTextColor(mediumSlate.r, mediumSlate.g, mediumSlate.b);
        pdf.setFontSize(8);
        const displaySubject = subject.length > 35 ? subject.substring(0, 32) + "..." : subject;
        pdf.text(displaySubject, margin + 6, yPos + 6);
        
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        
        [1, 2, 3, 4].forEach((bim, idx) => {
          const bimGrades = bimestres[bim];
          const xPosition = bimStartX + 10 + (idx * 20);
          
          if (bimGrades && bimGrades.length > 0) {
            const grade = bimGrades[bimGrades.length - 1].grade;
            
            if (grade >= 15) {
              pdf.setTextColor(22, 163, 74);
            } else if (grade >= 12.5) {
              pdf.setTextColor(180, 120, 20);
            } else {
              pdf.setTextColor(220, 38, 38);
            }
            
            pdf.text(grade.toFixed(1), xPosition, yPos + 6, { align: "center" });
          } else {
            pdf.setTextColor(200, 210, 220);
            pdf.text("—", xPosition, yPos + 6, { align: "center" });
          }
        });
        
        pdf.setFont("helvetica", "normal");
        yPos += 8;
      });
      
      // Bottom line
      pdf.setDrawColor(230, 235, 240);
      pdf.setLineWidth(0.3);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      
      yPos += 8;
      
      // Check if we need a new page for legend and QR
      if (yPos > pageHeight - 58) {
        pdf.addPage();
        yPos = 20;
        
        // Watermark on new page
        pdf.setFontSize(70);
        pdf.setTextColor(250, 251, 252);
        pdf.setFont("helvetica", "bold");
        pdf.text("EduTok", pageWidth / 2, pageHeight / 2, { align: "center", angle: 35 });
      }
      
      // Compact legend
      pdf.setFontSize(6);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(lightSlate.r, lightSlate.g, lightSlate.b);
      
      const legendY = yPos + 2;
      pdf.setFillColor(22, 163, 74);
      pdf.circle(margin + 4, legendY, 1.5, 'F');
      pdf.text("Aprovado (≥15)", margin + 8, legendY + 1);
      
      pdf.setFillColor(180, 120, 20);
      pdf.circle(margin + 50, legendY, 1.5, 'F');
      pdf.text("Recuperação", margin + 54, legendY + 1);
      
      pdf.setFillColor(220, 38, 38);
      pdf.circle(margin + 95, legendY, 1.5, 'F');
      pdf.text("Reprovado (<12.5)", margin + 99, legendY + 1);
      
      yPos += 12;
      
      // QR Code section - Clean design
      pdf.setFillColor(claireBlue.r, claireBlue.g, claireBlue.b);
      pdf.roundedRect(margin, yPos, pageWidth - 2 * margin, 38, 4, 4, 'F');
      
      const qrSize = 30;
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(margin + 5, yPos + 4, qrSize + 2, qrSize + 2, 2, 2, 'F');
      pdf.addImage(qrCodeDataUrl, 'PNG', margin + 6, yPos + 5, qrSize, qrSize);
      
      pdf.setFontSize(11);
      pdf.setTextColor(darkSlate.r, darkSlate.g, darkSlate.b);
      pdf.setFont("helvetica", "bold");
      pdf.text("Boletim Digital", margin + qrSize + 14, yPos + 12);
      
      pdf.setFontSize(8);
      pdf.setTextColor(mediumSlate.r, mediumSlate.g, mediumSlate.b);
      pdf.setFont("helvetica", "normal");
      pdf.text("Escaneie para visualizar notas atualizadas em tempo real", margin + qrSize + 14, yPos + 21);
      
      pdf.setFontSize(7);
      pdf.setTextColor(lightSlate.r, lightSlate.g, lightSlate.b);
      pdf.text(`Válido até ${expiryDate.toLocaleDateString("pt-BR")}`, margin + qrSize + 14, yPos + 30);
      
      // Footer
      const footerY = pageHeight - 12;
      
      pdf.setFontSize(7);
      pdf.setTextColor(accentBlue.r, accentBlue.g, accentBlue.b);
      pdf.setFont("helvetica", "bold");
      pdf.text("EduTok", margin, footerY);
      
      pdf.setFontSize(6);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(lightSlate.r, lightSlate.g, lightSlate.b);
      pdf.text(" | Transformando a educação digital", margin + 14, footerY);
      
      pdf.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}`, pageWidth - margin, footerY, { align: "right" });
      
      pdf.save(`Boletim_${user?.displayName?.replace(/\s+/g, '_') || "Aluno"}_${currentYear}.pdf`);
      
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setGeneratingPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="max-w-3xl mx-auto px-4">
            <div className="flex items-center h-14 gap-3">
              <Skeleton className="w-9 h-9 rounded-full" />
              <Skeleton className="h-5 w-24" />
            </div>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 py-4 space-y-3">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </main>
        <div className="lg:hidden">
          <BottomNav />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-3xl mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setLocation(`${basePath}/dashboard`)}
                className="w-9 h-9 sm:w-10 sm:h-10 bg-card border border-border/50 rounded-full flex items-center justify-center hover:bg-card/80 hover:border-primary/40 active:scale-[0.98] transition-all duration-200 shadow-sm"
                data-testid="button-back"
              >
                <ChevronLeft className="w-5 h-5 text-foreground" />
              </button>
              <div className="bg-card border border-border/50 rounded-full px-4 py-2 shadow-sm">
                <h1 className="text-sm sm:text-base font-semibold text-foreground" data-testid="text-title">Notas</h1>
              </div>
            </div>
            
            {subjects.length > 0 && (
              <Button
                onClick={generatePDF}
                disabled={generatingPDF}
                size="sm"
                variant="ghost"
                className="bg-card border border-border/50 rounded-full px-3 sm:px-4 shadow-sm hover:bg-card/80 hover:border-primary/40"
                data-testid="button-generate-pdf"
              >
                {generatingPDF ? (
                  <span className="w-4 h-4 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-1.5" />
                    <span className="text-xs sm:text-sm font-medium">Gerar Boletim</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4 pb-28 lg:pb-8 space-y-5">
        <section className="flex items-center gap-2" data-testid="section-bimestre">
          {[1, 2, 3, 4].map((bim) => (
            <button
              key={bim}
              onClick={() => setSelectedBimestre(bim)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                selectedBimestre === bim
                  ? "bg-primary text-white shadow-sm"
                  : "bg-card text-muted-foreground border border-border/50"
              }`}
              data-testid={`button-bimestre-${bim}`}
            >
              {bim}º Bim
            </button>
          ))}
        </section>

        {subjects.length > 0 && (
          <section className="bg-card rounded-2xl p-4 border border-border/50" data-testid="section-stats">
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 flex-shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-muted/20"/>
                  <circle 
                    cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="2.5" 
                    className="text-primary"
                    strokeDasharray={`${(overallAverage / 25) * 94} 94`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold text-foreground leading-none" data-testid="text-average">{overallAverage.toFixed(1)}</span>
                </div>
              </div>
              
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground mb-2">Média do {selectedBimestre}º Bimestre</p>
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-muted-foreground" data-testid="stat-approved">{stats.approved} aprov.</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-muted-foreground" data-testid="stat-recovery">{stats.recovery} recup.</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-muted-foreground" data-testid="stat-failed">{stats.failed} reprov.</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        <section>
          {subjects.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Award className="w-7 h-7 text-muted-foreground" />
              </div>
              <h3 className="text-base font-medium text-foreground mb-1">Sem notas</h3>
              <p className="text-sm text-muted-foreground">
                As notas deste bimestre ainda não foram lançadas
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {subjects.map((subject) => {
                const subjectGrades = groupedBySubject[subject];
                const average = calculateAverage(subjectGrades);
                const percentage = (average / 25) * 100;

                return (
                  <div 
                    key={subject} 
                    className="bg-card rounded-xl p-3 border border-border/50"
                    data-testid={`card-subject-${subject}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-foreground truncate flex-1 mr-3">{subject}</span>
                      <span className={`text-base font-bold ${getGradeColor(average)}`} data-testid={`grade-${subject}`}>
                        {average.toFixed(1)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          average >= 15 ? 'bg-emerald-500' : 
                          average >= 12.5 ? 'bg-amber-500' : 
                          'bg-red-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <div className="lg:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
