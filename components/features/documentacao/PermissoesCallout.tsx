import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShieldCheck } from "lucide-react"

interface PermissaoPerfil {
  perfil: "Gestor" | "Atendente"
  acoes: string[]
  acesso: "total" | "parcial" | "nenhum"
}

interface PermissoesCalloutProps {
  permissoes: PermissaoPerfil[]
}

const corPerfil: Record<string, string> = {
  Gestor: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  Atendente: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
}

const labelAcesso: Record<string, string> = {
  total: "Acesso total",
  parcial: "Acesso parcial",
  nenhum: "Sem acesso",
}

const corAcesso: Record<string, string> = {
  total: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  parcial: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  nenhum: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
}

export function PermissoesCallout({ permissoes }: PermissoesCalloutProps) {
  return (
    <Card className="border-muted">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Permissões por Perfil
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {permissoes.map((p) => (
          <div key={p.perfil} className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${corPerfil[p.perfil]}`}>
                {p.perfil}
              </span>
              <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${corAcesso[p.acesso]}`}>
                {labelAcesso[p.acesso]}
              </span>
            </div>
            {p.acoes.length > 0 && p.acesso !== "nenhum" && (
              <ul className="ml-1 space-y-0.5">
                {p.acoes.map((acao, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-muted-foreground flex-shrink-0" />
                    {acao}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
