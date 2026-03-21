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

test.describe("Sprint 4 — Kanban: Layout, Scroll e Criação Manual", () => {
  test("página de atendimentos não tem scroll horizontal na página", async ({
    page,
  }) => {
    await loginComo(page, "lucas@drlucas.com.br", "senha123")
    await page.goto("/atendimentos")

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = await page.evaluate(() => window.innerWidth)
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1)
  })

  test("botão Novo Lead está visível na página de atendimentos", async ({
    page,
  }) => {
    await loginComo(page, "lucas@drlucas.com.br", "senha123")
    await page.goto("/atendimentos")
    await expect(page.getByRole("button", { name: "Novo Lead" })).toBeVisible()
  })

  test("botão Novo Atendimento está visível na página de atendimentos", async ({
    page,
  }) => {
    await loginComo(page, "lucas@drlucas.com.br", "senha123")
    await page.goto("/atendimentos")
    await expect(
      page.getByRole("button", { name: "Novo Atendimento" })
    ).toBeVisible()
  })

  test("botão Novo Lead abre modal de criação", async ({ page }) => {
    await loginComo(page, "lucas@drlucas.com.br", "senha123")
    await page.goto("/atendimentos")
    await page.getByRole("button", { name: "Novo Lead" }).click()
    await expect(page.getByRole("dialog")).toBeVisible()
    await expect(page.getByText("Novo Lead")).toBeVisible()
  })

  test("botão Novo Atendimento abre modal de busca", async ({ page }) => {
    await loginComo(page, "lucas@drlucas.com.br", "senha123")
    await page.goto("/atendimentos")
    await page.getByRole("button", { name: "Novo Atendimento" }).click()
    await expect(page.getByRole("dialog")).toBeVisible()
    await expect(page.getByText("Novo Atendimento")).toBeVisible()
    await expect(
      page.getByPlaceholder("Buscar por nome ou WhatsApp...")
    ).toBeVisible()
  })
})
