// Marca Psyra — logo oficial em vetor (SVG), nítida em qualquer tamanho e tela.
// Importada no bundle para não falhar no deploy. O PNG antigo fica só como legado.

import logoUrl from "../assets/psyra-logo.svg";
import "../estilos/operacao.css";

export default function MarcaLogo({ className = "marca__logo", size = 40 }) {
  const altura = Math.round(size * 0.915);
  return (
    <img
      src={logoUrl}
      alt="Psyra AI"
      className={className}
      style={{ width: size, height: altura }}
      width={size}
      height={altura}
      decoding="async"
    />
  );
}

export { logoUrl as LOGO_SRC };
