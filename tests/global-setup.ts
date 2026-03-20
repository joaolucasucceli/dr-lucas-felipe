import { execSync } from "child_process"

async function globalSetup() {
  console.log("🌱 Rodando seed do banco...")
  execSync("npx prisma db seed", {
    cwd: process.cwd(),
    stdio: "inherit",
  })
  console.log("✅ Seed concluído")
}

export default globalSetup
