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
    ).toBeVisible()
    await expect(page.getByText("Credenciais de Integração")).toBeVisible()
    await expect(page.getByText("Como obter as credenciais")).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Salvar Configuração" })
    ).toBeVisible()
  })

  test("salvar configuração com dados válidos mostra sucesso", async ({
    page,
  }) => {
    await loginComoGestor(page)
    await page.goto("/configuracoes/google-agenda")

    await page
      .getByPlaceholder("123456789-abc.apps.googleusercontent.com")
      .fill("1234567890-test-client-id.apps.googleusercontent.com")
    await page.getByPlaceholder("GOCSPX-...").fill("GOCSPX-test-client-secret-value")
    await page.getByPlaceholder("1//0a...").fill("1//0a-test-refresh-token-value")
    await page.getByPlaceholder("primary").fill("primary")

    await page.getByRole("button", { name: "Salvar Configuração" }).click()

    await expect(page.getByText("Configuração salva")).toBeVisible({
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
