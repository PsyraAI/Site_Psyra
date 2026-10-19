import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// Fontes da marca servidas pelo próprio site (antes: Google Fonts, bloqueava a renderização).
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/caladea/400.css";
import "@fontsource/caladea/700.css";
import "@fontsource/caladea/400-italic.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/600.css";
import App from "./App";
import "./estilos/psyra.css";
import "./estilos/app-estetica.css";
import "./estilos/landing.css";
import "./estilos/landing-s10.css";
import "./estilos/landing-claro.css";
import "./estilos/landing-fluidez.css";
import "./estilos/landing-v3.css";
import "./estilos/landing-legal.css";
import "./estilos/app-v2.css";
import "./estilos/app-v3.css";
import "./estilos/app-v4.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// PWA / app Android (TWA): registra o service worker só no build de produção.
// Ele nunca guarda respostas da API (/v1); ver public/sw.js. Sprint: S10 | Risco: R2
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      /* sem service worker o site funciona igual, só não abre offline */
    });
  });
}
