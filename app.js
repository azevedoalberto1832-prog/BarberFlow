const SUPABASE_URL = "https://qcjjqdkjfvnbslbpnrgk.supabase.co";
const SUPABASE_KEY = "sb_publishable_27mV2bABNSGQYPkGEF-T4g_XBQtb2r7";
const PAGE_PARAMS = new URLSearchParams(location.search);
const PLATFORM_ENTRY = PAGE_PARAMS.has("platform");
const SHOP_SLUG = PAGE_PARAMS.get("tenant");
const CHRONA_HOME = !SHOP_SLUG && !PLATFORM_ENTRY;
const AUTH_CALLBACK = new URLSearchParams(location.hash.startsWith("#") ? location.hash.slice(1) : "");
const PASSWORD_FLOW = ["recovery","invite"].includes(AUTH_CALLBACK.get("type")) && !!AUTH_CALLBACK.get("access_token");
document.body.dataset.tenant = SHOP_SLUG || "chrona";
let authSession = JSON.parse(sessionStorage.getItem("chrona-session") || "null");
async function rpc(name, body) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json", ...(authSession?.access_token ? { Authorization:`Bearer ${authSession.access_token}` } : {}) },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || data?.hint || "Não foi possível concluir a operação");
  return data;
}
async function signIn(email,password) {
  const response=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`,{method:"POST",headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},body:JSON.stringify({email,password})});
  const data=await response.json();
  if(!response.ok) throw new Error(data.error_description || data.msg || "E-mail ou senha inválidos");
  authSession=data; sessionStorage.setItem("chrona-session",JSON.stringify(data)); return data;
}
async function requestPasswordReset(email){
  const redirectTo=`${location.origin}${location.pathname}${location.search}`;
  const response=await fetch(`${SUPABASE_URL}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`,{method:"POST",headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},body:JSON.stringify({email})});
  const data=await response.json().catch(()=>null);
  if(!response.ok) throw new Error(data?.msg||data?.message||"Não foi possível enviar o link agora");
}
async function updatePassword(password){
  const response=await fetch(`${SUPABASE_URL}/auth/v1/user`,{method:"PUT",headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${AUTH_CALLBACK.get("access_token")}`,"Content-Type":"application/json"},body:JSON.stringify({password})});
  const data=await response.json().catch(()=>null);
  if(!response.ok) throw new Error(data?.msg||data?.message||"O link expirou. Solicite um novo.");
  return data;
}
async function rest(path,{method="GET",body,prefer="return=representation"}={}) {
  if(!authSession?.access_token) throw new Error("Sessão expirada. Entre novamente.");
  const response=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{method,headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${authSession.access_token}`,"Content-Type":"application/json",Prefer:prefer},body:body===undefined?undefined:JSON.stringify(body)});
  const data=response.status===204?null:await response.json().catch(()=>null);
  if(!response.ok) throw new Error(data?.message || data?.hint || "Não foi possível salvar a alteração");
  return data;
}
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
let PEOPLE = [
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
    shop: "PALAZZO STUDIO BARBER",
    address: "Rua das Palmeiras, 128 — Centro, Goiânia - GO",
    phone: "5565992788465",
    open: "09:00",
    close: "19:00",
    breakStart: "12:00",
    breakEnd: "13:00",
    greeting:
      "Olá! Bem-vindo à PALAZZO STUDIO BARBER. Agende seu horário pelo nosso sistema oficial.",
  },
};
let db = structuredClone({ ...seed, services: [], people: [], clients: [], appointments: [], cash: [] });
db.settings.shop = "PALAZZO STUDIO BARBER";
db.settings.phone = "5565992788465";
db.settings.greeting =
  "Olá! Bem-vindo à PALAZZO STUDIO BARBER. Agende seu horário pelo nosso sistema oficial.";
let booking = {
  step: 0,
  serviceIds: [],
  professional: "any",
  date: addDays(1),
  time: "",
  name: "",
  phone: "",
  birth: "",
  notes: "",
  clientId: "",
  lookupDone: false,
  adminMode: false,
  optIn: false,
};
let adminTab = "dashboard";
let cashTab = "movimentos";
let agendaDate = addDays(1);
let currentProfile=null,currentShop=null,currentSubscription=null,adminLoaded=false,platformTenants=[];
let crmPipelines=[],crmStages=[],crmOpportunities=[],activePipelineId="";
const save = () => {};
let remoteSlots = [], slotProfessionals = {}, slotsLoaded = false;
const money = (v) =>
  Number(v||0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dateBR = (d) => d ? new Date(d + "T12:00").toLocaleDateString("pt-BR") : "—";
const dateTimeBR = (d) => d ? new Date(d).toLocaleString("pt-BR", { dateStyle:"short", timeStyle:"short" }) : "Sem próxima ação";
const dateTimeLocal = (d) => d ? new Date(new Date(d).getTime()-new Date(d).getTimezoneOffset()*60000).toISOString().slice(0,16) : "";
const esc = (value) => String(value??"").replace(/[&<>"']/g,(char)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[char]);
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
function openAdminForm(kind, id = "") {
  document.querySelector("#admin-form-modal")?.remove();
  let title = "",
    fields = "",
    item;
  if (kind === "client") {
    item = db.clients.find((x) => x.id === id) || {
      name: "",
      phone: "",
      birth: "1990-01-01",
      lastVisit: today(),
    };
    title = id ? "Editar cliente" : "Novo cliente";
    fields = `<label class="field"><span>Nome *</span><input name="name" value="${item.name}" required></label><label class="field"><span>WhatsApp *</span><input name="phone" value="${item.phone}" required></label><label class="field"><span>Nascimento</span><input name="birth" type="date" value="${item.birth}"></label><label class="field"><span>Última visita</span><input name="lastVisit" type="date" value="${item.lastVisit}"></label>`;
  } else if (kind === "service") {
    item = db.services.find((x) => x.id === id) || {
      name: "",
      price: 50,
      duration: 30,
      desc: "",
    };
    title = id ? "Editar serviço" : "Novo serviço";
    fields = `<label class="field"><span>Nome *</span><input name="name" value="${item.name}" required></label><label class="field"><span>Preço *</span><input name="price" type="number" step="0.01" value="${item.price}" required></label><label class="field"><span>Duração (min) *</span><input name="duration" type="number" step="15" value="${item.duration}" required></label><label class="field full"><span>Descrição</span><textarea name="desc" rows="3">${item.desc || ""}</textarea></label>`;
  } else if(kind === "professional") {
    item=PEOPLE.find(x=>x.id===id)||{name:"",phone:"",active:true};
    title=id?"Editar profissional":"Novo profissional";
    fields=`<label class="field"><span>Nome *</span><input name="name" value="${item.name}" required></label><label class="field"><span>WhatsApp</span><input name="phone" value="${item.phone||""}"></label>`;
  } else {
    title = "Nova movimentação";
    fields = `<label class="field"><span>Descrição *</span><input name="desc" required></label><label class="field"><span>Tipo</span><select name="type"><option value="entrada">Entrada</option><option value="saida">Saída</option></select></label><label class="field"><span>Valor *</span><input name="value" type="number" step="0.01" required></label><label class="field"><span>Categoria</span><select name="category">${db.categories.map((c) => `<option>${c}</option>`).join("")}</select></label><label class="field"><span>Método</span><select name="method"><option>Pix</option><option>Dinheiro</option><option>Cartão</option></select></label><label class="field"><span>Data</span><input name="date" type="date" value="${today()}"></label>`;
  }
  document.body.insertAdjacentHTML(
    "beforeend",
    `<div class="modal" id="admin-form-modal"><div class="modal-card" style="max-width:620px"><div class="modal-head"><div><div class="eyebrow">CHRONA</div><h3 style="font-size:27px">${title}</h3></div><button type="button" class="btn btn-ghost" data-form-close>✕</button></div><form class="modal-body" id="admin-form"><div class="form-grid">${fields}</div><div class="modal-actions"><button type="button" class="btn btn-outline" data-form-close>Cancelar</button><button class="btn btn-dark" type="submit">Salvar</button></div></form></div></div>`,
  );
  document
    .querySelectorAll("[data-form-close]")
    .forEach(
      (x) =>
        (x.onclick = () =>
          document.querySelector("#admin-form-modal")?.remove()),
    );
  document.querySelector("#admin-form").onsubmit = async (event) => {
    event.preventDefault();
    const submit=event.currentTarget.querySelector("button[type=submit]"); submit.disabled=true;
    const form = new FormData(event.currentTarget);
    const value = Object.fromEntries(form.entries());
    try {
      if (kind === "client") {
        const phone=value.phone.replace(/\D/g,""); if(phone.length<10) throw new Error("Informe um WhatsApp válido");
        const data={barbershop_id:currentProfile.barbershop_id,name:value.name.trim(),phone:value.phone,phone_normalized:phone,birth_date:value.birth||null,last_visit:value.lastVisit||null};
        await rest(id?`clients?id=eq.${id}`:"clients",{method:id?"PATCH":"POST",body:data});
      }
      if (kind === "service") {
        const data={barbershop_id:currentProfile.barbershop_id,name:value.name.trim(),description:value.desc||null,price:Number(value.price),duration_minutes:Number(value.duration),...(id?{}:{active:true})};
        await rest(id?`services?id=eq.${id}`:"services",{method:id?"PATCH":"POST",body:data});
      }
      if(kind === "professional"){
        const data={barbershop_id:currentProfile.barbershop_id,name:value.name.trim(),phone:value.phone||null,...(id?{}:{active:true})};
        await rest(id?`professionals?id=eq.${id}`:"professionals",{method:id?"PATCH":"POST",body:data});
      }
      if (kind === "cash") await rest("cash_transactions",{method:"POST",body:{barbershop_id:currentProfile.barbershop_id,type:value.type==="entrada"?"income":"expense",description:value.desc.trim(),amount:Number(value.value),category:value.category,payment_method:value.method,transaction_date:value.date,created_by:currentProfile.id}});
      await loadAdminData(); document.querySelector("#admin-form-modal")?.remove(); render(); toast("Alteração salva no sistema");
    } catch(error){toast(error.message);submit.disabled=false;}
  };
}
function currentPipeline(){
  return crmPipelines.find((pipeline)=>pipeline.id===activePipelineId)||crmPipelines.find((pipeline)=>pipeline.active)||crmPipelines[0];
}
function openCrmForm(kind,id="",defaultStageId=""){
  document.querySelector("#crm-form-modal")?.remove();
  const pipeline=currentPipeline();
  let title="",fields="",item;
  if(kind==="opportunity"){
    item=crmOpportunities.find((opportunity)=>opportunity.id===id)||{client_id:db.clients[0]?.id||"",stage_id:defaultStageId||crmStages.find((stage)=>stage.pipeline_id===pipeline?.id)?.id||"",title:"",source:"manual",value:"",next_action_at:"",status:"open",notes:""};
    title=id?"Editar oportunidade":"Nova oportunidade";
    const pipelineStages=crmStages.filter((stage)=>stage.pipeline_id===pipeline?.id).sort((a,b)=>a.position-b.position);
    fields=`<label class="field"><span>Cliente *</span><select name="client_id" required><option value="">Selecione</option>${db.clients.map((client)=>`<option value="${client.id}" ${client.id===item.client_id?"selected":""}>${esc(client.name)} · ${esc(client.phone)}</option>`).join("")}</select></label><label class="field"><span>Etapa *</span><select name="stage_id" required>${pipelineStages.map((stage)=>`<option value="${stage.id}" ${stage.id===item.stage_id?"selected":""}>${esc(stage.name)}</option>`).join("")}</select></label><label class="field full"><span>Título *</span><input name="title" value="${esc(item.title)}" placeholder="Ex.: Retorno para corte e barba" required></label><label class="field"><span>Valor estimado</span><input name="value" type="number" min="0" step="0.01" value="${item.value??""}"></label><label class="field"><span>Próxima ação</span><input name="next_action_at" type="datetime-local" value="${dateTimeLocal(item.next_action_at)}"></label><label class="field"><span>Origem</span><select name="source">${[["manual","Manual"],["whatsapp","WhatsApp"],["instagram","Instagram"],["referral","Indicação"],["appointment","Agendamento"]].map(([value,label])=>`<option value="${value}" ${value===item.source?"selected":""}>${label}</option>`).join("")}</select></label><label class="field"><span>Status</span><select name="status">${[["open","Em aberto"],["won","Ganha"],["lost","Perdida"],["archived","Arquivada"]].map(([value,label])=>`<option value="${value}" ${value===item.status?"selected":""}>${label}</option>`).join("")}</select></label><label class="field full"><span>Observações</span><textarea name="notes" rows="4">${esc(item.notes)}</textarea></label>`;
  }else if(kind==="pipeline"){
    item=crmPipelines.find((pipeline)=>pipeline.id===id)||{name:""};
    title=id?"Editar pipeline":"Novo pipeline";
    fields=`<label class="field full"><span>Nome *</span><input name="name" value="${esc(item.name)}" placeholder="Ex.: Relacionamento" required></label>${id?"":'<p class="muted field full">O novo pipeline começa com quatro etapas que você pode personalizar.</p>'}`;
  }else{
    item=crmStages.find((stage)=>stage.id===id)||{name:"",color:"#9caeff",position:crmStages.filter((stage)=>stage.pipeline_id===pipeline?.id).length+1};
    title=id?"Editar etapa":"Nova etapa";
    fields=`<label class="field"><span>Nome *</span><input name="name" value="${esc(item.name)}" required></label><label class="field"><span>Cor</span><input name="color" type="color" value="${item.color||"#9caeff"}"></label><label class="field"><span>Posição</span><input name="position" type="number" min="1" max="99" value="${item.position}" required></label>`;
  }
  document.body.insertAdjacentHTML("beforeend",`<div class="modal" id="crm-form-modal"><div class="modal-card" style="max-width:680px"><div class="modal-head"><div><div class="eyebrow">CRM CHRONA</div><h3 style="font-size:27px">${title}</h3></div><button type="button" class="btn btn-ghost" data-crm-close>✕</button></div><form class="modal-body" id="crm-form"><div class="form-grid">${fields}</div><div class="modal-actions"><button type="button" class="btn btn-outline" data-crm-close>Cancelar</button><button class="btn btn-dark" type="submit">Salvar</button></div></form></div></div>`);
  document.querySelectorAll("[data-crm-close]").forEach((button)=>button.onclick=()=>document.querySelector("#crm-form-modal")?.remove());
  document.querySelector("#crm-form").onsubmit=async(event)=>{
    event.preventDefault();
    const button=event.currentTarget.querySelector('button[type="submit"]');button.disabled=true;
    const values=Object.fromEntries(new FormData(event.currentTarget).entries());
    try{
      if(kind==="opportunity"){
        const body={barbershop_id:currentProfile.barbershop_id,client_id:values.client_id,stage_id:values.stage_id,title:values.title.trim(),source:values.source,value:values.value===""?null:Number(values.value),next_action_at:values.next_action_at?new Date(values.next_action_at).toISOString():null,status:values.status,notes:values.notes.trim()||null,updated_at:new Date().toISOString()};
        await rest(id?`crm_opportunities?id=eq.${id}`:"crm_opportunities",{method:id?"PATCH":"POST",body});
      }else if(kind==="pipeline"){
        if(id) await rest(`crm_pipelines?id=eq.${id}`,{method:"PATCH",body:{name:values.name.trim()}});
        else{
          const created=await rest("crm_pipelines",{method:"POST",body:{barbershop_id:currentProfile.barbershop_id,name:values.name.trim(),active:true}});
          const newPipeline=created?.[0];
          if(newPipeline){
            activePipelineId=newPipeline.id;
            await rest("crm_stages",{method:"POST",body:[["Novo contato","#9caeff"],["Agendamento pendente","#d8b7bd"],["Cliente ativo","#72b88d"],["Reativação","#e5a76f"]].map(([name,color],index)=>({barbershop_id:currentProfile.barbershop_id,pipeline_id:newPipeline.id,name,position:index+1,color}))});
          }
        }
      }else{
        const body={barbershop_id:currentProfile.barbershop_id,pipeline_id:pipeline.id,name:values.name.trim(),position:Number(values.position),color:values.color};
        await rest(id?`crm_stages?id=eq.${id}`:"crm_stages",{method:id?"PATCH":"POST",body});
      }
      await loadAdminData();document.querySelector("#crm-form-modal")?.remove();render();toast("CRM atualizado");
    }catch(error){toast(error.message);button.disabled=false;}
  };
}
async function updateOpportunity(id,body,message){
  try{await rest(`crm_opportunities?id=eq.${id}`,{method:"PATCH",body:{...body,updated_at:new Date().toISOString()}});await loadAdminData();render();toast(message);}
  catch(error){toast(error.message);}
}
function confirmAdmin(message, action) {
  document.querySelector("#admin-confirm")?.remove();
  document.body.insertAdjacentHTML(
    "beforeend",
    `<div class="modal" id="admin-confirm"><div class="modal-card" style="max-width:440px"><div class="modal-body"><h3 style="font-size:27px">Confirmar exclusão</h3><p class="muted">${message}</p><div class="modal-actions"><button class="btn btn-outline" data-confirm-no>Cancelar</button><button class="btn btn-dark danger" data-confirm-yes>Excluir</button></div></div></div></div>`,
  );
  document.querySelector("[data-confirm-no]").onclick = () =>
    document.querySelector("#admin-confirm").remove();
  document.querySelector("[data-confirm-yes]").onclick = async () => {
    const button=document.querySelector("[data-confirm-yes]"); button.disabled=true;
    try{await action();await loadAdminData();document.querySelector("#admin-confirm").remove();render();toast("Alteração concluída");}
    catch(error){toast(error.message);button.disabled=false;}
  };
}
function openPaymentForm(appointment){
  document.querySelector("#payment-modal")?.remove();
  document.body.insertAdjacentHTML("beforeend",`<div class="modal" id="payment-modal"><div class="modal-card" style="max-width:500px"><div class="modal-head"><div><div class="eyebrow">CONCLUIR ATENDIMENTO</div><h3 style="font-size:27px">${appointment.client}</h3></div><button class="btn btn-ghost" data-payment-close>✕</button></div><form id="payment-form" class="modal-body"><div class="form-grid"><label class="field"><span>Valor recebido</span><input name="amount" type="number" step="0.01" min="0.01" value="${appointment.total}" required></label><label class="field"><span>Forma de pagamento</span><select name="method"><option>Pix</option><option>Dinheiro</option><option>Débito</option><option>Crédito</option></select></label></div><div class="modal-actions"><button type="button" class="btn btn-outline" data-payment-close>Cancelar</button><button class="btn btn-dark" type="submit">Concluir e lançar no caixa</button></div></form></div></div>`);
  document.querySelectorAll("[data-payment-close]").forEach(x=>x.onclick=()=>document.querySelector("#payment-modal")?.remove());
  document.querySelector("#payment-form").onsubmit=async(e)=>{e.preventDefault();const button=e.currentTarget.querySelector("button[type=submit]");button.disabled=true;const form=new FormData(e.currentTarget);try{await rpc("complete_appointment",{target_appointment:appointment.id,paid_amount:Number(form.get("amount")),paid_method:form.get("method")});await loadAdminData();document.querySelector("#payment-modal")?.remove();render();toast("Atendimento concluído e lançado no caixa");}catch(error){toast(error.message);button.disabled=false;}};
}
async function loadPublicData() {
  try {
    const payload = await rpc("get_public_shop", { shop_slug: SHOP_SLUG });
    if (!payload?.shop) throw new Error("Barbearia indisponível");
    const shop = payload.shop;
    db.services = (payload.services || []).map((s) => ({ id:s.id, name:s.name, desc:s.description, duration:s.duration_minutes, price:Number(s.price), active:s.active }));
    PEOPLE = (payload.professionals || []).map((p) => ({ id:p.id, name:p.name }));
    db.settings = { shop:shop.name, address:shop.address || "Endereço a confirmar", phone:shop.phone || "", open:shop.opening_time?.slice(0,5) || "09:00", close:shop.closing_time?.slice(0,5) || "19:00", breakStart:shop.break_start?.slice(0,5) || "", breakEnd:shop.break_end?.slice(0,5) || "", greeting:shop.whatsapp_message || "Olá! Agende seu horário pela Chrona.", instagram:shop.instagram || "", logo:shop.logo_url || "" };
    document.title = `${shop.name} | Agendamento`;
    render();
  } catch (error) {
    app.innerHTML = `<main class="section"><div class="container empty"><h2>Não foi possível carregar a agenda</h2><p>${error.message}</p><button class="btn btn-dark" onclick="location.reload()">Tentar novamente</button></div></main>`;
  }
}
async function loadAvailableSlots() {
  remoteSlots=[]; slotProfessionals={}; slotsLoaded=false;
  const people = (booking.professional === "any" ? PEOPLE : PEOPLE.filter((p)=>p.id===booking.professional)).filter(p=>p.active!==false);
  const results = await Promise.all(people.map(async (p) => ({ p, slots: await rpc("get_available_slots", { shop_slug:SHOP_SLUG, professional:p.id, service_ids:booking.serviceIds, appt_date:booking.date }) })));
  results.forEach(({p,slots}) => (slots || []).forEach((row) => { const value=String(row.slot).slice(0,5); slotProfessionals[value] ||= p.id; }));
  remoteSlots=Object.keys(slotProfessionals).sort();
  slotsLoaded=true;
}
function publicPage() {
  const social=db.settings.instagram?`<a class="btn btn-outline" target="_blank" href="https://www.instagram.com/${db.settings.instagram.replace(/^@/,"")}/">${db.settings.instagram}</a>`:"";
  const logo=db.settings.logo?`<img class="brand-logo" src="${db.settings.logo}" alt="Logo ${db.settings.shop}">`:`<span class="brand-logo" style="display:grid;place-items:center;font-weight:800">N</span>`;
  const heroLogo=db.settings.logo?`<img class="hero-logo" src="${db.settings.logo}" alt="${db.settings.shop}">`:`<div class="hero-logo" style="display:grid;place-items:center;font-size:clamp(48px,8vw,100px);font-weight:800;letter-spacing:.08em">NL</div>`;
  return `<header class="topbar"><div class="container"><div class="brand">${logo}<div>${db.settings.shop}<small>AGENDA POR CHRONA</small></div></div><div>${social} <a class="btn btn-outline" target="_blank" href="https://wa.me/${db.settings.phone}?text=${encodeURIComponent(db.settings.greeting)}">WhatsApp</a> <button class="btn btn-dark" data-book>Agendar horário</button></div></div></header><main><section class="hero"><div class="container hero-grid"><div><div class="eyebrow">Sistema oficial de agendamento</div><h1>${db.settings.shop}</h1><p>Faça um cadastro rápido, escolha seu serviço e veja somente os horários realmente disponíveis.</p><div class="hero-actions"><button class="btn btn-copper" data-book>Agendar horário →</button>${social}<a class="btn btn-outline" target="_blank" href="https://wa.me/${db.settings.phone}?text=${encodeURIComponent(db.settings.greeting)}">WhatsApp</a></div></div>${heroLogo}</div></section><section class="section" id="servicos"><div class="container"><div class="section-head"><div><div class="eyebrow">Serviços</div><h2>Escolha o seu atendimento</h2></div><p class="muted">Preço e duração atualizados.<br>Você pode combinar mais de um serviço.</p></div><div class="service-grid">${db.services
    .filter((s) => s.active)
    .map(
      (s) =>
        `<article class="service-card"><div class="service-meta"><span class="eyebrow">${s.duration} MIN</span><span class="price">${money(s.price)}</span></div><h3 style="font-size:27px;margin:25px 0 10px">${s.name}</h3><p class="muted">${s.desc || "Atendimento personalizado."}</p><button class="btn btn-outline" data-book data-service="${s.id}">Agendar este serviço</button></article>`,
    )
    .join(
      "",
    )}</div></div></section><section class="section"><div class="container"><div class="location"><div><div class="eyebrow">Endereço</div><h2 style="font-size:38px;margin:8px 0">${db.settings.shop}</h2><p>${db.settings.address}</p></div><div><button class="btn btn-copper" data-book>Agendar horário</button> <a class="btn btn-outline" target="_blank" href="https://maps.google.com/?q=${encodeURIComponent(db.settings.address)}">Abrir no mapa</a></div></div></div></section></main><footer class="footer"><div class="container"><span>© ${db.settings.shop}</span><div>${social}<button class="btn btn-outline" data-admin>Área da empresa</button></div></div></footer>`;
}
function chronaHomePage(){
  document.title="Chrona | Agenda e gestão para negócios";
  return `<header class="topbar chrona-site"><div class="container"><div class="brand"><span class="brand-logo" style="display:grid;place-items:center;font-weight:800">C</span><div>CHRONA<small>AGENDA · GESTÃO · RELACIONAMENTO</small></div></div><div><a class="btn btn-outline" href="#plataforma">Plataforma</a> <a class="btn btn-dark" href="?platform=chrona#admin">Entrar</a></div></div></header><main class="chrona-site"><section class="hero"><div class="container hero-grid"><div><div class="eyebrow">SaaS MULTI-TENANT</div><h1>Tempo organizado. Negócios em movimento.</h1><p>A Chrona conecta agenda, clientes, caixa e relacionamento em uma única plataforma para empresas que trabalham com atendimento por horário.</p><div class="hero-actions"><a class="btn btn-dark" href="#demonstracoes">Ver demonstrações</a><a class="btn btn-outline" href="?platform=chrona#admin">Administração Chrona</a></div></div><div class="hero-card"><div class="eyebrow">UMA PLATAFORMA</div><h2 style="font-size:42px;margin:12px 0">Vários negócios.<br>Dados isolados.</h2><p>Cada empresa possui identidade, serviços, equipe, clientes e operação próprios.</p></div></div></section><section class="section" id="plataforma"><div class="container"><div class="section-head"><div><div class="eyebrow">PLATAFORMA</div><h2>Base pronta para crescer</h2></div></div><div class="service-grid"><article class="service-card"><div class="eyebrow">OPERAÇÃO</div><h3>Agenda inteligente</h3><p class="muted">Disponibilidade real, múltiplos serviços e bloqueio contra sobreposição.</p></article><article class="service-card"><div class="eyebrow">GESTÃO</div><h3>Clientes e caixa</h3><p class="muted">Atendimento, histórico, pagamentos e indicadores conectados.</p></article><article class="service-card"><div class="eyebrow">EVOLUÇÃO</div><h3>CRM e automações</h3><p class="muted">Arquitetura preparada para retenção e WhatsApp oficial.</p></article></div></div></section><section class="section" id="demonstracoes"><div class="container"><div class="section-head"><div><div class="eyebrow">TENANTS</div><h2>Demonstrações da plataforma</h2></div></div><div class="split"><article class="service-card"><div class="eyebrow">BARBEARIA</div><h3>Palazzo Studio Barber</h3><p class="muted">Primeiro tenant real da Chrona.</p><a class="btn btn-outline" href="?tenant=palazzo">Abrir demonstração</a></article><article class="service-card"><div class="eyebrow">LASH DESIGNER</div><h3>Nayara Lash Designer</h3><p class="muted">Tenant de validação multi-segmento.</p><a class="btn btn-outline" href="?tenant=nayara-lash">Abrir demonstração</a></article></div></div></section></main><footer class="footer chrona-site"><div class="container"><span>© Chrona</span><span class="muted">Uma aplicação. Várias empresas.</span></div></footer>`;
}
async function loadAdminData() {
  if(!authSession) return;
  const profiles=await rest("profiles?select=id,barbershop_id,name,role,active&auth_user_id=eq."+encodeURIComponent(authSession.user.id));
  currentProfile=profiles?.[0];
  if(!currentProfile?.active) throw new Error("Usuário sem acesso ativo.");
  if(currentProfile.role==="platform_admin"){
    const [shops,subscriptions,profilesAll,appointments]=await Promise.all([
      rest("barbershops?select=*&order=created_at.desc"),
      rest("subscriptions?select=*&order=created_at.desc"),
      rest("profiles?select=id,barbershop_id,role,active"),
      rest("appointments?select=id,barbershop_id,status")
    ]);
    platformTenants=(shops||[]).map(shop=>({shop,subscription:(subscriptions||[]).find(s=>s.barbershop_id===shop.id),users:(profilesAll||[]).filter(p=>p.barbershop_id===shop.id).length,appointments:(appointments||[]).filter(a=>a.barbershop_id===shop.id).length}));
    adminLoaded=true; return;
  }
  const shops=await rest(`barbershops?select=*&id=eq.${currentProfile.barbershop_id}`); currentShop=shops?.[0];
  const [services,professionals,clients,appointments,cash,subscriptions,categories,pipelines,stages,opportunities]=await Promise.all([
    rest(`services?select=*&barbershop_id=eq.${currentProfile.barbershop_id}&order=name`),
    rest(`professionals?select=*&barbershop_id=eq.${currentProfile.barbershop_id}&order=name`),
    rest(`clients?select=*&barbershop_id=eq.${currentProfile.barbershop_id}&order=name`),
    rpc("get_public_agenda",{shop_slug:currentShop.slug,appt_date:null}),
    rest(`cash_transactions?select=*&barbershop_id=eq.${currentProfile.barbershop_id}&order=transaction_date.desc,created_at.desc`),
    rest(`subscriptions?select=*&barbershop_id=eq.${currentProfile.barbershop_id}`),
    rest(`cash_categories?select=*&barbershop_id=eq.${currentProfile.barbershop_id}&order=name`),
    rest(`crm_pipelines?select=*&barbershop_id=eq.${currentProfile.barbershop_id}&order=created_at`),
    rest(`crm_stages?select=*&barbershop_id=eq.${currentProfile.barbershop_id}&order=position`),
    rest(`crm_opportunities?select=*&barbershop_id=eq.${currentProfile.barbershop_id}&order=updated_at.desc`),
  ]);
  currentSubscription=subscriptions?.[0];
  db.services=(services||[]).map(s=>({id:s.id,name:s.name,desc:s.description,duration:s.duration_minutes,price:Number(s.price),active:s.active}));
  PEOPLE=(professionals||[]).map(p=>({id:p.id,name:p.name,phone:p.phone,active:p.active}));
  db.clients=(clients||[]).map(c=>({id:c.id,name:c.name,phone:c.phone,birth:c.birth_date||"",lastVisit:c.last_visit||"",notes:c.notes||"",optIn:c.whatsapp_opt_in}));
  db.appointments=Array.isArray(appointments)?appointments:[];
  db.cash=(cash||[]).map(x=>({id:x.id,appointmentId:x.appointment_id,type:x.type==="income"?"entrada":"saida",desc:x.description,value:Number(x.amount),category:x.category,date:x.transaction_date,method:x.payment_method||""}));
  db.categories=(categories||[]).map(c=>c.name);
  crmPipelines=pipelines||[];
  crmStages=stages||[];
  crmOpportunities=(opportunities||[]).map((opportunity)=>({...opportunity,value:opportunity.value===null?null:Number(opportunity.value)}));
  if(!crmPipelines.some((pipeline)=>pipeline.id===activePipelineId)) activePipelineId=crmPipelines.find((pipeline)=>pipeline.active)?.id||crmPipelines[0]?.id||"";
  if(currentShop) db.settings={shop:currentShop.name,address:currentShop.address||"",phone:currentShop.phone||"",open:currentShop.opening_time?.slice(0,5)||"09:00",close:currentShop.closing_time?.slice(0,5)||"19:00",breakStart:currentShop.break_start?.slice(0,5)||"",breakEnd:currentShop.break_end?.slice(0,5)||"",greeting:currentShop.whatsapp_message||"",instagram:currentShop.instagram||"",logo:currentShop.logo_url||"palazzo-logo.jpg"};
  adminLoaded=true;
}
function loginPage(){return `<main class="section chrona-login"><div class="container"><section class="panel" style="max-width:460px;margin:7vh auto"><div class="eyebrow">CHRONA</div><h2>${PLATFORM_ENTRY?"Administração da plataforma":"Acesso da empresa"}</h2><p class="muted">${PLATFORM_ENTRY?"Acesso exclusivo do proprietário da Chrona.":"Entre com a conta vinculada ao seu estabelecimento."}</p><form id="login-form"><label class="field"><span>E-mail</span><input name="email" type="email" autocomplete="username" required></label><label class="field"><span>Senha</span><input name="password" type="password" autocomplete="current-password" required></label><button type="button" class="btn btn-ghost" data-forgot>Esqueci minha senha</button><div class="modal-actions"><button type="button" class="btn btn-outline" data-public>Voltar</button><button class="btn btn-dark" type="submit">Entrar</button></div></form></section></div></main>`}
function passwordPage(){return `<main class="section chrona-login"><div class="container"><section class="panel" style="max-width:460px;margin:7vh auto"><div class="eyebrow">CHRONA</div><h2>Crie sua senha</h2><p class="muted">Defina uma senha pessoal com pelo menos oito caracteres.</p><form id="password-form"><label class="field"><span>Nova senha</span><input name="password" type="password" minlength="8" autocomplete="new-password" required></label><label class="field"><span>Confirmar senha</span><input name="confirm" type="password" minlength="8" autocomplete="new-password" required></label><div class="modal-actions"><span></span><button class="btn btn-dark" type="submit">Salvar minha senha</button></div></form></section></div></main>`}
function loadingPage(){return `<main class="section"><div class="container empty"><h2>Carregando painel…</h2><p>Sincronizando os dados da empresa.</p></div></main>`}
function suspendedPage(){return `<main class="section"><div class="container"><section class="panel" style="max-width:620px;margin:8vh auto;text-align:center"><div class="eyebrow">CHRONA</div><h2>Assinatura suspensa</h2><p class="muted">A assinatura Chrona deste estabelecimento está suspensa. Os dados permanecem preservados. Entre em contato para regularização.</p><button class="btn btn-outline" data-logout>Sair</button></section></div></main>`}
function platformPage(){
  const active=platformTenants.filter(t=>t.shop.active&&["active","trial"].includes(t.subscription?.status)).length;
  const trials=platformTenants.filter(t=>t.subscription?.status==="trial").length;
  return `<div class="admin chrona-platform"><main class="admin-main" style="max-width:1200px;margin:auto"><header class="admin-header"><div><div class="eyebrow">SUPER ADMIN</div><h1>Chrona</h1><p class="muted">Empresas, planos e operação da plataforma.</p></div><div><button class="btn btn-outline" data-logout>Sair</button> <button class="btn btn-dark" data-new-tenant>+ Nova empresa</button></div></header><div class="metrics"><div class="metric"><small>Empresas</small><b>${platformTenants.length}</b></div><div class="metric"><small>Operando</small><b>${active}</b></div><div class="metric"><small>Em trial</small><b>${trials}</b></div><div class="metric"><small>Agendamentos</small><b>${platformTenants.reduce((n,t)=>n+t.appointments,0)}</b></div></div><section class="panel"><div class="toolbar"><div><h3 style="margin:0">Tenants</h3><small class="muted">Uma aplicação, dados isolados por empresa.</small></div></div><div class="table-wrap"><table><thead><tr><th>Empresa</th><th>Segmento</th><th>Plano</th><th>Status</th><th>Usuários</th><th>Agendamentos</th><th>Ações</th></tr></thead><tbody>${platformTenants.map(t=>`<tr><td><b>${t.shop.name}</b><br><small class="muted">${t.shop.slug}</small></td><td>${t.shop.business_type||"services"}</td><td>${t.subscription?.plan||"—"}</td><td><span class="badge ${t.subscription?.status==="suspended"?"red":"green"}">${t.subscription?.status||"—"}</span></td><td>${t.users}</td><td>${t.appointments}</td><td><a class="btn btn-ghost" target="_blank" href="?tenant=${t.shop.slug}">Abrir</a><button class="btn btn-ghost" data-platform-status="${t.shop.id}" data-next-status="${t.subscription?.status==="suspended"?"active":"suspended"}">${t.subscription?.status==="suspended"?"Ativar":"Suspender"}</button></td></tr>`).join("")}</tbody></table></div></section></main></div>`;
}
function openTenantForm(){
  document.body.insertAdjacentHTML("beforeend",`<div class="modal" id="tenant-modal"><div class="modal-card" style="max-width:650px"><div class="modal-head"><div><div class="eyebrow">CHRONA</div><h3>Nova empresa</h3></div><button class="btn btn-ghost" data-tenant-close>✕</button></div><form id="tenant-form" class="modal-body"><div class="form-grid"><label class="field full"><span>Nome da empresa</span><input name="name" required></label><label class="field"><span>Slug do link</span><input name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="studio-exemplo" required></label><label class="field"><span>WhatsApp</span><input name="phone" inputmode="tel" required></label><label class="field"><span>Segmento</span><select name="business"><option value="beauty">Beleza</option><option value="barber">Barbearia</option><option value="lash">Lash Designer</option><option value="services">Outros serviços</option></select></label><label class="field"><span>Plano</span><select name="plan"><option value="essential">Essential</option><option value="pro">Pro</option></select></label></div><div class="modal-actions"><button type="button" class="btn btn-outline" data-tenant-close>Cancelar</button><button class="btn btn-dark" type="submit">Criar tenant</button></div></form></div></div>`);
  document.querySelectorAll("[data-tenant-close]").forEach(x=>x.onclick=()=>document.querySelector("#tenant-modal")?.remove());
  document.querySelector("#tenant-form").onsubmit=async e=>{e.preventDefault();const b=e.currentTarget.querySelector("button[type=submit]");b.disabled=true;const f=new FormData(e.currentTarget);try{await rpc("create_tenant",{tenant_name:f.get("name"),tenant_slug:f.get("slug"),tenant_business_type:f.get("business"),tenant_phone:f.get("phone"),tenant_plan:f.get("plan"),tenant_theme:"rose"});await loadAdminData();document.querySelector("#tenant-modal")?.remove();render();toast("Nova empresa criada com sucesso");}catch(error){toast(error.message);b.disabled=false;}};
}
function availableSlots() {
  if (slotsLoaded) return remoteSlots;
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
      "Seu cadastro",
      "Escolha os serviços",
      "Quem vai atender?",
      "Data e horário",
      "Tudo certo!",
    ];
  let body = "";
  if (booking.step === 0)
    body = `<div>${booking.adminMode ? `<div class="field" style="margin-bottom:22px"><span>Selecionar cliente cadastrado</span><div style="display:flex;gap:10px"><select id="admin-client" style="flex:1"><option value="">Escolha pelo nome ou WhatsApp</option>${db.clients.map((c) => `<option value="${c.id}" ${booking.clientId === c.id ? "selected" : ""}>${c.name} · ${c.phone}</option>`).join("")}</select><button class="btn btn-dark" type="button" data-use-client>Usar cliente</button></div></div><div class="eyebrow" style="margin:20px 0">OU CADASTRAR NOVO</div>` : '<p class="muted" style="margin-top:0">Informe seu WhatsApp. O sistema atualiza o mesmo cadastro nas próximas visitas, evitando duplicidade.</p>'}<div class="form-grid"><label class="field"><span>WhatsApp *</span><input id="book-phone" inputmode="tel" value="${booking.phone}" placeholder="(62) 99999-9999"></label><div class="field"><span>&nbsp;</span><button class="btn btn-outline" type="button" data-find-client>Continuar</button></div>${booking.lookupDone ? (booking.clientId ? `<div class="field full"><div class="summary"><span>Bem-vindo novamente, <b>${booking.name}</b></span><span class="badge green">Cadastro encontrado</span></div></div>` : `<label class="field"><span>Nome completo *</span><input id="book-name" value="${booking.name}" placeholder="Seu nome"></label><label class="field"><span>Data de nascimento</span><input id="book-birth" type="date" value="${booking.birth || ""}"></label>`) : ""}<label class="field full"><span>Observações</span><input id="book-notes" value="${booking.notes}" placeholder="Opcional"></label><label class="field full"><span><input id="book-optin" type="checkbox" ${booking.optIn ? "checked" : ""}> Aceito receber lembretes e comunicações do estabelecimento pelo WhatsApp.</span></label></div></div>`;
  if (booking.step === 1)
    body = `<div class="choice-grid">${db.services
      .filter((s) => s.active)
      .map(
        (s) =>
          `<button class="choice ${booking.serviceIds.includes(s.id) ? "active" : ""}" data-select-service="${s.id}"><b>${s.name}</b><br><span class="muted">${s.duration} min · ${money(s.price)}</span></button>`,
      )
      .join("")}</div>`;
  if (booking.step === 2)
    body = `<div class="choice-grid"><button class="choice ${booking.professional === "any" ? "active" : ""}" data-prof="any"><b>Qualquer profissional</b><br><span class="muted">Primeiro horário disponível</span></button>${PEOPLE.filter(p=>p.active!==false).map((p) => `<button class="choice ${booking.professional === p.id ? "active" : ""}" data-prof="${p.id}"><b>${p.name}</b><br><span class="muted">Profissional</span></button>`).join("")}</div>`;
  if (booking.step === 3)
    body = `<div class="field" style="margin-bottom:20px"><label>Data</label><input id="book-date" type="date" min="${today()}" value="${booking.date}"></div><div class="slots">${
      availableSlots()
        .map(
          (x) =>
            `<button class="slot-btn ${booking.time === x ? "active" : ""}" data-time="${x}">${x}</button>`,
        )
        .join("") || '<div class="empty">Sem horários nesta data.</div>'
    }</div>`;
  if (booking.step === 4) {
    let p = PEOPLE.find((x) => x.id === booking.professional);
    body = `<div style="text-align:center;padding:22px"><div class="mark" style="margin:auto;background:var(--green);font-size:22px">✓</div><h2 style="margin:18px 0 8px">Agendamento confirmado</h2><p class="muted">${dateBR(booking.date)} às ${booking.time} · ${p?.name || "Profissional disponível"}</p><div class="summary"><b>${booking.serviceIds.map((id) => service(id).name).join(" + ")}</b><b>${money(t.price)}</b></div><a target="_blank" class="btn btn-copper" href="https://wa.me/${db.settings.phone}?text=${encodeURIComponent(`Olá! Confirme meu agendamento na ${db.settings.shop}: ${booking.serviceIds.map((id) => service(id).name).join(" + ")}, dia ${dateBR(booking.date)} às ${booking.time}. Cliente: ${booking.name}.`)}">Enviar resumo pelo WhatsApp</a></div>`;
  }
  return `<div class="modal" id="booking-modal"><div class="modal-card"><div class="modal-head"><div><div class="eyebrow">PASSO ${Math.min(booking.step + 1, 4)} DE 4</div><h3 style="font-size:27px">${titles[booking.step]}</h3></div><button class="btn btn-ghost" data-close>✕</button></div><div class="modal-body"><div class="steps">${[0, 1, 2, 3].map((x) => `<i class="${x <= booking.step ? "on" : ""}"></i>`).join("")}</div>${body}${booking.step < 4 ? `${booking.step > 0 ? `<div class="summary"><span>${t.duration || 0} min · ${booking.serviceIds.length} serviço(s)</span><b>${money(t.price)}</b></div>` : ""}<div class="modal-actions"><button class="btn btn-outline" data-prev ${booking.step === 0 ? "disabled" : ""}>Voltar</button><button class="btn btn-dark" data-next>${booking.step === 3 ? "Confirmar agendamento" : "Continuar"}</button></div>` : ""}</div></div></div>`;
}
const nav = [
  ["dashboard", "Visão geral"],
  ["agenda", "Agenda"],
  ["clientes", "Clientes"],
  ["caixa", "Caixa"],
  ["lembretes", "Lembretes"],
  ["crm", "CRM"],
  ["automacoes", "Automações"],
  ["servicos", "Serviços"],
  ["profissionais", "Profissionais"],
  ["config", "Configurações"],
];
function adminPage() {
  const logo=db.settings.logo?`<img class="brand-logo" src="${db.settings.logo}" alt="Logo ${db.settings.shop}">`:`<span class="brand-logo" style="display:grid;place-items:center;font-weight:800">N</span>`;
  return `<div class="admin"><div class="admin-shell"><aside class="sidebar"><div class="brand">${logo}<div>${db.settings.shop}<small>GESTÃO CHRONA</small></div></div><nav class="nav">${nav.map((n) => `<button class="${adminTab === n[0] ? "active" : ""}" data-tab="${n[0]}">${n[1]}</button>`).join("")}<button data-public>↗ Página pública</button><button data-logout>Sair</button></nav></aside><main class="admin-main"><header class="admin-header"><div><div class="eyebrow">${db.settings.shop} · CHRONA</div><h1>${nav.find((n) => n[0] === adminTab)[1]}</h1></div><button class="btn btn-dark" data-quick>+ Novo</button></header>${adminContent()}</main></div><nav class="mobile-nav">${nav.map((n) => `<button class="${adminTab === n[0] ? "active" : ""}" data-tab="${n[0]}">${n[1]}</button>`).join("")}</nav></div>`;
}
function crmContent(){
  const pipeline=currentPipeline();
  if(!pipeline) return `<section class="panel"><div class="empty"><h3>Crie seu primeiro pipeline</h3><p>Organize contatos, agendamentos e ações de relacionamento.</p><button class="btn btn-dark" data-add-pipeline>+ Criar pipeline</button></div></section>`;
  const stages=crmStages.filter((stage)=>stage.pipeline_id===pipeline.id).sort((a,b)=>a.position-b.position);
  const stageIds=new Set(stages.map((stage)=>stage.id));
  const opportunities=crmOpportunities.filter((opportunity)=>stageIds.has(opportunity.stage_id)&&opportunity.status!=="archived");
  const open=opportunities.filter((opportunity)=>opportunity.status==="open");
  const won=opportunities.filter((opportunity)=>opportunity.status==="won");
  const overdue=open.filter((opportunity)=>opportunity.next_action_at&&new Date(opportunity.next_action_at)<new Date());
  const sourceLabels={manual:"Manual",whatsapp:"WhatsApp",instagram:"Instagram",referral:"Indicação",appointment:"Agendamento"};
  const statusLabels={open:"Em aberto",won:"Ganha",lost:"Perdida"};
  const board=stages.map((stage)=>{
    const cards=opportunities.filter((opportunity)=>opportunity.stage_id===stage.id);
    return `<section class="crm-column" style="--stage-color:${stage.color||"#9caeff"}"><header class="crm-column-head"><div><span class="crm-stage-dot"></span><b>${esc(stage.name)}</b><small>${cards.length}</small></div><div><button class="btn btn-ghost" title="Editar etapa" data-edit-stage="${stage.id}">Editar</button><button class="btn btn-ghost danger" title="Excluir etapa" data-delete-stage="${stage.id}">×</button><button class="btn btn-ghost" title="Nova oportunidade nesta etapa" data-add-opportunity="${stage.id}">+</button></div></header><div class="crm-cards">${cards.map((opportunity)=>{
      const client=db.clients.find((item)=>item.id===opportunity.client_id);
      const isOverdue=opportunity.status==="open"&&opportunity.next_action_at&&new Date(opportunity.next_action_at)<new Date();
      return `<article class="crm-card ${opportunity.status}"><button class="crm-card-main" data-edit-opportunity="${opportunity.id}"><span class="badge ${opportunity.status==="won"?"green":opportunity.status==="lost"?"red":""}">${statusLabels[opportunity.status]||opportunity.status}</span><h4>${esc(opportunity.title)}</h4><p>${esc(client?.name||"Cliente removido")}</p>${opportunity.value!==null?`<b class="crm-value">${money(opportunity.value)}</b>`:""}<small class="${isOverdue?"danger":"muted"}">${isOverdue?"Ação atrasada · ":""}${dateTimeBR(opportunity.next_action_at)}</small><small class="muted">Origem: ${sourceLabels[opportunity.source]||esc(opportunity.source)}</small></button><div class="crm-card-actions"><select data-move-opportunity="${opportunity.id}" aria-label="Mover oportunidade">${stages.map((target)=>`<option value="${target.id}" ${target.id===opportunity.stage_id?"selected":""}>${esc(target.name)}</option>`).join("")}</select>${opportunity.status!=="won"?`<button class="btn btn-ghost" data-opportunity-status="won" data-opportunity-id="${opportunity.id}">Ganhar</button>`:`<button class="btn btn-ghost" data-opportunity-status="open" data-opportunity-id="${opportunity.id}">Reabrir</button>`}${opportunity.status!=="lost"?`<button class="btn btn-ghost danger" data-opportunity-status="lost" data-opportunity-id="${opportunity.id}">Perder</button>`:""}${client?.phone?`<button class="btn btn-ghost" data-whatsapp="${esc(client.phone)}">WhatsApp</button>`:""}<button class="btn btn-ghost danger" data-delete-opportunity="${opportunity.id}">Excluir</button></div></article>`;
    }).join("")||'<div class="crm-empty">Nenhuma oportunidade<br><button class="btn btn-ghost" data-add-opportunity="'+stage.id+'">Adicionar</button></div>'}</div></section>`;
  }).join("");
  return `<div class="metrics"><div class="metric"><small>Em aberto</small><b>${open.length}</b></div><div class="metric"><small>Previsão</small><b>${money(open.reduce((sum,item)=>sum+(item.value||0),0))}</b></div><div class="metric"><small>Ganhas</small><b>${won.length}</b></div><div class="metric"><small>Ações atrasadas</small><b class="${overdue.length?"danger":""}">${overdue.length}</b></div></div><section class="panel crm-panel"><div class="toolbar"><div><h3 style="margin:0">Pipeline de relacionamento</h3><small class="muted">Acompanhe cada cliente até a próxima ação.</small></div><div class="crm-toolbar"><select id="crm-pipeline">${crmPipelines.map((item)=>`<option value="${item.id}" ${item.id===pipeline.id?"selected":""}>${esc(item.name)}${item.active?"":" · arquivado"}</option>`).join("")}</select><button class="btn btn-outline" data-edit-pipeline="${pipeline.id}">Editar</button><button class="btn btn-outline" data-toggle-pipeline="${pipeline.id}">${pipeline.active?"Arquivar":"Ativar"}</button><button class="btn btn-ghost danger" data-delete-pipeline="${pipeline.id}">Excluir</button><button class="btn btn-outline" data-add-stage>+ Etapa</button><button class="btn btn-dark" data-add-opportunity>+ Oportunidade</button><button class="btn btn-ghost" data-add-pipeline>+ Pipeline</button></div></div>${stages.length?`<div class="crm-board">${board}</div>`:'<div class="empty">Este pipeline ainda não tem etapas.<br><button class="btn btn-outline" data-add-stage>Adicionar primeira etapa</button></div>'}</section>`;
}
function adminContent() {
  let revenue = db.cash
      .filter((x) => x.type === "entrada")
      .reduce((a, x) => a + x.value, 0),
    expense = db.cash
      .filter((x) => x.type === "saida")
      .reduce((a, x) => a + x.value, 0);
  if (adminTab === "dashboard")
    return `<div class="metrics"><div class="metric"><small>Faturamento hoje</small><b>${money(db.cash.filter((x) => x.type === "entrada" && x.date === today()).reduce((a, x) => a + x.value, 0))}</b></div><div class="metric"><small>Saldo do caixa</small><b>${money(revenue - expense)}</b></div><div class="metric"><small>Agendamentos</small><b>${db.appointments.length}</b></div><div class="metric"><small>Ticket médio</small><b>${money(revenue / Math.max(1, db.cash.filter((x) => x.type === "entrada").length))}</b></div></div><div class="split"><section class="panel"><h3>Faturamento — últimos 7 dias</h3><div class="chart">${[42, 68, 55, 82, 64, 92, 73].map((x, i) => `<div class="bar-col"><div class="bar" style="height:${x}%"></div>${["S", "T", "Q", "Q", "S", "S", "D"][i]}</div>`).join("")}</div></section><section class="panel"><h3>Próximos atendimentos</h3>${
      db.appointments
        .filter((a) => a.status === "Agendado")
        .slice(0, 4)
        .map(
          (a) =>
            `<div class="list-card"><span><b>${a.time} · ${a.client}</b><br><small class="muted">${service(a.serviceIds[0])?.name}</small></span><span class="badge green">Agendado</span></div>`,
        )
        .join("") || '<div class="empty">Nenhum atendimento agendado.</div>'
    }<h3 style="margin-top:24px">Próximos horários livres</h3><div class="slots">${[
      "09:00",
      "09:30",
      "10:00",
      "10:30",
      "11:00",
      "13:00",
      "13:30",
      "14:00",
    ]
      .filter(
        (time) =>
          !db.appointments.some(
            (a) =>
              a.date === addDays(1) &&
              a.time === time &&
              a.status !== "Cancelado",
          ),
      )
      .slice(0, 6)
      .map((time) => `<span class="slot-btn">${time}</span>`)
      .join(
        "",
      )}</div><small class="muted">Disponibilidade de amanhã para atendimentos de 30 min.</small></section></div>`;
  if (adminTab === "agenda")
    return `<section class="panel"><div class="toolbar"><input id="agenda-date" type="date" value="${agendaDate}"><button class="btn btn-dark" data-add-appt>+ Agendamento</button></div><div class="table-wrap"><table><thead><tr><th>Data/hora</th><th>Cliente</th><th>Serviço</th><th>Profissional</th><th>Status</th><th>Ações</th></tr></thead><tbody>${
      db.appointments
        .filter((a) => a.date === agendaDate)
        .map(
          (a) =>
            `<tr><td>${dateBR(a.date)} · ${a.time}</td><td>${a.client}</td><td>${a.serviceIds.map((x) => service(x)?.name).filter(Boolean).join(", ")}</td><td>${PEOPLE.find((p) => p.id === a.professional)?.name||"—"}</td><td><span class="badge ${a.status === "Concluído" ? "green" : ""}">${a.status}</span></td><td>${a.status==="Agendado"?`<button class="btn btn-ghost" data-confirm-appt="${a.id}">Confirmar</button>`:""}${["Agendado","Confirmado"].includes(a.status)?`<button class="btn btn-dark" data-complete-appt="${a.id}">Concluir</button><button class="btn btn-ghost" data-noshow-appt="${a.id}">Falta</button><button class="btn btn-ghost danger" data-delete-appt="${a.id}">Cancelar</button>`:""}</td></tr>`,
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
    return `<div class="split"><section class="panel"><h3>🎂 Aniversariantes do mês</h3>${birth.map((c) => reminder(c, `Parabéns pelo seu aniversário! A ${db.settings.shop} deseja um dia incrível.`)).join("") || '<div class="empty">Nenhum aniversariante.</div>'}</section><section class="panel"><h3>✨ Retorno há 20+ dias</h3>${stale.map((c) => reminder(c, `Olá, ${c.name}! Já está na hora do seu próximo atendimento. Que tal agendar um horário?`)).join("")}</section></div>`;
  }
  if (adminTab === "servicos")
    return `<section class="panel"><div class="toolbar"><span class="muted">Nome, preço, duração e disponibilidade</span><button class="btn btn-dark" data-add-service>+ Serviço</button></div><div class="list-cards">${db.services.map((s) => `<div class="list-card"><span><b>${s.name}</b><br><small class="muted">${s.duration} min · ${money(s.price)}</small></span><span><button class="btn btn-ghost" data-edit-service="${s.id}">Editar</button><button class="badge ${s.active ? "green" : "red"}" data-toggle-service="${s.id}">${s.active ? "Ativo" : "Inativo"}</button><button class="btn btn-ghost danger" data-delete-service="${s.id}">Excluir</button></span></div>`).join("")}</div></section>`;
  if(adminTab === "crm") return crmContent();
  if(adminTab === "automacoes") return `<section class="panel"><div class="toolbar"><div><h3 style="margin:0">Central de automações</h3><small class="muted">Regras prontas para n8n e WhatsApp Business Platform.</small></div><span class="badge ${currentSubscription?.plan==="pro"?"green":""}">${currentSubscription?.plan==="pro"?"Plano Pro":"Recurso Pro"}</span></div><div class="list-cards"><div class="list-card"><span><b>Retorno de cliente</b><br><small class="muted">Acionada quando o período sem atendimento for atingido.</small></span><span class="badge">Desativada</span></div><div class="list-card"><span><b>Aniversário</b><br><small class="muted">Mensagem personalizada respeitando o consentimento.</small></span><span class="badge">Desativada</span></div><div class="list-card"><span><b>Lembrete de agendamento</b><br><small class="muted">Confirmação programada antes do horário marcado.</small></span><span class="badge">Próxima etapa</span></div></div><div class="empty">Nenhuma mensagem será enviada até uma conexão oficial do WhatsApp ser configurada.</div></section>`;
  if(adminTab === "profissionais") return `<section class="panel"><div class="toolbar"><span class="muted">Equipe e disponibilidade para agendamentos</span><button class="btn btn-dark" data-add-professional>+ Profissional</button></div><div class="list-cards">${PEOPLE.map(p=>`<div class="list-card"><span><b>${p.name}</b><br><small class="muted">${p.phone||"Sem telefone"}</small></span><span><button class="btn btn-ghost" data-edit-professional="${p.id}">Editar</button><button class="badge ${p.active?"green":"red"}" data-toggle-professional="${p.id}">${p.active?"Ativo":"Inativo"}</button></span></div>`).join("")||'<div class="empty">Nenhum profissional cadastrado.</div>'}</div></section>`;
  return `<section class="panel"><div class="form-grid"><label class="field"><span>Nome da empresa</span><input id="set-shop" value="${db.settings.shop}"></label><label class="field"><span>WhatsApp</span><input id="set-phone" value="${db.settings.phone}"></label><label class="field full"><span>Endereço</span><input id="set-address" value="${db.settings.address}"></label><label class="field"><span>Abertura</span><input id="set-open" type="time" value="${db.settings.open}"></label><label class="field"><span>Fechamento</span><input id="set-close" type="time" value="${db.settings.close}"></label><label class="field"><span>Início do intervalo</span><input id="set-break-start" type="time" value="${db.settings.breakStart}"></label><label class="field"><span>Fim do intervalo</span><input id="set-break-end" type="time" value="${db.settings.breakEnd}"></label><label class="field full"><span>Saudação do WhatsApp</span><textarea id="set-greeting" rows="4">${db.settings.greeting}</textarea></label></div><div class="modal-actions"><button class="btn btn-dark" data-save-settings>Salvar configurações</button></div></section>`;
}
function reminder(c, msg) {
  return `<div class="list-card"><span><b>${c.name}</b><br><small class="muted">${c.phone}</small></span><a class="btn btn-outline" target="_blank" href="https://wa.me/55${c.phone}?text=${encodeURIComponent(msg)}">Enviar</a></div>`;
}
function render() {
  if(PLATFORM_ENTRY) document.title="Chrona | Administração da plataforma";
  app.innerHTML = PASSWORD_FLOW ? passwordPage() : location.hash === "#admin" ? (!authSession ? loginPage() : !adminLoaded ? loadingPage() : currentProfile?.role==="platform_admin" ? platformPage() : currentSubscription?.status==="suspended" ? suspendedPage() : adminPage()) : CHRONA_HOME ? chronaHomePage() : publicPage();
  bind();
}
function bind() {
  document.querySelector("#password-form")?.addEventListener("submit",async e=>{e.preventDefault();const f=new FormData(e.currentTarget),password=f.get("password"),confirm=f.get("confirm"),button=e.currentTarget.querySelector("button[type=submit]");if(password!==confirm)return toast("As senhas precisam ser iguais");button.disabled=true;try{await updatePassword(password);sessionStorage.removeItem("chrona-session");alert("Senha criada com sucesso. Entre com seu e-mail e a nova senha.");location.href=`${location.pathname}${location.search}#admin`;}catch(error){toast(error.message);button.disabled=false;}});
  document.querySelector("#login-form")?.addEventListener("submit",async(e)=>{e.preventDefault();const button=e.currentTarget.querySelector("button[type=submit]");button.disabled=true;try{const form=new FormData(e.currentTarget);await signIn(form.get("email"),form.get("password"));await loadAdminData();render();toast("Acesso autorizado");}catch(error){toast(error.message);button.disabled=false;}});
  document.querySelector("[data-forgot]")?.addEventListener("click",async()=>{const email=document.querySelector('#login-form [name=email]').value.trim();if(!email)return toast("Digite seu e-mail primeiro");try{await requestPasswordReset(email);toast("Se o e-mail estiver cadastrado, o link será enviado");}catch(error){toast(error.message);}});
  document.querySelector("[data-logout]")?.addEventListener("click",()=>{authSession=null;adminLoaded=false;currentProfile=currentShop=currentSubscription=null;sessionStorage.removeItem("chrona-session");render();});
  document.querySelector("[data-new-tenant]")?.addEventListener("click",openTenantForm);
  document.querySelectorAll("[data-platform-status]").forEach(x=>x.onclick=async()=>{try{await rest(`subscriptions?barbershop_id=eq.${x.dataset.platformStatus}`,{method:"PATCH",body:{status:x.dataset.nextStatus}});await loadAdminData();render();toast(x.dataset.nextStatus==="suspended"?"Empresa suspensa; dados preservados":"Empresa reativada");}catch(error){toast(error.message);}});
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
          birth: "",
          notes: "",
          clientId: "",
          lookupDone: false,
          adminMode: false,
          optIn: false,
        };
        document.body.insertAdjacentHTML("beforeend", bookingModal());
        bindBooking();
      }),
  );
  document.querySelector("[data-admin]")?.addEventListener("click", () => {
    location.hash = "admin";
  });
  document.querySelector("[data-public]")?.addEventListener("click", () => {
    location.href = PLATFORM_ENTRY ? location.pathname : `${location.pathname}?tenant=${currentShop?.slug||SHOP_SLUG}`;
  });
  document.querySelectorAll("[data-tab]").forEach(
    (x) =>
      (x.onclick = () => {
        adminTab = x.dataset.tab;
        render();
      }),
  );
  document.querySelector("#crm-pipeline")?.addEventListener("change",(event)=>{activePipelineId=event.target.value;render();});
  document.querySelectorAll("[data-add-pipeline]").forEach((button)=>button.addEventListener("click",()=>openCrmForm("pipeline")));
  document.querySelectorAll("[data-edit-pipeline]").forEach((button)=>button.addEventListener("click",()=>openCrmForm("pipeline",button.dataset.editPipeline)));
  document.querySelectorAll("[data-toggle-pipeline]").forEach((button)=>button.addEventListener("click",async()=>{
    const pipeline=crmPipelines.find((item)=>item.id===button.dataset.togglePipeline);
    try{await rest(`crm_pipelines?id=eq.${pipeline.id}`,{method:"PATCH",body:{active:!pipeline.active}});await loadAdminData();render();toast(pipeline.active?"Pipeline arquivado":"Pipeline ativado");}catch(error){toast(error.message);}
  }));
  document.querySelectorAll("[data-delete-pipeline]").forEach((button)=>button.addEventListener("click",()=>confirmAdmin("O pipeline e suas etapas serão excluídos. Se houver oportunidades vinculadas, a exclusão será bloqueada.",()=>rest(`crm_pipelines?id=eq.${button.dataset.deletePipeline}`,{method:"DELETE"}))));
  document.querySelectorAll("[data-add-stage]").forEach((button)=>button.addEventListener("click",()=>openCrmForm("stage")));
  document.querySelectorAll("[data-edit-stage]").forEach((button)=>button.addEventListener("click",()=>openCrmForm("stage",button.dataset.editStage)));
  document.querySelectorAll("[data-delete-stage]").forEach((button)=>button.addEventListener("click",()=>confirmAdmin("A etapa será excluída somente se não possuir oportunidades.",()=>rest(`crm_stages?id=eq.${button.dataset.deleteStage}`,{method:"DELETE"}))));
  document.querySelectorAll("[data-add-opportunity]").forEach((button)=>button.addEventListener("click",()=>{
    if(!db.clients.length) return toast("Cadastre um cliente antes da oportunidade");
    if(!crmStages.some((stage)=>stage.pipeline_id===currentPipeline()?.id)) return toast("Adicione uma etapa primeiro");
    openCrmForm("opportunity","",button.dataset.addOpportunity||"");
  }));
  document.querySelectorAll("[data-edit-opportunity]").forEach((button)=>button.addEventListener("click",()=>openCrmForm("opportunity",button.dataset.editOpportunity)));
  document.querySelectorAll("[data-move-opportunity]").forEach((select)=>select.addEventListener("change",()=>updateOpportunity(select.dataset.moveOpportunity,{stage_id:select.value},"Oportunidade movida")));
  document.querySelectorAll("[data-opportunity-status]").forEach((button)=>button.addEventListener("click",()=>updateOpportunity(button.dataset.opportunityId,{status:button.dataset.opportunityStatus},button.dataset.opportunityStatus==="won"?"Oportunidade ganha":button.dataset.opportunityStatus==="lost"?"Oportunidade perdida":"Oportunidade reaberta")));
  document.querySelectorAll("[data-delete-opportunity]").forEach((button)=>button.addEventListener("click",()=>confirmAdmin("A oportunidade será excluída definitivamente.",()=>rest(`crm_opportunities?id=eq.${button.dataset.deleteOpportunity}`,{method:"DELETE"}))));
  document.querySelectorAll("[data-confirm-appt]").forEach(x=>x.onclick=async()=>{try{await rest(`appointments?id=eq.${x.dataset.confirmAppt}`,{method:"PATCH",body:{status:"confirmed",updated_at:new Date().toISOString()}});await loadAdminData();render();toast("Agendamento confirmado");}catch(error){toast(error.message);}});
  document.querySelectorAll("[data-complete-appt]").forEach(x=>x.onclick=()=>openPaymentForm(db.appointments.find(a=>a.id===x.dataset.completeAppt)));
  document.querySelectorAll("[data-noshow-appt]").forEach(x=>x.onclick=()=>confirmAdmin("O agendamento será marcado como falta e o horário será encerrado.",()=>rest(`appointments?id=eq.${x.dataset.noshowAppt}`,{method:"PATCH",body:{status:"no_show",updated_at:new Date().toISOString()}})));
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
      birth: "",
      notes: "",
      clientId: "",
      lookupDone: false,
      adminMode: true,
      optIn: false,
    };
    document.body.insertAdjacentHTML("beforeend", bookingModal());
    bindBooking();
  });
  document.querySelectorAll("[data-delete-appt]").forEach(x=>x.addEventListener("click",()=>confirmAdmin("O horário será liberado e o agendamento ficará como cancelado.",()=>rest(`appointments?id=eq.${x.dataset.deleteAppt}`,{method:"PATCH",body:{status:"cancelled",updated_at:new Date().toISOString()}}))));
  document
    .querySelectorAll("[data-whatsapp]")
    .forEach(
      (x) =>
        (x.onclick = () =>
          open(`https://wa.me/55${x.dataset.whatsapp}`, "_blank")),
    );
  document.querySelectorAll("[data-toggle-service]").forEach(
    (x) =>
      (x.onclick = async () => {
        let s = service(x.dataset.toggleService);
        try{await rest(`services?id=eq.${s.id}`,{method:"PATCH",body:{active:!s.active,updated_at:new Date().toISOString()}});await loadAdminData();render();toast("Serviço atualizado");}catch(error){toast(error.message);}
      }),
  );
  document.querySelectorAll("[data-cash-tab]").forEach((x) =>
    x.addEventListener("click", () => {
      cashTab = x.dataset.cashTab;
      render();
    }),
  );
  document
    .querySelector("[data-add-cash]")
    ?.addEventListener("click", () => openAdminForm("cash"));
  document
    .querySelector("[data-add-client]")
    ?.addEventListener("click", () => openAdminForm("client"));
  document.querySelectorAll("[data-edit-client]").forEach((x) =>
    x.addEventListener("click", () => {
      openAdminForm("client", x.dataset.editClient);
    }),
  );
  document.querySelectorAll("[data-delete-client]").forEach((x) =>
    x.addEventListener("click", () => {
      confirmAdmin("O cadastro será removido somente se não possuir histórico de atendimentos.", () => rest(`clients?id=eq.${x.dataset.deleteClient}`,{method:"DELETE"}));
    }),
  );
  document
    .querySelector("[data-add-service]")
    ?.addEventListener("click", () => openAdminForm("service"));
  document.querySelectorAll("[data-edit-service]").forEach((x) =>
    x.addEventListener("click", () => {
      openAdminForm("service", x.dataset.editService);
    }),
  );
  document.querySelectorAll("[data-delete-service]").forEach((x) =>
    x.addEventListener("click", () => {
      confirmAdmin("O serviço será desativado e deixará de aparecer no catálogo.", () => rest(`services?id=eq.${x.dataset.deleteService}`,{method:"PATCH",body:{active:false,updated_at:new Date().toISOString()}}));
    }),
  );
  document.querySelector("[data-add-professional]")?.addEventListener("click",()=>openAdminForm("professional"));
  document.querySelectorAll("[data-edit-professional]").forEach(x=>x.addEventListener("click",()=>openAdminForm("professional",x.dataset.editProfessional)));
  document.querySelectorAll("[data-toggle-professional]").forEach(x=>x.addEventListener("click",async()=>{const p=PEOPLE.find(p=>p.id===x.dataset.toggleProfessional);try{await rest(`professionals?id=eq.${p.id}`,{method:"PATCH",body:{active:!p.active}});await loadAdminData();render();toast("Profissional atualizado");}catch(error){toast(error.message);}}));
  document.querySelectorAll("[data-delete-cash]").forEach((x) =>
    x.addEventListener("click", () => {
      confirmAdmin(
        "A movimentação será removida e o saldo recalculado.",
        () => rest(`cash_transactions?id=eq.${x.dataset.deleteCash}&appointment_id=is.null`,{method:"DELETE"}),
      );
    }),
  );
  document
    .querySelector("[data-add-category]")
    ?.addEventListener("click", async () => {
      const name = prompt("Nome da nova categoria:");
      if (name && !db.categories.includes(name)) {
        try{await rest("cash_categories",{method:"POST",body:{barbershop_id:currentProfile.barbershop_id,name:name.trim()}});await loadAdminData();render();toast("Categoria salva");}catch(error){toast(error.message);}
      }
    });
  document.querySelectorAll("[data-delete-category]").forEach((x) =>
    x.addEventListener("click", async () => {
      if (db.cash.some((m) => m.category === x.dataset.deleteCategory))
        return toast("Categoria em uso; altere as movimentações primeiro");
      try{await rest(`cash_categories?barbershop_id=eq.${currentProfile.barbershop_id}&name=eq.${encodeURIComponent(x.dataset.deleteCategory)}`,{method:"DELETE"});await loadAdminData();render();toast("Categoria removida");}catch(error){toast(error.message);}
    }),
  );
  document
    .querySelector("[data-save-settings]")
    ?.addEventListener("click", async () => {
      const button=document.querySelector("[data-save-settings]");button.disabled=true;
      const data={name:document.querySelector("#set-shop").value.trim(),phone:document.querySelector("#set-phone").value.replace(/\D/g,""),address:document.querySelector("#set-address").value.trim(),opening_time:document.querySelector("#set-open").value,closing_time:document.querySelector("#set-close").value,break_start:document.querySelector("#set-break-start").value||null,break_end:document.querySelector("#set-break-end").value||null,whatsapp_message:document.querySelector("#set-greeting").value.trim(),updated_at:new Date().toISOString()};
      try{await rest(`barbershops?id=eq.${currentShop.id}`,{method:"PATCH",body:data});const hours=Array.from({length:7},(_,weekday)=>({barbershop_id:currentShop.id,weekday,is_open:weekday>0,opening_time:weekday>0?data.opening_time:null,closing_time:weekday>0?data.closing_time:null,break_start:weekday>0?data.break_start:null,break_end:weekday>0?data.break_end:null}));await rest("business_hours?on_conflict=barbershop_id,weekday",{method:"POST",body:hours,prefer:"resolution=merge-duplicates,return=minimal"});await loadAdminData();render();toast("Configurações salvas no sistema");}catch(error){toast(error.message);button.disabled=false;}
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
      profissionais: "[data-add-professional]",
      crm: "[data-add-opportunity]",
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
  modal.querySelector("[data-find-client]")?.addEventListener("click", () => {
    const phone = modal.querySelector("#book-phone").value.replace(/\D/g, "");
    if (phone.length < 10) return toast("Digite um WhatsApp válido");
    const found = db.clients.find((c) => c.phone.replace(/\D/g, "") === phone);
    booking.phone = phone;
    booking.lookupDone = true;
    booking.clientId = found?.id || "";
    booking.name = found?.name || "";
    booking.birth = found?.birth || "";
    booking.notes = modal.querySelector("#book-notes")?.value || "";
    refreshModal();
    toast(
      found ? "Cadastro encontrado" : "Primeiro acesso: complete seu cadastro",
    );
  });
  modal.querySelector("[data-use-client]")?.addEventListener("click", () => {
    const id = modal.querySelector("#admin-client").value;
    const found = db.clients.find((c) => c.id === id);
    if (!found) return toast("Selecione um cliente cadastrado");
    booking.clientId = found.id;
    booking.lookupDone = true;
    booking.name = found.name;
    booking.phone = found.phone.replace(/\D/g, "");
    booking.birth = found.birth || "";
    refreshModal();
    toast("Cliente selecionado");
  });
  modal.querySelectorAll("[data-select-service]").forEach(
    (x) =>
      (x.onclick = () => {
        slotsLoaded = false;
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
        slotsLoaded = false;
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
  modal.querySelector("#book-date")?.addEventListener("change", async (e) => {
    booking.date = e.target.value;
    booking.time = "";
    await loadAvailableSlots().catch((error) => toast(error.message));
    refreshModal();
  });
  modal.querySelector("[data-prev]")?.addEventListener("click", () => {
    booking.step--;
    refreshModal();
  });
  modal.querySelector("[data-next]")?.addEventListener("click", async () => {
    if (booking.step === 0) {
      booking.phone = modal
        .querySelector("#book-phone")
        .value.replace(/\D/g, "");
      if (!booking.lookupDone)
        return toast("Busque o cadastro pelo WhatsApp primeiro");
      booking.name =
        modal.querySelector("#book-name")?.value.trim() || booking.name;
      booking.phone = modal
        .querySelector("#book-phone")
        .value.replace(/\D/g, "");
      booking.birth =
        modal.querySelector("#book-birth")?.value || booking.birth;
      booking.notes = modal.querySelector("#book-notes").value;
      booking.optIn = modal.querySelector("#book-optin")?.checked || false;
      if (!booking.name || booking.phone.length < 10)
        return toast("Preencha seu nome e WhatsApp");
    }
    if (booking.step === 1 && !booking.serviceIds.length)
      return toast("Selecione ao menos um serviço");
    if (booking.step === 2) {
      try { await loadAvailableSlots(); }
      catch (error) { return toast(error.message); }
    }
    if (booking.step === 3 && !booking.time) return toast("Escolha um horário");
    if (booking.step === 3) {
      const prof = booking.professional === "any" ? slotProfessionals[booking.time] : booking.professional;
      try {
        await rpc("create_public_appointment", { shop_slug:SHOP_SLUG, client_name:booking.name, client_phone:booking.phone, client_birth:booking.birth || null, opt_in:booking.optIn, professional:prof, service_ids:booking.serviceIds, appt_date:booking.date, appt_start:booking.time, appt_notes:booking.notes || null });
        if(booking.adminMode) await loadAdminData();
      } catch (error) {
        await loadAvailableSlots().catch(() => {});
        refreshModal();
        return toast(error.message);
      }
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
app.innerHTML = `<main class="section"><div class="container empty"><h2>Carregando…</h2><p>Preparando o ambiente Chrona.</p></div></main>`;
((PLATFORM_ENTRY||CHRONA_HOME)?Promise.resolve():loadPublicData()).then(async()=>{if(PLATFORM_ENTRY) location.hash="admin";if(authSession&&location.hash==="#admin"){try{await loadAdminData();render();}catch(error){authSession=null;sessionStorage.removeItem("chrona-session");render();toast(error.message);}}else render();});
