/* ===========================================================
   rbac.js â€” role â†’ permission map and guard helpers
   =========================================================== */

const PERMISSIONS = {
  admin:  ["item:read", "item:create", "item:upload", "item:delete", "user:manage"],
  editor: ["item:read", "item:create", "item:upload"],
  viewer: ["item:read"],
};

const ROLE_LABEL = {
  admin:  "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

function can(role, permission) {
  return (PERMISSIONS[role] || []).includes(permission);
}

async function requireAuth() {
  const claims = await window.RbacAuth.getCurrentUser();
  if (!claims) {
    window.location.href = "index.html";
    return null;
  }
  return claims;
}

async function requirePermission(permission) {
  const claims = await requireAuth();
  if (!claims) return null;
  if (!can(claims.role, permission)) {
    document.body.innerHTML = `
      <div class="denied-screen">
        <p class="denied-tag">403</p>
        <h1>Access denied</h1>
        <p>Your role, <strong>${ROLE_LABEL[claims.role] || claims.role}</strong>, doesn't include
           the <code>${permission}</code> permission.</p>
        <a href="dashboard.html" class="btn btn-primary">Back to dashboard</a>
      </div>`;
    return null;
  }
  return claims;
}

window.RbacGuard = { PERMISSIONS, ROLE_LABEL, can, requireAuth, requirePermission };
