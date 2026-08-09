# Google Forms por empresa

O formulário-base é o [Formulário Psyra](https://docs.google.com/forms/d/e/1FAIpQLSddu_MpN5uTWGNb1CsQVvroaClL_alqM8Da3GqkLs56qGL3Lw/viewform?usp=header).
Cada empresa/coleta deve usar uma cópia própria. Nunca use um campo preenchido pelo
respondente para decidir a empresa.

## Configuração

1. No Google Drive, faça uma cópia do formulário-base e identifique-a com o nome da
   empresa e do ciclo.
2. No painel Psyra, selecione a coleta, abra **Integração Google Forms**, cole a URL
   pública da cópia e salve.
3. No editor da cópia, abra **Extensões → Apps Script** e cole
   `PsyraWebhook.gs`.
4. Em **Configurações do projeto → Propriedades do script**, crie:
   - `WEBHOOK_URL`: domínio público da API + caminho mostrado no painel.
   - `WEBHOOK_SECRET`: segredo mostrado no painel para essa coleta.
5. No Apps Script, execute `instalarGatilho()` e autorize o acesso solicitado.
6. Envie uma resposta de teste e confirme a data da última resposta no painel.

O Apps Script roda nos servidores do Google e não consegue acessar
`http://localhost:8000`. Para teste local, exponha temporariamente a API por HTTPS
com um túnel confiável e use esse domínio em `WEBHOOK_URL`. Em produção, use o
domínio HTTPS definitivo.

## Garantias

- A empresa é resolvida pelo vínculo da coleta no backend, não pelo payload.
- O script não envia e-mail coletado automaticamente nem perguntas explícitas de
  nome, CPF, matrícula, telefone ou e-mail.
- O texto livre passa pelo anonimizador antes de ser persistido.
- Reenvios com o mesmo ID do Google Forms não duplicam respostas.
- Uma mesma cópia do Google Form não pode ser vinculada a duas coletas.
