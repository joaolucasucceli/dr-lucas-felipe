import { test, expect } from "@playwright/test"

test.describe("CLIENTE-222 — Secao Protocolos", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")
  })

  test("Secao #protocolos existe na pagina", async ({ page }) => {
    const secao = page.locator("#protocolos")
    await secao.scrollIntoViewIfNeeded()
    await expect(secao).toBeVisible()
  })

  test("Mostra label 'Protocolos Exclusivos'", async ({ page }) => {
    const secao = page.locator("#protocolos")
    await expect(secao).toContainText("Protocolos Exclusivos")
  })

  test("Protocolo LIPO FIT com etapas e diferenciais", async ({ page }) => {
    const secao = page.locator("#protocolos")
    await secao.scrollIntoViewIfNeeded()
    await expect(secao).toContainText("LIPO FIT")
    await expect(secao).toContainText("Preparando seu corpo para a melhor versão")
    await expect(secao).toContainText("Avaliação Inicial")
    await expect(secao).toContainText("Emagrecimento")
    await expect(secao).toContainText("Lipoaspiração")
    await expect(secao).toContainText("Abordagem completa")
  })

  test("Protocolo LIPOBUTT com etapas e diferenciais", async ({ page }) => {
    const secao = page.locator("#protocolos")
    await secao.scrollIntoViewIfNeeded()
    await expect(secao).toContainText("LIPOBUTT")
    await expect(secao).toContainText("Escultura corporal + glúteo definitivo")
    await expect(secao).toContainText("Planejamento")
    await expect(secao).toContainText("Preenchimento PMMA")
    await expect(secao).toContainText("Glúteo definitivo")
  })

  test("CTAs de WhatsApp presentes", async ({ page }) => {
    const secao = page.locator("#protocolos")
    await secao.scrollIntoViewIfNeeded()
    const ctas = secao.locator('a[href*="wa.me"]')
    await expect(ctas).toHaveCount(2)
  })
})
