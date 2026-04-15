import { test, expect } from "@playwright/test"

test.describe("CLIENTE-220 — Secao Resultados", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")
  })

  test("Secao #resultados existe", async ({ page }) => {
    const secao = page.locator("#resultados")
    await secao.scrollIntoViewIfNeeded()
    await expect(secao).toBeVisible()
    await expect(secao).toContainText("Resultados Reais")
  })

  test("Tabs de filtro presentes", async ({ page }) => {
    const secao = page.locator("#resultados")
    await secao.scrollIntoViewIfNeeded()
    await expect(secao.getByRole("button", { name: "Todos", exact: true })).toBeVisible()
    await expect(secao.getByRole("button", { name: "Lipo Abdome e Flancos", exact: true })).toBeVisible()
    await expect(secao.getByRole("button", { name: "Preenchimento Glúteo", exact: true })).toBeVisible()
  })

  test("Galeria mostra imagens", async ({ page }) => {
    const secao = page.locator("#resultados")
    await secao.scrollIntoViewIfNeeded()
    const imagens = secao.locator("img")
    const count = await imagens.count()
    expect(count).toBeGreaterThanOrEqual(5)
  })

  test("Filtro por categoria funciona", async ({ page }) => {
    const secao = page.locator("#resultados")
    await secao.scrollIntoViewIfNeeded()

    const totalAntes = await secao.locator("img").count()

    await secao.getByRole("button", { name: "Preenchimento Glúteo", exact: true }).click()
    await page.waitForTimeout(300)
    const totalDepois = await secao.locator("img").count()

    expect(totalDepois).toBeLessThan(totalAntes)
    expect(totalDepois).toBe(4)
  })

  test("Lightbox abre ao clicar na imagem", async ({ page }) => {
    const secao = page.locator("#resultados")
    await secao.scrollIntoViewIfNeeded()

    const primeiraImgBtn = secao.locator("button:has(img)").first()
    await primeiraImgBtn.scrollIntoViewIfNeeded()
    await primeiraImgBtn.click()

    const dialog = page.locator("[role='dialog']")
    await expect(dialog).toBeVisible()
  })

  test("Lightbox fecha com botao X", async ({ page }) => {
    const secao = page.locator("#resultados")
    await secao.scrollIntoViewIfNeeded()

    const primeiraImgBtn = secao.locator("button:has(img)").first()
    await primeiraImgBtn.scrollIntoViewIfNeeded()
    await primeiraImgBtn.click()

    const dialog = page.locator("[role='dialog']")
    await expect(dialog).toBeVisible()

    await dialog.locator("button[aria-label='Fechar']").click()
    await expect(dialog).not.toBeVisible()
  })

  test("Disclaimer medico presente", async ({ page }) => {
    const secao = page.locator("#resultados")
    await secao.scrollIntoViewIfNeeded()
    await expect(secao).toContainText("resultados dos procedimentos podem variar")
  })
})
