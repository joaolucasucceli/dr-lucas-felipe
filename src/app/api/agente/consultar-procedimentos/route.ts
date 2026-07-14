import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { validarApiSecret } from "@/lib/api-auth"

export async function POST(request: NextRequest) {
  const erro = validarApiSecret(request)
  if (erro) return erro

  let body: { filtro?: string }
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  let query = supabaseAdmin
    .from("procedimentos")
    .select(
      "id, nome, tipo, descricao, duracaoMin, posOperatorio, " +
        "valorEstimadoBrl, valorCheioBrl, parcelamento, escopoOferta, " +
        "valorBaseMinBrl, valorBaseMaxBrl",
    )
    .eq("ativo", true)
    .is("deletadoEm", null)

  if (body.filtro) {
    query = query.ilike("nome", `%${body.filtro}%`)
  }

  const { data: procedimentos, error } = await query.order("nome", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Faixa aproximada continua disponivel apenas como fallback conversacional
  // quando o paciente pede uma media e recusa qualificacao/foto. O fluxo
  // principal de valor exato passa por gerar_orcamento + Dr. Lucas.
  const formatarBrlCompacto = (v: number): string => {
    if (v >= 1000) {
      const milhares = v / 1000
      const txt = milhares.toFixed(milhares % 1 === 0 ? 0 : 1).replace(".", ",")
      return `R$ ${txt}k`
    }
    return `R$ ${Math.round(v)}`
  }

  // Cast manual: types do Supabase ainda nao regerados pra incluir
  // valorBaseMinBrl/Max. Pra regenerar: `npm run db:types` com
  // SUPABASE_ACCESS_TOKEN valido. Cast e seguro porque a coluna existe no
  // banco (migration 20260525120000) e o select acima nomeia explicitamente.
  type ProcedimentoLido = {
    id: string
    nome: string | null
    tipo: string | null
    descricao: string | null
    duracaoMin: number | null
    posOperatorio: string | null
    valorEstimadoBrl: number | null
    valorCheioBrl: number | null
    parcelamento: string | null
    escopoOferta: string | null
    valorBaseMinBrl: number | null
    valorBaseMaxBrl: number | null
  }

  const enriquecidos = ((procedimentos ?? []) as unknown as ProcedimentoLido[]).map((p) => {
    const min = p.valorBaseMinBrl != null ? Number(p.valorBaseMinBrl) : null
    const max = p.valorBaseMaxBrl != null ? Number(p.valorBaseMaxBrl) : null

    let faixaFormatada: string | null = null
    let temFaixaReal = false

    if (min != null && max != null) {
      faixaFormatada = `${formatarBrlCompacto(min)} a ${formatarBrlCompacto(max)}`
      temFaixaReal = true
    } else if (p.valorEstimadoBrl != null) {
      // Fallback automatico: gera faixa +-15% do valor estimado legado.
      // Marcado como temFaixaReal=false pra IA saber que e estimativa.
      const v = Number(p.valorEstimadoBrl)
      const minCalc = Math.round((v * 0.85) / 100) * 100
      const maxCalc = Math.round((v * 1.15) / 100) * 100
      faixaFormatada = `${formatarBrlCompacto(minCalc)} a ${formatarBrlCompacto(maxCalc)}`
    }

    return {
      ...p,
      valorBaseMinBrl: min,
      valorBaseMaxBrl: max,
      faixaFormatada,
      temFaixaReal,
    }
  })

  return NextResponse.json({ procedimentos: enriquecidos })
}
