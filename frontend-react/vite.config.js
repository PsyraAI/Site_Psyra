import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Build sai em backend/static-react/ — o FastAPI serve o bundle pronto.
// Em desenvolvimento, o proxy manda /v1 e /health para a API na 8000,
// então o navegador vê tudo na mesma origem e não há CORS no caminho.
export default defineConfig({
  plugins: [react()],
  build: { outDir: "../backend/static-react", emptyOutDir: true },
  server: {
    port: 5173,
    proxy: {
      "/v1": "http://localhost:8000",
      "/health": "http://localhost:8000",
    },
  },
});
