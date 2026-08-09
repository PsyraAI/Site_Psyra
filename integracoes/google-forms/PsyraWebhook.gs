/**
 * Psyra AI — integração anônima Google Forms → FastAPI.
 *
 * Instale este código como Apps Script vinculado a UMA cópia do formulário
 * para cada coleta/empresa. Configure WEBHOOK_URL e WEBHOOK_SECRET nas
 * Propriedades do script e execute instalarGatilho() uma vez.
 */

const HANDLER_PSYRA = "enviarParaPsyra";

function instalarGatilho() {
  const formulario = FormApp.getActiveForm();
  ScriptApp.getProjectTriggers()
    .filter((gatilho) => gatilho.getHandlerFunction() === HANDLER_PSYRA)
    .forEach((gatilho) => ScriptApp.deleteTrigger(gatilho));

  ScriptApp.newTrigger(HANDLER_PSYRA)
    .forForm(formulario)
    .onFormSubmit()
    .create();
}

function enviarParaPsyra(evento) {
  if (!evento || !evento.response) {
    throw new Error("Este método deve ser executado pelo gatilho de envio do formulário.");
  }

  const propriedades = PropertiesService.getScriptProperties();
  const webhookUrl = propriedades.getProperty("WEBHOOK_URL");
  const webhookSecret = propriedades.getProperty("WEBHOOK_SECRET");
  if (!webhookUrl || !webhookSecret) {
    throw new Error("Configure WEBHOOK_URL e WEBHOOK_SECRET nas propriedades do script.");
  }

  const respostas = evento.response
    .getItemResponses()
    .filter((resposta) => tituloPermitido_(resposta.getItem().getTitle()))
    .map((resposta) => ({
      item_id: String(resposta.getItem().getId()),
      titulo: resposta.getItem().getTitle(),
      valor: resposta.getResponse(),
    }));

  const payload = JSON.stringify({
    response_id: evento.response.getId(),
    submitted_at: evento.response.getTimestamp().toISOString(),
    answers: respostas,
  });
  const assinatura = bytesParaHex_(
    Utilities.computeHmacSha256Signature(
      payload,
      webhookSecret,
      Utilities.Charset.UTF_8
    )
  );

  const retorno = UrlFetchApp.fetch(webhookUrl, {
    method: "post",
    contentType: "application/json",
    payload,
    headers: { "X-Psyra-Signature": assinatura },
    muteHttpExceptions: true,
  });
  if (retorno.getResponseCode() >= 300) {
    throw new Error(
      `Psyra recusou a resposta (${retorno.getResponseCode()}): ${retorno.getContentText()}`
    );
  }
}

function tituloPermitido_(titulo) {
  const identificadorDireto = /\b(e-?mail|nome completo|cpf|matr[ií]cula|telefone)\b/i;
  return !identificadorDireto.test(String(titulo || ""));
}

function bytesParaHex_(bytes) {
  return bytes
    .map((valor) => {
      const positivo = valor < 0 ? valor + 256 : valor;
      return positivo.toString(16).padStart(2, "0");
    })
    .join("");
}
