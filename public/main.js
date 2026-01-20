<<<<<<< HEAD
/* ===============================
   MediVibe Auth + Data (LocalStorage)
   =============================== */

/* ===== Auth ===== */
const AUTH = {
  usersKey: "mv_users",
  sessionKey: "mv_session",

  getUsers() {
    try { return JSON.parse(localStorage.getItem(this.usersKey)) || []; }
    catch { return []; }
  },
  setUsers(users) {
    localStorage.setItem(this.usersKey, JSON.stringify(users));
  },

  getSession() {
    try { return JSON.parse(localStorage.getItem(this.sessionKey)) || null; }
    catch { return null; }
  },
  setSession(session) {
    localStorage.setItem(this.sessionKey, JSON.stringify(session));
  },
  clearSession() {
    localStorage.removeItem(this.sessionKey);
  },

  findUserByEmail(email) {
    const users = this.getUsers();
    return users.find(u => (u.email || "").toLowerCase() === (email || "").trim().toLowerCase());
  },

  register({ name, email, password }) {
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanName = (name || "User").trim();

    if (!cleanEmail || !password) return { ok: false, msg: "Please enter email and password." };
    if (password.length < 4) return { ok: false, msg: "Password must be at least 4 characters." };

    const exists = this.findUserByEmail(cleanEmail);
    if (exists) return { ok: false, msg: "Account already exists. Please sign in." };

    const users = this.getUsers();
    users.push({ name: cleanName, email: cleanEmail, password });
    this.setUsers(users);

    // auto login after register
    this.setSession({ email: cleanEmail, name: cleanName, at: Date.now() });
    return { ok: true };
  },

  login({ email, password }) {
    const cleanEmail = (email || "").trim().toLowerCase();
    const user = this.findUserByEmail(cleanEmail);

    if (!user) return { ok: false, msg: "Account not found. Please create one." };
    if (user.password !== password) return { ok: false, msg: "Incorrect password." };

    this.setSession({ email: user.email, name: user.name || "User", at: Date.now() });
    return { ok: true };
  },

  logout() {
    this.clearSession();
  }
};

/* ===============================
   Helpers
   =============================== */
function escapeHtml(str){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function load(key, fallback){
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch { return fallback; }
}
function save(key, value){
  localStorage.setItem(key, JSON.stringify(value));
}

function isLoginPage() {
  return location.pathname.endsWith("/login.html") || location.pathname.endsWith("login.html");
}

function requireAuth() {
  const session = AUTH.getSession();
  if (!session) {
    const back = encodeURIComponent(location.pathname);
    window.location.href = `/login.html?next=${back}`;
    return null;
  }
  return session;
}

function autoProtectByMeta() {
  const needsAuth = document.querySelector('meta[name="mv-require-auth"]');
  if (needsAuth) requireAuth();
}

/* ===============================
   Navbar
   =============================== */
// Navbar: show correct links based on session
function hydrateNav() {
  const session = AUTH.getSession();

  const navUser = document.getElementById("navUser");
  const navLogout = document.getElementById("navLogout");
  const navLogin = document.getElementById("navLogin");
  const navOpenApp = document.getElementById("navOpenApp");

  // hide Login link on login/register pages (avoid 2x login)
  const path = (location.pathname || "").toLowerCase();
  const onAuthPage =
    path.endsWith("/login.html") || path.endsWith("login.html") ||
    path.endsWith("/register.html") || path.endsWith("register.html");

  if (navLogin) {
    navLogin.style.display = (onAuthPage || session) ? "none" : "inline-flex";
  }

  if (navUser) {
    navUser.textContent = session ? (session.name || session.email) : "";
    navUser.style.display = session ? "inline-flex" : "none";
  }

  if (navLogout) {
    navLogout.style.display = session ? "inline-flex" : "none";
    navLogout.onclick = (e) => {
      e.preventDefault();
      AUTH.logout();
      window.location.href = "/index.html";
    };
  }

  if (navOpenApp) {
    navOpenApp.onclick = (e) => {
      e.preventDefault();
      const s = AUTH.getSession();
      window.location.href = s ? "/dashboard.html" : "/login.html";
    };
  }
}

function bindNavPendingBadge(){
  const badge = document.getElementById("navPendingBadge");
  if (!badge) return;

  const reminders = load("mv_reminders", []);
  const pending = reminders.filter(r => (r.status || "pending") === "pending").length;

  if (pending > 0){
    badge.textContent = String(pending);
    badge.style.display = "inline-flex";
  } else {
    badge.style.display = "none";
  }
}

/* ===============================
   Landing page
   =============================== */
function bindLandingButtons() {
  const openAppBtn = document.getElementById("openAppBtn");
  if (openAppBtn) {
    openAppBtn.onclick = (e) => {
      e.preventDefault();
      const s = AUTH.getSession();
      window.location.href = s ? "/dashboard.html" : "/login.html";
    };
  }
}

/* ===============================
   Auth forms (Login/Register)
   =============================== */
function bindAuthForms() {
  // LOGIN
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("loginEmail")?.value || "";
      const password = document.getElementById("loginPassword")?.value || "";

      const res = AUTH.login({ email, password });
      const err = document.getElementById("loginError");
      if (!res.ok) {
        if (err) err.textContent = res.msg;
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const next = params.get("next");
      window.location.href = next || "/dashboard.html";
    });
  }

  // REGISTER
  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("regName")?.value || "User";
      const email = document.getElementById("regEmail")?.value || "";
      const password = document.getElementById("regPassword")?.value || "";

      const res = AUTH.register({ name, email, password });
      const err = document.getElementById("registerError");
      if (!res.ok) {
        if (err) err.textContent = res.msg;
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const next = params.get("next");
      window.location.href = next || "/dashboard.html";
    });
  }
}

/* ===============================
   Settings
   =============================== */
function bindSettingsPage() {
  const emailText = document.getElementById("emailText");
  if (emailText) {
    const s = AUTH.getSession();
    emailText.textContent = s?.email || "—";
  }

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      AUTH.logout();
      window.location.href = "/index.html";
    };
  }
}

/* ===============================
   Medications
   =============================== */
function bindMedicationsPage(){
  const form = document.getElementById("medForm");
  if (!form) return;

  const KEY = "mv_meds";
  const listEl = document.getElementById("medList");
  const emptyEl = document.getElementById("medEmpty");
  const countEl = document.getElementById("medCount");
  const errEl = document.getElementById("medError");

  const nameEl = document.getElementById("medName");
  const doseEl = document.getElementById("medDose");
  const timesEl = document.getElementById("medTimes");

  function render(){
    const items = load(KEY, []);
    if (countEl) countEl.textContent = `${items.length} item${items.length===1?"":"s"}`;

    if (listEl) listEl.innerHTML = "";

    if (!items.length){
      if (emptyEl) emptyEl.style.display = "block";
      return;
    }
    if (emptyEl) emptyEl.style.display = "none";

    items.forEach((m) => {
      const row = document.createElement("div");
      row.className = "medItem";
      row.innerHTML = `
        <div class="medMain">
          <div class="medDot"></div>
          <div>
            <div class="medTitle">${escapeHtml(m.name)}</div>
            <div class="medMeta">
              Dosage: <b>${escapeHtml(m.dose)}</b><br/>
              Times/day: <b>${escapeHtml(String(m.times))}</b>
            </div>
          </div>
        </div>
        <div class="medActions">
          <button class="iconBtn danger" title="Delete" data-del="${m.id}">✕</button>
        </div>
      `;
      listEl.appendChild(row);
    });

    listEl.querySelectorAll("[data-del]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-del");
        const items2 = load(KEY, []).filter(x => String(x.id) !== String(id));
        save(KEY, items2);
        render();
        refreshDashboardWidgets();
      });
    });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (errEl) errEl.textContent = "";

    const name = (nameEl.value || "").trim();
    const dose = (doseEl.value || "").trim();
    const times = parseInt(timesEl.value || "1", 10);

    if (!name || !dose || !times || times < 1){
      if (errEl) errEl.textContent = "Please fill in all fields correctly.";
      return;
    }

    const items = load(KEY, []);
    items.unshift({ id: Date.now(), name, dose, times });
    save(KEY, items);

    nameEl.value = "";
    doseEl.value = "";
    timesEl.value = "1";

    render();
    refreshDashboardWidgets();
  });

  render();
}

/* ===============================
   Reminders
   =============================== */
function bindRemindersPage(){
  const form = document.getElementById("remForm");
  if (!form) return;

  const MEDS_KEY = "mv_meds";
  const REM_KEY  = "mv_reminders";
  const LOG_KEY  = "mv_logs";

  const medSelect = document.getElementById("remMed");
  const timeEl = document.getElementById("remTime");
  const errEl = document.getElementById("remError");

  const listEl = document.getElementById("remList");
  const emptyEl = document.getElementById("remEmpty");
  const countEl = document.getElementById("remCount");
  const genBtn = document.getElementById("generateBtn");

  function hydrateMeds(){
    const meds = load(MEDS_KEY, []);
    medSelect.innerHTML = "";

    if (!meds.length){
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No medications found (add meds first)";
      medSelect.appendChild(opt);
      medSelect.disabled = true;
      return;
    }

    medSelect.disabled = false;
    meds.forEach(m => {
      const opt = document.createElement("option");
      opt.value = String(m.id);
      opt.textContent = `${m.name} (${m.dose})`;
      medSelect.appendChild(opt);
    });
  }

  function sortByTime(items){
    return items.slice().sort((a,b) => (a.time || "").localeCompare(b.time || ""));
  }

  function render(){
    const reminders = sortByTime(load(REM_KEY, []));
    if (countEl) countEl.textContent = `${reminders.length} item${reminders.length===1?"":"s"}`;

    listEl.innerHTML = "";

    if (!reminders.length){
      if (emptyEl) emptyEl.style.display = "block";
      return;
    }
    if (emptyEl) emptyEl.style.display = "none";

    reminders.forEach(r => {
      const badgeClass = r.status === "taken" ? "taken" : (r.status === "missed" ? "missed" : "");
      const badgeText  = r.status === "taken" ? "Taken" : (r.status === "missed" ? "Missed" : "Pending");

      const row = document.createElement("div");
      row.className = "remItem";
      row.innerHTML = `
        <div class="remMain">
          <div class="medDot"></div>
          <div>
            <div class="remTime">${escapeHtml(r.time)}</div>
            <div class="remMeta">
              <b>${escapeHtml(r.medName)}</b> • ${escapeHtml(r.medDose)}
            </div>
            <div style="margin-top:8px;">
              <span class="remBadge ${badgeClass}">${badgeText}</span>
            </div>
          </div>
        </div>

        <div class="remActions">
          <button class="smallBtn taken" data-act="taken" data-id="${r.id}">Taken</button>
          <button class="smallBtn missed" data-act="missed" data-id="${r.id}">Missed</button>
          <button class="smallBtn danger" data-act="delete" data-id="${r.id}">Delete</button>
        </div>
      `;
      listEl.appendChild(row);
    });

    listEl.querySelectorAll("[data-act]").forEach(btn => {
      btn.addEventListener("click", () => {
        const act = btn.getAttribute("data-act");
        const id = String(btn.getAttribute("data-id"));

        let reminders = load(REM_KEY, []);

        if (act === "delete"){
          reminders = reminders.filter(x => String(x.id) !== id);
          save(REM_KEY, reminders);
          render();
          refreshDashboardWidgets();
          return;
        }

        if (act === "taken" || act === "missed"){
          reminders = reminders.map(x => {
            if (String(x.id) !== id) return x;
            return { ...x, status: act };
          });
          save(REM_KEY, reminders);

          const logs = load(LOG_KEY, []);
          const item = reminders.find(x => String(x.id) === id);
          if (item){
            logs.unshift({
              id: Date.now(),
              at: Date.now(),
              time: item.time,
              medName: item.medName,
              medDose: item.medDose,
              status: act === "taken" ? "Taken" : "Missed"
            });
            save(LOG_KEY, logs.slice(0, 200));
          }

          render();
          refreshDashboardWidgets();
        }
      });
    });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (errEl) errEl.textContent = "";

    const meds = load(MEDS_KEY, []);
    if (!meds.length){
      if (errEl) errEl.textContent = "Add medications first.";
      return;
    }

    const medId = String(medSelect.value || "");
    const med = meds.find(m => String(m.id) === medId);
    if (!med){
      if (errEl) errEl.textContent = "Please select a medication.";
      return;
    }

    const time = (timeEl.value || "").trim();
    if (!time){
      if (errEl) errEl.textContent = "Please select a time.";
      return;
    }

    const reminders = load(REM_KEY, []);
    reminders.push({
      id: Date.now(),
      time,
      medId: med.id,
      medName: med.name,
      medDose: med.dose,
      status: "pending"
    });
    save(REM_KEY, reminders);

    render();
    refreshDashboardWidgets();
  });

  if (genBtn){
    genBtn.addEventListener("click", () => {
      if (errEl) errEl.textContent = "";
      const meds = load(MEDS_KEY, []);
      if (!meds.length){
        if (errEl) errEl.textContent = "Add medications first.";
        return;
      }

      const baseTimes = ["08:00","14:00","20:00","22:00"];
      let reminders = load(REM_KEY, []);

      meds.forEach(m => {
        const n = Math.max(1, Math.min(6, parseInt(m.times || 1, 10)));
        for (let i=0; i<n; i++){
          const t = baseTimes[i] || baseTimes[baseTimes.length-1];

          const exists = reminders.some(r => String(r.medId)===String(m.id) && r.time===t);
          if (exists) continue;

          reminders.push({
            id: Date.now() + Math.floor(Math.random()*1000),
            time: t,
            medId: m.id,
            medName: m.name,
            medDose: m.dose,
            status: "pending"
          });
        }
      });

      save(REM_KEY, reminders);
      render();
      refreshDashboardWidgets();
    });
  }

  hydrateMeds();
  render();
  refreshDashboardWidgets();
}

/* ===============================
   History
   =============================== */
function bindHistoryPage(){
  const tbody = document.getElementById("logList");
  if (!tbody) return;

  const KEY = "mv_logs";
  const emptyEl = document.getElementById("logEmpty");
  const clearBtn = document.getElementById("clearHistoryBtn");
  const sumTaken = document.getElementById("sumTaken");
  const sumMissed = document.getElementById("sumMissed");
  const sumRate = document.getElementById("sumRate");
  const rateBar = document.getElementById("rateBar");
  const filterEl = document.getElementById("logFilter");
  const rangeEl = document.getElementById("logRange");

  function fmtDate(ts){
    try{ return new Date(ts).toLocaleDateString(); }catch{ return "—"; }
  }
  function fmtStamp(ts){
    try{ return new Date(ts).toLocaleString(); }catch{ return "—"; }
  }
  function withinRange(ts, range){
    if (range === "all") return true;
    const days = parseInt(range, 10);
    if (!days) return true;
    const now = Date.now();
    const from = now - (days * 24 * 60 * 60 * 1000);
    return (ts || 0) >= from;
  }

  function render(){
    const logsAll = load(KEY, []);

    const type = filterEl ? filterEl.value : "all";
    const range = rangeEl ? rangeEl.value : "7";

    const logs = logsAll.filter(l => {
      if (!withinRange(l.at, range)) return false;
      if (type === "all") return true;
      return l.status === type;
    });

    // summary uses last 7 days
    const last7 = logsAll.filter(l => withinRange(l.at, "7"));
    const taken7 = last7.filter(x => x.status === "Taken").length;
    const missed7 = last7.filter(x => x.status === "Missed").length;
    const total7 = taken7 + missed7;
    const rate7 = total7 ? Math.round((taken7/total7)*100) : 0;

    if (sumTaken) sumTaken.textContent = String(taken7);
    if (sumMissed) sumMissed.textContent = String(missed7);
    if (sumRate) sumRate.textContent = `${rate7}%`;
    if (rateBar){
      rateBar.style.width = `${rate7}%`;
      rateBar.textContent = `${rate7}%`;
    }

    tbody.innerHTML = "";

    if (!logs.length){
      if (emptyEl) emptyEl.style.display = "block";
      return;
    } else {
      if (emptyEl) emptyEl.style.display = "none";
    }

    logs.slice(0, 120).forEach(l => {
      const tr = document.createElement("tr");
      const badgeClass = l.status === "Taken" ? "taken" : "missed";
      tr.innerHTML = `
        <td title="${escapeHtml(fmtStamp(l.at))}">${escapeHtml(fmtDate(l.at))}</td>
        <td>${escapeHtml(l.time || "—")}</td>
        <td><b>${escapeHtml(l.medName || "Medication")}</b></td>
        <td>${escapeHtml(l.medDose || "—")}</td>
        <td><span class="badgePill ${badgeClass}">${escapeHtml(l.status || "—")}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }

  if (clearBtn){
    clearBtn.addEventListener("click", () => {
      localStorage.removeItem(KEY);
      render();
      refreshDashboardWidgets();
    });
  }
  if (filterEl) filterEl.addEventListener("change", render);
  if (rangeEl) rangeEl.addEventListener("change", render);

  render();
}

/* ===============================
   Dashboard stats
   =============================== */
function bindDashboardPage(){
  const mini = document.getElementById("navUserMini");
  const acc = document.getElementById("accountEmail");
  const bar = document.getElementById("adherenceBar");

  // optional counters
  const medsEl = document.getElementById("dashMeds");
  const remEl = document.getElementById("dashReminders");
  const pendingEl = document.getElementById("dashPending");

  if (!mini && !acc && !bar && !medsEl && !remEl && !pendingEl) return;

  const s = load("mv_session", null);
  const label = s ? (s.name || s.email || "User") : "—";
  const email = s ? (s.email || "—") : "—";
  if (mini) mini.textContent = label;
  if (acc) acc.textContent = email;

  const meds = load("mv_meds", []);
  const reminders = load("mv_reminders", []);
  const pending = reminders.filter(r => (r.status || "pending") === "pending").length;

  if (medsEl) medsEl.textContent = String(meds.length);
  if (remEl) remEl.textContent = String(reminders.length);
  if (pendingEl) pendingEl.textContent = String(pending);

  const logs = load("mv_logs", []);
  const now = Date.now();
  const weekAgo = now - (7 * 24 * 60 * 60 * 1000);

  const recent = logs.filter(l => (l.at || 0) >= weekAgo);
  const taken = recent.filter(l => l.status === "Taken").length;
  const missed = recent.filter(l => l.status === "Missed").length;
  const total = taken + missed;
  const rate = total ? Math.round((taken / total) * 100) : 0;

  if (bar){
    bar.style.width = `${rate}%`;
    bar.textContent = `${rate}%`;
  }
}

/* ===============================
   Dashboard Upcoming Reminders
   =============================== */
function bindUpcomingReminders(){
  const box = document.getElementById("upcomingList");
  if (!box) return;

  const REM_KEY = "mv_reminders";
  const LOG_KEY = "mv_logs";

  function render(){
    const remindersAll = load(REM_KEY, []);
    const upcoming = remindersAll
      .filter(r => (r.status || "pending") === "pending")
      .sort((a,b) => (a.time || "").localeCompare(b.time || ""))
      .slice(0,3);

    if (!upcoming.length){
      box.innerHTML = `<p class="muted">No reminders scheduled.</p>`;
      return;
    }

    box.innerHTML = upcoming.map(r => `
      <div class="item">
        <div>
          <b>${escapeHtml(r.medName || r.name || "Medication")}</b>
          <div class="muted">${escapeHtml(r.time || "--:--")} • ${escapeHtml(r.medDose || "")}</div>
        </div>

        <div class="upAct">
          <button class="upBtn taken" data-up="taken" data-id="${r.id}">Taken</button>
          <button class="upBtn missed" data-up="missed" data-id="${r.id}">Missed</button>
          <button class="upBtn delete" data-up="delete" data-id="${r.id}">✕</button>
        </div>
      </div>
    `).join("");

    box.querySelectorAll("[data-up]").forEach(btn => {
      btn.addEventListener("click", () => {
        const act = btn.getAttribute("data-up");
        const id = String(btn.getAttribute("data-id"));

        let reminders = load(REM_KEY, []);

        if (act === "delete"){
          reminders = reminders.filter(x => String(x.id) !== id);
          save(REM_KEY, reminders);
          render();
          refreshDashboardWidgets();
          return;
        }

        if (act === "taken" || act === "missed"){
          reminders = reminders.map(x => {
            if (String(x.id) !== id) return x;
            return { ...x, status: act };
          });
          save(REM_KEY, reminders);

          const item = reminders.find(x => String(x.id) === id);
          if (item){
            const logs = load(LOG_KEY, []);
            logs.unshift({
              id: Date.now(),
              at: Date.now(),
              time: item.time,
              medName: item.medName || item.name || "Medication",
              medDose: item.medDose || "",
              status: act === "taken" ? "Taken" : "Missed"
            });
            save(LOG_KEY, logs.slice(0,200));
          }

          render();
          refreshDashboardWidgets();
        }
      });
    });
  }

  render();
}

/* ===============================
   Refresh dashboard UI (single call)
   =============================== */
function refreshDashboardWidgets(){
  if (typeof bindDashboardPage === "function") bindDashboardPage();
  if (typeof bindUpcomingReminders === "function") bindUpcomingReminders();
  if (typeof bindNavPendingBadge === "function") bindNavPendingBadge();
}
/* ===== Profile ===== */

/* ===== Profile ===== */

function bindProfilePage(){
  const form = document.getElementById("profileForm");
  if (!form) return;

  const errEl = document.getElementById("profileError");

  const nameEl = document.getElementById("profName");
  const emailEl = document.getElementById("profEmail");
  const phoneEl = document.getElementById("profPhone");
  const dobEl = document.getElementById("profDob");
  const genderEl = document.getElementById("profGender");
  const addrEl = document.getElementById("profAddress");
  const eNameEl = document.getElementById("profEName");
  const ePhoneEl = document.getElementById("profEPhone");

  const passEl = document.getElementById("profPass");
  const pass2El = document.getElementById("profPass2");

  const logoutBtn = document.getElementById("logoutBtn");

  const session = AUTH.getSession();
  if (!session) return;

  function setMsg(msg){
    if (errEl) errEl.textContent = msg || "";
  }

  // load user record
  const users = AUTH.getUsers();
  const idx = users.findIndex(u => (u.email || "").toLowerCase() === (session.email || "").toLowerCase());
  if (idx === -1){
    AUTH.logout();
    window.location.href = "/login.html";
    return;
  }

  const user = users[idx];

  // fill current
  nameEl.value = user.name || session.name || "User";
  emailEl.value = user.email || session.email || "";

  // extra profile fields stored inside user.profile
  const p = user.profile || {};
  if (phoneEl) phoneEl.value = p.phone || "";
  if (dobEl) dobEl.value = p.dob || "";
  if (genderEl) genderEl.value = p.gender || "";
  if (addrEl) addrEl.value = p.address || "";
  if (eNameEl) eNameEl.value = p.emergencyName || "";
  if (ePhoneEl) ePhoneEl.value = p.emergencyPhone || "";

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    setMsg("");

    const newName = (nameEl.value || "").trim();
    if (!newName){
      setMsg("Full name cannot be empty.");
      return;
    }

    const newPass = (passEl.value || "").trim();
    const newPass2 = (pass2El.value || "").trim();
    if (newPass || newPass2){
      if (newPass.length < 4){
        setMsg("New password must be at least 4 characters.");
        return;
      }
      if (newPass !== newPass2){
        setMsg("Passwords do not match.");
        return;
      }
    }

    // update base fields
    users[idx].name = newName;
    if (newPass) users[idx].password = newPass;

    // update profile object
    users[idx].profile = {
      phone: (phoneEl?.value || "").trim(),
      dob: (dobEl?.value || "").trim(),
      gender: (genderEl?.value || "").trim(),
      address: (addrEl?.value || "").trim(),
      emergencyName: (eNameEl?.value || "").trim(),
      emergencyPhone: (ePhoneEl?.value || "").trim(),
      updatedAt: Date.now()
    };

    AUTH.setUsers(users);

    // update session for navbar
    AUTH.setSession({ ...session, name: newName, at: Date.now() });

    // clear pass
    if (passEl) passEl.value = "";
    if (pass2El) pass2El.value = "";

    hydrateNav();
    setMsg("Saved successfully.");
    setTimeout(() => setMsg(""), 1200);
  });

  if (logoutBtn){
    logoutBtn.addEventListener("click", () => {
      AUTH.logout();
      window.location.href = "/index.html";
    });
  }
}

/* ===============================
   RUN
   =============================== */
document.addEventListener("DOMContentLoaded", () => {
  // If already logged in, block login page
  const s = AUTH.getSession();
  if (isLoginPage() && s) {
    window.location.href = "/dashboard.html";
    return;
  }
let deferredPrompt;
const installBtn = document.getElementById('installBtn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (installBtn) installBtn.style.display = 'inline-block';
});

if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    deferredPrompt = null;
  });
}

  // Protect pages that require auth
  autoProtectByMeta();

  // UI bindings
  hydrateNav();
  bindNavPendingBadge();

  bindLandingButtons();
  bindAuthForms();

  bindSettingsPage();
  bindMedicationsPage();
  bindRemindersPage();
  bindHistoryPage();
  bindDashboardPage();
  bindUpcomingReminders();
  bindProfilePage();

});
=======
/* ===============================
   MediVibe Auth + Data (LocalStorage)
   =============================== */

/* ===== Auth ===== */
const AUTH = {
  usersKey: "mv_users",
  sessionKey: "mv_session",

  getUsers() {
    try { return JSON.parse(localStorage.getItem(this.usersKey)) || []; }
    catch { return []; }
  },
  setUsers(users) {
    localStorage.setItem(this.usersKey, JSON.stringify(users));
  },

  getSession() {
    try { return JSON.parse(localStorage.getItem(this.sessionKey)) || null; }
    catch { return null; }
  },
  setSession(session) {
    localStorage.setItem(this.sessionKey, JSON.stringify(session));
  },
  clearSession() {
    localStorage.removeItem(this.sessionKey);
  },

  findUserByEmail(email) {
    const users = this.getUsers();
    return users.find(u => (u.email || "").toLowerCase() === (email || "").trim().toLowerCase());
  },

  register({ name, email, password }) {
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanName = (name || "User").trim();

    if (!cleanEmail || !password) return { ok: false, msg: "Please enter email and password." };
    if (password.length < 4) return { ok: false, msg: "Password must be at least 4 characters." };

    const exists = this.findUserByEmail(cleanEmail);
    if (exists) return { ok: false, msg: "Account already exists. Please sign in." };

    const users = this.getUsers();
    users.push({ name: cleanName, email: cleanEmail, password });
    this.setUsers(users);

    // auto login after register
    this.setSession({ email: cleanEmail, name: cleanName, at: Date.now() });
    return { ok: true };
  },

  login({ email, password }) {
    const cleanEmail = (email || "").trim().toLowerCase();
    const user = this.findUserByEmail(cleanEmail);

    if (!user) return { ok: false, msg: "Account not found. Please create one." };
    if (user.password !== password) return { ok: false, msg: "Incorrect password." };

    this.setSession({ email: user.email, name: user.name || "User", at: Date.now() });
    return { ok: true };
  },

  logout() {
    this.clearSession();
  }
};

/* ===============================
   Helpers
   =============================== */
function escapeHtml(str){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function load(key, fallback){
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch { return fallback; }
}
function save(key, value){
  localStorage.setItem(key, JSON.stringify(value));
}

function isLoginPage() {
  return location.pathname.endsWith("/login.html") || location.pathname.endsWith("login.html");
}

function requireAuth() {
  const session = AUTH.getSession();
  if (!session) {
    const back = encodeURIComponent(location.pathname);
    window.location.href = `/login.html?next=${back}`;
    return null;
  }
  return session;
}

function autoProtectByMeta() {
  const needsAuth = document.querySelector('meta[name="mv-require-auth"]');
  if (needsAuth) requireAuth();
}

/* ===============================
   Navbar
   =============================== */
// Navbar: show correct links based on session
function hydrateNav() {
  const session = AUTH.getSession();

  const navUser = document.getElementById("navUser");
  const navLogout = document.getElementById("navLogout");
  const navLogin = document.getElementById("navLogin");
  const navOpenApp = document.getElementById("navOpenApp");

  // hide Login link on login/register pages (avoid 2x login)
  const path = (location.pathname || "").toLowerCase();
  const onAuthPage =
    path.endsWith("/login.html") || path.endsWith("login.html") ||
    path.endsWith("/register.html") || path.endsWith("register.html");

  if (navLogin) {
    navLogin.style.display = (onAuthPage || session) ? "none" : "inline-flex";
  }

  if (navUser) {
    navUser.textContent = session ? (session.name || session.email) : "";
    navUser.style.display = session ? "inline-flex" : "none";
  }

  if (navLogout) {
    navLogout.style.display = session ? "inline-flex" : "none";
    navLogout.onclick = (e) => {
      e.preventDefault();
      AUTH.logout();
      window.location.href = "/index.html";
    };
  }

  if (navOpenApp) {
    navOpenApp.onclick = (e) => {
      e.preventDefault();
      const s = AUTH.getSession();
      window.location.href = s ? "/dashboard.html" : "/login.html";
    };
  }
}

function bindNavPendingBadge(){
  const badge = document.getElementById("navPendingBadge");
  if (!badge) return;

  const reminders = load("mv_reminders", []);
  const pending = reminders.filter(r => (r.status || "pending") === "pending").length;

  if (pending > 0){
    badge.textContent = String(pending);
    badge.style.display = "inline-flex";
  } else {
    badge.style.display = "none";
  }
}

/* ===============================
   Landing page
   =============================== */
function bindLandingButtons() {
  const openAppBtn = document.getElementById("openAppBtn");
  if (openAppBtn) {
    openAppBtn.onclick = (e) => {
      e.preventDefault();
      const s = AUTH.getSession();
      window.location.href = s ? "/dashboard.html" : "/login.html";
    };
  }
}

/* ===============================
   Auth forms (Login/Register)
   =============================== */
function bindAuthForms() {
  // LOGIN
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("loginEmail")?.value || "";
      const password = document.getElementById("loginPassword")?.value || "";

      const res = AUTH.login({ email, password });
      const err = document.getElementById("loginError");
      if (!res.ok) {
        if (err) err.textContent = res.msg;
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const next = params.get("next");
      window.location.href = next || "/dashboard.html";
    });
  }

  // REGISTER
  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("regName")?.value || "User";
      const email = document.getElementById("regEmail")?.value || "";
      const password = document.getElementById("regPassword")?.value || "";

      const res = AUTH.register({ name, email, password });
      const err = document.getElementById("registerError");
      if (!res.ok) {
        if (err) err.textContent = res.msg;
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const next = params.get("next");
      window.location.href = next || "/dashboard.html";
    });
  }
}

/* ===============================
   Settings
   =============================== */
function bindSettingsPage() {
  const emailText = document.getElementById("emailText");
  if (emailText) {
    const s = AUTH.getSession();
    emailText.textContent = s?.email || "—";
  }

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      AUTH.logout();
      window.location.href = "/index.html";
    };
  }
}

/* ===============================
   Medications
   =============================== */
function bindMedicationsPage(){
  const form = document.getElementById("medForm");
  if (!form) return;

  const KEY = "mv_meds";
  const listEl = document.getElementById("medList");
  const emptyEl = document.getElementById("medEmpty");
  const countEl = document.getElementById("medCount");
  const errEl = document.getElementById("medError");

  const nameEl = document.getElementById("medName");
  const doseEl = document.getElementById("medDose");
  const timesEl = document.getElementById("medTimes");

  function render(){
    const items = load(KEY, []);
    if (countEl) countEl.textContent = `${items.length} item${items.length===1?"":"s"}`;

    if (listEl) listEl.innerHTML = "";

    if (!items.length){
      if (emptyEl) emptyEl.style.display = "block";
      return;
    }
    if (emptyEl) emptyEl.style.display = "none";

    items.forEach((m) => {
      const row = document.createElement("div");
      row.className = "medItem";
      row.innerHTML = `
        <div class="medMain">
          <div class="medDot"></div>
          <div>
            <div class="medTitle">${escapeHtml(m.name)}</div>
            <div class="medMeta">
              Dosage: <b>${escapeHtml(m.dose)}</b><br/>
              Times/day: <b>${escapeHtml(String(m.times))}</b>
            </div>
          </div>
        </div>
        <div class="medActions">
          <button class="iconBtn danger" title="Delete" data-del="${m.id}">✕</button>
        </div>
      `;
      listEl.appendChild(row);
    });

    listEl.querySelectorAll("[data-del]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-del");
        const items2 = load(KEY, []).filter(x => String(x.id) !== String(id));
        save(KEY, items2);
        render();
        refreshDashboardWidgets();
      });
    });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (errEl) errEl.textContent = "";

    const name = (nameEl.value || "").trim();
    const dose = (doseEl.value || "").trim();
    const times = parseInt(timesEl.value || "1", 10);

    if (!name || !dose || !times || times < 1){
      if (errEl) errEl.textContent = "Please fill in all fields correctly.";
      return;
    }

    const items = load(KEY, []);
    items.unshift({ id: Date.now(), name, dose, times });
    save(KEY, items);

    nameEl.value = "";
    doseEl.value = "";
    timesEl.value = "1";

    render();
    refreshDashboardWidgets();
  });

  render();
}

/* ===============================
   Reminders
   =============================== */
function bindRemindersPage(){
  const form = document.getElementById("remForm");
  if (!form) return;

  const MEDS_KEY = "mv_meds";
  const REM_KEY  = "mv_reminders";
  const LOG_KEY  = "mv_logs";

  const medSelect = document.getElementById("remMed");
  const timeEl = document.getElementById("remTime");
  const errEl = document.getElementById("remError");

  const listEl = document.getElementById("remList");
  const emptyEl = document.getElementById("remEmpty");
  const countEl = document.getElementById("remCount");
  const genBtn = document.getElementById("generateBtn");

  function hydrateMeds(){
    const meds = load(MEDS_KEY, []);
    medSelect.innerHTML = "";

    if (!meds.length){
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No medications found (add meds first)";
      medSelect.appendChild(opt);
      medSelect.disabled = true;
      return;
    }

    medSelect.disabled = false;
    meds.forEach(m => {
      const opt = document.createElement("option");
      opt.value = String(m.id);
      opt.textContent = `${m.name} (${m.dose})`;
      medSelect.appendChild(opt);
    });
  }

  function sortByTime(items){
    return items.slice().sort((a,b) => (a.time || "").localeCompare(b.time || ""));
  }

  function render(){
    const reminders = sortByTime(load(REM_KEY, []));
    if (countEl) countEl.textContent = `${reminders.length} item${reminders.length===1?"":"s"}`;

    listEl.innerHTML = "";

    if (!reminders.length){
      if (emptyEl) emptyEl.style.display = "block";
      return;
    }
    if (emptyEl) emptyEl.style.display = "none";

    reminders.forEach(r => {
      const badgeClass = r.status === "taken" ? "taken" : (r.status === "missed" ? "missed" : "");
      const badgeText  = r.status === "taken" ? "Taken" : (r.status === "missed" ? "Missed" : "Pending");

      const row = document.createElement("div");
      row.className = "remItem";
      row.innerHTML = `
        <div class="remMain">
          <div class="medDot"></div>
          <div>
            <div class="remTime">${escapeHtml(r.time)}</div>
            <div class="remMeta">
              <b>${escapeHtml(r.medName)}</b> • ${escapeHtml(r.medDose)}
            </div>
            <div style="margin-top:8px;">
              <span class="remBadge ${badgeClass}">${badgeText}</span>
            </div>
          </div>
        </div>

        <div class="remActions">
          <button class="smallBtn taken" data-act="taken" data-id="${r.id}">Taken</button>
          <button class="smallBtn missed" data-act="missed" data-id="${r.id}">Missed</button>
          <button class="smallBtn danger" data-act="delete" data-id="${r.id}">Delete</button>
        </div>
      `;
      listEl.appendChild(row);
    });

    listEl.querySelectorAll("[data-act]").forEach(btn => {
      btn.addEventListener("click", () => {
        const act = btn.getAttribute("data-act");
        const id = String(btn.getAttribute("data-id"));

        let reminders = load(REM_KEY, []);

        if (act === "delete"){
          reminders = reminders.filter(x => String(x.id) !== id);
          save(REM_KEY, reminders);
          render();
          refreshDashboardWidgets();
          return;
        }

        if (act === "taken" || act === "missed"){
          reminders = reminders.map(x => {
            if (String(x.id) !== id) return x;
            return { ...x, status: act };
          });
          save(REM_KEY, reminders);

          const logs = load(LOG_KEY, []);
          const item = reminders.find(x => String(x.id) === id);
          if (item){
            logs.unshift({
              id: Date.now(),
              at: Date.now(),
              time: item.time,
              medName: item.medName,
              medDose: item.medDose,
              status: act === "taken" ? "Taken" : "Missed"
            });
            save(LOG_KEY, logs.slice(0, 200));
          }

          render();
          refreshDashboardWidgets();
        }
      });
    });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (errEl) errEl.textContent = "";

    const meds = load(MEDS_KEY, []);
    if (!meds.length){
      if (errEl) errEl.textContent = "Add medications first.";
      return;
    }

    const medId = String(medSelect.value || "");
    const med = meds.find(m => String(m.id) === medId);
    if (!med){
      if (errEl) errEl.textContent = "Please select a medication.";
      return;
    }

    const time = (timeEl.value || "").trim();
    if (!time){
      if (errEl) errEl.textContent = "Please select a time.";
      return;
    }

    const reminders = load(REM_KEY, []);
    reminders.push({
      id: Date.now(),
      time,
      medId: med.id,
      medName: med.name,
      medDose: med.dose,
      status: "pending"
    });
    save(REM_KEY, reminders);

    render();
    refreshDashboardWidgets();
  });

  if (genBtn){
    genBtn.addEventListener("click", () => {
      if (errEl) errEl.textContent = "";
      const meds = load(MEDS_KEY, []);
      if (!meds.length){
        if (errEl) errEl.textContent = "Add medications first.";
        return;
      }

      const baseTimes = ["08:00","14:00","20:00","22:00"];
      let reminders = load(REM_KEY, []);

      meds.forEach(m => {
        const n = Math.max(1, Math.min(6, parseInt(m.times || 1, 10)));
        for (let i=0; i<n; i++){
          const t = baseTimes[i] || baseTimes[baseTimes.length-1];

          const exists = reminders.some(r => String(r.medId)===String(m.id) && r.time===t);
          if (exists) continue;

          reminders.push({
            id: Date.now() + Math.floor(Math.random()*1000),
            time: t,
            medId: m.id,
            medName: m.name,
            medDose: m.dose,
            status: "pending"
          });
        }
      });

      save(REM_KEY, reminders);
      render();
      refreshDashboardWidgets();
    });
  }

  hydrateMeds();
  render();
  refreshDashboardWidgets();
}

/* ===============================
   History
   =============================== */
function bindHistoryPage(){
  const tbody = document.getElementById("logList");
  if (!tbody) return;

  const KEY = "mv_logs";
  const emptyEl = document.getElementById("logEmpty");
  const clearBtn = document.getElementById("clearHistoryBtn");
  const sumTaken = document.getElementById("sumTaken");
  const sumMissed = document.getElementById("sumMissed");
  const sumRate = document.getElementById("sumRate");
  const rateBar = document.getElementById("rateBar");
  const filterEl = document.getElementById("logFilter");
  const rangeEl = document.getElementById("logRange");

  function fmtDate(ts){
    try{ return new Date(ts).toLocaleDateString(); }catch{ return "—"; }
  }
  function fmtStamp(ts){
    try{ return new Date(ts).toLocaleString(); }catch{ return "—"; }
  }
  function withinRange(ts, range){
    if (range === "all") return true;
    const days = parseInt(range, 10);
    if (!days) return true;
    const now = Date.now();
    const from = now - (days * 24 * 60 * 60 * 1000);
    return (ts || 0) >= from;
  }

  function render(){
    const logsAll = load(KEY, []);

    const type = filterEl ? filterEl.value : "all";
    const range = rangeEl ? rangeEl.value : "7";

    const logs = logsAll.filter(l => {
      if (!withinRange(l.at, range)) return false;
      if (type === "all") return true;
      return l.status === type;
    });

    // summary uses last 7 days
    const last7 = logsAll.filter(l => withinRange(l.at, "7"));
    const taken7 = last7.filter(x => x.status === "Taken").length;
    const missed7 = last7.filter(x => x.status === "Missed").length;
    const total7 = taken7 + missed7;
    const rate7 = total7 ? Math.round((taken7/total7)*100) : 0;

    if (sumTaken) sumTaken.textContent = String(taken7);
    if (sumMissed) sumMissed.textContent = String(missed7);
    if (sumRate) sumRate.textContent = `${rate7}%`;
    if (rateBar){
      rateBar.style.width = `${rate7}%`;
      rateBar.textContent = `${rate7}%`;
    }

    tbody.innerHTML = "";

    if (!logs.length){
      if (emptyEl) emptyEl.style.display = "block";
      return;
    } else {
      if (emptyEl) emptyEl.style.display = "none";
    }

    logs.slice(0, 120).forEach(l => {
      const tr = document.createElement("tr");
      const badgeClass = l.status === "Taken" ? "taken" : "missed";
      tr.innerHTML = `
        <td title="${escapeHtml(fmtStamp(l.at))}">${escapeHtml(fmtDate(l.at))}</td>
        <td>${escapeHtml(l.time || "—")}</td>
        <td><b>${escapeHtml(l.medName || "Medication")}</b></td>
        <td>${escapeHtml(l.medDose || "—")}</td>
        <td><span class="badgePill ${badgeClass}">${escapeHtml(l.status || "—")}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }

  if (clearBtn){
    clearBtn.addEventListener("click", () => {
      localStorage.removeItem(KEY);
      render();
      refreshDashboardWidgets();
    });
  }
  if (filterEl) filterEl.addEventListener("change", render);
  if (rangeEl) rangeEl.addEventListener("change", render);

  render();
}

/* ===============================
   Dashboard stats
   =============================== */
function bindDashboardPage(){
  const mini = document.getElementById("navUserMini");
  const acc = document.getElementById("accountEmail");
  const bar = document.getElementById("adherenceBar");

  // optional counters
  const medsEl = document.getElementById("dashMeds");
  const remEl = document.getElementById("dashReminders");
  const pendingEl = document.getElementById("dashPending");

  if (!mini && !acc && !bar && !medsEl && !remEl && !pendingEl) return;

  const s = load("mv_session", null);
  const label = s ? (s.name || s.email || "User") : "—";
  const email = s ? (s.email || "—") : "—";
  if (mini) mini.textContent = label;
  if (acc) acc.textContent = email;

  const meds = load("mv_meds", []);
  const reminders = load("mv_reminders", []);
  const pending = reminders.filter(r => (r.status || "pending") === "pending").length;

  if (medsEl) medsEl.textContent = String(meds.length);
  if (remEl) remEl.textContent = String(reminders.length);
  if (pendingEl) pendingEl.textContent = String(pending);

  const logs = load("mv_logs", []);
  const now = Date.now();
  const weekAgo = now - (7 * 24 * 60 * 60 * 1000);

  const recent = logs.filter(l => (l.at || 0) >= weekAgo);
  const taken = recent.filter(l => l.status === "Taken").length;
  const missed = recent.filter(l => l.status === "Missed").length;
  const total = taken + missed;
  const rate = total ? Math.round((taken / total) * 100) : 0;

  if (bar){
    bar.style.width = `${rate}%`;
    bar.textContent = `${rate}%`;
  }
}

/* ===============================
   Dashboard Upcoming Reminders
   =============================== */
function bindUpcomingReminders(){
  const box = document.getElementById("upcomingList");
  if (!box) return;

  const REM_KEY = "mv_reminders";
  const LOG_KEY = "mv_logs";

  function render(){
    const remindersAll = load(REM_KEY, []);
    const upcoming = remindersAll
      .filter(r => (r.status || "pending") === "pending")
      .sort((a,b) => (a.time || "").localeCompare(b.time || ""))
      .slice(0,3);

    if (!upcoming.length){
      box.innerHTML = `<p class="muted">No reminders scheduled.</p>`;
      return;
    }

    box.innerHTML = upcoming.map(r => `
      <div class="item">
        <div>
          <b>${escapeHtml(r.medName || r.name || "Medication")}</b>
          <div class="muted">${escapeHtml(r.time || "--:--")} • ${escapeHtml(r.medDose || "")}</div>
        </div>

        <div class="upAct">
          <button class="upBtn taken" data-up="taken" data-id="${r.id}">Taken</button>
          <button class="upBtn missed" data-up="missed" data-id="${r.id}">Missed</button>
          <button class="upBtn delete" data-up="delete" data-id="${r.id}">✕</button>
        </div>
      </div>
    `).join("");

    box.querySelectorAll("[data-up]").forEach(btn => {
      btn.addEventListener("click", () => {
        const act = btn.getAttribute("data-up");
        const id = String(btn.getAttribute("data-id"));

        let reminders = load(REM_KEY, []);

        if (act === "delete"){
          reminders = reminders.filter(x => String(x.id) !== id);
          save(REM_KEY, reminders);
          render();
          refreshDashboardWidgets();
          return;
        }

        if (act === "taken" || act === "missed"){
          reminders = reminders.map(x => {
            if (String(x.id) !== id) return x;
            return { ...x, status: act };
          });
          save(REM_KEY, reminders);

          const item = reminders.find(x => String(x.id) === id);
          if (item){
            const logs = load(LOG_KEY, []);
            logs.unshift({
              id: Date.now(),
              at: Date.now(),
              time: item.time,
              medName: item.medName || item.name || "Medication",
              medDose: item.medDose || "",
              status: act === "taken" ? "Taken" : "Missed"
            });
            save(LOG_KEY, logs.slice(0,200));
          }

          render();
          refreshDashboardWidgets();
        }
      });
    });
  }

  render();
}

/* ===============================
   Refresh dashboard UI (single call)
   =============================== */
function refreshDashboardWidgets(){
  if (typeof bindDashboardPage === "function") bindDashboardPage();
  if (typeof bindUpcomingReminders === "function") bindUpcomingReminders();
  if (typeof bindNavPendingBadge === "function") bindNavPendingBadge();
}
/* ===== Profile ===== */

/* ===== Profile ===== */

function bindProfilePage(){
  const form = document.getElementById("profileForm");
  if (!form) return;

  const errEl = document.getElementById("profileError");

  const nameEl = document.getElementById("profName");
  const emailEl = document.getElementById("profEmail");
  const phoneEl = document.getElementById("profPhone");
  const dobEl = document.getElementById("profDob");
  const genderEl = document.getElementById("profGender");
  const addrEl = document.getElementById("profAddress");
  const eNameEl = document.getElementById("profEName");
  const ePhoneEl = document.getElementById("profEPhone");

  const passEl = document.getElementById("profPass");
  const pass2El = document.getElementById("profPass2");

  const logoutBtn = document.getElementById("logoutBtn");

  const session = AUTH.getSession();
  if (!session) return;

  function setMsg(msg){
    if (errEl) errEl.textContent = msg || "";
  }

  // load user record
  const users = AUTH.getUsers();
  const idx = users.findIndex(u => (u.email || "").toLowerCase() === (session.email || "").toLowerCase());
  if (idx === -1){
    AUTH.logout();
    window.location.href = "/login.html";
    return;
  }

  const user = users[idx];

  // fill current
  nameEl.value = user.name || session.name || "User";
  emailEl.value = user.email || session.email || "";

  // extra profile fields stored inside user.profile
  const p = user.profile || {};
  if (phoneEl) phoneEl.value = p.phone || "";
  if (dobEl) dobEl.value = p.dob || "";
  if (genderEl) genderEl.value = p.gender || "";
  if (addrEl) addrEl.value = p.address || "";
  if (eNameEl) eNameEl.value = p.emergencyName || "";
  if (ePhoneEl) ePhoneEl.value = p.emergencyPhone || "";

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    setMsg("");

    const newName = (nameEl.value || "").trim();
    if (!newName){
      setMsg("Full name cannot be empty.");
      return;
    }

    const newPass = (passEl.value || "").trim();
    const newPass2 = (pass2El.value || "").trim();
    if (newPass || newPass2){
      if (newPass.length < 4){
        setMsg("New password must be at least 4 characters.");
        return;
      }
      if (newPass !== newPass2){
        setMsg("Passwords do not match.");
        return;
      }
    }

    // update base fields
    users[idx].name = newName;
    if (newPass) users[idx].password = newPass;

    // update profile object
    users[idx].profile = {
      phone: (phoneEl?.value || "").trim(),
      dob: (dobEl?.value || "").trim(),
      gender: (genderEl?.value || "").trim(),
      address: (addrEl?.value || "").trim(),
      emergencyName: (eNameEl?.value || "").trim(),
      emergencyPhone: (ePhoneEl?.value || "").trim(),
      updatedAt: Date.now()
    };

    AUTH.setUsers(users);

    // update session for navbar
    AUTH.setSession({ ...session, name: newName, at: Date.now() });

    // clear pass
    if (passEl) passEl.value = "";
    if (pass2El) pass2El.value = "";

    hydrateNav();
    setMsg("Saved successfully.");
    setTimeout(() => setMsg(""), 1200);
  });

  if (logoutBtn){
    logoutBtn.addEventListener("click", () => {
      AUTH.logout();
      window.location.href = "/index.html";
    });
  }
}

/* ===============================
   RUN
   =============================== */
document.addEventListener("DOMContentLoaded", () => {
  // If already logged in, block login page
  const s = AUTH.getSession();
  if (isLoginPage() && s) {
    window.location.href = "/dashboard.html";
    return;
  }
let deferredPrompt;
const installBtn = document.getElementById('installBtn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (installBtn) installBtn.style.display = 'inline-block';
});

if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    deferredPrompt = null;
  });
}

  // Protect pages that require auth
  autoProtectByMeta();

  // UI bindings
  hydrateNav();
  bindNavPendingBadge();

  bindLandingButtons();
  bindAuthForms();

  bindSettingsPage();
  bindMedicationsPage();
  bindRemindersPage();
  bindHistoryPage();
  bindDashboardPage();
  bindUpcomingReminders();
  bindProfilePage();

});
>>>>>>> 3b750cf42e8aedadc5014c6cc83b6bf9dd9b240d
