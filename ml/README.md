# Experimentos XGBoost + SHAP

Pipelines offline e sintéticos. Nenhum modelo é carregado pela API.

## Risco 0–100 pelo questionário

O gabarito versionado em `ml/specs/` define 46 polaridades e pesos por bloco.
A base v2 simula respostas ao questionário e o regressor aproxima a fórmula
determinística do índice.

No diretório raiz do projeto:

```powershell
python -m pip install -r ml/requirements-ml.txt
python ml/generate_risk_v2.py
python ml/train_risk_xgb_shap.py
```

Artefatos: `backend/models/experimental/xgb_risco_questionario_sintetico_v1/`.

## Dissimilação sintética

O experimento anterior continua disponível separadamente:

```powershell
python ml/train_xgb_shap.py
```

Artefatos: `backend/models/experimental/xgb_dissimulacao_sintetico_v1/`.

## Testes

```powershell
python -m pytest ml/tests -q
```

## Limite de uso

Os dados e rótulos foram gerados artificialmente. As métricas apenas verificam
se os pipelines recuperam seus mecanismos de simulação. O cálculo direto da
fórmula é a referência correta para o índice 0–100. Não há validade clínica,
aprovação CRP/CEP ou autorização para decisões sobre pessoas.
