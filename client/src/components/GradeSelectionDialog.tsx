import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ref, update } from "firebase/database";
import { profileNotasDatabase } from "@/lib/firebase";
import { GraduationCap } from "lucide-react";
import { useSchool } from "@/lib/useSchool";

interface GradeSelectionDialogProps {
  open: boolean;
}

const GRADE_GROUPS = [
  { year: 1, label: "Primero", grades: ["1reg1", "1reg2", "1reg3", "1reg4", "1reg5", "1reg6", "1reg7", "1reg8"] },
  { year: 2, label: "Segundo", grades: ["2reg1", "2reg2", "2reg3", "2reg4", "2reg5", "2reg6", "2reg7", "2reg8"] },
  { year: 3, label: "Tercero", grades: ["3reg1", "3reg2", "3reg3", "3reg4", "3reg5", "3reg6", "3reg7"] },
];

export function GradeSelectionDialog({ open }: GradeSelectionDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { school } = useSchool();
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const handleSaveGrade = async () => {
    if (!selectedGrade || !user) return;

    setSaving(true);
    try {
      const userRef = ref(profileNotasDatabase, `users/${user.uid}`);
      await update(userRef, { grade: selectedGrade });

      toast({
        title: "Turma configurada!",
        description: `Você foi adicionado à turma ${selectedGrade}`,
      });
    } catch (error) {
      console.error("Error saving grade:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível configurar sua turma. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-md" data-testid="dialog-grade-selection">
        <DialogHeader>
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl">
            Selecione sua Turma
          </DialogTitle>
          <DialogDescription className="text-center">
            Escolha sua turma para acessar o chat de grupo e se conectar com seus colegas de classe
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {GRADE_GROUPS.map((gradeGroup) => (
            <div key={gradeGroup.year}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                {gradeGroup.label}
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {gradeGroup.grades.map((grade) => (
                  <Card
                    key={grade}
                    className={`p-4 cursor-pointer text-center hover-elevate active-elevate-2 ${
                      selectedGrade === grade
                        ? "border-primary bg-primary/5"
                        : "border-card-border"
                    }`}
                    onClick={() => setSelectedGrade(grade)}
                    data-testid={`grade-option-${grade}`}
                  >
                    <div className="text-lg font-bold text-foreground">
                      {grade}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>

        <Button
          className="w-full"
          onClick={handleSaveGrade}
          disabled={!selectedGrade || saving}
          data-testid="button-save-grade"
        >
          {saving ? "Salvando..." : "Confirmar Turma"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
