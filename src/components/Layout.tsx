import React, { useState } from "react";
import { auth } from "../firebase";
import { LogOut, LayoutDashboard, History, CreditCard, PenTool, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface LayoutProps {
  children: React.ReactNode;
  user: any;
}

export default function Layout({ children, user }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const handleSignOut = () => auth.signOut();

  const navLinks = [
    { href: "/dashboard", icon: <LayoutDashboard size={20} />, label: "Generator" },
    { href: "/history", icon: <History size={20} />, label: "History" },
    { href: "/pricing", icon: <CreditCard size={20} />, label: "Subscription" },
  ];

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col md:flex-row text-white overflow-hidden">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 bg-[#0A0A0A] border-b border-white/5 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <PenTool className="text-white w-5 h-5" />
          </div>
          <span className="font-serif italic text-xl tracking-tight">BlogCraft</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-white/60 hover:text-white transition-colors"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex w-64 bg-[#0A0A0A] border-r border-white/5 flex-col shrink-0">
        <div className="p-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <PenTool className="text-white w-6 h-6" />
          </div>
          <span className="font-serif italic text-2xl tracking-tight">BlogCraft</span>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          {navLinks.map((link) => (
            <NavLink key={link.href} {...link} />
          ))}
        </nav>

        <div className="p-6 border-t border-white/5 bg-[#080808]">
          <div className="flex items-center gap-3 mb-6 px-2">
            <div className="relative shrink-0">
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

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="fixed inset-0 z-40 md:hidden bg-[#050505] pt-20 px-6 flex flex-col"
          >
            <nav className="space-y-4 mb-12">
              {navLinks.map((link) => (
                <NavLink 
                  key={link.href} 
                  {...link} 
                  onClick={() => setIsMobileMenuOpen(false)} 
                />
              ))}
            </nav>
            <div className="mt-auto pb-12 border-t border-white/5 pt-8">
              <div className="flex items-center gap-4 mb-8">
                <img
                  src={user?.photoURL || "https://picsum.photos/seed/user/40/40"}
                  alt="User"
                  className="w-12 h-12 rounded-full border border-white/10"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <p className="font-medium text-white">{user?.displayName}</p>
                  <p className="text-sm text-white/40">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-3 py-4 bg-white/5 text-white rounded-2xl font-bold"
              >
                <LogOut size={20} />
                Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative h-full">
        {/* Atmospheric background elements */}
        <div className="absolute top-0 right-0 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-indigo-600/10 blur-[80px] md:blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[250px] md:w-[400px] h-[250px] md:h-[400px] bg-purple-600/5 blur-[70px] md:blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />
        
        <div className="max-w-5xl mx-auto p-6 md:p-12 relative z-10">
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

function NavLink({ 
  href, 
  icon, 
  label, 
  onClick 
}: { 
  href: string; 
  icon: React.ReactNode; 
  label: string;
  onClick?: () => void;
}) {
  const isActive = window.location.pathname === href;
  return (
    <a
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 md:py-3.5 rounded-xl text-sm md:text-base font-medium transition-all ${
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
