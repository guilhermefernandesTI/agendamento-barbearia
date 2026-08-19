import http from "http";
import { createHmac, timingSafeEqual } from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { initializeDatabase, getState, saveState } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const root = __dirname;
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";

const dbDir = path.join(root, "db");
const dbFile = path.join(dbDir, "local-state.json");
const adminPassword = process.env.ADMIN_PASSWORD || "920025";
const sessionSecret = process.env.SESSION_SECRET || adminPassword;

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon"
};

function ensureDatabase() {
  if (process.env.VERCEL) return;

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  if (!fs.existsSync(dbFile)) {
    fs.writeFileSync(
      dbFile,
      JSON.stringify({}, null, 2),
      "utf8"
    );
  }
}

async function readDatabase() {
  if (process.env.DATABASE_URL) {
    return (await getState()) || {};
  }

  if (process.env.VERCEL) {
    throw new Error("Banco de dados não configurado na Vercel. Defina DATABASE_URL.");
  }

  ensureDatabase();

  try {
    const content = fs.readFileSync(dbFile, "utf8");
    return content ? JSON.parse(content) : {};
  } catch (error) {
    console.error("Erro ao ler banco:", error);
    return {};
  }
}

async function writeDatabase(data) {
  if (process.env.DATABASE_URL) {
    await saveState(data);
    return;
  }

  if (process.env.VERCEL) {
    throw new Error("Banco de dados não configurado na Vercel. Defina DATABASE_URL.");
  }

  ensureDatabase();

  fs.writeFileSync(
    dbFile,
    JSON.stringify(data, null, 2),
    "utf8"
  );
}

function sendJson(response, status, data) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });

  response.end(JSON.stringify(data));
}

function getBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", chunk => {
      body += chunk;
    });

    request.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });

    request.on("error", reject);
  });
}

function getCollection(data, name) {
  if (!Array.isArray(data[name])) {
    data[name] = [];
  }

  return data[name];
}

function getTenant(data, slug = "principal") {
  if (!Array.isArray(data.tenants) || !data.tenants.length) {
    data.tenants = [{ id: "principal", slug: "principal", name: "Barbearia Principal" }];
  }
  return data.tenants.find((tenant) => tenant.slug === slug) || (slug === "principal" ? data.tenants[0] : null);
}

function publicState(data, slug = "principal") {
  const tenant = getTenant(data, slug);
  if (!tenant) return null;
  const state = { tenants: [tenant] };
  const scoped = (name) => getCollection(data, name).filter((item) => !item.tenantId || item.tenantId === tenant.id);
  state.services = scoped("services");
  state.barbers = scoped("barbers").map(({ password, ...barber }) => barber);
  state.appointments = scoped("appointments").filter((item) => !item.action);
  state.blocks = scoped("blocks");
  state.products = scoped("products");
  state.sales = scoped("sales");
  return state;
}

function centralState(data) {
  const principal = getTenant(data, "principal");
  return {
    tenants: Array.isArray(data.tenants) && data.tenants.length ? data.tenants : [principal],
    barbers: getCollection(data, "barbers"),
  };
}

function createSession(user) {
  const payload = Buffer.from(JSON.stringify({ id: user.id, role: user.role, exp: Date.now() + 86400000 })).toString("base64url");
  const signature = createHmac("sha256", sessionSecret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function getSessionUser(request) {
  const token = String(request.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", sessionSecret).update(payload).digest("base64url");
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const user = JSON.parse(Buffer.from(payload, "base64url").toString());
    return user.exp > Date.now() ? user : null;
  } catch {
    return null;
  }
}

function hasValidSession(request) {
  return Boolean(getSessionUser(request));
}

function applyAction(database, action, payload = {}, tenantSlug = "principal") {
  const collection = (name) => getCollection(database, name);
  const tenant = getTenant(database, payload.tenantSlug || tenantSlug);
  const withTenant = (item) => ({ ...item, tenantId: item.tenantId || tenant.id });

  if (action === "createAppointment") {
    collection("appointments").push(withTenant({ id: payload.id || crypto.randomUUID(), ...payload }));
    return;
  }

  if (action === "updateAppointment") {
    const appointment = collection("appointments").find((item) => item.id === payload.id && (!item.tenantId || item.tenantId === tenant.id));
    if (!appointment) throw new Error("Agendamento não encontrado.");
    appointment.status = payload.status;
    return;
  }

  if (action === "addService") {
    collection("services").push(withTenant({ id: payload.id || crypto.randomUUID(), ...payload }));
    return;
  }

  if (action === "removeService") {
    if (collection("services").length <= 1) throw new Error("Mantenha pelo menos um serviço cadastrado.");
    database.services = collection("services").filter((item) => !(item.id === payload.id && (!item.tenantId || item.tenantId === tenant.id)));
    return;
  }

  if (action === "addBarber") {
    const username = String(payload.username || payload.name || "").trim();
    if (!String(payload.name || "").trim() || !username) throw new Error("Informe nome e usuário do barbeiro.");
    if (collection("barbers").some((item) => String(item.username || "").toLowerCase() === username.toLowerCase())) {
      throw new Error("Já existe um barbeiro com esse nome de usuário.");
    }
    collection("barbers").push(withTenant({ id: payload.id || crypto.randomUUID(), ...payload, username }));
    return;
  }

  if (action === "removeBarber") {
    if (collection("barbers").length <= 1) throw new Error("Mantenha pelo menos um barbeiro cadastrado.");
    database.barbers = collection("barbers").filter((item) => !(item.id === payload.id && (!item.tenantId || item.tenantId === tenant.id)));
    return;
  }

  if (action === "addBlock") {
    collection("blocks").push(withTenant({ id: payload.id || crypto.randomUUID(), ...payload }));
    return;
  }

  if (action === "addProduct") {
    collection("products").push(withTenant({ id: payload.id || crypto.randomUUID(), ...payload }));
    return;
  }

  if (action === "removeProduct") {
    database.products = collection("products").filter((item) => !(item.id === payload.id && (!item.tenantId || item.tenantId === tenant.id)));
    return;
  }

  if (action === "addSale") {
    if (!collection("sales").some((item) => item.id === payload.id)) collection("sales").push(withTenant({ id: payload.id || crypto.randomUUID(), ...payload }));
    return;
  }

  if (action === "updateSale") {
    const sale = collection("sales").find((item) => item.id === payload.id && (!item.tenantId || item.tenantId === tenant.id));
    if (!sale) throw new Error("Lançamento não encontrado.");
    Object.assign(sale, payload);
    return;
  }

  if (action === "removeSale") {
    database.sales = collection("sales").filter((item) => !(item.id === payload.id && (!item.tenantId || item.tenantId === tenant.id)));
    return;
  }

  if (action === "createTenant") {
    const name = String(payload.name || "").trim();
    const slug = String(payload.slug || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    if (!name || !slug) throw new Error("Informe o nome e o identificador da barbearia.");
    if (collection("tenants").some((item) => item.slug === slug)) throw new Error("Esse link já está em uso.");
    collection("tenants").push({ id: crypto.randomUUID(), slug, name });
    return;
  }

  if (action === "removeTenant") {
    const slug = String(payload.slug || "").trim();
    const target = collection("tenants").find((item) => item.slug === slug);
    if (!target) throw new Error("Barbearia não encontrada.");
    if (slug === "principal" || target.id === "principal") throw new Error("A barbearia principal não pode ser removida.");
    if (collection("tenants").length <= 1) throw new Error("Mantenha pelo menos uma barbearia.");
    database.tenants = collection("tenants").filter((item) => item.slug !== slug);

    const tenantId = target.id;
    const removeScoped = (name) => {
      database[name] = collection(name).filter((item) => item.tenantId !== tenantId);
    };
    removeScoped("services");
    removeScoped("barbers");
    removeScoped("appointments");
    removeScoped("blocks");
    removeScoped("products");
    removeScoped("sales");
    return;
  }

  throw new Error("Ação não suportada.");
}

async function handleApi(request, response, url) {
  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });

    response.end();
    return true;
  }

  const database = await readDatabase();

  /*
   * AGENDAMENTOS
   */

  if (url.pathname === "/api/agenda") {
    const appointments = getCollection(database, "appointments");
    const tenantSlug = url.searchParams.get("tenant") || "principal";

    if (request.method === "GET") {
      const state = publicState(database, tenantSlug);
      if (!state) {
        sendJson(response, 404, { error: "Barbearia não encontrada." });
        return true;
      }
      sendJson(response, 200, { state });
      return true;
    }

    if (request.method === "POST") {
      const body = await getBody(request);

      if (body.action === "login") {
        const username = String(body.payload?.username || "").trim().toLowerCase();
        const password = String(body.payload?.password || "").trim();

        if ((username === "admin" || username === "administrador") && password === adminPassword) {
          sendJson(response, 200, {
            ok: true,
            barber: { id: "admin", name: "Administrador", username: "admin", role: "admin" },
            token: createSession({ id: "admin", role: "admin" })
          });
          return true;
        }

        const tenant = getTenant(database, body.payload?.tenantSlug || tenantSlug);
        const barber = getCollection(database, "barbers").find((item) => {
          if (item.tenantId && item.tenantId !== tenant.id) return false;
          const barberUser = String(item.username || item.name || "").trim().toLowerCase();
          const barberName = String(item.name || "").trim().toLowerCase();
          const barberPassword = String(item.password || "123").trim();
          return (barberUser === username || barberName === username) && barberPassword === password;
        });

        if (!barber) {
          sendJson(response, 401, { ok: false, error: "Nome de usuário ou senha incorretos." });
          return true;
        }

        sendJson(response, 200, {
          ok: true,
          barber: {
            id: barber.id,
            name: barber.name,
            username: barber.username || barber.name,
            role: "barber"
          },
          token: createSession({ id: barber.id, role: "barber" })
        });
        return true;
      }

      try {
        if (body.action !== "createAppointment" && !hasValidSession(request)) {
          sendJson(response, 401, { ok: false, error: "Acesso restrito. Faça login novamente." });
          return true;
        }
        applyAction(database, body.action, body.payload, tenantSlug);
        await writeDatabase(database);
        sendJson(response, 200, { ok: true, state: publicState(database, tenantSlug) });
      } catch (error) {
        sendJson(response, 400, { ok: false, error: error.message });
      }
      return true;
    }
  }

  if (url.pathname === "/api/central") {
    if (getSessionUser(request)?.role !== "admin") {
      sendJson(response, 401, { ok: false, error: "Acesso restrito." });
      return true;
    }
    if (request.method === "GET") {
      sendJson(response, 200, centralState(database));
      return true;
    }
    if (request.method === "POST") {
      const body = await getBody(request);
      try {
        applyAction(database, body.action, body.payload, body.payload?.tenantSlug || "principal");
        await writeDatabase(database);
        sendJson(response, 200, { ok: true, ...centralState(database) });
      } catch (error) {
        sendJson(response, 400, { ok: false, error: error.message });
      }
      return true;
    }
  }

  if (request.method === "POST" && !hasValidSession(request)) {
    sendJson(response, 401, { ok: false, error: "Acesso restrito. Faça login novamente." });
    return true;
  }

  /*
   * SERVIÇOS
   */

  if (url.pathname === "/api/services") {
    const services = getCollection(database, "services");

    if (request.method === "GET") {
      sendJson(response, 200, publicState(database, url.searchParams.get("tenant") || "principal").services);
      return true;
    }

    if (request.method === "POST") {
      const body = await getBody(request);

      const service = {
        id: body.id || crypto.randomUUID(),
        ...body
      };

      services.push(service);
      await writeDatabase(database);

      sendJson(response, 201, service);
      return true;
    }
  }

  /*
   * BARBEIROS
   */

  if (url.pathname === "/api/barbers") {
    const barbers = getCollection(database, "barbers");

    if (request.method === "GET") {
      sendJson(response, 200, barbers);
      return true;
    }

    if (request.method === "POST") {
      const body = await getBody(request);

      const barber = {
        id: body.id || crypto.randomUUID(),
        ...body
      };

      barbers.push(barber);
      await writeDatabase(database);

      sendJson(response, 201, barber);
      return true;
    }
  }

  /*
   * ESTADO COMPLETO
   */

  if (url.pathname === "/api/state") {
    if (request.method === "GET") {
      sendJson(response, 200, { state: publicState(database) });
      return true;
    }

    if (request.method === "POST") {
      const body = await getBody(request);

      await writeDatabase(body);

      sendJson(response, 200, { ok: true, state: publicState(body) });
      return true;
    }
  }

  /*
   * ROTA NÃO ENCONTRADA
   */

  sendJson(response, 404, {
    error: "API route not found",
    path: url.pathname
  });

  return true;
}

export async function handleRequest(request, response) {
  try {
    const url = new URL(
      request.url,
      `http://${host}:${port}`
    );

    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url);
      return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405);
      response.end("Method Not Allowed");
      return;
    }

    const route =
      url.pathname === "/"
        ? "index.html"
        : decodeURIComponent(url.pathname).replace(/^\/+/, "");

    const filePath = path.normalize(
      path.join(root, route)
    );

    if (!filePath.startsWith(root)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    fs.readFile(filePath, (error, data) => {
      if (error) {
        response.writeHead(404);
        response.end("Not found");
        return;
      }

      response.writeHead(200, {
        "Content-Type":
          types[path.extname(filePath)] ||
          "application/octet-stream"
      });

      response.end(data);
    });

  } catch (error) {
    console.error(error);

    if (!response.headersSent) {
      const missingDatabase = error.message.includes("DATABASE_URL");
      sendJson(response, missingDatabase ? 503 : 500, {
        error: "Internal server error",
        message: error.message
      });
    }
  }
}

if (!process.env.VERCEL) ensureDatabase();
await initializeDatabase();

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const server = http.createServer(handleRequest);

  server.listen(port, host, () => {
    console.log(
      `Agenda Barbearia aberta em http://${host}:${port}`
    );
  });
}