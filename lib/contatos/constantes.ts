/** Nome historico do bucket Supabase Storage onde ficam fotos de contatos.
 *  Mantido como "fotos-leads" pois o bucket fisico nao foi renomeado.
 *  A migracao fisica (copiar arquivos, atualizar URLs, deletar antigo) esta
 *  trackeada em JLAU-607. Ate la, use sempre esta constante no codigo. */
export const BUCKET_FOTOS_CONTATO = "fotos-leads"
