import { useState, useEffect } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/useAuth";
import { RoleProvider, useRole } from "@/lib/useRole";
import { SchoolProvider } from "@/lib/useSchool";
import { ThemeProvider } from "@/lib/useTheme";
import { GradeSetupWrapper } from "@/components/GradeSetupWrapper";
import { ProfileCompletionWrapper } from "@/components/ProfileCompletionWrapper";
import { CookieConsent } from "@/components/CookieConsent";
import Login from "@/pages/Login";
import ProfessorSignup from "@/pages/ProfessorSignup";
import Dashboard from "@/pages/Dashboard";
import Efeed from "@/pages/Efeed";
import EfeedProfile from "@/pages/EfeedProfile";
import Chat from "@/pages/Chat";
import Grades from "@/pages/Grades";
import ProfessorNotas from "@/pages/ProfessorNotas";
import AIChat from "@/pages/AIChat";
import Assignments from "@/pages/Assignments";
import Eduzao from "@/pages/Eduzao";
import CalendarPage from "@/pages/CalendarPage";
import Profile from "@/pages/Profile";
import AdminProfessores from "@/pages/AdminProfessores";
import ProfessorEventos from "@/pages/ProfessorEventos";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import DataRights from "@/pages/DataRights";
import AppDownload from "@/pages/AppDownload";
import GradeReport from "@/pages/GradeReport";
import SecretariaEducacao from "@/pages/SecretariaEducacao";
import EscolaPanel from "@/pages/EscolaPanel";
import DevToolsApiKeys from "@/pages/DevToolsApiKeys";
import { Button } from "@/components/ui/button";
import loadingGif from "@assets/load-31_1765139396100.gif";
import { useCacheWarmer } from "@/lib/useCacheWarmer";

function ProtectedRoute({ component: Component }: { component: () => JSX.Element }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <img src={loadingGif} alt="Carregando" className="w-16 h-16 mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return <Component />;
}

function ProtectedProfessorRoute({ component: Component }: { component: () => JSX.Element }) {
  const { user, loading: authLoading } = useAuth();
  const { isProfessor, loading: roleLoading } = useRole();
  const [, navigate] = useLocation();

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <img src={loadingGif} alt="Carregando" className="w-16 h-16 mx-auto mb-4" />
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (!isProfessor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Acesso Negado</h1>
          <p className="text-muted-foreground mb-6">
            Esta área é restrita apenas para professores. Se você é professor, entre em contato com a administração para obter as permissões necessárias.
          </p>
          <Button onClick={() => navigate("/dashboard")} size="lg" data-testid="button-back-dashboard">
            Voltar ao Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return <Component />;
}

function Router() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <img src={loadingGif} alt="Carregando" className="w-16 h-16 mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {/* School-specific routes for E.E Santa Quitéria */}
      <Route path="/escolas/E.E/Santa Quitéria/login">
        {user ? <Redirect to="/escolas/E.E/Santa Quitéria/dashboard" /> : <Login />}
      </Route>
      <Route path="/escolas/E.E/Santa Quitéria/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/escolas/E.E/Santa Quitéria/efeed" component={() => <ProtectedRoute component={Efeed} />} />
      <Route path="/escolas/E.E/Santa Quitéria/efeed/profile/:uid" component={() => <ProtectedRoute component={EfeedProfile} />} />
      <Route path="/escolas/E.E/Santa Quitéria/chat" component={() => <ProtectedRoute component={Chat} />} />
      <Route path="/escolas/E.E/Santa Quitéria/grades" component={() => <ProtectedRoute component={Grades} />} />
      <Route path="/escolas/E.E/Santa Quitéria/professor/notas" component={() => <ProtectedProfessorRoute component={ProfessorNotas} />} />
      <Route path="/escolas/E.E/Santa Quitéria/professor/eventos" component={() => <ProtectedProfessorRoute component={ProfessorEventos} />} />
      <Route path="/escolas/E.E/Santa Quitéria/ai-chat" component={() => <ProtectedRoute component={AIChat} />} />
      <Route path="/escolas/E.E/Santa Quitéria/assignments" component={() => <ProtectedRoute component={Assignments} />} />
      <Route path="/escolas/E.E/Santa Quitéria/eduzao" component={() => <ProtectedRoute component={Eduzao} />} />
      <Route path="/escolas/E.E/Santa Quitéria/calendar" component={() => <ProtectedRoute component={CalendarPage} />} />
      <Route path="/escolas/E.E/Santa Quitéria/profile" component={() => <ProtectedRoute component={Profile} />} />
      <Route path="/escolas/E.E/Santa Quitéria/privacy-policy" component={PrivacyPolicy} />
      <Route path="/escolas/E.E/Santa Quitéria/terms-of-service" component={TermsOfService} />
      <Route path="/escolas/E.E/Santa Quitéria/meus-dados-lgpd" component={() => <ProtectedRoute component={DataRights} />} />
      <Route path="/escolas/E.E/Santa Quitéria">
        {user ? <Redirect to="/escolas/E.E/Santa Quitéria/dashboard" /> : <Redirect to="/escolas/E.E/Santa Quitéria/login" />}
      </Route>

      {/* Default routes */}
      <Route path="/login">
        {user ? <Redirect to="/dashboard" /> : <Login />}
      </Route>
      <Route path="/prof/cadas">
        {user ? <Redirect to="/dashboard" /> : <ProfessorSignup />}
      </Route>
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/terms-of-service" component={TermsOfService} />
      <Route path="/meus-dados-lgpd" component={() => <ProtectedRoute component={DataRights} />} />
      <Route path="/app.apk" component={AppDownload} />
      <Route path="/report/:reportId" component={GradeReport} />
      
      {/* DevTools - API Keys */}
      <Route path="/devtools/ai/apikeys" component={() => <ProtectedRoute component={DevToolsApiKeys} />} />
      
      {/* Secretaria de Educação - Administrative Panel */}
      <Route path="/mg/esmeraldas/secretaria-de-educacao" component={SecretariaEducacao} />
      
      {/* Dynamic School Panels */}
      <Route path="/escolas/:slug" component={EscolaPanel} />
      
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/efeed" component={() => <ProtectedRoute component={Efeed} />} />
      <Route path="/efeed/profile/:uid" component={() => <ProtectedRoute component={EfeedProfile} />} />
      <Route path="/chat" component={() => <ProtectedRoute component={Chat} />} />
      <Route path="/grades" component={() => <ProtectedRoute component={Grades} />} />
      <Route path="/professor/notas" component={() => <ProtectedProfessorRoute component={ProfessorNotas} />} />
      <Route path="/professor/eventos" component={() => <ProtectedProfessorRoute component={ProfessorEventos} />} />
      <Route path="/ai-chat" component={() => <ProtectedRoute component={AIChat} />} />
      <Route path="/assignments" component={() => <ProtectedRoute component={Assignments} />} />
      <Route path="/eduzao" component={() => <ProtectedRoute component={Eduzao} />} />
      <Route path="/calendar" component={() => <ProtectedRoute component={CalendarPage} />} />
      <Route path="/profile" component={() => <ProtectedRoute component={Profile} />} />
      <Route path="/escola/e.m/zitalucasesilva/admin/chat/professores" component={() => <ProtectedRoute component={AdminProfessores} />} />
      <Route path="/">
        {user ? <Redirect to="/dashboard" /> : <Redirect to="/login" />}
      </Route>
    </Switch>
  );
}

function AppContent() {
  // Warm cache on app startup
  useCacheWarmer();

<<<<<<< HEAD
  // Security interactions
  useEffect(() => {
    // Disable right-click
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", handleContextMenu);

    // Disable DevTools shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12, Ctrl+Shift+I, Ctrl+U
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && e.key === "I") ||
        (e.ctrlKey && e.key === "u")
      ) {
        e.preventDefault();
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

=======
>>>>>>> 671417f (Add a system to make the app load and run much faster)
  return (
    <div className="flex flex-col min-h-screen">
      <Router />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <RoleProvider>
              <SchoolProvider>
                <ProfileCompletionWrapper>
                  <GradeSetupWrapper>
                    <AppContent />
                    <CookieConsent />
                  </GradeSetupWrapper>
                </ProfileCompletionWrapper>
              </SchoolProvider>
            </RoleProvider>
          </AuthProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;


