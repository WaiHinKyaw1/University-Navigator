import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { CompareProvider } from "@/hooks/use-compare";
import NotFound from "@/pages/not-found";

const Home = lazy(() => import("@/pages/home"));
const Login = lazy(() => import("@/pages/login"));
const Register = lazy(() => import("@/pages/register"));
const Universities = lazy(() => import("@/pages/universities"));
const Favorites = lazy(() => import("@/pages/favorites"));
const Compare = lazy(() => import("@/pages/compare"));
const UniversityDetail = lazy(() => import("@/pages/university-detail"));
const ScoreCalculator = lazy(() => import("@/pages/score-calculator"));
const Chatbot = lazy(() => import("@/pages/chatbot"));
const Chat = lazy(() => import("@/pages/chat"));
const News = lazy(() => import("@/pages/news"));
const AdmissionGuide = lazy(() => import("@/pages/admission-guide"));

const AdminDashboard = lazy(() => import("@/pages/admin/dashboard"));
const AdminUsers = lazy(() => import("@/pages/admin/users"));
const AdminUniversities = lazy(() => import("@/pages/admin/universities"));
const AdminMajors = lazy(() => import("@/pages/admin/majors"));
const AdminCategories = lazy(() => import("@/pages/admin/categories"));
const AdminNews = lazy(() => import("@/pages/admin/news"));
const AdminAdmissionGuide = lazy(() => import("@/pages/admin/admission-guide"));
const AdminAudit = lazy(() => import("@/pages/admin/audit"));
const AdminChatMonitor = lazy(() => import("@/pages/admin/chat-monitor"));
const Profile = lazy(() => import("@/pages/profile"));
const AdminProfile = lazy(() => import("@/pages/admin/admin-profile"));
const AdminSettings = lazy(() => import("@/pages/admin/settings"));
const VerifyEmail = lazy(() => import("@/pages/verify-email"));
const ResetPassword = lazy(() => import("./pages/reset-password"));
const ForgotPassword = lazy(() => import("./pages/forgot-password"));
const InterestGuide = lazy(() => import("@/pages/interest-guide"));
const AdminInterestGuide = lazy(() => import("@/pages/admin/interest-guide"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/universities" component={Universities} />
      <Route path="/favorites" component={Favorites} />
      <Route path="/compare" component={Compare} />
      <Route path="/universities/:id" component={UniversityDetail} />
      <Route path="/score" component={ScoreCalculator} />
      <Route path="/news" component={News} />
      <Route path="/admission-guide" component={AdmissionGuide} />
      <Route path="/chatbot" component={Chatbot} />
      <Route path="/chat" component={Chat} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/universities" component={AdminUniversities} />
      <Route path="/admin/majors" component={AdminMajors} />
      <Route path="/admin/categories" component={AdminCategories} />
      <Route path="/admin/news" component={AdminNews} />
      <Route path="/admin/admission-guide" component={AdminAdmissionGuide} />
      <Route path="/admin/audit" component={AdminAudit} />
      <Route path="/admin/chat-monitor" component={AdminChatMonitor} />
      <Route path="/profile" component={Profile} />
      <Route path="/admin/profile" component={AdminProfile} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route path="/interest-guide" component={InterestGuide} />
      <Route path="/admin/interest-guide" component={AdminInterestGuide} />
      <Route path="/verify-email">
        <VerifyEmail />
      </Route>
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CompareProvider>
          <TooltipProvider>
            <Suspense
              fallback={
                <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-500">
                  Loading…
                </div>
              }
            >
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <Router />
              </WouterRouter>
            </Suspense>
            <Toaster />
          </TooltipProvider>
        </CompareProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
