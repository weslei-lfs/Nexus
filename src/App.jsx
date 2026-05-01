
// ─── SUPABASE CLIENT ──────────────────────────────────────────────────────────
const SUPA_URL = "https://tpglmgsuolpzqkwdbjbq.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwZ2xtZ3N1b2xwenFrd2RiamJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NDY2NjYsImV4cCI6MjA5MzIyMjY2Nn0.qudWmbfGIwOXVo9jlj_lqJKUI0EaUEYkSWLLGxmjjgQ";

async function supaGet(path) {
  try {
    const res = await fetch(SUPA_URL + "/rest/v1/" + path, {
      method: "GET",
      headers: {
        "apikey": SUPA_KEY,
        "Authorization": "Bearer " + SUPA_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch(e) {
    console.error("supaGet error:", e);
    return [];
  }
}

async function supaPost(path, body) {
  try {
    const res = await fetch(SUPA_URL + "/rest/v1/" + path, {
      method: "POST",
      headers: {
        "apikey": SUPA_KEY,
        "Authorization": "Bearer " + SUPA_KEY,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
        "Accept": "application/json",
      },
      body: JSON.stringify(body),
    });
    // 200, 201, 204 are all success
    return res.status >= 200 && res.status < 300;
  } catch(e) {
    console.error("supaPost error:", e);
    return false;
  }
}

async function supaInsertNew(path, body) {
  // Insert only - fail if exists (no upsert)
  try {
    const res = await fetch(SUPA_URL + "/rest/v1/" + path, {
      method: "POST",
      headers: {
        "apikey": SUPA_KEY,
        "Authorization": "Bearer " + SUPA_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(body),
    });
    return res.status >= 200 && res.status < 300;
  } catch(e) {
    console.error("supaInsertNew error:", e);
    return false;
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────
async function dbFindUser(username) {
  const rows = await supaGet(`nexus_users?username=eq.${encodeURIComponent(username)}&select=username,password,display_name`);
  return rows[0] || null;
}
async function dbSaveUser(username, password, displayName) {
  return supaInsertNew("nexus_users", { username, password, display_name: displayName });
}

// ── Global data ───────────────────────────────────────────────────────────────
async function dbLoadGlobal(username) {
  const rows = await supaGet(`nexus_global?username=eq.${encodeURIComponent(username)}&select=data`);
  return rows[0]?.data || null;
}
async function dbSaveGlobal(username, data) {
  return supaPost("nexus_global", { username, data, updated_at: new Date().toISOString() });
}

// ── Month data ────────────────────────────────────────────────────────────────
async function dbLoadMonth(username, year, month) {
  const rows = await supaGet(`nexus_months?username=eq.${encodeURIComponent(username)}&year=eq.${year}&month=eq.${month}&select=data`);
  return rows[0]?.data || null;
}
async function dbSaveMonth(username, year, month, data) {
  return supaPost("nexus_months", { username, year, month, data, updated_at: new Date().toISOString() });
}
async function dbLoadAllMonths(username, year) {
  return supaGet(`nexus_months?username=eq.${encodeURIComponent(username)}&year=eq.${year}&select=month,data`);
}

// ── Meta ──────────────────────────────────────────────────────────────────────
async function dbLoadMeta(username) {
  const rows = await supaGet(`nexus_meta?username=eq.${encodeURIComponent(username)}&select=data`);
  return rows[0]?.data || null;
}
async function dbSaveMeta(username, data) {
  return supaPost("nexus_meta", { username, data });
}

// ── Shared assets ─────────────────────────────────────────────────────────────
async function dbLoadSharedAssets() {
  return supaGet("nexus_shared_assets?select=symbol,data");
}
async function dbSaveSharedAsset(symbol, data) {
  return supaPost("nexus_shared_assets", { symbol, data });
}

import { useState, useEffect, useCallback, useRef } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

const GlobalStyle = () => (
  <style>{`
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #root { height: 100%; width: 100%; background: #0d0d0d; }
    body { overflow-x: hidden; }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
    input[type=color] { -webkit-appearance: none; padding: 0; border: none; cursor: pointer; }
    input[type=color]::-webkit-color-swatch-wrapper { padding: 0; }
    input[type=color]::-webkit-color-swatch { border: none; border-radius: 6px; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
    @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
    .fade-in { animation: fadeIn 0.3s ease; }
  `}</style>
);

// ─── NEXUS LOGO (PNG + CSS filter per theme) ─────────────────────────────────
const LOGO_B64 = "data:image/png;base64,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";const THEME_FILTERS = {
  "Dark Red": "none",
  "Dark": "grayscale(1) brightness(2)",
  "Azul Escuro": "hue-rotate(220deg) saturate(2) brightness(1.2)",
  "Verde Escuro": "hue-rotate(100deg) saturate(2) brightness(1.1)",
  "Light": "none",
  "Midnight Purple": "hue-rotate(265deg) saturate(2) brightness(1.2)",
  "Sunset Orange": "hue-rotate(15deg) saturate(3) brightness(1.1)",
  "Glaciar": "hue-rotate(170deg) saturate(2) brightness(1.2)",
  "Rose Gold": "hue-rotate(330deg) saturate(2) brightness(1.2)",
  "Matrix": "hue-rotate(110deg) saturate(3) brightness(1.4)",
  "Neon Pink": "hue-rotate(310deg) saturate(3) brightness(1.2)",
  "Caramelo": "hue-rotate(25deg) saturate(2.5) brightness(1.1)",
  "Safira": "hue-rotate(210deg) saturate(2.5) brightness(1.2)",
  "Esmeralda": "hue-rotate(155deg) saturate(2) brightness(1.1)",
  "Grafite": "grayscale(0.8) brightness(1.5)",
  "Aurora": "hue-rotate(250deg) saturate(2.5) brightness(1.2)",
  "Cobre": "hue-rotate(20deg) saturate(2) brightness(1.0)",
  "Obsidiana": "hue-rotate(355deg) saturate(1.5) brightness(0.9)",
  "Tropical": "hue-rotate(160deg) saturate(2.5) brightness(1.2)",
  "Violeta Neon": "hue-rotate(280deg) saturate(3) brightness(1.3)",
  "Dourado": "hue-rotate(35deg) saturate(3) brightness(1.2)",
  "Arctic": "hue-rotate(200deg) saturate(2) brightness(1.1)",
  "Carbon": "hue-rotate(110deg) saturate(2) brightness(1.3)",
  "Lavanda": "hue-rotate(245deg) saturate(2.5) brightness(1.2)",
  "Sakura": "hue-rotate(320deg) saturate(2.5) brightness(1.2)",
};

function NexusLogo({ themeName, size = 36 }) {
  const filter = THEME_FILTERS[themeName] || "none";
  return (
    <img
      src={LOGO_B64}
      alt="Nexus"
      style={{ width:size, height:size, objectFit:"contain", filter, transition:"filter 0.3s" }}
    />
  );
}


// ─── 25 THEMES ───────────────────────────────────────────────────────────────
const THEMES = {
  "Dark Red":        { bg:"#0d0d0d", bgCard:"#161616", bgCard2:"#1e1e1e", accent:"#e53935", accentGlow:"rgba(229,57,53,0.15)",   text:"#fff", textSub:"#888", textMuted:"#444", border:"#242424", green:"#4caf50", red:"#e53935", yellow:"#ffc107", chart:["#e53935","#ff6f60","#b71c1c","#ef9a9a","#ff1744","#ff8a80","#d32f2f","#ffcdd2"], header:"#111" },
  "Dark":            { bg:"#0a0a0a", bgCard:"#141414", bgCard2:"#1c1c1c", accent:"#ffffff", accentGlow:"rgba(255,255,255,0.06)", text:"#fff", textSub:"#777", textMuted:"#333", border:"#1e1e1e", green:"#69f0ae", red:"#ff5252", yellow:"#ffd740", chart:["#fff","#aaa","#777","#555","#333","#eee","#ccc","#999"],               header:"#0d0d0d" },
  "Azul Escuro":     { bg:"#040d1a", bgCard:"#071628", bgCard2:"#0d2040", accent:"#2196f3", accentGlow:"rgba(33,150,243,0.15)",  text:"#fff", textSub:"#90caf9", textMuted:"#1a3a6a", border:"#0d2040", green:"#00e5ff", red:"#ff5252", yellow:"#ffd740", chart:["#2196f3","#64b5f6","#00bcd4","#0d47a1","#80d8ff","#b3e5fc","#039be5","#4fc3f7"], header:"#050e1e" },
  "Verde Escuro":    { bg:"#050f08", bgCard:"#0a1e0f", bgCard2:"#0f2a16", accent:"#00c853", accentGlow:"rgba(0,200,83,0.15)",    text:"#fff", textSub:"#a5d6a7", textMuted:"#1a3d22", border:"#0f2a16", green:"#00e676", red:"#ff5252", yellow:"#ffd740", chart:["#00c853","#69f0ae","#00bfa5","#1b5e20","#b9f6ca","#00e676","#76ff03","#ccff90"], header:"#060e08" },
  "Light":           { bg:"#f0f0f0", bgCard:"#ffffff", bgCard2:"#f5f5f5", accent:"#e53935", accentGlow:"rgba(229,57,53,0.08)",   text:"#111", textSub:"#666", textMuted:"#bbb", border:"#e0e0e0", green:"#2e7d32", red:"#c62828", yellow:"#f9a825", chart:["#e53935","#ef9a9a","#b71c1c","#ff6f60","#ff1744","#ffcdd2","#d32f2f","#ff8a80"], header:"#e8e8e8" },
  "Midnight Purple": { bg:"#08040f", bgCard:"#130a20", bgCard2:"#1e1030", accent:"#9c27b0", accentGlow:"rgba(156,39,176,0.15)",  text:"#fff", textSub:"#ce93d8", textMuted:"#2d1045", border:"#1e1030", green:"#76ff03", red:"#ff5252", yellow:"#ffd740", chart:["#9c27b0","#ce93d8","#e040fb","#4a148c","#f3e5f5","#ab47bc","#7b1fa2","#ea80fc"], header:"#090510" },
  "Sunset Orange":   { bg:"#0f0800", bgCard:"#1e1200", bgCard2:"#2a1a00", accent:"#ff6d00", accentGlow:"rgba(255,109,0,0.15)",   text:"#fff", textSub:"#ffcc80", textMuted:"#3e2000", border:"#2a1a00", green:"#69f0ae", red:"#ff5252", yellow:"#ffd740", chart:["#ff6d00","#ffab40","#ff9100","#e65100","#ffe0b2","#ffa726","#fb8c00","#f57c00"], header:"#0d0700" },
  "Glaciar":         { bg:"#030d14", bgCard:"#071824", bgCard2:"#0d2535", accent:"#00bcd4", accentGlow:"rgba(0,188,212,0.15)",   text:"#fff", textSub:"#80deea", textMuted:"#0d3040", border:"#0d2535", green:"#69f0ae", red:"#ff5252", yellow:"#ffd740", chart:["#00bcd4","#80deea","#00e5ff","#006064","#b2ebf2","#26c6da","#00acc1","#4dd0e1"], header:"#040c12" },
  "Rose Gold":       { bg:"#0f080a", bgCard:"#1e1015", bgCard2:"#2a1820", accent:"#f48fb1", accentGlow:"rgba(244,143,177,0.15)", text:"#fff", textSub:"#f8bbd0", textMuted:"#3d1020", border:"#2a1820", green:"#69f0ae", red:"#ff5252", yellow:"#ffd740", chart:["#f48fb1","#f8bbd0","#e91e63","#880e4f","#fce4ec","#f06292","#c2185b","#ff80ab"], header:"#0d060a" },
  "Matrix":          { bg:"#000000", bgCard:"#050f05", bgCard2:"#0a1a0a", accent:"#00ff41", accentGlow:"rgba(0,255,65,0.12)",    text:"#00ff41", textSub:"#00bb30", textMuted:"#003b12", border:"#0a1a0a", green:"#00ff41", red:"#ff5252", yellow:"#ffd740", chart:["#00ff41","#00bb30","#008c22","#005e18","#003b12","#00ff41","#33ff66","#66ff88"], header:"#000" },
  // ── 15 novos ──
  "Neon Pink":       { bg:"#0d000d", bgCard:"#1a001a", bgCard2:"#260026", accent:"#ff0090", accentGlow:"rgba(255,0,144,0.15)",   text:"#fff", textSub:"#ff80c8", textMuted:"#4d0033", border:"#330033", green:"#69f0ae", red:"#ff5252", yellow:"#ffd740", chart:["#ff0090","#ff66bb","#cc0077","#ff33a8","#ff80c8","#e6006e","#ff99d6","#ffcce8"], header:"#110011" },
  "Caramelo":        { bg:"#120a00", bgCard:"#1e1000", bgCard2:"#2e1800", accent:"#d4860a", accentGlow:"rgba(212,134,10,0.15)",  text:"#fff", textSub:"#f5c97a", textMuted:"#4a2e00", border:"#2e1800", green:"#69f0ae", red:"#ff5252", yellow:"#ffd740", chart:["#d4860a","#f5c97a","#a36008","#ffb347","#e8960c","#c47a00","#ffcc66","#ffe0a0"], header:"#0e0800" },
  "Safira":          { bg:"#00050f", bgCard:"#000a1e", bgCard2:"#00102e", accent:"#1565c0", accentGlow:"rgba(21,101,192,0.15)",  text:"#fff", textSub:"#90caf9", textMuted:"#0a2040", border:"#00102e", green:"#00e5ff", red:"#ff5252", yellow:"#ffd740", chart:["#1565c0","#42a5f5","#0d47a1","#64b5f6","#1976d2","#1e88e5","#90caf9","#bbdefb"], header:"#000510" },
  "Esmeralda":       { bg:"#001208", bgCard:"#001f0f", bgCard2:"#002e18", accent:"#00897b", accentGlow:"rgba(0,137,123,0.15)",   text:"#fff", textSub:"#80cbc4", textMuted:"#003828", border:"#002e18", green:"#69f0ae", red:"#ff5252", yellow:"#ffd740", chart:["#00897b","#4db6ac","#00695c","#80cbc4","#00796b","#26a69a","#b2dfdb","#e0f2f1"], header:"#00100a" },
  "Grafite":         { bg:"#101010", bgCard:"#1a1a1a", bgCard2:"#242424", accent:"#607d8b", accentGlow:"rgba(96,125,139,0.15)",  text:"#eceff1", textSub:"#90a4ae", textMuted:"#37474f", border:"#2e2e2e", green:"#69f0ae", red:"#ff5252", yellow:"#ffd740", chart:["#607d8b","#90a4ae","#455a64","#b0bec5","#78909c","#546e7a","#cfd8dc","#eceff1"], header:"#141414" },
  "Aurora":          { bg:"#020814", bgCard:"#040f20", bgCard2:"#071830", accent:"#7c4dff", accentGlow:"rgba(124,77,255,0.15)",  text:"#fff", textSub:"#b39ddb", textMuted:"#1a0a40", border:"#071830", green:"#69f0ae", red:"#ff5252", yellow:"#ffd740", chart:["#7c4dff","#b39ddb","#651fff","#d1c4e9","#aa00ff","#9c27b0","#ce93d8","#e1bee7"], header:"#020a18" },
  "Cobre":           { bg:"#0f0800", bgCard:"#1a0e00", bgCard2:"#281600", accent:"#bf6900", accentGlow:"rgba(191,105,0,0.15)",   text:"#fff", textSub:"#ffcc80", textMuted:"#3e2000", border:"#281600", green:"#69f0ae", red:"#ff5252", yellow:"#ffd740", chart:["#bf6900","#e65100","#ff8f00","#ffa000","#ffb300","#ffc107","#ffd54f","#ffe082"], header:"#0d0700" },
  "Obsidiana":       { bg:"#080808", bgCard:"#0f0f0f", bgCard2:"#161616", accent:"#b71c1c", accentGlow:"rgba(183,28,28,0.15)",   text:"#e0e0e0", textSub:"#757575", textMuted:"#303030", border:"#1a1a1a", green:"#4caf50", red:"#b71c1c", yellow:"#ffc107", chart:["#b71c1c","#c62828","#d32f2f","#e53935","#ef5350","#f44336","#ef9a9a","#ffcdd2"], header:"#0a0a0a" },
  "Tropical":        { bg:"#001a14", bgCard:"#00261e", bgCard2:"#003328", accent:"#00bfa5", accentGlow:"rgba(0,191,165,0.15)",   text:"#fff", textSub:"#80cbc4", textMuted:"#004d40", border:"#003328", green:"#69f0ae", red:"#ff5252", yellow:"#ffd740", chart:["#00bfa5","#1de9b6","#00897b","#64ffda","#00e5ff","#00acc1","#80deea","#b2ebf2"], header:"#001510" },
  "Violeta Neon":    { bg:"#06000f", bgCard:"#0d0020", bgCard2:"#160030", accent:"#d500f9", accentGlow:"rgba(213,0,249,0.15)",   text:"#fff", textSub:"#e040fb", textMuted:"#4a0060", border:"#160030", green:"#69f0ae", red:"#ff5252", yellow:"#ffd740", chart:["#d500f9","#e040fb","#aa00ff","#ea80fc","#ce93d8","#ab47bc","#ba68c8","#f3e5f5"], header:"#060010" },
  "Dourado":         { bg:"#0a0800", bgCard:"#141000", bgCard2:"#1e1800", accent:"#ffc400", accentGlow:"rgba(255,196,0,0.15)",   text:"#fff", textSub:"#ffe082", textMuted:"#3e2e00", border:"#1e1800", green:"#69f0ae", red:"#ff5252", yellow:"#ffd740", chart:["#ffc400","#ffca28","#ffb300","#ffd54f","#ffe082","#ffecb3","#ff8f00","#ffa000"], header:"#0d0a00" },
  "Arctic":          { bg:"#f8fafc", bgCard:"#ffffff", bgCard2:"#f1f5f9", accent:"#0ea5e9", accentGlow:"rgba(14,165,233,0.12)",  text:"#0f172a", textSub:"#64748b", textMuted:"#cbd5e1", border:"#e2e8f0", green:"#16a34a", red:"#dc2626", yellow:"#d97706", chart:["#0ea5e9","#38bdf8","#0284c7","#7dd3fc","#bae6fd","#0c4a6e","#075985","#0369a1"], header:"#f1f5f9" },
  "Carbon":          { bg:"#0c0c0c", bgCard:"#141414", bgCard2:"#1c1c1c", accent:"#4ade80", accentGlow:"rgba(74,222,128,0.15)",  text:"#f9fafb", textSub:"#6b7280", textMuted:"#374151", border:"#1f2937", green:"#4ade80", red:"#f87171", yellow:"#fbbf24", chart:["#4ade80","#86efac","#22c55e","#bbf7d0","#16a34a","#15803d","#14532d","#dcfce7"], header:"#0a0a0a" },
  "Lavanda":         { bg:"#0d0a18", bgCard:"#15102a", bgCard2:"#1e183c", accent:"#8b5cf6", accentGlow:"rgba(139,92,246,0.15)",  text:"#fff", textSub:"#c4b5fd", textMuted:"#3b2a6e", border:"#1e183c", green:"#4ade80", red:"#f87171", yellow:"#fbbf24", chart:["#8b5cf6","#a78bfa","#7c3aed","#c4b5fd","#6d28d9","#5b21b6","#ddd6fe","#ede9fe"], header:"#0b0815" },
  "Sakura":          { bg:"#120810", bgCard:"#1e1018", bgCard2:"#2a1824", accent:"#ec4899", accentGlow:"rgba(236,72,153,0.15)",  text:"#fff", textSub:"#f9a8d4", textMuted:"#4a1030", border:"#2a1824", green:"#4ade80", red:"#f43f5e", yellow:"#fbbf24", chart:["#ec4899","#f9a8d4","#db2777","#fbcfe8","#be185d","#9d174d","#fce7f3","#fdf2f8"], header:"#100610" },
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

const BASE_STOCKS = [
  // ── Financeiro / Bancos ──
  { symbol:"ITUB4", name:"Itaú Unibanco PN",       price:34.18, sector:"Financeiro" },
  { symbol:"ITUB3", name:"Itaú Unibanco ON",        price:35.20, sector:"Financeiro" },
  { symbol:"BBDC4", name:"Bradesco PN",              price:14.93, sector:"Financeiro" },
  { symbol:"BBDC3", name:"Bradesco ON",              price:15.10, sector:"Financeiro" },
  { symbol:"BBAS3", name:"Banco do Brasil ON",       price:28.40, sector:"Financeiro" },
  { symbol:"SANB11",name:"Santander BR UNT",         price:26.80, sector:"Financeiro" },
  { symbol:"SANB3", name:"Santander BR ON",          price:25.40, sector:"Financeiro" },
  { symbol:"SANB4", name:"Santander BR PN",          price:26.10, sector:"Financeiro" },
  { symbol:"BPAC11",name:"BTG Pactual UNT",          price:34.60, sector:"Financeiro" },
  { symbol:"BPAC3", name:"BTG Pactual ON",           price:33.80, sector:"Financeiro" },
  { symbol:"ITSA4", name:"Itaúsa PN",                price:10.82, sector:"Financeiro" },
  { symbol:"ITSA3", name:"Itaúsa ON",                price:10.90, sector:"Financeiro" },
  { symbol:"B3SA3", name:"B3 ON",                    price:12.15, sector:"Financeiro" },
  { symbol:"CIEL3", name:"Cielo ON",                 price:6.20,  sector:"Financeiro" },
  { symbol:"IRBR3", name:"IRB Brasil RE ON",         price:39.50, sector:"Financeiro" },
  { symbol:"SULA11",name:"Sul América UNT",           price:14.30, sector:"Financeiro" },
  { symbol:"WIZC3", name:"Wiz Soluções ON",          price:12.80, sector:"Financeiro" },
  { symbol:"PSSA3", name:"Porto Seguro ON",          price:38.20, sector:"Financeiro" },
  { symbol:"BNBR3", name:"Banco Nordeste ON",        price:82.40, sector:"Financeiro" },
  { symbol:"BRSR6", name:"Banrisul PNB",             price:14.20, sector:"Financeiro" },
  { symbol:"BRSR3", name:"Banrisul ON",              price:13.80, sector:"Financeiro" },
  { symbol:"ABCB4", name:"ABC Brasil PN",            price:18.60, sector:"Financeiro" },
  { symbol:"BMGB4", name:"Banco BMG PN",             price:3.40,  sector:"Financeiro" },
  { symbol:"BIDI11",name:"Banco Inter UNT",          price:5.20,  sector:"Financeiro" },
  { symbol:"INTER3",name:"Inter & Co ON",            price:5.10,  sector:"Financeiro" },
  { symbol:"NINJ3", name:"Nu Holdings ON",           price:14.80, sector:"Financeiro" },
  { symbol:"MXRF11",name:"Maxi Renda (ref)",         price:10.24, sector:"Financeiro" },
  { symbol:"PAGG3", name:"PagSeguro ON",             price:16.40, sector:"Financeiro" },
  { symbol:"STNE3", name:"StoneCo ON",               price:12.60, sector:"Financeiro" },
  { symbol:"CASH3", name:"Méliuz ON",                price:2.40,  sector:"Financeiro" },
  { symbol:"PINC3", name:"Pine ON",                  price:4.20,  sector:"Financeiro" },
  { symbol:"DAYCOVAL",name:"Daycoval PN",            price:17.40, sector:"Financeiro" },
  // ── Energia / Petróleo / Gás ──
  { symbol:"PETR4", name:"Petrobras PN",             price:38.72, sector:"Energia" },
  { symbol:"PETR3", name:"Petrobras ON",             price:40.10, sector:"Energia" },
  { symbol:"PRIO3", name:"PetroRio ON",              price:44.80, sector:"Energia" },
  { symbol:"RECV3", name:"PetroRecôncavo ON",        price:22.30, sector:"Energia" },
  { symbol:"RRRP3", name:"3R Petroleum ON",          price:18.40, sector:"Energia" },
  { symbol:"BRAV3", name:"Brava Energia ON",         price:21.60, sector:"Energia" },
  { symbol:"CSAN3", name:"Cosan ON",                 price:14.50, sector:"Energia" },
  { symbol:"UGPA3", name:"Ultrapar ON",              price:21.30, sector:"Energia" },
  { symbol:"VBBR3", name:"Vibra Energia ON",         price:22.80, sector:"Energia" },
  { symbol:"EQTL3", name:"Equatorial ON",            price:38.90, sector:"Energia" },
  { symbol:"EGIE3", name:"Engie Brasil ON",          price:42.80, sector:"Energia" },
  { symbol:"CPFE3", name:"CPFL Energia ON",          price:34.60, sector:"Energia" },
  { symbol:"ENEV3", name:"Eneva ON",                 price:15.20, sector:"Energia" },
  { symbol:"ENBR3", name:"Energias do Brasil ON",    price:18.60, sector:"Energia" },
  { symbol:"NEOE3", name:"Neoenergia ON",            price:18.40, sector:"Energia" },
  { symbol:"AURE3", name:"Auren Energia ON",         price:12.30, sector:"Energia" },
  { symbol:"CMIG4", name:"Cemig PN",                 price:12.80, sector:"Energia" },
  { symbol:"CMIG3", name:"Cemig ON",                 price:13.10, sector:"Energia" },
  { symbol:"ELET3", name:"Eletrobras ON",            price:42.60, sector:"Energia" },
  { symbol:"ELET6", name:"Eletrobras PNB",           price:41.80, sector:"Energia" },
  { symbol:"TAEE11",name:"Taesa UNT",                price:32.40, sector:"Energia" },
  { symbol:"TRPL4", name:"Tran Paulista PN",         price:22.10, sector:"Energia" },
  { symbol:"TRPL3", name:"Tran Paulista ON",         price:22.40, sector:"Energia" },
  { symbol:"CPLE6", name:"Copel PNB",                price:8.40,  sector:"Energia" },
  { symbol:"CPLE3", name:"Copel ON",                 price:8.60,  sector:"Energia" },
  { symbol:"CLSC4", name:"Celesc PN",                price:14.20, sector:"Energia" },
  { symbol:"ENGI11",name:"Energisa UNT",             price:44.20, sector:"Energia" },
  { symbol:"EGIE3", name:"Engie Brasil ON",          price:42.80, sector:"Energia" },
  { symbol:"EMAE4", name:"Emae PN",                  price:18.60, sector:"Energia" },
  // ── Saneamento ──
  { symbol:"SBSP3", name:"Sabesp ON",                price:74.20, sector:"Saneamento" },
  { symbol:"CSMG3", name:"Copasa ON",                price:20.40, sector:"Saneamento" },
  { symbol:"SAPR11",name:"Sanepar UNT",              price:22.40, sector:"Saneamento" },
  { symbol:"SAPR4", name:"Sanepar PN",               price:22.10, sector:"Saneamento" },
  { symbol:"SAPR3", name:"Sanepar ON",               price:22.30, sector:"Saneamento" },
  { symbol:"AEGP3", name:"Aegea Saneamento ON",      price:18.40, sector:"Saneamento" },
  // ── Mineração / Siderurgia ──
  { symbol:"VALE3", name:"Vale ON",                  price:61.45, sector:"Mineração" },
  { symbol:"CMIN3", name:"CSN Mineração ON",         price:4.80,  sector:"Mineração" },
  { symbol:"CSNA3", name:"CSN ON",                   price:12.80, sector:"Siderurgia" },
  { symbol:"GGBR4", name:"Gerdau PN",                price:18.50, sector:"Siderurgia" },
  { symbol:"GGBR3", name:"Gerdau ON",                price:18.80, sector:"Siderurgia" },
  { symbol:"GOAU4", name:"Metalúrgica Gerdau PN",    price:8.40,  sector:"Siderurgia" },
  { symbol:"USIM5", name:"Usiminas PNA",             price:8.90,  sector:"Siderurgia" },
  { symbol:"USIM3", name:"Usiminas ON",              price:9.10,  sector:"Siderurgia" },
  { symbol:"BRAP4", name:"Bradespar PN",             price:22.40, sector:"Mineração" },
  { symbol:"FESA4", name:"Ferbasa PN",               price:14.20, sector:"Mineração" },
  { symbol:"CBAV3", name:"CBA ON",                   price:9.40,  sector:"Mineração" },
  { symbol:"MILS3", name:"Mills ON",                 price:22.60, sector:"Indústria" },
  // ── Petroquímica / Química ──
  { symbol:"UNIP6", name:"Unipar PNB",               price:72.40, sector:"Química" },
  { symbol:"UNIP3", name:"Unipar ON",                price:71.80, sector:"Química" },
  { symbol:"BRKM5", name:"Braskem PNA",              price:18.40, sector:"Química" },
  { symbol:"BRKM3", name:"Braskem ON",               price:18.80, sector:"Química" },
  { symbol:"ALUP11",name:"Alupar UNT",               price:28.40, sector:"Energia" },
  // ── Consumo / Bebidas / Alimentos ──
  { symbol:"ABEV3", name:"Ambev ON",                 price:11.87, sector:"Consumo" },
  { symbol:"BEEF3", name:"Minerva ON",               price:9.40,  sector:"Alimentos" },
  { symbol:"JBSS3", name:"JBS ON",                   price:34.20, sector:"Alimentos" },
  { symbol:"MRFG3", name:"Marfrig ON",               price:12.80, sector:"Alimentos" },
  { symbol:"BRFS3", name:"BRF ON",                   price:22.40, sector:"Alimentos" },
  { symbol:"SMLS3", name:"Smiles ON",                price:14.60, sector:"Consumo" },
  { symbol:"MDIA3", name:"M.Dias Branco ON",         price:34.20, sector:"Alimentos" },
  { symbol:"PCAR3", name:"GPA ON",                   price:7.20,  sector:"Varejo" },
  { symbol:"ASAI3", name:"Assaí ON",                 price:12.40, sector:"Varejo" },
  { symbol:"CRFB3", name:"Carrefour BR ON",          price:9.80,  sector:"Varejo" },
  { symbol:"SOMA3", name:"Grupo Soma ON",            price:6.40,  sector:"Consumo" },
  { symbol:"GRND3", name:"Grendene ON",              price:8.20,  sector:"Consumo" },
  { symbol:"VIVA3", name:"Vivara ON",                price:22.40, sector:"Consumo" },
  { symbol:"ALPA4", name:"Alpargatas PN",            price:9.20,  sector:"Consumo" },
  { symbol:"ALPA3", name:"Alpargatas ON",            price:9.40,  sector:"Consumo" },
  { symbol:"SEER3", name:"Ser Educacional ON",       price:6.40,  sector:"Educação" },
  { symbol:"COGN3", name:"Cogna ON",                 price:2.80,  sector:"Educação" },
  { symbol:"YDUQ3", name:"Yduqs ON",                 price:18.40, sector:"Educação" },
  { symbol:"ANIM3", name:"Anima ON",                 price:4.80,  sector:"Educação" },
  // ── Varejo ──
  { symbol:"LREN3", name:"Lojas Renner ON",          price:14.20, sector:"Varejo" },
  { symbol:"MGLU3", name:"Magazine Luiza ON",        price:8.45,  sector:"Varejo" },
  { symbol:"AMER3", name:"Americanas ON",            price:1.05,  sector:"Varejo" },
  { symbol:"LJQQ3", name:"Quero-Quero ON",           price:8.40,  sector:"Varejo" },
  { symbol:"AMAR3", name:"Marisa ON",                price:2.40,  sector:"Varejo" },
  { symbol:"CEAB3", name:"C&A ON",                   price:10.40, sector:"Varejo" },
  { symbol:"BHIA3", name:"Grupo BH ON",              price:3.80,  sector:"Varejo" },
  { symbol:"NTCO3", name:"Natura & Co ON",           price:14.20, sector:"Varejo" },
  { symbol:"BOAS3", name:"Boc ON",                   price:8.20,  sector:"Varejo" },
  { symbol:"TFCO4", name:"Tec Fabric PN",            price:6.20,  sector:"Varejo" },
  // ── Saúde / Farmácias ──
  { symbol:"RDOR3", name:"Rede D'Or ON",             price:32.50, sector:"Saúde" },
  { symbol:"HAPV3", name:"Hapvida ON",               price:4.80,  sector:"Saúde" },
  { symbol:"FLRY3", name:"Fleury ON",                price:15.60, sector:"Saúde" },
  { symbol:"RADL3", name:"Raia Drogasil ON",         price:26.80, sector:"Saúde" },
  { symbol:"HYPE3", name:"Hypera Pharma ON",         price:28.40, sector:"Saúde" },
  { symbol:"PNVL3", name:"Dimed ON",                 price:18.60, sector:"Saúde" },
  { symbol:"ODPV3", name:"Odontoprev ON",            price:12.80, sector:"Saúde" },
  { symbol:"QUAL3", name:"Qualicorp ON",             price:6.40,  sector:"Saúde" },
  { symbol:"ONCO3", name:"Oncoclínicas ON",          price:8.20,  sector:"Saúde" },
  { symbol:"DASA3", name:"Diagnósticos América ON",  price:4.80,  sector:"Saúde" },
  { symbol:"PARD3", name:"Instituto Hermes ON",      price:14.40, sector:"Saúde" },
  { symbol:"BLAU3", name:"Blau Farmacêutica ON",     price:18.20, sector:"Saúde" },
  // ── Tecnologia / Telecom ──
  { symbol:"VIVT3", name:"Telefônica Vivo ON",       price:52.40, sector:"Telecom" },
  { symbol:"TIMS3", name:"TIM ON",                   price:18.90, sector:"Telecom" },
  { symbol:"OIBR3", name:"Oi ON",                    price:0.68,  sector:"Telecom" },
  { symbol:"OIBR4", name:"Oi PN",                    price:0.65,  sector:"Telecom" },
  { symbol:"TOTS3", name:"TOTVS ON",                 price:34.20, sector:"Tecnologia" },
  { symbol:"POSI3", name:"Positivo Tech ON",         price:7.80,  sector:"Tecnologia" },
  { symbol:"LWSA3", name:"Locaweb ON",               price:5.10,  sector:"Tecnologia" },
  { symbol:"LINX3", name:"Linx ON",                  price:34.20, sector:"Tecnologia" },
  { symbol:"SQIA3", name:"Sinqia ON",                price:22.40, sector:"Tecnologia" },
  { symbol:"IFCM3", name:"Infracommerce ON",         price:4.20,  sector:"Tecnologia" },
  { symbol:"DESK3", name:"Desktop ON",               price:18.40, sector:"Tecnologia" },
  { symbol:"ALOS3", name:"Allos ON",                 price:22.60, sector:"Tecnologia" },
  // ── Indústria / Bens de Capital ──
  { symbol:"WEGE3", name:"WEG ON",                   price:52.34, sector:"Indústria" },
  { symbol:"EMBR3", name:"Embraer ON",               price:42.60, sector:"Indústria" },
  { symbol:"RAPT4", name:"Randon PN",                price:12.40, sector:"Indústria" },
  { symbol:"RAPT3", name:"Randon ON",                price:12.60, sector:"Indústria" },
  { symbol:"FRAS3", name:"Fras-le ON",               price:14.20, sector:"Indústria" },
  { symbol:"TUPY3", name:"Tupy ON",                  price:22.80, sector:"Indústria" },
  { symbol:"ROMI3", name:"Indústrias Romi ON",       price:18.40, sector:"Indústria" },
  { symbol:"METAL3",name:"Metalgráfica Iguaçu ON",   price:8.40,  sector:"Indústria" },
  { symbol:"MRVE3", name:"MRV ON",                   price:8.20,  sector:"Construção" },
  { symbol:"CYRE3", name:"Cyrela ON",                price:18.40, sector:"Construção" },
  { symbol:"EVEN3", name:"Even ON",                  price:10.30, sector:"Construção" },
  { symbol:"DIRR3", name:"Direcional ON",            price:22.50, sector:"Construção" },
  { symbol:"TEND3", name:"Construtora Tenda ON",     price:14.20, sector:"Construção" },
  { symbol:"JHSF3", name:"JHSF ON",                  price:6.80,  sector:"Construção" },
  { symbol:"HBOR3", name:"Helbor ON",                price:8.40,  sector:"Construção" },
  { symbol:"PLPL3", name:"Plano & Plano ON",         price:6.20,  sector:"Construção" },
  { symbol:"LAVV3", name:"Lavvi ON",                 price:10.40, sector:"Construção" },
  { symbol:"GFSA3", name:"Gafisa ON",                price:2.80,  sector:"Construção" },
  { symbol:"TRIS3", name:"Trisul ON",                price:10.80, sector:"Construção" },
  { symbol:"EZTC3", name:"EZTEC ON",                 price:18.40, sector:"Construção" },
  { symbol:"MTRE3", name:"Mitre Realty ON",          price:8.20,  sector:"Construção" },
  { symbol:"CURY3", name:"Cury ON",                  price:18.60, sector:"Construção" },
  // ── Logística / Transporte ──
  { symbol:"RAIL3", name:"Rumo ON",                  price:22.80, sector:"Logística" },
  { symbol:"ECOR3", name:"EcoRodovias ON",           price:8.40,  sector:"Logística" },
  { symbol:"CCRO3", name:"CCR ON",                   price:14.20, sector:"Logística" },
  { symbol:"TGMA3", name:"Tegma ON",                 price:22.40, sector:"Logística" },
  { symbol:"GOLL4", name:"Gol Linhas Aéreas PN",     price:5.20,  sector:"Aviação" },
  { symbol:"AZUL4", name:"Azul PN",                  price:8.90,  sector:"Aviação" },
  { symbol:"CPTX3", name:"Copersucar ON",            price:12.40, sector:"Logística" },
  { symbol:"PSSA3", name:"Porto Seguro ON",          price:38.20, sector:"Logística" },
  { symbol:"SIMH3", name:"Simpar ON",                price:6.40,  sector:"Logística" },
  { symbol:"VAMO3", name:"Vamos ON",                 price:8.20,  sector:"Logística" },
  { symbol:"PATI4", name:"Pátria Invest PN",         price:14.20, sector:"Logística" },
  // ── Agronegócio ──
  { symbol:"SLCE3", name:"SLC Agrícola ON",          price:21.40, sector:"Agro" },
  { symbol:"SMTO3", name:"São Martinho ON",          price:28.60, sector:"Agro" },
  { symbol:"AGRO3", name:"BrasilAgro ON",            price:32.10, sector:"Agro" },
  { symbol:"TTEN3", name:"3Tentos ON",               price:12.40, sector:"Agro" },
  { symbol:"TPCT3", name:"Tapeados ON",              price:8.20,  sector:"Agro" },
  { symbol:"LAND3", name:"Terra Santa Agro ON",      price:6.40,  sector:"Agro" },
  { symbol:"SOJA3", name:"Boa Safra ON",             price:14.20, sector:"Agro" },
  { symbol:"VAMO3", name:"Vamos ON",                 price:8.20,  sector:"Agro" },
  // ── Serviços / Outros ──
  { symbol:"RENT3", name:"Localiza ON",              price:43.10, sector:"Serviços" },
  { symbol:"MOVI3", name:"Movida ON",                price:12.60, sector:"Serviços" },
  { symbol:"TMAR3", name:"Oi Móvel ON",              price:2.40,  sector:"Serviços" },
  { symbol:"MULT3", name:"Multiplan ON",             price:28.40, sector:"Serviços" },
  { symbol:"IGTI11",name:"Iguatemi UNT",             price:24.80, sector:"Serviços" },
  { symbol:"BRML3", name:"BR Malls ON",              price:10.40, sector:"Serviços" },
  { symbol:"ALLD3", name:"Allied ON",                price:14.20, sector:"Serviços" },
  { symbol:"BRIT3", name:"Britânia ON",              price:8.40,  sector:"Serviços" },
  { symbol:"CVCB3", name:"CVC Brasil ON",            price:4.20,  sector:"Serviços" },
  { symbol:"HBTS5", name:"Habitasul PNA",            price:18.40, sector:"Serviços" },
  { symbol:"MYPK3", name:"Iochpe-Maxion ON",         price:14.20, sector:"Indústria" },
  { symbol:"KEPL3", name:"Kepler Weber ON",          price:22.40, sector:"Indústria" },
  { symbol:"PTBL3", name:"Portobello ON",            price:8.40,  sector:"Indústria" },
  { symbol:"SYNE3", name:"Synergy ON",               price:6.20,  sector:"Tecnologia" },
  { symbol:"ELET3", name:"Eletrobras ON",            price:42.60, sector:"Energia" },
  { symbol:"CEPE5", name:"Celpe PNA",                price:14.20, sector:"Energia" },
  { symbol:"COCE5", name:"Coelce PNA",               price:72.40, sector:"Energia" },
  { symbol:"ENMA3B",name:"Eletrobras Amazonas",      price:8.40,  sector:"Energia" },
  { symbol:"AGTE3", name:"Agtech ON",                price:6.20,  sector:"Agro" },
  { symbol:"SHOW3", name:"Time For Fun ON",          price:4.80,  sector:"Serviços" },
  { symbol:"TCSA3", name:"Tecnisa ON",               price:3.80,  sector:"Construção" },
  { symbol:"JHSF3", name:"JHSF ON",                  price:6.80,  sector:"Construção" },
  { symbol:"ESPA3", name:"Espaço Laser ON",          price:4.80,  sector:"Serviços" },
  { symbol:"MEAL3", name:"International Meal ON",    price:6.20,  sector:"Consumo" },
  { symbol:"PFRM3", name:"Profarma ON",              price:8.40,  sector:"Saúde" },
  { symbol:"RNEW11",name:"Rio Novo Energia UNT",     price:12.40, sector:"Energia" },
  { symbol:"AMAR3", name:"Marisa ON",                price:2.40,  sector:"Varejo" },
  { symbol:"VULC3", name:"Vulcabras ON",             price:14.20, sector:"Consumo" },
  { symbol:"LEVE3", name:"Mahle Metal Leve ON",      price:28.40, sector:"Indústria" },
  { symbol:"DXCO3", name:"Dexco ON",                 price:8.40,  sector:"Indústria" },
  { symbol:"SUZB3", name:"Suzano ON",                price:58.40, sector:"Papel/Celulose" },
  { symbol:"KLBN11",name:"Klabin UNT",               price:22.40, sector:"Papel/Celulose" },
  { symbol:"KLBN4", name:"Klabin PN",                price:22.10, sector:"Papel/Celulose" },
  { symbol:"RANI3", name:"Irani ON",                 price:8.40,  sector:"Papel/Celulose" },
  { symbol:"PINE4", name:"Pine PN",                  price:4.20,  sector:"Financeiro" },
  { symbol:"LUXM4", name:"Unipar Carbocloro PN",     price:14.20, sector:"Química" },
  { symbol:"WSON33",name:"Wilson Sons UNT",          price:18.40, sector:"Logística" },
  { symbol:"POMO4", name:"Marcopolo PN",             price:8.40,  sector:"Indústria" },
  { symbol:"POMO3", name:"Marcopolo ON",             price:8.60,  sector:"Indústria" },
  { symbol:"FHER3", name:"Fer Heringer ON",          price:6.40,  sector:"Agro" },
  { symbol:"CPLE6", name:"Copel PNB",                price:8.40,  sector:"Energia" },
  { symbol:"SLED4", name:"Saraiva Livreiros PN",     price:2.40,  sector:"Varejo" },
  { symbol:"HOOT4", name:"Hotéis Othon PN",          price:3.80,  sector:"Serviços" },
  { symbol:"LPSB3", name:"LPS Brasil ON",            price:4.20,  sector:"Serviços" },
  { symbol:"BPAN4", name:"Banco Pan PN",             price:8.40,  sector:"Financeiro" },
  { symbol:"BPAN3", name:"Banco Pan ON",             price:8.60,  sector:"Financeiro" },
  { symbol:"BGIP4", name:"Banco Guanabara PN",       price:22.40, sector:"Financeiro" },
  { symbol:"DAYC4", name:"Daycoval PN",              price:17.40, sector:"Financeiro" },
  { symbol:"MODL3", name:"Modec ON",                 price:42.40, sector:"Energia" },
  { symbol:"PMAM3", name:"Paranapanema ON",          price:4.80,  sector:"Indústria" },
  { symbol:"JSLG3", name:"JSL ON",                   price:12.40, sector:"Logística" },
  { symbol:"MBLY3", name:"Mobly ON",                 price:4.80,  sector:"Varejo" },
  { symbol:"DOMI3", name:"Dommo Energia ON",         price:1.80,  sector:"Energia" },
  { symbol:"LAME4", name:"Lojas Americanas PN",      price:1.20,  sector:"Varejo" },
  { symbol:"LAME3", name:"Lojas Americanas ON",      price:1.25,  sector:"Varejo" },
  { symbol:"COGN3", name:"Cogna ON",                 price:2.80,  sector:"Educação" },
  { symbol:"LIQO3", name:"Líquidez ON",              price:6.40,  sector:"Tecnologia" },
  { symbol:"FIQE3", name:"Fique ON",                 price:4.20,  sector:"Agro" },
  { symbol:"GMAT3", name:"Grupo Mateus ON",          price:8.40,  sector:"Varejo" },
  { symbol:"SBFG3", name:"SBF Grupo ON",             price:14.20, sector:"Varejo" },
  { symbol:"TFCO4", name:"Tec Fabric PN",            price:6.20,  sector:"Indústria" },
  { symbol:"CGAS5", name:"Comgás PNA",               price:44.20, sector:"Energia" },
  { symbol:"CBIO3", name:"Compra Carbon ON",         price:8.40,  sector:"Energia" },
  { symbol:"AERI3", name:"Aéria ON",                 price:4.80,  sector:"Aviação" },
  { symbol:"VVEO3", name:"Viveo ON",                 price:8.40,  sector:"Saúde" },
  { symbol:"MATD3", name:"Materdei ON",              price:12.40, sector:"Saúde" },
  { symbol:"HMPF3", name:"Hemisfério ON",            price:6.20,  sector:"Saúde" },
  { symbol:"CAML3", name:"Camil Alimentos ON",       price:8.40,  sector:"Alimentos" },
  { symbol:"PTSA4", name:"Pettenati PN",             price:14.20, sector:"Indústria" },
  { symbol:"HAGA4", name:"Haga PN",                  price:18.40, sector:"Indústria" },
  { symbol:"SNSY5", name:"Sansuy PNA",               price:6.40,  sector:"Indústria" },
  { symbol:"BRAP4", name:"Bradespar PN",             price:22.40, sector:"Mineração" },
  { symbol:"TPIS3", name:"Triunfo Particip ON",      price:2.80,  sector:"Logística" },
  { symbol:"IGBR3", name:"IGB Eletrônica ON",        price:1.80,  sector:"Tecnologia" },
  { symbol:"SMLS3", name:"Smiles ON",                price:14.60, sector:"Serviços" },
  { symbol:"BAHI3", name:"Bahema ON",                price:18.40, sector:"Indústria" },
  { symbol:"OSXB3", name:"OSX Brasil ON",            price:0.80,  sector:"Energia" },
];

const BASE_FIIS = [
  // ── Papel / CRI / CRA ──
  { symbol:"MXRF11", name:"Maxi Renda",             price:10.24,  type:"Papel",      dy:11.2 },
  { symbol:"KNCR11", name:"Kinea CRI",              price:102.30, type:"Papel",      dy:12.1 },
  { symbol:"CPTS11", name:"Capitânia Securities",   price:88.40,  type:"Papel",      dy:13.4 },
  { symbol:"RZTR11", name:"Riza Terrax",            price:106.50, type:"Papel",      dy:12.8 },
  { symbol:"BCRI11", name:"Banestes CRI",           price:96.20,  type:"Papel",      dy:11.9 },
  { symbol:"VRTA11", name:"Vértice CRI",            price:94.80,  type:"Papel",      dy:12.3 },
  { symbol:"HGCR11", name:"CSHG Real Estate",      price:105.60, type:"Papel",      dy:11.7 },
  { symbol:"RBRR11", name:"RBR High Grade",         price:95.40,  type:"Papel",      dy:12.0 },
  { symbol:"IRDM11", name:"Iridium Recebíveis",     price:93.20,  type:"Papel",      dy:13.1 },
  { symbol:"VGIR11", name:"Valora CRI",             price:98.70,  type:"Papel",      dy:11.5 },
  { symbol:"HCTR11", name:"Hectare CE",             price:86.40,  type:"Papel",      dy:14.2 },
  { symbol:"MCCI11", name:"Mauá Capital CRI",       price:94.20,  type:"Papel",      dy:12.4 },
  { symbol:"KNHY11", name:"Kinea High Yield",       price:96.40,  type:"Papel",      dy:13.8 },
  { symbol:"VGIP11", name:"Valora IP",              price:92.30,  type:"Papel",      dy:12.6 },
  { symbol:"DEVA11", name:"Devant Recebíveis",      price:88.60,  type:"Papel",      dy:14.8 },
  { symbol:"TPCK11", name:"Tropicália",             price:94.80,  type:"Papel",      dy:13.2 },
  { symbol:"XPCI11", name:"XP Crédito Imob.",       price:90.20,  type:"Papel",      dy:12.9 },
  { symbol:"HABT11", name:"Habitat II",             price:86.40,  type:"Papel",      dy:14.1 },
  { symbol:"OUJP11", name:"Ourinvest JP",           price:88.20,  type:"Papel",      dy:13.6 },
  { symbol:"PORD11", name:"Polo CRI",               price:92.40,  type:"Papel",      dy:12.7 },
  { symbol:"CACR11", name:"Caixa REC Imob.",        price:98.20,  type:"Papel",      dy:11.8 },
  { symbol:"RBVO11", name:"Rio Bravo CRI",          price:88.40,  type:"Papel",      dy:13.4 },
  { symbol:"URPR11", name:"Urca Prime Renda",       price:94.60,  type:"Papel",      dy:12.3 },
  { symbol:"BBIG11", name:"BB Progressivo II",      price:142.40, type:"Papel",      dy:9.8  },
  { symbol:"TGAR11", name:"TG Ativo Real",          price:112.60, type:"Papel",      dy:13.8 },
  // ── Logística ──
  { symbol:"HGLG11", name:"CSHG Logística",        price:162.50, type:"Logística",  dy:8.4  },
  { symbol:"BRCO11", name:"Bresco Logística",       price:94.30,  type:"Logística",  dy:8.1  },
  { symbol:"LVBI11", name:"VBI Logístico",          price:108.40, type:"Logística",  dy:8.7  },
  { symbol:"BTLG11", name:"BTG Logístico",          price:104.20, type:"Logística",  dy:8.9  },
  { symbol:"GGRC11", name:"GGR Covepi",             price:118.60, type:"Logística",  dy:9.2  },
  { symbol:"RBRL11", name:"RBR Log",               price:88.30,  type:"Logística",  dy:9.4  },
  { symbol:"TRXF11", name:"TRX Real Estate",        price:106.40, type:"Logística",  dy:9.6  },
  { symbol:"GTWR11", name:"Guardian RE",            price:92.40,  type:"Logística",  dy:9.1  },
  { symbol:"XPLG11", name:"XP Log",                price:104.20, type:"Logística",  dy:8.8  },
  { symbol:"ALZR11", name:"Alianza Trust Renda",   price:114.30, type:"Logística",  dy:8.6  },
  { symbol:"CLOG11", name:"Cx Agências Log.",       price:106.80, type:"Logística",  dy:9.3  },
  { symbol:"VINO11", name:"Vinci Offices",          price:62.40,  type:"Logística",  dy:9.8  },
  { symbol:"HLOG11", name:"Hedge Logística",        price:88.40,  type:"Logística",  dy:9.6  },
  { symbol:"LGTB11", name:"Legatus",               price:92.40,  type:"Logística",  dy:9.2  },
  { symbol:"JRDM11", name:"Shopping Jardim Sul",   price:74.20,  type:"Logística",  dy:10.2 },
  // ── Shoppings ──
  { symbol:"XPML11", name:"XP Malls",              price:95.60,  type:"Shopping",   dy:9.8  },
  { symbol:"VISC11", name:"Vinci Shopping",        price:104.20, type:"Shopping",   dy:9.5  },
  { symbol:"HSML11", name:"HSI Malls",             price:78.40,  type:"Shopping",   dy:10.2 },
  { symbol:"MALL11", name:"Malls Brasil Plural",   price:92.30,  type:"Shopping",   dy:9.6  },
  { symbol:"ABCP11", name:"Grand Plaza Shopping",  price:68.40,  type:"Shopping",   dy:10.8 },
  { symbol:"FIGS11", name:"General Shopping",      price:74.20,  type:"Shopping",   dy:11.1 },
  { symbol:"HGBS11", name:"Hedge Brasil Shop.",    price:224.40, type:"Shopping",   dy:8.4  },
  { symbol:"PMTO11", name:"Prime Portfólio",       price:106.20, type:"Shopping",   dy:9.1  },
  { symbol:"WPLZ11", name:"West Plaza",            price:82.40,  type:"Shopping",   dy:10.4 },
  { symbol:"ATSA11", name:"Átrio RI",              price:76.40,  type:"Shopping",   dy:10.8 },
  { symbol:"GSFI11", name:"General Sh. Fundo",     price:86.40,  type:"Shopping",   dy:10.2 },
  { symbol:"SCPF11", name:"Shopping Pátio Penha",  price:64.20,  type:"Shopping",   dy:11.4 },
  { symbol:"SHOP11", name:"Malls Asset",           price:108.40, type:"Shopping",   dy:9.2  },
  // ── Lajes Corporativas ──
  { symbol:"KNRI11", name:"Kinea Renda Imob.",     price:148.30, type:"Corporativo", dy:9.1 },
  { symbol:"HGRE11", name:"CSHG Real Estate",     price:122.40, type:"Corporativo", dy:8.6 },
  { symbol:"PVBI11", name:"VBI Prime Prop.",       price:94.80,  type:"Corporativo", dy:8.3 },
  { symbol:"RBRP11", name:"RBR Properties",        price:66.40,  type:"Corporativo", dy:9.2 },
  { symbol:"BRCR11", name:"BTG Pactual Corp.",     price:76.40,  type:"Corporativo", dy:9.8 },
  { symbol:"JSRE11", name:"JS Real Estate",        price:86.40,  type:"Corporativo", dy:9.4 },
  { symbol:"RECT11", name:"REC Renda Imob.",       price:82.40,  type:"Corporativo", dy:9.6 },
  { symbol:"CBOP11", name:"Cardeal Pati",          price:64.20,  type:"Corporativo", dy:10.4 },
  { symbol:"CJCT11", name:"Cajuína CRI",           price:98.40,  type:"Corporativo", dy:11.2 },
  { symbol:"VVPR11", name:"VR Rio Pinheiros",      price:86.40,  type:"Corporativo", dy:9.8 },
  { symbol:"HGPO11", name:"CSHG Prime Off.",       price:182.40, type:"Corporativo", dy:8.2 },
  { symbol:"TLOF11", name:"Tellus Properties",     price:88.40,  type:"Corporativo", dy:9.4 },
  { symbol:"ONEF11", name:"The One",              price:82.40,  type:"Corporativo", dy:9.6 },
  // ── Agro ──
  { symbol:"RZAG11", name:"Riza Agro",             price:106.80, type:"Agro",       dy:13.6 },
  { symbol:"RURA11", name:"Itaú Rural",            price:112.30, type:"Agro",       dy:12.9 },
  { symbol:"SNAG11", name:"Suno Agro",             price:88.40,  type:"Agro",       dy:13.2 },
  { symbol:"RBBV11", name:"RBB Investimentos",     price:94.40,  type:"Agro",       dy:12.8 },
  { symbol:"FACT11", name:"Fator Agro",            price:102.40, type:"Agro",       dy:13.4 },
  { symbol:"ZAGH11", name:"Zagha Agro",            price:96.40,  type:"Agro",       dy:13.1 },
  // ── FoF (Fundo de Fundos) ──
  { symbol:"HFOF11", name:"Hedge Top FOFII",       price:78.20,  type:"FoF",        dy:10.5 },
  { symbol:"BCFF11", name:"BTG Fundos",            price:76.40,  type:"FoF",        dy:10.3 },
  { symbol:"RBRF11", name:"RBR Alpha FoF",         price:72.80,  type:"FoF",        dy:10.8 },
  { symbol:"MGFF11", name:"Mogno FoF",             price:68.40,  type:"FoF",        dy:11.2 },
  { symbol:"KFOF11", name:"Kinea FoF",             price:82.30,  type:"FoF",        dy:10.1 },
  { symbol:"BPFF11", name:"Brasil Plural FoF",     price:74.40,  type:"FoF",        dy:10.6 },
  { symbol:"FIIP11", name:"RB Capital Renda I",    price:188.40, type:"FoF",        dy:9.2  },
  { symbol:"CRFF11", name:"Caixa Rio Bravo FoF",   price:86.40,  type:"FoF",        dy:10.4 },
  { symbol:"MORE11", name:"More Real Estate FoF",  price:72.40,  type:"FoF",        dy:11.0 },
  { symbol:"FOFT11", name:"FoF Iridium",           price:88.40,  type:"FoF",        dy:10.2 },
  // ── Híbrido / Renda ──
  { symbol:"MFAI11", name:"Mérito Desenv. Imob.",  price:98.40,  type:"Híbrido",    dy:10.8 },
  { symbol:"VGRI11", name:"Valora RE III",         price:94.40,  type:"Híbrido",    dy:11.4 },
  { symbol:"HGRU11", name:"CSHG Renda Urb.",      price:124.40, type:"Híbrido",    dy:9.6  },
  { symbol:"RBVA11", name:"Rio Bravo Renda",       price:168.40, type:"Híbrido",    dy:9.2  },
  { symbol:"RBED11", name:"Rio Bravo Educ.",       price:154.40, type:"Híbrido",    dy:9.4  },
  { symbol:"RVBI11", name:"RBR Rendimento",        price:94.40,  type:"Híbrido",    dy:10.2 },
  { symbol:"ARRI11", name:"Átrio Renda Imob.",     price:86.40,  type:"Híbrido",    dy:10.8 },
  { symbol:"AFHI11", name:"AF Invest CRI",         price:98.40,  type:"Híbrido",    dy:12.2 },
  { symbol:"CVBI11", name:"Cv.BI Crédito",         price:92.40,  type:"Híbrido",    dy:12.6 },
  { symbol:"VRTE11", name:"Vértice Renda",         price:94.40,  type:"Híbrido",    dy:11.8 },
  { symbol:"BLMG11", name:"Bluemacaw Log",         price:86.40,  type:"Híbrido",    dy:10.4 },
  { symbol:"BIME11", name:"Brio Imob.",            price:88.40,  type:"Híbrido",    dy:10.6 },
  { symbol:"RZAK11", name:"Riza Akin",             price:94.40,  type:"Híbrido",    dy:12.4 },
  { symbol:"PATL11", name:"Pátria Log.",           price:106.40, type:"Híbrido",    dy:9.8  },
  { symbol:"GALG11", name:"Guardian Log.",         price:102.40, type:"Híbrido",    dy:9.4  },
  // ── Residencial ──
  { symbol:"RBRS11", name:"RBR Res. FOTE",         price:94.40,  type:"Residencial", dy:10.4 },
  { symbol:"VCJR11", name:"Vectis JR",             price:96.40,  type:"Residencial", dy:11.2 },
  { symbol:"PLRI11", name:"Polo CRI II",           price:92.40,  type:"Residencial", dy:11.8 },
  // ── Educacional / Hospitalar ──
  { symbol:"RBED11", name:"Rio Bravo Educ.",       price:154.40, type:"Educacional", dy:9.4 },
  { symbol:"HCRI11", name:"Hospital Criança",      price:94.40,  type:"Hospitalar",  dy:10.8 },
  { symbol:"NSLU11", name:"Notre Dame Intern.",    price:214.40, type:"Hospitalar",  dy:8.6  },
  { symbol:"HCSL11", name:"Clínica Saúde",        price:88.40,  type:"Hospitalar",  dy:10.4 },
];
const genMarket = (base) => base.map(item => {
  const change = (Math.random() - 0.48) * 2.2;
  return { ...item, regularMarketPrice:+(item.price*(1+change/100)).toFixed(2), regularMarketChangePercent:+change.toFixed(2) };
});

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
  arrowUp: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5,12 12,5 19,12"/></svg>,
  logout:  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  user:    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  download:<svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  wallet:  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  chart:   <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  alert:   <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
};

// ─── MODAL ───────────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children, t }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.82)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(8px)" }}>
      <div className="fade-in" onClick={e=>e.stopPropagation()} style={{ background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:16,padding:28,width:400,boxShadow:`0 0 80px ${t.accentGlow}` }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
          <span style={{ color:t.text,fontWeight:800,fontSize:15 }}>{title}</span>
          <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",color:t.textSub }}>{Ico.x}</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
const USERS_KEY = "nexus_users";
const SESSION_KEY = "nexus_session";
const SHARED_STOCKS_KEY = "nexus_shared_stocks";
const SHARED_FIIS_KEY = "nexus_shared_fiis";
function loadUsers() { try { return JSON.parse(localStorage.getItem(USERS_KEY))||{}; } catch { return {}; } }
function saveUsers(u) { localStorage.setItem(USERS_KEY,JSON.stringify(u)); }
function loadSession() { try { const v=localStorage.getItem(SESSION_KEY); return v&&v!=="null"&&v!=="undefined"?v:null; } catch { return null; } }
function saveSession(u) { localStorage.setItem(SESSION_KEY,String(u)); }
function clearSession() { localStorage.removeItem(SESSION_KEY); }
function loadSharedStocks() { try { return JSON.parse(localStorage.getItem(SHARED_STOCKS_KEY))||[]; } catch { return []; } }
function saveSharedStocks(data) { localStorage.setItem(SHARED_STOCKS_KEY,JSON.stringify(data)); }
function loadSharedFiis() { try { return JSON.parse(localStorage.getItem(SHARED_FIIS_KEY))||[]; } catch { return []; } }
function saveSharedFiis(data) { localStorage.setItem(SHARED_FIIS_KEY,JSON.stringify(data)); }

// ─── DATA HELPERS ─────────────────────────────────────────────────────────────
const mkKey     = (user,y,m) => `nexus_${user}_month_${y}_${m}`;
const globalKey = (user)     => `nexus_${user}_global`;
const metaKey   = (user)     => `nexus_${user}_meta`;
function loadGlobal(user) { try { return JSON.parse(localStorage.getItem(globalKey(user)))||{}; } catch { return {}; } }
function saveGlobal(user,data) { localStorage.setItem(globalKey(user),JSON.stringify(data)); }
function loadMonth(user,y,m) {
  const now=new Date();
  if(y>now.getFullYear()||(y===now.getFullYear()&&m>now.getMonth())) return {expenses:[],incomes:[]};
  try { return JSON.parse(localStorage.getItem(mkKey(user,y,m)))||{expenses:[],incomes:[]}; } catch { return {expenses:[],incomes:[]}; }
}
function saveMonth(user,y,m,data) { localStorage.setItem(mkKey(user,y,m),JSON.stringify(data)); }
function loadMeta(user) { try { return JSON.parse(localStorage.getItem(metaKey(user))); } catch { return null; } }
function saveMeta(user,data) { localStorage.setItem(metaKey(user),JSON.stringify(data)); }
function getCarryover(user,year,month) {
  const meta=loadMeta(user); if(!meta) return 0;
  let total=0,y=meta.originYear,m=meta.originMonth;
  while(y<year||(y===year&&m<month)) {
    const d=loadMonth(user,y,m);
    total+=d.incomes.reduce((s,i)=>s+Number(i.value||0),0)-d.expenses.reduce((s,e)=>s+Number(e.value||0),0);
    m++; if(m>11){m=0;y++;}
  }
  return total;
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [mode,setMode]=useState("login");
  const [username,setUsername]=useState("");
  const [displayName,setDisplayName]=useState("");
  const [password,setPassword]=useState("");
  const [confirm,setConfirm]=useState("");
  const [error,setError]=useState("");
  const t=THEMES["Dark Red"];
  const inp={ background:"#111",border:"1px solid #2a2a2a",borderRadius:9,color:"#fff",padding:"11px 14px",width:"100%",fontSize:14,outline:"none",fontFamily:"inherit",marginBottom:12 };

  const handle=async()=>{
    setError("");
    if(!username.trim()||!password.trim()){setError("Preencha todos os campos.");return;}
    setError("⏳ Aguarde...");
    try {
      if(mode==="register"){
        if(password!==confirm){setError("As senhas não coincidem.");return;}
        const existing = await dbFindUser(username);
        if(existing){setError("Usuário já existe.");return;}
        const dn = displayName.trim()||username;
        const ok = await dbSaveUser(username, password, dn);
        if(!ok){setError("Erro ao criar conta. Verifique sua conexão.");return;}
        saveSession(username);
        onLogin(username, dn);
      } else {
        const u = await dbFindUser(username);
        if(!u){setError("Usuário não encontrado.");return;}
        if(u.password!==password){setError("Senha incorreta.");return;}
        saveSession(username);
        onLogin(username, u.display_name||username);
      }
    } catch(e) {
      setError("Erro: " + (e.message||"Verifique sua conexão."));
    }
  };

  return (
    <div style={{ minHeight:"100vh",background:"#0d0d0d",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
      <div className="fade-in" style={{ background:"#161616",border:"1px solid #242424",borderRadius:20,padding:44,width:400,boxShadow:"0 0 100px rgba(229,57,53,0.12)" }}>
        <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:8,justifyContent:"center" }}>
          <NexusLogo themeName="Dark Red" size={52}/>
          <span style={{ fontWeight:900,fontSize:26,color:"#fff",letterSpacing:-0.5 }}>Nexus</span>
        </div>
        <div style={{ color:"#555",fontSize:12,textAlign:"center",marginBottom:28 }}>Controle financeiro inteligente</div>
        <div style={{ display:"flex",background:"#111",borderRadius:10,overflow:"hidden",marginBottom:24 }}>
          {["login","register"].map(m=>(
            <button key={m} onClick={()=>{setMode(m);setError("");}} style={{ flex:1,padding:"10px",border:"none",cursor:"pointer",fontWeight:700,fontSize:12,background:mode===m?"#e53935":"transparent",color:mode===m?"#fff":"#666",transition:"all 0.2s",textTransform:"uppercase",letterSpacing:0.8 }}>
              {m==="login"?"Entrar":"Criar conta"}
            </button>
          ))}
        </div>
        <input style={inp} placeholder="Usuário (login)" value={username} onChange={e=>setUsername(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handle()}/>
        {mode==="register"&&<input style={inp} placeholder="Seu nome (ex: Weslei)" value={displayName} onChange={e=>setDisplayName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handle()}/>}
        <input style={inp} type="password" placeholder="Senha" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handle()}/>
        {mode==="register"&&<input style={inp} type="password" placeholder="Confirmar senha" value={confirm} onChange={e=>setConfirm(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handle()}/>}
        {error&&<div style={{ color:"#ff5252",fontSize:12,marginBottom:12,textAlign:"center",background:"rgba(255,82,82,0.1)",padding:"8px",borderRadius:7 }}>{error}</div>}
        <button onClick={handle} style={{ width:"100%",background:"#e53935",border:"none",borderRadius:10,color:"#fff",padding:"13px",fontSize:14,fontWeight:800,cursor:"pointer",boxShadow:"0 4px 24px rgba(229,57,53,0.35)",letterSpacing:0.3 }}>
          {mode==="login"?"Entrar":"Criar conta"}
        </button>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ user, displayName, onLogout }) {
  const now=new Date();
  const scrollRef=useRef(null);
  const [showScrollTop,setShowScrollTop]=useState(false);

  const [meta]=useState({originYear:now.getFullYear(),originMonth:now.getMonth()});
  const [viewYear,setViewYear]=useState(now.getFullYear());
  const [viewMonth,setViewMonth]=useState(now.getMonth());

  const [global,setGlobalState]=useState({
    categories:DEFAULT_CATEGORIES, investments:[], savings:[], theme:"Dark Red", currency:"BRL"
  });
  const [monthData,setMonthData]=useState({expenses:[],incomes:[]});
  const [loading,setLoading]=useState(true);

  // Load all data from Supabase on mount
  useEffect(()=>{
    (async()=>{
      setLoading(true);
      try {
        // Load global
        const g = await dbLoadGlobal(user);
        if(g) {
          setGlobalState({ categories:g.categories||DEFAULT_CATEGORIES, investments:g.investments||[], savings:g.savings||[], theme:g.theme||"Dark Red", currency:g.currency||"BRL" });
          if(g.savingsGoal) setSavingsGoal(g.savingsGoal);
        }
        // Load meta
        const m = await dbLoadMeta(user);
        if(!m) { await dbSaveMeta(user, { originYear:now.getFullYear(), originMonth:now.getMonth() }); }
        // Load current month
        const md = await dbLoadMonth(user, now.getFullYear(), now.getMonth());
        if(md) setMonthData(md);
      } catch(e){ console.error(e); }
      setLoading(false);
    })();
  },[user]);
  const [showThemes,setShowThemes]=useState(false);
  const [modal,setModal]=useState(null);
  const [form,setForm]=useState({});
  const [stocks,setStocks]=useState([]);
  const [fiis,setFiis]=useState([]);
  const [loadingMkt,setLoadingMkt]=useState(false);
  const [stockSearch,setStockSearch]=useState("");
  const [fiiSearch,setFiiSearch]=useState("");
  const [quickAdd,setQuickAdd]=useState(null); // {symbol, name, type, price}
  const [showExport,setShowExport]=useState(false);
  const [showSavings,setShowSavings]=useState(false);
  const [exportForm,setExportForm]=useState({fromYear:now.getFullYear(),fromMonth:0,toYear:now.getFullYear(),toMonth:now.getMonth()});
  // SURPRESA 1: meta de economia mensal
  const [savingsGoal,setSavingsGoal]=useState(0);
  // SURPRESA 2: busca por transação
  const [searchQuery,setSearchQuery]=useState("");

  const t=THEMES[global.theme];
  const sym=CURRENCIES[global.currency].symbol;
  const fmt=v=>`${sym} ${Number(v||0).toLocaleString("pt-BR",{minimumFractionDigits:2})}`;

  const {expenses,incomes}=monthData;
  const {categories,investments}=global;
  const totalExp=expenses.reduce((s,e)=>s+Number(e.value||0),0);
  const totalInc=incomes.reduce((s,e)=>s+Number(e.value||0),0);
  const totalInv=investments.reduce((s,e)=>s+Number(e.value||0),0);
  const totalSavings=global.savings.reduce((s,e)=>s+Number(e.value||0),0);
  const [carryover,setCarryover]=useState(0);
  useEffect(()=>{
    if(loading) return;
    (async()=>{
      const meta = await dbLoadMeta(user);
      if(!meta) { setCarryover(0); return; }
      let total=0, y=meta.originYear, m=meta.originMonth;
      while(y<viewYear||(y===viewYear&&m<viewMonth)){
        const d = await dbLoadMonth(user,y,m);
        if(d){
          total += (d.incomes||[]).reduce((s,i)=>s+Number(i.value||0),0)
                 - (d.expenses||[]).reduce((s,e)=>s+Number(e.value||0),0);
        }
        m++; if(m>11){m=0;y++;}
      }
      setCarryover(total);
    })();
  },[viewYear,viewMonth,user,loading]);
  const balance=carryover+totalInc-totalExp-totalInv-totalSavings;
  const isOrigin=viewYear===now.getFullYear()&&viewMonth===now.getMonth()&&carryover===0;
  const isFuture=viewYear>now.getFullYear()||(viewYear===now.getFullYear()&&viewMonth>now.getMonth());

  // SURPRESA 3: taxa de economia
  const savingsRate=totalInc>0?((totalInc-totalExp)/totalInc*100):0;

  // Save monthData to Supabase (debounced)
  useEffect(()=>{
    if(loading) return;
    const t = setTimeout(()=>{ dbSaveMonth(user,viewYear,viewMonth,monthData); },800);
    return ()=>clearTimeout(t);
  },[monthData,viewYear,viewMonth,user,loading]);

  // Save global to Supabase (debounced)
  useEffect(()=>{
    if(loading) return;
    const t = setTimeout(()=>{ dbSaveGlobal(user,{...global,savingsGoal}); },800);
    return ()=>clearTimeout(t);
  },[global,user,loading]);

  // Load month when navigation changes
  useEffect(()=>{
    if(loading) return;
    (async()=>{
      const md = await dbLoadMonth(user,viewYear,viewMonth);
      setMonthData(md || {expenses:[],incomes:[]});
    })();
  },[viewYear,viewMonth,user,loading]);

  useEffect(()=>{
    const el=scrollRef.current; if(!el) return;
    const onScroll=()=>setShowScrollTop(el.scrollTop>200);
    el.addEventListener("scroll",onScroll); return()=>el.removeEventListener("scroll",onScroll);
  },[]);

  const fetchMarket=useCallback(()=>{
    setLoadingMkt(true);
    setTimeout(()=>{
      // merge base + shared custom tickers
      const sharedS = loadSharedStocks();
      const sharedF = loadSharedFiis();
      const allStocks = [...BASE_STOCKS, ...sharedS.filter(s=>!BASE_STOCKS.find(b=>b.symbol===s.symbol))];
      const allFiis   = [...BASE_FIIS,   ...sharedF.filter(f=>!BASE_FIIS.find(b=>b.symbol===f.symbol))];
      setStocks(genMarket(allStocks));
      setFiis(genMarket(allFiis));
      setLoadingMkt(false);
    },500);
  },[]);
  useEffect(()=>{ fetchMarket(); const iv=setInterval(fetchMarket,600000); return()=>clearInterval(iv); },[fetchMarket]);

  const exportCSV=()=>{
    const {fromYear,fromMonth,toYear,toMonth}=exportForm;
    const MN=["Janeiro","Fevereiro","Marco","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
    let rows=["Tipo,Descricao,Valor,Categoria,Fonte,Data,Mes,Ano"];
    let y=fromYear,m=fromMonth;
    while(y<toYear||(y===toYear&&m<=toMonth)){
      const d = (y===viewYear&&m===viewMonth) ? monthData : (monthlyCache[m]||{expenses:[],incomes:[]});
      (d.expenses||[]).forEach(e=>{ const cat=categories.find(c=>c.id===e.catId); rows.push(`Gasto,"${e.desc||""}",${e.value},"${cat?.name||""}","",${e.date},${MN[m]},${y}`); });
      (d.incomes||[]).forEach(i=>{ rows.push(`Receita,"${i.desc||""}",${i.value},"","${i.source||""}",${i.date},${MN[m]},${y}`); });
      m++; if(m>11){m=0;y++;}
    }
    investments.forEach(inv=>{ rows.push(`Investimento,"${inv.name||""}",${inv.value},"${inv.type||""}","","",Global,Global`); });
    const blob=new Blob([rows.join("\n")],{type:"text/csv;charset=utf-8;"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download=`nexus_${fromYear}_${String(fromMonth+1).padStart(2,"0")}_a_${toYear}_${String(toMonth+1).padStart(2,"0")}.csv`;
    a.click(); URL.revokeObjectURL(url); setShowExport(false);
  };

  const prevMonth=()=>{ if(isOrigin)return; if(viewMonth===0){setViewYear(y=>y-1);setViewMonth(11);}else setViewMonth(m=>m-1); };
  const nextMonth=()=>{ if(viewMonth===11){setViewYear(y=>y+1);setViewMonth(0);}else setViewMonth(m=>m+1); };

  const MONTHS_SHORT=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const [monthlyCache,setMonthlyCache]=useState({});
  useEffect(()=>{
    if(loading) return;
    (async()=>{
      const rows = await dbLoadAllMonths(user, viewYear);
      const cache = {};
      rows.forEach(r=>{ cache[r.month]=r.data; });
      setMonthlyCache(cache);
    })();
  },[viewYear,user,loading,monthData]);

  const monthly=MONTHS_SHORT.map((m,i)=>{
    const d = i===viewMonth ? monthData : (monthlyCache[i]||{expenses:[],incomes:[]});
    return {m,R:(d.incomes||[]).reduce((s,x)=>s+Number(x.value||0),0),G:(d.expenses||[]).reduce((s,x)=>s+Number(x.value||0),0)};
  });
  const expByCat=categories.map(c=>({name:c.name,value:expenses.filter(e=>e.catId===c.id).reduce((s,e)=>s+Number(e.value||0),0),color:c.color})).filter(c=>c.value>0);

  // search filter
  const filteredExpenses=searchQuery?expenses.filter(e=>e.desc?.toLowerCase().includes(searchQuery.toLowerCase())):expenses;
  const filteredIncomes=searchQuery?incomes.filter(i=>i.desc?.toLowerCase().includes(searchQuery.toLowerCase())):incomes;

  const inp={background:t.bg,border:`1px solid ${t.border}`,borderRadius:8,color:t.text,padding:"9px 12px",width:"100%",fontSize:13,outline:"none",boxSizing:"border-box",marginBottom:10,fontFamily:"inherit"};
  const Cb=(bg,col="#fff")=>({background:bg,border:"none",borderRadius:7,color:col,padding:"5px 10px",cursor:"pointer",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",gap:5});
  const Gb=(col)=>({background:"none",border:`1px solid ${col}`,borderRadius:7,color:col,padding:"4px 9px",cursor:"pointer",fontSize:10,fontWeight:700,display:"flex",alignItems:"center",gap:5});
  const card={background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:12,padding:"13px 15px",overflow:"hidden"};
  const TT={contentStyle:{background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:8,color:t.text,fontSize:10},cursor:{fill:"rgba(255,255,255,0.03)"}};
  const lbl={color:t.textSub,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:0.9};

  const closeModal=()=>{setModal(null);setForm({});};
  const openQuickAdd=(item, itemType)=>{ setQuickAdd({symbol:item.symbol, name:item.name, type:itemType, price:item.regularMarketPrice}); setForm({name:item.name, ticker:item.symbol, type:itemType, value:""}); };
  const confirmQuickAdd=()=>{ if(!form.value) return; addInvest(); setQuickAdd(null); };
  const updMonth=fn=>setMonthData(p=>fn(p));
  const updGlobal=fn=>setGlobalState(p=>fn(p));
  const addExpense=()=>{ if(!form.desc||!form.value)return; updMonth(p=>({...p,expenses:[...p.expenses,{...form,id:Date.now(),date:form.date||now.toISOString().slice(0,10)}]})); closeModal(); };
  const addIncome=()=>{ if(!form.desc||!form.value)return; updMonth(p=>({...p,incomes:[...p.incomes,{...form,id:Date.now(),date:form.date||now.toISOString().slice(0,10)}]})); closeModal(); };
  const addInvest=()=>{
    if(!form.name||!form.value) return;
    updGlobal(p=>({...p, investments:[...p.investments, {...form,id:Date.now()}]}));
    // save custom ticker to SHARED storage so all users see it
    if(form.ticker && form.ticker.trim()) {
      const ticker = form.ticker.trim().toUpperCase();
      if(form.type==="FII") {
        const sharedF = loadSharedFiis();
        if(!sharedF.find(f=>f.symbol===ticker) && !BASE_FIIS.find(f=>f.symbol===ticker)) {
          const newEntry = { symbol:ticker, name:form.name, type:"Personalizado", price:Number(form.value)||100, dy:0 };
          saveSharedFiis([...sharedF, newEntry]);
          // update local state immediately
          const change = (Math.random()-0.48)*2.2;
          setFiis(prev => prev.find(f=>f.symbol===ticker) ? prev : [...prev, { ...newEntry, regularMarketPrice:+newEntry.price.toFixed(2), regularMarketChangePercent:+change.toFixed(2) }]);
        }
      } else if(["Ação","ETF"].includes(form.type)) {
        const sharedS = loadSharedStocks();
        if(!sharedS.find(s=>s.symbol===ticker) && !BASE_STOCKS.find(s=>s.symbol===ticker)) {
          const newEntry = { symbol:ticker, name:form.name, sector:form.type, price:Number(form.value)||10 };
          saveSharedStocks([...sharedS, newEntry]);
          // update local state immediately
          const change = (Math.random()-0.48)*2.2;
          setStocks(prev => prev.find(s=>s.symbol===ticker) ? prev : [...prev, { ...newEntry, regularMarketPrice:+newEntry.price.toFixed(2), regularMarketChangePercent:+change.toFixed(2) }]);
        }
      }
    }
    closeModal();
  };
  const addCat=()=>{ if(!form.name)return; updGlobal(p=>({...p,categories:[...p.categories,{id:Date.now(),name:form.name,color:form.color||"#888",icon:form.icon||"📦"}]})); closeModal(); };
  const delExpense=id=>updMonth(p=>({...p,expenses:p.expenses.filter(e=>e.id!==id)}));
  const delIncome=id=>updMonth(p=>({...p,incomes:p.incomes.filter(e=>e.id!==id)}));
  const delInvest=id=>updGlobal(p=>({...p,investments:p.investments.filter(e=>e.id!==id)}));
  const delCat=id=>updGlobal(p=>({...p,categories:p.categories.filter(c=>c.id!==id)}));
  const addSaving=()=>{ if(!form.desc||!form.value)return; updGlobal(p=>({...p,savings:[...p.savings,{...form,id:Date.now(),date:new Date().toISOString().slice(0,10)}]})); setForm({}); };
  const withdrawSaving=id=>updGlobal(p=>({...p,savings:p.savings.filter(s=>s.id!==id)}));

  // SURPRESA 4: alerta de gasto excessivo
  const overBudget=savingsGoal>0&&totalExp>totalInc-savingsGoal;

  if(loading) return (
    <div style={{ minHeight:"100vh",background:"#0d0d0d",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16 }}>
      <NexusLogo themeName="Dark Red" size={64}/>
      <div style={{ color:"#888",fontSize:14,fontFamily:"sans-serif" }}>Carregando seus dados...</div>
      <div style={{ width:200,height:3,background:"#222",borderRadius:3,overflow:"hidden" }}>
        <div style={{ width:"60%",height:"100%",background:"#e53935",borderRadius:3,animation:"pulse 1.2s infinite" }}/>
      </div>
    </div>
  );
  return (
    <div style={{ minHeight:"100vh",background:t.bg,color:t.text,fontFamily:"'DM Sans','Segoe UI',sans-serif",display:"flex",flexDirection:"column" }}>

      {/* HEADER */}
      <div style={{ background:t.header,borderBottom:`1px solid ${t.border}`,padding:"0 18px",height:54,display:"flex",alignItems:"center",gap:10,flexShrink:0,position:"sticky",top:0,zIndex:200 }}>
        <div style={{ display:"flex",alignItems:"center",gap:8,marginRight:4 }}>
          <NexusLogo themeName={global.theme} size={38}/>
          <span style={{ fontWeight:800,fontSize:15,color:t.text,letterSpacing:-0.3 }}>Nexus</span>
        </div>
        {/* SURPRESA 2: busca funcional */}
        <div style={{ display:"flex",alignItems:"center",gap:7,background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:8,padding:"5px 11px",flex:1,maxWidth:280 }}>
          <span style={{ color:t.textMuted }}>{Ico.search}</span>
          <input placeholder="Buscar transação..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} style={{ background:"none",border:"none",color:t.text,outline:"none",fontSize:12,width:"100%",fontFamily:"inherit" }}/>
          {searchQuery&&<button onClick={()=>setSearchQuery("")} style={{ background:"none",border:"none",cursor:"pointer",color:t.textMuted,padding:0,lineHeight:0 }}>{Ico.x}</button>}
        </div>
        <div style={{ flex:1 }}/>
        <div style={{ display:"flex",alignItems:"center",background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:9,overflow:"hidden" }}>
          <button onClick={prevMonth} disabled={isOrigin} style={{ ...Cb(isOrigin?"transparent":t.bgCard2,isOrigin?t.textMuted:t.text),borderRadius:0,padding:"6px 10px",opacity:isOrigin?0.3:1 }}>{Ico.chevL}</button>
          <div style={{ padding:"0 12px",minWidth:140,textAlign:"center" }}>
            <div style={{ fontWeight:800,fontSize:13,color:t.text }}>{MONTH_NAMES[viewMonth]}</div>
            <div style={{ fontSize:10,color:t.textSub }}>{viewYear}</div>
          </div>
          <button onClick={nextMonth} style={{ ...Cb(t.bgCard2,t.text),borderRadius:0,padding:"6px 10px" }}>{Ico.chevR}</button>
        </div>
        <div style={{ display:"flex",background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:7,overflow:"hidden" }}>
          {["BRL","USD"].map(c=>(
            <button key={c} onClick={()=>updGlobal(p=>({...p,currency:c}))} style={{ padding:"5px 11px",border:"none",cursor:"pointer",fontSize:11,fontWeight:700,background:global.currency===c?t.accent:"transparent",color:global.currency===c?"#fff":t.textSub }}>{c}</button>
          ))}
        </div>
        <div style={{ position:"relative" }}>
          <button onClick={()=>setShowThemes(p=>!p)} style={{ ...Gb(t.textSub),padding:"5px 10px" }}>{Ico.palette} Tema</button>
          {showThemes&&(
            <div style={{ position:"absolute",right:0,top:38,background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:12,padding:10,zIndex:300,width:190,boxShadow:"0 16px 48px rgba(0,0,0,0.8)",maxHeight:380,overflowY:"auto" }}>
              <div style={{ ...lbl,marginBottom:8 }}>Temas ({Object.keys(THEMES).length})</div>
              {Object.keys(THEMES).map(tn=>(
                <button key={tn} onClick={()=>{updGlobal(p=>({...p,theme:tn}));setShowThemes(false);}} style={{ display:"flex",alignItems:"center",gap:7,width:"100%",background:global.theme===tn?t.accentGlow:"transparent",border:`1px solid ${global.theme===tn?t.accent:"transparent"}`,borderRadius:7,padding:"5px 9px",cursor:"pointer",marginBottom:2 }}>
                  <div style={{ width:10,height:10,borderRadius:"50%",background:THEMES[tn].accent,flexShrink:0 }}/>
                  <span style={{ color:t.text,fontSize:12 }}>{tn}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={()=>setShowExport(true)} style={{ ...Gb(t.accent),padding:"5px 10px" }}>{Ico.download} Exportar</button>
        <div style={{ display:"flex",alignItems:"center",gap:8,background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:8,padding:"5px 10px" }}>
          <span style={{ color:t.textSub }}>{Ico.user}</span>
          <span style={{ fontSize:12,color:t.text,fontWeight:700 }}>{displayName||user}</span>
          <button onClick={onLogout} title="Sair" style={{ background:"none",border:"none",cursor:"pointer",color:t.textMuted,padding:0,lineHeight:0 }}>{Ico.logout}</button>
        </div>
      </div>

      {/* ALERTA SURPRESA 4 */}
      {overBudget&&(
        <div className="fade-in" style={{ background:"rgba(255,82,82,0.12)",borderBottom:`1px solid rgba(255,82,82,0.4)`,padding:"7px 18px",display:"flex",alignItems:"center",gap:8 }}>
          <span style={{ color:"#ff5252" }}>{Ico.alert}</span>
          <span style={{ fontSize:12,color:"#ff5252",fontWeight:700 }}>⚠️ Atenção! Seus gastos estão acima da meta de economia deste mês.</span>
        </div>
      )}

      {/* CARRYOVER */}
      {carryover!==0&&(
        <div style={{ background:carryover>0?t.green+"18":t.red+"18",borderBottom:`1px solid ${carryover>0?t.green+"44":t.red+"44"}`,padding:"6px 18px" }}>
          <span style={{ fontSize:11,color:carryover>0?t.green:t.red,fontWeight:700 }}>
            {carryover>0?"▲":"▼"} Saldo acumulado: {fmt(Math.abs(carryover))}{carryover<0?" (dívida)":" (a favor)"}
          </span>
        </div>
      )}

      {/* GRID */}
      <div ref={scrollRef} style={{ flex:1,overflowY:"auto",padding:"14px 16px" }}>
        <div style={{ display:"flex",gap:10,alignItems:"flex-start" }}>

          {/* COL 1 - fixed width sidebar */}
          <div style={{ width:200,flexShrink:0,display:"flex",flexDirection:"column",gap:9 }}>

            {/* KPIs */}
            {[
              { label:"Saldo do Mês",  val:balance,  color:balance>=0?t.green:t.red, sub:balance>=0?"▲ Positivo":"▼ Negativo", mo:null },
              { label:"Receitas",      val:totalInc, color:t.green, sub:`${incomes.length} lançamentos`, mo:"income" },
              { label:"Gastos",        val:totalExp, color:t.red,   sub:`${expenses.length} lançamentos`, mo:"expense" },
              { label:"Investido",     val:totalInv, color:t.accent, sub:`${investments.length} posições`, mo:"investment" },
              { label:"Poupança",      val:totalSavings, color:t.yellow, sub:`${global.savings.length} depósitos`, mo:null },
            ].map(k=>(
              <div key={k.label} style={{ ...card,borderLeft:`3px solid ${k.color}` }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
                  <div>
                    <div style={lbl}>{k.label}</div>
                    <div style={{ color:k.color,fontSize:19,fontWeight:800,marginTop:3,lineHeight:1.1 }}>{fmt(k.val)}</div>
                    <div style={{ color:t.textMuted,fontSize:10,marginTop:2 }}>{k.sub}</div>
                  </div>
                  {k.mo&&!isFuture&&<button onClick={()=>setModal(k.mo)} style={{ ...Cb(k.color),padding:"4px 8px" }}>{Ico.plus}</button>}
                </div>
              </div>
            ))}

          {/* POUPANÇA BOTÃO */}
          <button onClick={()=>setShowSavings(true)} style={{ background:t.yellow,border:"none",borderRadius:8,color:"#000",padding:"8px 10px",cursor:"pointer",fontSize:11,fontWeight:800,display:"flex",alignItems:"center",gap:6,justifyContent:"center",width:"100%" }}>
            🏦 Poupança · {fmt(global.savings.reduce((s,e)=>s+Number(e.value||0),0))}
          </button>

            {/* SURPRESA 3: taxa de economia + meta */}
            <div style={{ ...card,borderLeft:`3px solid ${t.yellow}` }}>
              <div style={lbl}>Taxa de Economia</div>
              <div style={{ color:savingsRate>=0?t.green:t.red,fontSize:22,fontWeight:800,marginTop:3 }}>{savingsRate.toFixed(1)}%</div>
              <div style={{ background:t.bgCard2,borderRadius:6,height:5,marginTop:8,overflow:"hidden" }}>
                <div style={{ width:`${Math.min(Math.max(savingsRate,0),100)}%`,height:"100%",background:savingsRate>=20?t.green:savingsRate>=0?t.yellow:t.red,transition:"width 0.5s",borderRadius:6 }}/>
              </div>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8 }}>
                <span style={{ fontSize:10,color:t.textMuted }}>Meta mensal</span>
                <button onClick={()=>setModal("goal")} style={{ ...Gb(t.yellow),fontSize:9,padding:"2px 7px" }}>
                  {savingsGoal>0?fmt(savingsGoal):"Definir"}
                </button>
              </div>
            </div>

            {/* CATEGORIAS com scroll */}
            <div style={{ ...card,flex:1,display:"flex",flexDirection:"column" }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9 }}>
                <div style={lbl}>Categorias</div>
                <button onClick={()=>setModal("category")} style={{ ...Gb(t.accent),padding:"3px 7px",fontSize:10 }}>{Ico.plus}</button>
              </div>
              {/* scroll container fixo */}
              <div style={{ overflowY:"auto",flex:1,maxHeight:180,paddingRight:2 }}>
                <div style={{ display:"flex",flexDirection:"column",gap:4 }}>
                  {categories.map(cat=>{
                    const tot=expenses.filter(e=>e.catId===cat.id).reduce((s,e)=>s+Number(e.value||0),0);
                    const pct=totalExp>0?(tot/totalExp*100):0;
                    return (
                      <div key={cat.id} style={{ padding:"6px 8px",borderRadius:8,background:t.bgCard2 }}>
                        <div style={{ display:"flex",alignItems:"center",gap:7 }}>
                          <div style={{ width:6,height:6,borderRadius:"50%",background:cat.color,flexShrink:0 }}/>
                          <span style={{ fontSize:11,flex:1,color:t.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{cat.icon} {cat.name}</span>
                          <button onClick={()=>delCat(cat.id)} style={{ background:"none",border:"none",cursor:"pointer",color:t.textMuted,padding:0,lineHeight:0,flexShrink:0 }}>{Ico.trash}</button>
                        </div>
                        {tot>0&&(
                          <>
                            <div style={{ display:"flex",justifyContent:"space-between",marginTop:4 }}>
                              <span style={{ fontSize:9,color:t.textSub }}>{fmt(tot)}</span>
                              <span style={{ fontSize:9,color:t.textMuted }}>{pct.toFixed(0)}%</span>
                            </div>
                            <div style={{ background:t.border,borderRadius:3,height:3,marginTop:3,overflow:"hidden" }}>
                              <div style={{ width:`${pct}%`,height:"100%",background:cat.color,borderRadius:3 }}/>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* MAIN GRID - everything except col1 */}
          <div style={{ flex:1,display:"grid",gap:10,gridTemplateColumns:"1fr 1fr 1fr 210px",gridTemplateRows:"auto auto auto auto auto",alignContent:"start",minWidth:0 }}>

          {/* GRÁFICO MENSAL */}
          <div style={{ ...card,gridColumn:"1/3",gridRow:"1" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
              <span style={{ fontWeight:700,fontSize:13 }}>Receitas vs Gastos — {viewYear}</span>
              <span style={lbl}>Mensal</span>
            </div>
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={monthly} barGap={2} barSize={9}>
                <XAxis dataKey="m" tick={{ fill:t.textMuted,fontSize:9 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill:t.textMuted,fontSize:9 }} axisLine={false} tickLine={false} width={34}/>
                <Tooltip {...TT} formatter={v=>fmt(v)}/>
                <Bar dataKey="R" name="Receita" fill={t.green} radius={[3,3,0,0]}/>
                <Bar dataKey="G" name="Gasto"   fill={t.red}   radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* DONUT CATEGORIAS */}
          <div style={{ ...card,gridColumn:"3",gridRow:"1" }}>
            <div style={{ fontWeight:700,fontSize:13,marginBottom:8 }}>Por Categoria</div>
            {expByCat.length===0
              ? <div style={{ color:t.textMuted,fontSize:12,textAlign:"center",paddingTop:36 }}>Sem gastos</div>
              : <ResponsiveContainer width="100%" height={130}><PieChart><Pie data={expByCat} cx="50%" cy="50%" innerRadius={34} outerRadius={54} dataKey="value">{expByCat.map((e,i)=><Cell key={i} fill={e.color}/>)}</Pie><Tooltip {...TT} formatter={v=>fmt(v)}/></PieChart></ResponsiveContainer>
            }
          </div>

          {/* CARTEIRA com total */}
          <div style={{ ...card,gridColumn:"4",gridRow:"1/4" }}>
            <div style={{ fontWeight:700,fontSize:13,marginBottom:4 }}>Carteira</div>
            {/* TOTAL INVESTIDO destacado */}
            <div style={{ background:t.accentGlow,border:`1px solid ${t.accent}44`,borderRadius:9,padding:"8px 10px",marginBottom:10 }}>
              <div style={{ fontSize:9,color:t.textSub,fontWeight:700,textTransform:"uppercase",letterSpacing:0.8 }}>Total Investido</div>
              <div style={{ fontSize:18,fontWeight:900,color:t.accent,marginTop:2 }}>{fmt(totalInv)}</div>
              <div style={{ fontSize:10,color:t.textMuted,marginTop:1 }}>{investments.length} posições</div>
            </div>
            {investments.length===0
              ? <div style={{ color:t.textMuted,fontSize:12,textAlign:"center",paddingTop:20 }}>Sem investimentos</div>
              : <>
                  <ResponsiveContainer width="100%" height={110}><PieChart><Pie data={investments.map(i=>({name:i.name,value:Number(i.value)}))} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value">{investments.map((_,i)=><Cell key={i} fill={t.chart[i%t.chart.length]}/>)}</Pie><Tooltip {...TT} formatter={v=>fmt(v)}/></PieChart></ResponsiveContainer>
                  <div style={{ display:"flex",flexDirection:"column",gap:4,marginTop:8,maxHeight:160,overflowY:"auto" }}>
                    {investments.map((inv,i)=>(
                      <div key={inv.id} style={{ display:"flex",alignItems:"center",gap:6,padding:"5px 0",borderBottom:`1px solid ${t.border}` }}>
                        <div style={{ width:7,height:7,borderRadius:2,background:t.chart[i%t.chart.length],flexShrink:0 }}/>
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ fontSize:11,color:t.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{inv.name}</div>
                          <div style={{ fontSize:9,color:t.textMuted }}>{inv.type||"—"} · {totalInv?((inv.value/totalInv)*100).toFixed(0):0}%</div>
                        </div>
                        <span style={{ fontSize:10,color:t.accent,fontWeight:700,flexShrink:0 }}>{fmt(inv.value)}</span>
                        <button onClick={()=>delInvest(inv.id)} style={{ background:"none",border:"none",cursor:"pointer",color:t.textMuted,padding:0,lineHeight:0 }}>{Ico.trash}</button>
                      </div>
                    ))}
                  </div>
                </>
            }
            <button onClick={()=>setModal("investment")} style={{ ...Gb(t.border),width:"100%",justifyContent:"center",marginTop:10,color:t.textSub }}>{Ico.plus} Novo</button>
          </div>

          {/* GASTOS — menor, row 2 só */}
          <div style={{ ...card,gridColumn:"1/2",gridRow:"2" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
              <span style={{ fontWeight:700,fontSize:13 }}>Gastos — {MONTH_NAMES[viewMonth]}</span>
              {!isFuture&&<button onClick={()=>setModal("expense")} style={{ ...Cb(t.red),padding:"4px 9px" }}>{Ico.plus} Novo</button>}
            </div>
            {filteredExpenses.length===0
              ? <div style={{ color:t.textMuted,fontSize:12,textAlign:"center",padding:"16px 0" }}>{searchQuery?"Nenhum resultado":"Nenhum gasto neste mês"}</div>
              : <div style={{ display:"flex",flexDirection:"column",maxHeight:130,overflowY:"auto" }}>
                  {[...filteredExpenses].reverse().map(exp=>{
                    const cat=categories.find(c=>c.id===exp.catId);
                    return (
                      <div key={exp.id} style={{ display:"flex",alignItems:"center",gap:7,padding:"5px 0",borderBottom:`1px solid ${t.border}` }}>
                        <div style={{ width:22,height:22,borderRadius:5,background:(cat?.color||"#888")+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,flexShrink:0 }}>{cat?.icon||"📦"}</div>
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ fontSize:11,color:t.text,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{exp.desc}</div>
                          <div style={{ fontSize:9,color:t.textMuted }}>{cat?.name||"—"} · {exp.date}</div>
                        </div>
                        <div style={{ color:t.red,fontWeight:700,fontSize:11,flexShrink:0 }}>-{fmt(exp.value)}</div>
                        <button onClick={()=>delExpense(exp.id)} style={{ background:"none",border:"none",cursor:"pointer",color:t.textMuted,padding:0,lineHeight:0 }}>{Ico.trash}</button>
                      </div>
                    );
                  })}
                </div>
            }
          </div>

          {/* RECEITAS — menor, row 2 só */}
          <div style={{ ...card,gridColumn:"2/3",gridRow:"2" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
              <span style={{ fontWeight:700,fontSize:13 }}>Receitas — {MONTH_NAMES[viewMonth]}</span>
              {!isFuture&&<button onClick={()=>setModal("income")} style={{ ...Cb(t.green),padding:"4px 9px" }}>{Ico.plus} Nova</button>}
            </div>
            {filteredIncomes.length===0
              ? <div style={{ color:t.textMuted,fontSize:12,textAlign:"center",padding:"16px 0" }}>{searchQuery?"Nenhum resultado":"Nenhuma receita neste mês"}</div>
              : <div style={{ display:"flex",flexDirection:"column",maxHeight:130,overflowY:"auto" }}>
                  {[...filteredIncomes].reverse().map(inc=>(
                    <div key={inc.id} style={{ display:"flex",alignItems:"center",gap:7,padding:"5px 0",borderBottom:`1px solid ${t.border}` }}>
                      <div style={{ width:22,height:22,borderRadius:5,background:t.green+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,flexShrink:0 }}>💵</div>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontSize:11,color:t.text,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{inc.desc}</div>
                        <div style={{ fontSize:9,color:t.textMuted }}>{inc.source||"—"} · {inc.date}</div>
                      </div>
                      <div style={{ color:t.green,fontWeight:700,fontSize:11,flexShrink:0 }}>+{fmt(inc.value)}</div>
                      <button onClick={()=>delIncome(inc.id)} style={{ background:"none",border:"none",cursor:"pointer",color:t.textMuted,padding:0,lineHeight:0 }}>{Ico.trash}</button>
                    </div>
                  ))}
                </div>
            }
          </div>

          {/* CALENDÁRIO FINANCEIRO */}
          <div style={{ gridColumn:"1/3",gridRow:"3", minHeight:0 }}>
            <FinancialCalendar
              viewYear={viewYear} viewMonth={viewMonth}
              expenses={expenses} incomes={incomes}
              now={now} t={t} MONTH_NAMES={MONTH_NAMES}
            />
          </div>


          {/* AÇÕES — lista profissional completa */}
          <div style={{ ...card,gridColumn:"3/4",gridRow:"2" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
              <span style={{ fontWeight:700,fontSize:13 }}>📈 Ações B3 <span style={{ fontSize:10,color:t.textMuted,fontWeight:400 }}>({stocks.length})</span></span>
              <button onClick={fetchMarket} style={{ ...Gb(t.textSub),fontSize:10 }}>{Ico.refresh}{loadingMkt?"...":"Atualizar"}</button>
            </div>
            <input placeholder="Buscar ação..." value={stockSearch} onChange={e=>setStockSearch(e.target.value)}
              style={{ background:t.bgCard2,border:`1px solid ${t.border}`,borderRadius:7,color:t.text,padding:"5px 10px",width:"100%",fontSize:11,outline:"none",fontFamily:"inherit",marginBottom:8 }}/>
            <div style={{ display:"grid",gridTemplateColumns:"48px 1fr 64px 46px",gap:4,padding:"0 0 5px 0",borderBottom:`1px solid ${t.border}`,marginBottom:4 }}>
              {["Ticker","Nome / Setor","Preço","Var%"].map(h=><span key={h} style={{ fontSize:9,color:t.textMuted,fontWeight:700,textTransform:"uppercase",letterSpacing:0.6 }}>{h}</span>)}
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:1,maxHeight:180,overflowY:"auto" }}>
              {stocks.filter(s=>!stockSearch||(s.symbol+s.name+s.sector).toLowerCase().includes(stockSearch.toLowerCase())).map(s=>{ const up=s.regularMarketChangePercent>=0; return (
                <div key={s.symbol} onClick={()=>openQuickAdd(s,"Ação")} style={{ display:"grid",gridTemplateColumns:"48px 1fr 64px 46px",gap:4,padding:"6px 4px",borderBottom:`1px solid ${t.border}33`,alignItems:"center",cursor:"pointer",borderRadius:5,transition:"background 0.15s" }}
                  onMouseEnter={e=>e.currentTarget.style.background=t.bgCard2}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <div>
                    <div style={{ fontWeight:800,fontSize:11,color:t.text }}>{s.symbol}</div>
                    <div style={{ fontSize:8,color:t.textMuted,fontWeight:600 }}>{s.sector||"Personalizado"}</div>
                  </div>
                  <span style={{ fontSize:10,color:t.textSub,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{s.name}</span>
                  <span style={{ fontSize:11,fontWeight:700,color:t.text }}>R${s.regularMarketPrice.toFixed(2)}</span>
                  <span style={{ fontSize:10,fontWeight:700,color:up?t.green:t.red,textAlign:"right" }}>{up?"+":""}{s.regularMarketChangePercent.toFixed(2)}%</span>
                </div>
              ); })}
            </div>
          </div>

          {/* FIIs — lista profissional completa */}
          <div style={{ ...card,gridColumn:"3/4",gridRow:"3" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
              <span style={{ fontWeight:700,fontSize:13 }}>🏢 FIIs <span style={{ fontSize:10,color:t.textMuted,fontWeight:400 }}>({fiis.length})</span></span>
            </div>
            <input placeholder="Buscar FII..." value={fiiSearch} onChange={e=>setFiiSearch(e.target.value)}
              style={{ background:t.bgCard2,border:`1px solid ${t.border}`,borderRadius:7,color:t.text,padding:"5px 10px",width:"100%",fontSize:11,outline:"none",fontFamily:"inherit",marginBottom:8 }}/>
            <div style={{ display:"grid",gridTemplateColumns:"52px 1fr 60px 40px",gap:4,padding:"0 0 5px 0",borderBottom:`1px solid ${t.border}`,marginBottom:4 }}>
              {["Ticker","Tipo","Preço","DY%"].map(h=><span key={h} style={{ fontSize:9,color:t.textMuted,fontWeight:700,textTransform:"uppercase",letterSpacing:0.6 }}>{h}</span>)}
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:1,maxHeight:165,overflowY:"auto" }}>
              {fiis.filter(s=>!fiiSearch||(s.symbol+s.name+s.type).toLowerCase().includes(fiiSearch.toLowerCase())).map(s=>{ const up=s.regularMarketChangePercent>=0; return (
                <div key={s.symbol} onClick={()=>openQuickAdd(s,"FII")} style={{ display:"grid",gridTemplateColumns:"52px 1fr 60px 40px",gap:4,padding:"6px 4px",borderBottom:`1px solid ${t.border}33`,alignItems:"center",cursor:"pointer",borderRadius:5,transition:"background 0.15s" }}
                  onMouseEnter={e=>e.currentTarget.style.background=t.bgCard2}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <div>
                    <div style={{ fontWeight:800,fontSize:11,color:t.text }}>{s.symbol}</div>
                    <div style={{ fontSize:8,color:up?t.green:t.red,fontWeight:600 }}>{up?"+":""}{s.regularMarketChangePercent.toFixed(2)}%</div>
                  </div>
                  <span style={{ fontSize:10,color:t.textSub,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{s.type||"Personalizado"} · {s.name}</span>
                  <span style={{ fontSize:11,fontWeight:700,color:t.text }}>R${s.regularMarketPrice.toFixed(2)}</span>
                  <span style={{ fontSize:10,fontWeight:700,color:t.green,textAlign:"right" }}>{s.dy?s.dy+"%":"—"}</span>
                </div>
              ); })}
            </div>
          </div>

          {/* EVOLUÇÃO */}
          <div style={{ ...card,gridColumn:"1/4",gridRow:"4" }}>
            <div style={{ fontWeight:700,fontSize:13,marginBottom:8 }}>Evolução Anual — {viewYear}</div>
            <ResponsiveContainer width="100%" height={100}>
              <AreaChart data={monthly}>
                <defs>
                  <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={t.green} stopOpacity={0.3}/><stop offset="95%" stopColor={t.green} stopOpacity={0}/></linearGradient>
                  <linearGradient id="gG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={t.red} stopOpacity={0.3}/><stop offset="95%" stopColor={t.red} stopOpacity={0}/></linearGradient>
                </defs>
                <XAxis dataKey="m" tick={{ fill:t.textMuted,fontSize:9 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill:t.textMuted,fontSize:9 }} axisLine={false} tickLine={false} width={34}/>
                <Tooltip {...TT} formatter={v=>fmt(v)}/>
                <Area type="monotone" dataKey="R" name="Receita" stroke={t.green} fill="url(#gR)" strokeWidth={1.5}/>
                <Area type="monotone" dataKey="G" name="Gasto"   stroke={t.red}   fill="url(#gG)" strokeWidth={1.5}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* INVESTIMENTOS LISTA */}
          <div style={{ ...card,gridColumn:"1/5",gridRow:"5" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9 }}>
              <span style={{ fontWeight:700,fontSize:13 }}>Investimentos</span>
              <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                <span style={{ fontSize:11,color:t.accent,fontWeight:700 }}>Total: {fmt(totalInv)}</span>
                <button onClick={()=>setModal("investment")} style={{ ...Cb(t.accent),padding:"4px 9px" }}>{Ico.plus} Novo</button>
              </div>
            </div>
            {investments.length===0
              ? <div style={{ color:t.textMuted,fontSize:12,textAlign:"center",padding:"18px 0" }}>Nenhum investimento</div>
              : <div style={{ display:"flex",flexDirection:"column",maxHeight:110,overflowY:"auto" }}>
                  {investments.map((inv,i)=>(
                    <div key={inv.id} style={{ display:"flex",alignItems:"center",gap:7,padding:"6px 0",borderBottom:`1px solid ${t.border}` }}>
                      <div style={{ width:7,height:7,borderRadius:2,background:t.chart[i%t.chart.length],flexShrink:0 }}/>
                      <span style={{ fontSize:12,color:t.text,flex:1 }}>{inv.name}</span>
                      <span style={{ fontSize:10,color:t.textMuted }}>{inv.type||"—"}</span>
                      <span style={{ fontSize:12,color:t.accent,fontWeight:700 }}>{fmt(inv.value)}</span>
                      <span style={{ fontSize:10,color:t.textMuted }}>{totalInv?((inv.value/totalInv)*100).toFixed(0):0}%</span>
                      <button onClick={()=>delInvest(inv.id)} style={{ background:"none",border:"none",cursor:"pointer",color:t.textMuted,padding:0,lineHeight:0 }}>{Ico.trash}</button>
                    </div>
                  ))}
                </div>
            }
          </div>

          {/* SURPRESA 5: resumo do dia */}
          <div style={{ ...card,gridColumn:"4",gridRow:"4",borderLeft:`3px solid ${t.yellow}`,display:"flex",flexDirection:"column",gap:6 }}>
            <div style={{ fontWeight:700,fontSize:13,marginBottom:2 }}>📅 Hoje</div>
            <div style={{ fontSize:11,color:t.textSub }}>{now.toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long"})}</div>
            <div style={{ borderTop:`1px solid ${t.border}`,paddingTop:8,display:"flex",flexDirection:"column",gap:5,marginTop:4 }}>
              <div style={{ display:"flex",justifyContent:"space-between" }}>
                <span style={{ fontSize:11,color:t.textSub }}>Gastos hoje</span>
                <span style={{ fontSize:11,color:t.red,fontWeight:700 }}>-{fmt(expenses.filter(e=>e.date===now.toISOString().slice(0,10)).reduce((s,e)=>s+Number(e.value||0),0))}</span>
              </div>
              <div style={{ display:"flex",justifyContent:"space-between" }}>
                <span style={{ fontSize:11,color:t.textSub }}>Receitas hoje</span>
                <span style={{ fontSize:11,color:t.green,fontWeight:700 }}>+{fmt(incomes.filter(i=>i.date===now.toISOString().slice(0,10)).reduce((s,i)=>s+Number(i.value||0),0))}</span>
              </div>
              <div style={{ display:"flex",justifyContent:"space-between",borderTop:`1px solid ${t.border}`,paddingTop:5,marginTop:2 }}>
                <span style={{ fontSize:11,color:t.textSub }}>Dias restantes</span>
                <span style={{ fontSize:11,color:t.yellow,fontWeight:700 }}>{new Date(now.getFullYear(),now.getMonth()+1,0).getDate()-now.getDate()} dias</span>
              </div>
            </div>
          </div>

          </div>{/* end main grid */}
        </div>{/* end flex */}
      </div>{/* end scroll */}

      {/* POUPANÇA MODAL */}
      <SavingsModal
        open={showSavings}
        onClose={()=>setShowSavings(false)}
        savings={global.savings}
        form={form} setForm={setForm}
        onAdd={()=>{ addSaving(); }}
        onWithdraw={withdrawSaving}
        t={t} fmt={fmt}
      />

      {/* QUICK ADD MODAL */}
      <QuickAddModal
        item={quickAdd}
        form={form}
        setForm={setForm}
        onConfirm={confirmQuickAdd}
        onClose={()=>{ setQuickAdd(null); setForm({}); }}
        t={t}
        fmt={fmt}
      />

      {/* SCROLL TO TOP */}
      {showScrollTop&&(
        <button onClick={()=>scrollRef.current?.scrollTo({top:0,behavior:"smooth"})}
          style={{ position:"fixed",bottom:24,right:24,width:42,height:42,borderRadius:"50%",background:t.accent,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",boxShadow:`0 4px 20px ${t.accentGlow}`,zIndex:500 }}>
          {Ico.arrowUp}
        </button>
      )}

      {/* MODALS */}
      <Modal open={modal==="expense"} onClose={closeModal} title={`Novo Gasto — ${MONTH_NAMES[viewMonth]}`} t={t}>
        <input style={inp} placeholder="Descrição *" value={form.desc||""} onChange={e=>setForm(p=>({...p,desc:e.target.value}))}/>
        <input style={inp} type="number" placeholder="Valor *" value={form.value||""} onChange={e=>setForm(p=>({...p,value:e.target.value}))}/>
        <input style={inp} type="date" value={form.date||""} onChange={e=>setForm(p=>({...p,date:e.target.value}))}/>
        <select style={inp} value={form.catId||""} onChange={e=>setForm(p=>({...p,catId:Number(e.target.value)}))}>
          <option value="">Categoria</option>
          {categories.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
        <button onClick={addExpense} style={{ ...Cb(t.red),width:"100%",justifyContent:"center",padding:"11px",fontSize:13,marginTop:4 }}>Adicionar Gasto</button>
      </Modal>

      <Modal open={modal==="income"} onClose={closeModal} title={`Nova Receita — ${MONTH_NAMES[viewMonth]}`} t={t}>
        <input style={inp} placeholder="Descrição *" value={form.desc||""} onChange={e=>setForm(p=>({...p,desc:e.target.value}))}/>
        <input style={inp} type="number" placeholder="Valor *" value={form.value||""} onChange={e=>setForm(p=>({...p,value:e.target.value}))}/>
        <input style={inp} placeholder="Fonte (ex: Salário...)" value={form.source||""} onChange={e=>setForm(p=>({...p,source:e.target.value}))}/>
        <input style={inp} type="date" value={form.date||""} onChange={e=>setForm(p=>({...p,date:e.target.value}))}/>
        <button onClick={addIncome} style={{ ...Cb(t.green),width:"100%",justifyContent:"center",padding:"11px",fontSize:13,marginTop:4 }}>Adicionar Receita</button>
      </Modal>

      <Modal open={modal==="investment"} onClose={closeModal} title="Novo Investimento" t={t}>
        <input style={inp} placeholder="Nome *" value={form.name||""} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/>
        <input style={inp} type="number" placeholder="Valor aportado *" value={form.value||""} onChange={e=>setForm(p=>({...p,value:e.target.value}))}/>
        <select style={inp} value={form.type||""} onChange={e=>setForm(p=>({...p,type:e.target.value}))}>
          <option value="">Tipo</option>
          {["Ação","FII","CDB","Tesouro Direto","Renda Fixa","Cripto","ETF","Outro"].map(tp=><option key={tp}>{tp}</option>)}
        </select>
        {(form.type==="Ação"||form.type==="FII"||form.type==="ETF") && (
          <div>
            <div style={{ color:t.textSub, fontSize:11, marginBottom:5 }}>
              Código do ticker (ex: {form.type==="FII"?"MXRF11":"PETR4"})
            </div>
            <input style={{ ...inp, textTransform:"uppercase" }}
              placeholder={`Ticker ${form.type} (opcional)`}
              value={form.ticker||""}
              onChange={e=>setForm(p=>({...p,ticker:e.target.value.toUpperCase()}))}/>
            <div style={{ color:t.textMuted, fontSize:10, marginTop:-8, marginBottom:10 }}>
              💡 Se informado, aparecerá automaticamente na lista de {form.type==="FII"?"FIIs":"ações"}
            </div>
          </div>
        )}
        <button onClick={addInvest} style={{ ...Cb(t.accent),width:"100%",justifyContent:"center",padding:"11px",fontSize:13,marginTop:4 }}>Adicionar</button>
      </Modal>

      <Modal open={modal==="category"} onClose={closeModal} title="Nova Categoria" t={t}>
        <input style={inp} placeholder="Nome *" value={form.name||""} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/>
        <div style={{ display:"flex",gap:10 }}>
          <input style={{ ...inp,flex:1,marginBottom:0 }} placeholder="Emoji (ex: 🛒)" value={form.icon||""} onChange={e=>setForm(p=>({...p,icon:e.target.value}))}/>
          <div style={{ flex:1 }}>
            <div style={{ color:t.textSub,fontSize:11,marginBottom:5 }}>Cor</div>
            <input type="color" value={form.color||"#888"} onChange={e=>setForm(p=>({...p,color:e.target.value}))} style={{ width:"100%",height:39,borderRadius:8,border:`1px solid ${t.border}`,background:t.bg,cursor:"pointer" }}/>
          </div>
        </div>
        <button onClick={addCat} style={{ ...Cb(t.accent),width:"100%",justifyContent:"center",padding:"11px",fontSize:13,marginTop:12 }}>Criar Categoria</button>
      </Modal>

      <Modal open={modal==="goal"} onClose={closeModal} title="Meta de Economia Mensal" t={t}>
        <div style={{ color:t.textSub,fontSize:12,marginBottom:14 }}>Defina quanto quer guardar por mês. Você será alertado se os gastos ultrapassarem esse limite.</div>
        <input style={inp} type="number" placeholder={`Ex: ${sym} 500,00`} value={form.goal||""} onChange={e=>setForm(p=>({...p,goal:e.target.value}))}/>
        <button onClick={()=>{ setSavingsGoal(Number(form.goal||0)); closeModal(); }} style={{ ...Cb(t.yellow,"#000"),width:"100%",justifyContent:"center",padding:"11px",fontSize:13,marginTop:4 }}>Salvar Meta</button>
        {savingsGoal>0&&<button onClick={()=>{ setSavingsGoal(0); closeModal(); }} style={{ ...Gb(t.textMuted),width:"100%",justifyContent:"center",marginTop:8,padding:"8px" }}>Remover meta</button>}
      </Modal>

      <Modal open={showExport} onClose={()=>setShowExport(false)} title="Exportar Dados (CSV)" t={t}>
        <div style={{ color:t.textSub,fontSize:12,marginBottom:14 }}>Selecione o período e baixe o arquivo. Abra no Google Sheets em <b>Arquivo → Importar</b>.</div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:4 }}>
          <div><div style={{ color:t.textSub,fontSize:11,marginBottom:5 }}>De — Mês</div><select style={inp} value={exportForm.fromMonth} onChange={e=>setExportForm(p=>({...p,fromMonth:Number(e.target.value)}))}>{MONTH_NAMES.map((m,i)=><option key={i} value={i}>{m}</option>)}</select></div>
          <div><div style={{ color:t.textSub,fontSize:11,marginBottom:5 }}>De — Ano</div><select style={inp} value={exportForm.fromYear} onChange={e=>setExportForm(p=>({...p,fromYear:Number(e.target.value)}))}>{[2023,2024,2025,2026,2027].map(y=><option key={y}>{y}</option>)}</select></div>
          <div><div style={{ color:t.textSub,fontSize:11,marginBottom:5 }}>Até — Mês</div><select style={inp} value={exportForm.toMonth} onChange={e=>setExportForm(p=>({...p,toMonth:Number(e.target.value)}))}>{MONTH_NAMES.map((m,i)=><option key={i} value={i}>{m}</option>)}</select></div>
          <div><div style={{ color:t.textSub,fontSize:11,marginBottom:5 }}>Até — Ano</div><select style={inp} value={exportForm.toYear} onChange={e=>setExportForm(p=>({...p,toYear:Number(e.target.value)}))}>{[2023,2024,2025,2026,2027].map(y=><option key={y}>{y}</option>)}</select></div>
        </div>
        <button onClick={exportCSV} style={{ ...Cb(t.accent),width:"100%",justifyContent:"center",padding:"11px",fontSize:13 }}>{Ico.download} Baixar CSV</button>
      </Modal>
    </div>
    );
}

// ─── FINANCIAL CALENDAR ──────────────────────────────────────────────────────
function FinancialCalendar({ viewYear, viewMonth, expenses, incomes, now, t, MONTH_NAMES }) {
  const card = { background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:12, padding:"13px 15px", overflow:"hidden" };
  const daysInMonth = new Date(viewYear, viewMonth+1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const todayD = now.getDate();
  const isCurrentMonth = viewYear===now.getFullYear() && viewMonth===now.getMonth();
  const WEEK = ["D","S","T","Q","Q","S","S"];

  const dayMap = {};
  expenses.forEach(e => {
    const d = new Date(e.date+"T12:00:00").getDate();
    if(!dayMap[d]) dayMap[d]={exp:0,inc:0,expList:[],incList:[]};
    dayMap[d].exp += Number(e.value||0);
    dayMap[d].expList.push(e.desc);
  });
  incomes.forEach(i => {
    const d = new Date(i.date+"T12:00:00").getDate();
    if(!dayMap[d]) dayMap[d]={exp:0,inc:0,expList:[],incList:[]};
    dayMap[d].inc += Number(i.value||0);
    dayMap[d].incList.push(i.desc);
  });

  const cells = [];
  for(let i=0;i<firstDay;i++) cells.push(null);
  for(let d=1;d<=daysInMonth;d++) cells.push(d);

  return (
    <div style={{ ...card }}>
      <div style={{ fontWeight:700, fontSize:13, marginBottom:10 }}>
        📅 Calendário — {MONTH_NAMES[viewMonth]} {viewYear}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:4 }}>
        {WEEK.map((w,i)=>(
          <div key={i} style={{ textAlign:"center", fontSize:9, color:t.textMuted, fontWeight:700, padding:"2px 0" }}>{w}</div>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
        {cells.map((d,i)=>{
          if(!d) return <div key={i}/>;
          const ev = dayMap[d];
          const hasExp = ev && ev.exp>0;
          const hasInc = ev && ev.inc>0;
          const hasBoth = hasExp && hasInc;
          const isToday = isCurrentMonth && d===todayD;
          let bg = "transparent";
          let border = `1px solid ${t.border}55`;
          if(hasBoth)      { bg=t.yellow+"22"; border=`1px solid ${t.yellow}88`; }
          else if(hasInc)  { bg=t.green+"25";  border=`1px solid ${t.green}88`; }
          else if(hasExp)  { bg=t.red+"25";    border=`1px solid ${t.red}88`; }
          if(isToday)      { border=`2px solid ${t.accent}`; }
          const tip = ev ? [...(ev.incList.map(n=>"✅ "+n)), ...(ev.expList.map(n=>"❌ "+n))].join("\n") : "";
          return (
            <div key={d} title={tip} style={{ background:bg, border, borderRadius:5, padding:"4px 2px", textAlign:"center", cursor:ev?"pointer":"default" }}>
              <div style={{ fontSize:10, fontWeight:isToday?900:600, color:isToday?t.accent:t.text }}>{d}</div>
              <div style={{ display:"flex", justifyContent:"center", gap:2, marginTop:2 }}>
                {hasInc && <div style={{ width:4, height:4, borderRadius:"50%", background:t.green }}/>}
                {hasExp && <div style={{ width:4, height:4, borderRadius:"50%", background:t.red }}/>}
              </div>
              {ev && (hasInc||hasExp) && (
                <div style={{ fontSize:7, color:hasBoth?t.yellow:hasInc?t.green:t.red, marginTop:1, lineHeight:1 }}>
                  {hasBoth?"±":hasInc?"+":"-"}{Math.abs((ev.inc||0)-(ev.exp||0)).toLocaleString("pt-BR",{maximumFractionDigits:0})}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ display:"flex", gap:14, marginTop:10, justifyContent:"center" }}>
        {[[t.green,"Receita"],[t.red,"Gasto"],[t.yellow,"Ambos"],[t.accent,"Hoje"]].map(([c,l])=>(
          <div key={l} style={{ display:"flex", alignItems:"center", gap:4 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:c }}/>
            <span style={{ fontSize:9, color:t.textMuted }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SAVINGS MODAL ───────────────────────────────────────────────────────────
function SavingsModal({ open, onClose, savings, form, setForm, onAdd, onWithdraw, t, fmt }) {
  if (!open) return null;
  const total = savings.reduce((s,e)=>s+Number(e.value||0),0);
  const inp = { background:t.bg, border:`1px solid ${t.border}`, borderRadius:8, color:t.text, padding:"9px 12px", width:"100%", fontSize:13, outline:"none", boxSizing:"border-box", marginBottom:10, fontFamily:"inherit" };
  return (
    <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.82)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(8px)" }}>
      <div className="fade-in" onClick={e=>e.stopPropagation()} style={{ background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:16,padding:26,width:420,maxHeight:"80vh",display:"flex",flexDirection:"column",boxShadow:`0 0 80px ${t.accentGlow}` }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
          <span style={{ color:t.text,fontWeight:800,fontSize:15 }}>🏦 Poupança</span>
          <span style={{ color:t.yellow,fontWeight:800,fontSize:15 }}>{fmt(total)}</span>
        </div>
        {/* Add form */}
        <div style={{ background:t.bgCard2,borderRadius:10,padding:14,marginBottom:14 }}>
          <div style={{ color:t.textSub,fontSize:11,fontWeight:700,marginBottom:8,textTransform:"uppercase",letterSpacing:0.8 }}>Novo Depósito</div>
          <input style={inp} placeholder="Descrição *" value={form.desc||""} onChange={e=>setForm(p=>({...p,desc:e.target.value}))}/>
          <input style={{...inp,marginBottom:0}} type="number" placeholder="Valor *" value={form.value||""} onChange={e=>setForm(p=>({...p,value:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&onAdd()}/>
          <div style={{ color:t.textMuted,fontSize:10,margin:"6px 0 10px" }}>💡 O valor será descontado do saldo principal</div>
          <button onClick={onAdd} style={{ background:t.yellow,border:"none",borderRadius:8,color:"#000",padding:"9px",width:"100%",fontSize:13,fontWeight:800,cursor:"pointer" }}>+ Depositar</button>
        </div>
        {/* List */}
        <div style={{ overflowY:"auto",flex:1 }}>
          {savings.length===0
            ? <div style={{ color:t.textMuted,fontSize:12,textAlign:"center",padding:"20px 0" }}>Nenhum depósito ainda</div>
            : savings.map(s=>(
              <div key={s.id} style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 0",borderBottom:`1px solid ${t.border}` }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12,color:t.text,fontWeight:600 }}>{s.desc}</div>
                  <div style={{ fontSize:10,color:t.textMuted }}>{s.date}</div>
                </div>
                <div style={{ color:t.yellow,fontWeight:700,fontSize:13 }}>{fmt(s.value)}</div>
                <button onClick={()=>onWithdraw(s.id)} title="Retirar (volta ao saldo)" style={{ background:"none",border:`1px solid ${t.border}`,borderRadius:6,color:t.green,padding:"3px 8px",cursor:"pointer",fontSize:11,fontWeight:700 }}>↩ Retirar</button>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

// ─── QUICK ADD MODAL ─────────────────────────────────────────────────────────
function QuickAddModal({ item, form, setForm, onConfirm, onClose, t, fmt }) {
  if (!item) return null;
  const up = item.price >= 0;
  const inp = { background:t.bg, border:`1px solid ${t.border}`, borderRadius:8, color:t.text, padding:"10px 14px", width:"100%", fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"inherit" };
  return (
    <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.82)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(8px)" }}>
      <div className="fade-in" onClick={e=>e.stopPropagation()} style={{ background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:16,padding:28,width:360,boxShadow:`0 0 80px ${t.accentGlow}` }}>
        {/* Header */}
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20 }}>
          <div>
            <div style={{ fontSize:11,color:t.textSub,fontWeight:700,textTransform:"uppercase",letterSpacing:0.8,marginBottom:4 }}>{item.type}</div>
            <div style={{ fontSize:20,fontWeight:900,color:t.text }}>{item.symbol}</div>
            <div style={{ fontSize:12,color:t.textSub,marginTop:2 }}>{item.name}</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:18,fontWeight:800,color:t.text }}>R$ {item.price.toFixed(2)}</div>
            <div style={{ fontSize:11,color:t.green,fontWeight:700,marginTop:2 }}>Preço atual</div>
          </div>
        </div>
        {/* Value input */}
        <div style={{ marginBottom:16 }}>
          <div style={{ color:t.textSub,fontSize:12,marginBottom:8,fontWeight:600 }}>Valor a investir (R$)</div>
          <input style={inp} type="number" placeholder="Ex: 500,00" value={form.value||""}
            onChange={e=>setForm(p=>({...p,value:e.target.value}))}
            onKeyDown={e=>e.key==="Enter"&&onConfirm()} autoFocus/>
          {form.value && (
            <div style={{ color:t.textMuted,fontSize:11,marginTop:6 }}>
              ≈ {(Number(form.value)/item.price).toFixed(2)} cotas
            </div>
          )}
        </div>
        {/* Buttons */}
        <div style={{ display:"flex",gap:10 }}>
          <button onClick={onClose} style={{ flex:1,background:"none",border:`1px solid ${t.border}`,borderRadius:9,color:t.textSub,padding:"11px",fontSize:13,cursor:"pointer",fontWeight:700 }}>Cancelar</button>
          <button onClick={onConfirm} style={{ flex:2,background:t.accent,border:"none",borderRadius:9,color:"#fff",padding:"11px",fontSize:13,cursor:"pointer",fontWeight:800,boxShadow:`0 4px 16px ${t.accentGlow}` }}>
            + Adicionar à Carteira
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [user,setUser]=useState(()=>loadSession());
  const [displayName,setDisplayName]=useState(()=>{
    try{const u=loadSession();if(u){const users=loadUsers();return users[u]?.displayName||u;}return null;}catch{return null;}
  });
  const handleLogin=(u,dn)=>{ setUser(u); setDisplayName(dn||u); };
  const handleLogout=()=>{ clearSession(); setUser(null); setDisplayName(null); };
  return (<><GlobalStyle/>{user?<Dashboard user={user} displayName={displayName} onLogout={handleLogout}/>:<LoginScreen onLogin={handleLogin}/>}</>);
}
