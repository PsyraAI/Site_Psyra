# App Android da Psyra AI (Play Store)

Sprint S10 · Épico APP · 17/10/2026

O app é uma **Trusted Web Activity (TWA)**: um app Android nativo que abre o site da Psyra em tela cheia, sem a barra do navegador. Usa o mesmo código, o mesmo login e as mesmas regras de privacidade do site, então não há uma segunda base de código para manter. É o caminho que o Google recomenda para levar uma PWA à Play Store.

| Item | Valor |
|---|---|
| ID do app (`applicationId`) | `ai.psyra.app` (não muda depois de publicado) |
| Domínio | `site-psyra.onrender.com` |
| Abre em | `/entrar?origem=app` (login do painel) |
| `targetSdkVersion` | 36 (Android 16): exigido para app novo enviado depois de 31/08/2026 |
| `minSdkVersion` | 21 (Android 5.0) |
| Gerado com | `@bubblewrap/core` 1.22.5, a partir de `frontend-react/public/manifest.webmanifest` |

## O que já está pronto

- **No site** (vale depois do deploy do patch v5):
  - manifesto (`/manifest.webmanifest`);
  - ícones 192/512 e ícone *maskable*;
  - service worker (`/sw.js`), que **nunca** guarda respostas da API;
  - página offline;
  - rota `/.well-known/assetlinks.json`, lida das variáveis de ambiente.
- **Nesta pasta:**
  - o projeto Android completo, gerado pelo Bubblewrap;
  - `twa-manifest.json`;
  - imagens da loja em `play-store/`:
    - ícone 512×512;
    - gráfico de destaque 1024×500;
    - 6 telas de celular 1080×1920.
- **Na Política de Privacidade:**
  - seção de exclusão de conta com âncora (`/privacidade#privacidade-9`), exigida pela Play;
  - caminho no próprio app: **Configurações → Conta → Pedir exclusão da conta**.

## Passo a passo para publicar

### 1. Gerar a chave de upload (uma vez só, guarde muito bem)

No computador, com o JDK 17 instalado (o Bubblewrap instala, se faltar):

```bash
cd android-app
keytool -genkeypair -v -keystore psyra-upload.keystore -alias psyra \
  -keyalg RSA -keysize 2048 -validity 10000
```

- Guarde o arquivo `psyra-upload.keystore` e as senhas em dois lugares seguros, por exemplo num cofre de senhas e num pendrive.
- **Não suba esse arquivo no Git nem no Drive compartilhado.** O `.gitignore` desta pasta já o bloqueia.
- Se a chave for perdida, dá para pedir a troca da chave de upload no Play Console, mas isso leva dias.

### 2. Compilar o pacote (AAB)

```bash
npm i -g @bubblewrap/cli
cd android-app
bubblewrap build
```

Na primeira execução, o Bubblewrap oferece baixar o JDK 17 e o Android SDK: aceite. Ele gera:

- `app-release-bundle.aab`, que vai para a Play Store;
- `app-release-signed.apk`, para instalar direto num celular e testar.

### 3. Ligar o app ao site (Digital Asset Links)

Sem esta etapa, o app abre com uma barra de endereço no topo.

1. Pegue a impressão SHA-256 da chave de upload: `keytool -list -v -keystore psyra-upload.keystore -alias psyra`. Copie a linha `SHA256:`.
2. Depois de enviar o primeiro AAB ao Play Console, abra **Teste e lançamento → Configuração → Integridade do app → Assinatura de apps** e copie também o **SHA-256 da chave de assinatura do app**. Com a Assinatura de apps do Google Play, quem assina o app que chega ao celular é o Google.
3. No Render, em **Environment**, crie as variáveis:
   - `PSYRA_TWA_PACOTE` = `ai.psyra.app`
   - `PSYRA_TWA_SHA256` = `SHA_DA_CHAVE_DE_UPLOAD,SHA_DA_CHAVE_DO_GOOGLE` (as duas, separadas por vírgula)
4. Confira em `https://site-psyra.onrender.com/.well-known/assetlinks.json`. Também dá para validar na ferramenta do Google: <https://developers.google.com/digital-asset-links/tools/generator>.

### 4. Conta de desenvolvedor

- A taxa é de **US$ 25**, paga uma vez.
- O Google pede documento com foto, verificação de telefone e e-mail, e às vezes um celular Android.
- Há dois tipos de conta:
  - **Conta pessoal** (CPF de um dos sócios): contas pessoais criadas depois de 13/11/2023 precisam fazer **teste fechado com pelo menos 12 testadores inscritos por 14 dias seguidos** antes de liberar a produção. Comece o teste fechado assim que tiver o AAB.
  - **Conta de organização**: exige número **D-U-N-S** (gratuito, da Dun & Bradstreet, pode levar até 30 dias). Só faz sentido quando a Psyra tiver CNPJ.

### 5. Ficha da loja (textos sugeridos; revisem antes de usar)

- **Nome:** Psyra AI: risco psicossocial e NR-1
- **Descrição curta (até 80 caracteres):** Mapeie riscos psicossociais por grupo e cumpra a NR-1, com IA explicável.
- **Descrição completa:**
  > A Psyra AI ajuda RH, SESMT e psicólogas a mapear riscos psicossociais no trabalho, como pede a NR-1 (Portaria MTE 1.419/2024).
  >
  > • Questionário anônimo, sem login para quem responde, com escala e texto livre em português.
  > • Resultados sempre por grupo, com no mínimo 5 respostas. Ninguém é identificado.
  > • Nomes, CPF, e-mails e telefones escritos no texto são apagados antes de gravar.
  > • Painel com o índice de risco por grupo, os fatores que mais pesaram e a leitura do texto livre.
  > • Plano de ação com responsável, prazo e indicador, validado por psicóloga com CRP antes de entrar no PGR.
  > • Estimativa de capital em risco por setor (método FIEMG) e projeção de 12 meses.
  >
  > O app é para empresas clientes da Psyra. As contas são criadas pela empresa.
- **Categoria:** Empresas
- **E-mail de contato:** psyra.ai.io@gmail.com
- **Política de privacidade:** `https://site-psyra.onrender.com/privacidade`

### 6. Formulários obrigatórios do Play Console

| Formulário | Resposta sugerida |
|---|---|
| Acesso ao app | Precisa de login. Informe uma conta de teste só para a revisão do Google. Nunca use dados reais. |
| Anúncios | Não contém anúncios |
| Classificação do conteúdo | Questionário IARC: app de produtividade/negócios, sem violência ou conteúdo sensível |
| Público-alvo | 18 anos ou mais |
| Segurança dos dados | Coleta **nome e e-mail** (conta do painel; funcionalidade do app e gerenciamento da conta) e **outras ações no app** (registros de acesso para segurança). Dados criptografados em trânsito (HTTPS). O usuário pode pedir exclusão. Não compartilha dados com terceiros para publicidade. As respostas do questionário são anônimas e não identificam o usuário. |
| Link de exclusão de conta | `https://site-psyra.onrender.com/privacidade#privacidade-9` |
| App de saúde | Não é app de saúde nem dispositivo médico. É uma ferramenta de gestão de riscos ocupacionais. Se o formulário perguntar, marque "não". |

### 7. Ordem de lançamento

1. **Teste interno**, só com a equipe: instale e confira o login, o painel e a ausência da barra de endereço.
2. **Teste fechado**, com 12 ou mais testadores por 14 dias, se a conta for pessoal.
3. **Produção**: a revisão do Google costuma levar de alguns dias a uma semana.

## Atualizar o app depois

O conteúdo vem do site, então **qualquer deploy no Render já atualiza o app**, sem passar pela loja. Só é preciso gerar um AAB novo quando mudarem:

- ícone ou nome;
- cores;
- `targetSdkVersion`, que o Google exige subir todo ano;
- o próprio projeto Android.

Nesse caso, aumente `appVersionCode` no `twa-manifest.json`, rode `bubblewrap update` e depois `bubblewrap build`.

## Fontes

- Trusted Web Activities, guia rápido: <https://developer.chrome.com/docs/android/trusted-web-activity/quick-start>
- Bubblewrap CLI: <https://www.npmjs.com/package/@bubblewrap/cli>
- Nível de API exigido: <https://developer.android.com/google/play/requirements/target-sdk>
- Teste fechado para contas pessoais: <https://support.google.com/googleplay/android-developer/answer/14151465>
- Exclusão de conta: <https://support.google.com/googleplay/android-developer/answer/13327111>
