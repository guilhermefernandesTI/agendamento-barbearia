import http from "http";
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

function publicState(data) {
  const state = { ...data };
  state.barbers = getCollection(data, "barbers").map(({ password, ...barber }) => barber);
  state.appointments = getCollection(data, "appointments").filter((item) => !item.action);
  return state;
}

function applyAction(database, action, payload = {}) {
  const collection = (name) => getCollection(database, name);

  if (action === "createAppointment") {
    collection("appointments").push({ id: payload.id || crypto.randomUUID(), ...payload });
    return;
  }

  if (action === "updateAppointment") {
    const appointment = collection("appointments").find((item) => item.id === payload.id);
    if (!appointment) throw new Error("Agendamento não encontrado.");
    appointment.status = payload.status;
    return;
  }

  if (action === "addService") {
    collection("services").push({ id: payload.id || crypto.randomUUID(), ...payload });
    return;
  }

  if (action === "removeService") {
    if (collection("services").length <= 1) throw new Error("Mantenha pelo menos um serviço cadastrado.");
    database.services = collection("services").filter((item) => item.id !== payload.id);
    return;
  }

  if (action === "addBarber") {
    const username = String(payload.username || payload.name || "").trim();
    if (!String(payload.name || "").trim() || !username) throw new Error("Informe nome e usuário do barbeiro.");
    if (collection("barbers").some((item) => String(item.username || "").toLowerCase() === username.toLowerCase())) {
      throw new Error("Já existe um barbeiro com esse nome de usuário.");
    }
    collection("barbers").push({ id: payload.id || crypto.randomUUID(), ...payload, username });
    return;
  }

  if (action === "removeBarber") {
    if (collection("barbers").length <= 1) throw new Error("Mantenha pelo menos um barbeiro cadastrado.");
    database.barbers = collection("barbers").filter((item) => item.id !== payload.id);
    return;
  }

  if (action === "addBlock") {
    collection("blocks").push({ id: payload.id || crypto.randomUUID(), ...payload });
    return;
  }

  if (action === "addProduct") {
    collection("products").push({ id: payload.id || crypto.randomUUID(), ...payload });
    return;
  }

  if (action === "removeProduct") {
    database.products = collection("products").filter((item) => item.id !== payload.id);
    return;
  }

  if (action === "addSale") {
    if (!collection("sales").some((item) => item.id === payload.id)) collection("sales").push({ id: payload.id || crypto.randomUUID(), ...payload });
    return;
  }

  if (action === "updateSale") {
    const sale = collection("sales").find((item) => item.id === payload.id);
    if (!sale) throw new Error("Lançamento não encontrado.");
    Object.assign(sale, payload);
    return;
  }

  if (action === "removeSale") {
    database.sales = collection("sales").filter((item) => item.id !== payload.id);
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

    if (request.method === "GET") {
      sendJson(response, 200, appointments);
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
            barber: { id: "admin", name: "Administrador", username: "admin", role: "admin" }
          });
          return true;
        }

        const barber = getCollection(database, "barbers").find((item) => {
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
          }
        });
        return true;
      }

      try {
        applyAction(database, body.action, body.payload);
        await writeDatabase(database);
        sendJson(response, 200, { ok: true, state: publicState(database) });
      } catch (error) {
        sendJson(response, 400, { ok: false, error: error.message });
      }
      return true;
    }
  }

  /*
   * SERVIÇOS
   */

  if (url.pathname === "/api/services") {
    const services = getCollection(database, "services");

    if (request.method === "GET") {
      sendJson(response, 200, services);
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
      sendJson(response, 500, {
        error: "Internal server error",
        message: error.message
      });
    }
  }
}

ensureDatabase();
await initializeDatabase();

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const server = http.createServer(handleRequest);

  server.listen(port, host, () => {
    console.log(
      `Agenda Barbearia aberta em http://${host}:${port}`
    );
  });
}