const ADMIN_PASSWORD = "1234";
const SPREADSHEET_ID = "1AqTNtbmYp8HY4Lw3eYT7DasWgJeCWtmBypt8fGBpt8E";

const SHEETS = {
  services: "Servicos",
  barbers: "Barbeiros",
  appointments: "Agendamentos",
  blocks: "Bloqueios",
};

const HEADERS = {
  services: ["id", "name", "price", "duration"],
  barbers: ["id", "name"],
  appointments: ["id", "name", "phone", "serviceId", "barberId", "date", "time", "notes", "status", "createdAt"],
  blocks: ["id", "date", "barberId", "time"],
};

function doGet(e) {
  const callback = e.parameter.callback || "callback";

  try {
    setupSheets();
    const action = e.parameter.action || "publicState";
    const payload = e.parameter.payload ? JSON.parse(e.parameter.payload) : {};
    const isAdmin = e.parameter.password === ADMIN_PASSWORD;
    const result = handleAction(action, payload, isAdmin);

    return jsonp(callback, { ok: true, ...result });
  } catch (error) {
    return jsonp(callback, { ok: false, error: error.message });
  }
}

function handleAction(action, payload, isAdmin) {
  if (action === "publicState") return { state: publicState() };
  if (action === "adminState") {
    requireAdmin(isAdmin);
    return { state: adminState() };
  }

  if (action === "createAppointment") {
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      createAppointment(payload);
      return { state: publicState() };
    } finally {
      lock.releaseLock();
    }
  }

  requireAdmin(isAdmin);

  if (action === "updateAppointment") updateAppointment(payload.id, payload.status);
  if (action === "addService") appendRow("services", payload);
  if (action === "addBarber") appendRow("barbers", payload);
  if (action === "addBlock") appendRow("blocks", payload);
  if (action === "removeService") removeById("services", payload.id);
  if (action === "removeBarber") removeById("barbers", payload.id);

  return { state: adminState() };
}

function requireAdmin(isAdmin) {
  if (!isAdmin) throw new Error("Senha administrativa invalida.");
}

function setupSheets() {
  Object.keys(SHEETS).forEach((key) => {
    const sheet = getOrCreateSheet(SHEETS[key]);
    const headers = HEADERS[key];

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
    }

    const currentHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    if (currentHeaders.join("|") !== headers.join("|")) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
  });

  seedDefaults();
}

function seedDefaults() {
  if (readRows("services").length === 0) {
    appendRow("services", { id: makeId(), name: "Corte masculino", price: 45, duration: 40 });
    appendRow("services", { id: makeId(), name: "Barba", price: 30, duration: 30 });
    appendRow("services", { id: makeId(), name: "Corte + barba", price: 70, duration: 60 });
  }

  if (readRows("barbers").length === 0) {
    appendRow("barbers", { id: makeId(), name: "Rafael" });
    appendRow("barbers", { id: makeId(), name: "Lucas" });
  }
}

function publicState() {
  return {
    services: readRows("services"),
    barbers: readRows("barbers"),
    appointments: readRows("appointments")
      .filter((item) => item.status !== "cancelado")
      .map((item) => ({
        id: item.id,
        serviceId: item.serviceId,
        barberId: item.barberId,
        date: item.date,
        time: item.time,
        status: item.status,
      })),
    blocks: readRows("blocks"),
  };
}

function adminState() {
  return {
    services: readRows("services"),
    barbers: readRows("barbers"),
    appointments: readRows("appointments"),
    blocks: readRows("blocks"),
  };
}

function createAppointment(payload) {
  if (!payload.name || !payload.phone || !payload.serviceId || !payload.barberId || !payload.date || !payload.time) {
    throw new Error("Dados incompletos para agendamento.");
  }

  const hasAppointment = readRows("appointments").some(
    (item) =>
      item.date === payload.date &&
      item.barberId === payload.barberId &&
      item.time === payload.time &&
      item.status !== "cancelado",
  );

  const hasBlock = readRows("blocks").some(
    (item) => item.date === payload.date && item.barberId === payload.barberId && item.time === payload.time,
  );

  if (hasAppointment || hasBlock) {
    throw new Error("Esse horario acabou de ser ocupado. Escolha outro.");
  }

  appendRow("appointments", {
    id: payload.id || makeId(),
    name: payload.name,
    phone: payload.phone,
    serviceId: payload.serviceId,
    barberId: payload.barberId,
    date: payload.date,
    time: payload.time,
    notes: payload.notes || "",
    status: "marcado",
    createdAt: payload.createdAt || new Date().toISOString(),
  });
}

function updateAppointment(id, status) {
  const sheet = getOrCreateSheet(SHEETS.appointments);
  const rows = readRows("appointments");
  const index = rows.findIndex((item) => item.id === id);
  if (index < 0) throw new Error("Agendamento nao encontrado.");

  const statusColumn = HEADERS.appointments.indexOf("status") + 1;
  sheet.getRange(index + 2, statusColumn).setValue(status);
}

function appendRow(key, value) {
  const sheet = getOrCreateSheet(SHEETS[key]);
  const row = HEADERS[key].map((header) => value[header] ?? "");
  sheet.appendRow(row);
}

function removeById(key, id) {
  const sheet = getOrCreateSheet(SHEETS[key]);
  const rows = readRows(key);
  const index = rows.findIndex((item) => item.id === id);
  if (index >= 0) sheet.deleteRow(index + 2);
}

function readRows(key) {
  const sheet = getOrCreateSheet(SHEETS[key]);
  const lastRow = sheet.getLastRow();
  const headers = HEADERS[key];
  if (lastRow < 2) return [];

  return sheet
    .getRange(2, 1, lastRow - 1, headers.length)
    .getValues()
    .filter((row) => row.some((cell) => cell !== ""))
    .map((row) => {
      const item = {};
      headers.forEach((header, index) => {
        item[header] = row[index];
      });
      return item;
    });
}

function getOrCreateSheet(name) {
  const spreadsheet = SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  return spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
}

function makeId() {
  return Utilities.getUuid();
}

function jsonp(callback, data) {
  const safeCallback = String(callback).replace(/[^\w.$]/g, "");
  return ContentService.createTextOutput(`${safeCallback}(${JSON.stringify(data)});`).setMimeType(
    ContentService.MimeType.JAVASCRIPT,
  );
}
