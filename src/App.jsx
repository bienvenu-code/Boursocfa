import { useState, useEffect, useRef } from "react";

const INITIAL_CAPITAL = 1000;

const STOCKS = [
  { id: "SNTS", name: "Sonatel", country: "🇸🇳", sector: "Télécom", price: 184, change: 2.3 },
  { id: "ECOB", name: "Ecobank", country: "🇹🇬", sector: "Banque", price: 97, change: -1.1 },
  { id: "ORCI", name: "Orange CI", country: "🇨🇮", sector: "Télécom", price: 123, change: 0.8 },
  { id: "BOAB", name: "BOA Bénin", country: "🇧🇯", sector: "Banque", price: 65, change: 1.5 },
  { id: "SGBC", name: "SGB CI", country: "🇨🇮", sector: "Banque", price: 112, change: -0.4 },
  { id: "STAC", name: "STAC CI", country: "🇨🇮", sector: "Industrie", price: 44, change: 3.1 },
  { id: "PALM", name: "PALMCI", country: "🇨🇮", sector: "Agri", price: 78, change: -2.0 },
  { id: "TOTA", name: "Total Sénégal", country: "🇸🇳", sector: "Énergie", price: 201, change: 0.5 },
];

function generateHistory(basePrice) {
  const history = [];
  let price = basePrice * 0.85;
  for (let i = 20; i >= 0; i--) {
    price = price * (1 + (Math.random() - 0.48) * 0.04);
    history.push(Math.round(price));
  }
  history.push(basePrice);
  return history;
}

const stockHistories = {};
STOCKS.forEach(s => { stockHistories[s.id] = generateHistory(s.price); });

function MiniChart({ history, positive }) {
  const max = Math.max(...history);
  const min = Math.min(...history);
  const range = max - min || 1;
  const w = 80, h = 32;
  const points = history.map((v, i) => {
    const x = (i / (history.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");
  const color = positive ? "#00C853" : "#FF3D00";
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function BigChart({ history, stockName }) {
  const max = Math.max(...history);
  const min = Math.min(...history);
  const range = max - min || 1;
  const w = 400, h = 120;
  const pad = 10;
  const points = history.map((v, i) => {
    const x = pad + (i / (history.length - 1)) * (w - pad * 2);
    const y = pad + (h - pad * 2) - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  });
  const polyline = points.map(p => p).join(" ");
  const area = `${points[0]} ${points.map(p => p).join(" ")} ${w - pad},${h - pad} ${pad},${h - pad}`;
  const positive = history[history.length - 1] >= history[0];
  const color = positive ? "#00C853" : "#FF3D00";
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#chartGrad)" />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}

export default function BoursoCFA() {
  const [screen, setScreen] = useState("home");
  const [cash, setCash] = useState(INITIAL_CAPITAL);
  const [portfolio, setPortfolio] = useState({});
  const [prices, setPrices] = useState(() => {
    const p = {};
    STOCKS.forEach(s => { p[s.id] = s.price; });
    return p;
  });
  const [priceHistory, setPriceHistory] = useState(stockHistories);
  const [selected, setSelected] = useState(null);
  const [qty, setQty] = useState(1);
  const [toast, setToast] = useState(null);
  const [tab, setTab] = useState("marche");
  const [transactions, setTransactions] = useState([]);
  const tickRef = useRef(null);

  useEffect(() => {
    tickRef.current = setInterval(() => {
      setPrices(prev => {
        const next = { ...prev };
        STOCKS.forEach(s => {
          const delta = (Math.random() - 0.49) * 0.015;
          next[s.id] = Math.max(10, Math.round(prev[s.id] * (1 + delta)));
        });
        return next;
      });
      setPriceHistory(prev => {
        const next = { ...prev };
        STOCKS.forEach(s => {
          const h = [...prev[s.id]];
          if (h.length > 30) h.shift();
          h.push(prices[s.id] || s.price);
          next[s.id] = h;
        });
        return next;
      });
    }, 3000);
    return () => clearInterval(tickRef.current);
  }, [prices]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const totalValue = () => {
    let total = cash;
    Object.entries(portfolio).forEach(([id, q]) => {
      total += (prices[id] || 0) * q;
    });
    return total;
  };

  const profit = totalValue() - INITIAL_CAPITAL;
  const profitPct = ((profit / INITIAL_CAPITAL) * 100).toFixed(1);

  const buy = () => {
    if (!selected) return;
    const cost = prices[selected.id] * qty;
    if (cost > cash) { showToast("Solde insuffisant !", "error"); return; }
    setCash(c => c - cost);
    setPortfolio(p => ({ ...p, [selected.id]: (p[selected.id] || 0) + qty }));
    setTransactions(t => [{ type: "achat", stock: selected.name, qty, price: prices[selected.id], date: new Date().toLocaleTimeString() }, ...t.slice(0, 19)]);
    showToast(`✅ Acheté ${qty} action(s) ${selected.name}`);
    setQty(1);
  };

  const sell = () => {
    if (!selected) return;
    const owned = portfolio[selected.id] || 0;
    if (owned < qty) { showToast("Pas assez d'actions !", "error"); return; }
    const gain = prices[selected.id] * qty;
    setCash(c => c + gain);
    setPortfolio(p => {
      const next = { ...p, [selected.id]: p[selected.id] - qty };
      if (next[selected.id] === 0) delete next[selected.id];
      return next;
    });
    setTransactions(t => [{ type: "vente", stock: selected.name, qty, price: prices[selected.id], date: new Date().toLocaleTimeString() }, ...t.slice(0, 19)]);
    showToast(`💰 Vendu ${qty} action(s) ${selected.name}`);
    setQty(1);
  };

  const score = () => {
    if (profit > 500) return { label: "Investisseur Élite 🏆", color: "#FFD700" };
    if (profit > 200) return { label: "Bon Investisseur 🥈", color: "#C0C0C0" };
    if (profit > 0) return { label: "En Progression 📈", color: "#00C853" };
    if (profit === 0) return { label: "Débutant 🌱", color: "#4CAF50" };
    return { label: "Continue d'apprendre 💪", color: "#FF9800" };
  };

  // HOME SCREEN
  if (screen === "home") {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0a1628 0%, #1a2a4a 50%, #0d2137 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', sans-serif", padding: "24px" }}>
        <div style={{ textAlign: "center", maxWidth: 360 }}>
          <div style={{ fontSize: 64, marginBottom: 8 }}>💹</div>
          <h1 style={{ fontSize: 42, fontWeight: 900, color: "#fff", margin: 0, letterSpacing: -1 }}>
            Bourso<span style={{ color: "#00E676" }}>CFA</span>
          </h1>
          <p style={{ color: "#90CAF9", fontSize: 15, marginTop: 8, marginBottom: 32 }}>
            Investis malin, commence petit
          </p>

          <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 20, padding: "24px", marginBottom: 32, border: "1px solid rgba(0,230,118,0.2)" }}>
            <p style={{ color: "#B0BEC5", fontSize: 13, margin: "0 0 8px" }}>Tu démarres avec</p>
            <div style={{ fontSize: 48, fontWeight: 900, color: "#00E676" }}>1 000</div>
            <div style={{ fontSize: 20, color: "#90CAF9", fontWeight: 600 }}>FCFA fictifs</div>
            <p style={{ color: "#78909C", fontSize: 12, marginTop: 12, marginBottom: 0 }}>
              Achète, vends, apprends — sans risque réel
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 32 }}>
            {[
              { icon: "🌍", text: "Actions africaines" },
              { icon: "💱", text: "En FCFA" },
              { icon: "📈", text: "Prix en direct" },
              { icon: "🏆", text: "Score de perfo" },
            ].map((f, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: "12px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 22 }}>{f.icon}</div>
                <div style={{ color: "#CFD8DC", fontSize: 12, marginTop: 4 }}>{f.text}</div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setScreen("app")}
            style={{ width: "100%", padding: "18px", borderRadius: 16, border: "none", background: "linear-gradient(135deg, #00E676, #00B0FF)", color: "#0a1628", fontSize: 18, fontWeight: 800, cursor: "pointer", letterSpacing: 0.5 }}
          >
            Commencer à investir →
          </button>
        </div>
      </div>
    );
  }

  // MAIN APP
  const stockList = STOCKS.map(s => ({ ...s, price: prices[s.id], history: priceHistory[s.id] }));

  return (
    <div style={{ minHeight: "100vh", background: "#0a1628", fontFamily: "'Segoe UI', sans-serif", color: "#fff", position: "relative", maxWidth: 480, margin: "0 auto" }}>

      {/* TOAST */}
      {toast && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: toast.type === "error" ? "#FF3D00" : "#00C853", color: "#fff", padding: "10px 20px", borderRadius: 30, fontWeight: 700, zIndex: 999, fontSize: 14, whiteSpace: "nowrap", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
          {toast.msg}
        </div>
      )}

      {/* HEADER */}
      <div style={{ background: "linear-gradient(135deg, #0d2137, #1a2a4a)", padding: "20px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, color: "#78909C", letterSpacing: 1, textTransform: "uppercase" }}>Portefeuille total</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#fff" }}>{totalValue().toLocaleString()} <span style={{ fontSize: 14, color: "#90CAF9" }}>FCFA</span></div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "#78909C", letterSpacing: 1 }}>Performance</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: profit >= 0 ? "#00E676" : "#FF3D00" }}>
              {profit >= 0 ? "+" : ""}{profit.toLocaleString()} FCFA
            </div>
            <div style={{ fontSize: 12, color: profit >= 0 ? "#00C853" : "#FF5722" }}>
              {profit >= 0 ? "▲" : "▼"} {Math.abs(profitPct)}%
            </div>
          </div>
        </div>

        {/* Score badge */}
        <div style={{ marginTop: 12, display: "inline-block", background: "rgba(255,255,255,0.07)", borderRadius: 20, padding: "4px 14px", fontSize: 12, color: score().color, fontWeight: 700, border: `1px solid ${score().color}40` }}>
          {score().label}
        </div>

        {/* Cash */}
        <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
          <div style={{ background: "rgba(0,230,118,0.1)", borderRadius: 10, padding: "6px 14px", fontSize: 13, color: "#00E676", fontWeight: 600 }}>
            💵 Liquidités : {cash.toLocaleString()} FCFA
          </div>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: "flex", background: "#0d1f35", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {[
          { id: "marche", label: "📈 Marché" },
          { id: "portefeuille", label: "💼 Portefeuille" },
          { id: "historique", label: "📋 Historique" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: "13px 4px", border: "none", background: "transparent", color: tab === t.id ? "#00E676" : "#607D8B", fontSize: 12, fontWeight: 700, cursor: "pointer", borderBottom: tab === t.id ? "2px solid #00E676" : "2px solid transparent" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* MARCHE TAB */}
      {tab === "marche" && (
        <div style={{ padding: "12px" }}>
          {stockList.map(stock => {
            const history = stock.history;
            const prev = history[history.length - 2] || stock.price;
            const chg = ((stock.price - prev) / prev * 100).toFixed(1);
            const positive = stock.price >= prev;
            return (
              <div key={stock.id}
                onClick={() => { setSelected(stock); setQty(1); setScreen("detail"); }}
                style={{ background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", border: "1px solid rgba(255,255,255,0.06)", transition: "background 0.2s" }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 13 }}>{stock.country}</span>
                    <span style={{ fontWeight: 800, fontSize: 15 }}>{stock.name}</span>
                    <span style={{ fontSize: 10, color: "#546E7A", background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: 6 }}>{stock.sector}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#546E7A", marginTop: 2 }}>{stock.id}</div>
                </div>
                <MiniChart history={history} positive={positive} />
                <div style={{ textAlign: "right", minWidth: 70 }}>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{stock.price}</div>
                  <div style={{ fontSize: 11, color: "#607D8B" }}>FCFA</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: positive ? "#00E676" : "#FF3D00" }}>
                    {positive ? "▲" : "▼"} {Math.abs(chg)}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PORTEFEUILLE TAB */}
      {tab === "portefeuille" && (
        <div style={{ padding: "12px" }}>
          {Object.keys(portfolio).length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#546E7A" }}>
              <div style={{ fontSize: 48 }}>📭</div>
              <div style={{ fontSize: 16, marginTop: 12 }}>Ton portefeuille est vide</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>Achète des actions dans le Marché</div>
              <button onClick={() => setTab("marche")} style={{ marginTop: 16, padding: "10px 24px", borderRadius: 20, border: "none", background: "#00E676", color: "#0a1628", fontWeight: 700, cursor: "pointer" }}>
                Voir le Marché →
              </button>
            </div>
          ) : (
            Object.entries(portfolio).map(([id, qty]) => {
              const stock = STOCKS.find(s => s.id === id);
              const currentPrice = prices[id];
              const value = currentPrice * qty;
              return (
                <div key={id} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: "14px", marginBottom: 8, border: "1px solid rgba(0,230,118,0.15)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 16 }}>{stock?.name}</div>
                      <div style={{ color: "#78909C", fontSize: 12 }}>{qty} action{qty > 1 ? "s" : ""} × {currentPrice} FCFA</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 800, fontSize: 16, color: "#00E676" }}>{value.toLocaleString()}</div>
                      <div style={{ fontSize: 12, color: "#546E7A" }}>FCFA</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* HISTORIQUE TAB */}
      {tab === "historique" && (
        <div style={{ padding: "12px" }}>
          {transactions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#546E7A" }}>
              <div style={{ fontSize: 48 }}>📋</div>
              <div style={{ fontSize: 16, marginTop: 12 }}>Aucune transaction</div>
            </div>
          ) : (
            transactions.map((tx, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "12px 14px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", border: `1px solid ${tx.type === "achat" ? "rgba(0,176,255,0.2)" : "rgba(0,230,118,0.2)"}` }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    {tx.type === "achat" ? "🔵 Achat" : "🟢 Vente"} — {tx.stock}
                  </div>
                  <div style={{ color: "#78909C", fontSize: 12 }}>{tx.qty} action{tx.qty > 1 ? "s" : ""} à {tx.price} FCFA</div>
                  <div style={{ color: "#546E7A", fontSize: 11 }}>{tx.date}</div>
                </div>
                <div style={{ fontWeight: 800, color: tx.type === "vente" ? "#00E676" : "#FF9800", fontSize: 15 }}>
                  {tx.type === "vente" ? "+" : "-"}{(tx.qty * tx.price).toLocaleString()} F
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* DETAIL / TRADE SCREEN */}
      {screen === "detail" && selected && (
        <div style={{ position: "fixed", inset: 0, background: "#0a1628", zIndex: 100, overflowY: "auto", maxWidth: 480, margin: "0 auto" }}>
          <div style={{ padding: "20px 16px" }}>
            <button onClick={() => setScreen("app")} style={{ background: "rgba(255,255,255,0.07)", border: "none", color: "#fff", borderRadius: 20, padding: "8px 16px", cursor: "pointer", fontSize: 13, marginBottom: 20 }}>
              ← Retour
            </button>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 900 }}>{selected.country} {selected.name}</div>
                <div style={{ color: "#78909C", fontSize: 13 }}>{selected.sector} · {selected.id}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 26, fontWeight: 900 }}>{prices[selected.id]}</div>
                <div style={{ fontSize: 12, color: "#90CAF9" }}>FCFA</div>
              </div>
            </div>

            {/* Big chart */}
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 16, padding: "16px", marginBottom: 20, marginTop: 16 }}>
              <BigChart history={priceHistory[selected.id]} stockName={selected.name} />
            </div>

            {/* Owned */}
            {portfolio[selected.id] > 0 && (
              <div style={{ background: "rgba(0,230,118,0.08)", borderRadius: 12, padding: "12px 16px", marginBottom: 16, border: "1px solid rgba(0,230,118,0.2)" }}>
                <span style={{ color: "#00E676", fontWeight: 700 }}>Tu possèdes : {portfolio[selected.id]} action{portfolio[selected.id] > 1 ? "s" : ""}</span>
                <span style={{ color: "#78909C", fontSize: 12 }}> = {(portfolio[selected.id] * prices[selected.id]).toLocaleString()} FCFA</span>
              </div>
            )}

            {/* Qty selector */}
            <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 16, padding: "16px", marginBottom: 16 }}>
              <div style={{ color: "#90CAF9", fontSize: 13, marginBottom: 12, fontWeight: 600 }}>Quantité d'actions</div>
              <div style={{ display: "flex", alignItems: "center", gap: 16, justifyContent: "center" }}>
                <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ width: 44, height: 44, borderRadius: 22, border: "none", background: "rgba(255,255,255,0.1)", color: "#fff", fontSize: 22, cursor: "pointer", fontWeight: 700 }}>−</button>
                <div style={{ fontSize: 32, fontWeight: 900, minWidth: 60, textAlign: "center" }}>{qty}</div>
                <button onClick={() => setQty(q => q + 1)} style={{ width: 44, height: 44, borderRadius: 22, border: "none", background: "rgba(255,255,255,0.1)", color: "#fff", fontSize: 22, cursor: "pointer", fontWeight: 700 }}>+</button>
              </div>
              <div style={{ textAlign: "center", marginTop: 10, color: "#78909C", fontSize: 13 }}>
                Total : <span style={{ color: "#fff", fontWeight: 700 }}>{(qty * prices[selected.id]).toLocaleString()} FCFA</span>
              </div>
            </div>

            {/* Buy / Sell buttons */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <button onClick={buy} style={{ padding: "16px", borderRadius: 14, border: "none", background: "linear-gradient(135deg, #0091EA, #00B0FF)", color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer" }}>
                🔵 Acheter
              </button>
              <button onClick={sell} style={{ padding: "16px", borderRadius: 14, border: "none", background: "linear-gradient(135deg, #00C853, #00E676)", color: "#0a1628", fontSize: 16, fontWeight: 800, cursor: "pointer" }}>
                🟢 Vendre
              </button>
            </div>
