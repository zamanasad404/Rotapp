
// RotaWave — app logic (v3)
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const state = {
  workspace: '',
  user: null,
  staff: [],
  roles: [],
  openShifts: [],
  assignments: [],
  weekOffset: 0,
  isPro: false,
  pendingAssignShiftId: null,
};

function storageKey(ws){ return `rotawave:${ws}`; }
function loadWorkspace(ws){ try{ return JSON.parse(localStorage.getItem(storageKey(ws))||'null'); }catch(e){ return null; } }
function save(){
  if(!state.workspace) return;
  localStorage.setItem(storageKey(state.workspace), JSON.stringify({
    staff: state.staff, roles: state.roles, openShifts: state.openShifts,
    assignments: state.assignments, isPro: state.isPro
  }));
}

// Auth
$("#signInBtn").addEventListener("click", () => {
  const workspace = $("#workspaceInput").value.trim() || "novare-team";
  const name = $("#displayNameInput").value.trim() || "Guest";
  const role = $("#roleSelect").value;
  if(!workspace){ alert("Enter a workspace code"); return; }
  state.workspace = workspace;
  state.user = { name, role };
  const exists = loadWorkspace(workspace) || {};
  state.staff = exists.staff || ["Aisha","Bilal","Chen","Donna","Elena"];
  state.roles = exists.roles || []; // empty by default
  state.openShifts = exists.openShifts || [];
  state.assignments = exists.assignments || [];
  state.isPro = !!exists.isPro;
  save();
  $("#authSection").hidden = true;
  (role==="manager" ? $("#managerSection") : $("#staffSection")).hidden = false;
  $("#rotaSection").hidden = false;
  renderAll();
  navigator.vibrate?.(15);
});

// Roles
function renderRoles(){
  const list = $("#roleList"), sel = $("#shiftRole");
  list.innerHTML = ""; sel.innerHTML = "";
  state.roles.forEach(role => {
    const chip = document.createElement("div"); chip.className = "chip"; chip.textContent = role; list.appendChild(chip);
    const opt = document.createElement("option"); opt.value = opt.textContent = role; sel.appendChild(opt);
  });
}
$("#addRoleBtn").addEventListener("click", () => {
  const r = $("#roleInput").value.trim(); if(!r) return;
  if(state.roles.includes(r)){ alert("Role already exists"); return; }
  state.roles.push(r); save(); renderRoles(); $("#roleInput").value = ""; navigator.vibrate?.(8);
});
$("#clearRolesBtn").addEventListener("click", () => {
  if(confirm("Clear all roles?")){ state.roles = []; save(); renderRoles(); }
});

// Manager: create shift
$("#addShiftBtn").addEventListener("click", () => {
  if(state.roles.length === 0){ alert("Add at least one role first."); return; }
  const date = $("#shiftDate").value || today();
  const start = $("#shiftStart").value || "09:00";
  const end = $("#shiftEnd").value || "17:00";
  const role = $("#shiftRole").value || state.roles[0];
  const location = $("#shiftLocation").value.trim();
  const notes = $("#shiftNotes").value.trim();
  const slots = Math.max(1, parseInt($("#shiftSlots").value||"1",10));
  state.openShifts.push({id: uuid(), date, start, end, role, location, notes, slots, claims:[]});
  save(); renderOpenShifts(); renderRota();
  $("#shiftNotes").value = ""; $("#shiftLocation").value=""; navigator.vibrate?.(10);
});
$("#clearShiftsBtn").addEventListener("click", () => {
  if(confirm("Clear ALL open shifts?")){ state.openShifts = []; save(); renderOpenShifts(); renderRota(); }
});

// Staff management
$("#addStaffBtn").addEventListener("click", () => {
  const nm = $("#staffNameInput").value.trim(); if(!nm) return;
  if(state.staff.includes(nm)){ alert("Already added"); return; }
  state.staff.push(nm); save(); renderStaff(); $("#staffNameInput").value=""; navigator.vibrate?.(8);
});
$("#removeAllStaffBtn").addEventListener("click", () => {
  if(confirm("Remove all staff?")){ state.staff = []; save(); renderStaff(); renderRota(); }
});

// Assign dialog
const assignDialog = $("#assignDialog");
$("#assignCancel").addEventListener("click", ()=> assignDialog.close());
$("#assignConfirm").addEventListener("click", () => {
  const staffName = $("#assignSelect").value; const shId = state.pendingAssignShiftId;
  if(!staffName || !shId) return;
  const sh = state.openShifts.find(s => s.id === shId); if(!sh) return;
  doAssign(sh, staffName); state.pendingAssignShiftId = null; assignDialog.close();
});
function openAssignDialog(shift){
  const sel = $("#assignSelect"); sel.innerHTML = "";
  state.staff.forEach(nm => { const opt = document.createElement("option"); opt.value = opt.textContent = nm; sel.appendChild(opt); });
  state.pendingAssignShiftId = shift.id; assignDialog.showModal();
}

// Rendering
function renderAll(){ renderRoles(); renderOpenShifts(); renderStaff(); renderRota(); }
function renderStaff(){
  const list = $("#staffList"); list.innerHTML = "";
  state.staff.forEach(nm => { const div = document.createElement("div"); div.className="chip"; div.textContent=nm; list.appendChild(div); });
  if(state.staff.length > 15 && !state.isPro){ $("#upgradeBtn").classList.add("shake"); setTimeout(()=>$("#upgradeBtn").classList.remove("shake"), 800); }
}
function shiftCard(sh, canClaim=false, isManager=false){
  const wrap = document.createElement("div"); wrap.className="card-shift";
  wrap.innerHTML = `
    <div class="row-between">
      <div><b>${fmtDate(sh.date)}</b> <span class="meta">${sh.start}–${sh.end}</span></div>
      <span class="badge">${sh.role}</span>
    </div>
    <div class="meta">Slots: ${sh.claims.length}/${sh.slots}</div>`;
  wrap.addEventListener("click", () => {
    const details = `${fmtDate(sh.date)} ${sh.start}-${sh.end}\nRole: ${sh.role}\nLocation: ${sh.location||"—"}\nNotes: ${sh.notes||"—"}\nSlots: ${sh.claims.length}/${sh.slots}`;
    if(isManager){ openAssignDialog(sh); }
    else if(canClaim){ if(confirm(details + "\n\nClaim this shift?")) claimShift(sh); }
    else { alert(details); }
  });
  return wrap;
}
function renderOpenShifts(){
  const m = $("#openShifts"); const s = $("#staffOpenShifts");
  m.innerHTML=""; s.innerHTML="";
  state.openShifts.forEach(sh => { m.appendChild(shiftCard(sh, false, true)); s.appendChild(shiftCard(sh, true, false)); });
}
function doAssign(sh, nm){
  if(!state.staff.includes(nm)){ alert("Not in team"); return; }
  if(sh.claims.length >= sh.slots){ alert("No slots left"); return; }
  sh.claims.push(nm);
  state.assignments.push({ id: uuid(), staffName:nm, date: sh.date, start: sh.start, end: sh.end,
    role: sh.role, location: sh.location, notes: sh.notes });
  if(sh.claims.length >= sh.slots){ state.openShifts = state.openShifts.filter(x=>x.id!==sh.id); }
  save(); renderAll();
}
function claimShift(sh){
  const nm = state.user?.name || "Unknown";
  if(sh.claims.includes(nm)){ alert("You already claimed this"); return; }
  if(sh.claims.length >= sh.slots){ alert("No slots left"); return; }
  doAssign(sh, nm); navigator.vibrate?.([10,30,10]);
}
function renderRota(){
  renderWeekLabel();
  const {start} = currentWeekRange(state.weekOffset);
  const pseudo = state.openShifts.map(sh => ({ id: sh.id, staffName:"Unassigned (open)", date: sh.date, start: sh.start, end: sh.end,
    role: sh.role, location: sh.location, notes: sh.notes }));
  const combined = state.assignments.concat(pseudo);
  const byStaff = groupAssignmentsByStaffInRange(combined, start, addDays(start,6));

  const tableWrap = $("#rotaTableView"), days = weekDays(start);
  let html = `<table class="rota-table"><thead><tr><th>Staff</th>${days.map(d=>`<th>${d.label}</th>`).join("")}</tr></thead><tbody>`;
  Object.keys(byStaff).forEach(name => {
    html += `<tr><td><b>${name}</b></td>`;
    days.forEach(day=>{
      const items = (byStaff[name][day.key]||[]).map(it => `${it.start}-${it.end} <span class="badge">${it.role}</span>${it.location?` <span class="meta">@ ${it.location}</span>`:""}`).join("<br>");
      html += `<td>${items||""}</td>`;
    });
    html += `</tr>`;
  });
  html += `</tbody></table>`; tableWrap.innerHTML = html;

  const gwrap = $("#rotaGanttView"); let ghtml = `<div class="gantt">`;
  Object.keys(byStaff).forEach(name => {
    ghtml += `<div class="row"><div><b>${name}</b></div><div class="bar-wrap">`;
    const items = Object.entries(byStaff[name]).flatMap(([k, arr]) => arr.map(it => ({...it, dayIdx: parseInt(k.split("-")[2], 10)})));
    items.forEach(it => {
      const x0 = toMinutes(it.start), x1 = toMinutes(it.end);
      const leftPct = ((it.dayIdx + x0/1440)/7)*100;
      const widthPct = Math.max(1, ((x1-x0)/1440)/7*100);
      const title = `${fmtDate(it.date)} ${it.start}-${it.end} ${it.role}${it.location?` @ ${it.location}`:""}`;
      ghtml += `<div class="bar" title="${title}" style="left:${leftPct}%; width:${widthPct}%"></div>`;
    });
    ghtml += `</div></div>`;
  });
  ghtml += `</div>`; gwrap.innerHTML = ghtml;
}
function renderWeekLabel(){ const {start} = currentWeekRange(state.weekOffset); $("#weekLabel").textContent = `${fmtDate(start)} — ${fmtDate(addDays(start,6))}`; }

// Navigation
$("#prevWeek").addEventListener("click", ()=>{ state.weekOffset--; renderRota(); navigator.vibrate?.(6); });
$("#nextWeek").addEventListener("click", ()=>{ state.weekOffset++; renderRota(); navigator.vibrate?.(6); });
let touchX=null; $("#rotaSection").addEventListener("touchstart",(e)=>{touchX=e.touches[0].clientX;});
$("#rotaSection").addEventListener("touchend",(e)=>{ if(touchX===null) return; const dx=e.changedTouches[0].clientX-touchX;
  if(Math.abs(dx)>60){ if(dx>0){state.weekOffset--;}else{state.weekOffset++;} renderRota(); navigator.vibrate?.(8);} touchX=null; });

// View switch
$$(".view-btn").forEach(btn => btn.addEventListener("click", () => {
  $$(".view-btn").forEach(b => b.classList.remove("active")); btn.classList.add("active");
  const view = btn.dataset.view; $("#rotaTableView").hidden = view!=="table"; $("#rotaGanttView").hidden = view!=="gantt";
  setTimeout(()=>exportTarget = view==="table" ? $("#rotaTableView") : $("#rotaGanttView"), 0);
}));

// Export / Share
let exportTarget = $("#rotaTableView");
$("#exportTextBtn").addEventListener("click", () => { const txt = buildTextExport(); navigator.clipboard?.writeText(txt); alert("Rota text copied. Paste into WhatsApp."); });
$("#shareWA").addEventListener("click", () => { const txt = encodeURIComponent(buildTextExport()); window.open(`https://wa.me/?text=${txt}`, "_blank"); });
$("#exportPdfBtn").addEventListener("click", async () => { await exportAsPdf(exportTarget); });
$("#exportPngBtn").addEventListener("click", async () => { await exportAsPng(exportTarget); });
$("#shareImageBtn").addEventListener("click", async () => { await shareImage(exportTarget); });

async function exportAsPdf(node){
  if(!node){ alert("Nothing to export"); return; }
  try{
    const canvas = await html2canvas(node);
    const dataUrl = canvas.toDataURL("image/png");
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: canvas.width>canvas.height ? "l":"p", unit:"px", format:[canvas.width, canvas.height]});
    pdf.addImage(dataUrl, "PNG", 0, 0, canvas.width, canvas.height); pdf.save(`Rota_${Date.now()}.pdf`);
  }catch(e){ console.error(e); alert("PDF export failed."); }
}
async function exportAsPng(node){
  try{
    const canvas = await html2canvas(node); const url = canvas.toDataURL("image/png");
    const a = document.createElement("a"); a.href=url; a.download=`Rota_${Date.now()}.png`; document.body.appendChild(a); a.click(); a.remove();
  }catch(e){ console.error(e); alert("PNG export failed."); }
}
async function shareImage(node){
  try{
    const canvas = await html2canvas(node); const blob = await new Promise(res=>canvas.toBlob(res,"image/png"));
    if(navigator.share && window.File){ const file = new File([blob], `Rota_${Date.now()}.png`, {type:"image/png"}); await navigator.share({ files:[file], title:"RotaWave" }); }
    else{ const url = URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`Rota_${Date.now()}.png`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); alert("Image downloaded. Share via your app."); }
  }catch(e){ console.error(e); alert("Sharing not supported."); }
}

function buildTextExport(){
  const {start} = currentWeekRange(state.weekOffset);
  const pseudo = state.openShifts.map(sh => ({ id: sh.id, staffName:"Unassigned (open)", date: sh.date, start: sh.start, end: sh.end, role: sh.role, location: sh.location, notes: sh.notes }));
  const combined = state.assignments.concat(pseudo);
  const byStaff = groupAssignmentsByStaffInRange(combined, start, addDays(start,6));
  let lines = [`Rota ${fmtDate(start)} – ${fmtDate(addDays(start,6))}`];
  Object.keys(byStaff).forEach(name => {
    lines.push(`\n${name}:`);
    Object.values(byStaff[name]).flat().forEach(it => { lines.push(`- ${fmtDate(it.date)} ${it.start}-${it.end} (${it.role}${it.location? " @ "+it.location:""})`); });
  });
  return lines.join("\n");
}

// Upgrade
const upgradeModal = $("#upgradeModal");
$("#upgradeBtn").addEventListener("click", ()=> upgradeModal.showModal());
$("#closeUpgrade").addEventListener("click", ()=> upgradeModal.close());

// Utils
function today(){ return new Date().toISOString().slice(0,10); }
function fmtDate(d){ const dt = new Date(d); return dt.toLocaleDateString(undefined, {weekday:"short", month:"short", day:"numeric"}); }
function addDays(d, n){ const dt = new Date(d); dt.setDate(dt.getDate()+n); return dt.toISOString().slice(0,10); }
function currentWeekRange(offset=0){ const now=new Date(); const day=(now.getDay()+6)%7; const mon=new Date(now); mon.setDate(now.getDate()-day+offset*7); const sun=new Date(mon); sun.setDate(mon.getDate()+6); return {start: mon.toISOString().slice(0,10), end: sun.toISOString().slice(0,10)}; }
function weekDays(start){ const out=[], s=new Date(start); for(let i=0;i<7;i++){ const d=new Date(s); d.setDate(s.getDate()+i); out.push({key:d.toISOString().slice(0,10), label:d.toLocaleDateString(undefined,{weekday:"short", day:"2-digit"})}); } return out; }
function groupAssignmentsByStaffInRange(assignments, start, end){ const s=new Date(start), e=new Date(end), byStaff={}; assignments.forEach(it=>{ const d=new Date(it.date); if(d<s||d>e) return; const staff=it.staffName, key=it.date; (byStaff[staff]||(byStaff[staff]={}))[key]||(byStaff[staff][key]=[]); byStaff[staff][key].push(it); }); return byStaff; }
function toMinutes(hhmm){ const [h,m]=hhmm.split(":").map(Number); return h*60+m; }
function uuid(){ return (crypto?.randomUUID?.() || ('id-'+Math.random().toString(36).slice(2))); }

if('serviceWorker' in navigator){ window.addEventListener('load', ()=>{ navigator.serviceWorker.register('service-worker.js'); }); }
