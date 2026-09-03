import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import seedData from "../data/app-data.json";
import { createAccessToken, verifyAccessToken } from "./jwt";
import "../css/style.css";

const USERS_KEY = "rbac.users";
const ITEMS_KEY = "rbac.items";
const POSTS_KEY = "rbac.posts";
const SESSION_KEY = "rbac.session";

const roleLabel = Object.fromEntries(
  Object.entries(seedData.roles).map(([role, details]) => [role, details.label])
);

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

async function sha256(text) {
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function seedUsers() {
  if (localStorage.getItem(USERS_KEY)) return;
  const users = await Promise.all(
    seedData.users.map(async ({ password, ...user }) => ({
      ...user,
      passwordHash: await sha256(password),
    }))
  );
  writeJson(USERS_KEY, users);
}

function seedCollection(key, data) {
  if (!localStorage.getItem(key)) writeJson(key, data);
}

function can(role, permission) {
  return seedData.roles[role]?.permissions.includes(permission) || false;
}

function initials(name) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function App() {
  const [route, setRoute] = useState(() => location.hash.replace("#/", "") || "dashboard");
  const [users, setUsers] = useState([]);
  const [items, setItems] = useState([]);
  const [posts, setPosts] = useState([]);
  const [sessionClaims, setSessionClaims] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function init() {
      await seedUsers();
      seedCollection(ITEMS_KEY, seedData.items);
      seedCollection(POSTS_KEY, seedData.posts);
      setUsers(readJson(USERS_KEY, []));
      setItems(readJson(ITEMS_KEY, []));
      setPosts(readJson(POSTS_KEY, []));
      const storedSession = readJson(SESSION_KEY, null);
      if (storedSession?.accessToken) {
        const tokenCheck = await verifyAccessToken(storedSession.accessToken);
        if (tokenCheck.valid) {
          setSessionClaims(tokenCheck.claims);
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
      } else {
        localStorage.removeItem(SESSION_KEY);
      }
      setReady(true);
    }
    init();
  }, []);

  useEffect(() => {
    const onHashChange = () => setRoute(location.hash.replace("#/", "") || "dashboard");
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    if (!sessionClaims?.exp) return undefined;
    const delay = Math.max(sessionClaims.exp * 1000 - Date.now(), 0);
    const timer = window.setTimeout(() => {
      localStorage.removeItem(SESSION_KEY);
      setSessionClaims(null);
      location.hash = "#/login";
      setRoute("login");
    }, delay);
    return () => window.clearTimeout(timer);
  }, [sessionClaims?.exp]);

  const storedUser = users.find((user) => user.id === sessionClaims?.sub);
  const currentUser = storedUser && sessionClaims
    ? { ...storedUser, role: sessionClaims.role }
    : null;

  function saveUsers(nextUsers) {
    setUsers(nextUsers);
    writeJson(USERS_KEY, nextUsers);
  }

  function saveItems(nextItems) {
    setItems(nextItems);
    writeJson(ITEMS_KEY, nextItems);
  }

  function savePosts(nextPosts) {
    setPosts(nextPosts);
    writeJson(POSTS_KEY, nextPosts);
  }

  function navigate(nextRoute) {
    location.hash = `#/${nextRoute}`;
    setRoute(nextRoute);
  }

  async function login(user) {
    const accessToken = await createAccessToken(user);
    const tokenCheck = await verifyAccessToken(accessToken);
    if (!tokenCheck.valid) return { ok: false, message: "Unable to create a secure session." };
    writeJson(SESSION_KEY, { accessToken });
    setSessionClaims(tokenCheck.claims);
    navigate("dashboard");
    return { ok: true };
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    setSessionClaims(null);
    navigate("login");
  }

  if (!ready) return <div className="empty-state">Loading...</div>;

  if (!currentUser || route === "login") {
    return <AuthPage users={users} saveUsers={saveUsers} onLogin={login} />;
  }

  return (
    <Shell user={currentUser} route={route} navigate={navigate} logout={logout}>
      {route === "posts" && (
        <PostsPage user={currentUser} posts={posts} savePosts={savePosts} />
      )}
      {route === "profile" && (
        <ProfilePage user={currentUser} users={users} saveUsers={saveUsers} />
      )}
      {route === "users" && (
        <UsersPage currentUser={currentUser} users={users} saveUsers={saveUsers} navigate={navigate} />
      )}
      {!["posts", "profile", "users"].includes(route) && (
        <DashboardPage user={currentUser} items={items} saveItems={saveItems} />
      )}
    </Shell>
  );
}

function AuthPage({ users, saveUsers, onLogin }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [signIn, setSignIn] = useState({ email: "", password: "" });
  const [signUp, setSignUp] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");

  async function handleSignIn(event) {
    event.preventDefault();
    setError("");
    const passwordHash = await sha256(signIn.password);
    const user = users.find(
      (candidate) =>
        candidate.email.toLowerCase() === signIn.email.trim().toLowerCase() &&
        candidate.passwordHash === passwordHash
    );
    if (!user) {
      setError("Email or password is wrong.");
      return;
    }
    const result = await onLogin(user);
    if (!result.ok) setError(result.message);
  }

  async function handleSignUp(event) {
    event.preventDefault();
    setError("");
    if (!signUp.name.trim() || !signUp.email.trim() || !signUp.password) {
      setError("All fields are required.");
      return;
    }
    if (users.some((user) => user.email.toLowerCase() === signUp.email.trim().toLowerCase())) {
      setError("An account with that email already exists.");
      return;
    }
    const nextUser = {
      id: `u-${Date.now()}`,
      name: signUp.name.trim(),
      email: signUp.email.trim(),
      role: "viewer",
      passwordHash: await sha256(signUp.password),
    };
    saveUsers([...users, nextUser]);
    const result = await onLogin(nextUser);
    if (!result.ok) setError(result.message);
  }

  return (
    <div className="auth-page">
      <div className={`auth-container ${isSignUp ? "sign-up-mode" : ""}`}>
        <div className="form-panel sign-in">
          <form onSubmit={handleSignIn}>
            <h1>Sign in</h1>
            <SocialRow />
            <p className="form-hint">or use your account</p>
            <Message text={!isSignUp ? error : ""} />
            <input type="email" placeholder="Email" autoComplete="username" required value={signIn.email} onChange={(e) => setSignIn({ ...signIn, email: e.target.value })} />
            <input type="password" placeholder="Password" autoComplete="current-password" required value={signIn.password} onChange={(e) => setSignIn({ ...signIn, password: e.target.value })} />
            <a href="#/login" className="forgot-link">Forgot your password?</a>
            <button type="submit" className="pill-btn">Sign in</button>
            <p className="demo-note">
              Demo accounts -<br />
              <b>admin@demo.io</b> / admin123 (Admin)<br />
              <b>editor@demo.io</b> / editor123 (Editor)<br />
              <b>viewer@demo.io</b> / viewer123 (Viewer)
            </p>
            <button type="button" className="mobile-toggle link-button" onClick={() => setIsSignUp(true)}>Don't have an account? Sign up</button>
          </form>
        </div>

        <div className="form-panel sign-up">
          <form onSubmit={handleSignUp}>
            <h1>Create Account</h1>
            <SocialRow />
            <p className="form-hint">or use your email for registration</p>
            <Message text={isSignUp ? error : ""} />
            <input type="text" placeholder="Name" autoComplete="name" required value={signUp.name} onChange={(e) => setSignUp({ ...signUp, name: e.target.value })} />
            <input type="email" placeholder="Email" autoComplete="email" required value={signUp.email} onChange={(e) => setSignUp({ ...signUp, email: e.target.value })} />
            <input type="password" placeholder="Password" autoComplete="new-password" required value={signUp.password} onChange={(e) => setSignUp({ ...signUp, password: e.target.value })} />
            <button type="submit" className="pill-btn">Sign up</button>
            <button type="button" className="mobile-toggle link-button" onClick={() => setIsSignUp(false)}>Already have an account? Sign in</button>
          </form>
        </div>

        <div className="overlay-panel">
          <h1>{isSignUp ? "Welcome Back!" : "Hello, Friend!"}</h1>
          <p>{isSignUp ? "To keep connected with us please login with your personal info" : "Enter your personal details and start your journey with us"}</p>
          <button type="button" className="pill-btn ghost" onClick={() => setIsSignUp(!isSignUp)}>
            {isSignUp ? "Sign in" : "Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SocialRow() {
  return (
    <div className="social-row">
      <div className="social-btn">f</div>
      <div className="social-btn">G+</div>
      <div className="social-btn">in</div>
    </div>
  );
}

function Message({ text, success = false }) {
  return <div className={`form-error ${success ? "success" : ""} ${text ? "show" : ""}`}>{text}</div>;
}

function Shell({ user, route, navigate, logout, children }) {
  const links = [
    ["dashboard", "Item catalog"],
    ["posts", "Posts"],
    ["profile", "My profile"],
  ];
  if (can(user.role, "user:manage")) links.push(["users", "Manage users"]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand-mark link-button" onClick={() => navigate("dashboard")}>R<span>BAC</span></button>
        {links.map(([target, label]) => (
          <button key={target} className={`nav-link ${route === target ? "active" : ""}`} onClick={() => navigate(target)}>
            {label}
          </button>
        ))}
        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="user-avatar">{initials(user.name)}</div>
            <div>
              <div className="name">{user.name}</div>
              <div className="role-tag">{roleLabel[user.role]}</div>
            </div>
          </div>
          <button className="btn btn-ghost full-width" onClick={logout}>Sign out</button>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}

function DashboardPage({ user, items, saveItems }) {
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", sub: "", status: "thriving" });
  const filteredItems = useMemo(
    () => items.filter((item) => !query || `${item.name} ${item.sub}`.toLowerCase().includes(query.toLowerCase())),
    [items, query]
  );

  function addItem(event) {
    event.preventDefault();
    saveItems([...items, { id: `it-${Date.now()}`, ...form, owner: user.name }]);
    setForm({ name: "", sub: "", status: "thriving" });
    setModalOpen(false);
  }

  function uploadItem(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const guessedName = file.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ");
    saveItems([...items, { id: `it-${Date.now()}`, name: guessedName || "Untitled item", sub: `Uploaded: ${file.name}`, status: "monitor", owner: user.name }]);
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Item catalog</h1>
          <p className="lede">Everything in the system, gated by your role's permissions.</p>
        </div>
        <span className="badge">Role-based access</span>
      </div>
      <div className="stat-row">
        <Stat value={items.length} label="Total items" />
        <Stat value={items.filter((item) => item.status === "thriving").length} label="Active" />
        <Stat value={items.filter((item) => item.status === "monitor").length} label="Needs review" />
      </div>
      <div className="toolbar">
        <input className="search-input" type="text" placeholder="Search items..." value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="toolbar-actions">
          {can(user.role, "item:upload") && (
            <label className="btn btn-ghost file-label">
              Upload file
              <input type="file" hidden onChange={uploadItem} />
            </label>
          )}
          {can(user.role, "item:create") && <button className="btn btn-primary auto-width" onClick={() => setModalOpen(true)}>+ Add item</button>}
        </div>
      </div>
      <table className="data-table">
        <thead>
          <tr><th>Item</th><th>Status</th><th>Owner</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {filteredItems.length === 0 && <tr><td colSpan="4"><div className="empty-state">No items match that search.</div></td></tr>}
          {filteredItems.map((item) => (
            <tr key={item.id}>
              <td><div className="item-name">{item.name}</div><div className="item-sub">{item.sub}</div></td>
              <td><span className={`status-pill status-${item.status}`}>{item.status}</span></td>
              <td>{item.owner}</td>
              <td className="row-actions">
                {can(user.role, "item:delete") ? (
                  <button className="icon-btn danger" onClick={() => confirm("Delete this item?") && saveItems(items.filter((candidate) => candidate.id !== item.id))}>Delete</button>
                ) : <span className="muted-small">Read only</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {modalOpen && (
        <Modal title="Add item" onClose={() => setModalOpen(false)}>
          <form onSubmit={addItem}>
            <label>Name</label>
            <input required placeholder="e.g. Q3 Report" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <label>Category</label>
            <input required placeholder="e.g. Finance" value={form.sub} onChange={(e) => setForm({ ...form, sub: e.target.value })} />
            <label>Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="thriving">Active</option>
              <option value="monitor">Needs review</option>
              <option value="dormant">Archived</option>
            </select>
            <ModalActions onCancel={() => setModalOpen(false)} submitLabel="Save" />
          </form>
        </Modal>
      )}
    </>
  );
}

function Stat({ value, label }) {
  return <div className="stat-plate"><div className="num">{value}</div><div className="label">{label}</div></div>;
}

function PostsPage({ user, posts, savePosts }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ title: "", body: "" });
  const sortedPosts = posts.slice().sort((a, b) => (a.date < b.date ? 1 : -1));

  function publishPost(event) {
    event.preventDefault();
    savePosts([...posts, { id: `p-${Date.now()}`, title: form.title.trim(), body: form.body.trim(), author: user.name, date: today() }]);
    setForm({ title: "", body: "" });
    setModalOpen(false);
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Posts</h1>
          <p className="lede">Admins and editors can publish posts. Viewers can read them.</p>
        </div>
        {can(user.role, "item:create") && <button className="btn btn-primary auto-width" onClick={() => setModalOpen(true)}>+ Create post</button>}
      </div>
      {sortedPosts.length === 0 && <div className="empty-state">No posts yet.</div>}
      {sortedPosts.map((post) => (
        <article className="post-card" key={post.id}>
          <div className="post-card-head">
            <div><h3>{post.title}</h3><div className="post-meta">By {post.author} - {post.date}</div></div>
            {can(user.role, "item:delete") && <button className="icon-btn danger" onClick={() => confirm("Delete this post?") && savePosts(posts.filter((candidate) => candidate.id !== post.id))}>Delete</button>}
          </div>
          <p className="post-body">{post.body}</p>
        </article>
      ))}
      {modalOpen && (
        <Modal title="Create post" onClose={() => setModalOpen(false)}>
          <form onSubmit={publishPost}>
            <label>Title</label>
            <input required placeholder="e.g. Release notes" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <label>Content</label>
            <textarea required rows="5" placeholder="Write your post..." value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            <ModalActions onCancel={() => setModalOpen(false)} submitLabel="Publish" />
          </form>
        </Modal>
      )}
    </>
  );
}

function ProfilePage({ user, users, saveUsers }) {
  const [name, setName] = useState(user.name);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function saveProfile(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!name.trim()) {
      setError("Name can't be empty.");
      return;
    }
    const nextUsers = await Promise.all(users.map(async (candidate) => {
      if (candidate.id !== user.id) return candidate;
      return {
        ...candidate,
        name: name.trim(),
        passwordHash: password ? await sha256(password) : candidate.passwordHash,
      };
    }));
    saveUsers(nextUsers);
    setPassword("");
    setMessage("Profile updated.");
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>My profile</h1>
          <p className="lede">Your details are auto-filled from your account. Edit and save to update them.</p>
        </div>
        <span className="badge">{roleLabel[user.role]}</span>
      </div>
      <div className="modal-card inline-card">
        <Message text={error} />
        <Message text={message} success />
        <form onSubmit={saveProfile}>
          <label>Full name</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} />
          <label>Email</label>
          <input type="email" disabled value={user.email} />
          <label>Role</label>
          <input disabled value={roleLabel[user.role]} />
          <label>New password <span className="normal-label">(leave blank to keep current)</span></label>
          <input type="password" placeholder="********" value={password} onChange={(e) => setPassword(e.target.value)} />
          <div className="modal-actions start-actions">
            <button type="submit" className="btn btn-primary auto-width">Save changes</button>
          </div>
        </form>
      </div>
    </>
  );
}

function UsersPage({ currentUser, users, saveUsers, navigate }) {
  if (!can(currentUser.role, "user:manage")) {
    return (
      <div className="denied-screen">
        <p className="denied-tag">403</p>
        <h1>Access denied</h1>
        <p>Your role, <strong>{roleLabel[currentUser.role]}</strong>, does not include the <code>user:manage</code> permission.</p>
        <button className="btn btn-primary auto-width" onClick={() => navigate("dashboard")}>Back to dashboard</button>
      </div>
    );
  }

  function changeRole(userId, role) {
    saveUsers(users.map((user) => user.id === userId ? { ...user, role } : user));
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Manage users</h1>
          <p className="lede">Admins can promote or demote any account. Changes apply immediately.</p>
        </div>
        <span className="badge">Admin only</span>
      </div>
      <table className="data-table">
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th></th></tr></thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td className="item-name">{user.name}</td>
              <td>{user.email}</td>
              <td>
                <select className="role-select" disabled={user.id === currentUser.id} value={user.role} onChange={(e) => changeRole(user.id, e.target.value)}>
                  <option value="admin">Admin</option>
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
              </td>
              <td>{user.id === currentUser.id && <span className="muted-small">This is you</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop show" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal-card">
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
}

function ModalActions({ onCancel, submitLabel }) {
  return (
    <div className="modal-actions">
      <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
      <button type="submit" className="btn btn-primary auto-width">{submitLabel}</button>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
