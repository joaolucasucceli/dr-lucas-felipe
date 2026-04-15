import { test, expect } from "@playwright/test"

test.describe("CLIENTE-219 — Secao Sobre expandida", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")
  })

  test("Label mostra 'Sobre o Dr. Lucas Ferreira'", async ({ page }) => {
    const sobre = page.locator("#sobre")
    await expect(sobre).toContainText("Sobre o Dr. Lucas Ferreira")
  })

  test("Heading menciona '10 anos'", async ({ page }) => {
    const sobre = page.locator("#sobre")
    await expect(sobre).toContainText("10 anos")
  })

  test("Conteudo menciona trajetoria pessoal", async ({ page }) => {
    const sobre = page.locator("#sobre")
    await expect(sobre).toContainText("médico dedicado")
    await expect(sobre).toContainText("urgência e emergência")
    await expect(sobre).toContainText("contorno corporal")
    await expect(sobre).toContainText("cuidar de pessoas")
  })

  test("Cards de diferenciais mantidos", async ({ page }) => {
    const sobre = page.locator("#sobre")
    await expect(sobre).toContainText("Segurança")
    await expect(sobre).toContainText("Resultados Naturais")
    await expect(sobre).toContainText("Atendimento Personalizado")
  })
})
