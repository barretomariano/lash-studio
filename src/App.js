import { useState, useEffect, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// FIREBASE CONFIG
// ═══════════════════════════════════════════════════════════════════════════════
const FB = "https://lash-studio-c9cd7-default-rtdb.firebaseio.com";
const API_KEY = "AIzaSyDq8japdXOWaAAOjBLhESJB1h2qITdnhvk";
const AUTH = "https://identitytoolkit.googleapis.com/v1/accounts";
const ADMIN_EMAIL = "maleocampo3@gmail.com";
const WA = "541126509699";

// ─── REST helpers ─────────────────────────────────────────────────────────────
const db = {
  get: async (path) => {
    const r = await fetch(`${FB}/${path}.json`);
    const d = await r.json();
    if (!d || typeof d !== "object") return [];
    return Object.entries(d).map(([k, v]) => ({ ...v, _id: k }));
  },
  getOne: async (path) => {
    const r = await fetch(`${FB}/${path}.json`);
    return await r.json();
  },
  set: async (path, data) => {
    await fetch(`${FB}/${path}.json`, { method: "PUT", body: JSON.stringify(data) });
  },
  push: async (path, data) => {
    const r = await fetch(`${FB}/${path}.json`, { method: "POST", body: JSON.stringify(data) });
    const j = await r.json();
    return j.name;
  },
  update: async (path, data) => {
    await fetch(`${FB}/${path}.json`, { method: "PATCH", body: JSON.stringify(data) });
  },
  delete: async (path) => {
    await fetch(`${FB}/${path}.json`, { method: "DELETE" });
  },
};

// ─── Auth helpers ──────────────────────────────────────────────────────────────
const auth = {
  signIn: async (email, password) => {
    const r = await fetch(`${AUTH}:signInWithPassword?key=${API_KEY}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    return await r.json();
  },
  createUser: async (email, password) => {
    const r = await fetch(`${AUTH}:signUp?key=${API_KEY}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    return await r.json();
  },
};

const genPassword = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const openWA = (msg = "") => window.open(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`, "_blank");
const hoyISO = () => new Date().toISOString().slice(0, 10);
const fmtPesos = (n) => `$${Number(n || 0).toLocaleString("es-AR")}`;
const fmtFecha = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  const meses = ["", "ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${parseInt(d)} ${meses[parseInt(m)]} ${y}`;
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES UI
// ═══════════════════════════════════════════════════════════════════════════════
const CURVAS = ["B", "C", "CC", "D", "L", "L+"];
const GROSOR = ["0.05", "0.07", "0.10", "0.12", "0.15", "0.20"];
const LARGO = ["8mm", "9mm", "10mm", "11mm", "12mm", "13mm", "14mm"];
const SLOTS = ["09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00"];
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const DIAS_C = ["D","L","M","X","J","V","S"];
const DIAS_F = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTILOS
// ═══════════════════════════════════════════════════════════════════════════════
const G = {
  bg:"#0a0a0a", card:"rgba(255,255,255,0.04)", cardHov:"rgba(255,255,255,0.07)",
  glass:"rgba(255,255,255,0.06)", border:"rgba(255,255,255,0.08)", borderHov:"rgba(255,255,255,0.16)",
  green:"#8fbd5a", greenD:"#5c8f2e", greenL:"#b5d98a", greenM:"rgba(143,189,90,0.15)",
  text:"#f0f0f0", muted:"rgba(240,240,240,0.45)", sub:"rgba(240,240,240,0.65)",
  white:"#ffffff", red:"#e07070", amber:"#e0b870",
};
const F = { serif:"'Playfair Display', Georgia, serif", sans:"'DM Sans', 'Segoe UI', sans-serif" };

const s = {
  app:{ minHeight:"100vh", background:G.bg, color:G.text, fontFamily:F.sans, maxWidth:430, margin:"0 auto", position:"relative", overflowX:"hidden" },
  screen:{ minHeight:"100vh", paddingBottom:100 },
  topBar:{ padding:"52px 20px 14px", borderBottom:`0.5px solid ${G.border}`, background:"rgba(10,10,10,0.94)", backdropFilter:"blur(20px)", position:"sticky", top:0, zIndex:10 },
  h1:{ fontFamily:F.serif, fontWeight:700, fontSize:24, letterSpacing:"-0.5px", color:G.white, margin:0 },
  sub:{ fontFamily:F.sans, fontSize:11, color:G.muted, margin:"3px 0 0", letterSpacing:"0.04em" },
  card:{ background:G.card, border:`0.5px solid ${G.border}`, borderRadius:14, padding:"14px 16px", marginBottom:10, backdropFilter:"blur(10px)", transition:"all 0.2s" },
  input:{ background:"rgba(255,255,255,0.06)", border:`0.5px solid ${G.border}`, borderRadius:10, padding:"11px 14px", color:G.text, fontFamily:F.sans, fontSize:14, width:"100%", outline:"none", boxSizing:"border-box" },
  label:{ fontFamily:F.sans, fontSize:11, color:G.muted, display:"block", marginBottom:5, letterSpacing:"0.03em" },
  btnGreen:{ background:G.green, border:"none", borderRadius:12, padding:"13px 20px", color:"#0a0a0a", fontFamily:F.sans, fontSize:13, fontWeight:700, cursor:"pointer", width:"100%", transition:"opacity 0.2s" },
  btnGlass:{ background:G.glass, border:`0.5px solid ${G.borderHov}`, borderRadius:11, padding:"9px 16px", color:G.text, fontFamily:F.sans, fontSize:13, cursor:"pointer", backdropFilter:"blur(8px)", transition:"all 0.2s" },
  btnRed:{ background:"rgba(224,112,112,0.12)", border:`0.5px solid ${G.red}`, borderRadius:11, padding:"9px 16px", color:G.red, fontFamily:F.sans, fontSize:13, cursor:"pointer" },
  tag:{ background:G.greenM, border:`0.5px solid ${G.green}`, borderRadius:20, padding:"3px 10px", fontSize:11, color:G.greenL, fontFamily:F.sans, display:"inline-block", marginRight:5, marginBottom:3 },
  nav:{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:430, background:"rgba(10,10,10,0.94)", backdropFilter:"blur(20px)", borderTop:`0.5px solid ${G.border}`, display:"flex", zIndex:20, padding:"8px 0 20px" },
  fab:{ position:"fixed", bottom:88, right:18, width:50, height:50, borderRadius:"50%", background:G.green, border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, boxShadow:`0 4px 20px rgba(143,189,90,0.4)`, zIndex:30 },
  divider:{ height:"0.5px", background:G.border, margin:"16px 0" },
  statCard:{ background:G.card, border:`0.5px solid ${G.border}`, borderRadius:13, padding:"13px 14px", flex:1 },
};

const navItemStyle = (active) => ({
  flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3,
  padding:"8px 0", cursor:"pointer", color: active ? G.green : G.muted, transition:"color 0.2s",
});

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTES COMUNES
// ═══════════════════════════════════════════════════════════════════════════════
function Loader({ msg = "cargando..." }) {
  return (
    <div style={{ minHeight:"100vh", background:G.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:14 }}>
      <span style={{ fontSize:36 }}>🌿</span>
      <p style={{ ...s.sub, fontSize:13, color:G.sub }}>{msg}</p>
    </div>
  );
}

function Avatar({ nombre = "?", size = 40 }) {
  const ini = (nombre || "?").split(" ").slice(0,2).map(n=>n[0]||"").join("").toUpperCase();
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:G.greenM, border:`1px solid ${G.green}`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:F.serif, fontWeight:700, fontSize:size*0.3, color:G.greenL, flexShrink:0 }}>
      {ini}
    </div>
  );
}

function FAB() {
  return <button style={s.fab} onClick={()=>openWA("Hola Male! Tengo una consulta 💚")}>💬</button>;
}

function Back({ onClick, label="volver" }) {
  return <button onClick={onClick} style={{ ...s.btnGlass, marginBottom:14, fontSize:12 }}>← {label}</button>;
}

function Field({ label, children }) {
  return <div style={{ marginBottom:12 }}><label style={s.label}>{label}</label>{children}</div>;
}

function ChipSelector({ options, value, onChange }) {
  return (
    <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
      {options.map(o => (
        <button key={o} onClick={()=>onChange(o)}
          style={{ ...s.btnGlass, padding:"6px 12px", fontSize:12,
            background: value===o ? G.greenM : G.glass,
            borderColor: value===o ? G.green : G.border,
            color: value===o ? G.greenL : G.sub }}>
          {o}
        </button>
      ))}
    </div>
  );
}

function Toast({ msg, onDone }) {
  useEffect(()=>{ const t=setTimeout(onDone,2200); return ()=>clearTimeout(t); },[]);
  return (
    <div style={{ position:"fixed", bottom:110, left:"50%", transform:"translateX(-50%)", background:G.green, color:"#0a0a0a", borderRadius:12, padding:"10px 20px", fontFamily:F.sans, fontWeight:700, fontSize:13, zIndex:99, boxShadow:"0 4px 20px rgba(0,0,0,0.4)", whiteSpace:"nowrap" }}>
      {msg}
    </div>
  );
}

// Modal de confirmación / alerta
function Modal({ titulo, msg, onOk, onCancel, okLabel="confirmar", danger=false }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", backdropFilter:"blur(8px)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ background:"#111", border:`0.5px solid ${G.border}`, borderRadius:18, padding:24, width:"100%", maxWidth:360 }}>
        <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:18, color:G.white, margin:"0 0 8px" }}>{titulo}</p>
        <p style={{ fontFamily:F.sans, fontSize:13, color:G.sub, margin:"0 0 20px", lineHeight:1.6 }}>{msg}</p>
        <div style={{ display:"flex", gap:10 }}>
          {onCancel && <button style={{ ...s.btnGlass, flex:1 }} onClick={onCancel}>cancelar</button>}
          <button style={{ ...s.btnGreen, flex:1, background: danger ? G.red : G.green }} onClick={onOk}>{okLabel}</button>
        </div>
      </div>
    </div>
  );
}

// Bottom Sheet genérico
function Sheet({ titulo, onClose, children }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", backdropFilter:"blur(8px)", zIndex:100, display:"flex", alignItems:"flex-end", justifyContent:"center" }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:"#111", border:`0.5px solid ${G.border}`, borderRadius:"18px 18px 0 0", width:"100%", maxWidth:430, maxHeight:"92vh", overflowY:"auto", padding:"20px 20px 40px" }}>
        <div style={{ width:34, height:4, background:G.border, borderRadius:2, margin:"0 auto 16px" }}/>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
          <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:20, color:G.white, margin:0 }}>{titulo}</p>
          <button style={{ ...s.btnGlass, padding:"6px 12px", fontSize:13 }} onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════════════════════════════
function Login({ onLogin }) {
  const [modo, setModo] = useState(null);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [recordar, setRecordar] = useState(true);

  useEffect(()=>{
    const g = localStorage.getItem("ls_session");
    if(g){ try{ const p=JSON.parse(g); if(p.expiry>Date.now()) onLogin(p.tipo,p.data); }catch{} }
  },[]);

  const guardar = (tipo, data=null) => {
    if(recordar) localStorage.setItem("ls_session", JSON.stringify({ tipo, data, expiry: Date.now()+1000*60*60*24*30 }));
  };

  const entrar = async () => {
    if(!email||!pass){ setErr("completá los campos"); return; }
    setLoading(true); setErr("");
    const r = await auth.signIn(email, pass);
    if(r.error){ setErr("credenciales incorrectas"); setLoading(false); return; }

    if(email.toLowerCase() === ADMIN_EMAIL.toLowerCase()){
      guardar("admin"); onLogin("admin");
    } else {
      // Buscar clienta por email
      const todas = await db.get("clientas");
      const c = todas.find(x=>x.email?.toLowerCase()===email.toLowerCase());
      if(!c){ setErr("no encontramos tu cuenta"); setLoading(false); return; }
      const hist = c.historial ? Object.values(c.historial) : [];
      const data = { ...c, historial: hist };
      guardar("clienta", data); onLogin("clienta", data);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh", background:G.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:28 }}>
      <div style={{ textAlign:"center", marginBottom:44 }}>
        <div style={{ fontSize:44, marginBottom:10 }}>🌿</div>
        <h1 style={{ ...s.h1, fontSize:32, letterSpacing:2 }}>Lash Studio</h1>
        <p style={{ ...s.sub, marginTop:6 }}>by chulas</p>
        <div style={{ width:36, height:1, background:G.green, margin:"14px auto" }}/>
        <p style={{ ...s.sub, color:G.muted }}>san andrés · buenos aires</p>
      </div>

      {!modo ? (
        <div style={{ width:"100%", display:"flex", flexDirection:"column", gap:10 }}>
          <p style={{ ...s.sub, textAlign:"center", marginBottom:6 }}>acceder como</p>
          <div style={{ ...s.card, textAlign:"center", cursor:"pointer", border:`0.5px solid ${G.green}` }} onClick={()=>{ setModo("admin"); setEmail(ADMIN_EMAIL); }}>
            <div style={{ fontSize:26, marginBottom:6 }}>👑</div>
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:15, color:G.white, margin:"0 0 2px" }}>Lashista</p>
            <p style={{ ...s.sub }}>panel de male</p>
          </div>
          <div style={{ ...s.card, textAlign:"center", cursor:"pointer" }} onClick={()=>setModo("clienta")}>
            <div style={{ fontSize:26, marginBottom:6 }}>🌸</div>
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:15, color:G.white, margin:"0 0 2px" }}>Clienta</p>
            <p style={{ ...s.sub }}>mi espacio personal</p>
          </div>
        </div>
      ):(
        <div style={{ width:"100%", display:"flex", flexDirection:"column", gap:11 }}>
          <button onClick={()=>{ setModo(null); setErr(""); setEmail(""); setPass(""); }} style={{ ...s.btnGlass, alignSelf:"flex-start", marginBottom:6 }}>← volver</button>
          <span style={{ ...s.tag, alignSelf:"center" }}>{modo==="admin"?"panel lashista":"acceso clienta"}</span>
          <Field label="email">
            <input style={s.input} value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@email.com" type="email" autoComplete="username"/>
          </Field>
          <Field label="contraseña">
            <input style={s.input} value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••" type="password" autoComplete="current-password" onKeyDown={e=>e.key==="Enter"&&entrar()}/>
          </Field>
          <div style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }} onClick={()=>setRecordar(r=>!r)}>
            <div style={{ width:18,height:18,borderRadius:5,border:`1.5px solid ${recordar?G.green:G.border}`,background:recordar?G.greenM:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
              {recordar&&<span style={{ color:G.green, fontSize:12 }}>✓</span>}
            </div>
            <p style={{ ...s.sub, margin:0, fontSize:12, color:G.sub }}>mantener sesión iniciada</p>
          </div>
          {err&&<p style={{ color:G.red, fontSize:12, textAlign:"center", fontFamily:F.sans }}>{err}</p>}
          <button style={{ ...s.btnGreen, opacity:loading?0.6:1 }} onClick={entrar} disabled={loading}>
            {loading?"ingresando...":"ingresar →"}
          </button>
        </div>
      )}

      <div style={{ marginTop:36, display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
        <p style={{ ...s.sub, color:G.muted, fontSize:11 }}>
          consultas → <span style={{ color:G.green, cursor:"pointer" }} onClick={()=>openWA()}>whatsapp</span>
        </p>
        <p style={{ ...s.sub, color:G.muted, fontSize:11 }}>
          ¿primera vez? → <span style={{ color:G.green, cursor:"pointer" }} onClick={()=>openWA("Hola Male! Quiero registrarme en Lash Studio 🌿")}>registrate acá</span>
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK DE DATOS GLOBALES
// ═══════════════════════════════════════════════════════════════════════════════
function useData() {
  const [servicios, setServicios] = useState([]);
  const [clientas, setClientas] = useState([]);
  const [citas, setCitas] = useState([]);
  const [excepciones, setExcepciones] = useState([]);
  const [loading, setLoading] = useState(true);

  const recargar = useCallback(async () => {
    setLoading(true);
    const [sv, cl, ct, ex] = await Promise.all([db.get("servicios"), db.get("clientas"), db.get("citas"), db.get("excepciones")]);
    setServicios(sv); setClientas(cl); setCitas(ct); setExcepciones(ex);
    setLoading(false);
  }, []);

  useEffect(()=>{ recargar(); }, []);

  // ── Servicios ──────────────────────────────────────────────────────────────
  const crearServicio = async (data) => {
    const id = await db.push("servicios", data);
    setServicios(p=>[...p, { ...data, _id:id }]);
  };
  const editarServicio = async (id, data) => {
    await db.set(`servicios/${id}`, data);
    setServicios(p=>p.map(x=>x._id===id?{ ...data, _id:id }:x));
  };
  const borrarServicio = async (id) => {
    await db.delete(`servicios/${id}`);
    setServicios(p=>p.filter(x=>x._id!==id));
  };

  // ── Clientas ───────────────────────────────────────────────────────────────
  const crearClientas = async (datos) => {
    // 1. Crear usuario en Firebase Auth
    const pass = genPassword();
    const emailUsar = datos.email;
    const authRes = await auth.createUser(emailUsar, pass);
    if(authRes.error) return { error: authRes.error.message };
    // 2. Guardar en DB
    const id = await db.push("clientas", { ...datos, uid: authRes.localId, creadaEn: hoyISO() });
    const nueva = { ...datos, uid: authRes.localId, creadaEn: hoyISO(), _id: id, historial: [] };
    setClientas(p=>[...p, nueva]);
    return { ok: true, pass, email: emailUsar };
  };
  const editarClientas = async (id, datos) => {
    await db.update(`clientas/${id}`, datos);
    setClientas(p=>p.map(x=>x._id===id?{ ...x, ...datos }:x));
  };

  // ── Citas ──────────────────────────────────────────────────────────────────
  const crearCita = async (data) => {
    const id = await db.push("citas", { ...data, creadaEn: hoyISO() });
    setCitas(p=>[...p, { ...data, creadaEn: hoyISO(), _id: id }]);
    return id;
  };
  const editarCita = async (id, data) => {
    await db.update(`citas/${id}`, data);
    setCitas(p=>p.map(x=>x._id===id?{ ...x, ...data }:x));
  };
  const borrarCita = async (id) => {
    await db.delete(`citas/${id}`);
    setCitas(p=>p.filter(x=>x._id!==id));
  };

  // ── Historial (registrar pago al cerrar cita) ──────────────────────────────
  const registrarPago = async (clientaId, citaId, registro) => {
    await db.push(`clientas/${clientaId}/historial`, registro);
    await editarCita(citaId, { estado:"completada" });
    setClientas(p=>p.map(c=>{
      if(c._id!==clientaId) return c;
      const hist = Array.isArray(c.historial) ? c.historial : [];
      return { ...c, historial: [...hist, registro] };
    }));
  };

  return { servicios, clientas, citas, excepciones, loading, recargar, crearServicio, editarServicio, borrarServicio, crearClientas, editarClientas, crearCita, editarCita, borrarCita, registrarPago };
}

// ═══════════════════════════════════════════════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [session, setSession] = useState(null);
  const data = useData();

  const login = (tipo, d=null) => setSession({ tipo, data:d });
  const logout = () => { localStorage.removeItem("ls_session"); setSession(null); };

  if(!session) return <Login onLogin={login}/>;
  if(session.tipo==="admin") return <AdminApp data={data} onLogout={logout}/>;
  if(session.tipo==="clienta") return <ClientaApp clienta={session.data} data={data} onLogout={logout}/>;
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN APP
// ═══════════════════════════════════════════════════════════════════════════════
function AdminApp({ data, onLogout }) {
  const [tab, setTab] = useState("inicio");
  const [stack, setStack] = useState([]); // [{screen, props}]
  const [toast, setToast] = useState(null);

  const push = (screen, props={}) => setStack(p=>[...p, { screen, props }]);
  const pop = () => setStack(p=>p.slice(0,-1));
  const showToast = (msg) => setToast(msg);

  const cur = stack[stack.length-1];

  const navItems = [
    { id:"inicio", icon:"⬡", label:"inicio" },
    { id:"agenda", icon:"◷", label:"agenda" },
    { id:"clientas", icon:"✿", label:"clientas" },
    { id:"finanzas", icon:"◈", label:"finanzas" },
    { id:"config", icon:"⚙", label:"config" },
  ];

  const renderScreen = () => {
    if(cur) {
      const p = { ...cur.props, pop, push, data, toast: showToast };
      switch(cur.screen){
        case "clienta-detalle": return <ClientaDetalle {...p}/>;
        case "nueva-cita": return <NuevaCita {...p}/>;
        case "cita-detalle": return <CitaDetalle {...p}/>;
        default: return null;
      }
    }
    const p = { push, data, toast: showToast };
    switch(tab){
      case "inicio": return <AdminInicio {...p} setTab={setTab}/>;
      case "agenda": return <AdminAgenda {...p}/>;
      case "clientas": return <AdminClientas {...p}/>;
      case "finanzas": return <AdminFinanzas {...p}/>;
      case "config": return <AdminConfig {...p}/>;
      default: return <AdminInicio {...p} setTab={setTab}/>;
    }
  };

  if(data.loading) return <Loader/>;

  return (
    <div style={s.app}>
      <div style={s.screen}>{renderScreen()}</div>
      {!cur && (
        <nav style={s.nav}>
          {navItems.map(n=>(
            <div key={n.id} style={navItemStyle(tab===n.id)} onClick={()=>setTab(n.id)}>
              <span style={{ fontSize:19 }}>{n.icon}</span>
              <span style={{ fontFamily:F.sans, fontSize:9, letterSpacing:"0.08em" }}>{n.label}</span>
              {tab===n.id&&<div style={{ width:4,height:4,borderRadius:"50%",background:G.green }}/>}
            </div>
          ))}
        </nav>
      )}
      <FAB/>
      {toast&&<Toast msg={toast} onDone={()=>setToast(null)}/>}
    </div>
  );
}

// ─── ADMIN: INICIO ─────────────────────────────────────────────────────────────
function AdminInicio({ data, push, setTab }) {
  const hoy = hoyISO();
  const mesActual = hoy.slice(0,7);
  const citasHoy = data.citas.filter(c=>c.fecha===hoy && c.estado!=="completada");
  const proximas = data.citas.filter(c=>c.fecha>hoy && c.estado!=="completada").sort((a,b)=>(a.fecha+a.hora).localeCompare(b.fecha+b.hora)).slice(0,4);
  const totalMes = data.clientas.flatMap(c=>c.historial||[]).filter(h=>h.fecha?.startsWith(mesActual)).reduce((a,h)=>a+(h.monto||0),0);

  return (
    <div>
      <div style={s.topBar}>
        <h1 style={s.h1}>Lash Studio</h1>
        <p style={s.sub}>bienvenida, Male 🌿</p>
      </div>
      <div style={{ padding:"18px 18px 0" }}>
        {/* Stats */}
        <div style={{ display:"flex", gap:9, marginBottom:18 }}>
          {[
            { label:"hoy", val:citasHoy.length, action:()=>setTab("agenda") },
            { label:"este mes", val:totalMes>0?`${(totalMes/1000).toFixed(0)}k`:"$0", action:()=>setTab("finanzas") },
            { label:"clientas", val:data.clientas.length, action:()=>setTab("clientas") },
          ].map(w=>(
            <div key={w.label} onClick={w.action} style={{ ...s.card, flex:1, textAlign:"center", cursor:"pointer", margin:0, padding:"13px 8px" }}>
              <p style={{ fontFamily:F.sans, fontSize:9, color:G.muted, margin:"0 0 4px", textTransform:"lowercase", letterSpacing:"0.08em" }}>{w.label}</p>
              <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:21, color:G.white, margin:"0 0 2px" }}>{w.val}</p>
              <p style={{ fontFamily:F.sans, fontSize:9, color:G.green, margin:0 }}>ver →</p>
            </div>
          ))}
        </div>

        {/* Citas de hoy */}
        <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:17, color:G.white, margin:"0 0 3px" }}>hoy</p>
        <p style={{ ...s.sub, marginBottom:12 }}>{new Date().toLocaleDateString("es-AR",{ weekday:"long", day:"numeric", month:"long" })}</p>
        {citasHoy.length===0
          ? <p style={{ color:G.muted, fontSize:13, marginBottom:16 }}>sin citas para hoy ✦</p>
          : citasHoy.map(c=>(
            <div key={c._id} style={{ ...s.card, display:"flex", gap:12, alignItems:"center", cursor:"pointer" }} onClick={()=>push("cita-detalle",{cita:c})}>
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

        <div style={s.divider}/>

        {/* Próximas */}
        <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:17, color:G.white, margin:"0 0 3px" }}>próximas</p>
        <p style={{ ...s.sub, marginBottom:12 }}>turnos confirmados</p>
        {proximas.length===0
          ? <p style={{ color:G.muted, fontSize:13 }}>no hay citas agendadas ✦</p>
          : proximas.map(c=>(
            <div key={c._id} style={{ ...s.card, display:"flex", gap:12, alignItems:"center", cursor:"pointer" }} onClick={()=>push("cita-detalle",{cita:c})}>
              <div style={{ textAlign:"center", minWidth:40 }}>
                <p style={{ margin:0, fontFamily:F.sans, fontSize:10, color:G.muted }}>{c.fecha?.slice(5).replace("-","/")}</p>
                <p style={{ margin:0, fontFamily:F.serif, fontWeight:700, fontSize:14, color:G.green }}>{c.hora}</p>
              </div>
              <div style={{ flex:1 }}>
                <p style={{ margin:"0 0 2px", fontFamily:F.serif, fontSize:14 }}>{c.clientaNombre}</p>
                <p style={{ margin:0, ...s.sub, fontSize:11 }}>{c.servicio}</p>
              </div>
            </div>
          ))
        }
        <button style={{ ...s.btnGreen, marginTop:10 }} onClick={()=>setTab("agenda")}>ver agenda completa →</button>
      </div>
    </div>
  );
}

// ─── ADMIN: AGENDA ─────────────────────────────────────────────────────────────
function AdminAgenda({ data, push, toast }) {
  const hoy = hoyISO();
  const ahora = new Date();
  const [offset, setOffset] = useState(0);
  const [diaS, setDiaS] = useState(hoy);

  const mesD = new Date(ahora.getFullYear(), ahora.getMonth()+offset, 1);
  const anio = mesD.getFullYear();
  const mes = mesD.getMonth();
  const primerDia = new Date(anio,mes,1).getDay();
  const diasMes = new Date(anio,mes+1,0).getDate();

  const citasPorFecha = {};
  data.citas.forEach(c=>{ if(!citasPorFecha[c.fecha]) citasPorFecha[c.fecha]=[]; citasPorFecha[c.fecha].push(c); });

  // Excepciones: set de fechas bloqueadas
  const fechasBloqueadas = new Set(data.excepciones.map(e=>e.fecha));
  const excepcionDia = data.excepciones.find(e=>e.fecha===diaS);
  const diaEsBloqueado = fechasBloqueadas.has(diaS);

  const fmtKey = (d) => `${anio}-${String(mes+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  const citasDia = citasPorFecha[diaS]||[];

  // recordatorio mañana
  const dtManana = new Date(diaS+"T12:00:00"); dtManana.setDate(dtManana.getDate()+1);
  const mananaKey = dtManana.toISOString().slice(0,10);
  const citasManana = citasPorFecha[mananaKey]||[];

  return (
    <div>
      <div style={s.topBar}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div><h1 style={s.h1}>Agenda</h1><p style={s.sub}>calendario del estudio</p></div>
          <button style={{ ...s.btnGreen, width:"auto", padding:"9px 14px", fontSize:12 }} onClick={()=>push("nueva-cita")}>+ nueva cita</button>
        </div>
      </div>
      <div style={{ padding:"18px 14px 0" }}>
        {/* Calendario */}
        <div style={{ ...s.card, padding:"14px 10px", marginBottom:18 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
            <button style={{ ...s.btnGlass, padding:"6px 12px", fontSize:15 }} onClick={()=>setOffset(o=>o-1)}>‹</button>
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:15, color:G.white, margin:0, textTransform:"capitalize" }}>{MESES[mes]} {anio}</p>
            <button style={{ ...s.btnGlass, padding:"6px 12px", fontSize:15 }} onClick={()=>setOffset(o=>o+1)}>›</button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", marginBottom:4 }}>
            {DIAS_C.map(d=><div key={d} style={{ textAlign:"center", fontFamily:F.sans, fontSize:10, color:G.muted, padding:"2px 0" }}>{d}</div>)}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
            {Array(primerDia).fill(null).map((_,i)=><div key={"e"+i}/>)}
            {Array(diasMes).fill(null).map((_,i)=>{
              const dia=i+1, key=fmtKey(dia);
              const tieneCitas=!!(citasPorFecha[key]?.length);
              const esBloqueado=fechasBloqueadas.has(key);
              const esHoy=key===hoy, esSel=key===diaS;
              return (
                <div key={dia} onClick={()=>setDiaS(key)} style={{ textAlign:"center", borderRadius:8, padding:"5px 2px", cursor:"pointer", background:esSel?G.green:esHoy?G.greenM:esBloqueado?"rgba(224,112,112,0.1)":"transparent", border:esSel?"none":esHoy?`0.5px solid ${G.green}`:esBloqueado?`0.5px solid rgba(224,112,112,0.3)`:"0.5px solid transparent" }}>
                  <span style={{ fontFamily:F.sans, fontSize:12, color:esSel?"#0a0a0a":esHoy?G.greenL:esBloqueado?G.red:G.sub, fontWeight:esSel||esHoy?700:400, display:"block" }}>{dia}</span>
                  {tieneCitas&&<div style={{ display:"flex", justifyContent:"center", gap:2, marginTop:2 }}>
                    {Array(Math.min(citasPorFecha[key].length,3)).fill(null).map((_,pi)=>(
                      <div key={pi} style={{ width:3,height:3,borderRadius:"50%",background:esSel?"rgba(10,10,10,0.5)":G.green }}/>
                    ))}
                  </div>}
                  {esBloqueado&&!tieneCitas&&<div style={{ fontSize:7, color:G.red, lineHeight:1.2 }}>✕</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Día seleccionado */}
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
          <div style={{ width:5,height:5,borderRadius:"50%",background:G.green }}/>
          <p style={{ margin:0, fontFamily:F.serif, fontWeight:700, fontSize:16, color:G.white }}>
            {DIAS_F[new Date(diaS+"T12:00:00").getDay()]} {fmtFecha(diaS)}
          </p>
          {citasDia.length>0&&<span style={s.tag}>{citasDia.length} citas</span>}
        </div>

        {/* Banner día bloqueado */}
        {diaEsBloqueado&&(
          <div style={{ ...s.card, background:"rgba(224,112,112,0.08)", borderColor:G.red, marginBottom:14, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <p style={{ margin:"0 0 2px", fontFamily:F.sans, fontSize:11, color:G.red, letterSpacing:"0.06em" }}>día no laborable</p>
              <p style={{ margin:0, fontFamily:F.sans, fontSize:13, color:G.sub }}>{excepcionDia?.razon}</p>
            </div>
            <span style={{ fontSize:18 }}>🚫</span>
          </div>
        )}

        {/* Recordatorio masivo */}
        {citasManana.length>0&&(
          <div style={{ ...s.card, background:"rgba(143,189,90,0.06)", borderColor:G.greenD, marginBottom:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <p style={{ margin:"0 0 2px", fontFamily:F.sans, fontSize:10, color:G.greenL, letterSpacing:"0.08em" }}>recordatorio mañana</p>
                <p style={{ margin:0, fontFamily:F.serif, fontSize:13 }}>{citasManana.length} cita{citasManana.length>1?"s":""} para {mananaKey.slice(8,10)}/{mananaKey.slice(5,7)}</p>
              </div>
              <button style={{ ...s.btnGlass, fontSize:11, padding:"7px 12px", borderColor:G.green, color:G.greenL }}
                onClick={()=>citasManana.forEach(c=>openWA(`Hola ${c.clientaNombre?.split(" ")[0]}! 🌿 Te recuerdo que mañana tenés tu cita a las ${c.hora}. ¡Te espero! 💚`))}>
                avisar a todas →
              </button>
            </div>
          </div>
        )}

        {/* Slots */}
        <div>
        {diaEsBloqueado ? (
          <div style={{ ...s.card, textAlign:"center", padding:"24px", opacity:0.5 }}>
            <p style={{ fontFamily:F.sans, fontSize:13, color:G.muted, margin:0 }}>no hay turnos disponibles este día</p>
          </div>
        ) : SLOTS.map(hora=>{
          const cita = citasDia.find(c=>c.hora===hora);
          return (
            <div key={hora} style={{ display:"flex", alignItems:"center", gap:10, background:cita?G.card:"rgba(255,255,255,0.01)", border:`0.5px solid ${cita?G.border:"rgba(255,255,255,0.03)"}`, borderRadius:11, padding:"9px 12px", marginBottom:7, opacity:cita?1:0.55 }}>
              <div style={{ background:cita?G.greenM:"transparent", border:`0.5px solid ${cita?G.green:G.border}`, borderRadius:8, padding:"5px 8px", minWidth:46, textAlign:"center" }}>
                <p style={{ margin:0, fontFamily:F.serif, fontWeight:700, fontSize:13, color:cita?G.greenL:G.muted }}>{hora}</p>
              </div>
              {!cita
                ? <div style={{ flex:1, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <p style={{ margin:0, fontFamily:F.sans, fontSize:12, color:G.muted }}>disponible</p>
                    <button style={{ ...s.btnGlass, fontSize:10, padding:"4px 10px" }} onClick={()=>push("nueva-cita",{ fechaDefault:diaS, horaDefault:hora })}>+ agendar</button>
                  </div>
                : <>
                    <div style={{ flex:1 }}>
                      <p style={{ margin:"0 0 1px", fontFamily:F.serif, fontSize:13 }}>{cita.clientaNombre}</p>
                      <p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:G.muted }}>{cita.servicio}</p>
                    </div>
                    <div style={{ display:"flex", gap:6 }}>
                      <button style={{ background:"rgba(37,211,102,0.12)", border:"0.5px solid rgba(37,211,102,0.3)", borderRadius:8, width:30, height:30, cursor:"pointer", fontSize:13, display:"flex", alignItems:"center", justifyContent:"center" }}
                        onClick={()=>openWA(`Hola ${cita.clientaNombre?.split(" ")[0]}! 🌿 Te recuerdo que mañana tenés tu cita a las ${cita.hora}. ¡Te espero! 💚`)}>💬</button>
                      <button style={{ ...s.btnGlass, padding:"5px 9px", fontSize:11 }} onClick={()=>push("cita-detalle",{cita})}>→</button>
                    </div>
                  </>
              }
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}

// ─── NUEVA CITA ─────────────────────────────────────────────────────────────────
function NuevaCita({ data, pop, toast, fechaDefault="", horaDefault="" }) {
  const [form, setForm] = useState({ clientaId:"", fecha:fechaDefault, hora:horaDefault, servicio:"", notas:"" });
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const ocupadas = data.citas.filter(c=>c.fecha===form.fecha && c.estado!=="completada").map(c=>c.hora);

  const guardar = async () => {
    if(!form.clientaId||!form.fecha||!form.hora||!form.servicio){ toast("completá todos los campos"); return; }
    setSaving(true);
    const clienta = data.clientas.find(c=>c._id===form.clientaId);
    await data.crearCita({ ...form, clientaNombre: clienta?.nombre||"", estado:"confirmada" });
    toast("✓ cita agendada");
    pop();
  };

  return (
    <div>
      <div style={s.topBar}><Back onClick={pop} label="agenda"/><h1 style={s.h1}>Nueva Cita</h1></div>
      <div style={{ padding:"18px" }}>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <Field label="clienta">
            <select style={{ ...s.input, appearance:"none" }} value={form.clientaId} onChange={e=>set("clientaId",e.target.value)}>
              <option value="">seleccionar clienta...</option>
              {data.clientas.map(c=><option key={c._id} value={c._id}>{c.nombre}</option>)}
            </select>
          </Field>
          <Field label="servicio">
            <select style={{ ...s.input, appearance:"none" }} value={form.servicio} onChange={e=>set("servicio",e.target.value)}>
              <option value="">seleccionar servicio...</option>
              {data.servicios.map(sv=><option key={sv._id} value={sv.nombre}>{sv.nombre} · {fmtPesos(sv.precio)}</option>)}
            </select>
          </Field>
          <Field label="fecha">
            <input style={s.input} type="date" value={form.fecha} onChange={e=>set("fecha",e.target.value)}/>
          </Field>
          <Field label="hora">
            <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
              {SLOTS.map(h=>{
                const oc=ocupadas.includes(h);
                return <button key={h} disabled={oc} onClick={()=>set("hora",h)}
                  style={{ ...s.btnGlass, padding:"8px 12px", fontSize:12, opacity:oc?0.3:1,
                    background:form.hora===h?G.greenM:G.glass,
                    borderColor:form.hora===h?G.green:G.border,
                    color:form.hora===h?G.greenL:G.sub,
                    cursor:oc?"not-allowed":"pointer" }}>
                  {h}{oc?" ✕":""}
                </button>;
              })}
            </div>
          </Field>
          <Field label="notas (opcional)">
            <textarea style={{ ...s.input, height:70, resize:"none" }} value={form.notas} onChange={e=>set("notas",e.target.value)} placeholder="indicaciones especiales..."/>
          </Field>
          <button style={{ ...s.btnGreen, opacity:saving?0.6:1 }} onClick={guardar} disabled={saving}>{saving?"guardando...":"confirmar cita →"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── DETALLE DE CITA ───────────────────────────────────────────────────────────
function CitaDetalle({ data, pop, toast, cita:citaInit }) {
  const [cita, setCita] = useState(citaInit);
  const [modalPago, setModalPago] = useState(false);
  const [pago, setPago] = useState({ metodo:"efectivo", monto:"" });
  const [modalBorrar, setModalBorrar] = useState(false);

  const servicio = data.servicios.find(s=>s.nombre===cita.servicio);
  const clienta = data.clientas.find(c=>c._id===cita.clientaId);

  const completar = async () => {
    if(!pago.monto){ toast("ingresá el monto"); return; }
    await data.registrarPago(cita.clientaId, cita._id, { fecha:cita.fecha, servicio:cita.servicio, curva:clienta?.curva||"", monto:Number(pago.monto), pago:pago.metodo, notas:cita.notas||"" });
    toast("✓ cita completada y pago registrado");
    setModalPago(false);
    setCita(p=>({...p, estado:"completada"}));
  };

  const borrar = async () => {
    await data.borrarCita(cita._id);
    toast("cita eliminada");
    pop();
  };

  return (
    <div>
      <div style={s.topBar}><Back onClick={pop}/><h1 style={s.h1}>Detalle de Cita</h1><p style={s.sub}>{cita.fecha} · {cita.hora}</p></div>
      <div style={{ padding:"18px" }}>
        {/* Clienta */}
        {clienta&&(
          <div style={{ ...s.card, display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
            <Avatar nombre={clienta.nombre} size={46}/>
            <div>
              <p style={{ margin:"0 0 2px", fontFamily:F.serif, fontWeight:700, fontSize:15 }}>{clienta.nombre}</p>
              <p style={{ margin:0, ...s.sub, fontSize:11 }}>curva {clienta.curva} · {clienta.largo}</p>
              {clienta.alergias&&clienta.alergias!=="Ninguna"&&<p style={{ margin:"3px 0 0", color:G.red, fontSize:10 }}>⚠ {clienta.alergias}</p>}
            </div>
          </div>
        )}

        {/* Servicio */}
        <div style={{ ...s.card, marginBottom:12 }}>
          <p style={{ fontFamily:F.sans, fontSize:10, color:G.muted, margin:"0 0 6px", textTransform:"lowercase", letterSpacing:"0.08em" }}>servicio</p>
          <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:17, color:G.white, margin:"0 0 6px" }}>{cita.servicio}</p>
          {servicio&&<p style={{ margin:"0 0 10px", fontFamily:F.sans, fontSize:12, color:G.sub }}>{servicio.descripcion}</p>}
          <div style={{ display:"flex", gap:8 }}>
            <div style={{ flex:1, background:"rgba(255,255,255,0.04)", borderRadius:10, padding:"10px" }}>
              <p style={{ fontFamily:F.sans, fontSize:9, color:G.muted, margin:"0 0 3px", textTransform:"lowercase" }}>duración</p>
              <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:17, margin:0 }}>{servicio?.duracion||"—"}min</p>
            </div>
            <div style={{ flex:1, background:"rgba(255,255,255,0.04)", borderRadius:10, padding:"10px" }}>
              <p style={{ fontFamily:F.sans, fontSize:9, color:G.muted, margin:"0 0 3px", textTransform:"lowercase" }}>precio</p>
              <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:17, color:G.green, margin:0 }}>{fmtPesos(servicio?.precio)}</p>
            </div>
          </div>
        </div>

        {cita.notas&&<div style={{ ...s.card, background:"rgba(143,189,90,0.05)", borderColor:G.greenD, marginBottom:12 }}>
          <p style={{ fontFamily:F.sans, fontSize:10, color:G.muted, margin:"0 0 4px" }}>notas</p>
          <p style={{ margin:0, fontFamily:F.sans, fontSize:13, color:G.sub }}>{cita.notas}</p>
        </div>}

        <span style={{ ...s.tag, marginBottom:16, display:"inline-block" }}>{cita.estado}</span>

        {/* Acciones */}
        {cita.estado!=="completada"&&(
          <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
            <button style={s.btnGreen} onClick={()=>setModalPago(true)}>✓ marcar como completada</button>
            <button style={{ ...s.btnGlass, width:"100%" }} onClick={()=>openWA(`Hola ${cita.clientaNombre?.split(" ")[0]}! 🌿 Te recuerdo tu cita el ${cita.fecha} a las ${cita.hora}. ¡Te espero! 💚`)}>💬 recordatorio WA</button>
            <button style={{ ...s.btnRed, width:"100%" }} onClick={()=>setModalBorrar(true)}>eliminar cita</button>
          </div>
        )}
        {cita.estado==="completada"&&<p style={{ color:G.green, fontFamily:F.sans, fontSize:13, textAlign:"center" }}>✓ cita completada y pago registrado</p>}
      </div>

      {/* Modal pago */}
      {modalPago&&(
        <Sheet titulo="Registrar pago" onClose={()=>setModalPago(false)}>
          <Field label="método de pago">
            <div style={{ display:"flex", gap:8 }}>
              {["efectivo","transferencia"].map(m=>(
                <button key={m} onClick={()=>setPago(p=>({...p,metodo:m}))} style={{ ...s.btnGlass, flex:1, background:pago.metodo===m?G.greenM:G.glass, borderColor:pago.metodo===m?G.green:G.border, color:pago.metodo===m?G.greenL:G.sub }}>{m}</button>
              ))}
            </div>
          </Field>
          <Field label="monto cobrado">
            <input style={s.input} type="number" value={pago.monto} onChange={e=>setPago(p=>({...p,monto:e.target.value}))} placeholder={fmtPesos(servicio?.precio)}/>
          </Field>
          <button style={s.btnGreen} onClick={completar}>guardar y cerrar cita →</button>
        </Sheet>
      )}

      {modalBorrar&&<Modal titulo="Eliminar cita" msg={`¿Segura que querés eliminar la cita de ${cita.clientaNombre}?`} onOk={borrar} onCancel={()=>setModalBorrar(false)} okLabel="eliminar" danger/>}
    </div>
  );
}

// ─── ADMIN: CLIENTAS ───────────────────────────────────────────────────────────
function AdminClientas({ data, push, toast }) {
  const [search, setSearch] = useState("");
  const [sheet, setSheet] = useState(false);
  const [form, setForm] = useState({ nombre:"", email:"", telefono:"", curva:"C", grosor:"0.07", largo:"11mm", alergias:"Ninguna", observaciones:"" });
  const [saving, setSaving] = useState(false);
  const [credenciales, setCredenciales] = useState(null);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const filtradas = data.clientas.filter(c=>c.nombre?.toLowerCase().includes(search.toLowerCase()));

  const guardar = async () => {
    if(!form.nombre||!form.email){ toast("nombre y email son obligatorios"); return; }
    setSaving(true);
    const res = await data.crearClientas(form);
    setSaving(false);
    if(res.error){ toast("error: "+res.error); return; }
    setSheet(false);
    setCredenciales({ email: res.email, pass: res.pass, nombre: form.nombre });
    setForm({ nombre:"", email:"", telefono:"", curva:"C", grosor:"0.07", largo:"11mm", alergias:"Ninguna", observaciones:"" });
  };

  return (
    <div>
      <div style={s.topBar}><h1 style={s.h1}>Clientas</h1><p style={s.sub}>{data.clientas.length} registradas</p></div>
      <div style={{ padding:"18px" }}>
        <div style={{ display:"flex", gap:9, marginBottom:14 }}>
          <input style={{ ...s.input, flex:1, margin:0 }} placeholder="🔍 buscar..." value={search} onChange={e=>setSearch(e.target.value)}/>
          <button style={{ ...s.btnGreen, width:"auto", padding:"9px 14px", fontSize:12 }} onClick={()=>setSheet(true)}>+ nueva</button>
        </div>
        {filtradas.length===0&&<p style={{ color:G.muted, fontSize:13 }}>sin clientas aún ✦</p>}
        {filtradas.map(c=>(<div key={c._id} style={{ ...s.card, display:"flex", alignItems:"center", gap:11, cursor:"pointer" }} onClick={()=>push("clienta-detalle",{clienta:c})}>
          <Avatar nombre={c.nombre}/>
          <div style={{ flex:1 }}>
            <p style={{ margin:"0 0 2px", fontFamily:F.serif, fontSize:14 }}>{c.nombre}</p>
            <p style={{ margin:0, ...s.sub, fontSize:11 }}>curva {c.curva} · {c.grosor}mm · {c.largo}</p>
            {c.alergias&&c.alergias!=="Ninguna"&&<p style={{ margin:"3px 0 0", color:G.red, fontSize:10 }}>⚠ {c.alergias}</p>}
          </div>
          <span style={{ fontSize:15, color:G.muted }}>→</span>
        </div>))}
      </div>

      {/* Sheet nueva clienta */}
      {sheet&&(
        <Sheet titulo="Nueva Clienta" onClose={()=>setSheet(false)}>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <Field label="nombre y apellido *"><input style={s.input} value={form.nombre} onChange={e=>set("nombre",e.target.value)} placeholder="Nombre Apellido"/></Field>
            <Field label="email * (será su usuario de acceso)"><input style={s.input} type="email" value={form.email} onChange={e=>set("email",e.target.value)} placeholder="vale@gmail.com"/></Field>
            <Field label="teléfono"><input style={s.input} type="tel" value={form.telefono} onChange={e=>set("telefono",e.target.value)} placeholder="11 XXXX-XXXX"/></Field>
            <div style={s.divider}/>
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:15, color:G.white, margin:"0 0 10px" }}>Ficha técnica</p>
            <Field label="curva habitual"><ChipSelector options={CURVAS} value={form.curva} onChange={v=>set("curva",v)}/></Field>
            <Field label="grosor"><ChipSelector options={GROSOR} value={form.grosor} onChange={v=>set("grosor",v)}/></Field>
            <Field label="largo"><ChipSelector options={LARGO} value={form.largo} onChange={v=>set("largo",v)}/></Field>
            <div style={s.divider}/>
            <Field label="alergias / condiciones"><input style={s.input} value={form.alergias} onChange={e=>set("alergias",e.target.value)} placeholder="Ninguna"/></Field>
            <Field label="observaciones"><textarea style={{ ...s.input, height:60, resize:"none" }} value={form.observaciones} onChange={e=>set("observaciones",e.target.value)} placeholder="preferencias, notas..."/></Field>
            <button style={{ ...s.btnGreen, opacity:saving?0.6:1 }} onClick={guardar} disabled={saving}>{saving?"creando cuenta...":"crear clienta →"}</button>
            <p style={{ fontFamily:F.sans, fontSize:11, color:G.muted, textAlign:"center" }}>Se creará un usuario automáticamente con una contraseña generada</p>
          </div>
        </Sheet>
      )}

      {/* Sheet credenciales generadas */}
      {credenciales&&(
        <Sheet titulo="✓ Clienta creada" onClose={()=>setCredenciales(null)}>
          <div style={{ ...s.card, background:"rgba(143,189,90,0.06)", borderColor:G.greenD, marginBottom:14 }}>
            <p style={{ fontFamily:F.sans, fontSize:12, color:G.muted, margin:"0 0 4px" }}>enviá estas credenciales a {credenciales.nombre}:</p>
            <p style={{ fontFamily:F.sans, fontSize:13, color:G.sub, margin:"0 0 3px" }}>📧 <b style={{ color:G.white }}>{credenciales.email}</b></p>
            <p style={{ fontFamily:F.sans, fontSize:13, color:G.sub, margin:0 }}>🔑 contraseña: <b style={{ color:G.white }}>{credenciales.pass}</b></p>
          </div>
          <button style={s.btnGreen} onClick={()=>{ openWA(`Hola ${credenciales.nombre?.split(" ")[0]}! 🌿 Te creé tu acceso a Lash Studio:\n\n📧 Email: ${credenciales.email}\n🔑 Contraseña: ${credenciales.pass}\n\nEntrá desde: https://lash-studio-gilt.vercel.app`); setCredenciales(null); }}>
            💬 enviar por WhatsApp →
          </button>
        </Sheet>
      )}
    </div>
  );
}

// ─── DETALLE CLIENTA (ADMIN) ───────────────────────────────────────────────────
function ClientaDetalle({ clienta:cInit, data, pop, push, toast }) {
  const [clienta, setClienta] = useState(cInit);
  const [tab, setTab] = useState("info");
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({ nombre:cInit.nombre, telefono:cInit.telefono||"", curva:cInit.curva||"C", grosor:cInit.grosor||"0.07", largo:cInit.largo||"11mm", alergias:cInit.alergias||"Ninguna", observaciones:cInit.observaciones||"" });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const hist = Array.isArray(clienta.historial) ? clienta.historial : (clienta.historial ? Object.values(clienta.historial) : []);
  const citasClientas = data.citas.filter(c=>c.clientaId===clienta._id && c.estado!=="completada").sort((a,b)=>a.fecha.localeCompare(b.fecha));

  const guardar = async () => {
    await data.editarClientas(clienta._id, form);
    setClienta(p=>({...p,...form})); setEditando(false); toast("✓ cambios guardados");
  };

  return (
    <div>
      <div style={s.topBar}>
        <Back onClick={pop} label="clientas"/>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <Avatar nombre={clienta.nombre} size={42}/>
          <div><h1 style={{ ...s.h1, fontSize:18 }}>{clienta.nombre}</h1><p style={s.sub}>{hist.length} visitas registradas</p></div>
        </div>
      </div>
      <div style={{ padding:"18px" }}>
        <div style={{ display:"flex", gap:7, marginBottom:16 }}>
          {["info","ficha","historial","citas"].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{ ...s.btnGlass, flex:1, fontSize:10, padding:"7px 4px", background:tab===t?G.greenM:G.glass, borderColor:tab===t?G.green:G.border, color:tab===t?G.greenL:G.sub }}>{t}</button>
          ))}
        </div>

        {tab==="info"&&(
          <div>
            <div style={{ display:"flex", gap:9, marginBottom:14 }}>
              <button style={{ ...s.btnGreen, flex:1 }} onClick={()=>openWA(`Hola ${clienta.nombre?.split(" ")[0]}! 🌿`)}>💬 WhatsApp</button>
              <button style={{ ...s.btnGlass, flex:1 }} onClick={()=>setEditando(e=>!e)}>{editando?"cancelar":"✎ editar"}</button>
            </div>
            <div style={{ ...s.card, display:"flex", flexDirection:"column", gap:11 }}>
              {editando
                ? <>
                    <Field label="nombre"><input style={s.input} value={form.nombre} onChange={e=>set("nombre",e.target.value)}/></Field>
                    <Field label="teléfono"><input style={s.input} value={form.telefono} onChange={e=>set("telefono",e.target.value)}/></Field>
                    <button style={s.btnGreen} onClick={guardar}>guardar →</button>
                  </>
                : [["teléfono",clienta.telefono||"—"],["email",clienta.email||"—"],["clienta desde",fmtFecha(clienta.creadaEn)]].map(([k,v])=>(
                    <div key={k} style={{ display:"flex", justifyContent:"space-between" }}>
                      <span style={{ ...s.label, margin:0 }}>{k}</span>
                      <span style={{ fontFamily:F.sans, fontSize:13, color:G.sub }}>{v}</span>
                    </div>
                  ))
              }
            </div>
          </div>
        )}

        {tab==="ficha"&&(
          <div>
            <div style={{ ...s.card }}>
              <Field label="curva"><ChipSelector options={CURVAS} value={form.curva} onChange={v=>{ set("curva",v); data.editarClientas(clienta._id,{curva:v}); }}/></Field>
              <Field label="grosor"><ChipSelector options={GROSOR} value={form.grosor} onChange={v=>{ set("grosor",v); data.editarClientas(clienta._id,{grosor:v}); }}/></Field>
              <Field label="largo"><ChipSelector options={LARGO} value={form.largo} onChange={v=>{ set("largo",v); data.editarClientas(clienta._id,{largo:v}); }}/></Field>
            </div>
            <div style={{ ...s.card }}>
              <Field label="alergias / condiciones">
                <input style={s.input} value={form.alergias} onChange={e=>set("alergias",e.target.value)} onBlur={()=>data.editarClientas(clienta._id,{alergias:form.alergias})}/>
              </Field>
              <Field label="observaciones">
                <textarea style={{ ...s.input, height:60, resize:"none" }} value={form.observaciones} onChange={e=>set("observaciones",e.target.value)} onBlur={()=>data.editarClientas(clienta._id,{observaciones:form.observaciones})}/>
              </Field>
            </div>
          </div>
        )}

        {tab==="historial"&&(
          <div>
            {hist.length===0&&<p style={{ color:G.muted, fontSize:13 }}>sin historial aún ✦</p>}
            {[...hist].reverse().map((h,i)=>(
              <div key={i} style={s.card}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <div>
                    <p style={{ margin:"0 0 2px", fontFamily:F.serif, fontSize:14 }}>{h.servicio}</p>
                    <p style={{ margin:0, ...s.sub, fontSize:11 }}>{fmtFecha(h.fecha)} · curva {h.curva}</p>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <p style={{ margin:"0 0 2px", fontFamily:F.serif, fontWeight:700, color:G.green, fontSize:14 }}>{fmtPesos(h.monto)}</p>
                    <span style={s.tag}>{h.pago}</span>
                  </div>
                </div>
                {h.notas&&<p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:G.muted }}>{h.notas}</p>}
              </div>
            ))}
          </div>
        )}

        {tab==="citas"&&(
          <div>
            <button style={{ ...s.btnGreen, marginBottom:14 }} onClick={()=>push("nueva-cita",{clientaIdDefault:clienta._id})}>+ nueva cita para {clienta.nombre?.split(" ")[0]}</button>
            {citasClientas.length===0&&<p style={{ color:G.muted, fontSize:13 }}>sin citas próximas ✦</p>}
            {citasClientas.map(c=>(
              <div key={c._id} style={{ ...s.card, display:"flex", gap:12, alignItems:"center", cursor:"pointer" }} onClick={()=>push("cita-detalle",{cita:c})}>
                <div style={{ background:G.greenM, border:`0.5px solid ${G.green}`, borderRadius:9, padding:"7px 10px", textAlign:"center" }}>
                  <p style={{ margin:0, fontFamily:F.sans, fontSize:10, color:G.muted }}>{c.fecha?.slice(5).replace("-","/")}</p>
                  <p style={{ margin:0, fontFamily:F.serif, fontWeight:700, fontSize:14, color:G.greenL }}>{c.hora}</p>
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ margin:"0 0 2px", fontFamily:F.serif, fontSize:14 }}>{c.servicio}</p>
                  <span style={s.tag}>{c.estado}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ADMIN: FINANZAS ───────────────────────────────────────────────────────────
function AdminFinanzas({ data }) {
  const [periodo, setPeriodo] = useState("mes");
  const hoy = hoyISO();
  const mes = hoy.slice(0,7);
  const anio = hoy.slice(0,4);

  const todoElHistorial = data.clientas.flatMap(c=> Array.isArray(c.historial)?c.historial:(c.historial?Object.values(c.historial):[]));

  const filtrar = (h) => {
    if(periodo==="mes") return h.fecha?.startsWith(mes);
    if(periodo==="año") return h.fecha?.startsWith(anio);
    return true;
  };

  const ingresos = todoElHistorial.filter(filtrar);
  const total = ingresos.reduce((a,h)=>a+(h.monto||0),0);
  const transf = ingresos.filter(h=>h.pago==="transferencia").reduce((a,h)=>a+(h.monto||0),0);
  const efect = ingresos.filter(h=>h.pago==="efectivo").reduce((a,h)=>a+(h.monto||0),0);
  const denom = transf+efect||1;

  const porServicio = {};
  ingresos.forEach(h=>{ porServicio[h.servicio]=(porServicio[h.servicio]||0)+(h.monto||0); });
  const maxSv = Math.max(...Object.values(porServicio),1);

  const topClientas = data.clientas.map(c=>{
    const hist = Array.isArray(c.historial)?c.historial:(c.historial?Object.values(c.historial):[]);
    return { ...c, total: hist.filter(filtrar).reduce((a,h)=>a+(h.monto||0),0), visitas: hist.filter(filtrar).length };
  }).filter(c=>c.total>0).sort((a,b)=>b.total-a.total);

  return (
    <div>
      <div style={s.topBar}><h1 style={s.h1}>Finanzas</h1><p style={s.sub}>resumen de ingresos</p></div>
      <div style={{ padding:"18px" }}>
        <div style={{ display:"flex", gap:8, marginBottom:18 }}>
          {["mes","año","todo"].map(p=>(
            <button key={p} onClick={()=>setPeriodo(p)} style={{ ...s.btnGlass, flex:1, fontSize:11, background:periodo===p?G.greenM:G.glass, borderColor:periodo===p?G.green:G.border, color:periodo===p?G.greenL:G.sub }}>{p}</button>
          ))}
        </div>

        {/* Total */}
        <div style={{ ...s.card, textAlign:"center", padding:"22px 16px", marginBottom:12 }}>
          <p style={{ fontFamily:F.sans, fontSize:10, color:G.muted, margin:"0 0 6px", textTransform:"lowercase", letterSpacing:"0.08em" }}>total · {periodo==="mes"?new Date().toLocaleDateString("es-AR",{month:"long",year:"numeric"}):periodo==="año"?anio:"histórico"}</p>
          <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:36, color:G.green, margin:"0 0 4px" }}>{fmtPesos(total)}</p>
          <p style={{ fontFamily:F.sans, fontSize:12, color:G.sub, margin:0 }}>{ingresos.length} servicios</p>
        </div>

        {/* Efectivo vs Transferencia */}
        {total>0&&(
          <div style={{ display:"flex", gap:9, marginBottom:14 }}>
            <div style={{ ...s.card, flex:1, margin:0 }}>
              <p style={{ fontFamily:F.sans, fontSize:9, color:G.muted, margin:"0 0 3px", textTransform:"lowercase" }}>transferencia</p>
              <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:18, color:G.green, margin:"0 0 2px" }}>{fmtPesos(transf)}</p>
              <p style={{ fontFamily:F.sans, fontSize:10, color:G.muted, margin:0 }}>{Math.round(transf/denom*100)}%</p>
            </div>
            <div style={{ ...s.card, flex:1, margin:0 }}>
              <p style={{ fontFamily:F.sans, fontSize:9, color:G.muted, margin:"0 0 3px", textTransform:"lowercase" }}>efectivo</p>
              <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:18, margin:"0 0 2px" }}>{fmtPesos(efect)}</p>
              <p style={{ fontFamily:F.sans, fontSize:10, color:G.muted, margin:0 }}>{Math.round(efect/denom*100)}%</p>
            </div>
          </div>
        )}

        <div style={s.divider}/>

        {/* Por servicio */}
        <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:16, color:G.white, margin:"0 0 3px" }}>por servicio</p>
        <p style={{ ...s.sub, marginBottom:12 }}>ingresos del período</p>
        {Object.entries(porServicio).length===0&&<p style={{ color:G.muted, fontSize:13 }}>sin registros en este período ✦</p>}
        {Object.entries(porServicio).sort((a,b)=>b[1]-a[1]).map(([nom,tot])=>(
          <div key={nom} style={{ ...s.card, padding:"11px 13px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
              <p style={{ margin:0, fontFamily:F.sans, fontSize:13 }}>{nom}</p>
              <p style={{ margin:0, fontFamily:F.serif, fontWeight:700, fontSize:13, color:G.green }}>{fmtPesos(tot)}</p>
            </div>
            <div style={{ height:3, background:G.border, borderRadius:2 }}>
              <div style={{ height:"100%", width:`${(tot/maxSv)*100}%`, background:G.green, borderRadius:2 }}/>
            </div>
          </div>
        ))}

        <div style={s.divider}/>

        {/* Top clientas */}
        <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:16, color:G.white, margin:"0 0 3px" }}>top clientas</p>
        <p style={{ ...s.sub, marginBottom:12 }}>por gasto en el período</p>
        {topClientas.length===0&&<p style={{ color:G.muted, fontSize:13 }}>sin datos ✦</p>}
        {topClientas.map((c,i)=>(
          <div key={c._id} style={{ ...s.card, display:"flex", alignItems:"center", gap:11 }}>
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:19, color:i===0?G.green:G.muted, minWidth:22, margin:0 }}>{i+1}</p>
            <Avatar nombre={c.nombre} size={34}/>
            <div style={{ flex:1 }}>
              <p style={{ margin:"0 0 2px", fontFamily:F.serif, fontSize:13 }}>{c.nombre}</p>
              <p style={{ margin:0, ...s.sub, fontSize:10 }}>{c.visitas} visitas</p>
            </div>
            <p style={{ margin:0, fontFamily:F.serif, fontWeight:700, color:G.green, fontSize:14 }}>{fmtPesos(c.total)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── HORARIOS CONFIG ──────────────────────────────────────────────────────────
function HorariosConfig({ toast }) {
  const [excepciones, setExcepciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [nuevaRazon, setNuevaRazon] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [confirmarBorrar, setConfirmarBorrar] = useState(null);

  useEffect(()=>{
    db.get("excepciones").then(data=>{ setExcepciones(data.sort((a,b)=>a.fecha?.localeCompare(b.fecha))); setLoading(false); });
  },[]);

  const agregar = async () => {
    if(!nuevaFecha){ toast("elegí una fecha"); return; }
    if(excepciones.find(e=>e.fecha===nuevaFecha)){ toast("esa fecha ya está marcada"); return; }
    setGuardando(true);
    const id = await db.push("excepciones", { fecha: nuevaFecha, razon: nuevaRazon||"día no laborable" });
    const nueva = { fecha: nuevaFecha, razon: nuevaRazon||"día no laborable", _id: id };
    setExcepciones(p=>[...p, nueva].sort((a,b)=>a.fecha.localeCompare(b.fecha)));
    setNuevaFecha(""); setNuevaRazon("");
    setGuardando(false); toast("✓ excepción guardada");
  };

  const borrar = async (id) => {
    await db.delete(`excepciones/${id}`);
    setExcepciones(p=>p.filter(e=>e._id!==id));
    setConfirmarBorrar(null); toast("excepción eliminada");
  };

  const hoy = hoyISO();
  const futuras = excepciones.filter(e=>e.fecha>=hoy);
  const pasadas = excepciones.filter(e=>e.fecha<hoy);

  return (
    <div>
      {/* Agregar excepción */}
      <div style={{ ...s.card, background:"rgba(143,189,90,0.04)", borderColor:G.greenD, marginBottom:16 }}>
        <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:15, color:G.white, margin:"0 0 12px" }}>marcar día no laborable</p>
        <Field label="fecha">
          <input style={s.input} type="date" value={nuevaFecha} min={hoy} onChange={e=>setNuevaFecha(e.target.value)}/>
        </Field>
        <Field label="razón (opcional)">
          <input style={s.input} value={nuevaRazon} onChange={e=>setNuevaRazon(e.target.value)} placeholder="ej: vacaciones, feriado, evento personal..."/>
        </Field>
        <button style={{ ...s.btnGreen, opacity:guardando?0.6:1 }} onClick={agregar} disabled={guardando}>
          {guardando?"guardando...":"agregar excepción →"}
        </button>
      </div>

      {loading && <p style={{ color:G.muted, fontSize:13 }}>cargando...</p>}

      {/* Próximas excepciones */}
      {futuras.length>0&&(
        <>
          <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:15, color:G.white, margin:"0 0 10px" }}>días bloqueados próximos</p>
          {futuras.map(e=>{
            const dt = new Date(e.fecha+"T12:00:00");
            const diasFaltan = Math.ceil((dt-new Date())/(1000*60*60*24));
            return (
              <div key={e._id} style={{ ...s.card, display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ background:G.greenM, border:`0.5px solid ${G.green}`, borderRadius:9, padding:"7px 10px", textAlign:"center", minWidth:50 }}>
                  <p style={{ margin:0, fontFamily:F.sans, fontSize:10, color:G.muted }}>{e.fecha?.slice(5).replace("-","/")} </p>
                  <p style={{ margin:0, fontFamily:F.serif, fontWeight:700, fontSize:13, color:G.greenL }}>{DIAS_F[dt.getDay()].slice(0,3)}</p>
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ margin:"0 0 2px", fontFamily:F.sans, fontSize:13 }}>{e.razon}</p>
                  <p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:G.muted }}>
                    {diasFaltan===0?"hoy":diasFaltan===1?"mañana":`en ${diasFaltan} días`}
                  </p>
                </div>
                <button style={{ ...s.btnRed, padding:"6px 10px", fontSize:12 }} onClick={()=>setConfirmarBorrar(e)}>✕</button>
              </div>
            );
          })}
        </>
      )}

      {futuras.length===0&&!loading&&(
        <p style={{ color:G.muted, fontSize:13, marginBottom:16 }}>no hay días bloqueados próximos ✦</p>
      )}

      {/* Pasadas (colapsadas) */}
      {pasadas.length>0&&(
        <details style={{ marginTop:8 }}>
          <summary style={{ fontFamily:F.sans, fontSize:12, color:G.muted, cursor:"pointer", padding:"8px 0", letterSpacing:"0.04em" }}>
            ver excepciones pasadas ({pasadas.length})
          </summary>
          <div style={{ marginTop:10 }}>
            {pasadas.reverse().map(e=>(
              <div key={e._id} style={{ ...s.card, display:"flex", alignItems:"center", gap:12, opacity:0.5 }}>
                <p style={{ margin:0, fontFamily:F.sans, fontSize:12, color:G.muted, flex:1 }}>{fmtFecha(e.fecha)} — {e.razon}</p>
              </div>
            ))}
          </div>
        </details>
      )}

      {confirmarBorrar&&<Modal titulo="Eliminar excepción" msg={`¿Eliminar el bloqueo del ${fmtFecha(confirmarBorrar.fecha)}?`} onOk={()=>borrar(confirmarBorrar._id)} onCancel={()=>setConfirmarBorrar(null)} okLabel="eliminar" danger/>}
    </div>
  );
}

// ─── ADMIN: CONFIG ─────────────────────────────────────────────────────────────
function AdminConfig({ data, toast }) {
  const [tab, setTab] = useState("servicios");
  const [sheetSv, setSheetSv] = useState(false);
  const [editSv, setEditSv] = useState(null); // null = nuevo
  const [formSv, setFormSv] = useState({ nombre:"", precio:"", duracion:"", descripcion:"" });
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const setSv = (k,v) => setFormSv(f=>({...f,[k]:v}));

  const abrirNuevo = () => { setEditSv(null); setFormSv({ nombre:"", precio:"", duracion:"", descripcion:"" }); setSheetSv(true); };
  const abrirEditar = (sv) => { setEditSv(sv); setFormSv({ nombre:sv.nombre, precio:String(sv.precio), duracion:String(sv.duracion), descripcion:sv.descripcion||"" }); setSheetSv(true); };

  const guardarSv = async () => {
    if(!formSv.nombre||!formSv.precio){ toast("nombre y precio son obligatorios"); return; }
    setSaving(true);
    const payload = { nombre:formSv.nombre, precio:Number(formSv.precio), duracion:Number(formSv.duracion)||60, descripcion:formSv.descripcion };
    if(editSv) await data.editarServicio(editSv._id, payload);
    else await data.crearServicio(payload);
    setSaving(false); setSheetSv(false);
    toast(editSv?"✓ servicio actualizado":"✓ servicio creado");
  };

  const borrarSv = async (id) => {
    await data.borrarServicio(id);
    setConfirm(null); toast("servicio eliminado");
  };

  return (
    <div>
      <div style={s.topBar}><h1 style={s.h1}>Configuración</h1><p style={s.sub}>parámetros del estudio</p></div>
      <div style={{ padding:"18px" }}>
        <div style={{ display:"flex", gap:7, marginBottom:18 }}>
          {["servicios","horarios","estudio"].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{ ...s.btnGlass, flex:1, fontSize:11, background:tab===t?G.greenM:G.glass, borderColor:tab===t?G.green:G.border, color:tab===t?G.greenL:G.sub }}>{t}</button>
          ))}
        </div>

        {tab==="servicios"&&(
          <div>
            <button style={{ ...s.btnGreen, marginBottom:14 }} onClick={abrirNuevo}>+ agregar servicio</button>
            {data.servicios.length===0&&<p style={{ color:G.muted, fontSize:13 }}>no hay servicios cargados aún ✦</p>}
            {data.servicios.map(sv=>(
              <div key={sv._id} style={{ ...s.card }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div style={{ flex:1 }}>
                    <p style={{ margin:"0 0 3px", fontFamily:F.serif, fontWeight:700, fontSize:15 }}>{sv.nombre}</p>
                    {sv.descripcion&&<p style={{ margin:"0 0 7px", fontFamily:F.sans, fontSize:12, color:G.sub }}>{sv.descripcion}</p>}
                    <div style={{ display:"flex", gap:7 }}>
                      <span style={s.tag}>{sv.duracion}min</span>
                      <span style={s.tag}>{fmtPesos(sv.precio)}</span>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:6, marginLeft:10 }}>
                    <button style={{ ...s.btnGlass, padding:"6px 10px", fontSize:12 }} onClick={()=>abrirEditar(sv)}>✎</button>
                    <button style={{ ...s.btnRed, padding:"6px 10px", fontSize:12 }} onClick={()=>setConfirm(sv)}>✕</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab==="horarios"&&(
          <HorariosConfig toast={toast}/>
        )}

        {tab==="estudio"&&(
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {[["nombre del estudio","Lash Studio by Chulas"],["dirección","San Lorenzo 3101, San Andrés"],["teléfono","11 2650-9699"],["instagram","@bychulas.studio"]].map(([l,v])=>(
              <Field key={l} label={l}><input style={s.input} defaultValue={v}/></Field>
            ))}
            <button style={s.btnGreen}>guardar →</button>
          </div>
        )}
      </div>

      {/* Sheet agregar/editar servicio */}
      {sheetSv&&(
        <Sheet titulo={editSv?"Editar Servicio":"Nuevo Servicio"} onClose={()=>setSheetSv(false)}>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <Field label="nombre del servicio *"><input style={s.input} value={formSv.nombre} onChange={e=>setSv("nombre",e.target.value)} placeholder="Nombre del servicio"/></Field>
            <Field label="descripción"><input style={s.input} value={formSv.descripcion} onChange={e=>setSv("descripcion",e.target.value)} placeholder="ej: Extensiones pelo a pelo"/></Field>
            <div style={{ display:"flex", gap:10 }}>
              <Field label="precio *" style={{ flex:1 }}><input style={{ ...s.input }} type="number" value={formSv.precio} onChange={e=>setSv("precio",e.target.value)} placeholder="0"/></Field>
              <Field label="duración (min)"><input style={{ ...s.input }} type="number" value={formSv.duracion} onChange={e=>setSv("duracion",e.target.value)} placeholder="90"/></Field>
            </div>
            <button style={{ ...s.btnGreen, opacity:saving?0.6:1 }} onClick={guardarSv} disabled={saving}>{saving?"guardando...":editSv?"guardar cambios →":"crear servicio →"}</button>
          </div>
        </Sheet>
      )}

      {confirm&&<Modal titulo="Eliminar servicio" msg={`¿Eliminar "${confirm.nombre}"? Esta acción no se puede deshacer.`} onOk={()=>borrarSv(confirm._id)} onCancel={()=>setConfirm(null)} okLabel="eliminar" danger/>}
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
    switch(tab){
      case "inicio": return <CInicio clienta={clienta} data={data} setTab={setTab}/>;
      case "agendar": return <CAgendar clienta={clienta} data={data}/>;
      case "historial": return <CHistorial clienta={clienta}/>;
      case "perfil": return <CPerfil clienta={clienta} onLogout={onLogout}/>;
      default: return <CInicio clienta={clienta} data={data} setTab={setTab}/>;
    }
  };

  return (
    <div style={s.app}>
      <div style={s.screen}>{render()}</div>
      <nav style={s.nav}>
        {tabs.map(t=>(
          <div key={t.id} style={navItemStyle(tab===t.id)} onClick={()=>setTab(t.id)}>
            <span style={{ fontSize:19 }}>{t.icon}</span>
            <span style={{ fontFamily:F.sans, fontSize:9, letterSpacing:"0.08em" }}>{t.label}</span>
            {tab===t.id&&<div style={{ width:4,height:4,borderRadius:"50%",background:G.green }}/>}
          </div>
        ))}
      </nav>
      <FAB/>
    </div>
  );
}

function CInicio({ clienta, data, setTab }) {
  const hoy = hoyISO();
  const hist = clienta.historial||[];
  const ultima = hist[hist.length-1];
  const diasDesde = ultima?.fecha ? Math.floor((new Date()-new Date(ultima.fecha))/(1000*60*60*24)) : null;
  const proxCita = data.citas.filter(c=>c.clientaId===clienta._id&&c.fecha>=hoy&&c.estado!=="completada").sort((a,b)=>a.fecha.localeCompare(b.fecha))[0];
  const diasHasta = proxCita ? Math.floor((new Date(proxCita.fecha)-new Date())/(1000*60*60*24)) : null;
  const curvaFav = clienta.curva||"—";

  return (
    <div>
      <div style={s.topBar}><h1 style={s.h1}>Lash Studio</h1><p style={s.sub}>hola, {clienta.nombre?.split(" ")[0].toLowerCase()} 🌿</p></div>
      <div style={{ padding:"18px" }}>
        {/* Recordatorio service */}
        {diasDesde!==null&&diasDesde>=14&&!proxCita&&(
          <div style={{ background:"linear-gradient(135deg,rgba(143,189,90,0.14),rgba(143,189,90,0.04))", border:`1px solid ${G.green}`, borderRadius:14, padding:"15px 16px", marginBottom:12 }}>
            <p style={{ margin:"0 0 3px", fontFamily:F.serif, fontWeight:700, fontSize:15, color:G.greenL }}>¡es hora del service! ✦</p>
            <p style={{ margin:"0 0 11px", fontFamily:F.sans, fontSize:12, color:G.sub }}>hace {diasDesde} días de tu último tratamiento</p>
            <button style={{ ...s.btnGreen, padding:"9px 14px" }} onClick={()=>setTab("agendar")}>agendar ahora →</button>
          </div>
        )}

        {/* Próxima cita */}
        {proxCita&&(
          <div style={{ ...s.card, borderColor:G.greenD, marginBottom:12 }}>
            <p style={{ fontFamily:F.sans, fontSize:10, color:G.muted, margin:"0 0 7px", textTransform:"lowercase", letterSpacing:"0.08em" }}>próxima cita</p>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <p style={{ margin:"0 0 2px", fontFamily:F.serif, fontWeight:700, fontSize:16 }}>{proxCita.servicio}</p>
                <p style={{ margin:0, fontFamily:F.sans, fontSize:12, color:G.sub }}>{fmtFecha(proxCita.fecha)} · {proxCita.hora}</p>
              </div>
              {diasHasta!==null&&(
                <div style={{ textAlign:"center", background:G.greenM, border:`0.5px solid ${G.green}`, borderRadius:11, padding:"8px 13px" }}>
                  <p style={{ margin:0, fontFamily:F.serif, fontWeight:700, fontSize:20, color:G.greenL }}>{diasHasta}</p>
                  <p style={{ margin:0, fontFamily:F.sans, fontSize:9, color:G.muted }}>días</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Widgets */}
        <div style={{ display:"flex", gap:9, marginBottom:18 }}>
          <div onClick={()=>setTab("historial")} style={{ ...s.card, flex:1, textAlign:"center", cursor:"pointer", margin:0, padding:"13px 8px" }}>
            <p style={{ fontFamily:F.sans, fontSize:9, color:G.muted, margin:"0 0 4px" }}>visitas</p>
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:22, color:G.white, margin:"0 0 2px" }}>{hist.length}</p>
            <p style={{ fontFamily:F.sans, fontSize:9, color:G.green, margin:0 }}>ver →</p>
          </div>
          <div onClick={()=>setTab("perfil")} style={{ ...s.card, flex:1, textAlign:"center", cursor:"pointer", margin:0, padding:"13px 8px" }}>
            <p style={{ fontFamily:F.sans, fontSize:9, color:G.muted, margin:"0 0 4px" }}>curva fav.</p>
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:22, color:G.white, margin:"0 0 2px" }}>{curvaFav}</p>
            <p style={{ fontFamily:F.sans, fontSize:9, color:G.green, margin:0 }}>mi ficha →</p>
          </div>
          <div onClick={()=>setTab("agendar")} style={{ ...s.card, flex:1, textAlign:"center", cursor:"pointer", margin:0, padding:"13px 8px", background:G.greenM, borderColor:G.green }}>
            <p style={{ fontFamily:F.sans, fontSize:9, color:G.greenL, margin:"0 0 4px" }}>turno</p>
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:22, color:G.white, margin:"0 0 2px" }}>+</p>
            <p style={{ fontFamily:F.sans, fontSize:9, color:G.greenL, margin:0 }}>agendar →</p>
          </div>
        </div>

        {/* Último servicio */}
        {ultima&&(
          <>
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:16, color:G.white, margin:"0 0 3px" }}>último servicio</p>
            <p style={{ ...s.sub, marginBottom:10 }}>{fmtFecha(ultima.fecha)}</p>
            <div style={{ ...s.card, cursor:"pointer" }} onClick={()=>setTab("historial")}>
              <p style={{ margin:"0 0 5px", fontFamily:F.serif, fontWeight:700, fontSize:15 }}>{ultima.servicio}</p>
              <span style={s.tag}>curva {ultima.curva}</span>
              <p style={{ margin:"9px 0 0", fontFamily:F.sans, fontSize:11, color:G.muted }}>ver historial completo →</p>
            </div>
          </>
        )}

        <div style={s.divider}/>
        {/* Info estudio */}
        <div style={s.card}>
          {[["📍","San Lorenzo 3101, San Andrés"],["📱","11 2650-9699"],["📷","@bychulas.studio"]].map(([ic,v])=>(
            <div key={v} style={{ display:"flex", gap:10, alignItems:"center", marginBottom:8 }}>
              <span style={{ fontSize:14 }}>{ic}</span>
              <p style={{ margin:0, fontFamily:F.sans, fontSize:13, color:G.sub }}>{v}</p>
            </div>
          ))}
          <button style={{ ...s.btnGreen, marginTop:8, padding:"9px" }} onClick={()=>openWA()}>abrir en WhatsApp →</button>
        </div>
      </div>
    </div>
  );
}

function CAgendar({ clienta, data }) {
  const [paso, setPaso] = useState(1);
  const [modo, setModo] = useState("individual");
  const [form, setForm] = useState({ servicio:null, fecha:"", hora:"", notas:"" });
  const [enviado, setEnviado] = useState(false);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const ocupadas = data.citas.filter(c=>c.fecha===form.fecha&&c.estado!=="completada").map(c=>c.hora);

  const confirmar = () => {
    const sv = form.servicio?.nombre||"A confirmar con Male";
    const msg = modo==="noSe"
      ? `Hola Male! 🌿 Quiero agendar un turno:\n📅 ${form.fecha} a las ${form.hora}\n💭 No sé bien qué hacerme, me gustaría que me asesores${form.notas?`\nNotas: ${form.notas}`:""}\n💚 ${clienta.nombre}`
      : `Hola Male! 🌿 Quiero agendar:\n✦ ${sv}\n📅 ${form.fecha} a las ${form.hora}${form.notas?`\nNotas: ${form.notas}`:""}\n💚 ${clienta.nombre}`;
    openWA(msg);
    setEnviado(true);
  };

  if(enviado) return (
    <div style={{ minHeight:"100vh", background:G.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:28, textAlign:"center" }}>
      <div style={{ fontSize:44, marginBottom:12 }}>🌿</div>
      <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:22, color:G.greenL, margin:"0 0 8px" }}>¡solicitud enviada!</p>
      <p style={{ fontFamily:F.sans, fontSize:13, color:G.sub, margin:"0 0 24px", lineHeight:1.7 }}>Male va a confirmar tu turno por WhatsApp. ¡Nos vemos pronto!</p>
      <button style={s.btnGreen} onClick={()=>{ setEnviado(false); setPaso(1); setForm({ servicio:null, fecha:"", hora:"", notas:"" }); }}>volver →</button>
    </div>
  );

  return (
    <div>
      <div style={s.topBar}><h1 style={s.h1}>Agendar</h1><p style={s.sub}>paso {paso} de 3</p></div>
      <div style={{ padding:"18px" }}>
        <div style={{ display:"flex", gap:5, marginBottom:20 }}>
          {[1,2,3].map(p=><div key={p} style={{ flex:1, height:3, borderRadius:2, background:p<=paso?G.green:G.border, transition:"background 0.3s" }}/>)}
        </div>

        {paso===1&&(
          <div>
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:17, color:G.white, margin:"0 0 14px" }}>¿qué querés hacerte?</p>
            <div style={{ display:"flex", gap:7, marginBottom:16 }}>
              {[["individual","servicio"],["noSe","no sé aún"]].map(([m,l])=>(
                <button key={m} onClick={()=>{ setModo(m); set("servicio",null); }} style={{ ...s.btnGlass, flex:1, fontSize:11, background:modo===m?G.greenM:G.glass, borderColor:modo===m?G.green:G.border, color:modo===m?G.greenL:G.sub }}>{l}</button>
              ))}
            </div>

            {modo==="individual"&&(
              data.servicios.length===0
                ? <p style={{ color:G.muted, fontSize:13 }}>los servicios se están cargando...</p>
                : data.servicios.map(sv=>(
                  <div key={sv._id} style={{ ...s.card, borderColor:form.servicio?._id===sv._id?G.green:G.border, background:form.servicio?._id===sv._id?"rgba(143,189,90,0.06)":G.card }} onClick={()=>{ set("servicio",sv); setPaso(2); }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                      <div style={{ flex:1 }}>
                        <p style={{ margin:"0 0 3px", fontFamily:F.serif, fontSize:14 }}>{sv.nombre}</p>
                        {sv.descripcion&&<p style={{ margin:"0 0 7px", fontFamily:F.sans, fontSize:12, color:G.sub }}>{sv.descripcion}</p>}
                        <span style={s.tag}>{sv.duracion}min</span>
                      </div>
                      <p style={{ margin:0, fontFamily:F.serif, fontWeight:700, color:G.green, fontSize:15 }}>{fmtPesos(sv.precio)}</p>
                    </div>
                  </div>
                ))
            )}

            {modo==="noSe"&&(
              <div>
                <div style={{ ...s.card, background:"rgba(143,189,90,0.05)", borderColor:G.greenD, textAlign:"center", padding:"22px 18px" }}>
                  <div style={{ fontSize:30, marginBottom:9 }}>🌿</div>
                  <p style={{ margin:"0 0 5px", fontFamily:F.serif, fontWeight:700, fontSize:16, color:G.greenL }}>¡no te preocupes!</p>
                  <p style={{ margin:"0 0 14px", fontFamily:F.sans, fontSize:12, color:G.sub, lineHeight:1.7 }}>Agendá tu turno y Male te va a asesorar personalmente. Podés contarle qué efecto buscás en las notas.</p>
                  <button style={{ ...s.btnGreen, padding:"10px" }} onClick={()=>setPaso(2)}>agendar igualmente →</button>
                </div>
                <div style={{ ...s.card, marginTop:0 }}>
                  <p style={{ ...s.sub, margin:"0 0 9px" }}>¿querés consultar antes?</p>
                  <button style={{ ...s.btnGlass, width:"100%", borderColor:G.green, color:G.greenL }} onClick={()=>openWA("Hola Male! No sé bien qué servicio hacerme, ¿me podés orientar? 🌿")}>💬 consultar por WhatsApp</button>
                </div>
              </div>
            )}
          </div>
        )}

        {paso===2&&(
          <div>
            <button style={{ ...s.btnGlass, marginBottom:14, fontSize:12 }} onClick={()=>setPaso(1)}>← cambiar servicio</button>
            {form.servicio&&<div style={{ ...s.card, background:"rgba(143,189,90,0.05)", borderColor:G.greenD, marginBottom:16, padding:"9px 13px" }}>
              <p style={{ margin:0, fontFamily:F.sans, fontSize:12, color:G.greenL }}>✦ {form.servicio.nombre}</p>
            </div>}
            <Field label="fecha"><input style={s.input} type="date" value={form.fecha} onChange={e=>set("fecha",e.target.value)}/></Field>
            {form.fecha&&(
              <>
                <Field label="hora disponible">
                  <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
                    {SLOTS.map(h=>{
                      const oc=ocupadas.includes(h);
                      return <button key={h} disabled={oc} onClick={()=>set("hora",h)} style={{ ...s.btnGlass, padding:"9px 12px", fontSize:12, opacity:oc?0.3:1, background:form.hora===h?G.greenM:G.glass, borderColor:form.hora===h?G.green:G.border, color:form.hora===h?G.greenL:G.sub, cursor:oc?"not-allowed":"pointer" }}>
                        {h}{oc?" ✕":""}
                      </button>;
                    })}
                  </div>
                </Field>
                <Field label={modo==="noSe"?"contanos qué efecto buscás":"notas (opcional)"}>
                  <textarea style={{ ...s.input, height:65, resize:"none" }} value={form.notas} onChange={e=>set("notas",e.target.value)} placeholder={modo==="noSe"?"largo, volumen, ocasión especial...":"indicaciones especiales..."}/>
                </Field>
                {form.hora&&<button style={s.btnGreen} onClick={()=>setPaso(3)}>confirmar horario →</button>}
              </>
            )}
          </div>
        )}

        {paso===3&&(
          <div>
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:17, color:G.white, margin:"0 0 3px" }}>confirmá tu cita</p>
            <p style={{ ...s.sub, marginBottom:14 }}>revisá los detalles antes de enviar</p>
            <div style={{ ...s.card, background:"rgba(143,189,90,0.05)", borderColor:G.greenD }}>
              {[
                ["servicio", form.servicio?.nombre||"A confirmar con Male"],
                ["fecha", fmtFecha(form.fecha)],
                ["hora", form.hora],
                ["duración aprox.", form.servicio?.duracion?`${form.servicio.duracion}min`:"a confirmar"],
                ...(form.notas?[["notas",form.notas]]:[]),
              ].map(([k,v])=>(
                <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:`0.5px solid ${G.border}` }}>
                  <span style={{ ...s.label, margin:0 }}>{k}</span>
                  <span style={{ fontFamily:F.sans, fontSize:12, color:G.sub, maxWidth:"60%", textAlign:"right" }}>{v}</span>
                </div>
              ))}
            </div>
            <button style={{ ...s.btnGreen, marginTop:14 }} onClick={confirmar}>confirmar y avisar a Male →</button>
            <button style={{ ...s.btnGlass, marginTop:9, width:"100%" }} onClick={()=>setPaso(1)}>modificar</button>
          </div>
        )}
      </div>
    </div>
  );
}

function CHistorial({ clienta }) {
  const hist = clienta.historial||[];
  const curvasUsadas = {};
  hist.forEach(h=>{ curvasUsadas[h.curva]=(curvasUsadas[h.curva]||0)+1; });
  const curvaFav = Object.entries(curvasUsadas).sort((a,b)=>b[1]-a[1])[0]?.[0]||clienta.curva||"—";
  const badge = hist.length>=10?"✦ clienta VIP":hist.length>=5?"✦ clienta frecuente":hist.length>=2?"✦ clienta activa":null;

  return (
    <div>
      <div style={s.topBar}><h1 style={s.h1}>Historial</h1><p style={s.sub}>{hist.length} visitas al estudio</p></div>
      <div style={{ padding:"18px" }}>
        <div style={{ display:"flex", gap:9, marginBottom:16 }}>
          <div style={{ ...s.card, flex:1, textAlign:"center", margin:0, padding:"13px 8px" }}>
            <p style={{ fontFamily:F.sans, fontSize:9, color:G.muted, margin:"0 0 4px" }}>visitas</p>
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:24, color:G.green, margin:0 }}>{hist.length}</p>
          </div>
          <div style={{ ...s.card, flex:1, textAlign:"center", margin:0, padding:"13px 8px" }}>
            <p style={{ fontFamily:F.sans, fontSize:9, color:G.muted, margin:"0 0 4px" }}>curva fav.</p>
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:24, margin:0 }}>{curvaFav}</p>
          </div>
        </div>

        {badge&&(
          <div style={{ ...s.card, background:"rgba(143,189,90,0.05)", borderColor:G.greenD, textAlign:"center", padding:"16px", marginBottom:14 }}>
            <p style={{ margin:"0 0 4px", fontFamily:F.serif, fontWeight:700, fontSize:16, color:G.greenL }}>{badge}</p>
            <p style={{ margin:0, fontFamily:F.sans, fontSize:12, color:G.muted }}>{hist.length} visitas y siempre hermosa 💚</p>
          </div>
        )}

        <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:16, color:G.white, margin:"0 0 3px" }}>tus visitas</p>
        <p style={{ ...s.sub, marginBottom:12 }}>más recientes primero</p>
        {hist.length===0&&<p style={{ color:G.muted, fontSize:13 }}>tu historial estará aquí después de tu primera visita ✦</p>}
        {[...hist].reverse().map((h,i)=>(
          <div key={i} style={s.card}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
              <div>
                <p style={{ margin:"0 0 2px", fontFamily:F.serif, fontSize:14 }}>{h.servicio}</p>
                <p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:G.muted }}>{fmtFecha(h.fecha)}</p>
              </div>
              <span style={s.tag}>curva {h.curva}</span>
            </div>
            {h.notas&&<p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:G.muted }}>✦ {h.notas}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function CPerfil({ clienta, onLogout }) {
  const [editando, setEditando] = useState(false);
  const [foto, setFoto] = useState(null);

  const onFoto = (e) => {
    const f=e.target.files?.[0]; if(!f) return;
    const r=new FileReader(); r.onload=ev=>setFoto(ev.target.result); r.readAsDataURL(f);
  };

  return (
    <div>
      <div style={s.topBar}><h1 style={s.h1}>Mi Perfil</h1><p style={s.sub}>tus datos</p></div>
      <div style={{ padding:"18px" }}>
        {/* Avatar */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", marginBottom:22 }}>
          <div style={{ position:"relative", marginBottom:10 }}>
            {foto
              ? <img src={foto} alt="perfil" style={{ width:78, height:78, borderRadius:"50%", objectFit:"cover", border:`2px solid ${G.green}` }}/>
              : <Avatar nombre={clienta.nombre} size={78}/>
            }
            <label htmlFor="foto-input" style={{ position:"absolute", bottom:0, right:0, width:26, height:26, borderRadius:"50%", background:editando?G.green:"rgba(10,10,10,0.8)", border:`1.5px solid ${editando?G.bg:G.border}`, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:13 }}>📷</label>
            <input id="foto-input" type="file" accept="image/*" style={{ display:"none" }} onChange={onFoto}/>
          </div>
          <p style={{ margin:"0 0 5px", fontFamily:F.serif, fontWeight:700, fontSize:18 }}>{clienta.nombre}</p>
          <span style={s.tag}>clienta activa</span>
        </div>

        <div style={{ display:"flex", gap:8, marginBottom:16 }}>
          <button style={{ ...s.btnGlass, flex:1, fontSize:12 }} onClick={()=>setEditando(e=>!e)}>{editando?"cancelar":"✎ editar"}</button>
          <button style={{ ...s.btnGlass, flex:1, fontSize:12 }} onClick={()=>openWA()}>💬 contactar</button>
        </div>

        <div style={{ ...s.card, display:"flex", flexDirection:"column", gap:12 }}>
          {[["nombre",clienta.nombre],["email",clienta.email||"—"],["teléfono",clienta.telefono||"—"]].map(([l,v])=>(
            <div key={l}>
              <label style={s.label}>{l}</label>
              {editando ? <input style={s.input} defaultValue={v}/> : <p style={{ margin:0, fontFamily:F.sans, fontSize:13, color:G.sub }}>{v}</p>}
            </div>
          ))}
          {editando&&<Field label="contacto de emergencia"><input style={s.input} placeholder="nombre y teléfono..."/></Field>}
        </div>

        <div style={{ marginTop:12 }}>
          <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:16, color:G.white, margin:"0 0 10px" }}>mis preferencias</p>
          <div style={s.card}>
            {[["curva habitual",clienta.curva||"—"],["grosor",clienta.grosor?`${clienta.grosor}mm`:"—"],["largo",clienta.largo||"—"]].map(([l,v])=>(
              <div key={l} style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                <span style={{ ...s.label, margin:0 }}>{l}</span>
                <span style={s.tag}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...s.card, marginTop:12, background:"rgba(143,189,90,0.03)", borderColor:G.border }}>
          <p style={{ margin:"0 0 9px", fontFamily:F.serif, fontWeight:700, fontSize:14 }}>Políticas del Estudio</p>
          {["Cancelaciones con 24hs de anticipación","Puntualidad · tolerancia 10 minutos","No usar rimel 48hs antes","Retoques gratuitos dentro de las 72hs","Prohibido el uso de aceites en la zona"].map((p,i)=>(
            <p key={i} style={{ margin:"0 0 6px", fontFamily:F.sans, fontSize:12, color:G.sub }}>✦ {p}</p>
          ))}
        </div>

        {editando&&<button style={{ ...s.btnGreen, marginTop:12 }}>guardar cambios →</button>}

        <button style={{ ...s.btnRed, marginTop:18, width:"100%" }} onClick={onLogout}>cerrar sesión</button>
      </div>
    </div>
  );
}
