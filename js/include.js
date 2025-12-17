async function include(slotId, url) {
  const slot = document.getElementById(slotId);
  if (!slot) return;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load: ${url}`);
  slot.innerHTML = await res.text();
}

(async () => {
  await include("bg-slot", "../html/partials/background.html");
  await include("header-slot", "../html/partials/header.html");
  await include("footer-slot", "../html/partials/footer.html");
})();
