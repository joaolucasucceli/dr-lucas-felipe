import { test, expect } from "@playwright/test"

async function loginComoGestor(page: import("@playwright/test").Page) {
  await page.goto("/login")
  await page.getByLabel("Email").fill("lucas@drlucas.com.br")
  await page.locator("#senha").fill("senha123")
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
}

test.describe("Dashboard", () => {
  test("página /dashboard carrega com MetricCards", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/dashboard")

    await expect(page.getByText("Total de Leads")).toBeVisible({ timeout: 10000 })
    await expect(page.getByText("Novos no Período")).toBeVisible()
    await expect(page.getByRole("main").getByText("Agendamentos", { exact: true })).toBeVisible()
    await expect(page.getByText("Taxa de Conversão")).toBeVisible()
  })

  test("select de período existe com 4 opções", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/dashboard")

    await expect(page.getByText("Total de Leads")).toBeVisible({ timeout: 10000 })

    const trigger = page.locator("[data-slot='select-trigger']").first()
    await expect(trigger).toBeVisible()
    await trigger.click()

    await expect(page.getByRole("option", { name: "Hoje" })).toBeVisible()
    await expect(page.getByRole("option", { name: "Última semana" })).toBeVisible()
    await expect(page.getByRole("option", { name: "Último mês" })).toBeVisible()
    await expect(page.getByRole("option", { name: "Total" })).toBeVisible()
  })

  test("card Total de Leads exibe número", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/dashboard")

    await expect(page.getByText("Total de Leads")).toBeVisible({ timeout: 10000 })
    // O valor deve ser um número (pelo menos 0)
    const metricCard = page.getByText("Total de Leads").locator("..").locator("..")
    await expect(metricCard.getByText(/^\d+$/)).toBeVisible()
  })

  test("seção Leads em Alerta é visível", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/dashboard")

    await expect(page.getByText("Total de Leads")).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/Leads em Alerta/)).toBeVisible()
  })

  test("gráfico Funil por Etapa é visível", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/dashboard")

    await expect(page.getByText("Total de Leads")).toBeVisible({ timeout: 10000 })
    await expect(page.getByText("Funil por Etapa")).toBeVisible()
  })

  test("card Atividade do Agente IA é visível", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/dashboard")

    await expect(page.getByText("Total de Leads")).toBeVisible({ timeout: 10000 })
    await expect(page.getByText("Atividade do Agente IA")).toBeVisible()
    await expect(page.getByText("Mensagens enviadas")).toBeVisible()
    await expect(page.getByText("Follow-ups enviados")).toBeVisible()
    await expect(page.getByText("Confirmações enviadas")).toBeVisible()
  })
})
