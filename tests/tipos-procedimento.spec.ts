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

test.describe("Sprint 6 — Tipos de Procedimento Configuráveis", () => {
  test("página de configurações exibe card Tipos de Procedimento", async ({ page }) => {
    await loginComo(page, "lucas@drlucas.com.br", "senha123")
    await page.goto("/configuracoes")

    await expect(page.getByText("Tipos de Procedimento")).toBeVisible()
  })

  test("página /configuracoes/tipos-procedimento lista os tipos padrão", async ({ page }) => {
    await loginComo(page, "lucas@drlucas.com.br", "senha123")
    await page.goto("/configuracoes/tipos-procedimento")

    await expect(page.getByText("Cirúrgico")).toBeVisible()
    await expect(page.getByText("Estético")).toBeVisible()
    await expect(page.getByText("Minimamente Invasivo")).toBeVisible()
  })

  test("gestor pode criar novo tipo de procedimento", async ({ page }) => {
    await loginComo(page, "lucas@drlucas.com.br", "senha123")
    await page.goto("/configuracoes/tipos-procedimento")

    await page.getByRole("button", { name: /novo tipo/i }).click()
    await expect(page.getByRole("dialog")).toBeVisible()

    await page.getByLabel("Nome").fill("Laser")
    await page.getByRole("button", { name: "Criar" }).click()

    await expect(page.getByText("Tipo criado")).toBeVisible({ timeout: 8000 })
    await expect(page.getByText("Laser")).toBeVisible()

    // Limpeza: excluir o tipo criado para não afetar outros testes
    const row = page.getByRole("row", { name: /Laser/ })
    await row.getByRole("button").click()
    await page.getByText("Excluir").click()
    await page.getByRole("button", { name: "Excluir" }).click()
  })

  test("formulário de procedimento não exibe mais valores hardcoded antigos", async ({ page }) => {
    await loginComo(page, "lucas@drlucas.com.br", "senha123")
    await page.goto("/procedimentos")

    await page.getByRole("button", { name: /novo procedimento/i }).click()
    await expect(page.getByRole("dialog")).toBeVisible()

    // Não deve exibir os slugs antigos hardcoded
    await expect(page.getByRole("option", { name: "cirurgico" })).not.toBeVisible()
    await expect(page.getByRole("option", { name: "estetico" })).not.toBeVisible()

    // Deve exibir os tipos configurados via API
    const selectTrigger = page.getByRole("combobox").first()
    await selectTrigger.click()
    await expect(page.getByRole("option", { name: "Cirúrgico" })).toBeVisible()
    await expect(page.getByRole("option", { name: "Estético" })).toBeVisible()
    await expect(page.getByRole("option", { name: "Minimamente Invasivo" })).toBeVisible()
  })
})
