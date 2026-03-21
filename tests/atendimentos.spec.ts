import { test, expect } from "@playwright/test"

async function loginComoGestor(page: import("@playwright/test").Page) {
  await page.goto("/login")
  await page.getByLabel("Email").fill("lucas@drlucas.com.br")
  await page.locator("#senha").fill("senha123")
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
}

test.describe("Atendimentos", () => {
  test("atendimentos carrega com 9 colunas visíveis", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/atendimentos")

    await expect(
      page.getByRole("heading", { name: "Atendimentos" })
    ).toBeVisible()

    // Verificar que as 9 colunas existem (usar heading para evitar ambiguidade com sidebar)
    const board = page.locator(".overflow-x-auto")
    await expect(board.getByText("Primeiro Atendimento")).toBeVisible()
    await expect(board.getByText("Qualificação")).toBeVisible()
    await expect(board.getByText("Agendamento")).toBeVisible()
    await expect(board.getByText("Consulta Agendada")).toBeVisible()
    await expect(board.getByText("Consulta Realizada")).toBeVisible()
    await expect(board.getByText("Sinal Pago")).toBeVisible()
    await expect(board.getByText("Proc. Agendado")).toBeVisible()
    await expect(board.getByText("Concluído")).toBeVisible()
    await expect(board.getByText("Perdido")).toBeVisible()
  })

  test("cards dos leads do seed aparecem no board", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/atendimentos")

    // Seed tem 5 leads distribuídos
    await expect(page.getByText("Ana Silva")).toBeVisible({ timeout: 10000 })
    await expect(page.getByText("Bruna Costa")).toBeVisible()
    await expect(page.getByText("Carla Souza")).toBeVisible()
    await expect(page.getByText("Diana Lima")).toBeVisible()
    await expect(page.getByText("Elena Rocha")).toBeVisible()
  })

  test("filtrar por procedimento filtra os cards", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/atendimentos")

    // Esperar cards carregarem
    await expect(page.getByText("Ana Silva")).toBeVisible({ timeout: 10000 })

    // Filtrar por "Mini Lipo" — Ana Silva e Diana Lima têm esse procedimento
    await page.locator("button").filter({ hasText: "Todos os procedimentos" }).click()
    await page.getByRole("option", { name: "Mini Lipo" }).click()

    // Deve ver leads com Mini Lipo
    await expect(page.getByText("Ana Silva")).toBeVisible()
    await expect(page.getByText("Diana Lima")).toBeVisible()

    // Não deve ver leads com outros procedimentos
    await expect(page.getByText("Bruna Costa")).not.toBeVisible()
  })

  test("clicar em card navega para detalhe do lead", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/atendimentos")

    await expect(page.getByText("Ana Silva")).toBeVisible({ timeout: 10000 })
    await page.getByText("Ana Silva").click()

    await expect(page).toHaveURL(/\/leads\//, { timeout: 5000 })
  })

  test("total de leads é exibido", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/atendimentos")

    await expect(page.getByText(/\d+ leads? no funil/)).toBeVisible({
      timeout: 10000,
    })
  })

  test("atendimentos acessível via sidebar", async ({ page }) => {
    await loginComoGestor(page)

    // Clicar no link Atendimentos na sidebar
    await page.getByRole("link", { name: "Atendimentos" }).click()
    await expect(page).toHaveURL(/\/atendimentos/, { timeout: 5000 })

    await expect(
      page.getByRole("heading", { name: "Atendimentos" })
    ).toBeVisible()
  })
})
