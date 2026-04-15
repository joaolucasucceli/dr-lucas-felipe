import { test, expect } from "@playwright/test"

test.describe("CLIENTE-242 — Base de Conhecimento", () => {
  test("Pagina /base-conhecimento redireciona para login sem sessao", async ({ page }) => {
    const response = await page.goto("/base-conhecimento")
    await page.waitForLoadState("networkidle")

    // Deve cair em /login (proteção de auth do dashboard)
    expect(page.url()).toContain("/login")
    expect(response?.status()).toBeLessThan(500)
  })

  test("API GET /api/base-conhecimento sem sessao retorna 401 ou 403", async ({ request }) => {
    const res = await request.get("/api/base-conhecimento")
    expect([401, 403]).toContain(res.status())
  })

  test("API POST /api/base-conhecimento sem sessao retorna 401 ou 403", async ({ request }) => {
    const res = await request.post("/api/base-conhecimento", {
      data: { titulo: "Teste", conteudo: "Texto", secao: "geral" },
    })
    expect([401, 403]).toContain(res.status())
  })

  test("API PATCH /api/base-conhecimento/[id] sem sessao retorna 401 ou 403", async ({ request }) => {
    const res = await request.patch("/api/base-conhecimento/qualquer-id", {
      data: { ativo: false },
    })
    expect([401, 403]).toContain(res.status())
  })

  test("API DELETE /api/base-conhecimento/[id] sem sessao retorna 401 ou 403", async ({ request }) => {
    const res = await request.delete("/api/base-conhecimento/qualquer-id")
    expect([401, 403]).toContain(res.status())
  })
})
