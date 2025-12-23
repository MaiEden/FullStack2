"use strict";

document.addEventListener("DOMContentLoaded", () => {
  enforceSession();
  wireGlobalActions();
  renderHome();
});

function wireGlobalActions() {
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-action]");
    if (!a) return;

    if (a.dataset.action === "logout") {
      e.preventDefault();
      StorageAPI.clearSession();
      location.href = "index.html";
    }
  });
}

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
  // ניווט למשחקים פעילים
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-game]");
  if (!btn) return;

  if (btn.dataset.status !== "live") return;

  const game = btn.dataset.game;

  switch (game) {
    case "memory":
      location.href = "memory.html";
      break;

    case "simon":
      location.href = "simon.html";
      break;

    default:
      console.warn("Unknown game:", game);
  }
});

}
