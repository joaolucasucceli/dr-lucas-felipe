import { prisma } from "@/lib/prisma"
import { registrarAuditLog } from "@/lib/audit"

interface ResultadoConversao {
  paciente: {
    id: string
    nome: string
    whatsapp: string | null
  }
  jaCriado: boolean
}

/**
 * Converte um Lead em Paciente. Operação idempotente:
 * se o lead já foi convertido, retorna o paciente existente.
 *
 * Dentro de $transaction:
 * 1. Verifica se lead já tem paciente → retorna existente
 * 2. Calcula número do prontuário (MAX+1)
 * 3. Cria Paciente + Prontuário + Anamnese vazia
 * 4. Copia consentimentoLgpd do lead
 * 5. Arquiva o lead
 */
export async function converterLeadParaPaciente(
  leadId: string,
  usuarioId: string
): Promise<ResultadoConversao> {
  // Verificar se já existe paciente para este lead (idempotência)
  const pacienteExistente = await prisma.paciente.findUnique({
    where: { leadOrigemId: leadId },
    select: { id: true, nome: true, whatsapp: true },
  })

  if (pacienteExistente) {
    return { paciente: pacienteExistente, jaCriado: true }
  }

  const lead = await prisma.lead.findUniqueOrThrow({
    where: { id: leadId },
    include: {
      fotos: true,
    },
  })

  const resultado = await prisma.$transaction(async (tx) => {
    // Calcular número do prontuário
    const ultimoProntuario = await tx.prontuario.findFirst({
      orderBy: { numero: "desc" },
      select: { numero: true },
    })
    const numeroProntuario = (ultimoProntuario?.numero ?? 0) + 1

    // Criar Paciente
    const novoPaciente = await tx.paciente.create({
      data: {
        nome: lead.nome,
        whatsapp: lead.whatsapp,
        email: lead.email,
        leadOrigemId: lead.id,
        consentimentoLgpd: lead.consentimentoLgpd,
        consentimentoLgpdEm: lead.consentimentoLgpdEm,
        observacoes: lead.sobreOPaciente,
      },
    })

    // Criar Prontuário + Anamnese vazia
    const prontuario = await tx.prontuario.create({
      data: {
        pacienteId: novoPaciente.id,
        numero: numeroProntuario,
        anamnese: {
          create: {},
        },
      },
    })

    // Copiar fotos do lead para o prontuário
    if (lead.fotos.length > 0) {
      await tx.fotoProntuario.createMany({
        data: lead.fotos.map((foto) => ({
          prontuarioId: prontuario.id,
          url: foto.url,
          descricao: foto.descricao,
          tipoFoto: "pre_operatorio",
          dataRegistro: foto.criadoEm,
        })),
      })
    }

    // Arquivar o lead
    await tx.lead.update({
      where: { id: leadId },
      data: {
        arquivado: true,
        arquivadoEm: new Date(),
      },
    })

    return {
      id: novoPaciente.id,
      nome: novoPaciente.nome,
      whatsapp: novoPaciente.whatsapp,
    }
  })

  await registrarAuditLog({
    usuarioId,
    acao: "converter_lead_paciente",
    entidade: "Paciente",
    entidadeId: resultado.id,
    dadosAntes: { leadId, leadNome: lead.nome },
    dadosDepois: { pacienteId: resultado.id, pacienteNome: resultado.nome },
  })

  return { paciente: resultado, jaCriado: false }
}
