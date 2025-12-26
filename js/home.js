"use strict";

// When the DOM is fully loaded, run startup
document.addEventListener("DOMContentLoaded", () => {
  // Make sure the user is logged in
  enforceSession();
  // Render the home dashboard
  renderHome();
  // Wire game navigation buttons
  wireGameButtons();
});

// Ensures there is a valid session.
function enforceSession() {
  const session = StorageAPI.getSession();

  // If there is no session or no userId, redirect to login
  if (!session?.userId) {
    location.href = "index.html";
    return;
  }

  // expiration check:
  if (session.expiresAtISO && new Date(session.expiresAtISO) <= new Date()) {
    StorageAPI.clearSession();
    location.href = "index.html";
    return;
  }
}

// Renders the home page: shows current user's name + KPI numbers.
function renderHome() {
  const session = StorageAPI.getSession();
  const users = StorageAPI.getUsers();

  // Find the current user record by id from the session
  const me = users.find(u => u.id === session.userId);

  // Grab UI elements
  const nameEl = document.querySelector("#currentUserName");
  const simonSays = document.querySelector("#simonSays");
  const memoryGame = document.querySelector("#memoryGame");

  // Display full name if available, otherwise use session username
  nameEl.textContent = me?.fullName ? me.fullName : session.username;

  // Display KPIs with safe defaults
  simonSays.textContent = String(me?.stats?.simon?.currentDiff ?? "easy");
  memoryGame.textContent = String(me?.stats?.memoryLevel ?? "easy");
}

function wireGameButtons() {
  const btnSimon = document.querySelector('[data-game="simon"]');
  const btnMemory = document.querySelector('[data-game="memory"]');

  // If buttons are missing, do nothing (prevents errors)
  if (btnSimon) {
    btnSimon.addEventListener("click", () => {
      // optional: only allow if live
      if (btnSimon.dataset.status !== "live") return;
      location.href = "simon.html";
    });
  }

  if (btnMemory) {
    btnMemory.addEventListener("click", () => {
      // optional: only allow if live
      if (btnMemory.dataset.status !== "live") return;
      location.href = "memory.html";
    });
  }
}