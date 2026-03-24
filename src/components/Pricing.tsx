import React, { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { Check, Loader2, CreditCard, Zap, ShieldCheck, Globe } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";

export default function Pricing() {
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [stripeReady, setStripeReady] = useState<boolean | null>(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch("/api/health");
        const data = await res.json();
        setStripeReady(data.stripeConfigured);
      } catch (e) {
        console.error("Health check failed:", e);
      }
    };
    checkHealth();

    if (!auth.currentUser) return;
    const unsubscribe = onSnapshot(doc(db, "users", auth.currentUser.uid), (doc) => {
      setUserProfile(doc.data());
    });
    return () => unsubscribe();
  }, []);

  const handleUpgrade = async (plan: string) => {
    if (stripeReady === false) {
      toast.error("Stripe is not configured. Please set STRIPE_SECRET_KEY in the Settings menu.");
      return;
    }

    setLoading(true);
    let attempts = 0;
    const maxAttempts = 2;

    const attemptCheckout = async (): Promise<void> => {
      try {
        if (!auth.currentUser) {
          toast.error("Please sign in to upgrade.");
          return;
        }
        
        const response = await fetch("/api/create-checkout-session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: auth.currentUser.uid,
            email: auth.currentUser.email,
            plan: plan,
          }),
        });

        console.log(`Checkout session response status (Attempt ${attempts + 1}):`, response.status);
        const text = await response.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.error("Non-JSON response from server:", text);
          if (attempts < maxAttempts - 1) {
            attempts++;
            console.log(`Retrying checkout attempt ${attempts + 1}...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            return attemptCheckout();
          }
          const preview = text.slice(0, 100).replace(/<[^>]*>?/gm, '');
          throw new Error(`The server returned an invalid response (${response.status}). This often happens if the API route is missing or the server is restarting. Response preview: ${preview}...`);
        }

        if (data.url) {
          window.location.href = data.url;
        } else {
          throw new Error(data.error || "Failed to create checkout session");
        }
      } catch (error: any) {
        console.error(error);
        throw error;
      }
    };

    try {
      await attemptCheckout();
    } catch (error: any) {
      toast.error(`Failed to start checkout: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12 md:space-y-16">
      <header className="text-center max-w-3xl mx-auto px-4">
        <h1 className="text-3xl md:text-6xl font-serif tracking-tight text-white mb-4 md:mb-6 leading-tight">Simple, Transparent Pricing</h1>
        <p className="text-base md:text-xl text-white/40 font-light leading-relaxed">
          Unlock unlimited blog posts and advanced SEO features with our premium plans. Designed for serious content creators.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12 max-w-7xl mx-auto px-4 md:px-0">
        {/* Free Plan */}
        <div className="glass p-8 md:p-10 rounded-[32px] md:rounded-[40px] shadow-2xl flex flex-col relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="mb-8 md:mb-10">
            <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-white/40 mb-4">Standard</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl md:text-5xl font-serif text-white">$0</span>
              <span className="text-white/20 font-light italic">/month</span>
            </div>
          </div>
          <ul className="space-y-4 md:space-y-5 mb-8 md:mb-10 flex-1">
            <FeatureItem label="1 Blog Post per month" />
            <FeatureItem label="AI Outline Generation" />
            <FeatureItem label="Basic SEO Optimization" />
            <FeatureItem label="Standard Support" />
          </ul>
          <button
            disabled
            className="w-full py-4 md:py-5 rounded-2xl font-bold bg-white/5 text-white/20 cursor-not-allowed border border-white/5"
          >
            Current Plan
          </button>
        </div>

        {/* Pro Plan */}
        <div className="bg-indigo-600 p-8 md:p-10 rounded-[32px] md:rounded-[40px] shadow-2xl shadow-indigo-600/20 flex flex-col relative overflow-hidden group">
          <div className="absolute top-4 md:top-6 right-4 md:right-6 bg-white/20 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-[0.2em] border border-white/20">
            Most Popular
          </div>
          <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-white/10 blur-3xl rounded-full group-hover:scale-150 transition-transform duration-1000" />
          
          <div className="mb-8 md:mb-10 text-white">
            <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-white/60 mb-4">Professional</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl md:text-5xl font-serif text-white">$29</span>
              <span className="text-white/60 font-light italic">/month</span>
            </div>
          </div>
          <ul className="space-y-4 md:space-y-5 mb-8 md:mb-10 flex-1 text-white">
            <FeatureItem label="Unlimited Blog Posts" isDark />
            <FeatureItem label="Advanced SEO Analysis" isDark />
            <FeatureItem label="Priority AI Generation" isDark />
            <FeatureItem label="24/7 Priority Support" isDark />
            <FeatureItem label="Custom Brand Voice" isDark />
          </ul>
          <button
            onClick={() => handleUpgrade('pro')}
            disabled={loading || userProfile?.subscriptionStatus === 'pro'}
            className={`w-full py-4 md:py-5 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 shadow-2xl ${
              userProfile?.subscriptionStatus === 'pro'
                ? "bg-emerald-400 text-black cursor-default"
                : "bg-white text-black hover:bg-white/90"
            }`}
          >
            {loading ? <Loader2 className="animate-spin" /> : <Zap size={20} className={userProfile?.subscriptionStatus === 'pro' ? 'hidden' : ''} />}
            {userProfile?.subscriptionStatus === 'pro' ? "Active Subscription" : "Upgrade to Pro"}
          </button>
        </div>

        {/* Agency Plan */}
        <div className="glass p-8 md:p-10 rounded-[32px] md:rounded-[40px] shadow-2xl flex flex-col relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full -translate-y-1/2 -translate-x-1/2" />
          <div className="mb-8 md:mb-10">
            <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-white/40 mb-4">Agency</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl md:text-5xl font-serif text-white">$99</span>
              <span className="text-white/20 font-light italic">/month</span>
            </div>
          </div>
          <ul className="space-y-4 md:space-y-5 mb-8 md:mb-10 flex-1">
            <FeatureItem label="Everything in Pro" />
            <FeatureItem label="Multi-User Access" />
            <FeatureItem label="API Access" />
            <FeatureItem label="White-label Reports" />
            <FeatureItem label="Dedicated Account Manager" />
          </ul>
          <button
            onClick={() => handleUpgrade('agency')}
            disabled={loading || userProfile?.subscriptionStatus === 'agency'}
            className={`w-full py-4 md:py-5 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 shadow-2xl ${
              userProfile?.subscriptionStatus === 'agency'
                ? "bg-emerald-400 text-black cursor-default"
                : "bg-indigo-600 text-white hover:bg-indigo-500"
            }`}
          >
            {loading ? <Loader2 className="animate-spin" /> : <CreditCard size={20} className={userProfile?.subscriptionStatus === 'agency' ? 'hidden' : ''} />}
            {userProfile?.subscriptionStatus === 'agency' ? "Active Subscription" : "Upgrade to Agency"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 pt-12 md:pt-16 border-t border-white/5 max-w-4xl mx-auto px-4 md:px-0">
        <TrustItem icon={<ShieldCheck className="text-indigo-400 w-8 h-8" />} label="Secure Payments" />
        <TrustItem icon={<Zap className="text-amber-400 w-8 h-8" />} label="Instant Activation" />
        <TrustItem icon={<Globe className="text-sky-400 w-8 h-8" />} label="Global Access" />
      </div>
    </div>
  );
}

function FeatureItem({ label, isDark }: { label: string; isDark?: boolean }) {
  return (
    <li className={`flex items-center gap-4 text-sm font-medium ${isDark ? 'text-white' : 'text-white/60'}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isDark ? 'bg-white/20' : 'bg-indigo-500/20'}`}>
        <Check className={`${isDark ? 'text-white' : 'text-indigo-400'} w-3.5 h-3.5`} />
      </div>
      {label}
    </li>
  );
}

function TrustItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center text-center gap-4 group">
      <div className="p-4 rounded-2xl glass group-hover:bg-white/5 transition-all duration-500">
        {icon}
      </div>
      <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em]">{label}</span>
    </div>
  );
}
