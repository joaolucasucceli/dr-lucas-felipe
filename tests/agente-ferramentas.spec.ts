import { test, expect } from "@playwright/test"
import { restaurarSeed } from "./helpers/db"

const BASE_URL = "http://localhost:3100"
const API_SECRET = "dev-api-secret"

function headers() {
  return {
    "Content-Type": "application/json",
    "x-api-secret": API_SECRET,
  }
}

test.describe("Ferramentas do Agente — API", () => {
  test.afterAll(async () => {
    await restaurarSeed()
  })

  test("rejeita requisição sem x-api-secret", async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/agente/consultar-paciente`, {
      data: { whatsapp: "5511999990000" },
    })
    expect(res.status()).toBe(401)
  })

  test("consultar-paciente: cria lead novo", async ({ request }) => {
    const whatsapp = `5511${Date.now().toString().slice(-8)}`

    const res = await request.post(`${BASE_URL}/api/agente/consultar-paciente`, {
      headers: headers(),
      data: { whatsapp },
    })

    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    expect(json.lead).toBeDefined()
    expect(json.lead.whatsapp).toBe(whatsapp)
    expect(json.lead.statusFunil).toBe("primeiro_atendimento")
    expect(json.lead.nome).toContain("WhatsApp")
  })

  test("consultar-paciente: retorna lead existente", async ({ request }) => {
    const whatsapp = `5511${Date.now().toString().slice(-8)}`

    // Criar primeiro
    await request.post(`${BASE_URL}/api/agente/consultar-paciente`, {
      headers: headers(),
      data: { whatsapp },
    })

    // Consultar novamente
    const res = await request.post(`${BASE_URL}/api/agente/consultar-paciente`, {
      headers: headers(),
      data: { whatsapp },
    })

    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    expect(json.lead.whatsapp).toBe(whatsapp)
  })

  test("consultar-procedimentos: retorna procedimentos sem valorBase", async ({
    request,
  }) => {
    const res = await request.post(
      `${BASE_URL}/api/agente/consultar-procedimentos`,
      {
        headers: headers(),
        data: {},
      }
    )

    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    expect(json.procedimentos).toBeDefined()
    expect(json.procedimentos.length).toBeGreaterThanOrEqual(3)

    // Verificar que valorBase NÃO está presente
    for (const proc of json.procedimentos) {
      expect(proc.valorBase).toBeUndefined()
      expect(proc.nome).toBeDefined()
      expect(proc.tipo).toBeDefined()
    }
  })

  test("registrar-mensagem: cria mensagem e conversa", async ({ request }) => {
    // Criar lead
    const whatsapp = `5511${Date.now().toString().slice(-8)}`
    const resPaciente = await request.post(
      `${BASE_URL}/api/agente/consultar-paciente`,
      {
        headers: headers(),
        data: { whatsapp },
      }
    )
    const { lead } = await resPaciente.json()

    const res = await request.post(
      `${BASE_URL}/api/agente/registrar-mensagem`,
      {
        headers: headers(),
        data: {
          leadId: lead.id,
          conteudo: "Olá, gostaria de saber sobre rinoplastia",
          direcao: "paciente",
        },
      }
    )

    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    expect(json.mensagem).toBeDefined()
    expect(json.conversaId).toBeDefined()
    expect(json.mensagem.conteudo).toContain("rinoplastia")
  })

  test("salvar-qualificacao: append sobreOPaciente e muda status", async ({
    request,
  }) => {
    // Criar lead + conversa
    const whatsapp = `5511${Date.now().toString().slice(-8)}`
    const resPaciente = await request.post(
      `${BASE_URL}/api/agente/consultar-paciente`,
      {
        headers: headers(),
        data: { whatsapp },
      }
    )
    const paciente = await resPaciente.json()

    // Criar conversa via registrar-mensagem
    const resMsg = await request.post(
      `${BASE_URL}/api/agente/registrar-mensagem`,
      {
        headers: headers(),
        data: {
          leadId: paciente.lead.id,
          conteudo: "Teste",
          direcao: "paciente",
        },
      }
    )
    const { conversaId } = await resMsg.json()

    // Salvar qualificação
    const res = await request.post(
      `${BASE_URL}/api/agente/salvar-qualificacao`,
      {
        headers: headers(),
        data: {
          leadId: paciente.lead.id,
          conversaId,
          sobreOPaciente: "Paciente interessada em rinoplastia, 28 anos",
          procedimentoInteresse: "Rinoplastia",
        },
      }
    )

    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    expect(json.sucesso).toBe(true)

    // Verificar que lead foi atualizado
    const resVerifica = await request.post(
      `${BASE_URL}/api/agente/consultar-paciente`,
      {
        headers: headers(),
        data: { whatsapp },
      }
    )
    const verificado = await resVerifica.json()
    // salvar-qualificacao NÃO faz sync de kanban — status permanece inalterado
    expect(verificado.lead.statusFunil).toBe("primeiro_atendimento")
    expect(verificado.sobreOPaciente).toContain("rinoplastia")
  })

  test("registrar-agendamento: cria agendamento", async ({
    request,
  }) => {
    // Setup: lead + conversa + qualificação
    const whatsapp = `5511${Date.now().toString().slice(-8)}`
    const resPaciente = await request.post(
      `${BASE_URL}/api/agente/consultar-paciente`,
      {
        headers: headers(),
        data: { whatsapp },
      }
    )
    const paciente = await resPaciente.json()

    const resMsg = await request.post(
      `${BASE_URL}/api/agente/registrar-mensagem`,
      {
        headers: headers(),
        data: {
          leadId: paciente.lead.id,
          conteudo: "Teste",
          direcao: "paciente",
        },
      }
    )
    const { conversaId } = await resMsg.json()

    // Registrar agendamento
    const dataHora = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const res = await request.post(
      `${BASE_URL}/api/agente/registrar-agendamento`,
      {
        headers: headers(),
        data: {
          leadId: paciente.lead.id,
          conversaId,
          dataHora,
        },
      }
    )

    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    expect(json.agendamento).toBeDefined()
    expect(json.agendamento.status).toBe("agendado")

    // Verificar funil
    const resVerifica = await request.post(
      `${BASE_URL}/api/agente/consultar-paciente`,
      {
        headers: headers(),
        data: { whatsapp },
      }
    )
    const verificado = await resVerifica.json()
    // registrar-agendamento NÃO faz sync de kanban — status permanece inalterado
    expect(verificado.lead.statusFunil).toBe("primeiro_atendimento")
  })
})
