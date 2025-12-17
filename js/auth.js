"use strict";

document.addEventListener("DOMContentLoaded", () => {
  wireGlobalActions();

  const page = document.body.dataset.page;
  if (page === "login") initLogin();
  if (page === "register") initRegister();
});

function wireGlobalActions() {
  // פעולות מה-Header שמגיע דרך embed
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-action]");
    if (!a) return;

    const action = a.dataset.action;
    if (action === "logout") {
      e.preventDefault();
      StorageAPI.clearSession();
      location.href = "index.html";
    }
  });
}

function showToast(el, msg, type) {
  el.textContent = msg;
  el.className = `toast ${type ? "toast--" + type : ""}`.trim();
  el.hidden = false;
}

function isLocked(username) {
  const locks = StorageAPI.getLocks();
  const key = username.toLowerCase();
  const rec = locks[key];
  if (!rec || !rec.lockedUntilISO) return false;
  return new Date(rec.lockedUntilISO) > new Date();
}

function registerFail(username) {
  const locks = StorageAPI.getLocks();
  const key = username.toLowerCase();
  const rec = locks[key] || { failed: 0, lockedUntilISO: null };
  rec.failed += 1;

  // שלד: אחרי 3 ניסיונות - נעילה ל-60 שניות
  if (rec.failed >= 3) {
    const until = new Date(Date.now() + 60 * 1000);
    rec.lockedUntilISO = until.toISOString();
    rec.failed = 0;
  }

  locks[key] = rec;
  StorageAPI.setLocks(locks);
}

function clearFails(username) {
  const locks = StorageAPI.getLocks();
  const key = username.toLowerCase();
  if (locks[key]) {
    locks[key].failed = 0;
    locks[key].lockedUntilISO = null;
    StorageAPI.setLocks(locks);
  }
}

function initLogin() {
  // אם כבר יש session תקין - נכנסים לבית
  const session = StorageAPI.getSession();
  if (session?.userId) {
    location.href = "home.html";
    return;
  }

  const form = document.querySelector("#loginForm");
  const toast = document.querySelector("#toast");

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const username = form.username.value.trim();
    const password = form.password.value;

    if (!username || !password) {
      showToast(toast, "נא למלא שם משתמש וסיסמה.", "bad");
      return;
    }

    if (isLocked(username)) {
      showToast(toast, "המשתמש נעול זמנית עקב ניסיונות שגויים. נסו שוב מאוחר יותר.", "bad");
      return;
    }

    const user = StorageAPI.findUserByUsername(username);
    if (!user || user.password !== password) {
      registerFail(username);
      showToast(toast, "פרטי התחברות שגויים.", "bad");
      return;
    }

    clearFails(username);

    // עדכון סטטיסטיקה בסיסי (שלד)
    const users = StorageAPI.getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx >= 0) {
      users[idx].stats.totalLogins += 1;
      StorageAPI.setUsers(users);
    }

    // "Cookie" שלד: נשמור session עם תפוגה
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 שעות
    StorageAPI.setSession({
      userId: user.id,
      username: user.username,
      expiresAtISO: expiresAt.toISOString()
    });

    location.href = "home.html";
  });
}

function initRegister() {
  const form = document.querySelector("#registerForm");
  const toast = document.querySelector("#toast");

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const fullName = form.fullName.value.trim();
    const email = form.email.value.trim();
    const username = form.username.value.trim();
    const password = form.password.value;
    const password2 = form.password2.value;

    if (!fullName || !email || !username || !password || !password2) {
      showToast(toast, "נא למלא את כל השדות.", "bad");
      return;
    }

    if (password !== password2) {
      showToast(toast, "הסיסמאות אינן תואמות.", "bad");
      return;
    }

    if (StorageAPI.findUserByUsername(username)) {
      showToast(toast, "שם המשתמש כבר קיים. בחרו שם אחר.", "bad");
      return;
    }

    StorageAPI.createUser({ username, password, fullName, email });
    showToast(toast, "נרשמת בהצלחה! עכשיו אפשר להתחבר.", "ok");

    // שלד: מעבר אוטומטי לכניסה אחרי שנייה
    setTimeout(() => location.href = "index.html", 900);
  });
}
