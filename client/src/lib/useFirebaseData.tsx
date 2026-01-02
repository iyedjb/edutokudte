import { useEffect, useState } from "react";
import { ref, onValue, push, set, update, get, remove, query, orderByChild, limitToLast, endBefore, runTransaction } from "firebase/database";
import { database, efeedDatabase, profileNotasDatabase } from "./firebase";
import { chatDatabase } from "./firebase-chat";
import { useAuth } from "./useAuth";
import { getCachedData, setCachedData, CacheKey } from "./cacheDB";
import LZString from "lz-string";
import { notifyPostLike, notifyMessageReceived, notifyGroupChatMessage } from "./notificationTriggers";
import type { ReactionType, PostMood, SubjectTag } from "@shared/schema";

// Helper: Extract hashtags from text
function extractHashtags(text: string): string[] {
  const hashtagRegex = /#[\w\u00C0-\u017F]+/g;
  const matches = text.match(hashtagRegex);
  return matches ? matches.map(tag => tag.toLowerCase()) : [];
}

// Helper: Normalize post from compressed format to UI format
function normalizePost(post: any): any {
  // If post uses old format (has 'text' field), return as-is
  if (post.text !== undefined && post.authorUid !== undefined) {
    return post;
  }
  
  // Handle compressed format
  // Decompress text if needed
  const text = post.c === 1 ? LZString.decompressFromUTF16(post.t) : (post.t || post.text || "");
  
  // Extract fields
  const likes = post.l || post.likes || 0;
  const likedBy = post.lb || post.likedBy || [];
  const reactionCounts = post.rc || post.reactionCounts || {};
  const reactionsByUser = post.ru || post.reactionsByUser || {};
  const totalReactions = post.tr || post.totalReactions || 0;
  
  // Backfill new reaction fields from legacy likes/likedBy
  // If no reactions but we have legacy likes, convert them to "heart" reactions
  const hasNoReactions = Object.keys(reactionCounts).length === 0 && totalReactions === 0;
  const hasLegacyLikes = likedBy.length > 0 || likes > 0;
  
  let finalReactionCounts = reactionCounts;
  let finalReactionsByUser = reactionsByUser;
  let finalTotalReactions = totalReactions;
  
  if (hasNoReactions && hasLegacyLikes) {
    // Backfill: convert all likes to "heart" reactions
    // Use Math.max to handle case where likes > 0 but likedBy is empty
    const heartCount = Math.max(likedBy.length, likes);
    finalReactionCounts = { heart: heartCount };
    finalReactionsByUser = {};
    likedBy.forEach((uid: string) => {
      finalReactionsByUser[uid] = "heart";
    });
    finalTotalReactions = heartCount;
  }
  
  // Convert compressed format to UI format
  return {
    ...post,
    text: text,
    authorUid: post.u || post.authorUid,
    authorName: post.n || post.authorName,
    authorUsername: post.un || post.authorUsername,
    authorPhoto: post.p || post.authorPhoto,
    authorVerified: post.v === 1 || post.authorVerified === true,
    timestamp: post.ts || post.timestamp,
    likes: likes,
    likedBy: likedBy,
    // New reaction system (backfilled from legacy if needed)
    reactionCounts: finalReactionCounts,
    reactionsByUser: finalReactionsByUser,
    totalReactions: finalTotalReactions,
    // Other interactions
    retweets: post.r || post.retweets || 0,
    retweetedBy: post.rb || post.retweetedBy || [],
    bookmarks: post.b || post.bookmarks || 0,
    bookmarkedBy: post.bb || post.bookmarkedBy || [],
    shares: post.s || post.shares || 0,
    views: post.vw || post.views || 0,
    commentCount: post.cc || post.commentCount || 0,
    comments: post.cm || post.comments || {},
    photoURL: post.ph || post.photoURL,
    videoURL: post.vi || post.videoURL,
    poll: post.po ? {
      question: post.po.q,
      options: post.po.o?.map((opt: any) => ({
        id: opt.i,
        text: opt.t,
        votes: opt.v || 0,
        voters: opt.vt || [],
      })),
      totalVotes: post.po.tv || 0,
    } : post.poll,
    // Creative features
    mood: post.md || post.mood,
    subjects: post.sb || post.subjects || [],
    hashtags: post.ht || post.hashtags || [],
    featured: post.ft === 1 || post.featured === true,
  };
}

// Hook for classes - reads from profileNotasDatabase for persistent class data
export function useClasses() {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Read from profileNotasDatabase where real classes (2reg4, 3reg7, etc.) are stored
    const classesRef = ref(profileNotasDatabase, "classes");
    const unsubscribe = onValue(classesRef, (snapshot) => {
      const data = snapshot.val() || {};
      const classArray = Object.keys(data).map(id => ({ id, ...data[id] }));
      setClasses(classArray);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { classes, loading };
}

// Hook for chat messages with local caching
export function useChatMessages(classId: string | null) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!classId) {
      setLoading(false);
      return;
    }

    let mounted = true;
    const cacheKey = `groupMessages_${classId}` as CacheKey;

    // Step 1: Load from cache immediately
    const loadFromCache = async () => {
      try {
        const cachedMessages = await getCachedData<any[]>(cacheKey);
        if (cachedMessages && mounted) {
          setMessages(cachedMessages);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error loading cached chat messages:", error);
      }
    };

    loadFromCache();

    // Step 2: Set up real-time Firebase listener
    const messagesRef = ref(database, `chats/${classId}/messages`);
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      if (!mounted) return;

      const data = snapshot.val() || {};
      const messageArray = Object.keys(data).map(id => ({ id, ...data[id] }));
      messageArray.sort((a, b) => a.timestamp - b.timestamp);
      
      setMessages(messageArray);
      setLoading(false);

      // Save to cache - keep messages even if Firebase deletes them
      setCachedData(cacheKey, messageArray).catch(err =>
        console.error("Error caching chat messages:", err)
      );
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [classId]);

  const sendMessage = async (text: string, uid: string, userName: string, userPhoto?: string) => {
    if (!classId) return;

    const message = {
      uid,
      userName,
      userPhoto,
      text,
      timestamp: Date.now(),
      isTeacher: false,
    };

    const messagesRef = ref(database, `chats/${classId}/messages`);
    await push(messagesRef, message);
  };

  return { messages, loading, sendMessage };
}

// Hook for videos with optional limit and pagination
export function useVideos(initialLimit = 20) {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Step 1: Load from cache immediately
    const loadFromCache = async () => {
      try {
        const cachedVideos = await getCachedData<any[]>("videos");
        if (cachedVideos && mounted) {
          setVideos(cachedVideos);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error loading cached videos:", error);
      }
    };

    loadFromCache();

    // Step 2: Set up real-time Firebase listener
    const videosRef = ref(database, "videos");
    const videosQuery = query(videosRef, orderByChild("timestamp"), limitToLast(initialLimit));
    
    const unsubscribe = onValue(videosQuery, (snapshot) => {
      if (!mounted) return;

      const data = snapshot.val() || {};
      const videoArray = Object.keys(data).map(id => ({ id, ...data[id] }));
      videoArray.sort((a, b) => b.timestamp - a.timestamp);
      
      setVideos(videoArray);
      setLoading(false);

      // Save to cache for next time
      setCachedData("videos", videoArray).catch(err =>
        console.error("Error caching videos:", err)
      );
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [initialLimit]);

  const toggleLike = async (videoId: string, uid: string) => {
    // Step 1: Optimistically update UI immediately
    const updateVideoLike = (videos: any[]) => 
      videos.map(v => {
        if (v.id === videoId) {
          const likedBy = v.likedBy || [];
          const hasLiked = likedBy.includes(uid);
          return {
            ...v,
            likes: hasLiked ? Math.max(0, (v.likes || 1) - 1) : (v.likes || 0) + 1,
            likedBy: hasLiked ? likedBy.filter((id: string) => id !== uid) : [...likedBy, uid],
          };
        }
        return v;
      });

    // Update local state immediately
    setVideos(updateVideoLike);

    // Update cache optimistically
    getCachedData<any[]>("videos").then(cachedVideos => {
      if (cachedVideos) {
        setCachedData("videos", updateVideoLike(cachedVideos));
      }
    });

    // Step 2: Update Firebase in background
    try {
      const videoRef = ref(database, `videos/${videoId}`);
      const snapshot = await get(videoRef);
      const video = snapshot.val();

      if (!video) return;

      const likedBy = video.likedBy || [];
      const hasLiked = likedBy.includes(uid);

      if (hasLiked) {
        const newLikedBy = likedBy.filter((id: string) => id !== uid);
        await update(videoRef, {
          likes: Math.max(0, (video.likes || 1) - 1),
          likedBy: newLikedBy,
        });
      } else {
        await update(videoRef, {
          likes: (video.likes || 0) + 1,
          likedBy: [...likedBy, uid],
        });
      }
    } catch (error) {
      console.error("Error toggling video like:", error);
    }
  };

  const addComment = async (videoId: string, text: string, uid: string, userName: string, userPhoto?: string) => {
    const comment = {
      uid,
      userName,
      userPhoto,
      text,
      timestamp: Date.now(),
    };

    const commentRef = ref(database, `videos/${videoId}/comments`);
    await push(commentRef, comment);
  };

  return { videos, loading, toggleLike, addComment };
}

// Helper: Create notification (for Efeed features)
export async function createNotification(
  recipientUid: string,
  type: "follow" | "like" | "comment" | "post" | "mention",
  senderUid: string,
  senderName: string,
  senderPhoto: string | undefined,
  senderVerified: boolean,
  message: string,
  postId?: string
) {
  const notification = {
    recipientUid,
    type,
    senderUid,
    senderName,
    senderPhoto: senderPhoto || "",
    senderVerified,
    message,
    postId,
    timestamp: Date.now(),
    read: false,
  };

  const notificationRef = ref(efeedDatabase, `notifications/${recipientUid}`);
  await push(notificationRef, notification);
}

// Hook for efeed posts with pagination
export function useEfeedPosts(initialLimit = 20) {
  const [realtimePosts, setRealtimePosts] = useState<any[]>([]);
  const [paginatedPosts, setPaginatedPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cacheLoaded, setCacheLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Step 1: Load from cache immediately for instant display
    const loadFromCache = async () => {
      try {
        const cachedPosts = await getCachedData<any[]>("efeed");
        if (cachedPosts && mounted) {
          setRealtimePosts(cachedPosts);
          setLoading(false);
          setCacheLoaded(true);
        }
      } catch (error) {
        console.error("Error loading cached posts:", error);
      }
    };

    loadFromCache();

    // Step 2: Set up real-time Firebase listener
    // Note: Fetch all posts without ordering by a specific field to support both
    // 'ts' (new compressed format) and 'timestamp' (old format) fields
    // Sorting is done locally after normalization
    const postsRef = ref(efeedDatabase, "efeed");
    
    const unsubscribe = onValue(postsRef, (snapshot) => {
      if (!mounted) return;

      const data = snapshot.val() || {};
      console.log("[Efeed Debug] Raw data keys:", Object.keys(data));
      console.log("[Efeed Debug] Raw data sample:", Object.entries(data).slice(0, 2).map(([k, v]) => ({ id: k, data: v })));
      const newPosts = Object.keys(data).map(id => normalizePost({ id, ...data[id] }));
      console.log("[Efeed Debug] Normalized posts:", newPosts.map(p => ({ id: p.id, text: p.text?.substring(0, 50), authorName: p.authorName, timestamp: p.timestamp })));
      newPosts.sort((a, b) => b.timestamp - a.timestamp);
      
      // Update realtime posts with fresh data from Firebase
      setRealtimePosts(newPosts);
      
      // Save to cache for next time
      setCachedData("efeed", newPosts).catch(err => 
        console.error("Error caching posts:", err)
      );
      
      // On first load, determine if there's more to load
      if (loading || !cacheLoaded) {
        setHasMore(newPosts.length === initialLimit);
      }
      
      setLoading(false);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [initialLimit]);

  // Compute combined posts (realtime + paginated)
  const postsMap = new Map<string, any>();
  [...realtimePosts, ...paginatedPosts].forEach(post => {
    // Realtime posts take precedence (they come first in the array)
    if (!postsMap.has(post.id)) {
      postsMap.set(post.id, post);
    }
  });
  
  const allPosts = Array.from(postsMap.values()).sort((a: any, b: any) => b.timestamp - a.timestamp);
  
  // Determine oldest timestamp for pagination
  const oldestTimestamp = allPosts.length > 0 
    ? allPosts[allPosts.length - 1].timestamp 
    : null;

  const loadMore = async () => {
    if (!hasMore || loadingMore || oldestTimestamp === null) return;
    
    setLoadingMore(true);
    
    try {
      // Load older posts
      const postsRef = ref(efeedDatabase, "efeed");
      const olderQuery = query(
        postsRef, 
        orderByChild("ts"), 
        endBefore(oldestTimestamp),
        limitToLast(initialLimit)
      );
      
      const snapshot = await get(olderQuery);
      const data = snapshot.val() || {};
      const newPosts = Object.keys(data).map(id => normalizePost({ id, ...data[id] }));
      
      if (newPosts.length > 0) {
        // Add to paginated posts
        setPaginatedPosts(current => {
          const combined = [...current, ...newPosts];
          // Deduplicate by ID
          const uniqueMap = new Map(combined.map(p => [p.id, p]));
          return Array.from(uniqueMap.values());
        });
        
        // Check if there are more posts to load
        setHasMore(newPosts.length === initialLimit);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error loading more posts:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  // New reaction system with transaction-safe updates
  const toggleReaction = async (postId: string, uid: string, reactionType: ReactionType, userName?: string) => {
    const postRef = ref(efeedDatabase, `efeed/${postId}`);
    
    try {
      await runTransaction(postRef, (post) => {
        if (!post) return null;
        
        // Initialize reaction fields if they don't exist (migration support)
        const reactionCounts = post.rc || {};
        const reactionsByUser = post.ru || {};
        const currentReaction = reactionsByUser[uid];
        
        // If user already has this exact reaction, remove it
        if (currentReaction === reactionType) {
          delete reactionsByUser[uid];
          reactionCounts[reactionType] = Math.max(0, (reactionCounts[reactionType] || 1) - 1);
        } 
        // If user has a different reaction, switch it
        else if (currentReaction) {
          reactionCounts[currentReaction] = Math.max(0, (reactionCounts[currentReaction] || 1) - 1);
          reactionsByUser[uid] = reactionType;
          reactionCounts[reactionType] = (reactionCounts[reactionType] || 0) + 1;
        }
        // If user has no reaction, add it
        else {
          reactionsByUser[uid] = reactionType;
          reactionCounts[reactionType] = (reactionCounts[reactionType] || 0) + 1;
        }
        
        // Calculate total reactions
        const totalReactions = Object.values(reactionCounts).reduce((sum: number, count: any) => sum + (count || 0), 0);
        
        // Update legacy like fields for backward compatibility
        const hasLiked = reactionsByUser[uid] === 'love' || reactionsByUser[uid] === 'like';
        const likedBy = hasLiked 
          ? Array.from(new Set([...(post.lb || []), uid]))
          : (post.lb || []).filter((id: string) => id !== uid);
        
        return {
          ...post,
          rc: reactionCounts,
          ru: reactionsByUser,
          tr: totalReactions,
          // Legacy fields
          l: likedBy.length,
          lb: likedBy,
        };
      });
      
      // Send notification for new reactions (not removals)
      const snapshot = await get(postRef);
      const post = snapshot.val();
      if (post && post.ru && post.ru[uid] && userName) {
        const postAuthorUid = post.u || post.authorUid;
        const postText = post.c === 1 ? LZString.decompressFromUTF16(post.t) : (post.t || post.text || "");
        await notifyPostLike(postAuthorUid, uid, userName, postText);
      }
    } catch (error) {
      console.error("Error toggling reaction:", error);
    }
  };

  // Legacy toggleLike - delegates to toggleReaction with "heart" type
  const toggleLike = async (postId: string, uid: string, likerName?: string) => {
    await toggleReaction(postId, uid, "heart", likerName);
  };

  const addComment = async (postId: string, text: string, uid: string, userName: string, userPhoto?: string) => {
    const comment: any = {
      u: uid,
      n: userName,
      t: text,
      ts: Date.now(),
    };
    
    // Only add photo if it exists (Firebase doesn't accept undefined)
    if (userPhoto) {
      comment.p = userPhoto;
    }

    const commentRef = ref(efeedDatabase, `efeed/${postId}/cm`);
    const newCommentRef = await push(commentRef, comment);
    
    // Update comment count
    const postRef = ref(efeedDatabase, `efeed/${postId}`);
    const snapshot = await get(postRef);
    const post = snapshot.val();
    
    if (post) {
      const newCommentCount = (post.cc || 0) + 1;
      
      await update(postRef, {
        cc: newCommentCount,
      });

      // Optimistically update local state for paginated posts
      setPaginatedPosts(current => 
        current.map(p => {
          if (p.id === postId) {
            return {
              ...p,
              commentCount: newCommentCount,
              comments: {
                ...(p.comments || {}),
                [newCommentRef.key!]: comment
              }
            };
          }
          return p;
        })
      );
      
      // Skip notification to reduce database writes
    }
  };

  const toggleRetweet = async (postId: string, uid: string) => {
    const updatePostRetweet = (posts: any[]) => 
      posts.map(p => {
        if (p.id === postId) {
          const retweetedBy = p.retweetedBy || [];
          const hasRetweeted = retweetedBy.includes(uid);
          return {
            ...p,
            retweets: hasRetweeted ? Math.max(0, (p.retweets || 1) - 1) : (p.retweets || 0) + 1,
            retweetedBy: hasRetweeted ? retweetedBy.filter((id: string) => id !== uid) : [...retweetedBy, uid],
          };
        }
        return p;
      });

    setRealtimePosts(updatePostRetweet);
    setPaginatedPosts(updatePostRetweet);

    try {
      const postRef = ref(efeedDatabase, `efeed/${postId}`);
      const snapshot = await get(postRef);
      const post = snapshot.val();

      if (!post) return;

      const retweetedBy = post.rb || [];
      const hasRetweeted = retweetedBy.includes(uid);

      await update(postRef, {
        r: hasRetweeted ? Math.max(0, (post.r || 1) - 1) : (post.r || 0) + 1,
        rb: hasRetweeted ? retweetedBy.filter((id: string) => id !== uid) : [...retweetedBy, uid],
      });
    } catch (error) {
      console.error("Error toggling retweet:", error);
    }
  };

  const toggleBookmark = async (postId: string, uid: string) => {
    const updatePostBookmark = (posts: any[]) => 
      posts.map(p => {
        if (p.id === postId) {
          const bookmarkedBy = p.bookmarkedBy || [];
          const hasBookmarked = bookmarkedBy.includes(uid);
          return {
            ...p,
            bookmarks: hasBookmarked ? Math.max(0, (p.bookmarks || 1) - 1) : (p.bookmarks || 0) + 1,
            bookmarkedBy: hasBookmarked ? bookmarkedBy.filter((id: string) => id !== uid) : [...bookmarkedBy, uid],
          };
        }
        return p;
      });

    setRealtimePosts(updatePostBookmark);
    setPaginatedPosts(updatePostBookmark);

    try {
      const postRef = ref(efeedDatabase, `efeed/${postId}`);
      const snapshot = await get(postRef);
      const post = snapshot.val();

      if (!post) return;

      const bookmarkedBy = post.bb || [];
      const hasBookmarked = bookmarkedBy.includes(uid);

      await update(postRef, {
        b: hasBookmarked ? Math.max(0, (post.b || 1) - 1) : (post.b || 0) + 1,
        bb: hasBookmarked ? bookmarkedBy.filter((id: string) => id !== uid) : [...bookmarkedBy, uid],
      });
    } catch (error) {
      console.error("Error toggling bookmark:", error);
    }
  };

  const incrementShare = async (postId: string) => {
    const updatePostShare = (posts: any[]) => 
      posts.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            shares: (p.shares || 0) + 1,
          };
        }
        return p;
      });

    setRealtimePosts(updatePostShare);
    setPaginatedPosts(updatePostShare);

    try {
      const postRef = ref(efeedDatabase, `efeed/${postId}`);
      const snapshot = await get(postRef);
      const post = snapshot.val();

      if (!post) return;

      await update(postRef, {
        s: (post.s || 0) + 1,
      });
    } catch (error) {
      console.error("Error incrementing share:", error);
    }
  };

  // Removed incrementViews to reduce database writes
  const incrementViews = async (postId: string) => {
    // Skip view tracking to reduce database writes
    return;
  };

  const deletePost = async (postId: string, authorUid: string) => {
    try {
      const postRef = ref(efeedDatabase, `efeed/${postId}`);
      await remove(postRef);
      
      // Optimistically remove from local paginated posts
      setPaginatedPosts(current => current.filter(p => p.id !== postId));
      
      // Update user profile post count in profileNotasDatabase using transaction
      const userProfileRef = ref(profileNotasDatabase, `userProfiles/${authorUid}`);
      await runTransaction(userProfileRef, (currentData) => {
        if (currentData === null) {
          return null; // Don't create if doesn't exist
        }
        return {
          ...currentData,
          postCount: Math.max(0, (currentData.postCount || 0) - 1),
        };
      });
      
      return { success: true };
    } catch (error: any) {
      console.error("Error deleting post:", error);
      return { success: false, error: error.message };
    }
  };

  return { posts: allPosts, loading, loadingMore, hasMore, toggleLike, toggleReaction, toggleRetweet, toggleBookmark, incrementShare, incrementViews, addComment, deletePost, loadMore };
}

// Create post with AI moderation and creative features
export async function createPost(
  text: string,
  authorUid: string,
  authorName: string,
  authorPhoto: string | undefined,
  photoBase64?: string,
  poll?: {
    question: string;
    options: string[];
  },
  videoBase64?: string,
  mood?: PostMood,
  subjects?: SubjectTag[]
): Promise<{ success: boolean; error?: string; postId?: string }> {
  try {
    // Prepare moderation payload
    const moderationPayload: any = { text };
    
    if (photoBase64) {
      // Convert base64 to data URL for moderation
      moderationPayload.photo = photoBase64.startsWith('data:') 
        ? photoBase64 
        : `data:image/jpeg;base64,${photoBase64}`;
    }

    // Call moderation endpoint
    const response = await fetch('/api/efeed/moderate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(moderationPayload),
    });

    const moderationResult = await response.json();

    if (!moderationResult.approved) {
      return {
        success: false,
        error: moderationResult.reason || "Conteúdo não permitido pela moderação",
      };
    }

    // Get user profile from profileNotasDatabase (persistent data)
    const userProfileRef = ref(profileNotasDatabase, `userProfiles/${authorUid}`);
    const userProfileSnapshot = await get(userProfileRef);
    const userProfile = userProfileSnapshot.val();
    const authorVerified = userProfile?.verified || false;

    // Enforce verified-only video uploads
    if (videoBase64 && !authorVerified) {
      return {
        success: false,
        error: "Apenas usuários verificados podem fazer upload de vídeos.",
      };
    }

    // Generate username from display name
    const authorUsername = authorName.toLowerCase().replace(/\s+/g, '');

    // Extract hashtags from text
    const hashtags = extractHashtags(text.trim());
    
    // Compress text to save storage (only if text is longer than 50 chars)
    const textToStore = text.trim().length > 50 
      ? LZString.compressToUTF16(text.trim())
      : text.trim();
    const isCompressed = text.trim().length > 50;

    // Create post data with minimal fields to reduce storage
    const postData: any = {
      t: textToStore, // compressed text
      c: isCompressed ? 1 : 0, // compression flag
      u: authorUid,
      n: authorName,
      un: authorUsername,
      p: authorPhoto || "",
      v: authorVerified ? 1 : 0,
      ts: Date.now(),
      // Legacy interaction fields (backward compatibility)
      l: 0, // likes
      lb: [], // likedBy
      // New reaction system
      rc: {}, // reactionCounts
      ru: {}, // reactionsByUser
      tr: 0, // totalReactions
      // Other interactions
      r: 0, // retweets
      b: 0, // bookmarks
      s: 0, // shares
      cc: 0, // comment count
      // Creative educational features
      ...(mood ? { md: mood } : {}), // mood (only include if defined)
      sb: subjects || [], // subjects
      ht: hashtags, // hashtags
      ft: 0, // featured
    };

    // Add photo if provided
    if (photoBase64) {
      postData.ph = photoBase64.startsWith('data:') 
        ? photoBase64 
        : `data:image/jpeg;base64,${photoBase64}`;
    }

    // Add video if provided
    if (videoBase64) {
      postData.vi = videoBase64.startsWith('data:') 
        ? videoBase64 
        : `data:video/mp4;base64,${videoBase64}`;
    }

    // Add poll if provided (with shortened keys)
    if (poll && poll.options.length >= 2) {
      postData.po = {
        q: poll.question,
        o: poll.options.map((text, index) => ({
          i: `opt_${index}`,
          t: text,
          v: 0,
        })),
        tv: 0,
      };
    }

    // Save to database
    const postsRef = ref(efeedDatabase, 'efeed');
    const newPostRef = push(postsRef);
    await set(newPostRef, postData);

    // Update user profile post count in profileNotasDatabase using transaction
    await runTransaction(userProfileRef, (currentData) => {
      if (currentData === null) {
        // Initialize full profile structure if it doesn't exist
        return { 
          uid: authorUid,
          displayName: authorName, 
          email: "",
          photoURL: authorPhoto || "",
          verified: authorVerified,
          followerCount: 0,
          followingCount: 0,
          postCount: 1,
          createdAt: Date.now(),
        };
      }
      return {
        ...currentData,
        postCount: (currentData.postCount || 0) + 1,
      };
    });

    // Log activity
    await logActivity(
      authorUid,
      "post",
      photoBase64 ? "Publicou uma foto" : videoBase64 ? "Publicou um vídeo" : poll ? "Criou uma enquete" : "Publicou no feed",
      { postId: newPostRef.key, hasMedia: !!photoBase64 || !!videoBase64, hasPoll: !!poll }
    );

    // Skip follower notifications to reduce database writes
    // Users will see new posts in their feed naturally

    return {
      success: true,
      postId: newPostRef.key || undefined,
    };
  } catch (error: any) {
    console.error("Error creating post:", error);
    return {
      success: false,
      error: error.message || "Erro ao criar post",
    };
  }
}

// Vote on poll
export async function votePoll(
  postId: string,
  optionId: string,
  uid: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const postRef = ref(efeedDatabase, `efeed/${postId}`);
    const snapshot = await get(postRef);
    const post = snapshot.val();

    if (!post || !post.po) {
      return { success: false, error: "Enquete não encontrada" };
    }

    // Check if user already voted
    const hasVoted = post.po.o.some((opt: any) => 
      opt.vt && opt.vt.includes(uid)
    );

    if (hasVoted) {
      return { success: false, error: "Você já votou nesta enquete" };
    }

    // Update the poll
    const updatedOptions = post.po.o.map((opt: any) => {
      if (opt.i === optionId) {
        return {
          ...opt,
          v: (opt.v || 0) + 1,
          vt: [...(opt.vt || []), uid],
        };
      }
      return opt;
    });

    await update(postRef, {
      po: {
        ...post.po,
        o: updatedOptions,
        tv: (post.po.tv || 0) + 1,
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error voting on poll:", error);
    return {
      success: false,
      error: error.message || "Erro ao votar",
    };
  }
}

// Hook for user profile
export function useUserProfile(uid: string | null) {
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    // Load user profile from profileNotasDatabase
    const profileRef = ref(profileNotasDatabase, `userProfiles/${uid}`);
    const profileUnsubscribe = onValue(profileRef, (snapshot) => {
      setProfile(snapshot.val());
    });

    // Load user's posts
    const postsRef = ref(efeedDatabase, 'efeed');
    const postsUnsubscribe = onValue(postsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const allPosts = Object.keys(data).map(id => normalizePost({ id, ...data[id] }));
      const userPosts = allPosts.filter(post => post.authorUid === uid);
      userPosts.sort((a, b) => b.timestamp - a.timestamp);
      setPosts(userPosts);
      setLoading(false);
    });

    return () => {
      profileUnsubscribe();
      postsUnsubscribe();
    };
  }, [uid]);

  return { profile, posts, loading };
}

// Hook for follow system
export function useFollowSystem(currentUserUid: string | null, targetUserUid: string | null) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUserUid || !targetUserUid) {
      setLoading(false);
      return;
    }

    const followRef = ref(efeedDatabase, `followRelationships/${currentUserUid}/${targetUserUid}`);
    const unsubscribe = onValue(followRef, (snapshot) => {
      setIsFollowing(snapshot.exists());
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUserUid, targetUserUid]);

  const follow = async () => {
    if (!currentUserUid || !targetUserUid) return;

    try {
      // Add follow relationship to efeedDatabase (temporary data, okay to lose)
      const followRef = ref(efeedDatabase, `followRelationships/${currentUserUid}/${targetUserUid}`);
      await set(followRef, {
        timestamp: Date.now(),
      });

      // Update follower/following counts in profileNotasDatabase (persistent data) using transactions
      const currentUserProfileRef = ref(profileNotasDatabase, `userProfiles/${currentUserUid}`);
      const targetUserProfileRef = ref(profileNotasDatabase, `userProfiles/${targetUserUid}`);

      // Use transactions to prevent race conditions
      await runTransaction(currentUserProfileRef, (currentData) => {
        if (currentData === null) {
          return { followingCount: 1 };
        }
        return {
          ...currentData,
          followingCount: (currentData.followingCount || 0) + 1,
        };
      });

      await runTransaction(targetUserProfileRef, (currentData) => {
        if (currentData === null) {
          return { followerCount: 1 };
        }
        return {
          ...currentData,
          followerCount: (currentData.followerCount || 0) + 1,
        };
      });

      // Get user profiles for notification
      const currentUserSnapshot = await get(currentUserProfileRef);
      const currentUserProfile = currentUserSnapshot.val() || {};

      // Create notification
      await createNotification(
        targetUserUid,
        "follow",
        currentUserUid,
        currentUserProfile.displayName || "Alguém",
        currentUserProfile.photoURL,
        currentUserProfile.verified || false,
        "começou a seguir você"
      );
    } catch (error) {
      console.error("Error following user:", error);
    }
  };

  const unfollow = async () => {
    if (!currentUserUid || !targetUserUid) return;

    try {
      // Remove follow relationship from efeedDatabase
      const followRef = ref(efeedDatabase, `followRelationships/${currentUserUid}/${targetUserUid}`);
      await remove(followRef);

      // Update follower/following counts in profileNotasDatabase (persistent data) using transactions
      const currentUserProfileRef = ref(profileNotasDatabase, `userProfiles/${currentUserUid}`);
      const targetUserProfileRef = ref(profileNotasDatabase, `userProfiles/${targetUserUid}`);

      // Use transactions to prevent race conditions
      await runTransaction(currentUserProfileRef, (currentData) => {
        if (currentData === null) {
          return null; // Don't create if doesn't exist
        }
        return {
          ...currentData,
          followingCount: Math.max(0, (currentData.followingCount || 0) - 1),
        };
      });

      await runTransaction(targetUserProfileRef, (currentData) => {
        if (currentData === null) {
          return null; // Don't create if doesn't exist
        }
        return {
          ...currentData,
          followerCount: Math.max(0, (currentData.followerCount || 0) - 1),
        };
      });
    } catch (error) {
      console.error("Error unfollowing user:", error);
    }
  };

  return { isFollowing, loading, follow, unfollow };
}

// Hook for notifications
export function useNotifications(uid: string | null) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    const notificationsRef = ref(efeedDatabase, `notifications/${uid}`);
    const unsubscribe = onValue(notificationsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const notificationArray = Object.keys(data).map(id => ({ id, ...data[id] }));
      notificationArray.sort((a, b) => b.timestamp - a.timestamp);
      setNotifications(notificationArray);
      setUnreadCount(notificationArray.filter(n => !n.read).length);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [uid]);

  const markAsRead = async (notificationId: string) => {
    if (!uid) return;

    const notificationRef = ref(efeedDatabase, `notifications/${uid}/${notificationId}`);
    await update(notificationRef, { read: true });
  };

  const markAllAsRead = async () => {
    if (!uid) return;

    const updates: any = {};
    notifications.forEach(notification => {
      if (!notification.read) {
        updates[`notifications/${uid}/${notification.id}/read`] = true;
      }
    });

    if (Object.keys(updates).length > 0) {
      await update(ref(efeedDatabase), updates);
    }
  };

  return { notifications, loading, unreadCount, markAsRead, markAllAsRead };
}

// Hook for grades
export function useGrades() {
  const { user } = useAuth();
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    let mounted = true;
    const cacheKey = `grades_${user.uid}` as CacheKey;

    // Step 1: Load from cache immediately for instant display
    const loadFromCache = async () => {
      try {
        const cachedGrades = await getCachedData<any[]>(cacheKey);
        if (cachedGrades && mounted) {
          setGrades(cachedGrades);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error loading cached grades:", error);
      }
    };

    loadFromCache();

    // Step 2: Set up real-time Firebase listener
    const gradesRef = ref(profileNotasDatabase, `grades/${user.uid}`);
    const unsubscribe = onValue(gradesRef, (snapshot) => {
      if (!mounted) return;

      const data = snapshot.val() || {};
      const gradeArray = Object.keys(data).map(id => ({ id, ...data[id] }));
      gradeArray.sort((a, b) => b.date - a.date);
      
      setGrades(gradeArray);
      setLoading(false);

      // Save to cache for next time
      setCachedData(cacheKey, gradeArray).catch(err =>
        console.error("Error caching grades:", err)
      );
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [user?.uid]);

  const addGrade = async (subject: string, bimestre: number, grade: number) => {
    if (!user?.uid) return;

    const gradeData = {
      uid: user.uid,
      classId: "user-input",
      className: "Auto-registrado",
      subject,
      bimestre,
      grade,
      teacher: "Auto-registrado",
      date: Date.now(),
    };

    const gradesRef = ref(profileNotasDatabase, `grades/${user.uid}`);
    await push(gradesRef, gradeData);
  };

  const updateGrade = async (gradeId: string, grade: number) => {
    if (!user?.uid) return;

    const gradeRef = ref(profileNotasDatabase, `grades/${user.uid}/${gradeId}`);
    await update(gradeRef, { grade, date: Date.now() });
  };

  const deleteGrade = async (gradeId: string) => {
    if (!user?.uid) return;

    const gradeRef = ref(profileNotasDatabase, `grades/${user.uid}/${gradeId}`);
    await remove(gradeRef);
  };

  const deleteGradesByBimestre = async (bimestre: number) => {
    if (!user?.uid) return;

    const gradesToDelete = grades.filter(g => g.bimestre === bimestre);
    
    for (const grade of gradesToDelete) {
      await deleteGrade(grade.id);
    }
  };

  return { grades, loading, addGrade, updateGrade, deleteGrade, deleteGradesByBimestre };
}

// Hook for any user's grades (for viewing other users' profiles)
export function useUserGrades(uid: string | null) {
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    const gradesRef = ref(profileNotasDatabase, `grades/${uid}`);
    const unsubscribe = onValue(gradesRef, (snapshot) => {
      const data = snapshot.val() || {};
      const gradeArray = Object.keys(data).map(id => ({ id, ...data[id] }));
      gradeArray.sort((a, b) => b.date - a.date);
      
      setGrades(gradeArray);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [uid]);

  return { grades, loading };
}

// Event CRUD helpers for teachers - using Firebase RTDB
export const createEvent = async (eventData: any) => {
  // Validate required fields
  if (!eventData.title || !eventData.date || !eventData.type) {
    throw new Error("Title, date, and type are required");
  }
  
  // Validate class visibility
  if (eventData.visibility === "class" && !eventData.classId) {
    throw new Error("ClassId is required when visibility is 'class'");
  }
  
  // Save to Firebase RTDB
  const eventsRef = ref(database, "events");
  const newEventRef = await push(eventsRef, eventData);
  
  return newEventRef.key;
};

export const updateEvent = async (eventId: string, eventData: any) => {
  // Validate class visibility
  if (eventData.visibility === "class" && !eventData.classId) {
    throw new Error("ClassId is required when visibility is 'class'");
  }
  
  // Update in Firebase RTDB
  const eventRef = ref(database, `events/${eventId}`);
  await update(eventRef, eventData);
};

export const deleteEvent = async (eventId: string) => {
  // Delete from Firebase RTDB
  const eventRef = ref(database, `events/${eventId}`);
  await remove(eventRef);
};

// Hook for events with optional limit - reads from Firebase RTDB
export function useEvents(limit?: number) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const eventsRef = ref(database, "events");
    
    const unsubscribe = onValue(eventsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const eventArray = Object.keys(data).map(id => ({ id, ...data[id] }));
      
      // Sort by date, upcoming first
      const now = Date.now();
      eventArray.sort((a, b) => {
        const aFuture = a.date >= now ? 1 : 0;
        const bFuture = b.date >= now ? 1 : 0;
        if (aFuture !== bFuture) return bFuture - aFuture;
        return a.date - b.date;
      });
      
      // Apply limit if specified
      const finalEvents = limit ? eventArray.slice(0, limit) : eventArray;
      
      setEvents(finalEvents);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [limit]);

  return { events, loading };
}

// Hook for direct messages with local caching
export function useDirectMessages(otherUserId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid || !otherUserId) {
      setLoading(false);
      return;
    }

    let mounted = true;
    const chatRoomId = [user.uid, otherUserId].sort().join("_");
    const cacheKey = `directMessages_${chatRoomId}` as CacheKey;

    // Step 1: Load from cache immediately
    const loadFromCache = async () => {
      try {
        const cachedMessages = await getCachedData<any[]>(cacheKey);
        if (cachedMessages && mounted) {
          setMessages(cachedMessages);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error loading cached direct messages:", error);
      }
    };

    loadFromCache();

    // Step 2: Set up real-time Firebase listener
    const messagesRef = ref(database, `directMessages/${chatRoomId}`);
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      if (!mounted) return;

      const data = snapshot.val() || {};
      const messageArray = Object.keys(data).map(id => ({ id, ...data[id] }));
      messageArray.sort((a, b) => a.timestamp - b.timestamp);
      
      setMessages(messageArray);
      setLoading(false);

      // Save to cache - keep messages even if Firebase deletes them
      setCachedData(cacheKey, messageArray).catch(err =>
        console.error("Error caching direct messages:", err)
      );
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [user?.uid, otherUserId]);

  const sendMessage = async (text: string, otherUserId: string) => {
    if (!user?.uid || !otherUserId) return;

    const message = {
      senderUid: user.uid,
      senderName: user.displayName || "Usuário",
      senderPhoto: user.photoURL || "",
      text,
      timestamp: Date.now(),
      read: false,
    };

    const chatRoomId = [user.uid, otherUserId].sort().join("_");
    const messagesRef = ref(database, `directMessages/${chatRoomId}`);
    await push(messagesRef, message);
  };

  return { messages, loading, sendMessage };
}

// Hook for getting user conversations
export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    const messagesRef = ref(database, "directMessages");
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val() || {};
      const convos: any[] = [];

      Object.keys(data).forEach((chatRoomId) => {
        const [uid1, uid2] = chatRoomId.split("_");
        if (uid1 === user.uid || uid2 === user.uid) {
          const otherUserId = uid1 === user.uid ? uid2 : uid1;
          const messages = data[chatRoomId];
          const messageArray = Object.keys(messages).map(id => ({ id, ...messages[id] }));
          messageArray.sort((a, b) => b.timestamp - a.timestamp);
          const lastMessage = messageArray[0];

          convos.push({
            chatRoomId,
            otherUserId,
            lastMessage,
            unreadCount: messageArray.filter(m => !m.read && m.senderUid !== user.uid).length,
          });
        }
      });

      convos.sort((a, b) => b.lastMessage.timestamp - a.lastMessage.timestamp);
      setConversations(convos);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  return { conversations, loading };
}

// Hook for grade group messages
export function useGradeGroupMessages(grade: string | undefined | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Array<{ id: string; grade: string; senderUid: string; senderName: string; senderPhoto?: string; text: string; timestamp: number; isProfessor?: boolean }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!grade) {
      setMessages([]);
      setLoading(false);
      return;
    }

    let mounted = true;
    const cacheKey = `groupMessages_${grade}` as CacheKey;

    // Step 1: Load from cache immediately
    const loadFromCache = async () => {
      try {
        const cachedMessages = await getCachedData<typeof messages>(cacheKey);
        if (cachedMessages && mounted) {
          setMessages(cachedMessages);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error loading cached group messages:", error);
      }
    };

    loadFromCache();

    // Step 2: Set up real-time Firebase listener (now using chatDatabase)
    const messagesRef = ref(chatDatabase, `gradeGroups/${grade}/messages`);
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      if (!mounted) return;

      const data = snapshot.val() || {};
      const messageArray = Object.keys(data).map(id => ({ id, ...data[id] }));
      messageArray.sort((a, b) => a.timestamp - b.timestamp);
      
      setMessages(messageArray);
      setLoading(false);

      // Save to cache for next time
      setCachedData(cacheKey, messageArray).catch(err =>
        console.error("Error caching group messages:", err)
      );
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [grade]);

  const sendMessage = async (text: string, attachment?: { type: "image" | "document"; data: string; fileName?: string; fileSize?: number }) => {
    if (!user?.uid || !grade) return;

    // Check if the user is a professor for this grade
    const assignmentsRef = ref(database, "professorAssignments");
    const assignmentsSnapshot = await get(assignmentsRef);
    const assignments = assignmentsSnapshot.val() || {};
    const isProfessor = Object.values(assignments).some(
      (a: any) => a.professorUid === user.uid && a.grade === grade
    );

    const message: any = {
      grade,
      senderUid: user.uid,
      senderName: user.displayName || "Usuário",
      senderPhoto: user.photoURL || "",
      text,
      timestamp: Date.now(),
      isProfessor,
    };

    if (attachment) {
      message.attachment = attachment;
    }

    const messagesRef = ref(chatDatabase, `gradeGroups/${grade}/messages`);
    await push(messagesRef, message);

    // Send notifications to all group members
    await notifyGroupChatMessage(
      grade,
      user.uid,
      user.displayName || "Usuário",
      user.photoURL,
      text
    );
  };

  return { messages, loading, sendMessage };
}

// Hook for professor assignments
export function useProfessorAssignments(grade?: string | null) {
  const [professors, setProfessors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const assignmentsRef = ref(database, "professorAssignments");
    const unsubscribe = onValue(assignmentsRef, async (snapshot) => {
      const data = snapshot.val() || {};
      let assignmentArray = Object.keys(data).map(id => ({ id, ...data[id] }));
      
      if (grade) {
        assignmentArray = assignmentArray.filter(a => a.grade === grade);
      }

      // Fetch professor details if they're registered (from permanent database)
      const professorsWithDetails = await Promise.all(
        assignmentArray.map(async (assignment) => {
          if (assignment.professorUid) {
            const userRef = ref(profileNotasDatabase, `users/${assignment.professorUid}`);
            const userSnapshot = await get(userRef);
            if (userSnapshot.exists()) {
              const userData = userSnapshot.val();
              return {
                ...assignment,
                professorName: userData.displayName,
                professorPhoto: userData.photoURL,
              };
            }
          }
          return assignment;
        })
      );

      setProfessors(professorsWithDetails);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [grade]);

  return { professors, loading };
}

// Hook for professor-student conversations
export function useProfessorConversations(isProfessor: boolean = false) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    let mounted = true;
    const cacheKey = `professorConversations_${user.uid}_${isProfessor ? 'prof' : 'student'}` as CacheKey;

    // Step 1: Load from cache immediately for instant display
    const loadFromCache = async () => {
      try {
        const cachedConversations = await getCachedData<any[]>(cacheKey);
        if (cachedConversations && mounted) {
          setConversations(cachedConversations);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error loading cached conversations:", error);
      }
    };

    loadFromCache();

    // Step 2: Set up real-time Firebase listener (now using chatDatabase)
    const conversationsRef = ref(chatDatabase, "professorConversations");
    const unsubscribe = onValue(conversationsRef, (snapshot) => {
      if (!mounted) return;

      const data = snapshot.val() || {};
      const conversationArray = Object.keys(data).map(id => ({ id, ...data[id] }));
      
      // Filter by user type
      const filtered = conversationArray.filter(conv => {
        if (isProfessor) {
          return conv.professorUid === user.uid;
        } else {
          return conv.studentUid === user.uid;
        }
      });

      // Deduplicate conversations using Map keyed by chatRoomId or conversation composite key
      // This prevents duplicate conversations from appearing in the UI
      const dedupedMap = new Map<string, any>();
      filtered.forEach(conv => {
        const key = conv.chatRoomId || `${conv.studentUid}_${conv.professorUid}`;
        const existing = dedupedMap.get(key);
        // Keep the most recently created/updated conversation
        if (!existing || conv.createdAt > existing.createdAt) {
          dedupedMap.set(key, conv);
        }
      });

      // Convert back to array and sort by newest first
      const dedupedConversations = Array.from(dedupedMap.values());
      dedupedConversations.sort((a, b) => b.createdAt - a.createdAt);
      
      setConversations(dedupedConversations);
      setLoading(false);

      // Save to cache for next time
      setCachedData(cacheKey, dedupedConversations).catch(err =>
        console.error("Error caching conversations:", err)
      );
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [user?.uid, isProfessor]);

  const createConversation = async (professorUid: string, professorName: string, professorPhoto: string | undefined, initialMessage: string, studentGrade: string) => {
    if (!user?.uid) return null;

    const conversation = {
      studentUid: user.uid,
      studentName: user.displayName || "Aluno",
      studentPhoto: user.photoURL,
      studentGrade,
      professorUid,
      professorName,
      professorPhoto,
      status: "pending",
      initialMessage,
      createdAt: Date.now(),
      messageCount: 1,
    };

    const conversationsRef = ref(chatDatabase, "professorConversations");
    const newConvRef = await push(conversationsRef, conversation);
    return newConvRef.key;
  };

  const approveConversation = async (conversationId: string) => {
    const convRef = ref(chatDatabase, `professorConversations/${conversationId}`);
    await update(convRef, {
      status: "approved",
      approvedAt: Date.now(),
    });
  };

  const rejectConversation = async (conversationId: string) => {
    const convRef = ref(chatDatabase, `professorConversations/${conversationId}`);
    await update(convRef, {
      status: "rejected",
    });
  };

  return { conversations, loading, createConversation, approveConversation, rejectConversation };
}

// Hook for professor-student messages
export function useProfessorMessages(conversationId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [conversation, setConversation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!conversationId) {
      setLoading(false);
      return;
    }

    let mounted = true;
    const cacheKey = `professorMessages_${conversationId}` as CacheKey;

    // Step 1: Load messages from cache immediately
    const loadFromCache = async () => {
      try {
        const cachedMessages = await getCachedData<any[]>(cacheKey);
        if (cachedMessages && mounted) {
          setMessages(cachedMessages);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error loading cached professor messages:", error);
      }
    };

    loadFromCache();

    // Step 2: Listen to conversation details (now using chatDatabase)
    const convRef = ref(chatDatabase, `professorConversations/${conversationId}`);
    const convUnsubscribe = onValue(convRef, (snapshot) => {
      if (!mounted) return;
      if (snapshot.exists()) {
        setConversation({ id: snapshot.key, ...snapshot.val() });
      }
    });

    // Step 3: Listen to messages with real-time updates (now using chatDatabase)
    const messagesRef = ref(chatDatabase, `professorMessages/${conversationId}`);
    const messagesUnsubscribe = onValue(messagesRef, (snapshot) => {
      if (!mounted) return;

      const data = snapshot.val() || {};
      const messageArray = Object.keys(data).map(id => ({ id, ...data[id] }));
      messageArray.sort((a, b) => a.timestamp - b.timestamp);
      
      setMessages(messageArray);
      setLoading(false);

      // Save to cache for next time
      setCachedData(cacheKey, messageArray).catch(err =>
        console.error("Error caching professor messages:", err)
      );
    });

    return () => {
      mounted = false;
      convUnsubscribe();
      messagesUnsubscribe();
    };
  }, [conversationId]);

  const sendMessage = async (text: string, isProfessor: boolean, attachment?: { type: "image" | "document"; data: string; fileName?: string; fileSize?: number }) => {
    if (!user?.uid || !conversationId || !conversation) return;

    // Check if student can send message
    if (!isProfessor && conversation.status !== "approved") {
      throw new Error("Aguardando aprovação do professor");
    }

    const message: any = {
      conversationId,
      senderUid: user.uid,
      senderName: user.displayName || "Usuário",
      senderPhoto: user.photoURL || "",
      isProfessor,
      text,
      timestamp: Date.now(),
      read: false,
    };

    if (attachment) {
      message.attachment = attachment;
    }

    const messagesRef = ref(chatDatabase, `professorMessages/${conversationId}`);
    await push(messagesRef, message);

    // Increment message count if student
    if (!isProfessor) {
      const convRef = ref(chatDatabase, `professorConversations/${conversationId}`);
      await update(convRef, {
        messageCount: (conversation.messageCount || 1) + 1,
      });
    }

    // Send notification to the recipient
    const recipientUid = isProfessor ? conversation.studentUid : conversation.professorUid;
    await notifyMessageReceived(
      recipientUid,
      user.uid,
      user.displayName || "Usuário",
      user.photoURL || undefined,
      text,
      conversationId
    );
  };

  return { messages, conversation, loading, sendMessage };
}

// Hook for pending conversation count (for professors)
export function usePendingConversationsCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    const conversationsRef = ref(database, "professorConversations");
    const unsubscribe = onValue(conversationsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const conversationArray = Object.keys(data).map(id => ({ id, ...data[id] }));
      
      const pendingCount = conversationArray.filter(
        conv => conv.professorUid === user.uid && conv.status === "pending"
      ).length;

      setCount(pendingCount);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  return { count, loading };
}

// Hook to get all users for friend suggestions
export function useAllUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const usersRef = ref(efeedDatabase, "userProfiles");
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val() || {};
      const userArray = Object.keys(data).map(uid => ({ uid, ...data[uid] }));
      setUsers(userArray);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { users, loading };
}

// Toggle follow/unfollow for a user
export async function toggleFollowUser(currentUserUid: string, targetUserUid: string) {
  try {
    const followRef = ref(efeedDatabase, `followRelationships/${currentUserUid}/${targetUserUid}`);
    const snapshot = await get(followRef);
    const isFollowing = snapshot.exists();

    if (isFollowing) {
      // Unfollow
      await remove(followRef);

      // Update counts
      const currentUserProfileRef = ref(efeedDatabase, `userProfiles/${currentUserUid}`);
      const targetUserProfileRef = ref(efeedDatabase, `userProfiles/${targetUserUid}`);

      const currentUserSnapshot = await get(currentUserProfileRef);
      const targetUserSnapshot = await get(targetUserProfileRef);

      const currentUserProfile = currentUserSnapshot.val() || {};
      const targetUserProfile = targetUserSnapshot.val() || {};

      await update(currentUserProfileRef, {
        followingCount: Math.max(0, (currentUserProfile.followingCount || 0) - 1),
      });

      await update(targetUserProfileRef, {
        followerCount: Math.max(0, (targetUserProfile.followerCount || 0) - 1),
      });
    } else {
      // Follow
      await set(followRef, {
        timestamp: Date.now(),
      });

      // Update counts
      const currentUserProfileRef = ref(efeedDatabase, `userProfiles/${currentUserUid}`);
      const targetUserProfileRef = ref(efeedDatabase, `userProfiles/${targetUserUid}`);

      const currentUserSnapshot = await get(currentUserProfileRef);
      const targetUserSnapshot = await get(targetUserProfileRef);

      const currentUserProfile = currentUserSnapshot.val() || {};
      const targetUserProfile = targetUserSnapshot.val() || {};

      await update(currentUserProfileRef, {
        followingCount: (currentUserProfile.followingCount || 0) + 1,
      });

      await update(targetUserProfileRef, {
        followerCount: (targetUserProfile.followerCount || 0) + 1,
      });

      // Create notification
      await createNotification(
        targetUserUid,
        "follow",
        currentUserUid,
        currentUserProfile.displayName || "Alguém",
        currentUserProfile.photoURL,
        currentUserProfile.verified || false,
        "começou a seguir você"
      );
    }
  } catch (error) {
    console.error("Error toggling follow:", error);
    throw error;
  }
}

// Hook to get all stories
export function useStories() {
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storiesRef = ref(efeedDatabase, "stories");
    const unsubscribe = onValue(storiesRef, (snapshot) => {
      const data = snapshot.val() || {};
      const storyArray = Object.keys(data).map(id => ({ id, ...data[id] }));
      
      // Filter out expired stories (older than 24 hours)
      const now = Date.now();
      const activeStories = storyArray.filter(story => 
        (now - story.timestamp) < 24 * 60 * 60 * 1000
      );
      
      // Group by user
      const groupedByUser = activeStories.reduce((acc: any, story) => {
        if (!acc[story.userUid]) {
          acc[story.userUid] = {
            userUid: story.userUid,
            userName: story.userName,
            userPhoto: story.userPhoto,
            verified: story.verified,
            stories: []
          };
        }
        acc[story.userUid].stories.push(story);
        return acc;
      }, {});
      
      // Convert to array and sort by most recent
      const userStories = Object.values(groupedByUser).map((user: any) => ({
        ...user,
        stories: user.stories.sort((a: any, b: any) => b.timestamp - a.timestamp)
      })).sort((a: any, b: any) => 
        b.stories[0].timestamp - a.stories[0].timestamp
      );
      
      setStories(userStories);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { stories, loading };
}

// Create a new story
export async function createStory(userUid: string, userName: string, userPhoto: string, verified: boolean, imageBase64: string) {
  try {
    const storyId = `story_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const storyRef = ref(efeedDatabase, `stories/${storyId}`);
    
    await set(storyRef, {
      userUid,
      userName,
      userPhoto,
      verified,
      imageUrl: imageBase64,
      timestamp: Date.now(),
      views: 0
    });
    
    return storyId;
  } catch (error) {
    console.error("Error creating story:", error);
    throw error;
  }
}

// Delete a story
export async function deleteStory(storyId: string) {
  try {
    const storyRef = ref(efeedDatabase, `stories/${storyId}`);
    await remove(storyRef);
    return true;
  } catch (error) {
    console.error("Error deleting story:", error);
    throw error;
  }
}

// Like/Unlike a story
export async function likeStory(storyId: string, userUid: string) {
  try {
    const storyRef = ref(efeedDatabase, `stories/${storyId}`);
    const snapshot = await get(storyRef);
    
    if (!snapshot.exists()) {
      throw new Error("Story not found");
    }
    
    const story = snapshot.val();
    const likedBy = story.likedBy || [];
    const likes = story.likes || 0;
    
    const hasLiked = likedBy.includes(userUid);
    
    if (hasLiked) {
      // Unlike: remove user from likedBy array
      const updatedLikedBy = likedBy.filter((uid: string) => uid !== userUid);
      await update(storyRef, {
        likedBy: updatedLikedBy,
        likes: Math.max(0, likes - 1)
      });
    } else {
      // Like: add user to likedBy array
      await update(storyRef, {
        likedBy: [...likedBy, userUid],
        likes: likes + 1
      });
    }
    
    return !hasLiked;
  } catch (error) {
    console.error("Error liking story:", error);
    throw error;
  }
}

// Activity Tracking System
export async function logActivity(
  userUid: string,
  type: "post" | "chat_eduna" | "grade_update" | "comment" | "like" | "follow",
  description: string,
  metadata?: any
) {
  try {
    const activityRef = ref(efeedDatabase, `activities/${userUid}`);
    await push(activityRef, {
      type,
      description,
      metadata: metadata || {},
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Error logging activity:", error);
  }
}

// Hook for user activities
export function useUserActivities(userUid: string | null) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userUid) {
      setLoading(false);
      return;
    }

    // Read activities from primary database (where they are written)
    const activitiesRef = ref(database, `activities/${userUid}`);
    const activitiesQuery = query(activitiesRef, orderByChild("timestamp"), limitToLast(50));
    
    const unsubscribe = onValue(activitiesQuery, (snapshot) => {
      const data = snapshot.val() || {};
      const activityArray = Object.keys(data).map(id => ({ id, ...data[id] }));
      activityArray.sort((a, b) => b.timestamp - a.timestamp);
      setActivities(activityArray);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userUid]);

  return { activities, loading };
}

