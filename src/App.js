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
// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES UI (solo para calendarios y UI, NO datos del negocio)
// ═══════════════════════════════════════════════════════════════════════════════
const MESES  = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
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

function NavFlotante({ items, active, onChange }) {
  return (
    <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:430, display:"flex", justifyContent:"center", padding:"0 0 24px", zIndex:20, pointerEvents:"none" }}>
      <nav style={{ ...NAV_STYLE, pointerEvents:"all" }}>
        {items.map(n=>(
          <div key={n.id} style={navItemSt(active===n.id)} onClick={()=>onChange(n.id)}>
            <span style={{ fontSize:18 }}>{n.icon}</span>
            <span style={{ fontFamily:F.sans, fontSize:9, letterSpacing:"0.06em" }}>{n.label}</span>
          </div>
        ))}
      </nav>
    </div>
  );
}

function StatBox({ label, val, sub, color=G.white, onClick }) {
  return (
    <div onClick={onClick} style={{ ...s.card, flex:1, textAlign:"center", margin:0, padding:"13px 8px", cursor:onClick?"pointer":"default" }}>
      <p style={{ fontFamily:F.sans, fontSize:9, color:G.muted, margin:"0 0 4px", textTransform:"lowercase", letterSpacing:"0.08em" }}>{label}</p>
      <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:21, color, margin:"0 0 2px" }}>{val}</p>
      {sub&&<p style={{ fontFamily:F.sans, fontSize:9, color:G.green, margin:0 }}>{sub}</p>}
    </div>
  );
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
  const [form, setForm] = useState({ nombre:"", email:"", telefono:"", curva:"", grosor:"", largo:"", alergias:"", observaciones:"" });
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
    setForm({ nombre:"", email:"", telefono:"", curva:"", grosor:"", largo:"", alergias:"", observaciones:"" });
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
  const [form, setForm] = useState({ nombre:cInit.nombre, telefono:cInit.telefono||"", curva:cInit.curva||"", grosor:cInit.grosor||"", largo:cInit.largo||"", alergias:cInit.alergias||"", observaciones:cInit.observaciones||"" });
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
function AdminConfig({ data, toast, onLogout }) {
  const [tab, setTab] = useState("servicios");
  return (
    <div>
      <div style={s.topBar}><h1 style={s.h1}>Configuración</h1><p style={s.sub}>parámetros del estudio</p></div>
      <div style={{ padding:"18px" }}>
        <div style={{ display:"flex", gap:7, marginBottom:18, overflowX:"auto" }}>
          {["servicios","técnico","horarios","estudio"].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{ ...s.btnGlass, flexShrink:0, fontSize:11, padding:"7px 14px", background:tab===t?G.greenM:G.glass, borderColor:tab===t?G.green:G.border, color:tab===t?G.greenL:G.sub }}>{t}</button>
          ))}
        </div>
        {tab==="servicios" && <ConfigServicios data={data} toast={toast}/>}
        {tab==="técnico"   && <ConfigTecnico   data={data} toast={toast}/>}
        {tab==="horarios"  && <ConfigHorarios  data={data} toast={toast}/>}
        {tab==="estudio"   && <ConfigEstudio   data={data} toast={toast} onLogout={onLogout}/>}
      </div>
    </div>
  );
}

function ConfigServicios({ data, toast }) {
  const [sheet,  setSheet]  = useState(false);
  const [editSv, setEditSv] = useState(null);
  const [confirm,setConfirm]= useState(null);
  const [form, setForm] = useState({ nombre:"", descripcion:"", precio:"", duracion:"", fotos:[] });
  const [saving, setSaving] = useState(false);
  const setSv = (k,v) => setForm(f=>({...f,[k]:v}));

  const abrirNuevo  = () => { setEditSv(null); setForm({ nombre:"", descripcion:"", precio:"", duracion:"", fotos:[] }); setSheet(true); };
  const abrirEditar = (sv) => { setEditSv(sv); setForm({ nombre:sv.nombre||"", descripcion:sv.descripcion||"", precio:String(sv.precio||""), duracion:String(sv.duracion||""), fotos:sv.fotos||[] }); setSheet(true); };

  const onFoto = (e) => {
    Array.from(e.target.files||[]).forEach(file=>{
      const r=new FileReader();
      r.onload=ev=>setSv("fotos",prev=>[...(Array.isArray(prev)?prev:[]),ev.target.result]);
      r.readAsDataURL(file);
    });
  };

  const guardar = async () => {
    if(!form.nombre||!form.precio){ toast("nombre y precio son obligatorios"); return; }
    setSaving(true);
    const payload={ nombre:form.nombre, descripcion:form.descripcion, precio:Number(form.precio), duracion:Number(form.duracion)||60, fotos:Array.isArray(form.fotos)?form.fotos:[] };
    if(editSv) await data.editarServicio(editSv._id, payload);
    else       await data.crearServicio(payload);
    setSaving(false); setSheet(false);
    toast(editSv?"✓ actualizado":"✓ servicio creado");
  };

  return (
    <div>
      <button style={{ ...s.btnGreen, marginBottom:14 }} onClick={abrirNuevo}>+ agregar servicio</button>
      {data.servicios.length===0&&<p style={{ color:G.muted, fontSize:13 }}>sin servicios cargados ✦</p>}
      {data.servicios.map(sv=>(
        <div key={sv._id} style={s.card}>
          {sv.fotos?.length>0&&(
            <div style={{ display:"flex", gap:6, overflowX:"auto", marginBottom:10 }}>
              {sv.fotos.map((f,i)=><img key={i} src={f} alt="" style={{ width:80, height:80, borderRadius:9, objectFit:"cover", flexShrink:0 }}/>)}
            </div>
          )}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div style={{ flex:1 }}>
              <p style={{ margin:"0 0 3px", fontFamily:F.serif, fontWeight:700, fontSize:15 }}>{sv.nombre}</p>
              {sv.descripcion&&<p style={{ margin:"0 0 7px", fontFamily:F.sans, fontSize:12, color:G.sub }}>{sv.descripcion}</p>}
              <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
                <span style={s.tag}>{sv.duracion}min est.</span>
                <span style={s.tag}>{fmtPesos(sv.precio)}</span>
              </div>
              <p style={{ margin:"6px 0 0", fontFamily:F.sans, fontSize:10, color:G.muted, fontStyle:"italic" }}>* duración estimada, puede variar según cada clienta</p>
            </div>
            <div style={{ display:"flex", gap:6, marginLeft:10 }}>
              <button style={{ ...s.btnGlass, padding:"6px 10px", fontSize:12 }} onClick={()=>abrirEditar(sv)}>✎</button>
              <button style={{ ...s.btnRed,   padding:"6px 10px", fontSize:12 }} onClick={()=>setConfirm(sv)}>✕</button>
            </div>
          </div>
        </div>
      ))}

      {sheet&&(
        <Sheet titulo={editSv?"Editar Servicio":"Nuevo Servicio"} onClose={()=>setSheet(false)}>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <Field label="nombre *"><input style={s.input} value={form.nombre} onChange={e=>setSv("nombre",e.target.value)} placeholder="Nombre del servicio"/></Field>
            <Field label="descripción"><input style={s.input} value={form.descripcion} onChange={e=>setSv("descripcion",e.target.value)} placeholder="Descripción breve"/></Field>
            <div style={{ display:"flex", gap:10 }}>
              <Field label="precio *" style={{ flex:1 }}><input style={s.input} type="number" value={form.precio} onChange={e=>setSv("precio",e.target.value)} placeholder="0"/></Field>
              <Field label="duración (min)" style={{ flex:1 }}><input style={s.input} type="number" value={form.duracion} onChange={e=>setSv("duracion",e.target.value)} placeholder="60"/></Field>
            </div>
            <p style={{ margin:"-8px 0 0", fontFamily:F.sans, fontSize:10, color:G.muted, fontStyle:"italic" }}>* duración estimada según cada clienta</p>
            <Field label="fotos (las clientas verán un carrusel)">
              {Array.isArray(form.fotos)&&form.fotos.length>0&&(
                <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:8 }}>
                  {form.fotos.map((f,i)=>(
                    <div key={i} style={{ position:"relative" }}>
                      <img src={f} alt="" style={{ width:72, height:72, borderRadius:9, objectFit:"cover" }}/>
                      <button onClick={()=>setSv("fotos",form.fotos.filter((_,j)=>j!==i))} style={{ position:"absolute", top:-6, right:-6, width:18, height:18, borderRadius:"50%", background:G.red, border:"none", color:"#fff", fontSize:10, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
              <label style={{ ...s.btnGlass, display:"block", textAlign:"center", cursor:"pointer", padding:"10px" }}>
                📷 agregar fotos
                <input type="file" accept="image/*" multiple style={{ display:"none" }} onChange={onFoto}/>
              </label>
            </Field>
            <button style={{ ...s.btnGreen, opacity:saving?0.6:1 }} onClick={guardar} disabled={saving}>{saving?"guardando...":editSv?"guardar cambios →":"crear servicio →"}</button>
          </div>
        </Sheet>
      )}
      {confirm&&<Modal titulo="Eliminar servicio" msg={`¿Eliminar "${confirm.nombre}"?`} onOk={()=>{ data.borrarServicio(confirm._id); setConfirm(null); toast("eliminado"); }} onCancel={()=>setConfirm(null)} okLabel="eliminar" danger/>}
    </div>
  );
}

function ConfigTecnico({ data, toast }) {
  const EditableChips = ({ label, configKey }) => {
    const valores = data.getConfig(configKey, []);
    const [nuevo,   setNuevo]   = useState("");
    const [confirm, setConfirm] = useState(null);
    const agregar = async () => {
      if(!nuevo.trim()){ return; }
      if(valores.includes(nuevo.trim())){ toast("ya existe"); return; }
      await data.saveConfig(configKey, [...valores, nuevo.trim()]);
      setNuevo(""); toast(`✓ ${nuevo.trim()} agregado`);
    };
    const quitar = async (v) => {
      await data.saveConfig(configKey, valores.filter(x=>x!==v));
      setConfirm(null); toast(`${v} eliminado`);
    };
    return (
      <div style={{ ...s.card, marginBottom:12 }}>
        <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:15, color:G.white, margin:"0 0 10px" }}>{label}</p>
        <div style={{ display:"flex", flexWrap:"wrap", gap:7, marginBottom:12 }}>
          {valores.length===0&&<p style={{ color:G.muted, fontSize:12, margin:0 }}>sin opciones cargadas</p>}
          {valores.map(v=>(
            <div key={v} style={{ display:"flex", alignItems:"center", gap:4, background:G.greenM, border:`0.5px solid ${G.green}`, borderRadius:20, padding:"3px 8px 3px 12px" }}>
              <span style={{ fontFamily:F.sans, fontSize:12, color:G.greenL }}>{v}</span>
              <button onClick={()=>setConfirm(v)} style={{ background:"none", border:"none", color:G.muted, cursor:"pointer", fontSize:12, padding:"0 2px" }}>✕</button>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <input style={{ ...s.input, flex:1 }} value={nuevo} onChange={e=>setNuevo(e.target.value)} placeholder={`nueva opción...`} onKeyDown={e=>e.key==="Enter"&&agregar()}/>
          <button style={{ ...s.btnGreen, width:"auto", padding:"0 14px", fontSize:13 }} onClick={agregar}>+</button>
        </div>
        {confirm&&<Modal titulo={`Eliminar "${confirm}"`} msg={`¿Quitar esta opción de ${label}?`} onOk={()=>quitar(confirm)} onCancel={()=>setConfirm(null)} okLabel="quitar" danger/>}
      </div>
    );
  };
  return (
    <div>
      <p style={{ ...s.sub, marginBottom:14 }}>opciones de la ficha técnica para cada clienta</p>
      <EditableChips label="Curvas" configKey="curvas"/>
      <EditableChips label="Grosores" configKey="grosores"/>
      <EditableChips label="Largos" configKey="largos"/>
    </div>
  );
}

function ConfigHorarios({ data, toast }) {
  const [tab, setTab] = useState("slots");
  const slots = data.getConfig("slots", []);

  const SlotsEditor = () => {
    const [nuevo, setNuevo] = useState("");
    const agregar = async () => {
      if(!nuevo) return;
      const t=nuevo.trim();
      if(slots.includes(t)){ toast("ya existe"); return; }
      await data.saveConfig("slots", [...slots, t].sort());
      setNuevo(""); toast(`✓ ${t} agregado`);
    };
    const quitar = async (v) => { await data.saveConfig("slots", slots.filter(x=>x!==v)); toast(`${v} eliminado`); };
    return (
      <div>
        <p style={{ ...s.sub, marginBottom:12 }}>horarios disponibles para agendar</p>
        {slots.length===0&&<p style={{ color:G.muted, fontSize:12, marginBottom:12 }}>sin horarios — agregá los que usás</p>}
        <div style={{ display:"flex", flexWrap:"wrap", gap:7, marginBottom:14 }}>
          {slots.map(h=>(
            <div key={h} style={{ display:"flex", alignItems:"center", gap:4, background:G.greenM, border:`0.5px solid ${G.green}`, borderRadius:20, padding:"4px 8px 4px 12px" }}>
              <span style={{ fontFamily:F.sans, fontSize:13, color:G.greenL }}>{h}</span>
              <button onClick={()=>quitar(h)} style={{ background:"none", border:"none", color:G.muted, cursor:"pointer", fontSize:12, padding:"0 2px" }}>✕</button>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <input style={{ ...s.input, flex:1 }} type="time" value={nuevo} onChange={e=>setNuevo(e.target.value)}/>
          <button style={{ ...s.btnGreen, width:"auto", padding:"0 14px" }} onClick={agregar}>+ agregar</button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        {[["slots","slots disponibles"],["excepciones","días no laborables"]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{ ...s.btnGlass, flex:1, fontSize:11, background:tab===k?G.greenM:G.glass, borderColor:tab===k?G.green:G.border, color:tab===k?G.greenL:G.sub }}>{l}</button>
        ))}
      </div>
      {tab==="slots"      && <SlotsEditor/>}
      {tab==="excepciones"&& <ExcepcionesEditor data={data} toast={toast}/>}
    </div>
  );
}

function ExcepcionesEditor({ data, toast }) {
  const [fecha,   setFecha]   = useState("");
  const [razon,   setRazon]   = useState("");
  const [saving,  setSaving]  = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [lista,   setLista]   = useState(data.excepciones||[]);
  useEffect(()=>setLista(data.excepciones||[]),[data.excepciones]);

  const hoy=hoyISO();
  const futuras=lista.filter(e=>e.fecha>=hoy).sort((a,b)=>a.fecha.localeCompare(b.fecha));
  const pasadas =lista.filter(e=>e.fecha<hoy).sort((a,b)=>b.fecha.localeCompare(a.fecha));

  const agregar=async()=>{
    if(!fecha){ toast("elegí una fecha"); return; }
    if(lista.find(e=>e.fecha===fecha)){ toast("ya está marcada"); return; }
    setSaving(true);
    const id=await db.push("excepciones",{ fecha, razon:razon||"día no laborable" });
    setLista(p=>[...p,{ fecha, razon:razon||"día no laborable", _id:id }]);
    setFecha(""); setRazon(""); setSaving(false); toast("✓ guardado");
  };
  const borrar=async(e)=>{ await db.delete(`excepciones/${e._id}`); setLista(p=>p.filter(x=>x._id!==e._id)); setConfirm(null); toast("eliminado"); };

  return (
    <div>
      <div style={{ ...s.card, background:"rgba(143,189,90,0.04)", borderColor:G.greenD, marginBottom:14 }}>
        <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:15, color:G.white, margin:"0 0 12px" }}>marcar día no laborable</p>
        <Field label="fecha"><input style={s.input} type="date" value={fecha} min={hoy} onChange={e=>setFecha(e.target.value)}/></Field>
        <Field label="razón (opcional)"><input style={s.input} value={razon} onChange={e=>setRazon(e.target.value)} placeholder="vacaciones, feriado, personal..."/></Field>
        <button style={{ ...s.btnGreen, opacity:saving?0.6:1 }} onClick={agregar} disabled={saving}>{saving?"guardando...":"agregar →"}</button>
      </div>
      {futuras.length===0&&<p style={{ color:G.muted, fontSize:13 }}>sin días bloqueados próximos ✦</p>}
      {futuras.map(e=>(
        <div key={e._id} style={{ ...s.card, display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ background:G.greenM, border:`0.5px solid ${G.green}`, borderRadius:9, padding:"7px 10px", textAlign:"center", minWidth:52 }}>
            <p style={{ margin:0, fontFamily:F.sans, fontSize:10, color:G.muted }}>{e.fecha?.slice(5).replace("-","/")} </p>
            <p style={{ margin:0, fontFamily:F.serif, fontWeight:700, fontSize:13, color:G.greenL }}>{DIAS_F[new Date(e.fecha+"T12:00:00").getDay()].slice(0,3)}</p>
          </div>
          <p style={{ margin:0, fontFamily:F.sans, fontSize:13, flex:1 }}>{e.razon}</p>
          <button style={{ ...s.btnRed, padding:"6px 10px", fontSize:12 }} onClick={()=>setConfirm(e)}>✕</button>
        </div>
      ))}
      {pasadas.length>0&&(
        <details style={{ marginTop:10 }}>
          <summary style={{ fontFamily:F.sans, fontSize:12, color:G.muted, cursor:"pointer", padding:"8px 0" }}>pasados ({pasadas.length})</summary>
          <div style={{ marginTop:8, opacity:0.5 }}>
            {pasadas.map(e=><div key={e._id} style={{ ...s.card, padding:"9px 13px" }}><p style={{ margin:0, fontFamily:F.sans, fontSize:12, color:G.muted }}>{fmtFecha(e.fecha)} — {e.razon}</p></div>)}
          </div>
        </details>
      )}
      {confirm&&<Modal titulo="Eliminar excepción" msg={`¿Eliminar el bloqueo del ${fmtFecha(confirm.fecha)}?`} onOk={()=>borrar(confirm)} onCancel={()=>setConfirm(null)} okLabel="eliminar" danger/>}
    </div>
  );
}

function ConfigEstudio({ data, toast, onLogout }) {
  const init = data.getConfig("estudio", {});
  const [form, setForm] = useState({ nombre:init.nombre||"", direccion:init.direccion||"", whatsapp:init.whatsapp||"", instagram:init.instagram||"", urlApp:init.urlApp||"" });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const [saving, setSaving] = useState(false);
  const pols = data.getConfig("politicas", []);
  const [politicas, setPoliticas] = useState(pols);
  const [nuevaPol,  setNuevaPol]  = useState("");
  const [editIdx,   setEditIdx]   = useState(null);
  const [editTxt,   setEditTxt]   = useState("");

  useEffect(()=>{
    const e=data.getConfig("estudio",{});
    setForm({ nombre:e.nombre||"", direccion:e.direccion||"", whatsapp:e.whatsapp||"", instagram:e.instagram||"", urlApp:e.urlApp||"" });
    setPoliticas(data.getConfig("politicas",[]));
  },[data.config]);

  const guardarEstudio=async()=>{ setSaving(true); await data.saveConfig("estudio",form); setSaving(false); toast("✓ datos guardados"); };
  const addPol=async()=>{ if(!nuevaPol.trim()) return; const upd=[...politicas,nuevaPol.trim()]; await data.saveConfig("politicas",upd); setPoliticas(upd); setNuevaPol(""); toast("✓ política agregada"); };
  const savePol=async(i)=>{ const upd=politicas.map((p,j)=>j===i?editTxt:p); await data.saveConfig("politicas",upd); setPoliticas(upd); setEditIdx(null); toast("✓ guardado"); };
  const delPol=async(i)=>{ const upd=politicas.filter((_,j)=>j!==i); await data.saveConfig("politicas",upd); setPoliticas(upd); toast("eliminada"); };

  return (
    <div>
      <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:16, color:G.white, margin:"0 0 12px" }}>datos del estudio</p>
      <div style={{ ...s.card, display:"flex", flexDirection:"column", gap:12, marginBottom:14 }}>
        <Field label="nombre del estudio"><input style={s.input} value={form.nombre} onChange={e=>set("nombre",e.target.value)}/></Field>
        <Field label="dirección"><input style={s.input} value={form.direccion} onChange={e=>set("direccion",e.target.value)}/></Field>
        <Field label="whatsapp (con código de país, ej: 541126509699)"><input style={s.input} value={form.whatsapp} onChange={e=>set("whatsapp",e.target.value)} type="tel"/></Field>
        <Field label="instagram (@usuario)"><input style={s.input} value={form.instagram} onChange={e=>set("instagram",e.target.value)} placeholder="@usuario"/></Field>
        <Field label="url de la app"><input style={s.input} value={form.urlApp} onChange={e=>set("urlApp",e.target.value)} placeholder="https://..."/></Field>
        <button style={{ ...s.btnGreen, opacity:saving?0.6:1 }} onClick={guardarEstudio} disabled={saving}>{saving?"guardando...":"guardar →"}</button>
      </div>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
        <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:16, color:G.white, margin:0 }}>políticas del estudio</p>
      </div>
      <p style={{ ...s.sub, marginBottom:12 }}>las clientas las ven en su perfil</p>
      {politicas.length===0&&<p style={{ color:G.muted, fontSize:13, marginBottom:10 }}>sin políticas cargadas ✦</p>}
      {politicas.map((p,i)=>(
        <div key={i} style={{ ...s.card, padding:"10px 14px" }}>
          {editIdx===i?(
            <div style={{ display:"flex", gap:8 }}>
              <input style={{ ...s.input, flex:1 }} value={editTxt} onChange={e=>setEditTxt(e.target.value)} onKeyDown={e=>e.key==="Enter"&&savePol(i)}/>
              <button style={{ ...s.btnGreen, width:"auto", padding:"0 12px" }} onClick={()=>savePol(i)}>✓</button>
              <button style={{ ...s.btnGlass, padding:"0 10px" }} onClick={()=>setEditIdx(null)}>✕</button>
            </div>
          ):(
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <p style={{ margin:0, flex:1, fontFamily:F.sans, fontSize:13, color:G.sub }}>✦ {p}</p>
              <button style={{ ...s.btnGlass, padding:"5px 9px", fontSize:11 }} onClick={()=>{ setEditIdx(i); setEditTxt(p); }}>✎</button>
              <button style={{ ...s.btnRed, padding:"5px 9px", fontSize:11 }} onClick={()=>delPol(i)}>✕</button>
            </div>
          )}
        </div>
      ))}
      <div style={{ display:"flex", gap:8, marginTop:4 }}>
        <input style={{ ...s.input, flex:1 }} value={nuevaPol} onChange={e=>setNuevaPol(e.target.value)} placeholder="nueva política..." onKeyDown={e=>e.key==="Enter"&&addPol()}/>
        <button style={{ ...s.btnGreen, width:"auto", padding:"0 14px" }} onClick={addPol}>+</button>
      </div>
      <div style={s.divider}/>
      <button style={{ ...s.btnRed, width:"100%", marginTop:8 }} onClick={onLogout}>cerrar sesión</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PANEL CLIENTA
// ═══════════════════════════════════════════════════════════════════════════════
function ClientaApp({ clienta, data, onLogout }) {
  const [tab,   setTab]   = useState("inicio");
  const [toast, setToast] = useState(null);
  const tabs = [{ id:"inicio",icon:"⬡",label:"inicio" },{ id:"agendar",icon:"◷",label:"agendar" },{ id:"historial",icon:"✦",label:"historial" },{ id:"perfil",icon:"✿",label:"perfil" }];
  const wa = data.getConfig("estudio",{})?.whatsapp;
  const render = () => {
    switch(tab){
      case "inicio":    return <CInicio    clienta={clienta} data={data} setTab={setTab}/>;
      case "agendar":   return <CAgendar   clienta={clienta} data={data}/>;
      case "historial": return <CHistorial clienta={clienta} data={data}/>;
      case "perfil":    return <CPerfil    clienta={clienta} data={data} onLogout={onLogout}/>;
      default:          return <CInicio    clienta={clienta} data={data} setTab={setTab}/>;
    }
  };
  return (
    <div style={s.app}>
      <div style={s.screen}>{render()}</div>
      <NavFlotante items={tabs} active={tab} onChange={setTab}/>
      {wa&&<button style={{ position:"fixed", bottom:100, right:18, width:50, height:50, borderRadius:"50%", background:G.green, border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, boxShadow:`0 4px 20px rgba(143,189,90,0.4)`, zIndex:30 }} onClick={()=>openWA(wa,"Hola! Tengo una consulta 💚")}>💬</button>}
      {toast&&<Toast msg={toast} onDone={()=>setToast(null)}/>}
    </div>
  );
}

// ─── CLIENTA: INICIO ──────────────────────────────────────────────────────────
function CInicio({ clienta, data, setTab }) {
  const hoy = hoyISO();
  const hist = Array.isArray(clienta.historial)?clienta.historial:Object.values(clienta.historial||{});
  hist.sort((a,b)=>b.fecha?.localeCompare(a.fecha));
  const ultima = hist[0];
  const diasDesde = ultima?.fecha ? Math.floor((new Date()-new Date(ultima.fecha))/(1000*60*60*24)) : null;
  const proxCita  = data.citas.filter(c=>c.clientaId===clienta._id&&c.fecha>=hoy&&c.estado!=="completada").sort((a,b)=>a.fecha.localeCompare(b.fecha))[0];
  const diasHasta = proxCita ? Math.floor((new Date(proxCita.fecha+"T12:00:00")-new Date())/(1000*60*60*24)) : null;
  const estudio   = data.getConfig("estudio", {});

  // Abrir maps con la dirección
  const abrirMaps = () => {
    if(estudio.direccion) window.open(`https://maps.google.com/?q=${encodeURIComponent(estudio.direccion)}`, "_blank");
  };
  const abrirIG = () => {
    if(estudio.instagram) window.open(`https://instagram.com/${estudio.instagram.replace("@","")}`, "_blank");
  };

  return (
    <div>
      <div style={s.topBar}>
        <h1 style={s.h1}>{estudio.nombre||"Lash Studio"}</h1>
        <p style={s.sub}>hola, {clienta.nombre?.split(" ")[0]?.toLowerCase()||""} 🌿</p>
      </div>
      <div style={{ padding:"18px" }}>

        {/* Banner recordatorio próxima cita */}
        {proxCita&&diasHasta!==null&&(
          <div style={{ background:"linear-gradient(135deg,rgba(143,189,90,0.16),rgba(143,189,90,0.04))", border:`1px solid ${G.green}`, borderRadius:16, padding:"16px 18px", marginBottom:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <p style={{ margin:"0 0 3px", fontFamily:F.sans, fontSize:10, color:G.greenL, textTransform:"lowercase", letterSpacing:"0.08em" }}>próxima cita</p>
                <p style={{ margin:"0 0 2px", fontFamily:F.serif, fontWeight:700, fontSize:16 }}>{proxCita.servicio}</p>
                <p style={{ margin:0, fontFamily:F.sans, fontSize:12, color:G.sub }}>{fmtFecha(proxCita.fecha)} · {proxCita.hora}</p>
              </div>
              <div style={{ textAlign:"center", background:"rgba(10,10,10,0.4)", border:`0.5px solid rgba(255,255,255,0.1)`, borderRadius:14, padding:"10px 14px", minWidth:58 }}>
                <p style={{ margin:0, fontFamily:F.serif, fontWeight:700, fontSize:26, color:G.greenL }}>{diasHasta}</p>
                <p style={{ margin:0, fontFamily:F.sans, fontSize:9, color:G.muted }}>{diasHasta===1?"día":"días"}</p>
              </div>
            </div>
          </div>
        )}

        {/* Recordatorio service */}
        {diasDesde!==null&&diasDesde>=14&&!proxCita&&(
          <div style={{ background:"linear-gradient(135deg,rgba(143,189,90,0.14),rgba(143,189,90,0.04))", border:`1px solid ${G.green}`, borderRadius:14, padding:"15px 16px", marginBottom:12 }}>
            <p style={{ margin:"0 0 3px", fontFamily:F.serif, fontWeight:700, fontSize:15, color:G.greenL }}>
              {diasDesde>=30?"¡te extrañamos! 💚":"¡es hora del service! ✦"}
            </p>
            <p style={{ margin:"0 0 11px", fontFamily:F.sans, fontSize:12, color:G.sub }}>
              {diasDesde>=30?`hace ${diasDesde} días que no te hacés un tratamiento`:`hace ${diasDesde} días de tu último servicio`}
            </p>
            <button style={{ ...s.btnGreen, padding:"9px 14px" }} onClick={()=>setTab("agendar")}>agendar ahora →</button>
          </div>
        )}

        {/* Widgets de stats */}
        <div style={{ display:"flex", gap:9, marginBottom:16 }}>
          <StatBox label="visitas" val={hist.length} sub="historial →" onClick={()=>setTab("historial")}/>
          <StatBox label="curva fav." val={clienta.curva||"—"} sub="mi ficha →" onClick={()=>setTab("perfil")}/>
          <StatBox label="agendar" val="+" sub="reservar →" color={G.green} onClick={()=>setTab("agendar")}/>
        </div>

        {/* Último servicio */}
        {ultima&&(
          <div style={{ ...s.card, cursor:"pointer", marginBottom:14 }} onClick={()=>setTab("historial")}>
            <p style={{ fontFamily:F.sans, fontSize:10, color:G.muted, margin:"0 0 5px" }}>último servicio · {fmtFecha(ultima.fecha)}</p>
            <p style={{ margin:"0 0 5px", fontFamily:F.serif, fontWeight:700, fontSize:15 }}>{ultima.servicio}</p>
            {ultima.curva&&<span style={s.tag}>curva {ultima.curva}</span>}
            <p style={{ margin:"8px 0 0", fontFamily:F.sans, fontSize:11, color:G.muted }}>ver historial completo →</p>
          </div>
        )}

        {/* Accesos rápidos al estudio */}
        <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:16, color:G.white, margin:"0 0 10px" }}>el estudio</p>
        <div style={{ display:"flex", gap:10, marginBottom:12 }}>
          {estudio.whatsapp&&(
            <button style={{ flex:1, background:"rgba(37,211,102,0.1)", border:`0.5px solid rgba(37,211,102,0.3)`, borderRadius:14, padding:"14px 8px", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}
              onClick={()=>openWA(estudio.whatsapp,"Hola! Tengo una consulta 💚")}>
              <span style={{ fontSize:22 }}>💬</span>
              <p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:"rgba(37,211,102,0.9)" }}>WhatsApp</p>
            </button>
          )}
          {estudio.direccion&&(
            <button style={{ flex:1, background:"rgba(66,133,244,0.1)", border:`0.5px solid rgba(66,133,244,0.3)`, borderRadius:14, padding:"14px 8px", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}
              onClick={abrirMaps}>
              <span style={{ fontSize:22 }}>📍</span>
              <p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:"rgba(66,133,244,0.9)" }}>Cómo llegar</p>
            </button>
          )}
          {estudio.instagram&&(
            <button style={{ flex:1, background:"rgba(225,48,108,0.1)", border:`0.5px solid rgba(225,48,108,0.3)`, borderRadius:14, padding:"14px 8px", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}
              onClick={abrirIG}>
              <span style={{ fontSize:22 }}>📷</span>
              <p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:"rgba(225,48,108,0.9)" }}>Instagram</p>
            </button>
          )}
        </div>
        {estudio.direccion&&<p style={{ fontFamily:F.sans, fontSize:12, color:G.muted, textAlign:"center", marginBottom:4 }}>{estudio.direccion}</p>}
      </div>
    </div>
  );
}

// ─── CLIENTA: AGENDAR ─────────────────────────────────────────────────────────
function CAgendar({ clienta, data }) {
  const [paso,    setPaso]    = useState(1);
  const [modo,    setModo]    = useState("individual");
  const [svSel,   setSvSel]   = useState(null);
  const [mes,     setMes]     = useState(0); // offset de mes
  const [diaS,    setDiaS]    = useState(null);
  const [horaSel, setHoraSel] = useState(null);
  const [notas,   setNotas]   = useState("");
  const [enviado, setEnviado] = useState(false);

  const estudio = data.getConfig("estudio", {});
  const slots   = data.getConfig("slots",   []);
  const excFechas = new Set(data.excepciones.map(e=>e.fecha));

  // Calendario
  const ahora = new Date();
  const mesD  = new Date(ahora.getFullYear(), ahora.getMonth()+mes, 1);
  const anio  = mesD.getFullYear();
  const mesN  = mesD.getMonth();
  const primerDia = new Date(anio,mesN,1).getDay();
  const diasMes   = new Date(anio,mesN+1,0).getDate();
  const fmtKey = (d) => `${anio}-${String(mesN+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  const hoy   = hoyISO();

  // Citas ocupadas por fecha
  const citasPorFecha={};
  data.citas.forEach(c=>{ if(c.estado!=="completada"){ if(!citasPorFecha[c.fecha]) citasPorFecha[c.fecha]=[]; citasPorFecha[c.fecha].push(c.hora); } });

  const ocupadasDia = diaS ? (citasPorFecha[diaS]||[]) : [];
  const diaEsBloqueado = diaS ? excFechas.has(diaS) : false;
  const slotsDia = slots.filter(h=>!ocupadasDia.includes(h));

  const confirmar = () => {
    if(!estudio.whatsapp) return;
    const msg = modo==="noSe"
      ? `Hola! 🌿 Quiero agendar:\n📅 ${fmtFecha(diaS)} a las ${horaSel}${notas?`\n💭 ${notas}`:""}\n💚 ${clienta.nombre}`
      : `Hola! 🌿 Quiero agendar:\n✦ ${svSel?.nombre||"a confirmar"}\n📅 ${fmtFecha(diaS)} a las ${horaSel}${notas?`\n💭 ${notas}`:""}\n💚 ${clienta.nombre}`;
    openWA(estudio.whatsapp, msg);
    setEnviado(true);
  };

  if(!estudio.whatsapp) return (
    <div style={{ minHeight:"100vh", background:G.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:28 }}>
      <p style={{ color:G.muted, fontSize:13, textAlign:"center" }}>El estudio aún no configuró el contacto.</p>
    </div>
  );

  if(enviado) return (
    <div style={{ minHeight:"100vh", background:G.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:28, textAlign:"center" }}>
      <div style={{ fontSize:44, marginBottom:12 }}>🌿</div>
      <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:22, color:G.greenL, margin:"0 0 8px" }}>¡solicitud enviada!</p>
      <p style={{ fontFamily:F.sans, fontSize:13, color:G.sub, margin:"0 0 24px", lineHeight:1.7 }}>Te confirman el turno por WhatsApp. ¡Nos vemos pronto!</p>
      <button style={s.btnGreen} onClick={()=>{ setEnviado(false); setPaso(1); setSvSel(null); setDiaS(null); setHoraSel(null); setNotas(""); }}>volver →</button>
    </div>
  );

  return (
    <div>
      <div style={s.topBar}><h1 style={s.h1}>Agendar</h1><p style={s.sub}>paso {paso} de 3</p></div>
      <div style={{ padding:"18px" }}>
        <div style={{ display:"flex", gap:5, marginBottom:20 }}>
          {[1,2,3].map(p=><div key={p} style={{ flex:1, height:3, borderRadius:2, background:p<=paso?G.green:G.border, transition:"background 0.3s" }}/>)}
        </div>

        {/* PASO 1: SERVICIO */}
        {paso===1&&(
          <div>
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:17, color:G.white, margin:"0 0 14px" }}>¿qué querés hacerte?</p>
            <div style={{ display:"flex", gap:7, marginBottom:14 }}>
              {[["individual","servicio"],["noSe","no sé aún"]].map(([m,l])=>(
                <button key={m} onClick={()=>{ setModo(m); setSvSel(null); }} style={{ ...s.btnGlass, flex:1, fontSize:11, background:modo===m?G.greenM:G.glass, borderColor:modo===m?G.green:G.border, color:modo===m?G.greenL:G.sub }}>{l}</button>
              ))}
            </div>

            {modo==="individual"&&(
              data.servicios.length===0
                ? <p style={{ color:G.muted, fontSize:13 }}>servicios próximamente disponibles...</p>
                : data.servicios.map(sv=>(
                  <div key={sv._id} style={{ ...s.card, borderColor:svSel?._id===sv._id?G.green:G.border, background:svSel?._id===sv._id?"rgba(143,189,90,0.06)":G.card, cursor:"pointer" }}
                    onClick={()=>{ setSvSel(sv); setPaso(2); }}>
                    {sv.fotos?.length>0&&(
                      <div style={{ display:"flex", gap:6, overflowX:"auto", marginBottom:10 }}>
                        {sv.fotos.map((f,i)=><img key={i} src={f} alt="" style={{ width:90, height:70, borderRadius:9, objectFit:"cover", flexShrink:0 }}/>)}
                      </div>
                    )}
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                      <div style={{ flex:1 }}>
                        <p style={{ margin:"0 0 3px", fontFamily:F.serif, fontSize:14 }}>{sv.nombre}</p>
                        {sv.descripcion&&<p style={{ margin:"0 0 7px", fontFamily:F.sans, fontSize:12, color:G.sub }}>{sv.descripcion}</p>}
                        <span style={s.tag}>{sv.duracion}min</span>
                        <p style={{ margin:"4px 0 0", fontFamily:F.sans, fontSize:10, color:G.muted, fontStyle:"italic" }}>* duración estimada</p>
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
                  <p style={{ margin:"0 0 14px", fontFamily:F.sans, fontSize:12, color:G.sub, lineHeight:1.7 }}>Agendá y te asesoran cuando llegués al estudio. Contá qué efecto buscás en las notas.</p>
                  <button style={{ ...s.btnGreen, padding:"10px" }} onClick={()=>setPaso(2)}>agendar →</button>
                </div>
                <div style={{ ...s.card, marginTop:0, cursor:"pointer" }} onClick={()=>openWA(estudio.whatsapp,"Hola! No sé bien qué hacerme, ¿me podés orientar? 🌿")}>
                  <p style={{ ...s.sub, margin:"0 0 4px" }}>¿consultar antes?</p>
                  <p style={{ margin:0, fontFamily:F.sans, fontSize:13, color:G.greenL }}>💬 escribir por WhatsApp</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PASO 2: CALENDARIO + HORA */}
        {paso===2&&(
          <div>
            <button style={{ ...s.btnGlass, marginBottom:14, fontSize:12 }} onClick={()=>setPaso(1)}>← cambiar servicio</button>
            {svSel&&<div style={{ ...s.card, background:"rgba(143,189,90,0.05)", borderColor:G.greenD, marginBottom:16, padding:"9px 14px" }}>
              <p style={{ margin:0, fontFamily:F.sans, fontSize:12, color:G.greenL }}>✦ {svSel.nombre}</p>
            </div>}

            {/* Calendario para clienta */}
            <div style={{ ...s.card, padding:"14px 10px", marginBottom:16 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                <button style={{ ...s.btnGlass, padding:"6px 12px", fontSize:15 }} onClick={()=>setMes(o=>o-1)}>‹</button>
                <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:14, color:G.white, margin:0, textTransform:"capitalize" }}>{MESES[mesN]} {anio}</p>
                <button style={{ ...s.btnGlass, padding:"6px 12px", fontSize:15 }} onClick={()=>setMes(o=>o+1)}>›</button>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", marginBottom:4 }}>
                {DIAS_C.map(d=><div key={d} style={{ textAlign:"center", fontFamily:F.sans, fontSize:10, color:G.muted, padding:"2px 0" }}>{d}</div>)}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
                {Array(primerDia).fill(null).map((_,i)=><div key={"e"+i}/>)}
                {Array(diasMes).fill(null).map((_,i)=>{
                  const dia=i+1, key=fmtKey(dia);
                  const esPasado=key<hoy;
                  const esBloqueado=excFechas.has(key);
                  const ocupadas=citasPorFecha[key]||[];
                  const libres=slots.filter(h=>!ocupadas.includes(h));
                  const sinLugares=libres.length===0&&slots.length>0;
                  const esHoy=key===hoy, esSel=key===diaS;
                  const disabled=esPasado||esBloqueado||sinLugares;
                  return (
                    <div key={dia} onClick={()=>!disabled&&(setDiaS(key),setHoraSel(null))}
                      style={{ textAlign:"center", borderRadius:8, padding:"5px 2px", cursor:disabled?"default":"pointer", opacity:disabled?0.3:1,
                        background:esSel?G.green:esHoy?G.greenM:"transparent",
                        border:esSel?"none":esHoy?`0.5px solid ${G.green}`:"0.5px solid transparent" }}>
                      <span style={{ fontFamily:F.sans, fontSize:12, color:esSel?"#0a0a0a":esHoy?G.greenL:G.sub, fontWeight:esSel||esHoy?700:400, display:"block" }}>{dia}</span>
                      {/* Indicador de slots disponibles */}
                      {!disabled&&!esSel&&(
                        <div style={{ display:"flex", justifyContent:"center", gap:1.5, marginTop:2 }}>
                          {Array(Math.min(libres.length,4)).fill(null).map((_,pi)=>(
                            <div key={pi} style={{ width:2.5,height:2.5,borderRadius:"50%",background:G.green }}/>
                          ))}
                        </div>
                      )}
                      {sinLugares&&<span style={{ fontSize:7, color:G.red }}>✕</span>}
                    </div>
                  );
                })}
              </div>
            </div>
            <p style={{ fontFamily:F.sans, fontSize:11, color:G.muted, marginBottom:12, textAlign:"center" }}>
              los puntitos verdes indican horarios disponibles · ✕ = sin lugar
            </p>

            {/* Slots del día seleccionado */}
            {diaS&&!diaEsBloqueado&&(
              <div>
                <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:15, color:G.white, margin:"0 0 10px" }}>
                  {DIAS_F[new Date(diaS+"T12:00:00").getDay()]} {fmtFecha(diaS)}
                </p>
                {slotsDia.length===0?(
                  <p style={{ color:G.muted, fontSize:13 }}>sin horarios disponibles este día</p>
                ):(
                  <div style={{ display:"flex", flexWrap:"wrap", gap:7, marginBottom:14 }}>
                    {slots.map(h=>{
                      const ocupado=ocupadasDia.includes(h);
                      return (
                        <button key={h} disabled={ocupado} onClick={()=>setHoraSel(h)}
                          style={{ ...s.btnGlass, padding:"10px 14px", fontSize:13, opacity:ocupado?0.25:1,
                            background:horaSel===h?G.greenM:G.glass,
                            borderColor:horaSel===h?G.green:ocupado?"rgba(255,255,255,0.04)":G.border,
                            color:horaSel===h?G.greenL:ocupado?G.muted:G.sub,
                            cursor:ocupado?"not-allowed":"pointer" }}>
                          {h}
                          {ocupado&&<span style={{ display:"block", fontSize:9, color:G.red, marginTop:1 }}>ocupado</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
                {horaSel&&(
                  <>
                    <Field label={modo==="noSe"?"contanos qué efecto buscás (opcional)":"notas (opcional)"}>
                      <textarea style={{ ...s.input, height:65, resize:"none" }} value={notas} onChange={e=>setNotas(e.target.value)} placeholder={modo==="noSe"?"largo, volumen, ocasión especial...":"indicaciones especiales..."}/>
                    </Field>
                    <button style={s.btnGreen} onClick={()=>setPaso(3)}>confirmar →</button>
                  </>
                )}
              </div>
            )}
            {diaEsBloqueado&&<p style={{ color:G.red, fontSize:13, textAlign:"center" }}>🚫 ese día no trabajamos, elegí otro</p>}
          </div>
        )}

        {/* PASO 3: CONFIRMACIÓN */}
        {paso===3&&(
          <div>
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:17, color:G.white, margin:"0 0 3px" }}>confirmá tu cita</p>
            <p style={{ ...s.sub, marginBottom:14 }}>revisá antes de enviar</p>
            <div style={{ ...s.card, background:"rgba(143,189,90,0.05)", borderColor:G.greenD }}>
              {[
                ["servicio",    svSel?.nombre||"a confirmar con el estudio"],
                ["fecha",       fmtFecha(diaS)],
                ["hora",        horaSel],
                ["duración",    svSel?.duracion?`${svSel.duracion}min (est.)`:"a confirmar"],
                ...(notas?[["notas",notas]]:[]),
              ].map(([k,v])=>(
                <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:`0.5px solid ${G.border}` }}>
                  <span style={{ ...s.label, margin:0 }}>{k}</span>
                  <span style={{ fontFamily:F.sans, fontSize:12, color:G.sub, maxWidth:"62%", textAlign:"right" }}>{v}</span>
                </div>
              ))}
            </div>
            <button style={{ ...s.btnGreen, marginTop:14 }} onClick={confirmar}>confirmar y avisar →</button>
            <button style={{ ...s.btnGlass, marginTop:9, width:"100%" }} onClick={()=>setPaso(1)}>modificar</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CLIENTA: HISTORIAL ───────────────────────────────────────────────────────
function CHistorial({ clienta, data }) {
  const hist = Array.isArray(clienta.historial)?clienta.historial:Object.values(clienta.historial||{});
  hist.sort((a,b)=>b.fecha?.localeCompare(a.fecha));

  const curvasUsadas = hist.reduce((acc,h)=>{ if(h.curva) acc[h.curva]=(acc[h.curva]||0)+1; return acc; },{});
  const curvaFav = Object.entries(curvasUsadas).sort((a,b)=>b[1]-a[1])[0]?.[0]||clienta.curva||"—";

  // Servicios más pedidos
  const porServicio = hist.reduce((acc,h)=>{ if(h.servicio) acc[h.servicio]=(acc[h.servicio]||0)+1; return acc; },{});

  // Badge de lealtad
  const badge = hist.length>=10?"⭐ VIP":hist.length>=5?"💎 frecuente":hist.length>=2?"🌿 activa":null;

  return (
    <div>
      <div style={s.topBar}><h1 style={s.h1}>Historial</h1><p style={s.sub}>{hist.length} visitas al estudio</p></div>
      <div style={{ padding:"18px" }}>
        {/* Stats */}
        <div style={{ display:"flex", gap:9, marginBottom:14 }}>
          <StatBox label="visitas" val={hist.length} color={G.green}/>
          <StatBox label="curva fav." val={curvaFav}/>
        </div>

        {/* Badge */}
        {badge&&(
          <div style={{ ...s.card, background:"rgba(143,189,90,0.05)", borderColor:G.greenD, textAlign:"center", padding:"16px", marginBottom:14 }}>
            <p style={{ margin:"0 0 4px", fontFamily:F.serif, fontWeight:700, fontSize:17, color:G.greenL }}>{badge}</p>
            <p style={{ margin:0, fontFamily:F.sans, fontSize:12, color:G.muted }}>
              {hist.length>=10?"sos una clienta VIP del estudio":hist.length>=5?"gracias por tu fidelidad":"gracias por confiar en nosotras"} 💚
            </p>
          </div>
        )}

        {/* Servicios favoritos */}
        {Object.keys(porServicio).length>1&&(
          <>
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:15, color:G.white, margin:"0 0 9px" }}>tus servicios favoritos</p>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:14 }}>
              {Object.entries(porServicio).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([sv,cnt])=>(
                <div key={sv} style={{ background:G.greenM, border:`0.5px solid ${G.green}`, borderRadius:12, padding:"8px 12px" }}>
                  <p style={{ margin:"0 0 2px", fontFamily:F.sans, fontSize:12, color:G.greenL }}>{sv}</p>
                  <p style={{ margin:0, fontFamily:F.sans, fontSize:10, color:G.muted }}>{cnt}x</p>
                </div>
              ))}
            </div>
          </>
        )}

        <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:15, color:G.white, margin:"0 0 9px" }}>todas las visitas</p>
        {hist.length===0&&<p style={{ color:G.muted, fontSize:13 }}>tu historial estará aquí después de tu primera visita ✦</p>}
        {hist.map((h,i)=>(
          <div key={i} style={s.card}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <div>
                <p style={{ margin:"0 0 2px", fontFamily:F.serif, fontSize:14 }}>{h.servicio}</p>
                <p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:G.muted }}>{fmtFecha(h.fecha)}</p>
              </div>
              {h.curva&&<span style={s.tag}>curva {h.curva}</span>}
            </div>
            {h.notas&&<p style={{ margin:0, fontFamily:F.sans, fontSize:11, color:G.muted }}>✦ {h.notas}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CLIENTA: PERFIL ──────────────────────────────────────────────────────────
function CPerfil({ clienta, data, onLogout }) {
  const [editando, setEditando] = useState(false);
  const [foto,     setFoto]     = useState(null);
  const [form, setForm] = useState({ nombre:clienta.nombre||"", telefono:clienta.telefono||"", emergencia:"" });
  const [saving,   setSaving]   = useState(false);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const politicas = data.getConfig("politicas", []);
  const estudio   = data.getConfig("estudio", {});

  const onFoto = (e) => {
    const f=e.target.files?.[0]; if(!f) return;
    const r=new FileReader(); r.onload=ev=>setFoto(ev.target.result); r.readAsDataURL(f);
  };

  // NOTE: guardar cambios actualiza Firebase para los campos editables del perfil
  const guardar = async () => {
    setSaving(true);
    // Solo actualiza campos permitidos (no email, no datos técnicos)
    await db.update(`clientas/${clienta._id}`, { nombre:form.nombre, telefono:form.telefono, emergencia:form.emergencia });
    setSaving(false); setEditando(false);
  };

  return (
    <div>
      <div style={s.topBar}><h1 style={s.h1}>Mi Perfil</h1><p style={s.sub}>tus datos</p></div>
      <div style={{ padding:"18px" }}>
        {/* Avatar */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", marginBottom:22 }}>
          <div style={{ position:"relative", marginBottom:10 }}>
            {foto
              ?<img src={foto} alt="perfil" style={{ width:78, height:78, borderRadius:"50%", objectFit:"cover", border:`2px solid ${G.green}` }}/>
              :<Avatar nombre={clienta.nombre} size={78}/>}
            {editando&&(
              <label htmlFor="foto-input" style={{ position:"absolute", bottom:0, right:0, width:26, height:26, borderRadius:"50%", background:G.green, border:`1.5px solid #0a0a0a`, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:13 }}>📷</label>
            )}
            <input id="foto-input" type="file" accept="image/*" style={{ display:"none" }} onChange={onFoto}/>
          </div>
          <p style={{ margin:"0 0 4px", fontFamily:F.serif, fontWeight:700, fontSize:18 }}>{clienta.nombre}</p>
          <span style={s.tag}>clienta activa</span>
        </div>

        <div style={{ display:"flex", gap:8, marginBottom:16 }}>
          <button style={{ ...s.btnGlass, flex:1, fontSize:12 }} onClick={()=>setEditando(e=>!e)}>{editando?"cancelar":"✎ editar mis datos"}</button>
        </div>

        {/* Datos editables */}
        <div style={{ ...s.card, display:"flex", flexDirection:"column", gap:12 }}>
          <div>
            <label style={s.label}>nombre</label>
            {editando?<input style={s.input} value={form.nombre} onChange={e=>set("nombre",e.target.value)}/>:<p style={{ margin:0, fontFamily:F.sans, fontSize:13, color:G.sub }}>{clienta.nombre||"—"}</p>}
          </div>
          <div>
            <label style={s.label}>email</label>
            <p style={{ margin:0, fontFamily:F.sans, fontSize:13, color:G.muted }}>{clienta.email||"—"}</p>
            {editando&&<p style={{ margin:"4px 0 0", fontFamily:F.sans, fontSize:10, color:G.muted }}>el email no se puede cambiar desde aquí</p>}
          </div>
          <div>
            <label style={s.label}>teléfono</label>
            {editando?<input style={s.input} value={form.telefono} onChange={e=>set("telefono",e.target.value)} type="tel"/>:<p style={{ margin:0, fontFamily:F.sans, fontSize:13, color:G.sub }}>{clienta.telefono||"—"}</p>}
          </div>
          {editando&&(
            <div>
              <label style={s.label}>contacto de emergencia</label>
              <input style={s.input} value={form.emergencia} onChange={e=>set("emergencia",e.target.value)} placeholder="nombre y teléfono..."/>
            </div>
          )}
          {editando&&<button style={{ ...s.btnGreen, opacity:saving?0.6:1 }} onClick={guardar} disabled={saving}>{saving?"guardando...":"guardar cambios →"}</button>}
        </div>

        {/* Preferencias técnicas (solo lectura) */}
        {(clienta.curva||clienta.grosor||clienta.largo)&&(
          <div style={{ marginTop:12 }}>
            <p style={{ fontFamily:F.serif, fontWeight:700, fontSize:15, color:G.white, margin:"0 0 9px" }}>mis preferencias</p>
            <div style={s.card}>
              {[["curva habitual",clienta.curva],["grosor",clienta.grosor?`${clienta.grosor}`:""],["largo",clienta.largo]].filter(([,v])=>v).map(([l,v])=>(
                <div key={l} style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                  <span style={{ ...s.label, margin:0 }}>{l}</span>
                  <span style={s.tag}>{v}</span>
                </div>
              ))}
              <p style={{ margin:"6px 0 0", fontFamily:F.sans, fontSize:10, color:G.muted }}>estas preferencias las actualiza tu lashista</p>
            </div>
          </div>
        )}

        {/* Políticas */}
        {politicas.length>0&&(
          <div style={{ ...s.card, marginTop:12, background:"rgba(143,189,90,0.03)", borderColor:G.border }}>
            <p style={{ margin:"0 0 9px", fontFamily:F.serif, fontWeight:700, fontSize:14 }}>Políticas del Estudio</p>
            {politicas.map((p,i)=><p key={i} style={{ margin:"0 0 7px", fontFamily:F.sans, fontSize:12, color:G.sub }}>✦ {p}</p>)}
          </div>
        )}

        <button style={{ ...s.btnRed, marginTop:18, width:"100%" }} onClick={onLogout}>cerrar sesión</button>
      </div>
    </div>
  );
}
