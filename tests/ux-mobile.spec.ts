import { test, expect } from "@playwright/test"
import { restaurarSeed } from "./helpers/db"

async function loginComoGestor(page: import("@playwright/test").Page) {
  await page.goto("/login")
  await page.getByLabel("Email").fill("lucas@drlucas.com.br")
  await page.locator("#senha").fill("senha123")
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
}

test.describe.serial("UX Mobile", () => {
  test.beforeAll(async () => {
    await restaurarSeed()
  })

  test("sidebar drawer abre em viewport mobile (375px)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await loginComoGestor(page)

    // O botão hambúrguer (Menu) deve estar visível em mobile
    const botaoMenu = page.getByRole("button", { name: "Abrir menu" })
    await expect(botaoMenu).toBeVisible({ timeout: 5000 })

    // Clicar abre o Sheet
    await botaoMenu.click()

    // A navegação (nav) dentro do Sheet deve estar visível
    await expect(page.getByRole("link", { name: "Dashboard" }).first()).toBeVisible({
      timeout: 5000,
    })
  })

  test("empty state aparece ao buscar termo inexistente em leads", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/leads")

    // Aguardar tabela carregar
    await page.waitForSelector("tbody tr", { timeout: 8000 })

    // Buscar por nome que não existe
    const inputBusca = page.getByPlaceholder("Buscar por nome ou whatsapp...")
    await inputBusca.fill("XYZXYZ_NAO_EXISTE_999")

    // Aguardar carregamento
    await page.waitForTimeout(1500)

    // DataTable exibe "Nenhum registro encontrado." quando sem resultados
    await expect(page.getByText("Nenhum registro encontrado.")).toBeVisible({ timeout: 5000 })
  })

  test("página 404 exibe mensagem amigável com link para dashboard", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/pagina-que-nao-existe")

    await expect(page.getByText("Página não encontrada")).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole("link", { name: "Voltar ao início" })).toBeVisible()
  })

  test("Atendimentos tem overflow-x-auto no container (scroll mobile)", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/atendimentos")

    // Aguardar carregamento do board
    await page.waitForSelector(".snap-x", { timeout: 10000 })

    const container = page.locator(".snap-x").first()
    await expect(container).toBeVisible()

    // Verificar que o container tem overflow-x-auto
    const overflow = await container.evaluate(
      (el) => window.getComputedStyle(el).overflowX
    )
    expect(["auto", "scroll"]).toContain(overflow)
  })

  test("página de lead detalhe exibe breadcrumb Leads > nome", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/leads")

    // Clicar no primeiro lead
    await page.waitForSelector("tbody tr", { timeout: 8000 })
    await page.locator("tbody tr").first().click()

    // Verificar breadcrumb
    await expect(page.getByRole("link", { name: "Leads" })).toBeVisible({ timeout: 5000 })
  })
})
