import React, { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { Check, Loader2, CreditCard, Zap, ShieldCheck, Globe } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";

export default function Pricing() {
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    if (!auth.currentUser) return;
    const unsubscribe = onSnapshot(doc(db, "users", auth.currentUser.uid), (doc) => {
      setUserProfile(doc.data());
    });
    return () => unsubscribe();
  }, []);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      if (!auth.currentUser) return;
      
      const userRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userRef, {
        subscriptionStatus: "pro"
      });
      
      toast.success("Successfully upgraded to Pro! (Mocked for now)");
    } catch (error) {
      console.error(error);
      toast.error("Failed to upgrade.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h1>
        <p className="text-lg text-gray-600">
          Unlock unlimited blog posts and advanced SEO features with our Pro plan.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Free Plan */}
        <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm flex flex-col">
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Free</h3>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold">$0</span>
              <span className="text-gray-500">/month</span>
            </div>
          </div>
          <ul className="space-y-4 mb-8 flex-1">
            <FeatureItem label="1 Blog Post per month" />
            <FeatureItem label="AI Outline Generation" />
            <FeatureItem label="Basic SEO Optimization" />
            <FeatureItem label="Standard Support" />
          </ul>
          <button
            disabled
            className="w-full py-4 rounded-xl font-bold bg-gray-100 text-gray-400 cursor-not-allowed"
          >
            Current Plan
          </button>
        </div>

        {/* Pro Plan */}
        <div className="bg-black p-8 rounded-3xl border border-black shadow-xl flex flex-col relative overflow-hidden">
          <div className="absolute top-4 right-4 bg-indigo-500 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest">
            Popular
          </div>
          <div className="mb-8 text-white">
            <h3 className="text-xl font-bold mb-2">Pro</h3>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold">$29</span>
              <span className="text-gray-400">/month</span>
            </div>
          </div>
          <ul className="space-y-4 mb-8 flex-1 text-white">
            <FeatureItem label="Unlimited Blog Posts" />
            <FeatureItem label="Advanced SEO Analysis" />
            <FeatureItem label="Priority AI Generation" />
            <FeatureItem label="24/7 Priority Support" />
            <FeatureItem label="Custom Brand Voice" />
          </ul>
          <button
            onClick={handleUpgrade}
            disabled={loading || userProfile?.subscriptionStatus === 'pro'}
            className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
              userProfile?.subscriptionStatus === 'pro'
                ? "bg-green-500 text-white cursor-default"
                : "bg-white text-black hover:bg-gray-100"
            }`}
          >
            {loading ? <Loader2 className="animate-spin" /> : <Zap size={18} />}
            {userProfile?.subscriptionStatus === 'pro' ? "Active Subscription" : "Upgrade to Pro"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8 pt-12 border-t border-gray-100">
        <TrustItem icon={<ShieldCheck className="text-indigo-500" />} label="Secure Payments" />
        <TrustItem icon={<Zap className="text-yellow-500" />} label="Instant Activation" />
        <TrustItem icon={<Globe className="text-blue-500" />} label="Global Access" />
      </div>
    </div>
  );
}

function FeatureItem({ label }: { label: string }) {
  return (
    <li className="flex items-center gap-3 text-sm">
      <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center">
        <Check className="text-green-500 w-3 h-3" />
      </div>
      {label}
    </li>
  );
}

function TrustItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center text-center gap-2">
      {icon}
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
    </div>
  );
}
