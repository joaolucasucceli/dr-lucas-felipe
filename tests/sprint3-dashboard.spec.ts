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

test.describe("Sprint 3 — Dashboard: Alertas e Follow-ups", () => {
  test("cards de alerta e follow-up exibem no máximo 5 itens cada", async ({
    page,
  }) => {
    await loginComo(page, "lucas@drlucas.com.br", "senha123")

    // Verifica que cada card tem no máximo 5 linhas de lead
    const linhasAlerta = page.locator(
      "text=Leads em Alerta"
    ).locator("..").locator(".rounded-md.border")
    const count = await linhasAlerta.count()
    expect(count).toBeLessThanOrEqual(5)
  })

  test("navegar para /leads?filtro=alerta exibe banner de alerta", async ({
    page,
  }) => {
    await loginComo(page, "lucas@drlucas.com.br", "senha123")
    await page.goto("/leads?filtro=alerta")
    await expect(
      page.getByText("Leads em Alerta — sem movimentação há 3+ dias")
    ).toBeVisible()
  })

  test("botão Limpar no banner remove o filtro e volta para /leads", async ({
    page,
  }) => {
    await loginComo(page, "lucas@drlucas.com.br", "senha123")
    await page.goto("/leads?filtro=alerta")
    await expect(
      page.getByText("Leads em Alerta — sem movimentação há 3+ dias")
    ).toBeVisible()

    await page.getByRole("button", { name: "Limpar" }).click()

    await expect(page).toHaveURL(/\/leads$/, { timeout: 5000 })
    await expect(
      page.getByText("Leads em Alerta — sem movimentação há 3+ dias")
    ).not.toBeVisible()
  })

  test("navegar para /leads?filtro=followup exibe banner de follow-up", async ({
    page,
  }) => {
    await loginComo(page, "lucas@drlucas.com.br", "senha123")
    await page.goto("/leads?filtro=followup")
    await expect(
      page.getByText("Follow-ups Aguardando Resposta")
    ).toBeVisible()
  })

  test("botão Limpar no banner de follow-up remove o filtro", async ({
    page,
  }) => {
    await loginComo(page, "lucas@drlucas.com.br", "senha123")
    await page.goto("/leads?filtro=followup")
    await expect(
      page.getByText("Follow-ups Aguardando Resposta")
    ).toBeVisible()

    await page.getByRole("button", { name: "Limpar" }).click()

    await expect(page).toHaveURL(/\/leads$/, { timeout: 5000 })
    await expect(
      page.getByText("Follow-ups Aguardando Resposta")
    ).not.toBeVisible()
  })
})
