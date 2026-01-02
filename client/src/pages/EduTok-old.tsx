import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/useAuth";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Heart, MessageCircle, Share2, Play, Pause, Volume2, VolumeX, Upload } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function EduTok() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);

  const { data: videos = [] } = useQuery({
    queryKey: ["/api/videos"],
  });

  const currentVideo = videos[currentVideoIndex];

  const likeMutation = useMutation({
    mutationFn: (videoId: string) =>
      apiRequest("POST", `/api/videos/${videoId}/like`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: ({ videoId, text }: { videoId: string; text: string }) =>
      apiRequest("POST", `/api/videos/${videoId}/comment`, { text }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      setCommentText("");
      toast({
        title: "Comentário adicionado!",
        description: "Seu comentário foi publicado com sucesso.",
      });
    },
  });

  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, currentVideoIndex]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const handleLike = () => {
    if (currentVideo) {
      likeMutation.mutate(currentVideo.id);
    }
  };

  const handleComment = () => {
    if (currentVideo && commentText.trim()) {
      commentMutation.mutate({ videoId: currentVideo.id, text: commentText });
    }
  };

  const handleShare = async () => {
    if (currentVideo) {
      try {
        await navigator.share({
          title: currentVideo.title,
          text: currentVideo.caption,
          url: currentVideo.url,
        });
      } catch (error) {
        toast({
          title: "Link copiado!",
          description: "O link do vídeo foi copiado para a área de transferência.",
        });
      }
    }
  };

  const handleScroll = (direction: "up" | "down") => {
    if (direction === "down" && currentVideoIndex < videos.length - 1) {
      setCurrentVideoIndex(currentVideoIndex + 1);
    } else if (direction === "up" && currentVideoIndex > 0) {
      setCurrentVideoIndex(currentVideoIndex - 1);
    }
  };

  const isLikedByUser = currentVideo?.likedBy?.includes(user?.uid || "");
  const comments = currentVideo ? Object.values(currentVideo.comments || {}) : [];

  return (
    <div className="h-screen bg-black relative overflow-hidden">
      {videos.length > 0 && currentVideo ? (
        <>
          {/* Video Container */}
          <div className="absolute inset-0 flex items-center justify-center">
            <video
              ref={videoRef}
              src={currentVideo.url}
              className="h-full w-full object-contain"
              loop
              playsInline
              autoPlay
              muted={isMuted}
              onClick={() => setIsPlaying(!isPlaying)}
              data-testid="video-player"
            />
          </div>

          {/* Play/Pause Overlay */}
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="w-20 h-20 rounded-full bg-black/50 flex items-center justify-center">
                <Play className="w-10 h-10 text-white ml-1" fill="white" />
              </div>
            </div>
          )}

          {/* Top Controls */}
          <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent z-10">
            <h1 className="text-white text-xl font-bold">EduTok</h1>
          </div>

          {/* Bottom Info */}
          <div className="absolute bottom-20 left-0 right-0 p-4 pb-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10">
            <div className="max-w-screen-xl mx-auto">
              <div className="flex items-start gap-3 mb-3">
                <Avatar className="w-10 h-10 border-2 border-white">
                  <AvatarImage src={currentVideo.uploaderPhoto} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {currentVideo.uploaderName?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm mb-1">
                    {currentVideo.uploaderName}
                  </p>
                  {currentVideo.className && (
                    <p className="text-white/80 text-xs mb-2">{currentVideo.className}</p>
                  )}
                </div>
              </div>
              
              <h2 className="text-white font-bold text-lg mb-2">{currentVideo.title}</h2>
              <p className="text-white/90 text-sm line-clamp-2 mb-2">{currentVideo.caption}</p>
              <p className="text-white/60 text-xs">
                {format(new Date(currentVideo.timestamp), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="absolute right-4 bottom-32 z-20 flex flex-col gap-6">
            <button
              onClick={handleLike}
              className="flex flex-col items-center gap-1"
              data-testid="button-like"
            >
              <div className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center active-elevate-2">
                <Heart
                  className={`w-7 h-7 ${isLikedByUser ? "fill-red-500 text-red-500" : "text-white"}`}
                />
              </div>
              <span className="text-white text-xs font-semibold">
                {currentVideo.likes || 0}
              </span>
            </button>

            <Sheet open={showComments} onOpenChange={setShowComments}>
              <SheetTrigger asChild>
                <button
                  className="flex flex-col items-center gap-1"
                  data-testid="button-comments"
                >
                  <div className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center active-elevate-2">
                    <MessageCircle className="w-7 h-7 text-white" />
                  </div>
                  <span className="text-white text-xs font-semibold">
                    {comments.length}
                  </span>
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
                <SheetHeader>
                  <SheetTitle>{comments.length} comentários</SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-[calc(70vh-140px)] mt-4">
                  <div className="space-y-4 pr-4">
                    {comments.map((comment: any, index) => (
                      <div key={index} className="flex gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={comment.userPhoto} />
                          <AvatarFallback className="text-xs">
                            {comment.userName?.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">{comment.userName}</p>
                          <p className="text-sm text-muted-foreground">{comment.text}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(comment.timestamp), "dd/MM/yy 'às' HH:mm")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Adicionar comentário..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="resize-none min-h-[44px] max-h-[100px]"
                      data-testid="input-comment"
                    />
                    <Button
                      onClick={handleComment}
                      disabled={!commentText.trim() || commentMutation.isPending}
                      data-testid="button-send-comment"
                    >
                      Enviar
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <button
              onClick={handleShare}
              className="flex flex-col items-center gap-1"
              data-testid="button-share"
            >
              <div className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center active-elevate-2">
                <Share2 className="w-7 h-7 text-white" />
              </div>
              <span className="text-white text-xs font-semibold">Compartilhar</span>
            </button>

            <button
              onClick={() => setIsMuted(!isMuted)}
              className="flex flex-col items-center gap-1"
              data-testid="button-mute"
            >
              <div className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center active-elevate-2">
                {isMuted ? (
                  <VolumeX className="w-7 h-7 text-white" />
                ) : (
                  <Volume2 className="w-7 h-7 text-white" />
                )}
              </div>
            </button>
          </div>

          {/* Scroll Navigation Indicators */}
          {currentVideoIndex > 0 && (
            <button
              onClick={() => handleScroll("up")}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full mb-8 text-white/60"
              data-testid="button-scroll-up"
            >
              <div className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </div>
            </button>
          )}

          {currentVideoIndex < videos.length - 1 && (
            <button
              onClick={() => handleScroll("down")}
              className="absolute bottom-1/2 left-1/2 -translate-x-1/2 translate-y-full mt-8 text-white/60"
              data-testid="button-scroll-down"
            >
              <div className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>
          )}
        </>
      ) : (
        <div className="h-full flex flex-col items-center justify-center text-white p-8">
          <Upload className="w-16 h-16 mb-4 text-white/50" />
          <h2 className="text-xl font-bold mb-2">Nenhum vídeo disponível</h2>
          <p className="text-white/70 text-center">
            Seja o primeiro a compartilhar conteúdo educacional!
          </p>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
