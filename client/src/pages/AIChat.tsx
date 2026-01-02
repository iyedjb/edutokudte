import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/useAuth";
import { logActivity } from "@/lib/useFirebaseData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Send,
  Mic,
  X,
  Copy,
  Image as ImageIcon,
  ArrowLeft,
  BookOpen,
  Calculator,
  Lightbulb,
  Globe,
  Plus,
  StopCircle,
  Search,
  Eye,
  Download,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { database, profileNotasDatabase } from "@/lib/firebase";
import edunaAvatar from "@assets/generated_images/friendly_edutok_robot_mascot.png";
import { ref, get, query, limitToFirst, push } from "firebase/database";
import { useLocation } from "wouter";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  isTyping?: boolean;
  image?: string;
}

// Eduna 5.0 configuration
const EDUNA_MODEL = {
  id: "eduna-5.0",
  name: "Eduna 5.0",
  features: ["Deep Search", "Voz para Texto", "Visão"],
};

// Image analysis animation component
function ImageAnalyzingAnimation() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-2xl rounded-tl-md">
      <div className="relative w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/30 via-transparent to-transparent animate-scan-line" />
        <ImageIcon className="w-5 h-5 text-cyan-500" />
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-primary animate-pulse" />
          <span className="text-sm font-medium text-foreground">Analisando imagem...</span>
        </div>
        <div className="flex gap-1">
          <div className="h-1 w-16 bg-muted rounded-full overflow-hidden">
            <div className="h-full w-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full animate-analyzing-progress" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Image generation progress component
function ImageGenerationProgress() {
  return (
    <div className="flex flex-col gap-3 w-full max-w-[400px] animate-in fade-in zoom-in duration-500">
      <div className="text-sm font-medium text-foreground mb-1">Criando sua imagem...</div>
      <div className="relative w-full aspect-square rounded-3xl overflow-hidden bg-[#1a1a1a] shadow-2xl border border-white/5">
        {/* Multi-layered blurred gradients matching the requested "cloudy/soft" look */}
        <div className="absolute inset-0 opacity-60">
          <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] bg-purple-600/30 blur-[80px] rounded-full animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-blue-600/20 blur-[80px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-[20%] right-[10%] w-[50%] h-[50%] bg-pink-500/20 blur-[60px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
          <div className="absolute bottom-[20%] left-[10%] w-[50%] h-[50%] bg-indigo-500/20 blur-[60px] rounded-full animate-pulse" style={{ animationDelay: '1.5s' }} />
        </div>
        
        {/* Soft center glow */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-32 h-32 bg-white/5 blur-[40px] rounded-full animate-pulse" />
        </div>

        {/* Subtle texture overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />
        
        {/* Scan line effect (very subtle) */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.03] to-transparent h-[200%] w-full animate-scan-move pointer-events-none" />
      </div>
    </div>
  );
}

// Thinking animation component
function ThinkingAnimation({ hasImage, isImageGen }: { hasImage: boolean; isImageGen?: boolean }) {
  if (isImageGen) {
    return <ImageGenerationProgress />;
  }
  
  if (hasImage) {
    return <ImageAnalyzingAnimation />;
  }

  return (
    <div className="bg-card border border-border px-4 py-3 rounded-2xl rounded-tl-md">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary animate-pulse" />
        <span className="text-sm text-muted-foreground">Pensando</span>
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

const CONVERSATION_TEMPLATES = [
  {
    icon: BookOpen,
    title: "Ajuda com Lição",
    description: "Tire dúvidas sobre matérias escolares",
    prompt: "Olá! Preciso de ajuda para entender melhor um conteúdo da escola. Pode me explicar de forma didática?",
    gradient: "from-blue-400 via-blue-500 to-blue-600",
  },
  {
    icon: Calculator,
    title: "Resolver Exercícios",
    description: "Resolva problemas de matemática e ciências",
    prompt: "Preciso resolver alguns exercícios. Pode me ajudar a entender a resolução passo a passo?",
    gradient: "from-cyan-400 via-cyan-500 to-cyan-600",
  },
  {
    icon: Lightbulb,
    title: "Ideias de Projeto",
    description: "Brainstorm para trabalhos escolares",
    prompt: "Estou desenvolvendo um projeto escolar e preciso de ideias criativas. Pode me ajudar?",
    gradient: "from-amber-400 via-amber-500 to-amber-600",
  },
  {
    icon: Globe,
    title: "Resumo de Conteúdo",
    description: "Resuma textos e materiais de estudo",
    prompt: "Preciso de um resumo sobre um tema específico para revisar para a prova. Pode me ajudar?",
    gradient: "from-green-400 via-green-500 to-green-600",
  },
];

// Clean markdown symbols from AI response for cleaner display
function cleanMarkdown(text: string): string {
  if (!text) return "";

  return text
    .replace(/\*\*\*(.*?)\*\*\*/g, '$1')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*+]\s+/gm, '\u2022 ')
    .replace(/^\d+\.\s+/gm, (match) => match)
    .replace(/`{3}[\s\S]*?`{3}/g, (match) => match.replace(/`{3}\w*\n?/g, '').trim())
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^>\s+/gm, '')
    .replace(/---+/g, '')
    .replace(/___+/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function TypingMessage({ content, skipAnimation = false }: { content: string; skipAnimation?: boolean }) {
  const cleanedContent = cleanMarkdown(content);
  const words = cleanedContent ? cleanedContent.split(" ").filter(w => w.length > 0) : [];
  const [displayedContent, setDisplayedContent] = useState(skipAnimation ? cleanedContent : "");
  const [currentIndex, setCurrentIndex] = useState(skipAnimation ? words.length : 0);

  useEffect(() => {
    if (skipAnimation || words.length === 0) {
      setDisplayedContent(cleanedContent);
      setCurrentIndex(words.length);
      return;
    }

    if (currentIndex < words.length) {
      const timeout = setTimeout(
        () => {
          setDisplayedContent((prev) => {
            const newContent =
              prev + (currentIndex > 0 ? " " : "") + words[currentIndex];
            return newContent;
          });
          setCurrentIndex((prev) => prev + 1);
        },
        30 + Math.random() * 20,
      );

      return () => clearTimeout(timeout);
    }
  }, [currentIndex, words, cleanedContent, skipAnimation]);

  if (skipAnimation) {
    return (
      <div className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
        {cleanedContent}
      </div>
    );
  }

  return (
    <div className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
      {displayedContent}
      {currentIndex < words.length && (
        <span className="inline-block w-0.5 h-5 bg-current ml-1 animate-pulse" />
      )}
    </div>
  );
}

// Floating particles animation component - CSS only
function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
      {[...Array(15)].map((_, i) => {
        const left = `${Math.random() * 100}%`;
        const top = `${Math.random() * 100}%`;
        const delay = `${i * 0.5}s`;
        const duration = `${15 + Math.random() * 10}s`;
        return (
          <div
            key={i}
            className="absolute w-1 h-1 bg-primary rounded-full animate-float-particle"
            style={{
              left,
              top,
              animationDelay: delay,
              animationDuration: duration,
            }}
          />
        );
      })}
    </div>
  );
}

export default function AIChat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const reducedMotion = useReducedMotion();

  const STORAGE_KEY = `ai-chat-history-${user?.uid || "guest"}`;

  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) {
          return parsed;
        }
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
    }
    return [];
  });

  const [inputText, setInputText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isTypingComplete, setIsTypingComplete] = useState(true);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [showImmediateSquare, setShowImmediateSquare] = useState(false);

  // Auto-detect image request while typing
  useEffect(() => {
    const isImageRequest = inputText.length > 5 && 
                          /ger(e|ar)|cri(e|ar)|desenh(e|ar)|faz um|imagem/i.test(inputText) && 
                          /imagem|foto|ilustra|desenho|retrato|cenário|paisagem|avatar|logo|criança|feliz|carro|casa/i.test(inputText);
    setShowImmediateSquare(isImageRequest);
  }, [inputText]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [isForcingImageGen, setIsForcingImageGen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const initialMessageProcessed = useRef(false);

  const chatMutation = useMutation({
    mutationFn: (payload: {
      message: string;
      image?: string;
      conversationHistory: any[];
      userData?: any;
      model?: string;
      isImageGenRequest?: boolean;
    }) => apiRequest("POST", "/api/ai/chat", payload),
    onSuccess: async (data) => {
      setIsAnalyzingImage(false);
      setIsGeneratingImage(false);
      setIsTypingComplete(false);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response,
          timestamp: Date.now(),
          isTyping: true,
          image: data.generatedImage, // Store generated image if present
        },
      ]);

      // Log activity
      if (user?.uid) {
        await logActivity(
          user.uid,
          "chat_eduna",
          "Conversou com Eduna (IA)",
          { messageCount: messages.length + 2 }
        );
      }

      const words = data.response.split(" ");
      const estimatedDuration = words.length * 50 + 500;
      setTimeout(() => {
        setIsTypingComplete(true);
        setMessages((prev) => prev.map((msg) => ({ ...msg, isTyping: false })));
      }, estimatedDuration);
    },
    onError: (error: any) => {
      console.error("Chat mutation error:", error);
      setIsAnalyzingImage(false);
      setIsGeneratingImage(false);
      toast({
        title: "Erro ao enviar mensagem",
        description: error?.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
      setIsTypingComplete(true);
    },
  });

  useEffect(() => {
    try {
      const messagesToSave = messages.map((msg) => ({
        ...msg,
        isTyping: false,
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messagesToSave));
    } catch (error) {
      console.error("Error saving chat history:", error);
    }
  }, [messages, STORAGE_KEY]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, chatMutation.isPending]);

  useEffect(() => {
    try {
      if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
        const SpeechRecognition =
          (window as any).webkitSpeechRecognition ||
          (window as any).SpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = "pt-BR";
        recognitionRef.current.maxAlternatives = 1;

        recognitionRef.current.onstart = () => {
          console.log("🎤 Speech recognition started");
          setIsRecording(true);
          setVoiceTranscript("");
        };

        recognitionRef.current.onresult = (event: any) => {
          let interimTranscript = "";
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + " ";
            } else {
              interimTranscript += transcript;
            }
          }

          if (finalTranscript) {
            console.log("✅ Final transcript:", finalTranscript);
            setInputText((prev) => prev + finalTranscript);
            setVoiceTranscript("");
          } else if (interimTranscript) {
            console.log("⏳ Interim transcript:", interimTranscript);
            setVoiceTranscript(interimTranscript);
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("❌ Speech recognition error:", event.error);
          setIsRecording(false);
          setVoiceTranscript("");
          
          let errorMessage = "Erro ao reconhecer voz";
          const errorCode = event.error;
          
          if (errorCode === "no-speech") {
            errorMessage = "Nenhuma voz detectada. Tente novamente.";
          } else if (errorCode === "audio-capture") {
            errorMessage = "Nenhum microfone encontrado. Verifique as configurações.";
          } else if (errorCode === "network") {
            errorMessage = "Erro de conexão. Verifique sua internet.";
          } else if (errorCode === "not-allowed") {
            errorMessage = "Acesso ao microfone foi negado. Verifique as permissões do navegador.";
          } else if (errorCode === "permission-denied") {
            errorMessage = "Permissão para usar o microfone foi negada.";
          }
          
          toast({
            title: "Erro na Fala",
            description: errorMessage,
            variant: "destructive",
          });
        };

        recognitionRef.current.onend = () => {
          console.log("🎤 Speech recognition ended");
          setIsRecording(false);
          setVoiceTranscript("");
        };

        console.log("✅ Speech recognition initialized successfully");
      } else {
        console.warn("⚠️ Speech recognition not supported in this browser");
      }
    } catch (error) {
      console.error("Error initializing speech recognition:", error);
    }
  }, [toast]);

  const compressImage = (file: File, maxWidth = 2048, maxHeight = 2048, quality = 0.85): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        const mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";
        const compressedDataUrl = canvas.toDataURL(mimeType, quality);

        console.log(`Image compressed: ${file.size} bytes -> ${compressedDataUrl.length} chars, ${width}x${height}`);
        resolve(compressedDataUrl);
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Failed to load image"));
      };

      img.src = objectUrl;
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Formato não suportado",
        description: "Por favor, envie apenas imagens (JPG, PNG, etc).",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter menos de 50MB.",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "Processando imagem...",
        description: "Otimizando para análise com IA.",
      });

      const compressedImage = await compressImage(file, 2048, 2048, 0.85);
      setSelectedImage(compressedImage);

      toast({
        title: "Imagem pronta!",
        description: "A imagem foi otimizada para análise.",
      });
    } catch (error) {
      console.error("Error compressing image:", error);
      toast({
        title: "Erro ao processar imagem",
        description: "Tente uma imagem menor ou diferente.",
        variant: "destructive",
      });
    }
  };

  const handleTemplateClick = (prompt: string) => {
    setInputText(prompt);
    textareaRef.current?.focus();
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const toggleRecording = async () => {
    if (!recognitionRef.current) {
      console.error("Speech recognition not available");
      toast({
        title: "Recurso não disponível",
        description: "Seu navegador não suporta reconhecimento de voz.",
        variant: "destructive",
      });
      return;
    }

    if (isRecording) {
      console.log("Stopping recording...");
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error("Error stopping recognition:", error);
        setIsRecording(false);
      }
      return;
    }

    try {
      console.log("Requesting microphone access...");
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("✅ Microphone access granted, starting recognition...");
      
      recognitionRef.current.start();
      
      toast({
        title: "Gravando...",
        description: "Fale agora. Clique no microfone para parar.",
      });
    } catch (error: any) {
      console.error("❌ Microphone or recognition error:", error);
      setIsRecording(false);
      
      let errorMessage = "Permita o acesso ao microfone nas configurações do navegador.";
      
      if (error.name === "NotAllowedError") {
        errorMessage = "Acesso ao microfone foi negado. Verifique as permissões do navegador.";
      } else if (error.name === "NotFoundError") {
        errorMessage = "Nenhum microfone encontrado. Conecte um microfone e tente novamente.";
      } else if (error.name === "NotReadableError") {
        errorMessage = "O microfone está sendo usado por outro aplicativo.";
      }
      
      toast({
        title: "Erro no microfone",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const fetchUserData = async () => {
    if (!user?.uid) return null;

    try {
      const [userProfile, gradesData, eventsData] = await Promise.all([
        get(ref(profileNotasDatabase, `users/${user.uid}`)),
        get(ref(profileNotasDatabase, `grades/${user.uid}`)),
        get(query(ref(database, "events"), limitToFirst(5))),
      ]);

      const userData = {
        uid: user.uid,
        displayName: userProfile.val()?.displayName || user.displayName,
        email: userProfile.val()?.email || user.email,
        photoURL: user.photoURL || null,
        grade: userProfile.val()?.grade || null,
        classes: userProfile.val()?.classes || [],
        grades: gradesData.val(),
        events: eventsData.val()
          ? Object.values(eventsData.val())
              .map((e: any) => e.title)
              .slice(0, 5)
              .join(", ")
          : "",
      };

      return userData;
    } catch (error) {
      console.error("Error fetching user data:", error);
      return null;
    }
  };

  const handleDownloadImage = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `eduna-image-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading image:", error);
      toast({
        title: "Erro ao baixar imagem",
        description: "Não foi possível completar o download.",
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = async (overrideMessage?: string) => {
    const messageToSend = overrideMessage !== undefined ? overrideMessage : inputText;

    if ((messageToSend.trim() || selectedImage) && isTypingComplete) {
      const hasImageAttachment = !!selectedImage;

      const userMessage: Message = {
        role: "user",
        content: messageToSend || "Analise esta imagem",
        timestamp: Date.now(),
        isTyping: false,
        image: selectedImage || undefined,
      };

      setMessages((prev) => [...prev, userMessage]);

      if (hasImageAttachment) {
        setIsAnalyzingImage(true);
      }

      // Track AI chat activity for study streak
      if (user) {
        try {
          const activityRef = ref(database, `userAIChatActivity/${user.uid}`);
          await push(activityRef, { timestamp: Date.now() });
        } catch (error) {
          console.error("Error tracking AI chat activity:", error);
        }
      }

      const conversationHistory = messages
        .filter((msg) => !msg.isTyping)
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

      const userData = await fetchUserData();

      const isImageRequest = isForcingImageGen || 
        (/ger(e|ar)|cri(e|ar)|desenh(e|ar)|imagem|faz um/i.test(messageToSend) && 
         /imagem|foto|ilustra|desenho|retrato|cenário|paisagem|avatar|logo/i.test(messageToSend)) ||
        (messageToSend.toLowerCase().includes("eduna") && /desenhe|gere/i.test(messageToSend));

      chatMutation.mutate({
        message:
          messageToSend ||
          "O que você vê nesta imagem? Descreva e explique em detalhes.",
        image: selectedImage || undefined,
        conversationHistory: conversationHistory,
        userData: userData,
        model: EDUNA_MODEL.id,
        isImageGenRequest: isImageRequest,
      });

      if (isImageRequest) {
        setIsGeneratingImage(true);
      }

      setInputText("");
      handleRemoveImage();
      setIsForcingImageGen(false);

      if (textareaRef.current) {
        textareaRef.current.style.height = "40px";
      }
    }
  };

  // Handle initial message from URL query parameter (from mini-chat in dashboard)
  useEffect(() => {
    if (initialMessageProcessed.current) return;

    const params = new URLSearchParams(window.location.search);
    const initialMessage = params.get("initialMessage");

    if (initialMessage) {
      initialMessageProcessed.current = true;
      // Clean the URL
      window.history.replaceState({}, "", window.location.pathname);
      // Send the message after a short delay to ensure component is ready
      setTimeout(() => {
        handleSendMessage(initialMessage);
      }, 100);
    }
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "Mensagem copiada para a área de transferência.",
    });
  };

  return (
    <div className="bg-background flex flex-col h-[100dvh] relative overflow-hidden">
      {/* Animated Background - only on desktop for performance */}
      {!reducedMotion && <FloatingParticles />}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-3xl mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => navigate("/dashboard")}
                className="w-9 h-9 sm:w-10 sm:h-10 bg-card border border-border/50 rounded-full flex items-center justify-center hover:bg-card/80 hover:border-primary/40 active:scale-[0.98] transition-all duration-200 shadow-sm"
                data-testid="button-back-dashboard"
              >
                <ArrowLeft className="w-5 h-5 text-foreground" />
              </button>

              <div className="flex items-center gap-2 sm:gap-2.5 bg-card border border-border/50 rounded-full pl-1 pr-3 sm:pl-1.5 sm:pr-4 py-1 sm:py-1.5 shadow-sm">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900/30 dark:to-blue-900/30 flex items-center justify-center overflow-hidden shadow-sm">
                  <img src={edunaAvatar} alt="Eduna" className="w-full h-full object-cover rounded-full" />
                </div>
                <div className="text-left">
                  <h1 className="text-sm sm:text-base font-bold text-foreground leading-tight">Eduna IA</h1>
                  <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">Assistente inteligente</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="bg-card border border-border/50 rounded-full px-2.5 py-1 sm:px-3 sm:py-1.5 shadow-sm flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] sm:text-xs font-medium text-foreground">{EDUNA_MODEL.name}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto relative z-10" ref={scrollRef}>
        {messages.length === 0 && !chatMutation.isPending ? (
          /* Welcome Screen */
          <div className="h-full flex flex-col items-center justify-center px-4 pb-32">
            {/* AI Avatar - simplified on mobile */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900/30 dark:to-blue-900/30 flex items-center justify-center mb-4 sm:mb-6 relative overflow-visible shadow-lg">
              <img src={edunaAvatar} alt="Eduna" className="w-full h-full object-cover rounded-full" />
              {!reducedMotion && (
                <>
                  <div className="absolute inset-0 rounded-full border-2 border-primary animate-pulse-ring" />
                  <div className="absolute inset-0 rounded-full border-2 border-purple-500 animate-pulse-ring-delay" />
                </>
              )}
            </div>

            <h1 className="text-xl sm:text-4xl md:text-5xl font-bold text-foreground mb-2 sm:mb-3 text-center px-6 leading-tight">
              Como posso te ajudar hoje?
            </h1>

            <p className="text-center text-xs sm:text-base text-muted-foreground max-w-md mb-4 sm:mb-6 px-6 leading-relaxed">
              Olá, <span className="font-medium">{user?.displayName?.split(' ')[0] || 'Edutok'}</span>! Sou a <span className="font-semibold bg-gradient-to-r from-primary to-cyan-600 bg-clip-text text-transparent">Eduna</span>, sua assistente de estudos com IA.
            </p>

            {/* Eduna 5.0 Features */}
            <div className="flex flex-wrap justify-center gap-2 mb-6 sm:mb-8 px-4">
              <div className="flex items-center gap-1.5 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-full px-3 py-1.5">
                <Search className="w-3.5 h-3.5 text-purple-500" />
                <span className="text-xs font-medium text-purple-600 dark:text-purple-400">Deep Search</span>
              </div>
              <div className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-full px-3 py-1.5">
                <Mic className="w-3.5 h-3.5 text-cyan-500" />
                <span className="text-xs font-medium text-cyan-600 dark:text-cyan-400">Voz para Texto</span>
              </div>
              <div className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-full px-3 py-1.5">
                <Eye className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Visão</span>
              </div>
            </div>

            {/* Quick Action Cards - Hidden on mobile, visible on tablet and desktop */}
            <div className="w-full max-w-lg hidden sm:grid grid-cols-1 sm:grid-cols-2 gap-3 px-4 sm:px-0">
              {CONVERSATION_TEMPLATES.map((template, index) => (
                <button
                  key={index}
                  className="group relative overflow-hidden rounded-2xl bg-card border border-border p-3.5 sm:p-4 text-left transition-all hover-elevate shadow-sm hover:shadow-md active:scale-[0.98]"
                  onClick={() => handleTemplateClick(template.prompt)}
                  data-testid={`button-template-${index}`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${template.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                  <div className="relative flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${template.gradient} flex items-center justify-center shadow-lg flex-shrink-0`}>
                      <template.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm sm:text-base font-bold text-foreground mb-0.5">{template.title}</h3>
                      <p className="text-xs text-muted-foreground leading-snug line-clamp-2">{template.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Chat Messages */
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                data-testid={`ai-message-${index}`}
              >
                {message.role === "assistant" && (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900/30 dark:to-blue-900/30 flex items-center justify-center flex-shrink-0 shadow-lg overflow-hidden">
                    <img src={edunaAvatar} alt="Eduna" className="w-full h-full object-cover rounded-full" />
                  </div>
                )}

                <div className={`flex flex-col gap-2 max-w-[75%] ${message.role === "user" ? "items-end" : "items-start"}`}>
                  {message.image && message.role === "user" && (
                    <img
                      src={message.image}
                      alt="Uploaded"
                      className="max-w-full max-h-64 rounded-2xl shadow-lg"
                    />
                  )}

                  <div
                    className={`px-4 py-3 rounded-2xl shadow-sm ${
                      message.role === "user"
                        ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-tr-md"
                        : "bg-card border border-border rounded-tl-md"
                    }`}
                  >
                    {message.image && message.role === "assistant" && (
                      <div className="mb-3 relative group rounded-xl overflow-hidden border border-border/50 bg-black/5">
                        <img 
                          src={message.image} 
                          alt="AI Generated" 
                          className="w-full h-auto max-h-[400px] object-contain hover:scale-[1.02] transition-transform duration-300"
                          data-testid={`img-chat-generated-${index}`}
                        />
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="secondary"
                            className="h-8 w-8 bg-background/80 backdrop-blur-sm"
                            onClick={() => handleDownloadImage(message.image!)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                    {message.isTyping ? (
                      <TypingMessage content={message.content} skipAnimation={reducedMotion} />
                    ) : (
                      <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                        {message.role === "assistant" ? cleanMarkdown(message.content) : message.content}
                      </p>
                    )}
                  </div>

                  {message.role === "assistant" && !message.isTyping && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyToClipboard(message.content)}
                        className="h-7 w-7 rounded-lg"
                        data-testid={`button-copy-${index}`}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                {message.role === "user" && (
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 text-lg font-semibold">
                    {user?.displayName?.charAt(0) || "U"}
                  </div>
                )}
              </div>
            ))}

            {/* Immediate Generation Square / Pending State */}
            {(showImmediateSquare || isGeneratingImage || chatMutation.isPending) && (
              <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900/30 dark:to-blue-900/30 flex items-center justify-center flex-shrink-0 shadow-lg overflow-hidden">
                  <img src={edunaAvatar} alt="Eduna" className="w-full h-full object-cover rounded-full" />
                </div>
                <ThinkingAnimation 
                  hasImage={isAnalyzingImage} 
                  isImageGen={showImmediateSquare || isGeneratingImage} 
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="relative z-20 bg-background/80 backdrop-blur-xl border-t border-border/30 p-3 sm:p-4">
        <div className="max-w-3xl mx-auto">
          {/* Command Menu */}
          {showCommandMenu && (
            <div className="absolute bottom-full mb-2 left-4 right-4 sm:left-auto sm:right-auto sm:w-64 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300 z-50">
              <div className="p-2 space-y-1">
                <button
                  onClick={() => {
                    setInputText("Gere uma imagem de ");
                    setIsForcingImageGen(true);
                    setShowCommandMenu(false);
                    textareaRef.current?.focus();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-xl transition-colors text-left group"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <ImageIcon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">Gerar Imagem</div>
                    <div className="text-[10px] text-muted-foreground">Crie arte com IA</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowCommandMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-xl transition-colors text-left group"
                >
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
                    <Plus className="w-4 h-4 text-cyan-600" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">Anexar Fotos</div>
                    <div className="text-[10px] text-muted-foreground">Envie arquivos para análise</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Image Preview */}
          {selectedImage && (
            <div className="mb-3 relative">
              <div className="relative inline-block">
                <img
                  src={selectedImage}
                  alt="Preview"
                  className="max-h-32 rounded-2xl shadow-lg border border-border/50"
                />
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={handleRemoveImage}
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full shadow-lg"
                  data-testid="button-remove-image"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}

          {/* Voice Recording Indicator */}
          {isRecording && (
            <div className="mb-3 flex items-center gap-2 px-4 py-2 bg-destructive/10 border border-destructive/20 rounded-full">
              <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
              <span className="text-sm text-destructive font-medium">Gravando...</span>
              {voiceTranscript && (
                <span className="text-sm text-muted-foreground italic">{voiceTranscript}</span>
              )}
            </div>
          )}

          {/* Input Container - Bubble Style */}
          <div className="bg-card border border-border/50 rounded-full p-1.5 sm:p-2 shadow-sm">
            <div className="flex items-end gap-1 sm:gap-1.5">
              {/* Attachment Button */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                data-testid="input-file"
              />
              {/* Attach / Options Button */}
              <button
                onClick={() => setShowCommandMenu(!showCommandMenu)}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center flex-shrink-0 transition-colors"
                data-testid="button-options"
              >
                <Plus className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${showCommandMenu ? 'rotate-45' : ''}`} />
              </button>

              {/* Text Input */}
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={(e) => {
                    const value = e.target.value;
                    setInputText(value);
                    
                    const target = e.target;
                    target.style.height = "36px";
                    target.style.height = `${Math.min(target.scrollHeight, 100)}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Mensagem para Eduna..."
                  className="w-full resize-none bg-transparent border-0 px-3 sm:px-4 py-2 text-sm sm:text-[15px] leading-relaxed focus:outline-none placeholder:text-muted-foreground/50"
                  style={{ height: "36px", maxHeight: "100px" }}
                  data-testid="input-message"
                />
              </div>

              {/* Voice Button */}
              <button
                onClick={toggleRecording}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                  isRecording 
                    ? 'bg-destructive text-white' 
                    : 'bg-muted/50 hover:bg-muted text-muted-foreground'
                }`}
                data-testid="button-voice"
              >
                {isRecording ? (
                  <StopCircle className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </button>

              {/* Send Button */}
              <button
                onClick={() => handleSendMessage()}
                disabled={(!inputText.trim() && !selectedImage) || !isTypingComplete}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 flex items-center justify-center flex-shrink-0 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
                data-testid="button-send"
              >
                <Send className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Hint Text */}
          <p className="text-center text-[10px] sm:text-xs text-muted-foreground/70 mt-2 sm:mt-3">
            Eduna pode cometer erros. Verifique informações importantes.
          </p>
        </div>
      </div>
    </div>
  );
}





