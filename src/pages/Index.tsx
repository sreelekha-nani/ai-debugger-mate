import { Navigate } from "react-router-dom";

// Index page now redirects to dashboard (auth required)
const Index = () => <Navigate to="/dashboard" replace />;

export default Index;
