import { test, expect } from "@playwright/test"

const BASE_URL = "http://localhost:3100"
const API_SECRET = "dev-api-secret"

function cronHeaders() {
  return { "x-api-secret": API_SECRET }
}

async function loginComoGestor(page: import("@playwright/test").Page) {
  await page.goto("/login")
  await page.getByLabel("Email").fill("lucas@drlucas.com.br")
  await page.locator("#senha").fill("senha123")
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
}

test.describe("Cron — Follow-ups e Confirmações", () => {
  test("GET /api/cron/follow-ups sem auth retorna 401", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/cron/follow-ups`)
    expect(res.status()).toBe(401)
  })

  test("GET /api/cron/follow-ups com x-api-secret retorna 200", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/cron/follow-ups`, {
      headers: cronHeaders(),
    })
    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    // Pode ser skipped por horário ou enviados: 0
    expect(json.enviados !== undefined || json.skipped !== undefined).toBeTruthy()
  })

  test("GET /api/cron/confirmacoes com x-api-secret retorna 200", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/cron/confirmacoes`, {
      headers: cronHeaders(),
    })
    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    expect(json.enviadas !== undefined || json.skipped !== undefined).toBeTruthy()
  })

  test("GET /api/cron/auto-close com x-api-secret retorna 200", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/cron/auto-close`, {
      headers: cronHeaders(),
    })
    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    expect(json.encerradas).toBeDefined()
  })

  test("POST /api/agente/cron-manual como gestor retorna 200", async ({ page, request }) => {
    // Login primeiro para obter session cookie
    await loginComoGestor(page)

    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ")

    const res = await request.post(`${BASE_URL}/api/agente/cron-manual`, {
      headers: { Cookie: cookieHeader },
    })

    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    expect(json.followups).toBeDefined()
    expect(json.confirmacoes).toBeDefined()
    expect(json.autoClose).toBeDefined()
  })

  test("card Automações aparece na página de configurações", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/configuracoes")

    await expect(page.getByText("Automações")).toBeVisible()
    await expect(
      page.getByText("Follow-ups e confirmações de consulta")
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Executar agora" })
    ).toBeVisible()
  })
})
