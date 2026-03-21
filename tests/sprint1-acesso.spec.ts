import { test, expect } from "@playwright/test"

async function loginComo(
  page: import("@playwright/test").Page,
  email: string,
  senha: string
) {
  await page.goto("/login")
  await page.getByLabel("Email").fill(email)
  await page.locator("#senha").fill(senha)
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
}

test.describe("Sprint 1 — Controle de Acesso", () => {
  test("atendente não vê Procedimentos na sidebar", async ({ page }) => {
    await loginComo(page, "maria@drlucas.com.br", "senha123")
    await expect(page.getByRole("link", { name: "Procedimentos" })).not.toBeVisible()
  })

  test("atendente redirecionado para /dashboard ao acessar /procedimentos diretamente", async ({
    page,
  }) => {
    await loginComo(page, "maria@drlucas.com.br", "senha123")
    await page.goto("/procedimentos")
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
  })

  test("atendente não vê seção Atividade do Agente IA no dashboard", async ({
    page,
  }) => {
    await loginComo(page, "maria@drlucas.com.br", "senha123")
    await expect(page.getByText("Atividade do Agente IA")).not.toBeVisible()
  })

  test("atendente vê métricas Leads do Dia e Agendamentos da Semana", async ({
    page,
  }) => {
    await loginComo(page, "maria@drlucas.com.br", "senha123")
    await expect(page.getByText("Leads do Dia")).toBeVisible()
    await expect(page.getByText("Agendamentos da Semana")).toBeVisible()
    await expect(page.getByText("Taxa de Conversão")).not.toBeVisible()
  })

  test("GET /api/procedimentos retorna 403 para atendente", async ({
    page,
  }) => {
    await loginComo(page, "maria@drlucas.com.br", "senha123")
    const response = await page.request.get("/api/procedimentos")
    expect(response.status()).toBe(403)
  })

  test("gestor vê Procedimentos na sidebar e acessa a página", async ({
    page,
  }) => {
    await loginComo(page, "lucas@drlucas.com.br", "senha123")
    await expect(page.getByRole("link", { name: "Procedimentos" })).toBeVisible()
    await page.getByRole("link", { name: "Procedimentos" }).click()
    await expect(page).toHaveURL(/\/procedimentos/)
    await expect(page.getByText("Procedimentos")).toBeVisible()
  })

  test("gestor vê Atividade do Agente IA no dashboard", async ({ page }) => {
    await loginComo(page, "lucas@drlucas.com.br", "senha123")
    await expect(page.getByText("Atividade do Agente IA")).toBeVisible()
  })

  test("gestor vê Taxa de Conversão e não vê Leads do Dia", async ({ page }) => {
    await loginComo(page, "lucas@drlucas.com.br", "senha123")
    await expect(page.getByText("Taxa de Conversão")).toBeVisible()
    await expect(page.getByText("Leads do Dia")).not.toBeVisible()
  })
})
