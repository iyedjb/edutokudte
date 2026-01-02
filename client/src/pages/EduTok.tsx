import { useState } from "react";
import { useAuth } from "@/lib/useAuth";
import { useVideos, useClasses } from "@/lib/useFirebaseData";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Heart, 
  MessageCircle, 
  Upload, 
  Loader2, 
  Play, 
  ChevronLeft, 
  Sparkles,
  TrendingUp,
  Clock,
  Eye,
  BookOpen,
  Video,
  Plus,
  Filter,
  Search
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ref as dbRef, push, set } from "firebase/database";
import { database } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import esmeraldasLogo from "@assets/image_1765129798526.png";

export default function EduTok() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { videos, loading, toggleLike } = useVideos();
  const { classes } = useClasses();
  const [, setLocation] = useLocation();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "recent" | "popular">("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [videoBase64, setVideoBase64] = useState<string>("");
  const [videoFileName, setVideoFileName] = useState<string>("");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('video/')) {
        toast({ title: "Arquivo inválido", description: "Selecione um vídeo.", variant: "destructive" });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "Arquivo muito grande", description: "Máximo 10MB.", variant: "destructive" });
        return;
      }
      setVideoFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) setVideoBase64(event.target.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!videoBase64 || !title || !selectedClassId || !user) {
      toast({ title: "Campos obrigatórios", description: "Preencha todos os campos.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const selectedClass = classes.find(c => c.id === selectedClassId);
      const videosRef = dbRef(database, 'videos');
      const newVideoRef = push(videosRef);
      await set(newVideoRef, {
        title,
        caption: caption || "",
        uploaderUid: user.uid,
        uploaderName: user.displayName,
        uploaderPhoto: user.photoURL || "",
        classId: selectedClassId,
        className: selectedClass?.name || "",
        timestamp: Date.now(),
        url: videoBase64,
        likes: 0,
        likedBy: [],
        comments: {},
        views: 0,
      });
      toast({ title: "Vídeo publicado!" });
      setVideoBase64("");
      setVideoFileName("");
      setTitle("");
      setCaption("");
      setSelectedClassId("");
      setUploadDialogOpen(false);
    } catch (error) {
      toast({ title: "Erro ao enviar", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleLike = async (videoId: string) => {
    if (user) await toggleLike(videoId, user.uid);
  };

  const filteredVideos = videos
    .filter(v => !searchQuery || v.title.toLowerCase().includes(searchQuery.toLowerCase()) || v.caption?.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (activeFilter === "popular") return (b.likes || 0) - (a.likes || 0);
      return b.timestamp - a.timestamp;
    });

  const stats = [
    { label: "Vídeos", value: videos.length, icon: Video, gradient: "from-blue-400 to-cyan-500" },
    { label: "Curtidas", value: videos.reduce((acc, v) => acc + (v.likes || 0), 0), icon: Heart, gradient: "from-rose-400 to-pink-500" },
    { label: "Turmas", value: Array.from(new Set(videos.map(v => v.classId))).length, icon: BookOpen, gradient: "from-amber-400 to-orange-500" }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
            <div className="relative w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-muted-foreground mt-4">Carregando vídeos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-8">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-1/3 left-0 w-[400px] h-[400px] bg-cyan-500/8 rounded-full blur-[100px]"></div>
        <div className="absolute top-1/2 right-0 w-[300px] h-[300px] bg-purple-500/6 rounded-full blur-[80px]"></div>
      </div>

      <header className="sticky top-0 z-40 bg-background/70 backdrop-blur-2xl border-b border-border/20">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-14 lg:h-16">
            <button
              onClick={() => setLocation("/")}
              className="p-2 -ml-2 rounded-full hover:bg-muted/50 transition-colors flex items-center gap-2"
              data-testid="button-back"
            >
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground hidden lg:inline">Voltar</span>
            </button>
            
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center">
                <Play className="w-4 h-4 text-white fill-white" />
              </div>
              <h1 className="text-lg font-bold hidden sm:block">EduTok</h1>
            </div>
            
            <div className="flex items-center gap-2">
              <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="rounded-full gap-2 h-9" data-testid="button-upload">
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Enviar</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md rounded-3xl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center">
                        <Upload className="w-4 h-4 text-white" />
                      </div>
                      Enviar Vídeo
                    </DialogTitle>
                    <DialogDescription>Compartilhe conteúdo educacional</DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Vídeo (máx 10MB)</Label>
                      <div className="mt-1.5 border-2 border-dashed border-border/50 rounded-2xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer" onClick={() => document.getElementById('video-file')?.click()}>
                        {videoFileName ? (
                          <div className="flex items-center justify-center gap-2 text-sm">
                            <Video className="w-5 h-5 text-primary" />
                            <span className="truncate max-w-[200px]">{videoFileName}</span>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">Clique para selecionar</p>
                          </>
                        )}
                      </div>
                      <Input id="video-file" type="file" accept="video/*" onChange={handleFileChange} disabled={uploading} className="hidden" data-testid="input-video-file" />
                    </div>

                    <div>
                      <Label>Título</Label>
                      <Input placeholder="Ex: Equações do 2º grau" value={title} onChange={(e) => setTitle(e.target.value)} disabled={uploading} className="rounded-xl mt-1.5" data-testid="input-video-title" />
                    </div>

                    <div>
                      <Label>Descrição</Label>
                      <Textarea placeholder="Adicione uma descrição..." value={caption} onChange={(e) => setCaption(e.target.value)} disabled={uploading} className="rounded-xl mt-1.5 resize-none" rows={3} data-testid="input-video-caption" />
                    </div>

                    <div>
                      <Label>Turma</Label>
                      <Select value={selectedClassId} onValueChange={setSelectedClassId} disabled={uploading}>
                        <SelectTrigger className="rounded-xl mt-1.5" data-testid="select-video-class">
                          <SelectValue placeholder="Selecione uma turma" />
                        </SelectTrigger>
                        <SelectContent>
                          {classes.map((cls) => (
                            <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" onClick={() => setUploadDialogOpen(false)} disabled={uploading} className="flex-1 rounded-xl" data-testid="button-cancel-upload">
                        Cancelar
                      </Button>
                      <Button onClick={handleUpload} disabled={uploading || !videoBase64 || !title || !selectedClassId} className="flex-1 rounded-xl" data-testid="button-submit-upload">
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Publicar"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              <div className="bg-white dark:bg-white/10 rounded-xl px-2.5 py-1.5 border border-border/20 hidden sm:block">
                <img src={esmeraldasLogo} alt="Esmeraldas" className="h-5 w-auto" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 lg:px-8 pt-6">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          
          <div className="hidden lg:block lg:col-span-3">
            <div className="sticky top-24 space-y-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-card/60 backdrop-blur-sm rounded-2xl border border-border/30 p-5"
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center">
                    <Play className="w-5 h-5 text-white fill-white" />
                  </div>
                  <div>
                    <h2 className="font-bold">EduTok</h2>
                    <p className="text-xs text-muted-foreground">Vídeos educacionais</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {stats.map((stat, i) => (
                    <div key={stat.label} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30">
                      <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center`}>
                        <stat.icon className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold">{stat.value}</div>
                        <div className="text-xs text-muted-foreground">{stat.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-card/60 backdrop-blur-sm rounded-2xl border border-border/30 p-5"
              >
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Filter className="w-4 h-4" /> Filtros
                </h3>
                <div className="space-y-2">
                  {[
                    { id: "all", label: "Todos", icon: Video },
                    { id: "recent", label: "Recentes", icon: Clock },
                    { id: "popular", label: "Populares", icon: TrendingUp }
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setActiveFilter(filter.id as any)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-sm font-medium transition-all ${
                        activeFilter === filter.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted/50 text-muted-foreground'
                      }`}
                    >
                      <filter.icon className="w-4 h-4" />
                      {filter.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>

          <div className="lg:col-span-9 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar vídeos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-xl bg-card/60 border-border/30"
                />
              </div>
              
              <div className="flex gap-2 lg:hidden overflow-x-auto scrollbar-hide">
                {[
                  { id: "all", label: "Todos" },
                  { id: "recent", label: "Recentes" },
                  { id: "popular", label: "Populares" }
                ].map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setActiveFilter(filter.id as any)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                      activeFilter === filter.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/50 text-muted-foreground'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </motion.div>

            {filteredVideos.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-card/60 backdrop-blur-sm rounded-3xl border border-border/30 p-12 text-center"
              >
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-cyan-500/20 flex items-center justify-center mx-auto mb-4">
                  <Video className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Nenhum vídeo encontrado</h2>
                <p className="text-muted-foreground mb-6">Seja o primeiro a compartilhar!</p>
                <Button onClick={() => setUploadDialogOpen(true)} className="rounded-full gap-2" data-testid="button-upload-empty">
                  <Upload className="w-4 h-4" /> Enviar Vídeo
                </Button>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                <AnimatePresence>
                  {filteredVideos.map((video, index) => {
                    const isLiked = video.likedBy?.includes(user?.uid || "");
                    const commentsCount = Object.keys(video.comments || {}).length;

                    return (
                      <motion.div
                        key={video.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ y: -4 }}
                        className="group"
                        data-testid={`card-video-${video.id}`}
                      >
                        <div className="bg-card/60 backdrop-blur-sm rounded-2xl border border-border/30 overflow-hidden hover:border-primary/30 transition-all">
                          <div className="relative aspect-video bg-black">
                            <video
                              src={video.url}
                              className="w-full h-full object-contain"
                              controls
                              preload="metadata"
                              data-testid={`video-player-${video.id}`}
                            />
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Badge className="bg-black/60 text-white border-0 rounded-full text-xs">
                                <Eye className="w-3 h-3 mr-1" /> {video.views || 0}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="p-4">
                            <div className="flex items-start gap-3">
                              <Avatar className="w-9 h-9 ring-2 ring-primary/20">
                                <AvatarImage src={video.uploaderPhoto} />
                                <AvatarFallback className="text-xs bg-gradient-to-br from-primary/20 to-cyan-200/30">
                                  {video.uploaderName?.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                                  {video.title}
                                </h3>
                                <p className="text-xs text-muted-foreground">{video.uploaderName}</p>
                              </div>
                            </div>

                            {video.caption && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-2">
                                {video.caption}
                              </p>
                            )}

                            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/30">
                              <button
                                onClick={() => handleLike(video.id)}
                                className="flex items-center gap-1.5 text-sm hover:scale-105 transition-transform"
                                data-testid={`button-like-${video.id}`}
                              >
                                <Heart className={`w-4 h-4 ${isLiked ? "fill-rose-500 text-rose-500" : "text-muted-foreground"}`} />
                                <span className="font-medium">{video.likes || 0}</span>
                              </button>

                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <MessageCircle className="w-4 h-4" />
                                <span>{commentsCount}</span>
                              </div>

                              <span className="text-xs text-muted-foreground ml-auto">
                                {formatDistanceToNow(new Date(video.timestamp), { addSuffix: true, locale: ptBR })}
                              </span>
                            </div>

                            {video.className && (
                              <Badge variant="secondary" className="mt-3 rounded-full text-xs">
                                <BookOpen className="w-3 h-3 mr-1" /> {video.className}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
