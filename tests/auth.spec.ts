import { test, expect } from "@playwright/test"

test.describe("Autenticação", () => {
  test("login com credenciais válidas redireciona para dashboard", async ({
    page,
  }) => {
    await page.goto("/login")

    await page.getByLabel("Email").fill("lucas@drlucas.com.br")
    await page.locator("#senha").fill("senha123")
    await page.getByRole("button", { name: "Entrar" }).click()

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
    await expect(page.getByText("Dr. Lucas Felipe")).toBeVisible()
  })

  test("login com credenciais inválidas mostra erro", async ({ page }) => {
    await page.goto("/login")

    await page.getByLabel("Email").fill("lucas@drlucas.com.br")
    await page.locator("#senha").fill("senhaerrada")
    await page.getByRole("button", { name: "Entrar" }).click()

    await expect(page.getByText("Email ou senha inválidos")).toBeVisible()
  })

  test("acesso a rota protegida sem login redireciona para login", async ({
    page,
  }) => {
    await page.goto("/dashboard")
    await expect(page).toHaveURL(/\/login/)
  })

  test("logout redireciona para login", async ({ page }) => {
    // Login primeiro
    await page.goto("/login")
    await page.getByLabel("Email").fill("lucas@drlucas.com.br")
    await page.locator("#senha").fill("senha123")
    await page.getByRole("button", { name: "Entrar" }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })

    // Clicar no menu do usuário e sair
    await page.getByRole("button", { name: /Dr. Lucas Felipe/i }).click()
    await page.getByRole("menuitem", { name: "Sair" }).click()

    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })
})
