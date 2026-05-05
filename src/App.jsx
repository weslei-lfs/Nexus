import { useState, useEffect, useCallback, useRef } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
const SUPA_URL = "https://tpglmgsuolpzqkwdbjbq.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwZ2xtZ3N1b2xwenFrd2RiamJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NDY2NjYsImV4cCI6MjA5MzIyMjY2Nn0.qudWmbfGIwOXVo9jlj_lqJKUI0EaUEYkSWLLGxmjjgQ";

async function supaGet(path) {
  try {
    const res = await fetch(SUPA_URL + "/rest/v1/" + path, {
      headers: { "apikey": SUPA_KEY, "Authorization": "Bearer " + SUPA_KEY, "Accept": "application/json" }
    });
    if (!res.ok) return [];
    const d = await res.json();
    return Array.isArray(d) ? d : [];
  } catch(e) { return []; }
}
async function supaPost(path, body, upsert=false) {
  try {
    const res = await fetch(SUPA_URL + "/rest/v1/" + path, {
      method: "POST",
      headers: { "apikey": SUPA_KEY, "Authorization": "Bearer " + SUPA_KEY, "Content-Type": "application/json", "Prefer": upsert ? "resolution=merge-duplicates,return=minimal" : "return=minimal" },
      body: JSON.stringify(body)
    });
    return res.status >= 200 && res.status < 300;
  } catch(e) { return false; }
}
async function dbFindUser(u) { const r = await supaGet(`nexus_users?username=eq.${encodeURIComponent(u)}&select=username,password,display_name`); return r[0]||null; }
async function dbSaveUser(u,p,d) { return supaPost("nexus_users",{username:u,password:p,display_name:d}); }
async function dbLoadGlobal(u) { const r = await supaGet(`nexus_global?username=eq.${encodeURIComponent(u)}&select=data`); return r[0]?.data||null; }
async function dbSaveGlobal(u,d) { return supaPost("nexus_global",{username:u,data:d,updated_at:new Date().toISOString()},true); }
async function dbLoadMonth(u,y,m) { const r = await supaGet(`nexus_months?username=eq.${encodeURIComponent(u)}&year=eq.${y}&month=eq.${m}&select=data`); return r[0]?.data||null; }
async function dbSaveMonth(u,y,m,d) {
  const body={username:u,year:y,month:m,data:d,updated_at:new Date().toISOString()};
  try{const res=await fetch(SUPA_URL+"/rest/v1/nexus_months?username=eq."+encodeURIComponent(u)+"&year=eq."+y+"&month=eq."+m,{method:"PATCH",headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY,"Content-Type":"application/json","Prefer":"return=minimal"},body:JSON.stringify({data:d,updated_at:new Date().toISOString()})});if(res.ok)return true;}catch(e){}
  return supaPost("nexus_months",body,true);
}
async function dbLoadAllMonths(u,y) { return supaGet(`nexus_months?username=eq.${encodeURIComponent(u)}&year=eq.${y}&select=month,data`); }
async function dbLoadMeta(u) { const r = await supaGet(`nexus_meta?username=eq.${encodeURIComponent(u)}&select=data`); return r[0]?.data||null; }
async function dbSaveMeta(u,d) { return supaPost("nexus_meta",{username:u,data:d},true); }




async function getExchangeRates() {
  try {
    const cached = JSON.parse(localStorage.getItem("nexus_rates")||"{}");
    if(cached.rates && Date.now()-(cached.ts||0) < 3600000) return cached.rates;
    const res = await fetch("https://api.exchangerate-api.com/v4/latest/BRL");
    const data = await res.json();
    const rates = { BRL:1, USD:data.rates.USD, EUR:data.rates.EUR };
    localStorage.setItem("nexus_rates", JSON.stringify({rates,ts:Date.now()}));
    return rates;
  } catch(e) { return { BRL:1, USD:0.18, EUR:0.17 }; }
}


const TRANSLATIONS = {
  "pt-BR": { balance:"Saldo do Mês", income:"Receitas", expense:"Gastos", invested:"Investido", savings:"Poupança", savingsRate:"Taxa de Economia", categories:"Categorias", wallet:"Carteira", totalInvested:"TOTAL INVESTIDO", noInvestments:"Sem investimentos", barChart:"Receitas vs Gastos", monthly:"Mensal", byCategory:"Por Categoria", noCategoryExpenses:"Nenhum gasto categorizado", calendar:"Calendário", stocks:"Ações B3", fiis:"FIIs", searchStock:"Buscar ação...", searchFii:"Buscar FII...", annualEvolution:"Evolução Anual", investments:"Investimentos", today:"Hoje", todayExpenses:"Gastos hoje", todayIncomes:"Receitas hoje", daysLeft:"Dias restantes", insightsTitle:"Insights do Mês", goals:"Metas", noGoals:"Nenhuma meta ainda. Defina uma meta!", addGoalValue:"+ Adicionar valor", liveExchange:"Câmbio Ao Vivo", update:"Atualizar", updatedAt:"Atualizado:", switchTo:"trocar →", positive:"▲ Positivo", negative:"▼ Negativo", launches:"lançamentos", positions:"posições", deposits:"depósitos", monthGoal:"Meta mensal", define:"Definir", newBtn:"+ Novo", newFem:"+ Nova", noExpenses:"Nenhum gasto neste mês", noIncomes:"Nenhuma receita neste mês", expensesTitle:"Gastos", incomesTitle:"Receitas", days:"dias", savingsBtn:"Poupança" },
  "en-US": { Atualizado:"Updated", balance:"Monthly Balance", income:"Income", expense:"Expenses", invested:"Invested", savings:"Savings", savingsRate:"Savings Rate", categories:"Categories", wallet:"Portfolio", totalInvested:"TOTAL INVESTED", noInvestments:"No investments", barChart:"Income vs Expenses", monthly:"Monthly", byCategory:"By Category", noCategoryExpenses:"No categorized expenses", calendar:"Calendar", stocks:"Stocks", fiis:"REITs", searchStock:"Search stock...", searchFii:"Search REIT...", annualEvolution:"Annual Evolution", investments:"Investments", today:"Today", todayExpenses:"Today's expenses", todayIncomes:"Today's income", daysLeft:"Days left", insightsTitle:"Monthly Insights", goals:"Goals", noGoals:"No goals yet. Set a goal!", addGoalValue:"+ Add value", liveExchange:"Live Exchange", update:"Update", updatedAt:"Updated:", switchTo:"switch →", positive:"▲ Positive", negative:"▼ Negative", launches:"entries", positions:"positions", deposits:"deposits", monthGoal:"Monthly goal", define:"Set", newBtn:"+ New", newFem:"+ New", noExpenses:"No expenses this month", noIncomes:"No income this month", expensesTitle:"Expenses", incomesTitle:"Income", days:"days", savingsBtn:"Savings" },
  "de-DE": { Atualizado:"Aktualisiert", balance:"Monatssaldo", income:"Einnahmen", expense:"Ausgaben", invested:"Investiert", savings:"Ersparnisse", savingsRate:"Sparquote", categories:"Kategorien", wallet:"Portfolio", totalInvested:"GESAMT INVESTIERT", noInvestments:"Keine Investitionen", barChart:"Einnahmen vs Ausgaben", monthly:"Monatlich", byCategory:"Nach Kategorie", noCategoryExpenses:"Keine kategorisierten Ausgaben", calendar:"Kalender", stocks:"Aktien", fiis:"Fonds", searchStock:"Aktie suchen...", searchFii:"Fonds suchen...", annualEvolution:"Jahresentwicklung", investments:"Investitionen", today:"Heute", todayExpenses:"Ausgaben heute", todayIncomes:"Einnahmen heute", daysLeft:"Verbleibende Tage", insightsTitle:"Monatseinblicke", goals:"Ziele", noGoals:"Noch keine Ziele!", addGoalValue:"+ Wert hinzufügen", liveExchange:"Live-Wechselkurs", update:"Aktualisieren", updatedAt:"Aktualisiert:", switchTo:"wechseln →", positive:"▲ Positiv", negative:"▼ Negativ", launches:"Einträge", positions:"Positionen", deposits:"Einlagen", monthGoal:"Monatsziel", define:"Festlegen", newBtn:"+ Neu", newFem:"+ Neu", noExpenses:"Keine Ausgaben", noIncomes:"Keine Einnahmen", expensesTitle:"Ausgaben", incomesTitle:"Einnahmen", days:"Tage", savingsBtn:"Ersparnisse" },
  "fr-FR": { Atualizado:"Mis à jour", balance:"Solde Mensuel", income:"Revenus", expense:"Dépenses", invested:"Investi", savings:"Épargne", savingsRate:"Taux d'épargne", categories:"Catégories", wallet:"Portefeuille", totalInvested:"TOTAL INVESTI", noInvestments:"Aucun investissement", barChart:"Revenus vs Dépenses", monthly:"Mensuel", byCategory:"Par catégorie", noCategoryExpenses:"Aucune dépense catégorisée", calendar:"Calendrier", stocks:"Actions", fiis:"Fonds", searchStock:"Chercher action...", searchFii:"Chercher fonds...", annualEvolution:"Évolution annuelle", investments:"Investissements", today:"Aujourd'hui", todayExpenses:"Dépenses aujourd'hui", todayIncomes:"Revenus aujourd'hui", daysLeft:"Jours restants", insightsTitle:"Aperçus du mois", goals:"Objectifs", noGoals:"Aucun objectif!", addGoalValue:"+ Ajouter valeur", liveExchange:"Taux en direct", update:"Actualiser", updatedAt:"Mis à jour:", switchTo:"changer →", positive:"▲ Positif", negative:"▼ Négatif", launches:"entrées", positions:"positions", deposits:"dépôts", monthGoal:"Objectif mensuel", define:"Définir", newBtn:"+ Nouveau", newFem:"+ Nouvelle", noExpenses:"Aucune dépense", noIncomes:"Aucun revenu", expensesTitle:"Dépenses", incomesTitle:"Revenus", days:"jours", savingsBtn:"Épargne" },
  "es-ES": { Atualizado:"Actualizado", balance:"Saldo Mensual", income:"Ingresos", expense:"Gastos", invested:"Invertido", savings:"Ahorros", savingsRate:"Tasa de ahorro", categories:"Categorías", wallet:"Cartera", totalInvested:"TOTAL INVERTIDO", noInvestments:"Sin inversiones", barChart:"Ingresos vs Gastos", monthly:"Mensual", byCategory:"Por categoría", noCategoryExpenses:"Sin gastos categorizados", calendar:"Calendario", stocks:"Acciones", fiis:"Fondos", searchStock:"Buscar acción...", searchFii:"Buscar fondo...", annualEvolution:"Evolución anual", investments:"Inversiones", today:"Hoy", todayExpenses:"Gastos hoy", todayIncomes:"Ingresos hoy", daysLeft:"Días restantes", insightsTitle:"Perspectivas del mes", goals:"Metas", noGoals:"Sin metas!", addGoalValue:"+ Agregar valor", liveExchange:"Tipo de cambio", update:"Actualizar", updatedAt:"Actualizado:", switchTo:"cambiar →", positive:"▲ Positivo", negative:"▼ Negativo", launches:"entradas", positions:"posiciones", deposits:"depósitos", monthGoal:"Meta mensual", define:"Definir", newBtn:"+ Nuevo", newFem:"+ Nueva", noExpenses:"Sin gastos", noIncomes:"Sin ingresos", expensesTitle:"Gastos", incomesTitle:"Ingresos", days:"días", savingsBtn:"Ahorros" },
  "it-IT": { Atualizado:"Aggiornato", balance:"Saldo Mensile", income:"Entrate", expense:"Uscite", invested:"Investito", savings:"Risparmi", savingsRate:"Tasso di risparmio", categories:"Categorie", wallet:"Portafoglio", totalInvested:"TOTALE INVESTITO", noInvestments:"Nessun investimento", barChart:"Entrate vs Uscite", monthly:"Mensile", byCategory:"Per categoria", noCategoryExpenses:"Nessuna uscita categorizzata", calendar:"Calendario", stocks:"Azioni", fiis:"Fondi", searchStock:"Cerca azione...", searchFii:"Cerca fondo...", annualEvolution:"Evoluzione annuale", investments:"Investimenti", today:"Oggi", todayExpenses:"Uscite oggi", todayIncomes:"Entrate oggi", daysLeft:"Giorni rimasti", insightsTitle:"Approfondimenti", goals:"Obiettivi", noGoals:"Nessun obiettivo!", addGoalValue:"+ Aggiungi valore", liveExchange:"Cambio in tempo reale", update:"Aggiorna", updatedAt:"Aggiornato:", switchTo:"cambia →", positive:"▲ Positivo", negative:"▼ Negativo", launches:"voci", positions:"posizioni", deposits:"depositi", monthGoal:"Obiettivo mensile", define:"Imposta", newBtn:"+ Nuovo", newFem:"+ Nuova", noExpenses:"Nessuna uscita", noIncomes:"Nessuna entrata", expensesTitle:"Uscite", incomesTitle:"Entrate", days:"giorni", savingsBtn:"Risparmi" },
  "pt-PT": { balance:"Saldo Mensal", income:"Receitas", expense:"Despesas", invested:"Investido", savings:"Poupança", savingsRate:"Taxa de poupança", categories:"Categorias", wallet:"Carteira", totalInvested:"TOTAL INVESTIDO", noInvestments:"Sem investimentos", barChart:"Receitas vs Despesas", monthly:"Mensal", byCategory:"Por categoria", noCategoryExpenses:"Sem despesas categorizadas", calendar:"Calendário", stocks:"Ações", fiis:"Fundos", searchStock:"Pesquisar ação...", searchFii:"Pesquisar fundo...", annualEvolution:"Evolução anual", investments:"Investimentos", today:"Hoje", todayExpenses:"Despesas hoje", todayIncomes:"Receitas hoje", daysLeft:"Dias restantes", insightsTitle:"Insights do mês", goals:"Metas", noGoals:"Sem metas!", addGoalValue:"+ Adicionar valor", liveExchange:"Câmbio ao vivo", update:"Atualizar", updatedAt:"Atualizado:", switchTo:"trocar →", positive:"▲ Positivo", negative:"▼ Negativo", launches:"lançamentos", positions:"posições", deposits:"depósitos", monthGoal:"Meta mensal", define:"Definir", newBtn:"+ Novo", newFem:"+ Nova", noExpenses:"Sem despesas", noIncomes:"Sem receitas", expensesTitle:"Despesas", incomesTitle:"Receitas", days:"dias", savingsBtn:"Poupança" },
};
function getTr(lang) { return TRANSLATIONS[lang] || TRANSLATIONS["pt-BR"]; }


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
const LOGO_B64 = "data:image/png;base64,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";


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

const CURRENCIES = { BRL:{ symbol:"R$" }, USD:{ symbol:"US$" }, EUR:{ symbol:"€" } };
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
  const viewMonth=now.getMonth();
  const viewYear=now.getFullYear();
  if(y>now.getFullYear()||(y===now.getFullYear()&&m>now.getMonth())) return {expenses:[],incomes:[]};
  try { return JSON.parse(localStorage.getItem(mkKey(user,y,m)))||{expenses:[],incomes:[]}; } catch { return {expenses:[],incomes:[]}; }
}
function saveMonth(user,y,m,data) { localStorage.setItem(mkKey(user,y,m),JSON.stringify(data)); }
function loadMeta(user) { try { return JSON.parse(localStorage.getItem(metaKey(user))); } catch { return null; } }
function saveMeta(user,data) { localStorage.setItem(metaKey(user),JSON.stringify(data)); }
function getCarryover(user,year,month) { return 0; } // simplified

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

  const handle=()=>{
    setError("");
    const users=loadUsers();
    if(!username.trim()||!password.trim()){setError("Preencha todos os campos.");return;}
    if(mode==="register"){
      if(password!==confirm){setError("As senhas não coincidem.");return;}
      if(users[username]){setError("Usuário já existe.");return;}
      users[username]={password,createdAt:Date.now()};
      saveUsers(users); saveSession(username); onLogin(username);
    } else {
      if(!users[username]||users[username].password!==password){setError("Usuário ou senha incorretos.");return;}
      saveSession(username); onLogin(username);
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
        {mode==="register"&&<input style={inp} placeholder="Seu nome (ex: Weslei)" value={displayName||""} onChange={e=>setDisplayName(e.target.value)}/>}
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

// ─── LAYOUT ENGINE ───────────────────────────────────────────────────────────
const SNAP = 8;
const snap = v => Math.round(v / SNAP) * SNAP;

const DEFAULT_LAYOUT_DATA = {
  sidebar: {x:0,   y:0,   w:180, h:820},
  bc:      {x:188, y:0,   w:480, h:110},
  cat:     {x:676, y:0,   w:260, h:200},
  crt:     {x:944, y:0,   w:220, h:320},
  ga:      {x:188, y:118, w:240, h:220},
  re:      {x:436, y:118, w:240, h:220},
  ac:      {x:676, y:208, w:260, h:220},
  fi:      {x:944, y:328, w:220, h:220},
  ca:      {x:188, y:346, w:360, h:220},
  ev:      {x:188, y:574, w:360, h:110},
  hj:      {x:556, y:346, w:180, h:110},
  po:      {x:944, y:220, w:220, h:100},
  inv:     {x:556, y:464, w:380, h:100},
  ins:     {x:556, y:574, w:180, h:240},
  bg:      {x:188, y:692, w:180, h:140},
  rs:      {x:376, y:456, w:172, h:358},
  tg:      {x:744, y:574, w:192, h:140},
  sc:      {x:944, y:556, w:220, h:140},
};

function DashboardLayout({ editing, layoutData, onLayoutChange, children }) {
  const ref = React.useRef(null);
  const getPos = id => ({...DEFAULT_LAYOUT_DATA[id]||{x:200,y:0,w:200,h:100}, ...(layoutData[id]||{})});

  const startDrag = (e, id) => {
    if (!editing) return;
    e.preventDefault(); e.stopPropagation();
    const t = e.touches ? e.touches[0] : e;
    const pos = getPos(id);
    const rect = ref.current.getBoundingClientRect();
    const ox = t.clientX - rect.left - pos.x;
    const oy = t.clientY - rect.top - pos.y;
    const move = e => {
      const t = e.touches ? e.touches[0] : e;
      onLayoutChange(id, {...pos, x:snap(Math.max(0,t.clientX-rect.left-ox)), y:snap(Math.max(0,t.clientY-rect.top-oy))});
    };
    const up = () => {
      document.removeEventListener("mousemove",move); document.removeEventListener("mouseup",up);
      document.removeEventListener("touchmove",move); document.removeEventListener("touchend",up);
    };
    document.addEventListener("mousemove",move); document.addEventListener("mouseup",up);
    document.addEventListener("touchmove",move,{passive:false}); document.addEventListener("touchend",up);
  };

  const startResize = (e, id) => {
    e.preventDefault(); e.stopPropagation();
    const t = e.touches ? e.touches[0] : e;
    const pos = getPos(id);
    const sx=t.clientX, sy=t.clientY;
    const move = e => {
      const t = e.touches ? e.touches[0] : e;
      onLayoutChange(id, {...pos, w:snap(Math.max(120,pos.w+t.clientX-sx)), h:snap(Math.max(60,pos.h+t.clientY-sy))});
    };
    const up = () => {
      document.removeEventListener("mousemove",move); document.removeEventListener("mouseup",up);
      document.removeEventListener("touchmove",move); document.removeEventListener("touchend",up);
    };
    document.addEventListener("mousemove",move); document.addEventListener("mouseup",up);
    document.addEventListener("touchmove",move,{passive:false}); document.addEventListener("touchend",up);
  };

  const allItems = {...DEFAULT_LAYOUT_DATA,...layoutData};
  const canvasH = Math.max(820, ...Object.values(allItems).map(p=>p.y+p.h+16));

  return (
    <div ref={ref} style={{
      position:"relative", width:"100%", height:canvasH,
      userSelect:editing?"none":"auto",
      backgroundImage: editing
        ? "linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px)"
        : "none",
      backgroundSize: editing ? "40px 40px" : "auto",
    }}>
      {React.Children.map(children, child => {
        if(!child || !child.props["data-rid"]) return null;
        const id = child.props["data-rid"];
        const pos = getPos(id);
        return (
          <div key={id} style={{
            position:"absolute", left:pos.x, top:pos.y, width:pos.w, height:pos.h,
            overflow:"hidden", boxSizing:"border-box",
            cursor:editing?"move":"default",
            outline: editing?"2px dashed #e53935":"none",
            outlineOffset:2, zIndex:editing?10:1,
          }}
            onMouseDown={e=>{if(editing&&!e.target.dataset.rh)startDrag(e,id);}}
            onTouchStart={e=>{if(editing&&!e.target.dataset.rh)startDrag(e,id);}}>
            {/* Card content fills available space */}
            <div style={{width:"100%",height:"100%",overflow:"hidden",display:"flex",flexDirection:"column"}}>
              {child}
            </div>
            {editing && <>
              <div style={{position:"absolute",top:0,left:0,background:"#e5393599",color:"#fff",fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:"8px 0 6px 0",pointerEvents:"none",zIndex:20}}>{id}</div>
              <div data-rh="1" onMouseDown={e=>{e.stopPropagation();startResize(e,id);}} onTouchStart={e=>{e.stopPropagation();startResize(e,id);}}
                style={{position:"absolute",bottom:0,right:0,width:20,height:20,cursor:"se-resize",background:"linear-gradient(135deg,transparent 50%,#e53935 50%)",borderRadius:"0 0 10px 0",zIndex:20}}/>
            </>}
          </div>
        );
      })}
    </div>
  );
}


function Dashboard({ user, displayName, onLogout }) {
  const now=new Date();
  const viewMonth=now.getMonth();
  const viewYear=now.getFullYear();
  const scrollRef=useRef(null);
  const [showScrollTop,setShowScrollTop]=useState(false);

  const [global,setGlobalState]=useState({
    categories:DEFAULT_CATEGORIES, investments:[], savings:[], goals:[],
    theme:"Dark Red", currency:"BRL", language:"pt-BR", customThemes:[]
  });
  const [monthData,setMonthData]=useState({expenses:[],incomes:[]});
  const [dbLoading,setDbLoading]=useState(true);

  useEffect(()=>{
    (async()=>{
      try {
        const g = await dbLoadGlobal(user);
        if(g) {
          setGlobalState({
            categories:g.categories||DEFAULT_CATEGORIES,
            investments:g.investments||[], savings:g.savings||[], goals:g.goals||[],
            theme:g.theme||"Dark Red", currency:g.currency||"BRL",
            language:g.language||"pt-BR", customThemes:g.customThemes||[]
          });
          if(g.savingsGoal) setSavingsGoal(g.savingsGoal);
          if(g.layoutData) setLayoutData(g.layoutData);
        }
        const md = await dbLoadMonth(user, now.getFullYear(), now.getMonth());
        if(md) setMonthData(md);
      } catch(e){ console.error(e); }
      setDbLoading(false);
    })();
  },[user]);


  const [showThemes,setShowThemes]=useState(false);
  const [showSavings,setShowSavings]=useState(false);
  const [editingLayout,setEditingLayout]=useState(false);
  const [layoutData,setLayoutData]=useState({});
  const [showSettings,setShowSettings]=useState(false);
  const [modal,setModal]=useState(null);
  const [form,setForm]=useState({});
  const [stocks,setStocks]=useState([]);
  const [fiis,setFiis]=useState([]);
  const [loadingMkt,setLoadingMkt]=useState(false);
  const [stockSearch,setStockSearch]=useState("");
  const [fiiSearch,setFiiSearch]=useState("");
  const [quickAdd,setQuickAdd]=useState(null);
  const [editItem,setEditItem]=useState(null); // {symbol, name, type, price}
  const [showExport,setShowExport]=useState(false);
  const [exportForm,setExportForm]=useState({fromYear:now.getFullYear(),fromMonth:0,toYear:now.getFullYear(),toMonth:now.getMonth()});
  // SURPRESA 1: meta de economia mensal
  const [savingsGoal,setSavingsGoal]=useState(0);
  // SURPRESA 2: busca por transação
  const [searchQuery,setSearchQuery]=useState("");

  const _ct=(global.customThemes||[]).find(c=>c.name===global.theme);
  const t=_ct?{...THEMES["Dark Red"],..._ct}:(THEMES[global.theme]||THEMES["Dark Red"]);
  const [rates,setRates]=useState({BRL:1,USD:0.18,EUR:0.17});
  const [ratesUpdatedAt,setRatesUpdatedAt]=useState(null);
  const [loadingRates,setLoadingRates]=useState(false);
  const refreshRates=async()=>{ setLoadingRates(true); try { const r=await getExchangeRates(); setRates(r); setRatesUpdatedAt(new Date()); } catch(e){} setLoadingRates(false); };
  useEffect(()=>{ refreshRates(); },[]);
  const sym=(CURRENCIES[global.currency||"BRL"]||CURRENCIES["BRL"]).symbol;
  const rate=rates[global.currency]||1;
  const tr=getTr(global.language||"pt-BR");
  const fmt=v=>{
    const converted=Number(v||0)*rate;
    return `${sym} ${converted.toLocaleString(global.language||"pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  };

  const {expenses,incomes}=monthData;
  const {categories}=global;
  const investments=monthData.investments||[];
  const totalExp=expenses.reduce((s,e)=>s+Number(e.value||0),0);
  const totalInc=incomes.reduce((s,e)=>s+Number(e.value||0),0);
  const totalInv=investments.reduce((s,e)=>s+Number(e.value||0),0);
  const carryover=0;
  const totalSavings=(global.savings||[]).reduce((s,e)=>s+Number(e.value||0),0);
  const balance=carryover+totalInc-totalExp-totalInv-totalSavings;
  const isOrigin=viewYear===now.getFullYear()&&viewMonth===now.getMonth();
  const isFuture=viewYear>now.getFullYear()||(viewYear===now.getFullYear()&&viewMonth>now.getMonth());

  // SURPRESA 3: taxa de economia
  const savingsRate=totalInc>0?((totalInc-totalExp)/totalInc*100):0;

  const isLoadingRef=useRef(false);
  useEffect(()=>{ 
    if(dbLoading||isLoadingRef.current) return;
    const t=setTimeout(()=>{ dbSaveMonth(user,viewYear,viewMonth,monthData); try{localStorage.setItem(`nm_${user}`,JSON.stringify(monthData));}catch(e){} },800); 
    return ()=>clearTimeout(t); 
  },[monthData,user,dbLoading]);
  useEffect(()=>{ 
    if(dbLoading) return;
    const t=setTimeout(()=>{ const d={...global,savingsGoal}; dbSaveGlobal(user,d); try{localStorage.setItem(`ng_${user}`,JSON.stringify(d));}catch(e){} },800); 
    return ()=>clearTimeout(t); 
  },[global,savingsGoal,user,dbLoading]);
  useEffect(()=>{
    if(dbLoading) return;
    isLoadingRef.current=true;
    (async()=>{ 
      let md=await dbLoadMonth(user,viewYear,viewMonth);
      if(!md){try{md=JSON.parse(localStorage.getItem(`nm_${user}`)||'null');}catch(e){}}
      setMonthData(md||{expenses:[],incomes:[],investments:[]}); 
      isLoadingRef.current=false;
    })();
  },[user,dbLoading]);

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
      const d=(y===viewYear&&m===viewMonth)?monthData:(monthlyCache[m]||{expenses:[],incomes:[]});
      d.expenses.forEach(e=>{ const cat=categories.find(c=>c.id===e.catId); rows.push(`Gasto,"${e.desc||""}",${e.value},"${cat?.name||""}","",${e.date},${MN[m]},${y}`); });
      d.incomes.forEach(i=>{ rows.push(`Receita,"${i.desc||""}",${i.value},"","${i.source||""}",${i.date},${MN[m]},${y}`); });
      m++; if(m>11){m=0;y++;}
    }
    investments.forEach(inv=>{ rows.push(`Investimento,"${inv.name||""}",${inv.value},"${inv.type||""}","","",Global,Global`); });
    const blob=new Blob([rows.join("\n")],{type:"text/csv;charset=utf-8;"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download=`nexus_${fromYear}_${String(fromMonth+1).padStart(2,"0")}_a_${toYear}_${String(toMonth+1).padStart(2,"0")}.csv`;
    a.click(); URL.revokeObjectURL(url); setShowExport(false);
  };


  const MONTHS_SHORT=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const [monthlyCache,setMonthlyCache]=useState({});
  useEffect(()=>{
    if(dbLoading) return;
    (async()=>{ const rows=await dbLoadAllMonths(user,viewYear); const cache={}; rows.forEach(r=>{if(r.data)cache[r.month]=r.data;}); cache[viewMonth]=monthData; setMonthlyCache({...cache}); })();
  },[viewYear,user,dbLoading,monthData]);
  const monthly=MONTHS_SHORT.map((m,i)=>{
    const d=(i===viewMonth)?monthData:(monthlyCache[i]||{expenses:[],incomes:[]});
    return {m,R:d.incomes.reduce((s,x)=>s+Number(x.value||0),0),G:d.expenses.reduce((s,x)=>s+Number(x.value||0),0)};
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

  const closeModal=()=>{setModal(null);setForm({});setEditItem(null);};
  const startEdit=(type,item)=>{ setEditItem({type,item}); setForm({...item}); setModal("edit_"+type); };
  const saveEdit=()=>{
    if(!editItem) return;
    const {type,item}=editItem;
    if(type==="expense")    updMonth(p=>({...p,expenses:p.expenses.map(e=>e.id===item.id?{...e,...form}:e)}));
    if(type==="income")     updMonth(p=>({...p,incomes:p.incomes.map(i=>i.id===item.id?{...i,...form}:i)}));
    if(type==="investment") updGlobal(p=>({...p,investments:p.investments.map(i=>i.id===item.id?{...i,...form}:i)}));
    if(type==="saving")     updGlobal(p=>({...p,savings:p.savings.map(s=>s.id===item.id?{...s,...form}:s)}));
    if(type==="category")   updGlobal(p=>({...p,categories:p.categories.map(c=>c.id===item.id?{...c,...form}:c)}));
    closeModal();
  };
  const openQuickAdd=(item, itemType)=>{ setQuickAdd({symbol:item.symbol, name:item.name, type:itemType, price:item.regularMarketPrice}); setForm({name:item.name, ticker:item.symbol, type:itemType, value:""}); };
  const confirmQuickAdd=()=>{ if(!form.value) return; addInvest(); setQuickAdd(null); };
  const updMonth=fn=>setMonthData(p=>fn(p));
  const updGlobal=fn=>setGlobalState(p=>fn(p));
  const addExpense=()=>{ if(!form.desc||!form.value)return; updMonth(p=>({...p,expenses:[...p.expenses,{...form,id:Date.now(),date:form.date||now.toISOString().slice(0,10)}]})); closeModal(); };
  const addIncome=()=>{ if(!form.desc||!form.value)return; updMonth(p=>({...p,incomes:[...p.incomes,{...form,id:Date.now(),date:form.date||now.toISOString().slice(0,10)}]})); closeModal(); };
  const addSaving=(s)=>{ if(s) updGlobal(p=>({...p,savings:[...(p.savings||[]),s]})); };
  const withdrawSaving=(id)=>{ updGlobal(p=>({...p,savings:(p.savings||[]).filter(s=>s.id!==id)})); };
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
  const delInvest=id=>updMonth(p=>({...p,investments:(p.investments||[]).filter(e=>e.id!==id)}));
  const delCat=id=>updGlobal(p=>({...p,categories:p.categories.filter(c=>c.id!==id)}));

  // SURPRESA 4: alerta de gasto excessivo
  const overBudget=savingsGoal>0&&totalExp>totalInc-savingsGoal;

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
          
        </div>
        <div style={{ display:"flex",background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:7,overflow:"hidden" }}>
          {["BRL","USD","EUR"].map(c=>(
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
        <button onClick={()=>setShowSettings(true)} style={{ ...Gb(t.textSub),padding:"5px 10px",fontSize:15,lineHeight:1 }}>⚙</button>
        <button onClick={()=>{ if(editingLayout) updGlobal(p=>({...p,layoutData})); setEditingLayout(e=>!e); }} style={{ ...Gb(editingLayout?t.green:t.accent),padding:"5px 12px",fontSize:11,fontWeight:700 }}>{editingLayout?"✅ Confirmar":"📐 Layout"}</button>
        <button onClick={()=>setShowExport(true)} style={{ ...Gb(t.accent),padding:"5px 10px" }}>{Ico.download} Exportar</button>
        <div style={{ display:"flex",alignItems:"center",gap:8,background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:8,padding:"5px 10px" }}>
          <span style={{ color:t.textSub }}>{Ico.user}</span>
          <span style={{ fontSize:12,color:t.text,fontWeight:700 }}>{displayName||(user&&user.includes("@")?user.split("@")[0]:user)}</span>
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
        <DashboardLayout editing={editingLayout} layoutData={layoutData} onLayoutChange={(id,pos)=>
          <div data-rid="sidebar" style={{ gridColumn:"1",gridRow:"1/5",display:"flex",flexDirection:"column",gap:9 }}>


            {/* KPIs */}
            {[
              { label:tr.balance,  val:balance,  color:balance>=0?t.green:t.red, sub:balance>=0?tr.positive:tr.negative, mo:null },
              { label:tr.income,      val:totalInc, color:t.green, sub:`${incomes.length} ${tr.launches}`, mo:"income" },
              { label:tr.expense,        val:totalExp, color:t.red,   sub:`${expenses.length} ${tr.launches}`, mo:"expense" },
              { label:tr.invested,     val:totalInv, color:t.accent, sub:`${investments.length} ${tr.positions}`, mo:"investment" },
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

            {/* SURPRESA 3: taxa de economia + meta */}
            <div style={{ ...card,borderLeft:`3px solid ${t.yellow}` }}>
              <div style={lbl}>{tr.savingsRate}</div>
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
                <div style={lbl}>{tr.categories}</div>
                <button onClick={()=>setModal("category")} style={{ ...Gb(t.accent),padding:"3px 7px",fontSize:10 }}>{Ico.plus}</button>
              </div>
              {/* scroll container fixo */}
              <div style={{ overflowY:"auto",flex:1,maxHeight:200,paddingRight:2 }}>
                <div style={{ display:"flex",flexDirection:"column",gap:4 }}>
                  {categories.map(cat=>{
                    const tot=expenses.filter(e=>e.catId===cat.id).reduce((s,e)=>s+Number(e.value||0),0);
                    const pct=totalExp>0?(tot/totalExp*100):0;
                    return (
                      <div key={cat.id} style={{ padding:"6px 8px",borderRadius:8,background:t.bgCard2 }}>
                        <div style={{ display:"flex",alignItems:"center",gap:7 }}>
                          <div style={{ width:6,height:6,borderRadius:"50%",background:cat.color,flexShrink:0 }}/>
                          <span style={{ fontSize:11,flex:1,color:t.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{cat.icon} {cat.name}</span>
                          <button onClick={()=>startEdit("category",cat)} style={{ background:"none",border:"none",cursor:"pointer",color:t.accent,padding:0,lineHeight:0,flexShrink:0,fontSize:12 }}>✏️</button>
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
          
          

          <div data-rid="bc" style={{ ...card,gridColumn:"2/4",gridRow:"1" }}>

            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
              <span style={{ fontWeight:700,fontSize:13 }}>{tr.barChart} — {viewYear}</span>
              <span style={lbl}>{tr.monthly}</span>
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

          <div data-rid="cat" style={{ ...card,gridColumn:"4",gridRow:"1" }}>

            <div style={{ fontWeight:700,fontSize:13,marginBottom:8 }}>{tr.byCategory}</div>
            {expByCat.length===0
              ? <div style={{ color:t.textMuted,fontSize:12,textAlign:"center",paddingTop:36 }}>Sem gastos</div>
              : <ResponsiveContainer width="100%" height={130}><PieChart><Pie data={expByCat} cx="50%" cy="50%" innerRadius={34} outerRadius={54} dataKey="value">{expByCat.map((e,i)=><Cell key={i} fill={e.color}/>)}</Pie><Tooltip {...TT} formatter={v=>fmt(v)}/></PieChart></ResponsiveContainer>
            }
          
          
          </div>

          <div data-rid="crt" style={{ ...card,gridColumn:"5",gridRow:"1/4" }}>

            <div style={{ fontWeight:700,fontSize:13,marginBottom:4 }}>{tr.wallet}</div>
            {/* {tr.totalInvested} destacado */}
            <div style={{ background:t.accentGlow,border:`1px solid ${t.accent}44`,borderRadius:9,padding:"8px 10px",marginBottom:10 }}>
              <div style={{ fontSize:9,color:t.textSub,fontWeight:700,textTransform:"uppercase",letterSpacing:0.8 }}>Total Investido</div>
              <div style={{ fontSize:18,fontWeight:900,color:t.accent,marginTop:2 }}>{fmt(totalInv)}</div>
              <div style={{ fontSize:10,color:t.textMuted,marginTop:1 }}>{investments.length} posições</div>
            </div>
            {investments.length===0
              ? <div style={{ color:t.textMuted,fontSize:12,textAlign:"center",paddingTop:20 }}>{tr.noInvestments}</div>
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
                        <button onClick={()=>startEdit("investment",inv)} style={{ background:"none",border:"none",cursor:"pointer",color:t.accent,padding:0,lineHeight:0,fontSize:12 }}>✏️</button>
                      <button onClick={()=>delInvest(inv.id)} style={{ background:"none",border:"none",cursor:"pointer",color:t.textMuted,padding:0,lineHeight:0 }}>{Ico.trash}</button>
                      </div>
                    ))}
                  </div>
                </>
            }
            <button onClick={()=>setModal("investment")} style={{ ...Gb(t.border),width:"100%",justifyContent:"center",marginTop:10,color:t.textSub }}>{Ico.plus} Novo</button>
          
          
          </div>

          <div data-rid="ga" style={{ ...card,gridColumn:"2/3",gridRow:"2" }}>

            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
              <span style={{ fontWeight:700,fontSize:13 }}>{tr.expensesTitle} — {MONTH_NAMES[viewMonth]}</span>
              {!isFuture&&<button onClick={()=>setModal("expense")} style={{ ...Cb(t.red),padding:"4px 9px" }}>{Ico.plus} Novo</button>}
            </div>
            {filteredExpenses.length===0
              ? <div style={{ color:t.textMuted,fontSize:12,textAlign:"center",padding:"16px 0" }}>{searchQuery?"Nenhum resultado":tr.noExpenses}</div>
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
                        <button onClick={()=>startEdit("expense",exp)} style={{ background:"none",border:"none",cursor:"pointer",color:t.accent,padding:0,lineHeight:0,fontSize:12 }}>✏️</button>
                        <button onClick={()=>delExpense(exp.id)} style={{ background:"none",border:"none",cursor:"pointer",color:t.textMuted,padding:0,lineHeight:0 }}>{Ico.trash}</button>
                      </div>
                    );
                  })}
                </div>
            }
          
          
          </div>

          <div data-rid="re" style={{ ...card,gridColumn:"3/4",gridRow:"2" }}>

            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
              <span style={{ fontWeight:700,fontSize:13 }}>{tr.incomesTitle} — {MONTH_NAMES[viewMonth]}</span>
              {!isFuture&&<button onClick={()=>setModal("income")} style={{ ...Cb(t.green),padding:"4px 9px" }}>{Ico.plus} Nova</button>}
            </div>
            {filteredIncomes.length===0
              ? <div style={{ color:t.textMuted,fontSize:12,textAlign:"center",padding:"16px 0" }}>{searchQuery?"Nenhum resultado":tr.noIncomes}</div>
              : <div style={{ display:"flex",flexDirection:"column",maxHeight:130,overflowY:"auto" }}>
                  {[...filteredIncomes].reverse().map(inc=>(
                    <div key={inc.id} style={{ display:"flex",alignItems:"center",gap:7,padding:"5px 0",borderBottom:`1px solid ${t.border}` }}>
                      <div style={{ width:22,height:22,borderRadius:5,background:t.green+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,flexShrink:0 }}>💵</div>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontSize:11,color:t.text,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{inc.desc}</div>
                        <div style={{ fontSize:9,color:t.textMuted }}>{inc.source||"—"} · {inc.date}</div>
                      </div>
                      <div style={{ color:t.green,fontWeight:700,fontSize:11,flexShrink:0 }}>+{fmt(inc.value)}</div>
                      <button onClick={()=>startEdit("income",inc)} style={{ background:"none",border:"none",cursor:"pointer",color:t.accent,padding:0,lineHeight:0,fontSize:12 }}>✏️</button>
                      <button onClick={()=>delIncome(inc.id)} style={{ background:"none",border:"none",cursor:"pointer",color:t.textMuted,padding:0,lineHeight:0 }}>{Ico.trash}</button>
                    </div>
                  ))}
                </div>
          
          
          </div>

          <div data-rid="ac" style={{ ...card,gridColumn:"4/5",gridRow:"2" }}>

            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
              <span style={{ fontWeight:700,fontSize:13 }}>📈 Ações B3 <span style={{ fontSize:10,color:t.textMuted,fontWeight:400 }}>({stocks.length})</span></span>
              <button onClick={fetchMarket} style={{ ...Gb(t.textSub),fontSize:10 }}>{Ico.refresh}{loadingMkt?"...":tr.update}</button>
            </div>
            <input placeholder={tr.searchStock} value={stockSearch} onChange={e=>setStockSearch(e.target.value)}
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

          <div data-rid="fi" style={{ ...card,gridColumn:"5",gridRow:"3" }}>

            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
              <span style={{ fontWeight:700,fontSize:13 }}>🏢 FIIs <span style={{ fontSize:10,color:t.textMuted,fontWeight:400 }}>({fiis.length})</span></span>
            </div>
            <input placeholder={tr.searchFii} value={fiiSearch} onChange={e=>setFiiSearch(e.target.value)}
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

          <div data-rid="ca" style={{ ...card,gridColumn:"2/4",gridRow:"3" }}>

            <FinancialCalendar
              viewYear={viewYear} viewMonth={viewMonth}
              expenses={expenses} incomes={incomes}
              now={now} t={t} MONTH_NAMES={MONTH_NAMES} tr={tr}
            
              categories={categories}
            />
          
          
          </div>

          <div data-rid="po" style={{ background:t.yellow,borderRadius:12,padding:"13px 15px",display:"flex",flexDirection:"column",gap:6,cursor:"pointer" }} onClick={()=>setShowSavings(true)}>
            <div style={{fontWeight:800,fontSize:13,color:"#000"}}>🏦 Poupança</div>
            <div style={{fontSize:20,fontWeight:900,color:"#000"}}>{fmt(totalSavings)}</div>
            <div style={{fontSize:10,color:"#00000088"}}>{(global.savings||[]).length} depósitos</div>
            <div style={{fontSize:10,color:"#000",background:"#00000015",borderRadius:6,padding:"3px 8px",textAlign:"center"}}>Toque para gerenciar</div>
          </div>

          <div data-rid="inv" style={{ ...card,gridColumn:"4/5",gridRow:"3" }}>

            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9 }}>
              <span style={{ fontWeight:700,fontSize:13 }}>{tr.investments}</span>
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
                      <button onClick={()=>startEdit("investment",inv)} style={{ background:"none",border:"none",cursor:"pointer",color:t.accent,padding:0,lineHeight:0,fontSize:12 }}>✏️</button>
                      <button onClick={()=>delInvest(inv.id)} style={{ background:"none",border:"none",cursor:"pointer",color:t.textMuted,padding:0,lineHeight:0 }}>{Ico.trash}</button>
                    </div>
                  ))}
                </div>
            }
          
          
          </div>

          <div data-rid="ev" style={{ ...card,gridColumn:"2/4",gridRow:"4" }}>

            <div style={{ fontWeight:700,fontSize:13,marginBottom:8 }}>{tr.annualEvolution} — {viewYear}</div>
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

          <div data-rid="hj" style={{ ...card,gridColumn:"4",gridRow:"4" }}>

            <div style={{fontWeight:700,fontSize:13,color:t.yellow}}>📅 Hoje</div>
            <div style={{fontSize:11,color:t.textSub}}>{now.toLocaleDateString(global.language||"pt-BR",{weekday:"long",day:"numeric",month:"long"})}</div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11}}><span style={{color:t.textSub}}>Gastos hoje</span><span style={{color:t.red,fontWeight:700}}>-{fmt(expenses.filter(e=>e.date===now.toISOString().slice(0,10)).reduce((s,e)=>s+Number(e.value||0),0)*rate)}</span></div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11}}><span style={{color:t.textSub}}>Receitas hoje</span><span style={{color:t.green,fontWeight:700}}>+{fmt(incomes.filter(e=>e.date===now.toISOString().slice(0,10)).reduce((s,e)=>s+Number(e.value||0),0)*rate)}</span></div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11}}><span style={{color:t.textSub}}>Dias restantes</span><span style={{color:t.yellow,fontWeight:700}}>{new Date(now.getFullYear(),now.getMonth()+1,0).getDate()-now.getDate()}d</span></div>
          
          
          </div>

          <div data-rid="ins" style={{ ...card,gridColumn:"5",gridRow:"4/6" }}>

            <InsightsCard expenses={expenses} incomes={incomes} investments={investments} categories={categories} monthData={monthData} viewMonth={viewMonth} viewYear={viewYear} now={now} t={t} fmt={fmt} MONTH_NAMES={MONTH_NAMES} monthlyCache={monthlyCache} card={{background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:12,padding:"13px 15px"}} tr={tr}/>
          
          
          </div>

          <div data-rid="bg" style={{ ...card,gridColumn:"2",gridRow:"5" }}>

            <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>📋 Budget Planner</div>
            <div style={{display:"flex",flexDirection:"column",gap:5,overflowY:"auto",flex:1,minHeight:0}}>
              {(categories||[]).slice(0,6).map(cat=>{const spent=expenses.filter(e=>e.catId===cat.id).reduce((s,e)=>s+Number(e.value||0),0)*rate;const limit=totalInc>0?totalInc*rate*0.25:1000;const pct=Math.min((spent/limit)*100,100);return(<div key={cat.id}><div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:2}}><span style={{color:t.text}}>{cat.icon} {cat.name}</span><span style={{color:pct>=100?t.red:t.accent,fontWeight:600}}>{fmt(spent)}</span></div><div style={{background:t.bgCard2,borderRadius:3,height:5,overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",background:pct>=100?t.red:t.green,borderRadius:3}}/></div></div>);})}
            </div>
          </div>
          
          
          </div>

          <div data-rid="rs" style={{ ...card,gridColumn:"3",gridRow:"5" }}>

            <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>📊 Resumo</div>
            {[{l:"Receitas",v:totalInc*rate,c:t.green,i:"⬆️"},{l:"Gastos",v:totalExp*rate,c:t.red,i:"⬇️"},{l:"Investido",v:totalInv*rate,c:t.accent,i:"📈"},{l:"Poupança",v:totalSavings*rate,c:t.yellow,i:"🏦"},{l:"Saldo",v:balance*rate,c:balance>=0?t.green:t.red,i:"💰"}].map((item,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:`1px solid ${t.border}`}}>
                <span style={{fontSize:11,color:t.textSub}}>{item.i} {item.l}</span>
                <span style={{fontSize:12,color:item.c,fontWeight:700}}>{fmt(item.v)}</span>
              </div>
            ))}
          
          
          </div>

          <div data-rid="tg" style={{ ...card,gridColumn:"4",gridRow:"5" }}>

            <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>🏆 Top Gastos</div>
            <div style={{display:"flex",flexDirection:"column",gap:3,overflowY:"auto",flex:1,minHeight:0}}>
              {[...expenses].sort((a,b)=>Number(b.value)-Number(a.value)).slice(0,7).map((exp,i)=>(
                <div key={exp.id||i} style={{display:"flex",alignItems:"center",gap:5,padding:"3px 0",borderBottom:`1px solid ${t.border}`}}>
                  <span style={{fontSize:9,color:t.textMuted,width:14}}>#{i+1}</span>
                  <span style={{fontSize:10,flex:1,color:t.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{exp.desc}</span>
                  <span style={{fontSize:10,color:t.red,fontWeight:700}}>{fmt(Number(exp.value))}</span>
                </div>
              ))}
              {!expenses.length&&<div style={{color:t.textMuted,fontSize:11,textAlign:"center",paddingTop:16}}>Sem gastos</div>}
            </div>
          
          
          </div>

          <div data-rid="sc" style={{ ...card,gridColumn:"5",gridRow:"5",alignItems:"center",justifyContent:"center" }}>
            {(()=>{
              const sav=totalInc>0?(totalInc-totalExp)/totalInc*100:0;
              const inv=totalInc>0?totalInv/totalInc*100:0;
              const score=Math.min(100,Math.round(Math.max(0,sav)*0.5+inv*0.3+(expenses.length?20:0)));
              const col=score>=70?t.green:score>=40?t.yellow:t.red;
              return (
                <>
                  <div style={{fontWeight:700,fontSize:12,marginBottom:6}}>⭐ Score</div>
                  <div style={{fontSize:44,fontWeight:900,color:col,lineHeight:1}}>{score}</div>
                  <div style={{fontSize:11,color:col,fontWeight:700,marginTop:4}}>{score>=70?"Excelente!":score>=40?"Bom":"Atenção"}</div>
                  <div style={{width:"100%",background:t.bgCard2,borderRadius:6,height:8,overflow:"hidden",marginTop:8}}>
                    <div style={{width:`${score}%`,height:"100%",background:col,borderRadius:6}}/>
                  </div>
                  <div style={{fontSize:9,color:t.textMuted,textAlign:"center",marginTop:4}}>Eco:{sav.toFixed(0)}% Inv:{inv.toFixed(0)}%</div>
                </>
              );
            })()}
          </div>

        </DashboardLayout>

      </div>

      {showSettings&&<SettingsModal open={showSettings} onClose={()=>setShowSettings(false)} global={global} updGlobal={updGlobal} t={t}/>}
      {showSavings&&<SavingsModal open={showSavings} onClose={()=>setShowSavings(false)} savings={global.savings||[]} onAdd={addSaving} onWithdraw={withdrawSaving} onEdit={(s)=>startEdit("saving",s)} t={t} fmt={fmt}/>}
      <Modal open={modal==="goal_new"} onClose={closeModal} title="Nova Meta" t={t}>
        <input style={inp} placeholder="Nome *" value={form.name||""} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/>
        <div style={{display:"flex",gap:10}}><input style={{...inp,flex:1}} placeholder="Emoji" value={form.icon||""} onChange={e=>setForm(p=>({...p,icon:e.target.value}))}/><input style={{...inp,flex:2}} type="number" placeholder="Valor alvo *" value={form.target||""} onChange={e=>setForm(p=>({...p,target:e.target.value}))}/></div>
        <button onClick={()=>{if(!form.name||!form.target)return;updGlobal(p=>({...p,goals:[...(p.goals||[]),{id:Date.now(),name:form.name,icon:form.icon||"🎯",target:Number(form.target),current:0}]}));closeModal();}} style={{...Cb(t.accent),width:"100%",justifyContent:"center",padding:"11px",marginTop:4}}>🎯 Criar Meta</button>
      </Modal>
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

      {/* EDIT MODALS */}
      <Modal open={modal==="edit_expense"} onClose={closeModal} title="Editar Gasto" t={t}>
        <input style={inp} placeholder="Descrição" value={form.desc||""} onChange={e=>setForm(p=>({...p,desc:e.target.value}))}/>
        <input style={inp} type="number" placeholder="Valor" value={form.value||""} onChange={e=>setForm(p=>({...p,value:e.target.value}))}/>
        <input style={inp} type="date" value={form.date||""} onChange={e=>setForm(p=>({...p,date:e.target.value}))}/>
        <select style={{...inp}} value={form.catId||""} onChange={e=>setForm(p=>({...p,catId:Number(e.target.value)}))}>
          <option value="">Categoria</option>
          {categories.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
        <button onClick={saveEdit} style={{...Cb(t.red),width:"100%",justifyContent:"center",padding:"11px"}}>Salvar</button>
      </Modal>
      <Modal open={modal==="edit_income"} onClose={closeModal} title="Editar Receita" t={t}>
        <input style={inp} placeholder="Descrição" value={form.desc||""} onChange={e=>setForm(p=>({...p,desc:e.target.value}))}/>
        <input style={inp} type="number" placeholder="Valor" value={form.value||""} onChange={e=>setForm(p=>({...p,value:e.target.value}))}/>
        <input style={inp} type="date" value={form.date||""} onChange={e=>setForm(p=>({...p,date:e.target.value}))}/>
        <input style={inp} placeholder="Fonte" value={form.source||""} onChange={e=>setForm(p=>({...p,source:e.target.value}))}/>
        <button onClick={saveEdit} style={{...Cb(t.green),width:"100%",justifyContent:"center",padding:"11px"}}>Salvar</button>
      </Modal>
      <Modal open={modal==="edit_investment"} onClose={closeModal} title="Editar Investimento" t={t}>
        <input style={inp} placeholder="Nome" value={form.name||""} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/>
        <input style={inp} placeholder="Ticker" value={form.ticker||""} onChange={e=>setForm(p=>({...p,ticker:e.target.value}))}/>
        <input style={inp} type="number" placeholder="Valor" value={form.value||""} onChange={e=>setForm(p=>({...p,value:e.target.value}))}/>
        <input style={inp} placeholder="Tipo (Ação, FII...)" value={form.type||""} onChange={e=>setForm(p=>({...p,type:e.target.value}))}/>
        <button onClick={saveEdit} style={{...Cb(t.accent),width:"100%",justifyContent:"center",padding:"11px"}}>Salvar</button>
      </Modal>
      <Modal open={modal==="edit_saving"} onClose={closeModal} title="Editar Poupança" t={t}>
        <input style={inp} placeholder="Descrição" value={form.desc||""} onChange={e=>setForm(p=>({...p,desc:e.target.value}))}/>
        <input style={inp} type="number" placeholder="Valor" value={form.value||""} onChange={e=>setForm(p=>({...p,value:e.target.value}))}/>
        <button onClick={saveEdit} style={{...Cb(t.yellow,"#000"),width:"100%",justifyContent:"center",padding:"11px"}}>Salvar</button>
      </Modal>
      <Modal open={modal==="edit_category"} onClose={closeModal} title="Editar Categoria" t={t}>
        <input style={inp} placeholder="Nome" value={form.name||""} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/>
        <div style={{display:"flex",gap:10}}>
          <input style={{...inp,flex:1}} placeholder="Emoji" value={form.icon||""} onChange={e=>setForm(p=>({...p,icon:e.target.value}))}/>
          <input type="color" value={form.color||"#888"} onChange={e=>setForm(p=>({...p,color:e.target.value}))} style={{width:40,height:40,borderRadius:8,border:"none",cursor:"pointer"}}/>
        </div>
        <button onClick={saveEdit} style={{...Cb(t.accent),width:"100%",justifyContent:"center",padding:"11px"}}>Salvar</button>
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

      {showSettings&&<SettingsModal open={showSettings} onClose={()=>setShowSettings(false)} global={global} updGlobal={updGlobal} t={t}/>}
      {showSavings&&<SavingsModal open={showSavings} onClose={()=>setShowSavings(false)} savings={global.savings||[]} onAdd={addSaving} onWithdraw={withdrawSaving} onEdit={(s)=>startEdit("saving",s)} t={t} fmt={fmt}/>}
      <Modal open={modal==="goal_new"} onClose={closeModal} title="Nova Meta" t={t}>
        <input style={inp} placeholder="Nome *" value={form.name||""} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/>
        <div style={{display:"flex",gap:10}}><input style={{...inp,flex:1}} placeholder="Emoji" value={form.icon||""} onChange={e=>setForm(p=>({...p,icon:e.target.value}))}/><input style={{...inp,flex:2}} type="number" placeholder="Valor alvo *" value={form.target||""} onChange={e=>setForm(p=>({...p,target:e.target.value}))}/></div>
        <button onClick={()=>{if(!form.name||!form.target)return;updGlobal(p=>({...p,goals:[...(p.goals||[]),{id:Date.now(),name:form.name,icon:form.icon||"🎯",target:Number(form.target),current:0}]}));closeModal();}} style={{...Cb(t.accent),width:"100%",justifyContent:"center",padding:"11px",marginTop:4}}>🎯 Criar Meta</button>
      </Modal>
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

      {/* EDIT MODALS */}
      <Modal open={modal==="edit_expense"} onClose={closeModal} title="Editar Gasto" t={t}>
        <input style={inp} placeholder="Descrição" value={form.desc||""} onChange={e=>setForm(p=>({...p,desc:e.target.value}))}/>
        <input style={inp} type="number" placeholder="Valor" value={form.value||""} onChange={e=>setForm(p=>({...p,value:e.target.value}))}/>
        <input style={inp} type="date" value={form.date||""} onChange={e=>setForm(p=>({...p,date:e.target.value}))}/>
        <select style={{...inp}} value={form.catId||""} onChange={e=>setForm(p=>({...p,catId:Number(e.target.value)}))}>
          <option value="">Categoria</option>
          {categories.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
        <button onClick={saveEdit} style={{...Cb(t.red),width:"100%",justifyContent:"center",padding:"11px"}}>Salvar</button>
      </Modal>
      <Modal open={modal==="edit_income"} onClose={closeModal} title="Editar Receita" t={t}>
        <input style={inp} placeholder="Descrição" value={form.desc||""} onChange={e=>setForm(p=>({...p,desc:e.target.value}))}/>
        <input style={inp} type="number" placeholder="Valor" value={form.value||""} onChange={e=>setForm(p=>({...p,value:e.target.value}))}/>
        <input style={inp} type="date" value={form.date||""} onChange={e=>setForm(p=>({...p,date:e.target.value}))}/>
        <input style={inp} placeholder="Fonte" value={form.source||""} onChange={e=>setForm(p=>({...p,source:e.target.value}))}/>
        <button onClick={saveEdit} style={{...Cb(t.green),width:"100%",justifyContent:"center",padding:"11px"}}>Salvar</button>
      </Modal>
      <Modal open={modal==="edit_investment"} onClose={closeModal} title="Editar Investimento" t={t}>
        <input style={inp} placeholder="Nome" value={form.name||""} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/>
        <input style={inp} placeholder="Ticker" value={form.ticker||""} onChange={e=>setForm(p=>({...p,ticker:e.target.value}))}/>
        <input style={inp} type="number" placeholder="Valor" value={form.value||""} onChange={e=>setForm(p=>({...p,value:e.target.value}))}/>
        <input style={inp} placeholder="Tipo (Ação, FII...)" value={form.type||""} onChange={e=>setForm(p=>({...p,type:e.target.value}))}/>
        <button onClick={saveEdit} style={{...Cb(t.accent),width:"100%",justifyContent:"center",padding:"11px"}}>Salvar</button>
      </Modal>
      <Modal open={modal==="edit_saving"} onClose={closeModal} title="Editar Poupança" t={t}>
        <input style={inp} placeholder="Descrição" value={form.desc||""} onChange={e=>setForm(p=>({...p,desc:e.target.value}))}/>
        <input style={inp} type="number" placeholder="Valor" value={form.value||""} onChange={e=>setForm(p=>({...p,value:e.target.value}))}/>
        <button onClick={saveEdit} style={{...Cb(t.yellow,"#000"),width:"100%",justifyContent:"center",padding:"11px"}}>Salvar</button>
      </Modal>
      <Modal open={modal==="edit_category"} onClose={closeModal} title="Editar Categoria" t={t}>
        <input style={inp} placeholder="Nome" value={form.name||""} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/>
        <div style={{display:"flex",gap:10}}>
          <input style={{...inp,flex:1}} placeholder="Emoji" value={form.icon||""} onChange={e=>setForm(p=>({...p,icon:e.target.value}))}/>
          <input type="color" value={form.color||"#888"} onChange={e=>setForm(p=>({...p,color:e.target.value}))} style={{width:40,height:40,borderRadius:8,border:"none",cursor:"pointer"}}/>
        </div>
        <button onClick={saveEdit} style={{...Cb(t.accent),width:"100%",justifyContent:"center",padding:"11px"}}>Salvar</button>
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
function FinancialCalendar({ viewYear, viewMonth, expenses, incomes, now, t, MONTH_NAMES, tr={, categories=[] }) {
  const card = { background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:12, padding:"13px 15px", overflow:"hidden" };
  if(!tr) tr = { calendar:"Calendário", income:"Receita", expense:"Gasto", today:"Hoje" };
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
        {`📅 ${tr.calendar||"Calendário"} — ${MONTH_NAMES[viewMonth]}`} {viewYear}
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
          const tip = ev ? [...(ev.incList.map(n=>"+ "+n)), ...(ev.expList.map(n=>"- "+n))].join("\n") : "";
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

// ─── SETTINGS MODAL ───────────────────────────────────────────────────────────
const LANGUAGES = [
  // Países que usam Real
  { code:"pt-BR", label:"Português (Brasil)", flag:"🇧🇷", currency:"BRL" },
  // Países que usam Dólar
  { code:"en-US", label:"English (United States)", flag:"🇺🇸", currency:"USD" },
  { code:"en-AU", label:"English (Australia)", flag:"🇦🇺", currency:"USD" },
  { code:"en-CA", label:"English (Canada)", flag:"🇨🇦", currency:"USD" },
  { code:"en-NZ", label:"English (New Zealand)", flag:"🇳🇿", currency:"USD" },
  { code:"es-EC", label:"Español (Ecuador)", flag:"🇪🇨", currency:"USD" },
  { code:"es-PA", label:"Español (Panamá)", flag:"🇵🇦", currency:"USD" },
  { code:"es-SV", label:"Español (El Salvador)", flag:"🇸🇻", currency:"USD" },
  // Países que usam Euro
  { code:"de-DE", label:"Deutsch (Deutschland)", flag:"🇩🇪", currency:"EUR" },
  { code:"fr-FR", label:"Français (France)", flag:"🇫🇷", currency:"EUR" },
  { code:"es-ES", label:"Español (España)", flag:"🇪🇸", currency:"EUR" },
  { code:"it-IT", label:"Italiano (Italia)", flag:"🇮🇹", currency:"EUR" },
  { code:"pt-PT", label:"Português (Portugal)", flag:"🇵🇹", currency:"EUR" },
  { code:"nl-NL", label:"Nederlands (Nederland)", flag:"🇳🇱", currency:"EUR" },
  { code:"el-GR", label:"Ελληνικά (Ελλάδα)", flag:"🇬🇷", currency:"EUR" },
  { code:"fi-FI", label:"Suomi (Suomi)", flag:"🇫🇮", currency:"EUR" },
  { code:"sv-SE", label:"Svenska (Sverige)", flag:"🇸🇪", currency:"EUR" },
];

const PRESET_COLORS = ["#e53935","#1e88e5","#43a047","#fb8c00","#8e24aa","#00acc1","#f06292","#26a69a","#ffb300","#546e7a"];

function SettingsModal({ open, onClose, global: g, updGlobal, t }) {
  const [tab, setTab] = useState("language");
  const [pendingLang, setPendingLang] = useState(g.language||"pt-BR");
  const [customName, setCustomName] = useState("");
  const [customAccent, setCustomAccent] = useState("#e53935");
  const [customBg, setCustomBg] = useState("#0d0d0d");
  const [customCard, setCustomCard] = useState("#161616");
  const [customText, setCustomText] = useState("#ffffff");
  const [customGreen, setCustomGreen] = useState("#4caf50");
  const [customRed, setCustomRed] = useState("#f44336");
  const [customYellow, setCustomYellow] = useState("#ffb300");
  const [customBorder, setCustomBorder] = useState("#333333");

  if (!open) return null;

  const tabStyle = (active) => ({
    flex:1, padding:"8px", border:"none", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:700,
    background: active ? t.accent : t.bgCard2, color: active ? "#fff" : t.textSub, transition:"all 0.2s"
  });

  const inp = { background:t.bg, border:`1px solid ${t.border}`, borderRadius:8, color:t.text, padding:"8px 12px", width:"100%", fontSize:12, outline:"none", boxSizing:"border-box", fontFamily:"inherit" };

  const saveCustomTheme = () => {
    if (!customName.trim()) return;
    // Build a complete theme object matching the THEMES structure exactly
    const hex2 = (h,op) => {
      const r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);
      return `rgba(${r},${g},${b},${op})`;
    };
    const newTheme = {
      name:       customName.trim(),
      bg:         customBg,
      bgCard:     customCard,
      bgCard2:    customCard + "dd",
      text:       customText,
      textSub:    customText + "bb",
      textMuted:  customText + "77",
      border:     customBorder,
      accent:     customAccent,
      accentGlow: customAccent + "55",
      green:      customGreen,
      red:        customRed,
      yellow:     customYellow,
      chart:      [customAccent, customGreen, "#2196f3", customYellow, "#9c27b0", "#00bcd4", customRed, "#607d8b"],
    };
    updGlobal(p => ({
      ...p,
      customThemes: [...(p.customThemes||[]).filter(ct=>ct.name!==newTheme.name), newTheme],
      theme: newTheme.name
    }));
    setCustomName("");
  };

  return (
    <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(8px)" }}>
      <div className="fade-in" onClick={e=>e.stopPropagation()} style={{ background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:18,padding:24,width:420,maxHeight:"85vh",display:"flex",flexDirection:"column",boxShadow:`0 0 80px ${t.accentGlow}` }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
          <span style={{ fontWeight:800,fontSize:16,color:t.text }}>⚙ Configurações</span>
          <button onClick={onClose} style={{ background:"none",border:"none",color:t.textMuted,cursor:"pointer",fontSize:18 }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex",gap:6,marginBottom:16 }}>
          <button style={tabStyle(tab==="language")} onClick={()=>setTab("language")}>🌍 Idioma</button>
          <button style={tabStyle(tab==="theme")} onClick={()=>setTab("theme")}>🎨 Tema</button>
        </div>

        {/* Language tab */}
        {tab==="language" && (
          <div style={{ overflowY:"auto",flex:1,display:"flex",flexDirection:"column",gap:6 }}>
            <div style={{ fontSize:11,color:t.textMuted,marginBottom:4 }}>Selecione seu idioma — a moeda será ajustada automaticamente</div>
            {LANGUAGES.map(lang=>(
              <div key={lang.code} onClick={()=>setPendingLang(lang.code)}
                style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,cursor:"pointer",
                  background: pendingLang===lang.code ? t.accent+"22" : t.bgCard2,
                  border: `1px solid ${pendingLang===lang.code ? t.accent : t.border}`,
                  transition:"all 0.15s" }}>
                <span style={{ fontSize:20 }}>{lang.flag}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12,color:t.text,fontWeight:600 }}>{lang.label}</div>
                  <div style={{ fontSize:10,color:t.textMuted }}>Moeda: {lang.currency}</div>
                </div>
                {pendingLang===lang.code && <span style={{ color:t.accent,fontSize:14 }}>✓</span>}
              </div>
            ))}
            {/* Confirm button */}
            <div style={{ position:"sticky",bottom:0,paddingTop:10,background:t.bgCard }}>
              <button onClick={()=>{
                const lang = LANGUAGES.find(l=>l.code===pendingLang);
                updGlobal(p=>({...p, language:pendingLang, currency:lang?.currency||p.currency}));
                onClose();
              }} style={{ background:t.accent,border:"none",borderRadius:10,color:"#fff",padding:"12px",width:"100%",fontSize:13,fontWeight:800,cursor:"pointer",boxShadow:`0 4px 16px ${t.accentGlow}` }}>
                ✅ Confirmar Idioma
              </button>
            </div>
          </div>
        )}

        {/* Theme tab */}
        {tab==="theme" && (
          <div style={{ overflowY:"auto",flex:1 }}>
            <div style={{ fontSize:11,color:t.textMuted,marginBottom:12 }}>Crie um tema personalizado</div>
            <input style={{...inp,marginBottom:10}} placeholder="Nome do tema *" value={customName} onChange={e=>setCustomName(e.target.value)}/>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12 }}>
              {[
                { label:"Cor principal", val:customAccent, set:setCustomAccent },
                { label:"Fundo da página", val:customBg, set:setCustomBg },
                { label:"Fundo dos cards", val:customCard, set:setCustomCard },
                { label:"Cor do texto", val:customText, set:setCustomText },
                { label:"Cor de receita (verde)", val:customGreen, set:setCustomGreen },
                { label:"Cor de gasto (vermelho)", val:customRed, set:setCustomRed },
                { label:"Cor de alerta (amarelo)", val:customYellow, set:setCustomYellow },
                { label:"Cor das bordas", val:customBorder, set:setCustomBorder },
              ].map(f=>(
                <div key={f.label}>
                  <div style={{ fontSize:10,color:t.textMuted,marginBottom:4 }}>{f.label}</div>
                  <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                    <input type="color" value={f.val} onChange={e=>f.set(e.target.value)}
                      style={{ width:36,height:36,borderRadius:8,border:"none",cursor:"pointer",background:"none" }}/>
                    <input style={{...inp,marginBottom:0,flex:1,padding:"6px 8px",fontSize:11}} value={f.val} onChange={e=>f.set(e.target.value)}/>
                  </div>
                </div>
              ))}
            </div>
            {/* Preview */}
            <div style={{ background:customBg,borderRadius:10,padding:12,marginBottom:12,border:`1px solid ${customBorder}` }}>
              <div style={{ color:customText,fontWeight:700,fontSize:12,marginBottom:8 }}>Preview do Tema</div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:6 }}>
                <div style={{ background:customCard,borderRadius:8,padding:8,border:`1px solid ${customBorder}` }}>
                  <div style={{ color:customText+"88",fontSize:9 }}>SALDO</div>
                  <div style={{ color:customAccent,fontSize:13,fontWeight:800 }}>R$ 5.000</div>
                </div>
                <div style={{ background:customCard,borderRadius:8,padding:8,border:`1px solid ${customBorder}` }}>
                  <div style={{ color:customText+"88",fontSize:9 }}>RECEITAS</div>
                  <div style={{ color:customGreen,fontSize:13,fontWeight:800 }}>R$ 6.000</div>
                </div>
                <div style={{ background:customCard,borderRadius:8,padding:8,border:`1px solid ${customBorder}` }}>
                  <div style={{ color:customText+"88",fontSize:9 }}>GASTOS</div>
                  <div style={{ color:customRed,fontSize:13,fontWeight:800 }}>R$ 1.000</div>
                </div>
                <div style={{ background:customCard,borderRadius:8,padding:8,border:`1px solid ${customBorder}` }}>
                  <div style={{ color:customText+"88",fontSize:9 }}>ALERTA</div>
                  <div style={{ color:customYellow,fontSize:13,fontWeight:800 }}>84.7%</div>
                </div>
              </div>
              <div style={{ marginTop:8,height:5,borderRadius:4,background:customBorder,overflow:"hidden" }}>
                <div style={{ width:"70%",height:"100%",background:customAccent,borderRadius:4 }}/>
              </div>
            </div>
            <button onClick={saveCustomTheme} style={{ background:customAccent,border:"none",borderRadius:10,color:"#fff",padding:"11px",width:"100%",fontSize:13,fontWeight:800,cursor:"pointer" }}>
              ✨ Criar Tema
            </button>
            {/* Custom themes list */}
            {(g.customThemes||[]).length > 0 && (
              <div style={{ marginTop:14 }}>
                <div style={{ fontSize:10,color:t.textMuted,marginBottom:8 }}>Seus temas</div>
                <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                  {(g.customThemes||[]).map(ct=>(
                    <div key={ct.name} style={{ display:"flex",alignItems:"center",gap:6 }}>
                      <div onClick={()=>updGlobal(p=>({...p,theme:ct.name}))}
                        style={{ flex:1,padding:"6px 12px",borderRadius:20,cursor:"pointer",fontSize:11,fontWeight:700,textAlign:"center",
                          background:ct.accent,color:"#fff",border:`2px solid ${g.theme===ct.name?"#fff":ct.accent}` }}>
                        {g.theme===ct.name?"✓ ":""}{ct.name}
                      </div>
                      <button onClick={()=>updGlobal(p=>({
                        ...p,
                        customThemes:(p.customThemes||[]).filter(x=>x.name!==ct.name),
                        theme:p.theme===ct.name?"Dark Red":p.theme
                      }))} style={{ background:"#f4433622",border:"1px solid #f4433666",borderRadius:8,color:"#f44336",cursor:"pointer",padding:"5px 8px",fontSize:13,lineHeight:1 }}>🗑</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── INSIGHTS CARD ───────────────────────────────────────────────────────────
function InsightsCard({ expenses, incomes, investments, categories, monthData, viewMonth, viewYear, now, t, fmt, MONTH_NAMES, monthlyCache, card, tr={} }) {
  const totalExp = expenses.reduce((s,e)=>s+Number(e.value||0),0);
  const totalInc = incomes.reduce((s,e)=>s+Number(e.value||0),0);
  const totalInv = investments.reduce((s,e)=>s+Number(e.value||0),0);
  const daysInMonth = new Date(viewYear, viewMonth+1, 0).getDate();
  const today = now.getDate();
  const daysLeft = daysInMonth - today;
  const isCurrentMonth = viewYear===now.getFullYear() && viewMonth===now.getMonth();

  // Generate insights
  const insights = [];

  // 1. Saldo insight
  const balance = totalInc - totalExp;
  if(totalInc > 0) {
    const rate = ((totalInc - totalExp) / totalInc * 100);
    if(rate >= 30) insights.push({ icon:"🏆", color:t.green, text:`Taxa de economia de ${rate.toFixed(0)}% — excelente!` });
    else if(rate >= 0) insights.push({ icon:"👍", color:t.yellow, text:`Você está poupando ${rate.toFixed(0)}% da sua renda este mês.` });
    else insights.push({ icon:"⚠️", color:t.red, text:`Gastos ${Math.abs(rate).toFixed(0)}% acima da renda! Atenção.` });
  }

  // 2. Projeção do mês
  if(isCurrentMonth && today > 0 && totalExp > 0) {
    const dailyExp = totalExp / today;
    const projectedExp = dailyExp * daysInMonth;
    insights.push({ icon:"📊", color:t.accent, text:`Projeção de gastos: ${fmt(projectedExp)} até o fim do mês.` });
  }

  // 3. Maior categoria de gasto
  if(expenses.length > 0 && categories.length > 0) {
    const byCat = categories.map(c=>({
      name:c.name, icon:c.icon,
      total:expenses.filter(e=>e.catId===c.id).reduce((s,e)=>s+Number(e.value||0),0)
    })).filter(c=>c.total>0).sort((a,b)=>b.total-a.total);
    if(byCat[0]) insights.push({ icon:byCat[0].icon, color:t.red, text:`Maior gasto: ${byCat[0].name} com ${fmt(byCat[0].total)}.` });
  }

  // 4. Dias restantes e ritmo
  if(isCurrentMonth && daysLeft > 0 && totalInc > 0) {
    const remaining = totalInc - totalExp;
    if(remaining > 0) {
      const perDay = remaining / daysLeft;
      insights.push({ icon:"💰", color:t.green, text:`Você pode gastar ${fmt(perDay)}/dia e fechar o mês no positivo.` });
    }
  }

  // 5. Investimentos
  if(totalInv > 0 && totalInc > 0) {
    const invRate = (totalInv/totalInc*100).toFixed(0);
    insights.push({ icon:"📈", color:t.accent, text:`${invRate}% da sua renda está investida. ${Number(invRate)>=10?"Ótimo!":"Tente chegar a 10%."}` });
  }

  // 6. Comparação com mês anterior
  const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
  const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
  const prevData = monthlyCache[prevMonth] || {expenses:[],incomes:[]};
  const prevExp = (prevData.expenses||[]).reduce((s,e)=>s+Number(e.value||0),0);
  if(prevExp > 0 && totalExp > 0) {
    const diff = ((totalExp - prevExp) / prevExp * 100);
    if(Math.abs(diff) > 5) {
      insights.push({
        icon: diff > 0 ? "📉" : "✅",
        color: diff > 0 ? t.red : t.green,
        text: `Gastos ${diff>0?"aumentaram":"diminuíram"} ${Math.abs(diff).toFixed(0)}% vs ${MONTH_NAMES[prevMonth]}.`
      });
    }
  }

  // 7. Sem dados ainda
  if(insights.length === 0) {
    insights.push({ icon:"💡", color:t.textSub, text:"Adicione receitas e gastos para ver insights personalizados aqui." });
  }

  return (
    <div style={{ ...card, gridColumn:"4/5", gridRow:"5", display:"flex", flexDirection:"column", gap:0 }}>
      <div style={{ fontWeight:700, fontSize:13, marginBottom:10, display:"flex", alignItems:"center", gap:6 }}>
        <span>🧠</span> Insights
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:8, overflowY:"auto", maxHeight:140 }}>
        {insights.map((ins,i)=>(
          <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:8, padding:"6px 8px", borderRadius:8, background:t.bgCard2 }}>
            <span style={{ fontSize:14, flexShrink:0 }}>{ins.icon}</span>
            <span style={{ fontSize:11, color:ins.color, lineHeight:1.4, fontWeight:500 }}>{ins.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SAVINGS MODAL ───────────────────────────────────────────────────────────
function SavingsModal({ open, onClose, savings, form, setForm, onAdd, onWithdraw, onEdit, t, fmt }) {
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
                <button onClick={()=>onEdit(s)} style={{ background:"none",border:`1px solid ${t.border}`,borderRadius:6,color:t.accent,padding:"3px 8px",cursor:"pointer",fontSize:11,fontWeight:700 }}>✏️</button>
                <button onClick={()=>onWithdraw(s.id)} title="Retirar (volta ao saldo)" style={{ background:"none",border:`1px solid ${t.border}`,borderRadius:6,color:t.green,padding:"3px 8px",cursor:"pointer",fontSize:11,fontWeight:700 }}>↩ Retirar</button>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [user,setUser]=useState(()=>loadSession());
  const [displayName,setDisplayName]=useState(()=>{ try{ const u=loadSession(); if(u){ const users=loadUsers(); return users[u]?.displayName||u; } return null; }catch{ return null; } });
  const handleLogin=(u,dn)=>{ setUser(u); setDisplayName(dn||u); };
  const handleLogout=()=>{ clearSession(); setUser(null); setDisplayName(null); };
  return (<><GlobalStyle/>{user?<Dashboard user={user} displayName={displayName} onLogout={handleLogout}/>:<LoginScreen onLogin={handleLogin}/>}</>);
}
