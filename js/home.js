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

// Renders the home page: shows current user's name + Achievements table.
function renderHome() {
  const session = StorageAPI.getSession();
  const users = StorageAPI.getUsers();

  // Find current user
  const me = users.find(u => u.id === session.userId);

  // Update welcome name
  const nameEl = document.querySelector("#currentUserName");
  nameEl.textContent = me?.fullName ? me.fullName : session.username;

  // Render table
  renderUsersTable(users, session.userId);
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

function renderUsersTable(users, myId) {
  const tbody = document.querySelector("#usersStatsTbody");
  if (!tbody) return;

  const safeUsers = Array.isArray(users) ? users.slice() : [];

  // Sort: current user first, then by username
  safeUsers.sort((a, b) => {
    if (a.id === myId) return -1;
    if (b.id === myId) return 1;
    return a.username.localeCompare(b.username);
  });

  tbody.innerHTML = safeUsers.map(u => {
    const isMe = u?.id === myId;

    const playerName = u?.username || u?.fullName || "Unknown";

    // Simon difficulty
    const simon = String(u?.stats?.simon?.currentDiff ?? "easy");

    // Memory level
    const memory = String(u?.stats?.memoryLevel ?? "easy");

    return `
      <tr class="${isMe ? "is-me" : ""}">
        <td>
            ${playerName}
            ${isMe ? `<span class="pill">You</span>` : ``}
        </td>
        <td>${simon}</td>
        <td>${memory}</td>
      </tr>
    `;
  }).join("");
}