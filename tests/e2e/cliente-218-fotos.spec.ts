import { test, expect } from "@playwright/test"

test.describe("CLIENTE-218 — Fotos profissionais atualizadas", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")
  })

  test("Hero carrega foto-1.jpeg", async ({ page }) => {
    const heroImg = page.locator('img[src*="foto-1"]')
    await expect(heroImg).toBeVisible()
    const src = await heroImg.getAttribute("src")
    expect(src).toBeTruthy()
  })

  test("Procedimentos carrega foto-2.jpeg", async ({ page }) => {
    const procImg = page.locator('img[src*="foto-2"]')
    await expect(procImg).toBeVisible()
  })

  test("CTA carrega foto-3.jpeg", async ({ page }) => {
    const ctaImg = page.locator('img[src*="foto-3"]')
    await ctaImg.scrollIntoViewIfNeeded()
    await expect(ctaImg).toBeVisible()
  })

  test("Imagens retornam HTTP 200", async ({ page }) => {
    const urls = [
      "/images/dr-lucas/foto-1.jpeg",
      "/images/dr-lucas/foto-2.jpeg",
      "/images/dr-lucas/foto-3.jpeg",
    ]
    for (const url of urls) {
      const resp = await page.request.get(url)
      expect(resp.status()).toBe(200)
      expect(resp.headers()["content-type"]).toContain("image")
    }
  })
})
