async function loadRemoteAgenda() {
  try {
    if (!authSession) return;
    await loadAdminData();
    if (location.hash === "#admin") render();
  } catch (error) {
    console.error("Falha ao carregar agenda do Supabase", error);
    if (location.hash === "#admin") toast("Não foi possível atualizar a agenda");
  }
}

window.addEventListener("hashchange", () => {
  if (location.hash === "#admin") loadRemoteAgenda();
});

window.addEventListener("focus", () => {
  if (location.hash === "#admin") loadRemoteAgenda();
});

if (location.hash === "#admin") loadRemoteAgenda();
