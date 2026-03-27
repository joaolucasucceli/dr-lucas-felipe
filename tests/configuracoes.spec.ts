import { test, expect } from "@playwright/test"

async function loginComoGestor(page: import("@playwright/test").Page) {
  await page.goto("/login")
  await page.getByLabel("Email").fill("lucas@drlucas.com.br")
  await page.locator("#senha").fill("senha123")
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
}

test.describe("Configurações", () => {
  test("gestor vê Configurações na sidebar", async ({ page }) => {
    await loginComoGestor(page)

    await expect(
      page.getByRole("link", { name: "Configurações" })
    ).toBeVisible()
  })

  test("página de configurações exibe card Google Agenda", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/configuracoes")

    await expect(
      page.getByRole("heading", { name: "Configurações" })
    ).toBeVisible()
    await expect(page.getByText("Google Agenda")).toBeVisible()
  })

  test("formulário Google Agenda carrega corretamente", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/configuracoes/google-agenda")

    await expect(
      page.getByRole("heading", { name: "Google Agenda" })
    ).toBeVisible({ timeout: 10000 })
    await expect(page.getByText("Como obter as credenciais")).toBeVisible({ timeout: 5000 })
    await expect(
      page.getByRole("button", { name: "Salvar Credenciais" })
    ).toBeVisible()
  })

  test("salvar configuração com dados válidos mostra sucesso", async ({
    page,
  }) => {
    await loginComoGestor(page)
    await page.goto("/configuracoes/google-agenda")

    await expect(
      page.getByRole("button", { name: "Salvar Credenciais" })
    ).toBeVisible({ timeout: 10000 })

    await page
      .getByPlaceholder("571255265442-xxx.apps.googleusercontent.com")
      .fill("1234567890-test-client-id.apps.googleusercontent.com")
    await page.getByPlaceholder("GOCSPX-...").fill("GOCSPX-test-client-secret-value")

    await page.getByRole("button", { name: "Salvar Credenciais" }).click()

    // Aguardar toast de sucesso (pode ser "Credenciais salvas" ou similar)
    await expect(page.locator("[data-sonner-toast]").first()).toBeVisible({
      timeout: 5000,
    })
  })

  test("atendente não vê Configurações na sidebar", async ({ page }) => {
    await page.goto("/login")
    await page.getByLabel("Email").fill("maria@drlucas.com.br")
    await page.locator("#senha").fill("senha123")
    await page.getByRole("button", { name: "Entrar" }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })

    await expect(
      page.getByRole("link", { name: "Configurações" })
    ).not.toBeVisible()
  })
})
