"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { PerfilEduarda } from "@/components/features/colaboradores/PerfilEduarda"

export default function EduardaPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const autorizado = session?.user?.perfil === "gestor"

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login")
    if (status === "authenticated" && !autorizado) router.replace("/dashboard")
  }, [status, autorizado, router])

  if (status === "loading" || !autorizado) return null

  return (
    <div className="mx-auto max-w-4xl">
      <PerfilEduarda />
    </div>
  )
}
