import { test, expect } from "@playwright/test"
import { restaurarSeed } from "./helpers/db"

async function loginComoGestor(page: import("@playwright/test").Page) {
  await page.goto("/login")
  await page.getByLabel("Email").fill("lucas@drlucas.com.br")
  await page.locator("#senha").fill("senha123")
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
}

test.describe.serial("LGPD", () => {
  test.beforeAll(async () => {
    await restaurarSeed()
  })

  test("página /lgpd acessível sem autenticação", async ({ page }) => {
    await page.goto("/lgpd")

    await expect(
      page.getByRole("heading", { name: "Política de Privacidade" })
    ).toBeVisible({ timeout: 8000 })

    await expect(page.getByText("Dados coletados")).toBeVisible()
    await expect(page.getByText("Seus direitos como titular")).toBeVisible()
  })

  test("gestor vê seção LGPD na ficha do lead", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/leads")

    // Clicar no nome do lead (mesma abordagem usada em leads.spec.ts)
    await expect(page.getByText("Ana Silva")).toBeVisible({ timeout: 8000 })
    await page.getByText("Ana Silva").click()

    await expect(page).toHaveURL(/\/leads\/.+/, { timeout: 8000 })

    // Seção LGPD deve estar visível
    await expect(
      page.getByText("LGPD — Direitos do Titular")
    ).toBeVisible({ timeout: 5000 })

    await expect(
      page.getByRole("button", { name: "Exportar dados" })
    ).toBeVisible()

    await expect(
      page.getByRole("button", { name: "Anonimizar" })
    ).toBeVisible()
  })

  test("botão exportar dados dispara download", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/leads")

    await expect(page.getByText("Ana Silva")).toBeVisible({ timeout: 8000 })
    await page.getByText("Ana Silva").click()
    await expect(page).toHaveURL(/\/leads\/.+/, { timeout: 8000 })

    // Aguardar download ao clicar em Exportar dados
    const downloadPromise = page.waitForEvent("download", { timeout: 10000 })
    await page.getByRole("button", { name: "Exportar dados" }).click()

    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/lead-.+-dados\.json/)
  })

  test("botão anonimizar exibe ConfirmDialog", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/leads")

    await expect(page.getByText("Ana Silva")).toBeVisible({ timeout: 8000 })
    await page.getByText("Ana Silva").click()
    await expect(page).toHaveURL(/\/leads\/.+/, { timeout: 8000 })

    await page.getByRole("button", { name: "Anonimizar" }).click()

    // Dialog de confirmação deve aparecer
    await expect(
      page.getByText("Anonimizar dados do paciente")
    ).toBeVisible({ timeout: 5000 })

    // Fechar sem confirmar
    await page.getByRole("button", { name: "Cancelar" }).click()
  })
})
