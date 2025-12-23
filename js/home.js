"use strict";

document.addEventListener("DOMContentLoaded", () => {
  enforceSession();
  renderHome();
});

function enforceSession() {
  const session = StorageAPI.getSession();
  if (!session?.userId) {
    location.href = "index.html";
    return;
  }

  // תפוגה (שלד)
  if (session.expiresAtISO && new Date(session.expiresAtISO) <= new Date()) {
    StorageAPI.clearSession();
    location.href = "index.html";
    return;
  }
}

function renderHome() {
  const session = StorageAPI.getSession();
  const users = StorageAPI.getUsers();
  const me = users.find(u => u.id === session.userId);

  const nameEl = document.querySelector("#currentUserName");
  const kpiLogins = document.querySelector("#kpiLogins");
  const kpiPoints = document.querySelector("#kpiPoints");
  const kpiPlayers = document.querySelector("#kpiPlayers");

  nameEl.textContent = me?.fullName ? me.fullName : session.username;

  kpiLogins.textContent = String(me?.stats?.totalLogins ?? 0);
  kpiPoints.textContent = String(me?.stats?.points ?? 0);
  kpiPlayers.textContent = String(users.length);

  // כפתורים למשחקים שעובדים בעתיד:
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-game]");
    if (!btn) return;

    const game = btn.dataset.game;
    if (btn.dataset.status === "dev") return;

    // כרגע אין דפי משחקים — זה שלד:
    alert(`שלד: בעתיד ננווט למשחק "${game}"`);
  });
}
