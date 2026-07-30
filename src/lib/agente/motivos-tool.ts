/**
 * Códigos de "não deu" das tools do agente.
 *
 * Incidente de 28/07/2026 (OPE-554): o Dr. Lucas digitou "Orçamento" e a Ana
 * respondeu *"Parece que houve um problema em reenviar o PDF do orçamento.
 * Talvez seja necessário gerar um novo orçamento."* — frase que a regra #11 do
 * script proíbe literalmente.
 *
 * A tool tinha feito a coisa certa: não havia orçamento vigente naquele
 * atendimento. O problema foi COMO ela disse isso:
 *
 *   { ok: true, enviado: false, motivo: "Nao ha orcamento vigente com PDF neste
 *     atendimento. Nao prometa o arquivo: conduza a qualificacao ou gere um
 *     orcamento novo." }
 *
 * Esse `motivo` é uma instrução escrita PARA o modelo, trafegando no mesmo
 * canal que os dados. O GPT-4o fez o que qualquer modelo faria: parafraseou
 * para a paciente. E como o retorno era `ok: true`, nenhuma guarda do loop
 * tratou como falha.
 *
 * A regra que fica: **tool devolve código, não prosa**. Quem transforma código
 * em frase é o loop, de forma determinística, ou o system prompt — nunca um
 * texto solto no meio do JSON.
 */

export const MOTIVOS_TOOL = {
  /** Não existe orçamento válido neste atendimento para reenviar. */
  SEM_ORCAMENTO_VIGENTE: "sem_orcamento_vigente",
  /** Faltou contatoId/conversaId/midiaId na chamada. */
  PARAMETROS_AUSENTES: "parametros_ausentes",
  /** O id de mídia não existe mais (ou foi removido do catálogo). */
  MIDIA_NAO_ENCONTRADA: "midia_nao_encontrada",
  /**
   * Ainda não é hora de mostrar resultado — o caso não chegou ao orçamento.
   * Regra do Dr. Lucas de 30/07/2026; ver a trava em `enviar-midia/route.ts`.
   */
  MIDIA_FORA_DA_ETAPA: "midia_fora_da_etapa",
  /** O arquivo não está no Storage — ver midia-marketing-storage.ts. */
  ARQUIVO_INDISPONIVEL: "arquivo_indisponivel",
  /** Falha de rede/Uazapi no envio. */
  FALHA_ENVIO: "falha_envio",
  /** Nenhuma config_whatsapp ativa. */
  WHATSAPP_NAO_CONFIGURADO: "whatsapp_nao_configurado",
  /** Contato não encontrado. */
  CONTATO_NAO_ENCONTRADO: "contato_nao_encontrado",
  /** Conversa não encontrada para o contato. */
  CONVERSA_NAO_ENCONTRADA: "conversa_nao_encontrada",
} as const

export type MotivoTool = (typeof MOTIVOS_TOOL)[keyof typeof MOTIVOS_TOOL]
