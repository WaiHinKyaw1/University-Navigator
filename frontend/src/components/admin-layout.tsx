import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/layout";
import { useEffect } from "react";
import { GraduationCap, Users, Building2, BookOpen, FileText, Activity, MessageSquare, FileUp, ArrowBigLeft, Tag } from "lucide-react";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "admin")) {
      setLocation("/");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading || !user || user.role !== "admin") {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }

  const NavItem = ({ href, icon: Icon, label }: { href: string, icon: any, label: string }) => {
    const isActive = location === href || (href !== "/admin" && location.startsWith(href));
    return (
      <Link href={href} className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
        }`}>
        <Icon className="h-5 w-5" />
        <span>{label}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center space-x-2">
            <div className="bg-primary p-1.5 rounded-md">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg hidden sm:inline-block">Admin Portal</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">{user.name}</span>
            <Link href="/" className="text-sm text-black font-bold">Back to App</Link>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-64 border-r bg-card hidden md:block overflow-y-auto">
          <div className="p-4 space-y-1">
            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Overview</div>
            <NavItem href="/admin" icon={Activity} label="Dashboard" />

            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-6 mb-2">Management</div>
            <NavItem href="/admin/users" icon={Users} label="Users" />
            <NavItem href="/admin/universities" icon={Building2} label="Universities" />
            <NavItem href="/admin/majors" icon={BookOpen} label="Majors" />
            <NavItem href="/admin/categories" icon={Tag} label="Categories" />
            <NavItem href="/admin/news" icon={FileText} label="News" />
            <NavItem href="/admin/admission-guide" icon={FileUp} label="Admission PDF" />

            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-6 mb-2">Monitoring</div>
            <NavItem href="/admin/chat-monitor" icon={MessageSquare} label="Chat Monitor" />
            <NavItem href="/admin/audit" icon={Activity} label="Audit Logs" />
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto bg-muted/10 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}