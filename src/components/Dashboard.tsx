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
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate outline.");
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
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate draft.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Post Generator</h1>
          <p className="text-gray-500 mt-1">Create high-quality content with AI.</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-full border border-gray-200 flex items-center gap-2 shadow-sm">
          <div className={`w-2 h-2 rounded-full ${userProfile?.subscriptionStatus === 'pro' ? 'bg-indigo-500' : 'bg-green-500'}`} />
          <span className="text-sm font-medium uppercase tracking-wider text-gray-600">
            {userProfile?.subscriptionStatus || 'Free'} Plan
          </span>
          <span className="text-xs text-gray-400 ml-2">
            ({userProfile?.postsThisMonth || 0} / {userProfile?.subscriptionStatus === 'pro' ? '∞' : '1'} used)
          </span>
        </div>
      </header>

      {/* Stepper */}
      <div className="flex items-center gap-4 mb-8">
        <StepIndicator active={step >= 1} label="Configure" icon={<Sparkles size={16} />} />
        <div className="h-px flex-1 bg-gray-200" />
        <StepIndicator active={step >= 2} label="Outline" icon={<List size={16} />} />
        <div className="h-px flex-1 bg-gray-200" />
        <StepIndicator active={step >= 3} label="Draft" icon={<FileText size={16} />} />
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.form
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onSubmit={handleGenerateOutline}
            className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-6"
          >
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Website Niche</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Sustainable Living, Tech Reviews"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-0 transition-all"
                  value={formData.niche}
                  onChange={(e) => setFormData({ ...formData, niche: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Target Audience</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Eco-conscious millennials"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-0 transition-all"
                  value={formData.audience}
                  onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Primary Keyword</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. zero waste kitchen tips"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-0 transition-all"
                  value={formData.keyword}
                  onChange={(e) => setFormData({ ...formData, keyword: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Target Length</label>
                <select
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-0 transition-all"
                  value={formData.length}
                  onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                >
                  <option>500 words</option>
                  <option>1000 words</option>
                  <option>1500 words</option>
                  <option>2000+ words</option>
                </select>
              </div>
            </div>
            <button
              disabled={loading}
              type="submit"
              className="w-full bg-black text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : <ChevronRight />}
              Generate Outline
            </button>
          </motion.form>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm prose prose-slate max-w-none">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <List className="text-indigo-500" /> Proposed Outline
              </h2>
              <ReactMarkdown>{outline}</ReactMarkdown>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setStep(1)}
                className="flex-1 bg-white border border-gray-200 text-gray-600 py-4 rounded-xl font-bold hover:bg-gray-50 transition-all"
              >
                Back to Config
              </button>
              <button
                disabled={loading}
                onClick={handleGenerateDraft}
                className="flex-[2] bg-black text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-all disabled:opacity-50"
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
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm prose prose-slate max-w-none">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <CheckCircle2 className="text-green-500" /> Full Draft Ready
                </h2>
                <button
                  onClick={() => window.location.href = '/history'}
                  className="text-sm font-medium text-indigo-600 hover:underline"
                >
                  View in History
                </button>
              </div>
              <ReactMarkdown>{draft}</ReactMarkdown>
            </div>
            <button
              onClick={() => {
                setStep(1);
                setOutline("");
                setDraft("");
                setFormData({ niche: "", audience: "", keyword: "", length: "1000 words" });
              }}
              className="w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-800 transition-all"
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
    <div className={`flex items-center gap-2 ${active ? "text-black" : "text-gray-400"}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${active ? "border-black bg-black text-white" : "border-gray-200"}`}>
        {icon}
      </div>
      <span className="text-sm font-semibold">{label}</span>
    </div>
  );
}
