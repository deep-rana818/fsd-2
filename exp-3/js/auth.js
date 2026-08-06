/* ===========================================================
   auth.js â€” user "database" + login/register/refresh/logout
   =========================================================== */

const USERS_KEY = "rbac.users";
const SESSION_KEY = "rbac.session"; // { accessToken, refreshToken }

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

const SEED_USERS = [
  { id: "u-001", name: "Alice Admin", email: "admin@demo.io",  password: "admin123",  role: "admin"  },
  { id: "u-002", name: "Eddie Editor", email: "editor@demo.io", password: "editor123", role: "editor" },
  { id: "u-003", name: "Vic Viewer",  email: "viewer@demo.io", password: "viewer123", role: "viewer" },
];

async function ensureSeedUsers() {
  if (localStorage.getItem(USERS_KEY)) return;
  const hashed = [];
  for (const u of SEED_USERS) {
    hashed.push({ id: u.id, name: u.name, email: u.email, role: u.role, passwordHash: await sha256(u.password) });
  }
  localStorage.setItem(USERS_KEY, JSON.stringify(hashed));
}

function getUsers() {
  return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

async function register(name, email, password) {
  await ensureSeedUsers();
  const users = getUsers();

  if (!name || !email || !password) {
    return { ok: false, error: "All fields are required." };
  }
  if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return { ok: false, error: "An account with that email already exists." };
  }

  const newUser = {
    id: "u-" + Date.now(),
    name,
    email,
    role: "viewer", // new signups start as viewer; an admin can promote them later
    passwordHash: await sha256(password),
  };
  users.push(newUser);
  saveUsers(users);

  return { ok: true, user: newUser };
}

async function login(email, password) {
  await ensureSeedUsers();
  const users = getUsers();
  const passwordHash = await sha256(password);
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.passwordHash === passwordHash);

  if (!user) {
    return { ok: false, error: "Email or password is wrong." };
  }

  const claims = { sub: user.id, name: user.name, email: user.email, role: user.role };
  const accessToken = await window.RbacJWT.signJWT(claims, window.RbacJWT.ACCESS_TOKEN_TTL_SECONDS);
  const refreshToken = await window.RbacJWT.signJWT({ sub: user.id, type: "refresh" }, window.RbacJWT.REFRESH_TOKEN_TTL_SECONDS);

  const session = { accessToken, refreshToken };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return { ok: true, session, user };
}

async function refreshAccessToken() {
  const session = getSession();
  if (!session) return null;

  const check = await window.RbacJWT.verifyJWT(session.refreshToken);
  if (!check.valid) { logout(); return null; }

  const users = getUsers();
  const user = users.find(u => u.id === check.payload.sub);
  if (!user) { logout(); return null; }

  const claims = { sub: user.id, name: user.name, email: user.email, role: user.role };
  const accessToken = await window.RbacJWT.signJWT(claims, window.RbacJWT.ACCESS_TOKEN_TTL_SECONDS);
  session.accessToken = accessToken;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return accessToken;
}

function getSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
}

async function getCurrentUser() {
  const session = getSession();
  if (!session) return null;

  let check = await window.RbacJWT.verifyJWT(session.accessToken);
  if (!check.valid && check.reason === "expired") {
    const newToken = await refreshAccessToken();
    if (!newToken) return null;
    check = await window.RbacJWT.verifyJWT(newToken);
  }
  if (!check.valid) return null;
  return check.payload;
}

window.RbacAuth = { login, register, logout, getCurrentUser, getSession, ensureSeedUsers, getUsers, saveUsers };
