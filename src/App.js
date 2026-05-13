import { useState } from "react";

// ─── DATOS DE EJEMPLO ────────────────────────────────────────────────────────
const SERVICIOS = [
  { id: 1, nombre: "Classic Full Set", precio: 12000, duracion: 90, emoji: "✦", desc: "Extensiones clásicas pelo a pelo", color: "#b5c99a" },
  { id: 2, nombre: "Volume Set", precio: 18000, duracion: 120, emoji: "✦✦", desc: "Efecto volumen con técnica rusa", color: "#8fad76" },
  { id: 3, nombre: "Mega Volume", precio: 22000, duracion: 150, emoji: "✦✦✦", desc: "Máximo volumen y densidad", color: "#658c4d" },
  { id: 4, nombre: "Classic Refill", precio: 7000, duracion: 60, emoji: "↺", desc: "Relleno clásico 2-3 semanas", color: "#c9d9b5" },
  { id: 5, nombre: "Volume Refill", precio: 10000, duracion: 75, emoji: "↺↺", desc: "Relleno volumen 2-3 semanas", color: "#a8c285" },
  { id: 6, nombre: "Lifting + Tinte", precio: 9500, duracion: 60, emoji: "◎", desc: "Laminado y tinte de pestañas naturales", color: "#d4e6c0" },
];

const CURVAS = ["B", "C", "CC", "D", "L", "L+"];
const GROSOR = ["0.05", "0.07", "0.10", "0.12", "0.15", "0.20"];
const LARGO = ["8mm", "9mm", "10mm", "11mm", "12mm", "13mm", "14mm"];

const CLIENTAS = [
  {
    id: 1, nombre: "Valentina Torres", telefono: "1145678901", mail: "vale@mail.com",
    foto: null, curva: "CC", grosor: "0.07", largo: "12mm",
    alergias: "Ninguna", observaciones: "Prefiere look natural",
    historial: [
      { fecha: "2025-04-28", servicio: "Classic Full Set", pago: "transferencia", monto: 12000, curva: "CC", notas: "Quedó encantada" },
      { fecha: "2025-03-14", servicio: "Classic Refill", pago: "efectivo", monto: 7000, curva: "CC", notas: "" },
    ]
  },
  {
    id: 2, nombre: "Sofía Ramírez", telefono: "1167890234", mail: "sofi@mail.com",
    foto: null, curva: "D", grosor: "0.10", largo: "14mm",
    alergias: "Sensibilidad al adhesivo", observaciones: "Usar adhesivo sensitive",
    historial: [
      { fecha: "2025-04-20", servicio: "Volume Set", pago: "transferencia", monto: 18000, curva: "D", notas: "Primera vez, quedó feliz" },
    ]
  },
  {
    id: 3, nombre: "Lucía Fernández", telefono: "1123456789", mail: "luci@mail.com",
    foto: null, curva: "C", grosor: "0.07", largo: "11mm",
    alergias: "Ninguna", observaciones: "",
    historial: [
      { fecha: "2025-05-02", servicio: "Lifting + Tinte", pago: "efectivo", monto: 9500, curva: "C", notas: "" },
      { fecha: "2025-04-05", servicio: "Classic Full Set", pago: "transferencia", monto: 12000, curva: "C", notas: "" },
      { fecha: "2025-02-20", servicio: "Classic Refill", pago: "efectivo", monto: 7000, curva: "C", notas: "" },
    ]
  },
];

const CITAS = [
  { id: 1, clientaId: 1, clienta: "Valentina Torres", fecha: "2025-05-14", hora: "10:00", servicio: "Classic Refill", estado: "confirmada", notas: "" },
  { id: 2, clientaId: 2, clienta: "Sofía Ramírez", fecha: "2025-05-14", hora: "12:00", servicio: "Volume Refill", estado: "confirmada", notas: "Adhesivo sensitive" },
  { id: 3, clientaId: 3, clienta: "Lucía Fernández", fecha: "2025-05-16", hora: "15:00", servicio: "Classic Refill", estado: "pendiente", notas: "" },
  { id: 4, clientaId: 1, clienta: "Valentina Torres", fecha: "2025-05-21", hora: "10:00", servicio: "Classic Refill", estado: "pendiente", notas: "" },
];

// Número de WhatsApp
const WA_NUMBER = "541126509699";
const openWA = (msg = "") => window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");

// ─── ESTILOS GLOBALES ─────────────────────────────────────────────────────────
const G = {
  bg: "#0a0a0a",
  bgCard: "rgba(255,255,255,0.04)",
  bgCardHover: "rgba(255,255,255,0.07)",
  bgGlass: "rgba(255,255,255,0.06)",
  border: "rgba(255,255,255,0.08)",
  borderHover: "rgba(255,255,255,0.16)",
  green: "#8fbd5a",
  greenDark: "#5c8f2e",
  greenLight: "#b5d98a",
  greenMuted: "rgba(143,189,90,0.15)",
  text: "#f0f0f0",
  textMuted: "rgba(240,240,240,0.45)",
  textSub: "rgba(240,240,240,0.65)",
  white: "#ffffff",
  red: "#e07070",
  amber: "#e0b870",
};

const css = {
  app: {
    minHeight: "100vh",
    background: G.bg,
    color: G.text,
    fontFamily: "'Georgia', 'Times New Roman', serif",
    maxWidth: 430,
    margin: "0 auto",
    position: "relative",
    overflowX: "hidden",
  },
  screen: { minHeight: "100vh", paddingBottom: 100 },
  topBar: {
    padding: "52px 24px 16px",
    borderBottom: `0.5px solid ${G.border}`,
    background: "rgba(10,10,10,0.92)",
    backdropFilter: "blur(20px)",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  title: {
    fontFamily: "'Georgia', serif",
    fontWeight: 700,
    fontSize: 26,
    letterSpacing: "-0.5px",
    color: G.white,
    margin: 0,
  },
  subtitle: {
    fontFamily: "'Courier New', monospace",
    fontWeight: 400,
    fontSize: 11,
    letterSpacing: "0.12em",
    textTransform: "lowercase",
    color: G.textMuted,
    margin: "4px 0 0",
  },
  card: {
    background: G.bgCard,
    border: `0.5px solid ${G.border}`,
    borderRadius: 16,
    padding: "16px 18px",
    marginBottom: 12,
    backdropFilter: "blur(10px)",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  glassBtn: {
    background: G.bgGlass,
    border: `0.5px solid ${G.borderHover}`,
    borderRadius: 12,
    padding: "10px 18px",
    color: G.text,
    fontFamily: "'Courier New', monospace",
    fontSize: 12,
    letterSpacing: "0.08em",
    cursor: "pointer",
    backdropFilter: "blur(8px)",
    transition: "all 0.2s ease",
  },
  greenBtn: {
    background: G.green,
    border: "none",
    borderRadius: 12,
    padding: "12px 24px",
    color: "#0a0a0a",
    fontFamily: "'Courier New', monospace",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.1em",
    cursor: "pointer",
    transition: "all 0.2s ease",
    width: "100%",
  },
  input: {
    background: "rgba(255,255,255,0.05)",
    border: `0.5px solid ${G.border}`,
    borderRadius: 10,
    padding: "11px 14px",
    color: G.text,
    fontFamily: "'Courier New', monospace",
    fontSize: 13,
    width: "100%",
    outline: "none",
    boxSizing: "border-box",
  },
  label: {
    fontFamily: "'Courier New', monospace",
    fontSize: 10,
    letterSpacing: "0.12em",
    textTransform: "lowercase",
    color: G.textMuted,
    display: "block",
    marginBottom: 6,
  },
  tag: {
    background: G.greenMuted,
    border: `0.5px solid ${G.green}`,
    borderRadius: 20,
    padding: "3px 10px",
    fontSize: 11,
    color: G.greenLight,
    fontFamily: "'Courier New', monospace",
    letterSpacing: "0.05em",
    display: "inline-block",
    marginRight: 6,
    marginBottom: 4,
  },
  bottomNav: {
    position: "fixed",
    bottom: 0,
    left: "50%",
    transform: "translateX(-50%)",
    width: "100%",
    maxWidth: 430,
    background: "rgba(10,10,10,0.92)",
    backdropFilter: "blur(20px)",
    borderTop: `0.5px solid ${G.border}`,
    display: "flex",
    zIndex: 20,
    padding: "8px 0 20px",
  },
  navItem: (active) => ({
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 3,
    padding: "8px 0",
    cursor: "pointer",
    color: active ? G.green : G.textMuted,
    transition: "color 0.2s ease",
  }),
  navIcon: { fontSize: 20 },
  navLabel: {
    fontFamily: "'Courier New', monospace",
    fontSize: 9,
    letterSpacing: "0.1em",
    textTransform: "lowercase",
  },
  fab: {
    position: "fixed",
    bottom: 90,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: "50%",
    background: G.green,
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 22,
    boxShadow: `0 4px 20px rgba(143,189,90,0.4)`,
    zIndex: 30,
    transition: "transform 0.2s ease",
  },
  divider: {
    height: 0.5,
    background: G.border,
    margin: "16px 0",
  },
  statCard: {
    background: G.bgCard,
    border: `0.5px solid ${G.border}`,
    borderRadius: 14,
    padding: "14px 16px",
    flex: 1,
  },
  statLabel: {
    fontFamily: "'Courier New', monospace",
    fontSize: 9,
    letterSpacing: "0.12em",
    textTransform: "lowercase",
    color: G.textMuted,
    margin: "0 0 4px",
  },
  statVal: {
    fontFamily: "'Georgia', serif",
    fontWeight: 700,
    fontSize: 22,
    color: G.white,
    margin: 0,
  },
  sectionTitle: {
    fontFamily: "'Georgia', serif",
    fontWeight: 700,
    fontSize: 18,
    color: G.white,
    margin: "0 0 4px",
  },
  sectionSub: {
    fontFamily: "'Courier New', monospace",
    fontSize: 10,
    letterSpacing: "0.1em",
    textTransform: "lowercase",
    color: G.textMuted,
    margin: "0 0 16px",
  },
};

// ─── COMPONENTES COMUNES ──────────────────────────────────────────────────────
function Avatar({ nombre, size = 40, color = G.greenMuted }) {
  const initials = nombre.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: color, border: `0.5px solid ${G.green}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Georgia', serif", fontWeight: 700,
      fontSize: size * 0.32, color: G.greenLight, flexShrink: 0,
    }}>{initials}</div>
  );
}

function FAB() {
  return (
    <button style={css.fab} onClick={() => openWA("Hola Male! Tengo una consulta 💚")} title="Preguntale a Male">
      💬
    </button>
  );
}

function BackBtn({ onBack, label = "volver" }) {
  return (
    <button onClick={onBack} style={{ ...css.glassBtn, marginBottom: 16, fontSize: 11 }}>
      ← {label}
    </button>
  );
}

// ─── PANTALLA LOGIN ───────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [modo, setModo] = useState(null); // "admin" | "clienta"
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    if (modo === "admin") {
      if (user === "male" && pass === "1234") { onLogin("admin"); }
      else { setError("credenciales incorrectas"); }
    } else {
      const c = CLIENTAS.find(c => c.nombre.toLowerCase().includes(user.toLowerCase()));
      if (c && pass === "1234") { onLogin("clienta", c); }
      else { setError("usuaria no encontrada"); }
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: G.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32 }}>
      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🌿</div>
        <h1 style={{ ...css.title, fontSize: 34, letterSpacing: 2, textAlign: "center" }}>Lash Studio</h1>
        <p style={{ ...css.subtitle, textAlign: "center", marginTop: 8 }}>by chulas</p>
        <div style={{ width: 40, height: 1, background: G.green, margin: "16px auto" }} />
        <p style={{ ...css.subtitle, color: G.textMuted, textAlign: "center" }}>san andrés · buenos aires</p>
      </div>

      {!modo ? (
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ ...css.subtitle, textAlign: "center", marginBottom: 8 }}>acceder como</p>
          <button style={{ ...css.card, textAlign: "center", cursor: "pointer", border: `0.5px solid ${G.green}` }} onClick={() => setModo("admin")}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>👑</div>
            <p style={{ ...css.sectionTitle, fontSize: 15 }}>Lashista</p>
            <p style={{ ...css.subtitle }}>acceso al panel de male</p>
          </button>
          <button style={{ ...css.card, textAlign: "center", cursor: "pointer" }} onClick={() => setModo("clienta")}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>🌸</div>
            <p style={{ ...css.sectionTitle, fontSize: 15 }}>Clienta</p>
            <p style={{ ...css.subtitle }}>mi espacio personal</p>
          </button>
        </div>
      ) : (
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
          <button onClick={() => { setModo(null); setError(""); }} style={{ ...css.glassBtn, alignSelf: "flex-start", marginBottom: 8 }}>← volver</button>
          <div style={{ textAlign: "center", marginBottom: 8 }}>
            <span style={css.tag}>{modo === "admin" ? "panel lashista" : "acceso clienta"}</span>
          </div>
          <div>
            <label style={css.label}>{modo === "admin" ? "usuario" : "nombre"}</label>
            <input style={css.input} value={user} onChange={e => setUser(e.target.value)} placeholder={modo === "admin" ? "male" : "tu nombre"} />
          </div>
          <div>
            <label style={css.label}>contraseña</label>
            <input style={css.input} type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••" onKeyDown={e => e.key === "Enter" && handleLogin()} />
          </div>
          {error && <p style={{ color: G.red, fontFamily: "'Courier New', monospace", fontSize: 11, textAlign: "center" }}>{error}</p>}
          <button style={css.greenBtn} onClick={handleLogin}>ingresar →</button>
          <p style={{ ...css.subtitle, textAlign: "center", color: G.textMuted, fontSize: 10 }}>
            {modo === "admin" ? "usuario: male / pass: 1234" : "tu nombre / pass: 1234"}
          </p>
        </div>
      )}
      <p style={{ ...css.subtitle, marginTop: 40, color: G.textMuted, fontSize: 9, textAlign: "center" }}>
        consultas → {" "}
        <span style={{ color: G.green, cursor: "pointer" }} onClick={() => openWA()}>whatsapp</span>
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── VISTA ADMIN ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

function AdminApp({ onLogout }) {
  const [tab, setTab] = useState("dashboard");
  const [subScreen, setSubScreen] = useState(null);
  const [subData, setSubData] = useState(null);

  const navigate = (screen, data = null) => { setSubScreen(screen); setSubData(data); };
  const back = () => { setSubScreen(null); setSubData(null); };

  const navItems = [
    { id: "dashboard", icon: "⬡", label: "inicio" },
    { id: "agenda", icon: "◷", label: "agenda" },
    { id: "clientas", icon: "✿", label: "clientas" },
    { id: "finanzas", icon: "◈", label: "finanzas" },
    { id: "config", icon: "⚙", label: "config" },
  ];

  const renderMain = () => {
    if (subScreen === "clienta-detalle") return <ClientaDetalle clienta={subData} onBack={back} onNavigate={navigate} />;
    if (subScreen === "nueva-cita") return <NuevaCita onBack={back} />;
    if (subScreen === "cita-detalle") return <CitaDetalle cita={subData} onBack={back} />;
    switch (tab) {
      case "dashboard": return <AdminDashboard onNavigate={navigate} setTab={setTab} />;
      case "agenda": return <AdminAgenda onNavigate={navigate} />;
      case "clientas": return <AdminClientas onNavigate={navigate} />;
      case "finanzas": return <AdminFinanzas />;
      case "config": return <AdminConfig />;
      default: return <AdminDashboard onNavigate={navigate} setTab={setTab} />;
    }
  };

  return (
    <div style={css.app}>
      <div style={css.screen}>{renderMain()}</div>
      <nav style={css.bottomNav}>
        {navItems.map(n => (
          <div key={n.id} style={css.navItem(tab === n.id && !subScreen)} onClick={() => { setTab(n.id); back(); }}>
            <span style={css.navIcon}>{n.icon}</span>
            <span style={css.navLabel}>{n.label}</span>
            {tab === n.id && !subScreen && <div style={{ width: 4, height: 4, borderRadius: "50%", background: G.green }} />}
          </div>
        ))}
      </nav>
      <FAB />
    </div>
  );
}

// ─── ADMIN: DASHBOARD ─────────────────────────────────────────────────────────
function AdminDashboard({ onNavigate, setTab }) {
  const citasHoy = CITAS.filter(c => c.fecha === "2025-05-14");
  const ingresosEsteMes = CLIENTAS.flatMap(c => c.historial)
    .filter(h => h.fecha.startsWith("2025-05"))
    .reduce((a, h) => a + h.monto, 0);

  return (
    <div>
      <div style={css.topBar}>
        <h1 style={css.title}>Lash Studio</h1>
        <p style={css.subtitle}>panel lashista · male</p>
      </div>
      <div style={{ padding: "20px 20px 0" }}>
        {/* Stats rápidas — CLICKEABLES */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          {/* HOY → Agenda filtrada a hoy */}
          <div
            style={{ ...css.statCard, cursor: "pointer", border: `0.5px solid ${G.border}`, transition: "border-color 0.2s" }}
            onClick={() => setTab("agenda")}
            onMouseEnter={e => e.currentTarget.style.borderColor = G.green}
            onMouseLeave={e => e.currentTarget.style.borderColor = G.border}
          >
            <p style={css.statLabel}>hoy</p>
            <p style={css.statVal}>{citasHoy.length}</p>
            <p style={{ ...css.subtitle, fontSize: 10, margin: 0, color: G.green }}>ver →</p>
          </div>
          {/* ESTE MES → Finanzas */}
          <div
            style={{ ...css.statCard, cursor: "pointer", border: `0.5px solid ${G.border}`, transition: "border-color 0.2s" }}
            onClick={() => setTab("finanzas")}
            onMouseEnter={e => e.currentTarget.style.borderColor = G.green}
            onMouseLeave={e => e.currentTarget.style.borderColor = G.border}
          >
            <p style={css.statLabel}>este mes</p>
            <p style={{ ...css.statVal, fontSize: 16 }}>${(ingresosEsteMes / 1000).toFixed(0)}k</p>
            <p style={{ ...css.subtitle, fontSize: 10, margin: 0, color: G.green }}>ver →</p>
          </div>
          {/* CLIENTAS → Tab clientas */}
          <div
            style={{ ...css.statCard, cursor: "pointer", border: `0.5px solid ${G.border}`, transition: "border-color 0.2s" }}
            onClick={() => setTab("clientas")}
            onMouseEnter={e => e.currentTarget.style.borderColor = G.green}
            onMouseLeave={e => e.currentTarget.style.borderColor = G.border}
          >
            <p style={css.statLabel}>clientas</p>
            <p style={css.statVal}>{CLIENTAS.length}</p>
            <p style={{ ...css.subtitle, fontSize: 10, margin: 0, color: G.green }}>ver →</p>
          </div>
        </div>

        {/* Citas de hoy */}
        <p style={css.sectionTitle}>hoy</p>
        <p style={css.sectionSub}>martes 14 de mayo</p>
        {citasHoy.length === 0 ? (
          <p style={{ color: G.textMuted, fontFamily: "Courier New", fontSize: 12 }}>sin citas para hoy ✦</p>
        ) : (
          citasHoy.map(c => (
            <div key={c.id} style={{ ...css.card, display: "flex", alignItems: "center", gap: 12 }} onClick={() => onNavigate("cita-detalle", c)}>
              <div style={{ textAlign: "center", minWidth: 40 }}>
                <p style={{ margin: 0, fontFamily: "'Georgia', serif", fontWeight: 700, fontSize: 15, color: G.green }}>{c.hora}</p>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: "0 0 2px", fontFamily: "'Georgia', serif", fontWeight: 600, fontSize: 14 }}>{c.clienta}</p>
                <p style={{ margin: 0, ...css.subtitle, fontSize: 10 }}>{c.servicio}</p>
              </div>
              <span style={{ ...css.tag, fontSize: 9, padding: "2px 8px" }}>{c.estado}</span>
            </div>
          ))
        )}

        <div style={css.divider} />

        {/* Próximas */}
        <p style={css.sectionTitle}>próximas</p>
        <p style={css.sectionSub}>esta semana</p>
        {CITAS.filter(c => c.fecha > "2025-05-14").slice(0, 3).map(c => (
          <div key={c.id} style={{ ...css.card, display: "flex", alignItems: "center", gap: 12 }} onClick={() => onNavigate("cita-detalle", c)}>
            <div style={{ textAlign: "center", minWidth: 40 }}>
              <p style={{ margin: 0, fontFamily: "'Courier New', monospace", fontSize: 10, color: G.textMuted }}>{c.fecha.slice(5).replace("-", "/")}</p>
              <p style={{ margin: 0, fontFamily: "'Georgia', serif", fontWeight: 700, fontSize: 14, color: G.green }}>{c.hora}</p>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: "0 0 2px", fontFamily: "'Georgia', serif", fontSize: 14 }}>{c.clienta}</p>
              <p style={{ margin: 0, ...css.subtitle, fontSize: 10 }}>{c.servicio}</p>
            </div>
          </div>
        ))}

        <button style={{ ...css.greenBtn, marginTop: 8 }} onClick={() => setTab("agenda")}>ver agenda completa →</button>

        <div style={css.divider} />

        {/* Top clientas */}
        <p style={css.sectionTitle}>clientas activas</p>
        <p style={css.sectionSub}>últimas visitas</p>
        {CLIENTAS.slice(0, 3).map(c => (
          <div key={c.id} style={{ ...css.card, display: "flex", alignItems: "center", gap: 12 }} onClick={() => onNavigate("clienta-detalle", c)}>
            <Avatar nombre={c.nombre} />
            <div style={{ flex: 1 }}>
              <p style={{ margin: "0 0 2px", fontFamily: "'Georgia', serif", fontSize: 14 }}>{c.nombre}</p>
              <p style={{ margin: 0, ...css.subtitle, fontSize: 10 }}>curva {c.curva} · {c.largo}</p>
            </div>
            <span style={{ ...css.tag, fontSize: 10 }}>{c.historial.length} vis.</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ADMIN: AGENDA ────────────────────────────────────────────────────────────
const TODOS_LOS_SLOTS = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

function AdminAgenda({ onNavigate }) {
  // Usamos mayo 2025 como mes activo (hardcoded para el demo; con Firebase será dinámico)
  const [mesOffset, setMesOffset] = useState(0); // 0 = mayo 2025
  const [diaSeleccionado, setDiaSeleccionado] = useState("2025-05-14"); // hoy por defecto

  // ── Helpers de fecha ──
  const baseYear = 2025, baseMes = 4; // mes 4 = mayo (0-indexed)
  const mesActual = new Date(baseYear, baseMes + mesOffset, 1);
  const anio = mesActual.getFullYear();
  const mes = mesActual.getMonth(); // 0-indexed
  const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const DIAS_CORTOS = ["D", "L", "M", "X", "J", "V", "S"];

  // Días del mes
  const primerDia = new Date(anio, mes, 1).getDay(); // 0=dom
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();

  // Índice de citas por fecha
  const citasPorFecha = {};
  CITAS.forEach(c => { if (!citasPorFecha[c.fecha]) citasPorFecha[c.fecha] = []; citasPorFecha[c.fecha].push(c); });

  const fmtDateKey = (d) => {
    const mm = String(mes + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    return `${anio}-${mm}-${dd}`;
  };

  // Citas del día seleccionado
  const citasDia = citasPorFecha[diaSeleccionado] || [];
  const ocupadasDia = citasDia.map(c => c.hora);
  const [dd, mm2] = [diaSeleccionado.slice(8), diaSeleccionado.slice(5, 7)];
  const fmtDiaSel = `${parseInt(dd)} de ${MESES[parseInt(mm2) - 1]}`;
  const dtSel = new Date(diaSeleccionado + "T12:00:00");
  const DIAS_FULL = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

  // Recordatorio mañana: citas del día siguiente al seleccionado
  const dtManana = new Date(diaSeleccionado + "T12:00:00");
  dtManana.setDate(dtManana.getDate() + 1);
  const mananaKey = dtManana.toISOString().slice(0, 10);
  const citasManana = citasPorFecha[mananaKey] || [];

  return (
    <div>
      <div style={css.topBar}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={css.title}>Agenda</h1>
            <p style={css.subtitle}>calendario del estudio</p>
          </div>
          <button style={{ ...css.glassBtn, fontSize: 11, padding: "8px 14px", background: G.greenMuted, borderColor: G.green, color: "#0a0a0a", fontWeight: 700 }}
            onClick={() => onNavigate("nueva-cita")}>+ nueva</button>
        </div>
      </div>

      <div style={{ padding: "20px 16px 0" }}>

        {/* ── CALENDARIO ── */}
        <div style={{ ...css.card, padding: "16px 12px", marginBottom: 20 }}>
          {/* Navegación mes */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <button style={{ ...css.glassBtn, padding: "6px 12px", fontSize: 14 }} onClick={() => setMesOffset(o => o - 1)}>‹</button>
            <p style={{ margin: 0, fontFamily: "'Georgia', serif", fontWeight: 700, fontSize: 15, color: G.white, textTransform: "capitalize" }}>
              {MESES[mes]} {anio}
            </p>
            <button style={{ ...css.glassBtn, padding: "6px 12px", fontSize: 14 }} onClick={() => setMesOffset(o => o + 1)}>›</button>
          </div>

          {/* Cabecera días */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 6 }}>
            {DIAS_CORTOS.map(d => (
              <div key={d} style={{ textAlign: "center", fontFamily: "'Courier New', monospace", fontSize: 10, color: G.textMuted, padding: "2px 0", letterSpacing: "0.05em" }}>{d}</div>
            ))}
          </div>

          {/* Grilla de días */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
            {/* celdas vacías antes del primer día */}
            {Array(primerDia).fill(null).map((_, i) => <div key={"e" + i} />)}
            {Array(diasEnMes).fill(null).map((_, i) => {
              const dia = i + 1;
              const key = fmtDateKey(dia);
              const tieneCitas = !!(citasPorFecha[key]?.length);
              const esHoy = key === "2025-05-14";
              const esSel = key === diaSeleccionado;
              const cantCitas = citasPorFecha[key]?.length || 0;
              return (
                <div key={dia} onClick={() => setDiaSeleccionado(key)}
                  style={{
                    textAlign: "center", borderRadius: 8, padding: "5px 2px", cursor: "pointer",
                    background: esSel ? G.green : esHoy ? G.greenMuted : "transparent",
                    border: esSel ? "none" : esHoy ? `0.5px solid ${G.green}` : "0.5px solid transparent",
                    transition: "all 0.15s",
                    position: "relative",
                  }}>
                  <span style={{
                    fontFamily: "'Courier New', monospace", fontSize: 12,
                    color: esSel ? "#0a0a0a" : esHoy ? G.greenLight : G.textSub,
                    fontWeight: esSel || esHoy ? 700 : 400,
                    display: "block",
                  }}>{dia}</span>
                  {tieneCitas && !esSel && (
                    <div style={{ display: "flex", justifyContent: "center", gap: 2, marginTop: 2 }}>
                      {Array(Math.min(cantCitas, 3)).fill(null).map((_, pi) => (
                        <div key={pi} style={{ width: 3, height: 3, borderRadius: "50%", background: esHoy ? G.green : G.greenDark }} />
                      ))}
                    </div>
                  )}
                  {tieneCitas && esSel && (
                    <div style={{ display: "flex", justifyContent: "center", gap: 2, marginTop: 2 }}>
                      {Array(Math.min(cantCitas, 3)).fill(null).map((_, pi) => (
                        <div key={pi} style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(10,10,10,0.5)" }} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── DETALLE DEL DÍA SELECCIONADO ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: G.green, flexShrink: 0 }} />
          <p style={{ margin: 0, fontFamily: "'Georgia', serif", fontWeight: 700, fontSize: 16, color: G.white }}>
            {DIAS_FULL[dtSel.getDay()]} {fmtDiaSel}
          </p>
          {citasDia.length > 0 && <span style={{ ...css.tag, fontSize: 9 }}>{citasDia.length} citas</span>}
        </div>

        {/* Recordatorio masivo si hay citas mañana */}
        {citasManana.length > 0 && (
          <div style={{ ...css.card, background: "rgba(143,189,90,0.06)", borderColor: G.greenDark, marginBottom: 14, padding: "12px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ margin: "0 0 2px", fontFamily: "'Courier New', monospace", fontSize: 10, color: G.greenLight, letterSpacing: "0.1em" }}>recordatorio masivo</p>
                <p style={{ margin: 0, fontFamily: "'Georgia', serif", fontSize: 13 }}>{citasManana.length} cita{citasManana.length > 1 ? "s" : ""} mañana</p>
              </div>
              <button style={{ ...css.glassBtn, fontSize: 10, padding: "7px 12px", borderColor: G.green, color: G.greenLight }}
                onClick={() => {
                  citasManana.forEach(c => {
                    const nombre = c.clienta.split(" ")[0];
                    openWA(`Hola ${nombre}! 🌿 Te recuerdo que mañana tenés tu cita a las ${c.hora} en el estudio. ¡Te espero! 💚`);
                  });
                }}>
                enviar a todas →
              </button>
            </div>
          </div>
        )}

        {/* Slots del día */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
          {TODOS_LOS_SLOTS.map(hora => {
            const cita = citasDia.find(c => c.hora === hora);
            const libre = !cita;
            return (
              <div key={hora} style={{
                display: "flex", alignItems: "center", gap: 12,
                background: libre ? "rgba(255,255,255,0.02)" : G.bgCard,
                border: `0.5px solid ${libre ? "rgba(255,255,255,0.04)" : G.border}`,
                borderRadius: 12, padding: "10px 14px",
                opacity: libre ? 0.6 : 1,
              }}>
                {/* Hora */}
                <div style={{
                  minWidth: 46, background: libre ? "transparent" : G.greenMuted,
                  border: `0.5px solid ${libre ? G.border : G.green}`,
                  borderRadius: 8, padding: "6px 4px", textAlign: "center",
                }}>
                  <p style={{ margin: 0, fontFamily: "'Georgia', serif", fontWeight: 700, fontSize: 13, color: libre ? G.textMuted : G.greenLight }}>{hora}</p>
                </div>

                {libre ? (
                  <div style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <p style={{ margin: 0, fontFamily: "'Courier New', monospace", fontSize: 11, color: G.textMuted }}>disponible</p>
                    <button style={{ ...css.glassBtn, fontSize: 10, padding: "5px 10px" }}
                      onClick={() => onNavigate("nueva-cita")}>+ agendar</button>
                  </div>
                ) : (
                  <>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: "0 0 2px", fontFamily: "'Georgia', serif", fontSize: 13 }}>{cita.clienta}</p>
                      <p style={{ margin: 0, fontFamily: "'Courier New', monospace", fontSize: 10, color: G.textMuted }}>{cita.servicio}</p>
                      {cita.notas && <p style={{ margin: "3px 0 0", fontFamily: "'Courier New', monospace", fontSize: 9, color: G.textMuted }}>⚠ {cita.notas}</p>}
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ ...css.tag, fontSize: 8, padding: "2px 6px", marginRight: 0 }}>{cita.estado}</span>
                      {/* Botón WA recordatorio individual */}
                      <button
                        title="Recordatorio por WhatsApp"
                        style={{ background: "rgba(37,211,102,0.12)", border: "0.5px solid rgba(37,211,102,0.35)", borderRadius: 8, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 14, flexShrink: 0 }}
                        onClick={e => {
                          e.stopPropagation();
                          const nombre = cita.clienta.split(" ")[0];
                          openWA(`Hola ${nombre}! 🌿 Te recuerdo que mañana tenés tu cita a las ${cita.hora} en el estudio. ¡Te espero! 💚`);
                        }}>
                        💬
                      </button>
                      <button
                        style={{ ...css.glassBtn, padding: "5px 8px", fontSize: 10 }}
                        onClick={() => onNavigate("cita-detalle", cita)}>→</button>
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

// ─── CITA DETALLE ─────────────────────────────────────────────────────────────
function CitaDetalle({ cita, onBack }) {
  const clienta = CLIENTAS.find(c => c.id === cita.clientaId);
  const servicio = SERVICIOS.find(s => s.nombre === cita.servicio);
  return (
    <div>
      <div style={css.topBar}>
        <BackBtn onBack={onBack} />
        <h1 style={{ ...css.title, fontSize: 20 }}>Detalle de Cita</h1>
        <p style={css.subtitle}>{cita.fecha} · {cita.hora}</p>
      </div>
      <div style={{ padding: "20px" }}>
        {clienta && (
          <div style={{ ...css.card, display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
            <Avatar nombre={clienta.nombre} size={48} />
            <div>
              <p style={{ margin: "0 0 2px", fontFamily: "'Georgia', serif", fontWeight: 700, fontSize: 16 }}>{clienta.nombre}</p>
              <p style={{ margin: 0, ...css.subtitle, fontSize: 10 }}>curva habitual: {clienta.curva} · {clienta.largo}</p>
            </div>
          </div>
        )}

        <div style={css.card}>
          <p style={{ ...css.statLabel, marginBottom: 8 }}>servicio</p>
          <p style={{ ...css.sectionTitle, fontSize: 17, margin: "0 0 4px" }}>{cita.servicio}</p>
          {servicio && <p style={{ margin: "0 0 12px", ...css.subtitle, fontSize: 11 }}>{servicio.desc}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ ...css.statCard, flex: 1 }}>
              <p style={css.statLabel}>duración</p>
              <p style={{ ...css.statVal, fontSize: 18 }}>{servicio?.duracion || "—"}min</p>
            </div>
            <div style={{ ...css.statCard, flex: 1 }}>
              <p style={css.statLabel}>precio</p>
              <p style={{ ...css.statVal, fontSize: 18 }}>${servicio?.precio?.toLocaleString("es-AR") || "—"}</p>
            </div>
          </div>
        </div>

        {cita.notas && (
          <div style={{ ...css.card, background: "rgba(143,189,90,0.06)", borderColor: G.greenDark }}>
            <p style={css.statLabel}>notas</p>
            <p style={{ margin: 0, fontFamily: "'Courier New', monospace", fontSize: 12, color: G.textSub }}>{cita.notas}</p>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button style={{ ...css.greenBtn, flex: 1 }} onClick={() => openWA(`Hola ${cita.clienta?.split(" ")[0]}! 🌿 Te recuerdo que mañana tenés tu cita a las ${cita.hora} en el estudio 💚`)}>
            recordatorio WA
          </button>
          <button style={{ ...css.glassBtn, flex: 1 }}>confirmar</button>
        </div>
      </div>
    </div>
  );
}

// ─── NUEVA CITA ───────────────────────────────────────────────────────────────
function NuevaCita({ onBack }) {
  const [form, setForm] = useState({ clienta: "", fecha: "", hora: "", servicio: "", notas: "" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const horas = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

  return (
    <div>
      <div style={css.topBar}>
        <BackBtn onBack={onBack} label="agenda" />
        <h1 style={{ ...css.title, fontSize: 20 }}>Nueva Cita</h1>
        <p style={css.subtitle}>agendar turno</p>
      </div>
      <div style={{ padding: "20px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={css.label}>clienta</label>
            <select style={{ ...css.input, appearance: "none" }} value={form.clienta} onChange={e => set("clienta", e.target.value)}>
              <option value="">seleccionar clienta...</option>
              {CLIENTAS.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div>
            <label style={css.label}>servicio</label>
            <select style={{ ...css.input, appearance: "none" }} value={form.servicio} onChange={e => set("servicio", e.target.value)}>
              <option value="">seleccionar servicio...</option>
              {SERVICIOS.map(s => <option key={s.id} value={s.nombre}>{s.nombre} · ${s.precio.toLocaleString("es-AR")}</option>)}
            </select>
          </div>
          <div>
            <label style={css.label}>fecha</label>
            <input style={css.input} type="date" value={form.fecha} onChange={e => set("fecha", e.target.value)} />
          </div>
          <div>
            <label style={css.label}>hora</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {horas.map(h => (
                <button key={h} style={{ ...css.glassBtn, padding: "8px 12px", background: form.hora === h ? G.greenMuted : G.bgCard, borderColor: form.hora === h ? G.green : G.border, color: form.hora === h ? G.greenLight : G.textSub }}
                  onClick={() => set("hora", h)}>{h}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={css.label}>notas</label>
            <textarea style={{ ...css.input, height: 80, resize: "none" }} value={form.notas} onChange={e => set("notas", e.target.value)} placeholder="indicaciones especiales..." />
          </div>
          <button style={css.greenBtn}>confirmar cita →</button>
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN: CLIENTAS ──────────────────────────────────────────────────────────
function AdminClientas({ onNavigate }) {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [nueva, setNueva] = useState({ nombre: "", telefono: "", mail: "", curva: "C", grosor: "0.07", largo: "11mm", alergias: "Ninguna", observaciones: "" });
  const [guardado, setGuardado] = useState(false);
  const setN = (k, v) => setNueva(f => ({ ...f, [k]: v }));

  const filtradas = CLIENTAS.filter(c => c.nombre.toLowerCase().includes(search.toLowerCase()));

  const handleGuardar = () => {
    if (!nueva.nombre.trim()) return;
    // Con Firebase esto hará un PUT real; por ahora cierra el modal con feedback visual
    setGuardado(true);
    setTimeout(() => { setGuardado(false); setModalOpen(false); setNueva({ nombre: "", telefono: "", mail: "", curva: "C", grosor: "0.07", largo: "11mm", alergias: "Ninguna", observaciones: "" }); }, 1500);
  };

  return (
    <div>
      <div style={css.topBar}>
        <h1 style={css.title}>Clientas</h1>
        <p style={css.subtitle}>{CLIENTAS.length} registradas</p>
      </div>
      <div style={{ padding: "20px" }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <input style={{ ...css.input, flex: 1, margin: 0 }} placeholder="🔍  buscar clienta..." value={search} onChange={e => setSearch(e.target.value)} />
          <button style={{ ...css.glassBtn, whiteSpace: "nowrap", background: G.greenMuted, borderColor: G.green, color: G.greenLight, fontWeight: 700 }} onClick={() => setModalOpen(true)}>+ nueva</button>
        </div>

        {filtradas.map(c => (
          <div key={c.id} style={{ ...css.card, display: "flex", alignItems: "center", gap: 12 }} onClick={() => onNavigate("clienta-detalle", c)}>
            <Avatar nombre={c.nombre} />
            <div style={{ flex: 1 }}>
              <p style={{ margin: "0 0 2px", fontFamily: "'Georgia', serif", fontSize: 14 }}>{c.nombre}</p>
              <p style={{ margin: 0, ...css.subtitle, fontSize: 10 }}>curva {c.curva} · {c.grosor}mm · {c.largo}</p>
              {c.alergias !== "Ninguna" && <p style={{ margin: "4px 0 0", color: G.red, fontFamily: "'Courier New', monospace", fontSize: 9 }}>⚠ {c.alergias}</p>}
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: "0 0 2px", ...css.subtitle, fontSize: 10 }}>{c.historial.length} visitas</p>
              <span style={{ fontSize: 16 }}>→</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── MODAL NUEVA CLIENTA ── */}
      {modalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div style={{ background: "#111", border: `0.5px solid ${G.border}`, borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 430, maxHeight: "92vh", overflowY: "auto", padding: "24px 20px 40px" }}>
            {/* Handle */}
            <div style={{ width: 36, height: 4, background: G.border, borderRadius: 2, margin: "0 auto 20px" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ ...css.title, fontSize: 20, margin: 0 }}>Nueva Clienta</h2>
                <p style={{ ...css.subtitle, margin: "4px 0 0" }}>ficha completa</p>
              </div>
              <button style={{ ...css.glassBtn, padding: "6px 12px", fontSize: 12 }} onClick={() => setModalOpen(false)}>✕</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Datos personales */}
              <div style={{ ...css.card, background: "rgba(143,189,90,0.04)", borderColor: G.greenDark }}>
                <p style={{ ...css.sectionSub, margin: "0 0 12px" }}>datos personales</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <label style={css.label}>nombre y apellido *</label>
                    <input style={css.input} value={nueva.nombre} onChange={e => setN("nombre", e.target.value)} placeholder="ej: Valentina Torres" />
                  </div>
                  <div>
                    <label style={css.label}>teléfono</label>
                    <input style={css.input} value={nueva.telefono} onChange={e => setN("telefono", e.target.value)} placeholder="11 XXXX-XXXX" type="tel" />
                  </div>
                  <div>
                    <label style={css.label}>mail</label>
                    <input style={css.input} value={nueva.mail} onChange={e => setN("mail", e.target.value)} placeholder="nombre@mail.com" type="email" />
                  </div>
                </div>
              </div>

              {/* Ficha técnica */}
              <div style={css.card}>
                <p style={{ ...css.sectionSub, margin: "0 0 12px" }}>ficha técnica</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={css.label}>curva habitual</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {CURVAS.map(c => (
                        <button key={c} style={{ ...css.glassBtn, padding: "6px 12px", fontSize: 12, background: nueva.curva === c ? G.greenMuted : G.bgCard, borderColor: nueva.curva === c ? G.green : G.border, color: nueva.curva === c ? G.greenLight : G.textSub }}
                          onClick={() => setN("curva", c)}>{c}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={css.label}>grosor</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {GROSOR.map(g => (
                        <button key={g} style={{ ...css.glassBtn, padding: "6px 10px", fontSize: 11, background: nueva.grosor === g ? G.greenMuted : G.bgCard, borderColor: nueva.grosor === g ? G.green : G.border, color: nueva.grosor === g ? G.greenLight : G.textSub }}
                          onClick={() => setN("grosor", g)}>{g}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={css.label}>largo</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {LARGO.map(l => (
                        <button key={l} style={{ ...css.glassBtn, padding: "6px 10px", fontSize: 11, background: nueva.largo === l ? G.greenMuted : G.bgCard, borderColor: nueva.largo === l ? G.green : G.border, color: nueva.largo === l ? G.greenLight : G.textSub }}
                          onClick={() => setN("largo", l)}>{l}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Ficha médica */}
              <div style={css.card}>
                <p style={{ ...css.sectionSub, margin: "0 0 12px" }}>ficha médica</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <label style={css.label}>alergias / condiciones</label>
                    <input style={css.input} value={nueva.alergias} onChange={e => setN("alergias", e.target.value)} placeholder="Ninguna, o especificar..." />
                  </div>
                  <div>
                    <label style={css.label}>observaciones</label>
                    <textarea style={{ ...css.input, height: 70, resize: "none" }} value={nueva.observaciones} onChange={e => setN("observaciones", e.target.value)} placeholder="ej: prefiere look natural, sensible al adhesivo..." />
                  </div>
                </div>
              </div>

              <button
                style={{ ...css.greenBtn, opacity: nueva.nombre.trim() ? 1 : 0.4 }}
                onClick={handleGuardar}
                disabled={!nueva.nombre.trim()}>
                {guardado ? "✓ clienta guardada" : "guardar clienta →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CLIENTA DETALLE (ADMIN) ──────────────────────────────────────────────────
function ClientaDetalle({ clienta, onBack }) {
  const [tab, setTab] = useState("info");

  return (
    <div>
      <div style={css.topBar}>
        <BackBtn onBack={onBack} label="clientas" />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar nombre={clienta.nombre} size={44} />
          <div>
            <h1 style={{ ...css.title, fontSize: 18 }}>{clienta.nombre}</h1>
            <p style={css.subtitle}>{clienta.historial.length} visitas registradas</p>
          </div>
        </div>
      </div>
      <div style={{ padding: "20px" }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {["info", "ficha", "historial"].map(t => (
            <button key={t} style={{ ...css.glassBtn, flex: 1, fontSize: 10, background: tab === t ? G.greenMuted : G.bgCard, borderColor: tab === t ? G.green : G.border, color: tab === t ? G.greenLight : G.textSub }}
              onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>

        {tab === "info" && (
          <div>
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <button style={{ ...css.greenBtn, flex: 1 }} onClick={() => openWA(`Hola ${clienta.nombre.split(" ")[0]}! 🌿`)}>
                📱 WhatsApp
              </button>
              <button style={{ ...css.glassBtn, flex: 1 }}>✉ mail</button>
            </div>
            <div style={css.card}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  ["teléfono", clienta.telefono],
                  ["mail", clienta.mail],
                  ["curva habitual", clienta.curva],
                  ["grosor", clienta.grosor + "mm"],
                  ["largo", clienta.largo],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ ...css.label, margin: 0 }}>{k}</span>
                    <span style={{ fontFamily: "'Courier New', monospace", fontSize: 12, color: G.textSub }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
            {clienta.observaciones && (
              <div style={{ ...css.card, marginTop: 0, background: "rgba(143,189,90,0.05)", borderColor: G.greenDark }}>
                <p style={css.statLabel}>observaciones</p>
                <p style={{ margin: 0, fontFamily: "'Courier New', monospace", fontSize: 12, color: G.textSub }}>{clienta.observaciones}</p>
              </div>
            )}
          </div>
        )}

        {tab === "ficha" && (
          <div>
            <div style={css.card}>
              <p style={css.statLabel}>curva</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                {CURVAS.map(c => <span key={c} style={{ ...css.tag, background: c === clienta.curva ? G.greenMuted : "transparent", borderColor: c === clienta.curva ? G.green : G.border, color: c === clienta.curva ? G.greenLight : G.textMuted }}>{c}</span>)}
              </div>
              <p style={css.statLabel}>grosor</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                {GROSOR.map(g => <span key={g} style={{ ...css.tag, background: g === clienta.grosor ? G.greenMuted : "transparent", borderColor: g === clienta.grosor ? G.green : G.border, color: g === clienta.grosor ? G.greenLight : G.textMuted }}>{g}</span>)}
              </div>
              <p style={css.statLabel}>largo</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {LARGO.map(l => <span key={l} style={{ ...css.tag, background: l === clienta.largo ? G.greenMuted : "transparent", borderColor: l === clienta.largo ? G.green : G.border, color: l === clienta.largo ? G.greenLight : G.textMuted }}>{l}</span>)}
              </div>
            </div>
            <div style={{ ...css.card, marginTop: 0 }}>
              <p style={css.statLabel}>alergias / condiciones</p>
              <p style={{ margin: 0, color: clienta.alergias !== "Ninguna" ? G.red : G.textSub, fontFamily: "'Courier New', monospace", fontSize: 12 }}>{clienta.alergias}</p>
            </div>
          </div>
        )}

        {tab === "historial" && (
          <div>
            {clienta.historial.map((h, i) => (
              <div key={i} style={css.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <p style={{ margin: "0 0 2px", fontFamily: "'Georgia', serif", fontSize: 14 }}>{h.servicio}</p>
                    <p style={{ margin: 0, ...css.subtitle, fontSize: 10 }}>{h.fecha} · curva {h.curva}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ margin: "0 0 2px", fontFamily: "'Georgia', serif", fontWeight: 700, color: G.green, fontSize: 14 }}>${h.monto.toLocaleString("es-AR")}</p>
                    <span style={{ ...css.tag, fontSize: 9, padding: "1px 6px", marginRight: 0 }}>{h.pago}</span>
                  </div>
                </div>
                {h.notas && <p style={{ margin: 0, fontFamily: "'Courier New', monospace", fontSize: 11, color: G.textMuted }}>{h.notas}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ADMIN: FINANZAS ──────────────────────────────────────────────────────────
function AdminFinanzas() {
  const [periodo, setPeriodo] = useState("mes");
  const todosLosIngresos = CLIENTAS.flatMap(c => c.historial);
  const totalMes = todosLosIngresos.filter(h => h.fecha.startsWith("2025-05")).reduce((a, h) => a + h.monto, 0);
  const totalTransf = todosLosIngresos.filter(h => h.pago === "transferencia").reduce((a, h) => a + h.monto, 0);
  const totalEfectivo = todosLosIngresos.filter(h => h.pago === "efectivo").reduce((a, h) => a + h.monto, 0);
  const porServicio = {};
  SERVICIOS.forEach(s => { porServicio[s.nombre] = 0; });
  todosLosIngresos.forEach(h => { if (porServicio[h.servicio] !== undefined) porServicio[h.servicio] += h.monto; });

  return (
    <div>
      <div style={css.topBar}>
        <h1 style={css.title}>Finanzas</h1>
        <p style={css.subtitle}>resumen de ingresos</p>
      </div>
      <div style={{ padding: "20px" }}>
        {/* Periodo */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {["semana", "mes", "año"].map(p => (
            <button key={p} style={{ ...css.glassBtn, flex: 1, fontSize: 10, background: periodo === p ? G.greenMuted : G.bgCard, borderColor: periodo === p ? G.green : G.border, color: periodo === p ? G.greenLight : G.textSub }}
              onClick={() => setPeriodo(p)}>{p}</button>
          ))}
        </div>

        {/* Total */}
        <div style={{ ...css.card, textAlign: "center", padding: "24px 16px", marginBottom: 12 }}>
          <p style={{ ...css.statLabel, textAlign: "center" }}>ingresos totales · {periodo}</p>
          <p style={{ fontFamily: "'Georgia', serif", fontWeight: 700, fontSize: 36, color: G.green, margin: "4px 0 8px" }}>
            ${totalMes.toLocaleString("es-AR")}
          </p>
          <p style={{ ...css.subtitle, textAlign: "center" }}>mayo 2025</p>
        </div>

        {/* Efectivo vs Transferencia */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <div style={{ ...css.statCard, flex: 1, borderColor: G.border }}>
            <p style={css.statLabel}>transferencia</p>
            <p style={{ ...css.statVal, fontSize: 18, color: G.green }}>${(totalTransf / 1000).toFixed(0)}k</p>
            <p style={{ ...css.subtitle, fontSize: 9, margin: 0 }}>
              {Math.round((totalTransf / (totalTransf + totalEfectivo)) * 100)}%
            </p>
          </div>
          <div style={{ ...css.statCard, flex: 1 }}>
            <p style={css.statLabel}>efectivo</p>
            <p style={{ ...css.statVal, fontSize: 18 }}>${(totalEfectivo / 1000).toFixed(0)}k</p>
            <p style={{ ...css.subtitle, fontSize: 9, margin: 0 }}>
              {Math.round((totalEfectivo / (totalTransf + totalEfectivo)) * 100)}%
            </p>
          </div>
        </div>

        <div style={css.divider} />

        {/* Por servicio */}
        <p style={css.sectionTitle}>por servicio</p>
        <p style={css.sectionSub}>histórico</p>
        {Object.entries(porServicio).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([nombre, total]) => {
          const max = Math.max(...Object.values(porServicio));
          return (
            <div key={nombre} style={{ ...css.card, padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <p style={{ margin: 0, fontFamily: "'Courier New', monospace", fontSize: 12 }}>{nombre}</p>
                <p style={{ margin: 0, fontFamily: "'Georgia', serif", fontWeight: 700, fontSize: 13, color: G.green }}>${total.toLocaleString("es-AR")}</p>
              </div>
              <div style={{ height: 3, background: G.border, borderRadius: 2 }}>
                <div style={{ height: "100%", width: `${(total / max) * 100}%`, background: G.green, borderRadius: 2, transition: "width 0.5s ease" }} />
              </div>
            </div>
          );
        })}

        <div style={css.divider} />

        {/* Top clientas */}
        <p style={css.sectionTitle}>top clientas</p>
        <p style={css.sectionSub}>por gasto histórico</p>
        {CLIENTAS.map(c => ({
          ...c, total: c.historial.reduce((a, h) => a + h.monto, 0)
        })).sort((a, b) => b.total - a.total).map((c, i) => (
          <div key={c.id} style={{ ...css.card, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontFamily: "'Georgia', serif", fontWeight: 700, fontSize: 20, color: i === 0 ? G.green : G.textMuted, minWidth: 24 }}>
              {i + 1}
            </div>
            <Avatar nombre={c.nombre} size={36} />
            <div style={{ flex: 1 }}>
              <p style={{ margin: "0 0 2px", fontFamily: "'Georgia', serif", fontSize: 13 }}>{c.nombre}</p>
              <p style={{ margin: 0, ...css.subtitle, fontSize: 10 }}>{c.historial.length} visitas</p>
            </div>
            <p style={{ margin: 0, fontFamily: "'Georgia', serif", fontWeight: 700, color: G.green, fontSize: 14 }}>
              ${c.total.toLocaleString("es-AR")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ADMIN: CONFIG ────────────────────────────────────────────────────────────
function AdminConfig() {
  const [tab, setTab] = useState("servicios");

  return (
    <div>
      <div style={css.topBar}>
        <h1 style={css.title}>Configuración</h1>
        <p style={css.subtitle}>parámetros del estudio</p>
      </div>
      <div style={{ padding: "20px" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {["servicios", "horarios", "info"].map(t => (
            <button key={t} style={{ ...css.glassBtn, fontSize: 10, background: tab === t ? G.greenMuted : G.bgCard, borderColor: tab === t ? G.green : G.border, color: tab === t ? G.greenLight : G.textSub }}
              onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>

        {tab === "servicios" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <p style={{ ...css.sectionSub, margin: 0 }}>servicios activos</p>
              <button style={{ ...css.glassBtn, fontSize: 10 }}>+ agregar</button>
            </div>
            {SERVICIOS.map(s => (
              <div key={s.id} style={{ ...css.card, padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ color: G.green }}>{s.emoji}</span>
                      <p style={{ margin: 0, fontFamily: "'Georgia', serif", fontSize: 14 }}>{s.nombre}</p>
                    </div>
                    <p style={{ margin: "0 0 6px", ...css.subtitle, fontSize: 10 }}>{s.desc}</p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <span style={css.tag}>{s.duracion}min</span>
                      <span style={css.tag}>${s.precio.toLocaleString("es-AR")}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, marginLeft: 8 }}>
                    <button style={{ ...css.glassBtn, padding: "6px 10px", fontSize: 11 }}>✎</button>
                    <button style={{ ...css.glassBtn, padding: "6px 10px", fontSize: 11, borderColor: G.red, color: G.red }}>✕</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "horarios" && (
          <div>
            <p style={css.sectionSub}>días y horarios de trabajo</p>
            {["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"].map((dia, i) => (
              <div key={dia} style={{ ...css.card, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: i < 6 ? G.green : G.border }} />
                <p style={{ margin: 0, flex: 1, fontFamily: "'Courier New', monospace", fontSize: 12 }}>{dia}</p>
                {i < 5 && <p style={{ margin: 0, ...css.subtitle, fontSize: 10 }}>09:00 – 18:00</p>}
                {i === 5 && <p style={{ margin: 0, ...css.subtitle, fontSize: 10 }}>09:00 – 14:00</p>}
                {i === 6 && <p style={{ margin: 0, color: G.textMuted, fontFamily: "'Courier New', monospace", fontSize: 10 }}>cerrado</p>}
                <button style={{ ...css.glassBtn, padding: "5px 10px", fontSize: 10 }}>✎</button>
              </div>
            ))}
          </div>
        )}

        {tab === "info" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              ["nombre del estudio", "Lash Studio by Chulas"],
              ["dirección", "San Lorenzo 3101, San Andrés, Bs.As."],
              ["teléfono", "11 2650-9699"],
              ["instagram", "@bychulas.studio"],
            ].map(([label, val]) => (
              <div key={label}>
                <label style={css.label}>{label}</label>
                <input style={css.input} defaultValue={val} />
              </div>
            ))}
            <button style={css.greenBtn}>guardar cambios →</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── VISTA CLIENTA ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

function ClientaApp({ clienta, onLogout }) {
  const [tab, setTab] = useState("inicio");
  const navItems = [
    { id: "inicio", icon: "⬡", label: "inicio" },
    { id: "agendar", icon: "◷", label: "agendar" },
    { id: "historial", icon: "✦", label: "historial" },
    { id: "perfil", icon: "✿", label: "perfil" },
  ];

  const renderTab = () => {
    switch (tab) {
      case "inicio": return <ClientaInicio clienta={clienta} setTab={setTab} />;
      case "agendar": return <ClientaAgendar clienta={clienta} />;
      case "historial": return <ClientaHistorial clienta={clienta} />;
      case "perfil": return <ClientaPerfil clienta={clienta} onLogout={onLogout} />;
      default: return <ClientaInicio clienta={clienta} setTab={setTab} />;
    }
  };

  return (
    <div style={css.app}>
      <div style={css.screen}>{renderTab()}</div>
      <nav style={css.bottomNav}>
        {navItems.map(n => (
          <div key={n.id} style={css.navItem(tab === n.id)} onClick={() => setTab(n.id)}>
            <span style={css.navIcon}>{n.icon}</span>
            <span style={css.navLabel}>{n.label}</span>
            {tab === n.id && <div style={{ width: 4, height: 4, borderRadius: "50%", background: G.green }} />}
          </div>
        ))}
      </nav>
      <FAB />
    </div>
  );
}

// ─── CLIENTA: INICIO ──────────────────────────────────────────────────────────
function ClientaInicio({ clienta, setTab }) {
  const ultimaCita = clienta.historial[0];
  const diasDesde = Math.floor((new Date() - new Date(ultimaCita?.fecha)) / (1000 * 60 * 60 * 24));
  const proxCita = CITAS.find(c => c.clientaId === clienta.id && c.fecha >= "2025-05-14");
  const diasHastaProxima = proxCita ? Math.floor((new Date(proxCita.fecha) - new Date()) / (1000 * 60 * 60 * 24)) : null;

  const serviciosUsados = {};
  clienta.historial.forEach(h => { serviciosUsados[h.servicio] = (serviciosUsados[h.servicio] || 0) + 1; });
  const curvasUsadas = {};
  clienta.historial.forEach(h => { curvasUsadas[h.curva] = (curvasUsadas[h.curva] || 0) + 1; });
  const curvaFav = Object.entries(curvasUsadas).sort((a, b) => b[1] - a[1])[0]?.[0];

  return (
    <div>
      <div style={css.topBar}>
        <h1 style={css.title}>Lash Studio</h1>
        <p style={css.subtitle}>hola, {clienta.nombre.split(" ")[0].toLowerCase()} 🌿</p>
      </div>
      <div style={{ padding: "20px" }}>
        {/* Recordatorio service */}
        {diasDesde >= 14 && (
          <div style={{ background: "linear-gradient(135deg, rgba(143,189,90,0.15), rgba(143,189,90,0.05))", border: `1px solid ${G.green}`, borderRadius: 16, padding: "16px 18px", marginBottom: 12 }}>
            <p style={{ margin: "0 0 4px", fontFamily: "'Georgia', serif", fontWeight: 700, fontSize: 15, color: G.greenLight }}>es hora del service ✦</p>
            <p style={{ margin: "0 0 12px", fontFamily: "'Courier New', monospace", fontSize: 11, color: G.textSub }}>hace {diasDesde} días de tu último tratamiento</p>
            <button style={{ ...css.greenBtn, padding: "10px 16px" }} onClick={() => setTab("agendar")}>agendar ahora →</button>
          </div>
        )}

        {/* Próxima cita */}
        {proxCita && (
          <div style={{ ...css.card, borderColor: G.greenDark, marginBottom: 12 }}>
            <p style={{ ...css.statLabel, marginBottom: 6 }}>próxima cita</p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ margin: "0 0 2px", fontFamily: "'Georgia', serif", fontWeight: 700, fontSize: 16, color: G.white }}>{proxCita.servicio}</p>
                <p style={{ margin: 0, ...css.subtitle, fontSize: 11 }}>{proxCita.fecha} a las {proxCita.hora}</p>
              </div>
              {diasHastaProxima !== null && (
                <div style={{ textAlign: "center", background: G.greenMuted, border: `0.5px solid ${G.green}`, borderRadius: 12, padding: "8px 14px" }}>
                  <p style={{ margin: 0, fontFamily: "'Georgia', serif", fontWeight: 700, fontSize: 20, color: G.greenLight }}>{diasHastaProxima}</p>
                  <p style={{ margin: 0, fontFamily: "'Courier New', monospace", fontSize: 9, color: G.textMuted }}>días</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Widgets stats — CLICKEABLES */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          {/* Visitas → Historial */}
          <div
            style={{ ...css.statCard, flex: 1, cursor: "pointer", transition: "border-color 0.2s" }}
            onClick={() => setTab("historial")}
            onMouseEnter={e => e.currentTarget.style.borderColor = G.green}
            onMouseLeave={e => e.currentTarget.style.borderColor = G.border}
          >
            <p style={css.statLabel}>visitas</p>
            <p style={css.statVal}>{clienta.historial.length}</p>
            <p style={{ ...css.subtitle, fontSize: 9, margin: 0, color: G.green }}>ver →</p>
          </div>
          {/* Curva fav → Perfil */}
          <div
            style={{ ...css.statCard, flex: 1, cursor: "pointer", transition: "border-color 0.2s" }}
            onClick={() => setTab("perfil")}
            onMouseEnter={e => e.currentTarget.style.borderColor = G.green}
            onMouseLeave={e => e.currentTarget.style.borderColor = G.border}
          >
            <p style={css.statLabel}>curva fav.</p>
            <p style={{ ...css.statVal, fontSize: 24 }}>{curvaFav}</p>
            <p style={{ ...css.subtitle, fontSize: 9, margin: 0, color: G.green }}>mi ficha →</p>
          </div>
          {/* Agendar → Tab agendar */}
          <div
            style={{ ...css.statCard, flex: 1, cursor: "pointer", background: G.greenMuted, border: `0.5px solid ${G.green}`, transition: "opacity 0.2s" }}
            onClick={() => setTab("agendar")}
          >
            <p style={{ ...css.statLabel, color: G.greenLight }}>turno</p>
            <p style={{ ...css.statVal, fontSize: 22 }}>+</p>
            <p style={{ ...css.subtitle, fontSize: 9, margin: 0, color: G.greenLight }}>agendar →</p>
          </div>
        </div>

        {/* Último servicio */}
        {ultimaCita && (
          <div>
            <p style={css.sectionTitle}>último servicio</p>
            <p style={css.sectionSub}>{ultimaCita.fecha}</p>
            <div style={css.card} onClick={() => setTab("historial")}>
              <p style={{ margin: "0 0 4px", fontFamily: "'Georgia', serif", fontWeight: 700, fontSize: 15 }}>{ultimaCita.servicio}</p>
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <span style={css.tag}>curva {ultimaCita.curva}</span>
                {ultimaCita.notas && <span style={css.tag}>nota</span>}
              </div>
              <p style={{ margin: "10px 0 0", fontFamily: "'Courier New', monospace", fontSize: 10, color: G.textMuted }}>ver historial completo →</p>
            </div>
          </div>
        )}

        <div style={css.divider} />

        {/* Info estudio */}
        <p style={css.sectionTitle}>el estudio</p>
        <div style={css.card}>
          {[
            ["📍", "San Lorenzo 3101, San Andrés"],
            ["📱", "11 2650-9699"],
            ["📷", "@bychulas.studio"],
          ].map(([icon, val]) => (
            <div key={val} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 14 }}>{icon}</span>
              <p style={{ margin: 0, fontFamily: "'Courier New', monospace", fontSize: 12, color: G.textSub }}>{val}</p>
            </div>
          ))}
          <div style={{ marginTop: 10 }}>
            <button style={{ ...css.greenBtn, padding: "10px" }} onClick={() => openWA()}>abrir en WhatsApp →</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CLIENTA: AGENDAR ─────────────────────────────────────────────────────────
const COMBOS = [
  { id: "c1", nombre: "Pestañas + Perfilado de cejas", servicios: ["Classic Full Set", "Perfilado de Cejas"], duracion: 120, emoji: "✦◎" },
  { id: "c2", nombre: "Volume + Perfilado de cejas", servicios: ["Volume Set", "Perfilado de Cejas"], duracion: 150, emoji: "✦✦◎" },
  { id: "c3", nombre: "Lifting + Perfilado de cejas", servicios: ["Lifting + Tinte", "Perfilado de Cejas"], duracion: 90, emoji: "◎◎" },
  { id: "c4", nombre: "Refill + Perfilado de cejas", servicios: ["Classic Refill", "Perfilado de Cejas"], duracion: 90, emoji: "↺◎" },
];

function ClientaAgendar({ clienta }) {
  const [paso, setPaso] = useState(1);
  const [modoServicio, setModoServicio] = useState("individual"); // "individual" | "combo" | "noSe"
  const [form, setForm] = useState({ servicio: null, combo: null, fecha: "", hora: "", notas: "" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const horasDisponibles = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00"];
  const ocupadas = CITAS.filter(c => c.fecha === form.fecha).map(c => c.hora);

  // Nombre display del servicio elegido
  const servicioDisplay = modoServicio === "combo" ? form.combo?.nombre
    : modoServicio === "noSe" ? "A confirmar con Male 💚"
    : form.servicio?.nombre;
  const duracionDisplay = modoServicio === "combo" ? form.combo?.duracion
    : modoServicio === "noSe" ? "—"
    : form.servicio?.duracion;
  const precioDisplay = modoServicio === "noSe" ? "a convenir" : modoServicio === "combo" ? "a convenir" : form.servicio?.precio;

  const listo1 = modoServicio === "noSe" || (modoServicio === "individual" && form.servicio) || (modoServicio === "combo" && form.combo);

  return (
    <div>
      <div style={css.topBar}>
        <h1 style={css.title}>Agendar</h1>
        <p style={css.subtitle}>paso {paso} de 3</p>
      </div>
      <div style={{ padding: "20px" }}>
        {/* Progress */}
        <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
          {[1, 2, 3].map(p => (
            <div key={p} style={{ flex: 1, height: 3, borderRadius: 2, background: p <= paso ? G.green : G.border, transition: "background 0.3s ease" }} />
          ))}
        </div>

        {/* ── PASO 1: ELEGIR SERVICIO ── */}
        {paso === 1 && (
          <div>
            <p style={css.sectionTitle}>¿qué querés hacerte?</p>
            {/* Selector de modo */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {[
                { id: "individual", label: "servicio" },
                { id: "combo", label: "combo ✦" },
                { id: "noSe", label: "no sé aún" },
              ].map(m => (
                <button key={m.id}
                  style={{ ...css.glassBtn, flex: 1, fontSize: 10, background: modoServicio === m.id ? G.greenMuted : G.bgCard, borderColor: modoServicio === m.id ? G.green : G.border, color: modoServicio === m.id ? G.greenLight : G.textSub }}
                  onClick={() => { setModoServicio(m.id); set("servicio", null); set("combo", null); }}>
                  {m.label}
                </button>
              ))}
            </div>

            {/* SERVICIOS INDIVIDUALES */}
            {modoServicio === "individual" && SERVICIOS.map(s => (
              <div key={s.id}
                style={{ ...css.card, borderColor: form.servicio?.id === s.id ? G.green : G.border, background: form.servicio?.id === s.id ? "rgba(143,189,90,0.06)" : G.bgCard }}
                onClick={() => { set("servicio", s); setPaso(2); }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: "0 0 4px", fontFamily: "'Georgia', serif", fontSize: 14 }}>{s.nombre}</p>
                    <p style={{ margin: "0 0 8px", ...css.subtitle, fontSize: 10 }}>{s.desc}</p>
                    <span style={css.tag}>{s.duracion}min</span>
                  </div>
                  <p style={{ margin: 0, fontFamily: "'Georgia', serif", fontWeight: 700, color: G.green, fontSize: 15 }}>${s.precio.toLocaleString("es-AR")}</p>
                </div>
              </div>
            ))}

            {/* COMBOS */}
            {modoServicio === "combo" && (
              <div>
                <p style={{ ...css.sectionSub, marginBottom: 12 }}>servicios que podés combinar en una sola visita</p>
                {COMBOS.map(c => (
                  <div key={c.id}
                    style={{ ...css.card, borderColor: form.combo?.id === c.id ? G.green : G.border, background: form.combo?.id === c.id ? "rgba(143,189,90,0.06)" : G.bgCard }}
                    onClick={() => { set("combo", c); setPaso(2); }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                          <span style={{ color: G.green, fontSize: 12 }}>{c.emoji}</span>
                          <p style={{ margin: 0, fontFamily: "'Georgia', serif", fontSize: 14 }}>{c.nombre}</p>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {c.servicios.map(s => <span key={s} style={{ ...css.tag, fontSize: 9 }}>{s}</span>)}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", marginLeft: 8 }}>
                        <span style={css.tag}>{c.duracion}min</span>
                        <p style={{ margin: "4px 0 0", fontFamily: "'Courier New', monospace", fontSize: 10, color: G.textMuted }}>precio a convenir</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* NO SÉ */}
            {modoServicio === "noSe" && (
              <div>
                <div style={{ ...css.card, background: "rgba(143,189,90,0.05)", borderColor: G.greenDark, textAlign: "center", padding: "24px 20px" }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>🌿</div>
                  <p style={{ margin: "0 0 6px", fontFamily: "'Georgia', serif", fontWeight: 700, fontSize: 16, color: G.greenLight }}>¡no te preocupes!</p>
                  <p style={{ margin: "0 0 16px", fontFamily: "'Courier New', monospace", fontSize: 11, color: G.textSub, lineHeight: 1.6 }}>
                    agendá tu turno y Male te va a asesorar personalmente cuando llegues al estudio. podés contarle qué efecto buscás en las notas.
                  </p>
                  <button style={{ ...css.greenBtn, padding: "10px 20px" }} onClick={() => setPaso(2)}>
                    agendar igualmente →
                  </button>
                </div>
                <div style={{ ...css.card, marginTop: 8 }}>
                  <p style={{ ...css.sectionSub, margin: "0 0 8px" }}>¿querés que Male te oriente antes?</p>
                  <button style={{ ...css.glassBtn, width: "100%", borderColor: G.green, color: G.greenLight }}
                    onClick={() => openWA("Hola Male! No sé bien qué servicio hacerme, ¿me podés orientar? 🌿")}>
                    💬 consultar por WhatsApp
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PASO 2: FECHA Y HORA ── */}
        {paso === 2 && (
          <div>
            <button style={{ ...css.glassBtn, marginBottom: 16, fontSize: 11 }} onClick={() => setPaso(1)}>← cambiar servicio</button>
            {/* Chip del servicio elegido */}
            <div style={{ ...css.card, background: "rgba(143,189,90,0.05)", borderColor: G.greenDark, marginBottom: 20, padding: "10px 14px" }}>
              <p style={{ margin: 0, fontFamily: "'Courier New', monospace", fontSize: 11, color: G.greenLight }}>✦ {servicioDisplay}</p>
            </div>
            <p style={css.sectionTitle}>elegí la fecha</p>
            <input style={{ ...css.input, marginBottom: 20 }} type="date" value={form.fecha} onChange={e => set("fecha", e.target.value)} />
            {form.fecha && (
              <>
                <p style={css.sectionSub}>horarios disponibles</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                  {horasDisponibles.map(h => {
                    const ocupado = ocupadas.includes(h);
                    return (
                      <button key={h} disabled={ocupado}
                        style={{ ...css.glassBtn, padding: "10px 14px", opacity: ocupado ? 0.3 : 1, background: form.hora === h ? G.greenMuted : G.bgCard, borderColor: form.hora === h ? G.green : G.border, color: form.hora === h ? G.greenLight : G.textSub, cursor: ocupado ? "not-allowed" : "pointer" }}
                        onClick={() => !ocupado && set("hora", h)}>
                        {h}{ocupado ? " ✕" : ""}
                      </button>
                    );
                  })}
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={css.label}>notas para Male (opcional)</label>
                  <textarea style={{ ...css.input, height: 70, resize: "none" }} value={form.notas} onChange={e => set("notas", e.target.value)} placeholder={modoServicio === "noSe" ? "contame qué efecto buscás, largo, volumen..." : "indicaciones especiales..."} />
                </div>
                {form.hora && <button style={css.greenBtn} onClick={() => setPaso(3)}>confirmar horario →</button>}
              </>
            )}
          </div>
        )}

        {/* ── PASO 3: CONFIRMACIÓN ── */}
        {paso === 3 && (
          <div>
            <p style={css.sectionTitle}>confirmá tu cita</p>
            <p style={css.sectionSub}>revisá los detalles</p>
            <div style={{ ...css.card, background: "rgba(143,189,90,0.06)", borderColor: G.greenDark }}>
              {[
                ["servicio", servicioDisplay],
                ["fecha", form.fecha],
                ["hora", form.hora],
                ["duración aprox.", duracionDisplay ? `${duracionDisplay} min` : "a confirmar"],
                ["precio", typeof precioDisplay === "number" ? `$${precioDisplay.toLocaleString("es-AR")}` : precioDisplay],
                ...(form.notas ? [["notas", form.notas]] : []),
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `0.5px solid ${G.border}` }}>
                  <span style={{ ...css.label, margin: 0 }}>{k}</span>
                  <span style={{ fontFamily: "'Courier New', monospace", fontSize: 11, color: G.textSub, maxWidth: "60%", textAlign: "right" }}>{v}</span>
                </div>
              ))}
            </div>
            <button style={{ ...css.greenBtn, marginTop: 16 }} onClick={() => {
              const msg = modoServicio === "noSe"
                ? `Hola Male! Quiero agendar un turno:\n📅 ${form.fecha} a las ${form.hora}\n💭 Todavía no sé qué servicio, me gustaría que me asesores 🌿${form.notas ? `\nNotas: ${form.notas}` : ""}\n💚 ${clienta.nombre}`
                : `Hola Male! Quiero agendar:\n✦ ${servicioDisplay}\n📅 ${form.fecha} a las ${form.hora}${form.notas ? `\nNotas: ${form.notas}` : ""}\n💚 ${clienta.nombre}`;
              openWA(msg);
            }}>
              confirmar y avisar a Male →
            </button>
            <button style={{ ...css.glassBtn, marginTop: 10, width: "100%" }} onClick={() => setPaso(1)}>modificar</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CLIENTA: HISTORIAL ───────────────────────────────────────────────────────
function ClientaHistorial({ clienta }) {
  const totalVisitas = clienta.historial.length;
  const curvasUsadas = {};
  clienta.historial.forEach(h => { curvasUsadas[h.curva] = (curvasUsadas[h.curva] || 0) + 1; });
  const curvaFav = Object.entries(curvasUsadas).sort((a, b) => b[1] - a[1])[0];

  return (
    <div>
      <div style={css.topBar}>
        <h1 style={css.title}>Historial</h1>
        <p style={css.subtitle}>{totalVisitas} visitas al estudio</p>
      </div>
      <div style={{ padding: "20px" }}>
        {/* Stats */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <div style={{ ...css.statCard, flex: 1, textAlign: "center" }}>
            <p style={{ ...css.statVal, fontSize: 28, color: G.green }}>{totalVisitas}</p>
            <p style={css.statLabel}>visitas</p>
          </div>
          <div style={{ ...css.statCard, flex: 1, textAlign: "center" }}>
            <p style={{ ...css.statVal, fontSize: 28 }}>{curvaFav?.[0]}</p>
            <p style={css.statLabel}>curva fav.</p>
          </div>
        </div>

        {/* Motivación */}
        <div style={{ ...css.card, textAlign: "center", padding: "20px", background: "rgba(143,189,90,0.05)", borderColor: G.greenDark, marginBottom: 16 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🌿</div>
          <p style={{ margin: "0 0 6px", fontFamily: "'Georgia', serif", fontWeight: 700, fontSize: 15, color: G.greenLight }}>
            {totalVisitas >= 3 ? "¡sos una clienta VIP! ✦" : totalVisitas >= 1 ? "gracias por tu confianza 💚" : "tu primera visita te espera"}
          </p>
          <p style={{ margin: 0, fontFamily: "'Courier New', monospace", fontSize: 11, color: G.textMuted }}>
            {totalVisitas >= 3 ? `${totalVisitas} visitas y siempre hermosa` : "el cuidado de tus pestañas en buenas manos"}
          </p>
        </div>

        {/* Historial */}
        <p style={css.sectionTitle}>tus visitas</p>
        <p style={css.sectionSub}>más recientes primero</p>
        {clienta.historial.map((h, i) => (
          <div key={i} style={css.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <p style={{ margin: "0 0 2px", fontFamily: "'Georgia', serif", fontSize: 14 }}>{h.servicio}</p>
                <p style={{ margin: 0, ...css.subtitle, fontSize: 10 }}>{h.fecha}</p>
              </div>
              <span style={css.tag}>curva {h.curva}</span>
            </div>
            {h.notas && <p style={{ margin: 0, fontFamily: "'Courier New', monospace", fontSize: 11, color: G.textMuted }}>✦ {h.notas}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CLIENTA: PERFIL ──────────────────────────────────────────────────────────
function ClientaPerfil({ clienta, onLogout }) {
  const [editando, setEditando] = useState(false);
  const [foto, setFoto] = useState(null); // base64 de la foto

  const handleFoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setFoto(ev.target.result);
    reader.readAsDataURL(file);
  };

  const iniciales = clienta.nombre.split(" ").slice(0, 2).map(n => n[0]).join("");

  return (
    <div>
      <div style={css.topBar}>
        <h1 style={css.title}>Mi Perfil</h1>
        <p style={css.subtitle}>tus datos</p>
      </div>
      <div style={{ padding: "20px" }}>

        {/* ── AVATAR con edición de foto ── */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
          <div style={{ position: "relative", marginBottom: 12 }}>
            {foto ? (
              <img src={foto} alt="perfil" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: `2px solid ${G.green}` }} />
            ) : (
              <div style={{ width: 80, height: 80, borderRadius: "50%", background: G.greenMuted, border: `2px solid ${G.green}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Georgia', serif", fontWeight: 700, fontSize: 28, color: G.greenLight }}>
                {iniciales}
              </div>
            )}
            {/* Botón de cámara — siempre visible, más prominente al editar */}
            <label htmlFor="foto-input" style={{
              position: "absolute", bottom: 0, right: 0,
              width: 26, height: 26, borderRadius: "50%",
              background: editando ? G.green : "rgba(10,10,10,0.8)",
              border: `1.5px solid ${editando ? "#0a0a0a" : G.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", fontSize: 13, transition: "all 0.2s",
            }}>
              📷
            </label>
            <input id="foto-input" type="file" accept="image/*" style={{ display: "none" }} onChange={handleFoto} />
          </div>
          <p style={{ margin: "0 0 4px", fontFamily: "'Georgia', serif", fontWeight: 700, fontSize: 18 }}>{clienta.nombre}</p>
          <span style={css.tag}>clienta activa</span>
          {editando && (
            <p style={{ margin: "8px 0 0", fontFamily: "'Courier New', monospace", fontSize: 10, color: G.textMuted, textAlign: "center" }}>
              tocá 📷 para cambiar tu foto
            </p>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <button style={{ ...css.glassBtn, flex: 1, fontSize: 10 }} onClick={() => setEditando(!editando)}>{editando ? "cancelar" : "editar perfil"}</button>
          <button style={{ ...css.glassBtn, flex: 1, fontSize: 10 }} onClick={() => openWA()}>contactar</button>
        </div>

        {/* Datos */}
        <div style={{ ...css.card, display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            ["nombre", clienta.nombre],
            ["teléfono", clienta.telefono],
            ["mail", clienta.mail],
          ].map(([label, val]) => (
            <div key={label}>
              <label style={css.label}>{label}</label>
              {editando ? <input style={css.input} defaultValue={val} /> : <p style={{ margin: 0, fontFamily: "'Courier New', monospace", fontSize: 13, color: G.textSub }}>{val}</p>}
            </div>
          ))}
          {editando && (
            <div>
              <label style={css.label}>contacto de emergencia</label>
              <input style={css.input} placeholder="nombre y teléfono..." />
            </div>
          )}
        </div>

        {/* Preferencias */}
        <div style={{ marginTop: 12 }}>
          <p style={css.sectionTitle}>mis preferencias</p>
          <div style={css.card}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={css.label}>curva habitual</span>
              <span style={{ ...css.tag, marginRight: 0 }}>{clienta.curva}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={css.label}>grosor</span>
              <span style={{ ...css.tag, marginRight: 0 }}>{clienta.grosor}mm</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={css.label}>largo</span>
              <span style={{ ...css.tag, marginRight: 0 }}>{clienta.largo}</span>
            </div>
          </div>
        </div>

        {/* Políticas */}
        <div style={{ ...css.card, marginTop: 12, background: "rgba(143,189,90,0.03)", borderColor: G.border }}>
          <p style={{ margin: "0 0 8px", fontFamily: "'Georgia', serif", fontWeight: 700, fontSize: 14 }}>Políticas del Estudio</p>
          {[
            "Cancelaciones con 24hs de anticipación",
            "Puntualidad necesaria · tolerancia 10min",
            "No usar rimel ni pestañas postizas 48hs antes",
            "Retoques gratuitos dentro de las 72hs",
            "Prohibido el uso de aceites en la zona",
          ].map((pol, i) => (
            <p key={i} style={{ margin: "0 0 6px", fontFamily: "'Courier New', monospace", fontSize: 11, color: G.textSub }}>✦ {pol}</p>
          ))}
        </div>

        {editando && <button style={{ ...css.greenBtn, marginTop: 12 }}>guardar cambios →</button>}

        <button style={{ ...css.glassBtn, marginTop: 20, width: "100%", borderColor: G.red, color: G.red }} onClick={onLogout}>
          cerrar sesión
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── APP ROOT ─────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export default function App() {
  const [session, setSession] = useState(null); // null | { tipo: "admin" | "clienta", data }

  const handleLogin = (tipo, data = null) => {
    setSession({ tipo, data });
  };
  const handleLogout = () => setSession(null);

  if (!session) return <LoginScreen onLogin={handleLogin} />;
  if (session.tipo === "admin") return <AdminApp onLogout={handleLogout} />;
  if (session.tipo === "clienta") return <ClientaApp clienta={session.data} onLogout={handleLogout} />;
  return null;
}
