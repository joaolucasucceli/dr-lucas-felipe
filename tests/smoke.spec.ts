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

test("página raiz carrega site público ou login", async ({ page }) => {
  const res = await page.goto("/")
  expect(res?.ok()).toBeTruthy()
})

test("dashboard protegido redireciona para login", async ({ page }) => {
  await page.goto("/dashboard")
  await expect(page).toHaveURL(/\/login/)
})
