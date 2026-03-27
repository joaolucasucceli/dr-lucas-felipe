// ============================================================
// Configuração centralizada do site — Dr. Lucas Felipe
// Estes valores são usados como FALLBACK quando o banco de dados
// não tem ConfigSite cadastrada. Os dados reais são gerenciados
// pelo painel em /configuracoes/site.
// ============================================================

const config = {
  whatsapp: {
    numero: "5511999999999",
    mensagem: "Olá! Gostaria de agendar uma avaliação com o Dr. Lucas Felipe.",
  },

  medico: {
    nome: "Dr. Lucas Felipe P. Ferreira",
    nomeCompleto: "Dr. Lucas Felipe P. Ferreira",
    especialidade: "Medicina Estética — Contorno Corporal",
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

/** Monta o objeto SiteConfigProps a partir do fallback estático */
export function buildFallbackConfig(): SiteConfigProps {
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
