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
    update: {},
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
    update: {},
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
    update: {},
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

  console.log("Seed concluído:")
  console.log(`  Usuários: ${lucas.nome}, ${anaJulia.nome}, ${dev.nome}, ${maria.nome}`)
  console.log(`  Procedimentos: ${miniLipo.nome}, ${lipoGlutea.nome}, ${pmma.nome}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
