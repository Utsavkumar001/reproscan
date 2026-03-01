import { useState, useRef, useEffect } from "react";

const API_BASE = "https://reproscan-production.up.railway.app/api";

const COLORS = {
  bg:       "#f0f8ff",
  white:    "#ffffff",
  blue:     "#0ea5e9",
  blueDark: "#0284c7",
  blueLight:"#e0f2fe",
  bluePale: "#f0f8ff",
  ink:      "#0f172a",
  inkLight: "#64748b",
  border:   "#0f172a",
  low:      "#22c55e",
  medium:   "#f59e0b",
  high:     "#ef4444",
};

const CATEGORY_LABELS = {
  hyperparameters: { icon: "⚙️", label: "Hyperparams" },
  dataset:         { icon: "📊", label: "Dataset" },
  training_config: { icon: "🔩", label: "Train Config" },
  baselines:       { icon: "📐", label: "Baselines" },
  statistical:     { icon: "📉", label: "Statistics" },
  code:            { icon: "💾", label: "Code" },
};

const GlobalStyle = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f0f8ff; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes countUp {
    from { opacity: 0; transform: scale(0.8); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes pulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(14,165,233,0.3); }
    50%      { box-shadow: 0 0 0 8px rgba(14,165,233,0); }
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes blink {
    0%,100% { opacity: 1; } 50% { opacity: 0.3; }
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(100%); }
    to   { opacity: 1; transform: translateX(0); }
  }

  .card {
    background: #ffffff;
    border: 2px solid #0f172a;
    border-radius: 12px;
    padding: 1.5rem;
    position: relative;
  }

  .card-blue {
    background: #e0f2fe;
    border: 2px solid #0f172a;
    border-radius: 12px;
    padding: 1.5rem;
  }

  .btn {
    font-family: 'DM Mono', monospace;
    font-size: 0.8rem;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    border-radius: 8px;
    border: 2px solid #0f172a;
    cursor: pointer;
    transition: all 0.15s;
    padding: 0.7rem 1.75rem;
  }
  .btn-fill {
    background: #0ea5e9;
    color: #ffffff;
  }
  .btn-fill:hover { background: #0284c7; transform: translateY(-1px); }
  .btn-outline {
    background: transparent;
    color: #0f172a;
  }
  .btn-outline:hover { background: #e0f2fe; transform: translateY(-1px); }

  .tag {
    display: inline-block;
    background: #e0f2fe;
    border: 1.5px solid #0ea5e9;
    border-radius: 999px;
    padding: 3px 12px;
    font-family: 'DM Mono', monospace;
    font-size: 0.65rem;
    color: #0284c7;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .fade-up {
    animation: fadeUp 0.5s ease forwards;
    opacity: 0;
  }

  .chat-bubble {
    animation: slideUp 0.25s ease forwards;
  }

  .history-row:hover {
    background: #e0f2fe !important;
    cursor: pointer;
  }
`;

// ─── HISTORY PANEL ────────────────────────────────────────────────────────────
function HistoryPanel({ onClose, onLoadResult }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/history`)
      .then(r => r.json())
      .then(data => { setItems(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleLoad = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/history/${id}`);
      const data = await res.json();
      onLoadResult(data.result);
      onClose();
    } catch {
      alert("Could not load this result.");
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    await fetch(`${API_BASE}/history/${id}`, { method: "DELETE" });
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const scoreColor = (s) => s <= 4 ? COLORS.low : s > 6.5 ? COLORS.high : COLORS.medium;

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, background: "#0f172a55", zIndex: 1100,
      }} />

      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 420,
        background: COLORS.white, borderLeft: `2px solid ${COLORS.border}`,
        zIndex: 1200, display: "flex", flexDirection: "column",
        animation: "slideIn 0.3s ease forwards",
        boxShadow: "-8px 0 32px rgba(0,0,0,0.12)",
      }}>
        {/* Header */}
        <div style={{
          padding: "1.25rem 1.5rem",
          borderBottom: `2px solid ${COLORS.border}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: COLORS.blueLight,
        }}>
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.1rem", color: COLORS.ink }}>
              📋 Audit History
            </div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", color: COLORS.inkLight, marginTop: 2 }}>
              {items.length} past audit{items.length !== 1 ? "s" : ""}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "transparent", border: `1.5px solid ${COLORS.border}`,
            borderRadius: 8, width: 34, height: 34,
            cursor: "pointer", fontSize: "1rem", color: COLORS.ink,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>✕</button>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0.75rem" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "3rem", fontFamily: "'DM Mono', monospace",
              fontSize: "0.8rem", color: COLORS.inkLight, animation: "blink 1.2s infinite" }}>
              loading...
            </div>
          ) : items.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem" }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>📭</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.875rem", color: COLORS.inkLight }}>
                No audits yet. Upload a paper to get started!
              </div>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="history-row"
                onClick={() => handleLoad(item.id)}
                style={{
                  background: COLORS.white,
                  border: `1.5px solid #e2e8f0`,
                  borderRadius: 10,
                  padding: "0.875rem 1rem",
                  marginBottom: "0.5rem",
                  display: "flex", gap: "0.875rem", alignItems: "center",
                  transition: "all 0.15s",
                }}
              >
                {/* Score badge */}
                <div style={{
                  width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                  background: `${scoreColor(item.total_score)}15`,
                  border: `2px solid ${scoreColor(item.total_score)}`,
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800,
                    fontSize: "0.95rem", color: scoreColor(item.total_score), lineHeight: 1 }}>
                    {item.total_score.toFixed(1)}
                  </div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.5rem",
                    color: COLORS.inkLight }}>/ 10</div>
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
                    fontSize: "0.82rem", color: COLORS.ink,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {item.filename}
                  </div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem",
                    color: COLORS.inkLight, marginTop: 2 }}>
                    🕒 {item.analyzed_at}
                  </div>
                </div>

                {/* Delete button */}
                <button
                  onClick={(e) => handleDelete(e, item.id)}
                  title="Delete"
                  style={{
                    background: "transparent", border: `1.5px solid #fca5a5`,
                    borderRadius: 6, width: 28, height: 28,
                    cursor: "pointer", color: COLORS.high,
                    fontSize: "0.75rem", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#fee2e2"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >🗑</button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "1rem 1.5rem", borderTop: `1.5px solid #e2e8f0`,
          fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", color: COLORS.inkLight,
          textAlign: "center",
        }}>
          Click any audit to reload full results instantly
        </div>
      </div>
    </>
  );
}

// ─── CHATBOT ──────────────────────────────────────────────────────────────────

function Chatbot({ onClose }) {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! I've read the paper. Ask me anything — methods, results, dataset, contributions! 🔬" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const question = input.trim();
    setInput("");
    const newMessages = [...messages, { role: "user", content: question }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          history: newMessages.slice(-6).map(m => ({ role: m.role, content: m.content }))
        }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.answer }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, something went wrong. Try again!" }]);
    } finally {
      setLoading(false);
    }
  };

  const SUGGESTED = [
    "What is this paper about?",
    "What dataset was used?",
    "What are the main results?",
    "What are the limitations?",
  ];

  return (
    <div style={{
      position: "fixed", bottom: "1.5rem", right: "1.5rem",
      width: 380, height: 520,
      background: COLORS.white,
      border: `2px solid ${COLORS.border}`,
      borderRadius: 16,
      display: "flex", flexDirection: "column",
      boxShadow: "4px 4px 0px #0f172a",
      zIndex: 1000,
      animation: "slideUp 0.3s ease forwards",
    }}>
      <div style={{
        background: COLORS.blue, padding: "0.875rem 1rem",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        borderRadius: "14px 14px 0 0", borderBottom: `2px solid ${COLORS.border}`
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1rem" }}>💬</span>
          <span style={{ fontFamily: "'DM Mono', monospace", color: "#fff", fontWeight: 500, fontSize: "0.82rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Ask the Paper
          </span>
          <span style={{ background: "#ffffff33", color: "#fff", fontSize: "0.6rem", padding: "2px 8px", borderRadius: 999, fontFamily: "'DM Mono', monospace" }}>
            AI
          </span>
        </div>
        <button onClick={onClose} style={{
          background: "transparent", border: "none",
          color: "#fff", cursor: "pointer", fontSize: "1.1rem", lineHeight: 1,
          fontFamily: "'DM Mono', monospace"
        }}>✕</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {messages.map((msg, i) => (
          <div key={i} className="chat-bubble" style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "82%",
              padding: "0.6rem 0.9rem",
              background: msg.role === "user" ? COLORS.blue : COLORS.blueLight,
              color: msg.role === "user" ? "#fff" : COLORS.ink,
              borderRadius: msg.role === "user" ? "12px 12px 3px 12px" : "12px 12px 12px 3px",
              fontSize: "0.82rem", lineHeight: 1.6,
              border: `1.5px solid ${msg.role === "user" ? COLORS.blueDark : "#bae6fd"}`,
              fontFamily: "'DM Sans', sans-serif",
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{
              background: COLORS.blueLight, border: `1.5px solid #bae6fd`,
              borderRadius: "12px 12px 12px 3px", padding: "0.6rem 1rem",
              fontSize: "0.82rem", color: COLORS.inkLight,
              fontFamily: "'DM Mono', monospace",
              animation: "blink 1.2s infinite"
            }}>
              thinking...
            </div>
          </div>
        )}

        {messages.length === 1 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.25rem" }}>
            {SUGGESTED.map(s => (
              <button key={s} onClick={() => setInput(s)} style={{
                background: COLORS.white, border: `1.5px solid ${COLORS.blue}`,
                borderRadius: 999, padding: "4px 10px",
                fontSize: "0.7rem", color: COLORS.blue,
                cursor: "pointer", fontFamily: "'DM Mono', monospace",
                letterSpacing: "0.03em",
              }}>{s}</button>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{
        padding: "0.75rem", borderTop: `2px solid ${COLORS.border}`,
        display: "flex", gap: "0.5rem", background: COLORS.white,
        borderRadius: "0 0 14px 14px"
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendMessage()}
          placeholder="Ask anything about this paper..."
          style={{
            flex: 1, border: `1.5px solid #bae6fd`,
            borderRadius: 8, padding: "0.5rem 0.875rem",
            fontSize: "0.82rem", outline: "none",
            color: COLORS.ink, background: COLORS.bluePale,
            fontFamily: "'DM Sans', sans-serif",
          }}
        />
        <button onClick={sendMessage} disabled={loading || !input.trim()} style={{
          background: input.trim() ? COLORS.blue : COLORS.blueLight,
          border: `1.5px solid ${input.trim() ? COLORS.border : "#bae6fd"}`,
          borderRadius: 8, width: 38, height: 38,
          cursor: input.trim() ? "pointer" : "default",
          color: input.trim() ? "#fff" : COLORS.inkLight,
          fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.15s",
        }}>➤</button>
      </div>
    </div>
  );
}

function AnimatedScore({ target }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const dur = 900;
    const tick = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(+(e * target).toFixed(1));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return val.toFixed(1);
}

function RiskPill({ score }) {
  const isLow = score <= 4.0, isHigh = score > 6.5;
  const { text, bg, fg } = isLow
    ? { text: "Low Risk ✓",    bg: "#dcfce7", fg: "#15803d" }
    : isHigh
      ? { text: "High Risk ✗", bg: "#fee2e2", fg: "#dc2626" }
      : { text: "Medium Risk ~",bg: "#fef9c3", fg: "#a16207" };
  return (
    <span style={{ background: bg, color: fg, border: `1.5px solid ${fg}`,
      borderRadius: 999, padding: "4px 14px", fontFamily: "'DM Mono', monospace",
      fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.05em" }}>
      {text}
    </span>
  );
}

function Bar({ value, max, color }) {
  return (
    <div style={{ height: 8, background: "#e0f2fe", borderRadius: 999,
      overflow: "hidden", border: "1.5px solid #bae6fd" }}>
      <div style={{
        height: "100%", width: `${(value / max) * 100}%`, background: color || COLORS.blue,
        borderRadius: 999, transition: "width 1s cubic-bezier(.16,1,.3,1)",
      }}/>
    </div>
  );
}

function ScorePanel({ score }) {
  const { total_score, message, category_breakdown } = score;
  const scoreColor = total_score <= 4.0 ? COLORS.low : total_score > 6.5 ? COLORS.high : COLORS.medium;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
      <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div style={{ position: "absolute", top: 0, left: "1.5rem", right: "1.5rem",
          height: 3, background: COLORS.blue, borderRadius: "0 0 4px 4px" }}/>
        <div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem",
            color: COLORS.inkLight, letterSpacing: "0.2em", textTransform: "uppercase",
            marginBottom: "1rem" }}>Reproducibility Risk</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "0.25rem", marginBottom: "0.75rem" }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800,
              fontSize: "5.5rem", lineHeight: 1, color: scoreColor,
              animation: "countUp 0.6s ease forwards" }}>
              <AnimatedScore target={total_score} />
            </div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "1rem",
              color: COLORS.inkLight, paddingBottom: "0.75rem" }}>/10</div>
          </div>
          <RiskPill score={total_score} />
        </div>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem",
          color: COLORS.inkLight, marginTop: "1rem", lineHeight: 1.6,
          borderTop: `1px solid #e0f2fe`, paddingTop: "0.75rem" }}>
          {message}
        </p>
      </div>

      <div className="card">
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem",
          color: COLORS.inkLight, letterSpacing: "0.2em", textTransform: "uppercase",
          marginBottom: "1.25rem" }}>Risk Breakdown</div>
        {Object.entries(category_breakdown).map(([cat, data]) => {
          const meta = CATEGORY_LABELS[cat];
          const sev = data.severity;
          const barColor = sev === "low" ? COLORS.low : sev === "high" ? COLORS.high : COLORS.medium;
          return (
            <div key={cat} style={{ marginBottom: "0.85rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between",
                marginBottom: "0.3rem", fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem" }}>
                <span style={{ color: COLORS.ink }}>{meta?.icon} {meta?.label}</span>
                <span style={{ color: barColor, fontFamily: "'DM Mono', monospace",
                  fontSize: "0.72rem", fontWeight: 500 }}>
                  {data.risk.toFixed(1)}/{data.max}
                </span>
              </div>
              <Bar value={data.risk} max={data.max} color={barColor} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FlagRow({ flag, index }) {
  const sevColor = flag.severity === "high" ? COLORS.high : flag.severity === "medium" ? COLORS.medium : COLORS.low;
  return (
    <div className="fade-up" style={{
      display: "flex", gap: "1rem", padding: "0.875rem 1rem",
      borderBottom: "1px solid #e0f2fe", alignItems: "flex-start",
      animationDelay: `${index * 0.05}s`,
    }}>
      <div style={{ width: 28, height: 28, background: COLORS.blueLight,
        border: `1.5px solid ${COLORS.blue}`, borderRadius: 6,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'DM Mono', monospace", fontSize: "0.65rem",
        color: COLORS.blue, flexShrink: 0, fontWeight: 500 }}>
        {String(index + 1).padStart(2, "0")}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem",
          color: COLORS.inkLight, textTransform: "uppercase", letterSpacing: "0.1em",
          marginBottom: "0.3rem" }}>{flag.icon} {flag.category}</div>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.875rem",
          color: COLORS.ink, lineHeight: 1.5 }}>{flag.issue}</div>
      </div>
      <span style={{ background: `${sevColor}18`, color: sevColor,
        border: `1.5px solid ${sevColor}`, borderRadius: 999,
        padding: "2px 10px", fontFamily: "'DM Mono', monospace",
        fontSize: "0.6rem", fontWeight: 500, textTransform: "uppercase",
        letterSpacing: "0.08em", alignSelf: "flex-start", whiteSpace: "nowrap" }}>
        {flag.severity}
      </span>
    </div>
  );
}

function DetailCard({ category, analysis }) {
  const [open, setOpen] = useState(false);
  const meta = CATEGORY_LABELS[category];
  const sev = analysis.severity || "unknown";
  const sevColor = sev === "low" ? COLORS.low : sev === "high" ? COLORS.high : sev === "medium" ? COLORS.medium : COLORS.inkLight;

  return (
    <div style={{ border: `1.5px solid ${open ? COLORS.blue : "#e2e8f0"}`,
      borderRadius: 10, marginBottom: "0.5rem", overflow: "hidden",
      transition: "border-color 0.2s", background: COLORS.white }}>
      <div onClick={() => setOpen(!open)} style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "0.875rem 1.1rem", cursor: "pointer",
        background: open ? COLORS.blueLight : COLORS.white,
        transition: "background 0.15s",
      }}>
        <div style={{ display: "flex", gap: "0.65rem", alignItems: "center" }}>
          <span style={{ fontSize: "1.1rem" }}>{meta?.icon}</span>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
            fontSize: "0.875rem", color: COLORS.ink }}>{meta?.label}</span>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span style={{ background: `${sevColor}15`, color: sevColor,
            border: `1.5px solid ${sevColor}`, borderRadius: 999,
            padding: "2px 10px", fontFamily: "'DM Mono', monospace",
            fontSize: "0.6rem", fontWeight: 500, textTransform: "uppercase" }}>{sev}</span>
          <span style={{ color: COLORS.inkLight, fontSize: "1rem",
            fontWeight: 600, transition: "transform 0.2s",
            display: "inline-block", transform: open ? "rotate(45deg)" : "none" }}>+</span>
        </div>
      </div>
      {open && (
        <div style={{ padding: "1rem 1.1rem", borderTop: `1px solid #e0f2fe` }}>
          {analysis.notes && (
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.83rem",
              color: COLORS.inkLight, lineHeight: 1.7, marginBottom: "0.875rem",
              background: COLORS.blueLight, borderRadius: 8, padding: "0.75rem",
              borderLeft: `3px solid ${COLORS.blue}` }}>
              {analysis.notes}
            </p>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            {analysis.found?.length > 0 && (
              <div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem",
                  color: COLORS.low, letterSpacing: "0.15em", fontWeight: 500,
                  marginBottom: "0.5rem" }}>✓ FOUND</div>
                {analysis.found.map((f, i) => (
                  <div key={i} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem",
                    color: COLORS.ink, padding: "3px 0 3px 0.6rem",
                    borderLeft: `2px solid ${COLORS.low}`, marginBottom: "0.25rem" }}>{f}</div>
                ))}
              </div>
            )}
            {analysis.missing?.length > 0 && (
              <div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem",
                  color: COLORS.high, letterSpacing: "0.15em", fontWeight: 500,
                  marginBottom: "0.5rem" }}>✗ MISSING</div>
                {analysis.missing.map((m, i) => (
                  <div key={i} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem",
                    color: COLORS.ink, padding: "3px 0 3px 0.6rem",
                    borderLeft: `2px solid ${COLORS.high}`, marginBottom: "0.25rem" }}>{m}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PaperCard({ paper, index }) {
  return (
    <div style={{
      background: COLORS.white, border: `1.5px solid #e2e8f0`,
      borderRadius: 10, padding: "1rem 1.25rem", marginBottom: "0.625rem",
      display: "flex", gap: "1rem", transition: "all 0.15s",
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.blue; e.currentTarget.style.background = COLORS.blueLight; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.background = COLORS.white; }}
    >
      <div style={{ width: 32, height: 32, background: COLORS.blueLight,
        border: `1.5px solid ${COLORS.blue}`, borderRadius: 8,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'DM Mono', monospace", fontSize: "0.65rem",
        color: COLORS.blue, flexShrink: 0, fontWeight: 500 }}>
        {String(index + 1).padStart(2, "0")}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
          fontSize: "0.875rem", color: COLORS.ink, lineHeight: 1.4, marginBottom: "0.25rem" }}>
          {paper.title}
        </div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.7rem",
          color: COLORS.inkLight, marginBottom: paper.abstract ? "0.4rem" : 0 }}>
          {paper.authors}{paper.year ? ` · ${paper.year}` : ""}
        </div>
        {paper.abstract && (
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem",
            color: COLORS.inkLight, lineHeight: 1.6 }}>{paper.abstract}</div>
        )}
      </div>
      {paper.link && (
        <a href={paper.link} target="_blank" rel="noopener noreferrer"
          style={{ background: COLORS.blue, color: "white", border: "none",
            borderRadius: 7, padding: "6px 14px", fontFamily: "'DM Mono', monospace",
            fontSize: "0.68rem", fontWeight: 500, textDecoration: "none",
            alignSelf: "flex-start", flexShrink: 0, textTransform: "uppercase",
            letterSpacing: "0.05em", transition: "background 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = COLORS.blueDark}
          onMouseLeave={e => e.currentTarget.style.background = COLORS.blue}
        >Open →</a>
      )}
    </div>
  );
}

function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1.5rem",
      background: COLORS.blueLight, borderRadius: 10, padding: "4px" }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          flex: 1, padding: "0.6rem 1rem",
          background: active === t.id ? COLORS.white : "transparent",
          color: active === t.id ? COLORS.blue : COLORS.inkLight,
          border: "none", borderRadius: 8, fontFamily: "'DM Mono', monospace",
          fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase",
          cursor: "pointer", fontWeight: active === t.id ? 500 : 400,
          boxShadow: active === t.id ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
          transition: "all 0.15s",
        }}>{t.label}</button>
      ))}
    </div>
  );
}

function ResultsDashboard({ result, onReset, onOpenChat, onOpenHistory }) {
  const [tab, setTab] = useState("flags");
  const { score, red_flags, detailed_analysis, recommendations, filename } = result;

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg }}>
      <style>{GlobalStyle}</style>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "2rem" }}>

        <div style={{ display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800,
              fontSize: "1.6rem", letterSpacing: "-0.03em", lineHeight: 1 }}>
              <span style={{ color: COLORS.ink }}>repro</span>
              <span style={{ color: COLORS.blue }}>scan</span>
            </div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.68rem",
              color: COLORS.inkLight, marginTop: "0.2rem" }}>📄 {filename}</div>
          </div>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button className="btn btn-outline" onClick={onOpenHistory}
              style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              📋 History
            </button>
            <button className="btn btn-fill" onClick={onOpenChat}
              style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              💬 Ask the Paper
            </button>
            <button className="btn btn-outline" onClick={onReset}>← New Paper</button>
          </div>
        </div>

        <ScorePanel score={score} />

        <TabBar tabs={[
          { id: "flags",   label: `🚩 Flags (${red_flags.length})` },
          { id: "details", label: "🔍 Details" },
          { id: "papers",  label: "📚 Related" },
        ]} active={tab} onChange={setTab} />

        {tab === "flags" && (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {red_flags.length === 0
              ? <div style={{ padding: "3rem", textAlign: "center" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🎉</div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700,
                    fontSize: "1.25rem", color: COLORS.low }}>All Clear!</div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.875rem",
                    color: COLORS.inkLight, marginTop: "0.4rem" }}>
                    No major reproducibility red flags detected.
                  </div>
                </div>
              : red_flags.map((f, i) => <FlagRow key={i} flag={f} index={i} />)
            }
          </div>
        )}

        {tab === "details" && (
          <div>{Object.entries(detailed_analysis).map(([cat, analysis]) => (
            <DetailCard key={cat} category={cat} analysis={analysis} />
          ))}</div>
        )}

        {tab === "papers" && (
          <div>
            {recommendations?.main_task && (
              <div className="card-blue" style={{ marginBottom: "1.25rem" }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem",
                  color: COLORS.blue, letterSpacing: "0.2em", marginBottom: "0.5rem" }}>
                  DETECTED TOPIC
                </div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem",
                  color: COLORS.ink, marginBottom: "0.75rem" }}>{recommendations.main_task}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                  {recommendations.keywords?.map((k, i) => <span key={i} className="tag">{k}</span>)}
                </div>
              </div>
            )}
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem",
              color: COLORS.inkLight, letterSpacing: "0.2em", marginBottom: "0.75rem",
              textTransform: "uppercase" }}>Related Papers</div>
            {recommendations?.related_papers?.length > 0
              ? recommendations.related_papers.map((p, i) => <PaperCard key={i} paper={p} index={i} />)
              : <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.875rem",
                  color: COLORS.inkLight, padding: "1rem 0" }}>No related papers found.</div>
            }
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem",
              color: COLORS.inkLight, letterSpacing: "0.2em", margin: "1.5rem 0 0.75rem",
              textTransform: "uppercase" }}>Reproducibility References</div>
            {recommendations?.reproducibility_references?.length > 0
              ? recommendations.reproducibility_references.map((p, i) => <PaperCard key={i} paper={p} index={i} />)
              : <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.875rem",
                  color: COLORS.inkLight, padding: "1rem 0" }}>No references found.</div>
            }
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryPage({ summary, filename, onReset }) {
  const sections = [
    { num: "01", label: "Overview",          content: summary?.overview,      type: "text" },
    { num: "02", label: "Key Contributions", content: summary?.contributions, type: "list" },
    { num: "03", label: "Main Findings",     content: summary?.findings,      type: "text" },
    { num: "04", label: "Limitations",       content: summary?.limitations,   type: "list" },
  ];
  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg }}>
      <style>{GlobalStyle}</style>
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: "2rem" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.6rem" }}>
            <span style={{ color: COLORS.ink }}>repro</span>
            <span style={{ color: COLORS.blue }}>scan</span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.7rem",
              color: COLORS.inkLight, marginLeft: "0.75rem", fontWeight: 400 }}>/ summary</span>
          </div>
          <button className="btn btn-outline" onClick={onReset}>← Back</button>
        </div>
        {sections.map(({ num, label, content, type }) => (
          <div key={label} className="card" style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "0.875rem" }}>
              <span style={{ background: COLORS.blueLight, color: COLORS.blue,
                border: `1.5px solid ${COLORS.blue}`, borderRadius: 6,
                padding: "2px 10px", fontFamily: "'DM Mono', monospace",
                fontSize: "0.65rem", fontWeight: 500 }}>{num}</span>
              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700,
                fontSize: "1rem", color: COLORS.ink }}>{label}</span>
            </div>
            {type === "text"
              ? <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem",
                  color: COLORS.inkLight, lineHeight: 1.75 }}>{content || "—"}</p>
              : <ul style={{ paddingLeft: "1.25rem" }}>
                  {Array.isArray(content) && content.length > 0
                    ? content.map((c, i) => (
                        <li key={i} style={{ fontFamily: "'DM Sans', sans-serif",
                          fontSize: "0.875rem", color: COLORS.inkLight,
                          lineHeight: 1.75, marginBottom: "0.3rem" }}>{c}</li>
                      ))
                    : <li style={{ color: COLORS.inkLight, listStyle: "none" }}>—</li>}
                </ul>
            }
          </div>
        ))}
      </div>
    </div>
  );
}

function UploadPage({ onAnalyze, onSummarize, onNovelty, loadingAnalyze, loadingSummary, loadingNovelty, file, setFile, onOpenHistory }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();
  const busy = loadingAnalyze || loadingSummary || loadingNovelty;
  const handleFile = (f) => { if (f?.type === "application/pdf") setFile(f); };

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, display: "flex",
      flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <style>{GlobalStyle}</style>

      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        backgroundImage: `radial-gradient(${COLORS.blue}20 1px, transparent 1px)`,
        backgroundSize: "28px 28px" }}/>

      {/* History button — top right on upload page */}
      <button
        onClick={onOpenHistory}
        className="btn btn-outline"
        style={{ position: "fixed", top: "1.5rem", right: "1.5rem", zIndex: 10,
          display: "flex", alignItems: "center", gap: "0.4rem" }}
      >
        📋 History
      </button>

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 520, textAlign: "center" }}>
        <div className="tag" style={{ marginBottom: "1.5rem" }}>ML Paper Auditor</div>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800,
          fontSize: "clamp(3rem, 9vw, 5rem)", letterSpacing: "-0.04em",
          lineHeight: 1, margin: "0 0 1rem" }}>
          <span style={{ color: COLORS.ink }}>repro</span>
          <span style={{ color: COLORS.blue }}>scan</span>
        </h1>
        <div style={{ width: 60, height: 4, background: COLORS.blue,
          borderRadius: 999, margin: "0 auto 1.5rem" }}/>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "1rem",
          color: COLORS.inkLight, lineHeight: 1.7, marginBottom: "2rem", maxWidth: 420, margin: "0 auto 2rem" }}>
          Upload any ML research paper. We'll audit it for{" "}
          <strong style={{ color: COLORS.ink }}>reproducibility gaps</strong> and tell you exactly what's missing.
        </p>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
          onClick={() => inputRef.current.click()}
          style={{
            border: `2px dashed ${dragging ? COLORS.blue : file ? COLORS.low : "#bae6fd"}`,
            borderRadius: 14, padding: "2.5rem 2rem", textAlign: "center", cursor: "pointer",
            background: dragging ? COLORS.blueLight : file ? "#f0fdf4" : COLORS.white,
            marginBottom: "1.25rem", transition: "all 0.2s",
            boxShadow: dragging ? `0 0 0 4px ${COLORS.blue}30` : file ? `0 0 0 4px ${COLORS.low}30` : "none",
          }}
        >
          <input ref={inputRef} type="file" accept=".pdf" style={{ display: "none" }}
            onChange={(e) => handleFile(e.target.files[0])} />
          <div style={{ fontSize: "2.25rem", marginBottom: "0.75rem" }}>
            {file ? "📄" : dragging ? "🎯" : "☁️"}
          </div>
          {file ? (
            <>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.82rem",
                fontWeight: 500, color: COLORS.low, marginBottom: "0.2rem" }}>{file.name}</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.8rem", color: COLORS.inkLight }}>
                {(file.size / 1024).toFixed(0)} KB · click to change
              </div>
            </>
          ) : (
            <>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
                fontSize: "0.9rem", color: COLORS.ink, marginBottom: "0.25rem" }}>
                Drop your PDF here
              </div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem",
                color: COLORS.inkLight }}>or click to browse</div>
            </>
          )}
        </div>

        {file && (
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center",
            flexWrap: "wrap", marginBottom: "2rem" }}>
            <button className="btn btn-fill" onClick={() => onAnalyze(file)} disabled={busy}
              style={{ opacity: busy ? 0.6 : 1, cursor: busy ? "not-allowed" : "pointer",
                animation: busy ? "none" : "pulse 2s infinite" }}>
              {loadingAnalyze ? "⏳ Analyzing..." : "⚡ Audit Paper"}
            </button>
            <button className="btn btn-outline" onClick={() => onSummarize(file)} disabled={busy}
              style={{ opacity: busy ? 0.6 : 1, cursor: busy ? "not-allowed" : "pointer" }}>
              {loadingSummary ? "⏳ Summarizing..." : "📋 Summarize"}
            </button>
            <button className="btn btn-outline" onClick={() => onNovelty(file)} disabled={busy}
              style={{ opacity: busy ? 0.6 : 1, cursor: busy ? "not-allowed" : "pointer",
                borderColor: COLORS.blue, color: COLORS.blue }}>
              {loadingNovelty ? "⏳ Scanning..." : "🔭 Novelty Scan"}
            </button>
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", justifyContent: "center" }}>
          {["⚙️ Hyperparams","📊 Dataset","🔩 Train Config","📐 Baselines","📉 Statistics","💾 Code","📚 Related Papers"].map(t => (
            <span key={t} className="tag" style={{ fontSize: "0.62rem" }}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [analyzeResult, setAnalyzeResult]   = useState(null);
  const [summaryResult, setSummaryResult]   = useState(null);
  const [noveltyResult, setNoveltyResult]   = useState(null);
  const [loadingAnalyze, setLoadingAnalyze] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingNovelty, setLoadingNovelty] = useState(false);
  const [error, setError]                   = useState(null);
  const [file, setFile]                     = useState(null);
  const [showChat, setShowChat]             = useState(false);
  const [showHistory, setShowHistory]       = useState(false); // ← NEW

  const handleAnalyze = async (f) => {
    setLoadingAnalyze(true); setError(null);
    try {
      const fd = new FormData(); fd.append("file", f);
      const res = await fetch(`${API_BASE}/analyze`, { method: "POST", body: fd });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Failed"); }
      setAnalyzeResult(await res.json());
    } catch(e) { setError(e.message); }
    finally { setLoadingAnalyze(false); }
  };

  const handleSummarize = async (f) => {
    setLoadingSummary(true); setError(null);
    try {
      const fd = new FormData(); fd.append("file", f);
      const res = await fetch(`${API_BASE}/summarize`, { method: "POST", body: fd });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Failed"); }
      setSummaryResult(await res.json());
    } catch(e) { setError(e.message); }
    finally { setLoadingSummary(false); }
  };

  const handleNovelty = async (f) => {
    setLoadingNovelty(true); setError(null);
    try {
      const fd = new FormData(); fd.append("file", f);
      const res = await fetch(`${API_BASE}/novelty`, { method: "POST", body: fd });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Failed"); }
      setNoveltyResult(await res.json());
    } catch(e) { setError(e.message); }
    finally { setLoadingNovelty(false); }
  };

  // ← History se result load karo
  const handleLoadFromHistory = (result) => {
    setAnalyzeResult(result);
    setSummaryResult(null);
    setNoveltyResult(null);
    setError(null);
    setShowChat(false);
  };

  const handleReset = () => {
    setAnalyzeResult(null); setSummaryResult(null);
    setNoveltyResult(null); setError(null); setShowChat(false);
  };

  return (
    <>
      {error && (
        <div style={{ position: "fixed", top: "1rem", left: "50%", transform: "translateX(-50%)",
          background: "#fff5f5", border: `1.5px solid ${COLORS.high}`, borderRadius: 8,
          color: COLORS.high, padding: "0.75rem 1.5rem",
          fontFamily: "'DM Mono', monospace", fontSize: "0.75rem", zIndex: 9999 }}>
          ✗ {error}
        </div>
      )}

      {analyzeResult
        ? <ResultsDashboard result={analyzeResult} onReset={handleReset}
            onOpenChat={() => setShowChat(true)}
            onOpenHistory={() => setShowHistory(true)} />
        : summaryResult
          ? <SummaryPage summary={summaryResult.summary} filename={summaryResult.filename} onReset={handleReset} />
          : noveltyResult
            ? <NoveltyPage novelty={noveltyResult.novelty} filename={noveltyResult.filename} onReset={handleReset} />
            : <UploadPage onAnalyze={handleAnalyze} onSummarize={handleSummarize} onNovelty={handleNovelty}
                loadingAnalyze={loadingAnalyze} loadingSummary={loadingSummary} loadingNovelty={loadingNovelty}
                file={file} setFile={setFile}
                onOpenHistory={() => setShowHistory(true)} />
      }

      {showChat && analyzeResult && <Chatbot onClose={() => setShowChat(false)} />}

      {/* ← History Panel */}
      {showHistory && (
        <HistoryPanel
          onClose={() => setShowHistory(false)}
          onLoadResult={handleLoadFromHistory}
        />
      )}
    </>
  );
}

// ─── NOVELTY PAGE ─────────────────────────────────────────────────────────────
function NoveltyPage({ novelty, filename, onReset }) {
  const n = novelty;
  const score = n.novelty_score ?? 5;
  const overlap = n.overlap_pct ?? 50;
  const scoreColor = score >= 7 ? COLORS.low : score >= 4 ? COLORS.blue : COLORS.medium;

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg }}>
      <style>{GlobalStyle}</style>
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.6rem" }}>
              <span style={{ color: COLORS.ink }}>repro</span>
              <span style={{ color: COLORS.blue }}>scan</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.7rem",
                color: COLORS.inkLight, marginLeft: "0.75rem", fontWeight: 400 }}>/ novelty</span>
            </div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.68rem",
              color: COLORS.inkLight, marginTop: "0.2rem" }}>📄 {filename}</div>
          </div>
          <button className="btn btn-outline" onClick={onReset}>← Back</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
          <div className="card">
            <div style={{ position: "absolute", top: 0, left: "1.5rem", right: "1.5rem",
              height: 3, background: scoreColor, borderRadius: "0 0 4px 4px" }}/>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem",
              color: COLORS.inkLight, letterSpacing: "0.2em", textTransform: "uppercase",
              marginBottom: "0.875rem" }}>Novelty Score</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "0.25rem", marginBottom: "0.75rem" }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800,
                fontSize: "5rem", lineHeight: 1, color: scoreColor }}>{score.toFixed(1)}</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "1rem",
                color: COLORS.inkLight, paddingBottom: "0.6rem" }}>/10</div>
            </div>
            <span style={{
              background: score >= 7 ? "#dcfce7" : score >= 4 ? COLORS.blueLight : "#fef9c3",
              color: scoreColor, border: `1.5px solid ${scoreColor}`,
              borderRadius: 999, padding: "4px 14px",
              fontFamily: "'DM Mono', monospace", fontSize: "0.72rem", fontWeight: 500,
            }}>
              {score >= 7 ? "✓ Highly Novel" : score >= 4 ? "~ Moderately Novel" : "⚠ Incremental"}
            </span>
          </div>

          <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem",
              color: COLORS.inkLight, letterSpacing: "0.2em", textTransform: "uppercase",
              marginBottom: "0.875rem" }}>Conceptual Overlap</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800,
              fontSize: "4.5rem", lineHeight: 1, color: COLORS.ink, marginBottom: "0.75rem" }}>
              {overlap}<span style={{ fontSize: "2rem", color: COLORS.inkLight }}>%</span>
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between",
                fontFamily: "'DM Mono', monospace", fontSize: "0.65rem",
                color: COLORS.inkLight, marginBottom: "0.4rem" }}>
                <span>Overlap with prior work</span><span>{overlap}%</span>
              </div>
              <div style={{ height: 10, background: COLORS.blueLight,
                borderRadius: 999, overflow: "hidden", border: `1.5px solid #bae6fd` }}>
                <div style={{ height: "100%", width: `${overlap}%`,
                  background: `linear-gradient(90deg, ${COLORS.blue}, ${COLORS.blueDark})`,
                  borderRadius: 999, transition: "width 1.2s cubic-bezier(.16,1,.3,1)" }}/>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between",
                fontFamily: "'DM Mono', monospace", fontSize: "0.6rem",
                color: COLORS.inkLight, marginTop: "0.3rem" }}>
                <span>0% (fully novel)</span><span>100% (fully derivative)</span>
              </div>
            </div>
          </div>
        </div>

        {n.verdict && (
          <div className="card-blue" style={{ marginBottom: "1rem", borderLeft: `4px solid ${COLORS.blue}` }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem",
              color: COLORS.blue, letterSpacing: "0.2em", marginBottom: "0.5rem" }}>VERDICT</div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem",
              color: COLORS.ink, lineHeight: 1.7 }}>{n.verdict}</p>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
          <div className="card" style={{ borderTop: `3px solid ${COLORS.low}` }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem",
              color: COLORS.low, letterSpacing: "0.2em", marginBottom: "0.875rem" }}>✓ WHAT'S NEW</div>
            {n.what_is_new?.length > 0
              ? n.what_is_new.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem", alignItems: "flex-start" }}>
                  <span style={{ color: COLORS.low, fontSize: "0.8rem", marginTop: 2 }}>→</span>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem", color: COLORS.ink, lineHeight: 1.5 }}>{item}</span>
                </div>
              ))
              : <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem", color: COLORS.inkLight }}>—</div>
            }
          </div>
          <div className="card" style={{ borderTop: `3px solid ${COLORS.medium}` }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem",
              color: COLORS.medium, letterSpacing: "0.2em", marginBottom: "0.875rem" }}>~ WHAT OVERLAPS</div>
            {n.what_overlaps?.length > 0
              ? n.what_overlaps.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem", alignItems: "flex-start" }}>
                  <span style={{ color: COLORS.medium, fontSize: "0.8rem", marginTop: 2 }}>≈</span>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem", color: COLORS.ink, lineHeight: 1.5 }}>{item}</span>
                </div>
              ))
              : <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem", color: COLORS.inkLight }}>—</div>
            }
          </div>
        </div>

        {n.most_similar?.length > 0 && (
          <div className="card">
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem",
              color: COLORS.inkLight, letterSpacing: "0.2em", textTransform: "uppercase",
              marginBottom: "1rem" }}>Most Similar Prior Work</div>
            {n.most_similar_title && (
              <div style={{ background: COLORS.blueLight, borderRadius: 8, padding: "0.75rem 1rem",
                marginBottom: "1rem", borderLeft: `3px solid ${COLORS.blue}` }}>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
                  fontSize: "0.875rem", color: COLORS.ink, marginBottom: "0.3rem" }}>
                  🔗 {n.most_similar_title}
                </div>
                {n.most_similar_reason && (
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.8rem", color: COLORS.inkLight }}>
                    {n.most_similar_reason}
                  </div>
                )}
              </div>
            )}
            {n.most_similar.map((p, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between",
                alignItems: "center", padding: "0.6rem 0",
                borderBottom: i < n.most_similar.length - 1 ? `1px solid ${COLORS.blueLight}` : "none" }}>
                <div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem",
                    fontWeight: 600, color: COLORS.ink }}>{p.title}</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.68rem",
                    color: COLORS.inkLight }}>{p.authors} {p.year ? `· ${p.year}` : ""}</div>
                </div>
                {p.link && (
                  <a href={p.link} target="_blank" rel="noopener noreferrer"
                    style={{ background: COLORS.blue, color: "white", borderRadius: 6,
                      padding: "4px 12px", fontFamily: "'DM Mono', monospace",
                      fontSize: "0.65rem", textDecoration: "none", flexShrink: 0,
                      marginLeft: "1rem", textTransform: "uppercase" }}>
                    Open →
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}