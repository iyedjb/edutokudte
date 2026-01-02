import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  X, 
  Image as ImageIcon, 
  Video, 
  BarChart3, 
  Loader2, 
  BookOpen, 
  HelpCircle, 
  Share2, 
  Sparkles, 
  MessageCircle,
  Smile,
  Send,
  Palette,
  Hash,
  Zap,
  Check
} from "lucide-react";
import type { PostMood, SubjectTag } from "@shared/schema";

const MOODS: { value: PostMood; icon: any; label: string; gradient: string; bgColor: string }[] = [
  { value: "studying", icon: BookOpen, label: "Estudando", gradient: "from-blue-500 to-cyan-500", bgColor: "bg-blue-500/10" },
  { value: "help", icon: HelpCircle, label: "Ajuda", gradient: "from-orange-500 to-red-500", bgColor: "bg-orange-500/10" },
  { value: "sharing", icon: Share2, label: "Compartilhando", gradient: "from-green-500 to-emerald-500", bgColor: "bg-green-500/10" },
  { value: "celebrating", icon: Sparkles, label: "Celebrando", gradient: "from-yellow-500 to-amber-500", bgColor: "bg-yellow-500/10" },
  { value: "question", icon: MessageCircle, label: "Pergunta", gradient: "from-purple-500 to-pink-500", bgColor: "bg-purple-500/10" },
];

const QUICK_SUBJECTS: SubjectTag[] = [
  "Matemática",
  "Português",
  "Física",
  "Química",
  "História",
  "Geral",
];

interface PostComposerInlineProps {
  currentUser?: { uid: string; displayName?: string | null; photoURL?: string | null };
  currentProfile?: any;
  onPost: (text: string, photoBase64: string | null, videoBase64: string | null, mood?: PostMood, subjects?: SubjectTag[]) => Promise<void>;
  onOpenAdvanced: () => void;
  posting: boolean;
  imagePostsToday: number;
}

export function PostComposerInline({
  currentUser,
  currentProfile,
  onPost,
  onOpenAdvanced,
  posting,
  imagePostsToday,
}: PostComposerInlineProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [text, setText] = useState("");
  const [mood, setMood] = useState<PostMood | undefined>(undefined);
  const [subjects, setSubjects] = useState<SubjectTag[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoBase64, setVideoBase64] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const toggleSubject = (subject: SubjectTag) => {
    if (subjects.includes(subject)) {
      setSubjects(subjects.filter(s => s !== subject));
    } else {
      if (subjects.length >= 3) {
        toast({
          title: "Limite atingido",
          description: "Você pode selecionar no máximo 3 matérias",
          variant: "destructive",
        });
        return;
      }
      setSubjects([...subjects, subject]);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (imagePostsToday >= 3) {
      toast({
        title: "Limite diário atingido",
        description: "Você já publicou 3 imagens hoje. Tente novamente amanhã.",
        variant: "destructive",
      });
      return;
    }

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
      setPhotoPreview(base64);
      setPhotoBase64(base64);
      setVideoPreview(null);
      setVideoBase64(null);
    };
    reader.onerror = () => {
      toast({
        title: "Erro ao carregar imagem",
        description: "Não foi possível carregar a imagem. Tente novamente.",
        variant: "destructive",
      });
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
      setVideoPreview(base64);
      setVideoBase64(base64);
      setPhotoPreview(null);
      setPhotoBase64(null);
    };
    reader.onerror = () => {
      toast({
        title: "Erro ao carregar vídeo",
        description: "Não foi possível carregar o vídeo. Tente novamente.",
        variant: "destructive",
      });
    };
    reader.readAsDataURL(file);
  };

  const handlePost = async () => {
    if (!text.trim() && !photoBase64 && !videoBase64) {
      toast({
        title: "Post vazio",
        description: "Escreva algo ou adicione uma mídia",
        variant: "destructive",
      });
      return;
    }

    await onPost(text, photoBase64, videoBase64, mood, subjects.length > 0 ? subjects : undefined);
    
    setText("");
    setMood(undefined);
    setSubjects([]);
    setPhotoPreview(null);
    setPhotoBase64(null);
    setVideoPreview(null);
    setVideoBase64(null);
    setIsExpanded(false);
  };

  const selectedMood = MOODS.find(m => m.value === mood);

  return (
    <motion.div
      layout
      className="bg-card/80 backdrop-blur-xl rounded-[28px] border border-border/20 overflow-hidden shadow-xl"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, type: "spring", stiffness: 300, damping: 30 }}
    >
      <div className="relative p-5">
        {!isExpanded && (
          <motion.div 
            className="flex items-center gap-4"
            layoutId="composer-header"
          >
            <div className="relative">
              <Avatar className="w-12 h-12 ring-[3px] ring-primary/20 ring-offset-2 ring-offset-background" data-testid="avatar-user">
                <AvatarImage src={currentProfile?.photoURL || currentUser?.photoURL} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-white font-bold">
                  {(currentProfile?.displayName || currentUser?.displayName)?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-background" />
            </div>
            
            <motion.button
              onClick={() => setIsExpanded(true)}
              className="flex-1 text-left px-5 py-3.5 rounded-2xl bg-muted/40 hover-elevate active-elevate-2 transition-all duration-200 border border-border/20"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              data-testid="button-expand-composer"
            >
              <span className="text-muted-foreground text-[15px]">No que você está pensando?</span>
            </motion.button>

            <div className="flex items-center gap-2">
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setIsExpanded(true);
                    setTimeout(() => photoInputRef.current?.click(), 100);
                  }}
                  className="rounded-2xl h-10 w-10 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 hover:from-blue-500/20 hover:to-cyan-500/20 text-blue-500"
                  data-testid="button-quick-photo"
                >
                  <ImageIcon className="w-5 h-5" />
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setIsExpanded(true)}
                  className="rounded-2xl h-10 w-10 bg-gradient-to-br from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 text-purple-500"
                  data-testid="button-quick-post"
                >
                  <Smile className="w-5 h-5" />
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 30 }}
              className="space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="relative">
                    <Avatar className="w-12 h-12 ring-[3px] ring-primary/20 ring-offset-2 ring-offset-background">
                      <AvatarImage src={currentProfile?.photoURL || currentUser?.photoURL} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-white font-bold">
                        {(currentProfile?.displayName || currentUser?.displayName)?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {currentProfile?.verified && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center border-2 border-background">
                        <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-[15px]">{currentProfile?.displayName || currentUser?.displayName}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Público</span>
                      {selectedMood && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                          <div className={`flex items-center gap-1 text-xs ${selectedMood.bgColor} px-2 py-0.5 rounded-full`}>
                            <selectedMood.icon className="w-3 h-3" />
                            <span className="font-medium">{selectedMood.label}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setIsExpanded(false)}
                    className="rounded-2xl h-9 w-9"
                    data-testid="button-collapse-composer"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </motion.div>
              </div>

              <Textarea
                placeholder="Compartilhe algo com a comunidade..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="min-h-[120px] resize-none border-0 focus-visible:ring-0 text-[15px] bg-transparent placeholder:text-muted-foreground/50 leading-relaxed"
                data-testid="input-post-text-inline"
              />

              <AnimatePresence>
                {photoPreview && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="relative rounded-2xl overflow-hidden"
                  >
                    <img src={photoPreview} alt="Preview" className="w-full rounded-2xl max-h-[280px] object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none rounded-2xl" />
                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="absolute top-3 right-3">
                      <Button
                        size="icon"
                        variant="destructive"
                        className="h-9 w-9 rounded-2xl shadow-xl"
                        onClick={() => {
                          setPhotoPreview(null);
                          setPhotoBase64(null);
                        }}
                        data-testid="button-remove-photo-inline"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  </motion.div>
                )}

                {videoPreview && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="relative rounded-2xl overflow-hidden"
                  >
                    <video src={videoPreview} controls className="w-full rounded-2xl max-h-[280px]" />
                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="absolute top-3 right-3">
                      <Button
                        size="icon"
                        variant="destructive"
                        className="h-9 w-9 rounded-2xl shadow-xl"
                        onClick={() => {
                          setVideoPreview(null);
                          setVideoBase64(null);
                        }}
                        data-testid="button-remove-video-inline"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 flex items-center justify-center">
                    <Palette className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <p className="text-xs font-semibold text-muted-foreground">Como você está se sentindo?</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {MOODS.map((m) => {
                    const Icon = m.icon;
                    const isSelected = mood === m.value;
                    return (
                      <motion.button
                        key={m.value}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setMood(mood === m.value ? undefined : m.value)}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-medium transition-all border ${
                          isSelected 
                            ? `bg-gradient-to-r ${m.gradient} text-white border-transparent shadow-lg` 
                            : `${m.bgColor} border-border/20 hover:border-border/40`
                        }`}
                        data-testid={`mood-inline-${m.value}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span>{m.label}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                      <Hash className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <p className="text-xs font-semibold text-muted-foreground">Matérias (máx 3)</p>
                  </div>
                  <button
                    onClick={onOpenAdvanced}
                    className="text-xs text-primary font-semibold hover:underline transition-colors"
                    data-testid="link-more-subjects"
                  >
                    Ver todas
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {QUICK_SUBJECTS.map((subject) => {
                    const isSelected = subjects.includes(subject);
                    return (
                      <motion.button
                        key={subject}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => toggleSubject(subject)}
                        className={`px-3.5 py-2 rounded-2xl text-xs font-medium transition-all border ${
                          isSelected 
                            ? 'bg-primary text-primary-foreground border-transparent shadow-md' 
                            : 'bg-muted/30 border-border/20 hover:border-border/40 hover:bg-muted/50'
                        }`}
                        data-testid={`subject-inline-${subject}`}
                      >
                        {subject}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border/20">
                <div className="flex items-center gap-1">
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={posting || !!videoPreview || imagePostsToday >= 3}
                      className="rounded-2xl h-10 w-10 hover:bg-blue-500/10 hover:text-blue-500 transition-colors"
                      data-testid="button-add-photo-inline"
                    >
                      <ImageIcon className="h-5 w-5" />
                    </Button>
                  </motion.div>

                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={handleVideoUpload}
                  />
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => videoInputRef.current?.click()}
                      disabled={posting || !!photoPreview}
                      className="rounded-2xl h-10 w-10 hover:bg-purple-500/10 hover:text-purple-500 transition-colors"
                      data-testid="button-add-video-inline"
                    >
                      <Video className="h-5 w-5" />
                    </Button>
                  </motion.div>

                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onOpenAdvanced}
                      disabled={posting}
                      className="rounded-2xl h-10 w-10 hover:bg-green-500/10 hover:text-green-500 transition-colors"
                      data-testid="button-open-advanced"
                    >
                      <BarChart3 className="h-5 w-5" />
                    </Button>
                  </motion.div>
                </div>

                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    onClick={handlePost}
                    disabled={posting || (!text.trim() && !photoPreview && !videoPreview)}
                    className="rounded-2xl px-6 h-11 bg-gradient-to-r from-primary via-purple-500 to-pink-500 hover:opacity-90 shadow-lg shadow-primary/25 border-0 gap-2"
                    data-testid="button-publish-inline"
                  >
                    {posting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Publicando...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4" />
                        <span className="font-semibold">Publicar</span>
                      </>
                    )}
                  </Button>
                </motion.div>
              </div>

              {imagePostsToday > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-2"
                >
                  <div className="flex gap-1">
                    {[1, 2, 3].map((i) => (
                      <div 
                        key={i} 
                        className={`w-2 h-2 rounded-full transition-all ${
                          i <= imagePostsToday ? 'bg-primary' : 'bg-muted'
                        }`} 
                      />
                    ))}
                  </div>
                  <span>{imagePostsToday}/3 imagens hoje</span>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
