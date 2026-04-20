import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

interface PerfilColaboradorProps {
  nome: string
  cargo: string
  bio: string
  iniciais: string
  gradientClasses: string
}

export function PerfilColaboradorHero({
  nome,
  cargo,
  bio,
  iniciais,
  gradientClasses,
}: PerfilColaboradorProps) {
  return (
    <div
      className={cn(
        "rounded-xl p-8 text-white bg-gradient-to-r flex items-start gap-6",
        gradientClasses
      )}
    >
      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-3xl font-bold">
        {iniciais}
      </div>
      <div className="flex-1">
        <div className="text-white/80 text-sm font-medium tracking-wide uppercase">
          {cargo}
        </div>
        <h2 className="text-3xl font-bold mt-1">{nome}</h2>
        <p className="mt-3 text-white/90 text-sm leading-relaxed max-w-2xl">{bio}</p>
      </div>
    </div>
  )
}

interface SecaoProps {
  titulo: string
  children: React.ReactNode
}

export function SecaoPerfil({ titulo, children }: SecaoProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {titulo}
      </h3>
      {children}
    </div>
  )
}

interface Passo {
  numero: number
  titulo: string
  descricao: string
}

export function RotinaDiaria({ passos }: { passos: Passo[] }) {
  return (
    <div className="space-y-4">
      {passos.map((passo) => (
        <div key={passo.numero} className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
            {passo.numero}
          </div>
          <div className="pt-1">
            <div className="font-medium text-sm">{passo.titulo}</div>
            <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
              {passo.descricao}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

interface Ferramenta {
  icone: React.ReactNode
  nome: string
  descricao: string
}

export function FerramentasGrid({ ferramentas }: { ferramentas: Ferramenta[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {ferramentas.map((f, i) => (
        <Card key={i} className="border-muted">
          <CardContent className="flex items-start gap-3 p-4">
            <div className="text-primary [&>svg]:h-4 [&>svg]:w-4 mt-0.5 shrink-0">
              {f.icone}
            </div>
            <div>
              <div className="font-medium text-sm">{f.nome}</div>
              <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                {f.descricao}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function JeitaoList({ regras }: { regras: string[] }) {
  return (
    <ul className="space-y-2">
      {regras.map((regra, i) => (
        <li key={i} className="flex gap-3 text-sm">
          <span className="text-muted-foreground mt-1">•</span>
          <span className="text-muted-foreground leading-relaxed">{regra}</span>
        </li>
      ))}
    </ul>
  )
}
