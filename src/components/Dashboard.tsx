import React, { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp, updateDoc, increment } from "firebase/firestore";
import { generateOutline, generateDraft } from "../services/gemini";
import { Loader2, Sparkles, FileText, List, Send, ChevronRight, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

export default function Dashboard() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    niche: "",
    audience: "",
    keyword: "",
    length: "1000 words",
  });
  const [outline, setOutline] = useState("");
  const [draft, setDraft] = useState("");
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (auth.currentUser) {
        const userRef = doc(db, "users", auth.currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserProfile(userSnap.data());
        }
      }
    };
    fetchProfile();
  }, []);

  const handleGenerateOutline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;

    // Check limits
    if (userProfile.subscriptionStatus === "free" && userProfile.postsThisMonth >= 1) {
      toast.error("You've reached your free limit for this month. Upgrade to Pro for unlimited posts!");
      return;
    }

    setLoading(true);
    try {
      const res = await generateOutline(formData.niche, formData.audience, formData.keyword);
      setOutline(res);
      setStep(2);
      toast.success("Outline generated!");
    } catch (error: any) {
      console.error("Outline Generation Error:", error);
      const errorMessage = error.message || "Unknown error";
      if (errorMessage.includes("API Key is missing")) {
        toast.error("Gemini API Key is not configured. Please set GEMINI_API_KEY in your environment.");
      } else if (errorMessage.includes("Quota exceeded")) {
        toast.error("AI quota exceeded. Please try again later.");
      } else {
        toast.error(`Failed to generate outline: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDraft = async () => {
    setLoading(true);
    try {
      const res = await generateDraft(formData.niche, formData.audience, formData.keyword, formData.length, outline);
      setDraft(res);
      setStep(3);
      
      // Save to history and update user limits
      if (auth.currentUser) {
        await addDoc(collection(db, "posts"), {
          uid: auth.currentUser.uid,
          title: `Blog Post: ${formData.keyword}`,
          ...formData,
          outline,
          draft: res,
          createdAt: serverTimestamp(),
        });

        const userRef = doc(db, "users", auth.currentUser.uid);
        await updateDoc(userRef, {
          postsThisMonth: increment(1),
          lastPostDate: serverTimestamp(),
        });
        
        // Refresh local profile
        const userSnap = await getDoc(userRef);
        setUserProfile(userSnap.data());
      }
      
      toast.success("Draft generated and saved to history!");
    } catch (error: any) {
      console.error("Draft Generation Error:", error);
      const errorMessage = error.message || "Unknown error";
      toast.error(`Failed to generate draft: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-5xl font-serif tracking-tight text-white mb-2">Post Generator</h1>
          <p className="text-white/40 text-lg font-light">Craft your next masterpiece with artificial intelligence.</p>
        </div>
        <div className="glass px-6 py-3 rounded-2xl flex items-center gap-3 shadow-2xl">
          <div className={`w-2.5 h-2.5 rounded-full ${userProfile?.subscriptionStatus === 'pro' ? 'bg-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.5)]' : 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]'}`} />
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">
            {userProfile?.subscriptionStatus || 'Free'} Plan
          </span>
          <div className="w-px h-4 bg-white/10 mx-1" />
          <span className="text-xs font-mono text-white/40">
            {userProfile?.postsThisMonth || 0} / {userProfile?.subscriptionStatus === 'pro' ? '∞' : '1'}
          </span>
        </div>
      </header>

      {/* Stepper */}
      <div className="flex items-center gap-6">
        <StepIndicator active={step >= 1} label="Configure" icon={<Sparkles size={18} />} />
        <div className={`h-px flex-1 transition-all duration-500 ${step > 1 ? 'bg-indigo-500/50' : 'bg-white/5'}`} />
        <StepIndicator active={step >= 2} label="Outline" icon={<List size={18} />} />
        <div className={`h-px flex-1 transition-all duration-500 ${step > 2 ? 'bg-indigo-500/50' : 'bg-white/5'}`} />
        <StepIndicator active={step >= 3} label="Draft" icon={<FileText size={18} />} />
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.form
            key="step1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            onSubmit={handleGenerateOutline}
            className="glass p-10 rounded-[32px] shadow-2xl space-y-8"
          >
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest text-white/40 ml-1">Website Niche</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Sustainable Living"
                  className="w-full bg-white/5 px-5 py-4 rounded-2xl border border-white/5 focus:border-indigo-500/50 focus:bg-white/10 focus:ring-0 transition-all outline-none text-white placeholder:text-white/20"
                  value={formData.niche}
                  onChange={(e) => setFormData({ ...formData, niche: e.target.value })}
                />
              </div>
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest text-white/40 ml-1">Target Audience</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Eco-conscious millennials"
                  className="w-full bg-white/5 px-5 py-4 rounded-2xl border border-white/5 focus:border-indigo-500/50 focus:bg-white/10 focus:ring-0 transition-all outline-none text-white placeholder:text-white/20"
                  value={formData.audience}
                  onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
                />
              </div>
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest text-white/40 ml-1">Primary Keyword</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. zero waste kitchen tips"
                  className="w-full bg-white/5 px-5 py-4 rounded-2xl border border-white/5 focus:border-indigo-500/50 focus:bg-white/10 focus:ring-0 transition-all outline-none text-white placeholder:text-white/20"
                  value={formData.keyword}
                  onChange={(e) => setFormData({ ...formData, keyword: e.target.value })}
                />
              </div>
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest text-white/40 ml-1">Target Length</label>
                <select
                  className="w-full bg-white/5 px-5 py-4 rounded-2xl border border-white/5 focus:border-indigo-500/50 focus:bg-white/10 focus:ring-0 transition-all outline-none text-white appearance-none cursor-pointer"
                  value={formData.length}
                  onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                >
                  <option className="bg-[#111]">500 words</option>
                  <option className="bg-[#111]">1000 words</option>
                  <option className="bg-[#111]">1500 words</option>
                  <option className="bg-[#111]">2000+ words</option>
                </select>
              </div>
            </div>
            <button
              disabled={loading}
              type="submit"
              className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-indigo-500 transition-all disabled:opacity-50 shadow-xl shadow-indigo-600/20 group"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Sparkles className="group-hover:rotate-12 transition-transform" />}
              Generate Outline
            </button>
          </motion.form>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="glass p-10 rounded-[32px] shadow-2xl">
              <h2 className="text-2xl font-serif mb-8 flex items-center gap-3">
                <List className="text-indigo-400" /> Proposed Outline
              </h2>
              <div className="prose-premium">
                <ReactMarkdown>{outline}</ReactMarkdown>
              </div>
            </div>
            <div className="flex gap-6">
              <button
                onClick={() => setStep(1)}
                className="flex-1 glass text-white/60 py-5 rounded-2xl font-bold hover:text-white hover:bg-white/5 transition-all"
              >
                Back to Config
              </button>
              <button
                disabled={loading}
                onClick={handleGenerateDraft}
                className="flex-[2] bg-indigo-600 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-indigo-500 transition-all disabled:opacity-50 shadow-xl shadow-indigo-600/20"
              >
                {loading ? <Loader2 className="animate-spin" /> : <Send />}
                Generate Full Draft
              </button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="glass p-10 rounded-[32px] shadow-2xl">
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-2xl font-serif flex items-center gap-3">
                  <CheckCircle2 className="text-emerald-400" /> Full Draft Ready
                </h2>
                <button
                  onClick={() => window.location.href = '/history'}
                  className="text-sm font-bold uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  View in History
                </button>
              </div>
              <div className="prose-premium">
                <ReactMarkdown>{draft}</ReactMarkdown>
              </div>
            </div>
            <button
              onClick={() => {
                setStep(1);
                setOutline("");
                setDraft("");
                setFormData({ niche: "", audience: "", keyword: "", length: "1000 words" });
              }}
              className="w-full bg-white text-black py-5 rounded-2xl font-bold hover:bg-white/90 transition-all shadow-xl shadow-white/10"
            >
              Start New Post
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StepIndicator({ active, label, icon }: { active: boolean; label: string; icon: React.ReactNode }) {
  return (
    <div className={`flex items-center gap-3 transition-all duration-500 ${active ? "text-white" : "text-white/20"}`}>
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition-all duration-500 ${active ? "border-indigo-500/50 bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "border-white/5 bg-white/5"}`}>
        {icon}
      </div>
      <span className="text-sm font-bold uppercase tracking-widest">{label}</span>
    </div>
  );
}
