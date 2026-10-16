// Campo de senha com mostrar/ocultar, aviso de Caps Lock e medidor de força. Sprint: S10 | Risco: R2
// A força é só uma dica visual; quem decide é a política do servidor (validar_politica_senha).

import { useState } from "react";
import { Eye, EyeOff, ArrowBigUp } from "lucide-react";

export function forcaDaSenha(senha) {
  if (!senha) return 0;
  let pontos = 0;
  if (senha.length >= 10) pontos += 1;
  if (senha.length >= 14) pontos += 1;
  const tipos = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(senha)).length;
  if (tipos >= 2) pontos += 1;
  if (new Set(senha.toLowerCase()).size <= 3) pontos = 0;
  return Math.min(3, pontos);
}

export default function CampoSenha({
  id,
  rotulo,
  valor,
  aoMudar,
  textos,
  autoComplete = "current-password",
  mostrarForca = false,
  placeholder = "••••••••••",
}) {
  const [visivel, setVisivel] = useState(false);
  const [caps, setCaps] = useState(false);
  const forca = forcaDaSenha(valor);
  const nomeForca = forca >= 3 ? "boa" : forca === 2 ? "media" : "fraca";
  const verificarCaps = (evento) => setCaps(Boolean(evento.getModifierState?.("CapsLock")));

  return (
    <div className="campo campo-senha">
      <label htmlFor={id}>{rotulo}</label>
      <div className="campo-senha__caixa">
        <input
          id={id}
          type={visivel ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
          onKeyUp={verificarCaps}
          onKeyDown={verificarCaps}
          onBlur={() => setCaps(false)}
          aria-describedby={mostrarForca ? `${id}-forca` : undefined}
        />
        <button
          type="button"
          className="campo-senha__olho"
          onClick={() => setVisivel((v) => !v)}
          aria-label={visivel ? textos.ocultar : textos.mostrar}
          aria-pressed={visivel}
          title={visivel ? textos.ocultar : textos.mostrar}
        >
          {visivel ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
        </button>
      </div>
      {caps ? (
        <p className="campo-senha__caps" role="status">
          <ArrowBigUp size={14} aria-hidden="true" /> {textos.capsLock}
        </p>
      ) : null}
      {mostrarForca ? (
        <div className="campo-senha__forca" id={`${id}-forca`} aria-live="polite">
          <div className={`campo-senha__barra campo-senha__barra--${valor ? nomeForca : "vazia"}`}>
            <i style={{ width: `${valor ? Math.max(1, forca) * 33.4 : 0}%` }} />
          </div>
          <span>{valor ? textos.forca[nomeForca] : textos.regra}</span>
        </div>
      ) : null}
    </div>
  );
}
