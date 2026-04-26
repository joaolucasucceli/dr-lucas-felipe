import { ModuloBaseConhecimento } from "./ModuloBaseConhecimento"
import { ModuloMidiaMarketing } from "./ModuloMidiaMarketing"

export function ModuloConteudoIA() {
  return (
    <div className="space-y-12">
      <ModuloBaseConhecimento />
      <hr className="border-border" />
      <ModuloMidiaMarketing />
    </div>
  )
}
