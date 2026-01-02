import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/useAuth";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, Send, Users } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Chat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: classes = [] } = useQuery({
    queryKey: ["/api/classes"],
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["/api/chat", selectedClassId],
    enabled: !!selectedClassId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: (text: string) =>
      apiRequest("POST", `/api/chat/${selectedClassId}/message`, { text }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat", selectedClassId] });
      setMessageText("");
    },
    onError: () => {
      toast({
        title: "Erro ao enviar mensagem",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (messageText.trim() && selectedClassId) {
      sendMessageMutation.mutate(messageText);
    }
  };

  const selectedClass = classes.find((c: any) => c.id === selectedClassId);

  return (
    <div className="h-screen bg-background flex flex-col pb-16">
      {/* Header */}
      <header className="bg-card border-b border-card-border px-4 py-4 sticky top-0 z-40">
        <h1 className="text-2xl font-bold text-foreground">Chat das Turmas</h1>
        <p className="text-sm text-muted-foreground">Converse com seus colegas</p>
      </header>

      {classes.length > 0 ? (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Class Selector */}
          <div className="border-b border-border bg-background sticky top-[72px] z-30">
            <ScrollArea className="w-full">
              <div className="flex gap-2 p-3">
                {classes.map((classItem: any) => (
                  <Button
                    key={classItem.id}
                    variant={selectedClassId === classItem.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedClassId(classItem.id)}
                    className="whitespace-nowrap"
                    data-testid={`button-class-${classItem.id}`}
                  >
                    {classItem.name}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 px-4" ref={scrollRef}>
            <div className="py-4 space-y-4 max-w-3xl mx-auto">
              {messages.length > 0 ? (
                messages.map((message: any) => {
                  const isOwnMessage = message.uid === user?.uid;
                  return (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${isOwnMessage ? "flex-row-reverse" : ""}`}
                      data-testid={`message-${message.id}`}
                    >
                      {!isOwnMessage && (
                        <Avatar className="w-8 h-8 mt-1">
                          <AvatarImage src={message.userPhoto} />
                          <AvatarFallback className="text-xs">
                            {message.userName?.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className={`flex-1 max-w-[75%] ${isOwnMessage ? "items-end" : ""}`}>
                        {!isOwnMessage && (
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-xs font-semibold text-foreground">
                              {message.userName}
                            </p>
                            {message.isTeacher && (
                              <Badge variant="secondary" className="text-xs h-5">
                                Professor
                              </Badge>
                            )}
                          </div>
                        )}
                        <div
                          className={`rounded-2xl px-4 py-2 ${
                            isOwnMessage
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : message.isTeacher
                              ? "bg-primary/10 text-foreground border-l-2 border-primary rounded-bl-sm"
                              : "bg-muted text-foreground rounded-bl-sm"
                          }`}
                        >
                          <p className="text-sm break-words">{message.text}</p>
                        </div>
                        <p className={`text-xs text-muted-foreground mt-1 ${isOwnMessage ? "text-right" : ""}`}>
                          {format(new Date(message.timestamp), "HH:mm")}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    Nenhuma mensagem ainda. Seja o primeiro a conversar!
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="border-t border-border bg-card p-4 sticky bottom-16 z-30">
            <div className="max-w-3xl mx-auto flex gap-2">
              <Input
                placeholder={`Mensagem para ${selectedClass?.name || "turma"}...`}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={sendMessageMutation.isPending}
                data-testid="input-message"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!messageText.trim() || sendMessageMutation.isPending}
                size="icon"
                data-testid="button-send-message"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
            <h2 className="text-xl font-semibold mb-2">Nenhuma turma disponível</h2>
            <p className="text-muted-foreground">
              Você será adicionado às turmas automaticamente
            </p>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
