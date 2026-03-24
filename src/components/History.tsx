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
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this post?")) {
      try {
        await deleteDoc(doc(db, "posts", id));
        toast.success("Post deleted.");
      } catch (error) {
        console.error(error);
        toast.error("Failed to delete post.");
      }
    }
  };

  const filteredPosts = posts.filter((post) =>
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.keyword.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-12">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-5xl font-serif tracking-tight text-white mb-2">History</h1>
          <p className="text-white/40 text-lg font-light">Your collection of AI-crafted stories.</p>
        </div>
        <div className="relative w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 w-5 h-5" />
          <input
            type="text"
            placeholder="Search your archives..."
            className="w-full bg-white/5 pl-12 pr-5 py-4 rounded-2xl border border-white/5 focus:border-indigo-500/50 focus:bg-white/10 focus:ring-0 transition-all outline-none text-white placeholder:text-white/20 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* List */}
        <div className="lg:col-span-1 space-y-4">
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
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {selectedPost ? (
              <motion.div
                key={selectedPost.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="glass p-12 rounded-[40px] shadow-2xl"
              >
                <div className="flex items-start justify-between mb-12 pb-8 border-b border-white/5">
                  <div>
                    <h2 className="text-4xl font-serif text-white mb-4 leading-tight">{selectedPost.title}</h2>
                    <div className="flex flex-wrap gap-3">
                      <span className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] font-bold uppercase tracking-widest text-white/40">{selectedPost.niche}</span>
                      <span className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] font-bold uppercase tracking-widest text-white/40">{selectedPost.audience}</span>
                      <span className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] font-bold uppercase tracking-widest text-white/40">{selectedPost.length}</span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedPost.draft);
                        toast.success("Copied to clipboard!");
                      }}
                      className="p-4 rounded-2xl glass hover:bg-white/10 transition-all text-white/60 hover:text-white shadow-xl"
                      title="Copy Draft"
                    >
                      <FileText size={20} />
                    </button>
                  </div>
                </div>
                <div className="prose-premium">
                  <ReactMarkdown>{selectedPost.draft}</ReactMarkdown>
                </div>
              </motion.div>
            ) : (
              <div className="h-full min-h-[500px] glass rounded-[40px] border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-white/10">
                <FileText size={64} className="mb-6 opacity-5" />
                <p className="text-lg font-light tracking-wide">Select a post to preview its content</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
