import { Info, AlertTriangle, CheckCircle2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface DicaImportanteProps {
  texto: string
  variante?: "info" | "aviso" | "sucesso"
}

const config = {
  info: {
    icone: Info,
    bordaClasse: "border-l-blue-500",
    iconeClasse: "text-blue-500",
    titulo: "Dica importante",
  },
  aviso: {
    icone: AlertTriangle,
    bordaClasse: "border-l-amber-500",
    iconeClasse: "text-amber-500",
    titulo: "Atenção",
  },
  sucesso: {
    icone: CheckCircle2,
    bordaClasse: "border-l-green-500",
    iconeClasse: "text-green-500",
    titulo: "Boas práticas",
  },
}

export function DicaImportante({ texto, variante = "info" }: DicaImportanteProps) {
  const { icone: Icone, bordaClasse, iconeClasse, titulo } = config[variante]

  return (
    <Card className={cn("border-l-4", bordaClasse)}>
      <CardContent className="pt-4">
        <div className="flex gap-3">
          <Icone className={cn("h-4 w-4 mt-0.5 flex-shrink-0", iconeClasse)} />
          <div>
            <p className="text-sm font-semibold mb-1">{titulo}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{texto}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
