import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

if (import.meta.env.VITE_API_URL) {
  // ensure no trailing slash or /api as the client adds /api already
  const url = import.meta.env.VITE_API_URL.replace(/\/+$/, "").replace(/\/api$/, "");
  setBaseUrl(url);
}

createRoot(document.getElementById("root")!).render(<App />);
