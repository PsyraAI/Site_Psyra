// QR code do link do questionário, gerado no navegador (sem serviço externo). Sprint: S10 | Risco: None

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function QrCodigo({ valor, rotulo, tamanho = 168 }) {
  const [svg, setSvg] = useState("");

  useEffect(() => {
    let ativo = true;
    if (!valor) return undefined;
    QRCode.toString(valor, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#1c1f3a", light: "#ffffff" } })
      .then((texto) => ativo && setSvg(texto))
      .catch(() => ativo && setSvg(""));
    return () => {
      ativo = false;
    };
  }, [valor]);

  if (!svg) return <div className="qr qr--vazio" style={{ width: tamanho, height: tamanho }} aria-hidden="true" />;
  return (
    <div
      className="qr"
      role="img"
      aria-label={rotulo}
      style={{ width: tamanho, height: tamanho }}
      // SVG gerado localmente pela biblioteca qrcode a partir do link do ciclo
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
