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

test.describe("Sprint 5 — Agendamentos: Google Calendar Obrigatório", () => {
  test("formulário de agendamento não exibe checkbox 'Criar no Google Calendar'", async ({
    page,
  }) => {
    await loginComo(page, "lucas@drlucas.com.br", "senha123")
    await page.goto("/agendamentos")

    await page.getByRole("button", { name: /novo agendamento/i }).click()
    await expect(page.getByRole("dialog")).toBeVisible()

    await expect(
      page.getByText("Criar no Google Calendar")
    ).not.toBeVisible()
  })

  test("formulário exibe banner de aviso quando Google Calendar não está configurado", async ({
    page,
  }) => {
    // Mock da rota de status para retornar não configurado
    await page.route("**/api/configuracoes/google-agenda/status", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ configurado: false, conectado: false }),
      })
    })

    await loginComo(page, "lucas@drlucas.com.br", "senha123")
    await page.goto("/agendamentos")

    await page.getByRole("button", { name: /novo agendamento/i }).click()
    await expect(page.getByRole("dialog")).toBeVisible()

    await expect(
      page.getByText("Google Calendar não está configurado")
    ).toBeVisible()
  })

  test("formulário não exibe banner quando Google Calendar está configurado", async ({
    page,
  }) => {
    await page.route("**/api/configuracoes/google-agenda/status", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ configurado: true, conectado: true }),
      })
    })

    await loginComo(page, "lucas@drlucas.com.br", "senha123")
    await page.goto("/agendamentos")

    await page.getByRole("button", { name: /novo agendamento/i }).click()
    await expect(page.getByRole("dialog")).toBeVisible()

    await expect(
      page.getByText("Google Calendar não está configurado")
    ).not.toBeVisible()
  })
})
