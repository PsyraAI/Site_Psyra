import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Build sai em backend/static-react/ — o FastAPI serve o bundle pronto.
// Em desenvolvimento, o proxy manda /v1 e /health para a API na 8000,
// então o navegador vê tudo na mesma origem e não há CORS no caminho.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "../backend/static-react",
    emptyOutDir: true,
    // fontes nunca viram data: (a CSP só aceita font-src 'self'); o resto segue o padrão de 4 kB
    assetsInlineLimit: (arquivo) => (/\.(woff2?|ttf|otf)$/.test(arquivo) ? false : undefined),
  },
  server: {
    port: 5173,
    proxy: {
      "/v1": "http://localhost:8000",
      "/health": "http://localhost:8000",
    },
  },
});
