import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { captarLeadSiteSchema } from "@/lib/validations/lead-site"
import { checkRateLimitCaptar, registrarTentativaCaptar } from "@/lib/rate-limit"
import { adicionarAoBuffer } from "@/lib/agente/buffer"

export async function POST(request: NextRequest) {
  // 0. Validar origem (CSRF básico)
  const origin = request.headers.get("origin")
  const allowedOrigins = [
    process.env.NEXTAUTH_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    "http://localhost:3000",
    "http://localhost:3003",
  ].filter(Boolean) as string[]

  if (origin && !allowedOrigins.includes(origin)) {
    return NextResponse.json(
      { error: "Origem não autorizada" },
      { status: 403 }
    )
  }

  // 1. Rate limit por IP
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"

  const { bloqueado } = await checkRateLimitCaptar(ip)
  if (bloqueado) {
    return NextResponse.json(
      { error: "Muitas tentativas. Tente novamente mais tarde." },
      { status: 429 }
    )
  }

  // 2. Validar payload
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 })
  }

  const resultado = captarLeadSiteSchema.safeParse(body)
  if (!resultado.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: resultado.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { nome, whatsapp, procedimentoInteresse, _hp } = resultado.data

  // 3. Honeypot — bot preencheu campo oculto
  if (_hp) {
    // Retorna sucesso falso — não revelar que detectou bot
    return NextResponse.json({ sucesso: true })
  }

  // 4. Verificar se lead já existe (dedup por WhatsApp)
  const leadExistente = await prisma.lead.findUnique({
    where: { whatsapp },
    select: { id: true },
  })

  if (leadExistente) {
    // Sucesso silencioso — privacidade: não revelar que o número já está cadastrado
    await registrarTentativaCaptar(ip)
    return NextResponse.json({ sucesso: true })
  }

  // 5. Buscar usuário IA para atribuir responsável
  const usuarioIa = await prisma.usuario.findFirst({
    where: { tipo: "ia", ativo: true },
    select: { id: true },
  })

  // 6. Criar Lead (com tratamento de race condition na dedup)
  let lead
  try {
    lead = await prisma.lead.create({
      data: {
        nome,
        whatsapp,
        procedimentoInteresse,
        origem: "site",
        statusFunil: "primeiro_atendimento",
        consentimentoLgpd: true,
        consentimentoLgpdEm: new Date(),
        ...(usuarioIa ? { responsavelId: usuarioIa.id } : {}),
      },
    })
  } catch (error: unknown) {
    // Race condition: outro request criou o lead entre findUnique e create
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      await registrarTentativaCaptar(ip)
      return NextResponse.json({ sucesso: true })
    }
    throw error
  }

  // 7. Criar Conversa vinculada
  const conversa = await prisma.conversa.create({
    data: {
      leadId: lead.id,
      etapa: "primeiro_atendimento",
      ultimaMensagemEm: new Date(),
    },
  })

  // 8. Salvar mensagem sintética no banco
  const messageId = `site_${lead.id}_${Date.now()}`
  const conteudoSintetico = `[LEAD CAPTADO PELO SITE] Nome: ${nome}. Procedimento de interesse: ${procedimentoInteresse}. Paciente preencheu o formulário no site e aguarda contato.`

  await prisma.mensagemWhatsapp.create({
    data: {
      conversaId: conversa.id,
      leadId: lead.id,
      messageIdWhatsapp: messageId,
      tipo: "texto",
      conteudo: conteudoSintetico,
      remetente: "paciente",
    },
  })

  // 9. Injetar no buffer Redis para o agente processar
  const chatId = `${whatsapp}@s.whatsapp.net`

  await adicionarAoBuffer(chatId, {
    tipo: "texto",
    conteudo: conteudoSintetico,
    timestamp: Date.now(),
    messageId,
  })

  // 10. Disparar processamento do agente (fire-and-forget — invocação separada)
  const baseUrl =
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")

  fetch(`${baseUrl}/api/agente/processar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-secret": process.env.API_SECRET || "",
    },
    body: JSON.stringify({ chatId }),
  }).catch(() => {
    // Fire-and-forget — falha silenciosa (lead já foi criado no banco)
  })

  // 11. Registrar tentativa de rate limit
  await registrarTentativaCaptar(ip)

  return NextResponse.json({ sucesso: true }, { status: 201 })
}
