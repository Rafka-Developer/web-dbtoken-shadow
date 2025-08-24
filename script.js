/***** GITHUB SETING *****/
const GITHUB_REPO = "Rafka-Developer/web-dbtoken-shadow";   // ganti dengan username dan repo kamu
const DATA_FILE   = "data.json";  // sesuaiin aja
const GITHUB_TOKEN = "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";   // ganti dengan token github kamu

/***** STRUKTUR *****/
let db = { tokens: [], accounts: [] };
let sha = null;
let me = null;

//Buat Struktur Nya ambil di Data.json

/***** GITHUB API *****/
async function fetchDB() {
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${DATA_FILE}`, {
      headers: { Authorization: `token ${GITHUB_TOKEN}` }
    });
    if (!res.ok) throw new Error("Fetch fail");
    const json = await res.json();
    const content = JSON.parse(atob(json.content));
    db = { tokens: content.tokens || [], accounts: content.accounts || [] };
    sha = json.sha;
  } catch (e) {
    console.error("fetchDB error:", e);
    db = db.tokens || db.accounts ? db : { tokens: [], accounts: [] };
  }
}

async function saveDB(message = "Update database.json") {
  try {
    const body = {
      message,
      content: btoa(JSON.stringify(db, null, 2)),
      sha
    };
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${DATA_FILE}`, {
      method: "PUT",
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    const json = await res.json();
    if (json && json.content && json.content.sha) sha = json.content.sha;
  } catch (e) {
    console.error("saveDB error:", e);
    showModal("Gagal menyimpan token ke GitHub. Cek token/permission repo.", "alert");
  }
}

/***** MODEL (alert / confirm / prompt) *****/
function showModal(message, type = "alert", callback = null, placeholder = "") {
  const modal = document.getElementById("modal");
  const msg = document.getElementById("modalMessage");
  const input = document.getElementById("modalInput");
  const yesBtn = document.getElementById("modalYes");
  const noBtn  = document.getElementById("modalNo");
  const okBtn  = document.getElementById("modalOk");

  msg.textContent = message;
  input.style.display = type === "prompt" ? "block" : "none";
  input.value = "";
  input.placeholder = placeholder || "Masukkan nilai...";
  yesBtn.style.display = noBtn.style.display = okBtn.style.display = "none";

  if (type === "alert") {
    okBtn.style.display = "inline-block";
    okBtn.onclick = () => { modal.style.display = "none"; if (callback) callback(); };
  } else if (type === "confirm") {
    yesBtn.style.display = noBtn.style.display = "inline-block";
    yesBtn.onclick = () => { modal.style.display = "none"; if (callback) callback(true); };
    noBtn.onclick  = () => { modal.style.display = "none"; if (callback) callback(false); };
  } else if (type === "prompt") {
    yesBtn.style.display = noBtn.style.display = "inline-block";
    yesBtn.onclick = () => { const v = input.value.trim(); modal.style.display = "none"; if (callback) callback(true, v); };
    noBtn.onclick  = () => { modal.style.display = "none"; if (callback) callback(false, null); };
  }

  modal.style.display = "flex";
}

/***** UI *****/

function showPage(id){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("page-active"));
  document.getElementById(id).classList.add("page-active");
  document.querySelectorAll(".menu-item").forEach(m=>m.classList.remove("active"));
  document.querySelector(`.menu-item[data-target="${id}"]`)?.classList.add("active");
}

function renderDashboard(){
  document.getElementById("totalTokens").innerText = db.tokens.length;
  document.getElementById("totalUsers").innerText  = db.accounts.length;
}

function renderTokens(filter = ""){
  const list = document.getElementById("tokenList");
  list.innerHTML = "";
  const items = db.tokens.filter(t => t.toLowerCase().includes(filter.toLowerCase()));
  if (items.length === 0){
    document.getElementById("emptyState").style.display = "block";
  } else {
    document.getElementById("emptyState").style.display = "none";
    items.forEach(tok=>{
      const li = document.createElement("li");
      li.className = "token-item";
      const span = document.createElement("span");
      span.className = "token-txt";
      span.textContent = tok;

      const actions = document.createElement("div");
      actions.className = "token-actions";
      const del = document.createElement("button");
      del.className = "btn danger";
      del.innerHTML = '<i class="fa-solid fa-trash"></i>';

      del.onclick = () => {
        showModal("Hapus token ini?", "confirm", async (yes)=>{
          if (!yes) return;
          db.tokens = db.tokens.filter(x => x !== tok);
          await saveDB("Delete token");
          renderTokens(document.getElementById("searchBox").value);
          renderDashboard();
          showModal("Token dihapus.", "alert");
        });
      };

      actions.appendChild(del);
      li.appendChild(span);
      li.appendChild(actions);
      list.appendChild(li);
    });
  }
}

function renderAccounts(){
  const ul = document.getElementById("manageAccounts");
  ul.innerHTML = "";
  db.accounts.forEach(acc=>{
    const li = document.createElement("li");
    li.className = "token-item";
    const left = document.createElement("span");
    left.className = "token-txt";
    left.textContent = `${acc.username} (${acc.role})`;

    const actions = document.createElement("div");
    actions.className = "token-actions";

    // ganti password
    const chg = document.createElement("button");
    chg.className = "btn";
    chg.innerHTML = '<i class="fa-solid fa-key"></i>';
    chg.onclick = () => {
      if (me.role === "user") return showModal("🚫 Tidak boleh ubah password.", "alert");

      if (me.role === "admin" && acc.role !== "user") return showModal("🚫 Admin hanya bisa ubah user.", "alert");
      if (me.role === "owner" && acc.role === "owner") return showModal("🚫 Password owner lain tidak bisa diubah.", "alert");

      showModal(`Ubah sandi untuk "${acc.username}"`, "prompt", async (yes, val)=>{
        if (!yes) return;
        if (!val) return showModal("Password baru tidak boleh kosong.", "alert");
        const target = db.accounts.find(a => a.username === acc.username);
        if (target){ 
          target.password = val; 
          await saveDB("Change password"); 
          showModal("Password diubah.", "alert"); 
        }
      }, "Password baru");
    };

    // delete account
    const del = document.createElement("button");
    del.className = "btn danger";
    del.innerHTML = '<i class="fa-solid fa-user-xmark"></i>';
    del.onclick = () => {
      if (me.role === "user") return showModal("🚫 Tidak boleh hapus akun.", "alert");
      if (me.role === "admin" && acc.role !== "user") return showModal("🚫 Admin hanya bisa hapus user.", "alert");
      if (acc.role === "owner") return showModal("🚫 Owner tidak bisa dihapus.", "alert");

      showModal(`Hapus akun "${acc.username}"?`, "confirm", async (yes)=>{
        if (!yes) return;
        db.accounts = db.accounts.filter(a => a.username !== acc.username);
        await saveDB("Delete account");
        renderAccounts();
        renderDashboard();
        showModal("Akun dihapus.", "alert");
      });
    };

    // ubah role
    const roleBtn = document.createElement("button");
    roleBtn.className = "btn";
    roleBtn.innerHTML = '<i class="fa-solid fa-user-gear"></i>';
    roleBtn.onclick = () => {
      if (me.role !== "owner") return showModal("🚫 Hanya owner yang bisa ubah role.", "alert");
      if (acc.role === "owner") return showModal("🚫 Tidak bisa ubah role owner lain.", "alert");

      showModal(`Ubah role untuk "${acc.username}"? (admin/user)`, "prompt", async (yes, val)=>{
        if (!yes) return;
        if (!["admin","user"].includes(val)) return showModal("Role hanya boleh admin / user.", "alert");
        const target = db.accounts.find(a => a.username === acc.username);
        if (target){ 
          target.role = val; 
          await saveDB("Change role"); 
          renderAccounts();
          showModal("Role diubah.", "alert"); 
        }
      }, "admin / user");
    };

    actions.appendChild(chg);
    actions.appendChild(del);
    if (me.role === "owner") actions.appendChild(roleBtn);

    li.appendChild(left);
    li.appendChild(actions);
    ul.appendChild(li);
  });
}

/***** MENU *****/
// Sidebar mobile
document.getElementById("openSidebar").onclick = () => document.getElementById("sidebar").classList.add("open");
document.getElementById("closeSidebar").onclick = () => document.getElementById("sidebar").classList.remove("open");

// Search
document.getElementById("searchBox").addEventListener("input", e => renderTokens(e.target.value));

// Ganti menu
document.querySelectorAll(".menu-item[data-target]").forEach(btn=>{
  btn.onclick = () => showPage(btn.dataset.target);
});

// Login
document.getElementById("loginForm").onsubmit = async (e) => {
  e.preventDefault();
  const u = document.getElementById("loginUsername").value.trim();
  const p = document.getElementById("loginPassword").value.trim();

  await fetchDB();
  const acc = db.accounts.find(a => a.username === u && a.password === p);
  if (!acc) return showModal("❌ Username atau password salah!", "alert");

  me = { username: acc.username, role: acc.role };
  localStorage.setItem("currentUser", JSON.stringify(me)); // SIMPAN LOGIN

  document.getElementById("loginPage").style.display = "none";
  document.getElementById("appPage").style.display = "block";
  document.getElementById("currentUser").textContent = `${me.username} • ${me.role}`;
  document.querySelectorAll(".admin-only").forEach(el => el.style.display = me.role === "admin" || me.role === "owner" { ? "block" : "none");
  renderDashboard();
  renderTokens();
  renderAccounts();
  showPage("dashboard");
};

// Logout
document.getElementById("logoutBtn").onclick = () => {
  showModal("Keluar dari akun?", "confirm", (yes)=>{
    if (!yes) return;
    me = null;
    localStorage.removeItem("currentUser"); // HAPUS LOGIN
    document.getElementById("appPage").style.display = "none";
    document.getElementById("loginPage").style.display = "flex";
  });
};

// Add Token
document.getElementById("addForm").onsubmit = async (e) => {
  e.preventDefault();
  const t = document.getElementById("tokenInput").value.trim();
  if (!t) return;
  if (db.tokens.includes(t)) return showModal("Token sudah ada!", "alert");

  showModal(`Tambah token baru?\n${t}`, "confirm", async (yes)=>{
    if (!yes) return;
    db.tokens.push(t);
    await saveDB("Add token");
    document.getElementById("tokenInput").value = "";
    renderTokens(document.getElementById("searchBox").value);
    renderDashboard();
    showModal("✅ Token berhasil ditambahkan!", "alert");
  });
};

// Add Account
document.getElementById("addAccountForm").onsubmit = async (e) => {
  e.preventDefault();
  if (!me) return showModal("Login terlebih dahulu.", "alert");

  const u = document.getElementById("newUser").value.trim();
  const p = document.getElementById("newPass").value.trim();
  let r = document.getElementById("newRole").value;

  if (!u || !p) return showModal("Lengkapi username & password.", "alert");

  if (me.role === "admin") r = "user";
  if (me.role !== "admin" && me.role !== "owner") return showModal("Hanya admin/owner yang boleh membuat akun.", "alert");

  const roleText = r === "admin" ? "Admin" : "User";
  if (db.accounts.find(a => a.username === u)) return showModal("Username sudah terdaftar.", "alert");

  showModal(`Buat akun baru "${u}" dengan role ${roleText}?`, "confirm", async (yes)=>{
    if (!yes) return;
    db.accounts.push({ username: u, password: p, role: r });
    await saveDB("Create account");
    document.getElementById("newUser").value = "";
    document.getElementById("newPass").value = "";
    renderAccounts();
    renderDashboard();
    showModal(`✅ Akun ${roleText} berhasil dibuat!`, "alert");
  });
};
window.addEventListener("load", async () => {
  const saved = localStorage.getItem("currentUser");
  if (saved) {
    me = JSON.parse(saved);
    await fetchDB();

    document.getElementById("loginPage").style.display = "none";
    document.getElementById("appPage").style.display = "block";
    document.getElementById("currentUser").textContent = `${me.username} • ${me.role}`;
    document.querySelectorAll(".admin-only").forEach(el => {if (me.role === "admin" || me.role === "owner") {el.style.display = "block";} else {el.style.display = "none";
    renderDashboard();
    renderTokens();
    renderAccounts();
    showPage("dashboard");
  }
});
