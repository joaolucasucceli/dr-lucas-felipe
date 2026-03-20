import { test, expect } from "@playwright/test"
import { restaurarSeed } from "./helpers/db"

async function loginComoGestor(page: import("@playwright/test").Page) {
  await page.goto("/login")
  await page.getByLabel("Email").fill("lucas@drlucas.com.br")
  await page.locator("#senha").fill("senha123")
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
}

test.describe.serial("Gestão de Usuários", () => {
  test.beforeAll(async () => {
    await restaurarSeed()
  })



  test("listar usuários exibe tabela com dados do seed", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/usuarios")

    await expect(
      page.getByRole("heading", { name: "Usuários" })
    ).toBeVisible()
    await expect(page.getByText("Dr. Lucas Felipe")).toBeVisible()
    await expect(page.getByText("Ana Júlia — IA")).toBeVisible()
  })

  test("criar novo usuário com dados válidos", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/usuarios")

    await page.getByRole("button", { name: "Novo Usuário" }).click()

    await page.getByLabel("Nome").fill("Teste Playwright")
    await page.getByLabel("Email").fill(`teste-${Date.now()}@drlucas.com.br`)
    await page.getByLabel("Senha").fill("senha123")

    await page.getByRole("button", { name: "Criar" }).click()

    await expect(page.getByText("Usuário criado")).toBeVisible({
      timeout: 5000,
    })
  })

  test("criar usuário com email duplicado mostra erro", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/usuarios")

    await page.getByRole("button", { name: "Novo Usuário" }).click()

    await page.getByLabel("Nome").fill("Duplicado")
    await page.getByLabel("Email").fill("lucas@drlucas.com.br")
    await page.getByLabel("Senha").fill("senha123")

    await page.getByRole("button", { name: "Criar" }).click()

    await expect(page.getByText("Email já cadastrado")).toBeVisible({
      timeout: 5000,
    })
  })

  test("editar usuário altera dados", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/usuarios")

    // Encontrar a linha do Desenvolvedor e abrir menu
    const linha = page.getByRole("row").filter({ hasText: "Desenvolvedor" })
    await linha.getByRole("button").last().click()
    await page.getByRole("menuitem", { name: "Editar" }).click()

    // Alterar nome
    const nomeInput = page.getByLabel("Nome")
    await nomeInput.clear()
    await nomeInput.fill("Dev Atualizado")

    await page.getByRole("button", { name: "Salvar" }).click()

    await expect(page.getByText("Usuário atualizado")).toBeVisible({
      timeout: 5000,
    })
  })

  test("atendente não tem acesso à página de usuários", async ({ page }) => {
    // Login como Maria Atendente (antes de desativá-la no próximo teste)
    await page.goto("/login")
    await page.getByLabel("Email").fill("maria@drlucas.com.br")
    await page.locator("#senha").fill("senha123")
    await page.getByRole("button", { name: "Entrar" }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })

    // Verificar que o menu Usuários não aparece na sidebar
    await expect(page.getByRole("link", { name: "Usuários" })).not.toBeVisible()
  })

  test("desativar usuário com confirmação", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/usuarios")

    // Encontrar Maria Atendente e abrir menu
    const linha = page.getByRole("row").filter({ hasText: "Maria Atendente" })
    await linha.getByRole("button").last().click()
    await page.getByRole("menuitem", { name: "Desativar" }).click()

    // Confirmar no dialog
    await expect(page.getByText("Desativar usuário")).toBeVisible()
    await page.getByRole("button", { name: "Desativar" }).click()

    await expect(page.getByText("Usuário desativado")).toBeVisible({
      timeout: 5000,
    })
  })
})
