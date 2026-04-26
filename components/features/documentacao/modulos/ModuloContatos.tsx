import { ModuloLeads } from "./ModuloLeads"
import { ModuloPacientes } from "./ModuloPacientes"

export function ModuloContatos() {
  return (
    <div className="space-y-12">
      <ModuloLeads />
      <hr className="border-border" />
      <ModuloPacientes />
    </div>
  )
}
