-- Index em mensagens_whatsapp.replyToId — sem ele, o JOIN
-- replyTo:mensagens_whatsapp!replyToId(...) usado em
-- GET /api/contatos/[id] vira N+1 implicito por mensagem.
-- Conversa com 200 mensagens = 200 lookups full-scan.
CREATE INDEX IF NOT EXISTS idx_mensagens_whatsapp_replyToId
  ON mensagens_whatsapp("replyToId")
  WHERE "replyToId" IS NOT NULL;
