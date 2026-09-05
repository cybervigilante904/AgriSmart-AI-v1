import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  MessageSquare, 
  Heart, 
  Share2, 
  Plus, 
  Search, 
  Filter, 
  Sparkles, 
  Send, 
  Image as ImageIcon, 
  X, 
  MapPin, 
  Sprout, 
  Check, 
  AlertTriangle, 
  HelpCircle, 
  Lightbulb, 
  TrendingUp, 
  ShieldAlert,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { Language, TRANSLATIONS } from '../translations';
import { type FarmerProfile } from '../db';
import { cn } from '../lib/utils';
import { CommunityChat } from './CommunityChat';

export interface CommunityReply {
  id: string;
  author: string;
  region: string;
  content: string;
  createdAt: number;
}

export interface CommunityPost {
  id: string;
  author: string;
  region: string;
  category: 'Question' | 'Tip' | 'Market Alert' | 'Pest Alert' | 'Success Story';
  crop?: string;
  title?: string;
  content: string;
  imageUrl?: string;
  likes: number;
  replies: CommunityReply[];
  createdAt: number;
}

interface CommunityViewProps {
  language: Language;
  profile: FarmerProfile | null;
}

export function CommunityView({ language, profile }: CommunityViewProps) {
  const t = TRANSLATIONS[language];
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeReplyPostId, setActiveReplyPostId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

  // New Post Form State
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<'Question' | 'Tip' | 'Market Alert' | 'Pest Alert' | 'Success Story'>('Question');
  const [newCrop, setNewCrop] = useState(profile?.mainCrops?.[0] || '');
  const [newAuthor, setNewAuthor] = useState(profile?.name || 'Local Farmer');
  const [newRegion, setNewRegion] = useState(profile?.region || profile?.country || 'Harare');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const [postSuccess, setPostSuccess] = useState(false);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/community');
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } catch (err) {
      console.warn("Failed fetching community posts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleLike = async (postId: string) => {
    if (likedPosts.has(postId)) return;
    
    // Optimistic UI update
    setLikedPosts(prev => new Set(prev).add(postId));
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: p.likes + 1 } : p));

    try {
      await fetch(`/api/community/${postId}/like`, { method: 'POST' });
    } catch (err) {
      console.warn("Failed to like post:", err);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    setIsSubmittingPost(true);
    try {
      const response = await fetch('/api/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: newAuthor.trim() || 'Farmer',
          region: newRegion.trim() || 'Local Region',
          category: newCategory,
          crop: newCrop.trim() || undefined,
          title: newTitle.trim() || undefined,
          content: newContent.trim(),
          imageUrl: newImageUrl.trim() || undefined
        })
      });

      if (response.ok) {
        const createdPost: CommunityPost = await response.json();
        setPosts(prev => [createdPost, ...prev]);
        setPostSuccess(true);
        setTimeout(() => {
          setPostSuccess(false);
          setShowCreateModal(false);
          setNewTitle('');
          setNewContent('');
          setNewImageUrl('');
        }, 1200);
      }
    } catch (err) {
      console.error("Failed to post:", err);
    } finally {
      setIsSubmittingPost(false);
    }
  };

  const handleAddReply = async (postId: string) => {
    if (!replyContent.trim()) return;
    setIsSubmittingReply(true);

    try {
      const response = await fetch(`/api/community/${postId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: profile?.name || 'Farmer',
          region: profile?.region || profile?.country || 'Local District',
          content: replyContent.trim()
        })
      });

      if (response.ok) {
        const newReply: CommunityReply = await response.json();
        setPosts(prev => prev.map(p => {
          if (p.id === postId) {
            return { ...p, replies: [...(p.replies || []), newReply] };
          }
          return p;
        }));
        setReplyContent('');
        setActiveReplyPostId(null);
      }
    } catch (err) {
      console.error("Failed adding reply:", err);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const CATEGORIES = ['All', 'Question', 'Tip', 'Market Alert', 'Pest Alert', 'Success Story'];

  const filteredPosts = posts.filter(post => {
    const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory;
    const matchesSearch = searchQuery.trim() === '' || 
      (post.title && post.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (post.crop && post.crop.toLowerCase().includes(searchQuery.toLowerCase())) ||
      post.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.region.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Question': return <HelpCircle size={13} className="text-amber-600" />;
      case 'Tip': return <Lightbulb size={13} className="text-emerald-600" />;
      case 'Market Alert': return <TrendingUp size={13} className="text-blue-600" />;
      case 'Pest Alert': return <ShieldAlert size={13} className="text-red-600" />;
      case 'Success Story': return <Sparkles size={13} className="text-purple-600" />;
      default: return <Sprout size={13} className="text-emerald-600" />;
    }
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'Question': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Tip': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Market Alert': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Pest Alert': return 'bg-red-50 text-red-700 border-red-200';
      case 'Success Story': return 'bg-purple-50 text-purple-700 border-purple-200';
      default: return 'bg-stone-50 text-stone-700 border-stone-200';
    }
  };

  return (
    <div className="p-3 sm:p-5 pb-24 h-full overflow-y-auto space-y-5">
      <div>
        <h2 className="text-2xl font-serif font-bold text-natural-primary">Community Group</h2>
        <p className="text-xs text-natural-text/65 font-medium mt-0.5">Join the farmer group to share advice and discuss field work in realtime.</p>
      </div>
      <CommunityChat />
    </div>
  );

  return (
    <div className="p-3 sm:p-5 space-y-5 pb-24 h-full overflow-y-auto">
      {/* Header & Quick Action */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-serif font-bold text-natural-primary flex items-center gap-2">
              <Users className="text-natural-gold" size={26} />
              <span>{t.community || "Farmer Community"}</span>
            </h2>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {posts.length} Discussions
            </span>
          </div>
          <p className="text-xs text-natural-text/65 font-medium mt-0.5">
            Share field observations, ask agronomy questions, and trade local advice
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchPosts}
            className="p-2 rounded-xl bg-white border border-natural-accent/20 text-natural-primary hover:bg-natural-tan transition-all"
            title="Refresh Discussions"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>

          <button
            id="community-new-post-btn"
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-natural-primary hover:bg-natural-primary/90 text-white rounded-2xl text-xs font-bold flex items-center gap-2 shadow-md active:scale-95 transition-all"
          >
            <Plus size={16} />
            <span>Create Post</span>
          </button>
        </div>
      </div>

      <CommunityChat />

      {/* Search & Category Filter Pills */}
      <div className="space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-natural-accent/60" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search crop, pest issue, market price, or region..."
            className="w-full pl-10 pr-4 py-2.5 bg-white rounded-2xl border border-natural-accent/20 text-xs focus:outline-none focus:ring-2 focus:ring-natural-primary shadow-sm"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border",
                selectedCategory === cat
                  ? "bg-natural-primary text-white border-natural-primary shadow-sm"
                  : "bg-white text-natural-accent hover:bg-natural-tan border-natural-accent/15"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Posts List */}
      {loading && posts.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-natural-primary mx-auto" />
          <p className="text-xs text-natural-text/60 font-medium">Loading community discussions...</p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="text-center py-14 bg-white rounded-[32px] border border-dashed border-natural-accent/25 p-8 space-y-3">
          <div className="h-14 w-14 bg-natural-tan/60 rounded-full flex items-center justify-center mx-auto text-natural-accent">
            <MessageSquare size={28} />
          </div>
          <h4 className="font-serif font-bold text-lg text-natural-primary">No discussions found</h4>
          <p className="text-xs text-natural-text/60 max-w-sm mx-auto">
            {searchQuery ? "Try a different search keyword or category filter." : "Be the first farmer to share a tip, question, or market alert!"}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-2 px-4 py-2 bg-natural-primary text-white rounded-xl text-xs font-bold"
          >
            Start a Discussion
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-4 sm:p-5 rounded-[28px] card-shadow border border-natural-accent/15 space-y-3 transition-all hover:border-natural-accent/30"
            >
              {/* Post Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-gradient-to-br from-natural-primary to-natural-accent text-white rounded-2xl flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                    {post.author ? post.author[0].toUpperCase() : 'F'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-natural-primary">{post.author}</h4>
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1",
                        getCategoryBadgeClass(post.category)
                      )}>
                        {getCategoryIcon(post.category)}
                        <span>{post.category}</span>
                      </span>
                    </div>
                    <p className="text-[11px] text-natural-text/60 flex items-center gap-1 font-medium mt-0.5">
                      <MapPin size={11} className="text-natural-gold" />
                      <span>{post.region}</span>
                      {post.crop && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-700 font-semibold">{post.crop}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <span className="text-[10px] text-natural-text/40 font-medium">
                  {new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </div>

              {/* Post Title & Content */}
              <div className="space-y-1.5">
                {post.title && (
                  <h3 className="font-serif font-bold text-base text-natural-primary leading-snug">
                    {post.title}
                  </h3>
                )}
                <p className="text-xs sm:text-sm text-natural-text/85 leading-relaxed whitespace-pre-line font-normal">
                  {post.content}
                </p>
              </div>

              {/* Attached Image if any */}
              {post.imageUrl && (
                <div className="rounded-2xl overflow-hidden max-h-72 border border-natural-accent/10">
                  <img 
                    src={post.imageUrl} 
                    alt="Community upload" 
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}

              {/* Action Bar (Likes, Replies toggle) */}
              <div className="flex items-center justify-between border-t border-natural-accent/10 pt-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleLike(post.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                      likedPosts.has(post.id)
                        ? "bg-red-50 text-red-600 border border-red-200"
                        : "bg-natural-tan/50 hover:bg-natural-tan text-natural-text"
                    )}
                  >
                    <Heart size={14} className={likedPosts.has(post.id) ? "fill-red-500 text-red-500" : ""} />
                    <span>{post.likes || 0}</span>
                  </button>

                  <button
                    onClick={() => setActiveReplyPostId(activeReplyPostId === post.id ? null : post.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-natural-tan/50 hover:bg-natural-tan text-natural-text text-xs font-bold transition-all"
                  >
                    <MessageSquare size={14} className="text-natural-accent" />
                    <span>{post.replies?.length || 0} Replies</span>
                  </button>
                </div>

                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: post.title || 'AgriSmart Community Post',
                        text: `${post.author}: "${post.content}"`
                      }).catch(() => {});
                    } else {
                      navigator.clipboard.writeText(`${post.author}: "${post.content}"`);
                      alert("Post link copied to clipboard!");
                    }
                  }}
                  className="p-1.5 text-natural-accent hover:text-natural-primary rounded-lg transition-colors"
                  title="Share"
                >
                  <Share2 size={15} />
                </button>
              </div>

              {/* Thread Replies Section */}
              {(activeReplyPostId === post.id || (post.replies && post.replies.length > 0)) && (
                <div className="space-y-2.5 pt-2 border-t border-natural-accent/10">
                  {post.replies && post.replies.length > 0 && (
                    <div className="space-y-2 pl-3 border-l-2 border-natural-accent/20">
                      {post.replies.map((reply) => (
                        <div key={reply.id} className="bg-natural-tan/30 p-2.5 rounded-xl space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-natural-primary">{reply.author}</span>
                            <span className="text-[9px] text-natural-text/50">{reply.region}</span>
                          </div>
                          <p className="text-xs text-natural-text/85">{reply.content}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Reply Input */}
                  {activeReplyPostId === post.id && (
                    <div className="flex gap-2 pt-1">
                      <input
                        type="text"
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="Write a helpful reply..."
                        className="flex-1 px-3 py-2 bg-stone-50 rounded-xl border border-natural-accent/20 text-xs focus:outline-none focus:ring-1 focus:ring-natural-primary"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddReply(post.id)}
                      />
                      <button
                        onClick={() => handleAddReply(post.id)}
                        disabled={isSubmittingReply || !replyContent.trim()}
                        className="px-3 py-2 bg-natural-primary text-white rounded-xl text-xs font-bold disabled:opacity-50 flex items-center gap-1"
                      >
                        {isSubmittingReply ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                        <span>Reply</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Community Create Post Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white rounded-[32px] p-5 sm:p-6 card-shadow border border-natural-accent/15 space-y-4 my-8"
            >
              <div className="flex items-center justify-between border-b border-natural-accent/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-natural-primary/10 rounded-xl text-natural-primary">
                    <Plus size={18} />
                  </div>
                  <h3 className="font-serif font-bold text-lg text-natural-primary">Create Community Post</h3>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1.5 text-natural-text/50 hover:text-natural-primary rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>

              {postSuccess ? (
                <div className="py-10 text-center space-y-2">
                  <div className="h-12 w-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <Check size={24} />
                  </div>
                  <h4 className="font-bold text-natural-primary text-base">Post Published!</h4>
                  <p className="text-xs text-natural-text/60">Your question/tip is now live for other farmers.</p>
                </div>
              ) : (
                <form onSubmit={handleCreatePost} className="space-y-3.5">
                  {/* Category Selector */}
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-natural-accent mb-1">
                      Post Category
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['Question', 'Tip', 'Market Alert', 'Pest Alert', 'Success Story'] as const).map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setNewCategory(cat)}
                          className={cn(
                            "py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all truncate text-center",
                            newCategory === cat
                              ? "bg-natural-primary text-white border-natural-primary shadow-sm"
                              : "bg-stone-50 text-natural-text border-natural-accent/15 hover:bg-natural-tan"
                          )}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Crop & Title */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-wider text-natural-accent mb-1">
                        Crop / Subject
                      </label>
                      <input
                        type="text"
                        value={newCrop}
                        onChange={(e) => setNewCrop(e.target.value)}
                        placeholder="e.g. Maize, Tomatoes, Cattle"
                        className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-natural-accent/20 text-xs focus:outline-none focus:ring-1 focus:ring-natural-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-wider text-natural-accent mb-1">
                        Author Name
                      </label>
                      <input
                        type="text"
                        value={newAuthor}
                        onChange={(e) => setNewAuthor(e.target.value)}
                        placeholder="Your name"
                        className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-natural-accent/20 text-xs focus:outline-none focus:ring-1 focus:ring-natural-primary"
                      />
                    </div>
                  </div>

                  {/* Optional Title */}
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-natural-accent mb-1">
                      Headline (Optional)
                    </label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g. Top-dressing timing with incoming rains"
                      className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-natural-accent/20 text-xs focus:outline-none focus:ring-1 focus:ring-natural-primary"
                    />
                  </div>

                  {/* Content */}
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-natural-accent mb-1">
                      Post Content *
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      placeholder="Describe your agricultural question, advice, field observation, or local market price..."
                      className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-natural-accent/20 text-xs focus:outline-none focus:ring-1 focus:ring-natural-primary leading-relaxed"
                    />
                  </div>

                  {/* Optional Image URL */}
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-natural-accent mb-1 flex items-center gap-1">
                      <ImageIcon size={12} />
                      <span>Optional Photo Image URL</span>
                    </label>
                    <input
                      type="url"
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full px-3 py-2 bg-stone-50 rounded-xl border border-natural-accent/20 text-xs focus:outline-none focus:ring-1 focus:ring-natural-primary"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-natural-accent/10">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-natural-text hover:bg-stone-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingPost || !newContent.trim()}
                      className="px-5 py-2 bg-natural-primary hover:bg-natural-primary/90 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md disabled:opacity-50"
                    >
                      {isSubmittingPost ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      <span>Publish Post</span>
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
