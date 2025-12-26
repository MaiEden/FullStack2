// Loads an external HTML file into a target element
function include(slotId, url) {
  // Find the container element by ID
  const slot = document.getElementById(slotId);
  if (!slot) return; // Exit if the slot does not exist

  // Fetch the HTML file
  fetch(url)
    .then(res => {
      // Stop if the request failed
      if (!res.ok) throw new Error(`Failed to load: ${url}`);
      return res.text(); // Convert response to text
    })
    .then(html => {
      // Inject the HTML into the slot
      slot.innerHTML = html;
    })
    .catch(err => {
      // Log any loading errors
      console.error(err);
    });
}

// Load shared layout parts
include("bg-slot", "../html/partials/background.html");
include("header-slot", "../html/partials/header.html");
include("footer-slot", "../html/partials/footer.html");

// Global actions (loaded once via include.js)
(function initGlobalActionsOnce() {
  if (window.__globalActionsWired) return;
  window.__globalActionsWired = true;

  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]");
    if (!el) return;

    if (el.dataset.action === "logout") {
      e.preventDefault();
      StorageAPI.clearSession();
      location.href = "index.html";
    }
  });
})();