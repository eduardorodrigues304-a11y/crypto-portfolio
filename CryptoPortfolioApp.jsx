import { useState, useEffect, useRef, useCallback } from "react";

// ── 30 monedas del portafolio ──────────────────────────────────────────────
const COINS = [
  { symbol: "BTC",    name: "Bitcoin",        cat: "Layer 1",      icon: "₿" },
  { symbol: "ETH",    name: "Ethereum",       cat: "Layer 1",      icon: "Ξ" },
  { symbol: "BNB",    name: "BNB",            cat: "Exchange",     icon: "B" },
  { symbol: "SOL",    name: "Solana",         cat: "Layer 1",      icon: "◎" },
  { symbol: "XRP",    name: "XRP",            cat: "Layer 1",      icon: "✕" },
  { symbol: "ADA",    name: "Cardano",        cat: "Layer 1",      icon: "A" },
  { symbol: "DOGE",   name: "Dogecoin",       cat: "Meme",         icon: "Ð" },
  { symbol: "AVAX",   name: "Avalanche",      cat: "Layer 1",      icon: "▲" },
  { symbol: "DOT",    name: "Polkadot",       cat: "Infraestr.",   icon: "●" },
  { symbol: "LINK",   name: "Chainlink",      cat: "DeFi",         icon: "⬡" },
  { symbol: "MATIC",  name: "Polygon",        cat: "Layer 2",      icon: "⬟" },
  { symbol: "UNI",    name: "Uniswap",        cat: "DeFi",         icon: "🦄" },
  { symbol: "LTC",    name: "Litecoin",       cat: "Layer 1",      icon: "Ł" },
  { symbol: "ATOM",   name: "Cosmos",         cat: "Infraestr.",   icon: "⚛" },
  { symbol: "FIL",    name: "Filecoin",       cat: "Infraestr.",   icon: "⬡" },
  { symbol: "NEAR",   name: "NEAR Protocol",  cat: "Infraestr.",   icon: "N" },
  { symbol: "ICP",    name: "Internet Comp.", cat: "Infraestr.",   icon: "∞" },
  { symbol: "APT",    name: "Aptos",          cat: "Nueva L1",     icon: "◈" },
  { symbol: "ARB",    name: "Arbitrum",       cat: "Layer 2",      icon: "◎" },
  { symbol: "OP",     name: "Optimism",       cat: "Layer 2",      icon: "⬤" },
  { symbol: "INJ",    name: "Injective",      cat: "DeFi",         icon: "I" },
  { symbol: "TIA",    name: "Celestia",       cat: "Nueva L1",     icon: "✦" },
  { symbol: "SUI",    name: "Sui",            cat: "Nueva L1",     icon: "S" },
  { symbol: "SEI",    name: "Sei",            cat: "Nueva L1",     icon: "◇" },
  { symbol: "WLD",    name: "Worldcoin",      cat: "AI & Datos",   icon: "W" },
  { symbol: "RENDER", name: "Render",         cat: "AI & Datos",   icon: "R" },
  { symbol: "FET",    name: "Fetch.ai",       cat: "AI & Datos",   icon: "F" },
  { symbol: "PEPE",   name: "Pepe",           cat: "Meme",         icon: "🐸" },
  { symbol: "BONK",   name: "Bonk",           cat: "Meme",         icon: "🐕" },
  { symbol: "USDT",   name: "Tether",         cat: "Stablecoin",   icon: "$" },
];

const BINANCE_SYMBOLS = COINS
  .filter(c => c.symbol !== "USDT")
  .map(c => `${c.symbol}USDT`);

const CAT_COLORS = {
  "Layer 1":    "#F7931A",
  "Layer 2":    "#1D6FD1",
  "DeFi":       "#00875A",
  "Infraestr.": "#7B61FF",
  "AI & Datos": "#00BCD4",
  "Nueva L1":   "#E91E8C",
  "Exchange":   "#FFB300",
  "Meme":       "#FF5722",
  "Stablecoin": "#4CAF50",
};

function fmt(n, decimals = 2) {
  if (n === undefined || n === null || isNaN(n)) return "—";
  if (n >= 1000) return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n >= 1)    return "$" + n.toFixed(decimals);
  if (n >= 0.01) return "$" + n.toFixed(4);
  return "$" + n.toFixed(8);
}

function fmtPct(n) {
  if (n === undefined || isNaN(n)) return "—";
  const sign = n >= 0 ? "+" : "";
  return sign + n.toFixed(2) + "%";
}

function fmtUSD(n) {
  if (!n) return "$0.00";
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── SPARKLINE ────────────────────────────────────────────────────────────────
function Sparkline({ history, positive }) {
  if (!history || history.length < 2) return <div style={{ width: 64, height: 28 }} />;
  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min || 1;
  const w = 64, h = 28;
  const pts = history.map((v, i) => {
    const x = (i / (history.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  const color = positive ? "#00C853" : "#FF3D00";
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.85" />
    </svg>
  );
}

// ── FLASH BADGE ───────────────────────────────────────────────────────────────
function FlashPrice({ price, symbol }) {
  const [flash, setFlash] = useState(null);
  const prev = useRef(price);
  useEffect(() => {
    if (prev.current !== price && prev.current !== undefined) {
      setFlash(price > prev.current ? "up" : "down");
      const t = setTimeout(() => setFlash(null), 600);
      prev.current = price;
      return () => clearTimeout(t);
    }
    prev.current = price;
  }, [price]);

  const bg = flash === "up" ? "rgba(0,200,83,0.18)" : flash === "down" ? "rgba(255,61,0,0.18)" : "transparent";
  return (
    <span style={{
      fontFamily: "'Space Mono', monospace",
      fontSize: 13,
      fontWeight: 700,
      color: "#E8E8F0",
      background: bg,
      borderRadius: 4,
      padding: "1px 4px",
      transition: "background 0.3s",
      letterSpacing: "-0.3px",
    }}>
      {fmt(price)}
    </span>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════════════════════
export default function CryptoPortfolio() {
  const [prices, setPrices]       = useState({});
  const [changes, setChanges]     = useState({});
  const [history, setHistory]     = useState({});
  const [status, setStatus]       = useState("connecting");
  const [quantities, setQuantities] = useState(() => {
    const saved = {};
    COINS.forEach(c => { saved[c.symbol] = 0; });
    saved["BTC"] = 0.05; saved["ETH"] = 0.5; saved["SOL"] = 5;
    saved["BNB"] = 2; saved["USDT"] = 0;
    return saved;
  });
  const [usdtFree, setUsdtFree]   = useState(1500);
  const [editMode, setEditMode]   = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sortBy, setSortBy]       = useState("value");
  const [filterCat, setFilterCat] = useState("Todas");
  const [reconnects, setReconnects] = useState(0);

  const wsRef    = useRef(null);
  const mountRef = useRef(true);

  // ── WebSocket Binance ──────────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (!mountRef.current) return;
    setStatus("connecting");
    const streams = BINANCE_SYMBOLS.map(s => `${s.toLowerCase()}@ticker`).join("/");
    const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);
    wsRef.current = ws;

    ws.onopen = () => { if (mountRef.current) setStatus("live"); };

    ws.onmessage = (e) => {
      if (!mountRef.current) return;
      try {
        const { data } = JSON.parse(e.data);
        if (!data) return;
        const sym = data.s.replace("USDT", "");
        const price = parseFloat(data.c);
        const chg   = parseFloat(data.P);
        if (!isNaN(price)) {
          setPrices(p => ({ ...p, [sym]: price }));
          setChanges(p => ({ ...p, [sym]: chg }));
          setHistory(h => {
            const arr = [...(h[sym] || []), price].slice(-30);
            return { ...h, [sym]: arr };
          });
        }
      } catch {}
    };

    ws.onerror = () => {};
    ws.onclose = () => {
      if (!mountRef.current) return;
      setStatus("reconnecting");
      setReconnects(r => r + 1);
      setTimeout(() => { if (mountRef.current) connect(); }, 3000);
    };
  }, []);

  useEffect(() => {
    mountRef.current = true;
    connect();
    return () => { mountRef.current = false; if (wsRef.current) wsRef.current.close(); };
  }, [connect]);

  // ── Set USDT price ─────────────────────────────────────────────────────────
  const getPrice = (sym) => sym === "USDT" ? 1 : (prices[sym] || 0);

  // ── Portfolio calculations ─────────────────────────────────────────────────
  const rows = COINS.map(coin => {
    const price = getPrice(coin.symbol);
    const qty   = quantities[coin.symbol] || 0;
    const value = price * qty;
    const chg   = changes[coin.symbol] || 0;
    return { ...coin, price, qty, value, chg };
  });

  const btcPrice    = prices["BTC"] || 1;
  const totalCoins  = rows.reduce((s, r) => s + r.value, 0);
  const totalPort   = totalCoins + usdtFree;
  const btcValue    = (quantities["BTC"] || 0) * btcPrice;
  const btcDom      = totalPort > 0 ? (btcValue / totalPort) * 100 : 0;
  const portInBTC   = totalPort / btcPrice;
  const totalChange = rows.reduce((s, r) => s + r.value * (r.chg / 100), 0);
  const totalChgPct = totalCoins > 0 ? (totalChange / (totalCoins - totalChange)) * 100 : 0;

  // ── Sort & filter ──────────────────────────────────────────────────────────
  const cats = ["Todas", ...Array.from(new Set(COINS.map(c => c.cat)))];
  let displayRows = [...rows];
  if (filterCat !== "Todas") displayRows = displayRows.filter(r => r.cat === filterCat);
  if (sortBy === "value")   displayRows.sort((a, b) => b.value - a.value);
  if (sortBy === "change")  displayRows.sort((a, b) => b.chg - a.chg);
  if (sortBy === "price")   displayRows.sort((a, b) => b.price - a.price);
  if (sortBy === "name")    displayRows.sort((a, b) => a.symbol.localeCompare(b.symbol));

  // ── Styles ─────────────────────────────────────────────────────────────────
  const S = {
    app: {
      minHeight: "100vh",
      background: "#07070F",
      color: "#E8E8F0",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      position: "relative",
      overflow: "hidden",
    },
    grid: {
      position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
      backgroundImage: `
        linear-gradient(rgba(247,147,26,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(247,147,26,0.03) 1px, transparent 1px)
      `,
      backgroundSize: "40px 40px",
      pointerEvents: "none",
    },
    content: { position: "relative", zIndex: 1, maxWidth: 1400, margin: "0 auto", padding: "0 20px" },
    header: {
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "20px 0 16px",
      borderBottom: "1px solid rgba(247,147,26,0.15)",
    },
    logo: {
      display: "flex", alignItems: "center", gap: 12,
    },
    logoIcon: {
      width: 40, height: 40, borderRadius: 10,
      background: "linear-gradient(135deg, #F7931A, #E65100)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 20, fontWeight: 900, color: "#fff",
      boxShadow: "0 0 20px rgba(247,147,26,0.4)",
    },
    logoText: { fontSize: 18, fontWeight: 800, color: "#F7931A", letterSpacing: "-0.5px" },
    logoSub:  { fontSize: 11, color: "#666680", marginTop: -2 },
    statusDot: {
      width: 8, height: 8, borderRadius: "50%",
      background: status === "live" ? "#00C853" : status === "connecting" ? "#FFB300" : "#FF3D00",
      boxShadow: status === "live" ? "0 0 8px #00C853" : "none",
      animation: status === "live" ? "pulse 2s infinite" : "none",
    },
    statusText: {
      fontSize: 11, color: status === "live" ? "#00C853" : "#FFB300",
      fontFamily: "'Space Mono', monospace",
    },
    tabs: {
      display: "flex", gap: 4, padding: "16px 0 0",
    },
    tab: (active) => ({
      padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer",
      fontSize: 13, fontWeight: 600,
      background: active ? "rgba(247,147,26,0.15)" : "transparent",
      color: active ? "#F7931A" : "#666680",
      borderBottom: active ? "2px solid #F7931A" : "2px solid transparent",
      transition: "all 0.2s",
    }),
    cardsRow: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
      gap: 16, padding: "24px 0 0",
    },
    card: (accent = "#F7931A") => ({
      background: "rgba(255,255,255,0.03)",
      border: `1px solid rgba(255,255,255,0.07)`,
      borderTop: `3px solid ${accent}`,
      borderRadius: 12,
      padding: "20px 20px 16px",
      backdropFilter: "blur(10px)",
    }),
    cardLabel: { fontSize: 11, color: "#666680", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8 },
    cardValue: { fontSize: 26, fontWeight: 800, letterSpacing: "-1px", lineHeight: 1 },
    cardSub:   { fontSize: 12, color: "#888899", marginTop: 6 },
    tableWrap: {
      marginTop: 24,
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 14,
      overflow: "hidden",
    },
    tableHeader: {
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "16px 20px",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
    },
    thRow: {
      display: "grid",
      gridTemplateColumns: "40px 1fr 120px 120px 100px 80px 80px",
      padding: "10px 20px",
      borderBottom: "1px solid rgba(255,255,255,0.04)",
      fontSize: 11, color: "#555570",
      textTransform: "uppercase", letterSpacing: "0.6px",
    },
    row: (i) => ({
      display: "grid",
      gridTemplateColumns: "40px 1fr 120px 120px 100px 80px 80px",
      padding: "12px 20px",
      borderBottom: "1px solid rgba(255,255,255,0.03)",
      background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
      alignItems: "center",
      transition: "background 0.15s",
      cursor: "default",
    }),
    tag: (cat) => ({
      display: "inline-block",
      fontSize: 10, fontWeight: 700,
      padding: "2px 8px", borderRadius: 20,
      color: CAT_COLORS[cat] || "#888",
      background: (CAT_COLORS[cat] || "#888") + "20",
      letterSpacing: "0.3px",
    }),
    filterRow: {
      display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center",
      padding: "12px 20px",
      borderBottom: "1px solid rgba(255,255,255,0.04)",
    },
    filterBtn: (active) => ({
      padding: "4px 12px", borderRadius: 20, border: "none", cursor: "pointer",
      fontSize: 11, fontWeight: 600,
      background: active ? "#F7931A" : "rgba(255,255,255,0.05)",
      color: active ? "#000" : "#888899",
      transition: "all 0.15s",
    }),
    sortBtn: (active) => ({
      padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer",
      fontSize: 11, fontWeight: 600,
      background: active ? "rgba(247,147,26,0.2)" : "rgba(255,255,255,0.04)",
      color: active ? "#F7931A" : "#666680",
      transition: "all 0.15s",
    }),
    input: {
      background: "rgba(247,147,26,0.08)",
      border: "1px solid rgba(247,147,26,0.3)",
      borderRadius: 6, padding: "3px 8px",
      color: "#F7931A", fontSize: 13,
      fontFamily: "'Space Mono', monospace",
      width: 90, textAlign: "right",
      outline: "none",
    },
    editBtn: (active) => ({
      padding: "7px 18px", borderRadius: 8, border: "none", cursor: "pointer",
      fontSize: 12, fontWeight: 700,
      background: active ? "#F7931A" : "rgba(247,147,26,0.12)",
      color: active ? "#000" : "#F7931A",
      transition: "all 0.2s",
    }),
    progressBar: (pct, color = "#F7931A") => ({
      height: 3, borderRadius: 2,
      width: `${Math.min(pct, 100)}%`,
      background: color,
      maxWidth: "100%",
    }),
  };

  const totalChgColor = totalChgPct >= 0 ? "#00C853" : "#FF3D00";

  return (
    <div style={S.app}>
      {/* Background grid */}
      <div style={S.grid} />

      {/* Glow effects */}
      <div style={{
        position: "fixed", top: -200, left: "20%", width: 500, height: 500,
        background: "radial-gradient(circle, rgba(247,147,26,0.06) 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 0,
      }} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        .coin-row:hover { background: rgba(247,147,26,0.04) !important; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(247,147,26,0.3); border-radius: 2px; }
      `}</style>

      <div style={S.content}>

        {/* ── HEADER ── */}
        <div style={S.header}>
          <div style={S.logo}>
            <div style={S.logoIcon}>₿</div>
            <div>
              <div style={S.logoText}>CryptoPortfolio Pro</div>
              <div style={S.logoSub}>Estrategia 4 Comas · Tiempo Real</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={S.statusDot} />
              <span style={S.statusText}>
                {status === "live" ? "BINANCE LIVE" : status === "connecting" ? "CONECTANDO..." : `RECONECTANDO (${reconnects})`}
              </span>
            </div>
            <div style={{ fontSize: 11, color: "#444460", fontFamily: "'Space Mono', monospace" }}>
              {new Date().toLocaleTimeString("es-ES")}
            </div>
          </div>
        </div>

        {/* ── TABS ── */}
        <div style={S.tabs}>
          {[
            { id: "dashboard", label: "🏦 Dashboard" },
            { id: "operaciones", label: "🎯 4 Comas" },
            { id: "categorias", label: "📂 Categorías" },
          ].map(t => (
            <button key={t.id} style={S.tab(activeTab === t.id)} onClick={() => setActiveTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════════════ */}
        {/* TAB: DASHBOARD */}
        {/* ════════════════════════════════════════════════════ */}
        {activeTab === "dashboard" && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>

            {/* ── SUMMARY CARDS ── */}
            <div style={S.cardsRow}>
              <div style={S.card("#F7931A")}>
                <div style={S.cardLabel}>Total Portafolio</div>
                <div style={{ ...S.cardValue, color: "#F7931A" }}>{fmtUSD(totalPort)}</div>
                <div style={{ ...S.cardSub, color: totalChgColor }}>
                  {fmtPct(totalChgPct)} hoy
                </div>
              </div>
              <div style={S.card("#F7931A")}>
                <div style={S.cardLabel}>En Bitcoin</div>
                <div style={{ ...S.cardValue, color: "#E8E8F0", fontSize: 22 }}>
                  {portInBTC.toFixed(6)} BTC
                </div>
                <div style={S.cardSub}>Precio BTC: {fmtUSD(btcPrice)}</div>
              </div>
              <div style={S.card("#1D6FD1")}>
                <div style={S.cardLabel}>Dominancia BTC</div>
                <div style={{ ...S.cardValue, color: "#1D6FD1" }}>{btcDom.toFixed(1)}%</div>
                <div style={{ marginTop: 8 }}>
                  <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
                    <div style={S.progressBar(btcDom, "#1D6FD1")} />
                  </div>
                </div>
              </div>
              <div style={S.card("#00875A")}>
                <div style={S.cardLabel}>USDT Libre</div>
                <div style={{ ...S.cardValue, color: "#00C853", fontSize: 22 }}>{fmtUSD(usdtFree)}</div>
                {editMode ? (
                  <input
                    style={{ ...S.input, marginTop: 6, width: "100%" }}
                    type="number"
                    value={usdtFree}
                    onChange={e => setUsdtFree(parseFloat(e.target.value) || 0)}
                  />
                ) : (
                  <div style={S.cardSub}>{((usdtFree / totalPort) * 100).toFixed(1)}% del total</div>
                )}
              </div>
              <div style={S.card("#7B61FF")}>
                <div style={S.cardLabel}>Monedas activas</div>
                <div style={{ ...S.cardValue, color: "#7B61FF" }}>
                  {rows.filter(r => r.qty > 0).length}
                </div>
                <div style={S.cardSub}>de {COINS.length} disponibles</div>
              </div>
            </div>

            {/* ── TABLE ── */}
            <div style={S.tableWrap}>
              {/* Table header bar */}
              <div style={S.tableHeader}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#E8E8F0" }}>
                  Portafolio · {displayRows.length} activos
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "#555570" }}>Ordenar:</span>
                  {["value", "change", "price", "name"].map(s => (
                    <button key={s} style={S.sortBtn(sortBy === s)} onClick={() => setSortBy(s)}>
                      {s === "value" ? "Valor" : s === "change" ? "Cambio" : s === "price" ? "Precio" : "A-Z"}
                    </button>
                  ))}
                  <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.08)" }} />
                  <button style={S.editBtn(editMode)} onClick={() => setEditMode(!editMode)}>
                    {editMode ? "✓ Guardar" : "✏ Editar"}
                  </button>
                </div>
              </div>

              {/* Category filters */}
              <div style={S.filterRow}>
                <span style={{ fontSize: 11, color: "#555570" }}>Filtrar:</span>
                {cats.map(c => (
                  <button key={c} style={S.filterBtn(filterCat === c)} onClick={() => setFilterCat(c)}>
                    {c}
                  </button>
                ))}
              </div>

              {/* Table head */}
              <div style={S.thRow}>
                <div>#</div>
                <div>Activo</div>
                <div style={{ textAlign: "right" }}>Precio</div>
                <div style={{ textAlign: "right" }}>Valor USDT</div>
                <div style={{ textAlign: "right" }}>Cantidad</div>
                <div style={{ textAlign: "right" }}>24h %</div>
                <div style={{ textAlign: "right" }}>Gráfico</div>
              </div>

              {/* Rows */}
              {displayRows.map((coin, i) => {
                const weight = totalPort > 0 ? (coin.value / totalPort) * 100 : 0;
                const isPos  = coin.chg >= 0;
                return (
                  <div key={coin.symbol} className="coin-row" style={S.row(i)}>
                    {/* # */}
                    <div style={{ fontSize: 11, color: "#444460", fontFamily: "'Space Mono', monospace" }}>
                      {(i + 1).toString().padStart(2, "0")}
                    </div>

                    {/* Asset info */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: "#E8E8F0", letterSpacing: "-0.3px" }}>
                          {coin.symbol}
                        </span>
                        <span style={S.tag(coin.cat)}>{coin.cat}</span>
                      </div>
                      <div style={{ fontSize: 11, color: "#555570" }}>{coin.name}</div>
                      {coin.qty > 0 && (
                        <div style={{ height: 2, background: "rgba(255,255,255,0.05)", borderRadius: 1, width: 100, marginTop: 2 }}>
                          <div style={{ ...S.progressBar(weight, CAT_COLORS[coin.cat] || "#F7931A"), height: 2 }} />
                        </div>
                      )}
                    </div>

                    {/* Price */}
                    <div style={{ textAlign: "right" }}>
                      <FlashPrice price={coin.price} symbol={coin.symbol} />
                    </div>

                    {/* Value */}
                    <div style={{ textAlign: "right" }}>
                      <div style={{
                        fontFamily: "'Space Mono', monospace", fontSize: 13,
                        color: coin.value > 0 ? "#E8E8F0" : "#333350", fontWeight: 700,
                      }}>
                        {fmtUSD(coin.value)}
                      </div>
                      {coin.value > 0 && (
                        <div style={{ fontSize: 10, color: "#555570" }}>{weight.toFixed(1)}%</div>
                      )}
                    </div>

                    {/* Quantity */}
                    <div style={{ textAlign: "right" }}>
                      {editMode ? (
                        <input
                          style={S.input}
                          type="number"
                          value={quantities[coin.symbol] || ""}
                          placeholder="0"
                          onChange={e => setQuantities(q => ({ ...q, [coin.symbol]: parseFloat(e.target.value) || 0 }))}
                        />
                      ) : (
                        <span style={{
                          fontFamily: "'Space Mono', monospace", fontSize: 12,
                          color: coin.qty > 0 ? "#AAAACC" : "#333350",
                        }}>
                          {coin.qty > 0 ? coin.qty.toLocaleString("en-US", { maximumFractionDigits: 6 }) : "—"}
                        </span>
                      )}
                    </div>

                    {/* 24h change */}
                    <div style={{
                      textAlign: "right",
                      fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700,
                      color: isPos ? "#00C853" : "#FF3D00",
                    }}>
                      {coin.symbol !== "USDT" ? fmtPct(coin.chg) : "—"}
                    </div>

                    {/* Sparkline */}
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <Sparkline history={history[coin.symbol]} positive={isPos} />
                    </div>
                  </div>
                );
              })}

              {/* Totals row */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "40px 1fr 120px 120px 100px 80px 80px",
                padding: "14px 20px",
                borderTop: "1px solid rgba(247,147,26,0.2)",
                background: "rgba(247,147,26,0.04)",
                alignItems: "center",
              }}>
                <div />
                <div style={{ fontSize: 12, fontWeight: 800, color: "#F7931A" }}>TOTAL PORTAFOLIO</div>
                <div />
                <div style={{ textAlign: "right", fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: 800, color: "#F7931A" }}>
                  {fmtUSD(totalPort)}
                </div>
                <div />
                <div style={{ textAlign: "right", fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700, color: totalChgColor }}>
                  {fmtPct(totalChgPct)}
                </div>
                <div />
              </div>
            </div>

            <div style={{ height: 40 }} />
          </div>
        )}

        {/* ════════════════════════════════════════════════════ */}
        {/* TAB: 4 COMAS */}
        {/* ════════════════════════════════════════════════════ */}
        {activeTab === "operaciones" && (
          <FourCommasPanel prices={prices} />
        )}

        {/* ════════════════════════════════════════════════════ */}
        {/* TAB: CATEGORÍAS */}
        {/* ════════════════════════════════════════════════════ */}
        {activeTab === "categorias" && (
          <CategoriesPanel rows={rows} totalPort={totalPort} />
        )}

      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 4 COMAS PANEL
// ══════════════════════════════════════════════════════════════════════════════
function FourCommasPanel({ prices }) {
  const EMPTY = { par: "", tipo: "LONG", qty: "", entrada: "", sl: "", tp: "", salida: "", resultado: "", fecha: "" };
  const [trades, setTrades] = useState([
    { par: "BTC/USDT", tipo: "LONG", qty: 0.05, entrada: 65000, sl: 63500, tp: 68000, salida: 67800, resultado: "WIN",  fecha: "2025-01-05" },
    { par: "ETH/USDT", tipo: "LONG", qty: 0.5,  entrada: 3200,  sl: 3100,  tp: 3500,  salida: 3480,  resultado: "WIN",  fecha: "2025-01-12" },
    { par: "SOL/USDT", tipo: "LONG", qty: 5,    entrada: 165,   sl: 160,   tp: 185,   salida: 158,   resultado: "LOSS", fecha: "2025-01-18" },
    { par: "BTC/USDT", tipo: "SHORT",qty: 0.03, entrada: 68500, sl: 69500, tp: 65000, salida: 65200, resultado: "WIN",  fecha: "2025-01-25" },
    { par: "BNB/USDT", tipo: "LONG", qty: 2,    entrada: 560,   sl: 545,   tp: 610,   salida: 605,   resultado: "WIN",  fecha: "2025-02-02" },
  ]);
  const [newTrade, setNewTrade] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);

  const calcPnl = (t) => {
    if (!t.entrada || !t.salida || !t.qty) return null;
    return t.tipo === "LONG"
      ? (parseFloat(t.salida) - parseFloat(t.entrada)) * parseFloat(t.qty)
      : (parseFloat(t.entrada) - parseFloat(t.salida)) * parseFloat(t.qty);
  };

  const wins    = trades.filter(t => t.resultado === "WIN").length;
  const losses  = trades.filter(t => t.resultado === "LOSS").length;
  const totalPnl = trades.reduce((s, t) => s + (calcPnl(t) || 0), 0);
  const winRate  = trades.length > 0 ? (wins / trades.length) * 100 : 0;
  let acum = 0;

  const addTrade = () => {
    if (!newTrade.par || !newTrade.entrada) return;
    setTrades(t => [...t, newTrade]);
    setNewTrade(EMPTY);
    setShowForm(false);
  };

  const S2 = {
    card: (c = "#F7931A") => ({
      background: "rgba(255,255,255,0.03)",
      border: `1px solid rgba(255,255,255,0.06)`,
      borderTop: `3px solid ${c}`,
      borderRadius: 12, padding: "18px 20px",
    }),
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, padding: "24px 0 0" }}>
        {[
          { label: "Total Trades", value: trades.length, color: "#F7931A" },
          { label: "Ganadas",      value: wins,          color: "#00C853" },
          { label: "Perdidas",     value: losses,        color: "#FF3D00" },
          { label: "Win Rate",     value: winRate.toFixed(1) + "%", color: winRate >= 50 ? "#00C853" : "#FF3D00" },
          { label: "P&L Total",    value: (totalPnl >= 0 ? "+" : "") + "$" + totalPnl.toFixed(2), color: totalPnl >= 0 ? "#00C853" : "#FF3D00" },
        ].map(({ label, value, color }) => (
          <div key={label} style={S2.card(color)}>
            <div style={{ fontSize: 11, color: "#555570", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8 }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color, letterSpacing: "-0.5px" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Add trade button */}
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "20px 0 0" }}>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: "9px 20px", borderRadius: 8, border: "none", cursor: "pointer",
            fontSize: 13, fontWeight: 700,
            background: showForm ? "rgba(255,255,255,0.06)" : "linear-gradient(135deg,#F7931A,#E65100)",
            color: showForm ? "#888" : "#000",
          }}>
          {showForm ? "✕ Cancelar" : "+ Nueva Operación"}
        </button>
      </div>

      {/* Add trade form */}
      {showForm && (
        <div style={{
          background: "rgba(247,147,26,0.05)", border: "1px solid rgba(247,147,26,0.2)",
          borderRadius: 12, padding: 20, marginBottom: 16,
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12,
          animation: "fadeIn 0.2s ease",
        }}>
          {[
            { key: "par",       label: "Par",           placeholder: "BTC/USDT" },
            { key: "fecha",     label: "Fecha",         placeholder: "2025-01-01" },
            { key: "qty",       label: "Cantidad",      placeholder: "0.05" },
            { key: "entrada",   label: "Precio Entrada",placeholder: "65000" },
            { key: "sl",        label: "Stop Loss",     placeholder: "63500" },
            { key: "tp",        label: "Take Profit",   placeholder: "68000" },
            { key: "salida",    label: "Precio Salida", placeholder: "67800" },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <div style={{ fontSize: 11, color: "#666680", marginBottom: 4 }}>{label}</div>
              <input
                style={{
                  width: "100%", background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6,
                  padding: "7px 10px", color: "#E8E8F0", fontSize: 13, outline: "none",
                }}
                placeholder={placeholder}
                value={newTrade[key]}
                onChange={e => setNewTrade(n => ({ ...n, [key]: e.target.value }))}
              />
            </div>
          ))}
          <div>
            <div style={{ fontSize: 11, color: "#666680", marginBottom: 4 }}>Tipo</div>
            <select
              style={{
                width: "100%", background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6,
                padding: "7px 10px", color: "#E8E8F0", fontSize: 13, outline: "none",
              }}
              value={newTrade.tipo}
              onChange={e => setNewTrade(n => ({ ...n, tipo: e.target.value }))}>
              <option value="LONG">LONG</option>
              <option value="SHORT">SHORT</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#666680", marginBottom: 4 }}>Resultado</div>
            <select
              style={{
                width: "100%", background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6,
                padding: "7px 10px", color: "#E8E8F0", fontSize: 13, outline: "none",
              }}
              value={newTrade.resultado}
              onChange={e => setNewTrade(n => ({ ...n, resultado: e.target.value }))}>
              <option value="">—</option>
              <option value="WIN">WIN</option>
              <option value="LOSS">LOSS</option>
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button onClick={addTrade} style={{
              width: "100%", padding: "8px", borderRadius: 8, border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 700,
              background: "linear-gradient(135deg,#00C853,#00875A)", color: "#fff",
            }}>
              ✓ Agregar
            </button>
          </div>
        </div>
      )}

      {/* Trades table */}
      <div style={{
        background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 14, overflow: "hidden", marginTop: 8,
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "80px 120px 60px 70px 100px 100px 100px 100px 80px 90px",
          padding: "10px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          fontSize: 10, color: "#444460", textTransform: "uppercase", letterSpacing: "0.6px",
        }}>
          {["Fecha","Par","Tipo","Cant.","Entrada","Stop Loss","Take Profit","Salida","Result.","P&L"].map(h => (
            <div key={h} style={{ textAlign: "right", ...(h === "Par" || h === "Tipo" ? { textAlign: "left" } : {}) }}>{h}</div>
          ))}
        </div>
        {trades.map((t, i) => {
          const pnl = calcPnl(t);
          if (pnl !== null) acum += pnl;
          const isWin = t.resultado === "WIN";
          return (
            <div key={i} style={{
              display: "grid",
              gridTemplateColumns: "80px 120px 60px 70px 100px 100px 100px 100px 80px 90px",
              padding: "11px 16px", alignItems: "center",
              borderBottom: "1px solid rgba(255,255,255,0.025)",
              background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
            }}>
              <div style={{ fontSize: 11, color: "#444460", fontFamily: "'Space Mono', monospace" }}>{t.fecha}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#E8E8F0" }}>{t.par}</div>
              <div style={{
                fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4, textAlign: "center",
                background: t.tipo === "LONG" ? "rgba(0,200,83,0.15)" : "rgba(255,61,0,0.15)",
                color: t.tipo === "LONG" ? "#00C853" : "#FF3D00",
              }}>{t.tipo}</div>
              <div style={{ textAlign: "right", fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#AAAACC" }}>{t.qty}</div>
              <div style={{ textAlign: "right", fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#00C853" }}>${parseFloat(t.entrada).toLocaleString()}</div>
              <div style={{ textAlign: "right", fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#1D6FD1" }}>${parseFloat(t.sl).toLocaleString()}</div>
              <div style={{ textAlign: "right", fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#F7931A" }}>${parseFloat(t.tp).toLocaleString()}</div>
              <div style={{ textAlign: "right", fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#FF3D00" }}>${parseFloat(t.salida).toLocaleString()}</div>
              <div style={{ textAlign: "center" }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 20,
                  background: isWin ? "rgba(0,200,83,0.15)" : t.resultado ? "rgba(255,61,0,0.15)" : "transparent",
                  color: isWin ? "#00C853" : t.resultado ? "#FF3D00" : "#555570",
                }}>{t.resultado || "—"}</span>
              </div>
              <div style={{
                textAlign: "right", fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700,
                color: pnl === null ? "#444460" : pnl >= 0 ? "#00C853" : "#FF3D00",
              }}>
                {pnl === null ? "—" : (pnl >= 0 ? "+" : "") + "$" + pnl.toFixed(2)}
              </div>
            </div>
          );
        })}
        {/* Total row */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "80px 120px 60px 70px 100px 100px 100px 100px 80px 90px",
          padding: "12px 16px", alignItems: "center",
          borderTop: "1px solid rgba(247,147,26,0.2)",
          background: "rgba(247,147,26,0.04)",
        }}>
          <div style={{ gridColumn: "1 / 9", fontSize: 12, fontWeight: 800, color: "#F7931A" }}>P&L ACUMULADO</div>
          <div />
          <div style={{
            textAlign: "right", fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: 800,
            color: totalPnl >= 0 ? "#00C853" : "#FF3D00",
          }}>
            {totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}
          </div>
        </div>
      </div>
      <div style={{ height: 40 }} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CATEGORIES PANEL
// ══════════════════════════════════════════════════════════════════════════════
function CategoriesPanel({ rows, totalPort }) {
  const byCategory = {};
  rows.forEach(r => {
    if (!byCategory[r.cat]) byCategory[r.cat] = { value: 0, coins: [], change: 0, count: 0 };
    byCategory[r.cat].value += r.value;
    byCategory[r.cat].coins.push(r.symbol);
    byCategory[r.cat].change += r.value * (r.chg / 100);
    byCategory[r.cat].count++;
  });

  const sorted = Object.entries(byCategory).sort((a, b) => b[1].value - a[1].value);

  return (
    <div style={{ animation: "fadeIn 0.3s ease", paddingTop: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {sorted.map(([cat, data]) => {
          const pct = totalPort > 0 ? (data.value / totalPort) * 100 : 0;
          const color = CAT_COLORS[cat] || "#888";
          const chgPct = data.value > 0 ? (data.change / (data.value - data.change)) * 100 : 0;
          return (
            <div key={cat} style={{
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
              borderLeft: `4px solid ${color}`, borderRadius: 12, padding: "18px 20px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#E8E8F0" }}>{cat}</div>
                  <div style={{ fontSize: 11, color: "#555570", marginTop: 2 }}>{data.coins.join(" · ")}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color, fontFamily: "'Space Mono', monospace" }}>
                    {pct.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: 11, color: chgPct >= 0 ? "#00C853" : "#FF3D00", marginTop: 2 }}>
                    {chgPct >= 0 ? "+" : ""}{chgPct.toFixed(2)}% hoy
                  </div>
                </div>
              </div>
              <div style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2, marginBottom: 10 }}>
                <div style={{ height: 4, borderRadius: 2, width: `${Math.min(pct * 3, 100)}%`, background: color, transition: "width 0.5s ease" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "#666680" }}>{data.count} activos</span>
                <span style={{ color: "#E8E8F0", fontFamily: "'Space Mono', monospace", fontWeight: 700 }}>
                  ${data.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ height: 40 }} />
    </div>
  );
}
