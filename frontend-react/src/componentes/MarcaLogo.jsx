// Marca Psyra — logo oficial anexada (perfis + Ψ).

const LOGO_SRC = "/psyra-logo.png";

export default function MarcaLogo({ className = "marca__logo", size }) {
  const style = size ? { width: size, height: size } : undefined;
  return (
    <img
      src={LOGO_SRC}
      alt=""
      className={className}
      style={style}
      width={size || undefined}
      height={size || undefined}
      decoding="async"
      aria-hidden="true"
    />
  );
}

export { LOGO_SRC };
