// Marca Psyra — logo oficial (importada no bundle para não falhar no deploy).

import logoUrl from "../assets/psyra-logo.svg";

// `decorativo`: quando o nome "Psyra AI" já aparece em texto ao lado, o alt fica vazio para o
// leitor de tela não repetir o nome (achado do Lighthouse, 17/10/2026).
export default function MarcaLogo({ className = "marca__logo", size = 40, decorativo = false }) {
  return (
    <img
      src={logoUrl}
      alt={decorativo ? "" : "Psyra AI"}
      className={className}
      style={{ width: size, height: size }}
      width={size}
      height={size}
      decoding="async"
    />
  );
}

export { logoUrl as LOGO_SRC };
