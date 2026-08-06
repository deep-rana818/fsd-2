/* ===========================================================
   app.js â€” dashboard data + rendering, gated by RBAC checks
   =========================================================== */

const ITEMS_KEY = "rbac.items";

const SEED_ITEMS = [
  { id: "it-01", name: "Quarterly Report",   sub: "Finance",   status: "thriving", owner: "Eddie Editor" },
  { id: "it-02", name: "Onboarding Guide",   sub: "HR",        status: "monitor",  owner: "Alice Admin"  },
  { id: "it-03", name: "Brand Guidelines",   sub: "Marketing", status: "dormant",  owner: "Eddie Editor" },
  { id: "it-04", name: "API Reference",      sub: "Engineering", status: "monitor", owner: "Alice Admin" },
  { id: "it-05", name: "Customer FAQ",       sub: "Support",   status: "thriving", owner: "Vic Viewer"   },
];

function ensureSeedItems() {
  if (localStorage.getItem(ITEMS_KEY)) return;
  localStorage.setItem(ITEMS_KEY, JSON.stringify(SEED_ITEMS));
}

function getItems() {
  return JSON.parse(localStorage.getItem(ITEMS_KEY) || "[]");
}

function saveItems(list) {
  localStorage.setItem(ITEMS_KEY, JSON.stringify(list));
}

let currentClaims = null;

async function initDashboard() {
  currentClaims = await window.RbacGuard.requireAuth();
  if (!currentClaims) return;
  ensureSeedItems();

  renderSidebar();
  renderStats();
  renderToolbar();
  renderItemTable();
  wireModal();
}

function renderSidebar() {
  const role = currentClaims.role;
  const initials = currentClaims.name.split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase();

  document.getElementById("userAvatar").textContent = initials;
  document.getElementById("userName").textContent = currentClaims.name;
  document.getElementById("userRole").textContent = window.RbacGuard.ROLE_LABEL[role] || role;

  const usersLink = document.getElementById("navUsers");
  if (!window.RbacGuard.can(role, "user:manage")) {
    usersLink.remove();
  }
}

function renderStats() {
  const items = getItems();
  const thriving = items.filter(i => i.status === "thriving").length;
  const monitor = items.filter(i => i.status === "monitor").length;

  document.getElementById("statTotal").textContent = items.length;
  document.getElementById("statThriving").textContent = thriving;
  document.getElementById("statMonitor").textContent = monitor;
}

function renderToolbar() {
  const addBtn = document.getElementById("addItemBtn");
  const uploadBtn = document.getElementById("uploadItemBtn");
  const uploadInput = document.getElementById("uploadItemInput");

  if (!window.RbacGuard.can(currentClaims.role, "item:create")) {
    addBtn.style.display = "none";
  } else {
    addBtn.addEventListener("click", () => openModal());
  }

  if (!window.RbacGuard.can(currentClaims.role, "item:upload")) {
    uploadBtn.style.display = "none";
  } else {
    uploadBtn.addEventListener("click", () => uploadInput.click());
    uploadInput.addEventListener("change", handleUpload);
  }

  document.getElementById("searchInput").addEventListener("input", (e) => {
    renderItemTable(e.target.value.trim().toLowerCase());
  });
}

function handleUpload(e) {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;

  const guessedName = file.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ");
  const items = getItems();
  items.push({
    id: "it-" + Date.now(),
    name: guessedName || "Untitled item",
    sub: "Uploaded: " + file.name,
    status: "monitor",
    owner: currentClaims.name,
  });
  saveItems(items);
  renderStats();
  renderItemTable(document.getElementById("searchInput").value.trim().toLowerCase());
}

function statusPillClass(status) {
  return { thriving: "status-thriving", monitor: "status-monitor", dormant: "status-dormant" }[status] || "";
}

function renderItemTable(filter = "") {
  const tbody = document.getElementById("itemBody");
  const items = getItems().filter(i =>
    !filter || i.name.toLowerCase().includes(filter) || i.sub.toLowerCase().includes(filter)
  );

  const canDelete = window.RbacGuard.can(currentClaims.role, "item:delete");

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state">No items match that search.</div></td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(i => `
    <tr>
      <td>
        <div class="item-name">${escapeHtml(i.name)}</div>
        <div class="item-sub">${escapeHtml(i.sub)}</div>
      </td>
      <td><span class="status-pill ${statusPillClass(i.status)}">${i.status}</span></td>
      <td>${escapeHtml(i.owner)}</td>
      <td class="row-actions">
        ${canDelete ? `<button class="icon-btn danger" data-delete="${i.id}">Delete</button>` : `<span style="color:var(--muted); font-size:0.78rem;">Read only</span>`}
      </td>
    </tr>
  `).join("");

  tbody.querySelectorAll("[data-delete]").forEach(btn => {
    btn.addEventListener("click", () => deleteItem(btn.dataset.delete));
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function deleteItem(id) {
  if (!window.RbacGuard.can(currentClaims.role, "item:delete")) return;
  if (!confirm("Delete this item?")) return;
  saveItems(getItems().filter(i => i.id !== id));
  renderStats();
  renderItemTable(document.getElementById("searchInput").value.trim().toLowerCase());
}

function openModal() {
  document.getElementById("modalTitle").textContent = "Add item";
  document.getElementById("itemForm").reset();
  document.getElementById("itemModal").classList.add("show");
}

function closeModal() {
  document.getElementById("itemModal").classList.remove("show");
}

function wireModal() {
  document.getElementById("cancelModalBtn").addEventListener("click", closeModal);
  document.getElementById("itemModal").addEventListener("click", (e) => {
    if (e.target.id === "itemModal") closeModal();
  });

  document.getElementById("itemForm").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!window.RbacGuard.can(currentClaims.role, "item:create")) return;

    const items = getItems();
    items.push({
      id: "it-" + Date.now(),
      name: document.getElementById("fName").value.trim(),
      sub: document.getElementById("fCategory").value.trim(),
      status: document.getElementById("fStatus").value,
      owner: currentClaims.name,
    });
    saveItems(items);
    closeModal();
    renderStats();
    renderItemTable(document.getElementById("searchInput").value.trim().toLowerCase());
  });
}

document.getElementById("logoutBtn")?.addEventListener("click", () => {
  window.RbacAuth.logout();
  window.location.href = "index.html";
});

initDashboard();
