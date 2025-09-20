
// RotaWave — app logic
// Local-only prototype storage per workspace
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const state = {
  workspace: '',
  user: null, // {name, role}
  staff: [],   // array of names
  openShifts: [], // {id, date, start, end, role, location, notes, slots, claims:[]}
  assignments: [], // {id, staffName, date, start, end, role, location, notes}
  weekOffset: 0,
  isPro: false,
};

// ---------- Storage helpers ----------
function key() { return `rotawave:${state.workspace}`; }
function loadWorkspace(ws){
  const raw = localStorage.getItem(`rotawave:${ws}`);
  if(!raw) return null;
  try{ return JSON.parse(raw); }catch(e){ return null; }
}
function save(){
  if(!state.workspace) return;
  const payload = {
    staff: state.staff,
    openShifts: state.openShifts,
    assignments: state.assignments,
    isPro: state.isPro,
  };
  localStorage.setItem(key(), JSON.stringify(payload));
}

// ---------- Auth ----------
$("#signInBtn").addEventListener("click", () => {
  const workspace = $("#workspaceInput").value.trim() || "novare-team";
  const name = $("#displayNameInput").value.trim() || "Guest";
  const role = $("#roleSelect").value;
  if(!workspace){ alert("Enter a workspace code"); return; }

  state.workspace = workspace;
  state.user = { name, role };
  const exists = loadWorkspace(workspace);
  if(exists){
    state.staff = exists.staff || [];
    state.openShifts = exists.openShifts || [];
    state.assignments = exists.assignments || [];
    state.isPro = !!exists.isPro;
  } else {
    // seed with demo staff
    state.staff = ["Aisha", "Bilal", "Chen", "Donna", "Elena"];
    state.openShifts = [];
    state.assignments = [];
    state.isPro = false;
  }
  save();
  $("#authSection").hidden = true;
  (role==="manager" ? $("#managerSection") : $("#staffSection")).hidden = false;
  $("#rotaSection").hidden = false;
  renderAll();
  navigator.vibrate?.(15);
});

// ---------- Manager: create shift ----------
$("#addShiftBtn").addEventListener("click", () => {
  const date = $("#shiftDate").value || today();
  const start = $("#shiftStart").value || "09:00";
  const end = $("#shiftEnd").value || "17:00";
  const role = $("#shiftRole").value;
  const location = $("#shiftLocation").value.trim();
  const notes = $("#shiftNotes").value.trim();
  const slots = Math.max(1, parseInt($("#shiftSlots").value||"1",10));

  const id = cryptoRandom();
  state.openShifts.push({id, date, start, end, role, location, notes, slots, claims:[]});
  save();
  renderOpenShifts();
  $("#shiftNotes").value = ""; $("#shiftLocation").value="";
  navigator.vibrate?.(10);
});

$("#clearShiftsBtn").addEventListener("click", () => {
  if(confirm("Clear ALL open shifts?"))
  { state.openShifts = []; save(); renderOpenShifts(); }
});

// Staff management
$("#addStaffBtn").addEventListener("click", () => {
  const nm = $("#staffNameInput").value.trim();
  if(!nm) return;
  if(state.staff.includes(nm)){ alert("Already added"); return; }
  state.staff.push(nm);
  save(); renderStaff();
  $("#staffNameInput").value = "";
  navigator.vibrate?.(8);
});
$("#removeAllStaffBtn").addEventListener("click", () => {
  if(confirm("Remove all staff?")){
    state.staff = []; save(); renderStaff();
  }
});

// ---------- Renderers ----------
function renderAll(){
  renderOpenShifts();
  renderStaff();
  renderRota();
}

function renderStaff(){
  const list = $("#staffList");
  list.innerHTML = "";
  state.staff.forEach(nm => {
    const div = document.createElement("div");
    div.className = "chip";
    div.textContent = nm;
    list.appendChild(div);
  });

  // enforce free tier cap
  if(state.staff.length > 15 && !state.isPro){
    $("#upgradeBtn").classList.add("shake");
    setTimeout(()=>$("#upgradeBtn").classList.remove("shake"), 800);
  }
}

function shiftCard(sh, canClaim=false){
  const wrap = document.createElement("div");
  wrap.className = "card-shift";
  wrap.innerHTML = `
    <div class="row-between">
      <div><b>${fmtDate(sh.date)}</b> <span class="meta">${sh.start}–${sh.end}</span></div>
      <span class="badge">${sh.role}</span>
    </div>
    <div class="meta">Slots: ${sh.claims.length}/${sh.slots}</div>
  `;
  wrap.addEventListener("click", () => {
    const details = `${fmtDate(sh.date)} ${sh.start}-${sh.end}\nRole: ${sh.role}\nLocation: ${sh.location||"—"}\nNotes: ${sh.notes||"—"}\nSlots: ${sh.claims.length}/${sh.slots}`;
    if(confirm(details + "\n\n" + (canClaim ? "Claim this shift?" : "Assign to a staff member?"))){
      if(canClaim){
        claimShift(sh);
      }else{
        assignShiftPrompt(sh);
      }
    }
  });
  return wrap;
}

function renderOpenShifts(){
  const m = $("#openShifts"); m.innerHTML="";
  const s = $("#staffOpenShifts"); s.innerHTML="";
  state.openShifts.forEach(sh => {
    m.appendChild(shiftCard(sh, false));
    s.appendChild(shiftCard(sh, true));
  });
}

function assignShiftPrompt(sh){
  if(!state.staff.length){ alert("Add staff first"); return; }
  const nm = prompt("Assign to which staff?\n" + state.staff.join(", "));
  if(!nm) return;
  if(!state.staff.includes(nm)){ alert("Not in team"); return; }
  // If slots available, create assignment and record claim
  if(sh.claims.length < sh.slots){
    sh.claims.push(nm);
    state.assignments.push({
      id: cryptoRandom(), staffName:nm, date: sh.date, start: sh.start, end: sh.end,
      role: sh.role, location: sh.location, notes: sh.notes
    });
    // remove shift if filled
    if(sh.claims.length >= sh.slots){
      state.openShifts = state.openShifts.filter(x => x.id !== sh.id);
    }
    save(); renderAll();
  }else{
    alert("No slots left");
  }
}

function claimShift(sh){
  const nm = state.user?.name || "Unknown";
  // staff can claim a slot for themselves
  if(sh.claims.includes(nm)){ alert("You already claimed this"); return; }
  if(sh.claims.length >= sh.slots){ alert("No slots left"); return; }
  sh.claims.push(nm);
  state.assignments.push({
    id: cryptoRandom(), staffName:nm, date: sh.date, start: sh.start, end: sh.end,
    role: sh.role, location: sh.location, notes: sh.notes
  });
  if(sh.claims.length >= sh.slots){
    state.openShifts = state.openShifts.filter(x => x.id !== sh.id);
  }
  save(); renderAll();
  navigator.vibrate?.([10,30,10]);
}

function renderRota(){
  renderWeekLabel();
  const {start, end} = currentWeekRange(state.weekOffset);
  const byStaff = groupAssignmentsByStaffInRange(state.assignments, start, end);

  // Table view
  const tableWrap = $("#rotaTableView");
  const days = weekDays(start);
  let html = `<table class="rota-table"><thead><tr><th>Staff</th>${days.map(d=>`<th>${d.label}</th>`).join("")}</tr></thead><tbody>`;
  Object.keys(byStaff).forEach(name => {
    html += `<tr><td><b>${name}</b></td>`;
    days.forEach(day=>{
      const items = (byStaff[name][day.key]||[]).map(it => `${it.start}-${it.end} <span class="badge">${it.role}</span>`).join("<br>");
      html += `<td>${items||""}</td>`;
    });
    html += `</tr>`;
  });
  html += `</tbody></table>`;
  tableWrap.innerHTML = html;

  // Gantt view
  const gwrap = $("#rotaGanttView");
  let ghtml = `<div class="gantt">`;
  Object.keys(byStaff).forEach(name => {
    ghtml += `<div class="row"><div><b>${name}</b></div><div class="bar-wrap">`;
    // create bars across the week (0..7)
    const items = Object.entries(byStaff[name]).flatMap(([k, arr]) => arr.map(it => ({...it, dayIdx: parseInt(k.split("-")[2], 10)})));
    items.forEach(it => {
      const x0 = toMinutes(it.start);
      const x1 = toMinutes(it.end);
      const leftPct = ((it.dayIdx + x0/1440)/7)*100;
      const widthPct = ((x1-x0)/1440)/7*100;
      ghtml += `<div class="bar" title="${fmtDate(it.date)} ${it.start}-${it.end} ${it.role}" style="left:${leftPct}%; width:${widthPct}%"></div>`;
    });
    ghtml += `</div></div>`;
  });
  ghtml += `</div>`;
  gwrap.innerHTML = ghtml;
}

// ---------- Week navigation + gestures ----------
$("#prevWeek").addEventListener("click", ()=>{ state.weekOffset--; renderRota(); navigator.vibrate?.(6) });
$("#nextWeek").addEventListener("click", ()=>{ state.weekOffset++; renderRota(); navigator.vibrate?.(6) });

// swipe gestures on rota section
let touchX = null;
$("#rotaSection").addEventListener("touchstart", (e)=>{ touchX = e.touches[0].clientX; });
$("#rotaSection").addEventListener("touchend", (e)=>{
  if(touchX===null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  if(Math.abs(dx) > 60){
    if(dx > 0) { state.weekOffset--; } else { state.weekOffset++; }
    renderRota();
    navigator.vibrate?.(8);
  }
  touchX = null;
});

// ---------- View switch ----------
$$(".view-btn").forEach(btn => btn.addEventListener("click", () => {
  $$(".view-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  const view = btn.dataset.view;
  $("#rotaTableView").hidden = view !== "table";
  $("#rotaGanttView").hidden = view !== "gantt";
  setTimeout(()=>exportTarget = view==="table" ? $("#rotaTableView") : $("#rotaGanttView"), 0);
}));

// ---------- Export ----------
let exportTarget = $("#rotaTableView");

$("#exportTextBtn").addEventListener("click", () => {
  const txt = buildTextExport();
  copyToClipboard(txt);
  alert("Rota text copied to clipboard. Paste into WhatsApp.");
});

$("#shareWA").addEventListener("click", () => {
  const txt = encodeURIComponent(buildTextExport());
  const url = `https://wa.me/?text=${txt}`;
  window.open(url, "_blank");
});

$("#exportPdfBtn").addEventListener("click", async () => {
  const node = exportTarget;
  if(!node){ alert("Nothing to export"); return; }
  try{
    const canvas = await html2canvas(node);
    const dataUrl = canvas.toDataURL("image/png");
    // Use jsPDF to save a PDF
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? "l" : "p",
      unit: "px",
      format: [canvas.width, canvas.height]
    });
    pdf.addImage(dataUrl, "PNG", 0, 0, canvas.width, canvas.height);
    pdf.save(`Rota_${Date.now()}.pdf`);
    navigator.vibrate?.([10,20,10]);
  }catch(err){
    console.error(err);
    alert("Export failed. Try again after the page fully loads.");
  }
});

function buildTextExport(){
  const {start, end} = currentWeekRange(state.weekOffset);
  const byStaff = groupAssignmentsByStaffInRange(state.assignments, start, end);
  let lines = [];
  lines.push(`Rota ${fmtDate(start)} – ${fmtDate(addDays(start,6))}`);
  Object.keys(byStaff).forEach(name => {
    lines.push(`\n${name}:`);
    Object.values(byStaff[name]).flat().forEach(it => {
      lines.push(`- ${fmtDate(it.date)} ${it.start}-${it.end} (${it.role}${it.location? " @ "+it.location:""})`);
    });
  });
  return lines.join("\n");
}

function copyToClipboard(txt){
  navigator.clipboard?.writeText(txt);
}

// ---------- Upgrade (PayPal placeholder) ----------
const upgradeModal = $("#upgradeModal");
$("#upgradeBtn").addEventListener("click", ()=> upgradeModal.showModal());
$("#closeUpgrade").addEventListener("click", ()=> upgradeModal.close());

// When staff > 15 and not Pro, block adding more and show upgrade
const staffProxy = new Proxy(state.staff, {
  set(target, prop, value){
    target[prop] = value;
    if(state.staff.length > 15 && !state.isPro){
      upgradeModal.showModal();
    }
    return true;
  }
});

// PayPal buttons (placeholder – requires your Client ID and Plan ID)
window.addEventListener("load", () => {
  if (window.paypal && document.getElementById("paypal-button-container")) {
    try{
      window.paypal.Buttons({
        createSubscription: function(data, actions) {
          return actions.subscription.create({
            /* Replace with your plan ID created in PayPal dashboard */
            plan_id: "YOUR_PAYPAL_PLAN_ID"
          });
        },
        onApprove: function(data, actions) {
          alert("Subscription active: " + data.subscriptionID);
          state.isPro = true; save();
          upgradeModal.close();
        }
      }).render('#paypal-button-container');
    }catch(e){ /* ignore in demo */ }
  }
});

// ---------- Help ----------
$("#btnHelp").addEventListener("click", ()=> $("#helpModal").showModal());
$("#closeHelp").addEventListener("click", ()=> $("#helpModal").close());

// ---------- Utils ----------
function today(){ return new Date().toISOString().slice(0,10); }
function fmtDate(d){
  const dt = new Date(d);
  return dt.toLocaleDateString(undefined, {weekday:"short", month:"short", day:"numeric"});
}
function addDays(d, n){ const dt = new Date(d); dt.setDate(dt.getDate()+n); return dt.toISOString().slice(0,10); }
function currentWeekRange(offset=0){
  const now = new Date(); // monday start
  const day = (now.getDay()+6)%7; // 0 Monday .. 6 Sunday
  const monday = new Date(now); monday.setDate(now.getDate() - day + offset*7);
  const sunday = new Date(monday); sunday.setDate(monday.getDate()+6);
  return { start: monday.toISOString().slice(0,10), end: sunday.toISOString().slice(0,10) };
}
function weekDays(start){
  const out = [];
  const s = new Date(start);
  for(let i=0;i<7;i++){
    const d = new Date(s); d.setDate(s.getDate()+i);
    out.push({key: d.toISOString().slice(0,10), label: d.toLocaleDateString(undefined,{weekday:"short", day:"2-digit"})});
  }
  return out;
}
function groupAssignmentsByStaffInRange(assignments, start, end){
  const s = new Date(start), e = new Date(end);
  const byStaff = {};
  assignments.forEach(it => {
    const d = new Date(it.date);
    if(d < s || d > e) return;
    const staff = it.staffName;
    const key = it.date;
    byStaff[staff] ||= {};
    byStaff[staff][key] ||= [];
    byStaff[staff][key].push(it);
  });
  return byStaff;
}
function toMinutes(hhmm){
  const [h,m] = hhmm.split(":").map(Number);
  return h*60+m;
}
function cryptoRandom(){
  if(window.crypto?.randomUUID) return crypto.randomUUID();
  return 'id-' + Math.random().toString(36).slice(2);
}

// -------- PWA setup --------
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('service-worker.js');
  });
}
