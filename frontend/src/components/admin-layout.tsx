import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
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
  Tag,
  UserCog,
  Settings,
  Menu,
  Heart,
  X,
} from "lucide-react";

/**
 * Admin portal shell.
 *
 * Layout model (v2 — truly independent scroll regions):
 * - The outer container is a fixed-height (100dvh) column: sticky header (4rem)
 *   on top and a flex row below that fills the remaining space.
 * - The sidebar lives in its own fixed-height column and scrolls by itself.
 * - The main content area is a separate scroll region. The page body never
 *   scrolls, so the sidebar and content can never "follow" each other.
 */
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
        className={`flex items-center ${collapsed ? "justify-center px-0" : "gap-3 px-3"} py-2 rounded-md transition-colors ${
          isActive
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

  const NavSections = ({ collapsed = false }: { collapsed?: boolean }) => (
    <>
      {!collapsed ? (
        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Overview
        </div>
      ) : (
        <div className="h-4" />
      )}
      <NavItem href="/admin" icon={Activity} label="Dashboard" collapsed={collapsed} />

      {!collapsed ? (
        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-6 mb-2">
          Management
        </div>
      ) : (
        <div className="my-4 border-b border-border/50" />
      )}
      <NavItem href="/admin/users" icon={Users} label="Users" collapsed={collapsed} />
      <NavItem href="/admin/universities" icon={Building2} label="Universities" collapsed={collapsed} />
      <NavItem href="/admin/majors" icon={BookOpen} label="Majors" collapsed={collapsed} />
      <NavItem href="/admin/categories" icon={Tag} label="Categories" collapsed={collapsed} />
      <NavItem href="/admin/interest-guide" icon={Heart} label="Interest Guide" collapsed={collapsed} />
      <NavItem href="/admin/news" icon={FileText} label="News" collapsed={collapsed} />
      <NavItem href="/admin/admission-guide" icon={FileUp} label="Admission PDF" collapsed={collapsed} />

      {!collapsed ? (
        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-6 mb-2">
          Monitoring
        </div>
      ) : (
        <div className="my-4 border-b border-border/50" />
      )}
      <NavItem href="/admin/chat-monitor" icon={MessageSquare} label="Chat Monitor" collapsed={collapsed} />
      <NavItem href="/admin/audit" icon={Activity} label="Audit Logs" collapsed={collapsed} />

      {!collapsed ? (
        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-6 mb-2">
          Profile
        </div>
      ) : (
        <div className="my-4 border-b border-border/50" />
      )}
      <NavItem href="/admin/settings" icon={Settings} label="Settings" collapsed={collapsed} />
      <NavItem href="/admin/profile" icon={UserCog} label="Admin Profile" collapsed={collapsed} />
    </>
  );

  return (
    // Outer shell: fixed viewport height, column direction, NO page-level scroll.
    <div className="fixed inset-0 flex flex-col bg-background overflow-hidden">
      <header className="shrink-0 h-16 border-b bg-card flex items-center px-6 z-40">
        <div className="flex h-full items-center justify-between w-full gap-3">
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
            <Link href="/" className="text-sm font-bold text-foreground">
              Back to App
            </Link>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="md:hidden shrink-0 border-b bg-card px-6 py-4 space-y-1 overflow-y-auto">
          <NavSections />
        </div>
      )}

      {/* Body row: sidebar column + independently scrollable content column */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        <aside
          className={`${sidebarOpen ? "w-64" : "w-[72px]"} shrink-0 border-r bg-card hidden md:flex flex-col overflow-y-auto transition-[width] duration-300`}
        >
          <div className="p-4 space-y-2">
            <NavSections collapsed={!sidebarOpen} />
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto bg-muted/10 p-4 md:p-6 lg:p-8 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
