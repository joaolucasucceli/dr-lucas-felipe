import { test, expect } from "@playwright/test"

async function loginComoGestor(page: import("@playwright/test").Page) {
  await page.goto("/login")
  await page.getByLabel("Email").fill("lucas@drlucas.com.br")
  await page.locator("#senha").fill("senha123")
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
}

test.describe("WhatsApp Config", () => {
  test("card WhatsApp aparece na página de configurações", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/configuracoes")

    await expect(page.getByText("WhatsApp")).toBeVisible()
    await expect(
      page.getByText("Conecte via Uazapi para receber mensagens")
    ).toBeVisible()
  })

  test("página de configuração WhatsApp carrega corretamente", async ({
    page,
  }) => {
    await loginComoGestor(page)
    await page.goto("/configuracoes/whatsapp")

    await expect(
      page.getByRole("heading", { name: "WhatsApp" })
    ).toBeVisible()
    await expect(page.getByText("Credenciais Uazapi")).toBeVisible()
  })

  test("formulário exibe campos URL e Token", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/configuracoes/whatsapp")

    await expect(page.getByLabel("URL do Uazapi")).toBeVisible()
    await expect(page.getByLabel("Admin Token")).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Testar Conexão" })
    ).toBeVisible()
  })
})
