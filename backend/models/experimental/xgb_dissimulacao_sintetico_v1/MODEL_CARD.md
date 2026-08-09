# Model Card — xgb_dissimulacao_sintetico_v1

## Finalidade

Experimento offline de classificação binária de `dissimulador`. O modelo foi
treinado exclusivamente com dados sintéticos para validar o pipeline técnico.
Ele não possui validade clínica, não foi aprovado por CRP/CEP e não está ativo
no backend ou no painel da Psyra.

## Dados

- Amostras: 5000
- Positivos: 576
- Prevalência: 0.1152
- Features: 58
- Instrumento: psyra_form_v1 v1.0

## Avaliação no teste intocado

- PR-AUC: 0.3988
- ROC-AUC: 0.7703
- Precisão: 0.5000
- Recall: 0.4174
- F1: 0.4550
- Balanced accuracy: 0.6816
- Limiar escolhido apenas na validação: 0.6619

## Principais grupos segundo TreeSHAP

- A: 32.6% da importância SHAP
- I: 14.2% da importância SHAP
- DIVERGENCIA: 9.8% da importância SHAP
- J: 8.2% da importância SHAP
- F: 7.3% da importância SHAP

## Limitações e uso proibido

- As métricas medem recuperação do mecanismo gerador sintético, não desempenho
  em trabalhadores reais.
- Não usar para decisão individual, diagnóstico, laudo, PGR ou ação trabalhista.
- Não ativar no produto sem dados reais autorizados, validação externa, revisão
  da psicóloga responsável e aprovação ética aplicável.
- SHAP descreve o comportamento do modelo; não estabelece causalidade.
