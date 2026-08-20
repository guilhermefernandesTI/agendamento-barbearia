import fs from "fs";
import path from "path";
import pg from "pg";

const { Pool } = pg;

const dbDir = path.join(process.cwd(), "db");
const dbFile = path.join(dbDir, "local-state.json");

const defaultState = {
  services: [],
  barbers: [],
  appointments: [],
  blocks: [],
  products: [],
  sales: [],
};

function cloneDefaultState() {
  return structuredClone(defaultState);
}

function ensureLocalFile() {
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
  if (!fs.existsSync(dbFile)) {
    fs.writeFileSync(dbFile, JSON.stringify(cloneDefaultState(), null, 2), "utf8");
  }
}

function readLocalState() {
  ensureLocalFile();
  try {
    const content = fs.readFileSync(dbFile, "utf8");
    return content ? JSON.parse(content) : cloneDefaultState();
  } catch {
    return cloneDefaultState();
  }
}

function writeLocalState(data) {
  ensureLocalFile();
  fs.writeFileSync(dbFile, JSON.stringify(data, null, 2), "utf8");
}

function normalizeState(data) {
  const base = cloneDefaultState();
  const source = data && typeof data === "object" ? data : {};
  const merged = { ...base, ...source };

  merged.services = Array.isArray(source.services) ? source.services : base.services;
  merged.barbers = Array.isArray(source.barbers) ? source.barbers : base.barbers;
  merged.appointments = (Array.isArray(source.appointments) ? source.appointments : base.appointments)
    .filter((appointment) => !appointment.action);
  merged.blocks = Array.isArray(source.blocks) ? source.blocks : base.blocks;
  merged.products = Array.isArray(source.products) ? source.products : base.products;
  merged.sales = Array.isArray(source.sales) ? source.sales : base.sales;

  return merged;
}

export async function initializeDatabase() {
  if (!process.env.DATABASE_URL) {
    return false;
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        state JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    const result = await pool.query("SELECT state FROM app_state WHERE id = 1;");
    if (!result.rowCount) {
      await pool.query("INSERT INTO app_state (id, state) VALUES (1, $1)", [normalizeState(defaultState)]);
    }
    return true;
  } finally {
    await pool.end();
  }
}

export async function getState() {
  if (!process.env.DATABASE_URL) {
    return readLocalState();
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const result = await pool.query("SELECT state FROM app_state WHERE id = 1 LIMIT 1;");
    if (!result.rowCount) {
      const empty = normalizeState(defaultState);
      await pool.query("INSERT INTO app_state (id, state) VALUES (1, $1)", [empty]);
      return empty;
    }
    return normalizeState(result.rows[0].state || defaultState);
  } finally {
    await pool.end();
  }
}

export async function saveState(data) {
  const state = normalizeState(data);

  if (!process.env.DATABASE_URL) {
    writeLocalState(state);
    return state;
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    await pool.query(
      "INSERT INTO app_state (id, state) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()",
      [state],
    );
    return state;
  } finally {
    await pool.end();
  }
}

export function readFallbackState() {
  return readLocalState();
}