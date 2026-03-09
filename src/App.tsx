import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Arena from "./pages/Arena";
import Practice from "./pages/Practice";
import Quiz from "./pages/Quiz";
import QuizStats from "./pages/QuizStats";
import PracticeLeaderboard from "./pages/PracticeLeaderboard";
import GlobalLeaderboard from "./pages/GlobalLeaderboard";
import JoinCompetition from "./pages/JoinCompetition";
import Results from "./pages/Results";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/arena" element={<ProtectedRoute><Arena /></ProtectedRoute>} />
            <Route path="/practice" element={<ProtectedRoute><Practice /></ProtectedRoute>} />
            <Route path="/quiz" element={<ProtectedRoute><Quiz /></ProtectedRoute>} />
            <Route path="/practice-leaderboard" element={<ProtectedRoute><PracticeLeaderboard /></ProtectedRoute>} />
            <Route path="/global-leaderboard" element={<ProtectedRoute><GlobalLeaderboard /></ProtectedRoute>} />
            <Route path="/contest/:slug" element={<ProtectedRoute><JoinCompetition /></ProtectedRoute>} />
            <Route path="/competition/:slug" element={<ProtectedRoute><JoinCompetition /></ProtectedRoute>} />
            <Route path="/results" element={<ProtectedRoute><Results /></ProtectedRoute>} />
            <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
