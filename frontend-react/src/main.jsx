import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import "./estilos/psyra.css";
import "./estilos/app-estetica.css";
import "./estilos/landing.css";
import "./estilos/landing-s10.css";
import "./estilos/landing-claro.css";
import "./estilos/landing-fluidez.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
