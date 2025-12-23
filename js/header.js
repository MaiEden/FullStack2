const logoutBtn = document.getElementById("logout");
if (logoutBtn){
  logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      StorageAPI.clearSession();
      location.href = "/html/index.html";
    });
}