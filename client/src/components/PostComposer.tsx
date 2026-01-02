import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { X, Image as ImageIcon, Video, BarChart3, Loader2, BookOpen, HelpCircle, Share2, Sparkles, MessageCircle } from "lucide-react";
import type { PostMood, SubjectTag } from "@shared/schema";

const MOODS: { value: PostMood; icon: any; label: string }[] = [
  { value: "studying", icon: BookOpen, label: "Estudando" },
  { value: "help", icon: HelpCircle, label: "Preciso de Ajuda" },
  { value: "sharing", icon: Share2, label: "Compartilhando" },
  { value: "celebrating", icon: Sparkles, label: "Celebrando" },
  { value: "question", icon: MessageCircle, label: "Pergunta" },
];

const SUBJECTS: SubjectTag[] = [
  "Matemática",
  "Português",
  "Física",
  "Química",
  "Biologia",
  "História",
  "Geografia",
  "Inglês",
  "Literatura",
  "Filosofia",
  "Sociologia",
  "Artes",
  "Educação Física",
  "Redação",
  "Ciências",
  "Geral",
];

interface PostComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  text: string;
  onTextChange: (text: string) => void;
  mood?: PostMood;
  onMoodChange: (mood: PostMood | undefined) => void;
  subjects: SubjectTag[];
  onSubjectsChange: (subjects: SubjectTag[]) => void;
  photoPreview: string | null;
  photoBase64: string | null;
  onPhotoChange: (preview: string | null, base64: string | null) => void;
  videoPreview: string | null;
  videoBase64: string | null;
  onVideoChange: (preview: string | null, base64: string | null) => void;
  onPollClick: () => void;
  onSubmit: () => void;
  posting: boolean;
  currentUser?: { uid: string; displayName?: string | null; photoURL?: string | null };
  currentProfile?: any;
  activePoll?: { question: string; options: string[] } | null;
  isTeacher?: boolean;
}

export function PostComposer({
  open,
  onOpenChange,
  text,
  onTextChange,
  mood,
  onMoodChange,
  subjects,
  onSubjectsChange,
  photoPreview,
  photoBase64,
  onPhotoChange,
  videoPreview,
  videoBase64,
  onVideoChange,
  onPollClick,
  onSubmit,
  posting,
  currentUser,
  currentProfile,
  activePoll,
  isTeacher = false,
}: PostComposerProps) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const toggleSubject = (subject: SubjectTag) => {
    if (subjects.includes(subject)) {
      onSubjectsChange(subjects.filter(s => s !== subject));
    } else {
      onSubjectsChange([...subjects, subject]);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "A imagem deve ter no máximo 5MB",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      onPhotoChange(base64, base64);
    };
    reader.readAsDataURL(file);
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O vídeo deve ter no máximo 50MB",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      onVideoChange(base64, base64);
    };
    reader.readAsDataURL(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Criar Publicação</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-1">
          <div className="space-y-4 pr-4">
            {/* User Info */}
            <div className="flex items-center gap-3">
              <Avatar className="w-11 h-11">
                <AvatarImage src={currentProfile?.photoURL || currentUser?.photoURL} />
                <AvatarFallback>
                  {(currentProfile?.displayName || currentUser?.displayName)?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-bold text-sm">{currentProfile?.displayName || currentUser?.displayName}</p>
                <p className="text-xs text-muted-foreground">Público</p>
              </div>
            </div>

            {/* Text Input */}
            <Textarea
              placeholder="No que você está pensando?"
              value={text}
              onChange={(e) => onTextChange(e.target.value)}
              className="min-h-[120px] resize-none border-0 focus-visible:ring-0 text-base"
              data-testid="input-post-text"
            />

            {/* Mood Selector */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Como você está se sentindo?</p>
              <div className="flex flex-wrap gap-2">
                {MOODS.map((m) => {
                  const Icon = m.icon;
                  return (
                    <Button
                      key={m.value}
                      variant={mood === m.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => onMoodChange(mood === m.value ? undefined : m.value)}
                      className="flex items-center gap-1.5"
                      data-testid={`mood-${m.value}`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{m.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Subject Selector */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Matérias relacionadas</p>
              <div className="flex flex-wrap gap-2">
                {SUBJECTS.map((subject) => (
                  <Badge
                    key={subject}
                    variant={subjects.includes(subject) ? "default" : "outline"}
                    className="cursor-pointer hover-elevate active-elevate-2"
                    onClick={() => toggleSubject(subject)}
                    data-testid={`subject-${subject}`}
                  >
                    {subject}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Photo Preview */}
            {photoPreview && (
              <div className="relative">
                <img src={photoPreview} alt="Preview" className="w-full rounded-lg max-h-[400px] object-contain" />
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2 h-8 w-8 rounded-full"
                  onClick={() => onPhotoChange(null, null)}
                  data-testid="button-remove-photo"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Video Preview */}
            {videoPreview && (
              <div className="relative">
                <video src={videoPreview} controls className="w-full rounded-lg max-h-[400px]" />
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2 h-8 w-8 rounded-full"
                  onClick={() => onVideoChange(null, null)}
                  data-testid="button-remove-video"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Active Poll */}
            {activePoll && (
              <div className="p-4 rounded-lg border bg-background/50">
                <p className="font-medium mb-2">{activePoll.question}</p>
                <div className="space-y-1">
                  {activePoll.options.map((opt, idx) => (
                    <div key={idx} className="text-sm text-muted-foreground">
                      • {opt}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="border-t pt-4 space-y-3">
          <div className="flex items-center gap-2">
            {isTeacher && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={posting || !!videoPreview}
                  data-testid="button-add-photo"
                >
                  <ImageIcon className="h-4 w-4" />
                  Foto
                </Button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />

                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={posting || !!photoPreview}
                  data-testid="button-add-video"
                >
                  <Video className="h-4 w-4" />
                  Vídeo
                </Button>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleVideoUpload}
                />
              </>
            )}

            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={onPollClick}
              disabled={posting}
              data-testid="button-add-poll"
            >
              <BarChart3 className="h-4 w-4" />
              Enquete
            </Button>
          </div>

          <Button
            className="w-full"
            onClick={onSubmit}
            disabled={posting || (!text.trim() && !photoPreview && !videoPreview && !activePoll)}
            data-testid="button-publish"
          >
            {posting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Publicando...
              </>
            ) : (
              "Publicar"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
