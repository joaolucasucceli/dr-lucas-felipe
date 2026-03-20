import { test, expect } from "@playwright/test"
import { restaurarSeed } from "./helpers/db"

async function loginComoGestor(page: import("@playwright/test").Page) {
  await page.goto("/login")
  await page.getByLabel("Email").fill("lucas@drlucas.com.br")
  await page.locator("#senha").fill("senha123")
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
}

async function abrirBusca(page: import("@playwright/test").Page) {
  // Aguardar hidratação do React antes de clicar
  await page.waitForLoadState("networkidle")
  await page.getByRole("button", { name: "Abrir busca" }).click()
  await expect(page.getByPlaceholder("Buscar leads, agendamentos...")).toBeVisible({
    timeout: 5000,
  })
}

test.describe.serial("Busca Global e Notificações", () => {
  test.beforeAll(async () => {
    await restaurarSeed()
  })

  test("botão de busca está visível e abre o dialog", async ({ page }) => {
    await loginComoGestor(page)

    // O botão de busca com atalho Ctrl K deve estar visível no header
    const botaoBusca = page.getByRole("button", { name: "Abrir busca" })
    await expect(botaoBusca).toBeVisible({ timeout: 5000 })

    // Aguardar hidratação completa e clicar
    await page.waitForLoadState("networkidle")
    await botaoBusca.click()
    await expect(page.getByPlaceholder("Buscar leads, agendamentos...")).toBeVisible({
      timeout: 5000,
    })
  })

  test("buscar por 'Ana' retorna resultados", async ({ page }) => {
    await loginComoGestor(page)
    await abrirBusca(page)

    // Digitar termo de busca
    await page.getByPlaceholder("Buscar leads, agendamentos...").fill("Ana")

    // Aguardar debounce + resultado
    await page.waitForTimeout(500)

    // Deve aparecer algum resultado com "Ana" na lista
    await expect(page.getByRole("option", { name: /Ana/i }).first()).toBeVisible({
      timeout: 5000,
    })
  })

  test("clicar em resultado de lead navega para página do lead", async ({ page }) => {
    await loginComoGestor(page)
    await abrirBusca(page)

    // Buscar
    await page.getByPlaceholder("Buscar leads, agendamentos...").fill("Ana")
    await page.waitForTimeout(500)

    // Clicar no primeiro resultado
    const primeiroResultado = page.getByRole("option", { name: /Ana/i }).first()
    await expect(primeiroResultado).toBeVisible({ timeout: 5000 })
    await primeiroResultado.click()

    // URL deve mudar para /leads/:id ou /agendamentos
    await expect(page).toHaveURL(/\/(leads|agendamentos)/, { timeout: 5000 })
  })

  test("Escape fecha o dialog de busca", async ({ page }) => {
    await loginComoGestor(page)
    await abrirBusca(page)

    // Fechar com Escape
    await page.keyboard.press("Escape")

    await expect(
      page.getByPlaceholder("Buscar leads, agendamentos...")
    ).not.toBeVisible({ timeout: 3000 })
  })

  test("sino de notificações está visível no header", async ({ page }) => {
    await loginComoGestor(page)

    // O botão do sino deve estar visível
    await expect(page.getByRole("button", { name: "Notificações" })).toBeVisible({
      timeout: 5000,
    })
  })

  test("clicar no sino abre o painel de notificações", async ({ page }) => {
    await loginComoGestor(page)

    // Clicar no sino
    await page.getByRole("button", { name: "Notificações" }).click()

    // O texto "Notificações" deve aparecer no painel
    await expect(page.getByText(/^Notificações/)).toBeVisible({ timeout: 5000 })
  })

  test("painel de notificações exibe conteúdo", async ({ page }) => {
    await loginComoGestor(page)

    // Abrir painel
    await page.getByRole("button", { name: "Notificações" }).click()

    // Deve exibir uma das seções ou mensagem "nenhuma notificação"
    await expect(
      page
        .getByText("Nenhuma notificação no momento.")
        .or(page.getByText("Leads em alerta"))
        .or(page.getByText("Agendamentos próximos"))
        .or(page.getByText("Novos leads da IA"))
        .first()
    ).toBeVisible({ timeout: 5000 })
  })
})
