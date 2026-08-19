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
  tenantsList: document.querySelector("#centralTenantsList"),
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
  } catch (error) {
    showToast(error.message || "Erro ao carregar central.");
  }
}

function getBarbersOfTenant(tenant) {
  const tenants = centralData.tenants || [];
  const tenantObj = typeof tenant === "string"
    ? tenants.find((t) => t.slug === tenant)
    : tenant;
  const tenantId = tenantObj ? tenantObj.id : null;

  return (centralData.barbers || []).filter((barber) => {
    return !barber.tenantId || barber.tenantId === tenantId;
  });
}

function renderTenants() {
  const tenants = centralData.tenants || [];

  if (!tenants.length) {
    els.tenantsList.innerHTML = `<div class="empty-state">Nenhuma barbearia cadastrada.</div>`;
    return;
  }

  const tenantCards = tenants
    .map((tenant) => {
      const isPrincipal = tenant.slug === "principal";
      const barbers = getBarbersOfTenant(tenant);

      const barberRows = barbers.length
        ? barbers
            .map(
              (barber) => `
              <div class="central-barber-row">
                <div class="central-barber-info">
                  <strong>${escapeHtml(barber.name)}</strong>
                  <span>Usuário: <code>${escapeHtml(barber.username || barber.name.toLowerCase())}</code></span>
                  <span>Senha: <code>${escapeHtml(barber.password || "123")}</code></span>
                </div>
                <button class="danger-button" type="button" data-remove-barber="${escapeHtml(barber.id)}" data-tenant="${escapeHtml(tenant.slug)}">Remover</button>
              </div>
            `,
            )
            .join("")
        : `<div class="empty-state central-empty">Nenhum barbeiro cadastrado nesta barbearia.</div>`;

      return `
        <article class="central-tenant-card">
          <div class="central-tenant-header">
            <div>
              <h4>${escapeHtml(tenant.name)} ${isPrincipal ? "⭐" : ""}</h4>
              <small>Link: <code>/${escapeHtml(tenant.slug)}</code> | Barbeiros: ${barbers.length}</small>
            </div>
            <div class="table-row-action">
              <button class="ghost-button" type="button" data-copy-tenant="${escapeHtml(tenant.slug)}">Copiar link</button>
              ${isPrincipal ? "" : `<button class="danger-button" type="button" data-delete-tenant="${escapeHtml(tenant.slug)}">Apagar barbearia</button>`}
            </div>
          </div>

          <form class="central-barber-form" data-tenant-form="${escapeHtml(tenant.slug)}">
            <div class="inline-fields">
              <label>
                Nome do barbeiro
                <input required placeholder="Ex: Matheus" data-barber-name />
              </label>
              <label>
                Usuário (Login)
                <input required placeholder="Ex: matheus" data-barber-username />
              </label>
            </div>
            <div class="inline-fields">
              <label>
                Senha de Acesso
                <input required placeholder="Ex: 1234" data-barber-password />
              </label>
              <div class="central-form-action">
                <button type="submit" class="secondary-button">➕ Cadastrar Barbeiro</button>
              </div>
            </div>
          </form>

          <div class="central-barbers-list">
            ${barberRows}
          </div>
        </article>
      `;
    })
    .join("");

  els.tenantsList.innerHTML = `
    <div class="central-tenant-grid">
      ${tenantCards}
    </div>
  `;
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
    showToast("Barbearia criada. O link já está disponível na lista.");
  } catch (error) {
    showToast(error.message || "Não foi possível criar a barbearia.");
  }
});

els.tenantsList.addEventListener("click", async (event) => {
  const copySlug = event.target.dataset.copyTenant;
  const deleteSlug = event.target.dataset.deleteTenant;
  const removeBarberId = event.target.dataset.removeBarber;
  const removeBarberTenant = event.target.dataset.tenant;

  if (copySlug) {
    await navigator.clipboard.writeText(`${window.location.origin}/${copySlug}`);
    showToast("Link copiado.");
    return;
  }

  if (deleteSlug) {
    const tenant = (centralData.tenants || []).find((t) => t.slug === deleteSlug);
    if (!tenant) return;

    const confirmed = window.confirm(
      `Tem certeza que deseja apagar a barbearia "${tenant.name}"?\n\nTodos os dados desta unidade (agendamentos, serviços, barbeiros, produtos, vendas) serão removidos permanentemente.`,
    );
    if (!confirmed) return;

    try {
      centralData = await centralRequest("/api/central", {
        method: "POST",
        body: JSON.stringify({ action: "removeTenant", payload: { slug: deleteSlug } }),
      });
      renderTenants();
      showToast("Barbearia apagada.");
    } catch (error) {
      showToast(error.message || "Não foi possível apagar a barbearia.");
    }
    return;
  }

  if (removeBarberId) {
    const barber = (centralData.barbers || []).find((b) => b.id === removeBarberId);
    if (!barber) return;

    const confirmed = window.confirm(`Remover o barbeiro "${barber.name}"?`);
    if (!confirmed) return;

    try {
      centralData = await centralRequest("/api/central", {
        method: "POST",
        body: JSON.stringify({
          action: "removeBarber",
          payload: { id: removeBarberId, tenantSlug: removeBarberTenant || "principal" },
        }),
      });
      renderTenants();
      showToast("Barbeiro removido.");
    } catch (error) {
      showToast(error.message || "Não foi possível remover o barbeiro.");
    }
  }
});

els.tenantsList.addEventListener("submit", async (event) => {
  const form = event.target.closest("[data-tenant-form]");
  if (!form) return;
  event.preventDefault();

  const tenantSlug = form.dataset.tenantForm;
  const name = form.querySelector("[data-barber-name]").value.trim();
  const username = form.querySelector("[data-barber-username]").value.trim();
  const password = form.querySelector("[data-barber-password]").value.trim();

  if (!name || !username || !password) {
    showToast("Preencha nome, usuário e senha do barbeiro.");
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
    form.reset();
    renderTenants();
    showToast(`Login do barbeiro ${name} criado com sucesso!`);
  } catch (error) {
    showToast(error.message || "Não foi possível criar o login.");
  }
});

// Init
if (isCentralAuthenticated) {
  showCentral();
  syncCentral();
} else {
  showLogin();
}