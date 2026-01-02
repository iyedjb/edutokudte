import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/useAuth";
import { useRole } from "@/lib/useRole";
import { 
  useGradeGroupMessages, 
  useProfessorAssignments, 
  useProfessorConversations, 
  useProfessorMessages,
  usePendingConversationsCount 
} from "@/lib/useFirebaseData";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Send, ArrowLeft, Search, Paperclip, Users, MessageCircle, FileText, X, Image as ImageIcon, Loader2, Check, CheckCheck, GraduationCap } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ref, onValue, get } from "firebase/database";
import { database, profileNotasDatabase } from "@/lib/firebase";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

export default function Chat() {
  const { user, firebaseUser } = useAuth();
  const { isProfessor } = useRole();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [userGrade, setUserGrade] = useState<string | null>(null);
  const [selectedProfessorConversation, setSelectedProfessorConversation] = useState<string | null>(null);
  const [newMessageDialog, setNewMessageDialog] = useState<{ open: boolean; professor: any | null }>({ open: false, professor: null });
  const [initialMessage, setInitialMessage] = useState("");
  const [viewingGroupChat, setViewingGroupChat] = useState(false);
  const [viewingArchivedTurmas, setViewingArchivedTurmas] = useState(false);
  const [selectedTurmaForView, setSelectedTurmaForView] = useState<string | null>(null);
  const [allTurmas, setAllTurmas] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<{ type: "image" | "document"; data: string; fileName?: string; fileSize?: number } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [teacherRoles, setTeacherRoles] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load teacher roles from permanent database
  useEffect(() => {
    const teachersRef = ref(profileNotasDatabase, "teachers");
    const unsubscribe = onValue(teachersRef, (snapshot) => {
      const data = snapshot.val() || {};
      const roles: Record<string, string> = {};
      Object.values(data).forEach((teacher: any) => {
        if (teacher.uid) {
          roles[teacher.uid] = teacher.role;
        }
      });
      setTeacherRoles(roles);
    });

    return () => unsubscribe();
  }, []);

  const { professors: gradeProfessors, loading: professorsLoading } = useProfessorAssignments(userGrade);
  const { conversations: studentConversations, loading: studentConvLoading, createConversation, approveConversation, rejectConversation } = useProfessorConversations(false);
  const { conversations: professorConversations, loading: professorConvLoading } = useProfessorConversations(true);
  const { messages: professorMessages, conversation: currentConversation, loading: messagesLoading, sendMessage: sendProfessorMessage } = useProfessorMessages(selectedProfessorConversation);
  
  // Use selectedTurmaForView if professor is viewing archived turma, otherwise use userGrade
  const turmaToView = selectedTurmaForView || userGrade;
  const { messages: groupMessages, loading: groupMessagesLoading, sendMessage: sendGroupMessage } = useGradeGroupMessages(turmaToView);
  const { count: pendingCount } = usePendingConversationsCount();
  const [verifiedTeachers, setVerifiedTeachers] = useState<any[]>([]);

  useEffect(() => {
    if (!user?.uid) return;

    const userRef = ref(profileNotasDatabase, `users/${user.uid}`);
    const unsubscribe = onValue(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.val();
        setUserGrade(userData.grade || null);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user?.uid]);

  // Load all turmas for professors (from permanent database)
  useEffect(() => {
    if (!isProfessor) return;

    const usersRef = ref(profileNotasDatabase, "users");
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val() || {};
      const grades = new Set<string>();
      
      Object.values(data).forEach((userData: any) => {
        if (userData.grade) {
          grades.add(userData.grade);
        }
      });

      setAllTurmas([...Array.from(grades)].sort());
    });

    return () => unsubscribe();
  }, [isProfessor]);

  // Load ALL teachers from the permanent database (admin-managed list)
  useEffect(() => {
    const teachersRef = ref(profileNotasDatabase, "teachers");
    const unsubscribe = onValue(teachersRef, async (snapshot) => {
      const data = snapshot.val() || {};
      const teacherArray = Object.keys(data).map(id => ({ id, ...data[id] }));
      
      // Include ALL teachers, fetch user data if they have registered
      const teachersWithDetails = await Promise.all(
        teacherArray.map(async (teacher) => {
          if (teacher.uid) {
            // Teacher has registered - fetch their user data from permanent database
            const userRef = ref(profileNotasDatabase, `users/${teacher.uid}`);
            const userSnapshot = await get(userRef);
            if (userSnapshot.exists()) {
              const userData = userSnapshot.val();
              return {
                id: teacher.id,
                professorUid: teacher.uid,
                professorEmail: teacher.email,
                professorName: userData.displayName || teacher.name,
                professorPhoto: userData.photoURL,
                role: teacher.role,
                isRegistered: true,
              };
            }
          }
          // Teacher hasn't registered yet - show with basic info
          return {
            id: teacher.id,
            professorUid: null,
            professorEmail: teacher.email,
            professorName: teacher.name,
            professorPhoto: null,
            role: teacher.role,
            isRegistered: false,
          };
        })
      );
      
      setVerifiedTeachers(teachersWithDetails);
    });

    return () => unsubscribe();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [professorMessages, groupMessages]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 10MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const isImage = file.type.startsWith("image/");
        
        setSelectedFile({
          type: isImage ? "image" : "document",
          data: base64,
          fileName: file.name,
          fileSize: file.size,
        });
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error reading file:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o arquivo",
        variant: "destructive",
      });
      setIsUploading(false);
    }
  };

  const moderateContent = async (text: string, attachment?: typeof selectedFile): Promise<boolean> => {
    try {
      const token = await firebaseUser?.getIdToken();
      const response = await fetch("/api/chat/moderate-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: text || "",
          image: attachment?.type === "image" ? attachment.data : undefined,
          fileType: attachment ? (attachment.type === "image" ? "image/jpeg" : "application/pdf") : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`${response.status}: ${await response.text()}`);
      }

      const responseData = await response.json();

      if (!responseData.approved) {
        toast({
          title: "Conteúdo bloqueado",
          description: responseData.message || "Este conteúdo não é apropriado para o ambiente educacional.",
          variant: "destructive",
        });
        return false;
      }

      return true;
    } catch (error: any) {
      console.error("Error moderating content:", error);
      toast({
        title: "Erro",
        description: "Não foi possível verificar o conteúdo. Tente novamente.",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleStartConversation = async () => {
    if (!initialMessage.trim() || !newMessageDialog.professor || !userGrade) return;

    // Check if professor is registered
    if (newMessageDialog.professor.isRegistered === false) {
      toast({
        title: "Professor não disponível",
        description: "Este professor ainda não criou uma conta. Você poderá conversar quando ele se cadastrar.",
        variant: "destructive",
      });
      return;
    }

    const approved = await moderateContent(initialMessage);
    if (!approved) return;

    try {
      const conversationId = await createConversation(
        newMessageDialog.professor.professorUid,
        newMessageDialog.professor.professorName,
        newMessageDialog.professor.professorPhoto,
        initialMessage,
        userGrade
      );

      if (conversationId) {
        setSelectedProfessorConversation(conversationId);
        setNewMessageDialog({ open: false, professor: null });
        setInitialMessage("");
        toast({
          title: "Mensagem enviada!",
          description: "Aguarde a aprovação do professor para continuar conversando",
        });
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a mensagem",
        variant: "destructive",
      });
    }
  };

  const handleSendProfessorMessage = async () => {
    if (!messageText.trim() && !selectedFile) return;

    const approved = await moderateContent(messageText, selectedFile || undefined);
    if (!approved) {
      setSelectedFile(null);
      return;
    }

    try {
      await sendProfessorMessage(messageText || " ", isProfessor, selectedFile || undefined);
      setMessageText("");
      setSelectedFile(null);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível enviar a mensagem",
        variant: "destructive",
      });
    }
  };

  const handleSendGroupMessage = async () => {
    if (!messageText.trim() && !selectedFile) return;
    if (!userGrade) return;

    const approved = await moderateContent(messageText, selectedFile || undefined);
    if (!approved) {
      setSelectedFile(null);
      return;
    }

    await sendGroupMessage(messageText || " ", selectedFile || undefined);
    setMessageText("");
    setSelectedFile(null);
  };

  const handleApprove = async (conversationId: string) => {
    await approveConversation(conversationId);
    toast({
      title: "Conversa aprovada!",
      description: "Agora você pode conversar com o aluno",
    });
  };

  const handleReject = async (conversationId: string) => {
    await rejectConversation(conversationId);
    toast({
      title: "Conversa rejeitada",
      description: "O aluno foi notificado",
    });
  };

  const getInitials = (name: string) => {
    return name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2) || "??";
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "0 KB";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const getRoleLabel = (uid: string) => {
    const role = teacherRoles[uid];
    if (!role) return "Professor";
    
    const roleLabels: Record<string, string> = {
      teacher: "Teacher",
      professora: "Professora",
      professor: "Professor",
      director: "Director",
      vice_director: "Vice Director",
    };
    
    return roleLabels[role] || "Professor";
  };

  // Chat conversation view (Professor-Student)
  if (selectedProfessorConversation && currentConversation) {
    const otherUser = isProfessor
      ? { name: currentConversation.studentName, photo: currentConversation.studentPhoto }
      : { name: currentConversation.professorName, photo: currentConversation.professorPhoto };

    const canSendMessage = isProfessor || currentConversation.status === "approved";

    return (
      <div className="flex flex-col h-[100dvh] bg-background">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/30">
          <div className="flex items-center gap-3 px-4 h-14 sm:h-16">
            <button
              onClick={() => setSelectedProfessorConversation(null)}
              data-testid="button-back"
              className="flex items-center justify-center w-9 h-9 bg-card hover:bg-card/80 border border-border/50 hover:border-primary/40 rounded-full shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <button className="flex items-center gap-2.5 bg-card hover:bg-card/80 border border-border/50 hover:border-primary/40 rounded-full pl-1 pr-4 py-1 shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-200 flex-1 min-w-0">
              <Avatar className="w-9 h-9 ring-2 ring-primary/20 ring-offset-1 ring-offset-background">
                <AvatarImage src={otherUser.photo} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-xs font-bold">
                  {getInitials(otherUser.name)}
                </AvatarFallback>
              </Avatar>
              <div className="text-left min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground leading-tight truncate">{otherUser.name}</p>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  {currentConversation.status === "approved" ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Online
                    </>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      Pendente
                    </>
                  )}
                </p>
              </div>
            </button>
          </div>
        </header>

        {/* Messages */}
        <main className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 pb-[calc(5rem+env(safe-area-inset-bottom))] space-y-3">
          {messagesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                  <Skeleton className="h-14 w-[70%] rounded-2xl" />
                </div>
              ))}
            </div>
          ) : professorMessages.length > 0 ? (
            professorMessages.map((message) => {
              const isOwn = message.senderUid === user?.uid;
              return (
                <div
                  key={message.id}
                  className={`flex gap-2 ${isOwn ? "justify-end" : "justify-start"}`}
                  data-testid={`message-${message.id}`}
                >
                  {!isOwn && (
                    <Avatar className="w-8 h-8 mt-1 flex-shrink-0">
                      <AvatarImage src={message.senderPhoto} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-xs font-bold">
                        {getInitials(message.senderName)}
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div className={`flex flex-col max-w-[80%] sm:max-w-[70%] ${isOwn ? "items-end" : "items-start"}`}>
                    {!isOwn && message.isProfessor && (
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4 bg-gradient-to-br from-blue-500 to-purple-600 text-white border-0 font-medium" data-testid={`prof-badge-${message.id}`}>
                          <GraduationCap className="w-2.5 h-2.5 mr-0.5" />
                          {getRoleLabel(message.senderUid)}
                        </Badge>
                      </div>
                    )}
                    <div
                      className={`${
                        isOwn
                          ? "rounded-2xl rounded-br-md px-4 py-2.5 bg-primary text-primary-foreground"
                          : "rounded-2xl rounded-bl-md px-4 py-2.5 bg-card border border-border/50"
                      }`}
                    >
                      {message.attachment?.type === "image" && (
                        <img
                          src={message.attachment.data}
                          alt="Attachment"
                          className="rounded-xl mb-2 max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(message.attachment!.data, "_blank")}
                          data-testid={`image-attachment-${message.id}`}
                        />
                      )}
                      {message.attachment?.type === "document" && (
                        <div className={`flex items-center gap-2 ${isOwn ? 'bg-primary-foreground/10' : 'bg-muted/50'} rounded-xl p-2 mb-2`}>
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <FileText className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{message.attachment.fileName}</p>
                            <p className="text-[10px] opacity-70">{formatFileSize(message.attachment.fileSize)}</p>
                          </div>
                        </div>
                      )}
                      {message.text && <p className="text-[15px] whitespace-pre-wrap break-words leading-relaxed">{message.text}</p>}
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1 px-1">
                      {format(new Date(message.timestamp), "HH:mm", { locale: ptBR })}
                    </span>
                  </div>

                  {isOwn && (
                    <Avatar className="w-8 h-8 mt-1 flex-shrink-0">
                      <AvatarImage src={message.senderPhoto} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-xs font-bold">
                        {getInitials(message.senderName)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-400 to-sky-500 flex items-center justify-center mb-4 shadow-lg">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
              <p className="font-semibold text-foreground text-lg">Nenhuma mensagem ainda</p>
              <p className="text-sm text-muted-foreground mt-1">Comece a conversa enviando uma mensagem</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </main>

        {/* Input Area */}
        <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-xl border-t border-border/30 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          {!canSendMessage && (
            <div className="bg-card border border-amber-500/30 text-center py-2 px-4 rounded-2xl mb-3">
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                Aguardando aprovação do professor
              </p>
            </div>
          )}

          {selectedFile && (
            <div className="mb-3 bg-card rounded-2xl p-3 relative border border-border/50">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full"
                onClick={() => setSelectedFile(null)}
                data-testid="button-remove-file"
              >
                <X className="w-4 h-4" />
              </Button>
              {selectedFile.type === "image" ? (
                <img src={selectedFile.data} alt="Preview" className="rounded-xl max-h-24 object-contain" data-testid="image-preview" />
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{selectedFile.fileName}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.fileSize)}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-end gap-2">
            <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.txt" onChange={handleFileSelect} className="hidden" data-testid="file-input" />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={!canSendMessage || isUploading}
              data-testid="button-attach"
              className="flex items-center justify-center w-10 h-10 bg-card hover:bg-card/80 border border-border/50 hover:border-primary/40 rounded-full shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-200 disabled:opacity-40"
            >
              {isUploading ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <Paperclip className="w-5 h-5 text-muted-foreground" />}
            </button>

            <div className="flex-1 bg-card rounded-2xl border border-border/50 focus-within:border-primary/40 transition-all">
              <Textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendProfessorMessage();
                  }
                }}
                placeholder={canSendMessage ? "Mensagem..." : "Aguardando..."}
                disabled={!canSendMessage}
                className="resize-none min-h-[40px] max-h-24 border-0 bg-transparent shadow-none text-[15px] px-4 py-2.5 focus-visible:ring-0 placeholder:text-muted-foreground/60"
                data-testid="input-message"
              />
            </div>

            <button
              onClick={handleSendProfessorMessage}
              disabled={(!messageText.trim() && !selectedFile) || !canSendMessage}
              data-testid="button-send"
              className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-full shadow-lg shadow-primary/20 hover:shadow-xl active:scale-[0.95] transition-all duration-200 disabled:opacity-40 disabled:shadow-none"
            >
              <Send className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

      </div>
    );
  }

  // Group chat view
  if (viewingGroupChat) {
    return (
      <div className="flex flex-col h-[100dvh] bg-background">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/30">
          <div className="flex items-center gap-3 px-4 h-14 sm:h-16">
            <button
              onClick={() => {
                setViewingGroupChat(false);
                setSelectedTurmaForView(null);
              }}
              data-testid="button-back-group"
              className="flex items-center justify-center w-9 h-9 bg-card hover:bg-card/80 border border-border/50 hover:border-primary/40 rounded-full shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <button className="flex items-center gap-2.5 bg-card hover:bg-card/80 border border-border/50 hover:border-primary/40 rounded-full pl-1 pr-4 py-1 shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-200 flex-1 min-w-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-400 to-sky-500 flex items-center justify-center shadow-sm">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div className="text-left min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground leading-tight truncate">Turma {turmaToView}</p>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  {selectedTurmaForView ? "Arquivado" : "Chat de grupo"}
                </p>
              </div>
            </button>
          </div>
        </header>

        {/* Messages */}
        <main className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 pb-[calc(5rem+env(safe-area-inset-bottom))] space-y-3">
          {groupMessagesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                  <Skeleton className="h-14 w-[70%] rounded-2xl" />
                </div>
              ))}
            </div>
          ) : groupMessages.length > 0 ? (
            groupMessages.map((message) => {
              const isOwn = message.senderUid === user?.uid;
              const messageWithAttachment = message as any;
              return (
                <div
                  key={message.id}
                  className={`flex gap-2 ${isOwn ? "justify-end" : "justify-start"}`}
                  data-testid={`group-message-${message.id}`}
                >
                  {!isOwn && (
                    <Avatar className="w-8 h-8 mt-1 flex-shrink-0">
                      <AvatarImage src={message.senderPhoto} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-xs font-bold">
                        {getInitials(message.senderName)}
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div className={`flex flex-col max-w-[80%] sm:max-w-[70%] ${isOwn ? "items-end" : "items-start"}`}>
                    {!isOwn && (
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className="text-xs font-semibold text-foreground">
                          {message.senderName.split(' ')[0]}
                        </span>
                        {messageWithAttachment.isProfessor && (
                          <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4 bg-gradient-to-br from-blue-500 to-purple-600 text-white border-0 font-medium" data-testid={`teacher-badge-${message.id}`}>
                            <GraduationCap className="w-2.5 h-2.5 mr-0.5" />
                            {getRoleLabel(message.senderUid)}
                          </Badge>
                        )}
                      </div>
                    )}
                    <div
                      className={`${
                        isOwn
                          ? "rounded-2xl rounded-br-md px-4 py-2.5 bg-primary text-primary-foreground"
                          : "rounded-2xl rounded-bl-md px-4 py-2.5 bg-card border border-border/50"
                      }`}
                    >
                      {messageWithAttachment.attachment?.type === "image" && (
                        <img
                          src={messageWithAttachment.attachment.data}
                          alt="Attachment"
                          className="rounded-xl mb-2 max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(messageWithAttachment.attachment!.data, "_blank")}
                          data-testid={`group-image-${message.id}`}
                        />
                      )}
                      {messageWithAttachment.attachment?.type === "document" && (
                        <div className={`flex items-center gap-2 ${isOwn ? 'bg-primary-foreground/10' : 'bg-muted/50'} rounded-xl p-2 mb-2`}>
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <FileText className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{messageWithAttachment.attachment.fileName}</p>
                            <p className="text-[10px] opacity-70">{formatFileSize(messageWithAttachment.attachment.fileSize)}</p>
                          </div>
                        </div>
                      )}
                      {message.text && message.text !== " " && (
                        <p className="text-[15px] whitespace-pre-wrap break-words leading-relaxed">{message.text}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1 px-1">
                      {format(new Date(message.timestamp), "HH:mm", { locale: ptBR })}
                    </span>
                  </div>

                  {isOwn && (
                    <Avatar className="w-8 h-8 mt-1 flex-shrink-0">
                      <AvatarImage src={message.senderPhoto} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-xs font-bold">
                        {getInitials(message.senderName)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-400 to-sky-500 flex items-center justify-center mb-4 shadow-lg">
                <Users className="w-8 h-8 text-white" />
              </div>
              <p className="font-semibold text-foreground text-lg">Nenhuma mensagem ainda</p>
              <p className="text-sm text-muted-foreground mt-1">Seja o primeiro a enviar uma mensagem!</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </main>

        {/* Input Area */}
        <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-xl border-t border-border/30 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          {selectedFile && (
            <div className="mb-3 bg-card rounded-2xl p-3 relative border border-border/50">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full"
                onClick={() => setSelectedFile(null)}
                data-testid="button-remove-group-file"
              >
                <X className="w-4 h-4" />
              </Button>
              {selectedFile.type === "image" ? (
                <img src={selectedFile.data} alt="Preview" className="rounded-xl max-h-24 object-contain" data-testid="group-image-preview" />
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{selectedFile.fileName}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.fileSize)}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-end gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              data-testid="button-attach-group"
              className="flex items-center justify-center w-10 h-10 bg-card hover:bg-card/80 border border-border/50 hover:border-primary/40 rounded-full shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-200 disabled:opacity-40"
            >
              {isUploading ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <Paperclip className="w-5 h-5 text-muted-foreground" />}
            </button>

            <div className="flex-1 bg-card rounded-2xl border border-border/50 focus-within:border-primary/40 transition-all">
              <Textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendGroupMessage();
                  }
                }}
                placeholder="Mensagem..."
                className="resize-none min-h-[40px] max-h-24 border-0 bg-transparent shadow-none text-[15px] px-4 py-2.5 focus-visible:ring-0 placeholder:text-muted-foreground/60"
                data-testid="input-group-message"
              />
            </div>

            <button
              onClick={handleSendGroupMessage}
              disabled={!messageText.trim() && !selectedFile}
              data-testid="button-send-group"
              className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-full shadow-lg shadow-primary/20 hover:shadow-xl active:scale-[0.95] transition-all duration-200 disabled:opacity-40 disabled:shadow-none"
            >
              <Send className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Conversations list view
  const displayConversations = isProfessor ? professorConversations : studentConversations;
  const conversationsLoading = isProfessor ? professorConvLoading : studentConvLoading;
  const existingProfessorIds = new Set(studentConversations.map(conv => conv.professorUid));

  const filteredConversations = displayConversations.filter(conv => {
    const name = isProfessor ? conv.studentName : conv.professorName;
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Merge grade-specific professors with all verified teachers, removing duplicates
  const allProfessors = [...gradeProfessors];
  verifiedTeachers.forEach(teacher => {
    if (!allProfessors.find(p => p.professorEmail === teacher.professorEmail)) {
      allProfessors.push(teacher);
    }
  });

  const filteredProfessors = allProfessors.filter(prof => {
    const name = prof.professorName || prof.professorEmail || "";
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center gap-3 h-14">
            <button
              onClick={() => setLocation("/")}
              data-testid="button-back"
              className="w-10 h-10 rounded-full bg-card border border-border/50 flex items-center justify-center hover:bg-muted/50 active:scale-95 transition-all"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="flex items-center gap-2 bg-card border border-border/50 rounded-full px-5 py-2">
              <h1 className="text-sm font-semibold text-foreground">Mensagens</h1>
              {pendingCount > 0 && (
                <Badge variant="destructive" className="rounded-full px-2 py-0.5 text-xs font-bold">
                  {pendingCount}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-4 pb-24">
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar conversas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 h-11 rounded-2xl border-border/50 bg-card shadow-sm focus:shadow-md transition-all"
            data-testid="input-search"
          />
        </div>

        {/* Quick Access Row */}
        <section className="mb-6">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Acesso rapido</h2>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
            {/* Group Chat */}
            {userGrade && (
              <button
                onClick={() => setViewingGroupChat(true)}
                className="group flex flex-col items-center gap-2 p-3 rounded-2xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
                data-testid="button-group-avatar"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-sky-500 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-medium text-foreground text-center">Turma</span>
              </button>
            )}

            {/* All Teachers */}
            {!isProfessor && allProfessors.slice(0, 5).map((prof) => (
              <button
                key={prof.id}
                onClick={() => {
                  if (prof.isRegistered === false) {
                    toast({
                      title: "Professor não disponível",
                      description: "Este professor ainda não criou uma conta. Você poderá conversar quando ele se cadastrar.",
                      variant: "default",
                    });
                  } else {
                    setNewMessageDialog({ open: true, professor: prof });
                  }
                }}
                className={`group flex flex-col items-center gap-2 p-3 rounded-2xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 ${prof.isRegistered === false ? 'opacity-60' : ''}`}
                data-testid={`button-prof-avatar-${prof.id}`}
              >
                <Avatar className="w-12 h-12 group-hover:scale-105 transition-transform duration-300">
                  <AvatarImage src={prof.professorPhoto} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-sm font-bold">
                    {getInitials(prof.professorName || prof.professorEmail)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium text-foreground text-center truncate max-w-full">
                  {(prof.professorName || prof.professorEmail).split(' ')[0]}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Recent Conversations */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Recentes</h2>
          
          {conversationsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Group Chat Card */}
              {userGrade && (
                <button
                  onClick={() => setViewingGroupChat(true)}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
                  data-testid="card-group-recent"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-400 to-sky-500 flex items-center justify-center shadow-lg flex-shrink-0">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <h3 className="font-semibold text-foreground mb-0.5">Turma {userGrade}</h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {groupMessages.length > 0
                        ? `${groupMessages[groupMessages.length - 1].senderName.split(' ')[0]}: ${groupMessages[groupMessages.length - 1].text || "Anexo"}`
                        : "Sem mensagens"}
                    </p>
                  </div>
                  {groupMessages.length > 0 && (
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {format(new Date(groupMessages[groupMessages.length - 1].timestamp), "HH:mm", { locale: ptBR })}
                    </span>
                  )}
                </button>
              )}

              {/* Conversations */}
              {filteredConversations.length > 0 ? (
                filteredConversations.map((conv) => {
                  const otherName = isProfessor ? conv.studentName : conv.professorName;
                  const otherPhoto = isProfessor ? conv.studentPhoto : conv.professorPhoto;
                  const showApprovalButtons = isProfessor && conv.status === "pending";

                  return (
                    <div key={conv.id} className="bg-card rounded-2xl border border-border/50 overflow-hidden hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
                      <button
                        onClick={() => !showApprovalButtons && setSelectedProfessorConversation(conv.id)}
                        className="w-full flex items-center gap-3 p-4"
                        data-testid={`card-conv-recent-${conv.id}`}
                      >
                        <Avatar className="w-12 h-12 flex-shrink-0">
                          <AvatarImage src={otherPhoto} />
                          <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-bold text-sm">
                            {getInitials(otherName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 text-left">
                          <h3 className="font-semibold text-foreground mb-0.5">{otherName}</h3>
                          <p className="text-sm text-muted-foreground truncate">
                            {conv.status === "pending" && "Aguardando aprovação"}
                            {conv.status === "approved" && (conv.initialMessage || "Conversa iniciada")}
                            {conv.status === "rejected" && "Rejeitada"}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                          <span className="text-[11px] text-muted-foreground font-medium bg-muted/50 px-2 py-1 rounded-full">14:59</span>
                          {conv.status === "pending" && (
                            <Badge variant="secondary" className="text-[10px] h-5 px-2 bg-amber-500/15 text-amber-600 dark:text-amber-400 border-0 rounded-full">Pendente</Badge>
                          )}
                        </div>
                      </button>

                      {showApprovalButtons && (
                        <div className="flex gap-2 px-4 pb-4">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApprove(conv.id);
                            }}
                            className="flex-1 rounded-[12px] shadow-sm"
                            data-testid={`button-approve-${conv.id}`}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Aprovar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReject(conv.id);
                            }}
                            className="flex-1 rounded-[12px]"
                            data-testid={`button-reject-${conv.id}`}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Rejeitar
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                !userGrade && (
                  <div className="text-center py-12 bg-card/50 rounded-[24px] border border-border/20">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-[18px] bg-muted/50 flex items-center justify-center">
                      <MessageCircle className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">
                      {searchQuery ? "Nenhuma conversa encontrada" : "Nenhuma conversa ainda"}
                    </p>
                  </div>
                )
              )}
            </div>
          )}
        </section>

        {/* Archived Turmas Section - Professors Only */}
        {isProfessor && allTurmas.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-1 uppercase tracking-wide">Turmas Arquivadas</h2>
            <div className="space-y-3">
              {allTurmas.map(turma => (
                <button
                  key={turma}
                  onClick={() => {
                    setSelectedTurmaForView(turma);
                    setViewingGroupChat(true);
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-[20px] bg-card/60 backdrop-blur-sm border border-border/30 shadow-sm hover:shadow-md hover:border-primary/20 active:scale-[0.99] transition-all duration-200"
                  data-testid={`button-archived-turma-${turma}`}
                >
                  <div className="w-14 h-14 rounded-[16px] bg-gradient-to-br from-muted to-muted/80 flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <h3 className="font-semibold text-[15px] text-foreground mb-0.5">Turma {turma}</h3>
                    <p className="text-sm text-muted-foreground font-normal">Chat arquivado</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] h-5 px-2.5 rounded-full bg-muted/80 border-0">Arquivo</Badge>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* New Message Dialog */}
      <Dialog open={newMessageDialog.open} onOpenChange={(open) => setNewMessageDialog({ ...newMessageDialog, open })}>
        <DialogContent data-testid="dialog-new-message" className="border-border/30 rounded-[24px] bg-card/95 backdrop-blur-xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Nova Mensagem</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Envie uma mensagem para {newMessageDialog.professor?.professorName || "o professor"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative bg-background/80 rounded-[16px] border border-border/30 shadow-sm transition-all focus-within:border-primary/50 focus-within:shadow-md">
              <Textarea
                value={initialMessage}
                onChange={(e) => setInitialMessage(e.target.value)}
                placeholder="Digite sua mensagem..."
                className="min-h-[120px] border-0 bg-transparent shadow-none text-[15px] px-4 py-3 focus-visible:ring-0 placeholder:text-muted-foreground/60 rounded-[16px]"
                data-testid="textarea-initial-message"
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setNewMessageDialog({ open: false, professor: null })}
                className="flex-1 h-12 rounded-[14px] border-2 border-border/50"
                data-testid="button-cancel-message"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleStartConversation}
                disabled={!initialMessage.trim()}
                className="flex-1 h-12 rounded-[14px] shadow-lg shadow-primary/20 hover:shadow-xl transition-all disabled:opacity-40"
                data-testid="button-start-conversation"
              >
                <Send className="w-4 h-4 mr-2" />
                Enviar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
