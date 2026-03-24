import { useEffect, useState } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { Toaster } from "sonner";
import Auth from "./components/Auth";
import Layout from "./components/Layout";
import Dashboard from "./components/Dashboard";
import History from "./components/History";
import Pricing from "./components/Pricing";
import ErrorBoundary from "./components/ErrorBoundary";
import { Loader2 } from "lucide-react";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    // Simple routing
    const handleLocationChange = () => setPath(window.location.pathname);
    window.addEventListener("popstate", handleLocationChange);
    
    // Intercept link clicks for simple routing
    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");
      if (anchor && anchor.href.startsWith(window.location.origin)) {
        e.preventDefault();
        window.history.pushState({}, "", anchor.href);
        handleLocationChange();
      }
    };
    document.addEventListener("click", handleLinkClick);

    return () => {
      unsubscribe();
      window.removeEventListener("popstate", handleLocationChange);
      document.removeEventListener("click", handleLinkClick);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-black w-8 h-8" />
      </div>
    );
  }

  if (!user) {
    return (
      <ErrorBoundary>
        <Auth />
        <Toaster position="top-right" />
      </ErrorBoundary>
    );
  }

  const renderContent = () => {
    switch (path) {
      case "/dashboard":
      case "/":
        return <Dashboard />;
      case "/history":
        return <History />;
      case "/pricing":
        return <Pricing />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <ErrorBoundary>
      <Layout user={user}>
        {renderContent()}
      </Layout>
      <Toaster position="top-right" />
    </ErrorBoundary>
  );
}
