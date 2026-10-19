# Revisão ponta a ponta do modelo e do motor de risco

Sprint S10 · Épico ML · 17/10/2026 · Risco: R1 (validade) e R2 (privacidade)

> Todos os números abaixo vêm de **base sintética**: são números de engenharia, não validação de campo. A validação real acontece no piloto, depois da aprovação do CEP (R1). Este documento também serve de insumo para o artigo; reescrevam com as próprias palavras antes de usar.

## 1. O caminho de uma resposta

| Etapa | Onde está | Situação |
|---|---|---|
| Coleta anônima, sem login | `Responder.jsx` → `POST /v1/...` | ok |
| Anonimização antes de gravar | `backend/app/anonimizador.py` | **corrigido**: o RG pontuado passava sem máscara |
| Índice por grupo (n ≥ 5) | `backend/app/scoring.py` + `vw_painel_ghe` | ok (dupla checagem: código e banco) |
| Sinal do texto livre | `scoring.calcular_sinal_texto` (léxico provisório) | **corrigido**: a negação era lida só na 1ª ocorrência |
| Explicação dos fatores | `scoring.agregar_ghe` | **novo**: contribuição aditiva de cada dimensão |
| Plano de ação | `backend/app/plano_acao.py` | **novo**: até 3 ações, com responsável, prazo, indicador e impacto |
| Capital em risco | `backend/app/capital_risco.py` | **novo**: projeção de 12 meses, sem ação × com o plano |
| Modelo treinado (XGBoost) | `scripts/S10_ML_avaliacao_base_v6_v2.py` (repositório de ML) | **revisado**: calibração fora da amostra e IC por empresa |

## 2. Problemas encontrados e corrigidos

1. **Limiares diferentes entre a tela e o cálculo.** A ajuda do "Índice geral" dizia "até 33 baixo, 34–66 moderado", mas o motor usa **40 e 60** (`LIMIAR_MODERADO` e `LIMIAR_ALTO`). Agora os textos em pt, en e zh repetem os limiares do cálculo.
2. **Negação aplicada a todas as ocorrências.** Em "não estou exausto… fico exausto", a primeira negação anulava as duas. Agora cada ocorrência é lida com o próprio contexto. Há teste para isso.
3. **RG sem máscara (R2).** "12.345.678-9" e "RG: 123456789" chegavam ao banco. Agora são trocados por `<RG>`, com teste no guarda de privacidade.
4. **"Dimensão que mais pesa" escolhida pela nota, não pelo peso.** Com pesos por bloco (assédio = 1,4), uma dimensão com nota um pouco menor pode pesar mais. O plano agora ordena pela **contribuição**, a conta exata do motor:

   contribuição = peso × (nota − 50) / Σ pesos

   A soma das contribuições dá índice − 50. Com o modelo treinado, o mesmo campo passa a ser o valor SHAP.
5. **Testes que dependiam de arquivo fora do repositório.** `ml/tests/test_pipeline.py` falhava sem a base v1 externa. Agora o teste é pulado e informa o motivo.
6. **Teste de privacidade frágil.** O teste procurava a palavra "protocolo" em todo o JSON do painel e falhava por causa da ação "protocolo antiassédio". Agora ele confere os **nomes dos campos**, o que é mais rigoroso e não depende do texto das ações.

## 3. Modelo treinado (XGBoost, base v6): o que mudou na v2 da avaliação

**Problema metodológico na v1.** A calibração isotônica era ajustada na validação, e os pesos da regra de decisão eram escolhidos **nas mesmas probabilidades já calibradas nela**. O teste continuava limpo, mas a escolha dos pesos ficava otimista.

**Correção na v2:**

- **Pesos escolhidos fora da amostra.** As probabilidades usadas para escolher os pesos vêm de calibração cruzada **agrupada por empresa** (GroupKFold, 5 dobras). O calibrador final usa a validação inteira e só é aplicado ao teste e ao OOD.
- **Guarda de split por empresa.** A avaliação falha se uma empresa aparecer em mais de um split. Conferido: 69 empresas no treino, 17 na validação, 26 no teste e 8 no OOD (setor Saúde).
- **Intervalo de confiança por empresa.** O IC 95% vem de bootstrap que reamostra **empresas**, com 1.000 réplicas, porque a unidade independente é a empresa.

### Resultados (base sintética v6, prevalência natural)

| Métrica | Teste (26 empresas, n = 7.121) | OOD Saúde (8 empresas, n = 1.428) | Meta (dado real) |
|---|---|---|---|
| F1 macro | **0,731** (IC 0,719–0,741) | **0,731** (IC 0,720–0,739) | ≥ 0,80 ❌ |
| ROC-AUC macro | 0,889 (IC 0,881–0,896) | 0,882 (IC 0,869–0,892) | ≥ 0,85 ✅ |
| Brier | 0,123 | 0,126 | ≤ 0,15 ✅ |
| ECE | 0,015 | 0,027 | ≤ 0,10 ✅ |
| Sensibilidade do "alto" | 0,677 (IC 0,647–0,707) | 0,675 (IC 0,633–0,716) | — |
| Especificidade do "alto" | 0,948 | 0,941 | — |
| Gap de TPR entre setores | 6,8 p.p. (p = 0,94) | 4,9 p.p. (p = 0,92) | ≤ 5 p.p. ❌ no teste |
| Erro médio por GHE (% de alto) | 5,5 p.p. | 4,7 p.p. | — |
| Teto (regra de Bayes) | 0,880 | 0,875 | — |

### Como ler

- **Os números ficaram estáveis.** No OOD, o F1 subiu de 0,724 para 0,731 com os novos pesos; no teste, foi de 0,732 para 0,731. A v2 não "melhora" o número, mas torna a escolha **honesta** e o resultado **reproduzível**.
- **O F1 está abaixo da meta de 0,80**, mesmo com o teto em 0,88: ainda há espaço até o limite que a própria base permite. A meta vale para dado real.
- **O gap de TPR de 6,8 p.p. no teste passa da meta de 5 p.p.**, mas não é estatisticamente diferente do acaso (teste de permutação, p = 0,94). Nenhum ajuste por setor foi feito, porque isso exigiria dado real. Fica registrado como ponto de atenção.
- **Nenhum F1 perto de 1,0**: não há sinal de vazamento. O script falha se F1 > 0,95.

Arquivos:

- `scripts/S10_ML_avaliacao_base_v6_v2.py` e `tests/unit/test_S10_ML_avaliacao_v6_v2.py` (4 testes);
- resultado em `S10_ML_metricas_base_v6_v2.json`.

Os 155 testes do repositório de ML passam.

## 4. O que fica para o piloto (com dado real)

1. Trocar o motor de regras do site pelo XGBoost calibrado. A interface já espera a "contribuição" por dimensão: o SHAP entra no mesmo campo.
2. Trocar o léxico do texto livre pelo MentalBERT-PT (BERTimbau ajustado), com a mesma divergência do Revelador.
3. Rodar o Presidio em produção. O site avisa no log quando cai no fallback de regex ("Não usar em coleta real").
4. Recalibrar por setor fora da distribuição. No artigo, a inclinação de calibração no OOD foi de 0,83.
5. Medir o gap de TPR em dado real e, se ele continuar acima de 5 p.p. com significância, avaliar limiar por setor com a psicóloga.
