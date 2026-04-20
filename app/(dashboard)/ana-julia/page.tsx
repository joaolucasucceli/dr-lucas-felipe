"use client"

import { PageHeader } from "@/components/features/shared/PageHeader"
import { ModuloAnaJulia } from "@/components/features/documentacao/modulos/ModuloAnaJulia"

export default function AnaJuliaPage() {
  return (
    <div>
      <PageHeader
        titulo="Ana Júlia"
        descricao="SDR que atende pacientes no WhatsApp da clínica"
      />

      <div className="mt-6">
        <ModuloAnaJulia />
      </div>
    </div>
  )
}
