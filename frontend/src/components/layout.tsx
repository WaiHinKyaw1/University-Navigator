import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  GraduationCap,
  GitCompareArrows,
  LogOut,
  Mail,
  Menu,
  Phone,
  ChevronDown,
  Wrench,
  X,
  Newspaper,
  Bot,
  MessageCircle,
  UserIcon,
  Sparkles,
} from "lucide-react";
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

  const { data: siteSettings } = useGetSiteSettings();

  const projectName = siteSettings?.projectName || "MM Uni Finder";

  const tagline =
    siteSettings?.tagline || "Guiding Myanmar students to their future.";

  const maintenanceMode = siteSettings?.maintenanceMode === true;

  const maintenanceExempt = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
  ].some((path) => location.startsWith(path));

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

  // ============================================================
  // MAINTENANCE MODE
  // ============================================================

  if (maintenanceMode && user?.role !== "admin" && !maintenanceExempt) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {siteSettings?.logoUrl ? (
              <img
                src={siteSettings.logoUrl}
                alt={`${projectName} logo`}
                className="h-full w-full rounded-2xl object-contain p-2"
              />
            ) : (
              <Wrench className="h-7 w-7" />
            )}
          </div>

          <h1 className="text-2xl font-bold text-foreground">
            {projectName} is under maintenance
          </h1>

          <p className="mt-3 text-muted-foreground">
            {siteSettings?.maintenanceMessage ||
              "We are making a few improvements. Please check back soon."}
          </p>

          <Button asChild variant="outline" className="mt-6">
            <Link href="/login">Admin login</Link>
          </Button>
        </div>
      </div>
    );
  }

  // ============================================================
  // NAV ITEM STYLE
  // ============================================================

  const navItemClass = (isActive: boolean) =>
    `group relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium
     border transition-all duration-200 ease-out
     ${
       isActive
         ? "border-primary/20 bg-primary/10 text-primary shadow-sm shadow-primary/10"
         : "border-transparent text-muted-foreground hover:border-primary/10 hover:bg-primary/5 hover:text-primary hover:-translate-y-0.5"
     }`;

  // ============================================================
  // ACTIVE ROUTES
  // ============================================================

  const isNewsActive = location === "/news" || location.startsWith("/news/");

  const isAdmissionActive =
    location === "/admission-guide" || location.startsWith("/admission-guide/");

  const isChatbotActive =
    location === "/chatbot" || location.startsWith("/chatbot/");

  /*
   * IMPORTANT:
   *
   * Do NOT use:
   *
   * location.startsWith("/chat")
   *
   * because "/chatbot" also starts with "/chat".
   *
   * Instead use exact /chat or /chat/...
   */
  const isPeerChatActive =
    location === "/chat" || location.startsWith("/chat/");

  // More button should be active only when
  // the current page belongs to one of the More items.
  const isMoreActive = isAdmissionActive || isChatbotActive || isPeerChatActive;

  // ============================================================
  // DESKTOP MAIN NAVIGATION
  //
  // Universities
  // Compare
  // Score Calculator
  // Interest Guide
  // News
  // More
  // ============================================================

  const MainNavLinks = () => (
    <>
      {/* Universities */}
      <Link
        href="/universities"
        className={navItemClass(location.startsWith("/universities"))}
      >
        Universities
      </Link>

      {/* Compare */}
      <Link href="/compare" className={navItemClass(location === "/compare")}>
        <GitCompareArrows className="h-3.5 w-3.5" />
        Compare
      </Link>

      {/* Score Calculator */}
      <Link href="/score" className={navItemClass(location === "/score")}>
        Score Calculator
      </Link>

      {/* Interest Guide */}
      <Link
        href="/interest-guide"
        className={navItemClass(location === "/interest-guide")}
      >
        Interest Guide
      </Link>

      {/* News */}
      <Link href="/news" className={navItemClass(isNewsActive)}>
        <Newspaper className="h-3.5 w-3.5" />
        News
      </Link>
    </>
  );

  // ============================================================
  // MORE MENU
  //
  // Admission Info
  // Chatbot Advisor
  // Peer Chat
  // ============================================================

  const MoreMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`${navItemClass(isMoreActive)} outline-none`}
      >
        <span>More</span>

        <ChevronDown
          className="
            h-3.5 w-3.5
            transition-transform duration-200
            group-data-[state=open]:rotate-180
          "
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className="
          w-56
          rounded-xl
          border border-border/60
          bg-background/95
          p-1.5
          shadow-lg
          backdrop-blur-md
        "
      >
        {/* ====================================================
            ADMISSION INFO
        ===================================================== */}

        <DropdownMenuItem asChild className="cursor-pointer rounded-lg">
          <Link
            href="/admission-guide"
            className={`flex w-full items-center gap-3 px-3 py-2.5 ${
              isAdmissionActive ? "bg-primary/10 text-primary" : ""
            }`}
          >
            <GraduationCap className="h-4 w-4" />

            <div className="flex flex-col">
              <span className="font-medium">Admission Info</span>

              <span className="text-xs text-muted-foreground">
                University admission information
              </span>
            </div>
          </Link>
        </DropdownMenuItem>

        {/* ====================================================
            CHATBOT ADVISOR
        ===================================================== */}

        <DropdownMenuItem asChild className="cursor-pointer rounded-lg">
          <Link
            href="/chatbot"
            className={`flex w-full items-center gap-3 px-3 py-2.5 ${
              isChatbotActive ? "bg-primary/10 text-primary" : ""
            }`}
          >
            <Bot className="h-4 w-4" />

            <div className="flex flex-col">
              <span className="font-medium">Chatbot Advisor</span>

              <span className="text-xs text-muted-foreground">
                Ask about universities
              </span>
            </div>
          </Link>
        </DropdownMenuItem>

        {/* ====================================================
            PEER CHAT
        ===================================================== */}

        {user && (
          <DropdownMenuItem asChild className="cursor-pointer rounded-lg">
            <Link
              href="/chat"
              className={`flex w-full items-center gap-3 px-3 py-2.5 ${
                isPeerChatActive ? "bg-primary/10 text-primary" : ""
              }`}
            >
              <MessageCircle className="h-4 w-4" />

              <div className="flex flex-col">
                <span className="font-medium">Peer Chat</span>

                <span className="text-xs text-muted-foreground">
                  Chat with other students
                </span>
              </div>
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator className="my-1" />

        <div className="px-3 py-1.5 text-xs text-muted-foreground">
          Explore more features
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // ============================================================
  // MOBILE NAVIGATION
  //
  // Main:
  // Universities
  // Compare
  // Score Calculator
  // Interest Guide
  // News
  //
  // More:
  // Admission Info
  // Chatbot Advisor
  // Peer Chat
  // ============================================================

  const MobileNavLinks = () => (
    <div className="flex flex-col gap-1">
      {/* Universities */}
      <Link
        href="/universities"
        className={navItemClass(location.startsWith("/universities"))}
      >
        Universities
      </Link>

      {/* Compare */}
      <Link href="/compare" className={navItemClass(location === "/compare")}>
        <GitCompareArrows className="h-4 w-4" />
        Compare
      </Link>

      {/* Score Calculator */}
      <Link href="/score" className={navItemClass(location === "/score")}>
        Score Calculator
      </Link>

      {/* Interest Guide */}
      <Link
        href="/interest-guide"
        className={navItemClass(location === "/interest-guide")}
      >
        Interest Guide
      </Link>

      {/* News */}
      <Link href="/news" className={navItemClass(isNewsActive)}>
        <Newspaper className="h-4 w-4" />
        News
      </Link>

      <div className="my-2 border-t border-border/60" />

      {/* More */}
      <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        More
      </div>

      {/* Admission Info */}
      <Link href="/admission-guide" className={navItemClass(isAdmissionActive)}>
        <GraduationCap className="h-4 w-4" />
        Admission Info
      </Link>

      {/* Chatbot Advisor */}
      <Link href="/chatbot" className={navItemClass(isChatbotActive)}>
        <Bot className="h-4 w-4" />
        Chatbot Advisor
      </Link>

      {/* Peer Chat */}
      {user && (
        <Link href="/chat" className={navItemClass(isPeerChatActive)}>
          <MessageCircle className="h-4 w-4" />
          Peer Chat
        </Link>
      )}
    </div>
  );

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ========================================================
          HEADER
      ========================================================= */}

      <header
        className="
          sticky top-0 z-50 w-full
          border-b border-border/40
          bg-background/85
          backdrop-blur-xl
          supports-[backdrop-filter]:bg-background/60
        "
      >
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          {/* ====================================================
              LOGO
          ===================================================== */}

          <div className="flex min-w-0 items-center gap-4 md:gap-8">
            <Link href="/" className="flex shrink-0 items-center space-x-2">
              <div
                className="
                  flex h-9 w-9 items-center justify-center
                  overflow-hidden rounded-xl
                  bg-primary
                  shadow-sm
                "
              >
                {siteSettings?.logoUrl ? (
                  <img
                    src={siteSettings.logoUrl}
                    alt={`${projectName} logo`}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <GraduationCap className="h-6 w-6 text-primary-foreground" />
                )}
              </div>

              <span
                className="
                  inline-block max-w-[10rem]
                  truncate font-bold text-base
                  text-primary
                  sm:max-w-[14rem] sm:text-xl
                "
              >
                {projectName}
              </span>
            </Link>

            {/* ==================================================
                DESKTOP NAVIGATION
            =================================================== */}

            <nav className="hidden items-center gap-1 md:flex">
              <MainNavLinks />
              <MoreMenu />
            </nav>
          </div>

          {/* ====================================================
              RIGHT SIDE
          ===================================================== */}

          <div className="flex shrink-0 items-center gap-2 md:gap-3">
            {/* Desktop User Menu */}
            <div className="hidden items-center md:flex">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="
                        flex items-center gap-2
                        rounded-full
                        border border-transparent
                        px-2 py-1.5
                        outline-none
                        transition-all duration-200
                        hover:border-primary/20
                        hover:bg-primary/5
                        focus:ring-2
                        focus:ring-primary/20
                      "
                    >
                      <img
                        src={user.avatarUrl || "/default-avatar.png"}
                        alt="profile"
                        className="h-8 w-8 rounded-full border object-cover"
                      />

                      <span className="hidden max-w-[8rem] truncate text-sm font-medium lg:block">
                        {user.name}
                      </span>

                      <svg
                        className="hidden h-4 w-4 text-muted-foreground lg:block"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.51a.75.75 0 01-1.08 0l-4.25-4.51a.75.75 0 01.02-1.06z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    align="end"
                    className="w-56 rounded-xl p-2"
                  >
                    {/* User information */}
                    <div className="flex items-center gap-3 px-3 py-3">
                      <img
                        src={user.avatarUrl || "/default-avatar.png"}
                        alt="profile"
                        className="h-10 w-10 rounded-full border object-cover"
                      />

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {user.name}
                        </p>

                        <p className="truncate text-xs text-muted-foreground">
                          {user.role === "admin" ? "Administrator" : "Student"}
                        </p>
                      </div>
                    </div>

                    <DropdownMenuSeparator />

                    {/* Profile */}
                    <DropdownMenuItem asChild>
                      <Link
                        href={
                          user.role === "admin" ? "/admin/profile" : "/profile"
                        }
                        className="cursor-pointer"
                      >
                        <UserIcon className="mr-2 h-4 w-4" />
                        My Profile
                      </Link>
                    </DropdownMenuItem>

                    {/* Admin */}
                    {user.role === "admin" && (
                      <DropdownMenuItem asChild>
                        <Link href="/admin" className="cursor-pointer">
                          <Sparkles className="mr-2 h-4 w-4" />
                          Admin Portal
                        </Link>
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator />

                    {/* Logout */}
                    <DropdownMenuItem
                      onClick={handleLogout}
                      disabled={logoutMutation.isPending}
                      className="
                        cursor-pointer
                        text-destructive
                        focus:text-destructive
                      "
                    >
                      <LogOut className="mr-2 h-4 w-4" />

                      {logoutMutation.isPending ? "Logging out..." : "Log out"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" asChild size="sm">
                    <Link href="/login">Log in</Link>
                  </Button>

                  <Button asChild size="sm">
                    <Link href="/register">Sign up</Link>
                  </Button>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              className="h-9 w-9 px-0 md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>

        {/* ======================================================
            MOBILE MENU
        ======================================================= */}

        {mobileMenuOpen && (
          <div
            className="
              md:hidden
              max-h-[calc(100svh-4rem)]
              overflow-y-auto
              border-t border-border/40
              bg-background/95
              p-4
              shadow-lg
              backdrop-blur-xl
            "
          >
            <nav onClick={() => setMobileMenuOpen(false)}>
              <MobileNavLinks />
            </nav>

            {/* Mobile User Section */}
            <div className="mt-4 border-t border-border/60 pt-4">
              {user ? (
                <div className="flex flex-col gap-3">
                  {/* User */}
                  <Link
                    href={user.role === "admin" ? "/admin/profile" : "/profile"}
                    onClick={() => setMobileMenuOpen(false)}
                    className="
                      flex items-center gap-3
                      rounded-xl border border-transparent
                      px-3 py-2.5
                      transition
                      hover:border-primary/10
                      hover:bg-primary/5
                    "
                  >
                    <img
                      src={user.avatarUrl || "/default-avatar.png"}
                      alt="profile"
                      className="h-10 w-10 rounded-full border object-cover"
                    />

                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {user.name}
                      </p>

                      {user.role === "admin" && (
                        <p className="text-xs text-primary">Admin Profile</p>
                      )}
                    </div>
                  </Link>

                  {/* Admin */}
                  {user.role === "admin" && (
                    <Button
                      className="w-full justify-start"
                      onClick={() => setMobileMenuOpen(false)}
                      asChild
                    >
                      <Link href="/admin">Admin Portal</Link>
                    </Button>
                  )}

                  {/* Logout */}
                  <Button
                    variant="outline"
                    className="
                      w-full justify-start
                      hover:border-destructive/30
                      hover:bg-destructive/5
                      hover:text-destructive
                    "
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
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
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ========================================================
          MAIN
      ========================================================= */}

      <main className="flex-1 flex flex-col">{children}</main>

      {/* ========================================================
          FOOTER
      ========================================================= */}

      {!noFooter && (
        <footer className="mt-auto border-t bg-muted/40 py-5 md:py-8">
          <div
            className="
              container mx-auto
              flex flex-col items-center
              justify-between gap-5
              px-4 text-center
              text-sm text-muted-foreground
              md:flex-row md:px-6
              md:text-left
            "
          >
            {/* Footer Brand */}
            <div>
              <p
                className="
                  flex items-center justify-center gap-2
                  font-medium text-foreground
                  md:justify-start
                "
              >
                {siteSettings?.logoUrl ? (
                  <img
                    src={siteSettings.logoUrl}
                    alt={`${projectName} logo`}
                    className="h-5 w-5 rounded object-contain"
                  />
                ) : (
                  <GraduationCap className="h-4 w-4" />
                )}

                {projectName}
              </p>

              <p className="mt-1">{tagline}</p>

              {/* Contact */}
              {(siteSettings?.contactEmail || siteSettings?.contactPhone) && (
                <div
                  className="
                    mt-2 flex flex-wrap
                    items-center justify-center
                    gap-x-4 gap-y-1
                    md:justify-start
                  "
                >
                  {siteSettings.contactEmail && (
                    <a
                      href={`mailto:${siteSettings.contactEmail}`}
                      className="
                        inline-flex items-center gap-1.5
                        text-muted-foreground
                        transition-colors
                        hover:text-foreground
                      "
                    >
                      <Mail className="h-3.5 w-3.5" />
                      {siteSettings.contactEmail}
                    </a>
                  )}

                  {siteSettings.contactPhone && (
                    <a
                      href={`tel:${siteSettings.contactPhone}`}
                      className="
                        inline-flex items-center gap-1.5
                        text-muted-foreground
                        transition-colors
                        hover:text-foreground
                      "
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {siteSettings.contactPhone}
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Footer Links */}
            <div
              className="
                flex max-w-full flex-wrap
                justify-center
                gap-x-4 gap-y-2
              "
            >
              <Link
                href="/universities"
                className="transition-colors hover:text-foreground"
              >
                Universities
              </Link>

              <Link
                href="/compare"
                className="transition-colors hover:text-foreground"
              >
                Compare
              </Link>

              <Link
                href="/score"
                className="transition-colors hover:text-foreground"
              >
                Calculator
              </Link>

              <Link
                href="/news"
                className="transition-colors hover:text-foreground"
              >
                News
              </Link>

              <Link
                href="/admission-guide"
                className="transition-colors hover:text-foreground"
              >
                Admission Info
              </Link>

              <Link
                href="/chatbot"
                className="transition-colors hover:text-foreground"
              >
                Chatbot Advisor
              </Link>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
