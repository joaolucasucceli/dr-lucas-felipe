// ============================================================
// Configuração centralizada do site — Dr. Lucas Ferreira
// Fonte única da verdade para todos os textos institucionais.
// Edição é feita direto no código quando o Dr. Lucas pedir
// (não há mais editor no painel).
// ============================================================

const config = {
  whatsapp: {
    numero: "5511999999999",
    mensagem: "Olá! Gostaria de agendar uma avaliação com o Dr. Lucas Ferreira.",
  },

  medico: {
    nome: "Dr. Lucas Ferreira",
    nomeCompleto: "Dr. Lucas Ferreira",
    especialidade: "Estética Avançada — Contorno Corporal",
    crm: "CRM/SP 123456",
  },

  redesSociais: {
    instagram: "https://instagram.com/dr.lucasfelipe",
  },

  contato: {
    telefone: "+55 11 99999-9999",
    endereco: "Av. Paulista, 1000 — Sala 501",
    cidade: "São Paulo — SP",
  },
} as const

// Link do WhatsApp (derivado automaticamente)
export const WHATSAPP_LINK = `https://wa.me/${config.whatsapp.numero}?text=${encodeURIComponent(config.whatsapp.mensagem)}`

export const SITE_CONFIG = config

// ============================================================
// Tipo compartilhado para props dos componentes do site
// ============================================================

export interface SiteConfigProps {
  whatsappLink: string
  medicoNome: string
  medicoEspecialidade: string
  medicoCrm: string
  instagramUrl: string
  contatoTelefone: string
  contatoEndereco: string
  contatoCidade: string
}

/** Monta o objeto SiteConfigProps a partir do SITE_CONFIG */
export function buildSiteConfig(): SiteConfigProps {
  return {
    whatsappLink: WHATSAPP_LINK,
    medicoNome: config.medico.nomeCompleto,
    medicoEspecialidade: config.medico.especialidade,
    medicoCrm: config.medico.crm,
    instagramUrl: config.redesSociais.instagram,
    contatoTelefone: config.contato.telefone,
    contatoEndereco: config.contato.endereco,
    contatoCidade: config.contato.cidade,
  }
}
