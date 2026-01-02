import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Register service worker for offline support and fast caching
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").then(
      (registration) => {
        console.log("✅ Service Worker registered:", registration);
      },
      (error) => {
        console.warn("Service Worker registration failed:", error);
      }
    );
  });
}

createRoot(document.getElementById("root")!).render(<App />);



