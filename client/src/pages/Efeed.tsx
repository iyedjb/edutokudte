import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/useAuth";
import { useEfeedPosts, createPost, votePoll, useUserProfile, useAllUsers, toggleFollowUser, useStories, createStory, deleteStory, likeStory } from "@/lib/useFirebaseData";
import { efeedDatabase } from "@/lib/firebase";
import { notifyFollowersOfNewPost } from "@/lib/notificationTriggers";
import { cleanupTestEfeedPosts } from "@/lib/seedFirebase";
import { ref, onValue, get } from "firebase/database";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Heart, Loader2, X, Check, Trash2, Plus, Home, ChevronLeft, Users, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { PostCard } from "@/components/PostCard";
import { PostComposer } from "@/components/PostComposer";
import type { PostMood, SubjectTag } from "@shared/schema";

export default function Efeed() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { profile } = useUserProfile(user?.uid || null);
  const { users } = useAllUsers();
  const { stories, loading: storiesLoading } = useStories();
  const { posts, loading, loadingMore, hasMore, toggleReaction, toggleBookmark, incrementShare, incrementViews, addComment, deletePost, loadMore } = useEfeedPosts();
  const [newPostText, setNewPostText] = useState("");
  const [posting, setPosting] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoBase64, setVideoBase64] = useState<string | null>(null);
  const [showCreatePostDialog, setShowCreatePostDialog] = useState(false);
  const [activePoll, setActivePoll] = useState<{ question: string; options: string[] } | null>(null);
  const [postMood, setPostMood] = useState<PostMood | undefined>(undefined);
  const [postSubjects, setPostSubjects] = useState<SubjectTag[]>([]);
  const storyInputRef = useRef<HTMLInputElement>(null);
  const [postToDelete, setPostToDelete] = useState<{ id: string; authorUid: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());
  const [followStateLoaded, setFollowStateLoaded] = useState(false);
  const [uploadingStory, setUploadingStory] = useState(false);
  const [viewingStory, setViewingStory] = useState<any | null>(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [imagePostsToday, setImagePostsToday] = useState(0);
  const [deletingStory, setDeletingStory] = useState(false);
  const [viewedStories, setViewedStories] = useState<Set<string>>(new Set());

  const isTeacher = profile?.verified || false;

  useEffect(() => {
    if (!user?.uid) return;
    const key = `viewedStories_${user.uid}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try { setViewedStories(new Set(JSON.parse(saved))); } catch (e) {}
    }
  }, [user?.uid]);

  const markStoryAsViewed = (userUid: string) => {
    if (!user?.uid) return;
    const newViewedStories = new Set(viewedStories);
    newViewedStories.add(userUid);
    setViewedStories(newViewedStories);
    localStorage.setItem(`viewedStories_${user.uid}`, JSON.stringify(Array.from(newViewedStories)));
  };

  useEffect(() => {
    if (!viewingStory) return;
    const timer = setTimeout(() => {
      if (currentStoryIndex < viewingStory.stories.length - 1) setCurrentStoryIndex(currentStoryIndex + 1);
      else setViewingStory(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [viewingStory, currentStoryIndex]);

  useEffect(() => {
    // Clean up test posts on first load
    cleanupTestEfeedPosts().catch(console.error);
  }, []);

  useEffect(() => {
    if (!user?.uid) { setFollowStateLoaded(true); return; }
    const followRef = ref(efeedDatabase, `followRelationships/${user.uid}`);
    const unsubscribe = onValue(followRef, (snapshot) => {
      const data = snapshot.val() || {};
      setFollowingUsers(new Set(Object.keys(data)));
      setFollowStateLoaded(true);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    const checkImagePostsToday = async () => {
      try {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const startOfDay = today.getTime();
        const postsRef = ref(efeedDatabase, "efeed");
        const snapshot = await get(postsRef);
        if (snapshot.exists()) {
          let count = 0;
          Object.values(snapshot.val()).forEach((post: any) => {
            const postTimestamp = post.ts || post.timestamp || 0;
            if (post.u === user.uid && (post.ph || post.photoURL) && postTimestamp >= startOfDay) count++;
          });
          setImagePostsToday(count);
        }
      } catch (error) { setImagePostsToday(0); }
    };
    checkImagePostsToday();
  }, [user?.uid, posts]);

  const handleStoryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isTeacher) {
      toast({ title: "Acesso restrito", description: "Apenas professores podem publicar stories", variant: "destructive" });
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 5MB", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = async () => {
      setUploadingStory(true);
      try {
        await createStory(user!.uid, profile?.displayName || user!.displayName || "Usuário", profile?.photoURL || user!.photoURL || "", profile?.verified || false, reader.result as string);
        toast({ title: "Story publicado!" });
      } catch (error) {
        toast({ title: "Erro ao publicar story", variant: "destructive" });
      } finally { setUploadingStory(false); }
    };
    reader.readAsDataURL(file);
  };

  const handlePost = async () => {
    if (!newPostText.trim() && !photoBase64 && !videoBase64 && !activePoll) {
      toast({ title: "Post vazio", description: "Escreva algo ou adicione uma mídia", variant: "destructive" });
      return;
    }
    setPosting(true);
    try {
      const result = await createPost(newPostText, user!.uid, profile?.displayName || user!.displayName || "Usuário", profile?.photoURL || user!.photoURL, photoBase64 || undefined, activePoll || undefined, videoBase64 || undefined, postMood, postSubjects.length > 0 ? postSubjects : undefined);
      if (!result.success) { toast({ title: "Erro", description: result.error, variant: "destructive" }); return; }
      if (result.postId && profile?.verified) {
        notifyFollowersOfNewPost(user!.uid, profile?.displayName || user!.displayName || "Usuário", profile?.photoURL || user!.photoURL, newPostText, result.postId, true);
      }
      setNewPostText(""); setPhotoPreview(null); setPhotoBase64(null); setVideoPreview(null); setVideoBase64(null); setActivePoll(null); setPostMood(undefined); setPostSubjects([]); setShowCreatePostDialog(false);
      toast({ title: "Post publicado!" });
    } catch (error) {
      toast({ title: "Erro ao publicar", variant: "destructive" });
    } finally { setPosting(false); }
  };

  const handleDeletePost = async () => {
    if (!postToDelete) return;
    setDeleting(true);
    try {
      await deletePost(postToDelete.id, postToDelete.authorUid);
      toast({ title: "Post excluído" });
    } catch (error) {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    } finally { setDeleting(false); setPostToDelete(null); }
  };

  const handleDeleteStory = async (storyId: string) => {
    if (!user) return;
    setDeletingStory(true);
    try {
      await deleteStory(storyId);
      toast({ title: "Story excluído" });
      setViewingStory(null);
    } catch (error) {
      toast({ title: "Erro ao excluir story", variant: "destructive" });
    } finally { setDeletingStory(false); }
  };

  const handleFollowToggle = async (targetUid: string) => {
    if (!user) return;
    const wasFollowing = followingUsers.has(targetUid);
    setFollowingUsers(prev => { const n = new Set(prev); wasFollowing ? n.delete(targetUid) : n.add(targetUid); return n; });
    try {
      await toggleFollowUser(user.uid, targetUid);
      toast({ title: wasFollowing ? "Deixou de seguir" : "Seguindo" });
    } catch (error) {
      setFollowingUsers(prev => { const n = new Set(prev); wasFollowing ? n.add(targetUid) : n.delete(targetUid); return n; });
      toast({ title: "Erro", variant: "destructive" });
    }
  };

  const suggestedFriends = followStateLoaded ? users.filter((u: any) => u.uid !== user?.uid && !followingUsers.has(u.uid)).slice(0, 4) : [];

  const PostSkeleton = () => (
    <div className="bg-card rounded-3xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="space-y-1.5"><Skeleton className="h-3 w-24" /><Skeleton className="h-2.5 w-16" /></div>
      </div>
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-6">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center gap-3 h-14">
            <button
              onClick={() => setLocation("/")}
              className="w-10 h-10 rounded-full bg-card border border-border/50 flex items-center justify-center hover:bg-muted/50 active:scale-95 transition-all"
              data-testid="button-back"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="bg-card border border-border/50 rounded-full px-5 py-2">
              <h1 className="text-sm font-semibold text-foreground">Efeed</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {(stories.length > 0 || isTeacher) && (
          <div className="bg-card rounded-3xl p-4">
            <ScrollArea className="w-full">
              <div className="flex gap-3">
                {isTeacher && (
                  <button 
                    onClick={() => storyInputRef.current?.click()} 
                    disabled={uploadingStory}
                    className="flex flex-col items-center gap-1.5 min-w-[60px]" 
                    data-testid="button-add-story"
                  >
                    <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-primary to-purple-500 p-0.5">
                      <div className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden">
                        <Avatar className="w-full h-full">
                          <AvatarImage src={profile?.photoURL || user?.photoURL} />
                          <AvatarFallback className="text-xs">{(profile?.displayName || user?.displayName)?.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                      </div>
                      {uploadingStory ? (
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center"><Loader2 className="w-4 h-4 text-white animate-spin" /></div>
                      ) : (
                        <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-primary rounded-full border-2 border-background flex items-center justify-center">
                          <Plus className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">Você</span>
                  </button>
                )}
                {storiesLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-1.5 min-w-[60px]">
                      <Skeleton className="w-14 h-14 rounded-full" />
                      <Skeleton className="h-2.5 w-10" />
                    </div>
                  ))
                ) : (
                  stories.map((userStory: any) => (
                    <button 
                      key={userStory.userUid}
                      onClick={() => { setViewingStory(userStory); setCurrentStoryIndex(0); markStoryAsViewed(userStory.userUid); }}
                      className="flex flex-col items-center gap-1.5 min-w-[60px]"
                      data-testid={`story-${userStory.userUid}`}
                    >
                      <div className={`w-14 h-14 rounded-full p-0.5 ${viewedStories.has(userStory.userUid) ? 'bg-muted' : 'bg-gradient-to-br from-primary to-purple-500'}`}>
                        <div className="w-full h-full rounded-full bg-background overflow-hidden">
                          <Avatar className="w-full h-full">
                            <AvatarImage src={userStory.userPhoto} />
                            <AvatarFallback className="text-xs">{userStory.userName?.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground truncate max-w-[60px]">{userStory.userName?.split(' ')[0]}</span>
                    </button>
                  ))
                )}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
            <input ref={storyInputRef} type="file" accept="image/*" onChange={handleStoryUpload} className="hidden" />
          </div>
        )}

        <button
          onClick={() => setShowCreatePostDialog(true)}
          className="w-full bg-card rounded-3xl p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
          data-testid="button-composer-expand"
        >
          <Avatar className="w-10 h-10">
            <AvatarImage src={profile?.photoURL || user?.photoURL} />
            <AvatarFallback>{(profile?.displayName || user?.displayName)?.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="text-muted-foreground flex-1">No que você está pensando?</span>
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <ImageIcon className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </button>

        <div className="space-y-4">
          {loading && posts.length === 0 ? (
            Array.from({ length: 3 }).map((_, i) => <PostSkeleton key={i} />)
          ) : (
            <AnimatePresence>
              {posts.map((post: any, index) => (
                <motion.div 
                  key={post.id} 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: index * 0.03 }} 
                  data-testid={`post-${post.id}`}
                >
                  <PostCard 
                    post={post} 
                    currentUser={user || undefined} 
                    currentProfile={profile} 
                    onReactionToggle={toggleReaction} 
                    onComment={addComment} 
                    onBookmark={toggleBookmark} 
                    onShare={(postId) => { incrementShare(postId); toast({ title: "Link copiado!" }); }} 
                    onVotePoll={votePoll} 
                    onIncrementViews={incrementViews} 
                    onDelete={(postId, authorUid) => setPostToDelete({ id: postId, authorUid })} 
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          )}
          
          {hasMore && !loading && (
            <div className="text-center py-4">
              <Button onClick={loadMore} disabled={loadingMore} variant="ghost" className="rounded-full" data-testid="button-load-more">
                {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : "Carregar mais"}
              </Button>
            </div>
          )}
        </div>

        {suggestedFriends.length > 0 && (
          <div className="bg-card rounded-3xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Sugestões</span>
            </div>
            <div className="space-y-2">
              {suggestedFriends.map((friend: any) => (
                <div key={friend.uid} className="flex items-center gap-3" data-testid={`suggestion-${friend.uid}`}>
                  <Avatar className="w-9 h-9">
                    <AvatarImage src={friend.photoURL} />
                    <AvatarFallback className="text-xs">{friend.displayName?.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium truncate">{friend.displayName}</span>
                      {friend.verified && <Check className="w-3 h-3 text-primary" />}
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant={followingUsers.has(friend.uid) ? "secondary" : "default"} 
                    className="rounded-full h-7 text-xs" 
                    onClick={() => handleFollowToggle(friend.uid)}
                    data-testid={`button-follow-${friend.uid}`}
                  >
                    {followingUsers.has(friend.uid) ? "Seguindo" : "Seguir"}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 pb-safe pointer-events-none">
        <div className="relative mx-auto max-w-sm px-4 pb-4">
          <div className="pointer-events-auto">
            <div className="relative">
              <div className="absolute -inset-3 bg-primary/10 rounded-full blur-2xl opacity-30" />
              
              <div className="relative backdrop-blur-xl bg-gradient-to-b from-white/95 to-white/85 dark:from-card/95 dark:to-card/85 rounded-full px-4 py-2.5 shadow-[0_12px_40px_-10px_rgba(0,0,0,0.25)] dark:shadow-[0_12px_40px_-10px_rgba(0,0,0,0.5)] border border-white/60 dark:border-primary/20">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 via-transparent to-transparent dark:from-white/5 pointer-events-none" />
                
                <div className="relative flex items-center justify-around gap-2">
                  <button 
                    onClick={() => setLocation("/")} 
                    className="relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95"
                    data-testid="nav-home"
                  >
                    <div className="absolute inset-0 rounded-full bg-foreground/5 opacity-0 hover:opacity-100 transition-opacity" />
                    <Home className="w-5 h-5 text-muted-foreground" />
                  </button>
                  
                  <button 
                    onClick={() => setShowCreatePostDialog(true)} 
                    className="relative w-14 h-14 -mt-6 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95"
                    data-testid="nav-create"
                  >
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary via-primary to-purple-600 shadow-lg shadow-primary/40" />
                    <div className="absolute inset-0 rounded-full bg-primary/20 blur-md" />
                    <Plus className="relative w-6 h-6 text-white" />
                  </button>
                  
                  <button 
                    onClick={() => setLocation("/profile")} 
                    className="relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95"
                    data-testid="nav-profile"
                  >
                    <div className="absolute inset-0 rounded-full bg-foreground/5 opacity-0 hover:opacity-100 transition-opacity" />
                    <Avatar className="w-7 h-7 ring-2 ring-border/30">
                      <AvatarImage src={profile?.photoURL || user?.photoURL} />
                      <AvatarFallback className="text-xs">{(profile?.displayName || user?.displayName)?.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <style>{`
          @supports (padding-bottom: env(safe-area-inset-bottom)) {
            .pb-safe { padding-bottom: max(1rem, env(safe-area-inset-bottom)); }
          }
        `}</style>
      </nav>

      <PostComposer 
        open={showCreatePostDialog} 
        onOpenChange={setShowCreatePostDialog} 
        text={newPostText} 
        onTextChange={setNewPostText} 
        mood={postMood} 
        onMoodChange={setPostMood} 
        subjects={postSubjects} 
        onSubjectsChange={setPostSubjects} 
        photoPreview={photoPreview} 
        photoBase64={photoBase64} 
        onPhotoChange={(preview, base64) => {
          if (preview && base64) { 
            if (imagePostsToday >= 5) { 
              toast({ title: "Limite atingido", description: "Você já publicou 5 imagens hoje.", variant: "destructive" }); 
              setPhotoPreview(null); setPhotoBase64(null); return; 
            } 
          }
          setPhotoPreview(preview); setPhotoBase64(base64);
        }} 
        videoPreview={videoPreview} 
        videoBase64={videoBase64} 
        onVideoChange={(preview, base64) => { setVideoPreview(preview); setVideoBase64(base64); }} 
        onPollClick={() => {}} 
        onSubmit={handlePost} 
        posting={posting} 
        currentUser={user || undefined} 
        currentProfile={profile} 
        activePoll={activePoll} 
        isTeacher={isTeacher}
      />

      <AlertDialog open={!!postToDelete} onOpenChange={(open) => !open && setPostToDelete(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir post?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="rounded-full" data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePost} disabled={deleting} className="rounded-full bg-destructive" data-testid="button-confirm-delete">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AnimatePresence>
        {viewingStory && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[100] bg-black flex items-center justify-center" 
            onClick={() => setViewingStory(null)}
          >
            <div className="relative w-full max-w-md h-full flex flex-col">
              <div className="absolute top-3 left-0 right-0 px-3 flex gap-1 z-10">
                {viewingStory.stories.map((_: any, idx: number) => (
                  <div key={idx} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                    <div className={`h-full bg-white ${idx < currentStoryIndex ? 'w-full' : idx === currentStoryIndex ? 'w-full animate-story-progress' : 'w-0'}`} />
                  </div>
                ))}
              </div>
              
              <div className="absolute top-8 left-0 right-0 px-4 flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                  <Avatar className="w-8 h-8 ring-2 ring-white/50">
                    <AvatarImage src={viewingStory.userPhoto} />
                    <AvatarFallback className="text-xs">{viewingStory.userName?.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="text-white text-sm font-semibold">{viewingStory.userName}</span>
                    <span className="text-white/60 text-xs block">{formatDistanceToNow(viewingStory.stories[currentStoryIndex].timestamp, { addSuffix: true, locale: ptBR })}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {viewingStory.userUid === user?.uid && (
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteStory(viewingStory.stories[currentStoryIndex].id); }} disabled={deletingStory} className="p-2 rounded-full bg-red-500/30" data-testid="button-delete-story">
                      <Trash2 className="w-5 h-5 text-white" />
                    </button>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); setViewingStory(null); }} className="p-2 rounded-full bg-white/10" data-testid="button-close-story">
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 flex items-center justify-center px-4" onClick={(e) => e.stopPropagation()}>
                <motion.img 
                  key={currentStoryIndex}
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  src={viewingStory.stories[currentStoryIndex].imageUrl} 
                  alt="Story" 
                  className="max-w-full max-h-full object-contain rounded-2xl" 
                />
              </div>
              
              <div className="absolute bottom-20 left-0 right-0 flex justify-center z-10">
                <button 
                  onClick={async (e) => { 
                    e.stopPropagation(); 
                    if (!user?.uid) return; 
                    try { 
                      const isNowLiked = await likeStory(viewingStory.stories[currentStoryIndex].id, user.uid); 
                      const updatedStories = viewingStory.stories.map((story: any, idx: number) => { 
                        if (idx === currentStoryIndex) { 
                          const currentLikedBy = story.likedBy || []; 
                          const currentLikes = story.likes || 0; 
                          return { ...story, likedBy: isNowLiked ? [...currentLikedBy, user.uid] : currentLikedBy.filter((uid: string) => uid !== user.uid), likes: isNowLiked ? currentLikes + 1 : Math.max(0, currentLikes - 1) }; 
                        } 
                        return story; 
                      }); 
                      setViewingStory({ ...viewingStory, stories: updatedStories }); 
                    } catch (error) { toast({ title: "Erro", variant: "destructive" }); }
                  }} 
                  className={`p-3 rounded-full ${viewingStory.stories[currentStoryIndex].likedBy?.includes(user?.uid || '') ? 'bg-red-500/30 text-red-500' : 'bg-white/10 text-white'}`}
                  data-testid="button-like-story"
                >
                  <Heart className={`w-6 h-6 ${viewingStory.stories[currentStoryIndex].likedBy?.includes(user?.uid || '') ? 'fill-current' : ''}`} />
                </button>
              </div>
              
              <div className="absolute inset-0 flex">
                <button onClick={(e) => { e.stopPropagation(); if (currentStoryIndex > 0) setCurrentStoryIndex(currentStoryIndex - 1); else setViewingStory(null); }} className="flex-1" data-testid="story-prev" />
                <button onClick={(e) => { e.stopPropagation(); if (currentStoryIndex < viewingStory.stories.length - 1) setCurrentStoryIndex(currentStoryIndex + 1); else setViewingStory(null); }} className="flex-1" data-testid="story-next" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
