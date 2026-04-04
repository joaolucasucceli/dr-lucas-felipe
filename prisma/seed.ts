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
const OBJETIVOS_BBL = [
  "quero um bumbum mais definido e levantado",
  "quero mais projeção e volume nos glúteos",
  "quero harmonizar minha silhueta com mais curvas",
  "sempre sonhei com esse contorno corporal",
  "quero recuperar o volume que perdi ao emagrecer",
  "quero um resultado natural sem prótese",
]
const OBJETIVOS_LIPO = [
  "quero eliminar gordura localizada no abdômen e flancos",
  "quero me livrar do culote que não sai com dieta",
  "quero definição corporal e me sentir bem de biquíni",
  "quero recuperar minha confiança após emagrecer",
  "me incomoda muito a gordura acumulada na barriga",
  "quero um contorno mais definido sem cirurgia grande",
]
const OBJETIVOS_PMMA = [
  "quero um volume mais harmônico nos glúteos",
  "quero uma melhora estética sem procedimento invasivo",
  "quero complementar o resultado de outra cirurgia que fiz",
  "quero resultado com recuperação rápida",
  "quero ganhar volume de forma gradual e natural",
  "quero melhorar o contorno sem me afastar muito do trabalho",
]
const PRIMEIROS_CONTATOS: Record<string, string> = {
  instagram: "Vi sobre o Dr. Lucas no Instagram e tenho interesse em",
  google: "Encontrei a clínica do Dr. Lucas pelo Google e gostaria de saber mais sobre",
  indicacao: "Fui indicada por uma amiga que fez procedimento com o Dr. Lucas e tenho interesse em",
  site: "Acessei o site da clínica e quero saber mais sobre",
  whatsapp: "Recebi o contato de vocês e tenho interesse em",
}

// ── contagem de mensagens por estágio (usada em buildMsgs e no cálculo de datas) ──
const MSG_COUNTS: Record<string, number> = {
  acolhimento: 3,
  qualificacao: 5,
  agendamento: 8,
  consulta_agendada: 10,
  consulta_realizada: 14,
  sinal_pago: 18,
  procedimento_agendado: 20,
  concluido: 20,
  perdido: 5,
}

// ── gerador de mensagens por estágio ──────────────────────────────────────────
function buildMsgs(
  pfx: string,
  nome: string,
  procNome: string,
  proc: "miniLipo" | "lipoGlutea" | "pmma",
  origem: string,
  status: string,
  baseDt: Date,
  idx: number,
) {
  const fn = nome.split(" ")[0]
  const idade = IDADES[idx % IDADES.length]
  const objArr = proc === "lipoGlutea" ? OBJETIVOS_BBL : proc === "miniLipo" ? OBJETIVOS_LIPO : OBJETIVOS_PMMA
  const obj = objArr[idx % objArr.length]
  const contato = PRIMEIROS_CONTATOS[origem] ?? PRIMEIROS_CONTATOS["instagram"]
  const min = (n: number) => new Date(baseDt.getTime() + n * 7 * 60000)
  const mk = (n: number, c: string, r: string) => ({
    id: `${pfx}-${String(n).padStart(2, "0")}`,
    messageIdWhatsapp: `wamid.${pfx}.${String(n).padStart(2, "0")}`,
    tipo: "texto" as const,
    conteudo: c,
    remetente: r,
    criadoEm: min(n),
  })

  const all = [
    mk(1, `Olá! ${contato} ${procNome}. Poderia me dar mais informações?`, "paciente"),
    mk(2, `Olá, ${fn}! 😊 Aqui é a Ana Júlia, assistente virtual da clínica do Dr. Lucas Felipe. Que bom que você entrou em contato! Para te ajudar melhor, me conta: quantos anos você tem e qual é seu objetivo com ${procNome}?`, "agente"),
    mk(3, `Tenho ${idade} anos e ${obj}.`, "paciente"),
    mk(4, `Perfeito, ${fn}! O Dr. Lucas trabalha com uma abordagem muito natural e personalizada. Antes de prosseguirmos, você tem alguma condição de saúde como diabetes, hipertensão, problemas cardíacos ou de coagulação?`, "agente"),
    mk(5, `Não, sou saudável. Nunca tive nenhum problema de saúde relevante.`, "paciente"),
    mk(6, `Ótimo! 😊 Temos disponibilidade para consulta presencial com o Dr. Lucas. Você prefere horário de manhã ou à tarde?`, "agente"),
    mk(7, `Prefiro de manhã, antes das 11h.`, "paciente"),
    mk(8, `Vou verificar os horários disponíveis para você. Pode aguardar um instante?`, "agente"),
    mk(9, `Pode sim, fico no aguardo!`, "paciente"),
    mk(10, `Consulta confirmada! ✅ Dr. Lucas te aguarda. Nosso endereço: Av. Paulista, 1000 — Sala 810, Bela Vista, São Paulo. Qualquer dúvida, pode me chamar aqui!`, "agente"),
    mk(11, `Olá ${fn}! 😊 Passando para confirmar sua consulta de amanhã com o Dr. Lucas. Tudo certo?`, "agente"),
    mk(12, `Confirmado! Estarei lá. Preciso levar algum documento?`, "paciente"),
    mk(13, `Pode trazer RG ou CNH e, se tiver, exames recentes (hemograma, coagulação). Até amanhã! 💙`, "agente"),
    mk(14, `Olá ${fn}! 😊 Como foi a consulta com o Dr. Lucas? Espero que tudo tenha corrido bem!`, "agente"),
    mk(15, `Foi incrível! Dr. Lucas foi super atencioso e esclareceu todas as minhas dúvidas. Adorei a clínica!`, "paciente"),
    mk(16, `Que ótimo! 💙 O Dr. Lucas ficou muito satisfeito com seu perfil. Para reservarmos sua data, o valor do sinal é de R$ 2.000 (descontado do total do procedimento). Posso te passar as formas de pagamento?`, "agente"),
    mk(17, `Pode sim! Quero confirmar logo minha data. Qual é a chave do PIX?`, "paciente"),
    mk(18, `PIX: CNPJ 12.345.678/0001-90. Assim que confirmarmos o recebimento, envio o contrato e todas as orientações pré-operatórias. 🎉`, "agente"),
    mk(19, `Enviei o comprovante agora! Pode confirmar o recebimento?`, "paciente"),
    mk(20, `Recebemos, ${fn}! 🎉 Seu procedimento está reservado. Em breve enviarei as orientações pré-operatórias completas. Qualquer dúvida, estou aqui!`, "agente"),
  ]

  return all.slice(0, MSG_COUNTS[status] ?? 3)
}

// ── definição dos leads ────────────────────────────────────────────────────────
type LeadSeed = {
  num: number
  nome: string
  whatsapp: string
  email?: string
  proc: "miniLipo" | "lipoGlutea" | "pmma"
  status: "concluido" | "procedimento_agendado" | "sinal_pago" | "consulta_realizada" | "consulta_agendada" | "agendamento" | "qualificacao" | "acolhimento" | "perdido"
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
  { num: 50, nome: "Lívia Neves", whatsapp: "11991120050", email: "livia.neves@gmail.com", proc: "lipoGlutea", status: "qualificacao", origem: "instagram", sobreOPaciente: "27 anos, sem comorbidades. Interessada em BBL. Em qualificação.", diasAtras: 10, lgpd: true, resp: "ia" },
  { num: 51, nome: "Marta Oliveira", whatsapp: "11991120051", email: "marta.oliveira@hotmail.com", proc: "miniLipo", status: "qualificacao", origem: "indicacao", sobreOPaciente: "35 anos, saudável. Mini lipo abdômen. Qualificando.", diasAtras: 9, lgpd: true, resp: "ia" },
  { num: 52, nome: "Nadine Pacheco", whatsapp: "11991120052", email: "nadine.pacheco@gmail.com", proc: "lipoGlutea", status: "qualificacao", origem: "instagram", sobreOPaciente: "29 anos, saudável. BBL. Em qualificação pelo agente.", diasAtras: 9, lgpd: true, resp: "ia" },
  { num: 53, nome: "Odília Quintas", whatsapp: "11991120053", proc: "pmma", status: "qualificacao", origem: "google", sobreOPaciente: "40 anos, saudável. PMMA. Em qualificação.", diasAtras: 8, lgpd: true, resp: "maria" },
  { num: 54, nome: "Priscila Rezende", whatsapp: "11991120054", email: "priscila.rezende@outlook.com", proc: "lipoGlutea", status: "qualificacao", origem: "instagram", sobreOPaciente: "31 anos, IMC 24. BBL. Qualificando.", diasAtras: 8, lgpd: true, resp: "ia" },
  { num: 55, nome: "Rosa Tavares", whatsapp: "11991120055", proc: "miniLipo", status: "qualificacao", origem: "indicacao", sobreOPaciente: "38 anos, saudável. Mini lipo. Em qualificação.", diasAtras: 7, lgpd: true, resp: "ia" },
  { num: 56, nome: "Sabrina Uzeda", whatsapp: "11991120056", email: "sabrina.uzeda@gmail.com", proc: "lipoGlutea", status: "qualificacao", origem: "instagram", sobreOPaciente: "25 anos, saudável. BBL. Em qualificação.", diasAtras: 7, lgpd: true, resp: "ia" },
  { num: 57, nome: "Talita Vaz", whatsapp: "11991120057", proc: "pmma", status: "qualificacao", origem: "google", sobreOPaciente: "32 anos, saudável. PMMA. Em qualificação.", diasAtras: 6, lgpd: true, resp: "maria" },
  { num: 58, nome: "Urânia Winck", whatsapp: "11991120058", email: "urania.winck@hotmail.com", proc: "lipoGlutea", status: "qualificacao", origem: "instagram", sobreOPaciente: "27 anos, IMC 23. BBL. Em qualificação.", diasAtras: 6, lgpd: true, resp: "ia" },
  { num: 59, nome: "Vera Xavier", whatsapp: "11991120059", proc: "miniLipo", status: "qualificacao", origem: "indicacao", sobreOPaciente: "33 anos, saudável. Mini lipo. Qualificando.", diasAtras: 5, lgpd: true, resp: "ia" },
  { num: 60, nome: "Wanda Yunes", whatsapp: "11991120060", email: "wanda.yunes@gmail.com", proc: "lipoGlutea", status: "qualificacao", origem: "instagram", sobreOPaciente: "30 anos, IMC 22. BBL. Em qualificação.", diasAtras: 5, lgpd: true, resp: "ia" },
  { num: 61, nome: "Xênia Zanini", whatsapp: "11991120061", proc: "pmma", status: "qualificacao", origem: "google", sobreOPaciente: "28 anos, saudável. PMMA. Em qualificação pelo agente.", diasAtras: 5, lgpd: true, resp: "maria" },

  // ── ACOLHIMENTO (15) ── created 0-5 days ago ────────────────────────────────
  { num: 62, nome: "Yasmin Abreu", whatsapp: "11991120062", proc: "lipoGlutea", status: "acolhimento", origem: "instagram", sobreOPaciente: "24 anos. Primeiro contato: interesse em BBL.", diasAtras: 5, lgpd: false, resp: "ia" },
  { num: 63, nome: "Zilmara Batista", whatsapp: "11991120063", proc: "miniLipo", status: "acolhimento", origem: "indicacao", sobreOPaciente: "29 anos. Primeiro contato: interesse em mini lipo.", diasAtras: 4, lgpd: false, resp: "ia" },
  { num: 64, nome: "Aline Cabral", whatsapp: "11991120064", email: "aline.cabral@gmail.com", proc: "lipoGlutea", status: "acolhimento", origem: "instagram", sobreOPaciente: "26 anos. Primeiro contato via Instagram.", diasAtras: 4, lgpd: false, resp: "ia" },
  { num: 65, nome: "Brenda Dantas", whatsapp: "11991120065", proc: "miniLipo", status: "acolhimento", origem: "google", sobreOPaciente: "31 anos. Primeiro contato via Google.", diasAtras: 3, lgpd: false, resp: "ia" },
  { num: 66, nome: "Catarina Estrada", whatsapp: "11991120066", email: "catarina.estrada@gmail.com", proc: "lipoGlutea", status: "acolhimento", origem: "instagram", sobreOPaciente: "28 anos. Primeiro contato: perguntou sobre BBL.", diasAtras: 3, lgpd: false, resp: "ia" },
  { num: 67, nome: "Diana Fonseca", whatsapp: "11991120067", proc: "pmma", status: "acolhimento", origem: "instagram", sobreOPaciente: "35 anos. Primeiro contato: PMMA.", diasAtras: 3, lgpd: false, resp: "ia" },
  { num: 68, nome: "Eduarda Galvão", whatsapp: "11991120068", email: "eduarda.galvao@hotmail.com", proc: "lipoGlutea", status: "acolhimento", origem: "google", sobreOPaciente: "27 anos. Primeiro contato via Google.", diasAtras: 2, lgpd: false, resp: "ia" },
  { num: 69, nome: "Fernanda Horta", whatsapp: "11991120069", proc: "miniLipo", status: "acolhimento", origem: "instagram", sobreOPaciente: "30 anos. Primeiro contato no Instagram.", diasAtras: 2, lgpd: false, resp: "ia" },
  { num: 70, nome: "Graziella Ivo", whatsapp: "11991120070", email: "graziella.ivo@gmail.com", proc: "lipoGlutea", status: "acolhimento", origem: "indicacao", sobreOPaciente: "33 anos. Indicada por paciente da clínica.", diasAtras: 2, lgpd: false, resp: "ia" },
  { num: 71, nome: "Heloísa Janez", whatsapp: "11991120071", proc: "pmma", status: "acolhimento", origem: "instagram", sobreOPaciente: "25 anos. Primeiro contato via Instagram.", diasAtras: 1, lgpd: false, resp: "ia" },
  { num: 72, nome: "Isabelly Kowalski", whatsapp: "11991120072", email: "isabelly.kowalski@outlook.com", proc: "lipoGlutea", status: "acolhimento", origem: "instagram", sobreOPaciente: "29 anos. Primeiro contato: interesse em BBL.", diasAtras: 1, lgpd: false, resp: "ia" },
  { num: 73, nome: "Jéssica Lago", whatsapp: "11991120073", proc: "miniLipo", status: "acolhimento", origem: "google", sobreOPaciente: "26 anos. Primeiro contato via Google.", diasAtras: 1, lgpd: false, resp: "ia" },
  { num: 74, nome: "Kamilla Mota", whatsapp: "11991120074", email: "kamilla.mota@gmail.com", proc: "lipoGlutea", status: "acolhimento", origem: "instagram", sobreOPaciente: "32 anos. Primeiro contato hoje via Instagram.", diasAtras: 0, lgpd: false, resp: "ia" },
  { num: 75, nome: "Lorena Navarro", whatsapp: "11991120075", proc: "miniLipo", status: "acolhimento", origem: "indicacao", sobreOPaciente: "28 anos. Indicada por amiga. Primeiro contato hoje.", diasAtras: 0, lgpd: false, resp: "ia" },
  { num: 76, nome: "Manuela Ouro", whatsapp: "11991120076", email: "manuela.ouro@hotmail.com", proc: "lipoGlutea", status: "acolhimento", origem: "instagram", sobreOPaciente: "27 anos. Primeiro contato hoje via Instagram Stories.", diasAtras: 0, lgpd: false, resp: "ia" },

  // ── PERDIDO (4) ── created various dates ────────────────────────────────────
  { num: 77, nome: "Marília Dantes", whatsapp: "11991120077", proc: "lipoGlutea", status: "perdido", origem: "instagram", sobreOPaciente: "33 anos. Consultou mas não avançou.", diasAtras: 105, lgpd: true, resp: "ia", motivoPerda: "Preço acima do esperado — optou por outro médico com menor custo", consultaDias: -80 },
  { num: 78, nome: "Neuza Espírito", whatsapp: "11991120078", proc: "miniLipo", status: "perdido", origem: "indicacao", sobreOPaciente: "41 anos. Qualificada mas desistiu.", diasAtras: 72, lgpd: false, resp: "ia", motivoPerda: "Viagem longa para o exterior — postergou indefinidamente" },
  { num: 79, nome: "Olga Ferreira", whatsapp: "11991120079", proc: "pmma", status: "perdido", origem: "google", sobreOPaciente: "37 anos. Consultou, avaliou bem mas escolheu outro médico.", diasAtras: 48, lgpd: true, resp: "maria", motivoPerda: "Escolheu realizar o procedimento com médico da cidade natal", consultaDias: -30 },
  { num: 80, nome: "Pérola Gama", whatsapp: "11991120080", proc: "lipoGlutea", status: "perdido", origem: "instagram", sobreOPaciente: "28 anos. Sem retorno após follow-ups.", diasAtras: 22, lgpd: false, resp: "ia", motivoPerda: "Sem retorno após 3 tentativas de contato — lead fria" },
]

// ── leads originais (enriquecidos) ────────────────────────────────────────────
const LEADS_ORIGINAIS: LeadSeed[] = [
  { num: 81, nome: "Ana Silva", whatsapp: "11991110001", email: "ana.silva@gmail.com", proc: "miniLipo", status: "acolhimento", origem: "instagram", sobreOPaciente: "26 anos. Primeiro contato: interesse em Mini Lipo. Aguardando qualificação.", diasAtras: 1, lgpd: false, resp: "ia" },
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

  const maria = await prisma.usuario.upsert({
    where: { email: "maria@drlucas.com.br" },
    update: { nome: "Maria Atendente", senha: senhaHash, ativo: true, deletadoEm: null },
    create: { nome: "Maria Atendente", email: "maria@drlucas.com.br", senha: senhaHash, perfil: "atendente", tipo: "humano" },
  })

  // ── TIPOS DE PROCEDIMENTO ──────────────────────────────────────────────────
  await prisma.tipoProcedimento.upsert({ where: { nome: "Cirúrgico" }, update: {}, create: { nome: "Cirúrgico" } })
  await prisma.tipoProcedimento.upsert({ where: { nome: "Estético" }, update: {}, create: { nome: "Estético" } })
  await prisma.tipoProcedimento.upsert({ where: { nome: "Minimamente Invasivo" }, update: {}, create: { nome: "Minimamente Invasivo" } })

  // ── PROCEDIMENTOS ─────────────────────────────────────────────────────────
  const miniLipo = await prisma.procedimento.upsert({
    where: { id: "proc-mini-lipo" },
    update: { nome: "Mini Lipo", ativo: true, deletadoEm: null },
    create: { id: "proc-mini-lipo", nome: "Mini Lipo", tipo: "Cirúrgico", descricao: "Lipoaspiração de pequenas áreas com anestesia local", valorBase: 8000, duracaoMin: 120, posOperatorio: "Uso de cinta compressiva por 30 dias. Repouso relativo por 7 dias. Drenagem linfática recomendada." },
  })

  const lipoGlutea = await prisma.procedimento.upsert({
    where: { id: "proc-lipo-glutea" },
    update: { nome: "Lipo Enxertia Glútea", ativo: true, deletadoEm: null },
    create: { id: "proc-lipo-glutea", nome: "Lipo Enxertia Glútea", tipo: "Cirúrgico", descricao: "Lipoaspiração com transferência de gordura para glúteos (Brazilian Butt Lift)", valorBase: 15000, duracaoMin: 180, posOperatorio: "Evitar sentar diretamente por 15 dias. Cinta compressiva por 45 dias. Drenagem linfática obrigatória." },
  })

  const pmma = await prisma.procedimento.upsert({
    where: { id: "proc-pmma" },
    update: { nome: "PMMA", ativo: true, deletadoEm: null },
    create: { id: "proc-pmma", nome: "PMMA", tipo: "Estético", descricao: "Preenchimento com polimetilmetacrilato para volumização", valorBase: 3000, duracaoMin: 60, posOperatorio: "Evitar exercícios intensos por 48h. Massagear a região conforme orientação." },
  })

  const procMap = { miniLipo, lipoGlutea, pmma }

  // ── LEADS + CONVERSAS + MENSAGENS + AGENDAMENTOS ──────────────────────────
  const todosLeads = [...LEADS, ...LEADS_ORIGINAIS]

  // helper: data da última movimentação real (não apenas criadoEm)
  function calcUltimaMovimentacao(ld: LeadSeed): Date {
    if (ld.procedimentoDias !== undefined && ld.procedimentoDias < 0)
      return ago(-ld.procedimentoDias)
    if (ld.consultaDias !== undefined && ld.consultaDias < 0)
      return new Date(ago(-ld.consultaDias).getTime() + 2 * 24 * 60 * 60 * 1000)
    if (ld.consultaDias !== undefined && ld.consultaDias > 0)
      return ago(Math.max(1, ld.diasAtras - 3))
    return ago(Math.max(0, ld.diasAtras - 1))
  }

  for (const ld of todosLeads) {
    const responsavelId = ld.resp === "ia" ? anaJulia.id : maria.id
    const criadoEm = ago(ld.diasAtras)
    const procNome = ld.proc === "lipoGlutea" ? "Lipo Enxertia Glútea" : ld.proc === "miniLipo" ? "Mini Lipo" : "PMMA"
    const pfx = `ld${String(ld.num).padStart(3, "0")}`
    const ultimaMovimentacaoEm = calcUltimaMovimentacao(ld)
    const msgCount = MSG_COUNTS[ld.status] ?? 3
    const ultimaMensagemEm = new Date(criadoEm.getTime() + msgCount * 7 * 60000)

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
        ultimaMovimentacaoEm,
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
        ultimaMovimentacaoEm,
        criadoEm,
      },
    })

    // Conversa
    const conversa = await prisma.conversa.upsert({
      where: { id: `conv-${pfx}` },
      update: { etapa: ld.status, ultimaMensagemEm },
      create: {
        id: `conv-${pfx}`,
        leadId: lead.id,
        etapa: ld.status,
        ultimaMensagemEm,
        criadoEm,
      },
    })

    // Mensagens
    const mensagens = buildMsgs(pfx, ld.nome, procNome, ld.proc, ld.origem, ld.status, criadoEm, ld.num)
    for (const msg of mensagens) {
      await prisma.mensagemWhatsapp.upsert({
        where: { messageIdWhatsapp: msg.messageIdWhatsapp },
        update: { conteudo: msg.conteudo, remetente: msg.remetente },
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

    // FotoLead (apenas para leads concluídos)
    if (ld.status === "concluido") {
      const fn = ld.nome.split(" ")[0]
      const dtPos = ld.procedimentoDias !== undefined ? ago(-ld.procedimentoDias) : criadoEm
      await prisma.fotoLead.upsert({
        where: { id: `foto-${pfx}-pre` },
        update: {},
        create: { id: `foto-${pfx}-pre`, leadId: lead.id, url: `https://placehold.co/800x600/f5f5f5/999999?text=Pre-Op+${fn}`, descricao: "Foto pré-operatória — avaliação inicial", tipoAnalise: "pre_op", criadoEm },
      })
      await prisma.fotoLead.upsert({
        where: { id: `foto-${pfx}-pos` },
        update: {},
        create: { id: `foto-${pfx}-pos`, leadId: lead.id, url: `https://placehold.co/800x600/f5f5f5/999999?text=Pos-Op+${fn}`, descricao: "Foto pós-operatória — 30 dias após procedimento", tipoAnalise: "pos_op", criadoEm: dtPos },
      })
    }
  }

  // ── LEAD DE RETORNO (2º CICLO) — exemplo de paciente com múltiplos procedimentos ──
  const leadRetorno = await prisma.lead.upsert({
    where: { whatsapp: "5511988880099" },
    update: {
      nome: "Camila Retorno",
      statusFunil: "agendamento",
      procedimentoInteresse: "Mini Lipo",
      cicloAtual: 2,
      ciclosCompletos: 1,
      ehRetorno: true,
      sobreOPaciente: "32 anos, saudável. Fez PMMA em out/2025 com ótimo resultado.\n\n[Ciclo 2 iniciado em 21/03/2026]: Paciente retornou via WhatsApp. Status anterior: concluido.",
      responsavelId: anaJulia.id,
      ultimaMovimentacaoEm: ago(1),
    },
    create: {
      nome: "Camila Retorno",
      whatsapp: "5511988880099",
      procedimentoInteresse: "Mini Lipo",
      statusFunil: "agendamento",
      origem: "whatsapp",
      cicloAtual: 2,
      ciclosCompletos: 1,
      ehRetorno: true,
      sobreOPaciente: "32 anos, saudável. Fez PMMA em out/2025 com ótimo resultado.\n\n[Ciclo 2 iniciado em 21/03/2026]: Paciente retornou via WhatsApp. Status anterior: concluido.",
      responsavelId: anaJulia.id,
      consentimentoLgpd: true,
      consentimentoLgpdEm: ago(200),
      ultimaMovimentacaoEm: ago(1),
      criadoEm: ago(200),
    },
  })

  // Conversa do ciclo 1 (PMMA — concluído)
  const conversaRetornoCiclo1 = await prisma.conversa.upsert({
    where: { id: "conv-retorno-c1" },
    update: { etapa: "concluido" },
    create: {
      id: "conv-retorno-c1",
      leadId: leadRetorno.id,
      etapa: "concluido",
      ciclo: 1,
      criadoEm: ago(200),
      ultimaMensagemEm: ago(150),
    },
  })

  // Conversa do ciclo 2 (Mini Lipo — agendamento)
  const conversaRetornoCiclo2 = await prisma.conversa.upsert({
    where: { id: "conv-retorno-c2" },
    update: { etapa: "agendamento" },
    create: {
      id: "conv-retorno-c2",
      leadId: leadRetorno.id,
      etapa: "agendamento",
      ciclo: 2,
      criadoEm: ago(2),
      ultimaMensagemEm: ago(1),
    },
  })

  // Mensagens ciclo 1
  await prisma.mensagemWhatsapp.upsert({
    where: { messageIdWhatsapp: "ret-c1-msg01" },
    update: {},
    create: { conversaId: conversaRetornoCiclo1.id, leadId: leadRetorno.id, messageIdWhatsapp: "ret-c1-msg01", tipo: "texto", conteudo: "Oi! Vi sobre o Dr. Lucas no Instagram e tenho interesse em PMMA", remetente: "paciente", criadoEm: ago(200) },
  })
  await prisma.mensagemWhatsapp.upsert({
    where: { messageIdWhatsapp: "ret-c1-msg02" },
    update: {},
    create: { conversaId: conversaRetornoCiclo1.id, leadId: leadRetorno.id, messageIdWhatsapp: "ret-c1-msg02", tipo: "texto", conteudo: "Olá, Camila! Fico feliz que tenha nos encontrado! Sou a Ana Júlia. Me conta mais — você tem interesse em PMMA para quê área?", remetente: "agente", criadoEm: ago(199) },
  })

  // Agendamento ciclo 1 (PMMA — realizado)
  await prisma.agendamento.upsert({
    where: { id: "ag-retorno-c1-proc" },
    update: {},
    create: {
      id: "ag-retorno-c1-proc",
      leadId: leadRetorno.id,
      procedimentoId: pmma.id,
      dataHora: atHour(ago(160), 11),
      status: "realizado",
      duracao: 60,
      ciclo: 1,
      observacao: "PMMA — 1ª sessão",
      criadoEm: ago(200),
    },
  })

  // Fotos ciclo 1
  await prisma.fotoLead.upsert({
    where: { id: "foto-retorno-c1-pre" },
    update: {},
    create: { id: "foto-retorno-c1-pre", leadId: leadRetorno.id, url: "https://placehold.co/800x600/f5f5f5/999999?text=Ciclo1+Pre-Op+Camila", descricao: "Pré-op PMMA (Ciclo 1)", tipoAnalise: "pre_op", ciclo: 1, criadoEm: ago(200) },
  })
  await prisma.fotoLead.upsert({
    where: { id: "foto-retorno-c1-pos" },
    update: {},
    create: { id: "foto-retorno-c1-pos", leadId: leadRetorno.id, url: "https://placehold.co/800x600/f5f5f5/999999?text=Ciclo1+Pos-Op+Camila", descricao: "Pós-op PMMA (Ciclo 1)", tipoAnalise: "pos_op", ciclo: 1, criadoEm: ago(155) },
  })

  // Mensagens ciclo 2 (retorno)
  await prisma.mensagemWhatsapp.upsert({
    where: { messageIdWhatsapp: "ret-c2-msg01" },
    update: {},
    create: { conversaId: conversaRetornoCiclo2.id, leadId: leadRetorno.id, messageIdWhatsapp: "ret-c2-msg01", tipo: "texto", conteudo: "Oi! Quero fazer uma Mini Lipo agora", remetente: "paciente", criadoEm: ago(2) },
  })
  await prisma.mensagemWhatsapp.upsert({
    where: { messageIdWhatsapp: "ret-c2-msg02" },
    update: {},
    create: { conversaId: conversaRetornoCiclo2.id, leadId: leadRetorno.id, messageIdWhatsapp: "ret-c2-msg02", tipo: "texto", conteudo: "Camila! Que alegria te ver de volta! 🎉 Espero que o resultado do PMMA tenha ficado incrível. Quer fazer uma Mini Lipo agora?", remetente: "agente", criadoEm: ago(2) },
  })

  // ── CONFIGURAÇÕES ─────────────────────────────────────────────────────────
  await prisma.configGoogleCalendar.upsert({
    where: { id: "config-gcal-01" },
    update: { ativo: true },
    create: { id: "config-gcal-01", clientId: "123456789-abc.apps.googleusercontent.com", clientSecret: "GOCSPX-demo-client-secret", calendarId: "agenda@drlucasfelipe.com.br", refreshToken: "1//demo-refresh-token", ativo: true },
  })

  await prisma.configWhatsapp.upsert({
    where: { id: "config-wp-01" },
    update: { ativo: true },
    create: { id: "config-wp-01", uazapiUrl: "https://api.uazapi.com.br", adminToken: "demo-admin-token-prod", instanceId: "inst-drlucas-prod", instanceToken: "demo-instance-token-prod", numeroWhatsapp: "+5511999990000", webhookUrl: "https://central.drlucasfelipe.com.br/api/webhooks/whatsapp", ativo: true },
  })

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  const totalLeads = await prisma.lead.count()
  const totalMsgs = await prisma.mensagemWhatsapp.count()
  const totalAgs = await prisma.agendamento.count()
  const totalFotos = await prisma.fotoLead.count()
  console.log("\n✅ Seed concluído:")
  console.log(`   Leads: ${totalLeads}`)
  console.log(`   Mensagens WhatsApp: ${totalMsgs}`)
  console.log(`   Agendamentos: ${totalAgs}`)
  console.log(`   Fotos: ${totalFotos}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
