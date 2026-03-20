import { test, expect } from "@playwright/test"
import { restaurarSeed } from "./helpers/db"

async function loginComoGestor(page: import("@playwright/test").Page) {
  await page.goto("/login")
  await page.getByLabel("Email").fill("lucas@drlucas.com.br")
  await page.locator("#senha").fill("senha123")
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
}

test.describe.serial("Gestão de Leads", () => {
  test.beforeAll(async () => {
    await restaurarSeed()
  })



  test("listar leads exibe dados do seed", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/leads")

    await expect(
      page.getByRole("heading", { name: "Leads" })
    ).toBeVisible()
    await expect(page.getByText("Ana Silva")).toBeVisible()
    await expect(page.getByText("Bruna Costa")).toBeVisible()
  })

  test("criar lead com dados válidos", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/leads")

    await page.getByRole("button", { name: "Novo Lead" }).click()

    await page.getByLabel("Nome").fill("Teste Playwright Lead")
    await page.getByLabel("WhatsApp").fill(`119${Date.now().toString().slice(-8)}`)

    await page.getByRole("button", { name: "Criar" }).click()

    await expect(page.getByText("Lead criado")).toBeVisible({
      timeout: 5000,
    })
  })

  test("criar lead com whatsapp duplicado mostra erro", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/leads")

    await page.getByRole("button", { name: "Novo Lead" }).click()

    await page.getByLabel("Nome").fill("Duplicado")
    await page.getByLabel("WhatsApp").fill("11991110001")

    await page.getByRole("button", { name: "Criar" }).click()

    await expect(page.getByText("WhatsApp já cadastrado")).toBeVisible({
      timeout: 5000,
    })
  })

  test("buscar lead por nome", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/leads")

    await page.getByPlaceholder("Buscar por nome ou whatsapp").fill("Elena")

    await expect(page.getByText("Elena Rocha")).toBeVisible({ timeout: 5000 })
    await expect(page.getByText("Ana Silva")).not.toBeVisible()
  })

  test("filtrar por etapa", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/leads")

    await page.getByText("Todas as etapas").click()
    await page.getByRole("option", { name: "Qualificação" }).click()

    await expect(page.getByText("Bruna Costa")).toBeVisible({ timeout: 5000 })
    await expect(page.getByText("Ana Silva")).not.toBeVisible()
  })

  test("navegar para ficha do lead", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/leads")

    await page.getByText("Carla Souza").click()

    await expect(page).toHaveURL(/\/leads\//, { timeout: 5000 })
    await expect(page.getByRole("tab", { name: "Dados" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Histórico" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Fotos" })).toBeVisible()
  })

  test("arquivar e desarquivar lead", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/leads")

    // Navigate to lead detail
    await page.getByText("Diana Lima").click()
    await expect(page).toHaveURL(/\/leads\//, { timeout: 5000 })

    // Archive
    await page.getByRole("button", { name: "Arquivar" }).click()
    await expect(page.getByText("Lead arquivado")).toBeVisible({ timeout: 5000 })

    // Unarchive
    await page.getByRole("button", { name: "Desarquivar" }).click()
    await expect(page.getByText("Lead desarquivado")).toBeVisible({ timeout: 5000 })
  })
})
