import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/layout";
import { useEffect, useState } from "react";
import {
  GraduationCap,
  Users,
  Building2,
  BookOpen,
  FileText,
  Activity,
  MessageSquare,
  FileUp,
  ArrowBigLeft,
  Tag,
  UserCog,
  Menu,
  X,
} from "lucide-react";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "admin")) {
      setLocation("/");
    }
  }, [user, isLoading, setLocation]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  if (isLoading || !user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        Loading...
      </div>
    );
  }

  const NavItem = ({
    href,
    icon: Icon,
    label,
    collapsed = false,
  }: {
    href: string;
    icon: any;
    label: string;
    collapsed?: boolean;
  }) => {
    const isActive =
      location === href || (href !== "/admin" && location.startsWith(href));
    return (
      <Link
        href={href}
        className={`flex items-center ${collapsed ? "justify-center px-0" : "gap-3 px-3"} py-2 rounded-md transition-colors ${isActive
          ? "bg-primary/10 text-primary font-medium"
          : "hover:bg-muted text-muted-foreground hover:text-foreground"
          }`}
        title={collapsed ? label : undefined}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {!collapsed && <span className="truncate">{label}</span>}
      </Link>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-md hover:bg-muted text-muted-foreground transition shrink-0"
              title="Toggle Mobile Menu"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden md:flex p-1.5 rounded-md hover:bg-muted text-muted-foreground transition shrink-0"
              title="Toggle Sidebar"
            >
              <Menu className="h-6 w-6" />
            </button>
            <Link href="/" className="flex items-center space-x-2">
              <div className="bg-primary p-1.5 rounded-md">
                <GraduationCap className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg hidden sm:inline-block">
                Admin Portal
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">{user.name}</span>
            <Link href="/" className="text-sm text-black font-bold">
              Back to App
            </Link>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="md:hidden border-b bg-card px-6 py-4 space-y-1 max-h-[calc(100vh-4rem)] overflow-y-auto shadow-sm">
          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Overview
          </div>
          <NavItem href="/admin" icon={Activity} label="Dashboard" />

          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-6 mb-2">
            Management
          </div>
          <NavItem href="/admin/users" icon={Users} label="Users" />
          <NavItem
            href="/admin/universities"
            icon={Building2}
            label="Universities"
          />
          <NavItem href="/admin/majors" icon={BookOpen} label="Majors" />
          <NavItem href="/admin/categories" icon={Tag} label="Categories" />
          <NavItem href="/admin/news" icon={FileText} label="News" />
          <NavItem
            href="/admin/admission-guide"
            icon={FileUp}
            label="Admission PDF"
          />

          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-6 mb-2">
            Monitoring
          </div>
          <NavItem
            href="/admin/chat-monitor"
            icon={MessageSquare}
            label="Chat Monitor"
          />
          <NavItem href="/admin/audit" icon={Activity} label="Audit Logs" />
          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-6 mb-2">
            Profile
          </div>
          <NavItem
            href="/admin/profile"
            icon={UserCog}
            label="Admin Profile"
          />
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <aside className={`${sidebarOpen ? "w-64" : "w-[72px]"} transition-all duration-300 border-r bg-card hidden md:block overflow-y-auto shrink-0`}>
          <div className="p-4 space-y-2">
            {!sidebarOpen ? (
              <div className="h-4" />
            ) : (
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Overview
              </div>
            )}
            <NavItem href="/admin" icon={Activity} label="Dashboard" collapsed={!sidebarOpen} />

            {!sidebarOpen ? (
              <div className="my-4 border-b border-border/50" />
            ) : (
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-6 mb-2">
                Management
              </div>
            )}
            <NavItem href="/admin/users" icon={Users} label="Users" collapsed={!sidebarOpen} />
            <NavItem href="/admin/universities" icon={Building2} label="Universities" collapsed={!sidebarOpen} />
            <NavItem href="/admin/majors" icon={BookOpen} label="Majors" collapsed={!sidebarOpen} />
            <NavItem href="/admin/categories" icon={Tag} label="Categories" collapsed={!sidebarOpen} />
            <NavItem href="/admin/news" icon={FileText} label="News" collapsed={!sidebarOpen} />
            <NavItem href="/admin/admission-guide" icon={FileUp} label="Admission PDF" collapsed={!sidebarOpen} />

            {!sidebarOpen ? (
              <div className="my-4 border-b border-border/50" />
            ) : (
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-6 mb-2">
                Monitoring
              </div>
            )}
            <NavItem href="/admin/chat-monitor" icon={MessageSquare} label="Chat Monitor" collapsed={!sidebarOpen} />
            <NavItem href="/admin/audit" icon={Activity} label="Audit Logs" collapsed={!sidebarOpen} />

            {!sidebarOpen ? (
              <div className="my-4 border-b border-border/50" />
            ) : (
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-6 mb-2">
                Profile
              </div>
            )}
            <NavItem href="/admin/profile" icon={UserCog} label="Admin Profile" collapsed={!sidebarOpen} />
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto bg-muted/10 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
