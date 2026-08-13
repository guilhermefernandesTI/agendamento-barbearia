const storageKey = "agenda-barbearia-state-v1";
const authKey = "agenda-barbearia-admin-auth";
const loggedBarberKey = "agenda-barbearia-logged-barber";

const defaultState = {
  services: [
    { id: "s1", name: "Corte masculino", price: 45, duration: 60 },
    { id: "s2", name: "Barba", price: 30, duration: 60 },
    { id: "s3", name: "Corte + barba", price: 70, duration: 60 },
  ],
  barbers: [
    { id: "b1", name: "Rafael", username: "rafael" },
    { id: "b2", name: "Lucas", username: "lucas" },
  ],
  appointments: [],
  blocks: [],
  products: [
    { id: "p1", name: "Pomada Modeladora", price: 35, stock: 10 },
    { id: "p2", name: "Óleo para Barba", price: 25, stock: 15 },
    { id: "p3", name: "Shampoo Cabelo & Barba", price: 40, stock: 8 },
  ],
  sales: [],
};

const els = {
  tabs: document.querySelectorAll(".tab"),
  views: document.querySelectorAll(".view"),
  adminOnly: document.querySelectorAll(".admin-only"),
  loginTab: document.querySelector("#loginTab"),
  logoutButton: document.querySelector("#logoutButton"),
  userBadge: document.querySelector("#userBadge"),
  loggedBarberName: document.querySelector("#loggedBarberName"),
  loginForm: document.querySelector("#loginForm"),
  loginUsername: document.querySelector("#loginUsername"),
  adminPassword: document.querySelector("#adminPassword"),
  installButton: document.querySelector("#installButton"),
  floatingAdminBtn: document.querySelector("#floatingAdminBtn"),
  openStatus: document.querySelector("#openStatus"),
  todayCount: document.querySelector("#todayCount"),
  sundayNotice: document.querySelector("#sundayNotice"),
  bookingForm: document.querySelector("#bookingForm"),
  clientName: document.querySelector("#clientName"),
  clientPhone: document.querySelector("#clientPhone"),
  serviceSelect: document.querySelector("#serviceSelect"),
  barberSelect: document.querySelector("#barberSelect"),
  dateInput: document.querySelector("#dateInput"),
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
let loggedBarber = JSON.parse(sessionStorage.getItem(loggedBarberKey) || "null");

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return structuredClone(defaultState);

  try {
    return { ...structuredClone(defaultState), ...JSON.parse(saved) };
  } catch {
    return structuredClone(defaultState);
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

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.setTimeout(() => els.toast.classList.remove("show"), 2800);
}

async function syncState() {
  try {
    const res = await fetch("/api/agenda");
    if (!res.ok) return;
    const data = await res.json();
    if (data?.state) {
      state = { ...structuredClone(defaultState), ...data.state };
      saveState();
      renderAll();
    }
  } catch (err) {
    console.warn("Erro ao sincronizar com banco de dados:", err);
  }
}

async function persistChange(action, payload) {
  try {
    const res = await fetch("/api/agenda", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, payload }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data?.error || "Erro ao salvar no banco de dados.");
    }
    if (data?.state) {
      state = { ...structuredClone(defaultState), ...data.state };
      saveState();
    }
    renderAll();
  } catch (error) {
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
    if (view.classList.contains("admin-only")) {
      view.hidden = !isAdminAuthenticated;
    }
  });
}

function renderAccess() {
  document.body.classList.toggle("admin-auth", isAdminAuthenticated);

  els.adminOnly.forEach((item) => {
    item.hidden = !isAdminAuthenticated;
  });

  if (els.loginTab) els.loginTab.hidden = isAdminAuthenticated;

  if (els.floatingAdminBtn) {
    els.floatingAdminBtn.hidden = isAdminAuthenticated;
  }

  if (isAdminAuthenticated && loggedBarber) {
    if (els.userBadge) els.userBadge.hidden = false;
    if (els.loggedBarberName) els.loggedBarberName.textContent = loggedBarber.name;
  } else {
    if (els.userBadge) els.userBadge.hidden = true;
  }

  if (!isAdminAuthenticated && document.querySelector(".view.admin-only.active")) {
    showView("booking");
  }
}

function renderOptions() {
  els.serviceSelect.innerHTML = state.services
    .map((service) => `<option value="${escapeHtml(service.id)}">${escapeHtml(service.name)} - ${money(service.price)}</option>`)
    .join("");

  const barberOptions = state.barbers
    .map((barber) => `<option value="${escapeHtml(barber.id)}">${escapeHtml(barber.name)}</option>`)
    .join("");

  els.barberSelect.innerHTML = barberOptions;
  els.blockBarber.innerHTML = barberOptions;

  updateBarberFilterOptions();
}

function updateBarberFilterOptions() {
  if (!els.scheduleBarberFilter && !els.reportBarberFilter) return;

  const currentScheduleVal = els.scheduleBarberFilter ? els.scheduleBarberFilter.value : "mine";
  const currentReportVal = els.reportBarberFilter ? els.reportBarberFilter.value : "mine";

  const barberName = loggedBarber ? loggedBarber.name : "Barbeiro";

  let scheduleFilterHtml = `<option value="mine">👤 Minha Agenda (${escapeHtml(barberName)})</option>`;
  scheduleFilterHtml += `<option value="all">✂️ Todos os Barbeiros</option>`;
  scheduleFilterHtml += state.barbers
    .map((b) => `<option value="${escapeHtml(b.id)}">${escapeHtml(b.name)}</option>`)
    .join("");

  if (els.scheduleBarberFilter) {
    els.scheduleBarberFilter.innerHTML = scheduleFilterHtml;
    if (currentScheduleVal && els.scheduleBarberFilter.querySelector(`option[value="${currentScheduleVal}"]`)) {
      els.scheduleBarberFilter.value = currentScheduleVal;
    } else {
      els.scheduleBarberFilter.value = "mine";
    }
  }

  if (els.reportBarberFilter) {
    let reportFilterHtml = `<option value="mine">👤 Meus Atendimentos (${escapeHtml(barberName)})</option>`;
    reportFilterHtml += `<option value="all">✂️ Todos os Barbeiros</option>`;
    reportFilterHtml += state.barbers
      .map((b) => `<option value="${escapeHtml(b.id)}">${escapeHtml(b.name)}</option>`)
      .join("");

    els.reportBarberFilter.innerHTML = reportFilterHtml;
    if (currentReportVal && els.reportBarberFilter.querySelector(`option[value="${currentReportVal}"]`)) {
      els.reportBarberFilter.value = currentReportVal;
    } else {
      els.reportBarberFilter.value = "mine";
    }
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
  const date = els.dateInput.value;
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

function renderSchedule() {
  const date = els.scheduleDate.value;
  const filterVal = els.scheduleBarberFilter ? els.scheduleBarberFilter.value : "mine";

  let targetBarberId = null;
  if (filterVal === "mine" && loggedBarber && loggedBarber.id !== "admin") {
    targetBarberId = loggedBarber.id;
  } else if (filterVal !== "mine" && filterVal !== "all") {
    targetBarberId = filterVal;
  }

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
      const service = getService(item.serviceId);
      const barber = getBarber(item.barberId);
      const phone = String(item.phone || "").replace(/\D/g, "");
      const message = encodeURIComponent(
        `Olá ${item.name}, confirmando seu horário ${item.date} às ${item.time} na barbearia.`,
      );
      return `
        <article class="appointment ${item.status === "concluido" ? "done" : ""}">
          <div class="appointment-time">${escapeHtml(item.time)}</div>
          <div>
            <strong>${escapeHtml(item.name)}</strong>
            <p>${escapeHtml(service?.name ?? "Serviço removido")} com ${escapeHtml(barber?.name ?? "Barbeiro removido")}</p>
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
  const filterVal = els.reportBarberFilter ? els.reportBarberFilter.value : "mine";

  let targetBarberId = null;
  if (filterVal === "mine" && loggedBarber && loggedBarber.id !== "admin") {
    targetBarberId = loggedBarber.id;
  } else if (filterVal !== "mine" && filterVal !== "all") {
    targetBarberId = filterVal;
  }

  const monthAppointments = state.appointments.filter((app) => {
    if (!app.date.startsWith(selectedMonth) || app.status === "cancelado") return false;
    if (targetBarberId && app.barberId !== targetBarberId) return false;
    return true;
  });

  const completedAppointments = monthAppointments.filter((app) => app.status === "concluido");
  const monthSales = (state.sales || []).filter((s) => s.date.startsWith(selectedMonth));

  let haircutsCount = 0;
  let totalServiceRevenue = 0;

  const serviceStats = {};

  monthAppointments.forEach((app) => {
    const srv = getService(app.serviceId);
    const serviceName = srv ? srv.name : "Serviço";
    const price = srv ? srv.price : 0;

    if (!serviceStats[serviceName]) {
      serviceStats[serviceName] = { count: 0, revenue: 0, completedCount: 0 };
    }
    serviceStats[serviceName].count++;

    if (app.status === "concluido") {
      serviceStats[serviceName].completedCount++;
      serviceStats[serviceName].revenue += price;
      totalServiceRevenue += price;

      if (serviceName.toLowerCase().includes("corte")) {
        haircutsCount++;
      }
    }
  });

  let productRevenue = 0;
  monthSales.forEach((s) => {
    productRevenue += Number(s.amount || 0);
  });

  const grandTotal = totalServiceRevenue + productRevenue;

  els.reportHaircutsCount.textContent = haircutsCount;
  els.reportCortesSub.textContent = `${completedAppointments.length} atendimentos concluídos`;
  els.reportTotalAppointments.textContent = monthAppointments.length;
  els.reportCompletedSub.textContent = `${completedAppointments.length} concluídos`;
  els.reportAppointmentRevenue.textContent = money(totalServiceRevenue);
  els.reportTotalRevenue.textContent = money(grandTotal);

  const serviceRows = Object.entries(serviceStats)
    .map(
      ([name, stat]) => `
      <div class="table-row">
        <div class="table-row-info">
          <strong>${escapeHtml(name)}</strong>
          <small>${stat.completedCount} concluídos (${stat.count} agendados)</small>
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
      const service = getService(item.serviceId);
      const barber = getBarber(item.barberId);
      return `
        <article class="appointment ${item.status === "concluido" ? "done" : ""}">
          <div class="appointment-time">${escapeHtml(item.date.slice(8))}/${escapeHtml(item.date.slice(5, 7))} ${escapeHtml(item.time)}</div>
          <div>
            <strong>${escapeHtml(item.name)} (${escapeHtml(item.status)})</strong>
            <p>${escapeHtml(service?.name ?? "Serviço")} - ${money(service?.price || 0)} com ${escapeHtml(barber?.name ?? "Barbeiro")}</p>
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

  const products = state.products || [];
  const sales = state.sales || [];

  els.saleProductSelect.innerHTML = products
    .map((p) => `<option value="${escapeHtml(p.id)}" data-price="${p.price}">${escapeHtml(p.name)} - ${money(p.price)} (Estoque: ${p.stock})</option>`)
    .join("");

  els.saleServiceSelect.innerHTML = state.services
    .map((s) => `<option value="${escapeHtml(s.id)}" data-price="${s.price}">${escapeHtml(s.name)} - ${money(s.price)}</option>`)
    .join("");

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
    } else {
      totalOtherRevenue += Number(s.amount || 0);
    }
  });

  const completedServicesRevenue = state.appointments
    .filter((a) => a.status === "concluido")
    .reduce((sum, a) => {
      const srv = getService(a.serviceId);
      return sum + (srv ? srv.price : 0);
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
            <small>Data: ${escapeHtml(s.date)} | Qtd: ${s.quantity}</small>
          </div>
          <div class="table-row-action">
            <strong>${money(s.amount)}</strong>
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
  els.servicesList.innerHTML = state.services
    .map(
      (service) =>
        `<span class="chip">${escapeHtml(service.name)} ${money(service.price)} <button type="button" aria-label="Remover ${escapeHtml(service.name)}" data-remove-service="${escapeHtml(service.id)}">x</button></span>`,
    )
    .join("");

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
  const today = todayIso();
  const count = state.appointments.filter((item) => item.date === today && item.status !== "cancelado").length;
  if (els.todayCount) els.todayCount.textContent = count;

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

  els.dateInput.min = today;
  els.dateInput.value = today;
  els.scheduleDate.value = today;
  els.blockDate.min = today;
  els.blockDate.value = today;

  if (els.reportMonth) els.reportMonth.value = month;
  if (els.saleDate) els.saleDate.value = today;
}

els.tabs.forEach((tab) => {
  tab.addEventListener("click", async () => {
    const viewName = tab.dataset.view;
    if (!viewName) return;
    if ((viewName === "schedule" || viewName === "reports" || viewName === "financial" || viewName === "admin") && !isAdminAuthenticated) {
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

  // Senha padrão mestre para o adm (920025) caso queira testar ou validar no front
  if ((username.toLowerCase() === "admin" || username.toLowerCase() === "rafael" || username.toLowerCase() === "lucas") && password === "920025") {
    isAdminAuthenticated = true;
    loggedBarber = { id: "admin", name: username.toLowerCase() === "admin" ? "Administrador" : username, username };
    sessionStorage.setItem(authKey, "true");
    sessionStorage.setItem(loggedBarberKey, JSON.stringify(loggedBarber));

    if (els.loginUsername) els.loginUsername.value = "";
    if (els.adminPassword) els.adminPassword.value = "";

    showToast(`Bem-vindo, ${loggedBarber.name}!`);
    renderAll();
    showView("schedule");
    await syncState();
    return;
  }

  try {
    const res = await fetch("/api/agenda", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", payload: { username, password } }),
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      showToast(data?.error || "Nome de usuário ou senha incorretos.");
      els.adminPassword.value = "";
      return;
    }

    isAdminAuthenticated = true;
    loggedBarber = data.barber;
    sessionStorage.setItem(authKey, "true");
    sessionStorage.setItem(loggedBarberKey, JSON.stringify(loggedBarber));

    if (els.loginUsername) els.loginUsername.value = "";
    if (els.adminPassword) els.adminPassword.value = "";

    showToast(`Bem-vindo, ${loggedBarber.name}!`);
    renderAll();
    showView("schedule");
    await syncState();
  } catch (err) {
    showToast("Erro ao realizar login. Tente novamente.");
  }
});

els.logoutButton.addEventListener("click", () => {
  isAdminAuthenticated = false;
  loggedBarber = null;
  sessionStorage.removeItem(authKey);
  sessionStorage.removeItem(loggedBarberKey);
  showToast("Você saiu da área restrita.");
  renderAll();
  showView("booking");
});

if (els.floatingAdminBtn) {
  els.floatingAdminBtn.addEventListener("click", () => {
    showView("login");
  });
}

els.timeGrid.addEventListener("click", (event) => {
  const button = event.target.closest(".time-button");
  if (!button || button.disabled) return;

  els.timeGrid.querySelectorAll(".time-button").forEach((item) => item.classList.remove("active"));
  button.classList.add("active");
  els.timeInput.value = button.dataset.time;
});

els.bookingForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (isSunday(els.dateInput.value)) {
    showToast("A barbearia está fechada aos domingos.");
    return;
  }

  if (!els.timeInput.value) {
    showToast("Escolha um horário disponível.");
    return;
  }

  if (isPastTime(els.dateInput.value, els.timeInput.value)) {
    showToast("Não é possível agendar em horários passados.");
    return;
  }

  const appointment = {
    id: crypto.randomUUID(),
    name: els.clientName.value.trim(),
    phone: els.clientPhone.value.trim(),
    serviceId: els.serviceSelect.value,
    barberId: els.barberSelect.value,
    date: els.dateInput.value,
    time: els.timeInput.value,
    notes: els.notesInput.value.trim(),
    status: "marcado",
    createdAt: new Date().toISOString(),
  };

  try {
    await persistChange("createAppointment", appointment);
    els.bookingForm.reset();
    els.dateInput.value = todayIso();
    showToast("Agendamento confirmado.");
  } catch (error) {
    // Error handled in persistChange
  }
});

els.serviceSelect.addEventListener("change", renderTimes);
els.barberSelect.addEventListener("change", renderTimes);
els.dateInput.addEventListener("change", () => {
  renderTimes();
  syncState();
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
  const product = {
    id: crypto.randomUUID(),
    name: els.newProductName.value.trim(),
    price: Number(els.newProductPrice.value),
    stock: Number(els.newProductStock.value || 0),
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

  const type = els.saleType.value;
  let itemId = null;
  if (type === "produto") itemId = els.saleProductSelect.value;
  else if (type === "servico") itemId = els.saleServiceSelect.value;

  const sale = {
    id: crypto.randomUUID(),
    type,
    description: els.saleDescription.value.trim(),
    amount: Number(els.saleAmount.value),
    quantity: Number(els.saleQuantity.value || 1),
    date: els.saleDate.value || todayIso(),
    itemId,
  };

  try {
    await persistChange("addSale", sale);
    els.saleForm.reset();
    els.saleDate.value = todayIso();
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
  const service = {
    id: crypto.randomUUID(),
    name: els.newServiceName.value.trim(),
    price: Number(els.newServicePrice.value),
    duration: Number(els.newServiceDuration.value || 60),
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
  const password = els.newBarberPassword ? els.newBarberPassword.value.trim() : "920025";

  if (!name) return;

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

  if (isSunday(els.blockDate.value)) {
    showToast("A barbearia já fica fechada aos domingos.");
    return;
  }

  const block = {
    id: crypto.randomUUID(),
    date: els.blockDate.value,
    barberId: els.blockBarber.value,
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

  if (!serviceId && !barberId && !productId && !saleId) return;

  try {
    if (serviceId && state.services.length > 1) {
      await persistChange("removeService", { id: serviceId });
    }
    if (barberId && state.barbers.length > 1) {
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
