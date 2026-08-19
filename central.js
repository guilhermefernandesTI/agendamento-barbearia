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

let centralData = { tenants: [] };
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

function renderTenants() {
  const tenants = centralData.tenants || [];

  if (!tenants.length) {
    els.tenantsList.innerHTML = `<div class="empty-state">Nenhuma barbearia cadastrada.</div>`;
    return;
  }

  const tenantCards = tenants
    .map((tenant) => {
      const isPrincipal = tenant.slug === "principal";
      const link = `${window.location.origin}/${tenant.slug}`;

      return `
        <article class="central-tenant-card">
          <div class="central-tenant-header">
            <div>
              <h4>${escapeHtml(tenant.name)} ${isPrincipal ? "⭐" : ""}</h4>
              <small>Link: <code>/${escapeHtml(tenant.slug)}</code></small>
            </div>
            <div class="table-row-action">
              <button class="ghost-button" type="button" data-copy-tenant="${escapeHtml(tenant.slug)}">Copiar link</button>
              <a class="ghost-button" href="${escapeHtml(link)}" target="_blank">Abrir</a>
              ${isPrincipal ? "" : `<button class="danger-button" type="button" data-delete-tenant="${escapeHtml(tenant.slug)}">Apagar</button>`}
            </div>
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
  }
});

// Init
if (isCentralAuthenticated) {
  showCentral();
  syncCentral();
} else {
  showLogin();
}