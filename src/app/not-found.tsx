import Link from "next/link"
import { FileX } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 text-center">
      <FileX className="h-16 w-16 text-muted-foreground" />
      <h1 className="text-2xl font-bold">Página não encontrada</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        A página que você buscou não existe ou foi removida.
      </p>
      <Button asChild>
        <Link href="/dashboard">Voltar ao início</Link>
      </Button>
    </div>
  )
}
