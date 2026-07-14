import { createId } from "@paralleldrive/cuid2"

export function criarId(): string {
  return createId()
}

export function agora(): string {
  return new Date().toISOString()
}
