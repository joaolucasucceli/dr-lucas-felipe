import { test, expect } from "@playwright/test"

test.describe("CLIENTE-223 — Navbar atualizado", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")
  })

  test("Navbar desktop mostra 5 links corretos", async ({ page }) => {
    const nav = page.locator("nav")
    const links = nav.locator(".hidden.md\\:flex a:not([target])")
    await expect(links).toHaveCount(5)
    await expect(links.nth(0)).toContainText("Sobre")
    await expect(links.nth(1)).toContainText("Procedimentos")
    await expect(links.nth(2)).toContainText("Protocolos")
    await expect(links.nth(3)).toContainText("Resultados")
    await expect(links.nth(4)).toContainText("Contato")
  })

  test("Link #protocolos aponta para secao existente", async ({ page }) => {
    const link = page.locator('nav a[href="#protocolos"]')
    await expect(link).toBeVisible()
    const secao = page.locator("#protocolos")
    await expect(secao).toBeAttached()
  })

  test("Link #resultados aponta para secao existente", async ({ page }) => {
    const link = page.locator('nav a[href="#resultados"]')
    await expect(link).toBeVisible()
    const secao = page.locator("#resultados")
    await expect(secao).toBeAttached()
  })

  test("Nao mostra mais 'Diferenciais' no nav", async ({ page }) => {
    const nav = page.locator("nav")
    const linkDif = nav.locator('a[href="#diferenciais"]')
    await expect(linkDif).toHaveCount(0)
  })

  test("CTA 'Agende sua avaliacao' mantido", async ({ page }) => {
    const nav = page.locator("nav")
    await expect(nav.getByText("Agende sua avaliação")).toBeVisible()
  })
})
