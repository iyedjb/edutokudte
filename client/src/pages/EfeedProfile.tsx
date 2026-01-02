import { useAuth } from "@/lib/useAuth";
import { useUserProfile, useFollowSystem, useUserGrades, useUserActivities } from "@/lib/useFirebaseData";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Check,
  UserPlus,
  UserMinus,
  Heart,
  MessageCircle,
  Mail,
  TrendingUp,
  Trophy,
  Award,
  Target,
  Zap,
  Star,
  BarChart3,
  Grid3x3,
  Calendar,
  Users,
  Send,
  Loader2,
  UserPlus as UserPlusIcon,
} from "lucide-react";
import { Link, useParams, useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function EfeedProfile() {
  const { uid } = useParams<{ uid: string }>();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { profile, loading } = useUserProfile(uid || null);
  const { grades, loading: gradesLoading } = useUserGrades(uid || null);
  const { activities, loading: activitiesLoading } = useUserActivities(uid || null);
  const { isFollowing, loading: followLoading, follow, unfollow } = useFollowSystem(
    user?.uid || null,
    uid || null
  );
  const [activeTab, setActiveTab] = useState("overview");

  const isOwnProfile = user?.uid === uid;
  const isTeacher = profile?.verified || false;

  if (loading || gradesLoading || activitiesLoading) {
    return (
      <div className="bg-background flex items-center justify-center pb-20 min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  if (!profile && !loading) {
    return (
      <div className="bg-background flex items-center justify-center pb-20 min-h-screen">
        <div className="text-center px-4">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Perfil não encontrado
          </h2>
          <p className="text-muted-foreground mb-6">
            Este usuário não existe ou ainda não criou um perfil.
          </p>
          <Button onClick={() => setLocation("/efeed")} data-testid="button-back-to-feed">
            Voltar ao Feed
          </Button>
        </div>
      </div>
    );
  }

  const handleFollowToggle = async () => {
    if (isFollowing) {
      await unfollow();
    } else {
      await follow();
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  // Calculate stats
  const averageGrade = grades.length > 0
    ? (grades.reduce((sum, g) => sum + g.grade, 0) / grades.length)
    : 0;

  const completionRate = grades.length > 0 ? Math.min(100, (grades.length / 10) * 100) : 0;
  const participationRate = activities.length > 0 ? Math.min(100, (activities.length / 20) * 100) : 0;

  const daysSinceJoined = profile?.createdAt 
    ? Math.floor((Date.now() - profile.createdAt) / (1000 * 60 * 60 * 24))
    : 0;

  const stats = isTeacher 
    ? [
        { label: "Dias", value: daysSinceJoined, icon: Calendar },
        { label: "Alunos", value: profile?.followerCount || 0, icon: Users },
        { label: "Posts", value: profile?.postCount || 0, icon: Send }
      ]
    : [
        { label: "Dias", value: daysSinceJoined, icon: Calendar },
        { label: "Média", value: averageGrade.toFixed(1), icon: TrendingUp },
        { label: "Notas", value: grades.length, icon: Trophy }
      ];

  const achievements = [
    { icon: Award, label: "Top Aluno", color: "from-amber-400 to-yellow-500" },
    { icon: Star, label: "5 Estrelas", color: "from-blue-400 to-cyan-500" },
    { icon: Zap, label: "Dedicação", color: "from-purple-400 to-pink-500" },
    { icon: Target, label: "Meta 100%", color: "from-green-400 to-emerald-500" }
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "post": return Send;
      case "chat_eduna": return MessageCircle;
      case "grade_update": return Trophy;
      case "comment": return MessageCircle;
      case "like": return Heart;
      case "follow": return UserPlusIcon;
      default: return Check;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "post": return "text-blue-500";
      case "chat_eduna": return "text-purple-500";
      case "grade_update": return "text-amber-500";
      case "comment": return "text-green-500";
      case "like": return "text-red-500";
      case "follow": return "text-primary";
      default: return "text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 bg-background border-b shadow-lg"
      >
        <div className="max-w-5xl mx-auto px-4 py-3.5">
          <div className="flex items-center gap-3">
            <Link href="/efeed">
              <Button size="icon" variant="ghost" className="relative group" data-testid="button-back">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <ArrowLeft className="w-5 h-5 relative z-10" />
              </Button>
            </Link>
            <h1 className="text-lg font-semibold" data-testid="text-username">
              {profile?.displayName || "Usuário"}
            </h1>
          </div>
        </div>
      </motion.header>

      <main className="max-w-5xl mx-auto px-4 pb-6">
        {/* Profile Header */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="pt-6 pb-4"
        >
          <div className="flex items-start gap-6">
            {/* Avatar with gradient ring */}
            <div className="relative">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="relative"
              >
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-tr from-primary via-purple-500 to-pink-500 p-[3px] shadow-lg">
                  <div className="w-full h-full rounded-full bg-background p-[3px]">
                    <Avatar className="w-full h-full border-2 border-background">
                      <AvatarImage src={profile?.photoURL} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-purple-200 text-primary font-bold text-2xl md:text-3xl">
                        {profile?.displayName ? getInitials(profile.displayName) : "U"}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Stats */}
            <div className="flex-1">
              <div className="flex justify-around md:justify-start md:gap-12 mb-4">
                {stats.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + index * 0.1 }}
                    className="text-center"
                  >
                    <div className="font-bold text-lg md:text-2xl" data-testid={`text-${stat.label.toLowerCase()}`}>
                      {stat.value}
                    </div>
                    <div className="text-xs md:text-sm text-muted-foreground">{stat.label}</div>
                  </motion.div>
                ))}
              </div>

              {/* Action Buttons */}
              {!isOwnProfile && (
                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={handleFollowToggle}
                    disabled={followLoading}
                    variant={isFollowing ? "secondary" : "default"}
                    className="flex-1 hover-elevate active-elevate-2 gap-2"
                    data-testid="button-follow-toggle"
                  >
                    {isFollowing ? (
                      <>
                        <UserMinus className="w-4 h-4" />
                        Seguindo
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        Seguir
                      </>
                    )}
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="hover-elevate active-elevate-2"
                    data-testid="button-message"
                    onClick={() => setLocation(`/chat?user=${uid}`)}
                  >
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Bio Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-4"
          >
            <div className="flex items-center gap-2">
              <h2 className="font-semibold">{profile?.displayName || "Usuário"}</h2>
              {isTeacher && (
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center shadow-md">
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <Mail className="w-4 h-4" />
              <span data-testid="text-user-email">{profile?.email || "Email não disponível"}</span>
            </div>
            
            {/* Bio */}
            {profile?.bio ? (
              <p className="mt-2 text-sm">{profile.bio}</p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground italic">
                {isTeacher ? "👨‍🏫 Professor dedicado • 📚 Compartilhando conhecimento" : "🎓 Estudante dedicado • 📚 Apaixonado por aprender"}
              </p>
            )}

            {/* Followers/Following */}
            <div className="flex gap-6 mt-3">
              <button 
                className="text-sm hover:text-primary transition-colors"
                data-testid="text-following-count"
              >
                <span className="font-bold">{profile?.followingCount || 0}</span>{" "}
                <span className="text-muted-foreground">Seguindo</span>
              </button>
              <button 
                className="text-sm hover:text-primary transition-colors"
                data-testid="text-followers-count"
              >
                <span className="font-bold">{profile?.followerCount || 0}</span>{" "}
                <span className="text-muted-foreground">
                  {profile?.followerCount === 1 ? "Seguidor" : "Seguidores"}
                </span>
              </button>
            </div>
          </motion.div>

          {/* Achievements/Highlights - Only for students */}
          {!isTeacher && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex gap-3 mt-6 overflow-x-auto scrollbar-hide"
            >
              {achievements.map((achievement, index) => (
                <motion.div
                  key={achievement.label}
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="flex-shrink-0"
                >
                  <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${achievement.color} p-[2px] shadow-md`}>
                    <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                      <achievement.icon className="w-6 h-6 text-foreground" />
                    </div>
                  </div>
                  <p className="text-xs text-center mt-2 text-muted-foreground max-w-[64px] truncate">
                    {achievement.label}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>

        {/* Tabs Navigation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
            <TabsList className="w-full grid grid-cols-3 mb-6">
              <TabsTrigger value="overview" className="gap-2" data-testid="tab-overview">
                <Grid3x3 className="w-4 h-4" />
                <span className="hidden md:inline">Visão Geral</span>
              </TabsTrigger>
              <TabsTrigger value="performance" className="gap-2" data-testid="tab-performance">
                <BarChart3 className="w-4 h-4" />
                <span className="hidden md:inline">Desempenho</span>
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-2" data-testid="tab-activity">
                <Heart className="w-4 h-4" />
                <span className="hidden md:inline">Atividade</span>
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="grid grid-cols-2 md:grid-cols-3 gap-4"
                >
                  {/* Grades Card - Only for students */}
                  {!isTeacher && (
                    <motion.div whileHover={{ scale: 1.02, y: -5 }}>
                      <Card className="overflow-hidden hover-elevate cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <Trophy className="w-5 h-5 text-amber-500" />
                            <Badge variant="secondary" className="text-xs">{grades.length}</Badge>
                          </div>
                          <h3 className="font-semibold text-sm">Notas</h3>
                          <p className="text-xs text-muted-foreground mt-1">Média {averageGrade.toFixed(1)}</p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}

                  {/* Stats Card */}
                  <motion.div whileHover={{ scale: 1.02, y: -5 }}>
                    <Card className="overflow-hidden hover-elevate cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <MessageCircle className="w-5 h-5 text-blue-500" />
                          <Badge variant="secondary" className="text-xs">Chat</Badge>
                        </div>
                        <h3 className="font-semibold text-sm">Mensagens</h3>
                        <p className="text-xs text-muted-foreground mt-1">Conversas</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                </motion.div>
              </AnimatePresence>
            </TabsContent>

            {/* Performance Tab */}
            <TabsContent value="performance" className="space-y-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key="performance"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        {isTeacher ? "Estatísticas de Ensino" : "Estatísticas de Desempenho"}
                      </h3>
                      <div className="space-y-4">
                        {!isTeacher ? (
                          <>
                            <div>
                              <div className="flex justify-between text-sm mb-2">
                                <span className="text-muted-foreground">Média Geral</span>
                                <span className="font-semibold">{averageGrade.toFixed(1)}/10</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${(averageGrade / 10) * 100}%` }}
                                  transition={{ duration: 1, ease: "easeOut" }}
                                  className="h-full bg-gradient-to-r from-primary to-purple-500"
                                />
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-sm mb-2">
                                <span className="text-muted-foreground">Taxa de Conclusão</span>
                                <span className="font-semibold">{completionRate.toFixed(0)}%</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${completionRate}%` }}
                                  transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                                />
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-sm mb-2">
                                <span className="text-muted-foreground">Participação</span>
                                <span className="font-semibold">{participationRate.toFixed(0)}%</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${participationRate}%` }}
                                  transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
                                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-500"
                                />
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <div className="flex justify-between text-sm mb-2">
                                <span className="text-muted-foreground">Posts Publicados</span>
                                <span className="font-semibold">{profile?.postCount || 0}</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.min(100, ((profile?.postCount || 0) / 50) * 100)}%` }}
                                  transition={{ duration: 1, ease: "easeOut" }}
                                  className="h-full bg-gradient-to-r from-primary to-purple-500"
                                />
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-sm mb-2">
                                <span className="text-muted-foreground">Seguidores (Alunos)</span>
                                <span className="font-semibold">{profile?.followerCount || 0}</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.min(100, ((profile?.followerCount || 0) / 100) * 100)}%` }}
                                  transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                                />
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-sm mb-2">
                                <span className="text-muted-foreground">Engajamento</span>
                                <span className="font-semibold">{participationRate.toFixed(0)}%</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${participationRate}%` }}
                                  transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
                                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-500"
                                />
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {!isTeacher && (
                    <Card>
                      <CardContent className="p-6">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                          <Award className="w-5 h-5 text-amber-500" />
                          Conquistas Recentes
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                          {achievements.map((achievement, index) => (
                            <motion.div
                              key={achievement.label}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: index * 0.1 }}
                              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                            >
                              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${achievement.color} flex items-center justify-center flex-shrink-0`}>
                                <achievement.icon className="w-5 h-5 text-white" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{achievement.label}</p>
                                <p className="text-xs text-muted-foreground">Desbloqueado</p>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </motion.div>
              </AnimatePresence>
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="space-y-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key="activity"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="font-semibold mb-4">Atividade Recente</h3>
                      {activitiesLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : activities.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>Nenhuma atividade recente</p>
                          <p className="text-sm mt-1">As atividades deste usuário aparecerão aqui</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {activities.slice(0, 10).map((activity, index) => {
                            const Icon = getActivityIcon(activity.type);
                            const colorClass = getActivityColor(activity.type);
                            
                            return (
                              <motion.div
                                key={activity.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="flex items-start gap-3 pb-4 border-b last:border-0"
                              >
                                <div className={`w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                                  <Icon className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-foreground">
                                    {activity.description}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {formatDistanceToNow(activity.timestamp, { 
                                      addSuffix: true, 
                                      locale: ptBR 
                                    })}
                                  </p>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </AnimatePresence>
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
}
