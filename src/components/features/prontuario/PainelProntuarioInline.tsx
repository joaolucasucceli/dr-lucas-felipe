"use client"

import { FileText, Stethoscope, Activity, Camera, Folder } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ErrorState } from "@/components/features/shared/ErrorState"
import { SkeletonCard } from "@/components/features/shared/SkeletonCard"
import { FormAnamnese } from "./FormAnamnese"
import { TimelineEvolucao } from "./TimelineEvolucao"
import { SinaisVitais } from "./SinaisVitais"
import { GaleriaFotosProntuario } from "./GaleriaFotosProntuario"
import { ListaDocumentos } from "./ListaDocumentos"
import { useProntuario } from "@/hooks/use-prontuario"

interface PainelProntuarioInlineProps {
  pacienteId: string
}

export function PainelProntuarioInline({ pacienteId }: PainelProntuarioInlineProps) {
  const { prontuario, carregando, erro, recarregar } = useProntuario(pacienteId)

  if (carregando) return <SkeletonCard />

  if (erro || !prontuario) {
    return (
      <ErrorState
        mensagem={erro || "Prontuário não encontrado"}
        onTentar={recarregar}
      />
    )
  }

  return (
    <Tabs defaultValue="anamnese">
      <TabsList className="h-auto flex-wrap justify-start gap-1">
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

      <TabsContent value="anamnese" className="mt-4">
        {prontuario.anamnese ? (
          <FormAnamnese
            anamnese={prontuario.anamnese}
            pacienteId={pacienteId}
            onAtualizar={recarregar}
          />
        ) : (
          <ErrorState
            mensagem="Anamnese não criada. Promova o contato a paciente novamente."
            onTentar={recarregar}
          />
        )}
      </TabsContent>

      <TabsContent value="evolucoes" className="mt-4">
        <TimelineEvolucao
          evolucoes={prontuario.evolucoes}
          pacienteId={pacienteId}
          onAtualizar={recarregar}
        />
      </TabsContent>

      <TabsContent value="sinais" className="mt-4">
        <SinaisVitais pacienteId={pacienteId} />
      </TabsContent>

      <TabsContent value="fotos" className="mt-4">
        <GaleriaFotosProntuario pacienteId={pacienteId} />
      </TabsContent>

      <TabsContent value="documentos" className="mt-4">
        <ListaDocumentos pacienteId={pacienteId} />
      </TabsContent>
    </Tabs>
  )
}
