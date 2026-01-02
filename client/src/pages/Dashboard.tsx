import { useAuth } from "@/lib/useAuth";
import { useSchool } from "@/lib/useSchool";
import { useEvents, useGrades, useEfeedPosts } from "@/lib/useFirebaseData";
import { BottomNav } from "@/components/BottomNav";
import { SchoolBranding } from "@/components/SchoolBranding";
import { PostText } from "@/components/PostText";
import { NotificationPanel } from "@/components/NotificationPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Calendar,
  Award,
  MessageCircle,
  Heart,
  Check,
  ChevronRight,
  Sparkles,
  BookOpen,
  Users,
  Settings,
  Send,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import esmeraldasLogo from "@assets/image_1765129798526.png";
import edunaAvatar from "@assets/generated_images/friendly_edutok_robot_mascot.png";
import { format, isToday, isTomorrow, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { database, profileNotasDatabase } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";

export default function Dashboard() {
  const { user } = useAuth();
  const { school } = useSchool();
  const [, setLocation] = useLocation();
  const { events } = useEvents(5);
  const { grades } = useGrades();
  const { posts } = useEfeedPosts(30);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isTeacherFlag, setIsTeacherFlag] = useState(false);
  const [studyStreak, setStudyStreak] = useState(0);
  const [aiChatActivity, setAiChatActivity] = useState<number[]>([]);
  const [miniChatInput, setMiniChatInput] = useState("");

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const isTeacher =
    isTeacherFlag ||
    (userRole &&
      (userRole === "teacher" ||
        userRole === "professor" ||
        userRole === "professora" ||
        userRole === "director" ||
        userRole === "vice_director"));

  const upcomingEvents = events
    .filter((e) => {
      if (e.date <= Date.now()) return false;
      if (e.visibility === "private") return e.createdBy === user?.uid;
      if (e.visibility === "class" && e.classId) {
        const userClasses = user?.classes || [];
        return userClasses.includes(e.classId);
      }
      return !e.visibility || e.visibility === "all";
    })
    .sort((a, b) => a.date - b.date)
    .slice(0, 4);

  const recentGrades = [...grades].sort((a, b) => b.date - a.date).slice(0, 6);
  const averageGrade =
    grades.length > 0
      ? grades.reduce((sum, g) => sum + g.grade, 0) / grades.length
      : 0;

  const trendingPosts = posts
    .map((post) => ({
      ...post,
      engagementScore:
        (post.likes || 0) +
        (post.commentCount || 0) * 2 +
        (post.retweets || 0) * 1.5,
    }))
    .sort((a, b) => b.engagementScore - a.engagementScore)
    .slice(0, 4);

  useEffect(() => {
    if (!user) return;
    const userProfileRef = ref(
      profileNotasDatabase,
      `userProfiles/${user.uid}`,
    );
    const unsubscribe = onValue(userProfileRef, (snapshot) => {
      if (snapshot.exists()) {
        const profile = snapshot.val();
        setUserRole(profile.role || null);
        setIsTeacherFlag(profile.isTeacher === true);
      }
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const activityRef = ref(database, `userAIChatActivity/${user.uid}`);
    const unsubscribe = onValue(activityRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setAiChatActivity(
          Object.values(data).map((item: any) => item.timestamp),
        );
      } else {
        setAiChatActivity([]);
      }
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const userPosts = posts.filter((p) => p.authorUid === user.uid);
    const activityDates = [
      ...userPosts.map((p) => p.timestamp),
      ...grades.map((g) => g.date),
      ...aiChatActivity,
    ].map((timestamp) => {
      const date = new Date(timestamp);
      date.setHours(0, 0, 0, 0);
      return date.getTime();
    });
    const uniqueDates = Array.from(new Set(activityDates)).sort(
      (a, b) => b - a,
    );
    if (uniqueDates.length === 0) {
      setStudyStreak(0);
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const mostRecentActivity = uniqueDates[0];

    if (
      mostRecentActivity !== today.getTime() &&
      mostRecentActivity !== yesterday.getTime()
    ) {
      setStudyStreak(0);
      return;
    }

    let streak = 1;
    const oneDayMs = 24 * 60 * 60 * 1000;
    for (let i = 1; i < uniqueDates.length; i++) {
      if (uniqueDates[i] === uniqueDates[i - 1] - oneDayMs) streak++;
      else break;
    }
    setStudyStreak(streak);
  }, [user, posts, grades, aiChatActivity]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const formatEventDate = (timestamp: number) => {
    const eventDate = new Date(timestamp);
    if (isToday(eventDate)) return "Hoje";
    if (isTomorrow(eventDate)) return "Amanha";
    return format(eventDate, "dd MMM", { locale: ptBR });
  };

  const basePath = school.basePath || "";

  const quickActions = isTeacher
    ? [
        {
          id: "notas",
          label: "Lancar Notas",
          path: `${basePath}/professor/notas`,
          color: "from-emerald-500 to-teal-600",
          icon: <Award className="w-6 h-6 text-white" />,
        },
        {
          id: "eventos",
          label: "Eventos",
          path: `${basePath}/professor/eventos`,
          color: "from-purple-500 to-violet-600",
          icon: <Calendar className="w-6 h-6 text-white" />,
        },
        {
          id: "chat",
          label: "Conversas",
          path: `${basePath}/chat`,
          color: "from-sky-500 to-blue-600",
          icon: <MessageCircle className="w-6 h-6 text-white" />,
        },
        {
          id: "efeed",
          label: "Efeed",
          path: `${basePath}/efeed`,
          color: "from-rose-500 to-pink-600",
          icon: <Heart className="w-6 h-6 text-white" />,
        },
        {
          id: "ia",
          label: "Assistente IA",
          path: `${basePath}/ai-chat`,
          color: "from-cyan-400 to-blue-500",
          icon: (
            <img
              src={edunaAvatar}
              alt="Eduna"
              className="w-full h-full object-cover rounded-full"
            />
          ),
          isAvatar: true,
        },
        {
          id: "calendario",
          label: "Calendario",
          path: `${basePath}/calendar`,
          color: "from-amber-500 to-orange-600",
          icon: <Calendar className="w-6 h-6 text-white" />,
        },
      ]
    : [
        {
          id: "ia",
          label: "Assistente IA",
          path: `${basePath}/ai-chat`,
          color: "from-cyan-400 to-blue-500",
          icon: (
            <img
              src={edunaAvatar}
              alt="Eduna"
              className="w-full h-full object-cover rounded-full"
            />
          ),
          isAvatar: true,
        },
        {
          id: "chat",
          label: "Conversas",
          path: `${basePath}/chat`,
          color: "from-sky-500 to-blue-600",
          icon: <MessageCircle className="w-6 h-6 text-white" />,
        },
        {
          id: "efeed",
          label: "Efeed",
          path: `${basePath}/efeed`,
          color: "from-rose-500 to-pink-600",
          icon: <Heart className="w-6 h-6 text-white" />,
        },
        {
          id: "notas",
          label: "Notas",
          path: `${basePath}/grades`,
          color: "from-emerald-500 to-teal-600",
          icon: <Award className="w-6 h-6 text-white" />,
        },
        {
          id: "calendario",
          label: "Calendario",
          path: `${basePath}/calendar`,
          color: "from-amber-500 to-orange-600",
          icon: <Calendar className="w-6 h-6 text-white" />,
        },
      ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-6xl mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <button
              onClick={() => setLocation(`${basePath}/profile`)}
              className="flex items-center gap-2.5 sm:gap-3 bg-card hover:bg-card/80 border border-border/50 hover:border-primary/40 rounded-full pl-1 pr-3 sm:pl-1.5 sm:pr-4 py-1 sm:py-1.5 shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-200"
              data-testid="button-profile"
            >
              <Avatar className="w-8 h-8 sm:w-9 sm:h-9 ring-2 ring-primary/20 ring-offset-1 ring-offset-background">
                <AvatarImage src={user?.photoURL} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-xs sm:text-sm font-bold">
                  {user?.displayName ? getInitials(user.displayName) : "EU"}
                </AvatarFallback>
              </Avatar>
              <div className="text-left">
                <p className="text-xs sm:text-sm font-semibold text-foreground leading-tight truncate max-w-[80px] sm:max-w-none">
                  {user?.displayName?.split(" ")[0] || "Estudante"}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">
                  {isTeacher ? "Professor" : "Estudante"}
                </p>
              </div>
            </button>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="bg-card border border-border/50 rounded-full p-0.5 sm:p-1 shadow-sm flex items-center">
                <NotificationPanel />
              </div>
              <div className="bg-white dark:bg-card border border-border/50 rounded-lg px-2.5 py-1 sm:px-3 sm:py-1.5 shadow-sm flex items-center">
                <img
                  src={esmeraldasLogo}
                  alt="Prefeitura de Esmeraldas"
                  className="h-5 sm:h-6 w-auto object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 lg:px-8 py-6 pb-28 lg:pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <section data-testid="hero-greeting">
              <p className="text-sm text-muted-foreground mb-1">
                {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
              </p>
              <h1
                className="text-2xl lg:text-3xl font-semibold text-foreground mb-4"
                data-testid="text-greeting"
              >
                {getGreeting()},{" "}
                {user?.displayName?.split(" ")[0] || "estudante"}
              </h1>

              {!isTeacher && (
                <div className="flex flex-wrap items-center gap-4 lg:gap-6">
                  {studyStreak > 0 && (
                    <div
                      className="flex items-center gap-3 bg-card rounded-2xl px-4 py-3 border border-border/50"
                      data-testid="stat-study-streak"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-white"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M12 2C8.5 6 4 9 4 14a8 8 0 0016 0c0-5-4.5-8-8-12zm0 18a6 6 0 01-6-6c0-3.5 3-6 6-9 3 3 6 5.5 6 9a6 6 0 01-6 6z" />
                        </svg>
                      </div>
                      <div>
                        <p
                          className="text-xl font-bold text-foreground leading-none"
                          data-testid="text-streak-count"
                        >
                          {studyStreak}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {studyStreak === 1 ? "dia seguido" : "dias seguidos"}
                        </p>
                      </div>
                    </div>
                  )}
                  {grades.length > 0 && (
                    <div
                      className="flex items-center gap-3 bg-card rounded-2xl px-4 py-3 border border-border/50"
                      data-testid="stat-average-grade"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-white"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                          <path d="M22 4L12 14.01l-3-3" />
                        </svg>
                      </div>
                      <div>
                        <p
                          className="text-xl font-bold text-foreground leading-none"
                          data-testid="text-average-grade"
                        >
                          {averageGrade.toFixed(1)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          media geral
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-sm font-medium text-muted-foreground mb-3">
                Acesso rapido
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {quickActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => setLocation(action.path)}
                    className="group flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
                    data-testid={`quick-action-${action.id}`}
                  >
                    <div
                      className={`w-12 h-12 lg:w-14 lg:h-14 ${(action as any).isAvatar ? "rounded-full bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900/30 dark:to-blue-900/30 p-1" : `rounded-2xl bg-gradient-to-br ${action.color}`} flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300 overflow-hidden`}
                    >
                      {action.icon}
                    </div>
                    <span className="text-xs font-medium text-foreground text-center">
                      {action.label}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {!isTeacher && grades.length > 0 && (
              <section className="lg:hidden">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-medium text-muted-foreground">
                    Desempenho
                  </h2>
                  <Link href={`${basePath}/grades`}>
                    <button className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
                      Ver notas <ChevronRight className="w-3 h-3" />
                    </button>
                  </Link>
                </div>

                <Card data-testid="card-performance-chart">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-center mb-5">
                      <div className="relative w-28 h-28">
                        <svg
                          className="w-full h-full -rotate-90"
                          viewBox="0 0 36 36"
                        >
                          <circle
                            cx="18"
                            cy="18"
                            r="14"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            className="text-muted/20"
                          />
                          <circle
                            cx="18"
                            cy="18"
                            r="14"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            className="text-primary"
                            strokeDasharray={`${(averageGrade / 25) * 88} 88`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span
                            className="text-2xl font-bold text-foreground"
                            data-testid="text-average-grade-chart"
                          >
                            {averageGrade.toFixed(1)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            de 25
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {recentGrades.slice(0, 4).map((grade) => (
                        <div
                          key={grade.id}
                          className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                          data-testid={`grade-${grade.id}`}
                        >
                          <span className="text-sm text-muted-foreground truncate max-w-[140px]">
                            {grade.subject}
                          </span>
                          <span
                            className={`text-sm font-bold ${
                              grade.grade >= 17.5
                                ? "text-emerald-600 dark:text-emerald-400"
                                : grade.grade >= 12.5
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {grade.grade.toFixed(1)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </section>
            )}

            {trendingPosts.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-medium text-muted-foreground">
                    Destaques do Efeed
                  </h2>
                  <Link href={`${basePath}/efeed`}>
                    <button className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
                      Ver mais <ChevronRight className="w-3 h-3" />
                    </button>
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {trendingPosts.slice(0, 2).map((post) => (
                    <Card
                      key={post.id}
                      className="hover:shadow-md hover:border-primary/20 cursor-pointer transition-all duration-300"
                      onClick={() => setLocation(`${basePath}/efeed`)}
                      data-testid={`trending-post-${post.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex gap-3">
                          <Avatar className="w-10 h-10 flex-shrink-0">
                            <AvatarImage src={post.authorPhoto} />
                            <AvatarFallback className="text-xs bg-muted">
                              {post.authorName?.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="font-medium text-foreground text-sm truncate">
                                {post.authorName}
                              </span>
                              {post.authorVerified && (
                                <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                                  <Check className="w-2.5 h-2.5 text-white" />
                                </div>
                              )}
                            </div>

                            <p className="text-sm text-foreground/80 line-clamp-2 mb-3">
                              <PostText text={post.text} />
                            </p>

                            {post.photoURL && (
                              <div className="rounded-xl overflow-hidden mb-3">
                                <img
                                  src={post.photoURL}
                                  alt=""
                                  className="w-full h-32 object-cover"
                                />
                              </div>
                            )}

                            <div className="flex items-center gap-4 text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <Heart className="w-4 h-4" />
                                <span className="text-xs font-medium">
                                  {post.likes || 0}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <MessageCircle className="w-4 h-4" />
                                <span className="text-xs font-medium">
                                  {post.commentCount || 0}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="space-y-6">
            {!isTeacher && grades.length > 0 && (
              <section className="hidden lg:block">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-medium text-muted-foreground">
                    Desempenho
                  </h2>
                  <Link href={`${basePath}/grades`}>
                    <button className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
                      Ver notas <ChevronRight className="w-3 h-3" />
                    </button>
                  </Link>
                </div>

                <Card data-testid="card-performance-chart">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-center mb-5">
                      <div className="relative w-28 h-28">
                        <svg
                          className="w-full h-full -rotate-90"
                          viewBox="0 0 36 36"
                        >
                          <circle
                            cx="18"
                            cy="18"
                            r="14"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            className="text-muted/20"
                          />
                          <circle
                            cx="18"
                            cy="18"
                            r="14"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            className="text-primary"
                            strokeDasharray={`${(averageGrade / 25) * 88} 88`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span
                            className="text-2xl font-bold text-foreground"
                            data-testid="text-average-grade-chart"
                          >
                            {averageGrade.toFixed(1)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            de 25
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {recentGrades.slice(0, 4).map((grade) => (
                        <div
                          key={grade.id}
                          className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                          data-testid={`grade-${grade.id}`}
                        >
                          <span className="text-sm text-muted-foreground truncate max-w-[140px]">
                            {grade.subject}
                          </span>
                          <span
                            className={`text-sm font-bold ${
                              grade.grade >= 17.5
                                ? "text-emerald-600 dark:text-emerald-400"
                                : grade.grade >= 12.5
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {grade.grade.toFixed(1)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </section>
            )}

            {upcomingEvents.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-medium text-muted-foreground">
                    Proximos eventos
                  </h2>
                  <Link href={`${basePath}/calendar`}>
                    <button className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
                      Ver todos <ChevronRight className="w-3 h-3" />
                    </button>
                  </Link>
                </div>

                <Card>
                  <CardContent className="p-2">
                    {upcomingEvents.map((event, index) => (
                      <button
                        key={event.id}
                        onClick={() => setLocation(`${basePath}/calendar`)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors ${index !== upcomingEvents.length - 1 ? "border-b border-border/50" : ""}`}
                        data-testid={`event-${event.id}`}
                      >
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex flex-col items-center justify-center flex-shrink-0">
                          <span className="text-base font-bold text-primary leading-none">
                            {format(new Date(event.date), "dd")}
                          </span>
                          <span className="text-[10px] text-primary/70 uppercase font-medium">
                            {format(new Date(event.date), "MMM", {
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-medium text-foreground truncate">
                            {event.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatEventDate(event.date)}
                          </p>
                        </div>
                        {event.type === "exam" && (
                          <span className="text-[10px] font-semibold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded-full">
                            Prova
                          </span>
                        )}
                      </button>
                    ))}
                  </CardContent>
                </Card>
              </section>
            )}

            {upcomingEvents.length === 0 && grades.length === 0 && (
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-2xl opacity-20 group-hover:opacity-30 blur-sm transition-opacity duration-500" />

                <Card className="relative overflow-hidden border border-cyan-500/20 dark:border-cyan-400/10 shadow-xl bg-gradient-to-br from-slate-50 via-white to-cyan-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-cyan-950/30">
                  <CardContent className="p-0">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-cyan-400/20 via-blue-500/10 to-transparent rounded-bl-full" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-400/10 via-transparent to-transparent rounded-tr-full" />

                    <div className="relative p-6">
                      <div className="flex items-start gap-4 mb-6">
                        <div className="relative flex-shrink-0">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-100 via-blue-50 to-purple-100 dark:from-cyan-900/40 dark:via-blue-900/30 dark:to-purple-900/40 flex items-center justify-center shadow-xl shadow-cyan-500/20 ring-4 ring-white/50 dark:ring-slate-800/50 overflow-hidden">
                            <img
                              src={edunaAvatar}
                              alt="Eduna"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-full border-[3px] border-white dark:border-slate-900 flex items-center justify-center shadow-lg">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                          </div>
                        </div>

                        <div className="flex-1 pt-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-base font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 dark:from-cyan-400 dark:via-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                              Eduna IA
                            </h3>
                            <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-full shadow-sm">
                              Pro
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Sua assistente inteligente de estudos
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3 mb-5">
                        <div className="flex items-end gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900/40 dark:to-blue-900/40 flex items-center justify-center flex-shrink-0 shadow-md overflow-hidden">
                            <img
                              src={edunaAvatar}
                              alt="Eduna"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="relative">
                            <div
                              className="absolute -left-1 bottom-0 w-3 h-3 bg-slate-100 dark:bg-slate-800 rounded-bl-xl"
                              style={{
                                clipPath: "polygon(100% 0, 0 100%, 100% 100%)",
                              }}
                            />
                            <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-bl-sm px-4 py-3.5 shadow-sm border border-slate-200/50 dark:border-slate-700/50">
                              <p className="text-sm text-foreground leading-relaxed">
                                Olá! Como posso te ajudar hoje?
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (miniChatInput.trim()) {
                            setLocation(
                              `${basePath}/ai-chat?initialMessage=${encodeURIComponent(miniChatInput.trim())}`,
                            );
                          }
                        }}
                        className="relative"
                      >
                        <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 focus-within:ring-2 focus-within:ring-cyan-500/30 focus-within:border-cyan-500/50 transition-all">
                          <Input
                            value={miniChatInput}
                            onChange={(e) => setMiniChatInput(e.target.value)}
                            placeholder="Faça uma pergunta..."
                            className="flex-1 text-sm border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50 h-10"
                            data-testid="input-mini-chat"
                          />
                          <Button
                            type="submit"
                            size="icon"
                            disabled={!miniChatInput.trim()}
                            className="rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/30 disabled:opacity-30 disabled:shadow-none h-10 w-10 transition-all duration-200"
                            data-testid="button-mini-chat-send"
                          >
                            <Send className="w-4 h-4 text-white" />
                          </Button>
                        </div>
                      </form>

                      <div className="flex items-center justify-center gap-2 mt-4">
                        <div className="flex -space-x-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                          <div
                            className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"
                            style={{ animationDelay: "0.2s" }}
                          />
                          <div
                            className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"
                            style={{ animationDelay: "0.4s" }}
                          />
                        </div>
                        <span className="text-[10px] font-medium text-muted-foreground/70">
                          EduTok 2.0 Pro
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>

      <div className="lg:hidden">
        <BottomNav />
      </div>
    </div>
  );
}

