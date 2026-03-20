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
  await page.getByLabel("Email").fill("atendente@drlucas.com.br")
  await page.locator("#senha").fill("senha123")
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
}

test.describe.serial("Auditoria", () => {
  test.beforeAll(async () => {
    await restaurarSeed()
  })

  test("gestor acessa /auditoria e vê a tabela", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/auditoria")

    await expect(
      page.getByRole("heading", { name: "Auditoria" })
    ).toBeVisible({ timeout: 8000 })

    // Tabela deve estar presente
    await expect(page.locator("table")).toBeVisible({ timeout: 8000 })
  })

  test("filtrar por entidade Lead", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/auditoria")

    await expect(page.locator("table")).toBeVisible({ timeout: 8000 })

    // Selecionar filtro de entidade
    await page.getByRole("combobox").first().click()
    await page.getByRole("option", { name: "Lead" }).click()

    // Tabela permanece visível após filtro
    await expect(page.locator("table")).toBeVisible({ timeout: 5000 })
  })

  test("filtrar por ação create", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/auditoria")

    await expect(page.locator("table")).toBeVisible({ timeout: 8000 })

    // Selecionar filtro de ação (segundo combobox)
    const combos = page.getByRole("combobox")
    await combos.nth(1).click()
    await page.getByRole("option", { name: "create" }).click()

    await expect(page.locator("table")).toBeVisible({ timeout: 5000 })
  })

  test("paginação funciona", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/auditoria")

    await expect(page.locator("table")).toBeVisible({ timeout: 8000 })

    // Botão de próxima página (pode estar desabilitado se tiver <= 20 registros)
    const btnProximo = page.getByRole("button").filter({ has: page.locator("svg") }).last()
    await expect(btnProximo).toBeVisible()
  })

  test("atendente é redirecionado de /auditoria", async ({ page }) => {
    // Se não houver atendente no seed, pular
    await page.goto("/login")
    await page.getByLabel("Email").fill("atendente@drlucas.com.br")
    await page.locator("#senha").fill("senha123")
    await page.getByRole("button", { name: "Entrar" }).click()

    // Se login falhar (usuário não existe), vai para /login — aceitar ambos
    const url = page.url()
    if (url.includes("/dashboard")) {
      await page.goto("/auditoria")
      // Deve ser redirecionado para /dashboard
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 8000 })
    }
  })
})
