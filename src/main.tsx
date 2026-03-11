import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Apply theme from localStorage before render to prevent flash
const savedTheme = localStorage.getItem("theme") || "dark";
if (savedTheme === "dark") {
  document.documentElement.classList.add("dark");
} else {
  document.documentElement.classList.remove("dark");
}

createRoot(document.getElementById("root")!).render(<App />);
