import { test, expect } from "@playwright/test"

test.describe("CLIENTE-245 — Login split screen", () => {
  test("Pagina de login carrega com layout split", async ({ page }) => {
    await page.goto("/login")
    await page.waitForLoadState("networkidle")

    await expect(page.getByText("Central Dr. Lucas")).toBeVisible()
    await expect(page.getByText("Entre com suas credenciais")).toBeVisible()
  })

  test("Campos de email e senha presentes", async ({ page }) => {
    await page.goto("/login")
    await page.waitForLoadState("networkidle")

    await expect(page.locator("#email")).toBeVisible()
    await expect(page.locator("#senha")).toBeVisible()
  })

  test("Toggle mostrar/ocultar senha funciona", async ({ page }) => {
    await page.goto("/login")
    await page.waitForLoadState("networkidle")

    const senhaInput = page.locator("#senha")
    await expect(senhaInput).toHaveAttribute("type", "password")

    await page.getByLabel("Mostrar senha").click()
    await expect(senhaInput).toHaveAttribute("type", "text")

    await page.getByLabel("Ocultar senha").click()
    await expect(senhaInput).toHaveAttribute("type", "password")
  })

  test("Botao Entrar presente", async ({ page }) => {
    await page.goto("/login")
    await page.waitForLoadState("networkidle")

    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible()
  })

  test("Footer mostra 'Acesso restrito'", async ({ page }) => {
    await page.goto("/login")
    await page.waitForLoadState("networkidle")

    await expect(page.getByText("Acesso restrito")).toBeVisible()
  })
})
