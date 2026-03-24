import { auth, db } from "../firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { PenTool, Chrome, ExternalLink, AlertCircle } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { useState, useEffect } from "react";

export default function Auth() {
  const [isIframe, setIsIframe] = useState(false);

  useEffect(() => {
    setIsIframe(window.self !== window.top);
  }, []);

  const handleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user exists in Firestore
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          subscriptionStatus: "free",
          postsThisMonth: 0,
          lastPostDate: null,
        });
      }
      toast.success("Signed in successfully!");
    } catch (error: any) {
      console.error("Auth Error:", error);
      if (error.code === "auth/popup-blocked") {
        toast.error("Sign-in popup was blocked. Please allow popups for this site.");
      } else if (error.code === "auth/unauthorized-domain") {
        toast.error("This domain is not authorized for Google Sign-in. Please check your Firebase console.");
      } else if (error.code === "auth/internal-error" || error.message?.includes("cross-origin")) {
        toast.error("Mobile browser restriction detected. Please use the 'Open in New Tab' button below.");
      } else {
        toast.error(`Failed to sign in: ${error.message || "Please try again."}`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.05),transparent_70%)] pointer-events-none" />
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-xl text-center relative z-10"
      >
        <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-600 rounded-[24px] mb-12 shadow-2xl shadow-indigo-600/20">
          <PenTool className="text-white w-10 h-10" />
        </div>
        
        <h1 className="text-5xl md:text-7xl font-serif italic tracking-tight text-white mb-6">BlogCraft AI</h1>
        <p className="text-lg md:text-xl text-white/40 font-light mb-12 md:mb-16 max-w-md mx-auto leading-relaxed px-4">
          The ultimate companion for modern storytellers. Craft high-quality, SEO-optimized blog posts in seconds.
        </p>

        <div className="space-y-4 px-4 md:px-0">
          <button
            onClick={handleSignIn}
            className="w-full flex items-center justify-center gap-4 bg-white text-black px-6 md:px-8 py-4 md:py-5 rounded-2xl font-bold hover:bg-white/90 transition-all shadow-2xl shadow-white/10 group"
          >
            <Chrome className="w-6 h-6 group-hover:rotate-12 transition-transform" />
            <span className="text-base md:text-lg">Continue with Google</span>
          </button>

          {isIframe && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 justify-center text-amber-400/80 text-xs font-medium bg-amber-400/5 py-3 px-4 rounded-xl border border-amber-400/10">
                <AlertCircle size={14} />
                <span>Mobile login may be blocked in this view</span>
              </div>
              <a
                href={window.location.href}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-4 bg-white/5 text-white/70 border border-white/10 px-6 md:px-8 py-4 md:py-5 rounded-2xl font-bold hover:bg-white/10 hover:text-white transition-all group"
              >
                <ExternalLink className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                <span className="text-base md:text-lg">Open in New Tab</span>
              </a>
            </div>
          )}
        </div>

        <div className="mt-12 md:mt-20 flex flex-wrap items-center justify-center gap-6 md:gap-12 opacity-20 grayscale hover:grayscale-0 transition-all duration-700">
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-white">SEO Optimized</div>
          <div className="hidden md:block w-1 h-1 bg-white/50 rounded-full" />
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-white">AI Powered</div>
          <div className="hidden md:block w-1 h-1 bg-white/50 rounded-full" />
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-white">Fast Drafts</div>
        </div>
      </motion.div>
    </div>
  );
}
