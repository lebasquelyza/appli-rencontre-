import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import App from "./App";
import "./styles.css";

// Détecte si on est dans Capacitor (app mobile)
const isNativeApp =
  typeof window !== "undefined" &&
  !!window.Capacitor &&
  window.Capacitor.isNativePlatform?.();

// Service Worker : uniquement sur le web (pas dans l'app mobile)
if (!isNativeApp && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.log("SW registration failed:", err);
    });
  });
}

const Router = isNativeApp ? HashRouter : BrowserRouter;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>
);
