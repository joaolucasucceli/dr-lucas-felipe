import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const maxDuration = 60

function autorizar(req: NextRequest) {
  const secret = process.env.ADMIN_CLEANUP_SECRET
  if (!secret) return false
  return req.headers.get("x-admin-secret") === secret
}

export async function POST(req: NextRequest) {
  if (!autorizar(req)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
  }

  // Buscar usuario IA
  const usuarioIa = await prisma.usuario.findFirst({
    where: { tipo: "ia", ativo: true },
  })

  // Buscar procedimento
  const miniLipo = await prisma.procedimento.findFirst({
    where: { nome: "Mini Lipo" },
  })

  // ── LEAD COMPLETO ──
  const lead = await prisma.lead.upsert({
    where: { id: "lead-teste-completo" },
    update: {},
    create: {
      id: "lead-teste-completo",
      nome: "Maria Silva Santos",
      whatsapp: "5511987654321",
      statusFunil: "consulta_agendada",
      procedimentoInteresse: "Mini Lipo",
      sobreOPaciente: "Nome: Maria Silva Santos\n---\nProcedimento: Mini Lipo\nRegião: abdome e flancos\nJá fez procedimento estético: não\nSaúde geral: boa, sem comorbidades\n---\nFoto: sim — região do abdome, gordura localizada moderada\n---\nCidade: Guarapari/ES",
      origem: "whatsapp",
      responsavelId: usuarioIa?.id || null,
    },
  })

  // Conversa com mensagens
  const conversa = await prisma.conversa.upsert({
    where: { id: "conv-teste-completa" },
    update: {},
    create: {
      id: "conv-teste-completa",
      leadId: lead.id,
      etapa: "consulta_agendada",
    },
  })

  const msgs = [
    { id: "msg-t01", conteudo: "Bom dia", remetente: "paciente", tipo: "texto" as const },
    { id: "msg-t02", conteudo: "Olá, bom dia!", remetente: "agente", tipo: "texto" as const },
    { id: "msg-t03", conteudo: "Meu nome é Ana Júlia, sou do time de pré-atendimento do Dr. Lucas Ferreira.", remetente: "agente", tipo: "texto" as const },
    { id: "msg-t04", conteudo: "Pra eu te atender melhor, como posso te chamar?", remetente: "agente", tipo: "texto" as const },
    { id: "msg-t05", conteudo: "Meu nome é Maria", remetente: "paciente", tipo: "texto" as const },
    { id: "msg-t06", conteudo: "Que bom falar com você, Maria!", remetente: "agente", tipo: "texto" as const },
    { id: "msg-t07", conteudo: "Você está buscando informações sobre algum procedimento específico ou gostaria de conhecer o trabalho do Dr. Lucas?", remetente: "agente", tipo: "texto" as const },
    { id: "msg-t08", conteudo: "Quero saber sobre mini lipo", remetente: "paciente", tipo: "texto" as const },
    { id: "msg-t09", conteudo: "A Mini Lipo é uma lipoaspiração de pequenas áreas, realizada com anestesia local. É ideal para quem deseja tratar regiões específicas com recuperação mais rápida.", remetente: "agente", tipo: "texto" as const },
    { id: "msg-t10", conteudo: "Quais regiões do corpo te incomodam mais?", remetente: "agente", tipo: "texto" as const },
    { id: "msg-t11", conteudo: "barriga e flancos", remetente: "paciente", tipo: "texto" as const },
    { id: "msg-t12", conteudo: "Perfeito, Maria! A Mini Lipo pode ser uma ótima opção pra tratar essa região.", remetente: "agente", tipo: "texto" as const },
    { id: "msg-t13", conteudo: "Vamos agendar sua consulta? Tenho horários disponíveis essa semana.", remetente: "agente", tipo: "texto" as const },
    { id: "msg-t14", conteudo: "Pode ser quinta às 14h", remetente: "paciente", tipo: "texto" as const },
    { id: "msg-t15", conteudo: "Agendado! Sua consulta com o Dr. Lucas Ferreira está confirmada para quinta-feira às 14h. Vou te enviar um lembrete um dia antes.", remetente: "agente", tipo: "texto" as const },
  ]

  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i]
    await prisma.mensagemWhatsapp.upsert({
      where: { id: m.id },
      update: {},
      create: {
        id: m.id,
        conversaId: conversa.id,
        leadId: lead.id,
        messageIdWhatsapp: `teste_${m.id}`,
        tipo: m.tipo,
        conteudo: m.conteudo,
        remetente: m.remetente,
        criadoEm: new Date(Date.now() - (msgs.length - i) * 60000),
      },
    })
  }

  // Fotos do lead
  const fotoUrls = [
    "/images/resultados/lipo-abdome-flancos/01.jpeg",
    "/images/resultados/lipo-abdome-flancos/02.jpeg",
  ]
  for (let i = 0; i < fotoUrls.length; i++) {
    await prisma.fotoLead.upsert({
      where: { id: `foto-teste-${i + 1}` },
      update: {},
      create: {
        id: `foto-teste-${i + 1}`,
        leadId: lead.id,
        url: fotoUrls[i],
        tipoAnalise: i === 0 ? "antes" : "depois",
        descricao: i === 0 ? "Região abdominal — avaliação inicial" : "Resultado pós-procedimento",
      },
    })
  }

  // Agendamento
  const agendamento = await prisma.agendamento.upsert({
    where: { id: "ag-teste-01" },
    update: {},
    create: {
      id: "ag-teste-01",
      leadId: lead.id,
      procedimentoId: miniLipo?.id || null,
      dataHora: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // daqui 2 dias
      status: "confirmado",
      observacao: "Primeira consulta — Mini Lipo abdome e flancos",
    },
  })

  // ── PACIENTE COMPLETO ──
  const paciente = await prisma.paciente.upsert({
    where: { id: "pac-teste-completo" },
    update: {},
    create: {
      id: "pac-teste-completo",
      nome: "Ana Clara Oliveira",
      whatsapp: "5527999887766",
      email: "ana.clara@email.com",
      cpf: "123.456.789-00",
      dataNascimento: new Date("1990-05-15"),
      sexo: "feminino",
      endereco: "Rua das Flores, 123",
      cidade: "Vitória",
      estado: "ES",
      contatoEmergencia: "Carlos Oliveira",
      contatoEmergenciaTel: "5527988776655",
      consentimentoLgpd: true,
    },
  })

  // Prontuário
  const prontuario = await prisma.prontuario.upsert({
    where: { id: "pront-teste-01" },
    update: {},
    create: {
      id: "pront-teste-01",
      pacienteId: paciente.id,
      numero: 1,
    },
  })

  // Anamnese
  await prisma.anamnese.upsert({
    where: { prontuarioId: prontuario.id },
    update: {},
    create: {
      prontuarioId: prontuario.id,
      queixaPrincipal: "Gordura localizada na região abdominal e flancos",
      alergias: "Nenhuma alergia conhecida",
      medicamentosEmUso: "Anticoncepcional oral",
      cirurgiasAnteriores: "Nenhuma",
      doencasPreExistentes: "Nenhuma",
      atividadeFisica: "Musculação 3x/semana + cardio",
      tabagismo: false,
      etilismo: false,
      pesoKg: 65,
      alturaCm: 165,
      imc: 23.9,
      observacoes: "Paciente em bom estado geral, IMC adequado. Deseja Mini Lipo na região abdominal para definição corporal.",
    },
  })

  // Evolução
  await prisma.evolucao.upsert({
    where: { id: "evo-teste-01" },
    update: {},
    create: {
      id: "evo-teste-01",
      prontuarioId: prontuario.id,
      tipo: "consulta",
      titulo: "Primeira consulta — avaliação Mini Lipo",
      conteudo: "Paciente apresenta gordura localizada em região abdominal e flancos. Pele com boa elasticidade. Indicada Mini Lipo com anestesia local. Solicitados exames pré-operatórios: hemograma, coagulograma, glicemia, ECG.",
      orientacoes: "Retornar com exames em 7 dias. Manter atividade física regular.",
    },
  })

  return NextResponse.json({
    ok: true,
    lead: { id: lead.id, nome: lead.nome },
    agendamento: { id: agendamento.id },
    paciente: { id: paciente.id, nome: paciente.nome },
    prontuario: { id: prontuario.id },
  })
}
