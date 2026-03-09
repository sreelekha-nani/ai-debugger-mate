import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Bug } from "lucide-react";

const ProtectedRoute = ({ children, skipProfileCheck = false }: { children: React.ReactNode; skipProfileCheck?: boolean }) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Bug className="w-8 h-8 text-primary animate-float" />
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if profile needs completion (skip for /complete-profile route itself)
  if (!skipProfileCheck && profile && (!profile.username || profile.username.trim() === "")) {
    return <Navigate to="/complete-profile" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
