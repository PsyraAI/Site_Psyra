// Botão "?" que abre uma explicação curta perto do rótulo. Sprint: S10 | Risco: None
// v2 (17/10/2026): o balão é desenhado num portal com posição fixa, calculada a partir do
// botão e limitada à janela. Assim ele não é mais cortado por cartões com overflow
// escondido nem sai pela lateral da tela (bug relatado na banca: "Grupos protegidos" e
// "Divergência" cortados).

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, HelpCircle } from "lucide-react";

const MARGEM = 12; // distância mínima da borda da janela
const LARGURA_MAX = 320;

function calcularPosicao(botao, balao) {
  const r = botao.getBoundingClientRect();
  const larguraJanela = document.documentElement.clientWidth || window.innerWidth;
  const alturaJanela = window.innerHeight;
  const largura = Math.min(LARGURA_MAX, larguraJanela - MARGEM * 2);
  const altura = balao ? balao.offsetHeight : 0;
  // centraliza no botão e empurra para dentro da janela
  let esquerda = r.left + r.width / 2 - largura / 2;
  esquerda = Math.max(MARGEM, Math.min(esquerda, larguraJanela - largura - MARGEM));
  let topo = r.bottom + 8;
  let acima = false;
  if (altura && topo + altura > alturaJanela - MARGEM && r.top - 8 - altura > MARGEM) {
    topo = r.top - 8 - altura;
    acima = true;
  }
  const seta = Math.max(14, Math.min(largura - 14, r.left + r.width / 2 - esquerda));
  return { esquerda, topo, largura, acima, seta };
}

export default function Explicacao({ rotulo, children, className = "" }) {
  const [aberta, setAberta] = useState(false);
  const [pos, setPos] = useState(null);
  const id = useId();
  const botao = useRef(null);
  const balao = useRef(null);

  const reposicionar = useCallback(() => {
    if (botao.current) setPos(calcularPosicao(botao.current, balao.current));
  }, []);

  useLayoutEffect(() => {
    if (!aberta) return undefined;
    reposicionar();
    // segunda passada: agora o balão existe e sabemos a altura dele
    const quadro = requestAnimationFrame(reposicionar);
    return () => cancelAnimationFrame(quadro);
  }, [aberta, reposicionar]);

  useEffect(() => {
    if (!aberta) return undefined;
    const fecharFora = (evento) => {
      if (botao.current?.contains(evento.target) || balao.current?.contains(evento.target)) return;
      setAberta(false);
    };
    const fecharEsc = (evento) => {
      if (evento.key === "Escape") {
        setAberta(false);
        botao.current?.focus();
      }
    };
    window.addEventListener("resize", reposicionar);
    window.addEventListener("scroll", reposicionar, true);
    document.addEventListener("pointerdown", fecharFora);
    document.addEventListener("keydown", fecharEsc);
    return () => {
      window.removeEventListener("resize", reposicionar);
      window.removeEventListener("scroll", reposicionar, true);
      document.removeEventListener("pointerdown", fecharFora);
      document.removeEventListener("keydown", fecharEsc);
    };
  }, [aberta, reposicionar]);

  return (
    <span className={`explicacao ${aberta ? "explicacao--aberta" : ""} ${className}`}>
      <button
        ref={botao}
        type="button"
        className="explicacao__botao"
        aria-expanded={aberta}
        aria-controls={id}
        onClick={(evento) => {
          evento.stopPropagation();
          setAberta((v) => !v);
        }}
        title={rotulo}
      >
        <HelpCircle size={14} aria-hidden="true" />
        <span className="sr-only">{rotulo}</span>
        <ChevronDown size={12} aria-hidden="true" className="explicacao__seta" />
      </button>
      {aberta
        ? createPortal(
            <span
              ref={balao}
              id={id}
              role="region"
              aria-label={rotulo}
              className={`explicacao__texto explicacao__texto--flutuante ${pos?.acima ? "explicacao__texto--acima" : ""}`}
              style={{
                left: pos ? pos.esquerda : -9999,
                top: pos ? pos.topo : -9999,
                width: pos ? pos.largura : LARGURA_MAX,
                "--seta-x": pos ? `${pos.seta}px` : "50%",
              }}
            >
              {children}
            </span>,
            document.body
          )
        : null}
    </span>
  );
}
