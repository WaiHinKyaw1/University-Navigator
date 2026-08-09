import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { GraduationCap, LogOut, Menu, X, User as UserIcon } from "lucide-react";
import { useState } from "react";
import { useLogout } from "@workspace/api-client-react";
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

  const NavLinks = () => (
    <>
      <Link
        href="/universities"
        className={`text-sm font-medium transition-colors hover:text-primary ${location.startsWith("/universities") ? "text-primary" : "text-muted-foreground"}`}
      >
        Universities
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
        <div className="container flex h-16 items-center justify-between mx-auto">
          <div className="flex items-center gap-6 md:gap-10">
            <Link href="/" className="flex items-center space-x-2">
              <div className="bg-primary p-1.5 rounded-lg">
                <GraduationCap className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="inline-block font-bold text-xl text-primary">
                MM Uni Finder
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
                    <button className="flex items-center gap-2 rounded-full px-3 py-2 hover:bg-muted transition">
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
              className="md:hidden px-2"
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
          <div className="md:hidden border-b border-border bg-background p-4 flex flex-col gap-4">
            <nav className="flex flex-col gap-4">
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
          <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground flex items-center justify-center md:justify-start gap-2">
                <GraduationCap className="h-4 w-4" /> MM Uni Finder
              </p>
              <p className="mt-1">
                Guiding Myanmar's Grade 12 students to their future.
              </p>
            </div>
            <div className="flex gap-4">
              <Link
                href="/universities"
                className="hover:text-foreground transition-colors"
              >
                Universities
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
