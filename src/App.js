import { useState, useEffect, useCallback } from "react";

const FB        = "https://lash-studio-c9cd7-default-rtdb.firebaseio.com";
const API_KEY   = "AIzaSyDq8japdXOWaAAOjBLhESJB1h2qITdnhvk";
const AUTH_URL  = "https://identitytoolkit.googleapis.com/v1/accounts";
const ADMIN_EMAIL = "maleocampo3@gmail.com";
const WA_NUM    = "541126509699";
const DEPLOY_URL = "https://lash-studio-gilt.vercel.app";

const db = {
  get: async (path) => {
    const r = await fetch(`${FB}/${path}.json`);
    const d = await r.json();
    if (!d || typeof d !== "object" || Array.isArray(d)) return [];
    return Object.entries(d).map(([k, v]) => ({ ...v, _id: k }));
  },
  getVal: async (path) => { const r = await fetch(`${FB}/${path}.json`); return r.json(); },
  set:    async (path, data) => { await fetch(`${FB}/${path}.json`, { method:"PUT",    body:JSON.stringify(data) }); },
  push:   async (path, data) => { const r = await fetch(`${FB}/${path}.json`, { method:"POST",   body:JSON.stringify(data) }); return (await r.json()).name; },
  update: async (path, data) => { await fetch(`${FB}/${path}.json`, { method:"PATCH",  body:JSON.stringify(data) }); },
  del:    async (path)       => { await fetch(`${FB}/${path}.json`, { method:"DELETE" }); },
};

const fbAuth = {
  signIn:  async (email, pass) => (await fetch(`${AUTH_URL}:signInWithPassword?key=${API_KEY}`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ email, password:pass, returnSecureToken:true }) })).json(),
  create:  async (email, pass) => (await fetch(`${AUTH_URL}:signUp?key=${API_KEY}`,             { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ email, password:pass, returnSecureToken:true }) })).json(),
  resetPw: async (email)       => (await fetch(`${AUTH_URL}:sendOobCode?key=${API_KEY}`,        { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ requestType:"PASSWORD_RESET", email }) })).json(),
};

const genPass  = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const hoyISO   = () => new Date().toISOString().slice(0, 10);
const mesISO   = () => new Date().toISOString().slice(0, 7);
const fmtPesos = (n) => `$${Number(n || 0).toLocaleString("es-AR")}`;
const fmtFecha = (iso) => { if (!iso) return ""; const [,m,d] = iso.split("-"); const M = ["","ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"]; return `${parseInt(d)} ${M[parseInt(m)]}`; };
const openWA   = (msg = "") => window.open(`https://wa.me/${WA_NUM}?text=${encodeURIComponent(msg)}`, "_blank");

const MESES  = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const DIAS_C = ["D","L","M","X","J","V","S"];
const DIAS_F = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];

const G = {
  bg:"#0a0a0a", card:"rgba(255,255,255,0.04)", glass:"rgba(255,255,255,0.06)",
  border:"rgba(255,255,255,0.08)", borderHov:"rgba(255,255,255,0.16)",
  green:"#8fbd5a", greenD:"#5c8f2e", greenL:"#b5d98a", greenM:"rgba(143,189,90,0.15)",
  text:"#f0f0f0", muted:"rgba(240,240,240,0.45)", sub:"rgba(240,240,240,0.65)",
  white:"#fff", red:"#e07070", amber:"#e0b870",
};
const F = { serif:"'Playfair Display',Georgia,serif", sans:"'DM Sans','Segoe UI',sans-serif" };

const s = {
  app:    { minHeight:"100vh", background:G.bg, color:G.text, fontFamily:F.sans, maxWidth:430, margin:"0 auto", position:"relative", overflowX:"hidden" },
  screen: { minHeight:"100vh", paddingBottom:110 },
  topBar: { padding:"52px 20px 14px", borderBottom:`0.5px solid ${G.border}`, background:"rgba(10,10,10,0.94)", backdropFilter:"blur(20px)", position:"sticky", top:0, zIndex:10 },
  h1:     { fontFamily:F.serif, fontWeight:700, fontSize:24, letterSpacing:"-0.5px", color:G.white, margin:0 },
  sub:    { fontFamily:F.sans, fontSize:11, color:G.muted, margin:"3px 0 0" },
  card:   { background:G.card, border:`0.5px solid ${G.border}`, borderRadius:14, padding:"14px 16px", marginBottom:10, backdropFilter:"blur(10px)", transition:"all 0.2s" },
  input:  { background:"rgba(255,255,255,0.06)", border:`0.5px solid ${G.border}`, borderRadius:10, padding:"11px 14px", color:G.text, fontFamily:F.sans, fontSize:14, width:"100%", outline:"none", boxSizing:"border-box" },
  label:  { fontFamily:F.sans, fontSize:11, color:G.muted, display:"block", marginBottom:5 },
  btnG:   { background:G.green, border:"none", borderRadius:12, padding:"13px 20px", color:"#0a0a0a", fontFamily:F.sans, fontSize:13, fontWeight:700, cursor:"pointer", width:"100%", transition:"opacity 0.2s" },
  btnGl:  { background:G.glass, border:`0.5px solid ${G.borderHov}`, borderRadius:11, padding:"9px 16px", color:G.text, fontFamily:F.sans, fontSize:13, cursor:"pointer", backdropFilter:"blur(8px)", transition:"all 0.2s" },
  btnRed: { background:"rgba(224,112,112,0.12)", border:`0.5px solid ${G.red}`, borderRadius:11, padding:"9px 16px", color:G.red, fontFamily:F.sans, fontSize:13, cursor:"pointer" },
  tag:    { background:G.greenM, border:`0.5px solid ${G.green}`, borderRadius:20, padding:"3px 10px", fontSize:11, color:G.greenL, fontFamily:F.sans, display:"inline-block", marginRight:5, marginBottom:3 },
  div:    { height:"0.5px", background:G.border, margin:"14px 0" },
  nav: { position:"fixed", bottom:20, left:"50%", transform:"translateX(-50%)", width:"calc(100% - 32px)", maxWidth:398, background:"rgba(20,20,20,0.88)", backdropFilter:"blur(24px) saturate(180%)", border:`0.5px solid rgba(255,255,255,0.12)`, borderRadius:28, display:"flex", zIndex:20, padding:"8px 6px", boxShadow:"0 8px 32px rgba(0,0,0,0.5)" },
  fab:  { position:"fixed", bottom:90, right:18, width:50, height:50, borderRadius:"50%", background:G.green, border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, boxShadow:`0 4px 20px rgba(143,189,90,0.4)`, zIndex:30 },
};

const navItmSty = (active) => ({ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3, padding:"7px 0", cursor:"pointer", color:active ? G.green : G.muted, transition:"color 0.2s", borderRadius:22, background:active ? "rgba(143,189,90,0.12)" : "transparent" });

// ── useData ────────────────────────────────────────────────────────────────────
function useData() {
  const [servicios, setServicios]     = useState([]);
  const [clientas, setClientas]       = useState([]);
  const [citas, setCitas]             = useState([]);
  const [excepciones, setExcepciones] = useState([]);
  const [config, setConfig]           = useState({});
  const [loading, setLoading]         = useState(true);

  const recargar = useCallback(async () => {
    setLoading(true);
    const [sv, cl, ct, ex, cfg] = await Promise.all([db.get("servicios"), db.get("clientas"), db.get("citas"), db.get("excepciones"), db.getVal("config")]);
    setServicios(sv); setClientas(cl); setCitas(ct); setExcepciones(ex); setConfig(cfg || {});
    setLoading(false);
  }, []);

  useEffect(() => { recargar(); }, []);

  const getConfig  = (key, def) => config?.[key] ?? def;
  const saveConfig = async (key, val) => { await db.update("config", { [key]: val }); setConfig(p => ({ ...p, [key]: val })); };

  const crearServicio  = async (d)     => { const id = await db.push("servicios", d); setServicios(p => [...p, { ...d, _id:id }]); };
  const editarServicio = async (id, d) => { await db.set(`servicios/${id}`, d); setServicios(p => p.map(x => x._id === id ? { ...d, _id:id } : x)); };
  const borrarServicio = async (id)    => { await db.del(`servicios/${id}`); setServicios(p => p.filter(x => x._id !== id)); };

  const crearClientas = async (datos) => {
    const pass = genPass();
    const res  = await fbAuth.create(datos.email, pass);
    if (res.error) return { error: res.error.message };
    const id = await db.push("clientas", { ...datos, uid:res.localId, creadaEn:hoyISO() });
    setClientas(p => [...p, { ...datos, uid:res.localId, creadaEn:hoyISO(), _id:id, historial:[] }]);
    return { ok:true, pass, email:datos.email };
  };
  const editarClientas        = async (id, d) => { await db.update(`clientas/${id}`, d); setClientas(p => p.map(x => x._id === id ? { ...x, ...d } : x)); };
  const resetPasswordClientas = async (email)  => { await fbAuth.resetPw(email); };

  const crearCita  = async (d)     => { const id = await db.push("citas", { ...d, creadaEn:hoyISO() }); setCitas(p => [...p, { ...d, creadaEn:hoyISO(), _id:id }]); return id; };
  const editarCita = async (id, d) => { await db.update(`citas/${id}`, d); setCitas(p => p.map(x => x._id === id ? { ...x, ...d } : x)); };
  const borrarCita = async (id)    => { await db.del(`citas/${id}`); setCitas(p => p.filter(x => x._id !== id)); };

  const registrarPago = async (clientaId, citaId, reg) => {
    await db.push(`clientas/${clientaId}/historial`, reg);
    await editarCita(citaId, { estado:"completada" });
    setClientas(p => p.map(c => {
      if (c._id !== clientaId) return c;
      const h = Array.isArray(c.historial) ? c.historial : (c.historial ? Object.values(c.historial) : []);
      return { ...c, historial:[...h, reg] };
    }));
  };

  return { servicios, clientas, citas, excepciones, config, loading, recargar, getConfig, saveConfig, crearServicio, editarServicio, borrarServicio, crearClientas, editarClientas, resetPasswordClientas, crearCita, editarCita, borrarCita, registrarPago };
}

// ── Componentes UI comunes ─────────────────────────────────────────────────────
function Loader({ msg = "cargando..." }) {
  return <div style={{ minHeight:"100vh", background:G.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:14 }}><span style={{ fontSize:36 }}>🌿</span><p style={{ fontFamily:F.sans, fontSize:13, color:G.sub }}>{msg}</p></div>;
}
function Avatar({ nombre = "?", size = 40 }) {
  const ini = (nombre || "?").split(" ").slice(0, 2).map(n => n[0] || "").join("").toUpperCase();
  return <div style={{ width:size, height:size, borderRadius:"50%", background:G.greenM, border:`1px solid ${G.green}`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:F.serif, fontWeight:700, fontSize:size * 0.3, color:G.greenL, flexShrink:0 }}>{ini}</div>;
}
function Toast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2200); return () => clearTimeout(t); }, []);
  return <div style={{ position:"fixed", bottom:110, left:"50%", transform:"translateX(-50%)", background:G.green, color:"#0a0a0a", borderRadius:12, padding:"10px 20px", fontFamily:F.sans, fontWeight:700, fontSize:13, zIndex:99, boxShadow:"0 4px 20px rgba(0,0,0,0.4)", whiteSpace:"nowrap" }}>{msg}</div>;
}
function Modal({ titulo, msg, onOk, onCancel, okLabel = "confirmar", danger = false }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", backdropFilter:"blur(8px)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ background:"#111", border:`0.5px solid ${G.border}`, borderRadius:18, padding:24, width:"100%", maxWidth:360 }}>
        <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:18, color:G.white, margin:"0 0 8px" }}>{titulo}</p>
        <p style={{ fontFamily:F.sans, fontSize:13, color:G.sub, margin:"0 0 20px", lineHeight:1.6 }}>{msg}</p>
        <div style={{ display:"flex", gap:10 }}>
          {onCancel && <button style={{ ...s.btnGl, flex:1 }} onClick={onCancel}>cancelar</button>}
          <button style={{ ...s.btnG, flex:1, background:danger ? G.red : G.green }} onClick={onOk}>{okLabel}</button>
        </div>
      </div>
    </div>
  );
}
function Sheet({ titulo, onClose, children }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", backdropFilter:"blur(8px)", zIndex:100, display:"flex", alignItems:"flex-end", justifyContent:"center" }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:"#111", border:`0.5px solid ${G.border}`, borderRadius:"18px 18px 0 0", width:"100%", maxWidth:430, maxHeight:"92vh", overflowY:"auto", padding:"20px 20px 40px" }}>
        <div style={{ width:34, height:4, background:G.border, borderRadius:2, margin:"0 auto 16px" }} />
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
          <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:20, color:G.white, margin:0 }}>{titulo}</p>
          <button style={{ ...s.btnGl, padding:"6px 12px", fontSize:13 }} onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Field({ label, children, hint }) {
  return <div style={{ marginBottom:12 }}><label style={s.label}>{label}</label>{children}{hint && <p style={{ fontFamily:F.sans, fontSize:10, color:G.muted, margin:"4px 0 0", lineHeight:1.5 }}>{hint}</p>}</div>;
}
function Chips({ options = [], value, onChange }) {
  return <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>{options.map(o => <button key={o} onClick={() => onChange(o)} style={{ ...s.btnGl, padding:"6px 12px", fontSize:12, background:value === o ? G.greenM : G.glass, borderColor:value === o ? G.green : G.border, color:value === o ? G.greenL : G.sub }}>{o}</button>)}</div>;
}
function Back({ onClick, label = "volver" }) {
  return <button onClick={onClick} style={{ ...s.btnGl, marginBottom:14, fontSize:12 }}>← {label}</button>;
}

// ── Login ──────────────────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [modo, setModo]         = useState(null);
  const [email, setEmail]       = useState("");
  const [pass, setPass]         = useState("");
  const [err, setErr]           = useState("");
  const [loading, setLoading]   = useState(false);
  const [recordar, setRecordar] = useState(true);

  useEffect(() => {
    const g = localStorage.getItem("ls_session");
    if (g) { try { const p = JSON.parse(g); if (p.expiry > Date.now()) onLogin(p.tipo, p.data); } catch {} }
  }, []);

  const guardar = (tipo, data = null) => {
    if (recordar) localStorage.setItem("ls_session", JSON.stringify({ tipo, data, expiry:Date.now() + 1000 * 60 * 60 * 24 * 30 }));
  };

  const entrar = async () => {
    if (!email || !pass) { setErr("completá los campos"); return; }
    setLoading(true); setErr("");
    const r = await fbAuth.signIn(email, pass);
    if (r.error) { setErr("email o contraseña incorrectos"); setLoading(false); return; }
    if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      guardar("admin"); onLogin("admin");
    } else {
      const todas = await db.get("clientas");
      const c = todas.find(x => x.email?.toLowerCase() === email.toLowerCase());
      if (!c) { setErr("cuenta no encontrada"); setLoading(false); return; }
      const hist = c.historial ? Object.values(c.historial) : [];
      const d = { ...c, historial:hist };
      guardar("clienta", d); onLogin("clienta", d);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh", background:G.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:28 }}>
      <div style={{ textAlign:"center", marginBottom:44 }}>
        <div style={{ fontSize:44, marginBottom:10 }}>🌿</div>
        <h1 style={{ ...s.h1, fontSize:32, letterSpacing:2, textAlign:"center" }}>Lash Studio</h1>
        <p style={{ ...s.sub, marginTop:6, textAlign:"center" }}>by chulas</p>
        <div style={{ width:36, height:1, background:G.green, margin:"14px auto" }} />
        <p style={{ ...s.sub, color:G.muted, textAlign:"center" }}>san andrés · buenos aires</p>
      </div>
      {!modo ? (
        <div style={{ width:"100%", display:"flex", flexDirection:"column", gap:10 }}>
          <p style={{ ...s.sub, textAlign:"center", marginBottom:6 }}>acceder como</p>
          <div style={{ ...s.card, textAlign:"center", cursor:"pointer", border:`0.5px solid ${G.green}` }} onClick={() => { setModo("admin"); setEmail(ADMIN_EMAIL); }}>
            <div style={{ fontSize:26, marginBottom:6 }}>👑</div>
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:15, color:G.white, margin:"0 0 2px" }}>Lashista</p>
            <p style={s.sub}>panel de male</p>
          </div>
          <div style={{ ...s.card, textAlign:"center", cursor:"pointer" }} onClick={() => setModo("clienta")}>
            <div style={{ fontSize:26, marginBottom:6 }}>🌸</div>
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:15, color:G.white, margin:"0 0 2px" }}>Clienta</p>
            <p style={s.sub}>mi espacio personal</p>
          </div>
        </div>
      ) : (
        <div style={{ width:"100%", display:"flex", flexDirection:"column", gap:11 }}>
          <button onClick={() => { setModo(null); setErr(""); setEmail(""); setPass(""); }} style={{ ...s.btnGl, alignSelf:"flex-start", marginBottom:6 }}>← volver</button>
          <span style={{ ...s.tag, alignSelf:"center" }}>{modo === "admin" ? "panel lashista" : "acceso clienta"}</span>
          <Field label="email"><input style={s.input} value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" type="email" autoComplete="username" /></Field>
          <Field label="contraseña"><input style={s.input} value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••" type="password" autoComplete="current-password" onKeyDown={e => e.key === "Enter" && entrar()} /></Field>
          <div style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }} onClick={() => setRecordar(r => !r)}>
            <div style={{ width:18, height:18, borderRadius:5, border:`1.5px solid ${recordar ? G.green : G.border}`, background:recordar ? G.greenM : "transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              {recordar && <span style={{ color:G.green, fontSize:12 }}>✓</span>}
            </div>
            <p style={{ ...s.sub, margin:0, fontSize:12, color:G.sub }}>mantener sesión iniciada</p>
          </div>
          {err && <p style={{ color:G.red, fontSize:12, textAlign:"center", fontFamily:F.sans }}>{err}</p>}
          <button style={{ ...s.btnG, opacity:loading ? 0.6 : 1 }} onClick={entrar} disabled={loading}>{loading ? "ingresando..." : "ingresar →"}</button>
        </div>
      )}
      <div style={{ marginTop:36, display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
        <p style={{ ...s.sub, color:G.muted, fontSize:11 }}>consultas → <span style={{ color:G.green, cursor:"pointer" }} onClick={() => openWA()}>whatsapp</span></p>
        <p style={{ ...s.sub, color:G.muted, fontSize:11 }}>¿primera vez? → <span style={{ color:G.green, cursor:"pointer" }} onClick={() => openWA("Hola! Quiero registrarme en Lash Studio 🌿")}>registrate acá</span></p>
      </div>
    </div>
  );
}

// ── App Root ───────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null);
  const data = useData();
  const login  = (tipo, d = null) => setSession({ tipo, data:d });
  const logout = () => { localStorage.removeItem("ls_session"); setSession(null); };
  if (!session) return <Login onLogin={login} />;
  if (session.tipo === "admin")   return <AdminApp   data={data} onLogout={logout} />;
  if (session.tipo === "clienta") return <ClientaApp clienta={session.data} data={data} onLogout={logout} />;
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN APP
// ═══════════════════════════════════════════════════════════════════════════════
function AdminApp({ data, onLogout }) {
  const [tab, setTab]     = useState("inicio");
  const [stack, setStack] = useState([]);
  const [toast, setToast] = useState(null);

  const push     = (screen, props = {}) => setStack(p => [...p, { screen, props }]);
  const pop      = ()                   => setStack(p => p.slice(0, -1));
  const shwToast = (msg)                => setToast(msg);
  const cur      = stack[stack.length - 1];

  const navItems = [
    { id:"inicio",   icon:"⬡", label:"inicio"   },
    { id:"agenda",   icon:"◷", label:"agenda"   },
    { id:"clientas", icon:"✿", label:"clientas" },
    { id:"finanzas", icon:"◈", label:"finanzas" },
    { id:"config",   icon:"⚙", label:"config"   },
  ];

  const renderScreen = () => {
    if (cur) {
      const p = { ...cur.props, pop, push, data, toast:shwToast, onLogout };
      switch (cur.screen) {
        case "clienta-detalle": return <ClientaDetalle {...p} />;
        case "nueva-cita":      return <NuevaCita      {...p} />;
        case "cita-detalle":    return <CitaDetalle     {...p} />;
        default: return null;
      }
    }
    const p = { push, data, toast:shwToast, onLogout };
    switch (tab) {
      case "inicio":   return <AdminInicio   {...p} setTab={setTab} />;
      case "agenda":   return <AdminAgenda   {...p} />;
      case "clientas": return <AdminClientas {...p} />;
      case "finanzas": return <AdminFinanzas {...p} />;
      case "config":   return <AdminConfig   {...p} />;
      default:         return <AdminInicio   {...p} setTab={setTab} />;
    }
  };

  if (data.loading) return <Loader />;

  return (
    <div style={s.app}>
      <div style={s.screen}>{renderScreen()}</div>
      {!cur && <button style={s.fab} onClick={() => setTab("agenda")} title="Agenda">📅</button>}
      {!cur && (
        <nav style={s.nav}>
          {navItems.map(n => (
            <div key={n.id} style={navItmSty(tab === n.id)} onClick={() => setTab(n.id)}>
              <span style={{ fontSize:18 }}>{n.icon}</span>
              <span style={{ fontFamily:F.sans, fontSize:9, letterSpacing:"0.08em" }}>{n.label}</span>
            </div>
          ))}
        </nav>
      )}
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </div>
  );
}

// ── Admin Inicio ───────────────────────────────────────────────────────────────
function AdminInicio({ data, push, setTab }) {
  const hoy = hoyISO();
  const mes = mesISO();
  const citasHoy    = data.citas.filter(c => c.fecha === hoy && c.estado !== "completada");
  const proximas    = data.citas.filter(c => c.fecha > hoy && c.estado !== "completada").sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora)).slice(0, 4);
  const todoHist    = data.clientas.flatMap(c => Array.isArray(c.historial) ? c.historial : (c.historial ? Object.values(c.historial) : []));
  const ingresosMes = todoHist.filter(h => h.fecha?.startsWith(mes)).reduce((a, h) => a + (h.monto || 0), 0);
  const estudio     = data.getConfig("estudio", {});

  const sinCita = data.clientas.filter(c => {
    if (c.estado === "pausada") return false;
    const h = Array.isArray(c.historial) ? c.historial : (c.historial ? Object.values(c.historial) : []);
    if (!h.length) return false;
    const ult = [...h].sort((a, b) => b.fecha?.localeCompare(a.fecha))[0];
    if (!ult?.fecha) return false;
    const dias = Math.floor((new Date() - new Date(ult.fecha)) / (1000 * 60 * 60 * 24));
    const tieneProx = data.citas.some(ci => ci.clientaId === c._id && ci.fecha >= hoy && ci.estado !== "completada");
    return dias >= 14 && !tieneProx;
  });

  const topSv = (() => {
    const cnt = {};
    todoHist.filter(h => h.fecha?.startsWith(mes)).forEach(h => { cnt[h.servicio] = (cnt[h.servicio] || 0) + 1; });
    return Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 3);
  })();

  return (
    <div>
      <div style={s.topBar}><h1 style={s.h1}>{estudio.nombre || "Lash Studio"}</h1><p style={s.sub}>bienvenida 🌿</p></div>
      <div style={{ padding:"18px 18px 0" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:9, marginBottom:18 }}>
          {[
            { label:"hoy",       val:citasHoy.length,          sub:`${data.citas.filter(c => c.fecha === hoy).length} citas`,      action:() => setTab("agenda")   },
            { label:"este mes",  val:fmtPesos(ingresosMes),    sub:`${todoHist.filter(h => h.fecha?.startsWith(mes)).length} serv`, action:() => setTab("finanzas"), hl:true },
            { label:"clientas",  val:data.clientas.length,     sub:`activas`,                                                       action:() => setTab("clientas") },
          ].map(w => (
            <div key={w.label} onClick={w.action} style={{ ...s.card, textAlign:"center", cursor:"pointer", margin:0, padding:"12px 6px", background:w.hl ? "rgba(143,189,90,0.08)" : G.card, borderColor:w.hl ? G.greenD : G.border }}>
              <p style={{ fontFamily:F.sans, fontSize:9, color:G.muted, margin:"0 0 3px", textTransform:"lowercase", letterSpacing:"0.08em" }}>{w.label}</p>
              <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:w.label === "este mes" ? 14 : 20, color:w.hl ? G.greenL : G.white, margin:"0 0 2px", lineHeight:1.2 }}>{w.val}</p>
              <p style={{ fontFamily:F.sans, fontSize:9, color:G.muted, margin:0 }}>{w.sub}</p>
            </div>
          ))}
        </div>

        <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:17, color:G.white, margin:"0 0 3px" }}>hoy</p>
        <p style={{ ...s.sub, marginBottom:12 }}>{new Date().toLocaleDateString("es-AR", { weekday:"long", day:"numeric", month:"long" })}</p>
        {citasHoy.length === 0
          ? <p style={{ color:G.muted, fontSize:13, marginBottom:14 }}>sin citas para hoy ✦</p>
          : citasHoy.map(c => (
            <div key={c._id} style={{ ...s.card, display:"flex", gap:12, alignItems:"center", cursor:"pointer" }} onClick={() => push("cita-detalle", { cita:c })}>
              <div style={{ background:G.greenM, border:`0.5px solid ${G.green}`, borderRadius:9, padding:"7px 10px", textAlign:"center", minWidth:48 }}>
                <p style={{ margin:0, fontFamily:F.serif, fontWeight:700, fontSize:14, color:G.greenL }}>{c.hora}</p>
              </div>
              <div style={{ flex:1 }}>
                <p style={{ margin:"0 0 2px", fontFamily:F.serif, fontSize:14 }}>{c.clientaNombre}</p>
                <p style={{ margin:0, ...s.sub, fontSize:11 }}>{c.servicio}</p>
              </div>
              <span style={s.tag}>{c.estado}</span>
            </div>
          ))
        }

        <div style={s.div} />
        <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:17, color:G.white, margin:"0 0 3px" }}>próximas</p>
        <p style={{ ...s.sub, marginBottom:12 }}>turnos confirmados</p>
        {proximas.length === 0
          ? <p style={{ color:G.muted, fontSize:13 }}>sin citas agendadas ✦</p>
          : proximas.map(c => (
            <div key={c._id} style={{ ...s.card, display:"flex", gap:12, alignItems:"center", cursor:"pointer" }} onClick={() => push("cita-detalle", { cita:c })}>
              <div style={{ textAlign:"center", minWidth:40 }}>
                <p style={{ margin:0, fontFamily:F.sans, fontSize:10, color:G.muted }}>{c.fecha?.slice(5).replace("-", "/")}</p>
                <p style={{ margin:0, fontFamily:F.serif, fontWeight:700, fontSize:14, color:G.green }}>{c.hora}</p>
              </div>
              <div style={{ flex:1 }}><p style={{ margin:"0 0 2px", fontFamily:F.serif, fontSize:13 }}>{c.clientaNombre}</p><p style={{ margin:0, ...s.sub, fontSize:11 }}>{c.servicio}</p></div>
            </div>
          ))
        }
        <button style={{ ...s.btnG, marginTop:10 }} onClick={() => setTab("agenda")}>ver agenda completa →</button>

        {sinCita.length > 0 && (
          <>
            <div style={s.div} />
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:17, color:G.amber, margin:"0 0 3px" }}>⚡ pendientes de service</p>
            <p style={{ ...s.sub, marginBottom:12 }}>{sinCita.length} clienta{sinCita.length > 1 ? "s" : ""} sin cita hace +14 días</p>
            {sinCita.slice(0, 3).map(c => {
              const h = Array.isArray(c.historial) ? c.historial : (c.historial ? Object.values(c.historial) : []);
              const ult = [...h].sort((a, b) => b.fecha?.localeCompare(a.fecha))[0];
              const dias = ult?.fecha ? Math.floor((new Date() - new Date(ult.fecha)) / (1000 * 60 * 60 * 24)) : null;
              return (
                <div key={c._id} style={{ ...s.card, display:"flex", alignItems:"center", gap:11, borderColor:"rgba(224,184,112,0.2)" }}>
                  <Avatar nombre={c.nombre} size={36} />
                  <div style={{ flex:1 }}>
                    <p style={{ margin:"0 0 2px", fontFamily:F.serif, fontSize:13 }}>{c.nombre}</p>
                    <p style={{ margin:0, ...s.sub, fontSize:10 }}>{dias ? `hace ${dias}d` : ""}{ult?.servicio ? ` · ${ult.servicio}` : ""}</p>
                  </div>
                  <button style={{ ...s.btnGl, fontSize:11, padding:"5px 10px", borderColor:"rgba(37,211,102,0.3)", color:G.greenL }}
                    onClick={() => openWA(`Hola ${c.nombre?.split(" ")[0]}! 🌿 ¿Cómo están tus pestañas? Ya es momento del service. ¡Te espero! 💚`)}>💬</button>
                </div>
              );
            })}
          </>
        )}

        {topSv.length > 0 && (
          <>
            <div style={s.div} />
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:17, color:G.white, margin:"0 0 3px" }}>top servicios del mes</p>
            <p style={{ ...s.sub, marginBottom:12 }}>los más solicitados</p>
            {topSv.map(([nom, cnt], i) => (
              <div key={nom} style={{ ...s.card, display:"flex", alignItems:"center", gap:12, padding:"11px 14px" }}>
                <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:18, color:i === 0 ? G.green : G.muted, minWidth:20, margin:0 }}>{i + 1}</p>
                <p style={{ flex:1, margin:0, fontFamily:F.sans, fontSize:13 }}>{nom}</p>
                <span style={s.tag}>{cnt}x</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ── Admin Agenda ───────────────────────────────────────────────────────────────
function AdminAgenda({ data, push }) {
  const hoy    = hoyISO();
  const ahora  = new Date();
  const [offset, setOffset] = useState(0);
  const [diaS,   setDiaS]   = useState(hoy);

  const mesD   = new Date(ahora.getFullYear(), ahora.getMonth() + offset, 1);
  const anio   = mesD.getFullYear();
  const mes    = mesD.getMonth();
  const primDia = new Date(anio, mes, 1).getDay();
  const diasMes = new Date(anio, mes + 1, 0).getDate();
  const fmtKey  = (d) => `${anio}-${String(mes + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const citasPorFecha = {};
  data.citas.forEach(c => { if (!citasPorFecha[c.fecha]) citasPorFecha[c.fecha] = []; citasPorFecha[c.fecha].push(c); });

  const fechasBloq  = new Set(data.excepciones.map(e => e.fecha));
  const excepDia    = data.excepciones.find(e => e.fecha === diaS);
  const diaEsBloq   = fechasBloq.has(diaS);
  const citasDia    = citasPorFecha[diaS] || [];
  const slots       = data.getConfig("slots", []);

  const dtManana = new Date(diaS + "T12:00:00"); dtManana.setDate(dtManana.getDate() + 1);
  const keyManana = dtManana.toISOString().slice(0, 10);
  const citasManana = citasPorFecha[keyManana] || [];

  return (
    <div>
      <div style={s.topBar}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div><h1 style={s.h1}>Agenda</h1><p style={s.sub}>calendario del estudio</p></div>
          <button style={{ ...s.btnG, width:"auto", padding:"9px 14px", fontSize:12 }} onClick={() => push("nueva-cita")}>+ nueva</button>
        </div>
      </div>
      <div style={{ padding:"18px 14px 0" }}>
        <div style={{ ...s.card, padding:"14px 10px", marginBottom:18 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
            <button style={{ ...s.btnGl, padding:"6px 12px", fontSize:15 }} onClick={() => setOffset(o => o - 1)}>‹</button>
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:15, color:G.white, margin:0, textTransform:"capitalize" }}>{MESES[mes]} {anio}</p>
            <button style={{ ...s.btnGl, padding:"6px 12px", fontSize:15 }} onClick={() => setOffset(o => o + 1)}>›</button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", marginBottom:4 }}>
            {DIAS_C.map(d => <div key={d} style={{ textAlign:"center", fontFamily:F.sans, fontSize:10, color:G.muted, padding:"2px 0" }}>{d}</div>)}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
            {Array(primDia).fill(null).map((_, i) => <div key={"e" + i} />)}
            {Array(diasMes).fill(null).map((_, i) => {
              const dia = i + 1, key = fmtKey(dia);
              const tiene = !!(citasPorFecha[key]?.length);
              const bloq = fechasBloq.has(key), esH = key === hoy, esSel = key === diaS;
              return (
                <div key={dia} onClick={() => setDiaS(key)} style={{ textAlign:"center", borderRadius:8, padding:"5px 2px", cursor:"pointer", background:esSel ? G.green : esH ? G.greenM : bloq ? "rgba(224,112,112,0.1)" : "transparent", border:esSel ? "none" : esH ? `0.5px solid ${G.green}` : bloq ? `0.5px solid rgba(224,112,112,0.3)` : "0.5px solid transparent" }}>
                  <span style={{ fontFamily:F.sans, fontSize:12, color:esSel ? "#0a0a0a" : esH ? G.greenL : bloq ? G.red : G.sub, fontWeight:esSel || esH ? 700 : 400, display:"block" }}>{dia}</span>
                  {tiene && <div style={{ display:"flex", justifyContent:"center", gap:2, marginTop:2 }}>{Array(Math.min(citasPorFecha[key].length, 3)).fill(null).map((_, pi) => <div key={pi} style={{ width:3, height:3, borderRadius:"50%", background:esSel ? "rgba(10,10,10,0.5)" : G.green }} />)}</div>}
                  {bloq && !tiene && <div style={{ fontSize:7, color:G.red }}>✕</div>}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
          <div style={{ width:5, height:5, borderRadius:"50%", background:G.green }} />
          <p style={{ margin:0, fontFamily:F.serif, fontWeight:700, fontSize:16, color:G.white }}>{DIAS_F[new Date(diaS + "T12:00:00").getDay()]} {fmtFecha(diaS)}</p>
          {citasDia.length > 0 && <span style={s.tag}>{citasDia.length} citas</span>}
        </div>

        {diaEsBloq && (
          <div style={{ ...s.card, background:"rgba(224,112,112,0.08)", borderColor:G.red, marginBottom:12, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div><p style={{ margin:"0 0 2px", fontFamily:F.sans, fontSize:11, color:G.red }}>día no laborable</p><p style={{ margin:0, fontFamily:F.sans, fontSize:13, color:G.sub }}>{excepDia?.razon || ""}</p></div>
            <span style={{ fontSize:18 }}>🚫</span>
          </div>
        )}

        {citasManana.length > 0 && (
          <div style={{ ...s.card, background:"rgba(143,189,90,0.06)", borderColor:G.greenD, marginBottom:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <p style={{ margin:"0 0 2px", fontFamily:F.sans, fontSize:10, color:G.greenL }}>recordatorio mañana</p>
                <p style={{ margin:0, fontFamily:F.serif, fontSize:13 }}>{citasManana.length} cita{citasManana.length > 1 ? "s" : ""} para {keyManana.slice(8, 10)}/{keyManana.slice(5, 7)}</p>
              </div>
              <button style={{ ...s.btnGl, fontSize:11, padding:"7px 12px", borderColor:G.green, color:G.greenL }}
                onClick={() => citasManana.forEach(c => openWA(`Hola ${c.clientaNombre?.split(" ")[0]}! 🌿 Te recuerdo tu cita mañana a las ${c.hora}. ¡Te espero! 💚`))}>
                avisar →
              </button>
            </div>
          </div>
        )}

        <div>
          {diaEsBloq ? (
            <div style={{ ...s.card, textAlign:"center", padding:"24px", opacity:0.5 }}>
              <p style={{ fontFamily:F.sans, fontSize:13, color:G.muted, margin:0 }}>día bloqueado — sin turnos</p>
            </div>
          ) : slots.length === 0 ? (
            <div style={{ ...s.card, textAlign:"center", padding:"20px" }}>
              <p style={{ fontFamily:F.sans, fontSize:13, color:G.muted, margin:"0 0 8px" }}>No configuraste horarios aún</p>
              <p style={{ fontFamily:F.sans, fontSize:11, color:G.muted, margin:0 }}>Andá a Config → Horarios para agregar tus horarios de trabajo</p>
            </div>
          ) : slots.map(hora => {
            const cita = citasDia.find(c => c.hora === hora && c.estado !== "completada");
            return (
              <div key={hora} style={{ display:"flex", alignItems:"center", gap:10, background:cita ? G.card : "rgba(255,255,255,0.01)", border:`0.5px solid ${cita ? G.border : "rgba(255,255,255,0.03)"}`, borderRadius:11, padding:"9px 12px", marginBottom:7, opacity:cita ? 1 : 0.6 }}>
                <div style={{ background:cita ? G.greenM : "transparent", border:`0.5px solid ${cita ? G.green : G.border}`, borderRadius:8, padding:"5px 8px", minWidth:46, textAlign:"center" }}>
                  <p style={{ margin:0, fontFamily:F.serif, fontWeight:700, fontSize:13, color:cita ? G.greenL : G.muted }}>{hora}</p>
                </div>
                {!cita ? (
                  <div style={{ flex:1, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <p style={{ margin:0, fontFamily:F.sans, fontSize:12, color:G.muted }}>disponible</p>
                    <button style={{ ...s.btnGl, fontSize:10, padding:"4px 10px" }} onClick={() => push("nueva-cita", { fechaDefault:diaS, horaDefault:hora })}>+ agendar</button>
                  </div>
                ) : (
                  <>
                    <div style={{ flex:1 }}>
                      <p style={{ margin:"0 0 1px", fontFamily:F.serif, fontSize:13 }}>{cita.clientaNombre}</p>
                      <p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:G.muted }}>{cita.servicio}</p>
                    </div>
                    <div style={{ display:"flex", gap:6 }}>
                      <button style={{ background:"rgba(37,211,102,0.12)", border:"0.5px solid rgba(37,211,102,0.3)", borderRadius:8, width:30, height:30, cursor:"pointer", fontSize:13, display:"flex", alignItems:"center", justifyContent:"center" }}
                        onClick={() => openWA(`Hola ${cita.clientaNombre?.split(" ")[0]}! 🌿 Te recuerdo tu cita mañana a las ${cita.hora}. ¡Te espero! 💚`)}>💬</button>
                      <button style={{ ...s.btnGl, padding:"5px 9px", fontSize:11 }} onClick={() => push("cita-detalle", { cita })}>→</button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Nueva Cita ─────────────────────────────────────────────────────────────────
function NuevaCita({ data, pop, toast, fechaDefault = "", horaDefault = "", clientaIdDefault = "" }) {
  const [form, setForm] = useState({ clientaId:clientaIdDefault, fecha:fechaDefault, hora:horaDefault, servicio:"", notas:"" });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]:v }));
  const slots    = data.getConfig("slots", []);
  const ocupadas = data.citas.filter(c => c.fecha === form.fecha && c.estado !== "completada").map(c => c.hora);

  const guardar = async () => {
    if (!form.clientaId || !form.fecha || !form.hora || !form.servicio) { toast("completá todos los campos"); return; }
    setSaving(true);
    const clienta = data.clientas.find(c => c._id === form.clientaId);
    await data.crearCita({ ...form, clientaNombre:clienta?.nombre || "", estado:"confirmada" });
    toast("✓ cita agendada"); pop();
  };

  return (
    <div>
      <div style={s.topBar}><Back onClick={pop} label="agenda" /><h1 style={s.h1}>Nueva Cita</h1></div>
      <div style={{ padding:"18px" }}>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <Field label="clienta">
            <select style={{ ...s.input, appearance:"none" }} value={form.clientaId} onChange={e => set("clientaId", e.target.value)}>
              <option value="">seleccionar clienta...</option>
              {[...data.clientas].sort((a, b) => a.nombre?.localeCompare(b.nombre)).map(c => <option key={c._id} value={c._id}>{c.nombre}</option>)}
            </select>
          </Field>
          <Field label="servicio">
            <select style={{ ...s.input, appearance:"none" }} value={form.servicio} onChange={e => set("servicio", e.target.value)}>
              <option value="">seleccionar servicio...</option>
              {data.servicios.map(sv => <option key={sv._id} value={sv.nombre}>{sv.nombre} · {fmtPesos(sv.precio)}</option>)}
            </select>
          </Field>
          <Field label="fecha"><input style={s.input} type="date" value={form.fecha} onChange={e => set("fecha", e.target.value)} /></Field>
          <Field label="hora">
            <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
              {slots.length === 0 && <p style={{ color:G.muted, fontSize:12 }}>Configurá los horarios en Config → Horarios</p>}
              {slots.map(h => { const oc = ocupadas.includes(h); return <button key={h} disabled={oc} onClick={() => set("hora", h)} style={{ ...s.btnGl, padding:"8px 12px", fontSize:12, opacity:oc ? 0.3 : 1, background:form.hora === h ? G.greenM : G.glass, borderColor:form.hora === h ? G.green : G.border, color:form.hora === h ? G.greenL : G.sub, cursor:oc ? "not-allowed" : "pointer" }}>{h}{oc ? " ✕" : ""}</button>; })}
            </div>
          </Field>
          <Field label="notas (opcional)"><textarea style={{ ...s.input, height:70, resize:"none" }} value={form.notas} onChange={e => set("notas", e.target.value)} placeholder="indicaciones especiales..." /></Field>
          <button style={{ ...s.btnG, opacity:saving ? 0.6 : 1 }} onClick={guardar} disabled={saving}>{saving ? "guardando..." : "confirmar cita →"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Detalle Cita ───────────────────────────────────────────────────────────────
function CitaDetalle({ data, pop, toast, cita:citaInit }) {
  const [cita, setCita]      = useState(citaInit);
  const [modalPago, setMP]   = useState(false);
  const [modalBorrar, setMB] = useState(false);
  const [pago, setPago]      = useState({ metodo:"efectivo", monto:"" });
  const sv      = data.servicios.find(s => s.nombre === cita.servicio);
  const clienta = data.clientas.find(c => c._id === cita.clientaId);

  const completar = async () => {
    if (!pago.monto) { toast("ingresá el monto"); return; }
    await data.registrarPago(cita.clientaId, cita._id, { fecha:cita.fecha, servicio:cita.servicio, curva:clienta?.curva || "", monto:Number(pago.monto), pago:pago.metodo, notas:cita.notas || "" });
    toast("✓ cita completada y pago registrado");
    setMP(false); setCita(p => ({ ...p, estado:"completada" }));
  };
  const borrar = async () => { await data.borrarCita(cita._id); toast("cita eliminada"); pop(); };

  return (
    <div>
      <div style={s.topBar}><Back onClick={pop} /><h1 style={s.h1}>Detalle de Cita</h1><p style={s.sub}>{cita.fecha} · {cita.hora}</p></div>
      <div style={{ padding:"18px" }}>
        {clienta && (
          <div style={{ ...s.card, display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
            <Avatar nombre={clienta.nombre} size={46} />
            <div>
              <p style={{ margin:"0 0 2px", fontFamily:F.serif, fontWeight:700, fontSize:15 }}>{clienta.nombre}</p>
              {clienta.curva && <p style={{ margin:0, ...s.sub, fontSize:11 }}>curva {clienta.curva}{clienta.largo ? ` · ${clienta.largo}` : ""}</p>}
              {clienta.alergias && clienta.alergias !== "Ninguna" && <p style={{ margin:"3px 0 0", color:G.red, fontSize:10 }}>⚠ {clienta.alergias}</p>}
            </div>
          </div>
        )}
        <div style={{ ...s.card, marginBottom:12 }}>
          <p style={{ fontFamily:F.sans, fontSize:10, color:G.muted, margin:"0 0 6px", textTransform:"lowercase" }}>servicio</p>
          <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:17, color:G.white, margin:"0 0 6px" }}>{cita.servicio}</p>
          {sv?.descripcion && <p style={{ margin:"0 0 10px", fontFamily:F.sans, fontSize:12, color:G.sub }}>{sv.descripcion}</p>}
          <div style={{ display:"flex", gap:8 }}>
            <div style={{ flex:1, background:"rgba(255,255,255,0.04)", borderRadius:10, padding:"10px" }}>
              <p style={{ fontFamily:F.sans, fontSize:9, color:G.muted, margin:"0 0 3px", textTransform:"lowercase" }}>duración est.</p>
              <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:17, margin:0 }}>{sv?.duracion || "—"}min</p>
            </div>
            <div style={{ flex:1, background:"rgba(255,255,255,0.04)", borderRadius:10, padding:"10px" }}>
              <p style={{ fontFamily:F.sans, fontSize:9, color:G.muted, margin:"0 0 3px", textTransform:"lowercase" }}>precio</p>
              <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:17, color:G.green, margin:0 }}>{fmtPesos(sv?.precio)}</p>
            </div>
          </div>
        </div>
        {cita.notas && <div style={{ ...s.card, background:"rgba(143,189,90,0.05)", borderColor:G.greenD, marginBottom:12 }}><p style={{ fontFamily:F.sans, fontSize:10, color:G.muted, margin:"0 0 4px" }}>notas</p><p style={{ margin:0, fontFamily:F.sans, fontSize:13, color:G.sub }}>{cita.notas}</p></div>}
        <span style={{ ...s.tag, marginBottom:16, display:"inline-block" }}>{cita.estado}</span>
        {cita.estado !== "completada" && (
          <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
            <button style={s.btnG} onClick={() => setMP(true)}>✓ marcar como completada</button>
            <button style={{ ...s.btnGl, width:"100%" }} onClick={() => openWA(`Hola ${cita.clientaNombre?.split(" ")[0]}! 🌿 Te recuerdo tu cita el ${fmtFecha(cita.fecha)} a las ${cita.hora}. ¡Te espero! 💚`)}>💬 enviar recordatorio</button>
            <button style={{ ...s.btnRed, width:"100%" }} onClick={() => setMB(true)}>eliminar cita</button>
          </div>
        )}
        {cita.estado === "completada" && <p style={{ color:G.green, fontFamily:F.sans, fontSize:13, textAlign:"center" }}>✓ cita completada y pago registrado</p>}
      </div>
      {modalPago && (
        <Sheet titulo="Registrar pago" onClose={() => setMP(false)}>
          <Field label="método de pago">
            <div style={{ display:"flex", gap:8 }}>
              {["efectivo", "transferencia"].map(m => <button key={m} onClick={() => setPago(p => ({ ...p, metodo:m }))} style={{ ...s.btnGl, flex:1, background:pago.metodo === m ? G.greenM : G.glass, borderColor:pago.metodo === m ? G.green : G.border, color:pago.metodo === m ? G.greenL : G.sub }}>{m}</button>)}
            </div>
          </Field>
          <Field label="monto cobrado"><input style={s.input} type="number" value={pago.monto} onChange={e => setPago(p => ({ ...p, monto:e.target.value }))} placeholder={fmtPesos(sv?.precio)} /></Field>
          <button style={s.btnG} onClick={completar}>guardar y cerrar cita →</button>
        </Sheet>
      )}
      {modalBorrar && <Modal titulo="Eliminar cita" msg={`¿Segura que querés eliminar la cita de ${cita.clientaNombre}?`} onOk={borrar} onCancel={() => setMB(false)} okLabel="eliminar" danger />}
    </div>
  );
}

// ── Admin Clientas ─────────────────────────────────────────────────────────────
function AdminClientas({ data, push, toast }) {
  const [search, setSearch]     = useState("");
  const [orden, setOrden]       = useState("az");
  const [sheet, setSheet]       = useState(false);
  const [creds, setCreds]       = useState(null);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState({ nombre:"", email:"", telefono:"", curva:"", grosor:"", largo:"", alergias:"", observaciones:"" });
  const set = (k, v) => setForm(f => ({ ...f, [k]:v }));

  const opcCurvas = data.getConfig("curvas",   []);
  const opcGrosor = data.getConfig("grosores", []);
  const opcLargo  = data.getConfig("largos",   []);

  const getUlt = (c) => {
    const h = Array.isArray(c.historial) ? c.historial : (c.historial ? Object.values(c.historial) : []);
    return h.length ? [...h].sort((a, b) => b.fecha?.localeCompare(a.fecha))[0] : null;
  };

  const filtradas = data.clientas
    .filter(c => c.nombre?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (orden === "az") return a.nombre?.localeCompare(b.nombre);
      const ua = getUlt(a)?.fecha || ""; const ub = getUlt(b)?.fecha || "";
      return ub.localeCompare(ua);
    });

  const guardar = async () => {
    if (!form.nombre || !form.email) { toast("nombre y email son obligatorios"); return; }
    setSaving(true);
    const res = await data.crearClientas(form);
    setSaving(false);
    if (res.error) { toast("error: " + res.error); return; }
    setSheet(false);
    setCreds({ email:res.email, pass:res.pass, nombre:form.nombre });
    setForm({ nombre:"", email:"", telefono:"", curva:"", grosor:"", largo:"", alergias:"", observaciones:"" });
  };

  return (
    <div>
      <div style={s.topBar}><h1 style={s.h1}>Clientas</h1><p style={s.sub}>{data.clientas.length} registradas</p></div>
      <div style={{ padding:"18px" }}>
        <div style={{ display:"flex", gap:9, marginBottom:12 }}>
          <input style={{ ...s.input, flex:1, margin:0 }} placeholder="🔍 buscar..." value={search} onChange={e => setSearch(e.target.value)} />
          <button style={{ ...s.btnG, width:"auto", padding:"9px 14px", fontSize:12 }} onClick={() => setSheet(true)}>+ nueva</button>
        </div>
        <div style={{ display:"flex", gap:7, marginBottom:14 }}>
          {[["az", "A → Z"], ["reciente", "última visita"]].map(([v, l]) => (
            <button key={v} onClick={() => setOrden(v)} style={{ ...s.btnGl, fontSize:11, background:orden === v ? G.greenM : G.glass, borderColor:orden === v ? G.green : G.border, color:orden === v ? G.greenL : G.sub, padding:"6px 12px" }}>{l}</button>
          ))}
        </div>
        {filtradas.length === 0 && <p style={{ color:G.muted, fontSize:13 }}>sin clientas aún ✦</p>}
        {filtradas.map(c => {
          const ult = getUlt(c);
          const hist = Array.isArray(c.historial) ? c.historial : (c.historial ? Object.values(c.historial) : []);
          const dias = ult?.fecha ? Math.floor((new Date() - new Date(ult.fecha)) / (1000 * 60 * 60 * 24)) : null;
          return (
            <div key={c._id} style={{ ...s.card, display:"flex", alignItems:"center", gap:11, cursor:"pointer", opacity:c.estado === "pausada" ? 0.5 : 1 }} onClick={() => push("clienta-detalle", { clienta:c })}>
              <Avatar nombre={c.nombre} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                  <p style={{ margin:"0 0 2px", fontFamily:F.serif, fontSize:14, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{c.nombre}</p>
                  {c.estado === "pausada" && <span style={{ ...s.tag, fontSize:9, background:"rgba(224,112,112,0.12)", borderColor:G.red, color:G.red }}>pausada</span>}
                </div>
                <p style={{ margin:0, ...s.sub, fontSize:11 }}>{ult ? `última visita: ${fmtFecha(ult.fecha)}` : "sin visitas aún"}{dias !== null ? ` · hace ${dias}d` : ""}</p>
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <p style={{ margin:"0 0 2px", ...s.sub, fontSize:10 }}>{hist.length} vis.</p>
                <span style={{ fontSize:15, color:G.muted }}>→</span>
              </div>
            </div>
          );
        })}
      </div>

      {sheet && (
        <Sheet titulo="Nueva Clienta" onClose={() => setSheet(false)}>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <Field label="nombre y apellido *"><input style={s.input} value={form.nombre} onChange={e => set("nombre", e.target.value)} placeholder="Nombre Apellido" /></Field>
            <Field label="email * (será su usuario)" hint="Lo usará para iniciar sesión en la app"><input style={s.input} type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="email@ejemplo.com" /></Field>
            <Field label="teléfono"><input style={s.input} type="tel" value={form.telefono} onChange={e => set("telefono", e.target.value)} placeholder="11 XXXX-XXXX" /></Field>
            <div style={s.div} />
            {opcCurvas.length > 0 && <Field label="curva habitual"><Chips options={opcCurvas} value={form.curva} onChange={v => set("curva", v)} /></Field>}
            {opcGrosor.length > 0 && <Field label="grosor"><Chips options={opcGrosor} value={form.grosor} onChange={v => set("grosor", v)} /></Field>}
            {opcLargo.length  > 0 && <Field label="largo"><Chips  options={opcLargo}  value={form.largo}  onChange={v => set("largo",  v)} /></Field>}
            {(opcCurvas.length === 0 && opcGrosor.length === 0 && opcLargo.length === 0) && <p style={{ color:G.muted, fontSize:12 }}>Agregá opciones técnicas desde Config → Técnico</p>}
            <div style={s.div} />
            <Field label="alergias / condiciones"><input style={s.input} value={form.alergias} onChange={e => set("alergias", e.target.value)} placeholder="Ninguna, o especificar..." /></Field>
            <Field label="observaciones"><textarea style={{ ...s.input, height:60, resize:"none" }} value={form.observaciones} onChange={e => set("observaciones", e.target.value)} placeholder="preferencias, notas..." /></Field>
            <button style={{ ...s.btnG, opacity:saving ? 0.6 : 1 }} onClick={guardar} disabled={saving}>{saving ? "creando cuenta..." : "crear clienta →"}</button>
            <p style={{ fontFamily:F.sans, fontSize:11, color:G.muted, textAlign:"center" }}>Se genera una contraseña automática para enviarle por WhatsApp</p>
          </div>
        </Sheet>
      )}

      {creds && (
        <Sheet titulo="✓ Clienta creada" onClose={() => setCreds(null)}>
          <div style={{ ...s.card, background:"rgba(143,189,90,0.06)", borderColor:G.greenD, marginBottom:14 }}>
            <p style={{ fontFamily:F.sans, fontSize:12, color:G.muted, margin:"0 0 8px" }}>accesos para {creds.nombre}:</p>
            <p style={{ fontFamily:F.sans, fontSize:13, color:G.sub, margin:"0 0 4px" }}>📧 <b style={{ color:G.white }}>{creds.email}</b></p>
            <p style={{ fontFamily:F.sans, fontSize:13, color:G.sub, margin:0 }}>🔑 contraseña: <b style={{ color:G.white, letterSpacing:"0.1em" }}>{creds.pass}</b></p>
          </div>
          <button style={s.btnG} onClick={() => { openWA(`Hola ${creds.nombre?.split(" ")[0]}! 🌿 Te creé tu acceso en Lash Studio:\n\n📧 Email: ${creds.email}\n🔑 Contraseña: ${creds.pass}\n\n👉 Entrá desde: ${DEPLOY_URL}\n\nPodés ver tus citas, historial y más 💚`); setCreds(null); }}>💬 enviar por WhatsApp →</button>
          <button style={{ ...s.btnGl, marginTop:9, width:"100%" }} onClick={() => setCreds(null)}>cerrar</button>
        </Sheet>
      )}
    </div>
  );
}

// ── Detalle Clienta (Admin) ────────────────────────────────────────────────────
function ClientaDetalle({ clienta:cInit, data, pop, push, toast }) {
  const [c, setC]         = useState(cInit);
  const [tab, setTab]     = useState("info");
  const [form, setForm]   = useState({ nombre:cInit.nombre||"", telefono:cInit.telefono||"", curva:cInit.curva||"", grosor:cInit.grosor||"", largo:cInit.largo||"", alergias:cInit.alergias||"", observaciones:cInit.observaciones||"", estado:cInit.estado||"activa" });
  const [editing, setEditing] = useState(false);
  const [pwModal, setPwModal] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]:v }));

  const opcCurvas = data.getConfig("curvas",   []);
  const opcGrosor = data.getConfig("grosores", []);
  const opcLargo  = data.getConfig("largos",   []);

  const hist   = Array.isArray(c.historial) ? c.historial : (c.historial ? Object.values(c.historial) : []);
  const citasC = data.citas.filter(ci => ci.clientaId === c._id && ci.estado !== "completada").sort((a, b) => a.fecha.localeCompare(b.fecha));

  const mes         = mesISO();
  const visitasMes  = hist.filter(h => h.fecha?.startsWith(mes)).length;
  const gastoTotal  = hist.reduce((a, h) => a + (h.monto || 0), 0);
  const diasDesde   = hist.length ? Math.floor((new Date() - new Date([...hist].sort((a, b) => b.fecha?.localeCompare(a.fecha))[0]?.fecha)) / (1000 * 60 * 60 * 24)) : null;
  const curvaFav    = (() => { const cnt = {}; hist.forEach(h => { if (h.curva) cnt[h.curva] = (cnt[h.curva] || 0) + 1; }); return Object.entries(cnt).sort((a, b) => b[1] - a[1])[0]?.[0] || c.curva || "—"; })();

  const guardar = async () => { await data.editarClientas(c._id, form); setC(p => ({ ...p, ...form })); setEditing(false); toast("✓ guardado"); };
  const enviarReset = async () => {
    if (!c.email) { toast("la clienta no tiene email"); return; }
    await data.resetPasswordClientas(c.email);
    toast("✓ email de recuperación enviado"); setPwModal(false);
  };

  return (
    <div>
      <div style={s.topBar}>
        <Back onClick={pop} label="clientas" />
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <Avatar nombre={c.nombre} size={42} />
          <div><h1 style={{ ...s.h1, fontSize:18 }}>{c.nombre}</h1><p style={s.sub}>{hist.length} visitas · {form.estado || "activa"}</p></div>
        </div>
      </div>
      <div style={{ padding:"18px" }}>
        <div style={{ display:"flex", gap:6, marginBottom:16 }}>
          {["info", "ficha", "historial", "citas", "métricas"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ ...s.btnGl, flex:1, fontSize:9, padding:"7px 2px", background:tab === t ? G.greenM : G.glass, borderColor:tab === t ? G.green : G.border, color:tab === t ? G.greenL : G.sub }}>{t}</button>
          ))}
        </div>

        {tab === "info" && (
          <div>
            <div style={{ display:"flex", gap:9, marginBottom:14 }}>
              <button style={{ ...s.btnG, flex:1 }} onClick={() => openWA(`Hola ${c.nombre?.split(" ")[0]}! 🌿`)}>💬 WhatsApp</button>
              <button style={{ ...s.btnGl, flex:1 }} onClick={() => setEditing(e => !e)}>{editing ? "cancelar" : "✎ editar"}</button>
            </div>
            <div style={{ ...s.card, display:"flex", flexDirection:"column", gap:12 }}>
              {editing ? (
                <>
                  <Field label="nombre"><input style={s.input} value={form.nombre} onChange={e => set("nombre", e.target.value)} /></Field>
                  <Field label="teléfono"><input style={s.input} value={form.telefono} onChange={e => set("telefono", e.target.value)} /></Field>
                  <Field label="estado">
                    <div style={{ display:"flex", gap:8 }}>
                      {["activa", "pausada"].map(v => <button key={v} onClick={() => set("estado", v)} style={{ ...s.btnGl, flex:1, background:form.estado === v ? G.greenM : G.glass, borderColor:form.estado === v ? G.green : G.border, color:form.estado === v ? G.greenL : G.sub }}>{v}</button>)}
                    </div>
                  </Field>
                  <button style={s.btnG} onClick={guardar}>guardar →</button>
                </>
              ) : (
                [["teléfono", c.telefono || "—"], ["email", c.email || "—"], ["estado", c.estado || "activa"], ["clienta desde", fmtFecha(c.creadaEn)]].map(([k, v]) => (
                  <div key={k} style={{ display:"flex", justifyContent:"space-between" }}>
                    <span style={{ ...s.label, margin:0 }}>{k}</span>
                    <span style={{ fontFamily:F.sans, fontSize:13, color:G.sub }}>{v}</span>
                  </div>
                ))
              )}
            </div>
            <button style={{ ...s.btnGl, width:"100%", marginTop:8 }} onClick={() => setPwModal(true)}>🔑 resetear contraseña</button>
          </div>
        )}

        {tab === "ficha" && (
          <div>
            <div style={s.card}>
              {opcCurvas.length > 0 && <Field label="curva"><Chips options={opcCurvas} value={form.curva} onChange={v => { set("curva", v); data.editarClientas(c._id, { curva:v }); toast("✓"); }} /></Field>}
              {opcGrosor.length > 0 && <Field label="grosor"><Chips options={opcGrosor} value={form.grosor} onChange={v => { set("grosor", v); data.editarClientas(c._id, { grosor:v }); toast("✓"); }} /></Field>}
              {opcLargo.length  > 0 && <Field label="largo"><Chips  options={opcLargo}  value={form.largo}  onChange={v => { set("largo",  v); data.editarClientas(c._id, { largo:v  }); toast("✓"); }} /></Field>}
              {(opcCurvas.length === 0 && opcGrosor.length === 0 && opcLargo.length === 0) && <p style={{ color:G.muted, fontSize:12 }}>Configurá opciones en Config → Técnico</p>}
            </div>
            <div style={s.card}>
              <Field label="alergias"><input style={s.input} value={form.alergias} onChange={e => set("alergias", e.target.value)} onBlur={() => { data.editarClientas(c._id, { alergias:form.alergias }); toast("✓"); }} /></Field>
              <Field label="observaciones"><textarea style={{ ...s.input, height:60, resize:"none" }} value={form.observaciones} onChange={e => set("observaciones", e.target.value)} onBlur={() => { data.editarClientas(c._id, { observaciones:form.observaciones }); toast("✓"); }} /></Field>
            </div>
          </div>
        )}

        {tab === "historial" && (
          <div>
            {hist.length === 0 && <p style={{ color:G.muted, fontSize:13 }}>sin historial aún ✦</p>}
            {[...hist].reverse().map((h, i) => (
              <div key={i} style={s.card}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <div><p style={{ margin:"0 0 2px", fontFamily:F.serif, fontSize:14 }}>{h.servicio}</p><p style={{ margin:0, ...s.sub, fontSize:11 }}>{fmtFecha(h.fecha)}{h.curva ? ` · curva ${h.curva}` : ""}</p></div>
                  <div style={{ textAlign:"right" }}><p style={{ margin:"0 0 2px", fontFamily:F.serif, fontWeight:700, color:G.green, fontSize:14 }}>{fmtPesos(h.monto)}</p><span style={s.tag}>{h.pago}</span></div>
                </div>
                {h.notas && <p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:G.muted }}>{h.notas}</p>}
              </div>
            ))}
          </div>
        )}

        {tab === "citas" && (
          <div>
            <button style={{ ...s.btnG, marginBottom:14 }} onClick={() => push("nueva-cita", { clientaIdDefault:c._id })}>+ nueva cita para {c.nombre?.split(" ")[0]}</button>
            {citasC.length === 0 && <p style={{ color:G.muted, fontSize:13 }}>sin citas próximas ✦</p>}
            {citasC.map(ci => (
              <div key={ci._id} style={{ ...s.card, display:"flex", gap:12, alignItems:"center", cursor:"pointer" }} onClick={() => push("cita-detalle", { cita:ci })}>
                <div style={{ background:G.greenM, border:`0.5px solid ${G.green}`, borderRadius:9, padding:"7px 10px", textAlign:"center" }}>
                  <p style={{ margin:0, fontFamily:F.sans, fontSize:10, color:G.muted }}>{ci.fecha?.slice(5).replace("-", "/")}</p>
                  <p style={{ margin:0, fontFamily:F.serif, fontWeight:700, fontSize:14, color:G.greenL }}>{ci.hora}</p>
                </div>
                <div style={{ flex:1 }}><p style={{ margin:"0 0 2px", fontFamily:F.serif, fontSize:14 }}>{ci.servicio}</p><span style={s.tag}>{ci.estado}</span></div>
              </div>
            ))}
          </div>
        )}

        {tab === "métricas" && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:9, marginBottom:14 }}>
              {[["total visitas", hist.length], ["este mes", visitasMes], ["gasto histórico", fmtPesos(gastoTotal)], ["curva fav.", curvaFav], ["días desde últ. visita", diasDesde !== null ? `${diasDesde}d` : "—"], ["servicios únicos", [...new Set(hist.map(h => h.servicio))].length]].map(([l, v]) => (
                <div key={l} style={{ ...s.card, margin:0, textAlign:"center", padding:"12px 8px" }}>
                  <p style={{ fontFamily:F.sans, fontSize:9, color:G.muted, margin:"0 0 4px", textTransform:"lowercase", lineHeight:1.4 }}>{l}</p>
                  <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:18, color:G.white, margin:0 }}>{v}</p>
                </div>
              ))}
            </div>
            {(() => {
              const cnt = {}; hist.forEach(h => { cnt[h.servicio] = (cnt[h.servicio] || 0) + 1; });
              const sorted = Object.entries(cnt).sort((a, b) => b[1] - a[1]);
              if (!sorted.length) return null;
              const max = sorted[0][1];
              return (<>
                <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:15, color:G.white, margin:"0 0 10px" }}>servicios realizados</p>
                {sorted.map(([nom, n]) => (
                  <div key={nom} style={{ ...s.card, padding:"10px 12px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}><p style={{ margin:0, fontFamily:F.sans, fontSize:12 }}>{nom}</p><span style={s.tag}>{n}x</span></div>
                    <div style={{ height:3, background:G.border, borderRadius:2 }}><div style={{ height:"100%", width:`${(n / max) * 100}%`, background:G.green, borderRadius:2 }} /></div>
                  </div>
                ))}
              </>);
            })()}
          </div>
        )}
      </div>
      {pwModal && <Modal titulo="Resetear contraseña" msg={`Se enviará un email a ${c.email} para que ${c.nombre?.split(" ")[0]} pueda crear una nueva contraseña.`} onOk={enviarReset} onCancel={() => setPwModal(false)} okLabel="enviar email" />}
    </div>
  );
}

// ── Admin Finanzas ─────────────────────────────────────────────────────────────
function AdminFinanzas({ data }) {
  const [periodo, setPeriodo] = useState("mes");
  const hoy  = hoyISO();
  const mes  = mesISO();
  const anio = hoy.slice(0, 4);
  const todoHist = data.clientas.flatMap(c => Array.isArray(c.historial) ? c.historial : (c.historial ? Object.values(c.historial) : []));
  const filtrar = (h) => { if (periodo === "hoy") return h.fecha === hoy; if (periodo === "mes") return h.fecha?.startsWith(mes); if (periodo === "año") return h.fecha?.startsWith(anio); return true; };
  const ings   = todoHist.filter(filtrar);
  const total  = ings.reduce((a, h) => a + (h.monto || 0), 0);
  const transf = ings.filter(h => h.pago === "transferencia").reduce((a, h) => a + (h.monto || 0), 0);
  const efect  = ings.filter(h => h.pago === "efectivo").reduce((a, h) => a + (h.monto || 0), 0);
  const denom  = transf + efect || 1;
  const porSv  = {};
  ings.forEach(h => { porSv[h.servicio] = (porSv[h.servicio] || 0) + (h.monto || 0); });
  const maxSv = Math.max(...Object.values(porSv), 1);
  const topC  = data.clientas.map(c => { const h = Array.isArray(c.historial) ? c.historial : (c.historial ? Object.values(c.historial) : []); const hF = h.filter(filtrar); return { ...c, total:hF.reduce((a, x) => a + (x.monto || 0), 0), vis:hF.length }; }).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

  return (
    <div>
      <div style={s.topBar}><h1 style={s.h1}>Finanzas</h1><p style={s.sub}>resumen de ingresos</p></div>
      <div style={{ padding:"18px" }}>
        <div style={{ display:"flex", gap:7, marginBottom:18 }}>
          {[["hoy","hoy"],["mes","este mes"],["año","este año"],["todo","histórico"]].map(([v, l]) => (
            <button key={v} onClick={() => setPeriodo(v)} style={{ ...s.btnGl, flex:1, fontSize:10, background:periodo === v ? G.greenM : G.glass, borderColor:periodo === v ? G.green : G.border, color:periodo === v ? G.greenL : G.sub, padding:"7px 2px" }}>{l}</button>
          ))}
        </div>
        <div style={{ ...s.card, textAlign:"center", padding:"22px 16px", marginBottom:12 }}>
          <p style={{ fontFamily:F.sans, fontSize:10, color:G.muted, margin:"0 0 6px", textTransform:"lowercase", letterSpacing:"0.08em" }}>ingresos · {periodo === "mes" ? new Date().toLocaleDateString("es-AR", { month:"long", year:"numeric" }) : periodo === "año" ? anio : periodo === "hoy" ? "hoy" : "histórico"}</p>
          <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:36, color:G.green, margin:"0 0 4px" }}>{fmtPesos(total)}</p>
          <p style={{ fontFamily:F.sans, fontSize:12, color:G.sub, margin:0 }}>{ings.length} servicio{ings.length !== 1 ? "s" : ""}</p>
        </div>
        {total > 0 && (
          <div style={{ display:"flex", gap:9, marginBottom:14 }}>
            {[["transferencia", transf], ["efectivo", efect]].map(([m, v]) => (
              <div key={m} style={{ ...s.card, flex:1, margin:0 }}>
                <p style={{ fontFamily:F.sans, fontSize:9, color:G.muted, margin:"0 0 3px", textTransform:"lowercase" }}>{m}</p>
                <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:18, color:m === "transferencia" ? G.green : G.white, margin:"0 0 2px" }}>{fmtPesos(v)}</p>
                <p style={{ fontFamily:F.sans, fontSize:10, color:G.muted, margin:0 }}>{Math.round(v / denom * 100)}%</p>
              </div>
            ))}
          </div>
        )}
        <div style={s.div} />
        <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:16, color:G.white, margin:"0 0 3px" }}>por servicio</p>
        <p style={{ ...s.sub, marginBottom:12 }}>ingresos del período</p>
        {Object.entries(porSv).length === 0 && <p style={{ color:G.muted, fontSize:13 }}>sin registros en este período ✦</p>}
        {Object.entries(porSv).sort((a, b) => b[1] - a[1]).map(([nom, tot]) => (
          <div key={nom} style={{ ...s.card, padding:"11px 13px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}><p style={{ margin:0, fontFamily:F.sans, fontSize:13 }}>{nom}</p><p style={{ margin:0, fontFamily:F.serif, fontWeight:700, fontSize:13, color:G.green }}>{fmtPesos(tot)}</p></div>
            <div style={{ height:3, background:G.border, borderRadius:2 }}><div style={{ height:"100%", width:`${(tot / maxSv) * 100}%`, background:G.green, borderRadius:2 }} /></div>
          </div>
        ))}
        <div style={s.div} />
        <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:16, color:G.white, margin:"0 0 3px" }}>top clientas</p>
        <p style={{ ...s.sub, marginBottom:12 }}>por gasto en el período</p>
        {topC.length === 0 && <p style={{ color:G.muted, fontSize:13 }}>sin datos ✦</p>}
        {topC.map((c, i) => (
          <div key={c._id} style={{ ...s.card, display:"flex", alignItems:"center", gap:11 }}>
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:19, color:i === 0 ? G.green : G.muted, minWidth:22, margin:0 }}>{i + 1}</p>
            <Avatar nombre={c.nombre} size={34} />
            <div style={{ flex:1 }}><p style={{ margin:"0 0 2px", fontFamily:F.serif, fontSize:13 }}>{c.nombre}</p><p style={{ margin:0, ...s.sub, fontSize:10 }}>{c.vis} visita{c.vis !== 1 ? "s" : ""}</p></div>
            <p style={{ margin:0, fontFamily:F.serif, fontWeight:700, color:G.green, fontSize:14 }}>{fmtPesos(c.total)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Admin Config ───────────────────────────────────────────────────────────────
function AdminConfig({ data, toast, onLogout }) {
  const [tab, setTab] = useState("servicios");
  return (
    <div>
      <div style={s.topBar}><h1 style={s.h1}>Configuración</h1><p style={s.sub}>parámetros del estudio</p></div>
      <div style={{ padding:"18px" }}>
        <div style={{ display:"flex", gap:7, marginBottom:18, flexWrap:"wrap" }}>
          {["servicios","técnico","horarios","estudio"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ ...s.btnGl, fontSize:11, background:tab === t ? G.greenM : G.glass, borderColor:tab === t ? G.green : G.border, color:tab === t ? G.greenL : G.sub, padding:"7px 14px" }}>{t}</button>
          ))}
        </div>
        {tab === "servicios" && <ConfigServicios data={data} toast={toast} />}
        {tab === "técnico"   && <ConfigTecnico   data={data} toast={toast} />}
        {tab === "horarios"  && <ConfigHorarios  data={data} toast={toast} />}
        {tab === "estudio"   && <ConfigEstudio   data={data} toast={toast} onLogout={onLogout} />}
      </div>
    </div>
  );
}

// ── Config Servicios ───────────────────────────────────────────────────────────
function ConfigServicios({ data, toast }) {
  const [sheet, setSheet]     = useState(false);
  const [editSv, setEditSv]   = useState(null);
  const [form, setForm]       = useState({ nombre:"", precio:"", duracion:"", descripcion:"", fotos:[] });
  const [saving, setSaving]   = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [fotoUrl, setFotoUrl] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]:v }));

  const abrirNuevo  = () => { setEditSv(null); setForm({ nombre:"", precio:"", duracion:"", descripcion:"", fotos:[] }); setFotoUrl(""); setSheet(true); };
  const abrirEditar = (sv) => { setEditSv(sv); setForm({ nombre:sv.nombre, precio:String(sv.precio||""), duracion:String(sv.duracion||""), descripcion:sv.descripcion||"", fotos:sv.fotos||[] }); setFotoUrl(""); setSheet(true); };

  const addFoto    = () => { if (!fotoUrl.trim()) return; set("fotos", [...(form.fotos||[]), fotoUrl.trim()]); setFotoUrl(""); };
  const removeFoto = (i) => set("fotos", form.fotos.filter((_, j) => j !== i));

  const guardar = async () => {
    if (!form.nombre || !form.precio) { toast("nombre y precio son obligatorios"); return; }
    setSaving(true);
    const payload = { nombre:form.nombre, precio:Number(form.precio), duracion:Number(form.duracion)||60, descripcion:form.descripcion, fotos:form.fotos||[] };
    if (editSv) await data.editarServicio(editSv._id, payload);
    else        await data.crearServicio(payload);
    setSaving(false); setSheet(false);
    toast(editSv ? "✓ servicio actualizado" : "✓ servicio creado");
  };

  return (
    <div>
      <button style={{ ...s.btnG, marginBottom:14 }} onClick={abrirNuevo}>+ agregar servicio</button>
      {data.servicios.length === 0 && <p style={{ color:G.muted, fontSize:13 }}>no hay servicios cargados aún ✦</p>}
      {data.servicios.map(sv => (
        <div key={sv._id} style={s.card}>
          {sv.fotos?.length > 0 && (
            <div style={{ display:"flex", gap:8, overflowX:"auto", marginBottom:10, paddingBottom:4 }}>
              {sv.fotos.map((url, i) => <img key={i} src={url} alt="" style={{ width:80, height:80, borderRadius:10, objectFit:"cover", flexShrink:0 }} onError={e => { e.target.style.display = "none"; }} />)}
            </div>
          )}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div style={{ flex:1 }}>
              <p style={{ margin:"0 0 3px", fontFamily:F.serif, fontWeight:700, fontSize:15 }}>{sv.nombre}</p>
              {sv.descripcion && <p style={{ margin:"0 0 7px", fontFamily:F.sans, fontSize:12, color:G.sub }}>{sv.descripcion}</p>}
              <div style={{ display:"flex", gap:7 }}>
                <span style={s.tag}>{sv.duracion}min est.</span>
                <span style={s.tag}>{fmtPesos(sv.precio)}</span>
              </div>
            </div>
            <div style={{ display:"flex", gap:6, marginLeft:10 }}>
              <button style={{ ...s.btnGl, padding:"6px 10px", fontSize:12 }} onClick={() => abrirEditar(sv)}>✎</button>
              <button style={{ ...s.btnRed, padding:"6px 10px", fontSize:12 }} onClick={() => setConfirm(sv)}>✕</button>
            </div>
          </div>
          <p style={{ margin:"8px 0 0", fontFamily:F.sans, fontSize:10, color:G.muted, fontStyle:"italic" }}>✦ La duración es estimada y puede variar según cada clienta</p>
        </div>
      ))}
      {sheet && (
        <Sheet titulo={editSv ? "Editar Servicio" : "Nuevo Servicio"} onClose={() => setSheet(false)}>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <Field label="nombre del servicio *"><input style={s.input} value={form.nombre} onChange={e => set("nombre", e.target.value)} placeholder="Nombre del servicio" /></Field>
            <Field label="descripción"><input style={s.input} value={form.descripcion} onChange={e => set("descripcion", e.target.value)} placeholder="Breve descripción para las clientas" /></Field>
            <div style={{ display:"flex", gap:10 }}>
              <Field label="precio *"><input style={{ ...s.input }} type="number" value={form.precio} onChange={e => set("precio", e.target.value)} placeholder="0" /></Field>
              <Field label="duración (min)"><input style={{ ...s.input }} type="number" value={form.duracion} onChange={e => set("duracion", e.target.value)} placeholder="60" /></Field>
            </div>
            <div style={s.div} />
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:14, color:G.white, margin:"0 0 4px" }}>Fotos del servicio</p>
            <p style={{ fontFamily:F.sans, fontSize:11, color:G.muted, margin:"0 0 10px" }}>Pegá URLs de fotos para que las clientas vean el resultado al agendar</p>
            {(form.fotos || []).map((url, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:9, marginBottom:7 }}>
                <img src={url} alt="" style={{ width:50, height:50, borderRadius:8, objectFit:"cover" }} onError={e => { e.target.src = ""; }} />
                <p style={{ flex:1, margin:0, fontFamily:F.sans, fontSize:11, color:G.sub, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{url}</p>
                <button style={{ ...s.btnRed, padding:"4px 8px", fontSize:11 }} onClick={() => removeFoto(i)}>✕</button>
              </div>
            ))}
            <div style={{ display:"flex", gap:8 }}>
              <input style={{ ...s.input, flex:1 }} value={fotoUrl} onChange={e => setFotoUrl(e.target.value)} placeholder="https://...foto.jpg" onKeyDown={e => e.key === "Enter" && addFoto()} />
              <button style={s.btnGl} onClick={addFoto}>+ agregar</button>
            </div>
            <p style={{ fontFamily:F.sans, fontSize:10, color:G.muted }}>Podés usar fotos de Google Drive, Instagram o cualquier imagen pública</p>
            <div style={s.div} />
            <button style={{ ...s.btnG, opacity:saving ? 0.6 : 1 }} onClick={guardar} disabled={saving}>{saving ? "guardando..." : editSv ? "guardar cambios →" : "crear servicio →"}</button>
          </div>
        </Sheet>
      )}
      {confirm && <Modal titulo="Eliminar servicio" msg={`¿Eliminar "${confirm.nombre}"?`} onOk={async () => { await data.borrarServicio(confirm._id); setConfirm(null); toast("servicio eliminado"); }} onCancel={() => setConfirm(null)} okLabel="eliminar" danger />}
    </div>
  );
}

// ── Config Técnico ─────────────────────────────────────────────────────────────
function ConfigTecnico({ data, toast }) {
  const OpcionesEditor = ({ configKey, label, placeholder }) => {
    const vals = data.getConfig(configKey, []);
    const [nuevo, setNuevo] = useState("");
    const agregar = async () => {
      const v = nuevo.trim(); if (!v) return;
      if (vals.includes(v)) { toast("ya existe"); return; }
      await data.saveConfig(configKey, [...vals, v]); setNuevo(""); toast(`✓ ${v} agregado`);
    };
    const quitar = async (v) => { await data.saveConfig(configKey, vals.filter(x => x !== v)); toast(`${v} eliminado`); };
    return (
      <div style={{ ...s.card, marginBottom:12 }}>
        <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:15, color:G.white, margin:"0 0 10px" }}>{label}</p>
        <div style={{ display:"flex", flexWrap:"wrap", gap:7, marginBottom:12 }}>
          {vals.length === 0 && <p style={{ color:G.muted, fontSize:12, margin:0 }}>sin opciones aún</p>}
          {vals.map(v => (
            <div key={v} style={{ display:"flex", alignItems:"center", gap:4, background:G.greenM, border:`0.5px solid ${G.green}`, borderRadius:20, padding:"3px 10px" }}>
              <span style={{ fontFamily:F.sans, fontSize:12, color:G.greenL }}>{v}</span>
              <button onClick={() => quitar(v)} style={{ background:"none", border:"none", color:G.red, cursor:"pointer", fontSize:12, padding:"0 0 0 4px", lineHeight:1 }}>✕</button>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <input style={{ ...s.input, flex:1 }} value={nuevo} onChange={e => setNuevo(e.target.value)} placeholder={placeholder} onKeyDown={e => e.key === "Enter" && agregar()} />
          <button style={s.btnGl} onClick={agregar}>+ agregar</button>
        </div>
      </div>
    );
  };
  return (
    <div>
      <p style={{ fontFamily:F.sans, fontSize:12, color:G.muted, marginBottom:14, lineHeight:1.6 }}>Configurá las opciones que aparecen en la ficha técnica de cada clienta. Agregá solo lo que usés en tu trabajo.</p>
      <OpcionesEditor configKey="curvas"   label="Curvas de pestañas" placeholder="ej: C, CC, D..." />
      <OpcionesEditor configKey="grosores" label="Grosores"           placeholder="ej: 0.07, 0.10..." />
      <OpcionesEditor configKey="largos"   label="Largos"             placeholder="ej: 11mm, 12mm..." />
    </div>
  );
}

// ── Config Horarios ────────────────────────────────────────────────────────────
function ConfigHorarios({ data, toast }) {
  const [tab, setTab] = useState("slots");

  const SlotsConfig = () => {
    const slots = data.getConfig("slots", []);
    const [nuevo, setNuevo] = useState("");
    const agregar = async () => {
      const v = nuevo.trim(); if (!v) return;
      if (slots.includes(v)) { toast("ya existe"); return; }
      const upd = [...slots, v].sort();
      await data.saveConfig("slots", upd); setNuevo(""); toast(`✓ ${v} agregado`);
    };
    const quitar = async (v) => { await data.saveConfig("slots", slots.filter(x => x !== v)); toast(`${v} eliminado`); };
    return (
      <div>
        <p style={{ fontFamily:F.sans, fontSize:12, color:G.muted, marginBottom:14, lineHeight:1.6 }}>Estos horarios aparecen en la agenda y en el panel de clientas para agendar.</p>
        <div style={{ display:"flex", flexWrap:"wrap", gap:7, marginBottom:14 }}>
          {slots.length === 0 && <p style={{ color:G.muted, fontSize:12 }}>sin horarios configurados ✦</p>}
          {slots.map(v => (
            <div key={v} style={{ display:"flex", alignItems:"center", gap:4, background:G.greenM, border:`0.5px solid ${G.green}`, borderRadius:20, padding:"5px 12px" }}>
              <span style={{ fontFamily:F.sans, fontSize:13, color:G.greenL }}>{v}</span>
              <button onClick={() => quitar(v)} style={{ background:"none", border:"none", color:G.red, cursor:"pointer", fontSize:12, padding:"0 0 0 6px" }}>✕</button>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <input style={{ ...s.input, flex:1 }} value={nuevo} onChange={e => setNuevo(e.target.value)} placeholder="ej: 09:00" onKeyDown={e => e.key === "Enter" && agregar()} />
          <button style={s.btnGl} onClick={agregar}>+ agregar</button>
        </div>
      </div>
    );
  };

  const ExcepcionesConfig = () => {
    const [excs, setExcs]     = useState([]);
    const [loading, setLd]    = useState(true);
    const [fecha, setFecha]   = useState("");
    const [razon, setRazon]   = useState("");
    const [gd, setGd]         = useState(false);
    const [conf, setConf]     = useState(null);

    useEffect(() => { db.get("excepciones").then(d => { setExcs(d.sort((a, b) => a.fecha?.localeCompare(b.fecha))); setLd(false); }); }, []);

    const agregar = async () => {
      if (!fecha) { toast("elegí una fecha"); return; }
      if (excs.find(e => e.fecha === fecha)) { toast("ya está bloqueada"); return; }
      setGd(true);
      const id = await db.push("excepciones", { fecha, razon:razon.trim()||"día no laborable" });
      setExcs(p => [...p, { fecha, razon:razon.trim()||"día no laborable", _id:id }].sort((a, b) => a.fecha.localeCompare(b.fecha)));
      setFecha(""); setRazon(""); setGd(false); toast("✓ día bloqueado");
    };
    const borrar = async (id) => { await db.del(`excepciones/${id}`); setExcs(p => p.filter(e => e._id !== id)); setConf(null); toast("excepción eliminada"); };

    const hoy = hoyISO();
    const futuras = excs.filter(e => e.fecha >= hoy);
    const pasadas = excs.filter(e => e.fecha <  hoy);

    return (
      <div>
        <div style={{ ...s.card, background:"rgba(143,189,90,0.04)", borderColor:G.greenD, marginBottom:14 }}>
          <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:15, color:G.white, margin:"0 0 12px" }}>bloquear un día</p>
          <Field label="fecha"><input style={s.input} type="date" value={fecha} min={hoy} onChange={e => setFecha(e.target.value)} /></Field>
          <Field label="razón (opcional)"><input style={s.input} value={razon} onChange={e => setRazon(e.target.value)} placeholder="ej: vacaciones, feriado, evento..." /></Field>
          <button style={{ ...s.btnG, opacity:gd ? 0.6 : 1 }} onClick={agregar} disabled={gd}>{gd ? "guardando..." : "bloquear día →"}</button>
        </div>
        {loading && <p style={{ color:G.muted, fontSize:13 }}>cargando...</p>}
        {futuras.length > 0 && (
          <>
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:15, color:G.white, margin:"0 0 10px" }}>días bloqueados</p>
            {futuras.map(e => {
              const dt = new Date(e.fecha + "T12:00:00");
              const df = Math.ceil((dt - new Date()) / (1000 * 60 * 60 * 24));
              return (
                <div key={e._id} style={{ ...s.card, display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ background:G.greenM, border:`0.5px solid ${G.green}`, borderRadius:9, padding:"7px 10px", textAlign:"center", minWidth:50 }}>
                    <p style={{ margin:0, fontFamily:F.sans, fontSize:10, color:G.muted }}>{e.fecha?.slice(5).replace("-", "/")}</p>
                    <p style={{ margin:0, fontFamily:F.serif, fontWeight:700, fontSize:13, color:G.greenL }}>{DIAS_F[dt.getDay()].slice(0, 3)}</p>
                  </div>
                  <div style={{ flex:1 }}>
                    <p style={{ margin:"0 0 2px", fontFamily:F.sans, fontSize:13 }}>{e.razon}</p>
                    <p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:G.muted }}>{df === 0 ? "hoy" : df === 1 ? "mañana" : `en ${df} días`}</p>
                  </div>
                  <button style={{ ...s.btnRed, padding:"6px 10px", fontSize:12 }} onClick={() => setConf(e)}>✕</button>
                </div>
              );
            })}
          </>
        )}
        {futuras.length === 0 && !loading && <p style={{ color:G.muted, fontSize:13, marginBottom:14 }}>sin días bloqueados próximos ✦</p>}
        {pasadas.length > 0 && (
          <details style={{ marginTop:8 }}>
            <summary style={{ fontFamily:F.sans, fontSize:12, color:G.muted, cursor:"pointer", padding:"8px 0" }}>ver excepciones pasadas ({pasadas.length})</summary>
            <div style={{ marginTop:10 }}>
              {[...pasadas].reverse().map(e => <div key={e._id} style={{ ...s.card, opacity:0.5 }}><p style={{ margin:0, fontFamily:F.sans, fontSize:12, color:G.muted }}>{fmtFecha(e.fecha)} — {e.razon}</p></div>)}
            </div>
          </details>
        )}
        {conf && <Modal titulo="Eliminar excepción" msg={`¿Eliminar el bloqueo del ${fmtFecha(conf.fecha)}?`} onOk={() => borrar(conf._id)} onCancel={() => setConf(null)} okLabel="eliminar" danger />}
      </div>
    );
  };

  return (
    <div>
      <div style={{ display:"flex", gap:7, marginBottom:16 }}>
        {[["slots","mis horarios"],["excepciones","días bloqueados"]].map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)} style={{ ...s.btnGl, flex:1, fontSize:11, background:tab === v ? G.greenM : G.glass, borderColor:tab === v ? G.green : G.border, color:tab === v ? G.greenL : G.sub }}>{l}</button>
        ))}
      </div>
      {tab === "slots"       && <SlotsConfig />}
      {tab === "excepciones" && <ExcepcionesConfig />}
    </div>
  );
}

// ── Config Estudio ─────────────────────────────────────────────────────────────
function ConfigEstudio({ data, toast, onLogout }) {
  const est  = data.getConfig("estudio", {});
  const [form, setForm] = useState({ nombre:est.nombre||"", direccion:est.direccion||"", telefono:est.telefono||"", instagram:est.instagram||"", descripcion:est.descripcion||"" });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]:v }));

  const pols = data.getConfig("politicas", []);
  const [polsLocal, setPolsLocal] = useState(pols);
  const [newPol, setNewPol] = useState("");
  const [editIdx, setEditIdx] = useState(null);
  const [editTxt, setEditTxt] = useState("");

  useEffect(() => { setPolsLocal(data.getConfig("politicas", [])); }, [data.config]);

  const guardarEstudio = async () => { setSaving(true); await data.saveConfig("estudio", form); setSaving(false); toast("✓ datos guardados"); };

  const addPol  = async () => { if (!newPol.trim()) return; const upd = [...polsLocal, newPol.trim()]; await data.saveConfig("politicas", upd); setPolsLocal(upd); setNewPol(""); toast("✓ política agregada"); };
  const savePol = async (i) => { const upd = polsLocal.map((p, j) => j === i ? editTxt : p); await data.saveConfig("politicas", upd); setPolsLocal(upd); setEditIdx(null); toast("✓ guardado"); };
  const delPol  = async (i) => { const upd = polsLocal.filter((_, j) => j !== i); await data.saveConfig("politicas", upd); setPolsLocal(upd); toast("eliminada"); };

  return (
    <div>
      <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:15, color:G.white, margin:"0 0 12px" }}>datos del estudio</p>
      <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:20 }}>
        <Field label="nombre del estudio"><input style={s.input} value={form.nombre} onChange={e => set("nombre", e.target.value)} placeholder="ej: Lash Studio by Chulas" /></Field>
        <Field label="dirección"><input style={s.input} value={form.direccion} onChange={e => set("direccion", e.target.value)} placeholder="calle, localidad..." /></Field>
        <Field label="teléfono / WhatsApp"><input style={s.input} value={form.telefono} onChange={e => set("telefono", e.target.value)} placeholder="11 XXXX-XXXX" /></Field>
        <Field label="instagram"><input style={s.input} value={form.instagram} onChange={e => set("instagram", e.target.value)} placeholder="@tuusuario" /></Field>
        <Field label="descripción (opcional)" hint="Se muestra a las clientas en la app">
          <textarea style={{ ...s.input, height:70, resize:"none" }} value={form.descripcion} onChange={e => set("descripcion", e.target.value)} placeholder="Breve descripción del estudio..." />
        </Field>
        <button style={{ ...s.btnG, opacity:saving ? 0.6 : 1 }} onClick={guardarEstudio} disabled={saving}>{saving ? "guardando..." : "guardar datos →"}</button>
      </div>
      <div style={s.div} />
      <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:15, color:G.white, margin:"0 0 4px" }}>políticas del estudio</p>
      <p style={{ fontFamily:F.sans, fontSize:11, color:G.muted, margin:"0 0 14px", lineHeight:1.6 }}>Aparecen en el perfil de las clientas cuando usan la app.</p>
      {polsLocal.length === 0 && <p style={{ color:G.muted, fontSize:13, marginBottom:14 }}>sin políticas cargadas ✦</p>}
      {polsLocal.map((p, i) => (
        <div key={i} style={{ ...s.card, padding:"10px 12px", marginBottom:8 }}>
          {editIdx === i ? (
            <div style={{ display:"flex", gap:8 }}>
              <input style={{ ...s.input, flex:1 }} value={editTxt} onChange={e => setEditTxt(e.target.value)} autoFocus onKeyDown={e => e.key === "Enter" && savePol(i)} />
              <button style={{ ...s.btnG, width:"auto", padding:"8px 12px" }} onClick={() => savePol(i)}>✓</button>
              <button style={{ ...s.btnGl, padding:"8px 12px" }} onClick={() => setEditIdx(null)}>✕</button>
            </div>
          ) : (
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <p style={{ flex:1, margin:0, fontFamily:F.sans, fontSize:13, color:G.sub }}>✦ {p}</p>
              <button style={{ ...s.btnGl, padding:"5px 9px", fontSize:11 }} onClick={() => { setEditIdx(i); setEditTxt(p); }}>✎</button>
              <button style={{ ...s.btnRed, padding:"5px 9px", fontSize:11 }} onClick={() => delPol(i)}>✕</button>
            </div>
          )}
        </div>
      ))}
      <div style={{ display:"flex", gap:8, marginTop:8 }}>
        <input style={{ ...s.input, flex:1 }} value={newPol} onChange={e => setNewPol(e.target.value)} placeholder="Nueva política..." onKeyDown={e => e.key === "Enter" && addPol()} />
        <button style={s.btnGl} onClick={addPol}>+ agregar</button>
      </div>
      <div style={s.div} />
      <button style={{ ...s.btnRed, width:"100%" }} onClick={onLogout}>cerrar sesión</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PANEL CLIENTA
// ═══════════════════════════════════════════════════════════════════════════════
function ClientaApp({ clienta, data, onLogout }) {
  const [tab, setTab] = useState("inicio");
  const tabs = [{ id:"inicio",icon:"⬡",label:"inicio" },{ id:"agendar",icon:"◷",label:"agendar" },{ id:"historial",icon:"✦",label:"historial" },{ id:"perfil",icon:"✿",label:"perfil" }];
  const render = () => {
    switch (tab) {
      case "inicio":    return <CInicio    clienta={clienta} data={data} setTab={setTab} />;
      case "agendar":   return <CAgendar   clienta={clienta} data={data} />;
      case "historial": return <CHistorial clienta={clienta} />;
      case "perfil":    return <CPerfil    clienta={clienta} data={data} onLogout={onLogout} />;
      default:          return <CInicio    clienta={clienta} data={data} setTab={setTab} />;
    }
  };
  return (
    <div style={s.app}>
      <div style={s.screen}>{render()}</div>
      <nav style={s.nav}>
        {tabs.map(t => (
          <div key={t.id} style={navItmSty(tab === t.id)} onClick={() => setTab(t.id)}>
            <span style={{ fontSize:18 }}>{t.icon}</span>
            <span style={{ fontFamily:F.sans, fontSize:9, letterSpacing:"0.08em" }}>{t.label}</span>
          </div>
        ))}
      </nav>
      <button style={s.fab} onClick={() => openWA("Hola! Tengo una consulta 💚")} title="Consultar a Male">💬</button>
    </div>
  );
}

function CInicio({ clienta, data, setTab }) {
  const hoy   = hoyISO();
  const hist  = clienta.historial || [];
  const ultima = [...hist].sort((a, b) => b.fecha?.localeCompare(a.fecha))[0];
  const diasDesde = ultima?.fecha ? Math.floor((new Date() - new Date(ultima.fecha)) / (1000 * 60 * 60 * 24)) : null;
  const proxCita  = data.citas.filter(c => c.clientaId === clienta._id && c.fecha >= hoy && c.estado !== "completada").sort((a, b) => a.fecha.localeCompare(b.fecha))[0];
  const diasHasta = proxCita ? Math.floor((new Date(proxCita.fecha) - new Date()) / (1000 * 60 * 60 * 24)) : null;
  const estudio   = data.getConfig("estudio", {});
  const curvaFav  = clienta.curva || "—";

  return (
    <div>
      <div style={s.topBar}><h1 style={s.h1}>{estudio.nombre || "Lash Studio"}</h1><p style={s.sub}>hola, {clienta.nombre?.split(" ")[0].toLowerCase()} 🌿</p></div>
      <div style={{ padding:"18px" }}>
        {diasDesde !== null && diasDesde >= 14 && !proxCita && (
          <div style={{ background:"linear-gradient(135deg,rgba(143,189,90,0.14),rgba(143,189,90,0.04))", border:`1px solid ${G.green}`, borderRadius:14, padding:"15px 16px", marginBottom:12 }}>
            <p style={{ margin:"0 0 3px", fontFamily:F.serif, fontWeight:700, fontSize:15, color:G.greenL }}>¡es hora del service! ✦</p>
            <p style={{ margin:"0 0 11px", fontFamily:F.sans, fontSize:12, color:G.sub }}>hace {diasDesde} días de tu último tratamiento</p>
            <button style={{ ...s.btnG, padding:"9px 14px" }} onClick={() => setTab("agendar")}>agendar ahora →</button>
          </div>
        )}
        {proxCita && (
          <div style={{ ...s.card, borderColor:G.greenD, marginBottom:12 }}>
            <p style={{ fontFamily:F.sans, fontSize:10, color:G.muted, margin:"0 0 7px", textTransform:"lowercase" }}>próxima cita</p>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <p style={{ margin:"0 0 2px", fontFamily:F.serif, fontWeight:700, fontSize:16 }}>{proxCita.servicio}</p>
                <p style={{ margin:0, fontFamily:F.sans, fontSize:12, color:G.sub }}>{fmtFecha(proxCita.fecha)} · {proxCita.hora}</p>
              </div>
              {diasHasta !== null && (
                <div style={{ textAlign:"center", background:G.greenM, border:`0.5px solid ${G.green}`, borderRadius:11, padding:"8px 13px" }}>
                  <p style={{ margin:0, fontFamily:F.serif, fontWeight:700, fontSize:20, color:G.greenL }}>{diasHasta}</p>
                  <p style={{ margin:0, fontFamily:F.sans, fontSize:9, color:G.muted }}>días</p>
                </div>
              )}
            </div>
          </div>
        )}
        <div style={{ display:"flex", gap:9, marginBottom:18 }}>
          <div onClick={() => setTab("historial")} style={{ ...s.card, flex:1, textAlign:"center", cursor:"pointer", margin:0, padding:"12px 6px" }}>
            <p style={{ fontFamily:F.sans, fontSize:9, color:G.muted, margin:"0 0 3px" }}>visitas</p>
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:22, color:G.white, margin:"0 0 2px" }}>{hist.length}</p>
            <p style={{ fontFamily:F.sans, fontSize:9, color:G.green, margin:0 }}>ver →</p>
          </div>
          <div onClick={() => setTab("perfil")} style={{ ...s.card, flex:1, textAlign:"center", cursor:"pointer", margin:0, padding:"12px 6px" }}>
            <p style={{ fontFamily:F.sans, fontSize:9, color:G.muted, margin:"0 0 3px" }}>curva fav.</p>
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:22, color:G.white, margin:"0 0 2px" }}>{curvaFav}</p>
            <p style={{ fontFamily:F.sans, fontSize:9, color:G.green, margin:0 }}>mi ficha →</p>
          </div>
          <div onClick={() => setTab("agendar")} style={{ ...s.card, flex:1, textAlign:"center", cursor:"pointer", margin:0, padding:"12px 6px", background:G.greenM, borderColor:G.greenD }}>
            <p style={{ fontFamily:F.sans, fontSize:9, color:G.greenL, margin:"0 0 3px" }}>turno</p>
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:22, color:G.white, margin:"0 0 2px" }}>+</p>
            <p style={{ fontFamily:F.sans, fontSize:9, color:G.greenL, margin:0 }}>agendar →</p>
          </div>
        </div>
        {ultima && (
          <>
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:16, color:G.white, margin:"0 0 3px" }}>último servicio</p>
            <p style={{ ...s.sub, marginBottom:10 }}>{fmtFecha(ultima.fecha)}</p>
            <div style={{ ...s.card, cursor:"pointer" }} onClick={() => setTab("historial")}>
              <p style={{ margin:"0 0 5px", fontFamily:F.serif, fontWeight:700, fontSize:15 }}>{ultima.servicio}</p>
              {ultima.curva && <span style={s.tag}>curva {ultima.curva}</span>}
              <p style={{ margin:"9px 0 0", fontFamily:F.sans, fontSize:11, color:G.muted }}>ver historial completo →</p>
            </div>
          </>
        )}
        <div style={s.div} />
        <div style={s.card}>
          {[
            estudio.direccion && ["📍", estudio.direccion],
            estudio.telefono  && ["📱", estudio.telefono],
            estudio.instagram && ["📷", estudio.instagram],
          ].filter(Boolean).map(([ic, v]) => (
            <div key={v} style={{ display:"flex", gap:10, alignItems:"center", marginBottom:8 }}>
              <span style={{ fontSize:14 }}>{ic}</span>
              <p style={{ margin:0, fontFamily:F.sans, fontSize:13, color:G.sub }}>{v}</p>
            </div>
          ))}
          {!estudio.direccion && !estudio.telefono && !estudio.instagram && <p style={{ margin:0, fontFamily:F.sans, fontSize:12, color:G.muted }}>Lash Studio 🌿</p>}
          <button style={{ ...s.btnG, marginTop:10, padding:"9px" }} onClick={() => openWA()}>abrir en WhatsApp →</button>
        </div>
      </div>
    </div>
  );
}

function CAgendar({ clienta, data }) {
  const [paso, setPaso]     = useState(1);
  const [modo, setModo]     = useState("individual");
  const [form, setForm]     = useState({ servicio:null, fecha:"", hora:"", notas:"" });
  const [fotoIdx, setFotoIdx] = useState(0);
  const [enviado, setEnviado] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]:v }));

  const slots      = data.getConfig("slots", []);
  const ocupadas   = data.citas.filter(c => c.fecha === form.fecha && c.estado !== "completada").map(c => c.hora);
  const fechasBloq = new Set(data.excepciones.map(e => e.fecha));

  const confirmar = () => {
    const sv  = form.servicio?.nombre || "A confirmar con Male";
    const msg = modo === "noSe"
      ? `Hola! 🌿 Quiero agendar un turno:\n📅 ${form.fecha} a las ${form.hora}\n💭 No sé bien qué hacerme${form.notas ? `\n${form.notas}` : ""}\n💚 ${clienta.nombre}`
      : `Hola! 🌿 Quiero agendar:\n✦ ${sv}\n📅 ${form.fecha} a las ${form.hora}${form.notas ? `\nNotas: ${form.notas}` : ""}\n💚 ${clienta.nombre}`;
    openWA(msg); setEnviado(true);
  };

  if (enviado) return (
    <div style={{ minHeight:"100vh", background:G.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:28, textAlign:"center" }}>
      <div style={{ fontSize:44, marginBottom:12 }}>🌿</div>
      <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:22, color:G.greenL, margin:"0 0 8px" }}>¡solicitud enviada!</p>
      <p style={{ fontFamily:F.sans, fontSize:13, color:G.sub, margin:"0 0 24px", lineHeight:1.7 }}>Male va a confirmar tu turno por WhatsApp. ¡Nos vemos pronto!</p>
      <button style={s.btnG} onClick={() => { setEnviado(false); setPaso(1); setForm({ servicio:null, fecha:"", hora:"", notas:"" }); }}>volver →</button>
    </div>
  );

  return (
    <div>
      <div style={s.topBar}><h1 style={s.h1}>Agendar</h1><p style={s.sub}>paso {paso} de 3</p></div>
      <div style={{ padding:"18px" }}>
        <div style={{ display:"flex", gap:5, marginBottom:20 }}>
          {[1,2,3].map(p => <div key={p} style={{ flex:1, height:3, borderRadius:2, background:p <= paso ? G.green : G.border, transition:"background 0.3s" }} />)}
        </div>

        {paso === 1 && (
          <div>
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:17, color:G.white, margin:"0 0 14px" }}>¿qué querés hacerte?</p>
            <div style={{ display:"flex", gap:7, marginBottom:16 }}>
              {[["individual","servicio"],["noSe","no sé aún"]].map(([m, l]) => (
                <button key={m} onClick={() => { setModo(m); set("servicio", null); }} style={{ ...s.btnGl, flex:1, fontSize:11, background:modo === m ? G.greenM : G.glass, borderColor:modo === m ? G.green : G.border, color:modo === m ? G.greenL : G.sub }}>{l}</button>
              ))}
            </div>
            {modo === "individual" && (
              data.servicios.length === 0
                ? <p style={{ color:G.muted, fontSize:13 }}>los servicios se están configurando, volvé pronto ✦</p>
                : data.servicios.map(sv => (
                  <div key={sv._id} style={{ ...s.card, borderColor:form.servicio?._id === sv._id ? G.green : G.border, background:form.servicio?._id === sv._id ? "rgba(143,189,90,0.06)" : G.card }}>
                    {sv.fotos?.length > 0 && (
                      <div style={{ marginBottom:10, position:"relative" }}>
                        <img src={sv.fotos[fotoIdx % sv.fotos.length]} alt={sv.nombre} style={{ width:"100%", height:140, objectFit:"cover", borderRadius:10 }} onError={e => { e.target.style.display = "none"; }} />
                        {sv.fotos.length > 1 && (
                          <div style={{ position:"absolute", bottom:6, left:0, right:0, display:"flex", justifyContent:"center", gap:4 }}>
                            {sv.fotos.map((_, i) => <div key={i} style={{ width:5, height:5, borderRadius:"50%", background:i === fotoIdx % sv.fotos.length ? G.white : "rgba(255,255,255,0.4)", cursor:"pointer" }} onClick={e => { e.stopPropagation(); setFotoIdx(i); }} />)}
                          </div>
                        )}
                      </div>
                    )}
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }} onClick={() => { set("servicio", sv); setPaso(2); }}>
                      <div style={{ flex:1, cursor:"pointer" }}>
                        <p style={{ margin:"0 0 3px", fontFamily:F.serif, fontSize:14 }}>{sv.nombre}</p>
                        {sv.descripcion && <p style={{ margin:"0 0 7px", fontFamily:F.sans, fontSize:12, color:G.sub }}>{sv.descripcion}</p>}
                        <span style={s.tag}>{sv.duracion}min est.</span>
                      </div>
                      <p style={{ margin:0, fontFamily:F.serif, fontWeight:700, color:G.green, fontSize:15, cursor:"pointer" }}>{fmtPesos(sv.precio)}</p>
                    </div>
                    <p style={{ margin:"8px 0 0", fontFamily:F.sans, fontSize:10, color:G.muted, fontStyle:"italic" }}>✦ La duración es estimada y puede variar</p>
                  </div>
                ))
            )}
            {modo === "noSe" && (
              <div>
                <div style={{ ...s.card, background:"rgba(143,189,90,0.05)", borderColor:G.greenD, textAlign:"center", padding:"22px 18px" }}>
                  <div style={{ fontSize:30, marginBottom:9 }}>🌿</div>
                  <p style={{ margin:"0 0 5px", fontFamily:F.serif, fontWeight:700, fontSize:16, color:G.greenL }}>¡no te preocupes!</p>
                  <p style={{ margin:"0 0 14px", fontFamily:F.sans, fontSize:12, color:G.sub, lineHeight:1.7 }}>Agendá tu turno y Male te va a asesorar personalmente. Contale qué efecto buscás en las notas.</p>
                  <button style={{ ...s.btnG, padding:"10px" }} onClick={() => setPaso(2)}>agendar igualmente →</button>
                </div>
                <div style={{ ...s.card, marginTop:8 }}>
                  <p style={{ ...s.sub, margin:"0 0 9px" }}>¿querés consultar antes?</p>
                  <button style={{ ...s.btnGl, width:"100%", borderColor:G.green, color:G.greenL }} onClick={() => openWA("Hola! No sé bien qué servicio hacerme, ¿me podés orientar? 🌿")}>💬 consultar por WhatsApp</button>
                </div>
              </div>
            )}
          </div>
        )}

        {paso === 2 && (
          <div>
            <button style={{ ...s.btnGl, marginBottom:14, fontSize:12 }} onClick={() => setPaso(1)}>← cambiar servicio</button>
            {form.servicio && <div style={{ ...s.card, background:"rgba(143,189,90,0.05)", borderColor:G.greenD, marginBottom:16, padding:"9px 13px" }}><p style={{ margin:0, fontFamily:F.sans, fontSize:12, color:G.greenL }}>✦ {form.servicio.nombre}</p></div>}
            <Field label="fecha"><input style={s.input} type="date" value={form.fecha} onChange={e => set("fecha", e.target.value)} min={hoyISO()} /></Field>
            {form.fecha && fechasBloq.has(form.fecha) && <p style={{ color:G.red, fontSize:12, marginBottom:12 }}>⚠ Este día no tiene turnos disponibles. Elegí otra fecha.</p>}
            {form.fecha && !fechasBloq.has(form.fecha) && (
              <>
                <Field label="hora disponible">
                  <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
                    {slots.length === 0 && <p style={{ color:G.muted, fontSize:12 }}>sin horarios configurados</p>}
                    {slots.map(h => { const oc = ocupadas.includes(h); return <button key={h} disabled={oc} onClick={() => set("hora", h)} style={{ ...s.btnGl, padding:"9px 12px", fontSize:12, opacity:oc ? 0.3 : 1, background:form.hora === h ? G.greenM : G.glass, borderColor:form.hora === h ? G.green : G.border, color:form.hora === h ? G.greenL : G.sub, cursor:oc ? "not-allowed" : "pointer" }}>{h}{oc ? " ✕" : ""}</button>; })}
                  </div>
                </Field>
                <Field label={modo === "noSe" ? "contanos qué efecto buscás" : "notas (opcional)"}>
                  <textarea style={{ ...s.input, height:65, resize:"none" }} value={form.notas} onChange={e => set("notas", e.target.value)} placeholder={modo === "noSe" ? "largo, volumen, ocasión especial..." : "indicaciones especiales..."} />
                </Field>
                {form.hora && <button style={s.btnG} onClick={() => setPaso(3)}>confirmar horario →</button>}
              </>
            )}
          </div>
        )}

        {paso === 3 && (
          <div>
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:17, color:G.white, margin:"0 0 3px" }}>confirmá tu cita</p>
            <p style={{ ...s.sub, marginBottom:14 }}>revisá los detalles antes de enviar</p>
            <div style={{ ...s.card, background:"rgba(143,189,90,0.05)", borderColor:G.greenD }}>
              {[
                ["servicio",        form.servicio?.nombre || "a confirmar con Male"],
                ["fecha",           fmtFecha(form.fecha)],
                ["hora",            form.hora],
                ["duración aprox.", form.servicio?.duracion ? `${form.servicio.duracion}min est.` : "a confirmar"],
                ...(form.notas ? [["notas", form.notas]] : []),
              ].map(([k, v]) => (
                <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:`0.5px solid ${G.border}` }}>
                  <span style={{ ...s.label, margin:0 }}>{k}</span>
                  <span style={{ fontFamily:F.sans, fontSize:12, color:G.sub, maxWidth:"60%", textAlign:"right" }}>{v}</span>
                </div>
              ))}
            </div>
            <button style={{ ...s.btnG, marginTop:14 }} onClick={confirmar}>confirmar y avisar a Male →</button>
            <button style={{ ...s.btnGl, marginTop:9, width:"100%" }} onClick={() => setPaso(1)}>modificar</button>
          </div>
        )}
      </div>
    </div>
  );
}

function CHistorial({ clienta }) {
  const hist = clienta.historial || [];
  const cnt  = {}; hist.forEach(h => { cnt[h.curva] = (cnt[h.curva] || 0) + 1; });
  const curvaFav = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0]?.[0] || clienta.curva || "—";
  const badge = hist.length >= 10 ? "✦ clienta VIP" : hist.length >= 5 ? "✦ clienta frecuente" : hist.length >= 2 ? "✦ clienta activa" : null;
  return (
    <div>
      <div style={s.topBar}><h1 style={s.h1}>Historial</h1><p style={s.sub}>{hist.length} visitas al estudio</p></div>
      <div style={{ padding:"18px" }}>
        <div style={{ display:"flex", gap:9, marginBottom:16 }}>
          <div style={{ ...s.card, flex:1, textAlign:"center", margin:0, padding:"12px 6px" }}><p style={{ fontFamily:F.sans, fontSize:9, color:G.muted, margin:"0 0 3px" }}>visitas</p><p style={{ fontFamily:F.serif, fontWeight:700, fontSize:24, color:G.green, margin:0 }}>{hist.length}</p></div>
          <div style={{ ...s.card, flex:1, textAlign:"center", margin:0, padding:"12px 6px" }}><p style={{ fontFamily:F.sans, fontSize:9, color:G.muted, margin:"0 0 3px" }}>curva fav.</p><p style={{ fontFamily:F.serif, fontWeight:700, fontSize:24, margin:0 }}>{curvaFav}</p></div>
        </div>
        {badge && (
          <div style={{ ...s.card, background:"rgba(143,189,90,0.05)", borderColor:G.greenD, textAlign:"center", padding:"16px", marginBottom:14 }}>
            <p style={{ margin:"0 0 4px", fontFamily:F.serif, fontWeight:700, fontSize:16, color:G.greenL }}>{badge}</p>
            <p style={{ margin:0, fontFamily:F.sans, fontSize:12, color:G.muted }}>{hist.length} visitas y siempre hermosa 💚</p>
          </div>
        )}
        <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:16, color:G.white, margin:"0 0 3px" }}>tus visitas</p>
        <p style={{ ...s.sub, marginBottom:12 }}>más recientes primero</p>
        {hist.length === 0 && <p style={{ color:G.muted, fontSize:13 }}>tu historial estará aquí después de tu primera visita ✦</p>}
        {[...hist].reverse().map((h, i) => (
          <div key={i} style={s.card}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:5 }}>
              <div><p style={{ margin:"0 0 2px", fontFamily:F.serif, fontSize:14 }}>{h.servicio}</p><p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:G.muted }}>{fmtFecha(h.fecha)}</p></div>
              {h.curva && <span style={s.tag}>curva {h.curva}</span>}
            </div>
            {h.notas && <p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:G.muted }}>✦ {h.notas}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function CPerfil({ clienta, data, onLogout }) {
  const [editando, setEdit] = useState(false);
  const [foto, setFoto]     = useState(null);
  const politicas = data.getConfig("politicas", []);
  const estudio   = data.getConfig("estudio",   {});
  const onFoto = (e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = ev => setFoto(ev.target.result); r.readAsDataURL(f); };
  return (
    <div>
      <div style={s.topBar}><h1 style={s.h1}>Mi Perfil</h1><p style={s.sub}>tus datos</p></div>
      <div style={{ padding:"18px" }}>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", marginBottom:22 }}>
          <div style={{ position:"relative", marginBottom:10 }}>
            {foto ? <img src={foto} alt="perfil" style={{ width:78, height:78, borderRadius:"50%", objectFit:"cover", border:`2px solid ${G.green}` }} /> : <Avatar nombre={clienta.nombre} size={78} />}
            <label htmlFor="foto-input" style={{ position:"absolute", bottom:0, right:0, width:26, height:26, borderRadius:"50%", background:editando ? G.green : "rgba(10,10,10,0.8)", border:`1.5px solid ${editando ? G.bg : G.border}`, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:13 }}>📷</label>
            <input id="foto-input" type="file" accept="image/*" style={{ display:"none" }} onChange={onFoto} />
          </div>
          <p style={{ margin:"0 0 5px", fontFamily:F.serif, fontWeight:700, fontSize:18 }}>{clienta.nombre}</p>
          <span style={s.tag}>clienta activa</span>
        </div>
        <div style={{ display:"flex", gap:8, marginBottom:16 }}>
          <button style={{ ...s.btnGl, flex:1, fontSize:12 }} onClick={() => setEdit(e => !e)}>{editando ? "cancelar" : "✎ editar"}</button>
          <button style={{ ...s.btnGl, flex:1, fontSize:12 }} onClick={() => openWA()}>💬 contactar</button>
        </div>
        <div style={{ ...s.card, display:"flex", flexDirection:"column", gap:12 }}>
          {[["nombre", clienta.nombre], ["email", clienta.email || "—"], ["teléfono", clienta.telefono || "—"]].map(([l, v]) => (
            <div key={l}><label style={s.label}>{l}</label>{editando ? <input style={s.input} defaultValue={v} /> : <p style={{ margin:0, fontFamily:F.sans, fontSize:13, color:G.sub }}>{v}</p>}</div>
          ))}
          {editando && <Field label="contacto de emergencia"><input style={s.input} placeholder="nombre y teléfono..." /></Field>}
        </div>
        {(clienta.curva || clienta.grosor || clienta.largo) && (
          <div style={{ marginTop:12 }}>
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:16, color:G.white, margin:"0 0 10px" }}>mis preferencias</p>
            <div style={s.card}>
              {[["curva habitual", clienta.curva], ["grosor", clienta.grosor ? `${clienta.grosor}mm` : null], ["largo", clienta.largo]].filter(([, v]) => v).map(([l, v]) => (
                <div key={l} style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                  <span style={{ ...s.label, margin:0 }}>{l}</span>
                  <span style={s.tag}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {politicas.length > 0 && (
          <div style={{ ...s.card, marginTop:12, background:"rgba(143,189,90,0.03)", borderColor:G.border }}>
            <p style={{ margin:"0 0 9px", fontFamily:F.serif, fontWeight:700, fontSize:14 }}>Políticas del Estudio</p>
            {politicas.map((p, i) => <p key={i} style={{ margin:"0 0 6px", fontFamily:F.sans, fontSize:12, color:G.sub }}>✦ {p}</p>)}
          </div>
        )}
        {editando && <button style={{ ...s.btnG, marginTop:12 }}>guardar cambios →</button>}
        <button style={{ ...s.btnRed, marginTop:18, width:"100%" }} onClick={onLogout}>cerrar sesión</button>
      </div>
    </div>
  );
}
