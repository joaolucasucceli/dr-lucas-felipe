import { test, expect } from "@playwright/test"

async function loginComoGestor(page: import("@playwright/test").Page) {
  await page.goto("/login")
  await page.getByLabel("Email").fill("lucas@drlucas.com.br")
  await page.locator("#senha").fill("senha123")
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
  await page.waitForLoadState("networkidle")
}

test.describe.serial("Theme Toggle", () => {
  test("botão de toggle de tema está visível no header", async ({ page }) => {
    await loginComoGestor(page)
    const botaoTema = page.getByRole("button", { name: "Alternar tema" })
    await expect(botaoTema).toBeVisible({ timeout: 5000 })
  })

  test("clicar no toggle muda de dark para light", async ({ page }) => {
    await loginComoGestor(page)

    // Garantir que estamos em dark mode primeiro
    await page.evaluate(() => localStorage.setItem("theme", "dark"))
    await page.reload()
    await page.waitForLoadState("networkidle")

    // html deve ter classe dark
    await expect(page.locator("html")).toHaveClass(/dark/, { timeout: 5000 })

    // Clicar no toggle
    await page.getByRole("button", { name: "Alternar tema" }).click()

    // html não deve mais ter classe dark
    await expect(page.locator("html")).not.toHaveClass(/dark/, { timeout: 5000 })
  })

  test("clicar novamente volta para dark", async ({ page }) => {
    await loginComoGestor(page)

    // Partir de light mode
    await page.evaluate(() => localStorage.setItem("theme", "light"))
    await page.reload()
    await page.waitForLoadState("networkidle")

    await expect(page.locator("html")).not.toHaveClass(/dark/, { timeout: 5000 })

    // Clicar para voltar ao dark
    await page.getByRole("button", { name: "Alternar tema" }).click()

    await expect(page.locator("html")).toHaveClass(/dark/, { timeout: 5000 })
  })

  test("tema persiste após reload da página", async ({ page }) => {
    await loginComoGestor(page)

    // Mudar para light
    await page.evaluate(() => localStorage.setItem("theme", "light"))
    await page.reload()
    await page.waitForLoadState("networkidle")

    // Confirmar light
    await expect(page.locator("html")).not.toHaveClass(/dark/, { timeout: 5000 })

    // Recarregar novamente e verificar persistência
    await page.reload()
    await page.waitForLoadState("networkidle")
    await expect(page.locator("html")).not.toHaveClass(/dark/, { timeout: 5000 })

    // Verificar que o localStorage mantém o valor
    const tema = await page.evaluate(() => localStorage.getItem("theme"))
    expect(tema).toBe("light")
  })
})
