import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import "./estilos/psyra.css";
import "./estilos/landing.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
