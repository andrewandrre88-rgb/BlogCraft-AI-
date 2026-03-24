import { auth, db } from "../firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { PenTool, Chrome } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";

export default function Auth() {
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
      toast.error("Failed to sign in. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md text-center"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 bg-black rounded-2xl mb-8 shadow-xl">
          <PenTool className="text-white w-8 h-8" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-4">BlogCraft AI</h1>
        <p className="text-lg text-gray-600 mb-12">
          Generate high-quality blog posts in seconds. Optimized for SEO and your specific audience.
        </p>

        <button
          onClick={handleSignIn}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 text-gray-900 px-6 py-4 rounded-xl font-semibold hover:border-black hover:bg-gray-50 transition-all shadow-sm"
        >
          <Chrome className="w-6 h-6" />
          Continue with Google
        </button>

        <div className="mt-12 grid grid-cols-3 gap-8 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
          <div className="text-xs font-mono uppercase tracking-widest">SEO Optimized</div>
          <div className="text-xs font-mono uppercase tracking-widest">AI Powered</div>
          <div className="text-xs font-mono uppercase tracking-widest">Fast Drafts</div>
        </div>
      </motion.div>
    </div>
  );
}
