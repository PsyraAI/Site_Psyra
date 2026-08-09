# Model Card — xgb_risco_questionario_sintetico_v1

## Finalidade

Aproximação experimental do índice determinístico 0–100 declarado no gabarito
XLSX. Treinado apenas em respostas sintéticas; não está ativo no produto.

## Dados e resultado

- Amostras: 24000
- Features: 56
- Cenários independentes: 24
- MAE no teste: 0.6927 pontos
- RMSE no teste: 0.9279 pontos
- R² no teste: 0.998811
- Spearman no teste: 0.999294

## SHAP por bloco

- Bloco I: 20.8%
- Bloco A: 12.1%
- Bloco F: 11.9%
- Bloco D: 9.5%
- Bloco C: 9.0%

## Limitações

- A fórmula do XLSX é a referência e calcula o alvo com erro zero; não há
  necessidade técnica de substituí-la por aprendizado de máquina.
- As 46 validações CRP do arquivo estão vazias.
- As métricas medem reprodução de uma fórmula em dados gerados, não validade
  clínica, generalização para trabalhadores reais ou causalidade.
- Proibido usar para diagnóstico ou decisão individual.
