import { Badge } from "@/components/ui/badge";
import type { SubjectTag } from "@shared/schema";
import { 
  Calculator, 
  Atom, 
  BookOpen, 
  Globe, 
  Palette, 
  Music, 
  Dumbbell, 
  Code, 
  Languages, 
  Briefcase, 
  Brain,
  FlaskConical,
  MapPin,
  PenTool,
  Trophy,
  Lightbulb
} from "lucide-react";

const SUBJECT_ICONS: Record<SubjectTag, any> = {
  "Matemática": Calculator,
  "Português": Languages,
  "Ciências": FlaskConical,
  "História": Globe,
  "Geografia": MapPin,
  "Inglês": Languages,
  "Educação Física": Dumbbell,
  "Artes": Palette,
  "Filosofia": Lightbulb,
  "Sociologia": Brain,
  "Física": Atom,
  "Química": FlaskConical,
  "Biologia": Brain,
  "Literatura": BookOpen,
  "Redação": PenTool,
  "Geral": Trophy,
};

const SUBJECT_LABELS: Record<SubjectTag, string> = {
  "Matemática": "Mat",
  "Português": "Port",
  "Ciências": "Ciên",
  "História": "Hist",
  "Geografia": "Geo",
  "Inglês": "Eng",
  "Educação Física": "Ed.F",
  "Artes": "Arte",
  "Filosofia": "Filo",
  "Sociologia": "Socio",
  "Física": "Fís",
  "Química": "Quím",
  "Biologia": "Bio",
  "Literatura": "Lit",
  "Redação": "Red",
  "Geral": "Geral",
};

interface CategoryBadgeProps {
  subject: SubjectTag;
  size?: "sm" | "default";
  onClick?: () => void;
}

export function CategoryBadge({ subject, size = "default", onClick }: CategoryBadgeProps) {
  const Icon = SUBJECT_ICONS[subject];
  const label = SUBJECT_LABELS[subject];
  
  return (
    <Badge
      variant="secondary"
      className={`flex items-center gap-1.5 ${size === "sm" ? "text-xs px-2 py-0.5" : ""} ${
        onClick ? "cursor-pointer hover-elevate active-elevate-2" : ""
      }`}
      onClick={onClick}
      data-testid={`category-${subject}`}
    >
      <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      <span>{label}</span>
    </Badge>
  );
}

interface CategoryListProps {
  subjects: SubjectTag[];
  onSubjectClick?: (subject: SubjectTag) => void;
}

export function CategoryList({ subjects, onSubjectClick }: CategoryListProps) {
  if (subjects.length === 0) return null;
  
  return (
    <div className="flex flex-wrap gap-1.5">
      {subjects.map((subject) => (
        <CategoryBadge
          key={subject}
          subject={subject}
          size="sm"
          onClick={onSubjectClick ? () => onSubjectClick(subject) : undefined}
        />
      ))}
    </div>
  );
}
