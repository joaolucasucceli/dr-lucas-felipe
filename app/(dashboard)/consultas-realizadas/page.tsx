"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { CalendarCheck2, UserRound, ChevronRight } from "lucide-react"
import { PageHeader } from "@/components/features/shared/PageHeader"
import { DataTable, type ColunaConfig } from "@/components/features/shared/DataTable"
import { EmptyState } from "@/components/features/shared/EmptyState"
import { SkeletonTabela } from "@/components/features/shared/SkeletonTabela"
import { ErrorState } from "@/components/features/shared/ErrorState"
import { Badge } from "@/components/ui/badge"
import { formatarData, formatarWhatsapp } from "@/lib/format"

// JLU-171 (P1 pedido Dr. Lucas 25/05): "data das consultas realizadas".
// Lista cronologica reversa de agendamentos status=realizado. Click abre
// detalhe do contato/paciente onde esta o prontuario.

interface Agendamento {
  id: string
  dataHora: string
  status: string
  observacao: string | null
  contatoId: string
  criadoEm: string
  contato: {
    id: string
    nome: string
    whatsapp: string | null
    tipo: "lead" | "paciente"
  } | null
  procedimento: {
    id: string
    nome: string
    escopoOferta: string | null
  } | null
}

export default function ConsultasRealizadasPage() {
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()
  const [dados, setDados] = useState<Agendamento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const ehGestor = session?.user?.perfil === "gestor"

  useEffect(() => {
    if (sessionStatus === "unauthenticated") router.replace("/login")
    if (sessionStatus === "authenticated" && !ehGestor) router.replace("/dashboard")
  }, [sessionStatus, ehGestor, router])

  useEffect(() => {
    if (sessionStatus !== "authenticated" || !ehGestor) return
    let cancel = false
    setCarregando(true)
    fetch("/api/agendamentos?status=realizado&ordem=desc&limite=200")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Erro ao carregar"))))
      .then((j) => {
        if (!cancel) setDados(j.agendamentos ?? [])
      })
      .catch((e) => {
        if (!cancel) setErro(e instanceof Error ? e.message : "Erro desconhecido")
      })
      .finally(() => {
        if (!cancel) setCarregando(false)
      })
    return () => {
      cancel = true
    }
  }, [sessionStatus, ehGestor])

  if (sessionStatus === "loading" || !ehGestor) return null

  const colunas: ColunaConfig<Agendamento>[] = [
    {
      chave: "dataHora",
      titulo: "Data da consulta",
      ordenavel: true,
      renderizar: (a) => (
        <div className="flex items-center gap-2">
          <CalendarCheck2 className="h-4 w-4 text-emerald-500" />
          <span className="text-sm font-medium">
            {formatarData(a.dataHora, "dd/MM/yyyy 'às' HH:mm")}
          </span>
        </div>
      ),
    },
    {
      chave: "contato" as keyof Agendamento,
      titulo: "Paciente",
      renderizar: (a) => (
        <div className="flex items-center gap-2">
          <UserRound className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{a.contato?.nome ?? "(sem nome)"}</span>
          {a.contato?.tipo === "paciente" && (
            <Badge variant="default" className="text-[10px]">
              Paciente
            </Badge>
          )}
          {a.contato?.tipo === "lead" && (
            <Badge variant="secondary" className="text-[10px]">
              Lead
            </Badge>
          )}
        </div>
      ),
    },
    {
      chave: "procedimento" as keyof Agendamento,
      titulo: "Procedimento de interesse",
      classesCelula: "hidden md:table-cell",
      renderizar: (a) =>
        a.procedimento ? (
          <span className="text-sm">
            {a.procedimento.escopoOferta || a.procedimento.nome}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
    {
      chave: "contato" as keyof Agendamento,
      titulo: "WhatsApp",
      classesCelula: "hidden lg:table-cell",
      renderizar: (a) =>
        a.contato?.whatsapp ? (
          <span className="text-sm font-mono">{formatarWhatsapp(a.contato.whatsapp)}</span>
        ) : (
          "—"
        ),
    },
    {
      chave: "id",
      titulo: "",
      renderizar: () => <ChevronRight className="h-4 w-4 text-muted-foreground" />,
    },
  ]

  if (erro) {
    return (
      <div>
        <PageHeader titulo="Consultas realizadas" />
        <div className="mt-6">
          <ErrorState mensagem={erro} onTentar={() => location.reload()} />
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        titulo="Consultas realizadas"
        descricao="Histórico cronológico das avaliações concluídas. Clique pra abrir o prontuário do paciente."
      />

      <div className="mt-6">
        {carregando && dados.length === 0 ? (
          <SkeletonTabela linhas={6} colunas={4} />
        ) : !carregando && dados.length === 0 ? (
          <EmptyState
            titulo="Nenhuma consulta realizada ainda"
            descricao="Quando a Ana Júlia marcar e o paciente comparecer, a consulta aparece aqui."
          />
        ) : (
          <DataTable
            colunas={colunas}
            dados={dados}
            total={dados.length}
            pagina={1}
            porPagina={dados.length || 10}
            onPaginaChange={() => {}}
            carregando={carregando}
            onLinhaClick={(a) =>
              a.contato && router.push(`/contatos/${a.contato.id}`)
            }
          />
        )}
      </div>
    </div>
  )
}
