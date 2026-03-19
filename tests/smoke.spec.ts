import { test, expect } from "@playwright/test"

test("página de login carrega", async ({ page }) => {
  await page.goto("/login")
  await expect(page).toHaveTitle(/Central Dr. Lucas/)
})

test("página de login exibe formulário", async ({ page }) => {
  await page.goto("/login")
  await expect(page.getByLabel("Email")).toBeVisible()
  await expect(page.locator("#senha")).toBeVisible()
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible()
})

test("página raiz redireciona para login", async ({ page }) => {
  await page.goto("/")
  await expect(page).toHaveURL(/\/login/)
})

test("dashboard carrega", async ({ page }) => {
  await page.goto("/dashboard")
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible()
})
