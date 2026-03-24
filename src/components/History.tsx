import React, { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { Trash2, ExternalLink, Calendar, Search, FileText } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

export default function History() {
  const [posts, setPosts] = useState<any[]>([]);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, "posts"),
      where("uid", "==", auth.currentUser.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPosts(postsData);
    }, (error) => {
      console.error("History fetch error:", error);
      toast.error("Failed to load history. If this is your first time, an index might be building.");
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // In a production app, we'd use a custom modal. 
    // For now, we'll perform the delete directly to avoid window.confirm issues in iframes.
    try {
      await deleteDoc(doc(db, "posts", id));
      toast.success("Post deleted.");
      if (selectedPost?.id === id) setSelectedPost(null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete post.");
    }
  };

  const filteredPosts = posts.filter((post) =>
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.keyword.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 md:space-y-12">
      <header className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 md:gap-6">
        <div>
          <h1 className="text-3xl md:text-5xl font-serif tracking-tight text-white mb-2">History</h1>
          <p className="text-white/40 text-sm md:text-lg font-light">Your collection of AI-crafted stories.</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 w-5 h-5" />
          <input
            type="text"
            placeholder="Search your archives..."
            className="w-full bg-white/5 pl-12 pr-5 py-3.5 md:py-4 rounded-2xl border border-white/5 focus:border-indigo-500/50 focus:bg-white/10 focus:ring-0 transition-all outline-none text-white placeholder:text-white/20 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
        {/* List */}
        <div className={`lg:col-span-1 space-y-4 ${selectedPost ? 'hidden lg:block' : 'block'}`}>
          {filteredPosts.length === 0 ? (
            <div className="glass p-10 rounded-[32px] border border-dashed border-white/10 text-center">
              <p className="text-white/20 text-sm font-medium">No archives found.</p>
            </div>
          ) : (
            filteredPosts.map((post) => (
              <motion.div
                key={post.id}
                layoutId={post.id}
                onClick={() => setSelectedPost(post)}
                className={`p-6 rounded-2xl border cursor-pointer transition-all duration-300 ${
                  selectedPost?.id === post.id
                    ? "bg-indigo-600 text-white border-indigo-500 shadow-2xl shadow-indigo-600/20"
                    : "glass text-white/60 border-white/5 hover:border-white/20 hover:text-white"
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="font-serif text-lg leading-tight line-clamp-2">{post.title}</h3>
                  <button
                    onClick={(e) => handleDelete(post.id, e)}
                    className={`p-2 rounded-xl transition-colors ${
                      selectedPost?.id === post.id ? "text-white/40 hover:text-white hover:bg-white/10" : "text-white/10 hover:text-red-400 hover:bg-red-400/10"
                    }`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] font-bold opacity-40">
                  <Calendar size={12} />
                  {post.createdAt?.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Preview */}
        <div className={`lg:col-span-2 ${!selectedPost ? 'hidden lg:block' : 'block'}`}>
          <AnimatePresence mode="wait">
            {selectedPost ? (
              <motion.div
                key={selectedPost.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="glass p-6 md:p-12 rounded-[24px] md:rounded-[40px] shadow-2xl"
              >
                <div className="flex flex-col md:flex-row items-start justify-between mb-8 md:mb-12 pb-8 border-b border-white/5 gap-6">
                  <div className="w-full">
                    <button 
                      onClick={() => setSelectedPost(null)}
                      className="lg:hidden mb-6 text-indigo-400 font-bold text-xs uppercase tracking-widest flex items-center gap-2"
                    >
                      ← Back to list
                    </button>
                    <h2 className="text-2xl md:text-4xl font-serif text-white mb-4 leading-tight">{selectedPost.title}</h2>
                    <div className="flex flex-wrap gap-2 md:gap-3">
                      <span className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] font-bold uppercase tracking-widest text-white/40">{selectedPost.niche}</span>
                      <span className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] font-bold uppercase tracking-widest text-white/40">{selectedPost.audience}</span>
                      <span className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] font-bold uppercase tracking-widest text-white/40">{selectedPost.length}</span>
                    </div>
                  </div>
                  <div className="flex gap-3 w-full md:w-auto">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedPost.draft);
                        toast.success("Copied to clipboard!");
                      }}
                      className="flex-1 md:flex-none p-4 rounded-2xl glass hover:bg-white/10 transition-all text-white/60 hover:text-white shadow-xl flex items-center justify-center gap-2"
                      title="Copy Draft"
                    >
                      <FileText size={20} />
                      <span className="md:hidden text-xs font-bold uppercase tracking-widest">Copy Draft</span>
                    </button>
                  </div>
                </div>
                <div className="prose-premium text-sm md:text-base">
                  <ReactMarkdown>{selectedPost.draft}</ReactMarkdown>
                </div>
              </motion.div>
            ) : (
              <div className="h-full min-h-[300px] md:min-h-[500px] glass rounded-[24px] md:rounded-[40px] border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-white/10 p-8 text-center">
                <FileText className="w-12 md:w-16 h-12 md:h-16 mb-6 opacity-5" />
                <p className="text-base md:text-lg font-light tracking-wide">Select a post to preview its content</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
