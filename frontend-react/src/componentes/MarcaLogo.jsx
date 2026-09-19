// Marca Psyra — logo oficial (importada no bundle para não falhar no deploy).

import logoUrl from "../assets/psyra-logo.png";

export default function MarcaLogo({ className = "marca__logo", size = 40 }) {
  return (
    <img
      src={logoUrl}
      alt="Psyra AI"
      className={className}
      style={{ width: size, height: size }}
      width={size}
      height={size}
      decoding="async"
    />
  );
}

export { logoUrl as LOGO_SRC };
