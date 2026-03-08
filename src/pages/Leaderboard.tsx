import { Navigate } from "react-router-dom";

// Competition leaderboard removed - only admin can see results in admin panel
// Redirect to practice leaderboard
const Leaderboard = () => <Navigate to="/practice-leaderboard" replace />;

export default Leaderboard;
