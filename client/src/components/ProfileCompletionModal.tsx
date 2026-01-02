import { useState } from "react";
import { useAuth } from "@/lib/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface ProfileCompletionModalProps {
  open: boolean;
}

export function ProfileCompletionModal({ open }: ProfileCompletionModalProps) {
  const { user, updateUserProfile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const [cpf, setCpf] = useState(user?.cpf || "");
  const [birthdate, setBirthdate] = useState(user?.birthdate || "");
  const [school, setSchool] = useState(user?.school || "");
  const [grade, setGrade] = useState(user?.grade || "");

  // Grade options based on selected school
  const getGradeOptions = () => {
    if (school === "E.m Zita Lucas E Silva") {
      return [
        "701", "702", "703",
        "801", "802", "803",
        "901", "902", "903"
      ];
    } else if (school === "E.E Santa Quitéria") {
      const grades = [];
      for (let year = 1; year <= 3; year++) {
        for (let reg = 1; reg <= 7; reg++) {
          grades.push(`${year} reg ${reg}`);
        }
      }
      return grades;
    }
    return [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cpf.trim()) {
      toast({
        title: "CPF obrigatório",
        description: "Por favor, insira seu CPF.",
        variant: "destructive",
      });
      return;
    }

    if (!birthdate) {
      toast({
        title: "Data de nascimento obrigatória",
        description: "Por favor, insira sua data de nascimento.",
        variant: "destructive",
      });
      return;
    }

    if (!school) {
      toast({
        title: "Escola obrigatória",
        description: "Por favor, selecione sua escola.",
        variant: "destructive",
      });
      return;
    }

    if (!grade) {
      toast({
        title: "Turma obrigatória",
        description: "Por favor, selecione sua turma.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      await updateUserProfile({
        cpf,
        birthdate,
        school,
        grade,
      });

      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram salvas com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar perfil",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} modal>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Complete seu perfil</DialogTitle>
          <DialogDescription>
            Por favor, complete as informações abaixo para continuar usando o EduTok
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="profile-cpf">CPF *</Label>
            <Input
              id="profile-cpf"
              type="text"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              required
              disabled={isLoading}
              data-testid="input-profile-cpf"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-birthdate">Data de Nascimento *</Label>
            <Input
              id="profile-birthdate"
              type="date"
              value={birthdate}
              onChange={(e) => setBirthdate(e.target.value)}
              required
              disabled={isLoading}
              data-testid="input-profile-birthdate"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-school">Escola *</Label>
            <Select 
              value={school} 
              onValueChange={(value) => { 
                setSchool(value); 
                setGrade(""); 
              }} 
              disabled={isLoading}
            >
              <SelectTrigger id="profile-school" data-testid="select-profile-school">
                <SelectValue placeholder="Selecione sua escola" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="E.m Zita Lucas E Silva">E.m Zita Lucas E Silva</SelectItem>
                <SelectItem value="E.E Santa Quitéria">E.E Santa Quitéria</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-grade">Turma *</Label>
            <Select value={grade} onValueChange={setGrade} disabled={isLoading || !school}>
              <SelectTrigger id="profile-grade" data-testid="select-profile-grade">
                <SelectValue placeholder={school ? "Selecione sua turma" : "Primeiro selecione a escola"} />
              </SelectTrigger>
              <SelectContent>
                {getGradeOptions().map((gradeOption) => (
                  <SelectItem key={gradeOption} value={gradeOption}>
                    {gradeOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading}
            data-testid="button-profile-complete-submit"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Informações"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
