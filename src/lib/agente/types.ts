/** Shape comum de contato usado em envios automaticos do agente
 *  (confirmacao + followup). procedimentoInteresse e opcional —
 *  followup consome; confirmacao ignora. */
export interface ContatoAgente {
  id: string
  nome: string
  whatsapp: string
  procedimentoInteresse?: string | null
}

export interface ConfigWhatsappAtivo {
  uazapiUrl: string
  instanceToken: string | null
}
