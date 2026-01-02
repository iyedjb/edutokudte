import { useAuth } from "@/lib/useAuth";
import { useQuery } from "@tanstack/react-query";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Calendar, Clock, TrendingUp, Users, LogOut } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Dashboard() {
  const { user, signOut } = useAuth();

  const { data: classes = [] } = useQuery({
    queryKey: ["/api/classes"],
  });

  const { data: events = [] } = useQuery({
    queryKey: ["/api/events"],
  });

  const { data: recentGrades = [] } = useQuery({
    queryKey: ["/api/grades/recent", `uid=${user?.uid}`],
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const upcomingEvents = events.slice(0, 3);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-gradient-to-br from-primary/10 via-background to-background border-b border-border sticky top-0 z-40 backdrop-blur-sm">
        <div className="max-w-screen-xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="w-14 h-14 border-2 border-primary">
                <AvatarImage src={user?.photoURL} />
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                  {user?.displayName ? getInitials(user.displayName) : "EU"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  Olá, {user?.displayName?.split(" ")[0] || "Estudante"}!
                </h1>
                <p className="text-sm text-muted-foreground">Bem-vindo de volta</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              data-testid="button-logout"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-card-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{classes.length}</p>
                  <p className="text-xs text-muted-foreground">Turmas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-card-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-chart-2/10 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-chart-2" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {recentGrades.length > 0
                      ? (recentGrades.reduce((sum: number, g: any) => sum + g.grade, 0) / recentGrades.length).toFixed(1)
                      : "0.0"}
                  </p>
                  <p className="text-xs text-muted-foreground">Média</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Minhas Turmas */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Minhas Turmas</h2>
          </div>
          
          {classes.length > 0 ? (
            <ScrollArea className="w-full">
              <div className="flex gap-4 pb-4">
                {classes.map((classItem: any) => (
                  <Card
                    key={classItem.id}
                    className="min-w-[280px] border-card-border hover-elevate cursor-pointer"
                    data-testid={`card-class-${classItem.id}`}
                  >
                    <CardHeader className="space-y-1 pb-3">
                      <CardTitle className="text-base">{classItem.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {classItem.teacher}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {classItem.subject && (
                        <Badge variant="secondary" className="text-xs">
                          {classItem.subject}
                        </Badge>
                      )}
                      {classItem.schedule && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{classItem.schedule}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          ) : (
            <Card className="border-card-border">
              <CardContent className="p-8 text-center">
                <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Você ainda não está matriculado em nenhuma turma
                </p>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Próximos Eventos */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Próximos Eventos</h2>
          </div>

          {upcomingEvents.length > 0 ? (
            <div className="space-y-3">
              {upcomingEvents.map((event: any) => (
                <Card
                  key={event.id}
                  className="border-card-border hover-elevate"
                  data-testid={`card-event-${event.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center justify-center min-w-[60px] p-2 bg-primary/10 rounded-lg">
                        <span className="text-xs font-medium text-primary uppercase">
                          {format(new Date(event.date), "MMM", { locale: ptBR })}
                        </span>
                        <span className="text-xl font-bold text-primary">
                          {format(new Date(event.date), "dd")}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate mb-1">
                          {event.title}
                        </h3>
                        {event.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {event.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-xs">
                            {event.type === "exam" && "Prova"}
                            {event.type === "assignment" && "Trabalho"}
                            {event.type === "holiday" && "Feriado"}
                            {event.type === "meeting" && "Reunião"}
                            {event.type === "other" && "Outro"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-card-border">
              <CardContent className="p-8 text-center">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Nenhum evento próximo
                </p>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Notas Recentes */}
        {recentGrades.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Notas Recentes</h2>
            </div>
            <Card className="border-card-border">
              <CardContent className="p-4">
                <div className="space-y-3">
                  {recentGrades.slice(0, 3).map((grade: any) => (
                    <div
                      key={grade.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                      data-testid={`grade-${grade.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {grade.subject}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {grade.className} • {grade.bimestre}º Bimestre
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">{grade.grade.toFixed(1)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
