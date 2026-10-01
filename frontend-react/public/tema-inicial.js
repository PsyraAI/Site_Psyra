// Tema e idioma antes da primeira pintura (arquivo externo: a CSP bloqueia script inline).
// Aplica o tema salvo antes da primeira pintura (evita piscar escuro→claro).
(function () {
  try {
    var p = location.pathname;
    // só o questionário do colaborador fica sempre no tema escuro da marca
    var publica = p.indexOf("/responder") === 0;
    if (p.indexOf("/en") === 0) document.documentElement.lang = "en";
    if (p.indexOf("/zh") === 0) document.documentElement.lang = "zh-Hans";
    var pref = localStorage.getItem("psyra-tema") || "escuro";
    var claro = pref === "claro" || (pref === "sistema" && matchMedia("(prefers-color-scheme: light)").matches);
    document.documentElement.dataset.tema = !publica && claro ? "claro" : "escuro";
  } catch (e) {}
})();
