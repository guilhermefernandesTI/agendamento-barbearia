const centralAuthKey = "agenda-barbearia-central-auth";
const centralTokenKey = "agenda-barbearia-central-token";

const els = {
  loginForm: document.querySelector("#centralLoginForm"),
  username: document.querySelector("#centralUsername"),
  password: document.querySelector("#centralPassword"),
  logoutBtn: document.querySelector("#centralLogoutBtn"),
  loginView: document.querySelector("#loginView"),
  centralView: document.querySelector("#centralView"),
  tenantForm: document.querySelector("#centralTenantForm"),
  tenantName: document.querySelector("#centralTenantName"),
  tenantSlug: document.querySelector("#centralTenantSlug"),
  tenantSelect: document.querySelector("#centralTenantSelect"),
  barberForm: document.querySelector("#centralBarberForm"),
  barberName: document.querySelector("#centralBarberName"),
  barberUsername: document.querySelector("#centralBarberUsername"),
  barberPassword: document.querySelector("#centralBarberPassword"),
  tenantsList: document.querySelector("#centralTenantsList"),
  barbersList: document.querySelector("#centralBarbersList"),
  toast: document.querySelector("#toast"),
};

let centralData = { tenants: [], barbers: [] };
let isCentralAuthenticated = sessionStorage.getItem(centralAuthKey) === "true";

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.setTimeout(() => els.toast.classList.remove("show"), 2800);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    const map = {
      "\u0026": "\u0026amp;",
      "\u003c": "\u0026lt;",
      "\u003e": "\u0026gt;",
      "\u0022": "\u0026quot;",
      "\u0027": "\u0026#39;",
    };
    return map[char];
  });
}

function tenantLabel(tenant) {
  return `${tenant.name} (${tenant.slug})`;
}

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Resposta inválida da API.");
  }
}

async function centralRequest(path, options = {}) {
  const token = sessionStorage.getItem(centralTokenKey) || "";
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await readJsonResponse(response);
  if (!response.ok || data.ok === false) {
    throw new Error(data?.error || "Erro na comunicação com o servidor.");
  }
  return data;
}

async function syncCentral() {
  try {
    centralData = await centralRequest("/api/central");
    renderTenants();
    renderBarbers();
  } catch (error) {
    showToast(error.message || "Erro ao carregar central.");
  }
}

function renderTenants() {
  const tenants = centralData.tenants || [];

  els.tenantSelect.innerHTML = tenants.length
    ? tenants.map((tenant) => `<option value="${escapeHtml(tenant.slug)}">${escapeHtml(tenantLabel(tenant))}</option>`).join("")
    : `<option value="principal">Barbearia Principal</option>`;

  els.tenantsList.innerHTML = tenants.length
    ? tenants
        .map((tenant) => {
          const isPrincipal = tenant.slug === "principal";
          const link = `${window.location.origin}/${tenant.slug}`;
          const barberCount = (centralData.barbers || []).filter((barber) => {
            const tenantId = tenants.find((t) => t.slug === tenant.slug)?.id;
            return !barber.tenantId || barber.tenantId === tenantId;
          }).length;

          return `
            <div class="table-row">
              <div class="table-row-info">
                <strong>${escapeHtml(tenant.name)} ${isPrincipal ? "⭐" : ""}</strong>
                <small>Link: <code>/${escapeHtml(tenant.slug)}</code> | Barbeiros: ${barberCount}</small>
              </div>
              <div class="table-row-action">
                <button class="ghost-button" type="button" data-copy-tenant="${escapeHtml(tenant.slug)}">Copiar link</button>
                ${isPrincipal ? "" : `<button class="danger-button" type="button" data-delete-tenant="${escapeHtml(tenant.slug)}">Excluir</button>`}
              </div>
            </div>
          `;
        })
        .join("")
    : `<div class="empty-state">Nenhuma barbearia cadastrada.</div>`;
}

function renderBarbers() {
  const barbers = centralData.barbers || [];
  const tenants = centralData.tenants || [];

  if (!barbers.length) {
    els.barbersList.innerHTML = `<div class="empty-state">Nenhum barbeiro cadastrado.</div>`;
    return;
  }

  els.barbersList.innerHTML = barbers
    .map((barber) => {
      const tenant = tenants.find((t) => t.id === barber.tenantId);
      const tenantName = tenant ? tenant.name : "Barbearia Principal";
      return `
        <div class="table-row">
          <div class="table-row-info">
            <strong>${escapeHtml(barber.name)}</strong>
            <small>Barbearia: ${escapeHtml(tenantName)} | Usuário: <code>${escapeHtml(barber.username || barber.name.toLowerCase())}</code> | Senha: <code>${escapeHtml(barber.password || "123")}</code></small>
          </div>
          <div class="table-row-action">
            <button class="ghost-button" type="button" data-remove-barber="${escapeHtml(barber.id)}">Remover</button>
          </div>
        </div>
      `;
    })
    .join("");
}

function showCentral() {
  els.loginView.hidden = true;
  els.centralView.hidden = false;
}

function showLogin() {
  els.centralView.hidden = true;
  els.loginView.hidden = false;
}

els.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const username = els.username.value.trim();
  const password = els.password.value.trim();

  if (!username || !password) {
    showToast("Preencha usuário e senha.");
    return;
  }

  try {
    const data = await centralRequest("/api/agenda?tenant=principal", {
      method: "POST",
      body: JSON.stringify({
        action: "login",
        payload: { username, password, tenantSlug: "principal" },
      }),
    });

    if (data.barber?.role !== "admin") {
      throw new Error("Apenas o administrador principal pode acessar a central.");
    }

    sessionStorage.setItem(centralAuthKey, "true");
    sessionStorage.setItem(centralTokenKey, data.token || "");
    isCentralAuthenticated = true;

    els.username.value = "";
    els.password.value = "";

    showToast(`Bem-vindo, ${data.barber.name}!`);
    showCentral();
    await syncCentral();
  } catch (error) {
    showToast(error.message || "Usuário ou senha incorretos.");
  }
});

els.logoutBtn.addEventListener("click", () => {
  sessionStorage.removeItem(centralAuthKey);
  sessionStorage.removeItem(centralTokenKey);
  isCentralAuthenticated = false;
  showToast("Você saiu da central.");
  showLogin();
});

els.tenantForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = els.tenantName.value.trim();
  const slug = els.tenantSlug.value.trim().toLowerCase();

  if (!name || !/^[a-z0-9-]+$/.test(slug)) {
    showToast("Use um nome e um link com letras minúsculas, números e hífens.");
    return;
  }

  try {
    centralData = await centralRequest("/api/central", {
      method: "POST",
      body: JSON.stringify({ action: "createTenant", payload: { name, slug } }),
    });
    els.tenantForm.reset();
    renderTenants();
    renderBarbers();
    showToast("Barbearia criada. O link já está disponível na lista.");
  } catch (error) {
    showToast(error.message || "Não foi possível criar a barbearia.");
  }
});

els.barberForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = els.barberName.value.trim();
  const username = els.barberUsername.value.trim();
  const password = els.barberPassword.value.trim();
  const tenantSlug = els.tenantSelect.value;

  if (!name || !username || !password) {
    showToast("Preencha nome, usuário e senha.");
    return;
  }

  try {
    centralData = await centralRequest("/api/central", {
      method: "POST",
      body: JSON.stringify({
        action: "addBarber",
        payload: { name, username, password, tenantSlug },
      }),
    });
    els.barberForm.reset();
    renderTenants();
    renderBarbers();
    showToast(`Login do barbeiro ${name} criado com sucesso!`);
  } catch (error) {
    showToast(error.message || "Não foi possível criar o login.");
  }
});

els.tenantsList.addEventListener("click", async (event) => {
  const copySlug = event.target.dataset.copyTenant;
  const deleteSlug = event.target.dataset.deleteTenant;

  if (copySlug) {
    await navigator.clipboard.writeText(`${window.location.origin}/${copySlug}`);
    showToast("Link copiado.");
    return;
  }

  if (deleteSlug) {
    const tenant = (centralData.tenants || []).find((t) => t.slug === deleteSlug);
    if (!tenant) return;

    const confirmed = window.confirm(
      `Tem certeza que deseja excluir a barbearia "${tenant.name}"?\n\nTodos os dados desta unidade (agendamentos, serviços, barbeiros, produtos, vendas) serão removidos permanentemente.`,
    );
    if (!confirmed) return;

    try {
      centralData = await centralRequest("/api/central", {
        method: "POST",
        body: JSON.stringify({ action: "removeTenant", payload: { slug: deleteSlug } }),
      });
      renderTenants();
      renderBarbers();
      showToast("Barbearia excluída.");
    } catch (error) {
      showToast(error.message || "Não foi possível excluir a barbearia.");
    }
  }
});

els.barbersList.addEventListener("click", async (event) => {
  const barberId = event.target.dataset.removeBarber;
  if (!barberId) return;

  const barber = (centralData.barbers || []).find((b) => b.id === barberId);
  if (!barber) return;

  const tenant = (centralData.tenants || []).find((t) => t.id === barber.tenantId);
  const tenantSlug = tenant ? tenant.slug : "principal";

  const confirmed = window.confirm(`Remover o barbeiro "${barber.name}"?`);
  if (!confirmed) return;

  try {
    centralData = await centralRequest("/api/central", {
      method: "POST",
      body: JSON.stringify({ action: "removeBarber", payload: { id: barberId, tenantSlug } }),
    });
    renderTenants();
    renderBarbers();
    showToast("Barbeiro removido.");
  } catch (error) {
    showToast(error.message || "Não foi possível remover o barbeiro.");
  }
});

// Init
if (isCentralAuthenticated) {
  showCentral();
  syncCentral();
} else {
  showLogin();
}