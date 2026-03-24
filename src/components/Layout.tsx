import React from "react";
import { auth } from "../firebase";
import { LogOut, LayoutDashboard, History, CreditCard, PenTool } from "lucide-react";
import { motion } from "motion/react";

interface LayoutProps {
  children: React.ReactNode;
  user: any;
}

export default function Layout({ children, user }: LayoutProps) {
  const handleSignOut = () => auth.signOut();

  return (
    <div className="min-h-screen bg-[#050505] flex text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0A0A0A] border-r border-white/5 flex flex-col">
        <div className="p-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <PenTool className="text-white w-6 h-6" />
          </div>
          <span className="font-serif italic text-2xl tracking-tight">BlogCraft</span>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          <NavLink href="/dashboard" icon={<LayoutDashboard size={20} />} label="Generator" />
          <NavLink href="/history" icon={<History size={20} />} label="History" />
          <NavLink href="/pricing" icon={<CreditCard size={20} />} label="Subscription" />
        </nav>

        <div className="p-6 border-t border-white/5 bg-[#080808]">
          <div className="flex items-center gap-3 mb-6 px-2">
            <div className="relative">
              <img
                src={user?.photoURL || "https://picsum.photos/seed/user/40/40"}
                alt="User"
                className="w-10 h-10 rounded-full border border-white/10"
                referrerPolicy="no-referrer"
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-[#080808] rounded-full" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.displayName}</p>
              <p className="text-xs text-white/40 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-all"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative">
        {/* Atmospheric background elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-600/5 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />
        
        <div className="max-w-5xl mx-auto p-12 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}

function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  const isActive = window.location.pathname === href;
  return (
    <a
      href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
        isActive
          ? "bg-white/10 text-white shadow-xl shadow-black/20 border border-white/10"
          : "text-white/50 hover:text-white hover:bg-white/5"
      }`}
    >
      {icon}
      {label}
    </a>
  );
}
