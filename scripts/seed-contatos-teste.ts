// Seed de teste — JLAU-977
// Insere 1 lead e 1 paciente com todos os campos preenchidos para validar
// visualmente a UI apos a correcao das FK constraints.
// Idempotente: deleta os contatos por whatsapp antes de inserir.

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

async function main() {
  const tsAgora = agora()

  // Deletar (de verdade) qualquer contato anterior com esses WhatsApps
  // para que o seed seja idempotente. Cascata vai limpar conversas, mensagens,
  // agendamentos, prontuarios, fotos relacionados.
  const { error: errDel } = await supabase
    .from("contatos")
    .delete()
    .in("whatsapp", [WHATSAPP_LEAD, WHATSAPP_PACIENTE])
  if (errDel) {
    console.error("Erro ao limpar contatos anteriores:", errDel)
    process.exit(1)
  }
  console.log("✓ Contatos anteriores limpos (se existiam)")

  // -------- LEAD --------
  const lead = {
    id: createId(),
    tipo: "lead" as const,
    nome: "Maria Silva Santos",
    whatsapp: WHATSAPP_LEAD,
    email: "maria.silva@exemplo.com",
    origem: "instagram",
    consentimentoLgpd: true,
    consentimentoLgpdEm: tsAgora,
    statusFunil: "qualificacao" as const,
    responsavelId: "cmo0i7mve0002fwss6olqizyk", // Maria Atendente
    procedimentoInteresse: "Harmonização Facial",
    sobreOPaciente:
      "Paciente interessada em harmonização facial. Mencionou também avaliar bichectomia. Já fez preenchimento labial em 2024.",
    ehRetorno: false,
    cicloAtual: 1,
    ciclosCompletos: 0,
    ultimaMovimentacaoEm: tsAgora,
    arquivado: false,
    criadoEm: tsAgora,
    atualizadoEm: tsAgora,
  } as never

  const { data: leadCriado, error: errLead } = await supabase
    .from("contatos")
    .insert(lead)
    .select("id, nome, tipo, statusFunil")
    .single()

  if (errLead) {
    console.error("Erro ao inserir lead:", errLead)
    process.exit(1)
  }
  console.log("✓ Lead criado:", leadCriado)

  // -------- PACIENTE --------
  const paciente = {
    id: createId(),
    tipo: "paciente" as const,
    nome: "Roberto Almeida Costa",
    whatsapp: WHATSAPP_PACIENTE,
    email: "roberto.almeida@exemplo.com",
    origem: "indicacao",
    consentimentoLgpd: true,
    consentimentoLgpdEm: tsAgora,
    statusFunil: "consulta_agendada" as const,
    responsavelId: "usr-lucas", // Dr. Lucas Ferreira
    procedimentoInteresse: "Rinomodelação",
    sobreOPaciente:
      "Paciente recorrente. Realizou rinomodelação em dezembro/2025 com bom resultado. Sem alergias conhecidas. Tolerância normal a anestésicos.",
    ehRetorno: true,
    cicloAtual: 2,
    ciclosCompletos: 1,
    ultimaMovimentacaoEm: tsAgora,
    cpf: "12345678900",
    dataNascimento: "1985-07-15",
    endereco: "Rua das Flores, 123 - Vila Mariana",
    cidade: "São Paulo",
    estado: "SP",
    sexo: "masculino",
    contatoEmergencia: "Ana Costa (esposa)",
    contatoEmergenciaTel: "5511977776666",
    promovidoEm: tsAgora,
    arquivado: false,
    criadoEm: tsAgora,
    atualizadoEm: tsAgora,
  } as never

  const { data: pacienteCriado, error: errPac } = await supabase
    .from("contatos")
    .insert(paciente)
    .select("id, nome, tipo, statusFunil, cpf")
    .single()

  if (errPac) {
    console.error("Erro ao inserir paciente:", errPac)
    process.exit(1)
  }
  console.log("✓ Paciente criado:", pacienteCriado)

  console.log("\n=== Seed concluído com sucesso ===")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
