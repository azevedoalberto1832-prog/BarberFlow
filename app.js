const SERVICES = [
  {
    id: "corte",
    name: "Corte Clássico",
    duration: 30,
    price: 45,
    active: true,
    desc: "Acabamento preciso e finalização.",
  },
  {
    id: "barba",
    name: "Barba Premium",
    duration: 30,
    price: 35,
    active: true,
    desc: "Toalha quente, desenho e hidratação.",
  },
  {
    id: "combo",
    name: "Corte + Barba",
    duration: 60,
    price: 70,
    active: true,
    desc: "A experiência completa Monteiro.",
  },
  {
    id: "progressiva",
    name: "Progressiva",
    duration: 60,
    price: 90,
    active: true,
    desc: "Alinhamento e cuidado profissional.",
  },
  {
    id: "sobrancelha",
    name: "Sobrancelha",
    duration: 15,
    price: 20,
    active: true,
    desc: "Detalhe que transforma o resultado.",
  },
];
const PEOPLE = [
  { id: "joao", name: "João Monteiro" },
  { id: "rafael", name: "Rafael Lima" },
];
const today = () => new Date().toISOString().slice(0, 10),
  uid = () => crypto.randomUUID?.() || Date.now() + Math.random() + "";
const addDays = (n) => {
  let d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const seed = {
  services: SERVICES,
  people: PEOPLE,
  clients: [
    ["Marcos Silva", "62991234567", "1988-08-30", 28],
    ["Lucas Rocha", "62992345678", "1994-09-12", 7],
    ["André Souza", "62993456789", "1990-08-29", 22],
    ["Paulo Reis", "62994567890", "1985-11-03", 45],
    ["Renato Alves", "62995678901", "1998-01-19", 12],
  ].map((x, i) => ({
    id: "cli" + i,
    name: x[0],
    phone: x[1],
    birth: x[2],
    lastVisit: addDays(-x[3]),
  })),
  appointments: [
    {
      id: "a1",
      client: "Lucas Rocha",
      phone: "62992345678",
      serviceIds: ["corte"],
      professional: "joao",
      date: addDays(1),
      time: "10:00",
      duration: 30,
      total: 45,
      status: "Agendado",
    },
    {
      id: "a2",
      client: "Marcos Silva",
      phone: "62991234567",
      serviceIds: ["combo"],
      professional: "rafael",
      date: addDays(1),
      time: "14:00",
      duration: 60,
      total: 70,
      status: "Agendado",
    },
    {
      id: "a3",
      client: "André Souza",
      phone: "62993456789",
      serviceIds: ["barba"],
      professional: "joao",
      date: today(),
      time: "16:00",
      duration: 30,
      total: 35,
      status: "Concluído",
    },
  ],
  cash: [
    {
      id: "m1",
      type: "entrada",
      desc: "Corte — André Souza",
      value: 45,
      category: "Serviços",
      date: today(),
      method: "Pix",
    },
    {
      id: "m2",
      type: "entrada",
      desc: "Barba — Rafael M.",
      value: 35,
      category: "Serviços",
      date: today(),
      method: "Dinheiro",
    },
    {
      id: "m3",
      type: "saida",
      desc: "Reposição de lâminas",
      value: 28,
      category: "Insumos",
      date: today(),
      method: "Pix",
    },
  ],
  categories: ["Serviços", "Produtos", "Insumos", "Aluguel", "Marketing"],
  settings: {
    shop: "Barbearia Monteiro",
    address: "Rua das Palmeiras, 128 — Centro, Goiânia - GO",
    phone: "5562999999999",
    open: "09:00",
    close: "19:00",
    breakStart: "12:00",
    breakEnd: "13:00",
    greeting:
      "Olá! Bem-vindo à Barbearia Monteiro. Agende seu horário pelo BarberFlow.",
  },
};
let db =
  JSON.parse(localStorage.getItem("barberflow-demo") || "null") ||
  structuredClone(seed);
let booking = {
  step: 0,
  serviceIds: [],
  professional: "any",
  date: addDays(1),
  time: "",
  name: "",
  phone: "",
  notes: "",
};
let adminTab = "dashboard";
let cashTab = "movimentos";
let agendaDate = addDays(1);
const save = () => localStorage.setItem("barberflow-demo", JSON.stringify(db));
const money = (v) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dateBR = (d) => new Date(d + "T12:00").toLocaleDateString("pt-BR");
const service = (id) => db.services.find((s) => s.id === id);
const total = () =>
  booking.serviceIds.reduce(
    (a, id) => ({
      duration: a.duration + service(id).duration,
      price: a.price + service(id).price,
    }),
    { duration: 0, price: 0 },
  );
const toast = (m) => {
  let e = document.querySelector("#toast");
  e.textContent = m;
  e.classList.add("show");
  setTimeout(() => e.classList.remove("show"), 2400);
};
function publicPage() {
  return `<header class="topbar"><div class="container"><div class="brand"><span class="mark">BF</span><div>Barbearia Monteiro<small>BARBERFLOW</small></div></div><div><a class="btn btn-outline" target="_blank" href="https://wa.me/${db.settings.phone}?text=${encodeURIComponent(db.settings.greeting)}">WhatsApp</a> <button class="btn btn-dark" data-book>Agendar agora</button></div></div></header><main><section class="hero"><div class="container hero-grid"><div><div class="eyebrow">Tradição no corte. Liberdade na agenda.</div><h1>Seu estilo, no seu horário.</h1><p>Escolha os serviços, veja os horários disponíveis e confirme em poucos passos. Sem espera, sem ligação.</p><div class="hero-actions"><button class="btn btn-copper" data-book>Escolher horário →</button><a class="btn btn-ghost" href="#servicos">Ver serviços</a></div></div><div class="hero-card"><div class="eyebrow">Próximos horários</div><h3 style="font-size:30px;margin:10px 0 15px">Amanhã</h3>${["09:00", "10:30", "14:00", "16:30"].map((x, i) => `<div class="slot"><span>${x}</span><b>${i % 2 ? "Rafael" : "João"}</b></div>`).join("")}</div></div></section><section class="section" id="servicos"><div class="container"><div class="section-head"><div><div class="eyebrow">Catálogo</div><h2>Serviços feitos com propósito</h2></div><p class="muted">Selecione um ou mais no agendamento.<br>O tempo é calculado automaticamente.</p></div><div class="service-grid">${db.services
    .filter((s) => s.active)
    .map(
      (s) =>
        `<article class="service-card"><div class="service-meta"><span class="eyebrow">${s.duration} MIN</span><span class="price">${money(s.price)}</span></div><h3 style="font-size:27px;margin:25px 0 10px">${s.name}</h3><p class="muted">${s.desc || "Atendimento personalizado."}</p><button class="btn btn-outline" data-book data-service="${s.id}">Agendar este serviço</button></article>`,
    )
    .join(
      "",
    )}</div></div></section><section class="section"><div class="container split"><div><div class="eyebrow">BarberFlow</div><h2>Uma experiência melhor dos dois lados do balcão.</h2></div><div><div class="feature"><strong>Agenda inteligente</strong><span class="muted">Horários livres calculados pela duração total, sem sobreposições.</span></div><div class="feature"><strong>Lembretes que trazem o cliente de volta</strong><span class="muted">Aniversários e retornos após 20 dias prontos para WhatsApp.</span></div><div class="feature"><strong>Gestão em um só lugar</strong><span class="muted">Clientes, caixa, serviços e rotina conectados.</span></div></div></div></section><section class="section"><div class="container"><div class="location"><div><div class="eyebrow">Onde estamos</div><h2 style="font-size:38px;margin:8px 0">Barbearia Monteiro</h2><p>${db.settings.address}</p></div><a class="btn btn-copper" target="_blank" href="https://maps.google.com/?q=${encodeURIComponent(db.settings.address)}">Abrir no mapa</a></div></div></section></main><footer class="footer"><div class="container"><span>© BarberFlow — Demo Barbearia Monteiro</span><button class="btn btn-outline" data-admin>Área da barbearia</button></div></footer>`;
}
function availableSlots() {
  let dur = total().duration || 30,
    out = [];
  for (let h = 9 * 60; h + dur <= 19 * 60; h += 15) {
    if (h < 13 * 60 && h + dur > 12 * 60) continue;
    let time = `${String(Math.floor(h / 60)).padStart(2, "0")}:${String(h % 60).padStart(2, "0")}`;
    let freePeople = PEOPLE.filter(
      (p) =>
        !db.appointments.some(
          (a) =>
            a.date === booking.date &&
            a.professional === p.id &&
            a.status !== "Cancelado" &&
            h <
              parseInt(a.time) * 60 + parseInt(a.time.slice(3)) + a.duration &&
            parseInt(a.time) * 60 + parseInt(a.time.slice(3)) < h + dur,
        ),
    );
    if (
      booking.professional === "any"
        ? freePeople.length
        : freePeople.some((p) => p.id === booking.professional)
    )
      out.push(time);
  }
  return out;
}
function bookingModal() {
  let t = total(),
    titles = [
      "Escolha os serviços",
      "Quem vai atender?",
      "Data e horário",
      "Seus dados",
      "Tudo certo!",
    ];
  let body = "";
  if (booking.step === 0)
    body = `<div class="choice-grid">${db.services
      .filter((s) => s.active)
      .map(
        (s) =>
          `<button class="choice ${booking.serviceIds.includes(s.id) ? "active" : ""}" data-select-service="${s.id}"><b>${s.name}</b><br><span class="muted">${s.duration} min · ${money(s.price)}</span></button>`,
      )
      .join("")}</div>`;
  if (booking.step === 1)
    body = `<div class="choice-grid"><button class="choice ${booking.professional === "any" ? "active" : ""}" data-prof="any"><b>Qualquer profissional</b><br><span class="muted">Primeiro horário disponível</span></button>${PEOPLE.map((p) => `<button class="choice ${booking.professional === p.id ? "active" : ""}" data-prof="${p.id}"><b>${p.name}</b><br><span class="muted">Barbeiro</span></button>`).join("")}</div>`;
  if (booking.step === 2)
    body = `<div class="field" style="margin-bottom:20px"><label>Data</label><input id="book-date" type="date" min="${today()}" value="${booking.date}"></div><div class="slots">${
      availableSlots()
        .map(
          (x) =>
            `<button class="slot-btn ${booking.time === x ? "active" : ""}" data-time="${x}">${x}</button>`,
        )
        .join("") || '<div class="empty">Sem horários nesta data.</div>'
    }</div>`;
  if (booking.step === 3)
    body = `<div class="form-grid"><label class="field"><span>Nome *</span><input id="book-name" value="${booking.name}" placeholder="Seu nome"></label><label class="field"><span>WhatsApp *</span><input id="book-phone" value="${booking.phone}" placeholder="(62) 99999-9999"></label><label class="field full"><span>Observações</span><textarea id="book-notes" rows="3" placeholder="Alguma preferência?">${booking.notes}</textarea></label></div>`;
  if (booking.step === 4) {
    let p = PEOPLE.find((x) => x.id === booking.professional);
    body = `<div style="text-align:center;padding:22px"><div class="mark" style="margin:auto;background:var(--green);font-size:22px">✓</div><h2 style="margin:18px 0 8px">Agendamento confirmado</h2><p class="muted">${dateBR(booking.date)} às ${booking.time} · ${p?.name || "Profissional disponível"}</p><div class="summary"><b>${booking.serviceIds.map((id) => service(id).name).join(" + ")}</b><b>${money(t.price)}</b></div><a target="_blank" class="btn btn-copper" href="https://wa.me/${db.settings.phone}?text=${encodeURIComponent(`Olá! Confirme meu agendamento na Barbearia Monteiro: ${booking.serviceIds.map((id) => service(id).name).join(" + ")}, dia ${dateBR(booking.date)} às ${booking.time}. Cliente: ${booking.name}.`)}">Enviar resumo pelo WhatsApp</a></div>`;
  }
  return `<div class="modal" id="booking-modal"><div class="modal-card"><div class="modal-head"><div><div class="eyebrow">PASSO ${Math.min(booking.step + 1, 4)} DE 4</div><h3 style="font-size:27px">${titles[booking.step]}</h3></div><button class="btn btn-ghost" data-close>✕</button></div><div class="modal-body"><div class="steps">${[0, 1, 2, 3].map((x) => `<i class="${x <= booking.step ? "on" : ""}"></i>`).join("")}</div>${body}${booking.step < 4 ? `<div class="summary"><span>${t.duration || 0} min · ${booking.serviceIds.length} serviço(s)</span><b>${money(t.price)}</b></div><div class="modal-actions"><button class="btn btn-outline" data-prev ${booking.step === 0 ? "disabled" : ""}>Voltar</button><button class="btn btn-dark" data-next>${booking.step === 3 ? "Confirmar" : "Continuar"}</button></div>` : ""}</div></div></div>`;
}
const nav = [
  ["dashboard", "Visão geral"],
  ["agenda", "Agenda"],
  ["clientes", "Clientes"],
  ["caixa", "Caixa"],
  ["lembretes", "Lembretes"],
  ["servicos", "Serviços"],
  ["config", "Configurações"],
];
function adminPage() {
  return `<div class="admin"><div class="admin-shell"><aside class="sidebar"><div class="brand"><span class="mark" style="background:var(--copper)">BF</span><div>BarberFlow<small>MONTEIRO</small></div></div><nav class="nav">${nav.map((n) => `<button class="${adminTab === n[0] ? "active" : ""}" data-tab="${n[0]}">${n[1]}</button>`).join("")}<button data-public>↗ Página pública</button></nav></aside><main class="admin-main"><header class="admin-header"><div><div class="eyebrow">BARBEARIA MONTEIRO</div><h1>${nav.find((n) => n[0] === adminTab)[1]}</h1></div><button class="btn btn-dark" data-quick>+ Novo</button></header>${adminContent()}</main></div><nav class="mobile-nav">${nav.map((n) => `<button class="${adminTab === n[0] ? "active" : ""}" data-tab="${n[0]}">${n[1]}</button>`).join("")}</nav></div>`;
}
function adminContent() {
  let revenue = db.cash
      .filter((x) => x.type === "entrada")
      .reduce((a, x) => a + x.value, 0),
    expense = db.cash
      .filter((x) => x.type === "saida")
      .reduce((a, x) => a + x.value, 0);
  if (adminTab === "dashboard")
    return `<div class="metrics"><div class="metric"><small>Faturamento hoje</small><b>${money(db.cash.filter((x) => x.type === "entrada" && x.date === today()).reduce((a, x) => a + x.value, 0))}</b></div><div class="metric"><small>Saldo do caixa</small><b>${money(revenue - expense)}</b></div><div class="metric"><small>Agendamentos</small><b>${db.appointments.length}</b></div><div class="metric"><small>Ticket médio</small><b>${money(revenue / Math.max(1, db.cash.filter((x) => x.type === "entrada").length))}</b></div></div><div class="split"><section class="panel"><h3>Faturamento — últimos 7 dias</h3><div class="chart">${[42, 68, 55, 82, 64, 92, 73].map((x, i) => `<div class="bar-col"><div class="bar" style="height:${x}%"></div>${["S", "T", "Q", "Q", "S", "S", "D"][i]}</div>`).join("")}</div></section><section class="panel"><h3>Próximos atendimentos</h3>${db.appointments
      .filter((a) => a.status === "Agendado")
      .slice(0, 4)
      .map(
        (a) =>
          `<div class="list-card"><span><b>${a.time} · ${a.client}</b><br><small class="muted">${service(a.serviceIds[0])?.name}</small></span><span class="badge green">Agendado</span></div>`,
      )
      .join("")}</section></div>`;
  if (adminTab === "agenda")
    return `<section class="panel"><div class="toolbar"><input id="agenda-date" type="date" value="${agendaDate}"><button class="btn btn-dark" data-add-appt>+ Agendamento</button></div><div class="table-wrap"><table><thead><tr><th>Data/hora</th><th>Cliente</th><th>Serviço</th><th>Profissional</th><th>Status</th><th>Ações</th></tr></thead><tbody>${
      db.appointments
        .filter((a) => a.date === agendaDate)
        .map(
          (a) =>
            `<tr><td>${dateBR(a.date)} · ${a.time}</td><td>${a.client}</td><td>${a.serviceIds.map((x) => service(x)?.name).join(", ")}</td><td>${PEOPLE.find((p) => p.id === a.professional)?.name}</td><td><button class="badge ${a.status === "Concluído" ? "green" : ""}" data-status="${a.id}">${a.status}</button></td><td><button class="btn btn-ghost" data-delete-appt="${a.id}">Excluir</button></td></tr>`,
        )
        .join("") ||
      '<tr><td colspan="6" class="empty">Nenhum atendimento nesta data.</td></tr>'
    }</tbody></table></div></section>`;
  if (adminTab === "clientes")
    return `<section class="panel"><div class="toolbar"><input id="search" placeholder="Buscar cliente"><button class="btn btn-dark" data-add-client>+ Cliente</button></div><div id="client-list" class="list-cards">${db.clients.map((c) => `<div class="list-card"><span><b>${c.name}</b><br><small class="muted">${c.phone} · última visita ${dateBR(c.lastVisit)}</small></span><span><button class="btn btn-ghost" data-edit-client="${c.id}">Editar</button><button class="btn btn-outline" data-whatsapp="${c.phone}">WhatsApp</button><button class="btn btn-ghost danger" data-delete-client="${c.id}">Excluir</button></span></div>`).join("")}</div></section>`;
  if (adminTab === "caixa")
    return `<div class="metrics"><div class="metric"><small>Entradas</small><b>${money(revenue)}</b></div><div class="metric"><small>Saídas</small><b class="danger">${money(expense)}</b></div><div class="metric"><small>Saldo</small><b>${money(revenue - expense)}</b></div><div class="metric"><small>Movimentos</small><b>${db.cash.length}</b></div></div><section class="panel"><div class="tabs"><button class="${cashTab === "movimentos" ? "active" : ""}" data-cash-tab="movimentos">Movimentações</button><button class="${cashTab === "categorias" ? "active" : ""}" data-cash-tab="categorias">Categorias editáveis</button></div>${cashTab === "movimentos" ? `<div class="toolbar"><span class="muted">Entradas e saídas organizadas</span><button class="btn btn-dark" data-add-cash>+ Movimentação</button></div><div class="table-wrap"><table><thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Método</th><th>Valor</th><th></th></tr></thead><tbody>${db.cash.map((x) => `<tr><td>${dateBR(x.date)}</td><td>${x.desc}</td><td>${x.category}</td><td>${x.method}</td><td class="${x.type === "saida" ? "danger" : ""}">${x.type === "saida" ? "-" : "+"} ${money(x.value)}</td><td><button class="btn btn-ghost danger" data-delete-cash="${x.id}">Excluir</button></td></tr>`).join("")}</tbody></table></div>` : `<div class="toolbar"><span class="muted">Categorias usadas nas movimentações</span><button class="btn btn-dark" data-add-category>+ Categoria</button></div><div class="list-cards">${db.categories.map((c) => `<div class="list-card"><b>${c}</b><button class="btn btn-ghost danger" data-delete-category="${c}">Excluir</button></div>`).join("")}</div>`}</section>`;
  if (adminTab === "lembretes") {
    let stale = db.clients.filter(
        (c) => (Date.now() - new Date(c.lastVisit)) / 864e5 >= 20,
      ),
      birth = db.clients.filter(
        (c) => c.birth.slice(5, 7) === today().slice(5, 7),
      );
    return `<div class="split"><section class="panel"><h3>🎂 Aniversariantes do mês</h3>${birth.map((c) => reminder(c, "Parabéns pelo seu aniversário! A Barbearia Monteiro deseja um dia incrível.")).join("") || '<div class="empty">Nenhum aniversariante.</div>'}</section><section class="panel"><h3>✂ Retorno há 20+ dias</h3>${stale.map((c) => reminder(c, `Olá, ${c.name}! Já está na hora de renovar o visual. Que tal agendar seu corte?`)).join("")}</section></div>`;
  }
  if (adminTab === "servicos")
    return `<section class="panel"><div class="toolbar"><span class="muted">Nome, preço, duração e disponibilidade</span><button class="btn btn-dark" data-add-service>+ Serviço</button></div><div class="list-cards">${db.services.map((s) => `<div class="list-card"><span><b>${s.name}</b><br><small class="muted">${s.duration} min · ${money(s.price)}</small></span><span><button class="btn btn-ghost" data-edit-service="${s.id}">Editar</button><button class="badge ${s.active ? "green" : "red"}" data-toggle-service="${s.id}">${s.active ? "Ativo" : "Inativo"}</button><button class="btn btn-ghost danger" data-delete-service="${s.id}">Excluir</button></span></div>`).join("")}</div></section>`;
  return `<section class="panel"><div class="form-grid"><label class="field"><span>Nome da barbearia</span><input id="set-shop" value="${db.settings.shop}"></label><label class="field"><span>WhatsApp</span><input id="set-phone" value="${db.settings.phone}"></label><label class="field full"><span>Endereço</span><input id="set-address" value="${db.settings.address}"></label><label class="field"><span>Abertura</span><input id="set-open" type="time" value="${db.settings.open}"></label><label class="field"><span>Fechamento</span><input id="set-close" type="time" value="${db.settings.close}"></label><label class="field"><span>Início do intervalo</span><input id="set-break-start" type="time" value="${db.settings.breakStart}"></label><label class="field"><span>Fim do intervalo</span><input id="set-break-end" type="time" value="${db.settings.breakEnd}"></label><label class="field full"><span>Saudação do WhatsApp</span><textarea id="set-greeting" rows="4">${db.settings.greeting}</textarea></label></div><div class="modal-actions"><button class="btn btn-outline danger" data-reset>Restaurar demo</button><button class="btn btn-dark" data-save-settings>Salvar configurações</button></div></section>`;
}
function reminder(c, msg) {
  return `<div class="list-card"><span><b>${c.name}</b><br><small class="muted">${c.phone}</small></span><a class="btn btn-outline" target="_blank" href="https://wa.me/55${c.phone}?text=${encodeURIComponent(msg)}">Enviar</a></div>`;
}
function render() {
  app.innerHTML = location.hash === "#admin" ? adminPage() : publicPage();
  bind();
}
function bind() {
  document.querySelectorAll("[data-book]").forEach(
    (b) =>
      (b.onclick = () => {
        booking = {
          step: 0,
          serviceIds: b.dataset.service ? [b.dataset.service] : [],
          professional: "any",
          date: addDays(1),
          time: "",
          name: "",
          phone: "",
          notes: "",
        };
        document.body.insertAdjacentHTML("beforeend", bookingModal());
        bindBooking();
      }),
  );
  document.querySelector("[data-admin]")?.addEventListener("click", () => {
    location.hash = "admin";
  });
  document.querySelector("[data-public]")?.addEventListener("click", () => {
    location.hash = "";
  });
  document.querySelectorAll("[data-tab]").forEach(
    (x) =>
      (x.onclick = () => {
        adminTab = x.dataset.tab;
        render();
      }),
  );
  document.querySelectorAll("[data-status]").forEach(
    (x) =>
      (x.onclick = () => {
        let a = db.appointments.find((a) => a.id === x.dataset.status);
        a.status =
          a.status === "Agendado"
            ? "Concluído"
            : a.status === "Concluído"
              ? "Cancelado"
              : "Agendado";
        save();
        render();
      }),
  );
  document.querySelector("#agenda-date")?.addEventListener("change", (e) => {
    agendaDate = e.target.value;
    render();
  });
  document.querySelector("[data-add-appt]")?.addEventListener("click", () => {
    booking = {
      step: 0,
      serviceIds: [],
      professional: "any",
      date: agendaDate,
      time: "",
      name: "",
      phone: "",
      notes: "",
    };
    document.body.insertAdjacentHTML("beforeend", bookingModal());
    bindBooking();
  });
  document.querySelectorAll("[data-delete-appt]").forEach((x) =>
    x.addEventListener("click", () => {
      if (confirm("Excluir este agendamento?")) {
        db.appointments = db.appointments.filter(
          (a) => a.id !== x.dataset.deleteAppt,
        );
        save();
        render();
      }
    }),
  );
  document
    .querySelectorAll("[data-whatsapp]")
    .forEach(
      (x) =>
        (x.onclick = () =>
          open(`https://wa.me/55${x.dataset.whatsapp}`, "_blank")),
    );
  document.querySelectorAll("[data-toggle-service]").forEach(
    (x) =>
      (x.onclick = () => {
        let s = service(x.dataset.toggleService);
        s.active = !s.active;
        save();
        render();
      }),
  );
  document.querySelectorAll("[data-cash-tab]").forEach((x) =>
    x.addEventListener("click", () => {
      cashTab = x.dataset.cashTab;
      render();
    }),
  );
  document.querySelector("[data-add-cash]")?.addEventListener("click", () => {
    let desc = prompt("Descrição da movimentação:");
    if (!desc) return;
    let type = prompt("Tipo: entrada ou saida?", "entrada");
    let value = Number(prompt("Valor:", "50")?.replace(",", "."));
    let category = prompt(
      `Categoria: ${db.categories.join(", ")}`,
      type === "saida" ? "Insumos" : "Serviços",
    );
    let method = prompt("Método: Pix, Dinheiro ou Cartão", "Pix");
    db.cash.unshift({
      id: uid(),
      type: type === "saida" ? "saida" : "entrada",
      desc,
      value: value || 0,
      category: category || (type === "saida" ? "Insumos" : "Serviços"),
      date: today(),
      method: method || "Pix",
    });
    save();
    render();
    toast("Movimentação registrada");
  });
  document.querySelector("[data-add-client]")?.addEventListener("click", () => {
    let name = prompt("Nome do cliente:");
    if (!name) return;
    let phone = prompt("WhatsApp:", "62");
    db.clients.unshift({
      id: uid(),
      name,
      phone,
      birth: "1990-01-01",
      lastVisit: today(),
    });
    save();
    render();
  });
  document.querySelectorAll("[data-edit-client]").forEach((x) =>
    x.addEventListener("click", () => {
      const c = db.clients.find((c) => c.id === x.dataset.editClient);
      const name = prompt("Nome do cliente:", c.name);
      if (!name) return;
      c.name = name;
      c.phone = prompt("WhatsApp:", c.phone) || c.phone;
      c.birth = prompt("Nascimento (AAAA-MM-DD):", c.birth) || c.birth;
      c.lastVisit =
        prompt("Última visita (AAAA-MM-DD):", c.lastVisit) || c.lastVisit;
      save();
      render();
      toast("Cliente atualizado");
    }),
  );
  document.querySelectorAll("[data-delete-client]").forEach((x) =>
    x.addEventListener("click", () => {
      if (confirm("Excluir este cliente?")) {
        db.clients = db.clients.filter((c) => c.id !== x.dataset.deleteClient);
        save();
        render();
      }
    }),
  );
  document
    .querySelector("[data-add-service]")
    ?.addEventListener("click", () => {
      let name = prompt("Nome do serviço:");
      if (!name) return;
      let price = Number(prompt("Preço:", "50"));
      let duration = Number(prompt("Duração em minutos:", "30"));
      db.services.push({
        id: uid(),
        name,
        price,
        duration,
        active: true,
        desc: "Novo serviço",
      });
      save();
      render();
    });
  document.querySelectorAll("[data-edit-service]").forEach((x) =>
    x.addEventListener("click", () => {
      const s = service(x.dataset.editService);
      const name = prompt("Nome do serviço:", s.name);
      if (!name) return;
      s.name = name;
      s.price =
        Number(prompt("Preço:", String(s.price))?.replace(",", ".")) || s.price;
      s.duration =
        Number(prompt("Duração em minutos:", String(s.duration))) || s.duration;
      s.desc = prompt("Descrição:", s.desc || "") ?? s.desc;
      save();
      render();
      toast("Serviço atualizado");
    }),
  );
  document.querySelectorAll("[data-delete-service]").forEach((x) =>
    x.addEventListener("click", () => {
      if (confirm("Excluir este serviço?")) {
        db.services = db.services.filter(
          (s) => s.id !== x.dataset.deleteService,
        );
        save();
        render();
      }
    }),
  );
  document.querySelectorAll("[data-delete-cash]").forEach((x) =>
    x.addEventListener("click", () => {
      if (confirm("Excluir esta movimentação?")) {
        db.cash = db.cash.filter((m) => m.id !== x.dataset.deleteCash);
        save();
        render();
      }
    }),
  );
  document
    .querySelector("[data-add-category]")
    ?.addEventListener("click", () => {
      const name = prompt("Nome da nova categoria:");
      if (name && !db.categories.includes(name)) {
        db.categories.push(name);
        save();
        render();
      }
    });
  document.querySelectorAll("[data-delete-category]").forEach((x) =>
    x.addEventListener("click", () => {
      if (db.cash.some((m) => m.category === x.dataset.deleteCategory))
        return toast("Categoria em uso; altere as movimentações primeiro");
      db.categories = db.categories.filter(
        (c) => c !== x.dataset.deleteCategory,
      );
      save();
      render();
    }),
  );
  document
    .querySelector("[data-save-settings]")
    ?.addEventListener("click", () => {
      db.settings.shop = document.querySelector("#set-shop").value;
      db.settings.phone = document.querySelector("#set-phone").value;
      db.settings.address = document.querySelector("#set-address").value;
      db.settings.open = document.querySelector("#set-open").value;
      db.settings.close = document.querySelector("#set-close").value;
      db.settings.breakStart = document.querySelector("#set-break-start").value;
      db.settings.breakEnd = document.querySelector("#set-break-end").value;
      db.settings.greeting = document.querySelector("#set-greeting").value;
      save();
      toast("Configurações salvas");
    });
  document.querySelector("[data-reset]")?.addEventListener("click", () => {
    if (confirm("Restaurar todos os dados da demo?")) {
      db = structuredClone(seed);
      save();
      render();
    }
  });
  document.querySelector("#search")?.addEventListener("input", (e) => {
    document
      .querySelectorAll("#client-list .list-card")
      .forEach(
        (x) =>
          (x.style.display = x.innerText
            .toLowerCase()
            .includes(e.target.value.toLowerCase())
            ? ""
            : "none"),
      );
  });
  document.querySelector("[data-quick]")?.addEventListener("click", () => {
    const targets = {
      agenda: "[data-add-appt]",
      clientes: "[data-add-client]",
      caixa: "[data-add-cash]",
      servicos: "[data-add-service]",
    };
    if (targets[adminTab]) document.querySelector(targets[adminTab])?.click();
    else if (adminTab === "dashboard") {
      adminTab = "agenda";
      render();
      document.querySelector("[data-add-appt]")?.click();
    } else
      toast(
        adminTab === "config"
          ? "Edite os campos e clique em Salvar"
          : "Use os botões de WhatsApp ao lado de cada lembrete",
      );
  });
}
function bindBooking() {
  let modal = document.querySelector("#booking-modal");
  modal.querySelector("[data-close]").onclick = () => modal.remove();
  modal.querySelectorAll("[data-select-service]").forEach(
    (x) =>
      (x.onclick = () => {
        booking.serviceIds = booking.serviceIds.includes(
          x.dataset.selectService,
        )
          ? booking.serviceIds.filter((i) => i !== x.dataset.selectService)
          : [...booking.serviceIds, x.dataset.selectService];
        refreshModal();
      }),
  );
  modal.querySelectorAll("[data-prof]").forEach(
    (x) =>
      (x.onclick = () => {
        booking.professional = x.dataset.prof;
        refreshModal();
      }),
  );
  modal.querySelectorAll("[data-time]").forEach(
    (x) =>
      (x.onclick = () => {
        booking.time = x.dataset.time;
        refreshModal();
      }),
  );
  modal.querySelector("#book-date")?.addEventListener("change", (e) => {
    booking.date = e.target.value;
    booking.time = "";
    refreshModal();
  });
  modal.querySelector("[data-prev]")?.addEventListener("click", () => {
    booking.step--;
    refreshModal();
  });
  modal.querySelector("[data-next]")?.addEventListener("click", () => {
    if (booking.step === 0 && !booking.serviceIds.length)
      return toast("Selecione ao menos um serviço");
    if (booking.step === 2 && !booking.time) return toast("Escolha um horário");
    if (booking.step === 3) {
      booking.name = modal.querySelector("#book-name").value.trim();
      booking.phone = modal
        .querySelector("#book-phone")
        .value.replace(/\D/g, "");
      booking.notes = modal.querySelector("#book-notes").value;
      if (!booking.name || booking.phone.length < 10)
        return toast("Preencha nome e WhatsApp");
      let t = total(),
        prof =
          booking.professional === "any"
            ? PEOPLE.find(
                (p) =>
                  !db.appointments.some(
                    (a) =>
                      a.date === booking.date &&
                      a.time === booking.time &&
                      a.professional === p.id,
                  ),
              )?.id || "joao"
            : booking.professional;
      db.appointments.push({
        id: uid(),
        client: booking.name,
        phone: booking.phone,
        serviceIds: [...booking.serviceIds],
        professional: prof,
        date: booking.date,
        time: booking.time,
        duration: t.duration,
        total: t.price,
        status: "Agendado",
        notes: booking.notes,
      });
      if (!db.clients.some((c) => c.phone === booking.phone))
        db.clients.push({
          id: uid(),
          name: booking.name,
          phone: booking.phone,
          birth: "1990-01-01",
          lastVisit: today(),
        });
      save();
    }
    booking.step++;
    refreshModal();
  });
}
function refreshModal() {
  document.querySelector("#booking-modal").outerHTML = bookingModal();
  bindBooking();
}
window.addEventListener("hashchange", render);
render();
