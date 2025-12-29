"use strict";

document.addEventListener("DOMContentLoaded", () => {

  // Initialize page-specific logic based on data-page attribute
  const page = document.body.dataset.page;
  if (page === "login") initLogin();
  if (page === "register") initRegister();
});

// Display a toast message (success / error)
function showToast(el, msg, type) {
  el.textContent = msg;
  el.className = `toast ${type ? "toast-" + type : ""}`.trim();
  el.hidden = false;
}

// Check whether a username is currently locked
function isLocked(username) {
  const locks = StorageAPI.getLocks();
  const key = username.toLowerCase();
  const rec = locks[key];
  // if no record or no lock time, not locked
  if (!rec || !rec.lockedUntil) return false;
  // check if current time is before lockedUntil
  return new Date(rec.lockedUntil) > new Date();
}

// Register a failed login attempt and apply temporary lock if needed
function registerFail(username) {
  const locks = StorageAPI.getLocks();
  const key = username.toLowerCase();
  const rec = locks[key] || { failed: 0, lockedUntil: null };
  rec.failed += 1;

  // after 3 failed attempts, lock for 60 seconds
  if (rec.failed >= 3) {
    const until = new Date(Date.now() + 60 * 1000);
    rec.lockedUntil = until.toISOString();
    rec.failed = 0;
  }

  locks[key] = rec;
  StorageAPI.setLocks(locks);
}

// Clear failed login attempts after successful authentication
function clearFails(username) {
  const locks = StorageAPI.getLocks();
  const key = username.toLowerCase();
  if (locks[key]) {
    locks[key].failed = 0;
    locks[key].lockedUntil = null;
    StorageAPI.setLocks(locks);
  }
}

function initLogin() {
  const session = StorageAPI.getSession();
  // If a valid session already exists, redirect to home
  if (session?.userId) {
    // If the session has an expiry and it already passed clear it and stay on login
    if (session.expiresAt && new Date(session.expiresAt) <= new Date()) {
      StorageAPI.clearSession();
    } else {
      // Session is valid -> go to home
      location.href = "home.html";
      return;
    }
  }

  const form = document.querySelector("#loginForm");
  const toast = document.querySelector("#toast");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = form.username.value.trim();
    const password = form.password.value;

    // Check required fields
    if (!username || !password) {
      showToast(toast, "please fill in all fields.", "bad");
      return;
    }

    // Check temporary lock
    if (isLocked(username)) {
      showToast(
        toast,
        "This account is temporarily locked due to multiple failed login attempts. Please try again later.",
        "bad"
      );
      return;
    }

    // Validate credentials
    const user = StorageAPI.findUserByUsername(username);
    if (!user || user.password !== password) {
      registerFail(username);
      showToast(toast, "Invalid username or password.", "bad");
      return;
    }
    // Successful login
    clearFails(username);

    // Update basic user statistics
    const users = StorageAPI.getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx >= 0) {
      users[idx].stats.totalLogins += 1;
      StorageAPI.setUsers(users);
    }

    // Session handling with expiration of 2 hours
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
    StorageAPI.setSession({
      userId: user.id,
      username: user.username,
      expiresAt: expiresAt.toISOString()
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

    // Validate required fields
    if (!fullName || !email || !username || !password || !password2) {
      showToast(toast, "please fill in all fields.", "bad");
      return;
    }

    // Password confirmation check
    if (password !== password2) {
      showToast(toast, "Passwords do not match.", "bad");
      return;
    }

    // Ensure username uniqueness
    if (StorageAPI.findUserByUsername(username)) {
      showToast(toast, "Username already exists. Please choose another.", "bad");
      return;
    }

    // Create new user
    StorageAPI.createUser({ username, password, fullName, email });
    showToast(toast, "Successfully registered! You can now log in.", "ok");

    // auto-redirect to login after a short delay
    setTimeout(() => location.href = "index.html", 900);
  });
}