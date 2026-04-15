import { test, expect } from "@playwright/test"

test.describe("CLIENTE-217 — Nome Dr. Lucas Ferreira", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")
  })

  test("Navbar mostra 'Dr. Lucas Ferreira' e 'Estética Avançada'", async ({ page }) => {
    const navbar = page.locator("nav")
    await expect(navbar).toContainText("Dr. Lucas Ferreira")
    await expect(navbar).toContainText("Estética Avançada")
    await expect(navbar).not.toContainText("Lucas Felipe")
    await expect(navbar).not.toContainText("Medicina Estética")
  })

  test("Hero nao contem 'Lucas Felipe'", async ({ page }) => {
    const hero = page.locator("section").first()
    await expect(hero).toContainText("Dr. Lucas Ferreira")
    await expect(hero).not.toContainText("Lucas Felipe")
  })

  test("Secao Sobre mostra 'Dr. Lucas Ferreira'", async ({ page }) => {
    const sobre = page.locator("#sobre")
    await expect(sobre).toContainText("Dr. Lucas Ferreira")
    await expect(sobre).not.toContainText("Lucas Felipe")
  })

  test("Meta title contem 'Dr. Lucas Ferreira'", async ({ page }) => {
    const title = await page.title()
    expect(title).toContain("Dr. Lucas Ferreira")
    expect(title).not.toContain("Lucas Felipe")
  })

  test("Nenhum texto visivel contem 'Lucas Felipe'", async ({ page }) => {
    const body = page.locator("body")
    await expect(body).not.toContainText("Lucas Felipe")
  })

  test("Pagina LGPD mostra 'Dr. Lucas Ferreira'", async ({ page }) => {
    await page.goto("/lgpd")
    await page.waitForLoadState("networkidle")
    const body = page.locator("body")
    await expect(body).toContainText("Dr. Lucas Ferreira")
    await expect(body).not.toContainText("Lucas Felipe")
  })
})
