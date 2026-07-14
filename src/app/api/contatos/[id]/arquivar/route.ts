import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { requireAuth } from "@/lib/auth-helpers"

type RouteParams = { params: Promise<{ id: string }> }

export async function PATCH(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  await params

  return NextResponse.json(
    { error: "Essa operação foi descontinuada. Use exclusão quando necessário." },
    { status: 410 }
  )
}
