import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { GraduationCap, LogOut, Menu, X, User as UserIcon, Wrench, GitCompareArrows, Mail, Phone } from "lucide-react";
import { useState } from "react";
import { useGetSiteSettings, useLogout } from "@workspace/api-client-react";
import { useScoreStore } from "@/store/score-store";

export function Layout({
  children,
  noFooter,
}: {
  children: React.ReactNode;
  noFooter?: boolean;
}) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { reset } = useScoreStore();
  const { data: siteSettings } = useGetSiteSettings();
  const projectName = siteSettings?.projectName || "MM Uni Finder";
  const tagline = siteSettings?.tagline || "Guiding Myanmar students to their future.";
  const maintenanceMode = siteSettings?.maintenanceMode === true;
  const maintenanceExempt = ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email"].some((path) => location.startsWith(path));

  const logoutMutation = useLogout({
    mutation: {
      onSuccess: () => {
        useScoreStore.getState().reset();
        logout();
        setLocation("/");
      },
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  if (maintenanceMode && user?.role !== "admin" && !maintenanceExempt) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {siteSettings?.logoUrl ? (
              <img src={siteSettings.logoUrl} alt={`${projectName} logo`} className="h-full w-full rounded-2xl object-contain p-2" />
            ) : (
              <Wrench className="h-7 w-7" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-foreground">{projectName} is under maintenance</h1>
          <p className="mt-3 text-muted-foreground">{siteSettings?.maintenanceMessage || "We are making a few improvements. Please check back soon."}</p>
          <Button asChild variant="outline" className="mt-6">
            <Link href="/login">Admin login</Link>
          </Button>
        </div>
      </div>
    );
  }

  const NavLinks = () => (
    <>
      <Link
        href="/universities"
        className={`text-sm font-medium transition-colors hover:text-primary ${location.startsWith("/universities") ? "text-primary" : "text-muted-foreground"}`}
      >
        Universities
      </Link>
      <Link
        href="/compare"
        className={`flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-primary ${location === "/compare" ? "text-primary" : "text-muted-foreground"}`}
      >
        <GitCompareArrows className="h-3.5 w-3.5" />
        Compare
      </Link>
      <Link
        href="/score"
        className={`text-sm font-medium transition-colors hover:text-primary ${location === "/score" ? "text-primary" : "text-muted-foreground"}`}
      >
        Score Calculator
      </Link>
      <Link
        href="/news"
        className={`text-sm font-medium transition-colors hover:text-primary ${location === "/news" ? "text-primary" : "text-muted-foreground"}`}
      >
        News
      </Link>
      <Link
        href="/admission-guide"
        className={`text-sm font-medium transition-colors hover:text-primary ${location === "/admission-guide" ? "text-primary" : "text-muted-foreground"}`}
      >
        Admission Info
      </Link>
      <Link
        href="/chatbot"
        className={`text-sm font-medium transition-colors hover:text-primary ${location === "/chatbot" ? "text-primary" : "text-muted-foreground"}`}
      >
        Chatbot Advisor
      </Link>
      {user && (
        <Link
          href="/chat"
          className={`text-sm font-medium transition-colors hover:text-primary ${location === "/chat" ? "text-primary" : "text-muted-foreground"}`}
        >
          Peer Chat
        </Link>
      )}
      {user?.role === "admin" && (
        <Link
          href="/admin"
          className={`text-sm font-medium transition-colors hover:text-primary ${location.startsWith("/admin") ? "text-primary" : "text-muted-foreground"}`}
        >
          Admin
        </Link>
      )}
    </>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-6 md:gap-10">
            <Link href="/" className="flex items-center space-x-2">
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-primary p-1.5">
                {siteSettings?.logoUrl ? (
                  <img src={siteSettings.logoUrl} alt="Project logo" className="h-full w-full object-contain" />
                ) : (
                  <GraduationCap className="h-6 w-6 text-primary-foreground" />
                )}
              </div>
              <span className="inline-block max-w-[11rem] truncate font-bold text-base sm:text-xl text-primary">
                {projectName}
              </span>
            </Link>
            <nav className="hidden md:flex gap-6">
              <NavLinks />
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-4">
              {user ? (
                <div className="flex items-center gap-4">
                  <Link
                    href={
                      user?.role === "admin" ? "/admin/profile" : "/profile"
                    }
                  >
                    <button className="touch-target flex items-center gap-2 rounded-full px-2 sm:px-3 py-2 hover:bg-muted transition">
                      <img
                        src={user.avatarUrl || "/default-avatar.png"}
                        alt="profile"
                        className="w-9 h-9 rounded-full object-cover border"
                      />
                      <span className="hidden md:block font-medium">
                        {user.name}
                      </span>
                    </button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    disabled={logoutMutation.isPending}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Button variant="ghost" asChild>
                    <Link href="/login">Log in</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/register">Sign up</Link>
                  </Button>
                </>
              )}
            </div>
            <Button
              variant="ghost"
              className="touch-target md:hidden px-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden max-h-[calc(100svh-4rem)] overflow-y-auto border-b border-border bg-background p-4 safe-area-pb flex flex-col gap-4">
            <nav className="flex flex-col gap-1" onClick={() => setMobileMenuOpen(false)}>
              <NavLinks />
            </nav>
            <div className="pt-4 border-t flex flex-col gap-3">
              {user ? (
                <>
                  <Link
                    href={user.role === "admin" ? "/admin/profile" : "/profile"}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted transition"
                  >
                    <img
                      src={user.avatarUrl || "/default-avatar.png"}
                      alt="profile"
                      className="w-10 h-10 rounded-full object-cover border"
                    />

                    <div>
                      <p className="font-medium text-foreground">{user.name}</p>

                      {user.role === "admin" && (
                        <p className="text-xs text-primary">Admin Profile</p>
                      )}
                    </div>
                  </Link>

                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="w-full"
                    asChild
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Link href="/login">Log in</Link>
                  </Button>
                  <Button
                    className="w-full"
                    asChild
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Link href="/register">Sign up</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col">{children}</main>

      {!noFooter && (
        <footer className="border-t bg-muted/40 py-5 md:py-8 mt-auto">
          <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4 px-4 sm:px-6 text-center md:text-left text-sm text-muted-foreground">
            <div>
                              <p className="font-medium text-foreground flex items-center justify-center md:justify-start gap-2">
                {siteSettings?.logoUrl ? (
                  <img src={siteSettings.logoUrl} alt="Project logo" className="h-4 w-4 rounded object-contain" />
                ) : (
                  <GraduationCap className="h-4 w-4" />
                )}
                {projectName}
              </p>
                            <p className="mt-1">
                {tagline}
              </p>
              {(siteSettings?.contactEmail || siteSettings?.contactPhone) && (
                <div className="mt-2 flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1 text-sm">
                  {siteSettings.contactEmail && (
                    <a
                      href={`mailto:${siteSettings.contactEmail}`}
                      className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      {siteSettings.contactEmail}
                    </a>
                  )}
                  {siteSettings.contactPhone && (
                    <a
                      href={`tel:${siteSettings.contactPhone}`}
                      className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {siteSettings.contactPhone}
                    </a>
                  )}
                </div>
              )}
            </div>
            <div className="flex max-w-full flex-wrap justify-center gap-x-4 gap-y-2">
              <Link
                href="/universities"
                className="hover:text-foreground transition-colors"
              >
                Universities
              </Link>
              <Link
                href="/compare"
                className="hover:text-foreground transition-colors"
              >
                Compare
              </Link>
              <Link
                href="/score"
                className="hover:text-foreground transition-colors"
              >
                Calculator
              </Link>
              <Link
                href="/news"
                className="hover:text-foreground transition-colors"
              >
                News
              </Link>
              <Link
                href="/chatbot"
                className="hover:text-foreground transition-colors"
              >
                Chatbot Advisor
              </Link>
              <Link
                href="/admission-guide"
                className="hover:text-foreground transition-colors"
              >
                Admission Info
              </Link>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
