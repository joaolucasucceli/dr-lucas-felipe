"use client"

import { use, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { ArrowLeft, FileText, Stethoscope, Activity, Camera, Folder } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/features/shared/PageHeader"
import { ErrorState } from "@/components/features/shared/ErrorState"
import { SkeletonCard } from "@/components/features/shared/SkeletonCard"
import { FormAnamnese } from "@/components/features/prontuario/FormAnamnese"
import { TimelineEvolucao } from "@/components/features/prontuario/TimelineEvolucao"
import { SinaisVitais } from "@/components/features/prontuario/SinaisVitais"
import { GaleriaFotosProntuario } from "@/components/features/prontuario/GaleriaFotosProntuario"
import { ListaDocumentos } from "@/components/features/prontuario/ListaDocumentos"
import { useProntuario } from "@/hooks/use-prontuario"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function ProntuarioPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { data: session, status } = useSession()
  const autorizado = session?.user?.perfil === "gestor"

  const { prontuario, carregando, erro, recarregar } = useProntuario(id)

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login")
    if (status === "authenticated" && !autorizado) router.replace("/dashboard")
  }, [status, autorizado, router])

  if (status === "loading" || !autorizado) return null

  if (carregando) {
    return (
      <div>
        <SkeletonCard />
      </div>
    )
  }

  if (erro || !prontuario) {
    return (
      <div>
        <ErrorState
          mensagem={erro || "Prontuário não encontrado"}
          onTentar={recarregar}
        />
      </div>
    )
  }

  const nomePaciente =
    (prontuario as unknown as { paciente?: { nome: string } }).paciente?.nome ?? "Paciente"

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push(`/contatos/${id}`)}
        className="gap-2 -ml-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar pro contato
      </Button>

      <PageHeader
        titulo="Prontuário"
        descricao={`${nomePaciente} · Nº ${String(prontuario.numero).padStart(4, "0")}`}
      />

      <Tabs defaultValue="anamnese">
        <TabsList>
          <TabsTrigger value="anamnese" className="gap-2">
            <FileText className="h-4 w-4" />
            Anamnese
          </TabsTrigger>
          <TabsTrigger value="evolucoes" className="gap-2">
            <Stethoscope className="h-4 w-4" />
            Evoluções
          </TabsTrigger>
          <TabsTrigger value="sinais" className="gap-2">
            <Activity className="h-4 w-4" />
            Sinais vitais
          </TabsTrigger>
          <TabsTrigger value="fotos" className="gap-2">
            <Camera className="h-4 w-4" />
            Fotos médicas
          </TabsTrigger>
          <TabsTrigger value="documentos" className="gap-2">
            <Folder className="h-4 w-4" />
            Documentos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="anamnese" className="mt-6">
          {prontuario.anamnese ? (
            <FormAnamnese
              anamnese={prontuario.anamnese}
              pacienteId={id}
              onAtualizar={recarregar}
            />
          ) : (
            <ErrorState
              mensagem="Anamnese não criada. Promova o contato a paciente novamente."
              onTentar={recarregar}
            />
          )}
        </TabsContent>

        <TabsContent value="evolucoes" className="mt-6">
          <TimelineEvolucao
            evolucoes={prontuario.evolucoes}
            pacienteId={id}
            onAtualizar={recarregar}
          />
        </TabsContent>

        <TabsContent value="sinais" className="mt-6">
          <SinaisVitais pacienteId={id} />
        </TabsContent>

        <TabsContent value="fotos" className="mt-6">
          <GaleriaFotosProntuario pacienteId={id} />
        </TabsContent>

        <TabsContent value="documentos" className="mt-6">
          <ListaDocumentos pacienteId={id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
