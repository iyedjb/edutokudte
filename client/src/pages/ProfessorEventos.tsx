import { useState, useEffect } from "react";
import { useAuth } from "@/lib/useAuth";
import { useEvents, createEvent, updateEvent, deleteEvent } from "@/lib/useFirebaseData";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Plus, Trash2, Edit, BookOpen, GraduationCap, PartyPopper, Users, Calendar as CalendarIcon, AlertCircle, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, isPast, isFuture } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useLocation } from "wouter";
import { ref, onValue } from "firebase/database";
import { profileNotasDatabase } from "@/lib/firebase";
import type { Event, InsertEvent } from "@shared/schema";

// Beta mode flag - set to false when all features are implemented
const EVENTS_BETA_MODE = true;

const EVENT_TYPES = [
  { value: "exam", label: "Prova", icon: BookOpen, color: "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300" },
  { value: "assignment", label: "Trabalho", icon: GraduationCap, color: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300" },
  { value: "holiday", label: "Feriado", icon: PartyPopper, color: "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300" },
  { value: "meeting", label: "Reunião", icon: Users, color: "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300" },
  { value: "other", label: "Outro", icon: CalendarIcon, color: "bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300" },
];

export default function ProfessorEventos() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { events, loading } = useEvents();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "upcoming" | "past">("all");
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  
  // Load available classes from actual users in permanent database (same as Chat page)
  useEffect(() => {
    const usersRef = ref(profileNotasDatabase, "users");
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val() || {};
      const grades = new Set<string>();
      
      Object.values(data).forEach((userData: any) => {
        if (userData.grade) {
          grades.add(userData.grade);
        }
      });

      setAvailableClasses([...Array.from(grades)].sort());
    });

    return () => unsubscribe();
  }, []);
  
  const [formData, setFormData] = useState<Partial<InsertEvent>>({
    title: "",
    description: "",
    date: Date.now(),
    type: "other",
    visibility: "all", // Always "all" in beta mode
  });

  useEffect(() => {
    if (editingEvent) {
      setFormData({
        title: editingEvent.title,
        description: editingEvent.description || "",
        date: editingEvent.date,
        type: editingEvent.type,
        visibility: EVENTS_BETA_MODE ? "all" : (editingEvent.visibility || "all"), // Force "all" in beta
        classId: editingEvent.classId,
      });
    }
  }, [editingEvent]);

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      date: Date.now(),
      type: "other",
      visibility: "all",
    });
    setEditingEvent(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title?.trim()) {
      toast({
        title: "Erro",
        description: "O título é obrigatório",
        variant: "destructive",
      });
      return;
    }

    if (!formData.date) {
      toast({
        title: "Erro",
        description: "A data é obrigatória",
        variant: "destructive",
      });
      return;
    }

    if (formData.visibility === "class") {
      if (!formData.classId?.trim()) {
        toast({
          title: "Erro",
          description: "Selecione uma turma quando a visibilidade for 'Turma específica'",
          variant: "destructive",
        });
        return;
      }
    }

    setSubmitting(true);

    try {
      const eventData = {
        ...formData,
        createdBy: user?.uid,
        creatorName: user?.displayName || "Professor",
      };

      if (editingEvent) {
        await updateEvent(editingEvent.id, eventData);
        toast({
          title: "Evento atualizado!",
          description: EVENTS_BETA_MODE 
            ? "O evento foi atualizado e está visível para todos os alunos"
            : "O evento foi atualizado com sucesso",
        });
      } else {
        await createEvent(eventData);
        toast({
          title: "Evento criado!",
          description: EVENTS_BETA_MODE
            ? "O evento foi criado e está visível para todos os alunos no dashboard"
            : "O evento foi criado e aparecerá no dashboard dos alunos",
        });
      }

      setShowAddDialog(false);
      resetForm();
    } catch (error) {
      console.error("Error saving event:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o evento",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteEventId) return;

    try {
      await deleteEvent(deleteEventId);
      toast({
        title: "Evento excluído",
        description: "O evento foi removido com sucesso",
      });
      setDeleteEventId(null);
    } catch (error) {
      console.error("Error deleting event:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o evento",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (event: Event) => {
    setEditingEvent(event);
    setShowAddDialog(true);
  };

  const closeDialog = () => {
    setShowAddDialog(false);
    resetForm();
  };

  const getEventTypeInfo = (type: string) => {
    return EVENT_TYPES.find(et => et.value === type) || EVENT_TYPES[4];
  };

  const filteredEvents = events.filter(event => {
    const now = Date.now();
    if (filterType === "upcoming") return event.date >= now;
    if (filterType === "past") return event.date < now;
    return true;
  });

  const upcomingEvents = filteredEvents.filter(e => isFuture(new Date(e.date))).sort((a, b) => a.date - b.date);
  const pastEvents = filteredEvents.filter(e => isPast(new Date(e.date))).sort((a, b) => b.date - a.date);

  return (
    <div className="bg-background pb-20 min-h-screen">
      <header className="bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-6 sticky top-0 z-40 shadow-md">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-8 h-8 text-white" />
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-white">Gerenciar Eventos</h1>
                {EVENTS_BETA_MODE && (
                  <Badge className="bg-yellow-500 text-yellow-950 hover:bg-yellow-400 text-xs font-semibold" data-testid="badge-beta">
                    BETA
                  </Badge>
                )}
              </div>
              <p className="text-sm text-white/80">
                {EVENTS_BETA_MODE 
                  ? "Recurso em desenvolvimento - atualmente apenas exibe eventos para todos os alunos"
                  : "Adicione eventos que aparecem no dashboard dos alunos"
                }
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <Card className="border-card-border">
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle>Todos os Eventos</CardTitle>
                <CardDescription>
                  Gerencie provas, trabalhos, reuniões e outros eventos
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                  <SelectTrigger className="w-[160px]" data-testid="select-filter-events">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="upcoming">Próximos</SelectItem>
                    <SelectItem value="past">Passados</SelectItem>
                  </SelectContent>
                </Select>
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                  <DialogTrigger asChild>
                    <Button onClick={() => resetForm()} data-testid="button-add-event">
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Evento
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingEvent ? "Editar Evento" : "Novo Evento"}</DialogTitle>
                      <DialogDescription>
                        {EVENTS_BETA_MODE 
                          ? (editingEvent 
                              ? "Atualize as informações do evento (visível para todos os alunos no modo beta)"
                              : "Crie um evento que aparecerá para todos os alunos no dashboard e calendário"
                            )
                          : (editingEvent 
                              ? "Atualize as informações do evento" 
                              : "Crie um evento que aparecerá no dashboard e calendário"
                            )
                        }
                      </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="event-title">Título *</Label>
                        <Input
                          id="event-title"
                          placeholder="Ex: Prova de Matemática"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          required
                          disabled={submitting}
                          data-testid="input-event-title"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="event-description">Descrição</Label>
                        <Textarea
                          id="event-description"
                          placeholder="Detalhes sobre o evento..."
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          disabled={submitting}
                          data-testid="input-event-description"
                          rows={3}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="event-date">Data e Hora *</Label>
                        <Input
                          id="event-date"
                          type="datetime-local"
                          value={format(new Date(formData.date || Date.now()), "yyyy-MM-dd'T'HH:mm")}
                          onChange={(e) => setFormData({ ...formData, date: new Date(e.target.value).getTime() })}
                          required
                          disabled={submitting}
                          data-testid="input-event-date"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="event-type">Tipo *</Label>
                        <Select 
                          value={formData.type} 
                          onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                          disabled={submitting}
                        >
                          <SelectTrigger id="event-type" data-testid="select-event-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {EVENT_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="event-visibility">Visibilidade *</Label>
                          {EVENTS_BETA_MODE && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="w-4 h-4 text-muted-foreground cursor-help" data-testid="icon-visibility-info" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p>No modo beta, apenas eventos visíveis para todos os alunos estão disponíveis. Turmas específicas e eventos privados em breve!</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                        <Select 
                          value={formData.visibility} 
                          onValueChange={(value: any) => setFormData({ ...formData, visibility: value, classId: value === "class" ? formData.classId : undefined })}
                          disabled={submitting}
                        >
                          <SelectTrigger id="event-visibility" data-testid="select-event-visibility">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos os alunos</SelectItem>
                            <SelectItem value="class" disabled={EVENTS_BETA_MODE}>
                              Turma específica {EVENTS_BETA_MODE && "(Em breve)"}
                            </SelectItem>
                            <SelectItem value="private" disabled={EVENTS_BETA_MODE}>
                              Apenas para mim {EVENTS_BETA_MODE && "(Em breve)"}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        {EVENTS_BETA_MODE && (
                          <p className="text-xs text-muted-foreground flex items-start gap-1">
                            <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span>Atualmente, apenas eventos visíveis para todos os alunos podem ser criados.</span>
                          </p>
                        )}
                      </div>

                      {formData.visibility === "class" && (
                        <div className="space-y-2">
                          <Label htmlFor="event-class">Turma</Label>
                          <Select
                            value={formData.classId || ""}
                            onValueChange={(value) => setFormData({ ...formData, classId: value })}
                            disabled={submitting}
                          >
                            <SelectTrigger id="event-class" data-testid="select-event-class">
                              <SelectValue placeholder="Selecione uma turma" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableClasses.length === 0 ? (
                                <SelectItem value="no-classes" disabled>
                                  Nenhuma turma disponível
                                </SelectItem>
                              ) : (
                                availableClasses.map((grade) => (
                                  <SelectItem key={grade} value={grade}>
                                    {grade}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <DialogFooter className="gap-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={closeDialog}
                          disabled={submitting}
                          data-testid="button-cancel-event"
                        >
                          Cancelar
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={submitting}
                          data-testid="button-save-event"
                        >
                          {submitting ? "Salvando..." : editingEvent ? "Atualizar" : "Criar Evento"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {EVENTS_BETA_MODE && (
              <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-md" data-testid="banner-beta-notice">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                      Recurso em Desenvolvimento (Beta)
                    </h4>
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      Esta funcionalidade está em fase beta. Atualmente, você pode criar eventos que serão exibidos para <strong>todos os alunos</strong>. 
                      As opções de eventos por turma específica e eventos privados estarão disponíveis em breve.
                    </p>
                  </div>
                </div>
              </div>
            )}
            {loading ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Carregando eventos...</p>
              </div>
            ) : filteredEvents.length > 0 ? (
              <div className="space-y-6">
                {filterType !== "past" && upcomingEvents.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3">Próximos Eventos</h3>
                    <div className="space-y-3">
                      {upcomingEvents.map((event) => {
                        const typeInfo = getEventTypeInfo(event.type);
                        const Icon = typeInfo.icon;
                        
                        return (
                          <Card key={event.id} className="border-card-border hover-elevate" data-testid={`card-event-${event.id}`}>
                            <CardContent className="p-4">
                              <div className="flex items-start gap-4">
                                <div className={`p-3 rounded-lg ${typeInfo.color}`}>
                                  <Icon className="w-5 h-5" />
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex-1 min-w-0">
                                      <h3 className="font-semibold text-foreground truncate" data-testid={`text-event-title-${event.id}`}>
                                        {event.title}
                                      </h3>
                                      <p className="text-sm text-muted-foreground">
                                        {format(new Date(event.date), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => openEditDialog(event)}
                                        data-testid={`button-edit-event-${event.id}`}
                                      >
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setDeleteEventId(event.id)}
                                        data-testid={`button-delete-event-${event.id}`}
                                      >
                                        <Trash2 className="w-4 h-4 text-destructive" />
                                      </Button>
                                    </div>
                                  </div>
                                  
                                  {event.description && (
                                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                      {event.description}
                                    </p>
                                  )}
                                  
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant="secondary" className="text-xs">
                                      {typeInfo.label}
                                    </Badge>
                                    {event.visibility === "class" && event.classId && (
                                      <Badge variant="outline" className="text-xs">
                                        Turma: {event.classId}
                                      </Badge>
                                    )}
                                    {event.creatorName && (
                                      <Badge variant="outline" className="text-xs">
                                        Por: {event.creatorName}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}

                {filterType !== "upcoming" && pastEvents.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3">Eventos Passados</h3>
                    <div className="space-y-3">
                      {pastEvents.map((event) => {
                        const typeInfo = getEventTypeInfo(event.type);
                        const Icon = typeInfo.icon;
                        
                        return (
                          <Card key={event.id} className="border-card-border hover-elevate opacity-70" data-testid={`card-event-${event.id}`}>
                            <CardContent className="p-4">
                              <div className="flex items-start gap-4">
                                <div className={`p-3 rounded-lg ${typeInfo.color}`}>
                                  <Icon className="w-5 h-5" />
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex-1 min-w-0">
                                      <h3 className="font-semibold text-foreground truncate">
                                        {event.title}
                                      </h3>
                                      <p className="text-sm text-muted-foreground">
                                        {format(new Date(event.date), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                                      </p>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setDeleteEventId(event.id)}
                                      data-testid={`button-delete-event-${event.id}`}
                                    >
                                      <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                  </div>
                                  
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant="secondary" className="text-xs">
                                      {typeInfo.label}
                                    </Badge>
                                    {event.creatorName && (
                                      <Badge variant="outline" className="text-xs">
                                        Por: {event.creatorName}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground mb-4">
                  {filterType === "upcoming" ? "Nenhum evento próximo" : filterType === "past" ? "Nenhum evento passado" : "Nenhum evento cadastrado"}
                </p>
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Primeiro Evento
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <AlertDialog open={!!deleteEventId} onOpenChange={() => setDeleteEventId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} data-testid="button-confirm-delete">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
