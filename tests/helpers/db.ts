import "dotenv/config"
import pg from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../../generated/prisma/client"

const SEED_WHATSAPPS = [
  "11991110001",
  "11991110002",
  "11991110003",
  "11991110004",
  "11991110005",
]

const SEED_EMAILS = [
  "lucas@drlucas.com.br",
  "ia@drlucas.com.br",
  "dev@drlucas.com.br",
  "maria@drlucas.com.br",
]

const SEED_PROC_IDS = ["proc-mini-lipo", "proc-lipo-glutea", "proc-pmma"]

/**
 * Restaura o banco ao estado do seed.
 * Cria e destrói sua própria conexão para evitar conflitos entre suites paralelas.
 */
export async function restaurarSeed() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  try {
    // -- Passo 0: Deletar todos os agendamentos (sem seed de agendamentos) --
    await prisma.agendamento.deleteMany({})

    // -- Passo 1: Identificar e deletar leads extras (não-seed) --
    const leadsExtras = await prisma.lead.findMany({
      where: { whatsapp: { notIn: SEED_WHATSAPPS } },
      select: { id: true },
    })
    const idsLeadsExtras = leadsExtras.map((l) => l.id)

    if (idsLeadsExtras.length > 0) {
      await prisma.mensagemWhatsapp.deleteMany({
        where: { leadId: { in: idsLeadsExtras } },
      })
      await prisma.conversa.deleteMany({
        where: { leadId: { in: idsLeadsExtras } },
      })
      await prisma.agendamento.deleteMany({
        where: { leadId: { in: idsLeadsExtras } },
      })
      await prisma.fotoLead.deleteMany({
        where: { leadId: { in: idsLeadsExtras } },
      })
      await prisma.lead.deleteMany({
        where: { id: { in: idsLeadsExtras } },
      })
    }

    // -- Passo 2: Deletar usuários extras --
    const usuariosExtras = await prisma.usuario.findMany({
      where: { email: { notIn: SEED_EMAILS } },
      select: { id: true },
    })
    const idsUsuariosExtras = usuariosExtras.map((u) => u.id)

    if (idsUsuariosExtras.length > 0) {
      await prisma.usuario.deleteMany({
        where: { id: { in: idsUsuariosExtras } },
      })
    }

    // -- Passo 3: Deletar procedimentos extras --
    await prisma.agendamento.updateMany({
      where: {
        procedimentoId: { notIn: SEED_PROC_IDS },
        procedimento: { isNot: null },
      },
      data: { procedimentoId: null },
    })
    await prisma.procedimento.deleteMany({
      where: { id: { notIn: SEED_PROC_IDS } },
    })

    // -- Passo 4: Restaurar leads do seed --
    const leadsRestore: {
      whatsapp: string
      nome: string
      statusFunil:
        | "primeiro_atendimento"
        | "qualificacao"
        | "agendamento"
        | "consulta_agendada"
        | "consulta_realizada"
    }[] = [
      { whatsapp: "11991110001", nome: "Ana Silva", statusFunil: "primeiro_atendimento" },
      { whatsapp: "11991110002", nome: "Bruna Costa", statusFunil: "qualificacao" },
      { whatsapp: "11991110003", nome: "Carla Souza", statusFunil: "agendamento" },
      { whatsapp: "11991110004", nome: "Diana Lima", statusFunil: "consulta_agendada" },
      { whatsapp: "11991110005", nome: "Elena Rocha", statusFunil: "consulta_realizada" },
    ]

    for (const lead of leadsRestore) {
      await prisma.lead.update({
        where: { whatsapp: lead.whatsapp },
        data: {
          nome: lead.nome,
          statusFunil: lead.statusFunil,
          arquivado: false,
          arquivadoEm: null,
          deletadoEm: null,
        },
      })
    }

    // -- Passo 5: Restaurar usuários do seed --
    const usuariosRestore = [
      { email: "lucas@drlucas.com.br", nome: "Dr. Lucas Felipe" },
      { email: "ia@drlucas.com.br", nome: "Ana Júlia — IA" },
      { email: "dev@drlucas.com.br", nome: "Desenvolvedor" },
      { email: "maria@drlucas.com.br", nome: "Maria Atendente" },
    ]

    for (const usuario of usuariosRestore) {
      await prisma.usuario.update({
        where: { email: usuario.email },
        data: {
          nome: usuario.nome,
          ativo: true,
          deletadoEm: null,
        },
      })
    }

    // -- Passo 6: Restaurar procedimentos do seed --
    const procsRestore = [
      { id: "proc-mini-lipo", nome: "Mini Lipo" },
      { id: "proc-lipo-glutea", nome: "Lipo Enxertia Glútea" },
      { id: "proc-pmma", nome: "PMMA" },
    ]

    for (const proc of procsRestore) {
      await prisma.procedimento.update({
        where: { id: proc.id },
        data: {
          nome: proc.nome,
          ativo: true,
          deletadoEm: null,
        },
      })
    }
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}
