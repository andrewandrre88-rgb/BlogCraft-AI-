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
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">History</h1>
          <p className="text-gray-500 mt-1">Your generated blog posts.</p>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search posts..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:border-black focus:ring-0 transition-all text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* List */}
        <div className="lg:col-span-1 space-y-4">
          {filteredPosts.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-dashed border-gray-300 text-center">
              <p className="text-gray-500 text-sm">No posts found.</p>
            </div>
          ) : (
            filteredPosts.map((post) => (
              <motion.div
                key={post.id}
                layoutId={post.id}
                onClick={() => setSelectedPost(post)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedPost?.id === post.id
                    ? "bg-black text-white border-black shadow-lg"
                    : "bg-white text-gray-900 border-gray-200 hover:border-black"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-sm line-clamp-2">{post.title}</h3>
                  <button
                    onClick={(e) => handleDelete(post.id, e)}
                    className={`p-1 rounded-md hover:bg-red-500 hover:text-white transition-colors ${
                      selectedPost?.id === post.id ? "text-gray-400" : "text-gray-300"
                    }`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex items-center gap-2 text-[10px] opacity-70 uppercase tracking-wider font-mono">
                  <Calendar size={10} />
                  {post.createdAt?.toDate().toLocaleDateString()}
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
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm prose prose-slate max-w-none"
              >
                <div className="flex items-center justify-between mb-8 pb-4 border-bottom border-gray-100">
                  <div>
                    <h2 className="text-2xl font-bold m-0">{selectedPost.title}</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {selectedPost.niche} • {selectedPost.audience} • {selectedPost.length}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedPost.draft);
                        toast.success("Copied to clipboard!");
                      }}
                      className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                      title="Copy Draft"
                    >
                      <FileText size={18} />
                    </button>
                  </div>
                </div>
                <ReactMarkdown>{selectedPost.draft}</ReactMarkdown>
              </motion.div>
            ) : (
              <div className="h-full min-h-[400px] bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
                <FileText size={48} className="mb-4 opacity-20" />
                <p className="text-sm font-medium">Select a post to preview</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
