import "dotenv/config";
import { initializeDatabase } from "../db.js";

try {
  const created = await initializeDatabase();
  if (!created) {
    console.log("Nenhuma DATABASE_URL configurada. Usando fallback local em db/local-state.json.");
    process.exit(0);
  }

  console.log("Banco de dados inicializado com sucesso.");
} catch (error) {
  console.error("Erro ao inicializar o banco de dados:", error.message);
  process.exit(1);
}
