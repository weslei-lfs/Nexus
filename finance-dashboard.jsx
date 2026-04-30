import { useState, useEffect, useCallback } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from "recharts";

// ─── THEMES ──────────────────────────────────────────────────────────────────
const THEMES = {
  "Dark Red": {
    bg:"#0d0d0d", bgCard:"#161616", bgCard2:"#1e1e1e",
    accent:"#e53935", accentGlow:"rgba(229,57,53,0.15)",
    text:"#ffffff", textSub:"#888", textMuted:"#444",
    border:"#242424", green:"#4caf50", red:"#e53935", yellow:"#ffc107",
    chart:["#e53935","#ff6f60","#b71c1c","#ef9a9a","#ff1744","#ff8a80","#d32f2f","#ffcdd2"],
    header:"#111",
  },
  "Dark": {
    bg:"#0a0a0a", bgCard:"#141414", bgCard2:"#1c1c1c",
    accent:"#ffffff", accentGlow:"rgba(255,255,255,0.06)",
    text:"#ffffff", textSub:"#777", textMuted:"#333",
    border:"#1e1e1e", green:"#69f0ae", red:"#ff5252", yellow:"#ffd740",
    chart:["#fff","#aaa","#777","#555","#333","#eee","#ccc","#999"],
    header:"#0d0d0d",
  },
  "Azul Escuro": {
    bg:"#040d1a", bgCard:"#071628", bgCard2:"#0d2040",
    accent:"#2196f3", accentGlow:"rgba(33,150,243,0.15)",
    text:"#ffffff", textSub:"#90caf9", textMuted:"#1a3a6a",
    border:"#0d2040", green:"#00e5ff", red:"#ff5252", yellow:"#ffd740",
    chart:["#2196f3","#64b5f6","#00bcd4","#0d47a1","#80d8ff","#b3e5fc","#039be5","#4fc3f7"],
    header:"#050e1e",
  },
  "Verde Escuro": {
    bg:"#050f08", bgCard:"#0a1e0f", bgCard2:"#0f2a16",
    accent:"#00c853", accentGlow:"rgba(0,200,83,0.15)",
    text:"#ffffff", textSub:"#a5d6a7", textMuted:"#1a3d22",
    border:"#0f2a16", green:"#00e676", red:"#ff5252", yellow:"#ffd740",
    chart:["#00c853","#69f0ae","#00bfa5","#1b5e20","#b9f6ca","#00e676","#76ff03","#ccff90"],
    header:"#060e08",
  },
  "Light": {
    bg:"#f0f0f0", bgCard:"#ffffff", bgCard2:"#f5f5f5",
    accent:"#e53935", accentGlow:"rgba(229,57,53,0.08)",
    text:"#111", textSub:"#666", textMuted:"#bbb",
    border:"#e0e0e0", green:"#2e7d32", red:"#c62828", yellow:"#f9a825",
    chart:["#e53935","#ef9a9a","#b71c1c","#ff6f60","#ff1744","#ffcdd2","#d32f2f","#ff8a80"],
    header:"#e8e8e8",
  },
  "Midnight Purple": {
    bg:"#08040f", bgCard:"#130a20", bgCard2:"#1e1030",
    accent:"#9c27b0", accentGlow:"rgba(156,39,176,0.15)",
    text:"#ffffff", textSub:"#ce93d8", textMuted:"#2d1045",
    border:"#1e1030", green:"#76ff03", red:"#ff5252", yellow:"#ffd740",
    chart:["#9c27b0","#ce93d8","#e040fb","#4a148c","#f3e5f5","#ab47bc","#7b1fa2","#ea80fc"],
    header:"#090510",
  },
  "Sunset Orange": {
    bg:"#0f0800", bgCard:"#1e1200", bgCard2:"#2a1a00",
    accent:"#ff6d00", accentGlow:"rgba(255,109,0,0.15)",
    text:"#ffffff", textSub:"#ffcc80", textMuted:"#3e2000",
    border:"#2a1a00", green:"#69f0ae", red:"#ff5252", yellow:"#ffd740",
    chart:["#ff6d00","#ffab40","#ff9100","#e65100","#ffe0b2","#ffa726","#fb8c00","#f57c00"],
    header:"#0d0700",
  },
  "Glaciar": {
    bg:"#030d14", bgCard:"#071824", bgCard2:"#0d2535",
    accent:"#00bcd4", accentGlow:"rgba(0,188,212,0.15)",
    text:"#ffffff", textSub:"#80deea", textMuted:"#0d3040",
    border:"#0d2535", green:"#69f0ae", red:"#ff5252", yellow:"#ffd740",
    chart:["#00bcd4","#80deea","#00e5ff","#006064","#b2ebf2","#26c6da","#00acc1","#4dd0e1"],
    header:"#040c12",
  },
  "Rose Gold": {
    bg:"#0f080a", bgCard:"#1e1015", bgCard2:"#2a1820",
    accent:"#f48fb1", accentGlow:"rgba(244,143,177,0.15)",
    text:"#ffffff", textSub:"#f8bbd0", textMuted:"#3d1020",
    border:"#2a1820", green:"#69f0ae", red:"#ff5252", yellow:"#ffd740",
    chart:["#f48fb1","#f8bbd0","#e91e63","#880e4f","#fce4ec","#f06292","#c2185b","#ff80ab"],
    header:"#0d060a",
  },
  "Matrix": {
    bg:"#000000", bgCard:"#050f05", bgCard2:"#0a1a0a",
    accent:"#00ff41", accentGlow:"rgba(0,255,65,0.12)",
    text:"#00ff41", textSub:"#00bb30", textMuted:"#003b12",
    border:"#0a1a0a", green:"#00ff41", red:"#ff5252", yellow:"#ffd740",
    chart:["#00ff41","#00bb30","#008c22","#005e18","#003b12","#00ff41","#33ff66","#66ff88"],
    header:"#000",
  },
};

const CURRENCIES = { BRL:{ symbol:"R$" }, USD:{ symbol:"US$" } };
const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DEFAULT_CATEGORIES = [
  { id:1, name:"Alimentação", color:"#e53935", icon:"🍔" },
  { id:2, name:"Transporte",  color:"#2196f3", icon:"🚗" },
  { id:3, name:"Moradia",     color:"#9c27b0", icon:"🏠" },
  { id:4, name:"Saúde",       color:"#00c853", icon:"💊" },
  { id:5, name:"Lazer",       color:"#ff6d00", icon:"🎮" },
  { id:6, name:"Educação",    color:"#00bcd4", icon:"📚" },
  { id:7, name:"Vestuário",   color:"#f48fb1", icon:"👗" },
  { id:8, name:"Outros",      color:"#888",    icon:"📦" },
];

// ─── ICONS ───────────────────────────────────────────────────────────────────
const Ico = {
  plus:    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  trash:   <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3,6 5,6 21,6"/><path d="M19,6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3,0V4a2 2 0 012-2h4a2 2 0 012,2v2"/></svg>,
  refresh: <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23,4 23,10 17,10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>,
  x:       <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  bell:    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>,
  search:  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  palette: <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8z"/></svg>,
  chevL:   <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15,18 9,12 15,6"/></svg>,
  chevR:   <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9,18 15,12 9,6"/></svg>,
};

// ─── MODAL ───────────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children, t }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(6px)" }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:14,padding:26,width:390,boxShadow:`0 0 60px ${t.accentGlow}` }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18 }}>
          <span style={{ color:t.text,fontWeight:800,fontSize:15 }}>{title}</span>
          <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",color:t.textSub }}>{Ico.x}</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const mkKey = (y, m) => `nexus_month_${y}_${m}`;
const globalKey = "nexus_global";
const metaKey   = "nexus_meta";

function loadGlobal() {
  try { return JSON.parse(localStorage.getItem(globalKey)) || {}; } catch { return {}; }
}
function saveGlobal(data) {
  localStorage.setItem(globalKey, JSON.stringify(data));
}
function loadMonth(y, m) {
  try { return JSON.parse(localStorage.getItem(mkKey(y,m))) || { expenses:[], incomes:[] }; } catch { return { expenses:[], incomes:[] }; }
}
function saveMonth(y, m, data) {
  localStorage.setItem(mkKey(y,m), JSON.stringify(data));
}
function loadMeta() {
  try { return JSON.parse(localStorage.getItem(metaKey)); } catch { return null; }
}
function saveMeta(data) {
  localStorage.setItem(metaKey, JSON.stringify(data));
}

// saldo acumulado até o mês anterior
function getCarryover(year, month) {
  let total = 0;
  // iterate from origin up to (year, month) exclusive
  const meta = loadMeta();
  if (!meta) return 0;
  let y = meta.originYear, m = meta.originMonth;
  while (y < year || (y === year && m < month)) {
    const d = loadMonth(y, m);
    const inc = d.incomes.reduce((s,i)=>s+Number(i.value||0),0);
    const exp = d.expenses.reduce((s,e)=>s+Number(e.value||0),0);
    total += inc - exp;
    m++;
    if (m > 11) { m = 0; y++; }
  }
  return total;
}

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function App() {
  const now = new Date();

  // ── meta / origin ──
  const [meta, setMeta] = useState(() => {
    const m = loadMeta();
    if (m) return m;
    const fresh = { originYear: now.getFullYear(), originMonth: now.getMonth() };
    saveMeta(fresh);
    return fresh;
  });

  // ── navigation ──
  const [viewYear,  setViewYear]  = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  // ── global (persists across months) ──
  const [global, setGlobalState] = useState(() => {
    const g = loadGlobal();
    return {
      categories:  g.categories  || DEFAULT_CATEGORIES,
      investments: g.investments || [],
      theme:       g.theme       || "Dark Red",
      currency:    g.currency    || "BRL",
    };
  });

  // ── month data ──
  const [monthData, setMonthData] = useState(() => loadMonth(now.getFullYear(), now.getMonth()));

  // ── ui ──
  const [showThemes, setShowThemes] = useState(false);
  const [modal, setModal]           = useState(null);
  const [form,  setForm]            = useState({});

  // market
  const [stocks,     setStocks]     = useState([]);
  const [fiis,       setFiis]       = useState([]);
  const [loadingMkt, setLoadingMkt] = useState(false);

  // ── derived ──
  const t   = THEMES[global.theme];
  const sym = CURRENCIES[global.currency].symbol;
  const fmt = v => `${sym} ${Number(v||0).toLocaleString("pt-BR",{minimumFractionDigits:2})}`;

  const { expenses, incomes } = monthData;
  const { categories, investments } = global;

  const totalExp  = expenses.reduce((s,e)=>s+Number(e.value||0),0);
  const totalInc  = incomes.reduce((s,e)=>s+Number(e.value||0),0);
  const totalInv  = investments.reduce((s,e)=>s+Number(e.value||0),0);
  const carryover = getCarryover(viewYear, viewMonth);
  const balance   = carryover + totalInc - totalExp;

  const isOrigin = viewYear === meta.originYear && viewMonth === meta.originMonth;
  const isFuture = viewYear > now.getFullYear() || (viewYear === now.getFullYear() && viewMonth > now.getMonth());

  // ── persist month data ──
  useEffect(() => {
    saveMonth(viewYear, viewMonth, monthData);
  }, [monthData, viewYear, viewMonth]);

  // ── persist global ──
  useEffect(() => {
    saveGlobal(global);
  }, [global]);

  // ── load month when navigation changes ──
  useEffect(() => {
    setMonthData(loadMonth(viewYear, viewMonth));
  }, [viewYear, viewMonth]);

  // ── navigation ──
  const prevMonth = () => {
    if (isOrigin) return;
    if (viewMonth === 0) { setViewYear(y=>y-1); setViewMonth(11); }
    else setViewMonth(m=>m-1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y=>y+1); setViewMonth(0); }
    else setViewMonth(m=>m+1);
  };

  // ── market ──
  const fetchMarket = useCallback(async()=>{
    setLoadingMkt(true);
    try {
      const [s,f] = await Promise.all([
        fetch("https://brapi.dev/api/quote/PETR4,VALE3,ITUB4,BBDC4,ABEV3,WEGE3?fundamental=false"),
        fetch("https://brapi.dev/api/quote/MXRF11,HGLG11,KNRI11,XPML11?fundamental=false"),
      ]);
      const sd=await s.json(); const fd=await f.json();
      if(sd.results) setStocks(sd.results);
      if(fd.results) setFiis(fd.results);
    } catch{}
    setLoadingMkt(false);
  },[]);
  useEffect(()=>{ fetchMarket(); },[fetchMarket]);

  // ── chart data ──
  const MONTHS_SHORT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const monthly = MONTHS_SHORT.map((m,i)=>{
    const d = loadMonth(viewYear, i);
    return {
      m,
      R: d.incomes.reduce((s,x)=>s+Number(x.value||0),0),
      G: d.expenses.reduce((s,x)=>s+Number(x.value||0),0),
    };
  });
  const expByCat = categories.map(c=>({
    name:c.name,
    value:expenses.filter(e=>e.catId===c.id).reduce((s,e)=>s+Number(e.value||0),0),
    color:c.color, icon:c.icon,
  })).filter(c=>c.value>0);

  // ── style helpers ──
  const inp  = { background:t.bg, border:`1px solid ${t.border}`, borderRadius:8, color:t.text, padding:"9px 12px", width:"100%", fontSize:13, outline:"none", boxSizing:"border-box", marginBottom:10, fontFamily:"inherit" };
  const C    = (bg, col="#fff") => ({ background:bg, border:"none", borderRadius:7, color:col, padding:"5px 10px", cursor:"pointer", fontSize:11, fontWeight:700, display:"flex", alignItems:"center", gap:5 });
  const G    = (col) => ({ background:"none", border:`1px solid ${col}`, borderRadius:7, color:col, padding:"4px 9px", cursor:"pointer", fontSize:10, fontWeight:700, display:"flex", alignItems:"center", gap:5 });
  const card = { background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:11, padding:"13px 15px", overflow:"hidden" };
  const TT   = { contentStyle:{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:8, color:t.text, fontSize:10 }, cursor:{ fill:"rgba(255,255,255,0.03)" } };
  const lbl  = { color:t.textSub, fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:0.9 };

  // ── actions ──
  const closeModal = () => { setModal(null); setForm({}); };

  const updMonth = (fn) => setMonthData(prev => {
    const next = fn(prev);
    return next;
  });
  const updGlobal = (fn) => setGlobalState(prev => fn(prev));

  const addExpense = () => {
    if (!form.desc || !form.value) return;
    updMonth(p=>({ ...p, expenses:[...p.expenses,{...form,id:Date.now(),date:form.date||new Date().toISOString().slice(0,10)}] }));
    closeModal();
  };
  const addIncome = () => {
    if (!form.desc || !form.value) return;
    updMonth(p=>({ ...p, incomes:[...p.incomes,{...form,id:Date.now(),date:form.date||new Date().toISOString().slice(0,10)}] }));
    closeModal();
  };
  const addInvest = () => {
    if (!form.name || !form.value) return;
    updGlobal(p=>({ ...p, investments:[...p.investments,{...form,id:Date.now()}] }));
    closeModal();
  };
  const addCat = () => {
    if (!form.name) return;
    updGlobal(p=>({ ...p, categories:[...p.categories,{id:Date.now(),name:form.name,color:form.color||"#888",icon:form.icon||"📦"}] }));
    closeModal();
  };
  const delExpense  = id => updMonth(p=>({ ...p, expenses:p.expenses.filter(e=>e.id!==id) }));
  const delIncome   = id => updMonth(p=>({ ...p, incomes:p.incomes.filter(e=>e.id!==id) }));
  const delInvest   = id => updGlobal(p=>({ ...p, investments:p.investments.filter(e=>e.id!==id) }));
  const delCat      = id => updGlobal(p=>({ ...p, categories:p.categories.filter(c=>c.id!==id) }));
  const setTheme    = tn => updGlobal(p=>({ ...p, theme:tn }));
  const setCurrency = c  => updGlobal(p=>({ ...p, currency:c }));

  return (
    <div style={{ minHeight:"100vh", background:t.bg, color:t.text, fontFamily:"'DM Sans','Segoe UI',sans-serif", display:"flex", flexDirection:"column" }}>

      {/* ── HEADER ── */}
      <div style={{ background:t.header, borderBottom:`1px solid ${t.border}`, padding:"0 18px", height:54, display:"flex", alignItems:"center", gap:12, flexShrink:0, position:"sticky", top:0, zIndex:200 }}>

        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:7, marginRight:6 }}>
          <div style={{ width:28, height:28, borderRadius:7, background:t.accent, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:13, color:"#fff", boxShadow:`0 0 12px ${t.accentGlow}` }}>N</div>
          <span style={{ fontWeight:800, fontSize:15, color:t.text, letterSpacing:-0.3 }}>Nexus</span>
        </div>

        {/* Search */}
        <div style={{ display:"flex", alignItems:"center", gap:7, background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:8, padding:"5px 11px", flex:1, maxWidth:260 }}>
          <span style={{ color:t.textMuted }}>{Ico.search}</span>
          <input placeholder="Buscar transação..." style={{ background:"none", border:"none", color:t.text, outline:"none", fontSize:12, width:"100%", fontFamily:"inherit" }}/>
        </div>

        <div style={{ flex:1 }}/>

        {/* ── MONTH NAVIGATOR ── */}
        <div style={{ display:"flex", alignItems:"center", gap:0, background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:9, overflow:"hidden" }}>
          <button onClick={prevMonth} disabled={isOrigin} style={{ ...C(isOrigin?"transparent":t.bgCard2, isOrigin?t.textMuted:t.text), borderRadius:0, padding:"6px 10px", opacity:isOrigin?0.3:1 }}>{Ico.chevL}</button>
          <div style={{ padding:"0 14px", minWidth:160, textAlign:"center" }}>
            <div style={{ fontWeight:800, fontSize:13, color:t.text }}>{MONTH_NAMES[viewMonth]}</div>
            <div style={{ fontSize:10, color:t.textSub }}>{viewYear}</div>
          </div>
          <button onClick={nextMonth} style={{ ...C(t.bgCard2, t.text), borderRadius:0, padding:"6px 10px" }}>{Ico.chevR}</button>
        </div>

        {/* Currency */}
        <div style={{ display:"flex", background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:7, overflow:"hidden" }}>
          {["BRL","USD"].map(c=>(
            <button key={c} onClick={()=>setCurrency(c)} style={{ padding:"5px 11px", border:"none", cursor:"pointer", fontSize:11, fontWeight:700, background:global.currency===c?t.accent:"transparent", color:global.currency===c?"#fff":t.textSub, transition:"all 0.15s" }}>{c}</button>
          ))}
        </div>

        {/* Theme */}
        <div style={{ position:"relative" }}>
          <button onClick={()=>setShowThemes(p=>!p)} style={{ ...G(t.textSub), padding:"5px 10px" }}>{Ico.palette} Tema</button>
          {showThemes && (
            <div style={{ position:"absolute", right:0, top:38, background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:12, padding:10, zIndex:300, width:180, boxShadow:"0 16px 48px rgba(0,0,0,0.7)" }}>
              <div style={{ ...lbl, marginBottom:8 }}>Temas</div>
              {Object.keys(THEMES).map(tn=>(
                <button key={tn} onClick={()=>{ setTheme(tn); setShowThemes(false); }} style={{ display:"flex", alignItems:"center", gap:7, width:"100%", background:global.theme===tn?t.accentGlow:"transparent", border:`1px solid ${global.theme===tn?t.accent:"transparent"}`, borderRadius:7, padding:"5px 9px", cursor:"pointer", marginBottom:2 }}>
                  <div style={{ width:10, height:10, borderRadius:"50%", background:THEMES[tn].accent, flexShrink:0 }}/>
                  <span style={{ color:t.text, fontSize:12 }}>{tn}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <span style={{ color:t.textSub }}>{Ico.bell}</span>
        <div style={{ width:28, height:28, borderRadius:"50%", background:t.accent, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:"#fff" }}>U</div>
      </div>

      {/* ── MONTH BANNER (carryover info) ── */}
      {carryover !== 0 && (
        <div style={{ background: carryover>0 ? t.green+"18" : t.red+"18", borderBottom:`1px solid ${carryover>0?t.green+"44":t.red+"44"}`, padding:"6px 18px", display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:11, color:carryover>0?t.green:t.red, fontWeight:700 }}>
            {carryover>0?"▲":"▼"} Saldo acumulado do mês anterior: {fmt(Math.abs(carryover))}
            {carryover<0 ? " (dívida)" : " (a favor)"}
          </span>
        </div>
      )}

      {/* ── DENSE GRID ── */}
      <div style={{ flex:1, padding:"14px 16px", display:"grid", gap:10,
        gridTemplateColumns:"200px 1fr 1fr 1fr 200px",
        gridTemplateRows:"auto auto auto auto",
        alignContent:"start",
      }}>

        {/* COL 1 — KPIs + Categorias */}
        <div style={{ gridColumn:"1", gridRow:"1/5", display:"flex", flexDirection:"column", gap:9 }}>

          {[
            { label:"Saldo do Mês",  val:balance,   color:balance>=0?t.green:t.red, sub:balance>=0?"▲ Positivo":"▼ Negativo", mo:null },
            { label:"Receitas",      val:totalInc,  color:t.green, sub:`${incomes.length} lançamentos`,    mo:"income" },
            { label:"Gastos",        val:totalExp,  color:t.red,   sub:`${expenses.length} lançamentos`,   mo:"expense" },
            { label:"Investido",     val:totalInv,  color:t.accent, sub:`${investments.length} posições`,  mo:"investment" },
          ].map(k=>(
            <div key={k.label} style={{ ...card, borderLeft:`3px solid ${k.color}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div>
                  <div style={lbl}>{k.label}</div>
                  <div style={{ color:k.color, fontSize:19, fontWeight:800, marginTop:3, lineHeight:1.1 }}>{fmt(k.val)}</div>
                  <div style={{ color:t.textMuted, fontSize:10, marginTop:2 }}>{k.sub}</div>
                </div>
                {k.mo && !isFuture && (
                  <button onClick={()=>setModal(k.mo)} style={{ ...C(k.color), padding:"4px 8px" }}>{Ico.plus}</button>
                )}
              </div>
            </div>
          ))}

          {/* Categorias */}
          <div style={{ ...card, flex:1 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:9 }}>
              <div style={lbl}>Categorias</div>
              <button onClick={()=>setModal("category")} style={{ ...G(t.accent), padding:"3px 7px", fontSize:10 }}>{Ico.plus}</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:4, maxHeight:240, overflowY:"auto" }}>
              {categories.map(cat=>{
                const tot = expenses.filter(e=>e.catId===cat.id).reduce((s,e)=>s+Number(e.value||0),0);
                return (
                  <div key={cat.id} style={{ display:"flex", alignItems:"center", gap:7, padding:"5px 7px", borderRadius:7, background:t.bgCard2 }}>
                    <div style={{ width:6, height:6, borderRadius:"50%", background:cat.color, flexShrink:0 }}/>
                    <span style={{ fontSize:11, flex:1, color:t.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{cat.icon} {cat.name}</span>
                    <span style={{ fontSize:10, color:t.textSub, flexShrink:0 }}>{tot>0?fmt(tot):""}</span>
                    <button onClick={()=>delCat(cat.id)} style={{ background:"none", border:"none", cursor:"pointer", color:t.textMuted, padding:0, lineHeight:0, flexShrink:0 }}>{Ico.trash}</button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* GRÁFICO MENSAL */}
        <div style={{ ...card, gridColumn:"2/4", gridRow:"1" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <span style={{ fontWeight:700, fontSize:13 }}>Receitas vs Gastos — {viewYear}</span>
            <span style={lbl}>Mensal</span>
          </div>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={monthly} barGap={2} barSize={9}>
              <XAxis dataKey="m" tick={{ fill:t.textMuted, fontSize:9 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill:t.textMuted, fontSize:9 }} axisLine={false} tickLine={false} width={34}/>
              <Tooltip {...TT} formatter={v=>fmt(v)}/>
              <Bar dataKey="R" name="Receita" fill={t.green} radius={[3,3,0,0]}/>
              <Bar dataKey="G" name="Gasto"   fill={t.red}   radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* DONUT CATEGORIAS */}
        <div style={{ ...card, gridColumn:"4", gridRow:"1" }}>
          <div style={{ fontWeight:700, fontSize:13, marginBottom:8 }}>Por Categoria</div>
          {expByCat.length===0
            ? <div style={{ color:t.textMuted, fontSize:12, textAlign:"center", paddingTop:36 }}>Sem gastos</div>
            : <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  <Pie data={expByCat} cx="50%" cy="50%" innerRadius={34} outerRadius={54} dataKey="value">
                    {expByCat.map((e,i)=><Cell key={i} fill={e.color}/>)}
                  </Pie>
                  <Tooltip {...TT} formatter={v=>fmt(v)}/>
                </PieChart>
              </ResponsiveContainer>
          }
        </div>

        {/* CARTEIRA (col 5 rows 1-3) */}
        <div style={{ ...card, gridColumn:"5", gridRow:"1/4" }}>
          <div style={{ fontWeight:700, fontSize:13, marginBottom:8 }}>Carteira</div>
          {investments.length===0
            ? <div style={{ color:t.textMuted, fontSize:12, textAlign:"center", paddingTop:40 }}>Sem investimentos</div>
            : <>
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart>
                    <Pie data={investments.map(i=>({name:i.name,value:Number(i.value)}))} cx="50%" cy="50%" innerRadius={34} outerRadius={54} dataKey="value">
                      {investments.map((_,i)=><Cell key={i} fill={t.chart[i%t.chart.length]}/>)}
                    </Pie>
                    <Tooltip {...TT} formatter={v=>fmt(v)}/>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display:"flex", flexDirection:"column", gap:5, marginTop:8, maxHeight:200, overflowY:"auto" }}>
                  {investments.map((inv,i)=>(
                    <div key={inv.id} style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 0", borderBottom:`1px solid ${t.border}` }}>
                      <div style={{ width:7, height:7, borderRadius:2, background:t.chart[i%t.chart.length], flexShrink:0 }}/>
                      <span style={{ fontSize:11, color:t.text, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{inv.name}</span>
                      <span style={{ fontSize:10, color:t.accent, fontWeight:700, flexShrink:0 }}>{fmt(inv.value)}</span>
                      <button onClick={()=>delInvest(inv.id)} style={{ background:"none", border:"none", cursor:"pointer", color:t.textMuted, padding:0, lineHeight:0 }}>{Ico.trash}</button>
                    </div>
                  ))}
                </div>
              </>
          }
          <button onClick={()=>setModal("investment")} style={{ ...G(t.border), width:"100%", justifyContent:"center", marginTop:10, color:t.textSub }}>
            {Ico.plus} Novo Investimento
          </button>
        </div>

        {/* ÚLTIMOS GASTOS */}
        <div style={{ ...card, gridColumn:"2/3", gridRow:"2/4" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:9 }}>
            <span style={{ fontWeight:700, fontSize:13 }}>Gastos — {MONTH_NAMES[viewMonth]}</span>
            {!isFuture && <button onClick={()=>setModal("expense")} style={{ ...C(t.red), padding:"4px 9px" }}>{Ico.plus} Novo</button>}
          </div>
          {expenses.length===0
            ? <div style={{ color:t.textMuted, fontSize:12, textAlign:"center", padding:"28px 0" }}>Nenhum gasto neste mês</div>
            : <div style={{ display:"flex", flexDirection:"column", maxHeight:260, overflowY:"auto" }}>
                {[...expenses].reverse().map(exp=>{
                  const cat = categories.find(c=>c.id===exp.catId);
                  return (
                    <div key={exp.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 0", borderBottom:`1px solid ${t.border}` }}>
                      <div style={{ width:26, height:26, borderRadius:6, background:(cat?.color||"#888")+"22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, flexShrink:0 }}>{cat?.icon||"📦"}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, color:t.text, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{exp.desc}</div>
                        <div style={{ fontSize:10, color:t.textMuted }}>{cat?.name||"—"} · {exp.date}</div>
                      </div>
                      <div style={{ color:t.red, fontWeight:700, fontSize:12, flexShrink:0 }}>-{fmt(exp.value)}</div>
                      <button onClick={()=>delExpense(exp.id)} style={{ background:"none", border:"none", cursor:"pointer", color:t.textMuted, padding:0, lineHeight:0 }}>{Ico.trash}</button>
                    </div>
                  );
                })}
              </div>
          }
        </div>

        {/* ÚLTIMAS RECEITAS */}
        <div style={{ ...card, gridColumn:"3/4", gridRow:"2/4" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:9 }}>
            <span style={{ fontWeight:700, fontSize:13 }}>Receitas — {MONTH_NAMES[viewMonth]}</span>
            {!isFuture && <button onClick={()=>setModal("income")} style={{ ...C(t.green), padding:"4px 9px" }}>{Ico.plus} Nova</button>}
          </div>
          {incomes.length===0
            ? <div style={{ color:t.textMuted, fontSize:12, textAlign:"center", padding:"28px 0" }}>Nenhuma receita neste mês</div>
            : <div style={{ display:"flex", flexDirection:"column", maxHeight:260, overflowY:"auto" }}>
                {[...incomes].reverse().map(inc=>(
                  <div key={inc.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 0", borderBottom:`1px solid ${t.border}` }}>
                    <div style={{ width:26, height:26, borderRadius:6, background:t.green+"22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, flexShrink:0 }}>💵</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, color:t.text, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{inc.desc}</div>
                      <div style={{ fontSize:10, color:t.textMuted }}>{inc.source||"—"} · {inc.date}</div>
                    </div>
                    <div style={{ color:t.green, fontWeight:700, fontSize:12, flexShrink:0 }}>+{fmt(inc.value)}</div>
                    <button onClick={()=>delIncome(inc.id)} style={{ background:"none", border:"none", cursor:"pointer", color:t.textMuted, padding:0, lineHeight:0 }}>{Ico.trash}</button>
                  </div>
                ))}
              </div>
          }
        </div>

        {/* AÇÕES */}
        <div style={{ ...card, gridColumn:"4/5", gridRow:"2" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <span style={{ fontWeight:700, fontSize:13 }}>📈 Ações B3</span>
            <button onClick={fetchMarket} style={{ ...G(t.textSub), fontSize:10 }}>{Ico.refresh}{loadingMkt?"...":"Atualizar"}</button>
          </div>
          {stocks.length===0
            ? <div style={{ color:t.textMuted, fontSize:12, textAlign:"center", padding:"16px 0" }}>{loadingMkt?"Carregando...":"Sem dados"}</div>
            : <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                {stocks.map(s=>{
                  const up = s.regularMarketChangePercent>=0;
                  return (
                    <div key={s.symbol} style={{ background:t.bgCard2, borderRadius:7, padding:"7px 9px", borderLeft:`2px solid ${up?t.green:t.red}` }}>
                      <div style={{ display:"flex", justifyContent:"space-between" }}>
                        <span style={{ fontWeight:800, fontSize:11 }}>{s.symbol}</span>
                        <span style={{ fontSize:9, color:up?t.green:t.red, fontWeight:700 }}>{up?"▲":"▼"}{Math.abs(s.regularMarketChangePercent||0).toFixed(2)}%</span>
                      </div>
                      <div style={{ fontSize:13, fontWeight:800, marginTop:2 }}>R$ {(s.regularMarketPrice||0).toFixed(2)}</div>
                    </div>
                  );
                })}
              </div>
          }
        </div>

        {/* FIIs */}
        <div style={{ ...card, gridColumn:"4/5", gridRow:"3" }}>
          <div style={{ fontWeight:700, fontSize:13, marginBottom:8 }}>🏢 FIIs</div>
          {fiis.length===0
            ? <div style={{ color:t.textMuted, fontSize:12, textAlign:"center", padding:"16px 0" }}>{loadingMkt?"Carregando...":"Sem dados"}</div>
            : <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                {fiis.map(s=>{
                  const up = s.regularMarketChangePercent>=0;
                  return (
                    <div key={s.symbol} style={{ background:t.bgCard2, borderRadius:7, padding:"7px 9px", borderLeft:`2px solid ${up?t.green:t.red}` }}>
                      <div style={{ display:"flex", justifyContent:"space-between" }}>
                        <span style={{ fontWeight:800, fontSize:11 }}>{s.symbol}</span>
                        <span style={{ fontSize:9, color:up?t.green:t.red, fontWeight:700 }}>{up?"▲":"▼"}{Math.abs(s.regularMarketChangePercent||0).toFixed(2)}%</span>
                      </div>
                      <div style={{ fontSize:13, fontWeight:800, marginTop:2 }}>R$ {(s.regularMarketPrice||0).toFixed(2)}</div>
                    </div>
                  );
                })}
              </div>
          }
        </div>

        {/* ÁREA EVOLUÇÃO */}
        <div style={{ ...card, gridColumn:"1/4", gridRow:"4" }}>
          <div style={{ fontWeight:700, fontSize:13, marginBottom:8 }}>Evolução Anual — {viewYear}</div>
          <ResponsiveContainer width="100%" height={100}>
            <AreaChart data={monthly}>
              <defs>
                <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={t.green} stopOpacity={0.3}/><stop offset="95%" stopColor={t.green} stopOpacity={0}/></linearGradient>
                <linearGradient id="gG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={t.red} stopOpacity={0.3}/><stop offset="95%" stopColor={t.red} stopOpacity={0}/></linearGradient>
              </defs>
              <XAxis dataKey="m" tick={{ fill:t.textMuted, fontSize:9 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill:t.textMuted, fontSize:9 }} axisLine={false} tickLine={false} width={34}/>
              <Tooltip {...TT} formatter={v=>fmt(v)}/>
              <Area type="monotone" dataKey="R" name="Receita" stroke={t.green} fill="url(#gR)" strokeWidth={1.5}/>
              <Area type="monotone" dataKey="G" name="Gasto"   stroke={t.red}   fill="url(#gG)" strokeWidth={1.5}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* LISTA INVESTIMENTOS */}
        <div style={{ ...card, gridColumn:"4/6", gridRow:"4" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:9 }}>
            <span style={{ fontWeight:700, fontSize:13 }}>Investimentos</span>
            <button onClick={()=>setModal("investment")} style={{ ...C(t.accent), padding:"4px 9px" }}>{Ico.plus} Novo</button>
          </div>
          {investments.length===0
            ? <div style={{ color:t.textMuted, fontSize:12, textAlign:"center", padding:"18px 0" }}>Nenhum investimento</div>
            : <div style={{ display:"flex", flexDirection:"column", gap:0, maxHeight:110, overflowY:"auto" }}>
                {investments.map((inv,i)=>(
                  <div key={inv.id} style={{ display:"flex", alignItems:"center", gap:7, padding:"6px 0", borderBottom:`1px solid ${t.border}` }}>
                    <div style={{ width:7, height:7, borderRadius:2, background:t.chart[i%t.chart.length], flexShrink:0 }}/>
                    <span style={{ fontSize:12, color:t.text, flex:1 }}>{inv.name}</span>
                    <span style={{ fontSize:10, color:t.textMuted }}>{inv.type||"—"}</span>
                    <span style={{ fontSize:12, color:t.accent, fontWeight:700 }}>{fmt(inv.value)}</span>
                    <span style={{ fontSize:10, color:t.textMuted }}>{totalInv?((inv.value/totalInv)*100).toFixed(0):0}%</span>
                    <button onClick={()=>delInvest(inv.id)} style={{ background:"none", border:"none", cursor:"pointer", color:t.textMuted, padding:0, lineHeight:0 }}>{Ico.trash}</button>
                  </div>
                ))}
              </div>
          }
        </div>

      </div>

      {/* ── MODALS ── */}
      <Modal open={modal==="expense"} onClose={closeModal} title={`Novo Gasto — ${MONTH_NAMES[viewMonth]}`} t={t}>
        <input style={inp} placeholder="Descrição *" value={form.desc||""} onChange={e=>setForm(p=>({...p,desc:e.target.value}))}/>
        <input style={inp} type="number" placeholder="Valor *" value={form.value||""} onChange={e=>setForm(p=>({...p,value:e.target.value}))}/>
        <input style={inp} type="date" value={form.date||""} onChange={e=>setForm(p=>({...p,date:e.target.value}))}/>
        <select style={inp} value={form.catId||""} onChange={e=>setForm(p=>({...p,catId:Number(e.target.value)}))}>
          <option value="">Categoria</option>
          {categories.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
        <button onClick={addExpense} style={{ ...C(t.red), width:"100%", justifyContent:"center", padding:"10px", fontSize:13, marginTop:4 }}>Adicionar Gasto</button>
      </Modal>

      <Modal open={modal==="income"} onClose={closeModal} title={`Nova Receita — ${MONTH_NAMES[viewMonth]}`} t={t}>
        <input style={inp} placeholder="Descrição *" value={form.desc||""} onChange={e=>setForm(p=>({...p,desc:e.target.value}))}/>
        <input style={inp} type="number" placeholder="Valor *" value={form.value||""} onChange={e=>setForm(p=>({...p,value:e.target.value}))}/>
        <input style={inp} placeholder="Fonte (ex: Salário, Freelance...)" value={form.source||""} onChange={e=>setForm(p=>({...p,source:e.target.value}))}/>
        <input style={inp} type="date" value={form.date||""} onChange={e=>setForm(p=>({...p,date:e.target.value}))}/>
        <button onClick={addIncome} style={{ ...C(t.green), width:"100%", justifyContent:"center", padding:"10px", fontSize:13, marginTop:4 }}>Adicionar Receita</button>
      </Modal>

      <Modal open={modal==="investment"} onClose={closeModal} title="Novo Investimento" t={t}>
        <input style={inp} placeholder="Nome *" value={form.name||""} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/>
        <input style={inp} type="number" placeholder="Valor aportado *" value={form.value||""} onChange={e=>setForm(p=>({...p,value:e.target.value}))}/>
        <select style={inp} value={form.type||""} onChange={e=>setForm(p=>({...p,type:e.target.value}))}>
          <option value="">Tipo</option>
          {["Ação","FII","CDB","Tesouro Direto","Renda Fixa","Cripto","ETF","Outro"].map(tp=><option key={tp}>{tp}</option>)}
        </select>
        <button onClick={addInvest} style={{ ...C(t.accent), width:"100%", justifyContent:"center", padding:"10px", fontSize:13, marginTop:4 }}>Adicionar Investimento</button>
      </Modal>

      <Modal open={modal==="category"} onClose={closeModal} title="Nova Categoria" t={t}>
        <input style={inp} placeholder="Nome *" value={form.name||""} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/>
        <div style={{ display:"flex", gap:10 }}>
          <input style={{ ...inp, flex:1, marginBottom:0 }} placeholder="Emoji (ex: 🛒)" value={form.icon||""} onChange={e=>setForm(p=>({...p,icon:e.target.value}))}/>
          <div style={{ flex:1 }}>
            <div style={{ color:t.textSub, fontSize:11, marginBottom:5 }}>Cor</div>
            <input type="color" value={form.color||"#888"} onChange={e=>setForm(p=>({...p,color:e.target.value}))} style={{ width:"100%", height:39, borderRadius:8, border:`1px solid ${t.border}`, background:t.bg, cursor:"pointer" }}/>
          </div>
        </div>
        <button onClick={addCat} style={{ ...C(t.accent), width:"100%", justifyContent:"center", padding:"10px", fontSize:13, marginTop:12 }}>Criar Categoria</button>
      </Modal>

    </div>
  );
}
