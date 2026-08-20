const storageKey = "agenda-barbearia-state-v2";
const authKey = "agenda-barbearia-admin-auth";
const authRoleKey = "agenda-barbearia-auth-role";
const loggedBarberKey = "agenda-barbearia-logged-barber";
const authTokenKey = "agenda-barbearia-auth-token";

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

function apiPath(path) {
  return path;
}

function normalizeState(rawState) {
  const base = cloneDefaultState();
  const source = rawState && typeof rawState === "object" ? rawState : {};
  const merged = { ...base, ...source };

  merged.services = (Array.isArray(source.services) ? source.services : base.services).map((service) => ({
    id: service.id || crypto.randomUUID(),
    name: service.name || "",
    price: Number(service.price || 0),
    duration: Number(service.duration || 60),
    barberId: service.barberId || null,
  }));

  merged.barbers = (Array.isArray(source.barbers) ? source.barbers : base.barbers).map((barber) => ({
    ...barber,
    id: barber.id || crypto.randomUUID(),
    name: barber.name || "",
    username: barber.username || barber.name?.toLowerCase().replace(/\s+/g, ""),
    password: barber.password || "123",
  }));

  merged.appointments = (Array.isArray(source.appointments) ? source.appointments : base.appointments).map((appointment) => ({
    ...appointment,
    id: appointment.id || crypto.randomUUID(),
    name: appointment.name || "",
    phone: appointment.phone || "",
    serviceId: appointment.serviceId || "",
    serviceName: appointment.serviceName || "",
    servicePrice: Number(appointment.servicePrice || 0),
    serviceDuration: Number(appointment.serviceDuration || 60),
    barberId: appointment.barberId || "",
    date: appointment.date || todayIso(),
    time: appointment.time || "09:00",
    notes: appointment.notes || "",
    status: appointment.status || "marcado",
    createdAt: appointment.createdAt || new Date().toISOString(),
  }));

  merged.blocks = (Array.isArray(source.blocks) ? source.blocks : base.blocks).map((block) => ({
    id: block.id || crypto.randomUUID(),
    date: block.date || todayIso(),
    barberId: block.barberId || "",
    time: block.time || "09:00",
  }));

  merged.products = (Array.isArray(source.products) ? source.products : base.products).map((product) => ({
    id: product.id || crypto.randomUUID(),
    name: product.name || "",
    price: Number(product.price || 0),
    stock: Number(product.stock || 0),
    barberId: product.barberId || null,
  }));

  merged.sales = (Array.isArray(source.sales) ? source.sales : base.sales).map((sale) => ({
    ...sale,
    id: sale.id || crypto.randomUUID(),
    type: sale.type || "outro",
    description: sale.description || "",
    amount: Number(sale.amount || 0),
    quantity: Number(sale.quantity || 1),
    date: sale.date || todayIso(),
    itemId: sale.itemId || null,
    barberId: sale.barberId || null,
    sourceAppointmentId: sale.sourceAppointmentId || null,
    createdAt: sale.createdAt || new Date().toISOString(),
  }));

  return merged;
}

function getServiceSnapshot(serviceId, appointment = {}) {
  const service = getService(serviceId);
  return {
    name: appointment.serviceName || service?.name || "Serviço removido",
    price: Number(appointment.servicePrice ?? service?.price ?? 0),
    duration: Number(appointment.serviceDuration ?? service?.duration ?? 60),
  };
}

function getCurrentRole() {
  return loggedBarber?.role || (isAdminAuthenticated ? "admin" : null);
}

function getCurrentBarberId() {
  return loggedBarber?.role === "barber" ? loggedBarber.id : null;
}

function isBarberRole() {
  return getCurrentRole() === "barber";
}

function isAdminRole() {
  return getCurrentRole() === "admin";
}

function canSeeBarberViews() {
  return isBarberRole();
}

const els = {
  tabs: document.querySelectorAll(".tab"),
  views: document.querySelectorAll(".view"),
  adminOnly: document.querySelectorAll(".admin-only"),
  bookingTab: document.querySelector("#bookingTab"),
  loginTab: document.querySelector("#loginTab"),
  logoutButton: document.querySelector("#logoutButton"),
  userBadge: document.querySelector("#userBadge"),
  loggedBarberName: document.querySelector("#loggedBarberName"),
  loginForm: document.querySelector("#loginForm"),
  loginUsername: document.querySelector("#loginUsername"),
  adminPassword: document.querySelector("#adminPassword"),
  installButton: document.querySelector("#installButton"),
  openStatus: document.querySelector("#openStatus"),
  sundayNotice: document.querySelector("#sundayNotice"),
  bookingForm: document.querySelector("#bookingForm"),
  clientName: document.querySelector("#clientName"),
  clientPhone: document.querySelector("#clientPhone"),
  serviceSelect: document.querySelector("#serviceSelect"),
  barberSelect: document.querySelector("#barberSelect"),
  dateInput: document.querySelector("#dateInput"),
  openDatePicker: document.querySelector("#openDatePicker"),
  nativeDatePicker: document.querySelector("#nativeDatePicker"),
  notesInput: document.querySelector("#notesInput"),
  timeGrid: document.querySelector("#timeGrid"),
  timeInput: document.querySelector("#timeInput"),
  scheduleDate: document.querySelector("#scheduleDate"),
  scheduleBarberFilter: document.querySelector("#scheduleBarberFilter"),
  appointmentsList: document.querySelector("#appointmentsList"),
  serviceForm: document.querySelector("#serviceForm"),
  newServiceName: document.querySelector("#newServiceName"),
  newServicePrice: document.querySelector("#newServicePrice"),
  newServiceDuration: document.querySelector("#newServiceDuration"),
  servicesList: document.querySelector("#servicesList"),
  barberForm: document.querySelector("#barberForm"),
  newBarberName: document.querySelector("#newBarberName"),
  newBarberUsername: document.querySelector("#newBarberUsername"),
  newBarberPassword: document.querySelector("#newBarberPassword"),
  barbersList: document.querySelector("#barbersList"),
  blockForm: document.querySelector("#blockForm"),
  blockDate: document.querySelector("#blockDate"),
  blockBarber: document.querySelector("#blockBarber"),
  blockTime: document.querySelector("#blockTime"),
  toast: document.querySelector("#toast"),

  // Reports
  reportMonth: document.querySelector("#reportMonth"),
  reportBarberFilter: document.querySelector("#reportBarberFilter"),
  reportHaircutsCount: document.querySelector("#reportHaircutsCount"),
  reportCortesSub: document.querySelector("#reportCortesSub"),
  reportTotalAppointments: document.querySelector("#reportTotalAppointments"),
  reportCompletedSub: document.querySelector("#reportCompletedSub"),
  reportAppointmentRevenue: document.querySelector("#reportAppointmentRevenue"),
  reportTotalRevenue: document.querySelector("#reportTotalRevenue"),
  reportServiceBreakdown: document.querySelector("#reportServiceBreakdown"),
  reportAppointmentsList: document.querySelector("#reportAppointmentsList"),

  // Financial
  finProductRevenue: document.querySelector("#finProductRevenue"),
  finProductCount: document.querySelector("#finProductCount"),
  finServiceRevenue: document.querySelector("#finServiceRevenue"),
  finTotalRevenue: document.querySelector("#finTotalRevenue"),
  productForm: document.querySelector("#productForm"),
  newProductName: document.querySelector("#newProductName"),
  newProductPrice: document.querySelector("#newProductPrice"),
  newProductStock: document.querySelector("#newProductStock"),
  productsList: document.querySelector("#productsList"),
  saleForm: document.querySelector("#saleForm"),
  saleType: document.querySelector("#saleType"),
  saleProductSelectLabel: document.querySelector("#saleProductSelectLabel"),
  saleProductSelect: document.querySelector("#saleProductSelect"),
  saleServiceSelectLabel: document.querySelector("#saleServiceSelectLabel"),
  saleServiceSelect: document.querySelector("#saleServiceSelect"),
  saleDescription: document.querySelector("#saleDescription"),
  saleQuantity: document.querySelector("#saleQuantity"),
  saleAmount: document.querySelector("#saleAmount"),
  saleDate: document.querySelector("#saleDate"),
  salesList: document.querySelector("#salesList"),
};

let deferredInstallPrompt;
let state = loadState();
let isAdminAuthenticated = sessionStorage.getItem(authKey) === "true";
let authRole = sessionStorage.getItem(authRoleKey) || null;
let loggedBarber = JSON.parse(sessionStorage.getItem(loggedBarberKey) || "null");

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return cloneDefaultState();

  try {
    return normalizeState(JSON.parse(saved));
  } catch {
    return cloneDefaultState();
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function todayIso() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now - offset).toISOString().slice(0, 10);
}

function formatDate(dateValue) {
  const value = String(dateValue || "");
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function parseDateInput(input) {
  const value = String(input?.value || "").trim();
  const displayMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (displayMatch) return `${displayMatch[3]}-${displayMatch[2]}-${displayMatch[1]}`;
  return value;
}

function setDateInput(input, isoDate) {
  if (input) input.value = formatDate(isoDate);
}

function maskDateInput(event) {
  const input = event.currentTarget;
  const digits = input.value.replace(/\D/g, "").slice(0, 8);
  const parts = [];
  if (digits.length > 0) parts.push(digits.slice(0, 2));
  if (digits.length > 2) parts.push(digits.slice(2, 4));
  if (digits.length > 4) parts.push(digits.slice(4, 8));
  input.value = parts.join("/");
}

function currentMonthIso() {
  return todayIso().slice(0, 7);
}

function isSunday(dateStr) {
  if (!dateStr || !dateStr.includes("-")) return false;
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.getDay() === 0;
}

function isPastTime(dateStr, timeSlot) {
  const today = todayIso();
  if (dateStr < today) return true;
  if (dateStr > today) return false;

  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();

  const [slotHour, slotMin] = timeSlot.split(":").map(Number);

  if (slotHour < currentHour) return true;
  if (slotHour === currentHour && slotMin <= currentMin) return true;
  return false;
}

function makeTimes() {
  const slots = [];
  for (let hour = 9; hour <= 18; hour += 1) {
    slots.push(`${String(hour).padStart(2, "0")}:00`);
  }
  return slots;
}

const allTimes = makeTimes();

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return map[char];
  });
}

function money(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function makeApiError(message, status, fallbackEligible = false) {
  const error = new Error(message);
  error.status = status;
  error.fallbackEligible = fallbackEligible;
  return error;
}

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    throw makeApiError("A API local não está disponível neste modo.", response.status, response.status === 404);
  }
}

async function sendRemoteAction(action, payload) {
  let response;
  try {
    response = await fetch(apiPath("/api/agenda"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(sessionStorage.getItem(authTokenKey) ? { Authorization: `Bearer ${sessionStorage.getItem(authTokenKey)}` } : {}),
      },
      body: JSON.stringify({ action, payload }),
    });
  } catch {
    throw makeApiError("A API local não está disponível neste modo.", 0, true);
  }

  const data = await readJsonResponse(response);

  if (!response.ok || !data.ok) {
    throw makeApiError(data?.error || "Não foi possível salvar as alterações.", response.status, response.status === 404);
  }

  return data;
}

function localLogin(username, password) {
  const inputUser = String(username || "").trim().toLowerCase();
  const inputPass = String(password || "").trim();

  if ((inputUser === "admin" || inputUser === "administrador") && inputPass === "920025") {
    return { id: "admin", name: "Administrador", username: "admin", role: "admin" };
  }

  const barber = state.barbers.find((item) => {
    const barberUser = String(item.username || item.name || "").trim().toLowerCase();
    const barberName = String(item.name || "").trim().toLowerCase();
    const barberPass = String(item.password || "123").trim();
    return (barberUser === inputUser || barberName === inputUser) && barberPass === inputPass;
  });

  if (!barber) {
    throw new Error("Nome de usuário ou senha incorretos.");
  }

  return {
    id: barber.id,
    name: barber.name,
    username: barber.username || barber.name.toLowerCase().replace(/\s+/g, ""),
    role: "barber",
  };
}

function localCreateAppointment(payload) {
  if (!payload.name || !payload.phone || !payload.serviceId || !payload.barberId || !payload.date || !payload.time) {
    throw new Error("Dados incompletos para agendamento.");
  }

  const service = getService(payload.serviceId);
  if (!service) {
    throw new Error("Serviço não encontrado.");
  }

  if (service.barberId && service.barberId !== payload.barberId) {
    throw new Error("Serviço indisponível para este barbeiro.");
  }

  if (!getBarber(payload.barberId)) {
    throw new Error("Barbeiro não encontrado.");
  }

  if (isSunday(payload.date)) {
    throw new Error("A barbearia está fechada aos domingos.");
  }

  if (isPastTime(payload.date, payload.time)) {
    throw new Error("Não é possível agendar em horários passados.");
  }

  const hasAppointment = state.appointments.some(
    (item) =>
      item.date === payload.date &&
      item.barberId === payload.barberId &&
      item.time === payload.time &&
      item.status !== "cancelado",
  );

  const hasBlock = state.blocks.some((item) => item.date === payload.date && item.barberId === payload.barberId && item.time === payload.time);

  if (hasAppointment || hasBlock) {
    throw new Error("Esse horário acabou de ser ocupado. Escolha outro.");
  }

  state.appointments.push({
    id: payload.id || crypto.randomUUID(),
    name: payload.name,
    phone: payload.phone,
    serviceId: payload.serviceId,
    serviceName: service?.name || "",
    servicePrice: Number(service?.price || 0),
    serviceDuration: Number(service?.duration || 60),
    barberId: payload.barberId,
    date: payload.date,
    time: payload.time,
    notes: payload.notes || "",
    status: payload.status || "marcado",
    createdAt: payload.createdAt || new Date().toISOString(),
  });
}

function createServiceSaleFromAppointment(appointment) {
  const existing = state.sales.find((sale) => sale.sourceAppointmentId === appointment.id);
  if (existing) return;

  state.sales.push({
    id: crypto.randomUUID(),
    type: "servico",
    description: `Serviço automático: ${appointment.serviceName || "Atendimento concluído"}`,
    amount: Number(appointment.servicePrice || 0),
    quantity: 1,
    date: appointment.date,
    itemId: appointment.serviceId || null,
    barberId: appointment.barberId || null,
    sourceAppointmentId: appointment.id,
    createdAt: new Date().toISOString(),
  });
}

function removeAutoSaleForAppointment(appointmentId) {
  state.sales = state.sales.filter((sale) => sale.sourceAppointmentId !== appointmentId);
}

function localApplyAction(action, payload) {
  switch (action) {
    case "createAppointment":
      localCreateAppointment(payload);
      return;
    case "updateAppointment": {
      const appointment = state.appointments.find((item) => item.id === payload.id);
      if (!appointment) throw new Error("Agendamento não encontrado.");
      const previousStatus = appointment.status;
      appointment.status = payload.status;
      if (payload.status === "concluido" && previousStatus !== "concluido") {
        createServiceSaleFromAppointment(appointment);
      }
      if (payload.status === "cancelado") {
        removeAutoSaleForAppointment(appointment.id);
      }
      return;
    }
    case "addService":
      state.services.push({
        id: payload.id || crypto.randomUUID(),
        name: payload.name,
        price: Number(payload.price),
        duration: Number(payload.duration || 60),
        barberId: payload.barberId || getCurrentBarberId(),
      });
      return;
    case "removeService":
      if (state.services.length <= 1) throw new Error("Mantenha pelo menos um serviço cadastrado.");
      state.services = state.services.filter((item) => item.id !== payload.id);
      return;
    case "addBarber": {
      const name = String(payload.name || "").trim();
      const username = String(payload.username || name.toLowerCase().replace(/\s+/g, "")).trim();
      const password = String(payload.password || "123").trim();

      if (!name) throw new Error("Informe o nome do barbeiro.");
      if (!username) throw new Error("Informe o nome de usuário.");
      if (state.barbers.some((item) => String(item.username || "").toLowerCase() === username.toLowerCase())) {
        throw new Error("Já existe um barbeiro com esse nome de usuário.");
      }

      state.barbers.push({
        id: payload.id || crypto.randomUUID(),
        name,
        username,
        password,
      });
      return;
    }
    case "removeBarber":
      if (state.barbers.length <= 1) throw new Error("Mantenha pelo menos um barbeiro cadastrado.");
      state.barbers = state.barbers.filter((item) => item.id !== payload.id);
      return;
    case "addBlock":
      if (isSunday(payload.date)) {
        throw new Error("A barbearia já fica fechada aos domingos.");
      }
      state.blocks.push({
        id: payload.id || crypto.randomUUID(),
        date: payload.date,
        barberId: payload.barberId,
        time: payload.time,
      });
      return;
    case "addProduct":
      state.products.push({
        id: payload.id || crypto.randomUUID(),
        name: payload.name,
        price: Number(payload.price),
        stock: Number(payload.stock || 0),
        barberId: payload.barberId || getCurrentBarberId(),
      });
      return;
    case "removeProduct":
      state.products = state.products.filter((item) => item.id !== payload.id);
      return;
    case "addSale": {
      const existingSale = state.sales.find((sale) => sale.id === payload.id);
      if (existingSale) {
        return;
      }
      state.sales.push({
        id: payload.id || crypto.randomUUID(),
        type: payload.type,
        description: payload.description,
        amount: Number(payload.amount),
        quantity: Number(payload.quantity || 1),
        date: payload.date,
        itemId: payload.itemId || null,
        barberId: payload.barberId || getCurrentBarberId(),
        sourceAppointmentId: payload.sourceAppointmentId || null,
        createdAt: payload.createdAt || new Date().toISOString(),
      });

      if (payload.type === "produto" && payload.itemId) {
        const product = state.products.find((item) => item.id === payload.itemId);
        if (product) {
          product.stock = Math.max(0, Number(product.stock || 0) - Number(payload.quantity || 1));
        }
      }
      return;
    }
    case "updateSale": {
      const sale = state.sales.find((item) => item.id === payload.id);
      if (!sale) throw new Error("Lançamento não encontrado.");

      const previousQuantity = Number(sale.quantity || 1);
      const nextQuantity = Number(payload.quantity ?? sale.quantity ?? 1);
      const nextAmount = Number(payload.amount ?? sale.amount ?? 0);

      if (sale.type === "produto" && sale.itemId) {
        const product = state.products.find((item) => item.id === sale.itemId);
        if (product) {
          const delta = nextQuantity - previousQuantity;
          const newStock = Number(product.stock || 0) - delta;
          if (newStock < 0) throw new Error("Estoque insuficiente para essa edição.");
          product.stock = newStock;
        }
      }

      sale.description = payload.description ?? sale.description;
      sale.amount = nextAmount;
      sale.quantity = nextQuantity;
      sale.date = payload.date ?? sale.date;
      return;
    }
    case "removeSale":
      const sale = state.sales.find((item) => item.id === payload.id);
      if (sale && sale.type === "produto" && sale.itemId) {
        const product = state.products.find((item) => item.id === sale.itemId);
        if (product) {
          product.stock = Number(product.stock || 0) + Number(sale.quantity || 1);
        }
      }
      state.sales = state.sales.filter((item) => item.id !== payload.id);
      return;
    default:
      throw new Error("Ação não suportada.");
  }
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.setTimeout(() => els.toast.classList.remove("show"), 2800);
}

function isViewAllowed(view) {
  if (view.classList.contains("admin-only")) return isAdminRole();
  if (view.classList.contains("barber-only")) return canSeeBarberViews();
  return true;
}

async function syncState() {
  try {
    const res = await fetch(apiPath("/api/agenda"));
    if (!res.ok) return;
    const data = await res.json();
    if (data?.state) {
      state = normalizeState(data.state);
      saveState();
      renderAll();
    }
  } catch (err) {
    console.warn("Erro ao sincronizar com banco de dados:", err);
  }
}

async function persistChange(action, payload) {
  try {
    const result = await sendRemoteAction(action, payload);
    state = normalizeState(result.state);
    saveState();
    renderAll();
    return result;
  } catch (error) {
    if (error?.fallbackEligible) {
      localApplyAction(action, payload);
      saveState();
      renderAll();
      return { ok: true, state };
    }
    showToast(error?.message || "Não foi possível salvar as alterações.");
    throw error;
  }
}

function showView(viewName) {
  const targetId = `${viewName}View`;

  els.tabs.forEach((item) => {
    item.classList.toggle("active", item.dataset.view === viewName);
  });

  els.views.forEach((view) => {
    const isTarget = view.id === targetId;
    view.classList.toggle("active", isTarget);
    view.hidden = !isViewAllowed(view);
  });

}

function renderAccess() {
  const role = getCurrentRole();
  const isAuthenticated = Boolean(role);
  const isAdmin = isAdminRole();

  document.body.classList.toggle("admin-auth", isAuthenticated);

  document.querySelectorAll(".auth-only").forEach((item) => {
    item.hidden = !isAuthenticated;
  });

  // Painel do admin visível apenas se for administrador principal
  document.querySelectorAll(".admin-only").forEach((item) => {
    item.hidden = !isAdmin;
  });

  // Visibilidade para abas e blocos exclusivos de barbeiros comuns
  document.querySelectorAll(".barber-only").forEach((item) => {
    item.hidden = !isAuthenticated || isAdmin;
  });

  els.loginTab.hidden = isAuthenticated;

  if (isAuthenticated && loggedBarber) {
    if (els.userBadge) els.userBadge.hidden = false;
    if (els.loggedBarberName) els.loggedBarberName.textContent = loggedBarber.name;
  } else {
    if (els.userBadge) els.userBadge.hidden = true;
  }

  if (isAdmin && !document.querySelector("#adminView")?.classList.contains("active")) {
    showView("admin");
  }

  const activeVisibleView = document.querySelector(".view.active:not([hidden])");
  if (!activeVisibleView) {
    showView(role === "admin" ? "admin" : role === "barber" ? "schedule" : "booking");
  }
}

function renderOptions() {
  const selectedBarberId = els.barberSelect.value || state.barbers[0]?.id || "";
  const selectedServiceId = els.serviceSelect.value || "";
  const currentBarberId = getCurrentBarberId();
  const bookingServices = selectedBarberId ? getServicesForBarber(selectedBarberId) : [];
  const serviceOptions = bookingServices.length
    ? bookingServices
        .map((service) => `<option value="${escapeHtml(service.id)}">${escapeHtml(service.name)} - ${money(service.price)}</option>`)
        .join("")
    : `<option value="" disabled selected>Nenhum serviço cadastrado</option>`;

  els.serviceSelect.innerHTML = serviceOptions;
  els.serviceSelect.disabled = bookingServices.length === 0;

  const barberOptions = state.barbers.length
    ? state.barbers.map((barber) => `<option value="${escapeHtml(barber.id)}">${escapeHtml(barber.name)}</option>`).join("")
    : `<option value="" disabled selected>Nenhum barbeiro cadastrado</option>`;

  els.barberSelect.innerHTML = barberOptions;
  els.barberSelect.disabled = state.barbers.length === 0;
  els.blockBarber.innerHTML = currentBarberId && loggedBarber
    ? `<option value="${escapeHtml(currentBarberId)}" selected>${escapeHtml(loggedBarber.name)}</option>`
    : `<option value="" disabled selected>Entre como barbeiro</option>`;
  els.blockBarber.disabled = true;

  if (selectedBarberId && state.barbers.some((barber) => barber.id === selectedBarberId)) {
    els.barberSelect.value = selectedBarberId;
  }

  if (bookingServices.length) {
    const preserved = bookingServices.find((service) => service.id === selectedServiceId);
    els.serviceSelect.value = preserved ? preserved.id : bookingServices[0].id;
  }

  updateBarberFilterOptions();
}

function updateBarberFilterOptions() {
  const barberName = loggedBarber ? loggedBarber.name : "Barbeiro";
  const currentBarberId = getCurrentBarberId();
  const barberOnlyFilterHtml = currentBarberId
    ? `<option value="${escapeHtml(currentBarberId)}">👤 ${escapeHtml(barberName)}</option>`
    : `<option value="mine">👤 Minha Agenda</option>`;

  if (els.scheduleBarberFilter) {
    els.scheduleBarberFilter.innerHTML = barberOnlyFilterHtml;
    els.scheduleBarberFilter.value = currentBarberId || "mine";
    els.scheduleBarberFilter.disabled = true;
  }

  if (els.reportBarberFilter) {
    els.reportBarberFilter.innerHTML = barberOnlyFilterHtml;
    els.reportBarberFilter.value = currentBarberId || "mine";
    els.reportBarberFilter.disabled = true;
  }
}

function isUnavailable(date, barberId, time) {
  return (
    state.appointments.some(
      (item) =>
        item.date === date &&
        item.barberId === barberId &&
        item.time === time &&
        item.status !== "cancelado",
    ) ||
    state.blocks.some((item) => item.date === date && item.barberId === barberId && item.time === time)
  );
}

function renderTimes() {
  const date = parseDateInput(els.dateInput);
  const barberId = els.barberSelect.value;
  els.timeInput.value = "";

  const sunday = isSunday(date);
  if (els.sundayNotice) {
    els.sundayNotice.hidden = !sunday;
  }

  if (sunday) {
    els.timeGrid.innerHTML = `<div class="empty-state">A barbearia está fechada aos domingos. Escolha outra data.</div>`;
    return;
  }

  els.timeGrid.innerHTML = allTimes
    .map((time) => {
      const unavailable = isUnavailable(date, barberId, time);
      const past = isPastTime(date, time);
      const disabled = unavailable || past ? "disabled" : "";
      let label = time;
      if (past && !unavailable) label = `${time} (Passado)`;
      return `<button class="time-button" type="button" data-time="${time}" ${disabled}>${label}</button>`;
    })
    .join("");
}

function renderBlockTimes() {
  els.blockTime.innerHTML = allTimes.map((time) => `<option value="${time}">${time}</option>`).join("");
}

function getService(id) {
  return state.services.find((service) => service.id === id);
}

function getBarber(id) {
  return state.barbers.find((barber) => barber.id === id);
}

function getServicesForBarber(barberId) {
  return state.services.filter((service) => service.barberId === barberId);
}

function getProductsForBarber(barberId) {
  return state.products.filter((product) => !product.barberId || product.barberId === barberId);
}

function getSalesForBarber(barberId) {
  return state.sales.filter((sale) => sale.barberId === barberId);
}

function getCurrentBarberServices() {
  const barberId = getCurrentBarberId();
  return barberId ? getServicesForBarber(barberId) : [];
}

function getCurrentBarberProducts() {
  const barberId = getCurrentBarberId();
  return barberId ? getProductsForBarber(barberId) : [];
}

function getCurrentBarberSales() {
  const barberId = getCurrentBarberId();
  return barberId ? getSalesForBarber(barberId) : [];
}

function renderSchedule() {
  const date = parseDateInput(els.scheduleDate);
  const targetBarberId = getCurrentBarberId();

  const items = state.appointments
    .filter((item) => {
      if (item.date !== date || item.status === "cancelado") return false;
      if (targetBarberId && item.barberId !== targetBarberId) return false;
      return true;
    })
    .sort((a, b) => a.time.localeCompare(b.time));

  if (!items.length) {
    els.appointmentsList.innerHTML = `<div class="empty-state">Nenhum agendamento para esta data.</div>`;
    return;
  }

  els.appointmentsList.innerHTML = items
    .map((item) => {
      const service = getServiceSnapshot(item.serviceId, item);
      const barber = getBarber(item.barberId);
      const phone = String(item.phone || "").replace(/\D/g, "");
      const message = encodeURIComponent(
        `Olá ${item.name}, confirmando seu horário ${formatDate(item.date)} às ${item.time} na barbearia.`,
      );
      return `
        <article class="appointment ${item.status === "concluido" ? "done" : ""}">
          <div class="appointment-time">${escapeHtml(formatDate(item.date))} ${escapeHtml(item.time)}</div>
          <div>
            <strong>${escapeHtml(item.name)}</strong>
            <p>${escapeHtml(service.name)} com ${escapeHtml(barber?.name ?? "Barbeiro removido")}</p>
            <p>${escapeHtml(item.phone)}${item.notes ? ` - ${escapeHtml(item.notes)}` : ""}</p>
          </div>
          <div class="appointment-actions">
            <a class="ghost-button" href="https://wa.me/55${phone}?text=${message}" target="_blank" rel="noreferrer">WhatsApp</a>
            <button class="ghost-button" type="button" data-done="${escapeHtml(item.id)}">Concluir</button>
            <button class="danger-button" type="button" data-cancel="${escapeHtml(item.id)}">Cancelar</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderReports() {
  if (!els.reportMonth) return;
  const selectedMonth = els.reportMonth.value || currentMonthIso();
  const targetBarberId = getCurrentBarberId();

  const monthAppointments = state.appointments.filter((app) => {
    if (!app.date.startsWith(selectedMonth) || app.status === "cancelado") return false;
    if (targetBarberId && app.barberId !== targetBarberId) return false;
    return true;
  });

  const completedAppointments = monthAppointments.filter((app) => app.status === "concluido");
  const monthSales = getCurrentBarberSales().filter((s) => s.date.startsWith(selectedMonth));

  let totalServiceRevenue = 0;
  let productRevenue = 0;
  let otherRevenue = 0;

  const serviceStats = {};

  monthAppointments.forEach((app) => {
    const service = getServiceSnapshot(app.serviceId, app);
    const serviceName = service.name;
    const price = service.price;

    if (!serviceStats[serviceName]) {
      serviceStats[serviceName] = {
        count: 0,
        revenue: 0,
        completedCount: 0
      };
    }

    serviceStats[serviceName].count++;

    if (app.status === "concluido") {
      serviceStats[serviceName].completedCount++;
      serviceStats[serviceName].revenue += price;
      totalServiceRevenue += price;
    }
  });

  monthSales.forEach((s) => {
    if (s.type === "produto") {
      productRevenue += Number(s.amount || 0);
    } else if (!(s.type === "servico" && s.sourceAppointmentId)) {
      otherRevenue += Number(s.amount || 0);
    }
  });
  let manualServicesCount = 0;

  monthSales.forEach((s) => {
    if (s.type === "servico" && !s.sourceAppointmentId) {
      manualServicesCount++;

      const serviceName = s.description || s.name || "Serviço manual";

      if (!serviceStats[serviceName]) {
        serviceStats[serviceName] = {
          count: 0,
          revenue: 0,
          completedCount: 0
        };
      }

      serviceStats[serviceName].completedCount++;
      serviceStats[serviceName].revenue += Number(s.amount || 0);
    }

    if (s.type === "produto") {
      productRevenue += Number(s.amount || 0);
    } else if (!(s.type === "servico" && s.sourceAppointmentId)) {
      otherRevenue += Number(s.amount || 0);
    }
  });

  const totalServices = Object.values(serviceStats)
    .reduce((total, service) => total + service.completedCount, 0);

  const grandTotal = totalServiceRevenue + productRevenue + otherRevenue;

  els.reportHaircutsCount.textContent = totalServices;
  els.reportCortesSub.textContent = `${completedAppointments.length} atendimentos concluídos`;
  els.reportTotalAppointments.textContent = monthAppointments.length;
  els.reportCompletedSub.textContent = `${completedAppointments.length} concluídos`;
  els.reportAppointmentRevenue.textContent = money(totalServiceRevenue);
  els.reportTotalRevenue.textContent = money(grandTotal);

  const serviceRows = Object.entries(serviceStats)
    .filter(([, stat]) => stat.completedCount > 0)
    .map(
      ([name, stat]) => `
      <div class="table-row">
        <div class="table-row-info">
          <strong>${escapeHtml(name)}</strong>
          <small>${stat.completedCount} concluídos</small>
        </div>
        <strong>${money(stat.revenue)}</strong>
      </div>
    `
    )
    .join("");

  els.reportServiceBreakdown.innerHTML = serviceRows || `<div class="empty-state">Nenhum serviço neste mês.</div>`;

  if (!monthAppointments.length) {
    els.reportAppointmentsList.innerHTML = `<div class="empty-state">Nenhum agendamento neste mês.</div>`;
    return;
  }

  els.reportAppointmentsList.innerHTML = monthAppointments
    .sort((a, b) => b.date.localeCompare(a.date) || a.time.localeCompare(b.time))
    .map((item) => {
      const service = getServiceSnapshot(item.serviceId, item);
      const barber = getBarber(item.barberId);
      return `
        <article class="appointment ${item.status === "concluido" ? "done" : ""}">
          <div class="appointment-time">${escapeHtml(formatDate(item.date))} ${escapeHtml(item.time)}</div>
          <div>
            <strong>${escapeHtml(item.name)} (${escapeHtml(item.status)})</strong>
            <p>${escapeHtml(service.name)} - ${money(service.price)} com ${escapeHtml(barber?.name ?? "Barbeiro")}</p>
          </div>
        </article>
      `;
    })
    .join("");
}

function updateSaleFormFields() {
  if (!els.saleType) return;
  const type = els.saleType.value;

  const isProduct = type === "produto";
  const isService = type === "servico";

  els.saleProductSelectLabel.hidden = !isProduct;
  els.saleServiceSelectLabel.hidden = !isService;

  if (isProduct) {
    const selectedOption = els.saleProductSelect.options[els.saleProductSelect.selectedIndex];
    if (selectedOption) {
      els.saleDescription.value = `Venda: ${selectedOption.text.split(" - ")[0]}`;
      const price = Number(selectedOption.dataset.price || 0);
      const qty = Number(els.saleQuantity.value || 1);
      els.saleAmount.value = price * qty;
    }
  } else if (isService) {
    const selectedOption = els.saleServiceSelect.options[els.saleServiceSelect.selectedIndex];
    if (selectedOption) {
      els.saleDescription.value = `Serviço: ${selectedOption.text.split(" - ")[0]}`;
      const price = Number(selectedOption.dataset.price || 0);
      const qty = Number(els.saleQuantity.value || 1);
      els.saleAmount.value = price * qty;
    }
  } else {
    els.saleDescription.value = "Outra entrada financeira";
  }
}

function renderFinancial() {
  if (!els.finTotalRevenue) return;

  const barberId = getCurrentBarberId();
  const products = barberId ? getProductsForBarber(barberId) : [];
  const sales = barberId ? getSalesForBarber(barberId) : [];
  const services = barberId ? getServicesForBarber(barberId) : [];

  els.saleProductSelect.innerHTML = products
    .map((p) => `<option value="${escapeHtml(p.id)}" data-price="${p.price}">${escapeHtml(p.name)} - ${money(p.price)} (Estoque: ${p.stock})</option>`)
    .join("") || `<option value="" disabled selected>Nenhum produto cadastrado</option>`;
  els.saleProductSelect.disabled = products.length === 0;

  els.saleServiceSelect.innerHTML = services
    .map((s) => `<option value="${escapeHtml(s.id)}" data-price="${s.price}">${escapeHtml(s.name)} - ${money(s.price)}</option>`)
    .join("") || `<option value="" disabled selected>Nenhum serviço cadastrado</option>`;
  els.saleServiceSelect.disabled = services.length === 0;

  els.servicesList.innerHTML = services.length
    ? services
        .map(
          (service) => `
        <span class="chip">${escapeHtml(service.name)} ${money(service.price)} <button type="button" aria-label="Remover ${escapeHtml(service.name)}" data-remove-service="${escapeHtml(service.id)}">x</button></span>
      `,
        )
        .join("")
    : `<div class="empty-state">Nenhum serviço cadastrado.</div>`;

  els.productsList.innerHTML = products.length
    ? products
        .map(
          (p) => `
        <div class="table-row">
          <div class="table-row-info">
            <strong>${escapeHtml(p.name)}</strong>
            <small>Preço: ${money(p.price)} | Estoque: ${p.stock} un</small>
          </div>
          <div class="table-row-action">
            <button class="danger-button" type="button" data-remove-product="${escapeHtml(p.id)}">Remover</button>
          </div>
        </div>
      `
        )
        .join("")
    : `<div class="empty-state">Nenhum produto cadastrado.</div>`;

  let totalProductSalesRevenue = 0;
  let totalProductItemsSold = 0;
  let totalOtherRevenue = 0;

  sales.forEach((s) => {
    if (s.type === "produto") {
      totalProductSalesRevenue += Number(s.amount || 0);
      totalProductItemsSold += Number(s.quantity || 1);
    } else if (!(s.type === "servico" && s.sourceAppointmentId)) {
      totalOtherRevenue += Number(s.amount || 0);
    }
  });

  const completedServicesRevenue = state.appointments
    .filter((a) => a.status === "concluido")
    .filter((a) => !barberId || a.barberId === barberId)
    .reduce((sum, a) => {
      const service = getServiceSnapshot(a.serviceId, a);
      return sum + Number(service.price || 0);
    }, 0);

  const grandTotal = totalProductSalesRevenue + totalOtherRevenue + completedServicesRevenue;

  els.finProductRevenue.textContent = money(totalProductSalesRevenue);
  els.finProductCount.textContent = `${totalProductItemsSold} itens vendidos`;
  els.finServiceRevenue.textContent = money(completedServicesRevenue);
  els.finTotalRevenue.textContent = money(grandTotal);

  els.salesList.innerHTML = sales.length
    ? sales
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
        .map(
          (s) => `
        <div class="table-row">
          <div class="table-row-info">
            <strong>${escapeHtml(s.description)} (${s.type})</strong>
            <small>Data: ${escapeHtml(formatDate(s.date))} | Qtd: ${s.quantity}</small>
          </div>
          <div class="table-row-action">
            <strong>${money(s.amount)}</strong>
            <button class="ghost-button" type="button" data-edit-sale="${escapeHtml(s.id)}">Editar</button>
            <button class="danger-button" type="button" data-remove-sale="${escapeHtml(s.id)}">x</button>
          </div>
        </div>
      `
        )
        .join("")
    : `<div class="empty-state">Nenhuma venda ou lançamento registrado.</div>`;

  updateSaleFormFields();
}

function renderAdminLists() {
  els.barbersList.innerHTML = state.barbers.length
    ? state.barbers
        .map(
          (barber) => `
        <div class="table-row">
          <div class="table-row-info">
            <strong>${escapeHtml(barber.name)}</strong>
            <small>Usuário: <code>${escapeHtml(barber.username || barber.name.toLowerCase())}</code></small>
          </div>
          <div class="table-row-action">
            <button class="danger-button" type="button" data-remove-barber="${escapeHtml(barber.id)}">Remover</button>
          </div>
        </div>
      `
        )
        .join("")
    : `<div class="empty-state">Nenhum barbeiro cadastrado.</div>`;
}

function renderSummary() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const hour = now.getHours();

  if (dayOfWeek === 0) {
    els.openStatus.textContent = "Fechado aos domingos";
    els.openStatus.classList.add("closed");
  } else if (hour >= 9 && hour < 19) {
    els.openStatus.textContent = "Aberto hoje";
    els.openStatus.classList.remove("closed");
  } else {
    els.openStatus.textContent = "Fechado agora";
    els.openStatus.classList.add("closed");
  }
}

function renderAll() {
  renderAccess();
  renderOptions();
  renderTimes();
  renderBlockTimes();
  renderSchedule();
  renderReports();
  renderFinancial();
  renderAdminLists();
  renderSummary();
}

function setInitialDates() {
  const today = todayIso();
  const month = currentMonthIso();

  setDateInput(els.dateInput, today);
  setDateInput(els.scheduleDate, today);
  setDateInput(els.blockDate, today);

  if (els.reportMonth) els.reportMonth.value = month;
  setDateInput(els.saleDate, today);
}

els.tabs.forEach((tab) => {
  tab.addEventListener("click", async () => {
    const viewName = tab.dataset.view;
    if (!viewName) return;
    if ((viewName === "schedule" || viewName === "reports" || viewName === "financial" || viewName === "admin") && !getCurrentRole()) {
      showToast("Digite o usuário e a senha para acessar a área restrita.");
      showView("login");
      return;
    }
    showView(viewName);
    await syncState();
  });
});

els.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const username = els.loginUsername ? els.loginUsername.value.trim() : "";
  const password = els.adminPassword ? els.adminPassword.value.trim() : "";

  if (!username || !password) {
    showToast("Preencha o nome/usuário e a senha.");
    return;
  }

  try {
    let barber = null;

    try {
      const response = await fetch(apiPath("/api/agenda"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", payload: { username, password } }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw makeApiError(data?.error || "Nome de usuário ou senha incorretos.", response.status, response.status === 404);
      }
      barber = data.barber;
        sessionStorage.setItem(authTokenKey, data.token || "");
    } catch (error) {
      if (error?.fallbackEligible === false && error?.status !== 401) {
        throw error;
      }
      barber = localLogin(username, password);
    }

    isAdminAuthenticated = true;
    authRole = barber.role || (barber.id === "admin" ? "admin" : "barber");
    loggedBarber = barber;
    sessionStorage.setItem(authKey, "true");
    sessionStorage.setItem(authRoleKey, authRole);
    sessionStorage.setItem(loggedBarberKey, JSON.stringify(loggedBarber));

    if (els.loginUsername) els.loginUsername.value = "";
    if (els.adminPassword) els.adminPassword.value = "";

    showToast(`Bem-vindo, ${loggedBarber.name}!`);
    renderAll();
    showView(authRole === "admin" ? "admin" : "schedule");
    await syncState();
  } catch (err) {
    showToast(err?.message || "Erro ao realizar login. Tente novamente.");
  }
});

els.logoutButton.addEventListener("click", () => {
  isAdminAuthenticated = false;
  authRole = null;
  loggedBarber = null;
  sessionStorage.removeItem(authKey);
  sessionStorage.removeItem(authRoleKey);
  sessionStorage.removeItem(loggedBarberKey);
  sessionStorage.removeItem(authTokenKey);
  showToast("Você saiu da área restrita.");
  renderAll();
  showView("booking");
});

els.timeGrid.addEventListener("click", (event) => {
  const button = event.target.closest(".time-button");
  if (!button || button.disabled) return;

  els.timeGrid.querySelectorAll(".time-button").forEach((item) => item.classList.remove("active"));
  button.classList.add("active");
  els.timeInput.value = button.dataset.time;
});

els.bookingForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const appointmentDate = parseDateInput(els.dateInput);
  if (isSunday(appointmentDate)) {
    showToast("A barbearia está fechada aos domingos.");
    return;
  }

  if (!els.timeInput.value) {
    showToast("Escolha um horário disponível.");
    return;
  }

  if (isPastTime(appointmentDate, els.timeInput.value)) {
    showToast("Não é possível agendar em horários passados.");
    return;
  }

  const appointment = {
    id: crypto.randomUUID(),
    name: els.clientName.value.trim(),
    phone: els.clientPhone.value.trim(),
    serviceId: els.serviceSelect.value,
    serviceName: getService(els.serviceSelect.value)?.name || "",
    servicePrice: Number(getService(els.serviceSelect.value)?.price || 0),
    serviceDuration: Number(getService(els.serviceSelect.value)?.duration || 60),
    barberId: els.barberSelect.value,
    date: appointmentDate,
    time: els.timeInput.value,
    notes: els.notesInput.value.trim(),
    status: "marcado",
    createdAt: new Date().toISOString(),
  };

  try {
    await persistChange("createAppointment", appointment);
    els.bookingForm.reset();
    setDateInput(els.dateInput, todayIso());
    showToast("Agendamento confirmado.");
  } catch (error) {
    // Error handled in persistChange
  }
});

els.serviceSelect.addEventListener("change", renderTimes);
els.barberSelect.addEventListener("change", () => {
  renderOptions();
  renderTimes();
});
els.dateInput.addEventListener("change", () => {
  renderTimes();
  syncState();
});

[
  els.dateInput,
  els.scheduleDate,
  els.blockDate,
  els.saleDate,
].filter(Boolean).forEach((input) => input.addEventListener("input", maskDateInput));

els.nativeDatePicker?.addEventListener("change", () => {
  setDateInput(els.dateInput, els.nativeDatePicker.value);
  renderTimes();
});

els.openDatePicker?.addEventListener("click", () => {
  if (els.nativeDatePicker) {
    els.nativeDatePicker.min = todayIso();
    els.nativeDatePicker.value = parseDateInput(els.dateInput) || todayIso();
    if (typeof els.nativeDatePicker.showPicker === "function") els.nativeDatePicker.showPicker();
    else els.nativeDatePicker.click();
  }
});

els.scheduleDate.addEventListener("change", () => {
  renderSchedule();
  syncState();
});

if (els.scheduleBarberFilter) {
  els.scheduleBarberFilter.addEventListener("change", () => {
    renderSchedule();
  });
}

if (els.reportBarberFilter) {
  els.reportBarberFilter.addEventListener("change", () => {
    renderReports();
  });
}

if (els.reportMonth) {
  els.reportMonth.addEventListener("change", renderReports);
}

if (els.saleType) {
  els.saleType.addEventListener("change", updateSaleFormFields);
  els.saleProductSelect.addEventListener("change", updateSaleFormFields);
  els.saleServiceSelect.addEventListener("change", updateSaleFormFields);
  els.saleQuantity.addEventListener("input", updateSaleFormFields);
}

els.productForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const barberId = getCurrentBarberId();
  if (!barberId) {
    showToast("Entre com um barbeiro para cadastrar produtos.");
    return;
  }

  const name = els.newProductName.value.trim();
  const price = Number(els.newProductPrice.value);
  const stock = Number(els.newProductStock.value || 0);

  if (!name) {
    showToast("Informe o nome do produto.");
    return;
  }
  if (Number.isNaN(price) || price < 0 || Number.isNaN(stock) || stock < 0) {
    showToast("Informe preço e estoque válidos.");
    return;
  }

  const product = {
    id: crypto.randomUUID(),
    name,
    price,
    stock,
    barberId,
  };

  try {
    await persistChange("addProduct", product);
    els.productForm.reset();
    showToast("Produto cadastrado com sucesso.");
  } catch (error) {
    // Error handled in persistChange
  }
});

els.saleForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const barberId = getCurrentBarberId();
  if (!barberId) {
    showToast("Entre com um barbeiro para registrar lançamentos.");
    return;
  }

  const type = els.saleType.value;
  let itemId = null;
  if (type === "produto") itemId = els.saleProductSelect.value;
  else if (type === "servico") itemId = els.saleServiceSelect.value;

  const amount = Number(els.saleAmount.value);
  const quantity = Number(els.saleQuantity.value || 1);
  const description = els.saleDescription.value.trim();

  if (!description) {
    showToast("Informe uma descrição para o lançamento.");
    return;
  }
  if (Number.isNaN(amount) || amount < 0 || Number.isNaN(quantity) || quantity < 1) {
    showToast("Informe quantidade e valor válidos.");
    return;
  }

  const sale = {
    id: crypto.randomUUID(),
    type,
    description,
    amount,
    quantity,
    date: parseDateInput(els.saleDate) || todayIso(),
    itemId,
    barberId,
  };

  try {
    await persistChange("addSale", sale);
    els.saleForm.reset();
    setDateInput(els.saleDate, todayIso());
    showToast("Venda registrada com sucesso.");
  } catch (error) {
    // Error handled in persistChange
  }
});

els.appointmentsList.addEventListener("click", async (event) => {
  const doneId = event.target.dataset.done;
  const cancelId = event.target.dataset.cancel;
  const item = state.appointments.find((appointment) => appointment.id === (doneId || cancelId));
  if (!item) return;

  const status = doneId ? "concluido" : "cancelado";

  try {
    await persistChange("updateAppointment", { id: item.id, status });
    showToast(doneId ? "Atendimento concluído." : "Agendamento cancelado.");
  } catch (error) {
    // Error handled in persistChange
  }
});

els.serviceForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const barberId = getCurrentBarberId();
  if (!barberId) {
    showToast("Entre com um barbeiro para cadastrar serviços.");
    return;
  }
  const name = els.newServiceName.value.trim();
  const price = Number(els.newServicePrice.value);
  const duration = Number(els.newServiceDuration.value || 60);

  if (!name) {
    showToast("Informe o nome do serviço.");
    return;
  }
  if (Number.isNaN(price) || price < 0 || Number.isNaN(duration) || duration < 15) {
    showToast("Informe preço e duração válidos.");
    return;
  }

  const service = {
    id: crypto.randomUUID(),
    name,
    price,
    duration,
    barberId,
  };

  try {
    await persistChange("addService", service);
    els.serviceForm.reset();
    showToast("Serviço adicionado.");
  } catch (error) {
    // Error handled in persistChange
  }
});

els.barberForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = els.newBarberName.value.trim();
  const username = els.newBarberUsername ? els.newBarberUsername.value.trim() : name.toLowerCase();
  const password = els.newBarberPassword ? els.newBarberPassword.value.trim() : "123";

  if (!name || !username || !password) {
    showToast("Preencha nome, usuário e senha.");
    return;
  }

  if (state.barbers.some((item) => String(item.username || "").toLowerCase() === username.toLowerCase())) {
    showToast("Já existe um barbeiro com esse nome de usuário.");
    return;
  }

  const barber = {
    id: crypto.randomUUID(),
    name,
    username,
    password,
  };

  try {
    await persistChange("addBarber", barber);
    els.barberForm.reset();
    showToast(`Login do barbeiro ${name} criado com sucesso!`);
  } catch (error) {
    // Handled in persistChange
  }
});

els.blockForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const barberId = getCurrentBarberId();
  if (!barberId) {
    showToast("Entre com um barbeiro para bloquear horários.");
    return;
  }

  const blockDate = parseDateInput(els.blockDate);
  if (isSunday(blockDate)) {
    showToast("A barbearia já fica fechada aos domingos.");
    return;
  }

  const block = {
    id: crypto.randomUUID(),
    date: blockDate,
    barberId,
    time: els.blockTime.value,
  };

  try {
    await persistChange("addBlock", block);
    showToast("Horário bloqueado.");
  } catch (error) {
    // Error handled in persistChange
  }
});

document.addEventListener("click", async (event) => {
  const serviceId = event.target.dataset.removeService;
  const barberId = event.target.dataset.removeBarber;
  const productId = event.target.dataset.removeProduct;
  const saleId = event.target.dataset.removeSale;
  const editSaleId = event.target.dataset.editSale;

  if (!serviceId && !barberId && !productId && !saleId && !editSaleId) return;

  try {
    if (serviceId) {
      await persistChange("removeService", { id: serviceId });
    }
    if (barberId) {
      await persistChange("removeBarber", { id: barberId });
    }
    if (productId) {
      await persistChange("removeProduct", { id: productId });
      showToast("Produto removido.");
    }
    if (saleId) {
      await persistChange("removeSale", { id: saleId });
      showToast("Lançamento removido.");
    }
    if (editSaleId) {
      const sale = state.sales.find((item) => item.id === editSaleId);
      if (!sale) return;

      const newDescription = window.prompt("Descrição do lançamento", sale.description);
      if (newDescription == null) return;
      const newAmount = window.prompt("Valor total", String(sale.amount));
      if (newAmount == null) return;
      const newQuantity = window.prompt("Quantidade", String(sale.quantity || 1));
      if (newQuantity == null) return;
      const newDate = window.prompt("Data (YYYY-MM-DD)", sale.date);
      if (newDate == null) return;

      await persistChange("updateSale", {
        id: sale.id,
        description: newDescription.trim() || sale.description,
        amount: Number(newAmount),
        quantity: Number(newQuantity),
        date: newDate.trim() || sale.date,
      });
      showToast("Lançamento atualizado.");
    }
  } catch (error) {
    // Error handled in persistChange
  }
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  els.installButton.hidden = false;
});

els.installButton.addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  els.installButton.hidden = true;
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js");
  });
}

setInitialDates();
renderAll();
syncState();
setInterval(syncState, 15000);
