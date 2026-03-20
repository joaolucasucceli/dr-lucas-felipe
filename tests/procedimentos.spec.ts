import { test, expect } from "@playwright/test"
import { restaurarSeed } from "./helpers/db"

async function loginComoGestor(page: import("@playwright/test").Page) {
  await page.goto("/login")
  await page.getByLabel("Email").fill("lucas@drlucas.com.br")
  await page.locator("#senha").fill("senha123")
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
}

test.describe.serial("Gestão de Procedimentos", () => {
  test.beforeAll(async () => {
    await restaurarSeed()
  })



  test("listar procedimentos exibe dados do seed", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/procedimentos")

    await expect(
      page.getByRole("heading", { name: "Procedimentos" })
    ).toBeVisible()
    await expect(page.getByText("Mini Lipo")).toBeVisible()
    await expect(page.getByText("Lipo Enxertia Glútea")).toBeVisible()
    await expect(page.getByText("PMMA")).toBeVisible()
  })

  test("criar procedimento com dados válidos", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/procedimentos")

    await page.getByRole("button", { name: "Novo Procedimento" }).click()

    await page.getByLabel("Nome").fill("Teste Playwright Proc")
    await page.getByLabel("Duração (min)").fill("90")

    await page.getByRole("button", { name: "Criar" }).click()

    await expect(page.getByText("Procedimento criado")).toBeVisible({
      timeout: 5000,
    })
  })

  test("editar procedimento altera dados", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/procedimentos")

    const linha = page.getByRole("row").filter({ hasText: "PMMA" })
    await linha.getByRole("button").last().click()
    await page.getByRole("menuitem", { name: "Editar" }).click()

    const nomeInput = page.getByLabel("Nome")
    await nomeInput.clear()
    await nomeInput.fill("PMMA Editado")

    await page.getByRole("button", { name: "Salvar" }).click()

    await expect(page.getByText("Procedimento atualizado")).toBeVisible({
      timeout: 5000,
    })
  })

  test("desativar procedimento", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/procedimentos")

    const linha = page.getByRole("row").filter({ hasText: "Mini Lipo" })
    await linha.getByRole("button").last().click()
    await page.getByRole("menuitem", { name: "Desativar" }).click()

    await expect(page.getByText("Procedimento desativado")).toBeVisible({
      timeout: 5000,
    })
  })

  test("campos obrigatórios mostram erro", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/procedimentos")

    await page.getByRole("button", { name: "Novo Procedimento" }).click()
    await page.getByRole("button", { name: "Criar" }).click()

    await expect(page.getByText("Nome deve ter pelo menos 2 caracteres")).toBeVisible()
  })

  test("atendente não pode criar procedimento", async ({ page }) => {
    await page.goto("/login")
    await page.getByLabel("Email").fill("maria@drlucas.com.br")
    await page.locator("#senha").fill("senha123")
    await page.getByRole("button", { name: "Entrar" }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })

    await page.goto("/procedimentos")

    await expect(
      page.getByRole("button", { name: "Novo Procedimento" })
    ).not.toBeVisible()
  })
})
