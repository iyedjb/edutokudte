import { useAuth } from "@/lib/useAuth";
import { useClasses, useGrades, useUserProfile, useUserActivities } from "@/lib/useFirebaseData";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Share2,
  Mail,
  TrendingUp,
  Trophy,
  LogOut,
  Check,
  Camera,
  Loader2,
  Heart,
  MessageCircle,
  Calendar,
  Award,
  Target,
  Zap,
  Star,
  Users,
  UserPlus,
  Send,
  Edit3,
  QrCode,
  ChevronLeft,
  Sparkles,
  Flame,
  Crown,
  BookOpen,
  GraduationCap
} from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { ref, update, get } from "firebase/database";
import { profileNotasDatabase } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { QrScanner } from "@/components/QrScanner";
import esmeraldasLogo from "@assets/image_1765129798526.png";

export default function Profile() {
  const { user, signOut } = useAuth();
  const { grades } = useGrades();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState<"stats" | "activity">("stats");
  
  const { profile: efeedProfile } = useUserProfile(user?.uid || null);
  const { activities, loading: activitiesLoading } = useUserActivities(user?.uid || null);
  
  const isTeacher = efeedProfile?.verified || false;
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBio, setEditBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (efeedProfile) {
      setEditName(efeedProfile.displayName || user?.displayName || "");
      setEditBio(efeedProfile.bio || "");
    }
    if (user) {
      setEditPhone(user.phone || "");
    }
  }, [efeedProfile, user]);

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2);
  };

  const handleEditProfile = () => {
    setEditName(efeedProfile?.displayName || user?.displayName || "");
    setEditPhone(user?.phone || "");
    setEditBio(efeedProfile?.bio || "");
    setEditDialogOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!user?.uid) return;
    setSaving(true);
    try {
      const userRef = ref(profileNotasDatabase, `users/${user.uid}`);
      await update(userRef, { displayName: editName, phone: editPhone });
      const profileUserRef = ref(profileNotasDatabase, `userProfiles/${user.uid}`);
      const snapshot = await get(profileUserRef);
      const currentProfile = snapshot.val() || {};
      await update(profileUserRef, { ...currentProfile, displayName: editName, bio: editBio });
      toast({ title: "Perfil atualizado!", description: "Suas informações foram salvas." });
      setEditDialogOpen(false);
    } catch (error) {
      toast({ title: "Erro ao salvar", description: "Não foi possível atualizar seu perfil.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleShareProfile = async () => {
    if (navigator.share && user?.uid) {
      try { await navigator.share({ title: 'Meu Perfil EduTok', text: `Confira meu perfil!` }); } catch {}
    } else if (user?.uid) {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast({ title: "Link copiado!" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 5MB.", variant: "destructive" });
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast({ title: "Tipo inválido", description: "Selecione uma imagem.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      setPreviewImage(base64String);
      await handleUploadProfilePicture(base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadProfilePicture = async (imageBase64: string) => {
    if (!user?.uid) return;
    setUploadingPicture(true);
    try {
      const idToken = await (await import("@/lib/firebase")).auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("Not authenticated");
      const response = await fetch('/api/profile/upload-picture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body: JSON.stringify({ image: imageBase64 }),
      });
      const data = await response.json();
      if (data.approved) {
        toast({ title: "Foto atualizada!" });
      } else {
        setPreviewImage(null);
        toast({ title: "Imagem não aprovada", variant: "destructive" });
      }
    } catch {
      setPreviewImage(null);
      toast({ title: "Erro ao enviar", variant: "destructive" });
    } finally {
      setUploadingPicture(false);
    }
  };

  const averageGrade = grades.length > 0 ? (grades.reduce((sum, g) => sum + g.grade, 0) / grades.length) : 0;
  const completionRate = grades.length > 0 ? Math.min(100, (grades.length / 10) * 100) : 0;
  const participationRate = activities.length > 0 ? Math.min(100, (activities.length / 20) * 100) : 0;
  const daysSinceJoined = efeedProfile?.createdAt ? Math.floor((Date.now() - efeedProfile.createdAt) / (1000 * 60 * 60 * 24)) : 0;

  const stats = [
    { label: "Dias", value: daysSinceJoined, icon: Flame, gradient: "from-orange-400 to-rose-500" },
    { label: "Média", value: averageGrade.toFixed(1), icon: TrendingUp, gradient: "from-emerald-400 to-cyan-500" },
    { label: "Notas", value: grades.length, icon: Trophy, gradient: "from-amber-400 to-orange-500" }
  ];

  const achievements = [
    { icon: Crown, label: "Top", gradient: "from-amber-400 to-yellow-500", unlocked: averageGrade >= 8 },
    { icon: Star, label: "Estrela", gradient: "from-blue-400 to-indigo-500", unlocked: grades.length >= 5 },
    { icon: Flame, label: "Foco", gradient: "from-orange-400 to-red-500", unlocked: daysSinceJoined >= 7 },
    { icon: Target, label: "Meta", gradient: "from-green-400 to-teal-500", unlocked: completionRate >= 100 }
  ];

  const quickLinks = [
    { label: "Notas", desc: `${grades.length} registros`, icon: Trophy, gradient: "from-amber-400 to-orange-500", path: "/grades" },
    { label: "Eduna IA", desc: "Assistente", icon: Sparkles, gradient: "from-violet-400 to-purple-500", path: "/ai-chat" },
    { label: "EduTok", desc: "Feed", icon: BookOpen, gradient: "from-blue-400 to-cyan-500", path: "/edutok" },
    { label: "Chat", desc: "Mensagens", icon: MessageCircle, gradient: "from-green-400 to-emerald-500", path: "/chat" }
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "post": return Send;
      case "chat_eduna": return Sparkles;
      case "grade_update": return Trophy;
      case "comment": return MessageCircle;
      case "like": return Heart;
      case "follow": return UserPlus;
      default: return Check;
    }
  };

  const getActivityGradient = (type: string) => {
    switch (type) {
      case "post": return "from-blue-400 to-cyan-500";
      case "chat_eduna": return "from-violet-400 to-purple-500";
      case "grade_update": return "from-amber-400 to-orange-500";
      case "like": return "from-rose-400 to-pink-500";
      default: return "from-gray-400 to-gray-500";
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-8">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-1/3 right-0 w-[400px] h-[400px] bg-cyan-500/8 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-purple-500/6 rounded-full blur-[80px]"></div>
        <div className="absolute top-1/2 right-1/4 w-[350px] h-[350px] bg-amber-500/5 rounded-full blur-[90px] hidden lg:block"></div>
      </div>

      <header className="sticky top-0 z-40 bg-background/70 backdrop-blur-2xl border-b border-border/20">
        <div className="max-w-6xl mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-14 lg:h-16">
            <button
              onClick={() => setLocation("/")}
              className="p-2 -ml-2 rounded-full hover:bg-muted/50 transition-colors flex items-center gap-2"
              data-testid="button-back"
            >
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground hidden lg:inline">Voltar</span>
            </button>
            
            <h1 className="text-base font-semibold lg:hidden">Meu Perfil</h1>
            
            <div className="bg-white dark:bg-white/10 rounded-xl px-3 py-1.5 border border-border/20">
              <img src={esmeraldasLogo} alt="Esmeraldas" className="h-5 lg:h-6 w-auto" />
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-4 lg:px-8 pt-6 lg:pt-10">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          
          <div className="lg:col-span-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:sticky lg:top-24"
            >
              <div className="bg-card/60 backdrop-blur-sm rounded-3xl border border-border/30 p-6 lg:p-8">
                <div className="text-center">
                  <div className="relative inline-block">
                    <div className="absolute -inset-3 bg-gradient-to-br from-primary/30 via-cyan-400/20 to-purple-500/30 rounded-full blur-xl opacity-70"></div>
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      className="relative w-24 h-24 lg:w-32 lg:h-32 rounded-full bg-gradient-to-br from-primary via-cyan-400 to-purple-500 p-[3px]"
                    >
                      <Avatar className="w-full h-full border-4 border-card">
                        <AvatarImage src={previewImage || efeedProfile?.photoURL || user?.photoURL} className="object-cover" />
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-cyan-200/30 text-primary font-bold text-xl lg:text-3xl">
                          {efeedProfile?.displayName ? getInitials(efeedProfile.displayName) : (user?.displayName ? getInitials(user.displayName) : "EU")}
                        </AvatarFallback>
                      </Avatar>
                    </motion.div>
                    <label 
                      htmlFor="profile-picture-upload"
                      className="absolute bottom-0 right-0 w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-primary flex items-center justify-center cursor-pointer shadow-lg border-3 border-card hover:scale-105 transition-transform"
                      data-testid="button-upload-picture"
                    >
                      {uploadingPicture ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Camera className="w-4 h-4 text-white" />}
                    </label>
                    <input id="profile-picture-upload" type="file" accept="image/*" className="hidden" onChange={handleImageSelect} disabled={uploadingPicture} />
                  </div>

                  <div className="mt-4 lg:mt-6">
                    <div className="flex items-center justify-center gap-2">
                      <h1 className="text-xl lg:text-2xl font-bold" data-testid="text-username">
                        {efeedProfile?.displayName || user?.displayName || "Estudante"}
                      </h1>
                      {isTeacher && (
                        <div className="w-5 h-5 lg:w-6 lg:h-6 rounded-full bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center">
                          <Check className="w-3 h-3 lg:w-4 lg:h-4 text-white" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1" data-testid="text-user-email">{user?.email}</p>
                    {efeedProfile?.bio && <p className="text-sm mt-3 text-muted-foreground">{efeedProfile.bio}</p>}
                  </div>

                  <div className="flex items-center justify-center gap-8 mt-5 lg:mt-6">
                    <button className="text-center" data-testid="text-followers-count">
                      <span className="block text-lg lg:text-xl font-bold">{efeedProfile?.followerCount || 0}</span>
                      <span className="text-xs text-muted-foreground">Seguidores</span>
                    </button>
                    <div className="w-px h-8 bg-border/50"></div>
                    <button className="text-center" data-testid="text-following-count">
                      <span className="block text-lg lg:text-xl font-bold">{efeedProfile?.followingCount || 0}</span>
                      <span className="text-xs text-muted-foreground">Seguindo</span>
                    </button>
                  </div>

                  <div className="flex gap-2 justify-center mt-5 lg:mt-6 flex-wrap">
                    <Button onClick={handleEditProfile} className="rounded-full h-10 px-5 gap-2" data-testid="button-edit-profile">
                      <Edit3 className="w-4 h-4" /> Editar
                    </Button>
                    <Button onClick={handleShareProfile} variant="outline" size="icon" className="rounded-full h-10 w-10" data-testid="button-share-profile">
                      {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                    </Button>
                    <Button onClick={() => setQrScannerOpen(true)} variant="outline" size="icon" className="rounded-full h-10 w-10" data-testid="button-qr-scanner">
                      <QrCode className="w-4 h-4" />
                    </Button>
                    <Button onClick={signOut} variant="outline" size="icon" className="rounded-full h-10 w-10" data-testid="button-logout">
                      <LogOut className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-6 lg:mt-8">
                  {stats.map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 + i * 0.05 }}
                      className="text-center p-3 rounded-2xl bg-muted/30"
                    >
                      <div className={`w-9 h-9 lg:w-10 lg:h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center mx-auto mb-2`}>
                        <stat.icon className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                      </div>
                      <div className="text-lg font-bold">{stat.value}</div>
                      <div className="text-xs text-muted-foreground">{stat.label}</div>
                    </motion.div>
                  ))}
                </div>

                {!isTeacher && (
                  <div className="mt-6 lg:mt-8">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Conquistas</h3>
                    <div className="flex justify-between">
                      {achievements.map((a, i) => (
                        <motion.div
                          key={a.label}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 + i * 0.05 }}
                          className={`text-center ${!a.unlocked ? 'opacity-30' : ''}`}
                        >
                          <div className={`w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br ${a.gradient} p-[2px] mx-auto`}>
                            <div className="w-full h-full rounded-2xl bg-card flex items-center justify-center">
                              <a.icon className="w-5 h-5 lg:w-6 lg:h-6" />
                            </div>
                          </div>
                          <p className="text-[10px] lg:text-xs mt-1.5 text-muted-foreground">{a.label}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          <div className="lg:col-span-8 mt-6 lg:mt-0 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-3"
            >
              {quickLinks.map((link, i) => (
                <motion.button
                  key={link.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + i * 0.05 }}
                  whileHover={{ y: -3 }}
                  onClick={() => setLocation(link.path)}
                  className="bg-card/60 backdrop-blur-sm rounded-2xl p-4 border border-border/30 text-left hover:border-primary/30 transition-all group"
                >
                  <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br ${link.gradient} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}>
                    <link.icon className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
                  </div>
                  <p className="font-medium text-sm lg:text-base">{link.label}</p>
                  <p className="text-xs text-muted-foreground">{link.desc}</p>
                </motion.button>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setActiveSection("stats")}
                  className={`flex-1 lg:flex-none lg:px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${activeSection === "stats" ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}
                >
                  Desempenho
                </button>
                <button
                  onClick={() => setActiveSection("activity")}
                  className={`flex-1 lg:flex-none lg:px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${activeSection === "activity" ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}
                >
                  Atividade Recente
                </button>
              </div>

              <AnimatePresence mode="wait">
                {activeSection === "stats" ? (
                  <motion.div
                    key="stats"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="bg-card/60 backdrop-blur-sm rounded-2xl p-5 lg:p-6 border border-border/30"
                  >
                    <h3 className="font-semibold mb-5 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-white" />
                      </div>
                      Seu Desempenho
                    </h3>
                    <div className="space-y-5">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Média Geral</span>
                          <span className="font-semibold text-emerald-500">{averageGrade.toFixed(1)}/25</span>
                        </div>
                        <div className="h-2.5 lg:h-3 bg-muted/50 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(averageGrade / 25) * 100}%` }}
                            transition={{ duration: 0.8 }}
                            className="h-full bg-gradient-to-r from-emerald-400 to-cyan-500 rounded-full"
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Taxa de Conclusão</span>
                          <span className="font-semibold text-blue-500">{completionRate.toFixed(0)}%</span>
                        </div>
                        <div className="h-2.5 lg:h-3 bg-muted/50 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${completionRate}%` }}
                            transition={{ duration: 0.8, delay: 0.1 }}
                            className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full"
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Participação</span>
                          <span className="font-semibold text-amber-500">{participationRate.toFixed(0)}%</span>
                        </div>
                        <div className="h-2.5 lg:h-3 bg-muted/50 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${participationRate}%` }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="activity"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="bg-card/60 backdrop-blur-sm rounded-2xl p-5 lg:p-6 border border-border/30"
                  >
                    <h3 className="font-semibold mb-5 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                        <Heart className="w-4 h-4 text-white" />
                      </div>
                      Atividade Recente
                    </h3>
                    {activitiesLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : activities.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Nenhuma atividade ainda</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {activities.slice(0, 8).map((activity, i) => {
                          const Icon = getActivityIcon(activity.type);
                          const gradient = getActivityGradient(activity.type);
                          return (
                            <motion.div
                              key={activity.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.05 }}
                              className="flex items-start gap-3"
                            >
                              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
                                <Icon className="w-4 h-4 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm leading-snug">{activity.description}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {formatDistanceToNow(activity.timestamp, { addSuffix: true, locale: ptBR })}
                                </p>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </main>

      <BottomNav />

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
            <DialogDescription>Atualize suas informações</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input id="name" value={editName} onChange={(e) => setEditName(e.target.value)} className="rounded-xl mt-1.5" data-testid="input-edit-name" />
            </div>
            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" value={editBio} onChange={(e) => setEditBio(e.target.value)} className="rounded-xl mt-1.5 resize-none" rows={3} data-testid="input-edit-bio" />
            </div>
            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="rounded-xl mt-1.5" data-testid="input-edit-phone" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleSaveProfile} disabled={saving} className="rounded-xl">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <QrScanner open={qrScannerOpen} onOpenChange={setQrScannerOpen} />
    </div>
  );
}
