/* ===========================================================
   posts.js â€” post creation, gated by the same item permissions
   used for the catalog (item:create / item:delete).
   =========================================================== */

const POSTS_KEY = "rbac.posts";

const SEED_POSTS = [
  { id: "p-01", title: "Welcome to the dashboard", body: "This is the first post in the system. Admins and editors can create new posts here.", author: "Alice Admin", date: "2026-08-01" },
  { id: "p-02", title: "Q3 roadmap notes", body: "Draft notes on what's shipping this quarter. Still being reviewed.", author: "Eddie Editor", date: "2026-08-04" },
];

function ensureSeedPosts() {
  if (localStorage.getItem(POSTS_KEY)) return;
  localStorage.setItem(POSTS_KEY, JSON.stringify(SEED_POSTS));
}

function getPosts() {
  return JSON.parse(localStorage.getItem(POSTS_KEY) || "[]");
}

function savePosts(list) {
  localStorage.setItem(POSTS_KEY, JSON.stringify(list));
}

let postsClaims = null;

async function initPostsPage() {
  postsClaims = await window.RbacGuard.requireAuth();
  if (!postsClaims) return;
  ensureSeedPosts();

  renderPostsSidebar();
  renderPostsToolbar();
  renderPostsList();
  wirePostModal();
}

function renderPostsSidebar() {
  const initials = postsClaims.name.split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase();
  document.getElementById("userAvatar").textContent = initials;
  document.getElementById("userName").textContent = postsClaims.name;
  document.getElementById("userRole").textContent = window.RbacGuard.ROLE_LABEL[postsClaims.role] || postsClaims.role;

  const usersLink = document.getElementById("navUsers");
  if (usersLink && !window.RbacGuard.can(postsClaims.role, "user:manage")) {
    usersLink.remove();
  }
}

function renderPostsToolbar() {
  const createBtn = document.getElementById("createPostBtn");
  if (!window.RbacGuard.can(postsClaims.role, "item:create")) {
    createBtn.style.display = "none";
  } else {
    createBtn.addEventListener("click", () => openPostModal());
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function renderPostsList() {
  const list = document.getElementById("postsList");
  const posts = getPosts().slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  const canDelete = window.RbacGuard.can(postsClaims.role, "item:delete");

  if (posts.length === 0) {
    list.innerHTML = `<div class="empty-state">No posts yet.</div>`;
    return;
  }

  list.innerHTML = posts.map(p => `
    <div class="post-card">
      <div class="post-card-head">
        <div>
          <h3>${escapeHtml(p.title)}</h3>
          <div class="post-meta">By ${escapeHtml(p.author)} Â· ${escapeHtml(p.date)}</div>
        </div>
        ${canDelete ? `<button class="icon-btn danger" data-delete-post="${p.id}">Delete</button>` : ""}
      </div>
      <p class="post-body">${escapeHtml(p.body)}</p>
    </div>
  `).join("");

  list.querySelectorAll("[data-delete-post]").forEach(btn => {
    btn.addEventListener("click", () => {
      if (!confirm("Delete this post?")) return;
      savePosts(getPosts().filter(p => p.id !== btn.dataset.deletePost));
      renderPostsList();
    });
  });
}

function openPostModal() {
  document.getElementById("postForm").reset();
  document.getElementById("postModal").classList.add("show");
}

function closePostModal() {
  document.getElementById("postModal").classList.remove("show");
}

function wirePostModal() {
  document.getElementById("cancelPostModalBtn").addEventListener("click", closePostModal);
  document.getElementById("postModal").addEventListener("click", (e) => {
    if (e.target.id === "postModal") closePostModal();
  });

  document.getElementById("postForm").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!window.RbacGuard.can(postsClaims.role, "item:create")) return;

    const posts = getPosts();
    posts.push({
      id: "p-" + Date.now(),
      title: document.getElementById("pTitle").value.trim(),
      body: document.getElementById("pBody").value.trim(),
      author: postsClaims.name,
      date: new Date().toISOString().slice(0, 10),
    });
    savePosts(posts);
    closePostModal();
    renderPostsList();
  });
}

document.getElementById("logoutBtn")?.addEventListener("click", () => {
  window.RbacAuth.logout();
  window.location.href = "index.html";
});

initPostsPage();
