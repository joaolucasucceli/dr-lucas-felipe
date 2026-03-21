import { PrismaClient } from "../generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { hash } from "bcryptjs"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

// ── helpers de data (base = 2026-03-21 meio-dia BRT) ──────────────────────────
const B = new Date("2026-03-21T15:00:00.000Z")
const ago = (n: number): Date => { const d = new Date(B); d.setDate(d.getDate() - n); return d }
const fwd = (n: number): Date => { const d = new Date(B); d.setDate(d.getDate() + n); return d }
const atHour = (base: Date, utcH: number): Date => { const d = new Date(base); d.setUTCHours(utcH, 0, 0, 0); return d }

// ── variação por índice ────────────────────────────────────────────────────────
const IDADES = [24, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 38, 40]
const OBJETIVOS = [
  "quero um bumbum mais definido e levantado",
  "quero melhorar meu contorno corporal e autoestima",
  "quero eliminar gordura localizada e ter mais definição",
  "sempre sonhei com essa transformação",
  "quero recuperar minha confiança após emagrecer",
  "quero um resultado natural e harmonioso",
  "me incomoda muito a gordura na barriga e nos flancos",
  "quero me sentir bem de biquíni novamente",
  "quero resultado duradouro sem precisar de dieta extrema",
  "quero harmonizar minha silhueta",
]

// ── gerador de mensagens por estágio ──────────────────────────────────────────
function buildMsgs(
  pfx: string,
  whatsapp: string,
  nome: string,
  procNome: string,
  status: string,
  baseDt: Date,
  idx: number,
): Array<{ id: string; messageIdWhatsapp: string; tipo: string; conteudo: string; remetente: string; criadoEm: Date }> {
  const fn = nome.split(" ")[0]
  const idade = IDADES[idx % IDADES.length]
  const obj = OBJETIVOS[idx % OBJETIVOS.length]
  const min = (n: number) => new Date(baseDt.getTime() + n * 7 * 60000)
  const mk = (n: number, c: string, r: string) => ({
    id: `${pfx}-${String(n).padStart(2, "0")}`,
    messageIdWhatsapp: `wamid.${pfx}.${String(n).padStart(2, "0")}`,
    tipo: "texto",
    conteudo: c,
    remetente: r,
    criadoEm: min(n),
  })

  const all = [
    mk(1, `Olá! Vi sobre o Dr. Lucas no Instagram e tenho interesse em ${procNome}. Poderia me dar mais informações?`, whatsapp),
    mk(2, `Olá, ${fn}! 😊 Aqui é a Ana Júlia, assistente virtual da clínica do Dr. Lucas Felipe. Que bom que você entrou em contato! Para te ajudar melhor, me conta: quantos anos você tem e qual é seu objetivo com ${procNome}?`, "bot"),
    mk(3, `Tenho ${idade} anos e ${obj}.`, whatsapp),
    mk(4, `Perfeito, ${fn}! O Dr. Lucas trabalha com uma abordagem muito natural e personalizada. Antes de prosseguirmos, você tem alguma condição de saúde como diabetes, hipertensão, problemas cardíacos ou de coagulação?`, "bot"),
    mk(5, `Não, sou saudável. Nunca tive nenhum problema de saúde relevante.`, whatsapp),
    mk(6, `Ótimo! 😊 Temos disponibilidade para consulta presencial com o Dr. Lucas. Você prefere horário de manhã ou à tarde?`, "bot"),
    mk(7, `Prefiro de manhã, antes das 11h.`, whatsapp),
    mk(8, `Vou verificar os horários disponíveis para você. Pode aguardar um instante?`, "bot"),
    mk(9, `Pode sim, fico no aguardo!`, whatsapp),
    mk(10, `Consulta confirmada! ✅ Dr. Lucas te aguarda. Nosso endereço: Av. Paulista, 1000 — Sala 810, Bela Vista, São Paulo. Qualquer dúvida, pode me chamar aqui!`, "bot"),
    mk(11, `Olá ${fn}! 😊 Passando para confirmar sua consulta de amanhã com o Dr. Lucas. Tudo certo?`, "bot"),
    mk(12, `Confirmado! Estarei lá. Preciso levar algum documento?`, whatsapp),
    mk(13, `Pode trazer RG ou CNH e, se tiver, exames recentes (hemograma, coagulação). Até amanhã! 💙`, "bot"),
    mk(14, `Olá ${fn}! 😊 Como foi a consulta com o Dr. Lucas? Espero que tudo tenha corrido bem!`, "bot"),
    mk(15, `Foi incrível! Dr. Lucas foi super atencioso e esclareceu todas as minhas dúvidas. Adorei a clínica!`, whatsapp),
    mk(16, `Que ótimo! 💙 O Dr. Lucas ficou muito satisfeito com seu perfil. Para reservarmos sua data, o valor do sinal é de R$ 2.000 (descontado do total do procedimento). Posso te passar as formas de pagamento?`, "bot"),
    mk(17, `Pode sim! Quero confirmar logo minha data. Qual é a chave do PIX?`, whatsapp),
    mk(18, `PIX: CNPJ 12.345.678/0001-90. Assim que confirmarmos o recebimento, envio o contrato e todas as orientações pré-operatórias. 🎉`, "bot"),
    mk(19, `Enviei o comprovante agora! Pode confirmar o recebimento?`, whatsapp),
    mk(20, `Recebemos, ${fn}! 🎉 Seu procedimento está reservado. Em breve enviarei as orientações pré-operatórias completas. Qualquer dúvida, estou aqui!`, "bot"),
  ]

  const counts: Record<string, number> = {
    primeiro_atendimento: 3,
    qualificacao: 5,
    agendamento: 8,
    consulta_agendada: 10,
    consulta_realizada: 14,
    sinal_pago: 18,
    procedimento_agendado: 20,
    concluido: 20,
    perdido: 5,
  }

  return all.slice(0, counts[status] ?? 3)
}

// ── definição dos leads ────────────────────────────────────────────────────────
type LeadSeed = {
  num: number
  nome: string
  whatsapp: string
  email?: string
  proc: "miniLipo" | "lipoGlutea" | "pmma"
  status: "concluido" | "procedimento_agendado" | "sinal_pago" | "consulta_realizada" | "consulta_agendada" | "agendamento" | "qualificacao" | "primeiro_atendimento" | "perdido"
  origem: string
  sobreOPaciente: string
  diasAtras: number
  lgpd: boolean
  resp: "ia" | "maria"
  motivoPerda?: string
  // appointment config
  consultaDias?: number       // negativo = passado, positivo = futuro
  procedimentoDias?: number   // negativo = passado, positivo = futuro
}

const LEADS: LeadSeed[] = [
  // ── CONCLUÍDO (6) ── created 130-180 days ago ────────────────────────────────
  { num: 1, nome: "Fernanda Oliveira", whatsapp: "11991120001", email: "fernanda.oliveira@gmail.com", proc: "lipoGlutea", status: "concluido", origem: "instagram", sobreOPaciente: "32 anos, IMC 24, saudável. Interesse em lipo com enxertia glútea para definição e volume. Exames pré-op normais. Procedimento realizado em 10/01/2026 com excelente resultado.", diasAtras: 178, lgpd: true, resp: "ia", consultaDias: -150, procedimentoDias: -70 },
  { num: 2, nome: "Juliana Martins", whatsapp: "11991120002", email: "juliana.martins@hotmail.com", proc: "miniLipo", status: "concluido", origem: "indicacao", sobreOPaciente: "29 anos, IMC 23, saudável. Mini lipo de abdômen e flancos. Exames normais. Procedimento realizado em 05/11/2025. Pós-operatório sem intercorrências.", diasAtras: 165, lgpd: true, resp: "ia", consultaDias: -140, procedimentoDias: -55 },
  { num: 3, nome: "Patrícia Santos", whatsapp: "11991120003", email: "patricia.santos@gmail.com", proc: "lipoGlutea", status: "concluido", origem: "instagram", sobreOPaciente: "34 anos, IMC 25, saudável. BBL com ênfase em projeção lateral. Exames normais. Procedimento realizado em 20/11/2025.", diasAtras: 155, lgpd: true, resp: "ia", consultaDias: -130, procedimentoDias: -55 },
  { num: 4, nome: "Renata Lima", whatsapp: "11991120004", email: "renata.lima@outlook.com", proc: "pmma", status: "concluido", origem: "google", sobreOPaciente: "27 anos, IMC 22, saudável. PMMA para preenchimento glúteo. Primeira sessão realizada em 18/10/2025 com resultado excelente.", diasAtras: 148, lgpd: true, resp: "maria", consultaDias: -120, procedimentoDias: -48 },
  { num: 5, nome: "Gabriela Costa", whatsapp: "11991120005", email: "gabriela.costa@gmail.com", proc: "miniLipo", status: "concluido", origem: "indicacao", sobreOPaciente: "31 anos, IMC 24. Mini lipo de braços e culote. Exames normais. Procedimento realizado em 30/10/2025. Alta recebida.", diasAtras: 140, lgpd: true, resp: "ia", consultaDias: -115, procedimentoDias: -50 },
  { num: 6, nome: "Tatiana Rocha", whatsapp: "11991120006", email: "tatiana.rocha@gmail.com", proc: "lipoGlutea", status: "concluido", origem: "instagram", sobreOPaciente: "36 anos, IMC 26, saudável. BBL com lipo de abdômen. Procedimento realizado em 12/11/2025. Resultado muito satisfatório.", diasAtras: 132, lgpd: true, resp: "ia", consultaDias: -108, procedimentoDias: -45 },

  // ── PROCEDIMENTO AGENDADO (8) ── created 90-128 days ago ────────────────────
  { num: 7, nome: "Isabela Mendes", whatsapp: "11991120007", email: "isabela.mendes@gmail.com", proc: "lipoGlutea", status: "procedimento_agendado", origem: "instagram", sobreOPaciente: "30 anos, IMC 24, saudável. BBL planejado. Sinal pago. Exames normais. Procedimento agendado para 05/04/2026.", diasAtras: 128, lgpd: true, resp: "ia", consultaDias: -100, procedimentoDias: 15 },
  { num: 8, nome: "Larissa Alves", whatsapp: "11991120008", email: "larissa.alves@hotmail.com", proc: "miniLipo", status: "procedimento_agendado", origem: "indicacao", sobreOPaciente: "28 anos, IMC 23. Mini lipo de abdômen. Sinal pago. Procedimento agendado para 10/04/2026.", diasAtras: 122, lgpd: true, resp: "ia", consultaDias: -95, procedimentoDias: 20 },
  { num: 9, nome: "Mônica Pereira", whatsapp: "11991120009", email: "monica.pereira@gmail.com", proc: "lipoGlutea", status: "procedimento_agendado", origem: "google", sobreOPaciente: "33 anos, saudável. BBL — ênfase em projeção posterior. Sinal recebido. Procedimento: 15/04/2026.", diasAtras: 116, lgpd: true, resp: "ia", consultaDias: -90, procedimentoDias: 25 },
  { num: 10, nome: "Natasha Vieira", whatsapp: "11991120010", email: "natasha.vieira@outlook.com", proc: "miniLipo", status: "procedimento_agendado", origem: "instagram", sobreOPaciente: "26 anos, IMC 22. Mini lipo flancos e culote. Sinal pago. Procedimento: 08/04/2026.", diasAtras: 110, lgpd: true, resp: "ia", consultaDias: -85, procedimentoDias: 18 },
  { num: 11, nome: "Beatriz Carvalho", whatsapp: "11991120011", email: "beatriz.carvalho@gmail.com", proc: "lipoGlutea", status: "procedimento_agendado", origem: "indicacao", sobreOPaciente: "29 anos, saudável. BBL com foco em volume e harmonia. Sinal pago. Procedimento: 12/04/2026.", diasAtras: 105, lgpd: true, resp: "maria", consultaDias: -80, procedimentoDias: 22 },
  { num: 12, nome: "Cristina Nunes", whatsapp: "11991120012", email: "cristina.nunes@gmail.com", proc: "pmma", status: "procedimento_agendado", origem: "google", sobreOPaciente: "38 anos, saudável. PMMA — preenchimento glúteo 2ª sessão planejada. Procedimento: 01/04/2026.", diasAtras: 100, lgpd: true, resp: "ia", consultaDias: -75, procedimentoDias: 11 },
  { num: 13, nome: "Priscila Gomes", whatsapp: "11991120013", email: "priscila.gomes@hotmail.com", proc: "lipoGlutea", status: "procedimento_agendado", origem: "instagram", sobreOPaciente: "31 anos, IMC 25. BBL. Sinal pago. Exames normais. Procedimento: 18/04/2026.", diasAtras: 96, lgpd: true, resp: "ia", consultaDias: -70, procedimentoDias: 28 },
  { num: 14, nome: "Sandra Rodrigues", whatsapp: "11991120014", email: "sandra.rodrigues@gmail.com", proc: "miniLipo", status: "procedimento_agendado", origem: "indicacao", sobreOPaciente: "40 anos, saudável. Mini lipo abdômen após emagrecimento. Sinal pago. Procedimento: 22/04/2026.", diasAtras: 92, lgpd: true, resp: "maria", consultaDias: -65, procedimentoDias: 32 },

  // ── SINAL PAGO (7) ── created 70-90 days ago ────────────────────────────────
  { num: 15, nome: "Amanda Barbosa", whatsapp: "11991120015", email: "amanda.barbosa@gmail.com", proc: "lipoGlutea", status: "sinal_pago", origem: "instagram", sobreOPaciente: "27 anos, IMC 23. BBL — boa candidata segundo Dr. Lucas. Sinal de R$2.000 recebido em 10/02/2026. Aguardando agendamento de data.", diasAtras: 90, lgpd: true, resp: "ia", consultaDias: -60 },
  { num: 16, nome: "Vanessa Araújo", whatsapp: "11991120016", email: "vanessa.araujo@hotmail.com", proc: "miniLipo", status: "sinal_pago", origem: "indicacao", sobreOPaciente: "32 anos, saudável. Mini lipo abdômen e flancos. Sinal recebido em 14/02/2026.", diasAtras: 85, lgpd: true, resp: "ia", consultaDias: -58 },
  { num: 17, nome: "Thaís Cardoso", whatsapp: "11991120017", email: "thais.cardoso@gmail.com", proc: "lipoGlutea", status: "sinal_pago", origem: "google", sobreOPaciente: "29 anos, IMC 24. BBL. Sinal pago. Ótima candidata. Escolhendo data.", diasAtras: 80, lgpd: true, resp: "ia", consultaDias: -55 },
  { num: 18, nome: "Luciana Monteiro", whatsapp: "11991120018", email: "luciana.monteiro@outlook.com", proc: "pmma", status: "sinal_pago", origem: "instagram", sobreOPaciente: "35 anos, saudável. PMMA — paciente entusiasta, consultou bem. Sinal pago em 20/02/2026.", diasAtras: 78, lgpd: true, resp: "maria", consultaDias: -50 },
  { num: 19, nome: "Edilaine Souza", whatsapp: "11991120019", email: "edilaine.souza@gmail.com", proc: "lipoGlutea", status: "sinal_pago", origem: "indicacao", sobreOPaciente: "33 anos, IMC 25. BBL com lipo de abdômen. Sinal recebido. Elegendo data de procedimento.", diasAtras: 75, lgpd: true, resp: "ia", consultaDias: -48 },
  { num: 20, nome: "Flávia Guimarães", whatsapp: "11991120020", email: "flavia.guimaraes@gmail.com", proc: "miniLipo", status: "sinal_pago", origem: "instagram", sobreOPaciente: "30 anos, IMC 23. Mini lipo braços e culote. Sinal pago em 25/02/2026.", diasAtras: 73, lgpd: true, resp: "ia", consultaDias: -45 },
  { num: 21, nome: "Simone Fonseca", whatsapp: "11991120021", email: "simone.fonseca@hotmail.com", proc: "lipoGlutea", status: "sinal_pago", origem: "google", sobreOPaciente: "28 anos, saudável. BBL. Consultou, gostou muito do Dr. Lucas. Sinal pago em 01/03/2026.", diasAtras: 70, lgpd: true, resp: "ia", consultaDias: -42 },

  // ── CONSULTA REALIZADA (10) ── created 45-68 days ago ───────────────────────
  { num: 22, nome: "Andressa Lima", whatsapp: "11991120022", email: "andressa.lima@gmail.com", proc: "lipoGlutea", status: "consulta_realizada", origem: "instagram", sobreOPaciente: "26 anos, IMC 22, saudável. Consultou em 20/02/2026. Dr. Lucas avaliou positivamente. Aguardando decisão para sinal.", diasAtras: 68, lgpd: true, resp: "ia", consultaDias: -38 },
  { num: 23, nome: "Cíntia Moreira", whatsapp: "11991120023", email: "cintia.moreira@outlook.com", proc: "miniLipo", status: "consulta_realizada", origem: "indicacao", sobreOPaciente: "34 anos, IMC 24. Consultou em 22/02/2026. Excelente candidata para mini lipo. Pensando na data.", diasAtras: 62, lgpd: true, resp: "ia", consultaDias: -35 },
  { num: 24, nome: "Daniela Ramos", whatsapp: "11991120024", email: "daniela.ramos@gmail.com", proc: "lipoGlutea", status: "consulta_realizada", origem: "instagram", sobreOPaciente: "31 anos, saudável. Consultou em 25/02/2026. BBL avaliado positivamente. Pensando nos próximos passos.", diasAtras: 58, lgpd: true, resp: "ia", consultaDias: -30 },
  { num: 25, nome: "Eliane Pinto", whatsapp: "11991120025", email: "eliane.pinto@hotmail.com", proc: "pmma", status: "consulta_realizada", origem: "google", sobreOPaciente: "38 anos, saudável. Consultou em 27/02/2026. PMMA indicado pelo Dr. Lucas. Avaliou bem.", diasAtras: 55, lgpd: true, resp: "maria", consultaDias: -28 },
  { num: 26, nome: "Giovanna Nascimento", whatsapp: "11991120026", email: "giovanna.nascimento@gmail.com", proc: "lipoGlutea", status: "consulta_realizada", origem: "instagram", sobreOPaciente: "24 anos, IMC 21. Consultou em 01/03/2026. BBL — candidata ideal. Aguardando confirmação.", diasAtras: 52, lgpd: true, resp: "ia", consultaDias: -25 },
  { num: 27, nome: "Helena Ribeiro", whatsapp: "11991120027", email: "helena.ribeiro@gmail.com", proc: "miniLipo", status: "consulta_realizada", origem: "indicacao", sobreOPaciente: "36 anos, IMC 25. Consultou em 03/03/2026. Mini lipo abdômen e flancos aprovada.", diasAtras: 50, lgpd: true, resp: "ia", consultaDias: -22 },
  { num: 28, nome: "Ingrid Castro", whatsapp: "11991120028", email: "ingrid.castro@outlook.com", proc: "lipoGlutea", status: "consulta_realizada", origem: "instagram", sobreOPaciente: "27 anos, saudável. Consultou em 05/03/2026. Dr. Lucas aprovou. BBL com foco em projeção.", diasAtras: 48, lgpd: true, resp: "ia", consultaDias: -20 },
  { num: 29, nome: "Josiane Lopes", whatsapp: "11991120029", email: "josiane.lopes@gmail.com", proc: "pmma", status: "consulta_realizada", origem: "google", sobreOPaciente: "33 anos, saudável. Consultou em 06/03/2026. PMMA avaliado. Resultado esperado discutido.", diasAtras: 47, lgpd: true, resp: "maria", consultaDias: -18 },
  { num: 30, nome: "Kátia Melo", whatsapp: "11991120030", email: "katia.melo@hotmail.com", proc: "lipoGlutea", status: "consulta_realizada", origem: "indicacao", sobreOPaciente: "40 anos, saudável. Consultou em 08/03/2026. Candidata ao BBL com necessidade de lipo doadora.", diasAtras: 45, lgpd: true, resp: "ia", consultaDias: -16 },
  { num: 31, nome: "Letícia Borges", whatsapp: "11991120031", email: "leticia.borges@gmail.com", proc: "miniLipo", status: "consulta_realizada", origem: "instagram", sobreOPaciente: "29 anos, IMC 23. Consultou em 10/03/2026. Mini lipo aprovada para culote e flancos.", diasAtras: 45, lgpd: true, resp: "ia", consultaDias: -14 },

  // ── CONSULTA AGENDADA (8) ── created 20-42 days ago ─────────────────────────
  { num: 32, nome: "Mariana Dias", whatsapp: "11991120032", email: "mariana.dias@gmail.com", proc: "lipoGlutea", status: "consulta_agendada", origem: "instagram", sobreOPaciente: "28 anos, IMC 22. Consulta agendada para 28/03/2026 às 9h.", diasAtras: 42, lgpd: true, resp: "ia", consultaDias: 7 },
  { num: 33, nome: "Nayara Freitas", whatsapp: "11991120033", email: "nayara.freitas@outlook.com", proc: "miniLipo", status: "consulta_agendada", origem: "indicacao", sobreOPaciente: "32 anos, saudável. Consulta agendada para 26/03/2026 às 10h.", diasAtras: 38, lgpd: true, resp: "ia", consultaDias: 5 },
  { num: 34, nome: "Paula Machado", whatsapp: "11991120034", email: "paula.machado@gmail.com", proc: "lipoGlutea", status: "consulta_agendada", origem: "google", sobreOPaciente: "35 anos, saudável. Consulta agendada para 01/04/2026 às 9h.", diasAtras: 35, lgpd: true, resp: "ia", consultaDias: 11 },
  { num: 35, nome: "Queila Rodrigues", whatsapp: "11991120035", email: "queila.rodrigues@hotmail.com", proc: "pmma", status: "consulta_agendada", origem: "instagram", sobreOPaciente: "30 anos, IMC 23. Consulta marcada para 25/03/2026 às 11h.", diasAtras: 32, lgpd: true, resp: "maria", consultaDias: 4 },
  { num: 36, nome: "Regina Oliveira", whatsapp: "11991120036", email: "regina.oliveira@gmail.com", proc: "lipoGlutea", status: "consulta_agendada", origem: "indicacao", sobreOPaciente: "27 anos, saudável. Consulta agendada para 02/04/2026.", diasAtras: 28, lgpd: true, resp: "ia", consultaDias: 12 },
  { num: 37, nome: "Sônia Cavalcanti", whatsapp: "11991120037", email: "sonia.cavalcanti@gmail.com", proc: "miniLipo", status: "consulta_agendada", origem: "instagram", sobreOPaciente: "38 anos, saudável. Consulta: 24/03/2026 às 10h.", diasAtras: 25, lgpd: true, resp: "ia", consultaDias: 3 },
  { num: 38, nome: "Tereza Nogueira", whatsapp: "11991120038", email: "tereza.nogueira@outlook.com", proc: "lipoGlutea", status: "consulta_agendada", origem: "google", sobreOPaciente: "33 anos, IMC 24. Consulta marcada para 03/04/2026.", diasAtras: 22, lgpd: true, resp: "ia", consultaDias: 13 },
  { num: 39, nome: "Viviane Torres", whatsapp: "11991120039", email: "viviane.torres@gmail.com", proc: "miniLipo", status: "consulta_agendada", origem: "instagram", sobreOPaciente: "29 anos, saudável. Consulta: 23/03/2026 às 9h.", diasAtras: 20, lgpd: true, resp: "ia", consultaDias: 2 },

  // ── AGENDAMENTO (10) ── created 10-20 days ago ───────────────────────────────
  { num: 40, nome: "Adriana Brito", whatsapp: "11991120040", email: "adriana.brito@gmail.com", proc: "lipoGlutea", status: "agendamento", origem: "instagram", sobreOPaciente: "30 anos, IMC 23, saudável. Interesse em BBL. Qualificada. Em processo de agendamento de consulta.", diasAtras: 20, lgpd: true, resp: "ia" },
  { num: 41, nome: "Bianca Cunha", whatsapp: "11991120041", email: "bianca.cunha@hotmail.com", proc: "miniLipo", status: "agendamento", origem: "indicacao", sobreOPaciente: "25 anos, saudável. Mini lipo flancos. Qualificada. Escolhendo data da consulta.", diasAtras: 18, lgpd: true, resp: "ia" },
  { num: 42, nome: "Carolina Esteves", whatsapp: "11991120042", email: "carolina.esteves@gmail.com", proc: "lipoGlutea", status: "agendamento", origem: "instagram", sobreOPaciente: "31 anos, IMC 24. BBL. Qualificada pelo agente IA. Aguardando data.", diasAtras: 17, lgpd: true, resp: "ia" },
  { num: 43, nome: "Débora Farias", whatsapp: "11991120043", email: "debora.farias@gmail.com", proc: "pmma", status: "agendamento", origem: "google", sobreOPaciente: "36 anos, saudável. PMMA. Qualificada. Aguardando confirmação de horário.", diasAtras: 16, lgpd: true, resp: "maria" },
  { num: 44, nome: "Emília Godoy", whatsapp: "11991120044", email: "emilia.godoy@outlook.com", proc: "miniLipo", status: "agendamento", origem: "instagram", sobreOPaciente: "28 anos, saudável. Mini lipo abdômen. Qualificada. Verificando disponibilidade de agenda.", diasAtras: 15, lgpd: true, resp: "ia" },
  { num: 45, nome: "Fabiana Henrique", whatsapp: "11991120045", email: "fabiana.henrique@gmail.com", proc: "lipoGlutea", status: "agendamento", origem: "indicacao", sobreOPaciente: "34 anos, IMC 25. BBL. Qualificada. Aguarda confirmação de data pela equipe.", diasAtras: 14, lgpd: true, resp: "ia" },
  { num: 46, nome: "Gisele Ivo", whatsapp: "11991120046", email: "gisele.ivo@gmail.com", proc: "miniLipo", status: "agendamento", origem: "instagram", sobreOPaciente: "27 anos, saudável. Mini lipo culote e flancos. Qualificada. Escolhendo turno.", diasAtras: 13, lgpd: true, resp: "ia" },
  { num: 47, nome: "Hanna Santos", whatsapp: "11991120047", email: "hanna.santos@hotmail.com", proc: "lipoGlutea", status: "agendamento", origem: "google", sobreOPaciente: "29 anos, IMC 22. BBL. Qualificada. Aguardando proposta de horário.", diasAtras: 12, lgpd: true, resp: "ia" },
  { num: 48, nome: "Iracema Kato", whatsapp: "11991120048", email: "iracema.kato@gmail.com", proc: "pmma", status: "agendamento", origem: "instagram", sobreOPaciente: "33 anos, saudável. PMMA preenchimento glúteo. Qualificada. Em processo de agendamento.", diasAtras: 11, lgpd: true, resp: "maria" },
  { num: 49, nome: "Jaqueline Lima", whatsapp: "11991120049", email: "jaqueline.lima@outlook.com", proc: "lipoGlutea", status: "agendamento", origem: "indicacao", sobreOPaciente: "26 anos, IMC 23. BBL. Qualificada. Verificando datas disponíveis.", diasAtras: 10, lgpd: true, resp: "ia" },

  // ── QUALIFICAÇÃO (12) ── created 5-10 days ago ───────────────────────────────
  { num: 50, nome: "Lívia Neves", whatsapp: "11991120050", email: "livia.neves@gmail.com", proc: "lipoGlutea", status: "qualificacao", origem: "instagram", sobreOPaciente: "27 anos, sem comorbidades. Interessada em BBL. Em qualificação.", diasAtras: 10, lgpd: false, resp: "ia" },
  { num: 51, nome: "Marta Oliveira", whatsapp: "11991120051", email: "marta.oliveira@hotmail.com", proc: "miniLipo", status: "qualificacao", origem: "indicacao", sobreOPaciente: "35 anos, saudável. Mini lipo abdômen. Qualificando.", diasAtras: 9, lgpd: false, resp: "ia" },
  { num: 52, nome: "Nadine Pacheco", whatsapp: "11991120052", email: "nadine.pacheco@gmail.com", proc: "lipoGlutea", status: "qualificacao", origem: "instagram", sobreOPaciente: "29 anos, saudável. BBL. Em qualificação pelo agente.", diasAtras: 9, lgpd: false, resp: "ia" },
  { num: 53, nome: "Odília Quintas", whatsapp: "11991120053", proc: "pmma", status: "qualificacao", origem: "google", sobreOPaciente: "40 anos, saudável. PMMA. Em qualificação.", diasAtras: 8, lgpd: false, resp: "maria" },
  { num: 54, nome: "Priscila Rezende", whatsapp: "11991120054", email: "priscila.rezende@outlook.com", proc: "lipoGlutea", status: "qualificacao", origem: "instagram", sobreOPaciente: "31 anos, IMC 24. BBL. Qualificando.", diasAtras: 8, lgpd: false, resp: "ia" },
  { num: 55, nome: "Rosa Tavares", whatsapp: "11991120055", proc: "miniLipo", status: "qualificacao", origem: "indicacao", sobreOPaciente: "38 anos, saudável. Mini lipo. Em qualificação.", diasAtras: 7, lgpd: false, resp: "ia" },
  { num: 56, nome: "Sabrina Uzeda", whatsapp: "11991120056", email: "sabrina.uzeda@gmail.com", proc: "lipoGlutea", status: "qualificacao", origem: "instagram", sobreOPaciente: "25 anos, saudável. BBL. Em qualificação.", diasAtras: 7, lgpd: false, resp: "ia" },
  { num: 57, nome: "Talita Vaz", whatsapp: "11991120057", proc: "pmma", status: "qualificacao", origem: "google", sobreOPaciente: "32 anos, saudável. PMMA. Em qualificação.", diasAtras: 6, lgpd: false, resp: "maria" },
  { num: 58, nome: "Urânia Winck", whatsapp: "11991120058", email: "urania.winck@hotmail.com", proc: "lipoGlutea", status: "qualificacao", origem: "instagram", sobreOPaciente: "27 anos, IMC 23. BBL. Em qualificação.", diasAtras: 6, lgpd: false, resp: "ia" },
  { num: 59, nome: "Vera Xavier", whatsapp: "11991120059", proc: "miniLipo", status: "qualificacao", origem: "indicacao", sobreOPaciente: "33 anos, saudável. Mini lipo. Qualificando.", diasAtras: 5, lgpd: false, resp: "ia" },
  { num: 60, nome: "Wanda Yunes", whatsapp: "11991120060", email: "wanda.yunes@gmail.com", proc: "lipoGlutea", status: "qualificacao", origem: "instagram", sobreOPaciente: "30 anos, IMC 22. BBL. Em qualificação.", diasAtras: 5, lgpd: false, resp: "ia" },
  { num: 61, nome: "Xênia Zanini", whatsapp: "11991120061", proc: "pmma", status: "qualificacao", origem: "google", sobreOPaciente: "28 anos, saudável. PMMA. Em qualificação pelo agente.", diasAtras: 5, lgpd: false, resp: "maria" },

  // ── PRIMEIRO ATENDIMENTO (15) ── created 0-5 days ago ───────────────────────
  { num: 62, nome: "Yasmin Abreu", whatsapp: "11991120062", proc: "lipoGlutea", status: "primeiro_atendimento", origem: "instagram", sobreOPaciente: "24 anos. Primeiro contato: interesse em BBL.", diasAtras: 5, lgpd: false, resp: "ia" },
  { num: 63, nome: "Zilmara Batista", whatsapp: "11991120063", proc: "miniLipo", status: "primeiro_atendimento", origem: "indicacao", sobreOPaciente: "29 anos. Primeiro contato: interesse em mini lipo.", diasAtras: 4, lgpd: false, resp: "ia" },
  { num: 64, nome: "Aline Cabral", whatsapp: "11991120064", email: "aline.cabral@gmail.com", proc: "lipoGlutea", status: "primeiro_atendimento", origem: "instagram", sobreOPaciente: "26 anos. Primeiro contato via Instagram.", diasAtras: 4, lgpd: false, resp: "ia" },
  { num: 65, nome: "Brenda Dantas", whatsapp: "11991120065", proc: "miniLipo", status: "primeiro_atendimento", origem: "google", sobreOPaciente: "31 anos. Primeiro contato via Google.", diasAtras: 3, lgpd: false, resp: "ia" },
  { num: 66, nome: "Catarina Estrada", whatsapp: "11991120066", email: "catarina.estrada@gmail.com", proc: "lipoGlutea", status: "primeiro_atendimento", origem: "instagram", sobreOPaciente: "28 anos. Primeiro contato: perguntou sobre BBL.", diasAtras: 3, lgpd: false, resp: "ia" },
  { num: 67, nome: "Diana Fonseca", whatsapp: "11991120067", proc: "pmma", status: "primeiro_atendimento", origem: "instagram", sobreOPaciente: "35 anos. Primeiro contato: PMMA.", diasAtras: 3, lgpd: false, resp: "ia" },
  { num: 68, nome: "Eduarda Galvão", whatsapp: "11991120068", email: "eduarda.galvao@hotmail.com", proc: "lipoGlutea", status: "primeiro_atendimento", origem: "google", sobreOPaciente: "27 anos. Primeiro contato via Google.", diasAtras: 2, lgpd: false, resp: "ia" },
  { num: 69, nome: "Fernanda Horta", whatsapp: "11991120069", proc: "miniLipo", status: "primeiro_atendimento", origem: "instagram", sobreOPaciente: "30 anos. Primeiro contato no Instagram.", diasAtras: 2, lgpd: false, resp: "ia" },
  { num: 70, nome: "Graziella Ivo", whatsapp: "11991120070", email: "graziella.ivo@gmail.com", proc: "lipoGlutea", status: "primeiro_atendimento", origem: "indicacao", sobreOPaciente: "33 anos. Indicada por paciente da clínica.", diasAtras: 2, lgpd: false, resp: "ia" },
  { num: 71, nome: "Heloísa Janez", whatsapp: "11991120071", proc: "pmma", status: "primeiro_atendimento", origem: "instagram", sobreOPaciente: "25 anos. Primeiro contato via Instagram.", diasAtras: 1, lgpd: false, resp: "ia" },
  { num: 72, nome: "Isabelly Kowalski", whatsapp: "11991120072", email: "isabelly.kowalski@outlook.com", proc: "lipoGlutea", status: "primeiro_atendimento", origem: "instagram", sobreOPaciente: "29 anos. Primeiro contato: interesse em BBL.", diasAtras: 1, lgpd: false, resp: "ia" },
  { num: 73, nome: "Jéssica Lago", whatsapp: "11991120073", proc: "miniLipo", status: "primeiro_atendimento", origem: "google", sobreOPaciente: "26 anos. Primeiro contato via Google.", diasAtras: 1, lgpd: false, resp: "ia" },
  { num: 74, nome: "Kamilla Mota", whatsapp: "11991120074", email: "kamilla.mota@gmail.com", proc: "lipoGlutea", status: "primeiro_atendimento", origem: "instagram", sobreOPaciente: "32 anos. Primeiro contato hoje via Instagram.", diasAtras: 0, lgpd: false, resp: "ia" },
  { num: 75, nome: "Lorena Navarro", whatsapp: "11991120075", proc: "miniLipo", status: "primeiro_atendimento", origem: "indicacao", sobreOPaciente: "28 anos. Indicada por amiga. Primeiro contato hoje.", diasAtras: 0, lgpd: false, resp: "ia" },
  { num: 76, nome: "Manuela Ouro", whatsapp: "11991120076", email: "manuela.ouro@hotmail.com", proc: "lipoGlutea", status: "primeiro_atendimento", origem: "instagram", sobreOPaciente: "27 anos. Primeiro contato hoje via Instagram Stories.", diasAtras: 0, lgpd: false, resp: "ia" },

  // ── PERDIDO (4) ── created various dates ────────────────────────────────────
  { num: 77, nome: "Marília Dantes", whatsapp: "11991120077", proc: "lipoGlutea", status: "perdido", origem: "instagram", sobreOPaciente: "33 anos. Consultou mas não avançou.", diasAtras: 105, lgpd: true, resp: "ia", motivoPerda: "Preço acima do esperado — optou por outro médico com menor custo", consultaDias: -80 },
  { num: 78, nome: "Neuza Espírito", whatsapp: "11991120078", proc: "miniLipo", status: "perdido", origem: "indicacao", sobreOPaciente: "41 anos. Qualificada mas desistiu.", diasAtras: 72, lgpd: false, resp: "ia", motivoPerda: "Viagem longa para o exterior — postergou indefinidamente" },
  { num: 79, nome: "Olga Ferreira", whatsapp: "11991120079", proc: "pmma", status: "perdido", origem: "google", sobreOPaciente: "37 anos. Consultou, avaliou bem mas escolheu outro médico.", diasAtras: 48, lgpd: true, resp: "maria", motivoPerda: "Escolheu realizar o procedimento com médico da cidade natal", consultaDias: -30 },
  { num: 80, nome: "Pérola Gama", whatsapp: "11991120080", proc: "lipoGlutea", status: "perdido", origem: "instagram", sobreOPaciente: "28 anos. Sem retorno após follow-ups.", diasAtras: 22, lgpd: false, resp: "ia", motivoPerda: "Sem retorno após 3 tentativas de contato — lead fria" },
]

// ── leads originais (enriquecidos) ────────────────────────────────────────────
const LEADS_ORIGINAIS: LeadSeed[] = [
  { num: 81, nome: "Ana Silva", whatsapp: "11991110001", email: "ana.silva@gmail.com", proc: "miniLipo", status: "primeiro_atendimento", origem: "instagram", sobreOPaciente: "26 anos. Primeiro contato: interesse em Mini Lipo. Aguardando qualificação.", diasAtras: 1, lgpd: false, resp: "ia" },
  { num: 82, nome: "Bruna Costa", whatsapp: "11991110002", email: "bruna.costa@hotmail.com", proc: "lipoGlutea", status: "qualificacao", origem: "instagram", sobreOPaciente: "30 anos, saudável. Interesse em Lipo Glútea. Em qualificação pelo agente.", diasAtras: 6, lgpd: false, resp: "ia" },
  { num: 83, nome: "Carla Souza", whatsapp: "11991110003", email: "carla.souza@gmail.com", proc: "pmma", status: "agendamento", origem: "google", sobreOPaciente: "34 anos, saudável. PMMA qualificada. Em processo de agendamento de consulta.", diasAtras: 14, lgpd: true, resp: "maria" },
  { num: 84, nome: "Diana Lima", whatsapp: "11991110004", email: "diana.lima@outlook.com", proc: "miniLipo", status: "consulta_agendada", origem: "indicacao", sobreOPaciente: "28 anos, IMC 23, saudável. Consulta agendada para 22/03/2026 às 10h.", diasAtras: 22, lgpd: true, resp: "ia", consultaDias: 1 },
  { num: 85, nome: "Elena Rocha", whatsapp: "11991110005", email: "elena.rocha@gmail.com", proc: "lipoGlutea", status: "consulta_realizada", origem: "instagram", sobreOPaciente: "27 anos, saudável. Consultou em 12/03/2026. BBL aprovada. Dr. Lucas muito satisfeito com o perfil.", diasAtras: 32, lgpd: true, resp: "ia", consultaDias: -9 },
]

async function main() {
  const senhaHash = await hash("senha123", 12)

  // ── USUÁRIOS ───────────────────────────────────────────────────────────────
  await prisma.usuario.upsert({
    where: { email: "lucas@drlucas.com.br" },
    update: { nome: "Dr. Lucas Felipe", senha: senhaHash, ativo: true, deletadoEm: null },
    create: { nome: "Dr. Lucas Felipe", email: "lucas@drlucas.com.br", senha: senhaHash, perfil: "gestor", tipo: "humano" },
  })

  const anaJulia = await prisma.usuario.upsert({
    where: { email: "ia@drlucas.com.br" },
    update: { nome: "Ana Júlia — IA", senha: senhaHash, ativo: true, deletadoEm: null },
    create: { nome: "Ana Júlia — IA", email: "ia@drlucas.com.br", senha: senhaHash, perfil: "atendente", tipo: "ia" },
  })

  await prisma.usuario.upsert({
    where: { email: "dev@drlucas.com.br" },
    update: { nome: "Desenvolvedor", senha: senhaHash, ativo: true, deletadoEm: null },
    create: { nome: "Desenvolvedor", email: "dev@drlucas.com.br", senha: senhaHash, perfil: "desenvolvedor", tipo: "humano" },
  })

  const maria = await prisma.usuario.upsert({
    where: { email: "maria@drlucas.com.br" },
    update: { nome: "Maria Atendente", senha: senhaHash, ativo: true, deletadoEm: null },
    create: { nome: "Maria Atendente", email: "maria@drlucas.com.br", senha: senhaHash, perfil: "atendente", tipo: "humano" },
  })

  // ── PROCEDIMENTOS ─────────────────────────────────────────────────────────
  const miniLipo = await prisma.procedimento.upsert({
    where: { id: "proc-mini-lipo" },
    update: { nome: "Mini Lipo", ativo: true, deletadoEm: null },
    create: { id: "proc-mini-lipo", nome: "Mini Lipo", tipo: "cirurgico", descricao: "Lipoaspiração de pequenas áreas com anestesia local", valorBase: 8000, duracaoMin: 120, posOperatorio: "Uso de cinta compressiva por 30 dias. Repouso relativo por 7 dias. Drenagem linfática recomendada." },
  })

  const lipoGlutea = await prisma.procedimento.upsert({
    where: { id: "proc-lipo-glutea" },
    update: { nome: "Lipo Enxertia Glútea", ativo: true, deletadoEm: null },
    create: { id: "proc-lipo-glutea", nome: "Lipo Enxertia Glútea", tipo: "cirurgico", descricao: "Lipoaspiração com transferência de gordura para glúteos (Brazilian Butt Lift)", valorBase: 15000, duracaoMin: 180, posOperatorio: "Evitar sentar diretamente por 15 dias. Cinta compressiva por 45 dias. Drenagem linfática obrigatória." },
  })

  const pmma = await prisma.procedimento.upsert({
    where: { id: "proc-pmma" },
    update: { nome: "PMMA", ativo: true, deletadoEm: null },
    create: { id: "proc-pmma", nome: "PMMA", tipo: "estetico", descricao: "Preenchimento com polimetilmetacrilato para volumização", valorBase: 3000, duracaoMin: 60, posOperatorio: "Evitar exercícios intensos por 48h. Massagear a região conforme orientação." },
  })

  const procMap = { miniLipo, lipoGlutea, pmma }

  // ── LEADS + CONVERSAS + MENSAGENS + AGENDAMENTOS ──────────────────────────
  const todosLeads = [...LEADS, ...LEADS_ORIGINAIS]

  for (const ld of todosLeads) {
    const responsavelId = ld.resp === "ia" ? anaJulia.id : maria.id
    const criadoEm = ago(ld.diasAtras)
    const procNome = ld.proc === "lipoGlutea" ? "Lipo Enxertia Glútea" : ld.proc === "miniLipo" ? "Mini Lipo" : "PMMA"
    const pfx = `ld${String(ld.num).padStart(3, "0")}`

    // Lead
    const lead = await prisma.lead.upsert({
      where: { whatsapp: ld.whatsapp },
      update: {
        nome: ld.nome,
        statusFunil: ld.status,
        procedimentoInteresse: procNome,
        responsavelId,
        sobreOPaciente: ld.sobreOPaciente,
        consentimentoLgpd: ld.lgpd,
        consentimentoLgpdEm: ld.lgpd ? criadoEm : null,
        motivoPerda: ld.motivoPerda ?? null,
        ultimaMovimentacaoEm: criadoEm,
        arquivado: false,
        arquivadoEm: null,
        deletadoEm: null,
        email: ld.email ?? null,
        origem: ld.origem,
      },
      create: {
        nome: ld.nome,
        whatsapp: ld.whatsapp,
        email: ld.email ?? null,
        procedimentoInteresse: procNome,
        statusFunil: ld.status,
        origem: ld.origem,
        sobreOPaciente: ld.sobreOPaciente,
        responsavelId,
        consentimentoLgpd: ld.lgpd,
        consentimentoLgpdEm: ld.lgpd ? criadoEm : null,
        motivoPerda: ld.motivoPerda ?? null,
        ultimaMovimentacaoEm: criadoEm,
        criadoEm,
      },
    })

    // Conversa
    const conversa = await prisma.conversa.upsert({
      where: { id: `conv-${pfx}` },
      update: { etapa: ld.status, ultimaMensagemEm: criadoEm },
      create: {
        id: `conv-${pfx}`,
        leadId: lead.id,
        etapa: ld.status,
        ultimaMensagemEm: criadoEm,
        criadoEm,
      },
    })

    // Mensagens
    const mensagens = buildMsgs(pfx, ld.whatsapp, ld.nome, procNome, ld.status, criadoEm, ld.num)
    for (const msg of mensagens) {
      await prisma.mensagemWhatsapp.upsert({
        where: { messageIdWhatsapp: msg.messageIdWhatsapp },
        update: { conteudo: msg.conteudo },
        create: {
          id: msg.id,
          conversaId: conversa.id,
          leadId: lead.id,
          messageIdWhatsapp: msg.messageIdWhatsapp,
          tipo: msg.tipo,
          conteudo: msg.conteudo,
          remetente: msg.remetente,
          criadoEm: msg.criadoEm,
        },
      })
    }

    // Agendamentos
    const proc = procMap[ld.proc]

    // Consulta
    if (ld.consultaDias !== undefined) {
      const dataConsulta = ld.consultaDias < 0
        ? atHour(ago(-ld.consultaDias), 12) // passado → UTC 12h (9h BRT)
        : atHour(fwd(ld.consultaDias), 12)  // futuro
      const statusConsulta =
        ld.consultaDias < 0 ? "realizado" as const
        : ld.status === "consulta_agendada" ? "confirmado" as const
        : "agendado" as const

      await prisma.agendamento.upsert({
        where: { id: `ag-cons-${pfx}` },
        update: { dataHora: dataConsulta, status: statusConsulta },
        create: {
          id: `ag-cons-${pfx}`,
          leadId: lead.id,
          dataHora: dataConsulta,
          status: statusConsulta,
          duracao: 60,
          observacao: `Consulta de avaliação — ${procNome}`,
          criadoEm,
        },
      })
    }

    // Procedimento
    if (ld.procedimentoDias !== undefined) {
      const dataProc = ld.procedimentoDias < 0
        ? atHour(ago(-ld.procedimentoDias), 11)
        : atHour(fwd(ld.procedimentoDias), 11)
      const statusProc =
        ld.procedimentoDias < 0 ? "realizado" as const
        : ld.status === "procedimento_agendado" ? "confirmado" as const
        : "agendado" as const

      await prisma.agendamento.upsert({
        where: { id: `ag-proc-${pfx}` },
        update: { dataHora: dataProc, status: statusProc },
        create: {
          id: `ag-proc-${pfx}`,
          leadId: lead.id,
          procedimentoId: proc.id,
          dataHora: dataProc,
          status: statusProc,
          duracao: proc.duracaoMin,
          observacao: `Procedimento — ${procNome}`,
          criadoEm,
        },
      })
    }
  }

  // ── SPRINTS ───────────────────────────────────────────────────────────────
  const sprintsData = [
    { id: "sprint-0", nome: "Sprint 0 — Setup do Projeto", status: "concluida" as const, ordem: 0, inicio: "2025-09-01", fim: "2025-09-14", itens: [{ id: "s0-i1", titulo: "Repositório Git e estrutura Next.js", ok: true }, { id: "s0-i2", titulo: "Configuração Supabase + Prisma", ok: true }, { id: "s0-i3", titulo: "Deploy inicial na Vercel", ok: true }, { id: "s0-i4", titulo: "shadcn/ui configurado (preset b1Ymqvi3U)", ok: true }] },
    { id: "sprint-1", nome: "Sprint 1 — Autenticação e Usuários", status: "concluida" as const, ordem: 1, inicio: "2025-09-15", fim: "2025-09-28", itens: [{ id: "s1-i1", titulo: "NextAuth com Credentials Provider", ok: true }, { id: "s1-i2", titulo: "Página de login", ok: true }, { id: "s1-i3", titulo: "CRUD de usuários (Gestor)", ok: true }, { id: "s1-i4", titulo: "Middleware de autenticação e perfis", ok: true }] },
    { id: "sprint-2", nome: "Sprint 2 — Leads e Procedimentos", status: "concluida" as const, ordem: 2, inicio: "2025-09-29", fim: "2025-10-12", itens: [{ id: "s2-i1", titulo: "Schema Lead + Procedimento no Prisma", ok: true }, { id: "s2-i2", titulo: "CRUD de procedimentos", ok: true }, { id: "s2-i3", titulo: "Listagem e cadastro manual de leads", ok: true }, { id: "s2-i4", titulo: "DataTable com filtros e paginação", ok: true }] },
    { id: "sprint-3", nome: "Sprint 3 — Agendamentos e Google Calendar", status: "concluida" as const, ordem: 3, inicio: "2025-10-13", fim: "2025-10-26", itens: [{ id: "s3-i1", titulo: "Schema Agendamento no Prisma", ok: true }, { id: "s3-i2", titulo: "CRUD de agendamentos", ok: true }, { id: "s3-i3", titulo: "Integração Google Calendar API", ok: true }, { id: "s3-i4", titulo: "Sincronização bidirecional de eventos", ok: true }, { id: "s3-i5", titulo: "Calendário visual na UI", ok: true }] },
    { id: "sprint-4", nome: "Sprint 4 — Kanban Visual", status: "concluida" as const, ordem: 4, inicio: "2025-10-27", fim: "2025-11-09", itens: [{ id: "s4-i1", titulo: "Kanban com 9 colunas do funil", ok: true }, { id: "s4-i2", titulo: "Drag & drop entre colunas", ok: true }, { id: "s4-i3", titulo: "Cards de lead com info resumida", ok: true }, { id: "s4-i4", titulo: "Atualização de status via API", ok: true }] },
    { id: "sprint-5", nome: "Sprint 5 — Agente IA WhatsApp (Etapas 1-3)", status: "concluida" as const, ordem: 5, inicio: "2025-11-10", fim: "2025-11-30", itens: [{ id: "s5-i1", titulo: "Webhook Uazapi + buffer Redis (debounce 20s)", ok: true }, { id: "s5-i2", titulo: "Memória conversacional Redis (20 msgs)", ok: true }, { id: "s5-i3", titulo: "GPT-4o com system prompt clínico", ok: true }, { id: "s5-i4", titulo: "Etapa 1: Qualificação de leads", ok: true }, { id: "s5-i5", titulo: "Etapa 2: Agendamento de consultas", ok: true }, { id: "s5-i6", titulo: "Etapa 3: Gestão pós-agendamento", ok: true }] },
    { id: "sprint-6", nome: "Sprint 6 — Auditoria e Segurança", status: "concluida" as const, ordem: 6, inicio: "2025-12-01", fim: "2025-12-14", itens: [{ id: "s6-i1", titulo: "AuditLog para todas as entidades", ok: true }, { id: "s6-i2", titulo: "LGPD: consentimento e soft delete", ok: true }, { id: "s6-i3", titulo: "x-api-secret nas rotas internas", ok: true }, { id: "s6-i4", titulo: "Página de auditoria para gestor", ok: true }] },
    { id: "sprint-7", nome: "Sprint 7 — Ficha Completa do Lead", status: "concluida" as const, ordem: 7, inicio: "2025-12-15", fim: "2025-12-28", itens: [{ id: "s7-i1", titulo: "Página de detalhes do lead (tabs)", ok: true }, { id: "s7-i2", titulo: "Histórico de conversas WhatsApp", ok: true }, { id: "s7-i3", titulo: "Upload de fotos pré/pós (FotoLead)", ok: true }, { id: "s7-i4", titulo: "Análise de mídia via GPT-4o Vision", ok: true }] },
    { id: "sprint-8", nome: "Sprint 8 — Dashboard com Métricas", status: "concluida" as const, ordem: 8, inicio: "2026-01-05", fim: "2026-01-18", itens: [{ id: "s8-i1", titulo: "API de métricas do funil", ok: true }, { id: "s8-i2", titulo: "MetricCard + gráficos", ok: true }, { id: "s8-i3", titulo: "Leads em alerta (sem interação > 7 dias)", ok: true }, { id: "s8-i4", titulo: "Conversão por etapa do funil", ok: true }] },
    { id: "sprint-9", nome: "Sprint 9 — Roadmap de Sprints", status: "concluida" as const, ordem: 9, inicio: "2026-01-19", fim: "2026-02-01", itens: [{ id: "s9-i1", titulo: "Schema Sprint e SprintItem", ok: true }, { id: "s9-i2", titulo: "API CRUD de sprints", ok: true }, { id: "s9-i3", titulo: "Componentes visuais (cards, checklist)", ok: true }, { id: "s9-i4", titulo: "Página do roadmap", ok: true }, { id: "s9-i5", titulo: "Testes E2E do módulo", ok: true }] },
    { id: "sprint-10", nome: "Sprint 10 — Relatórios e Exportação", status: "concluida" as const, ordem: 10, inicio: "2026-02-02", fim: "2026-02-15", itens: [{ id: "s10-i1", titulo: "Relatório mensal de leads", ok: true }, { id: "s10-i2", titulo: "Exportação CSV e PDF", ok: true }, { id: "s10-i3", titulo: "Filtros avançados de data e status", ok: true }, { id: "s10-i4", titulo: "Gráfico de evolução do funil", ok: true }] },
    { id: "sprint-11", nome: "Sprint 11 — Melhorias de UX e Mobile", status: "concluida" as const, ordem: 11, inicio: "2026-02-16", fim: "2026-03-01", itens: [{ id: "s11-i1", titulo: "Layout responsivo completo (mobile-first)", ok: true }, { id: "s11-i2", titulo: "Gestos touch no kanban", ok: true }, { id: "s11-i3", titulo: "Loading states e skeleton screens", ok: true }, { id: "s11-i4", titulo: "Feedback visual de ações (toast)", ok: true }] },
    { id: "sprint-12", nome: "Sprint 12 — Busca Global e Notificações", status: "concluida" as const, ordem: 12, inicio: "2026-03-02", fim: "2026-03-15", itens: [{ id: "s12-i1", titulo: "Busca global Ctrl+K (leads, agendamentos)", ok: true }, { id: "s12-i2", titulo: "Central de notificações no header", ok: true }, { id: "s12-i3", titulo: "Notificações de lead sem resposta", ok: true }, { id: "s12-i4", titulo: "Theme toggle light/dark mode", ok: true }] },
    { id: "sprint-13", nome: "Sprint 13 — Integrações Avançadas", status: "em_andamento" as const, ordem: 13, inicio: "2026-03-16", fim: "2026-03-31", itens: [{ id: "s13-i1", titulo: "Envio de áudio pelo agente IA", ok: true }, { id: "s13-i2", titulo: "Follow-up automático inteligente", ok: true }, { id: "s13-i3", titulo: "Integração com sistema de pagamentos", ok: false }, { id: "s13-i4", titulo: "Relatório de ROI por canal de origem", ok: false }, { id: "s13-i5", titulo: "Testes E2E completos", ok: false }] },
  ]

  for (const sp of sprintsData) {
    const sprint = await prisma.sprint.upsert({
      where: { id: sp.id },
      update: { nome: sp.nome, status: sp.status, deletadoEm: null },
      create: {
        id: sp.id,
        nome: sp.nome,
        status: sp.status,
        ordem: sp.ordem,
        dataInicio: new Date(sp.inicio),
        dataFim: new Date(sp.fim),
      },
    })
    for (const item of sp.itens) {
      await prisma.sprintItem.upsert({
        where: { id: item.id },
        update: { titulo: item.titulo, concluido: item.ok },
        create: { id: item.id, sprintId: sprint.id, titulo: item.titulo, concluido: item.ok, ordem: sp.itens.indexOf(item) },
      })
    }
  }

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  const totalLeads = await prisma.lead.count()
  const totalMsgs = await prisma.mensagemWhatsapp.count()
  const totalAgs = await prisma.agendamento.count()
  console.log("\n✅ Seed concluído:")
  console.log(`   Leads: ${totalLeads}`)
  console.log(`   Mensagens WhatsApp: ${totalMsgs}`)
  console.log(`   Agendamentos: ${totalAgs}`)
  console.log(`   Sprints: ${sprintsData.length}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
