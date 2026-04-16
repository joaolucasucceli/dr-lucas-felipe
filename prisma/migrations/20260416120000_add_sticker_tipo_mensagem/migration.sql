-- Adiciona o valor 'sticker' ao enum TipoMensagem para suportar figurinhas
-- recebidas via WhatsApp/UazapiGO.
ALTER TYPE "TipoMensagem" ADD VALUE IF NOT EXISTS 'sticker';
