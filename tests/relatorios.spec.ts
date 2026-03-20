import { test, expect } from "@playwright/test"
import { restaurarSeed } from "./helpers/db"

async function loginComoGestor(page: import("@playwright/test").Page) {
  await page.goto("/login")
  await page.getByLabel("Email").fill("lucas@drlucas.com.br")
  await page.locator("#senha").fill("senha123")
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
}

async function loginComoAtendente(page: import("@playwright/test").Page) {
  await page.goto("/login")
  await page.getByLabel("Email").fill("maria@drlucas.com.br")
  await page.locator("#senha").fill("senha123")
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
}

test.describe.serial("Relatórios", () => {
  test.beforeAll(async () => {
    await restaurarSeed()
  })

  test("página /relatorios carrega para gestor", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/relatorios")

    await expect(page.getByRole("heading", { name: "Relatórios" })).toBeVisible({
      timeout: 8000,
    })
    await expect(page.getByRole("tab", { name: "Funil" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Agendamentos" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Atendimento IA" })).toBeVisible()
  })

  test("tab Funil exibe KPI cards", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/relatorios")

    // Tab Funil é a padrão — esperar os cards aparecerem
    await expect(page.getByText("Total de Entradas")).toBeVisible({ timeout: 8000 })
    await expect(page.getByText("Taxa de Conversão")).toBeVisible()
    await expect(page.getByText("Tempo Médio")).toBeVisible()
    await expect(page.getByText("Leads Perdidos")).toBeVisible()
  })

  test("tab Agendamentos exibe tabela de procedimentos ao gerar", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/relatorios")

    await page.getByRole("tab", { name: "Agendamentos" }).click()

    // Clicar em Gerar Relatório
    await page.getByRole("button", { name: "Gerar Relatório" }).click()

    // Deve aparecer os MetricCards de agendamentos
    await expect(page.getByText("Total de Agendamentos")).toBeVisible({ timeout: 8000 })
    await expect(page.getByText("Realizados", { exact: true }).first()).toBeVisible()
    await expect(page.getByText("Taxa de Realização")).toBeVisible()
  })

  test("tab Atendimento IA exibe métricas ao gerar", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/relatorios")

    await page.getByRole("tab", { name: "Atendimento IA" }).click()
    await page.getByRole("button", { name: "Gerar Relatório" }).click()

    await expect(page.getByText("Total de Mensagens")).toBeVisible({ timeout: 8000 })
    await expect(page.getByText("Enviadas pela IA")).toBeVisible()
    await expect(page.getByText("Conversas Ativas")).toBeVisible()
    await expect(page.getByText("Follow-ups Enviados")).toBeVisible()
  })

  test("botão exportar CSV abre download (verifica endpoint)", async ({ page, request }) => {
    await loginComoGestor(page)
    await page.goto("/relatorios")

    // Verificar o endpoint diretamente
    const cookies = await page.context().cookies()
    const cookieStr = cookies.map((c) => `${c.name}=${c.value}`).join("; ")

    const res = await request.get("/api/relatorios/exportar?tipo=leads", {
      headers: { Cookie: cookieStr },
    })

    expect(res.status()).toBe(200)
    const contentDisposition = res.headers()["content-disposition"]
    expect(contentDisposition).toContain("attachment")
    expect(contentDisposition).toContain("relatorio-leads")
  })

  test("atendente não acessa /relatorios", async ({ page }) => {
    await loginComoAtendente(page)
    await page.goto("/relatorios")

    // Deve redirecionar (para /dashboard ou /login) ou mostrar 403
    await expect(page).not.toHaveURL(/\/relatorios$/, { timeout: 5000 })
  })
})
