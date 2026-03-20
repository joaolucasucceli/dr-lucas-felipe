import { PrismaClient } from "../generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { hash } from "bcryptjs"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const senhaHash = await hash("senha123", 12)

  // Usuários
  const lucas = await prisma.usuario.upsert({
    where: { email: "lucas@drlucas.com.br" },
    update: { nome: "Dr. Lucas Felipe", senha: senhaHash, ativo: true, deletadoEm: null },
    create: {
      nome: "Dr. Lucas Felipe",
      email: "lucas@drlucas.com.br",
      senha: senhaHash,
      perfil: "gestor",
      tipo: "humano",
    },
  })

  const anaJulia = await prisma.usuario.upsert({
    where: { email: "ia@drlucas.com.br" },
    update: { nome: "Ana Júlia — IA", senha: senhaHash, ativo: true, deletadoEm: null },
    create: {
      nome: "Ana Júlia — IA",
      email: "ia@drlucas.com.br",
      senha: senhaHash,
      perfil: "atendente",
      tipo: "ia",
    },
  })

  const dev = await prisma.usuario.upsert({
    where: { email: "dev@drlucas.com.br" },
    update: { nome: "Desenvolvedor", senha: senhaHash, ativo: true, deletadoEm: null },
    create: {
      nome: "Desenvolvedor",
      email: "dev@drlucas.com.br",
      senha: senhaHash,
      perfil: "desenvolvedor",
      tipo: "humano",
    },
  })

  const maria = await prisma.usuario.upsert({
    where: { email: "maria@drlucas.com.br" },
    update: { nome: "Maria Atendente", senha: senhaHash, ativo: true, deletadoEm: null },
    create: {
      nome: "Maria Atendente",
      email: "maria@drlucas.com.br",
      senha: senhaHash,
      perfil: "atendente",
      tipo: "humano",
    },
  })

  // Procedimentos
  const miniLipo = await prisma.procedimento.upsert({
    where: { id: "proc-mini-lipo" },
    update: { nome: "Mini Lipo", ativo: true, deletadoEm: null },
    create: {
      id: "proc-mini-lipo",
      nome: "Mini Lipo",
      tipo: "cirurgico",
      descricao: "Lipoaspiração de pequenas áreas com anestesia local",
      valorBase: 8000,
      duracaoMin: 120,
      posOperatorio:
        "Uso de cinta compressiva por 30 dias. Repouso relativo por 7 dias. Drenagem linfática recomendada.",
    },
  })

  const lipoGlutea = await prisma.procedimento.upsert({
    where: { id: "proc-lipo-glutea" },
    update: { nome: "Lipo Enxertia Glútea", ativo: true, deletadoEm: null },
    create: {
      id: "proc-lipo-glutea",
      nome: "Lipo Enxertia Glútea",
      tipo: "cirurgico",
      descricao:
        "Lipoaspiração com transferência de gordura para glúteos (Brazilian Butt Lift)",
      valorBase: 15000,
      duracaoMin: 180,
      posOperatorio:
        "Evitar sentar diretamente por 15 dias. Cinta compressiva por 45 dias. Drenagem linfática obrigatória.",
    },
  })

  const pmma = await prisma.procedimento.upsert({
    where: { id: "proc-pmma" },
    update: { nome: "PMMA", ativo: true, deletadoEm: null },
    create: {
      id: "proc-pmma",
      nome: "PMMA",
      tipo: "estetico",
      descricao: "Preenchimento com polimetilmetacrilato para volumização",
      valorBase: 3000,
      duracaoMin: 60,
      posOperatorio:
        "Evitar exercícios intensos por 48h. Massagear a região conforme orientação.",
    },
  })

  // Leads de exemplo
  const leadsData = [
    { nome: "Ana Silva", whatsapp: "11991110001", statusFunil: "primeiro_atendimento" as const, procedimentoInteresse: "Mini Lipo" },
    { nome: "Bruna Costa", whatsapp: "11991110002", statusFunil: "qualificacao" as const, procedimentoInteresse: "Lipo Enxertia Glútea" },
    { nome: "Carla Souza", whatsapp: "11991110003", statusFunil: "agendamento" as const, procedimentoInteresse: "PMMA" },
    { nome: "Diana Lima", whatsapp: "11991110004", statusFunil: "consulta_agendada" as const, procedimentoInteresse: "Mini Lipo" },
    { nome: "Elena Rocha", whatsapp: "11991110005", statusFunil: "consulta_realizada" as const, procedimentoInteresse: "Lipo Enxertia Glútea" },
  ]

  const leads = []
  for (const data of leadsData) {
    const lead = await prisma.lead.upsert({
      where: { whatsapp: data.whatsapp },
      update: {
        nome: data.nome,
        statusFunil: data.statusFunil,
        procedimentoInteresse: data.procedimentoInteresse,
        responsavelId: anaJulia.id,
        arquivado: false,
        arquivadoEm: null,
        deletadoEm: null,
      },
      create: {
        nome: data.nome,
        whatsapp: data.whatsapp,
        statusFunil: data.statusFunil,
        procedimentoInteresse: data.procedimentoInteresse,
        responsavelId: anaJulia.id,
        origem: "whatsapp",
      },
    })
    leads.push(lead)
  }

  // Sprints de exemplo
  const sprint1 = await prisma.sprint.upsert({
    where: { id: "sprint-8" },
    update: { nome: "Sprint 8 — Dashboards com Métricas", status: "concluida", deletadoEm: null },
    create: {
      id: "sprint-8",
      nome: "Sprint 8 — Dashboards com Métricas",
      descricao: "Dashboard com métricas e KPIs do funil para o gestor",
      status: "concluida",
      dataInicio: new Date("2026-03-01"),
      dataFim: new Date("2026-03-15"),
      ordem: 0,
    },
  })

  const sprint1Itens = [
    { id: "s8-i1", titulo: "API de métricas do dashboard", concluido: true },
    { id: "s8-i2", titulo: "Componente MetricCard", concluido: true },
    { id: "s8-i3", titulo: "Página do dashboard com gráficos", concluido: true },
    { id: "s8-i4", titulo: "Leads em alerta (sem interação)", concluido: true },
  ]

  for (const item of sprint1Itens) {
    await prisma.sprintItem.upsert({
      where: { id: item.id },
      update: { titulo: item.titulo, concluido: item.concluido },
      create: { ...item, sprintId: sprint1.id },
    })
  }

  const sprint2 = await prisma.sprint.upsert({
    where: { id: "sprint-9" },
    update: { nome: "Sprint 9 — Roadmap de Sprints", status: "em_andamento", deletadoEm: null },
    create: {
      id: "sprint-9",
      nome: "Sprint 9 — Roadmap de Sprints",
      descricao: "Módulo de roadmap com sprints e checklists para gestão do desenvolvimento",
      status: "em_andamento",
      dataInicio: new Date("2026-03-16"),
      dataFim: new Date("2026-03-31"),
      ordem: 1,
    },
  })

  const sprint2Itens = [
    { id: "s9-i1", titulo: "Schema Sprint e SprintItem", concluido: true },
    { id: "s9-i2", titulo: "API CRUD de sprints", concluido: true },
    { id: "s9-i3", titulo: "Componentes visuais (cards, checklist)", concluido: true },
    { id: "s9-i4", titulo: "Página do roadmap com drag & drop", concluido: false },
    { id: "s9-i5", titulo: "Testes E2E", concluido: false },
  ]

  for (const item of sprint2Itens) {
    await prisma.sprintItem.upsert({
      where: { id: item.id },
      update: { titulo: item.titulo, concluido: item.concluido },
      create: { ...item, sprintId: sprint2.id },
    })
  }

  console.log("Seed concluído:")
  console.log(`  Usuários: ${lucas.nome}, ${anaJulia.nome}, ${dev.nome}, ${maria.nome}`)
  console.log(`  Procedimentos: ${miniLipo.nome}, ${lipoGlutea.nome}, ${pmma.nome}`)
  console.log(`  Leads: ${leads.map((l) => l.nome).join(", ")}`)
  console.log(`  Sprints: ${sprint1.nome}, ${sprint2.nome}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
