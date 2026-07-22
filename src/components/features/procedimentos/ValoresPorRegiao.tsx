"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { fetchJson, normalizarErroApi } from "@/lib/api-client"
import { REGIOES_CORPO, rotuloRegiao } from "@/lib/procedimentos/regioes"

interface FaixaRegiao {
  id: string
  procedimentoId: string
  regiao: string
  valorMinBrl: number
  valorMaxBrl: number
  observacao: string | null
  ativo: boolean
}

const formatarBrl = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })

/** Aceita "10.900,50", "10900.5" e "10900" — o Dr. Lucas digita de formas diferentes. */
function paraNumero(texto: string): number | null {
  const limpo = texto.trim().replace(/[R$\s]/g, "")
  if (!limpo) return null
  const normalizado = limpo.includes(",")
    ? limpo.replace(/\./g, "").replace(",", ".")
    : limpo
  const numero = Number(normalizado)
  return Number.isFinite(numero) && numero > 0 ? numero : null
}

export function ValoresPorRegiao({ procedimentoId }: { procedimentoId: string }) {
  const [faixas, setFaixas] = useState<FaixaRegiao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [novaRegiao, setNovaRegiao] = useState("")
  const [novoMin, setNovoMin] = useState("")
  const [novoMax, setNovoMax] = useState("")

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const json = await fetchJson<{ dados: FaixaRegiao[] }>(
        `/api/procedimentos/regioes?procedimentoId=${procedimentoId}`,
        undefined,
        { recurso: "Valores por região", fallback: "Erro ao carregar valores por região" }
      )
      setFaixas(json.dados)
    } catch (e) {
      toast.error(normalizarErroApi(e, "Erro ao carregar valores por região").mensagem)
    } finally {
      setCarregando(false)
    }
  }, [procedimentoId])

  useEffect(() => {
    carregar()
  }, [carregar])

  const regioesDisponiveis = REGIOES_CORPO.filter(
    (regiao) => !faixas.some((faixa) => faixa.regiao === regiao.chave)
  )

  async function adicionar() {
    const min = paraNumero(novoMin)
    const max = paraNumero(novoMax)

    if (!novaRegiao) return toast.error("Escolha a região")
    if (min == null) return toast.error("Informe o valor mínimo")
    if (max == null) return toast.error("Informe o valor máximo")
    if (max < min) return toast.error("O valor máximo não pode ser menor que o mínimo")

    setSalvando(true)
    try {
      await fetchJson("/api/procedimentos/regioes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          procedimentoId,
          regiao: novaRegiao,
          valorMinBrl: min,
          valorMaxBrl: max,
        }),
      })
      setNovaRegiao("")
      setNovoMin("")
      setNovoMax("")
      toast.success("Valor da região salvo")
      await carregar()
    } catch (e) {
      toast.error(normalizarErroApi(e, "Erro ao salvar valor da região").mensagem)
    } finally {
      setSalvando(false)
    }
  }

  async function remover(id: string, regiao: string) {
    setSalvando(true)
    try {
      await fetchJson(`/api/procedimentos/regioes/${id}`, { method: "DELETE" })
      toast.success(`${rotuloRegiao(regiao)} removida`)
      await carregar()
    } catch (e) {
      toast.error(normalizarErroApi(e, "Erro ao remover região").mensagem)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="grid gap-3 pt-2 border-t">
      <div className="grid gap-1">
        <Label className="text-sm font-semibold">Valores por região</Label>
        <p className="text-xs text-muted-foreground">
          Faixa de valor de cada região deste procedimento. Serve de referência
          para o Dr. Lucas fechar o orçamento — a Ana Júlia nunca envia esses
          valores ao paciente.
        </p>
      </div>

      {carregando ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando…
        </div>
      ) : faixas.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          Nenhuma região cadastrada ainda.
        </p>
      ) : (
        <ul className="grid gap-1.5">
          {faixas.map((faixa) => (
            <li
              key={faixa.id}
              className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
            >
              <span className="font-medium">{rotuloRegiao(faixa.regiao)}</span>
              <span className="ml-auto tabular-nums text-muted-foreground">
                {formatarBrl(faixa.valorMinBrl)} a {formatarBrl(faixa.valorMaxBrl)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                disabled={salvando}
                onClick={() => remover(faixa.id, faixa.regiao)}
                aria-label={`Remover ${rotuloRegiao(faixa.regiao)}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {regioesDisponiveis.length > 0 && (
        <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-2">
          <div className="grid gap-1.5">
            <Label htmlFor="regiao-nova" className="text-xs">
              Região
            </Label>
            <Select value={novaRegiao} onValueChange={setNovaRegiao}>
              <SelectTrigger id="regiao-nova">
                <SelectValue placeholder="Escolher" />
              </SelectTrigger>
              <SelectContent>
                {regioesDisponiveis.map((regiao) => (
                  <SelectItem key={regiao.chave} value={regiao.chave}>
                    {regiao.rotulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="regiao-min" className="text-xs">
              Mínimo (R$)
            </Label>
            <Input
              id="regiao-min"
              inputMode="decimal"
              placeholder="7500"
              value={novoMin}
              onChange={(e) => setNovoMin(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="regiao-max" className="text-xs">
              Máximo (R$)
            </Label>
            <Input
              id="regiao-max"
              inputMode="decimal"
              placeholder="10000"
              value={novoMax}
              onChange={(e) => setNovoMax(e.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={salvando}
            onClick={adicionar}
          >
            {salvando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            <span className="sr-only">Adicionar região</span>
          </Button>
        </div>
      )}
    </div>
  )
}
