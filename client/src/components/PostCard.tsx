import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PostText } from "@/components/PostText";
import { Heart, MessageCircle, MoreHorizontal, Bookmark, Check, Trash2, Send, Share } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ReactionType } from "@shared/schema";

interface PostCardProps {
  post: any;
  currentUser?: { uid: string; displayName?: string | null; photoURL?: string | null };
  currentProfile?: any;
  onReactionToggle: (postId: string, uid: string, reaction: ReactionType, userName?: string) => void;
  onComment: (postId: string, text: string, uid: string, userName: string, userPhoto?: string) => void;
  onBookmark: (postId: string, uid: string) => void;
  onShare: (postId: string) => void;
  onVotePoll?: (postId: string, optionId: string, uid: string) => void;
  onIncrementViews?: (postId: string) => void;
  onToggleRetweet?: (postId: string, uid: string) => void;
  onDelete?: (postId: string, authorUid: string) => void;
}

export function PostCard({
  post,
  currentUser,
  currentProfile,
  onReactionToggle,
  onComment,
  onBookmark,
  onShare,
  onVotePoll,
  onIncrementViews,
  onDelete,
}: PostCardProps) {
  const [commentText, setCommentText] = useState("");
  const [viewsTracked, setViewsTracked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const commentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!viewsTracked && (post.photoURL || post.videoURL) && onIncrementViews) {
      onIncrementViews(post.id);
      setViewsTracked(true);
    }
  }, [post.id, post.photoURL, post.videoURL, viewsTracked, onIncrementViews]);

  const handleCommentSubmit = () => {
    if (!commentText.trim() || !currentUser) return;
    onComment(post.id, commentText, currentUser.uid, currentProfile?.displayName || currentUser.displayName || "Usuário", currentProfile?.photoURL || currentUser.photoURL);
    setCommentText("");
  };

  const handlePollVote = (optionId: string) => {
    if (!currentUser || !onVotePoll) return;
    onVotePoll(post.id, optionId, currentUser.uid);
  };

  const userReaction = currentUser ? post.reactionsByUser?.[currentUser.uid] : undefined;
  const commentsArray = post.comments ? (Array.isArray(post.comments) ? post.comments : Object.values(post.comments || {})) : [];
  const isBookmarked = post.bookmarkedBy?.includes(currentUser?.uid || '');

  return (
    <Card className="rounded-3xl border-0 bg-card shadow-sm overflow-hidden">
      <CardContent className="p-0" data-testid={`card-content-${post.id}`}>
        <div className="p-4">
          <div className="flex items-center justify-between gap-3">
            <Link href={`/efeed/profile/${post.authorUid}`}>
              <div className="flex items-center gap-3 cursor-pointer" data-testid={`link-author-${post.id}`}>
                <Avatar className="w-10 h-10" data-testid={`avatar-author-${post.id}`}>
                  <AvatarImage src={post.authorPhoto} />
                  <AvatarFallback className="text-sm">{post.authorName?.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-semibold" data-testid={`text-author-name-${post.id}`}>{post.authorName}</span>
                    {post.authorVerified && <Check className="w-3.5 h-3.5 text-primary" data-testid={`badge-verified-${post.id}`} />}
                  </div>
                  <span className="text-xs text-muted-foreground" data-testid={`text-timestamp-${post.id}`}>
                    {post.timestamp && !isNaN(new Date(post.timestamp).getTime()) ? formatDistanceToNow(post.timestamp, { addSuffix: true, locale: ptBR }) : "Agora"}
                  </span>
                </div>
              </div>
            </Link>

            {currentUser?.uid === post.authorUid && onDelete && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" data-testid={`button-menu-${post.id}`}>
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-2xl">
                  <DropdownMenuItem onClick={() => onDelete(post.id, post.authorUid)} className="text-destructive gap-2" data-testid={`menu-item-delete-${post.id}`}>
                    <Trash2 className="w-4 h-4" />Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {post.text && (
          <div className="px-4 pb-3 text-sm" data-testid={`text-content-${post.id}`}>
            <PostText text={post.text} />
          </div>
        )}

        {post.photoURL && (
          <div className="bg-muted/30" data-testid={`media-photo-${post.id}`}>
            <img src={post.photoURL} alt="Post" className="w-full max-h-[400px] object-cover" loading="lazy" />
          </div>
        )}

        {post.videoURL && (
          <div className="bg-muted/30" data-testid={`media-video-${post.id}`}>
            <video src={post.videoURL} controls className="w-full max-h-[400px]" />
          </div>
        )}

        {post.poll && (
          <div className="px-4 pb-3 space-y-2" data-testid={`poll-container-${post.id}`}>
            <p className="font-medium text-sm" data-testid={`poll-question-${post.id}`}>{post.poll.question}</p>
            {post.poll.options.map((option: any) => {
              const percentage = post.poll.totalVotes > 0 ? (option.votes / post.poll.totalVotes) * 100 : 0;
              const hasVoted = option.voters?.includes(currentUser?.uid);
              const pollDisabled = post.poll.options.some((o: any) => o.voters?.includes(currentUser?.uid));
              
              return (
                <button
                  key={option.id}
                  disabled={pollDisabled}
                  onClick={() => !pollDisabled && handlePollVote(option.id)}
                  className={`w-full relative overflow-hidden rounded-xl h-10 text-left ${pollDisabled ? '' : 'hover:bg-muted/50'}`}
                  data-testid={`poll-option-${post.id}-${option.id}`}
                >
                  <div className="absolute inset-0 bg-muted/30" />
                  <div className={`absolute inset-y-0 left-0 ${hasVoted ? 'bg-primary/30' : 'bg-primary/20'}`} style={{ width: `${percentage}%` }} />
                  <div className="relative z-10 flex items-center justify-between h-full px-3">
                    <span className="text-sm">{option.text}</span>
                    <span className="text-xs text-muted-foreground">{percentage.toFixed(0)}%</span>
                  </div>
                </button>
              );
            })}
            <p className="text-xs text-muted-foreground" data-testid={`poll-votes-${post.id}`}>{post.poll.totalVotes} votos</p>
          </div>
        )}

        <div className="px-4 py-3 flex items-center justify-between border-t border-border/50">
          <div className="flex items-center gap-1">
            <button
              onClick={() => currentUser && onReactionToggle(post.id, currentUser.uid, 'heart', currentProfile?.displayName || currentUser.displayName || "Usuário")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${userReaction ? 'bg-red-500/10 text-red-500' : 'hover:bg-muted/50 text-muted-foreground'}`}
              data-testid={`button-reaction-${post.id}`}
            >
              <Heart className={`w-4 h-4 ${userReaction ? 'fill-current' : ''}`} />
              {post.totalReactions > 0 && <span>{post.totalReactions}</span>}
            </button>
            
            <button
              onClick={() => { setShowComments(!showComments); setTimeout(() => commentInputRef.current?.focus(), 100); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${showComments ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50 text-muted-foreground'}`}
              data-testid={`button-comment-${post.id}`}
            >
              <MessageCircle className="w-4 h-4" />
              {commentsArray.length > 0 && <span>{commentsArray.length}</span>}
            </button>

            <button
              onClick={() => onShare(post.id)}
              className="p-2 rounded-full hover:bg-muted/50 text-muted-foreground"
              data-testid={`button-share-${post.id}`}
            >
              <Share className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => currentUser && onBookmark(post.id, currentUser.uid)}
            className={`p-2 rounded-full transition-colors ${isBookmarked ? 'text-amber-500' : 'hover:bg-muted/50 text-muted-foreground'}`}
            data-testid={`button-bookmark-${post.id}`}
          >
            <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
          </button>
        </div>

        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-border/50"
            >
              {commentsArray.length > 0 && (
                <div className="p-4 space-y-3">
                  {commentsArray.slice(0, 3).map((comment: any, idx: number) => (
                    <div key={idx} className="flex gap-2" data-testid={`comment-${post.id}-${idx}`}>
                      <Avatar className="w-7 h-7">
                        <AvatarImage src={comment.p || comment.authorPhoto} />
                        <AvatarFallback className="text-[10px]">{(comment.n || comment.authorName)?.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 bg-muted/30 rounded-2xl px-3 py-2">
                        <span className="text-xs font-medium" data-testid={`comment-author-${post.id}-${idx}`}>{comment.n || comment.authorName}</span>
                        <p className="text-sm" data-testid={`comment-text-${post.id}-${idx}`}>{comment.t || comment.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="p-4 pt-0 flex items-center gap-2">
                <Avatar className="w-7 h-7" data-testid={`avatar-comment-user-${post.id}`}>
                  <AvatarImage src={currentProfile?.photoURL || currentUser?.photoURL} />
                  <AvatarFallback className="text-[10px]">{(currentProfile?.displayName || currentUser?.displayName)?.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 flex items-center bg-muted/30 rounded-full pr-1">
                  <Input
                    ref={commentInputRef}
                    placeholder="Comentar..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && commentText.trim() && handleCommentSubmit()}
                    className="border-0 bg-transparent focus-visible:ring-0 text-sm h-9"
                    data-testid={`input-comment-${post.id}`}
                  />
                  {commentText.trim() && (
                    <Button size="icon" onClick={handleCommentSubmit} className="h-7 w-7 rounded-full" data-testid={`button-submit-comment-${post.id}`}>
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
