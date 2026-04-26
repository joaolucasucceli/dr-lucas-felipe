// Seed de histórico de atendimento — JLAU-979
// Popula conversas + mensagens + agendamentos realistas para os contatos seed
// Maria Silva (lead) e Roberto Almeida (paciente recorrente).
// Idempotente: limpa conversas/mensagens/agendamentos dos 2 contatos antes.
//
// Pré-requisito: rodar antes scripts/seed-contatos-teste.ts

import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "fs"
import { resolve } from "path"
import { createId } from "@paralleldrive/cuid2"

function sanear(v: string): string {
  return v.replace(/^["']|["']$/g, "").replace(/\\n|\\r|\r|\n/g, "").trim()
}

for (const nome of [".env.local", ".env.production.local", ".env.production"]) {
  try {
    const raw = readFileSync(resolve(process.cwd(), nome), "utf-8")
    for (const linha of raw.split(/\r?\n/)) {
      const m = linha.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
      if (!m) continue
      const [, k, v] = m
      if (!process.env[k]) process.env[k] = sanear(v)
    }
  } catch {}
}

const supabase = createClient(
  sanear(process.env.NEXT_PUBLIC_SUPABASE_URL || ""),
  sanear(process.env.SUPABASE_SERVICE_ROLE_KEY || "")
)

const agora = () => new Date().toISOString()

const WHATSAPP_LEAD = "5511999998888"
const WHATSAPP_PACIENTE = "5511988887777"

interface MsgSeed {
  remetente: "paciente" | "ia"
  conteudo: string
  minutosOffset: number
}

interface Contato {
  id: string
  whatsapp: string | null
  nome: string
}

async function upsertProcedimento(nome: string, tipo: string, duracaoMin: number) {
  const { data: existente } = await supabase
    .from("procedimentos")
    .select("id, nome")
    .ilike("nome", nome)
    .is("deletadoEm", null)
    .maybeSingle()

  if (existente) {
    console.log(`  ✓ Procedimento já existia: ${existente.nome}`)
    return existente
  }

  const id = `proc-${nome.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 30)}`
  const tsAgora = agora()
  const { data: novo, error } = await supabase
    .from("procedimentos")
    .insert({
      id,
      nome,
      tipo,
      duracaoMin,
      ativo: true,
      criadoEm: tsAgora,
      atualizadoEm: tsAgora,
    } as never)
    .select("id, nome")
    .single()

  if (error) {
    console.error(`Erro ao criar procedimento ${nome}:`, error)
    process.exit(1)
  }
  console.log(`  ✓ Procedimento criado: ${novo.nome} (${id})`)
  return novo
}

async function criarConversaComMensagens(opts: {
  contato: Contato
  ciclo: number
  etapa: "acolhimento" | "qualificacao" | "agendamento" | "consulta_agendada"
  encerradaEm: string | null
  inicioISO: string
  sufixo: string
  mensagens: MsgSeed[]
}) {
  const { contato, ciclo, etapa, encerradaEm, inicioISO, sufixo, mensagens } = opts
  const conversaId = createId()
  const inicio = new Date(inicioISO).getTime()
  const ultimaMsgTs = new Date(inicio + mensagens[mensagens.length - 1].minutosOffset * 60_000).toISOString()

  const { error: errConv } = await supabase
    .from("conversas")
    .insert({
      id: conversaId,
      contatoId: contato.id,
      atendenteId: null,
      etapa,
      modoConversa: "ia",
      ciclo,
      criadoEm: inicioISO,
      atualizadoEm: ultimaMsgTs,
      ultimaMensagemEm: ultimaMsgTs,
      encerradaEm,
    } as never)

  if (errConv) {
    console.error(`Erro ao criar conversa ${sufixo}:`, errConv)
    process.exit(1)
  }

  const linhasMsg = mensagens.map((m, i) => {
    const ts = new Date(inicio + m.minutosOffset * 60_000).toISOString()
    return {
      id: createId(),
      conversaId,
      contatoId: contato.id,
      messageIdWhatsapp: `seed_${m.remetente === "ia" ? "agente_" : ""}${sufixo}_msg${i + 1}`,
      tipo: "texto",
      conteudo: m.conteudo,
      remetente: m.remetente,
      mediaUrl: null,
      mediaType: null,
      replyToId: null,
      criadoEm: ts,
      lidaEm: m.remetente === "paciente" ? ts : null,
    }
  })

  const { error: errMsg } = await supabase.from("mensagens_whatsapp").insert(linhasMsg as never)
  if (errMsg) {
    console.error(`Erro ao inserir mensagens ${sufixo}:`, errMsg)
    process.exit(1)
  }

  console.log(`  ✓ Conversa ${sufixo} (ciclo ${ciclo}, ${etapa}): ${linhasMsg.length} mensagens`)
  return { conversaId, total: linhasMsg.length }
}

function dataXdiasAtras(dias: number): string {
  const d = new Date()
  d.setDate(d.getDate() - dias)
  d.setHours(10, 0, 0, 0)
  return d.toISOString()
}

async function main() {
  // 1. Buscar contatos
  const { data: contatos, error: errCt } = await supabase
    .from("contatos")
    .select("id, whatsapp, nome")
    .in("whatsapp", [WHATSAPP_LEAD, WHATSAPP_PACIENTE])
  if (errCt || !contatos) {
    console.error("Erro ao buscar contatos:", errCt)
    process.exit(1)
  }

  const maria = contatos.find((c) => c.whatsapp === WHATSAPP_LEAD) as Contato | undefined
  const roberto = contatos.find((c) => c.whatsapp === WHATSAPP_PACIENTE) as Contato | undefined
  if (!maria || !roberto) {
    console.error("Contatos seed não encontrados. Rode antes: npx tsx scripts/seed-contatos-teste.ts")
    process.exit(1)
  }
  console.log(`✓ Contatos encontrados: ${maria.nome} (lead), ${roberto.nome} (paciente)`)

  // 2. Limpar dados anteriores (idempotência)
  console.log("\nLimpando dados anteriores...")
  await supabase.from("agendamentos").delete().in("contatoId", [maria.id, roberto.id])
  await supabase.from("mensagens_whatsapp").delete().in("contatoId", [maria.id, roberto.id])
  await supabase.from("conversas").delete().in("contatoId", [maria.id, roberto.id])
  console.log("  ✓ Conversas, mensagens e agendamentos anteriores removidos")

  // 3. Upsert procedimentos
  console.log("\nGarantindo procedimentos...")
  const procRino = await upsertProcedimento("Rinomodelação", "Minimamente Invasivo", 60)
  await upsertProcedimento("Harmonização Facial", "Estético", 90)

  // 4. Maria — 1 conversa em qualificacao
  console.log("\nCriando histórico Maria Silva...")
  const inicioMaria = dataXdiasAtras(4)
  await criarConversaComMensagens({
    contato: maria,
    ciclo: 1,
    etapa: "qualificacao",
    encerradaEm: null,
    inicioISO: inicioMaria,
    sufixo: "maria",
    mensagens: [
      { remetente: "paciente", conteudo: "Oi! Tudo bem? Vi o instagram da clínica e me interessei pelo trabalho do Dr. Lucas. Queria saber mais sobre harmonização facial 🙂", minutosOffset: 0 },
      { remetente: "ia", conteudo: "Olá! Que bom te receber por aqui 💙 Me chamo Ana Júlia, sou a assistente do Dr. Lucas Felipe. Com prazer te ajudo com informações sobre harmonização. Posso te chamar pelo nome?", minutosOffset: 3 },
      { remetente: "paciente", conteudo: "Maria Silva", minutosOffset: 5 },
      { remetente: "ia", conteudo: "Ótimo te conhecer, Maria! 😊 Pra te orientar melhor, me conta o que você está buscando especificamente? É algo geral no rosto ou tem alguma região que te incomoda mais?", minutosOffset: 6 },
      // sessão dia +1
      { remetente: "paciente", conteudo: "Eu queria fazer harmonização facial mesmo, e tô pensando em fazer bichectomia também. Acha que dá pra avaliar os dois?", minutosOffset: 60 * 24 + 30 },
      { remetente: "ia", conteudo: "Dá sim, Maria 👌 A harmonização facial inclui preenchimento de pontos estratégicos (lábios, mandíbula, queixo), botox e design de contorno. A bichectomia (retirada das bolsas de Bichat) é um procedimento separado mas pode complementar bem o resultado, dependendo da estrutura do seu rosto. Você já fez algum procedimento estético antes?", minutosOffset: 60 * 24 + 33 },
      { remetente: "paciente", conteudo: "Sim, fiz preenchimento labial em 2024", minutosOffset: 60 * 24 + 35 },
      { remetente: "ia", conteudo: "Perfeito 🙌 Vai ser bem mais simples então, você já está familiarizada com o processo. Pra a gente avançar, posso te oferecer uma avaliação presencial com o Dr. Lucas? Nessa consulta ele avalia teu rosto, conversa sobre teus objetivos e monta um plano personalizado. Tem disponibilidade essa semana ou na próxima?", minutosOffset: 60 * 24 + 40 },
      // sessão dia +2 (resposta tardia)
      { remetente: "paciente", conteudo: "Posso me passar mais detalhes sobre os valores antes? Quero conversar com meu marido também antes de marcar.", minutosOffset: 60 * 48 + 200 },
      { remetente: "ia", conteudo: "Claro, Maria, sem pressa 💙 Os valores variam conforme o plano definido na avaliação (depende de quantos pontos vão ser tratados). Mas a avaliação em si é gratuita e dura cerca de 30-40 minutos. Quando você definir com seu marido, é só me chamar aqui que a gente agenda 🙂", minutosOffset: 60 * 48 + 210 },
    ],
  })

  // 5. Roberto — Ciclo 1 (fechado, dezembro 2025)
  console.log("\nCriando histórico Roberto Almeida — ciclo 1 (fechado)...")
  await criarConversaComMensagens({
    contato: roberto,
    ciclo: 1,
    etapa: "consulta_agendada",
    encerradaEm: "2025-12-25T20:00:00.000Z",
    inicioISO: "2025-12-08T18:23:00.000Z",
    sufixo: "roberto_c1",
    mensagens: [
      { remetente: "paciente", conteudo: "Olá! Boa tarde. Recebi indicação da Marina Souza pra rinomodelação. Como faço pra saber mais?", minutosOffset: 0 },
      { remetente: "ia", conteudo: "Boa tarde! Que ótima indicação 🙂 Sou a Ana Júlia, assistente do Dr. Lucas Felipe. A Marina é uma paciente querida nossa. Pra te apresentar a clínica, primeiro me diz: como posso te chamar?", minutosOffset: 2 },
      { remetente: "paciente", conteudo: "Roberto, tudo bem 👍", minutosOffset: 4 },
      { remetente: "ia", conteudo: "Prazer Roberto! Me conta um pouco do que você gostaria de melhorar no nariz? E é a primeira vez que faria um procedimento estético?", minutosOffset: 5 },
      { remetente: "paciente", conteudo: "Quero deixar a ponta mais definida e levantar um pouquinho. Sim, é a primeira vez. Tenho 41 anos.", minutosOffset: 7 },
      { remetente: "ia", conteudo: "Entendi perfeitamente! 🙌 A rinomodelação é justamente isso: redefine a ponta, eleva sutilmente, corrige assimetrias — tudo sem cirurgia. O procedimento dura cerca de 1h, é feito em consultório com anestesia local e o resultado já é visível na hora. Você tem alguma alergia a anestésico ou usa medicamento contínuo?", minutosOffset: 10 },
      // dia +1
      { remetente: "paciente", conteudo: "Não tenho alergia, e tomo só vitamina D. Quanto fica em média?", minutosOffset: 60 * 24 + 100 },
      { remetente: "ia", conteudo: "Ótimo Roberto! 👌 O valor da rinomodelação varia entre R$ 1.800 e R$ 2.400, dependendo da quantidade de produto. A avaliação presencial é gratuita e o Dr. Lucas define o valor exato após examinar. Quer agendar?", minutosOffset: 60 * 24 + 110 },
      // dia +4 — agendamento
      { remetente: "paciente", conteudo: "Quero sim! Tem alguma data essa semana?", minutosOffset: 60 * 24 * 4 + 30 },
      { remetente: "ia", conteudo: "Tenho 3 horários disponíveis: terça (12/12) às 10h, quinta (15/12) às 14h, ou sábado (17/12) às 9h. Qual prefere?", minutosOffset: 60 * 24 * 4 + 35 },
      { remetente: "paciente", conteudo: "Quinta às 14h é perfeito 👌", minutosOffset: 60 * 24 * 4 + 40 },
      { remetente: "ia", conteudo: "Combinado, Roberto! ✅ Agendei sua consulta para quinta-feira, 15/12 às 14h, com o Dr. Lucas Felipe. O endereço é R. das Acácias, 123 - Vila Mariana. Chega 10min antes. Vou te lembrar 1 dia antes 🙂", minutosOffset: 60 * 24 * 4 + 42 },
      // dia +6 — lembrete
      { remetente: "ia", conteudo: "Oi Roberto! Lembrete: amanhã (15/12) às 14h é a sua avaliação com o Dr. Lucas. Está confirmado? 🙂", minutosOffset: 60 * 24 * 6 + 540 },
      { remetente: "paciente", conteudo: "Confirmado! Até amanhã.", minutosOffset: 60 * 24 * 6 + 545 },
      // dia +9 — pós-op
      { remetente: "ia", conteudo: "Oi Roberto! Como você está se sentindo após a rinomodelação? Algum desconforto, inchaço além do esperado, ou alguma dúvida?", minutosOffset: 60 * 24 * 9 + 600 },
      { remetente: "paciente", conteudo: "Tudo ótimo Ana! Inchaço normal, ficou perfeito o resultado. Muito obrigado, e parabenize o Dr. Lucas pra mim 👏", minutosOffset: 60 * 24 * 9 + 800 },
      { remetente: "ia", conteudo: "Que ótimo Roberto! 💙 Vou repassar pro Dr. Lucas com certeza. Lembrando que se precisar de qualquer coisa, é só me chamar. Boas festas! 🎄", minutosOffset: 60 * 24 * 9 + 810 },
    ],
  })

  // 6. Roberto — Ciclo 2 (atual, aberto)
  console.log("\nCriando histórico Roberto Almeida — ciclo 2 (atual)...")
  await criarConversaComMensagens({
    contato: roberto,
    ciclo: 2,
    etapa: "consulta_agendada",
    encerradaEm: null,
    inicioISO: dataXdiasAtras(6),
    sufixo: "roberto_c2",
    mensagens: [
      { remetente: "paciente", conteudo: "Oi Ana! Tudo bem? Sou o Roberto, fiz a rinomodelação ano passado em dezembro, lembra? Queria fazer um retoque pra definir mais a ponta 🙂", minutosOffset: 0 },
      { remetente: "ia", conteudo: "Roberto! Que alegria te ver de novo aqui ☺️ Lembro sim, claro. Que bom que voltou! Você está pensando em complementar o resultado, é isso?", minutosOffset: 5 },
      { remetente: "paciente", conteudo: "Exato. Ficou ótimo da última vez, só queria definir um pouquinho mais a ponta agora que assentou bem.", minutosOffset: 8 },
      // dia +2
      { remetente: "ia", conteudo: "Perfeito Roberto, faz total sentido. Como você já é paciente nosso, dá pra simplificar o agendamento. Tenho horários: quinta (30/04) 9h, sexta (01/05) 14h, ou terça (05/05) 10h. Qual prefere?", minutosOffset: 60 * 24 * 2 + 60 },
      // dia +3
      { remetente: "paciente", conteudo: "Quinta 30/04 às 9h, perfeito.", minutosOffset: 60 * 24 * 3 + 30 },
      { remetente: "ia", conteudo: "Agendado Roberto ✅ Quinta 30/04 às 9h com o Dr. Lucas. Mesmo endereço (R. das Acácias, 123). Chega 15 minutos antes. Te lembro 1 dia antes 🙂", minutosOffset: 60 * 24 * 3 + 32 },
    ],
  })

  // 7. Agendamentos do Roberto
  console.log("\nCriando agendamentos do Roberto...")
  const { error: errAg } = await supabase.from("agendamentos").insert([
    {
      id: createId(),
      contatoId: roberto.id,
      procedimentoId: procRino.id,
      dataHora: "2025-12-15T17:00:00.000Z", // 14h horário SP
      duracao: 60,
      status: "realizado",
      ciclo: 1,
      observacao: "Primeira rinomodelação. Sem alergias conhecidas. Resultado satisfatório, paciente parabenizou.",
      sincronizado: false,
      criadoEm: "2025-12-12T21:42:00.000Z",
      atualizadoEm: "2025-12-15T18:30:00.000Z",
    },
    {
      id: createId(),
      contatoId: roberto.id,
      procedimentoId: procRino.id,
      dataHora: "2026-04-30T12:00:00.000Z", // 9h horário SP
      duracao: 60,
      status: "agendado",
      ciclo: 2,
      observacao: "Retoque. Paciente recorrente. Definição da ponta após ~4 meses do primeiro procedimento.",
      sincronizado: false,
      criadoEm: agora(),
      atualizadoEm: agora(),
    },
  ] as never)

  if (errAg) {
    console.error("Erro ao criar agendamentos:", errAg)
    process.exit(1)
  }
  console.log("  ✓ 2 agendamentos criados (1 realizado em dez/2025 + 1 agendado para 30/04/2026)")

  console.log("\n=== Seed de histórico concluído ===")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
