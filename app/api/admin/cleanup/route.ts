import { NextRequest, NextResponse } from "next/server"
import { redis } from "@/lib/redis"

export const dynamic = "force-dynamic"
export const maxDuration = 60

function autorizar(req: NextRequest) {
  const secret = process.env.ADMIN_CLEANUP_SECRET
  if (!secret) return false
  const recebido = req.headers.get("x-admin-secret")
  return recebido === secret
}

async function limparPadrao(match: string) {
  let cursor = 0
  let apagadas = 0
  do {
    const resultado = (await redis.scan(cursor, { match, count: 200 })) as [
      number | string,
      string[],
    ]
    const proximoCursor =
      typeof resultado[0] === "string"
        ? parseInt(resultado[0], 10)
        : resultado[0]
    const chaves = resultado[1] || []
    if (chaves.length > 0) {
      await redis.del(...chaves)
      apagadas += chaves.length
    }
    cursor = proximoCursor
  } while (cursor !== 0)
  return apagadas
}

export async function POST(req: NextRequest) {
  if (!autorizar(req)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
  }

  const mem = await limparPadrao("*_mem_dr-lucas")
  const buf = await limparPadrao("*_buf_dr-lucas")
  const deb = await limparPadrao("*_deb_dr-lucas")

  return NextResponse.json({
    ok: true,
    apagadas: { memoria: mem, buffer: buf, debounce: deb },
  })
}
