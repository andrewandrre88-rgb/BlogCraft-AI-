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
    <div className="min-h-screen bg-[#F8F9FA] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 flex items-center gap-2">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
            <PenTool className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight">BlogCraft</span>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          <NavLink href="/dashboard" icon={<LayoutDashboard size={20} />} label="Generator" />
          <NavLink href="/history" icon={<History size={20} />} label="History" />
          <NavLink href="/pricing" icon={<CreditCard size={20} />} label="Subscription" />
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-4 px-2">
            <img
              src={user?.photoURL || "https://picsum.photos/seed/user/40/40"}
              alt="User"
              className="w-8 h-8 rounded-full"
              referrerPolicy="no-referrer"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.displayName}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
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
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
        isActive
          ? "bg-black text-white shadow-sm"
          : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      {icon}
      {label}
    </a>
  );
}
