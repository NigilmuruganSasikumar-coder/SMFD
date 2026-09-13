// js/settings.js — Settings
import { requireLoginOrRedirect, logout, ADMIN_EMAIL } from "./auth.js";
requireLoginOrRedirect();

import { app } from "./firebase-init.js";
import { renderShell, getRefreshIntervalMs, setRefreshIntervalMs } from "./admin-shell.js";

renderShell({ activeId: "settings", onLogout: logout });

function $(id) { return document.getElementById(id); }

$("accountEmail").textContent = ADMIN_EMAIL;
$("accountProject").textContent = app.options.projectId || "—";

$("refreshSelect").value = String(getRefreshIntervalMs());
$("refreshSelect").addEventListener("change", () => {
  setRefreshIntervalMs(Number($("refreshSelect").value));
  $("savedNote").hidden = false;
  setTimeout(() => { $("savedNote").hidden = true; }, 2000);
});

$("logoutBtn2").addEventListener("click", logout);
