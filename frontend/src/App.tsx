import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";

import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Universities from "@/pages/universities";
import UniversityDetail from "@/pages/university-detail";
import ScoreCalculator from "@/pages/score-calculator";
import Chatbot from "@/pages/chatbot";
import Chat from "@/pages/chat";
import News from "@/pages/news";

import AdminDashboard from "@/pages/admin/dashboard";
import AdminUsers from "@/pages/admin/users";
import AdminUniversities from "@/pages/admin/universities";
import AdminMajors from "@/pages/admin/majors";
import AdminCategories from "@/pages/admin/categories";
import AdminNews from "@/pages/admin/news";
import AdminAdmissionGuide from "@/pages/admin/admission-guide";
import AdminAudit from "@/pages/admin/audit";
import AdminChatMonitor from "@/pages/admin/chat-monitor";
import Profile from "@/pages/profile";
import AdminProfile from "@/pages/admin/admin-profile";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/universities" component={Universities} />
      <Route path="/universities/:id" component={UniversityDetail} />
      <Route path="/score" component={ScoreCalculator} />
      <Route path="/news" component={News} />
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
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
