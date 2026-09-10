async function loadRemoteAgenda() {
  try {
    const appointments = await rpc("get_public_agenda", {
      shop_slug: SHOP_SLUG,
      appt_date: null,
    });
    db.appointments = Array.isArray(appointments) ? appointments : [];
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
