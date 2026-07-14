import { cn } from "@/lib/utils"

interface HeroBannerProps {
  icone: React.ReactNode
  titulo: string
  subtitulo: string
  gradientClasses: string
}

export function HeroBanner({ icone, titulo, subtitulo, gradientClasses }: HeroBannerProps) {
  return (
    <div className={cn("rounded-xl p-8 text-white bg-gradient-to-r", gradientClasses)}>
      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-white/20 p-3 backdrop-blur-sm">
          <div className="h-8 w-8 [&>svg]:h-8 [&>svg]:w-8">{icone}</div>
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{titulo}</h2>
          <p className="mt-1 text-white/80 text-sm max-w-2xl">{subtitulo}</p>
        </div>
      </div>
    </div>
  )
}
