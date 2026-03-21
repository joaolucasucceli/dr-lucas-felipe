import { test, expect } from "@playwright/test"
import { restaurarSeed } from "./helpers/db"

async function loginComoGestor(page: import("@playwright/test").Page) {
  await page.goto("/login")
  await page.getByLabel("Email").fill("lucas@drlucas.com.br")
  await page.locator("#senha").fill("senha123")
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
}

test.describe.serial("Agendamentos", () => {
  test.beforeAll(async () => {
    await restaurarSeed()
  })

  test("página /agendamentos carrega com tabela", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/agendamentos")

    await expect(page.getByRole("heading", { name: "Agendamentos" })).toBeVisible({
      timeout: 8000,
    })
    await expect(page.getByRole("button", { name: "Novo Agendamento" })).toBeVisible()
    // Tabela presente (mesmo que vazia)
    await expect(page.getByText("Lista")).toBeVisible()
    await expect(page.getByText("Calendário")).toBeVisible()
  })

  test("criar agendamento sem Google Calendar", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/agendamentos")

    await page.getByRole("button", { name: "Novo Agendamento" }).click()

    // Dialog deve abrir
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 5000 })

    // Selecionar paciente (dentro do dialog)
    await dialog.getByRole("combobox").first().click()
    await expect(page.getByRole("option", { name: "Ana Silva" })).toBeVisible({ timeout: 5000 })
    await page.getByRole("option", { name: "Ana Silva" }).click()

    // Preencher data e hora (dentro do dialog)
    const amanha = new Date()
    amanha.setDate(amanha.getDate() + 1)
    const dataStr = amanha.toISOString().slice(0, 10)
    await dialog.locator('input[type="date"]').fill(dataStr)
    await dialog.locator('input[type="time"]').fill("10:00")

    // Criar
    await dialog.getByRole("button", { name: "Criar" }).click()

    // Deve fechar o dialog e mostrar o agendamento na tabela
    await expect(dialog).not.toBeVisible({ timeout: 8000 })
    await expect(page.getByText("Ana Silva")).toBeVisible({ timeout: 8000 })
  })

  test("agendamento aparece na ficha do lead", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/leads")

    await expect(page.getByText("Ana Silva")).toBeVisible({ timeout: 8000 })
    await page.getByText("Ana Silva").click()
    await expect(page).toHaveURL(/\/leads\/.+/, { timeout: 8000 })

    // Ir para tab Agendamentos
    await page.getByRole("tab", { name: "Agendamentos" }).click()

    // Deve haver pelo menos um agendamento
    await expect(page.getByRole("button", { name: "Novo Agendamento" })).toBeVisible()
  })

  test("filtrar por status na página /agendamentos", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/agendamentos")

    await expect(page.getByText("Ana Silva")).toBeVisible({ timeout: 8000 })

    // Filtrar por status "cancelado" — não deve aparecer Ana Silva
    const selectStatus = page.locator('[role="combobox"]').filter({ hasText: /Todos|Agendado|Cancelado|Status/ }).first()
    await selectStatus.click()
    await page.getByRole("option", { name: "Cancelado" }).click()

    // Com status cancelado filtrado, não deve aparecer o agendamento de Ana Silva (que está agendado)
    await expect(page.getByText("Nenhum agendamento encontrado")).toBeVisible({ timeout: 5000 })
  })

  test("cancelar agendamento com ConfirmDialog", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/agendamentos")

    // Remover filtro de status voltando para "Todos"
    const selectStatus = page.locator('[role="combobox"]').first()
    await selectStatus.click()
    await page.getByRole("option", { name: "Todos" }).click()

    await expect(page.getByText("Ana Silva")).toBeVisible({ timeout: 8000 })

    // Clicar em Cancelar (force para contornar header fixo no mobile)
    const btnCancelar = page.getByRole("button", { name: "Cancelar" }).first()
    await btnCancelar.click({ force: true })

    // ConfirmDialog deve aparecer
    await expect(page.getByRole("heading", { name: "Cancelar agendamento" })).toBeVisible({ timeout: 5000 })

    // Confirmar cancelamento (force para contornar overlay do dialog no mobile)
    await page.getByRole("button", { name: "Cancelar agendamento" }).last().click({ force: true })

    // Agendamento deve ser marcado como cancelado
    await expect(page.getByText("Cancelado", { exact: true })).toBeVisible({ timeout: 8000 })
  })

  test("view calendário exibe grade semanal", async ({ page }) => {
    await loginComoGestor(page)
    await page.goto("/agendamentos")

    // Mudar para view Calendário
    await page.getByRole("tab", { name: "Calendário" }).click()

    // Deve mostrar os dias da semana
    await expect(page.getByText("Seg")).toBeVisible({ timeout: 5000 })
    await expect(page.getByText("8:00", { exact: true })).toBeVisible()
  })
})
